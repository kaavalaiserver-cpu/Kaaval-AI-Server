import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    userId: string | null,
    action: string,
    violationId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
  ): Promise<void> {
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
      this.logger.error(`Failed to write audit log: ${err}`);
    }
  }
}
