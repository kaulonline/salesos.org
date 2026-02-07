import { IsString, IsOptional, IsEnum, IsArray, IsObject } from 'class-validator';
import { CoachingAgendaStatus } from '@prisma/client';

export class GenerateCoachingAgendaDto {
  @IsOptional()
  @IsString()
  repId?: string;

  @IsOptional()
  @IsString()
  repEmail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];
}

export class GetCoachingAgendasDto {
  @IsOptional()
  @IsString()
  repId?: string;

  @IsOptional()
  @IsEnum(CoachingAgendaStatus)
  status?: CoachingAgendaStatus;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}

export class UpdateCoachingAgendaDto {
  @IsOptional()
  @IsEnum(CoachingAgendaStatus)
  status?: CoachingAgendaStatus;

  @IsOptional()
  @IsString()
  sessionNotes?: string;

  @IsOptional()
  @IsArray()
  followUpActions?: FollowUpAction[];

  @IsOptional()
  @IsObject()
  outcome?: Record<string, any>;
}

export interface FollowUpAction {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface AgendaSection {
  title: string;
  duration: string;
  talkingPoints: string[];
  questions: string[];
  successMetrics?: string[];
}

export interface CoachingAgendaContent {
  opening: AgendaSection;
  pipelineReview: AgendaSection;
  skillDevelopment: AgendaSection;
  actionPlanning: AgendaSection;
  supportNeeded: AgendaSection;
}

export interface PipelineSnapshot {
  totalPipeline: number;
  dealCount: number;
  atRiskDeals: AtRiskDeal[];
  stuckDeals: StuckDeal[];
  hotDeals: HotDeal[];
  byStage: StageBreakdown[];
}

export interface AtRiskDeal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  daysInStage: number;
  riskScore: number;
  riskFactors: string[];
  accountName: string;
}

export interface StuckDeal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  daysInStage: number;
  lastActivityDate: string;
}

export interface HotDeal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  momentum: number;
  nextStep?: string;
}

export interface StageBreakdown {
  stage: string;
  count: number;
  value: number;
}

export interface PerformanceSnapshot {
  winRate: number;
  avgDealSize: number;
  activityMetrics: {
    calls: number;
    emails: number;
    meetings: number;
  };
  activityVsTeam: number;
  lossPatterns: LossPattern[];
}

export interface LossPattern {
  reason: string;
  count: number;
  percentage: number;
}

export class CoachingAgendaResponse {
  id: string;
  repId: string;
  repName?: string;
  managerId: string;
  agenda: CoachingAgendaContent;
  pipelineSnapshot?: PipelineSnapshot;
  performanceSnapshot?: PerformanceSnapshot;
  status: CoachingAgendaStatus;
  scheduledFor?: Date;
  completedAt?: Date;
  sessionNotes?: string;
  followUpActions?: FollowUpAction[];
  createdAt: Date;
  updatedAt: Date;
}
