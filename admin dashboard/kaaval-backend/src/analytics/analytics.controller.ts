import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('peak-hours')
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  async getPeakHours() {
    return this.analyticsService.getPeakHours(30);
  }

  @Get('camera-efficiency')
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  async getCameraEfficiency() {
    return this.analyticsService.getCameraEfficiency(30);
  }

  @Get('heatmap')
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  async getHeatmap() {
    return this.analyticsService.getHeatmapData(30);
  }

  @Get('dev')
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  async getDevAnalytics() {
    return this.analyticsService.getDevAnalytics();
  }
}
