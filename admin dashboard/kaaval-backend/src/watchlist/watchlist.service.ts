import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist, WatchlistPriority, WatchlistStatus } from './entities/watchlist.entity.js';
import { CreateWatchlistDto, UpdateWatchlistDto } from './dto/watchlist.dto.js';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(Watchlist)
    private readonly watchlistRepo: Repository<Watchlist>,
  ) {}

  async checkStatus(vehicleNumber: string): Promise<Watchlist | null> {
    return this.watchlistRepo.findOne({
      where: {
        vehicleNumber: vehicleNumber,
        status: WatchlistStatus.ACTIVE,
      }
    });
  }

  async addToWatchlist(dto: CreateWatchlistDto): Promise<Watchlist> {
      // Check if already exists
      const existing = await this.watchlistRepo.findOne({ where: { vehicleNumber: dto.vehicleNumber } });
      if (existing) {
          existing.priority = dto.priority || existing.priority;
          existing.reason = dto.reason;
          existing.status = WatchlistStatus.ACTIVE;
          return this.watchlistRepo.save(existing);
      }

      const newItem = this.watchlistRepo.create({
          ...dto,
          status: WatchlistStatus.ACTIVE,
          addedAt: new Date(),
      });
      return this.watchlistRepo.save(newItem);
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

  async update(id: string, dto: UpdateWatchlistDto): Promise<Watchlist> {
    const item = await this.watchlistRepo.findOneBy({ id });
    if (!item) throw new Error('Not found');

    if (dto.priority) item.priority = dto.priority;
    if (dto.reason) item.reason = dto.reason;
    if (dto.status) item.status = dto.status;

    return this.watchlistRepo.save(item);
  }

  async remove(id: string): Promise<void> {
    await this.watchlistRepo.delete(id);
  }
}