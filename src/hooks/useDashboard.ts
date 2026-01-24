import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, opportunitiesApi, leadsApi, activitiesApi, tasksApi, meetingsApi } from '../api';
import type { PipelineStats, LeadStats, Activity, SalesForecast } from '../types';

export interface DashboardData {
  pipelineStats: PipelineStats | null;
  leadStats: LeadStats | null;
  recentActivities: Activity[];
  forecast: SalesForecast | null;
  tasksToday: number;
  meetingsToday: number;
  totalDeals: number;
  totalPipeline: number;
  closedWonThisMonth: number;
  quotaAttainment: number;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    pipelineStats: null,
    leadStats: null,
    recentActivities: [],
    forecast: null,
    tasksToday: 0,
    meetingsToday: 0,
    totalDeals: 0,
    totalPipeline: 0,
    closedWonThisMonth: 0,
    quotaAttainment: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [
        pipelineStats,
        leadStats,
        activitiesResponse,
        forecast,
        tasksResponse,
        meetingsResponse,
      ] = await Promise.all([
        opportunitiesApi.getPipelineStats().catch(() => null),
        leadsApi.getStats().catch(() => null),
        activitiesApi.getAll({ limit: 10 }).catch(() => ({ data: [], total: 0 })),
        opportunitiesApi.getForecast().catch(() => null),
        tasksApi.getAll({ limit: 100 }).catch(() => ({ data: [], total: 0 })),
        meetingsApi.getAll({ limit: 100 }).catch(() => ({ data: [], total: 0 })),
      ]);

      // Calculate tasks due today
      const today = new Date().toISOString().split('T')[0];
      const tasksToday = tasksResponse.data?.filter((task: { dueDate?: string; status?: string }) =>
        task.dueDate?.startsWith(today) && task.status !== 'COMPLETED'
      ).length || 0;

      // Calculate meetings today
      const meetingsToday = meetingsResponse.data?.filter((meeting: { startTime?: string }) =>
        meeting.startTime?.startsWith(today)
      ).length || 0;

      // Calculate quota attainment (assuming quarterly quota of $500K)
      const quarterlyQuota = 500000;
      const closedWonValue = pipelineStats?.closedWonValue || 0;
      const quotaAttainment = Math.round((closedWonValue / quarterlyQuota) * 100);

      setData({
        pipelineStats,
        leadStats,
        recentActivities: activitiesResponse.data || [],
        forecast,
        tasksToday,
        meetingsToday,
        totalDeals: pipelineStats?.totalDeals || 0,
        totalPipeline: pipelineStats?.totalValue || 0,
        closedWonThisMonth: pipelineStats?.closedWonThisMonth || 0,
        quotaAttainment: Math.min(quotaAttainment, 100),
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
