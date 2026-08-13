import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { KnownVehiclesService } from './known-vehicles.service.js';

const SUPER_ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH'];
const VIEW_ONLY_ROLES = ['ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH'];

@Controller('api/known-vehicles')
@UseGuards(JwtAuthGuard)
export class KnownVehiclesController {
  constructor(private readonly kvService: KnownVehiclesService) {}

  /** GET /api/known-vehicles — All 4 privileged accounts can view */
  @Get()
  findAll(@Request() req: any) {
    const role = (req.user?.role || '').toUpperCase();
    if (!SUPER_ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException('Access denied');
    }
    return this.kvService.findAll();
  }

  /** POST /api/known-vehicles — Super admin only */
  @Post()
  add(@Request() req: any, @Body() body: { vehicleNumber: string; reason?: string }) {
    const role = (req.user?.role || '').toUpperCase();
    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can add known vehicles');
    }
    return this.kvService.add(body.vehicleNumber, body.reason ?? '', req.user.id);
  }

  /** DELETE /api/known-vehicles/:id — Super admin only */
  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const role = (req.user?.role || '').toUpperCase();
    if (role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only super admin can remove known vehicles');
    }
    return this.kvService.remove(id);
  }

  /** GET /api/known-vehicles/history/:vehicleNumber — All 4 privileged accounts */
  @Get('history/:vehicleNumber')
  getHistory(@Request() req: any, @Param('vehicleNumber') vehicleNumber: string) {
    const role = (req.user?.role || '').toUpperCase();
    if (!SUPER_ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException('Access denied');
    }
    return this.kvService.getHistory(vehicleNumber);
  }

  /** POST /api/known-vehicles/record-hit — called from ingest API (internal use) */
  @Post('record-hit')
  recordHit(@Body() body: {
    knownVehicleId: string;
    vehicleNumber: string;
    violationType?: string;
    cameraId?: string;
    cameraName?: string;
    location?: string;
    confidence?: number;
  }) {
    return this.kvService.recordHit(body);
  }
}
