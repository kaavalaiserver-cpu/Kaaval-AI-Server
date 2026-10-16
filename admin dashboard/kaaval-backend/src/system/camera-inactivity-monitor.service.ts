import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Camera } from '../cameras/entities/camera.entity.js';
import { Violation } from '../violations/entities/violation.entity.js';
import { MailerService } from './mailer.service.js';

@Injectable()
export class CameraInactivityMonitorService {
  private readonly logger = new Logger(CameraInactivityMonitorService.name);
  private isChecking = false;

  // Indian Standard Time (UTC+5:30) offset in milliseconds
  private readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  // Default Daily Operating Window: 8:00 AM to 6:00 PM IST
  private readonly DEFAULT_START_HOUR = 8;
  private readonly DEFAULT_START_MINUTE = 0;
  private readonly DEFAULT_END_HOUR = 18;
  private readonly DEFAULT_END_MINUTE = 0;

  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Helper to get current Indian Standard Time (IST) details
   */
  private getIstTime(date = new Date()) {
    const istDate = new Date(date.getTime() + this.IST_OFFSET_MS);
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;
    const year = istDate.getUTCFullYear();
    const month = istDate.getUTCMonth();
    const day = istDate.getUTCDate();

    return {
      istDate,
      hours,
      minutes,
      totalMinutes,
      year,
      month,
      day,
      timeStr: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} IST`,
    };
  }

  // Periodic check running every 2 minutes
  @Cron('*/2 * * * *')
  async checkCamerasInactivity(ignoreOperatingHours = false) {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const nowUtcMs = Date.now();
      const ist = this.getIstTime(new Date(nowUtcMs));

      const globalStartMinutes = this.DEFAULT_START_HOUR * 60 + this.DEFAULT_START_MINUTE; // 480 (08:00 AM)
      const globalEndMinutes = this.DEFAULT_END_HOUR * 60 + this.DEFAULT_END_MINUTE;       // 1080 (06:00 PM)

      // ── 1. Operating Hours Restriction (08:00 AM - 06:00 PM IST) ─────────────
      // Outside 8 AM - 6 PM daily, all kits are powered down / offline by design.
      const isWithinOperatingHours = ist.totalMinutes >= globalStartMinutes && ist.totalMinutes < globalEndMinutes;

      if (!isWithinOperatingHours && !ignoreOperatingHours) {
        this.logger.debug(
          `Current time ${ist.timeStr} is outside active operating hours (08:00 AM - 06:00 PM IST). Inactivity email alerts are disabled during night standby.`,
        );
        return;
      }

      // ── 2. Query Cameras Designated by Super Admin ───────────────────────────
      const monitoredCameras = await this.cameraRepo.find({
        where: { alertOnInactivity: true },
        relations: ['junction', 'junction.subdivision'],
      });

      if (!monitoredCameras || monitoredCameras.length === 0) {
        return;
      }

      this.logger.debug(
        `Checking inactivity status for ${monitoredCameras.length} Super Admin designated camera(s) at ${ist.timeStr}...`,
      );

      for (const cam of monitoredCameras) {
        // Resolve camera-specific operating window if set, otherwise default to 08:00 - 18:00
        let camStartMinutes = globalStartMinutes;
        let camEndMinutes = globalEndMinutes;

        if (cam.operatingStartTime && /^\d{2}:\d{2}$/.test(cam.operatingStartTime)) {
          const [h, m] = cam.operatingStartTime.split(':').map(Number);
          camStartMinutes = h * 60 + m;
        }
        if (cam.operatingEndTime && /^\d{2}:\d{2}$/.test(cam.operatingEndTime)) {
          const [h, m] = cam.operatingEndTime.split(':').map(Number);
          camEndMinutes = h * 60 + m;
        }

        // Verify camera is within its designated operating window
        if (!ignoreOperatingHours && (ist.totalMinutes < camStartMinutes || ist.totalMinutes >= camEndMinutes)) {
          continue;
        }

        // Compute today's start of operations in UTC epoch milliseconds
        // (Date.UTC for IST midnight minus 5.5 hours + camStartMinutes)
        const istMidnightUtcMs = Date.UTC(ist.year, ist.month, ist.day, 0, 0, 0, 0) - this.IST_OFFSET_MS;
        const todayStartOfOperationsUtcMs = istMidnightUtcMs + camStartMinutes * 60 * 1000;

        // Query the latest violation for this camera
        const latestRes = await this.violationRepo
          .createQueryBuilder('v')
          .select('MAX(v.violationTimestamp)', 'latest')
          .where('v.cameraId = :camId', {
            camId: cam.id,
          })
          .getRawOne();

        const lastTimestamp = latestRes?.latest ? new Date(latestRes.latest) : null;
        const lastViolationMs = lastTimestamp ? lastTimestamp.getTime() : 0;

        // The effective active baseline for today cannot be earlier than today's start of operations (e.g. 08:00 AM IST)
        // This prevents false alerts at 08:05 AM for cameras that were offline overnight.
        const effectiveLastActiveMs = Math.max(lastViolationMs, todayStartOfOperationsUtcMs);

        const diffMinutes = Math.floor((nowUtcMs - effectiveLastActiveMs) / 60000);

        if (diffMinutes >= 20) {
          // Camera is silent for >20 minutes during active operating hours.
          // Cooldown: alert once immediately, then re-alert after 60 minutes if still silent.
          const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
          const lastSentTime = cam.lastInactivityAlertSent
            ? new Date(cam.lastInactivityAlertSent).getTime()
            : 0;

          const shouldSendAlert = !lastSentTime || (nowUtcMs - lastSentTime) >= ALERT_COOLDOWN_MS;

          if (shouldSendAlert) {
            this.logger.warn(
              `🚨 HIGH ALERT: Camera ${cam.cameraCode} (${cam.cameraName}) silent for ${diffMinutes} minutes during operating hours (08:00 - 18:00 IST). Dispatching alert email.`,
            );

            const sent = await this.mailerService.sendCameraInactivityAlert({
              cameraCode: cam.cameraCode,
              cameraName: cam.cameraName,
              subdivisionName: cam.junction?.subdivision?.subdivisionName,
              junctionName: cam.junction?.junctionName,
              minutesInactive: diffMinutes,
              lastViolationTimestamp: lastTimestamp,
            });

            if (sent) {
              await this.cameraRepo.update(cam.id, {
                lastInactivityAlertSent: new Date(),
              });
            }
          }
        } else {
          // Camera has transmitted violations within the last 20 minutes.
          // If a previous alert was sent, reset the alert tracker so future outages re-trigger alerts.
          if (cam.lastInactivityAlertSent) {
            this.logger.log(
              `Camera ${cam.cameraCode} active again (${diffMinutes}m since last violation). Resetting inactivity tracker.`,
            );
            await this.cameraRepo.update(cam.id, {
              lastInactivityAlertSent: null,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in CameraInactivityMonitorService: ${err.message || err}`, err.stack);
    } finally {
      this.isChecking = false;
    }
  }

  // Diagnostic manual trigger endpoint
  async triggerManualCheck(ignoreOperatingHours = false) {
    await this.checkCamerasInactivity(ignoreOperatingHours);
    const ist = this.getIstTime();
    return {
      status: 'check_completed',
      currentTimeIST: ist.timeStr,
      operatingHours: '08:00 AM - 06:00 PM IST',
      withinOperatingHours: ist.totalMinutes >= 480 && ist.totalMinutes < 1080,
    };
  }
}
