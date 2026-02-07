import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { SplitType } from '@prisma/client';

export class CreateSplitDto {
  @IsString()
  userId: string;

  @IsEnum(SplitType)
  @IsOptional()
  splitType?: SplitType;

  @IsNumber()
  @Min(0)
  @Max(100)
  splitPercent: number;

  @IsBoolean()
  @IsOptional()
  includeInQuota?: boolean;

  @IsBoolean()
  @IsOptional()
  includeInForecast?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
