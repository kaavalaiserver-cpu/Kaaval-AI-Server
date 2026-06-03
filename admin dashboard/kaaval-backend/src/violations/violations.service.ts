import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Between, ILike, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { WatchlistService } from '../watchlist/watchlist.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Violation } from './entities/violation.entity.js';
import {
  ViolationQueryDto,
  VerifyViolationDto,
  UpdateViolationDto,
  CreateViolationDto,
} from './dto/violation.dto.js';
import { isInUserScope, type ScopedUser } from '../auth/subdivision-access.js';
import { AuditService } from '../system/audit.service.js';

const CAMERA_LOCATIONS: Record<string, string> = {
  'CAM-001': 'T. Nagar Junction',
  'CAM-002': 'Anna Salai Main Road',
  'CAM-003': 'Chennai Central',
  'CAM-004': 'Mylapore Market',
  'CAM-005': 'Guindy Circle',
  'CAM_001': 'T. Nagar Junction',
  'CAM-EDGE-01': 'Kaaval AI - Ramanputhoor',
  BATCH_UPLOAD: 'Batch Upload',
};

const VIOLATION_TYPE_MAP: Record<string, string> = {
  NO_HELMET: 'No Helmet',
  TRIPLE_RIDING: 'Triple Riding',
  NO_SEATBELT: 'No Seatbelt',
  RED_LIGHT_JUMP: 'Red Light Jump',
  OVER_SPEEDING: 'Over Speeding',
  OVERSPEEDING: 'Over Speeding',
  WRONG_WAY: 'Wrong Way',
  NO_PARKING: 'No Parking',
  DEBUG_TEST: 'Debug Test',
  PENDING_DETECTION: 'Pending Detection',
};

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly watchlistService: WatchlistService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private formatViolationType(raw: string): string {
    return (
      VIOLATION_TYPE_MAP[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  private mapStatusToDashboard(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending',
      READY: 'Ready',
      MANUAL_REVIEW: 'Review',
      CHALLAN_ISSUED: 'Verified',
      VERIFIED: 'Verified',
      REJECTED: 'Rejected',
      DUPLICATE: 'Rejected',
      ERROR: 'Pending',
    };
    return map[status] ?? 'Pending';
  }

  private mapStatusFromAction(action: string): string {
    if (action === 'approve') return 'CHALLAN_ISSUED';
    if (action === 'reject') return 'REJECTED';
    return action.toUpperCase();
  }

  private inferVehicleType(violationType: string): string {
    const vt = violationType.toLowerCase();
    if (vt.includes('helmet') || vt.includes('triple')) return '2-Wheeler';
    if (vt.includes('seatbelt') || vt.includes('seat belt')) return '4-Wheeler';
    if (vt.includes('speed')) return '4-Wheeler';
    return '2-Wheeler';
  }

  private async formatViolation(v: Violation) {
    const rawType = v.violationType || 'NO_HELMET';
    const violationType = this.formatViolationType(rawType);
    const cameraId = v.cameraId || 'CAM-001';
    const meta = (v.metadata as Record<string, string>) || {};
    const location =
      CAMERA_LOCATIONS[cameraId] ?? meta['location_name'] ?? cameraId;
    const confidence = v.confidenceScore || 0;

    const formatImageUrl = async (url: string | null) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const s3 = new S3Client({ region: 'ap-south-1' });
        const command = new GetObjectCommand({
          Bucket: 'kaaval-ai-images',
          Key: url,
        });
        return await getSignedUrl(s3, command, { expiresIn: 3600 });
      } catch (e) {
        console.error('Failed to generate presigned URL', e);
        return '';
      }
    };

    const imageUrl = await formatImageUrl(v.imageUrl);
    const proofUrl = await formatImageUrl(v.proofImgUrl);

    return {
      id: v.id,
      timestamp: v.createdAt.toISOString(),
      type: violationType,
      vehicle_type: this.inferVehicleType(violationType),
      vehicle_number: v.vehicleNumber || 'UNREAD',
      location,
      camera_id: cameraId,
      violation_confidence: Math.min((confidence || 0) + 0.1, 1.0),
      plate_confidence: confidence || 0,
      cam_clarity: 0.85,
      confidence: confidence || 0,
      status: this.mapStatusToDashboard(v.status),
      raw_status: v.status,
      image_url: imageUrl,
      proof_img_url: proofUrl || imageUrl,
      gps_lat: v.locationLat,
      gps_lng: v.locationLng,
      challan_amount: v.challanAmount,
      challan_issued_at: v.challanIssuedAt,
      reviewed_by: v.reviewedBy,
      reviewed_at: v.reviewedAt,
      review_notes: v.reviewNotes,
      metadata: v.metadata,
    };
  }

  private getViolationLocationText(v: Violation): string {
    const meta = (v.metadata as Record<string, unknown> | null) ?? null;
    return (
      (meta?.location as string | undefined) ??
      (meta?.location_name as string | undefined) ??
      CAMERA_LOCATIONS[v.cameraId ?? ''] ??
      ''
    );
  }

  private getViolationSubdivisionText(v: Violation): string {
    const meta = (v.metadata as Record<string, unknown> | null) ?? null;
    return (
      (meta?.subdivision as string | undefined) ??
      (meta?.division as string | undefined) ??
      (meta?.region as string | undefined) ??
      ''
    );
  }

  private canAccessViolation(user: ScopedUser | undefined, v: Violation): boolean {
    return isInUserScope(
      user,
      v.locationLat,
      v.locationLng,
      this.getViolationLocationText(v),
      this.getViolationSubdivisionText(v),
    );
  }

  private assertViolationAccess(user: ScopedUser | undefined, v: Violation): void {
    if (!this.canAccessViolation(user, v)) {
      throw new ForbiddenException('You do not have access to this violation');
    }
  }

  private async invalidateStatsCache() {
    // Clear all stats caches to ensure fresh data for all roles
    await this.cache.del('violation-stats');
    await this.cache.del('violation-stats-developer');
    await this.cache.del('violation-stats-colachel_admin');
    await this.cache.del('violation-stats-marthandam_admin');
    await this.cache.del('violation-stats-nagercoil_admin');
    await this.cache.del('violation-stats-kanyakumari_admin');
    await this.cache.del('violation-stats-thuckalay_admin');
    await this.cache.del('dev-analytics');
    await this.cache.del('analytics-summary');
  }


  async processDetection(dto: { image_urls: string[]; metadata?: any }, aiBackendUrl: string) {
    if (!dto.image_urls || dto.image_urls.length === 0) {
        throw new Error('No images provided');
    }

    console.log(`[RDK] 📤 Received Detection Request for ${dto.image_urls.length} images`);
    // Basic Logger
    if (dto.metadata?.cameraId) {
        console.log(`[RDK] Camera: ${dto.metadata.cameraId}`);
    }

    try {
        // Forward to AI Engine (Python)
        // Ensure AI Service is running on http://127.0.0.1:8000
        const targetUrl = `${aiBackendUrl}/process-sequence`;
        console.log(`[AI] Checking ${targetUrl}...`);
        
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': this.configService.get<string>('AI_API_KEY', ''),
            },
            body: JSON.stringify({
                image_urls: dto.image_urls,
                metadata: dto.metadata || {}
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[AI] ❌ Failed: ${response.status} ${errText}`);
            throw new Error(`AI Service Error: ${response.status}`);
        }

        const result = (await response.json()) as any;
        console.log(`[AI] ✅ Result:`, result);
        
        return {
            status: 'processing',
            ai_response: result,
            message: 'Images sent to AI engine. Violation will be recorded if valid.'
        };

    } catch (error: any) {
        console.error(`[RDK] ❌ Error processing detection: ${error.message}`);
        // Log Error Event (optional)
        throw error;
    }
  }

  async create(dto: CreateViolationDto) {
    const rawStatus = dto.status || 'PENDING';
    const type = dto.violationType ?? 'NO_HELMET';
    const cameraId = dto.cameraId ?? 'CAM-001';

    // Duplicate Check:
    // 1. Global debounce (30s) - Catch rapid duplicates
    // 2. Camera debounce (3h) - Catch same vehicle lingering/passing same camera
    const recent = await this.violationRepo.find({
      where: [
        {
          vehicleNumber: dto.vehicleNumber,
          createdAt: Between(new Date(Date.now() - 30000), new Date()),
        },
        {
          vehicleNumber: dto.vehicleNumber,
          cameraId: cameraId,
          createdAt: Between(new Date(Date.now() - 3 * 60 * 60 * 1000), new Date()),
        }
      ],
      take: 1,
    });

    if (recent.length > 0 && dto.vehicleNumber.toLowerCase() !== 'nil') {
      console.log(`Duplicate skipped: ${dto.vehicleNumber} (Recent or Same Camera within 3h)`);
      return recent[0];
    }

    // WATCHLIST CHECK
    const watchlistEntry = await this.watchlistService.checkStatus(dto.vehicleNumber);
    if (watchlistEntry) {
      const priority = watchlistEntry.priority || 'MEDIUM';
      console.warn(`🚨 WATCHLIST ALERT: ${dto.vehicleNumber} (${watchlistEntry.reason})`);
      
      // Send Notification (type, message, data)
      await this.notificationsService.create(
        'watchlist_alert', 
        `WATCHLIST ALERT: ${priority} priority vehicle ${dto.vehicleNumber} detected at ${cameraId}`,
        {
          vehicleNumber: dto.vehicleNumber,
          cameraId: cameraId,
          priority: priority,
          reason: watchlistEntry.reason || 'Unknown',
          original_violation: type,
        }
      );
    }

    const v = this.violationRepo.create({
      vehicleNumber: dto.vehicleNumber,
      violationType: type,
      confidenceScore: dto.confidenceScore ?? 0.85,
      imageUrl: dto.imageUrl ?? '',
      proofImgUrl: dto.proofImgUrl ?? '',
      cameraId: cameraId,
      status: rawStatus,
      // amount: 1000, // Amount not in entity, moved to logic if needed
      metadata: {
        ...(dto.metadata ?? {}),
        checklist_flag: watchlistEntry ? (watchlistEntry.priority || 'FLAGGED') : undefined,
        checklist_reason: watchlistEntry ? watchlistEntry.reason : undefined,
      },
    });

    try {
      return await this.violationRepo.save(v);
    } catch (err) {
      console.error('Failed to save pipeline violation', err);
      return null;
    }
  }

  async findAll(query: ViolationQueryDto, user?: ScopedUser) {
    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: Not(In(['DUPLICATE'])),
      isDeleted: false,
    };

    if (query.status) where['status'] = query.status;
    if (query.cameraId) where['cameraId'] = query.cameraId;
    if (query.vehicleNumber)
      where['vehicleNumber'] = ILike(`%${query.vehicleNumber}%`);
    if (query.violationType) where['violationType'] = query.violationType;
    if (query.dateFrom && query.dateTo) {
      where['createdAt'] = Between(
        new Date(query.dateFrom),
        new Date(query.dateTo),
      );
    }

    const minConf = query.minConfidence !== undefined ? parseFloat(query.minConfidence) : undefined;
    const maxConf = query.maxConfidence !== undefined ? parseFloat(query.maxConfidence) : undefined;
    if (minConf !== undefined && maxConf !== undefined) {
      where['confidenceScore'] = Between(minConf, maxConf);
    } else if (minConf !== undefined) {
      where['confidenceScore'] = MoreThanOrEqual(minConf);
    } else if (maxConf !== undefined) {
      where['confidenceScore'] = LessThanOrEqual(maxConf);
    }

    const requiresScopeFilter = !!user && !['super_admin', 'traffic_admin', 'dev_admin'].includes(user.role);

    if (requiresScopeFilter) {
      const violations = await this.violationRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

      const scoped = violations.filter((v) => this.canAccessViolation(user, v));

      const paged = scoped.slice(skip, skip + limit);
      return {
        data: await Promise.all(paged.map(async (v) => await this.formatViolation(v))),
        total: scoped.length,
        page,
        limit,
      };
    }

    const [violations, total] = await this.violationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data: await Promise.all(violations.map(async (v) => await this.formatViolation(v))),
      total,
      page,
      limit,
    };
  }
  
  async trackVehicle(vehicleNumber: string) {
    const sightings = await this.violationRepo.find({
      where: { vehicleNumber: vehicleNumber },
      order: { createdAt: 'ASC' },
    });

    return sightings.map((v) => {
      const cameraId = v.cameraId || 'UNKNOWN';
      const meta = (v.metadata as Record<string, string>) || {};
      const locationName =
        CAMERA_LOCATIONS[cameraId] ?? meta['location_name'] ?? cameraId;

      return {
        violationId: v.id,
        vehicleNumber: v.vehicleNumber,
        cameraId: cameraId,
        locationName: locationName,
        timestamp: v.createdAt,
        type: this.formatViolationType(v.violationType),
        status: this.mapStatusToDashboard(v.status),
        imageUrl: v.imageUrl,
      };
    });
  }

  async findOne(id: string, user?: ScopedUser) {
    const v = await this.violationRepo.findOneBy({ id });
    if (!v) throw new NotFoundException('Violation not found');
    this.assertViolationAccess(user, v);
    return await this.formatViolation(v);
  }

  async getStats(user?: ScopedUser) {
    const cacheKey = user?.role && !['super_admin', 'traffic_admin', 'dev_admin'].includes(user.role)
      ? `violation-stats-${user.role}`
      : 'violation-stats';

    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const all = await this.violationRepo.find({
      where: { isDeleted: false },
      select: ['id', 'status', 'violationType', 'createdAt', 'locationLat', 'locationLng', 'cameraId', 'metadata', 'confidenceScore'],
    });

    const scopedData = all.filter((v) => this.canAccessViolation(user, v));

    const total = scopedData.length;
    const pending = scopedData.filter((v) =>
      ['PENDING', 'READY', 'MANUAL_REVIEW'].includes(v.status),
    ).length;
    const verified = scopedData.filter((v) =>
      ['CHALLAN_ISSUED', 'VERIFIED'].includes(v.status),
    ).length;
    const rejected = scopedData.filter((v) =>
      ['REJECTED', 'DUPLICATE'].includes(v.status),
    ).length;
    const review = scopedData.filter((v) => v.status === 'MANUAL_REVIEW').length;

    const byType: Record<string, number> = {};
    for (const v of scopedData) {
      const t = this.formatViolationType(v.violationType || 'Unknown');
      byType[t] = (byType[t] || 0) + 1;
    }

    const withConfidence = scopedData.filter((v) => (v.confidenceScore ?? 0) > 0).length;

    const stats = { total, pending, verified, rejected, manual_review: review, by_type: byType, with_confidence: withConfidence };
    await this.cache.set(cacheKey, stats, 30000); // Cache 30s
    return stats;
  }

  async verify(id: string, dto: VerifyViolationDto, user?: ScopedUser) {
    const v = await this.violationRepo.findOneBy({ id });
    if (!v) throw new NotFoundException('Violation not found');
    this.assertViolationAccess(user, v);

    const newStatus = this.mapStatusFromAction(dto.action);
    v.status = newStatus;
    v.reviewedBy = dto.reviewedBy ?? 'OFFICER';
    v.reviewedAt = new Date();
    if (dto.reviewNotes) v.reviewNotes = dto.reviewNotes;

    if (newStatus === 'CHALLAN_ISSUED') {
      v.challanStatus = 'ISSUED';
      v.challanAmount = v.challanAmount ?? 500;
      v.challanIssuedAt = new Date();
    }

    await this.violationRepo.save(v);
    await this.invalidateStatsCache();

    // Audit log
    await this.auditService.logAction(
      user?.id ?? null,
      newStatus === 'VERIFIED' ? 'VERIFY_VIOLATION' : 'UPDATE_VIOLATION',
      id,
      undefined,
      { newStatus, reviewNotes: dto.reviewNotes }
    );

    return {
      status: 'success',
      new_status: this.mapStatusToDashboard(newStatus),
      raw_status: newStatus,
    };
  }

  async update(id: string, dto: UpdateViolationDto, user?: ScopedUser) {
    const v = await this.violationRepo.findOneBy({ id });
    if (!v) throw new NotFoundException('Violation not found');
    this.assertViolationAccess(user, v);

    if (dto.vehicleNumber !== undefined) v.vehicleNumber = dto.vehicleNumber;
    if (dto.violationType !== undefined) v.violationType = dto.violationType;
    if (dto.challanAmount !== undefined) v.challanAmount = dto.challanAmount;
    if (dto.status !== undefined) v.status = dto.status;
    if (dto.reviewNotes !== undefined) v.reviewNotes = dto.reviewNotes;

    await this.violationRepo.save(v);
    await this.invalidateStatsCache();
    return await this.formatViolation(v);
  }

  async remove(id: string, user?: ScopedUser) {
    const v = await this.violationRepo.findOneBy({ id });
    if (!v) throw new NotFoundException('Violation not found');
    this.assertViolationAccess(user, v);
    
    // Soft delete implementation
    v.isDeleted = true;
    v.deletedAt = new Date();
    v.deletedBy = user?.username ?? 'SYSTEM';
    
    await this.violationRepo.save(v);
    await this.invalidateStatsCache();

    // Audit log
    await this.auditService.logAction(
      user?.id ?? null,
      'SOFT_DELETE_VIOLATION',
      id
    );

    return { status: 'deleted', id };
  }

  async batchUpload(
    files: Express.Multer.File[],
    aiBackendUrl: string,
  ) {
    const uploaded: Array<Record<string, unknown>> = [];
    const errors: Array<Record<string, string>> = [];
    console.log(`📡 BATCH UPLOAD: ${files.length} files`);


    // Forward to AI backend for OCR if available
    const ocrResults: Record<string, Record<string, unknown>> = {};
    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
      }

      const response = await fetch(`${aiBackendUrl}/api/batch-upload`, {
        method: 'POST',
        body: formData as unknown as BodyInit,
      });

      if (response.ok) {
        const body = (await response.json()) as {
          results: Array<{
            filename: string;
            best_plate?: string;
            best_confidence?: number;
            google_vision?: string;
            plate_recognizer?: string;
            best_result?: string;
          }>;
        };
        for (const r of body.results ?? []) {
          ocrResults[r.filename] = {
            plate: r.best_plate,
            confidence: r.best_confidence ?? 0,
            best_api: r.best_result,
          };
        }
      }
    } catch {
      console.log('AI Backend not reachable - creating rows as PENDING');
    }

    // Create violation rows
    for (const file of files) {
      const ocr = ocrResults[file.originalname] ?? {};
      const plate = ocr['plate'] as string | undefined;
      const confidence = (ocr['confidence'] as number) ?? 0;

      let status = 'PENDING';
      if (plate && confidence >= 0.7) status = 'READY';
      else if (plate && confidence > 0) status = 'MANUAL_REVIEW';

      const violation = this.violationRepo.create({
        imageUrl: '', // Will be set after storage upload
        proofImgUrl: '',
        status,
        cameraId: 'BATCH_UPLOAD',
        violationType: status === 'PENDING' ? 'PENDING_DETECTION' : 'NO_HELMET',
        confidenceScore: confidence,
        vehicleNumber: plate ?? null,
        metadata: ocr['best_api']
          ? { batch_ocr: { best_api: ocr['best_api'] } }
          : null,
      });

      try {
        const saved = await this.violationRepo.save(violation);
        uploaded.push({
          id: saved.id,
          filename: file.originalname,
          plate: plate ?? null,
          confidence,
          status,
        });
      } catch (e) {
        errors.push({
          filename: file.originalname,
          error: String(e),
        });
      }
    }

    await this.cache.del('violation-stats');

    return {
      uploaded: uploaded.length,
      errors: errors.length,
      files: uploaded,
      error_details: errors.length > 0 ? errors : null,
    };
  }
}
