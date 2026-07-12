import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from './entities/system-log.entity.js';
import { Camera } from '../cameras/entities/camera.entity.js';
import { SystemService } from './system.service.js';
import { SystemController } from './system.controller.js';
import { BackupService } from './backup.service.js';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditService } from './audit.service.js';
import { DiskMonitorService } from './disk-monitor.service.js';
import { RetentionService } from './retention.service.js';
import { Violation } from '../violations/entities/violation.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog, Camera, AuditLog, Violation])],
  controllers: [SystemController],
  providers: [SystemService, AuditService, BackupService, DiskMonitorService, RetentionService],
  exports: [SystemService, AuditService],
})
export class SystemModule {}
