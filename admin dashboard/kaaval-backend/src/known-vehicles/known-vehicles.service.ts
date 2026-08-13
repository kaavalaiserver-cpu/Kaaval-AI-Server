import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnownVehicle } from './entities/known-vehicle.entity.js';
import { KnownVehicleHit } from './entities/known-vehicle-hit.entity.js';

@Injectable()
export class KnownVehiclesService {
  constructor(
    @InjectRepository(KnownVehicle)
    private readonly kvRepo: Repository<KnownVehicle>,
    @InjectRepository(KnownVehicleHit)
    private readonly hitRepo: Repository<KnownVehicleHit>,
  ) {}

  /** Called during ingest — fast check if a plate is suppressed */
  async isKnown(vehicleNumber: string): Promise<KnownVehicle | null> {
    const normalized = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    return this.kvRepo.findOneBy({ vehicleNumber: normalized });
  }

  /** Record a suppressed violation hit — called from ingest when plate is matched */
  async recordHit(dto: {
    knownVehicleId: string;
    vehicleNumber: string;
    violationType?: string;
    cameraId?: string;
    cameraName?: string;
    location?: string;
    confidence?: number;
  }): Promise<KnownVehicleHit> {
    const hit = this.hitRepo.create({
      knownVehicleId: dto.knownVehicleId,
      vehicleNumber: dto.vehicleNumber,
      violationType: dto.violationType ?? null,
      cameraId: dto.cameraId ?? null,
      cameraName: dto.cameraName ?? null,
      location: dto.location ?? null,
      confidence: dto.confidence ?? null,
    });
    return this.hitRepo.save(hit);
  }

  /** List all known vehicles */
  async findAll(): Promise<KnownVehicle[]> {
    return this.kvRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** Get history of suppressed hits for a specific vehicle — text only, no images */
  async getHistory(vehicleNumber: string): Promise<KnownVehicleHit[]> {
    const normalized = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    return this.hitRepo.find({
      where: { vehicleNumber: normalized },
      order: { hitTimestamp: 'DESC' },
    });
  }

  /** Add a vehicle to the known list — super_admin only */
  async add(vehicleNumber: string, reason: string, userId: string): Promise<KnownVehicle> {
    const normalized = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const existing = await this.kvRepo.findOneBy({ vehicleNumber: normalized });
    if (existing) {
      throw new ConflictException(`Vehicle ${normalized} is already in the known vehicles list.`);
    }
    const kv = this.kvRepo.create({
      vehicleNumber: normalized,
      reason: reason || null,
      addedByUserId: userId,
    });
    return this.kvRepo.save(kv);
  }

  /** Remove a vehicle from the known list — super_admin only */
  async remove(id: string): Promise<void> {
    const kv = await this.kvRepo.findOneBy({ id });
    if (!kv) throw new NotFoundException('Known vehicle not found');
    await this.kvRepo.remove(kv);
  }
}
