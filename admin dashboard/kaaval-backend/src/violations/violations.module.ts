import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Violation } from './entities/violation.entity.js';
import { ViolationType } from './entities/violation-type.entity.js';
import { Evidence } from './entities/evidence.entity.js';
import { ViolationReview } from './entities/violation-review.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { ViolationsService } from './violations.service.js';
import { CleanupService } from './cleanup.service.js';
import { ViolationsController } from './violations.controller.js';
import { WatchlistModule } from '../watchlist/watchlist.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SystemModule } from '../system/system.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Violation, ViolationType, Evidence, ViolationReview, Vehicle]),
    WatchlistModule,
    NotificationsModule,
    SystemModule,
  ],
  controllers: [ViolationsController],
  providers: [ViolationsService, CleanupService],
  exports: [ViolationsService],
})
export class ViolationsModule {}
