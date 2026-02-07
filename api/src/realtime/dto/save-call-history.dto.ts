import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Individual transcript entry
 */
export class TranscriptEntryDto {
  @IsString()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * DTO for saving call history from mobile app
 * POST /api/realtime/sessions
 */
export class SaveCallHistoryDto {
  @IsString()
  sessionId: string;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsNumber()
  durationMs: number;

  @IsNumber()
  userTurnCount: number;

  @IsNumber()
  assistantTurnCount: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolsUsed?: string[];

  @IsBoolean()
  userSpoke: boolean;

  @IsOptional()
  @IsString()
  summary?: string;

  // Transcript data
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptEntryDto)
  transcript?: TranscriptEntryDto[];

  @IsOptional()
  @IsString()
  transcriptText?: string; // Full transcript as searchable text

  // Optional CRM linkages
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  // Optional metadata
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
