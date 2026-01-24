import client from './client';
import type {
  Opportunity,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  AdvanceStageDto,
  CloseWonDto,
  CloseLostDto,
  OpportunityAnalysis,
  PipelineStats,
  SalesForecast,
  AddContactToOpportunityDto,
  QueryFilters,
} from '../types';

export interface OpportunityFilters extends QueryFilters {
  stage?: string;
  accountId?: string;
  isClosed?: boolean;
  minAmount?: number;
  source?: 'salesforce' | 'local';
}

export const opportunitiesApi = {
  /**
   * Get all opportunities with optional filters
   */
  getAll: async (filters?: OpportunityFilters): Promise<Opportunity[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Opportunity[]>(`/opportunities?${params.toString()}`);
    return response.data;
  },

  /**
   * Get pipeline statistics
   */
  getPipelineStats: async (): Promise<PipelineStats> => {
    const response = await client.get<PipelineStats>('/opportunities/pipeline/stats');
    return response.data;
  },

  /**
   * Get sales forecast
   */
  getForecast: async (): Promise<SalesForecast> => {
    const response = await client.get<SalesForecast>('/opportunities/forecast');
    return response.data;
  },

  /**
   * Get a single opportunity by ID
   */
  getById: async (id: string): Promise<Opportunity> => {
    const response = await client.get<Opportunity>(`/opportunities/${id}`);
    return response.data;
  },

  /**
   * Create a new opportunity
   */
  create: async (data: CreateOpportunityDto): Promise<Opportunity> => {
    const response = await client.post<Opportunity>('/opportunities', data);
    return response.data;
  },

  /**
   * Update an opportunity
   */
  update: async (id: string, data: UpdateOpportunityDto): Promise<Opportunity> => {
    const response = await client.patch<Opportunity>(`/opportunities/${id}`, data);
    return response.data;
  },

  /**
   * Advance opportunity to next stage
   */
  advanceStage: async (id: string, data?: AdvanceStageDto): Promise<Opportunity> => {
    const response = await client.post<Opportunity>(`/opportunities/${id}/advance`, data || {});
    return response.data;
  },

  /**
   * Mark opportunity as closed won
   */
  closeWon: async (id: string, data?: CloseWonDto): Promise<Opportunity> => {
    const response = await client.post<Opportunity>(`/opportunities/${id}/close-won`, data || {});
    return response.data;
  },

  /**
   * Mark opportunity as closed lost
   */
  closeLost: async (id: string, data: CloseLostDto): Promise<Opportunity> => {
    const response = await client.post<Opportunity>(`/opportunities/${id}/close-lost`, data);
    return response.data;
  },

  /**
   * Analyze opportunity using AI
   */
  analyze: async (id: string): Promise<OpportunityAnalysis> => {
    const response = await client.post<OpportunityAnalysis>(`/opportunities/${id}/analyze`);
    return response.data;
  },

  /**
   * Add contact to opportunity
   */
  addContact: async (id: string, data: AddContactToOpportunityDto): Promise<void> => {
    await client.post(`/opportunities/${id}/contacts`, data);
  },
};

export default opportunitiesApi;
