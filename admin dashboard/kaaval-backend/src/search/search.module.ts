import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Violation } from '../violations/entities/violation.entity.js';
import { SearchService } from './search.service.js';
import { SearchController } from './search.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Violation])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
