import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsObject, Min, Max } from 'class-validator';
import { SignalType, SignalSource, SignalStatus, SignalPriority } from '@prisma/client';

export class GetSignalsDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(SignalStatus)
  status?: SignalStatus;

  @IsOptional()
  @IsEnum(SignalPriority)
  priority?: SignalPriority;

  @IsOptional()
  @IsArray()
  @IsEnum(SignalType, { each: true })
  signalTypes?: SignalType[];

  @IsOptional()
  @IsString()
  timeframe?: '24h' | '7d' | '30d' | '90d';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class CreateSignalDto {
  @IsString()
  accountId: string;

  @IsEnum(SignalType)
  type: SignalType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsEnum(SignalSource)
  source: SignalSource;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @IsOptional()
  @IsEnum(SignalPriority)
  priority?: SignalPriority;
}

export class AcknowledgeSignalDto {
  @IsEnum(['acknowledge', 'action', 'dismiss'] as const)
  action: 'acknowledge' | 'action' | 'dismiss';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SignalResponse {
  id: string;
  accountId: string;
  accountName?: string;
  type: SignalType;
  title: string;
  description?: string;
  confidence: number;
  source: SignalSource;
  sourceId?: string;
  data?: Record<string, any>;
  recommendedAction?: string;
  status: SignalStatus;
  priority: SignalPriority;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  actionedAt?: Date;
  actionedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  dismissReason?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SignalRecommendationResponse {
  id: string;
  signalId: string;
  accountId: string;
  action: string;
  rationale: string;
  priority: string;
  confidence: number;
  suggestedAssignee?: string;
  playbookId?: string;
  suggestedContent?: {
    emailSubject?: string;
    emailBody?: string;
    talkingPoints?: string[];
  };
  status: string;
  createdAt: Date;
}

export class ExecuteRecommendationDto {
  @IsOptional()
  @IsObject()
  modifications?: Record<string, any>;
}

export class SignalsSummary {
  pending: number;
  critical: number;
  high: number;
  actioned: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}
