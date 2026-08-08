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
      // 1. Pending: Delete after 1 week (Hard delete)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pendingViolations = await this.violationsRepository.find({
        where: { status: 'PENDING', createdAt: LessThan(sevenDaysAgo) },
        relations: ['evidence'],
      });
      
      for (const violation of pendingViolations) {
        this.deleteAssociatedFiles(violation);
        await this.violationsRepository.remove(violation);
        this.logger.log(`Deleted PENDING violation ${violation.id} (older than 7d)`);
      }

      // 2. Rejected: Delete after 2 days (Hard delete)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const rejectedViolations = await this.violationsRepository.find({
        where: { status: 'REJECTED', updatedAt: LessThan(twoDaysAgo) },
        relations: ['evidence'],
      });

      for (const violation of rejectedViolations) {
        this.deleteAssociatedFiles(violation);
        await this.violationsRepository.remove(violation);
        this.logger.log(`Deleted REJECTED violation ${violation.id} (older than 2d)`);
      }

      // 3. Issued: Delete after 15 days (Hard delete)
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      const issuedViolations = await this.violationsRepository.find({
        where: { status: 'ISSUED', updatedAt: LessThan(fifteenDaysAgo) },
        relations: ['evidence'],
      });

      for (const violation of issuedViolations) {
        this.deleteAssociatedFiles(violation);
        await this.violationsRepository.remove(violation);
        this.logger.log(`Deleted ISSUED violation ${violation.id} (older than 15d)`);
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
