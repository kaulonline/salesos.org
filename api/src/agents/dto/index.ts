/**
 * IRIS Agent Framework - DTOs
 * 
 * Data Transfer Objects for Agent API endpoints.
 * These follow standard REST API conventions.
 */

import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentType, Priority, AgentTrigger } from '../types';

// ==================== TRIGGER AGENT ====================

export class TriggerAgentDto {
  @ApiProperty({ enum: AgentType, description: 'Type of agent to trigger' })
  @IsEnum(AgentType)
  agentType: AgentType;

  @ApiPropertyOptional({ description: 'Entity type to target (Lead, Opportunity, Account, etc.)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID to target' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Execution priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Additional metadata for the agent' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ==================== AGENT CONFIG ====================

export class UpdateAgentConfigDto {
  @ApiPropertyOptional({ description: 'Enable or disable the agent' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Require approval for actions' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Enable scheduled execution' })
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Cron expression for scheduling' })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional({ description: 'Max execution time in ms' })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  maxExecutionTimeMs?: number;

  @ApiPropertyOptional({ description: 'Max LLM calls per execution' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxLLMCalls?: number;

  @ApiPropertyOptional({ description: 'Max alerts per execution' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxAlertsPerExecution?: number;

  @ApiPropertyOptional({ description: 'Rate limit per hour' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rateLimitPerHour?: number;

  @ApiPropertyOptional({ description: 'Rate limit per day' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimitPerDay?: number;
}

// ==================== ALERT MANAGEMENT ====================

export class UpdateAlertDto {
  @ApiProperty({ enum: ['ACKNOWLEDGED', 'ACTIONED', 'DISMISSED'], description: 'New alert status' })
  @IsEnum(['ACKNOWLEDGED', 'ACTIONED', 'DISMISSED'])
  status: 'ACKNOWLEDGED' | 'ACTIONED' | 'DISMISSED';

  @ApiPropertyOptional({ description: 'Notes about the action taken' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryAlertsDto {
  @ApiPropertyOptional({ enum: AgentType, description: 'Filter by agent type' })
  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;

  @ApiPropertyOptional({ enum: ['PENDING', 'ACKNOWLEDGED', 'ACTIONED', 'DISMISSED', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Entity type filter' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID filter' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Number of days to look back', default: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({ description: 'Max results', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

// ==================== ACTION MANAGEMENT ====================

export class ApproveActionDto {
  @ApiProperty({ description: 'Whether to approve or reject the action' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Reason for rejection (if rejected)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class QueryActionsDto {
  @ApiPropertyOptional({ enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTING', 'COMPLETED', 'FAILED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Action type filter' })
  @IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional({ description: 'Number of days to look back', default: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({ description: 'Max results', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

// ==================== EXECUTION HISTORY ====================

export class QueryExecutionsDto {
  @ApiPropertyOptional({ enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;

  @ApiPropertyOptional({ enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RATE_LIMITED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Number of days to look back', default: 7 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({ description: 'Max results', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

// ==================== RESPONSE TYPES ====================

export class AgentStatusResponse {
  @ApiProperty({ enum: AgentType })
  type: AgentType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  version: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  requiresApproval: boolean;

  @ApiPropertyOptional()
  lastExecutedAt?: Date;

  @ApiProperty()
  executionCount: number;

  @ApiProperty()
  errorCount: number;

  @ApiProperty()
  schedule?: {
    enabled: boolean;
    cron?: string;
  };

  @ApiProperty()
  limits: {
    maxExecutionTimeMs: number;
    maxLLMCalls: number;
    maxAlertsPerExecution: number;
    rateLimitPerHour: number;
    rateLimitPerDay: number;
  };
}

export class QueueStatusResponse {
  @ApiProperty()
  queuedJobs: number;

  @ApiProperty()
  runningJobs: number;

  @ApiProperty()
  jobsByAgent: Record<string, number>;
}

export class TriggerResponse {
  @ApiProperty()
  executionId: string;

  @ApiProperty({ enum: AgentType })
  agentType: AgentType;

  @ApiProperty()
  status: string;

  @ApiProperty()
  message: string;
}












