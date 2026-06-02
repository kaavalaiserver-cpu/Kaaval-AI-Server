import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  getLogs(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('level') level?: string,
  ) {
    return this.systemService.getLogs(limit ?? 50, page ?? 1, level);
  }

  /**
   * Internal-only endpoint: AI pipeline / edge devices POST logs here.
   * Kept unauthenticated but protected by CORS + rate limiting.
   * In production, restrict this to the internal network via a reverse proxy.
   */
  @Post('logs')
  async addLog(@Body() body: { level: string; module: string; message: string }) {
    return this.systemService.addLog(body.level, body.module, body.message);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  getStatus() {
    return this.systemService.getStatus();
  }

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get('ai-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  getAiStatus() {
    return this.systemService.getAiStatus();
  }
}
