import client from './client';
import type {
  Lead,
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  ConvertLeadResult,
  LeadStats,
  LeadScoreResult,
  QueryFilters,
} from '../types';

export interface LeadFilters extends QueryFilters {
  status?: string;
  rating?: string;
  source?: string;
  ownerId?: string;
}

export const leadsApi = {
  /**
   * Get all leads with optional filters
   */
  getAll: async (filters?: LeadFilters): Promise<Lead[]> => {
    const params = new URLSearchParams();
    if (filters) {
      // Map frontend filter names to backend filter names
      const filterMapping: Record<string, string> = {
        source: 'leadSource',
      };

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const backendKey = filterMapping[key] || key;
          params.append(backendKey, String(value));
        }
      });
    }
    const response = await client.get<Lead[]>(`/leads?${params.toString()}`);
    return response.data;
  },

  /**
   * Get lead statistics
   */
  getStats: async (): Promise<LeadStats> => {
    const response = await client.get<LeadStats>('/leads/stats');
    return response.data;
  },

  /**
   * Get a single lead by ID
   */
  getById: async (id: string): Promise<Lead> => {
    const response = await client.get<Lead>(`/leads/${id}`);
    return response.data;
  },

  /**
   * Create a new lead
   */
  create: async (data: CreateLeadDto): Promise<Lead> => {
    const response = await client.post<Lead>('/leads', data);
    return response.data;
  },

  /**
   * Update a lead
   */
  update: async (id: string, data: UpdateLeadDto): Promise<Lead> => {
    const response = await client.patch<Lead>(`/leads/${id}`, data);
    return response.data;
  },

  /**
   * Delete a lead
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/leads/${id}`);
  },

  /**
   * Score a lead using AI
   */
  score: async (id: string): Promise<LeadScoreResult> => {
    const response = await client.post<LeadScoreResult>(`/leads/${id}/score`);
    return response.data;
  },

  /**
   * Convert a lead to Account/Contact/Opportunity
   */
  convert: async (id: string, data: ConvertLeadDto): Promise<ConvertLeadResult> => {
    const response = await client.post<ConvertLeadResult>(`/leads/${id}/convert`, data);
    return response.data;
  },
};

export default leadsApi;
