import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly logFile = path.join(this.logDir, 'audit.log');

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      this.logger.error(`Failed to create audit log directory: ${err.message}`);
    }
  }

  async logAction(
    userId: string | null,
    action: string,
    violationId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    const timestamp = new Date();
    try {
      const log = this.auditRepository.create({
        userId: userId ?? 'SYSTEM',
        action,
        violationId,
        ipAddress,
        details,
      });
      await this.auditRepository.save(log);
    } catch (err) {
      this.logger.error(`Failed to write audit log to database: ${err}`);
    }

    // Append to file
    try {
      const logLine = JSON.stringify({
        timestamp: timestamp.toISOString(),
        userId: userId ?? 'SYSTEM',
        action,
        violationId: violationId ?? null,
        ipAddress: ipAddress ?? null,
        details: details ?? null,
      });
      fs.appendFileSync(this.logFile, logLine + '\n', 'utf8');
    } catch (err) {
      this.logger.error(`Failed to write audit log to file: ${err.message}`);
    }
  }
}
