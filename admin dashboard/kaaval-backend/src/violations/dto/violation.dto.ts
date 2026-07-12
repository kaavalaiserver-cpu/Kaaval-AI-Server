import {
  IsOptional, IsString, IsNumber, IsIn, IsArray,
  MaxLength, MinLength, Min, Max, ArrayMaxSize, IsUrl,
} from 'class-validator';

export class VerifyViolationDto {
  @IsString()
  @IsIn(['approve', 'reject'], { message: 'action must be "approve" or "reject"' })
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  violationType?: string;
}

export class UpdateViolationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  violationType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  challanAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'READY', 'MANUAL_REVIEW', 'CHALLAN_ISSUED', 'VERIFIED', 'REJECTED'],
    { message: 'Invalid status value' })
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;
}

export class CreateViolationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  vehicleNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  violationType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  proofImgUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cameraId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'READY', 'MANUAL_REVIEW', 'CHALLAN_ISSUED', 'VERIFIED', 'REJECTED'],
    { message: 'Invalid status value' })
  status?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class DetectDto {
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 images per detection request' })
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  image_urls!: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ViolationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'READY', 'MANUAL_REVIEW', 'CHALLAN_ISSUED', 'VERIFIED', 'REJECTED', ''],
    { message: 'Invalid status filter' })
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cameraId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  violationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  subdivisionCode?: string;
}
