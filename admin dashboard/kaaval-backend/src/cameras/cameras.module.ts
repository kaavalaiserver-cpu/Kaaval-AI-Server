import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Camera } from './entities/camera.entity.js';
import { CamerasService } from './cameras.service.js';
import { CamerasController } from './cameras.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Camera])],
  controllers: [CamerasController],
  providers: [CamerasService],
  exports: [CamerasService],
})
export class CamerasModule {}
