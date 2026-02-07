import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum CallPlatform {
  ZOOM = 'zoom',
  TEAMS = 'teams',
  GOOGLE_MEET = 'google_meet',
  WEBEX = 'webex',
  OTHER = 'other',
}

export enum CallSentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

export enum MentionedBy {
  ANY = 'any',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export class CallSearchFiltersDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phrases?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackers?: string[];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(CallPlatform)
  platform?: CallPlatform;

  @IsOptional()
  @IsEnum(MentionedBy)
  mentionedBy?: MentionedBy;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minDuration?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxDuration?: number;

  @IsOptional()
  @IsEnum(CallSentiment)
  sentiment?: CallSentiment;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class CallParticipantDto {
  id: string;
  name: string;
  email?: string;
  role: 'internal' | 'external';
  isHost?: boolean;
  speakingTime?: number;
  speakingPercentage?: number;
}

export class CallMentionDto {
  text: string;
  timestamp: number;
  speaker: string;
  context: string;
}

export class CallTrackerMatchDto {
  id: string;
  name: string;
  category: string;
  mentionCount: number;
  mentions: CallMentionDto[];
}

export class CallSearchResultDto {
  id: string;
  title: string;
  date: Date;
  duration: number;
  participants: CallParticipantDto[];
  accountId?: string;
  accountName?: string;
  opportunityId?: string;
  opportunityName?: string;
  opportunityAmount?: number;
  opportunityStage?: string;
  platform: CallPlatform;
  matchedPhrases: CallMentionDto[];
  matchedTrackers: CallTrackerMatchDto[];
  sentiment: CallSentiment;
  engagementScore: number;
  keyTopics: string[];
  actionItems: string[];
  buyingSignals: string[];
  objections: string[];
  transcriptPreview?: string;
}

export class CallAnalyticsDto {
  totalCalls: number;
  matchingCalls: number;
  matchPercentage: number;
  callsByWeek: {
    week: string;
    count: number;
  }[];
  callsByDay: {
    date: string;
    count: number;
  }[];
  topTrackers: {
    name: string;
    count: number;
  }[];
  averageDuration: number;
  averageSentiment: number;
  topSpeakers: {
    name: string;
    callCount: number;
    avgSpeakingTime: number;
  }[];
}

export class SavedSearchDto {
  @IsString()
  name: string;

  @Type(() => CallSearchFiltersDto)
  filters: CallSearchFiltersDto;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class TrackerDefinitionDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phrases?: string[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateStreamDto {
  @IsString()
  name: string;

  @Type(() => CallSearchFiltersDto)
  filters: CallSearchFiltersDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnNew?: boolean;
}
