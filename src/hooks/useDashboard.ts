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
        activities,
        forecast,
        tasks,
        meetings,
      ] = await Promise.all([
        opportunitiesApi.getPipelineStats().catch(() => null),
        leadsApi.getStats().catch(() => null),
        activitiesApi.getAll({ limit: 10 }).catch(() => []),
        opportunitiesApi.getForecast().catch(() => null),
        tasksApi.getAll({ limit: 100 }).catch(() => []),
        meetingsApi.getAll({ limit: 100 }).catch(() => []),
      ]);

      // Calculate tasks due today
      const today = new Date().toISOString().split('T')[0];
      const tasksToday = (tasks || []).filter((task: { dueDate?: string; status?: string }) =>
        task.dueDate?.startsWith(today) && task.status !== 'COMPLETED'
      ).length;

      // Calculate meetings today
      const meetingsToday = (meetings || []).filter((meeting: { startTime?: string }) =>
        meeting.startTime?.startsWith(today)
      ).length;

      // Cast to any to access backend field names that differ from frontend types
      const rawPipelineStats = pipelineStats as any;
      const rawLeadStats = leadStats as any;

      // Map backend pipeline field names to frontend expected names
      const mappedPipelineStats = pipelineStats ? {
        ...pipelineStats,
        totalDeals: rawPipelineStats?.openOpportunities ?? rawPipelineStats?.totalDeals ?? 0,
        totalValue: rawPipelineStats?.totalPipelineValue ?? rawPipelineStats?.totalValue ?? 0,
        closedWonValue: rawPipelineStats?.wonValue ?? rawPipelineStats?.closedWonValue ?? 0,
        totalOpportunities: rawPipelineStats?.openOpportunities ?? rawPipelineStats?.totalOpportunities ?? 0,
        winRate: rawPipelineStats?.winRate ?? 0,
      } : null;

      // Map backend lead stats field names to frontend expected names
      const mappedLeadStats = leadStats ? {
        ...leadStats,
        total: rawLeadStats?.totalLeads ?? rawLeadStats?.total ?? 0,
        avgScore: rawLeadStats?.averageScore ?? rawLeadStats?.avgScore ?? 0,
      } : null;

      // Calculate quota attainment (assuming quarterly quota of $500K)
      const quarterlyQuota = 500000;
      const closedWonValue = mappedPipelineStats?.closedWonValue || 0;
      const quotaAttainment = Math.round((closedWonValue / quarterlyQuota) * 100);

      setData({
        pipelineStats: mappedPipelineStats as any,
        leadStats: mappedLeadStats as any,
        recentActivities: activities || [],
        forecast,
        tasksToday,
        meetingsToday,
        totalDeals: mappedPipelineStats?.totalDeals || 0,
        totalPipeline: mappedPipelineStats?.totalValue || 0,
        closedWonThisMonth: rawPipelineStats?.wonCount ?? mappedPipelineStats?.closedWonThisMonth ?? 0,
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
