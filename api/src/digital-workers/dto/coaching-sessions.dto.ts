import { IsString, IsOptional } from 'class-validator';

export class AnalyzePlaybookDto {
  @IsOptional()
  @IsString()
  playbookId?: string;
}

export class CompareSessionsDto {
  @IsString()
  sessionId1: string;

  @IsString()
  sessionId2: string;
}

export interface StepAnalysisResponse {
  stepId: string;
  stepName: string;
  executed: boolean;
  quality: number;
  timestamp?: string;
  feedback: string;
  keyPhrases: string[];
}

export interface PlaybookAlignmentResponse {
  sessionId: string;
  playbookId: string;
  playbookName: string;
  overallScore: number;
  stepAnalysis: StepAnalysisResponse[];
  strengths: string[];
  improvements: string[];
  coachingRecommendations: string[];
  analyzedAt: Date;
}

export interface KeyMomentResponse {
  id: string;
  timestamp: string;
  type: 'positive' | 'opportunity' | 'critical';
  title: string;
  description: string;
  transcript?: string;
}

export interface SessionComparisonResponse {
  session1Id: string;
  session2Id: string;
  session1Score: number;
  session2Score: number;
  improvement: number;
  areasImproved: string[];
  areasDeclined: string[];
  areasToFocus: string[];
  insights: string;
}
