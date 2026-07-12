import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Violation } from '../violations/entities/violation.entity.js';
import { Evidence } from '../violations/entities/evidence.entity.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(Violation)
    private violationsRepository: Repository<Violation>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleDataRetention() {
    this.logger.log('Starting hourly data retention cleanup...');
    const now = new Date();

    try {
      // 1. Pending: Delete after 24 hours (Hard delete)
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const pendingViolations = await this.violationsRepository.find({
        where: { status: 'PENDING', createdAt: LessThan(twentyFourHoursAgo) },
        relations: ['evidence'],
      });
      
      for (const violation of pendingViolations) {
        this.deleteAssociatedFiles(violation);
        await this.violationsRepository.remove(violation);
        this.logger.log(`Deleted PENDING violation ${violation.id} (older than 24h)`);
      }

      // 2. Rejected: Delete after 2 hours (Hard delete)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const rejectedViolations = await this.violationsRepository.find({
        where: { status: 'REJECTED', updatedAt: LessThan(twoHoursAgo) },
        relations: ['evidence'],
      });

      for (const violation of rejectedViolations) {
        this.deleteAssociatedFiles(violation);
        await this.violationsRepository.remove(violation);
        this.logger.log(`Deleted REJECTED violation ${violation.id} (older than 2h)`);
      }

      // 3. Issued (APPROVED): Delete physical files after 15 days, keep DB metadata
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const issuedViolations = await this.violationsRepository.find({
        where: { status: 'APPROVED', updatedAt: LessThan(fifteenDaysAgo) },
        relations: ['evidence'],
      });

      for (const violation of issuedViolations) {
        if (violation.evidence && violation.evidence.length > 0) {
          this.deleteAssociatedFiles(violation);
          // Assuming you want to keep the evidence DB records but set their file_path to null,
          // or just delete the file from disk but keep the path for audit. Let's delete files.
          // TypeORM CASCADE doesn't automatically fire on relations unless specifically updated.
          // Since physical files are gone, we clear them from the DB relation array:
          violation.evidence = [];
          await this.violationsRepository.save(violation);
          this.logger.log(`Cleared physical files for APPROVED/ISSUED violation ${violation.id} (older than 15d)`);
        }
      }

    } catch (error: any) {
      this.logger.error(`Retention cleanup failed: ${error.message}`);
    }
  }

  private deleteAssociatedFiles(violation: Violation) {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || '/app/data/uploads';
    
    if (!violation.evidence || !Array.isArray(violation.evidence)) return;

    for (const evidence of violation.evidence) {
      if (!evidence.filePath) continue;
      const filename = path.basename(evidence.filePath);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          this.logger.warn(`Could not delete file ${filePath}`);
        }
      }
    }
  }
}
