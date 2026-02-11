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

// Transform generic ReportResult from backend into domain-specific shapes
function transformPipelineResponse(result: any): ReportResult & { data: PipelineReport } {
  const series = result.data?.[0]?.data || [];
  const summary = result.summary || {};

  return {
    ...result,
    data: {
      byStage: series.map((d: any) => ({
        stage: d.label,
        amount: d.value,
        count: d.metadata?.count || 0,
        percentage: d.metadata?.percentage || 0,
      })),
      totalValue: summary.total || 0,
      totalCount: summary.count || 0,
      avgDealSize: summary.average || 0,
      expectedRevenue: series.reduce((sum: number, d: any) => sum + (d.metadata?.expectedRevenue || 0), 0),
    },
  };
}

function transformWinRateResponse(result: any): ReportResult & { data: WinRateReport } {
  const ownerSeries = result.data?.[1]?.data || [];
  const periodSeries = result.data?.[2]?.data || [];
  const summary = result.summary || {};

  return {
    ...result,
    data: {
      overall: summary.average || 0,
      byPeriod: periodSeries.map((d: any) => ({
        period: d.label,
        winRate: d.value,
        won: d.metadata?.won || 0,
        lost: d.metadata?.lost || 0,
      })),
      byOwner: ownerSeries.map((d: any) => ({
        name: d.label,
        winRate: d.value,
        won: d.metadata?.won || 0,
        lost: d.metadata?.lost || 0,
      })),
      avgCycleTime: summary.metadata?.avgCycleTime || 0,
    },
  };
}

function transformActivityResponse(result: any): ReportResult & { data: ActivityReport } {
  const typeSeries = result.data?.[0]?.data || [];
  const ownerSeries = result.data?.[1]?.data || [];
  const daySeries = result.data?.[2]?.data || [];
  const summary = result.summary || {};

  return {
    ...result,
    data: {
      byType: typeSeries.map((d: any) => ({
        type: (d.label || '').toUpperCase().replace(/ /g, '_'),
        count: d.value,
      })),
      byOwner: ownerSeries.map((d: any) => ({
        name: d.label,
        calls: 0,
        emails: 0,
        meetings: 0,
        total: d.value,
      })),
      byDay: daySeries.map((d: any) => ({
        date: d.label,
        count: d.value,
      })),
      totalActivities: summary.total || 0,
    },
  };
}

function transformRevenueResponse(result: any): ReportResult & { data: RevenueReport } {
  const revenueSeries = result.data?.[0]?.data || [];
  const ownerSeries = result.data?.[1]?.data || [];
  const monthSeries = result.data?.[2]?.data || [];
  const summary = result.summary || {};

  const closedWonPoint = revenueSeries.find((d: any) => d.label === 'Closed Won');
  const pipelinePoint = revenueSeries.find((d: any) => d.label === 'Pipeline');
  const expectedPoint = revenueSeries.find((d: any) => d.label === 'Expected');

  return {
    ...result,
    data: {
      closedWon: closedWonPoint?.value || 0,
      closedWonCount: summary.count || 0,
      pipeline: pipelinePoint?.value || 0,
      forecast: expectedPoint?.value || 0,
      byMonth: monthSeries.map((d: any) => ({
        month: d.label,
        actual: d.value,
        forecast: d.metadata?.forecast || 0,
      })),
      byOwner: ownerSeries.map((d: any) => ({
        name: d.label,
        closed: d.value,
        pipeline: d.metadata?.pipeline || 0,
      })),
      growthRate: summary.percentChange || 0,
    },
  };
}

function transformLeadConversionResponse(result: any): ReportResult & { data: LeadConversionReport } {
  const sourceSeries = result.data?.[1]?.data || [];
  const ownerSeries = result.data?.[2]?.data || [];
  const summary = result.summary || {};

  return {
    ...result,
    data: {
      conversionRate: summary.average || 0,
      bySource: sourceSeries.map((d: any) => ({
        source: d.label,
        total: d.metadata?.total || 0,
        converted: d.metadata?.converted || 0,
        rate: d.value,
      })),
      byOwner: ownerSeries.map((d: any) => ({
        name: d.label,
        total: d.metadata?.total || 0,
        converted: d.metadata?.converted || 0,
        rate: d.value,
      })),
      avgTimeToConvert: summary.metadata?.avgTimeToConvert || 0,
    },
  };
}

function transformForecastResponse(result: any): ReportResult & { data: ForecastReport } {
  const forecastSeries = result.data?.[0]?.data || [];
  const stageSeries = result.data?.[1]?.data || [];
  const monthSeries = result.data?.[2]?.data || [];
  const ownerSeries = result.data?.[3]?.data || [];
  const summary = result.summary || {};

  const closedPoint = forecastSeries.find((d: any) => d.label === 'Closed');
  const weightedPoint = forecastSeries.find((d: any) => d.label === 'Weighted Pipeline');
  const totalPipeline = stageSeries.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

  return {
    ...result,
    data: {
      committed: weightedPoint?.value || 0,
      bestCase: totalPipeline,
      pipeline: totalPipeline,
      closed: closedPoint?.value || 0,
      quota: 0,
      attainment: summary.metadata?.attainment || 0,
      byMonth: monthSeries.map((d: any) => ({
        month: d.label,
        committed: d.metadata?.committed || 0,
        bestCase: d.metadata?.bestCase || 0,
        closed: d.value,
      })),
      byOwner: ownerSeries.map((d: any) => ({
        name: d.label,
        committed: d.metadata?.committed || 0,
        bestCase: d.metadata?.bestCase || 0,
        closed: d.value,
        quota: d.metadata?.quota || 0,
      })),
    },
  };
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
    return transformPipelineResponse(response.data);
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
    return transformWinRateResponse(response.data);
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
    return transformActivityResponse(response.data);
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
    return transformRevenueResponse(response.data);
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
    return transformLeadConversionResponse(response.data);
  },

  /**
   * Get sales forecast
   */
  getForecastReport: async (): Promise<ReportResult & { data: ForecastReport }> => {
    const response = await apiClient.get('/reports/forecast');
    return transformForecastResponse(response.data);
  },
};

export default reportsApi;
