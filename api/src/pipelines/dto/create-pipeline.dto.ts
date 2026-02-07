import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePipelineStageDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  color: string;

  @IsInt()
  @Min(0)
  @Max(100)
  probability: number;

  @IsBoolean()
  @IsOptional()
  isClosedWon?: boolean;

  @IsBoolean()
  @IsOptional()
  isClosedLost?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreatePipelineDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePipelineStageDto)
  @IsOptional()
  stages?: CreatePipelineStageDto[];
}
