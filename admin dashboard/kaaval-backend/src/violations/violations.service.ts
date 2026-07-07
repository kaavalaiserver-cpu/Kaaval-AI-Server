import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    if (['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'].includes(role)) return true;
    if (!user.subdivisionId) return false;
    return subdivisionId === user.subdivisionId;
  }

  private applySubdivisionScope(qb: SelectQueryBuilder<Violation>, user: any, requestedSubdivisionCode?: string) {
    const role = (user?.role || '').toUpperCase();
    if (!['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'].includes(role)) {
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
      confidence: dto.confidenceScore ?? 0,
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
      .orderBy('v.violationTimestamp', 'DESC')
      .take(limit)
      .skip(offset);

    // ── Filters ──────────────────────────────────────────────────
    if (query.status && query.status !== '') {
      qb.andWhere('v.status = :status', { status: query.status });
    }
    if (query.cameraId) {
      qb.andWhere('camera.camera_code = :cameraId', { cameraId: query.cameraId });
    }
    if (query.vehicleNumber) {
      qb.andWhere('vehicle.registration_number ILIKE :vn', { vn: `%${query.vehicleNumber}%` });
    }
    if (query.violationType) {
      qb.andWhere('violationType.violation_code ILIKE :vt', { vt: `%${query.violationType}%` });
    }
    if (query.dateFrom) {
      qb.andWhere('v.violationTimestamp >= :from', { from: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('v.violationTimestamp <= :to', { to });
    }
    if (query.minConfidence) {
      qb.andWhere('v.confidence >= :minConf', { minConf: parseFloat(query.minConfidence) / 100 });
    }
    if (query.maxConfidence) {
      qb.andWhere('v.confidence <= :maxConf', { maxConf: parseFloat(query.maxConfidence) / 100 });
    }

    // ── RBAC subdivision scope ────────────────────────────────────
    this.applySubdivisionScope(qb, user, query.subdivisionCode);

    const [violations, total] = await qb.getManyAndCount();

    const data = violations.map(v => this.formatViolation(v));
    return { data, total, page, limit };
  }

  async trackVehicle(vehicleNumber: string) {
    const violations = await this.violationRepo.find({
      where: { vehicle: { registrationNumber: ILike(`%${vehicleNumber}%`) } },
      relations: ['vehicle', 'violationType', 'camera', 'camera.junction'],
      order: { violationTimestamp: 'DESC' },
      take: 50,
    });
    return violations.map(v => this.formatViolation(v));
  }

  async findOne(id: string, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['vehicle', 'camera', 'camera.junction', 'evidence', 'violationType'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('You do not have access to this violation');
    }
    return this.formatViolation(v);
  }

  async getStats(query: ViolationQueryDto, user?: any) {
    const qb = this.violationRepo.createQueryBuilder('v')
      .leftJoin('v.camera', 'camera')
      .leftJoin('camera.junction', 'junction')
      .leftJoin('v.violationType', 'violationType');

    if (query.dateFrom) {
      qb.andWhere('v.violationTimestamp >= :from', { from: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('v.violationTimestamp <= :to', { to });
    }

    this.applySubdivisionScope(qb, user, query.subdivisionCode);

    const all = await qb.select([
      'v.id', 'v.status', 'v.confidence',
    ]).addSelect('violationType.violation_code', 'vtCode').getRawMany();

    // Count by status
    const stats: any = {
      total: all.length,
      pending: 0,
      verified: 0,
      rejected: 0,
      manual_review: 0,
      with_confidence: 0,
      by_type: {} as Record<string, number>,
    };

    for (const row of all) {
      const status = (row.v_status || '').toUpperCase();
      if (['PENDING', 'READY'].includes(status)) stats.pending++;
      else if (['CHALLAN_ISSUED', 'VERIFIED'].includes(status)) stats.verified++;
      else if (['REJECTED', 'DUPLICATE'].includes(status)) stats.rejected++;
      else if (status === 'UNDER_REVIEW') stats.manual_review++;

      if ((row.v_confidence ?? 0) > 0) stats.with_confidence++;

      const vt = row.vtCode || row.v_violation_type_id || 'Unknown';
      stats.by_type[vt] = (stats.by_type[vt] || 0) + 1;
    }

    return stats;
  }

  async verify(id: string, dto: VerifyViolationDto, user?: any) {
    const v = await this.violationRepo.findOne({
      where: { id },
      relations: ['camera', 'camera.junction'],
    });
    if (!v) throw new NotFoundException('Violation not found');
    if (!this.canAccessViolation(user, v.camera?.junction?.subdivisionId ?? null)) {
      throw new ForbiddenException('Access denied');
    }

    const oldStatus = v.status;
    const newStatus = dto.action === 'approve'
      ? 'CHALLAN_ISSUED'
      : dto.action === 'reject' ? 'REJECTED' : 'UNDER_REVIEW';
    v.status = newStatus;
    v.reviewedByUserId = user?.id;
    v.reviewedAt = new Date();
    if (dto.reviewNotes) v.approvalNotes = dto.reviewNotes;
    if (newStatus === 'CHALLAN_ISSUED') v.challanStatus = 'GENERATED';

    await this.violationRepo.save(v);

    await this.reviewRepo.save(this.reviewRepo.create({
      violationId: v.id,
      reviewedByUserId: user?.id,
      previousStatus: oldStatus,
      newStatus,
      remarks: dto.reviewNotes,
      reviewedAt: new Date(),
    }));

    // Invalidate analytics cache so dashboard reflects the change
    await this.cache.del('analytics-summary').catch(() => {});

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
    return this.formatViolation(v);
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
    v.status = 'CANCELLED';
    await this.violationRepo.save(v);
    return { status: 'deleted', id };
  }

  async batchUpload(files: Express.Multer.File[], aiBackendUrl: string, user?: any) {
    return { uploaded: 0, errors: 0, files: [], error_details: null };
  }

  /** Serialize a Violation entity into the flat shape the frontend expects */
  private formatViolation(v: Violation): any {
    const rawImg = v.evidence?.find(e => e.evidenceType === 'RAW_IMAGE')?.filePath ?? null;
    const proofImg = v.evidence?.find(e => e.evidenceType === 'CROPPED_PLATE')?.filePath ?? null;

    return {
      id: v.id,
      timestamp: (v.violationTimestamp ?? v.createdAt)?.toISOString() ?? null,
      type: v.violationType?.violationCode ?? 'UNKNOWN',
      vehicle_type: 'Two-Wheeler',
      vehicle_number: v.vehicle?.registrationNumber ?? 'UNREAD',
      location: v.camera?.junction?.junctionName ?? v.camera?.cameraName ?? 'Unknown',
      camera_id: v.camera?.cameraCode ?? v.cameraId ?? null,
      violation_confidence: v.confidence ?? 0,
      plate_confidence: v.confidence ?? 0,
      cam_clarity: 0.9,
      confidence: v.confidence ?? 0,
      status: this.mapStatus(v.status),
      raw_status: v.status,
      image_url: rawImg,
      proof_img_url: proofImg,
      gps_lat: v.camera?.junction?.latitude ?? null,
      gps_lng: v.camera?.junction?.longitude ?? null,
      challan_amount: null,
      challan_issued_at: null,
      reviewed_by: v.reviewedByUserId ?? null,
      reviewed_at: v.reviewedAt?.toISOString() ?? null,
      review_notes: v.approvalNotes ?? null,
      metadata: null,
    };
  }

  private mapStatus(raw: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending Review',
      READY: 'Pending Review',
      UNDER_REVIEW: 'Under Review',
      CHALLAN_ISSUED: 'Challan Issued',
      VERIFIED: 'Verified',
      REJECTED: 'Rejected',
      DUPLICATE: 'Duplicate',
      CANCELLED: 'Cancelled',
    };
    return map[raw] ?? raw;
  }

  // ── Violation Type CRUD ────────────────────────────────────────
  async getViolationTypes() {
    return this.violationTypeRepo.find({ order: { violationName: 'ASC' } });
  }

  async createViolationType(dto: {
    violationCode: string;
    violationName: string;
    description?: string;
    defaultFine?: number;
    color?: string;
    severity?: string;
  }) {
    const vt = this.violationTypeRepo.create({
      violationCode: dto.violationCode.toUpperCase().replace(/\s+/g, '_'),
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
}
