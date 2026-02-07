import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SnowflakeQueryDto {
  @ApiProperty({ description: 'SQL query to execute' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsArray()
  params?: any[];

  @ApiPropertyOptional({ description: 'Maximum rows to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class GetUsageMetricsDto {
  @ApiProperty({ description: 'Account ID to get metrics for' })
  @IsString()
  accountId: string;

  @ApiPropertyOptional({ description: 'Timeframe: 7d, 30d, 90d', default: '30d' })
  @IsOptional()
  @IsString()
  timeframe?: '7d' | '30d' | '90d';
}

export class GetStrategicAccountDataDto {
  @ApiProperty({ description: 'Account IDs to get data for' })
  @IsArray()
  @IsString({ each: true })
  accountIds: string[];
}

export class GetPipelineDataDto {
  @ApiPropertyOptional({ description: 'Filter by region: NA, EMEA, APAC, LATAM' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Timeframe: 30d, 90d, 365d', default: '90d' })
  @IsOptional()
  @IsString()
  timeframe?: '30d' | '90d' | '365d';
}

export interface SnowflakeConfig {
  account: string;
  username: string;
  password?: string;
  privateKey?: string;
  database: string;
  schema: string;
  warehouse: string;
  role?: string;
}

export interface UsageMetric {
  accountId: string;
  date: Date;
  activeUsers: number;
  apiCalls: number;
  dataVolumeGb: number;
  featureUsage: Record<string, number>;
}

export interface StrategicAccountData {
  accountId: string;
  externalId: string;
  mrr: number;
  arr: number;
  healthScore: number;
  nps?: number;
  lastActivityDate: Date;
  riskFactors: string[];
  expansionOpportunities: string[];
}

export interface PipelineData {
  totalValue: number;
  dealCount: number;
  avgDealSize: number;
  byStage: Array<{
    stage: string;
    value: number;
    count: number;
  }>;
  byRegion?: Array<{
    region: string;
    value: number;
    count: number;
  }>;
  forecast: {
    commit: number;
    best: number;
    pipeline: number;
  };
}
