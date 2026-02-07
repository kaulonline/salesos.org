import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { AppContentType } from '@prisma/client';

export class CreateAppContentDto {
  @IsEnum(AppContentType)
  type: AppContentType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  version: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
