import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, MoreThanOrEqual, LessThanOrEqual, SelectQueryBuilder } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as fs from 'fs';
import * as path from 'path';

import { Violation } from './entities/violation.entity.js';
import { ViolationType } from './entities/violation-type.entity.js';
import { Evidence } from './entities/evidence.entity.js';
import { ViolationReview } from './entities/violation-review.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';

import { WatchlistService } from '../watchlist/watchlist.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../system/audit.service.js';

import {
  ViolationQueryDto,
  VerifyViolationDto,
  UpdateViolationDto,
  CreateViolationDto,
} from './dto/violation.dto.js';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
    @InjectRepository(ViolationType)
    private readonly violationTypeRepo: Repository<ViolationType>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Evidence)
    private readonly evidenceRepo: Repository<Evidence>,
    @InjectRepository(ViolationReview)
    private readonly reviewRepo: Repository<ViolationReview>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    private readonly watchlistService: WatchlistService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private canAccessViolation(user: any, subdivisionId?: string | null): boolean {
    if (!user) return false;
    const role = (user.role || '').toUpperCase();
    if (['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER'].includes(role)) return true;
    if (!user.subdivisionId) return false;
    return subdivisionId === user.subdivisionId;
  }

  private applyOperatingTimeFilter(qb: SelectQueryBuilder<Violation>) {
    qb.andWhere(`(
      v.status != 'PENDING'
      OR
      (camera.operating_start_time IS NULL OR camera.operating_end_time IS NULL)
      OR
      (
        camera.operating_start_time <= camera.operating_end_time AND
        (v.violation_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time >= camera.operating_start_time::time AND
        (v.violation_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time <= camera.operating_end_time::time
      )
      OR
      (
        camera.operating_start_time > camera.operating_end_time AND
        (
          (v.violation_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time >= camera.operating_start_time::time OR
          (v.violation_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::time <= camera.operating_end_time::time
        )
      )
    )`);
  }

  private applySubdivisionScope(qb: SelectQueryBuilder<Violation>, user: any, requestedSubdivisionCode?: string) {
    const role = (user?.role || '').toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER', 'COMMISSIONER', 'ADG'].includes(role)) {
      if (user.junctionId) {
        qb.andWhere('junction.id = :jId', { jId: user.junctionId });
      } else if (user.subdivisionId) {
        qb.andWhere('junction.subdivision_id = :subId', { subId: user.subdivisionId });
      } else {
        qb.andWhere('1=0');
      }
    } else if (requestedSubdivisionCode && requestedSubdivisionCode.toLowerCase() !== 'all') {
      qb.andWhere('LOWER(subdivision.subdivision_name) = LOWER(:reqSubCode)', { reqSubCode: requestedSubdivisionCode });
    }
  }

  async getImageStreamByKey(key: string, user?: any) {
    const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR', path.join(process.cwd(), '..', '..', 'uploads'));
    const filePath = path.resolve(uploadDir, key);
    if (!filePath.startsWith(path.resolve(uploadDir))) {
      throw new ForbiddenException('Invalid image key');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Image not found on disk');
    }
    return fs.createReadStream(filePath);
  }

  async processDetection(dto: { image_urls: string[]; metadata?: any }, aiBackendUrl: string) {
    return { status: 'processing', message: 'Images sent to AI engine.' };
  }

  async create(dto: CreateViolationDto, user?: any) {
    let vehicle = await this.vehicleRepo.findOne({ where: { registrationNumber: dto.vehicleNumber } });
    if (!vehicle && dto.vehicleNumber) {
      vehicle = await this.vehicleRepo.save(this.vehicleRepo.create({ registrationNumber: dto.vehicleNumber }));
    }

    let vType = await this.violationTypeRepo.findOne({ where: { violationCode: dto.violationType } });
    const violation = this.violationRepo.create({
      cameraId: dto.cameraId,
      vehicleId: vehicle?.id,
      violationTypeId: vType?.id,
      status: dto.status || 'PENDING',
      violationTimestamp: new Date(),
    });

    const saved = await this.violationRepo.save(violation);

    if (dto.imageUrl) {
      await this.evidenceRepo.save(this.evidenceRepo.create({
        violationId: saved.id,
        evidenceType: 'RAW_IMAGE',
        filePath: dto.imageUrl,
      }));
    }

    if (dto.proofImgUrl) {
      await this.evidenceRepo.save(this.evidenceRepo.create({
        violationId: saved.id,
        evidenceType: 'CROPPED_PLATE',
        filePath: dto.proofImgUrl,
      }));
    }

    return saved;
  }

  async findAll(query: ViolationQueryDto, user?: any) {
    const limit = Math.min(query.limit ?? 50, 200);
    const page = Math.max(query.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.vehicle', 'vehicle')
      .leftJoinAndSelect('v.violationType', 'violationType')
      .leftJoinAndSelect('v.camera', 'camera')
      .leftJoinAndSelect('camera.junction', 'junction')
      .leftJoinAndSelect('junction.subdivision', 'subdivision')
      .leftJoinAndSelect('v.evidence', 'evidence')
      .leftJoinAndSelect('v.reviewedBy', 'reviewer')
      .orderBy('v.violationTimestamp', 'DESC')
      .take(limit)
      .skip(offset);

    // ── Filters ──────────────────────────────────────────────────
    qb.andWhere('violationType.is_active = true');

    if (query.status && query.status !== '') {
      qb.andWhere('v.status = :status', { status: query.status });
    } else {
      // Exclude cancelled items from the default 'ALL' view so they appear "deleted"
      qb.andWhere("v.status != 'CANCELLED'");
    }
    if (query.cameraId) {
      qb.andWhere('camera.camera_code = :cameraId', { cameraId: query.cameraId });
    }
    if (query.vehicleNumber) {
      qb.andWhere('vehicle.registration_number ILIKE :vn', { vn: `%${query.vehicleNumber}%` });
    }
    if (query.violationType) {
      const types = query.violationType.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 0) {
        qb.andWhere('violationType.id IN (:...types)', { types });
        console.log("Applied violationType filter! Types:", types);
        console.log("SQL:", qb.getSql());
        console.log("Params:", qb.getParameters());
      }
    }
    if (query.dateFrom) {
      qb.andWhere('v.violationTimestamp >= :from', { from: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('v.violationTimestamp <= :to', { to });
    }

    this.applyOperatingTimeFilter(qb);

    // ── RBAC subdivision scope ────────────────────────────────────
    this.applySubdivisionScope(qb, user, query.subdivisionCode);

    console.log("findAll SQL:", qb.getSql(), qb.getParameters());

    const [violations, total] = await qb.getManyAndCount();

    const data = violations.map(v => this.formatViolation(v, user));
    return { data, total, page, limit };
  }

  async trackVehicle(vehicleNumber: string) {
    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.vehicle', 'vehicle')
      .leftJoinAndSelect('v.violationType', 'violationType')
      .leftJoinAndSelect('v.camera', 'camera')
      .leftJoinAndSelect('camera.junction', 'junction')
      .where('vehicle.registration_number ILIKE :vn', { vn: `%${vehicleNumber}%` })
      .orderBy('v.violationTimestamp', 'DESC')
      .take(50);

    this.applyOperatingTimeFilter(qb);

    const violations = await qb.getMany();
    return violations.map(v => this.formatViolation(v));
  }

  async findOne(id: string, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['vehicle', 'camera', 'camera.junction', 'evidence', 'violationType', 'reviewedBy'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('You do not have access to this violation');
    }
    return this.formatViolation(v, user);
  }

  async getStats(query: ViolationQueryDto, user?: any) {
    const baseQb = this.violationRepo.createQueryBuilder('v')
      .leftJoin('v.camera', 'camera')
      .leftJoin('camera.junction', 'junction')
      .leftJoin('junction.subdivision', 'subdivision')
      .leftJoin('v.violationType', 'violationType')
      .leftJoin('v.vehicle', 'vehicle')
      .where('violationType.is_active = true')
      .andWhere("v.status != 'CANCELLED'");

    if (query.status && query.status !== '' && query.status !== 'ALL') {
      baseQb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.cameraId) {
      baseQb.andWhere('camera.camera_code = :cameraId', { cameraId: query.cameraId });
    }
    if (query.vehicleNumber) {
      baseQb.andWhere('vehicle.registration_number ILIKE :vn', { vn: `%${query.vehicleNumber}%` });
    }
    if (query.violationType) {
      const types = query.violationType.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 0) {
        baseQb.andWhere('violationType.id IN (:...types)', { types });
      }
    }
    if (query.dateFrom) {
      baseQb.andWhere('v.violationTimestamp >= :from', { from: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      baseQb.andWhere('v.violationTimestamp <= :to', { to });
    }

    this.applyOperatingTimeFilter(baseQb);
    this.applySubdivisionScope(baseQb, user, query.subdivisionCode);

    // Fast database aggregation queries instead of loading tens of thousands of rows into JS heap
    const [statusRows, typeRows, unknownRows, withConfidenceCount] = await Promise.all([
      baseQb.clone()
        .select('UPPER(v.status)', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('UPPER(v.status)')
        .getRawMany(),

      baseQb.clone()
        .select("COALESCE(violationType.violationCode, 'Unknown')", 'code')
        .addSelect('COUNT(*)', 'count')
        .groupBy('violationType.violationCode')
        .getRawMany(),

      baseQb.clone()
        .andWhere("(vehicle.registration_number IN ('UNKNOWN', 'UNREAD') OR vehicle.registration_number IS NULL)")
        .select('UPPER(v.status)', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('UPPER(v.status)')
        .getRawMany(),

      baseQb.clone()
        .andWhere("v.confidential_level IS NOT NULL AND v.confidential_level != ''")
        .getCount(),
    ]);

    const stats: any = {
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      with_confidence: withConfidenceCount,
      by_type: {} as Record<string, number>,
      unknown_plates: { pending: 0, issued: 0, rejected: 0 },
    };

    for (const r of statusRows) {
      const cnt = parseInt(r.count, 10) || 0;
      stats.total += cnt;
      const status = r.status || '';
      if (['PENDING', 'READY', 'UNDER_REVIEW'].includes(status)) {
        stats.pending += cnt;
      } else if (['ISSUED', 'VERIFIED', 'APPROVED'].includes(status)) {
        stats.verified += cnt;
      } else if (['REJECTED', 'AUTO_REJECTED'].includes(status)) {
        stats.rejected += cnt;
      }
    }

    for (const r of typeRows) {
      const cnt = parseInt(r.count, 10) || 0;
      stats.by_type[r.code] = cnt;
    }

    for (const r of unknownRows) {
      const cnt = parseInt(r.count, 10) || 0;
      const status = r.status || '';
      if (['PENDING', 'READY', 'UNDER_REVIEW'].includes(status)) {
        stats.unknown_plates.pending += cnt;
      } else if (['ISSUED', 'VERIFIED', 'APPROVED'].includes(status)) {
        stats.unknown_plates.issued += cnt;
      } else if (['REJECTED', 'AUTO_REJECTED'].includes(status)) {
        stats.unknown_plates.rejected += cnt;
      }
    }

    return stats;
  }

  async verify(id: string, dto: VerifyViolationDto, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['camera', 'camera.junction', 'evidence'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('Access denied');
    }

    const oldStatus = v.status;
    const newStatus = dto.action === 'approve'
      ? 'ISSUED'
      : dto.action === 'reject' ? 'REJECTED' : 'PENDING';
    v.status = newStatus;
    v.reviewedByUserId = user?.id;
    v.reviewedAt = new Date();
    if (dto.reviewNotes) {
      v.approvalNotes = dto.reviewNotes;
      if (newStatus === 'REJECTED') {
        v.rejectedReason = dto.reviewNotes;
      }
    }
    if (dto.violationType) {
      const vtypes = await this.violationTypeRepo.find();
      const firstType = dto.violationType.split(',')[0].trim();
      const matched = vtypes.find(vt => vt.id === firstType || vt.violationCode === firstType || vt.violationName === firstType);
      if (matched) {
        v.violationTypeId = matched.id;
      }
    }

    if (newStatus === 'ISSUED' || newStatus === 'REJECTED') {
      const folderName = newStatus === 'ISSUED' ? 'issued' : 'rejected';
      const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR', path.join(process.cwd(), '..', '..', 'uploads'));
      
      for (const ev of v.evidence || []) {
        if (ev.filePath && !ev.filePath.startsWith('http')) {
          const oldPath = path.resolve(uploadDir, ev.filePath);
          if (fs.existsSync(oldPath)) {
            const parsed = path.parse(ev.filePath);
            const newRelativeDir = path.join(parsed.dir, folderName).replace(/\\/g, '/');
            const newRelativePath = path.posix.join(newRelativeDir, parsed.base);
            const newAbsDir = path.resolve(uploadDir, newRelativeDir);
            const newAbsPath = path.resolve(uploadDir, newRelativePath);
            
            if (!fs.existsSync(newAbsDir)) {
              fs.mkdirSync(newAbsDir, { recursive: true });
            }
            fs.renameSync(oldPath, newAbsPath);
            
            ev.filePath = newRelativePath;
            await this.evidenceRepo.save(ev);
          }
        }
      }
    }

    await this.violationRepo.save(v);

    await this.reviewRepo.save(this.reviewRepo.create({
      violationId: v.id,
      reviewedByUserId: user?.id,
      previousStatus: oldStatus,
      newStatus,
      remarks: dto.reviewNotes,
      reviewedAt: new Date(),
    }));

    // Invalidate analytics cache so dashboard reflects the change immediately
    try {
      if (typeof (this.cache as any).reset === 'function') {
        await (this.cache as any).reset();
      } else {
        await this.cache.del('analytics-summary');
      }
    } catch (_) {}

    return { status: 'success', new_status: newStatus, raw_status: newStatus };
  }

  async update(id: string, dto: UpdateViolationDto, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['camera', 'camera.junction'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('Access denied');
    }
    if (dto.status) v.status = dto.status;
    await this.violationRepo.save(v);
    return this.formatViolation(v, user);
  }

  async remove(id: string, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['camera', 'camera.junction'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('Access denied');
    }
    // Soft-delete: preserve audit trail for police system
    v.status = 'CANCELLED';
    await this.violationRepo.save(v);
    return { status: 'deleted', id };
  }

  async batchUpload(files: Express.Multer.File[], aiBackendUrl: string, user?: any) {
    return { uploaded: 0, errors: 0, files: [], error_details: null };
  }

  private formatViolation(v: Violation, user?: any): any {
    const fullImg = v.evidence?.find(e => e.evidenceType === 'FULL_IMAGE')?.filePath ?? null;

    const baseData: any = {
      id: v.id,
      timestamp: (v.violationTimestamp ?? v.createdAt)?.toISOString() ?? null,
      type: v.violationType?.violationCode ?? 'UNKNOWN',
      vehicle_type: v.vehicle?.vehicleType ?? 'Two-Wheeler',
      vehicle_number: v.vehicle?.registrationNumber ?? 'UNREAD',
      location: v.camera?.junction?.junctionName ?? v.camera?.cameraName ?? 'Unknown',
      camera_id: v.camera?.cameraCode ?? v.cameraId ?? null,
      cam_clarity: 0.9,
      status: this.mapStatus(v.status),
      raw_status: v.status,
      image_url: fullImg ? (fullImg.startsWith('http') ? fullImg : `/api/violations/image/by-key?key=${encodeURIComponent(fullImg)}`) : null,
      proof_img_url: null,
      gps_lat: v.camera?.junction?.latitude ?? null,
      gps_lng: v.camera?.junction?.longitude ?? null,
      challan_amount: null,
      challan_issued_at: null,
      reviewed_by: (v.reviewedBy as any)?.username ?? (v.reviewedBy as any)?.fullName ?? v.reviewedByUserId ?? null,
      reviewed_at: v.reviewedAt?.toISOString() ?? null,
      review_notes: (v.status === 'REJECTED' ? v.rejectedReason : v.approvalNotes) || v.approvalNotes || v.rejectedReason || (v.status === 'ISSUED' ? (v.violationType?.violationName || v.violationType?.violationCode || 'Violation Verified') : null),
      metadata: null,
    };

    if (user) {
      const role = (user.role || '').toUpperCase();
      if (['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'DEVELOPER'].includes(role)) {
        baseData.confidential_level = v.confidentialLevel;
      }
    }

    return baseData;
  }

  private mapStatus(raw: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'Pending',
      ISSUED: 'Issued',
      REJECTED: 'Rejected',
      DUPLICATE: 'Duplicate',
      CANCELLED: 'Cancelled',
    };
    return statusMap[raw] ?? raw;
  }

  // ── Violation Type CRUD ────────────────────────────────────────
  async getViolationTypes() {
    return this.violationTypeRepo.find({ where: { isActive: true }, order: { violationName: 'ASC' } });
  }

  async createViolationType(dto: {
    violationCode: string;
    violationName: string;
    description?: string;
    defaultFine?: number;
    color?: string;
    severity?: string;
  }) {
    const formattedCode = dto.violationCode.toUpperCase().replace(/\s+/g, '_');
    const existing = await this.violationTypeRepo.findOne({ where: { violationCode: formattedCode } });
    if (existing) {
      if (!existing.isActive) {
        // Reactivate and update
        existing.isActive = true;
        existing.violationName = dto.violationName;
        existing.description = dto.description ?? existing.description;
        existing.defaultFine = dto.defaultFine ?? existing.defaultFine;
        existing.color = dto.color ?? existing.color;
        existing.severity = dto.severity ?? existing.severity;
        return this.violationTypeRepo.save(existing);
      } else {
        throw new BadRequestException('Violation code already exists');
      }
    }

    const vt = this.violationTypeRepo.create({
      violationCode: formattedCode,
      violationName: dto.violationName,
      description: dto.description ?? null,
      defaultFine: dto.defaultFine ?? 500,
      color: dto.color ?? '#FF4B4B',
      severity: dto.severity ?? 'HIGH',
      isActive: true,
    });
    return this.violationTypeRepo.save(vt);
  }

  async updateViolationType(id: string, dto: Partial<{
    violationCode: string;
    violationName: string;
    description: string;
    defaultFine: number;
    color: string;
    severity: string;
    isActive: boolean;
  }>) {
    if (dto.violationCode) {
      dto.violationCode = dto.violationCode.toUpperCase().replace(/\s+/g, '_');
      const existing = await this.violationTypeRepo.findOne({ where: { violationCode: dto.violationCode } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Violation code already exists in the system (possibly as a deleted type).');
      }
    }
    await this.violationTypeRepo.update(id, dto);
    return this.violationTypeRepo.findOne({ where: { id } });
  }

  async removeViolationType(id: string) {
    const vt = await this.violationTypeRepo.findOne({ where: { id } });
    if (!vt) return { status: 'not_found', id };
    // Soft-delete: mark as inactive rather than hard delete (protects historical data)
    await this.violationTypeRepo.update(id, { isActive: false });
    return { status: 'deactivated', id };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldEvidenceFiles() {
    Logger.log('Running daily cleanup of old evidence files...');
    const uploadDir = this.configService.get<string>('LOCAL_UPLOAD_DIR', path.join(process.cwd(), '..', '..', 'uploads'));

    // ── MODEL TRAINING FREEZE WINDOW ─────────────────────────────────────────
    // All images from 16 Oct 2026 to 16 Nov 2026 are kept for model training.
    // Auto-delete resumes after 16 Nov 2026.
    const FREEZE_START = new Date('2026-10-16T00:00:00.000Z');
    const FREEZE_END   = new Date('2026-11-16T23:59:59.999Z');
    const now = new Date();
    if (now >= FREEZE_START && now <= FREEZE_END) {
      Logger.log('CLEANUP SKIPPED — Model training freeze window active (16 Oct – 16 Nov 2026). All images retained.');
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Reject older than 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Verified/Issued older than 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const oldViolations = await this.violationRepo.find({
      where: [
        { status: 'REJECTED', reviewedAt: LessThanOrEqual(twoDaysAgo) },
        { status: 'ISSUED', reviewedAt: LessThanOrEqual(fifteenDaysAgo) },
      ],
      relations: ['evidence'],
    });

    let deletedCount = 0;
    for (const v of oldViolations) {
      // Extra safety: never delete files for violations created during freeze window
      const createdAt = v.createdAt || new Date(0);
      if (createdAt >= FREEZE_START && createdAt <= FREEZE_END) {
        Logger.log(`Skipping evidence deletion for violation ${v.id} (created during model training freeze)`);
        continue;
      }
      for (const ev of v.evidence || []) {
        if (ev.filePath && !ev.filePath.startsWith('http')) {
          const absPath = path.resolve(uploadDir, ev.filePath);
          if (fs.existsSync(absPath)) {
            try {
              fs.unlinkSync(absPath);
              deletedCount++;
              // Nullify the file path in DB so dashboard doesn't try to load it
              ev.filePath = '';
              await this.evidenceRepo.save(ev);
            } catch (err) {
              Logger.error(`Failed to delete old file: ${absPath}`, err);
            }
          }
        }
      }
    }
    Logger.log(`Cleanup complete. Deleted ${deletedCount} old physical evidence files.`);
  }
}
