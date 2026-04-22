import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Violation } from '../violations/entities/violation.entity.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  async getSummary() {
    const cached = await this.cache.get<Record<string, unknown>>(
      'analytics-summary',
    );
    if (cached) return cached;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const violations = await this.violationRepo.find({
      where: { createdAt: MoreThanOrEqual(sevenDaysAgo) },
    });

    const total = violations.length;
    const pendingReview = violations.filter((v) =>
      ['PENDING', 'READY', 'MANUAL_REVIEW'].includes(v.status),
    ).length;
    const finesIssued = violations.filter(
      (v) => v.status === 'CHALLAN_ISSUED',
    ).length;
    const helmetViolations = violations.filter((v) =>
      v.violationType?.includes('HELMET'),
    ).length;
    const helmetCompliance =
      total > 0 ? ((1 - helmetViolations / total) * 100).toFixed(1) : '100.0';

    // Violations by day
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const byDay = new Array<number>(7).fill(0);
    for (const v of violations) {
      const day = v.createdAt.getDay();
      const mapped = day === 0 ? 6 : day - 1;
      byDay[mapped]++;
    }

    // Violations by camera
    const byCam: Record<string, number> = {};
    for (const v of violations) {
      const cam = v.cameraId || 'Unknown';
      byCam[cam] = (byCam[cam] || 0) + 1;
    }

    // Peak hours
    const byHour = new Array<number>(24).fill(0);
    for (const v of violations) {
      byHour[v.createdAt.getHours()]++;
    }

    // Build violationsByDay array
    const violationsByDay = dayLabels.map((label, i) => ({ date: label, count: byDay[i] }));

    // Build violationsByCamera array
    const violationsByCamera = Object.entries(byCam).map(([camera_id, count]) => ({ camera_id, count }));

    // Build peakHours array
    const peakHours = byHour.map((count, hour) => ({ hour, count }));

    // Count active cameras
    const cameraCount = await this.violationRepo.query(
      `SELECT COUNT(DISTINCT camera_id) as cnt FROM violations WHERE camera_id IS NOT NULL AND camera_id != 'BATCH_UPLOAD'`,
    );
    const camerasActive = parseInt(cameraCount?.[0]?.cnt ?? '0', 10);

    const summary = {
      totalViolations: total,
      camerasActive,
      helmetComplianceRate: parseFloat(helmetCompliance as string),
      violationsByDay,
      violationsByCamera,
      peakHours,
    };

    await this.cache.set('analytics-summary', summary, 60000);
    return summary;
  }

  /** Dev analytics - detailed pipeline metrics for Kaaval AI admin */
  async getDevAnalytics() {
    const cached = await this.cache.get<Record<string, unknown>>('dev-analytics');
    if (cached) return cached;

    const all = await this.violationRepo.find();

    const twoWheelers = all.filter((v) => {
      const vt = (v.violationType || '').toLowerCase();
      return vt.includes('helmet') || vt.includes('triple');
    });

    const fourWheelers = all.filter((v) => {
      const vt = (v.violationType || '').toLowerCase();
      return vt.includes('seatbelt') || vt.includes('speed');
    });

    const platesExtracted = all.filter(
      (v) => v.vehicleNumber && v.vehicleNumber !== 'UNREAD',
    );
    const highConfidence = all.filter((v) => v.confidenceScore >= 0.7);
    const lowConfidence = all.filter(
      (v) => v.confidenceScore > 0 && v.confidenceScore < 0.7,
    );
    const noOcr = all.filter((v) => !v.confidenceScore || v.confidenceScore === 0);

    const finesIssued = all.filter((v) => v.status === 'CHALLAN_ISSUED');
    const twoWheelerFines = finesIssued.filter((v) => {
      const vt = (v.violationType || '').toLowerCase();
      return vt.includes('helmet') || vt.includes('triple');
    });
    const fourWheelerFines = finesIssued.filter((v) => {
      const vt = (v.violationType || '').toLowerCase();
      return vt.includes('seatbelt') || vt.includes('speed');
    });

    // Processing pipeline metrics
    const byStatus: Record<string, number> = {};
    for (const v of all) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }

    // Batch vs Camera detections
    const batchUploads = all.filter((v) => v.cameraId === 'BATCH_UPLOAD').length;
    const cameraDetections = all.length - batchUploads;

    // OCR confidence distribution
    const confBuckets = { '0-30%': 0, '30-50%': 0, '50-70%': 0, '70-90%': 0, '90-100%': 0 };
    for (const v of all) {
      const c = v.confidenceScore * 100;
      if (c < 30) confBuckets['0-30%']++;
      else if (c < 50) confBuckets['30-50%']++;
      else if (c < 70) confBuckets['50-70%']++;
      else if (c < 90) confBuckets['70-90%']++;
      else confBuckets['90-100%']++;
    }

    // Type breakdown
    const typeBreakdown: Record<string, number> = {};
    for (const v of all) {
      const t = v.violationType || 'Unknown';
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    }

    const avgConfidence =
      all.length > 0
        ? all.reduce((s, v) => s + v.confidenceScore, 0) / all.length
        : 0;

    // Determine pipeline health
    const errorCount = byStatus['ERROR'] ?? 0;
    const pipelineStatus = errorCount > all.length * 0.1 ? 'degraded' : 'healthy';

    const result = {
      twoWheelerCount: twoWheelers.length,
      fourWheelerCount: fourWheelers.length,
      plateExtractionCount: platesExtracted.length,
      plateExtractionRate:
        all.length > 0
          ? parseFloat(((platesExtracted.length / all.length) * 100).toFixed(1))
          : 0,
      ocrSuccessCount: highConfidence.length,
      ocrFailCount: noOcr.length,
      avgConfidence: parseFloat((avgConfidence).toFixed(4)),
      pipelineStatus,
      cameraFeedCount: cameraDetections,
      batchUploadCount: batchUploads,
      confidenceDistribution: Object.entries(confBuckets).map(([bucket, count]) => ({ bucket, count })),
    };

    await this.cache.set('dev-analytics', result, 30000);
    return result;
  }

  async getPeakHours(days?: number) {
    const period = days ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - period);
    
    // SQLite: strftime('%H', created_at)
    // Note: Assuming stored as ISO string or compatible format by TypeORM
    const raw = await this.violationRepo.query(
        `SELECT strftime('%H', created_at) as hour, COUNT(*) as count FROM violations WHERE created_at >= ? GROUP BY hour ORDER BY hour`,
        [since.toISOString()]
    );
    
    // Map to full 24h
    const fullDay = Array.from({ length: 24 }, (_, i) => {
        const h = i.toString().padStart(2, '0');
        const found = raw.find((r: any) => r.hour === h);
        return { hour: i, count: parseInt(found?.count || '0', 10) };
    });
    return fullDay;
  }

  async getCameraEfficiency(days?: number) {
      const period = days ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - period);

      const stats = await this.violationRepo.query(`
        SELECT 
            camera_id as cameraId, 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'CHALLAN_ISSUED' THEN 1 ELSE 0 END) as issued,
            SUM(CASE WHEN status IN ('REJECTED', 'DUPLICATE') THEN 1 ELSE 0 END) as rejected
        FROM violations
        WHERE created_at >= ? AND camera_id IS NOT NULL AND camera_id != 'BATCH_UPLOAD'
        GROUP BY camera_id
      `, [since.toISOString()]);

      return stats.map((s: any) => ({
          camera_id: s.cameraId,
          total_violations: s.total,
          challans_issued: s.issued || 0,
          rejected_count: s.rejected || 0,
          efficiency_rate: s.total > 0 ? ((s.issued || 0) / s.total * 100).toFixed(1) : '0.0'
      }));
  }

  async getHeatmapData(days?: number) {
      const period = days ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - period);

      const points = await this.violationRepo.find({
          select: ['locationLat', 'locationLng', 'violationType'],
          where: { createdAt: MoreThanOrEqual(since) } 
      });
      
      return points
        .filter(p => p.locationLat != null && p.locationLng != null)
        .map(p => ({
          lat: p.locationLat,
          lng: p.locationLng,
          type: p.violationType,
          weight: 1
      }));
  }
}
