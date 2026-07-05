import { Controller, Get, Post, Patch, Delete, UseGuards, Request, Body, Param, Query } from '@nestjs/common';
import { CamerasService } from './cameras.service.js';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

@Controller('cameras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  findAll() {
    return this.camerasService.findAll();
  }

  @Get('status')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR')
  getStatus(@Request() req: any) {
    return this.camerasService.getStatus(req.user);
  }

  @Get('junctions')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  getJunctions(@Request() req: any) {
    return this.camerasService.getJunctions(req.user);
  }

  @Get('subdivisions')
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  getSubdivisions(@Request() req: any) {
    return this.camerasService.getSubdivisions(req.user);
  }

  @Get('geocode')
  @Roles('SUPER_ADMIN', 'SP', 'DEVELOPER')
  async geocode(@Query('q') query: string) {
    return this.camerasService.geocode(query);
  }

  @Post('junctions')
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  createJunction(@Body() dto: any, @Request() req: any) {
    return this.camerasService.createJunction(dto, req.user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SP', 'DEVELOPER')
  create(@Body() dto: any) {
    return this.camerasService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'SP', 'DEVELOPER')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.camerasService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SP', 'DEVELOPER')
  remove(@Param('id') id: string) {
    return this.camerasService.remove(id);
  }

  @Post('seed')
  @Roles('SUPER_ADMIN')
  seed() {
    return this.camerasService.seed();
  }
}
