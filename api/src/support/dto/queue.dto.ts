import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateQueueDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  categories?: TicketCategory[];

  @IsOptional()
  @IsArray()
  priorities?: TicketPriority[];

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsNumber()
  slaMultiplier?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateQueueDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  categories?: TicketCategory[];

  @IsOptional()
  @IsArray()
  priorities?: TicketPriority[];

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsNumber()
  slaMultiplier?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class AssignAgentDto {
  @IsString()
  agentId: string;

  @IsOptional()
  @IsNumber()
  priority?: number;
}
