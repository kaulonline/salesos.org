import { useQuery, useMutation } from '@tanstack/react-query';
import { cpqAnalyticsApi } from '../api/cpqAnalytics';
import { queryKeys } from '../lib/queryKeys';
import type { CPQAnalyticsFilters } from '../types/cpqAnalytics';

export function useCPQDashboard(filters?: CPQAnalyticsFilters) {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.dashboard(filters),
    queryFn: () => cpqAnalyticsApi.getDashboardMetrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    metrics: dashboardQuery.data ?? null,
    loading: dashboardQuery.isLoading,
    error: dashboardQuery.error?.message ?? null,
    refetch: dashboardQuery.refetch,
  };
}

export function useCPQTrends(filters?: CPQAnalyticsFilters) {
  const trendsQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.trends(filters),
    queryFn: () => cpqAnalyticsApi.getTrends(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    trends: trendsQuery.data ?? [],
    loading: trendsQuery.isLoading,
    error: trendsQuery.error?.message ?? null,
    refetch: trendsQuery.refetch,
  };
}

export function useQuotePipeline() {
  const pipelineQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.quotePipeline(),
    queryFn: () => cpqAnalyticsApi.getQuotePipeline(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    pipeline: pipelineQuery.data ?? [],
    loading: pipelineQuery.isLoading,
    error: pipelineQuery.error?.message ?? null,
    refetch: pipelineQuery.refetch,
  };
}

export function useTopProducts(limit?: number, sortBy?: 'revenue' | 'quantity' | 'orders') {
  const productsQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.topProducts(limit, sortBy),
    queryFn: () => cpqAnalyticsApi.getTopProducts(limit, sortBy),
    staleTime: 5 * 60 * 1000,
  });

  return {
    products: productsQuery.data ?? [],
    loading: productsQuery.isLoading,
    error: productsQuery.error?.message ?? null,
    refetch: productsQuery.refetch,
  };
}

export function useTopAccounts(limit?: number) {
  const accountsQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.topAccounts(limit),
    queryFn: () => cpqAnalyticsApi.getTopAccounts(limit),
    staleTime: 5 * 60 * 1000,
  });

  return {
    accounts: accountsQuery.data ?? [],
    loading: accountsQuery.isLoading,
    error: accountsQuery.error?.message ?? null,
    refetch: accountsQuery.refetch,
  };
}

export function useSalesRepPerformance(filters?: CPQAnalyticsFilters) {
  const performanceQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.salesRepPerformance(filters),
    queryFn: () => cpqAnalyticsApi.getSalesRepPerformance(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    performance: performanceQuery.data ?? [],
    loading: performanceQuery.isLoading,
    error: performanceQuery.error?.message ?? null,
    refetch: performanceQuery.refetch,
  };
}

export function useCPQForecast(periods?: number) {
  const forecastQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.forecast(periods),
    queryFn: () => cpqAnalyticsApi.getForecast(periods),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    forecast: forecastQuery.data ?? [],
    loading: forecastQuery.isLoading,
    error: forecastQuery.error?.message ?? null,
    refetch: forecastQuery.refetch,
  };
}

export function useCPQSnapshots(filters?: CPQAnalyticsFilters) {
  const snapshotsQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.snapshots(filters),
    queryFn: () => cpqAnalyticsApi.getSnapshots(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    snapshots: snapshotsQuery.data ?? [],
    loading: snapshotsQuery.isLoading,
    error: snapshotsQuery.error?.message ?? null,
    refetch: snapshotsQuery.refetch,
  };
}

export function useConversionFunnel(filters?: CPQAnalyticsFilters) {
  const funnelQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.conversionFunnel(filters),
    queryFn: () => cpqAnalyticsApi.getConversionFunnel(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    funnel: funnelQuery.data?.stages ?? [],
    loading: funnelQuery.isLoading,
    error: funnelQuery.error?.message ?? null,
    refetch: funnelQuery.refetch,
  };
}

export function useWinLossAnalysis(filters?: CPQAnalyticsFilters) {
  const analysisQuery = useQuery({
    queryKey: queryKeys.cpqAnalytics.winLoss(filters),
    queryFn: () => cpqAnalyticsApi.getWinLossAnalysis(filters),
    staleTime: 5 * 60 * 1000,
  });

  return {
    analysis: analysisQuery.data ?? null,
    loading: analysisQuery.isLoading,
    error: analysisQuery.error?.message ?? null,
    refetch: analysisQuery.refetch,
  };
}

export function useExportCPQAnalytics() {
  const exportMutation = useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: 'csv' | 'xlsx' | 'pdf';
      filters?: CPQAnalyticsFilters;
    }) => {
      const blob = await cpqAnalyticsApi.exportData(format, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cpq-analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  return {
    exportData: (format: 'csv' | 'xlsx' | 'pdf', filters?: CPQAnalyticsFilters) =>
      exportMutation.mutateAsync({ format, filters }),
    isExporting: exportMutation.isPending,
    error: exportMutation.error?.message ?? null,
  };
}
