import { Module } from '@nestjs/common';
import { ChallanService } from './challan.service.js';
import { ChallanController } from './challan.controller.js';
import { ViolationsModule } from '../violations/violations.module.js';

@Module({
  imports: [ViolationsModule],
  controllers: [ChallanController],
  providers: [ChallanService],
  exports: [ChallanService],
})
export class ChallanModule {}
