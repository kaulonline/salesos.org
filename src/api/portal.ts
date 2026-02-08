import client from './client';
import type {
  PortalProfile,
  PortalDashboard,
  PortalAccount,
  PortalDeal,
  DealRegistration,
  CreateDealRegistrationDto,
  UpdateDealRegistrationDto,
} from '../types/portal';

export const portalApi = {
  // ============================================
  // Portal Profile
  // ============================================

  /**
   * Get current user's partner profile
   */
  getProfile: async (): Promise<PortalProfile> => {
    const response = await client.get<PortalProfile>('/portal/me');
    return response.data;
  },

  /**
   * Get portal dashboard data
   */
  getDashboard: async (): Promise<PortalDashboard> => {
    const response = await client.get<PortalDashboard>('/portal/dashboard');
    return response.data;
  },

  // ============================================
  // Portal Accounts
  // ============================================

  /**
   * Get accounts assigned to the partner
   */
  getAccounts: async (search?: string): Promise<PortalAccount[]> => {
    const params = new URLSearchParams();
    if (search) {
      params.append('search', search);
    }
    const response = await client.get<PortalAccount[]>(`/portal/accounts?${params.toString()}`);
    return response.data;
  },

  // ============================================
  // Portal Deals
  // ============================================

  /**
   * Get deals (converted registrations with opportunities)
   */
  getDeals: async (status?: 'open' | 'won' | 'lost'): Promise<PortalDeal[]> => {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    const response = await client.get<PortalDeal[]>(`/portal/deals?${params.toString()}`);
    return response.data;
  },

  // ============================================
  // Deal Registrations
  // ============================================

  /**
   * Get all deal registrations for the partner
   */
  getRegistrations: async (status?: string): Promise<DealRegistration[]> => {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    const response = await client.get<DealRegistration[]>(`/portal/registrations?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single deal registration by ID
   */
  getRegistration: async (id: string): Promise<DealRegistration> => {
    const response = await client.get<DealRegistration>(`/portal/registrations/${id}`);
    return response.data;
  },

  /**
   * Create a new deal registration (as draft)
   */
  createRegistration: async (data: CreateDealRegistrationDto): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>('/portal/registrations', data);
    return response.data;
  },

  /**
   * Update a draft deal registration
   */
  updateRegistration: async (id: string, data: UpdateDealRegistrationDto): Promise<DealRegistration> => {
    const response = await client.patch<DealRegistration>(`/portal/registrations/${id}`, data);
    return response.data;
  },

  /**
   * Submit a draft registration for approval
   */
  submitRegistration: async (id: string): Promise<DealRegistration> => {
    const response = await client.post<DealRegistration>(`/portal/registrations/${id}/submit`);
    return response.data;
  },
};
