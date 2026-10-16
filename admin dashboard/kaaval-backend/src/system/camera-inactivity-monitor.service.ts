import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Camera } from '../cameras/entities/camera.entity.js';
import { Violation } from '../violations/entities/violation.entity.js';
import { MailerService } from './mailer.service.js';

@Injectable()
export class CameraInactivityMonitorService {
  private readonly logger = new Logger(CameraInactivityMonitorService.name);
  private isChecking = false;

  constructor(
    @InjectRepository(Camera)
    private readonly cameraRepo: Repository<Camera>,
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    private readonly mailerService: MailerService,
  ) {}

  // Run every 2 minutes
  @Cron('*/2 * * * *')
  async checkCamerasInactivity() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // 1. Only check cameras where Super Admin has enabled alertOnInactivity
      const monitoredCameras = await this.cameraRepo.find({
        where: { alertOnInactivity: true },
        relations: ['junction', 'junction.subdivision'],
      });

      if (!monitoredCameras || monitoredCameras.length === 0) {
        return;
      }

      this.logger.debug(`Checking inactivity status for ${monitoredCameras.length} Super Admin monitored camera(s)...`);

      for (const cam of monitoredCameras) {
        // Query the latest violation for this camera
        const latestRes = await this.violationRepo
          .createQueryBuilder('v')
          .select('MAX(v.violationTimestamp)', 'latest')
          .where('v.cameraId = :camId', {
            camId: cam.id,
          })
          .getRawOne();

        const lastTimestamp = latestRes?.latest ? new Date(latestRes.latest) : null;
        const referenceTime = lastTimestamp
          ? lastTimestamp.getTime()
          : (cam.createdAt ? new Date(cam.createdAt).getTime() : Date.now());

        const diffMinutes = Math.floor((Date.now() - referenceTime) / 60000);

        if (diffMinutes >= 20) {
          // Camera is inactive for >20 mins.
          // Cooldown check: alert once immediately, and re-alert after 60 mins if still offline
          const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
          const lastSentTime = cam.lastInactivityAlertSent
            ? new Date(cam.lastInactivityAlertSent).getTime()
            : 0;

          const shouldSendAlert = !lastSentTime || (Date.now() - lastSentTime) >= ALERT_COOLDOWN_MS;

          if (shouldSendAlert) {
            this.logger.warn(
              `🚨 HIGH ALERT: Camera ${cam.cameraCode} (${cam.cameraName}) has had NO violations for ${diffMinutes} minutes! Sending email alert.`,
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
          // Camera is active (<20 mins since last violation).
          // If previous alert was sent, reset alert flag so it triggers if it goes offline again.
          if (cam.lastInactivityAlertSent) {
            this.logger.log(`Camera ${cam.cameraCode} active again (${diffMinutes}m ago). Resetting inactivity alert tracker.`);
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

  // Manual trigger for testing / immediate diagnostic check
  async triggerManualCheck() {
    await this.checkCamerasInactivity();
    return { status: 'check_completed' };
  }
}
