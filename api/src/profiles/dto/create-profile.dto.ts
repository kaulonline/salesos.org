import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DataAccessLevel } from '@prisma/client';

export class PermissionDto {
  @ApiProperty({ description: 'Module name' })
  @IsString()
  module: string;

  @ApiPropertyOptional({ description: 'Can read' })
  @IsOptional()
  @IsBoolean()
  canRead?: boolean;

  @ApiPropertyOptional({ description: 'Can create' })
  @IsOptional()
  @IsBoolean()
  canCreate?: boolean;

  @ApiPropertyOptional({ description: 'Can edit' })
  @IsOptional()
  @IsBoolean()
  canEdit?: boolean;

  @ApiPropertyOptional({ description: 'Can delete' })
  @IsOptional()
  @IsBoolean()
  canDelete?: boolean;

  @ApiPropertyOptional({ enum: DataAccessLevel, description: 'Data access level' })
  @IsOptional()
  @IsEnum(DataAccessLevel)
  dataAccess?: DataAccessLevel;
}

export class CreateProfileDto {
  @ApiProperty({ description: 'Profile name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Profile description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [PermissionDto], description: 'Permissions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}
