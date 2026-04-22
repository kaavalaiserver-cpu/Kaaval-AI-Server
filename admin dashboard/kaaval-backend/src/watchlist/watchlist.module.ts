import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchlist } from './entities/watchlist.entity.js';
import { WatchlistService } from './watchlist.service.js';
import { WatchlistController } from './watchlist.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist])],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}