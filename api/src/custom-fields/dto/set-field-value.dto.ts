import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CustomFieldEntity } from '@prisma/client';

export class SetFieldValueDto {
  @ApiProperty({ description: 'Custom field ID' })
  @IsString()
  fieldId: string;

  @ApiProperty({ enum: CustomFieldEntity, description: 'Entity type' })
  @IsEnum(CustomFieldEntity)
  entityType: CustomFieldEntity;

  @ApiProperty({ description: 'Entity record ID' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Field value' })
  value: any;
}
