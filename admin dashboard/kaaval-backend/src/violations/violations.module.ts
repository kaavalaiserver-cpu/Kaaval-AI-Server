import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Violation } from './entities/violation.entity.js';
import { ViolationsService } from './violations.service.js';
import { ViolationsController } from './violations.controller.js';
import { WatchlistModule } from '../watchlist/watchlist.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SystemModule } from '../system/system.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Violation]),
    WatchlistModule,
    NotificationsModule,
    SystemModule,
  ],
  controllers: [ViolationsController],
  providers: [ViolationsService],
  exports: [ViolationsService],
})
export class ViolationsModule {}
