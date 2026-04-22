import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';

export class VerifyViolationDto {
  @IsString()
  action!: string; // 'approve' | 'reject'

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string;
}

export class UpdateViolationDto {
  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  violationType?: string;

  @IsOptional()
  @IsNumber()
  challanAmount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class CreateViolationDto {
  @IsString()
  vehicleNumber!: string;

  @IsOptional()
  @IsString()
  violationType?: string;

  @IsOptional()
  @IsNumber()
  confidenceScore?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  proofImgUrl?: string;

  @IsOptional()
  @IsString()
  cameraId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class DetectDto {
  @IsString({ each: true })
  image_urls!: string[];
  
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ViolationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsString()
  cameraId?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  violationType?: string;
}
