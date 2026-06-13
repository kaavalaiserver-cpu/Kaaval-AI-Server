import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { WatchlistService } from './watchlist.service.js';
import { CreateWatchlistDto, UpdateWatchlistDto } from './dto/watchlist.dto.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('watchlist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SP, Role.DSP)
  create(@Body() createWatchlistDto: CreateWatchlistDto, @Request() req: any) {
    return this.watchlistService.addToWatchlist(createWatchlistDto, req.user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SP, Role.DSP)
  findAll(@Query('priority') priority?: string, @Query('status') status?: string) {
    return this.watchlistService.findAll(priority, status);
  }

  @Get(':vehicleNumber')
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SP, Role.DSP)
  findOne(@Param('vehicleNumber') vehicleNumber: string) {
    return this.watchlistService.checkStatus(vehicleNumber);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SP, Role.DSP)
  update(@Param('id') id: string, @Body() dto: UpdateWatchlistDto, @Request() req: any) {
    return this.watchlistService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER, Role.SP, Role.DSP)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.watchlistService.remove(id, req.user);
  }
}