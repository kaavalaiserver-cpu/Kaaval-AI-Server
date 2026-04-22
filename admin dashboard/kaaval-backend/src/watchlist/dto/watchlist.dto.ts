import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WatchlistPriority, WatchlistStatus } from '../entities/watchlist.entity.js';

export class CreateWatchlistDto {
  @IsString()
  vehicleNumber: string;

  @IsString()
  reason: string;

  @IsEnum(WatchlistPriority)
  @IsOptional()
  priority?: WatchlistPriority;

  @IsOptional()
  addedBy?: string;
}

export class UpdateWatchlistDto {
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsEnum(WatchlistPriority)
    priority?: WatchlistPriority;

    @IsOptional()
    @IsEnum(WatchlistStatus)
    status?: WatchlistStatus;
}