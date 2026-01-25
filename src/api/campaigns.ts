import client from './client';
import type {
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStats,
  CampaignMember,
  AddCampaignMemberDto,
  QueryFilters,
} from '../types';

export interface CampaignFilters extends QueryFilters {
  type?: string;
  status?: string;
  isActive?: boolean;
  startDateAfter?: string;
  startDateBefore?: string;
  ownerId?: string;
}

export const campaignsApi = {
  /**
   * Get all campaigns with optional filters
   */
  getAll: async (filters?: CampaignFilters): Promise<Campaign[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Campaign[]>(`/campaigns?${params.toString()}`);
    return response.data;
  },

  /**
   * Get campaign statistics
   */
  getStats: async (): Promise<CampaignStats> => {
    const response = await client.get<CampaignStats>('/campaigns/stats');
    return response.data;
  },

  /**
   * Get a single campaign by ID
   */
  getById: async (id: string): Promise<Campaign> => {
    const response = await client.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Create a new campaign
   */
  create: async (data: CreateCampaignDto): Promise<Campaign> => {
    const response = await client.post<Campaign>('/campaigns', data);
    return response.data;
  },

  /**
   * Update a campaign
   */
  update: async (id: string, data: UpdateCampaignDto): Promise<Campaign> => {
    const response = await client.patch<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  /**
   * Delete a campaign
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/campaigns/${id}`);
  },

  // Campaign Members
  /**
   * Get members of a campaign
   */
  getMembers: async (campaignId: string): Promise<CampaignMember[]> => {
    const response = await client.get<CampaignMember[]>(`/campaigns/${campaignId}/members`);
    return response.data;
  },

  /**
   * Add a member to a campaign
   */
  addMember: async (campaignId: string, data: AddCampaignMemberDto): Promise<CampaignMember> => {
    const response = await client.post<CampaignMember>(`/campaigns/${campaignId}/members`, data);
    return response.data;
  },

  /**
   * Remove a member from a campaign
   */
  removeMember: async (campaignId: string, memberId: string): Promise<void> => {
    await client.delete(`/campaigns/${campaignId}/members/${memberId}`);
  },

  /**
   * Update member status
   */
  updateMemberStatus: async (
    campaignId: string,
    memberId: string,
    status: 'SENT' | 'RESPONDED' | 'CONVERTED' | 'OPTED_OUT'
  ): Promise<CampaignMember> => {
    const response = await client.patch<CampaignMember>(
      `/campaigns/${campaignId}/members/${memberId}`,
      { status }
    );
    return response.data;
  },

  /**
   * Bulk add members to a campaign
   */
  bulkAddMembers: async (
    campaignId: string,
    members: AddCampaignMemberDto[]
  ): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>(
      `/campaigns/${campaignId}/members/bulk`,
      { members }
    );
    return response.data;
  },

  // Campaign Analytics
  /**
   * Get campaign performance metrics
   */
  getPerformance: async (id: string): Promise<{
    sent: number;
    responded: number;
    converted: number;
    optedOut: number;
    responseRate: number;
    conversionRate: number;
    roi: number;
  }> => {
    const response = await client.get<{
      sent: number;
      responded: number;
      converted: number;
      optedOut: number;
      responseRate: number;
      conversionRate: number;
      roi: number;
    }>(`/campaigns/${id}/performance`);
    return response.data;
  },

  /**
   * Get opportunities attributed to campaign
   */
  getOpportunities: async (id: string): Promise<{
    id: string;
    name: string;
    amount?: number;
    stage: string;
    closeDate?: string;
  }[]> => {
    const response = await client.get(`/campaigns/${id}/opportunities`);
    return response.data;
  },

  /**
   * Get leads attributed to campaign
   */
  getLeads: async (id: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    status: string;
  }[]> => {
    const response = await client.get(`/campaigns/${id}/leads`);
    return response.data;
  },
};

export default campaignsApi;
