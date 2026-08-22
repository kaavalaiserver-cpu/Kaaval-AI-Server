import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Violation } from '../violations/entities/violation.entity.js';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import archiver from 'archiver';
import { MailerService } from './mailer.service.js';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private readonly uploadDir = process.env.LOCAL_UPLOAD_DIR || '/app/data/uploads';
  private readonly exportDir = process.env.LOCAL_EXPORT_DIR || '/app/data/exports';
  private readonly stagingDir = path.join(this.exportDir, 'archive_staging');

  constructor(
    @InjectRepository(Violation)
    private violationsRepository: Repository<Violation>,
    private mailerService: MailerService,
  ) {
    if (!fs.existsSync(this.stagingDir)) {
      fs.mkdirSync(this.stagingDir, { recursive: true });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleDataRetention() {
    this.logger.log('Starting hourly data retention & staging...');
    const now = new Date();

    try {
      // 1. Pending: Archive after 7 days
      const pendingCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await this.archiveViolations('PENDING', pendingCutoff);

      // 2. Rejected: Archive after 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await this.archiveViolations('REJECTED', sevenDaysAgo);

      // 3. Issued: Archive after 18 days
      const eighteenDaysAgo = new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000);
      await this.archiveViolations('ISSUED', eighteenDaysAgo);

    } catch (error: any) {
      this.logger.error(`Retention cleanup failed: ${error.message}`);
    }
  }

  private async archiveViolations(status: string, thresholdDate: Date) {
    const violations = await this.violationsRepository.find({
      where: { status: status, updatedAt: LessThan(thresholdDate) },
      relations: ['evidence', 'vehicle', 'violationType', 'camera'],
    });

    for (const violation of violations) {
      await this.appendToExcel(violation, status);
      this.moveAssociatedFiles(violation, status);
      await this.violationsRepository.remove(violation);
      this.logger.log(`Archived ${status} violation ${violation.id}`);
    }
  }

  private async appendToExcel(violation: Violation, status: string) {
    const cameraId = violation.camera?.cameraCode || 'UNKNOWN';
    const filePath = path.join(this.stagingDir, `${cameraId}_Report.xlsx`);
    const workbook = new ExcelJS.Workbook();

    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
    } else {
      workbook.creator = 'Kaaval AI';
    }

    const sheetNames = ['ISSUED', 'PENDING', 'REJECTED'];
    for (const name of sheetNames) {
      let sheet = workbook.getWorksheet(name);
      if (!sheet) {
        sheet = workbook.addWorksheet(name);
        sheet.columns = [
          { header: 'Timestamp', key: 'timestamp', width: 25 },
          { header: 'Location', key: 'location', width: 25 },
          { header: 'Number Plate', key: 'numberPlate', width: 20 },
          { header: 'Violation Type', key: 'violationType', width: 25 },
        ];
      }
    }

    const targetSheet = workbook.getWorksheet(status.toUpperCase()) || workbook.getWorksheet('PENDING')!;
    
    const plate = violation.vehicle?.registrationNumber || 'UNKNOWN';
    const loc = violation.camera?.cameraName || violation.cameraId || 'UNKNOWN';
    // Fallback if violationType is not a string but an object
    const vType = (violation.violationType as any)?.violationName || violation.violationTypeId || 'UNKNOWN';

    targetSheet.addRow({
      timestamp: violation.violationTimestamp ? violation.violationTimestamp.toISOString() : new Date().toISOString(),
      location: loc,
      numberPlate: plate,
      violationType: vType
    });

    await workbook.xlsx.writeFile(filePath);
  }

  private moveAssociatedFiles(violation: Violation, status: string) {
    if (!violation.evidence || !Array.isArray(violation.evidence)) return;

    const plate = violation.vehicle?.registrationNumber || violation.id;
    const destFolder = path.join(this.stagingDir, status.toUpperCase());
    
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    for (const evidence of violation.evidence) {
      if (!evidence.filePath) continue;
      const filename = path.basename(evidence.filePath);
      const ext = path.extname(filename);
      const srcPath = path.join(this.uploadDir, filename);
      const destPath = path.join(destFolder, `${plate}${ext}`);

      if (fs.existsSync(srcPath)) {
        try {
          fs.renameSync(srcPath, destPath);
        } catch (e) {
          this.logger.warn(`Could not move file ${srcPath} to ${destPath}`);
        }
      }
    }
  }

  // Bi-Monthly Archive: 1st and 16th of every month at 1:00 AM
  @Cron('0 1 1,16 * *')
  async handleBiMonthlyArchive() {
    this.logger.log('Starting Bi-Monthly ZIP Archive process...');
    const now = new Date();
    const day = now.getDate();
    
    let startDate: Date;
    let endDate: Date;

    if (day >= 16) {
      // Data from 1st to 15th
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      // Data from 16th to end of previous month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 16);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
    }

    const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    const zipFileName = `${formatDate(startDate)} - ${formatDate(endDate)}.zip`;
    const zipFilePath = path.join(this.exportDir, zipFileName);

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      this.logger.log(`ZIP created successfully: ${archive.pointer()} total bytes`);
      
      // Send Email with the ZIP attachment (Excel files only if it's too big, but we attach the whole zip here as requested)
      // Note: If the zip is massive, this might fail. We attempt it anyway.
      await this.mailerService.sendBiMonthlyReport(zipFilePath, zipFileName);

      // Clear the staging directory
      this.clearDirectory(this.stagingDir);
    });

    archive.on('error', (err: Error) => {
      this.logger.error(`Error creating ZIP archive: ${err.message}`);
    });

    archive.pipe(output);
    archive.directory(this.stagingDir, false);
    await archive.finalize();
  }

  // 6-Month ZIP Cleanup
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  cleanOldZips() {
    if (!fs.existsSync(this.exportDir)) return;

    const files = fs.readdirSync(this.exportDir);
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = path.join(this.exportDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < sixMonthsAgo) {
          try {
            fs.unlinkSync(filePath);
            this.logger.log(`Deleted old archive ZIP: ${file}`);
          } catch (e) {
            this.logger.warn(`Could not delete old ZIP ${file}`);
          }
        }
      }
    }
  }

  private clearDirectory(directory: string) {
    if (!fs.existsSync(directory)) return;
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        this.clearDirectory(curPath);
        fs.rmdirSync(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    }
  }
}
