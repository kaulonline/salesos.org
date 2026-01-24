import client from './client';
import type { PipelineStats, LeadStats, Activity } from '../types';

export interface DashboardStats {
  pipeline: PipelineStats;
  leads: LeadStats;
  recentActivities: Activity[];
  tasksToday: number;
  tasksDueThisWeek: number;
  meetingsToday: number;
  openOpportunities: number;
  totalRevenue: number;
}

export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async (): Promise<DashboardStats> => {
    const response = await client.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  /**
   * Get recent activities for dashboard
   */
  getRecentActivities: async (limit = 10): Promise<Activity[]> => {
    const response = await client.get<Activity[]>(`/activities?limit=${limit}`);
    return response.data;
  },
};

export default dashboardApi;
