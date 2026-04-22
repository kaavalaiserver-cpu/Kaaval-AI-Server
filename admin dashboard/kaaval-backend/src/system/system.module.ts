import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from './entities/system-log.entity.js';
import { Camera } from '../cameras/entities/camera.entity.js';
import { SystemService } from './system.service.js';
import { SystemController } from './system.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemLog, Camera])],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
