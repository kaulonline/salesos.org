import { useQuery } from '@tanstack/react-query';
import { reportingApi, WinRateReport, ForecastData, PipelineReport, ReportResult, DateRange, GroupBy } from '../api/reporting';

// Win Rate Report
export function useWinRateReport(params?: {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
  groupBy?: GroupBy;
}) {
  return useQuery<WinRateReport>({
    queryKey: ['reports', 'win-rate', params],
    queryFn: () => reportingApi.getWinRate(params),
  });
}

// Pipeline Report
export function usePipelineReport(params?: {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<PipelineReport>({
    queryKey: ['reports', 'pipeline', params],
    queryFn: () => reportingApi.getPipeline(params),
  });
}

// Forecast Data
export function useForecastData(periods = 3) {
  return useQuery<ForecastData>({
    queryKey: ['analytics', 'forecast', periods],
    queryFn: () => reportingApi.getForecast(periods),
  });
}

// Revenue Report (server-side aggregation)
export function useRevenueReport(params?: {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<ReportResult>({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => reportingApi.getRevenue(params),
  });
}

// Forecast Summary (server-side aggregation)
export function useForecastSummary() {
  return useQuery<ReportResult>({
    queryKey: ['reports', 'forecast'],
    queryFn: () => reportingApi.getForecastReport(),
  });
}

// Activity Report (server-side aggregation)
export function useActivityReport(params?: {
  dateRange?: DateRange;
  startDate?: string;
  endDate?: string;
  groupBy?: GroupBy;
}) {
  return useQuery<ReportResult>({
    queryKey: ['reports', 'activities', params],
    queryFn: () => reportingApi.getActivities(params),
  });
}

// CPQ Dashboard
export function useCpqDashboard() {
  return useQuery({
    queryKey: ['analytics', 'cpq', 'dashboard'],
    queryFn: () => reportingApi.getCpqDashboard(),
  });
}
