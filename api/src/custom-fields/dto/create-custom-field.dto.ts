import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDto {
  @ApiPropertyOptional({ description: 'API name (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Display label' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Field description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CustomFieldEntity, description: 'Entity this field belongs to' })
  @IsEnum(CustomFieldEntity)
  entity: CustomFieldEntity;

  @ApiProperty({ enum: CustomFieldType, description: 'Field type' })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiPropertyOptional({ description: 'Is field required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Is field value unique' })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Picklist values for PICKLIST or MULTI_PICKLIST types' })
  @IsOptional()
  @IsArray()
  picklistValues?: Array<{ value: string; label: string }>;

  @ApiPropertyOptional({ enum: CustomFieldEntity, description: 'Target entity for LOOKUP type' })
  @IsOptional()
  @IsEnum(CustomFieldEntity)
  lookupEntity?: CustomFieldEntity;

  @ApiPropertyOptional({ description: 'Decimal precision for NUMBER/CURRENCY types' })
  @IsOptional()
  @IsNumber()
  precision?: number;

  @ApiPropertyOptional({ description: 'Minimum value for NUMBER/CURRENCY types' })
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @ApiPropertyOptional({ description: 'Maximum value for NUMBER/CURRENCY types' })
  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @ApiPropertyOptional({ description: 'Maximum length for TEXT types' })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Regex validation pattern' })
  @IsOptional()
  @IsString()
  pattern?: string;
}
