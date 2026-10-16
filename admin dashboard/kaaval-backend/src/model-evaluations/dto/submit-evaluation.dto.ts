import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber } from 'class-validator';

export class SubmitEvaluationDto {
  @IsString()
  @IsNotEmpty()
  violationId!: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  // OCR
  @IsString()
  @IsIn(['CORRECT', 'INCORRECT', 'UNREADABLE'])
  ocrStatus!: 'CORRECT' | 'INCORRECT' | 'UNREADABLE';

  @IsOptional()
  @IsString()
  originalOcrPrediction?: string;

  @IsOptional()
  @IsString()
  correctedOcrValue?: string;

  @IsOptional()
  @IsString()
  ocrUnreadableReason?: string;

  // Violation check
  @IsOptional()
  @IsString()
  predictedViolation?: string;

  @IsString()
  @IsIn(['CORRECT', 'INCORRECT', 'CANNOT_DETERMINE'])
  violationVerdict!: 'CORRECT' | 'INCORRECT' | 'CANNOT_DETERMINE';

  @IsOptional()
  @IsString()
  errorCategory?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  // Visual Context
  @IsOptional()
  @IsString()
  imageQuality?: string;

  @IsOptional()
  @IsString()
  lightingCondition?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  // Extra observations
  @IsOptional()
  @IsString()
  @IsIn(['NONE', 'CONFIRMED', 'POSSIBLE'])
  phoneWhileDriving?: 'NONE' | 'CONFIRMED' | 'POSSIBLE';

  // Duration
  @IsOptional()
  @IsNumber()
  reviewDurationSeconds?: number;
}
