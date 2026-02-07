/**
 * Meeting Summary DTOs
 *
 * Data Transfer Objects for the Post-Meeting Auto-Summary feature.
 * Phase 2 - Vertiv O2O Journey
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== REQUEST DTOs ====================

export class GenerateSummaryDto {
  @IsOptional()
  @IsBoolean()
  includeActionItems?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApproveActions?: boolean;

  @IsOptional()
  @IsString()
  customPrompt?: string;

  @IsOptional()
  @IsEnum(['sales', 'coaching', 'internal', 'customer'])
  meetingType?: 'sales' | 'coaching' | 'internal' | 'customer';
}

export class ActionItemModificationDto {
  @IsString()
  actionId: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class ApproveActionsDto {
  @IsArray()
  @IsString({ each: true })
  approvedActionIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rejectedActionIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionItemModificationDto)
  modifications?: ActionItemModificationDto[];

  @IsOptional()
  @IsBoolean()
  createTasks?: boolean;

  @IsOptional()
  @IsBoolean()
  createCoachingActionItems?: boolean;
}

// ==================== RESPONSE DTOs ====================

export class KeyDiscussionPointDto {
  topic: string;
  summary: string;
  timestamp?: string;
  speakers?: string[];
  importance: 'high' | 'medium' | 'low';
}

export class DecisionDto {
  description: string;
  madeBy?: string;
  timestamp?: string;
  context?: string;
}

export class ExtractedActionItemDto {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  ownerEmail?: string;
  dueDate?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category?: string;
  sourceQuote?: string;
  timestamp?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'created';
  createdTaskId?: string;
  createdCoachingActionItemId?: string;
}

export class ParticipantEngagementDto {
  name: string;
  speakingTimePercent: number;
  questionsAsked: number;
  keyContributions: string[];
}

export class MeetingSummaryResponseDto {
  id: string;
  meetingSessionId: string;

  // Core Summary
  executiveSummary: string;
  keyDiscussionPoints: KeyDiscussionPointDto[];
  decisions: DecisionDto[];

  // Action Items
  actionItems: ExtractedActionItemDto[];
  actionItemsApproved: boolean;

  // Follow-up
  followUpTopics: string[];
  nextMeetingSuggestions: string[];

  // Metadata
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  participantEngagement: ParticipantEngagementDto[];
  meetingEffectiveness: number;

  // Processing info
  generatedAt: string;
  modelUsed: string;
  processingTimeMs: number;
}

export class ApproveActionsResponseDto {
  tasksCreated: number;
  coachingItemsCreated: number;
  taskIds: string[];
  coachingItemIds: string[];
}
