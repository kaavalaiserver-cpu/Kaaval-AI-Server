import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  search(
    @Query('query') query: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.searchService.search(query ?? '', dateFrom, dateTo);
  }
}
