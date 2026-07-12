import { IsOptional, IsString } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  vehicleNumber: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  addedBy?: string;
}

export class UpdateWatchlistDto {
    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    priority?: string;

    @IsOptional()
    @IsString()
    status?: string;
}
