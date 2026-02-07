import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

export class UpdateCustomFieldDto {
  @ApiPropertyOptional({ description: 'Display label' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Field description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CustomFieldType, description: 'Field type (cannot be changed after creation)' })
  @IsOptional()
  @IsEnum(CustomFieldType)
  fieldType?: CustomFieldType;

  @ApiPropertyOptional({ description: 'Is field required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Is field value unique' })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional({ description: 'Is field active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Picklist values' })
  @IsOptional()
  @IsArray()
  picklistValues?: any;

  @ApiPropertyOptional({ description: 'Decimal precision' })
  @IsOptional()
  @IsNumber()
  precision?: number;

  @ApiPropertyOptional({ description: 'Minimum value' })
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional({ description: 'Maximum value' })
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ description: 'Maximum length' })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Regex validation pattern' })
  @IsOptional()
  @IsString()
  pattern?: string;
}
