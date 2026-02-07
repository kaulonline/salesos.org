import { PartialType } from '@nestjs/mapped-types';
import { CreateAppContentDto } from './create-app-content.dto';
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateAppContentDto extends PartialType(CreateAppContentDto) {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
