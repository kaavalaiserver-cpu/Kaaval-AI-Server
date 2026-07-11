import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron('0 2 * * *') // Every day at 2:00 AM
  async handleDailyBackup() {
    // Only run if Postgres is used
    if (this.configService.get('DB_TYPE') !== 'postgres') return;

    this.logger.log('Starting daily PostgreSQL backup...');

    const host = this.configService.get<string>('DB_HOST', 'postgres');
    const port = this.configService.get<number>('DB_PORT', 5432);
    const user = this.configService.get<string>('DB_USERNAME', 'postgres');
    const password = this.configService.get<string>('DB_PASSWORD', 'postgres');
    const dbName = this.configService.get<string>('DB_NAME', 'kaaval_ai');

    // Make sure backup directory exists
    const backupDir = this.configService.get<string>('LOCAL_BACKUP_DIR', path.join(process.cwd(), '..', '..', 'backups'));
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (e) {
      // Ignored
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kaaval_db_backup_${timestamp}.sql.gz`;
    const filepath = path.join(backupDir, filename);

    const env = { ...process.env, PGPASSWORD: password };
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -F p | gzip > "${filepath}"`;

    try {
      await execAsync(command, { env });
      this.logger.log(`Database backup successful: ${filename}`);

      // Delete backups older than 7 days
      await this.cleanupOldBackups(backupDir);
    } catch (error: any) {
      this.logger.error(`Database backup failed: ${error.message}`);
    }
  }

  private async cleanupOldBackups(backupDir: string) {
    try {
      const files = await fs.readdir(backupDir);
      const now = new Date().getTime();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.sql.gz')) continue;
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtime.getTime() > SEVEN_DAYS) {
          await fs.unlink(filePath);
          this.logger.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to clean up old backups: ${error.message}`);
    }
  }
}
