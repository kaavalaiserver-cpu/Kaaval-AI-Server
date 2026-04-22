import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, MoreThanOrEqual } from 'typeorm';
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

    const where: Array<Record<string, unknown>> = [];

    if (query) {
      where.push({ vehicleNumber: ILike(`%${query}%`) });
      where.push({ cameraId: ILike(`%${query}%`) });
      where.push({ violationType: ILike(`%${query}%`) });
    }

    const dateFilter =
      dateFrom && dateTo
        ? { createdAt: Between(new Date(dateFrom), new Date(dateTo)) }
        : dateFrom
          ? { createdAt: MoreThanOrEqual(new Date(dateFrom)) }
          : {};

    const searchWhere = where.length > 0
      ? where.map((w) => ({ ...w, ...dateFilter }))
      : [dateFilter];

    const results = await this.violationRepo.find({
      where: searchWhere,
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const CAMERA_LOCATIONS: Record<string, string> = {
      'CAM-001': 'T. Nagar Junction',
      'CAM-002': 'Anna Salai Main Road',
      'CAM-003': 'Chennai Central',
      'CAM-004': 'Mylapore Market',
      'CAM-005': 'Guindy Circle',
      'BATCH_UPLOAD': 'Batch Upload',
    };

    return {
      data: results.map((v) => ({
        id: v.id,
        vehicle_number: v.vehicleNumber ?? 'UNREAD',
        type: (v.violationType || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        camera_id: v.cameraId,
        location: CAMERA_LOCATIONS[v.cameraId ?? ''] ?? v.cameraId ?? 'Unknown',
        status: v.status === 'CHALLAN_ISSUED' ? 'Verified' : v.status === 'REJECTED' ? 'Rejected' : 'Pending',
        confidence: v.confidenceScore,
        timestamp: v.createdAt.toISOString(),
        image_url: v.imageUrl ?? '',
        vehicle_type: '2-Wheeler',
      })),
      count: results.length,
    };
  }
}
