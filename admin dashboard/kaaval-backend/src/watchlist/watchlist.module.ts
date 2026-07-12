import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchlist } from './entities/watchlist.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { WatchlistService } from './watchlist.service.js';
import { WatchlistController } from './watchlist.controller.js';
import { SystemModule } from '../system/system.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist, Vehicle]), SystemModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
