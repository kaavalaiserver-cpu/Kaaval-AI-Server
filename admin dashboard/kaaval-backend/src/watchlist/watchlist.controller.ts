import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { WatchlistService } from './watchlist.service.js';
import { CreateWatchlistDto, UpdateWatchlistDto } from './dto/watchlist.dto.js';

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Post()
  create(@Body() createWatchlistDto: CreateWatchlistDto) {
    return this.watchlistService.addToWatchlist(createWatchlistDto);
  }

  @Get()
  findAll(@Query('priority') priority?: string, @Query('status') status?: string) {
    return this.watchlistService.findAll(priority, status);
  }

  @Get(':vehicleNumber')
  findOne(@Param('vehicleNumber') vehicleNumber: string) {
    return this.watchlistService.checkStatus(vehicleNumber);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWatchlistDto) {
    return this.watchlistService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.watchlistService.remove(id);
  }
}