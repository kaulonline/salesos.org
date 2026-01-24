import client from './client';
import type {
  Meeting,
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingAnalysis,
  MeetingInsights,
  QueryFilters,
} from '../types';

export interface MeetingFilters extends QueryFilters {
  status?: string;
  type?: string;
  accountId?: string;
  opportunityId?: string;
  startDate?: string;
  endDate?: string;
}

export const meetingsApi = {
  /**
   * Get all meetings with optional filters
   */
  getAll: async (filters?: MeetingFilters): Promise<Meeting[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Meeting[]>(`/meetings?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single meeting by ID
   */
  getById: async (id: string): Promise<Meeting> => {
    const response = await client.get<Meeting>(`/meetings/${id}`);
    return response.data;
  },

  /**
   * Create a new meeting
   */
  create: async (data: CreateMeetingDto): Promise<Meeting> => {
    const response = await client.post<Meeting>('/meetings', data);
    return response.data;
  },

  /**
   * Update a meeting
   */
  update: async (id: string, data: UpdateMeetingDto): Promise<Meeting> => {
    const response = await client.patch<Meeting>(`/meetings/${id}`, data);
    return response.data;
  },

  /**
   * Delete a meeting
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/meetings/${id}`);
  },

  /**
   * Get meeting analysis (AI-generated)
   */
  getAnalysis: async (id: string): Promise<MeetingAnalysis> => {
    const response = await client.get<MeetingAnalysis>(`/meetings/${id}/analysis`);
    return response.data;
  },

  /**
   * Get meeting insights (AI-generated)
   */
  getInsights: async (id: string): Promise<MeetingInsights> => {
    const response = await client.get<MeetingInsights>(`/meetings/${id}/insights`);
    return response.data;
  },
};

export default meetingsApi;
