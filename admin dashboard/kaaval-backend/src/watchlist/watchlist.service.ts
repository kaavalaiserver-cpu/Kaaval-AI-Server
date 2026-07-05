import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist } from './entities/watchlist.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { CreateWatchlistDto, UpdateWatchlistDto } from './dto/watchlist.dto.js';
import { AuditService } from '../system/audit.service.js';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly auditService: AuditService,
  ) {}

  async checkStatus(vehicleNumber: string): Promise<Watchlist | null> {
    const vehicle = await this.vehicleRepo.findOne({ where: { registrationNumber: vehicleNumber } });
    if (!vehicle) return null;

    return this.watchlistRepo.findOne({
      where: {
        vehicleId: vehicle.id,
        isActive: true,
      },
      relations: ['vehicle']
    });
  }

  async addToWatchlist(dto: CreateWatchlistDto, user?: any): Promise<Watchlist> {
      let vehicle = await this.vehicleRepo.findOne({ where: { registrationNumber: dto.vehicleNumber } });
      if (!vehicle) {
        vehicle = await this.vehicleRepo.save(this.vehicleRepo.create({ registrationNumber: dto.vehicleNumber }));
      }

      const existing = await this.watchlistRepo.findOne({ where: { vehicleId: vehicle.id } });
      let savedItem: Watchlist;
      
      if (existing) {
          existing.priority = dto.priority || existing.priority;
          existing.reason = dto.reason;
          existing.isActive = true;
          savedItem = await this.watchlistRepo.save(existing);
      } else {
          const newItem = this.watchlistRepo.create({
              vehicleId: vehicle.id,
              reason: dto.reason,
              priority: dto.priority || 'MEDIUM',
              isActive: true,
              addedByUserId: user?.id,
          });
          savedItem = await this.watchlistRepo.save(newItem);
      }

      await this.auditService.logAction(
        user?.id ?? null,
        existing ? 'UPDATE_WATCHLIST_ENTRY' : 'ADD_WATCHLIST_ENTRY',
        undefined,
        undefined,
        { vehicleNumber: dto.vehicleNumber, priority: savedItem.priority, reason: savedItem.reason }
      );

      return savedItem;
  }

  async findAll(priority?: string, status?: string): Promise<Watchlist[]> {
      const query = this.watchlistRepo.createQueryBuilder('watchlist')
          .leftJoinAndSelect('watchlist.vehicle', 'vehicle');

      if (priority) {
          query.andWhere('watchlist.priority = :priority', { priority });
      }
      if (status) {
          const isActive = status.toLowerCase() === 'active';
          query.andWhere('watchlist.is_active = :isActive', { isActive });
      }

      return query.getMany();
  }

  async update(id: string, dto: UpdateWatchlistDto, user?: any): Promise<Watchlist> {
    const item = await this.watchlistRepo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!item) throw new NotFoundException('Not found');

    if (dto.priority) item.priority = dto.priority;
    if (dto.reason) item.reason = dto.reason;
    if (dto.status) item.isActive = dto.status.toLowerCase() === 'active';

    const saved = await this.watchlistRepo.save(item);

    await this.auditService.logAction(
      user?.id ?? null,
      'UPDATE_WATCHLIST_ENTRY',
      undefined,
      undefined,
      { id, changes: dto }
    );

    return saved;
  }

  async remove(id: string, user?: any): Promise<void> {
    const item = await this.watchlistRepo.findOne({ where: { id }, relations: ['vehicle'] });
    if (item) {
        item.isActive = false;
        await this.watchlistRepo.save(item);

        await this.auditService.logAction(
        user?.id ?? null,
        'REMOVE_WATCHLIST_ENTRY',
        undefined,
        undefined,
        { id, vehicleNumber: item.vehicle?.registrationNumber }
        );
    }
  }
}