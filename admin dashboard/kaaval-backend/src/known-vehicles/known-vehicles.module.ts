import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnownVehicle } from './entities/known-vehicle.entity.js';
import { KnownVehicleHit } from './entities/known-vehicle-hit.entity.js';
import { KnownVehiclesService } from './known-vehicles.service.js';
import { KnownVehiclesController } from './known-vehicles.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([KnownVehicle, KnownVehicleHit])],
  controllers: [KnownVehiclesController],
  providers: [KnownVehiclesService],
  exports: [KnownVehiclesService],
})
export class KnownVehiclesModule {}
