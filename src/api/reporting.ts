import client from './client';

// Types for reporting API
export interface WinRateReport {
  winRate: number;
  totalWon: number;
  totalLost: number;
  totalClosed: number;
  wonValue: number;
  lostValue: number;
  byStage?: {
    stage: string;
    won: number;
    lost: number;
    winRate: number;
  }[];
  byOwner?: {
    ownerId: string;
    ownerName: string;
    won: number;
    lost: number;
    winRate: number;
  }[];
  byMonth?: {
    month: string;
    won: number;
    lost: number;
    winRate: number;
  }[];
}

export interface ForecastData {
  periods: {
    period: string;
    forecast: number;
    actual?: number;
    pipeline: number;
  }[];
  summary: {
    totalForecast: number;
    totalPipeline: number;
    confidence: number;
  };
}

export interface PipelineReport {
  totalValue: number;
  totalDeals: number;
  byStage: {
    stage: string;
    value: number;
    count: number;
    percentage: number;
  }[];
  avgDealSize: number;
  avgDaysInPipeline: number;
}

// Generic report result matching backend ReportResult
export interface ReportResult {
  id: string;
  type: string;
  title: string;
  description: string;
  chartType: string;
  data: { name: string; data: { label: string; value: number; metadata?: Record<string, any> }[] }[];
  summary?: {
    total?: number;
    count?: number;
    average?: number;
    topItems?: { label: string; value: number }[];
  };
  generatedAt: string;
  filters?: Record<string, any>;
}

export interface RevenueReport extends ReportResult {}

export type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type GroupBy = 'stage' | 'owner' | 'month' | 'source';

// API functions
export const reportingApi = {
  // Get win rate report
  getWinRate: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
    groupBy?: GroupBy;
  }): Promise<WinRateReport> => {
    const searchParams = new URLSearchParams();
    if (params?.dateRange) searchParams.set('dateRange', params.dateRange);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.groupBy) searchParams.set('groupBy', params.groupBy);

    const response = await client.get<WinRateReport>(
      `/reports/win-rate${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    return response.data;
  },

  // Get pipeline report
  getPipeline: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
  }): Promise<PipelineReport> => {
    const searchParams = new URLSearchParams();
    if (params?.dateRange) searchParams.set('dateRange', params.dateRange);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const response = await client.get<PipelineReport>(
      `/reports/pipeline${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    return response.data;
  },

  // Get forecast data
  getForecast: async (periods = 3): Promise<ForecastData> => {
    const response = await client.get<ForecastData>(`/analytics/cpq/forecast?periods=${periods}`);
    return response.data;
  },

  // Get revenue report (server-side aggregation)
  getRevenue: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportResult> => {
    const searchParams = new URLSearchParams();
    if (params?.dateRange) searchParams.set('dateRange', params.dateRange);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const response = await client.get<ReportResult>(
      `/reports/revenue${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    return response.data;
  },

  // Get forecast report (server-side aggregation)
  getForecastReport: async (): Promise<ReportResult> => {
    const response = await client.get<ReportResult>('/reports/forecast');
    return response.data;
  },

  // Get activity report (server-side aggregation)
  getActivities: async (params?: {
    dateRange?: DateRange;
    startDate?: string;
    endDate?: string;
    groupBy?: GroupBy;
  }): Promise<ReportResult> => {
    const searchParams = new URLSearchParams();
    if (params?.dateRange) searchParams.set('dateRange', params.dateRange);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.groupBy) searchParams.set('groupBy', params.groupBy);

    const response = await client.get<ReportResult>(
      `/reports/activities${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    );
    return response.data;
  },

  // Get CPQ dashboard
  getCpqDashboard: async (): Promise<{
    totalQuotes: number;
    totalOrders: number;
    conversionRate: number;
    avgDealSize: number;
    pipelineValue: number;
  }> => {
    const response = await client.get('/analytics/cpq/dashboard');
    return response.data;
  },
};

export default reportingApi;
