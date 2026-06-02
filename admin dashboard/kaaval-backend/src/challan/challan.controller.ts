import { Controller, Get, Param, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ChallanService } from './challan.service.js';
import { JwtAuthGuard, Roles, Role, RolesGuard } from '../auth/index.js';

@Controller('challan')
export class ChallanController {
  constructor(private readonly challanService: ChallanService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  async generateChallan(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.challanService.generateChallan(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="challan_${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}