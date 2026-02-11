import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsDateString, IsNumber, IsBoolean } from 'class-validator';

export enum ReportType {
  PIPELINE = 'PIPELINE',
  WIN_RATE = 'WIN_RATE',
  ACTIVITY = 'ACTIVITY',
  REVENUE = 'REVENUE',
  LEAD_CONVERSION = 'LEAD_CONVERSION',
  FORECAST = 'FORECAST',
  CUSTOM = 'CUSTOM',
}

export enum ChartType {
  BAR = 'BAR',
  LINE = 'LINE',
  PIE = 'PIE',
  FUNNEL = 'FUNNEL',
  TABLE = 'TABLE',
  KPI = 'KPI',
}

export enum DateRange {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  LAST_QUARTER = 'LAST_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  LAST_YEAR = 'LAST_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum GroupBy {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  OWNER = 'OWNER',
  STAGE = 'STAGE',
  SOURCE = 'SOURCE',
  INDUSTRY = 'INDUSTRY',
  TYPE = 'TYPE',
}

export class ReportFilterDto {
  @IsOptional()
  @IsEnum(DateRange)
  dateRange?: DateRange;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ownerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;

  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy;

  @IsOptional()
  @IsObject()
  filters?: ReportFilterDto;
}

export interface ReportDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ReportSeries {
  name: string;
  data: ReportDataPoint[];
  color?: string;
}

export interface ReportResult {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  chartType: ChartType;
  data: ReportSeries[];
  summary?: ReportSummary;
  generatedAt: Date;
  filters: ReportFilterDto;
}

export interface ReportSummary {
  total?: number;
  average?: number;
  count?: number;
  percentChange?: number;
  topItems?: { label: string; value: number }[];
  metadata?: Record<string, any>;
}

export interface PipelineReport {
  byStage: { stage: string; amount: number; count: number; percentage: number }[];
  totalValue: number;
  totalCount: number;
  avgDealSize: number;
  expectedRevenue: number;
}

export interface WinRateReport {
  overall: number;
  byPeriod: { period: string; winRate: number; won: number; lost: number }[];
  byOwner: { name: string; winRate: number; won: number; lost: number }[];
  avgCycleTime: number;
}

export interface ActivityReport {
  byType: { type: string; count: number }[];
  byOwner: { name: string; calls: number; emails: number; meetings: number; total: number }[];
  byDay: { date: string; count: number }[];
  totalActivities: number;
}

export interface RevenueReport {
  closedWon: number;
  closedWonCount: number;
  pipeline: number;
  forecast: number;
  byMonth: { month: string; actual: number; forecast: number }[];
  byOwner: { name: string; closed: number; pipeline: number }[];
  growthRate: number;
}

export interface LeadConversionReport {
  conversionRate: number;
  bySource: { source: string; total: number; converted: number; rate: number }[];
  byOwner: { name: string; total: number; converted: number; rate: number }[];
  avgTimeToConvert: number;
}
