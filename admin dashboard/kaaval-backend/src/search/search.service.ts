import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Violation } from '../violations/entities/violation.entity.js';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationRepo: Repository<Violation>,
  ) {}

  async search(query: string, dateFrom?: string, dateTo?: string) {
    if (!query && !dateFrom) {
      return { data: [], count: 0 };
    }

    const qb = this.violationRepo.createQueryBuilder('violation')
      .leftJoinAndSelect('violation.vehicle', 'vehicle')
      .leftJoinAndSelect('violation.violationType', 'violationType')
      .leftJoinAndSelect('violation.camera', 'camera')
      .leftJoinAndSelect('camera.junction', 'junction')
      .leftJoinAndSelect('violation.evidence', 'evidence');

    if (query) {
      qb.andWhere(
        '(vehicle.registrationNumber ILIKE :query OR camera.cameraCode ILIKE :query OR violationType.typeCode ILIKE :query)',
        { query: `%${query}%` }
      );
    }

    if (dateFrom && dateTo) {
      qb.andWhere('violation.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) });
    } else if (dateFrom) {
      qb.andWhere('violation.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    qb.orderBy('violation.createdAt', 'DESC');
    qb.take(50);

    const results = await qb.getMany();

    return {
      data: results.map((v) => ({
        id: v.id,
        vehicle_number: v.vehicle?.registrationNumber ?? 'UNREAD',
        type: (v.violationType?.violationCode || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        camera_id: v.camera?.cameraCode ?? 'Unknown',
        location: v.camera?.junction?.junctionName ?? v.camera?.cameraName ?? 'Unknown',
        status: v.status === 'CHALLAN_ISSUED' ? 'Verified' : v.status === 'REJECTED' ? 'Rejected' : 'Pending',
        timestamp: v.createdAt.toISOString(),
        image_url: v.evidence?.find(e => e.evidenceType === 'RAW_IMAGE')?.filePath ?? '',
        vehicle_type: '2-Wheeler',
      })),
      count: results.length,
    };
  }
}
