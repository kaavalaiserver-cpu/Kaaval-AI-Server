import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';

@Injectable()
export class DiskMonitorService {
  private readonly logger = new Logger(DiskMonitorService.name);
  private isStorageBlocked = false;

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDiskSpace() {
    try {
      // The host F: drive is mounted here in docker-compose
      const drivePath = '/host_f_drive';
      if (!fs.existsSync(drivePath)) {
        return;
      }

      const stat = fs.statfsSync(drivePath);
      const totalSpace = stat.blocks * stat.bsize;
      const freeSpace = stat.bfree * stat.bsize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;

      if (usagePercent > 95) {
        if (!this.isStorageBlocked) {
          this.logger.error(`CRITICAL: Disk space at ${usagePercent.toFixed(1)}%. Halting new evidence ingestion.`);
          this.isStorageBlocked = true;
          // You can expand this to block the /ingest API endpoints automatically
        }
      } else if (usagePercent > 85) {
        this.logger.warn(`WARNING: Disk space at ${usagePercent.toFixed(1)}%. Please clean up old data.`);
        this.isStorageBlocked = false;
      } else {
        if (this.isStorageBlocked) {
          this.logger.log(`Disk space normalized to ${usagePercent.toFixed(1)}%. Resuming evidence ingestion.`);
          this.isStorageBlocked = false;
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to check disk space: ${error.message}`);
    }
  }

  isIngestionBlocked(): boolean {
    return this.isStorageBlocked;
  }
}
