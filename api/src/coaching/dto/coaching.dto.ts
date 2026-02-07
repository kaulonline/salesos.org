import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { CoachingScenario, CoachingSessionStatus } from '@prisma/client';

export class CreateCoachingSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(CoachingScenario)
  scenario?: CoachingScenario;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;
}

export class UpdateCoachingSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(CoachingSessionStatus)
  status?: CoachingSessionStatus;
}

export class CoachingSessionResponseDto {
  id: string;
  userId: string;
  title: string | null;
  scenario: CoachingScenario;
  status: CoachingSessionStatus;
  opportunityId: string | null;
  accountId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  transcription: string | null;
  overallScore: number | null;
  feedback: CoachingFeedback | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoachingFeedback {
  // Overall assessment
  overallAssessment: string;
  strengths: string[];
  areasForImprovement: string[];

  // Detailed scores (0-100)
  scores: {
    clarity: number;
    confidence: number;
    pacing: number;
    engagement: number;
    valueProposition: number;
    objectionHandling?: number;
    closingTechnique?: number;
  };

  // Scenario-specific feedback
  scenarioFeedback: {
    category: string;
    observation: string;
    suggestion: string;
    importance: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];

  // Key moments in the recording
  keyMoments: {
    timestamp: number;
    type: 'STRENGTH' | 'IMPROVEMENT' | 'TIP';
    text: string;
    suggestion?: string;
  }[];

  // Actionable recommendations
  recommendations: {
    priority: number;
    area: string;
    action: string;
    example?: string;
  }[];

  // Example phrases or scripts
  suggestedPhrases?: {
    context: string;
    original?: string;
    improved: string;
  }[];
}

export class CoachingSessionListQueryDto {
  @IsOptional()
  @IsEnum(CoachingScenario)
  scenario?: CoachingScenario;

  @IsOptional()
  @IsEnum(CoachingSessionStatus)
  status?: CoachingSessionStatus;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}
