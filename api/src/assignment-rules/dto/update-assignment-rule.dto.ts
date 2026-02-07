import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentMethod } from '@prisma/client';

export class UpdateAssignmentRuleDto {
  @ApiPropertyOptional({ description: 'Rule name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Assignment method', enum: AssignmentMethod })
  @IsOptional()
  @IsEnum(AssignmentMethod)
  method?: AssignmentMethod;

  @ApiPropertyOptional({ description: 'Is rule active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Rule order/priority' })
  @IsOptional()
  @IsNumber()
  order?: number;
}
