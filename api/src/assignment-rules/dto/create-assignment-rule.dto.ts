import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AssignmentRuleEntity, AssignmentMethod, ConditionOperator } from '@prisma/client';

export class ConditionDto {
  @ApiProperty({ description: 'Field to evaluate' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Comparison operator', enum: ConditionOperator })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ description: 'Value to compare against' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Condition order' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class AssigneeDto {
  @ApiPropertyOptional({ description: 'User ID to assign to' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Team ID to assign to' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Weight for weighted assignment', default: 1 })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Assignee order' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateAssignmentRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Entity type this rule applies to', enum: AssignmentRuleEntity })
  @IsEnum(AssignmentRuleEntity)
  entity: AssignmentRuleEntity;

  @ApiPropertyOptional({ description: 'Assignment method', enum: AssignmentMethod, default: 'ROUND_ROBIN' })
  @IsOptional()
  @IsEnum(AssignmentMethod)
  method?: AssignmentMethod;

  @ApiPropertyOptional({ description: 'Is rule active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Rule order/priority' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Rule conditions', type: [ConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @ApiPropertyOptional({ description: 'Rule assignees', type: [AssigneeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeDto)
  assignees?: AssigneeDto[];
}
