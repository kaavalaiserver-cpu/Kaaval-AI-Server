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
  BadRequestException,
  HttpException,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/index.js';

@Controller('violations')
export class ViolationsController {
  constructor(
    private readonly violationsService: ViolationsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('pipeline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP')
  async createFromPipeline(@Body() createDto: CreateViolationDto, @Request() req: any) {
    return this.violationsService.create(createDto, req.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP')
  async createManual(@Body() createDto: CreateViolationDto, @Request() req: any) {
    return this.violationsService.create(createDto, req.user);
  }

  @Post('detect')
  async detect(
    @Body() dto: DetectDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    // Validate API Key against env var only — no hardcoded fallback
    const VALID_KEY = process.env.RDK_API_KEY;
    if (!VALID_KEY || apiKey !== VALID_KEY) {
      console.warn(`🚨 Unauthorized access attempt to /detect`);
      throw new UnauthorizedException('Invalid API Key');
    }

    const aiUrl = this.configService.get<string>(
      'AI_BACKEND_URL',
      'http://127.0.0.1:8000',
    );

    return this.violationsService.processDetection(dto, aiUrl);
  }

  @Get('image/by-key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  async getImageByKey(@Query('key') key: string, @Request() req: any, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('Image key is required');
    }
    
    const stream = await this.violationsService.getImageStreamByKey(key, req.user);
    
    if (key.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
    else if (key.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else res.setHeader('Content-Type', 'image/jpeg');
    
    stream.pipe(res);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  getViolationTypes() {
    return this.violationsService.getViolationTypes();
  }

  @Post('types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  createViolationType(@Body() dto: any) {
    return this.violationsService.createViolationType(dto);
  }

  @Patch('types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  updateViolationType(@Param('id') id: string, @Body() dto: any) {
    return this.violationsService.updateViolationType(id, dto);
  }

  @Delete('types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  removeViolationType(@Param('id') id: string) {
    return this.violationsService.removeViolationType(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  findAll(@Query() query: ViolationQueryDto, @Request() req: any) {
    return this.violationsService.findAll(query, req.user);
  }

  @Get('track/:vehicleNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  async trackVehicle(@Param('vehicleNumber') vehicleNumber: string) {
    return this.violationsService.trackVehicle(vehicleNumber);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  getStats(@Query() query: ViolationQueryDto, @Request() req: any) {
    return this.violationsService.getStats(query, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.violationsService.findOne(id, req.user);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  verify(@Param('id') id: string, @Body() dto: VerifyViolationDto, @Request() req: any) {
    return this.violationsService.verify(id, dto, req.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER')
  update(@Param('id') id: string, @Body() dto: UpdateViolationDto, @Request() req: any) {
    return this.violationsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER', 'SP', 'DSP', 'INSPECTOR', 'SUB_INSPECTOR', 'OPERATOR', 'NAGERCOIL_ADMIN', 'THUCKALAY_ADMIN', 'COLACHEL_ADMIN', 'KANYAKUMARI_ADMIN', 'MARTHANDAM_ADMIN')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.violationsService.remove(id, req.user);
  }

  @Post('batch-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'DEVELOPER')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
      fileFilter: (_req, file, cb) => {
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
        if (ALLOWED_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type '${file.mimetype}' is not allowed. Upload images only.`), false);
        }
      },
    }),
  )
  batchUpload(@UploadedFiles() files: Express.Multer.File[], @Request() req: any) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No valid image files were uploaded');
    }
    const aiUrl = this.configService.get<string>(
      'AI_BACKEND_URL',
      'http://127.0.0.1:8000',
    );
    return this.violationsService.batchUpload(files, aiUrl, req.user);
  }
}
