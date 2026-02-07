import { IsNumber, IsOptional, IsBoolean, IsString, Min, Max } from 'class-validator';

export class UpdateSplitDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  splitPercent?: number;

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
