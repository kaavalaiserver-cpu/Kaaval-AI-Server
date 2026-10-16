import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelEvaluation } from './entities/model-evaluation.entity.js';
import { Violation } from '../violations/entities/violation.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../auth/entities/role.entity.js';
import { ModelEvaluationsService } from './model-evaluations.service.js';
import { ModelEvaluationsController } from './model-evaluations.controller.js';
import { SystemModule } from '../system/system.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModelEvaluation, Violation, User, Role]),
    SystemModule,
  ],
  controllers: [ModelEvaluationsController],
  providers: [ModelEvaluationsService],
  exports: [ModelEvaluationsService],
})
export class ModelEvaluationsModule {}
