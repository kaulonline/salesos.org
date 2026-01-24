import client from './client';
import type { Activity, CreateActivityDto, ActivityFilters } from '../types';

export const activitiesApi = {
  /**
   * Get all activities with optional filters
   */
  getAll: async (filters?: ActivityFilters): Promise<Activity[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Activity[]>(`/activities?${params.toString()}`);
    return response.data;
  },

  /**
   * Create a new activity
   */
  create: async (data: CreateActivityDto): Promise<Activity> => {
    const response = await client.post<Activity>('/activities', data);
    return response.data;
  },
};

export default activitiesApi;
