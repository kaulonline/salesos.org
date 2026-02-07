import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, IsArray } from 'class-validator';

export class UpdatePipelineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePipelineStageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

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

export class ReorderStagesDto {
  @IsArray()
  @IsString({ each: true })
  stageIds: string[];
}

export class DuplicatePipelineDto {
  @IsString()
  name: string;
}
