import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';
import { AIAgentSpecialization, AIAgentStatus } from '@prisma/client';

export class CreateAIAgentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsEnum(AIAgentSpecialization)
  specialization: AIAgentSpecialization;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  capabilities?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  autoReply?: boolean;

  @IsOptional()
  @IsNumber()
  escalateAfter?: number;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  responseDelay?: number;

  @IsOptional()
  @IsString()
  workingHoursStart?: string;

  @IsOptional()
  @IsString()
  workingHoursEnd?: string;

  @IsOptional()
  @IsArray()
  workingDays?: number[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAIAgentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(AIAgentSpecialization)
  specialization?: AIAgentSpecialization;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  capabilities?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  autoReply?: boolean;

  @IsOptional()
  @IsNumber()
  escalateAfter?: number;

  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  responseDelay?: number;

  @IsOptional()
  @IsString()
  workingHoursStart?: string;

  @IsOptional()
  @IsString()
  workingHoursEnd?: string;

  @IsOptional()
  @IsArray()
  workingDays?: number[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(AIAgentStatus)
  status?: AIAgentStatus;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
