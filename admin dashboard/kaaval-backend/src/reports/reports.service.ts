import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Violation } from '../violations/entities/violation.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Daily Report ────────────────────────────────────────────────────────────

  async getDailyReport(dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const violations = await this.violationRepo.find({
      where: { createdAt: Between(start, end) },
      relations: ['violationType', 'camera', 'camera.junction', 'camera.junction.subdivision'],
    });

    return this.buildDailyStats(violations, date);
  }

  private buildDailyStats(violations: Violation[], date: Date) {
    const total     = violations.length;
    const verified  = violations.filter(v => ['CHALLAN_ISSUED', 'VERIFIED'].includes(v.status)).length;
    const rejected  = violations.filter(v => ['REJECTED', 'DUPLICATE'].includes(v.status)).length;
    const pending   = violations.filter(v => ['PENDING', 'READY', 'UNDER_REVIEW'].includes(v.status)).length;

    const byType: Record<string, number> = {};
    for (const v of violations) {
      const t = this.formatType(v.violationType?.violationCode || 'UNKNOWN');
      byType[t] = (byType[t] || 0) + 1;
    }

    // Use readable subdivision name, not UUID
    const bySubdivision: Record<string, number> = {};
    for (const v of violations) {
      const sub = (v.camera?.junction as any)?.subdivision?.subdivisionName
        ?? v.camera?.junction?.subdivisionId
        ?? 'Unknown';
      bySubdivision[sub] = (bySubdivision[sub] || 0) + 1;
    }

    const byCamera: Record<string, number> = {};
    for (const v of violations) {
      const cam = v.camera?.junction?.junctionName
        ? `${v.camera.cameraCode} — ${v.camera.junction.junctionName}`
        : v.camera?.cameraCode ?? 'Unknown';
      byCamera[cam] = (byCamera[cam] || 0) + 1;
    }

    const avgConfidence = total
      ? violations.reduce((s, v) => s + (v.confidence ?? 0), 0) / total
      : 0;

    return {
      date: date.toISOString().split('T')[0],
      total,
      verified,
      rejected,
      pending,
      approvalRate: total ? Math.round((verified / total) * 100) : 0,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      byType,
      bySubdivision,
      byCamera,
    };
  }

  // ─── Weekly Report ───────────────────────────────────────────────────────────

  async getWeeklyReport(startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = startDateStr ? new Date(startDateStr) : new Date(end);
    if (!startDateStr) {
      start.setDate(start.getDate() - 6);
    }
    start.setHours(0, 0, 0, 0);

    const violations = await this.violationRepo.find({
      where: { createdAt: Between(start, end) },
      relations: ['violationType', 'camera', 'camera.junction'],
    });

    // Build day-by-day trend
    const dayMap: Record<string, Violation[]> = {};
    for (const v of violations) {
      const day = v.createdAt.toISOString().split('T')[0];
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(v);
    }

    const dailyTrend = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().split('T')[0];
      const dayViolations = dayMap[key] ?? [];
      dailyTrend.push({
        date: key,
        total: dayViolations.length,
        verified: dayViolations.filter(v => ['CHALLAN_ISSUED', 'VERIFIED'].includes(v.status)).length,
        rejected: dayViolations.filter(v => ['REJECTED', 'DUPLICATE'].includes(v.status)).length,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalStats = this.buildDailyStats(violations, new Date());

    return {
      period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      summary: totalStats,
      dailyTrend,
    };
  }

  // ─── Cron: Daily Digest at 7 PM IST (1:30 PM UTC) ────────────────────────────

  @Cron('30 13 * * *', { timeZone: 'UTC' })
  async scheduleDailyDigest() {
    this.logger.log('⏰ Running daily digest cron...');
    try {
      const report = await this.getDailyReport();
      await this.notificationsService.createDailyDigest({
        total: report.total,
        verified: report.verified,
        rejected: report.rejected,
        pending: report.pending,
        bySubdivision: report.bySubdivision,
      });
      this.logger.log(`✅ Daily digest sent: ${report.total} violations today`);
    } catch (err) {
      this.logger.error('❌ Daily digest failed', err);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private formatType(raw: string): string {
    const map: Record<string, string> = {
      NO_HELMET: 'No Helmet',
      TRIPLE_RIDING: 'Triple Riding',
      NO_SEATBELT: 'No Seatbelt',
      RED_LIGHT_JUMP: 'Red Light Jump',
      OVER_SPEEDING: 'Over Speeding',
      OVERSPEEDING: 'Over Speeding',
    };
    return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
