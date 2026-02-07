import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ForecastCategory {
  COMMIT = 'commit',
  MOST_LIKELY = 'most-likely',
  BEST_CASE = 'best-case',
  KEY_DEALS = 'key-deals',
  MUST_WIN = 'must-win',
  LOW_LIKELIHOOD = 'low-likelihood',
}

export enum MEDDICStatus {
  COMPLETE = 'complete',
  PARTIAL = 'partial',
  MISSING = 'missing',
}

export enum BuyerStatus {
  IDENTIFIED = 'identified',
  ENGAGED = 'engaged',
  UNKNOWN = 'unknown',
}

export enum ChampionStatus {
  STRONG = 'strong',
  DEVELOPING = 'developing',
  NONE = 'none',
}

export class MEDDICScoreDto {
  @IsEnum(MEDDICStatus)
  metrics: MEDDICStatus;

  @IsEnum(BuyerStatus)
  economicBuyer: BuyerStatus;

  @IsEnum(MEDDICStatus)
  decisionCriteria: MEDDICStatus;

  @IsEnum(MEDDICStatus)
  decisionProcess: MEDDICStatus;

  @IsEnum(MEDDICStatus)
  identifyPain: MEDDICStatus;

  @IsEnum(ChampionStatus)
  champion: ChampionStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;
}

export class UpdateMEDDICDto {
  @IsString()
  opportunityId: string;

  @IsOptional()
  @IsEnum(MEDDICStatus)
  metrics?: MEDDICStatus;

  @IsOptional()
  @IsEnum(BuyerStatus)
  economicBuyer?: BuyerStatus;

  @IsOptional()
  @IsEnum(MEDDICStatus)
  decisionCriteria?: MEDDICStatus;

  @IsOptional()
  @IsEnum(MEDDICStatus)
  decisionProcess?: MEDDICStatus;

  @IsOptional()
  @IsEnum(MEDDICStatus)
  identifyPain?: MEDDICStatus;

  @IsOptional()
  @IsEnum(ChampionStatus)
  champion?: ChampionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PipelineFiltersDto {
  @IsOptional()
  @IsString()
  mode?: 'local' | 'salesforce';

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsEnum(ForecastCategory)
  forecastCategory?: ForecastCategory;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;

  @IsOptional()
  @IsDateString()
  closeDateFrom?: string;

  @IsOptional()
  @IsDateString()
  closeDateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class UpdateForecastCategoryDto {
  @IsString()
  opportunityId: string;

  @IsEnum(ForecastCategory)
  forecastCategory: ForecastCategory;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DealWarningDto {
  type: 'stale' | 'no-next-step' | 'close-date-passed' | 'no-activity' | 'missing-contact';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export class PipelineDealResponseDto {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate: Date | null;
  forecastCategory: ForecastCategory;
  meddic: MEDDICScoreDto;
  warnings: DealWarningDto[];
  contactCount: number;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  opportunityTeam?: {
    id: string;
    name: string;
    role: string;
  }[];
  activities: {
    date: Date;
    type: string;
    count: number;
  }[];
  lastActivityDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ForecastSummaryDto {
  category: ForecastCategory;
  label: string;
  totalAmount: number;
  dealCount: number;
  previousAmount?: number;
  previousCount?: number;
  changeAmount?: number;
  changeCount?: number;
}

export class PipelineStatsResponseDto {
  targetAttainment: number;
  pipelineCoverage: number;
  totalPipeline: number;
  averageDealSize: number;
  winRate: number;
  forecasts: ForecastSummaryDto[];
  staleDealsCount: number;
  atRiskDealsCount: number;
}
