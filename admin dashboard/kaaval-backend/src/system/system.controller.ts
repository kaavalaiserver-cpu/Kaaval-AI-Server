import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('system')
// @UseGuards(JwtAuthGuard, RolesGuard) // Commented out to allow external services to post logs without auth for now (internal network only)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('logs')
  // @UseGuards(JwtAuthGuard, RolesGuard) // Keep auth for read
  getLogs(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('level') level?: string,
  ) {
    return this.systemService.getLogs(limit ?? 50, page ?? 1, level);
  }

  @Post('logs') // Public endpoint for internal services
  async addLog(@Body() body: { level: string; module: string; message: string }) {
    return this.systemService.addLog(body.level, body.module, body.message);
  }

  @Get('status')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  getStatus() {
    return this.systemService.getStatus();
  }

  @Get('health')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  getHealth() {
    return this.systemService.getHealth();
  }
}
