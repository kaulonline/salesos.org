import client from './client';
import type {
  Partner,
  PartnerUser,
  PartnerAccount,
  DealRegistration,
  CreatePartnerDto,
  UpdatePartnerDto,
  AddPartnerUserDto,
  AssignAccountDto,
  CreateDealRegistrationDto,
  UpdateDealRegistrationDto,
  PartnerStats,
  DealRegistrationStats,
  PortalDashboard,
  PartnerStatus,
  PartnerTier,
  PartnerType,
  DealRegistrationStatus,
} from '../types/partner';

export interface PartnerFilters {
  status?: PartnerStatus;
  tier?: PartnerTier;
  type?: PartnerType;
  search?: string;
}

export interface DealRegistrationFilters {
  status?: DealRegistrationStatus;
  partnerId?: string;
}

export const partnersApi = {
  // ============================================
  // Partners CRUD (Admin)
  // ============================================

  /**
   * Get all partners
   */
  getAll: async (filters?: PartnerFilters): Promise<Partner[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Partner[]>(`/partners?${params.toString()}`);
    return response.data;
  },

  /**
   * Get partner statistics
   */
  getStats: async (): Promise<PartnerStats> => {
    const response = await client.get<PartnerStats>('/partners/stats');
    return response.data;
  },

  /**
   * Get a single partner by ID
   */
  getById: async (id: string): Promise<Partner> => {
    const response = await client.get<Partner>(`/partners/${id}`);
    return response.data;
  },

  /**
   * Create a new partner
   */
  create: async (data: CreatePartnerDto): Promise<Partner> => {
    const response = await client.post<Partner>('/partners', data);
    return response.data;
  },

  /**
   * Update a partner
   */
  update: async (id: string, data: UpdatePartnerDto): Promise<Partner> => {
    const response = await client.patch<Partner>(`/partners/${id}`, data);
    return response.data;
  },

  /**
   * Delete a partner
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/partners/${id}`);
  },

  // ============================================
  // Partner Users
  // ============================================

  /**
   * Get partner users
   */
  getUsers: async (partnerId: string): Promise<PartnerUser[]> => {
    const response = await client.get<PartnerUser[]>(`/partners/${partnerId}/users`);
    return response.data;
  },

  /**
   * Add a user to a partner
   */
  addUser: async (partnerId: string, data: AddPartnerUserDto): Promise<PartnerUser> => {
    const response = await client.post<PartnerUser>(`/partners/${partnerId}/users`, data);
    return response.data;
  },

  /**
   * Update a partner user
   */
  updateUser: async (
    partnerId: string,
    partnerUserId: string,
    data: Partial<AddPartnerUserDto>
  ): Promise<PartnerUser> => {
    const response = await client.patch<PartnerUser>(
      `/partners/${partnerId}/users/${partnerUserId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove a user from a partner
   */
  removeUser: async (partnerId: string, partnerUserId: string): Promise<void> => {
    await client.delete(`/partners/${partnerId}/users/${partnerUserId}`);
  },

  // ============================================
  // Partner Accounts
  // ============================================

  /**
   * Get partner accounts
   */
  getAccounts: async (partnerId: string): Promise<PartnerAccount[]> => {
    const response = await client.get<PartnerAccount[]>(`/partners/${partnerId}/accounts`);
    return response.data;
  },

  /**
   * Assign an account to a partner
   */
  assignAccount: async (partnerId: string, data: AssignAccountDto): Promise<PartnerAccount> => {
    const response = await client.post<PartnerAccount>(
      `/partners/${partnerId}/accounts`,
      data
    );
    return response.data;
  },

  /**
   * Unassign an account from a partner
   */
  unassignAccount: async (partnerId: string, accountId: string): Promise<void> => {
    await client.delete(`/partners/${partnerId}/accounts/${accountId}`);
  },

  // ============================================
  // Deal Registrations (Admin)
  // ============================================

  /**
   * Get all deal registrations
   */
  getAllRegistrations: async (filters?: DealRegistrationFilters): Promise<DealRegistration[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<DealRegistration[]>(
      `/partners/admin/deal-registrations?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get deal registration statistics
   */
  getRegistrationStats: async (): Promise<DealRegistrationStats> => {
    const response = await client.get<DealRegistrationStats>(
      '/partners/admin/deal-registrations/stats'
    );
    return response.data;
  },

  /**
   * Get registrations for a specific partner
   */
  getPartnerRegistrations: async (
    partnerId: string,
    status?: DealRegistrationStatus
  ): Promise<DealRegistration[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await client.get<DealRegistration[]>(
      `/partners/${partnerId}/registrations${params}`
    );
    return response.data;
  },

  /**
   * Approve a deal registration
   */
  approveRegistration: async (
    partnerId: string,
    registrationId: string,
    options?: { commissionRate?: number; protectionDays?: number }
  ): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>(
      `/partners/${partnerId}/registrations/${registrationId}/approve`,
      options
    );
    return response.data;
  },

  /**
   * Reject a deal registration
   */
  rejectRegistration: async (
    partnerId: string,
    registrationId: string,
    reason: string
  ): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>(
      `/partners/${partnerId}/registrations/${registrationId}/reject`,
      { reason }
    );
    return response.data;
  },

  /**
   * Convert a deal registration to an opportunity
   */
  convertRegistration: async (
    partnerId: string,
    registrationId: string
  ): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>(
      `/partners/${partnerId}/registrations/${registrationId}/convert`
    );
    return response.data;
  },
};

// ============================================
// Partner Portal API
// ============================================

export const portalApi = {
  /**
   * Get current user's partner profile
   */
  getMyPartner: async (): Promise<{
    partner: Partner;
    role: string;
    isPrimary: boolean;
  }> => {
    const response = await client.get<{
      partner: Partner;
      role: string;
      isPrimary: boolean;
    }>('/portal/me');
    return response.data;
  },

  /**
   * Get portal dashboard data
   */
  getDashboard: async (): Promise<PortalDashboard> => {
    const response = await client.get<PortalDashboard>('/portal/dashboard');
    return response.data;
  },

  /**
   * Get accounts assigned to partner
   */
  getAccounts: async (search?: string): Promise<PartnerAccount[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await client.get<PartnerAccount[]>(`/portal/accounts${params}`);
    return response.data;
  },

  /**
   * Get partner's deal registrations
   */
  getRegistrations: async (status?: DealRegistrationStatus): Promise<DealRegistration[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await client.get<DealRegistration[]>(`/portal/registrations${params}`);
    return response.data;
  },

  /**
   * Get a specific registration
   */
  getRegistration: async (id: string): Promise<DealRegistration> => {
    const response = await client.get<DealRegistration>(`/portal/registrations/${id}`);
    return response.data;
  },

  /**
   * Create a new deal registration
   */
  createRegistration: async (data: CreateDealRegistrationDto): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>('/portal/registrations', data);
    return response.data;
  },

  /**
   * Update a draft registration
   */
  updateRegistration: async (
    id: string,
    data: UpdateDealRegistrationDto
  ): Promise<DealRegistration> => {
    const response = await client.patch<DealRegistration>(`/portal/registrations/${id}`, data);
    return response.data;
  },

  /**
   * Submit a draft registration for review
   */
  submitRegistration: async (id: string): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>(`/portal/registrations/${id}/submit`);
    return response.data;
  },

  /**
   * Get partner's converted deals
   */
  getDeals: async (status?: 'open' | 'won' | 'lost'): Promise<
    {
      registrationId: string;
      registrationNumber: string;
      commissionRate?: number;
      opportunity: {
        id: string;
        name: string;
        amount?: number;
        stage?: string;
        closeDate?: string;
        isClosed: boolean;
        isWon: boolean;
        account?: { id: string; name: string };
      };
    }[]
  > => {
    const params = status ? `?status=${status}` : '';
    const response = await client.get(`/portal/deals${params}`);
    return response.data;
  },
};

// ============================================
// Partners AI API
// ============================================

export const partnersAIApi = {
  /**
   * Score a deal registration for approval likelihood
   */
  scoreDealRegistration: async (
    partnerId: string,
    registrationId: string
  ): Promise<{
    score: number;
    recommendation: 'AUTO_APPROVE' | 'MANUAL_REVIEW' | 'LIKELY_REJECT';
    factors: { factor: string; impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; weight: number }[];
    suggestedCommissionRate: number;
    reasoning: string;
  }> => {
    const response = await client.get(
      `/partners/${partnerId}/registrations/${registrationId}/ai/score`
    );
    return response.data;
  },

  /**
   * Find best-matching partners for an opportunity
   */
  findPartnerMatches: async (opportunityId: string): Promise<{
    partnerId: string;
    partnerName: string;
    matchScore: number;
    matchReasons: string[];
    suggestedApproach: string;
  }[]> => {
    const response = await client.get(`/partners/ai/match-partners/${opportunityId}`);
    return response.data;
  },

  /**
   * Generate partner performance insights
   */
  getPartnerInsights: async (partnerId: string): Promise<{
    overallAssessment: string;
    strengths: string[];
    improvementAreas: string[];
    recommendations: string[];
    predictedNextQuarterPerformance: string;
  }> => {
    const response = await client.get(`/partners/${partnerId}/ai/insights`);
    return response.data;
  },

  /**
   * Get co-selling recommendations
   */
  getCoSellingRecommendations: async (opportunityId: string): Promise<{
    partnerId: string;
    partnerName: string;
    recommendationType: 'JOINT_SELLING' | 'REFERRAL' | 'TECHNICAL_SUPPORT' | 'IMPLEMENTATION';
    reasoning: string;
    suggestedNextSteps: string[];
    expectedImpact: string;
  }[]> => {
    const response = await client.get(`/opportunities/${opportunityId}/ai/co-selling`);
    return response.data;
  },

  /**
   * Process auto-approvals for pending registrations
   */
  processAutoApprovals: async (): Promise<{
    processed: number;
    approved: number;
    flaggedForReview: number;
    results: { registrationId: string; action: string; reason: string }[];
  }> => {
    const response = await client.post('/partners/ai/process-auto-approvals');
    return response.data;
  },
};
