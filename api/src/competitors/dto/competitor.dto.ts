import { IsString, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';
import { CompetitorTier, CompetitorStatus, ThreatLevel } from '@prisma/client';

export class CreateCompetitorDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CompetitorTier)
  @IsOptional()
  tier?: CompetitorTier;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  strengths?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  weaknesses?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  differentiators?: string[];

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  pricingModel?: string;
}

export class UpdateCompetitorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CompetitorTier)
  @IsOptional()
  tier?: CompetitorTier;

  @IsEnum(CompetitorStatus)
  @IsOptional()
  status?: CompetitorStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  strengths?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  weaknesses?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  differentiators?: string[];

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  pricingModel?: string;
}

export class CreateCompetitorProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  comparableToProductId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureGaps?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureAdvantages?: string[];

  @IsString()
  @IsOptional()
  positioning?: string;

  @IsString()
  @IsOptional()
  pricingInfo?: string;
}

export class LinkOpportunityCompetitorDto {
  @IsString()
  competitorId: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsEnum(ThreatLevel)
  @IsOptional()
  threatLevel?: ThreatLevel;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateBattlecardDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  overview?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyTalkingPoints?: string[];

  @IsArray()
  @IsOptional()
  objectionHandling?: { objection: string; response: string }[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  trapQuestions?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBattlecardDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  overview?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyTalkingPoints?: string[];

  @IsArray()
  @IsOptional()
  objectionHandling?: { objection: string; response: string }[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  trapQuestions?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
