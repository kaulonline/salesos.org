// DTOs for RLHF Feedback System
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsArray, IsNumber, IsBoolean } from 'class-validator';

export enum FeedbackRating {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
}

// Submit feedback for a message
export class SubmitFeedbackDto {
  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Optional detailed scores (1-5)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  accuracyScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  helpfulnessScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  clarityScore?: number;
}

// Submit a preference pair (A/B comparison)
export class SubmitPreferencePairDto {
  @IsString()
  prompt: string;

  @IsString()
  chosenId: string;

  @IsString()
  rejectedId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  preferenceStrength?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

// Create a golden example
export class CreateGoldenExampleDto {
  @IsString()
  userQuery: string;

  @IsString()
  assistantResponse: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  sourceMessageId?: string;
}

// Export format for RLHF training
export class ExportFeedbackDto {
  @IsOptional()
  @IsString()
  format?: 'jsonl' | 'csv' | 'dpo';  // dpo = Direct Preference Optimization format

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(FeedbackRating)
  rating?: FeedbackRating;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
