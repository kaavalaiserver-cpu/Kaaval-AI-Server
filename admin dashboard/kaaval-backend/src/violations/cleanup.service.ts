import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Violation } from './entities/violation.entity.js';
import { Evidence } from './entities/evidence.entity.js';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    @InjectRepository(Evidence)
    private readonly evidenceRepo: Repository<Evidence>,
    private readonly configService: ConfigService,
  ) {}

  // @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Running automated evidence cleanup job...');
    
    const now = new Date();
    
    // ── MODEL TRAINING FREEZE WINDOW ─────────────────────────────────────────
    // Keep ALL images (rejected, issued, pending) from 16 Oct 2026 to 16 Nov 2026
    // for model training. Auto-delete resumes after 16 Nov 2026.
    const FREEZE_START = new Date('2026-10-16T00:00:00.000Z');
    const FREEZE_END   = new Date('2026-11-16T23:59:59.999Z');
    if (now >= FREEZE_START && now <= FREEZE_END) {
      this.logger.log('CLEANUP SKIPPED — Model training freeze window active (16 Oct – 16 Nov 2026). All images retained.');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────
    
    // Retention Policy Definitions
    const policies = [
      { status: 'PENDING', hours: 7 * 24, field: 'createdAt' },
      { status: 'APPROVED', hours: 18 * 24, field: 'updatedAt' },
      { status: 'ISSUED', hours: 18 * 24, field: 'updatedAt' },
      { status: 'REJECTED', hours: 7 * 24, field: 'updatedAt' },
      { status: 'AUTO_REJECTED', hours: 7 * 24, field: 'updatedAt' },
    ];

    let filesDeleted = 0;
    let recordsUpdated = 0;

    for (const policy of policies) {
      const cutoffDate = new Date(now.getTime() - policy.hours * 60 * 60 * 1000);
      
      const violationsToClean = await this.violationRepo.find({
        where: {
          status: policy.status,
          [policy.field]: LessThan(cutoffDate)
        },
        relations: ['evidence']
      });

      for (const violation of violationsToClean) {
        if (violation.evidence && violation.evidence.length > 0) {
          for (const ev of violation.evidence) {
             await this.deleteEvidenceFile(ev);
             await this.evidenceRepo.remove(ev);
             filesDeleted++;
          }
          recordsUpdated++;
        }
      }
    }
    
    this.logger.log(`Cleanup complete. Deleted ${filesDeleted} expired evidence files from ${recordsUpdated} violations.`);
    await this.deleteOrphanedFiles();
  }

  private async deleteEvidenceFile(evidence: Evidence) {
    if (!evidence.filePath || evidence.filePath.startsWith('http')) return;
    
    const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR', path.join(process.cwd(), '..', '..', 'uploads'));
    const fullPath = path.resolve(uploadDir, evidence.filePath);
    
    try {
      await fs.unlink(fullPath);
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        this.logger.error(`Failed to delete file ${fullPath}: ${e.message}`);
      }
    }
  }

  // Delete orphaned files at 2:00 AM daily
  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  private async deleteOrphanedFiles() {
    this.logger.log('Scanning for orphaned media files...');
    
    const now = new Date();
    const FREEZE_START = new Date('2026-10-16T00:00:00.000Z');
    const FREEZE_END   = new Date('2026-11-16T23:59:59.999Z');
    if (now >= FREEZE_START && now <= FREEZE_END) {
      this.logger.log('CLEANUP SKIPPED — Model training freeze window active (16 Oct – 16 Nov 2026). Orphaned file deletion suspended.');
      return;
    }
    const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR', path.join(process.cwd(), '..', '..', 'uploads'));
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const files = await fs.readdir(uploadDir);
      
      let orphansDeleted = 0;
      for (const file of files) {
        // Find if this file is linked to any evidence
        const exists = await this.evidenceRepo.findOne({ where: { filePath: file } });
        if (!exists) {
           await fs.unlink(path.join(uploadDir, file));
           orphansDeleted++;
        }
      }
      
      if (orphansDeleted > 0) {
        this.logger.log(`Deleted ${orphansDeleted} orphaned files.`);
      }
    } catch(e: any) {
      this.logger.error(`Orphaned file cleanup failed: ${e.message}`);
    }
  }
}
