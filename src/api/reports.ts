import apiClient from './client';

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

export interface ReportFilter {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
  ownerIds?: string[];
  stages?: string[];
  sources?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface GenerateReportRequest {
  type: ReportType;
  chartType?: ChartType;
  groupBy?: GroupBy;
  filters?: ReportFilter;
}

export interface ReportDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ReportSeries {
  name: string;
  data: ReportDataPoint[];
  color?: string;
}

export interface ReportSummary {
  total?: number;
  average?: number;
  count?: number;
  percentChange?: number;
  topItems?: { label: string; value: number }[];
}

export interface ReportResult {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  chartType: ChartType;
  data: ReportSeries[];
  summary?: ReportSummary;
  generatedAt: string;
  filters: ReportFilter;
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

export interface ForecastReport {
  committed: number;
  bestCase: number;
  pipeline: number;
  closed: number;
  quota: number;
  attainment: number;
  byMonth: { month: string; committed: number; bestCase: number; closed: number }[];
  byOwner: { name: string; committed: number; bestCase: number; closed: number; quota: number }[];
}

export interface ReportTypeInfo {
  type: ReportType;
  title: string;
  description: string;
  chartTypes: ChartType[];
  supportedFilters: string[];
  supportedGroupBy: GroupBy[];
}

export const reportsApi = {
  /**
   * Get available report types
   */
  getReportTypes: async (): Promise<ReportTypeInfo[]> => {
    const response = await apiClient.get<ReportTypeInfo[]>('/reports/types');
    return response.data;
  },

  /**
   * Generate a report
   */
  generateReport: async (request: GenerateReportRequest): Promise<ReportResult> => {
    const response = await apiClient.post<ReportResult>('/reports/generate', request);
    return response.data;
  },

  /**
   * Get pipeline report
   */
  getPipelineReport: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportResult & { data: PipelineReport }> => {
    const response = await apiClient.get('/reports/pipeline', { params });
    return response.data;
  },

  /**
   * Get win rate report
   */
  getWinRateReport: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
    groupBy?: GroupBy;
  }): Promise<ReportResult & { data: WinRateReport }> => {
    const response = await apiClient.get('/reports/win-rate', { params });
    return response.data;
  },

  /**
   * Get activity report
   */
  getActivityReport: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
    groupBy?: GroupBy;
  }): Promise<ReportResult & { data: ActivityReport }> => {
    const response = await apiClient.get('/reports/activities', { params });
    return response.data;
  },

  /**
   * Get revenue report
   */
  getRevenueReport: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportResult & { data: RevenueReport }> => {
    const response = await apiClient.get('/reports/revenue', { params });
    return response.data;
  },

  /**
   * Get lead conversion report
   */
  getLeadConversionReport: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportResult & { data: LeadConversionReport }> => {
    const response = await apiClient.get('/reports/lead-conversion', { params });
    return response.data;
  },

  /**
   * Get sales forecast
   */
  getForecastReport: async (): Promise<ReportResult & { data: ForecastReport }> => {
    const response = await apiClient.get('/reports/forecast');
    return response.data;
  },
};

export default reportsApi;
