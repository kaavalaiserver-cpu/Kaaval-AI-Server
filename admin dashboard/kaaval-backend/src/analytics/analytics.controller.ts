import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../auth/index.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('peak-hours')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  async getPeakHours() {
    return this.analyticsService.getPeakHours(30);
  }

  @Get('camera-efficiency')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  async getCameraEfficiency() {
    return this.analyticsService.getCameraEfficiency(30);
  }

  @Get('heatmap')
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  async getHeatmap() {
    return this.analyticsService.getHeatmapData(30);
  }

  @Get('dev')
  @Roles(Role.DEV_ADMIN)
  async getDevAnalytics() {
    return this.analyticsService.getDevAnalytics();
  }
}
