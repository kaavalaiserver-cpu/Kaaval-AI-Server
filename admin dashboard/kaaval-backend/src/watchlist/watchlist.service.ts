import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist, WatchlistPriority, WatchlistStatus } from './entities/watchlist.entity.js';
import { CreateWatchlistDto, UpdateWatchlistDto } from './dto/watchlist.dto.js';
import { AuditService } from '../system/audit.service.js';
import { ScopedUser } from '../auth/subdivision-access.js';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
    private readonly auditService: AuditService,
  ) {}

  async checkStatus(vehicleNumber: string): Promise<Watchlist | null> {
    return this.watchlistRepo.findOne({
      where: {
        vehicleNumber: vehicleNumber,
        status: WatchlistStatus.ACTIVE,
      }
    });
  }

  async addToWatchlist(dto: CreateWatchlistDto, user?: ScopedUser): Promise<Watchlist> {
      // Check if already exists
      const existing = await this.watchlistRepo.findOne({ where: { vehicleNumber: dto.vehicleNumber } });
      let savedItem: Watchlist;
      if (existing) {
          existing.priority = dto.priority || existing.priority;
          existing.reason = dto.reason;
          existing.status = WatchlistStatus.ACTIVE;
          savedItem = await this.watchlistRepo.save(existing);
      } else {
          const newItem = this.watchlistRepo.create({
              ...dto,
              status: WatchlistStatus.ACTIVE,
              addedAt: new Date(),
          });
          savedItem = await this.watchlistRepo.save(newItem);
      }

      await this.auditService.logAction(
        user?.id ?? null,
        existing ? 'UPDATE_WATCHLIST_ENTRY' : 'ADD_WATCHLIST_ENTRY',
        undefined,
        undefined,
        { vehicleNumber: savedItem.vehicleNumber, priority: savedItem.priority, reason: savedItem.reason }
      );

      return savedItem;
  }

  async findAll(priority?: string, status?: string): Promise<Watchlist[]> {
      const query = this.watchlistRepo.createQueryBuilder('watchlist');

      if (priority) {
          query.andWhere('watchlist.priority = :priority', { priority });
      }
      if (status) {
          query.andWhere('watchlist.status = :status', { status });
      }

      return query.getMany();
  }

  async update(id: string, dto: UpdateWatchlistDto, user?: ScopedUser): Promise<Watchlist> {
    const item = await this.watchlistRepo.findOneBy({ id });
    if (!item) throw new Error('Not found');

    if (dto.priority) item.priority = dto.priority;
    if (dto.reason) item.reason = dto.reason;
    if (dto.status) item.status = dto.status;

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

  async remove(id: string, user?: ScopedUser): Promise<void> {
    const item = await this.watchlistRepo.findOneBy({ id });
    await this.watchlistRepo.delete(id);

    await this.auditService.logAction(
      user?.id ?? null,
      'REMOVE_WATCHLIST_ENTRY',
      undefined,
      undefined,
      { id, vehicleNumber: item?.vehicleNumber }
    );
  }
}