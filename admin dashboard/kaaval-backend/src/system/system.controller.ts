import { Controller, Get, Post, Delete, Body, Query, UseGuards, Request, Headers, UnauthorizedException } from '@nestjs/common';
import { SystemService } from './system.service.js';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';
import { Request as ExpressRequest } from 'express';

@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly auditService: AuditService,
  ) {}

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  getLogs(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('level') level?: string,
    @Query('search') search?: string,
  ) {
    return this.systemService.getLogs(limit ?? 50, page ?? 1, level, search);
  }

  @Delete('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  clearLogs() {
    return this.systemService.clearLogs();
  }

  /**
   * Internal-only endpoint: AI pipeline / edge devices POST logs here.
   * Secured by API Key for public IP deployment.
   */
  @Post('logs')
  async addLog(
    @Body() body: { level: string; module: string; message: string },
    @Headers('x-api-key') apiKey: string,
  ) {
    const VALID_KEY = process.env.RDK_API_KEY;
    if (!VALID_KEY || apiKey !== VALID_KEY) {
      throw new UnauthorizedException('Invalid API Key');
    }
    return this.systemService.addLog(body.level, body.module, body.message);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  getStatus() {
    return this.systemService.getStatus();
  }

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get('ai-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  getAiStatus() {
    return this.systemService.getAiStatus();
  }

  @Get('plate-api-usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  getPlateApiUsage() {
    return this.systemService.getPlateApiUsage();
  }

  @Get('audit/my-last-action')
  @UseGuards(JwtAuthGuard)
  async getMyLastAction(@Request() req: any) {
    if (!req.user || !req.user.id) return null;
    return this.auditService.getLastAction(req.user.id);
  }
}
