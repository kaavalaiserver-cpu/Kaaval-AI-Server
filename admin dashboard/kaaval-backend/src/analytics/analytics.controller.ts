import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR')
  async getSummary(@Request() req: any, @Query('subdivisionCode') subdivisionCode?: string) {
    return this.analyticsService.getSummary(req.user, subdivisionCode);
  }

  @Get('peak-hours')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  async getPeakHours() {
    return this.analyticsService.getPeakHours(30);
  }

  @Get('camera-efficiency')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  async getCameraEfficiency() {
    return this.analyticsService.getCameraEfficiency(30);
  }

  @Get('heatmap')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  async getHeatmap() {
    return this.analyticsService.getHeatmapData(30);
  }

  @Get('dev')
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  async getDevAnalytics() {
    return this.analyticsService.getDevAnalytics();
  }
}
