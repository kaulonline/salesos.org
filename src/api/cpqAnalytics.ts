import client from './client';
import type {
  CPQDashboardMetrics,
  CPQTrendData,
  CPQAnalyticsFilters,
  CPQAnalyticsSnapshot,
  QuotePipelineData,
  SalesRepPerformance,
  CPQForecast,
  TopProduct,
  AccountRevenue,
} from '../types/cpqAnalytics';

export const cpqAnalyticsApi = {
  /**
   * Get CPQ dashboard metrics
   */
  getDashboardMetrics: async (filters?: CPQAnalyticsFilters): Promise<CPQDashboardMetrics> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<CPQDashboardMetrics>(`/analytics/cpq/dashboard?${params.toString()}`);
    return response.data;
  },

  /**
   * Get CPQ trend data over time
   */
  getTrends: async (filters?: CPQAnalyticsFilters): Promise<CPQTrendData[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<CPQTrendData[]>(`/analytics/cpq/trends?${params.toString()}`);
    return response.data;
  },

  /**
   * Get quote pipeline data
   */
  getQuotePipeline: async (): Promise<QuotePipelineData[]> => {
    const response = await client.get<QuotePipelineData[]>('/analytics/cpq/quote-pipeline');
    return response.data;
  },

  /**
   * Get top performing products
   */
  getTopProducts: async (
    limit?: number,
    sortBy?: 'revenue' | 'quantity' | 'orders'
  ): Promise<TopProduct[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (sortBy) params.append('sortBy', sortBy);
    const response = await client.get<TopProduct[]>(`/analytics/cpq/top-products?${params.toString()}`);
    return response.data;
  },

  /**
   * Get top accounts by revenue
   */
  getTopAccounts: async (limit?: number): Promise<AccountRevenue[]> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    const response = await client.get<AccountRevenue[]>(`/analytics/cpq/top-accounts?${params.toString()}`);
    return response.data;
  },

  /**
   * Get sales rep performance
   */
  getSalesRepPerformance: async (filters?: CPQAnalyticsFilters): Promise<SalesRepPerformance[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<SalesRepPerformance[]>(
      `/analytics/cpq/sales-rep-performance?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get revenue forecast
   */
  getForecast: async (periods?: number): Promise<CPQForecast[]> => {
    const params = new URLSearchParams();
    if (periods) params.append('periods', String(periods));
    const response = await client.get<CPQForecast[]>(`/analytics/cpq/forecast?${params.toString()}`);
    return response.data;
  },

  /**
   * Get historical snapshots
   */
  getSnapshots: async (filters?: CPQAnalyticsFilters): Promise<CPQAnalyticsSnapshot[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<CPQAnalyticsSnapshot[]>(`/analytics/cpq/snapshots?${params.toString()}`);
    return response.data;
  },

  /**
   * Create a snapshot (typically called by a scheduled job)
   */
  createSnapshot: async (): Promise<CPQAnalyticsSnapshot> => {
    const response = await client.post<CPQAnalyticsSnapshot>('/analytics/cpq/snapshots');
    return response.data;
  },

  /**
   * Export CPQ analytics data
   */
  exportData: async (
    format: 'csv' | 'xlsx' | 'pdf',
    filters?: CPQAnalyticsFilters
  ): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Blob>(`/analytics/cpq/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get conversion funnel data
   */
  getConversionFunnel: async (filters?: CPQAnalyticsFilters): Promise<{
    stages: Array<{
      stage: string;
      count: number;
      value: number;
      conversionRate: number;
    }>;
  }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<{
      stages: Array<{
        stage: string;
        count: number;
        value: number;
        conversionRate: number;
      }>;
    }>(`/analytics/cpq/conversion-funnel?${params.toString()}`);
    return response.data;
  },

  /**
   * Get win/loss analysis
   */
  getWinLossAnalysis: async (filters?: CPQAnalyticsFilters): Promise<{
    won: { count: number; value: number; avgCycleTime: number };
    lost: { count: number; value: number; reasons: Array<{ reason: string; count: number }> };
    pending: { count: number; value: number };
  }> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<{
      won: { count: number; value: number; avgCycleTime: number };
      lost: { count: number; value: number; reasons: Array<{ reason: string; count: number }> };
      pending: { count: number; value: number };
    }>(`/analytics/cpq/win-loss?${params.toString()}`);
    return response.data;
  },
};

export default cpqAnalyticsApi;
