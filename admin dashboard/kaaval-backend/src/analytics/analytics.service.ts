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

  async getSummary(user: any, requestedSubdivisionCode?: string) {
    const cacheKey = `analytics-summary-${user.role}-${requestedSubdivisionCode || 'all'}-${user.subdivisionId || 'all'}`;
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.violationType', 'violationType')
      .leftJoinAndSelect('v.camera', 'camera')
      .leftJoinAndSelect('camera.junction', 'junction')
      .leftJoinAndSelect('junction.subdivision', 'subdivision')
      .leftJoinAndSelect('v.vehicle', 'vehicle')
      .where('v.createdAt >= :date', { date: thirtyDaysAgo });

    // Enforce role-based access
    const role = (user.role || '').toUpperCase();
    if (!['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'].includes(role)) {
      if (!user.subdivisionId) {
        qb.andWhere('1=0');
      } else {
        qb.andWhere('subdivision.id = :subId', { subId: user.subdivisionId });
      }
    } else if (requestedSubdivisionCode && requestedSubdivisionCode.toLowerCase() !== 'all') {
      // Superadmin filtering by a specific subdivision
      qb.andWhere('LOWER(subdivision.subdivision_name) = LOWER(:code)', { code: requestedSubdivisionCode });
    }

    const violations30 = await qb.getMany();

    // All-time totals with the same filter
    const countQb = this.violationRepo.createQueryBuilder('v')
      .leftJoin('v.camera', 'camera')
      .leftJoin('camera.junction', 'junction')
      .leftJoin('junction.subdivision', 'subdivision');
      
    if (!['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'].includes(role)) {
      if (!user.subdivisionId) countQb.where('1=0');
      else countQb.where('subdivision.id = :subId', { subId: user.subdivisionId });
    } else if (requestedSubdivisionCode && requestedSubdivisionCode.toLowerCase() !== 'all') {
      countQb.where('LOWER(subdivision.subdivision_name) = LOWER(:code)', { code: requestedSubdivisionCode });
    }
    
    const allCount = await countQb.getCount();
    const pendingReview = violations30.filter(v =>
      ['PENDING', 'READY', 'UNDER_REVIEW'].includes(v.status),
    ).length;
    const challansIssued = violations30.filter(v => v.status === 'CHALLAN_ISSUED').length;

    // daily_last_30
    const dailyMap: Record<string, number> = {};
    const finesMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    const vehicleMap: Record<string, number> = {};
    const camMap: Record<string, number> = {};

    for (const v of violations30) {
      const dateKey = v.createdAt.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;

      if (v.status === 'CHALLAN_ISSUED') {
        finesMap[dateKey] = (finesMap[dateKey] || 0) + 1;
      }

      const type = v.violationType?.violationCode ?? 'UNKNOWN';
      typeMap[type] = (typeMap[type] || 0) + 1;

      const vn = (v.vehicle as any)?.registrationNumber ?? null;
      if (vn && vn !== 'UNREAD' && vn !== 'UNKNOWN') {
        vehicleMap[vn] = (vehicleMap[vn] || 0) + 1;
      }

      const cam = v.camera?.cameraCode || 'Unknown';
      camMap[cam] = (camMap[cam] || 0) + 1;
    }

    const daily_last_30 = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const fines_issued_last_30 = Object.entries(finesMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const by_type = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([violation_type, count]) => ({ violation_type, count }));

    const top_vehicles = Object.entries(vehicleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([vehicle_number, count]) => ({ vehicle_number, count }));

    const top_cameras = Object.entries(camMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([camera_id, count]) => ({ camera_id, count }));

    const todayKey = new Date().toISOString().slice(0, 10);
    const violations_today = dailyMap[todayKey] ?? 0;

    const summary = {
      // Fields expected by Analytics.tsx (FastAPIAnalyticsSummary)
      total_violations: allCount,
      violations_today,
      pending_review: pendingReview,
      challans_issued: challansIssued,
      daily_last_30,
      fines_issued_last_30,
      by_type,
      top_vehicles,
      top_cameras,
    };

    await this.cache.set(cacheKey, summary, 60000);
    return summary;
  }

  /** Dev analytics - detailed pipeline metrics for Kaaval AI admin */
  async getDevAnalytics() {
    const cached = await this.cache.get<Record<string, unknown>>('dev-analytics');
    if (cached) return cached;

    const all = await this.violationRepo.find({ relations: ['violationType', 'vehicle'] });

    const twoWheelers = all.filter((v) => {
      const vt = (v.violationType?.violationCode || '').toLowerCase();
      return vt.includes('helmet') || vt.includes('triple');
    });

    const fourWheelers = all.filter((v) => {
      const vt = (v.violationType?.violationCode || '').toLowerCase();
      return vt.includes('seatbelt') || vt.includes('speed');
    });

    const platesExtracted = all.filter(
      (v) => v.vehicle?.registrationNumber && v.vehicle.registrationNumber !== 'UNREAD',
    );
    const highConfidence = all.filter((v) => (v.confidence ?? 0) >= 0.7);
    const noOcr = all.filter((v) => !v.confidence || v.confidence === 0);

    // Processing pipeline metrics
    const byStatus: Record<string, number> = {};
    for (const v of all) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }

    // OCR confidence distribution
    const confBuckets = { '0-30%': 0, '30-50%': 0, '50-70%': 0, '70-90%': 0, '90-100%': 0 };
    for (const v of all) {
      const c = (v.confidence ?? 0) * 100;
      if (c < 30) confBuckets['0-30%']++;
      else if (c < 50) confBuckets['30-50%']++;
      else if (c < 70) confBuckets['50-70%']++;
      else if (c < 90) confBuckets['70-90%']++;
      else confBuckets['90-100%']++;
    }

    const avgConfidence =
      all.length > 0
        ? all.reduce((s, v) => s + (v.confidence ?? 0), 0) / all.length
        : 0;

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
      cameraFeedCount: all.length,
      batchUploadCount: 0,
      confidenceDistribution: Object.entries(confBuckets).map(([bucket, count]) => ({ bucket, count })),
    };

    await this.cache.set('dev-analytics', result, 30000);
    return result;
  }

  async getPeakHours(days?: number) {
    const period = days ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - period);

    const violations = await this.violationRepo.find({
      where: { createdAt: MoreThanOrEqual(since) },
      select: ['createdAt'],
    });

    const byHour = new Array<number>(24).fill(0);
    for (const v of violations) {
      byHour[v.createdAt.getHours()]++;
    }

    return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: byHour[i] }));
  }

  async getCameraEfficiency(days?: number) {
    const period = days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - period);

    const violations = await this.violationRepo.find({
      where: { createdAt: MoreThanOrEqual(since) },
      relations: ['camera'],
    });

    const byCam: Record<string, { total: number; issued: number; rejected: number }> = {};
    for (const v of violations) {
      if (!v.camera) continue;
      const cam = v.camera.cameraCode;
      if (!byCam[cam]) byCam[cam] = { total: 0, issued: 0, rejected: 0 };
      byCam[cam].total++;
      if (v.status === 'CHALLAN_ISSUED') byCam[cam].issued++;
      if (['REJECTED', 'DUPLICATE'].includes(v.status)) byCam[cam].rejected++;
    }

    return Object.entries(byCam).map(([camera_id, s]) => ({
      camera_id,
      total_violations: s.total,
      challans_issued: s.issued,
      rejected_count: s.rejected,
      efficiency_rate: s.total > 0 ? ((s.issued / s.total) * 100).toFixed(1) : '0.0',
    }));
  }

  async getHeatmapData(days?: number) {
    const period = days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - period);

    const points = await this.violationRepo.find({
      where: { createdAt: MoreThanOrEqual(since) },
      relations: ['camera', 'camera.junction', 'violationType'],
    });

    return points
      .filter(p => p.camera?.junction?.latitude != null && p.camera?.junction?.longitude != null)
      .map(p => ({
        lat: p.camera!.junction!.latitude,
        lng: p.camera!.junction!.longitude,
        type: p.violationType?.violationCode ?? 'Unknown',
        weight: 1,
      }));
  }
}
