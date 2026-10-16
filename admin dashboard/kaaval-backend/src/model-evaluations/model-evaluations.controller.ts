import { Controller, Get, Post, Body, Query, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { ModelEvaluationsService } from './model-evaluations.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto.js';

const REVIEW_ROLES = [
  'INTERN',
  'SUPER_ADMIN',
  'ADMIN_SAJIV',
  'ADMIN_BINU',
  'ADMIN_HARISH',
  'DEVELOPER',
  'INSPECTOR',
  'SUB_INSPECTOR',
  'NAGERCOIL_ADMIN',
  'THUCKALAY_ADMIN',
  'COLACHEL_ADMIN',
  'KANYAKUMARI_ADMIN',
  'MARTHANDAM_ADMIN',
  'CRIMEBRANCH_COLACHEL_ADMIN',
];

const ANALYTICS_ROLES = [
  'SUPER_ADMIN',
  'ADMIN_SAJIV',
  'ADMIN_BINU',
  'ADMIN_HARISH',
  'DEVELOPER',
];

// Intern management and dataset export strictly restricted to System Developer and Super Admin
const DEV_EXCLUSIVE_ROLES = ['DEVELOPER', 'SUPER_ADMIN'];

@Controller('model-evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelEvaluationsController {
  constructor(private readonly evalService: ModelEvaluationsService) {}

  @Get('queue')
  @Roles(...REVIEW_ROLES)
  getReviewQueue(@Request() req: any, @Query('limit') limit?: string) {
    const l = limit ? Number(limit) : 5;
    return this.evalService.getReviewQueue(req.user, l);
  }

  @Post('submit')
  @Roles(...REVIEW_ROLES)
  submitEvaluation(@Request() req: any, @Body() dto: SubmitEvaluationDto) {
    return this.evalService.submitEvaluation(req.user, dto);
  }

  @Get('stats/today')
  @Roles(...REVIEW_ROLES)
  getTodayStats(@Request() req: any) {
    return this.evalService.getTodayStats(req.user);
  }

  @Get('analytics')
  @Roles(...ANALYTICS_ROLES)
  getModelAnalytics() {
    return this.evalService.getModelAnalytics();
  }

  @Get('interns')
  @Roles(...DEV_EXCLUSIVE_ROLES)
  getInternProductivity() {
    return this.evalService.getInternProductivity();
  }

  @Post('interns')
  @Roles(...DEV_EXCLUSIVE_ROLES)
  createIntern(@Request() req: any, @Body() body: { username: string; fullName: string; password?: string }) {
    return this.evalService.createIntern(req.user, body);
  }

  @Get('export')
  @Roles(...DEV_EXCLUSIVE_ROLES)
  async exportDataset(@Query('format') format: string, @Res() res: Response) {
    const isCsv = format === 'csv';
    const data = await this.evalService.exportDataset(isCsv ? 'csv' : 'json');

    if (isCsv) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="kaaval_model_evaluations.csv"');
      return res.send(data);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="kaaval_model_evaluations.json"');
    return res.json(data);
  }
}
