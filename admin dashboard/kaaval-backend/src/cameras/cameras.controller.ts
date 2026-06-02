import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { CamerasService } from './cameras.service.js';
import { JwtAuthGuard, RolesGuard, Roles, Role, SUBDIVISION_ROLES } from '../auth/index.js';

@Controller('cameras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER)
  findAll() {
    return this.camerasService.findAll();
  }

  @Get('status')
  @Roles(Role.SUPER_ADMIN, Role.SP, Role.DSP, Role.DEVELOPER, ...SUBDIVISION_ROLES)
  getStatus(@Request() req: any) {
    return this.camerasService.getStatus(req.user);
  }

  @Post('seed')
  @Roles(Role.SUPER_ADMIN, Role.DEVELOPER)
  seed() {
    return this.camerasService.seed();
  }
}
