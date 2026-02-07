/**
 * Action Item Tracker DTOs
 *
 * Data Transfer Objects for the Action Item Tracking system
 * with Slippage Alerts for Phase 2 Vertiv O2O journey.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActionItemStatus,
  ActionItemPriority,
  ActionItemSourceType,
  SlippageReason,
  EscalationLevel,
  SlippageAlertType,
} from '@prisma/client';

// Re-export Prisma enums for use in controllers and service
export {
  ActionItemStatus,
  ActionItemPriority,
  ActionItemSourceType,
  SlippageReason,
  EscalationLevel,
  SlippageAlertType,
};

// ==================== CREATE DTOs ====================

export class CreateActionItemDto {
  @IsString()
  repId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ActionItemPriority)
  @IsOptional()
  priority?: ActionItemPriority = ActionItemPriority.MEDIUM;

  @IsDateString()
  dueDate: string;

  @IsEnum(ActionItemSourceType)
  @IsOptional()
  sourceType?: ActionItemSourceType = ActionItemSourceType.MANUAL;

  @IsOptional()
  @IsString()
  coachingAgendaId?: string;

  @IsOptional()
  @IsString()
  meetingSessionId?: string;

  @IsOptional()
  @IsString()
  aiRecommendation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  impactScore?: number;
}

export class CreateActionItemFromAgendaDto {
  @IsString()
  coachingAgendaId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaActionItemDto)
  actionItems: AgendaActionItemDto[];
}

export class AgendaActionItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ActionItemPriority)
  @IsOptional()
  priority?: ActionItemPriority = ActionItemPriority.MEDIUM;

  @IsDateString()
  dueDate: string;
}

// ==================== UPDATE DTOs ====================

export class UpdateActionItemStatusDto {
  @IsEnum(ActionItemStatus)
  status: ActionItemStatus;

  @IsOptional()
  @IsEnum(SlippageReason)
  slippageReason?: SlippageReason;

  @IsOptional()
  @IsString()
  slippageNotes?: string;

  @IsOptional()
  @IsString()
  completionNotes?: string;

  @IsOptional()
  completionEvidence?: Record<string, any>;
}

export class UpdateActionItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ActionItemPriority)
  priority?: ActionItemPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

// ==================== QUERY DTOs ====================

export class GetActionItemsQueryDto {
  @IsOptional()
  @IsString()
  repId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsEnum(ActionItemStatus)
  status?: ActionItemStatus;

  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  @IsEnum(EscalationLevel)
  escalationLevel?: EscalationLevel;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsDateString()
  dueAfter?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

// ==================== RESPONSE DTOs ====================

export interface ActionItemResponse {
  id: string;
  repId: string;
  managerId: string;
  sourceType: ActionItemSourceType;
  coachingAgendaId?: string;
  meetingSessionId?: string;
  title: string;
  description?: string;
  category?: string;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  dueDate: string;
  completedAt?: string;
  isOverdue: boolean;
  daysOverdue: number;
  slippageReason?: SlippageReason;
  slippageNotes?: string;
  escalationLevel: EscalationLevel;
  escalatedAt?: string;
  completionNotes?: string;
  aiRecommendation?: string;
  impactScore?: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  repName?: string;
  managerName?: string;
}

export interface SlippageReportResponse {
  summary: {
    totalActionItems: number;
    completedOnTime: number;
    completedLate: number;
    currentlyOverdue: number;
    averageDaysOverdue: number;
    onTimeCompletionRate: number;
  };
  byRep: Array<{
    repId: string;
    repName: string;
    totalItems: number;
    completed: number;
    overdue: number;
    overdueItems: ActionItemResponse[];
    completionRate: number;
    averageDaysToComplete: number;
  }>;
  byCategory: Array<{
    category: string;
    totalItems: number;
    completed: number;
    overdue: number;
    completionRate: number;
  }>;
  bySlippageReason: Array<{
    reason: SlippageReason;
    count: number;
    percentage: number;
  }>;
  trends: {
    period: string;
    completedOnTime: number;
    completedLate: number;
    stillOverdue: number;
  }[];
  escalationStats: {
    totalEscalations: number;
    byLevel: Record<EscalationLevel, number>;
    averageTimeToEscalation: number;
  };
}

export interface ActionItemProgressResponse {
  repId: string;
  repName: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    overdue: number;
    blocked: number;
    completionRate: number;
    onTimeRate: number;
  };
  byPriority: {
    priority: ActionItemPriority;
    total: number;
    completed: number;
    overdue: number;
  }[];
  recentActivity: {
    date: string;
    action: string;
    itemTitle: string;
  }[];
}

// ==================== ESCALATION DTOs ====================

export class EscalateActionItemDto {
  @IsEnum(EscalationLevel)
  escalationLevel: EscalationLevel;

  @IsString()
  escalateTo: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AcknowledgeAlertDto {
  @IsString()
  alertId: string;

  @IsOptional()
  @IsString()
  responseAction?: string;

  @IsOptional()
  @IsString()
  responseNotes?: string;
}
