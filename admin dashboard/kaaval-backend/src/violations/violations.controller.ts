import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Headers,
  UnauthorizedException,
  HttpException,
  Request,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ViolationsService } from './violations.service.js';
import {
  ViolationQueryDto,
  VerifyViolationDto,
  UpdateViolationDto,
  CreateViolationDto,
  DetectDto,
} from './dto/violation.dto.js';
import { JwtAuthGuard, RolesGuard, Roles, Role, SUBDIVISION_ROLES } from '../auth/index.js';

@Controller('violations')
export class ViolationsController {
  constructor(
    private readonly violationsService: ViolationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('pipeline')
  //@UseGuards(JwtAuthGuard) // Can re-enable for prod
  async createFromPipeline(@Body() createDto: CreateViolationDto) {
    return this.violationsService.create(createDto);
  }

  @Post('detect')
  async detect(
    @Body() dto: DetectDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    // 1. Validate API Key (Should match RDK)
    // In production, move this to config or Guard
    const VALID_KEY = process.env.RDK_API_KEY || 'SECRET_KEY';
    if (apiKey !== VALID_KEY) {
      console.warn(`🚨 Unauthorized access attempt to /detect from IP`);
      throw new UnauthorizedException('Invalid API Key');
    }

    const aiUrl = this.configService.get<string>(
      'AI_BACKEND_URL',
      'http://127.0.0.1:8000',
    );

    return this.violationsService.processDetection(dto, aiUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN, ...SUBDIVISION_ROLES)
  findAll(@Query() query: ViolationQueryDto, @Request() req: any) {
    return this.violationsService.findAll(query, req.user);
  }

  @Get('track/:vehicleNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  async trackVehicle(@Param('vehicleNumber') vehicleNumber: string) {
    return this.violationsService.trackVehicle(vehicleNumber);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN, ...SUBDIVISION_ROLES)
  getStats(@Request() req: any) {
    return this.violationsService.getStats(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN, ...SUBDIVISION_ROLES)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.violationsService.findOne(id, req.user);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN, ...SUBDIVISION_ROLES)
  verify(@Param('id') id: string, @Body() dto: VerifyViolationDto, @Request() req: any) {
    return this.violationsService.verify(id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.TRAFFIC_ADMIN, Role.DEV_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateViolationDto, @Request() req: any) {
    return this.violationsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEV_ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.violationsService.remove(id, req.user);
  }

  @Post('batch-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.DEV_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 50))
  batchUpload(@UploadedFiles() files: Express.Multer.File[]) {
    const aiUrl = this.configService.get<string>(
      'AI_BACKEND_URL',
      'http://127.0.0.1:8000',
    );
    return this.violationsService.batchUpload(files, aiUrl);
  }
}
