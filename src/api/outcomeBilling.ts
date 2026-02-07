import client from './client';

// ============= Types =============

export type OutcomePricingModel = 'REVENUE_SHARE' | 'TIERED_FLAT_FEE' | 'HYBRID' | 'FLAT_PER_DEAL';
export type OutcomeEventStatus = 'PENDING' | 'INVOICED' | 'PAID' | 'WAIVED' | 'VOIDED' | 'FLAGGED_FOR_REVIEW';

export interface PricingTier {
  minAmount: number;
  maxAmount?: number | null;
  fee: number;
}

export interface OutcomePricingPlan {
  id: string;
  organizationId: string;
  pricingModel: OutcomePricingModel;
  revenueSharePercent?: number | null;
  tierConfiguration?: PricingTier[] | null;
  flatFeePerDeal?: number | null;
  baseSubscriptionId?: string | null;
  outcomePercent?: number | null;
  monthlyCap?: number | null;
  minDealValue?: number | null;
  // Profitability safeguards
  minFeePerDeal?: number | null;
  platformAccessFee?: number | null;
  // Access control
  grantsFullAccess?: boolean;
  billingDay: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface OutcomeEvent {
  id: string;
  organizationId: string;
  outcomePricingPlanId: string;
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  dealAmount: number;
  closedDate: string;
  ownerId: string;
  ownerName?: string | null;
  feeAmount: number;
  feeCalculation?: FeeCalculation | null;
  status: OutcomeEventStatus;
  invoiceId?: string | null;
  invoiceLineItemId?: string | null;
  invoicedAt?: string | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  outcomePricingPlan?: {
    pricingModel: OutcomePricingModel;
    currency: string;
    organization?: {
      id: string;
      name: string;
    };
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

export interface FeeCalculation {
  model: OutcomePricingModel;
  dealAmount: number;
  percent?: number;
  tier?: PricingTier;
  minFeeApplied?: boolean;
  calculatedFee?: number;
  originalFee?: number;
  cappedTo?: number;
  cappedToZero?: boolean;
  belowMinimum?: boolean;
}

export interface OutcomeBillingStats {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currentPeriodFees: number;
  currentPeriodDeals: number;
  currentPeriodDealValue: number;
  monthlyCap: number | null;
  capRemaining: number | null;
  capUtilizationPercent: number | null;
  lastPeriodFees: number;
  lastPeriodDeals: number;
  totalLifetimeFees: number;
  totalLifetimeDeals: number;
  pricingModel: OutcomePricingModel;
  planDetails: {
    revenueSharePercent?: number;
    flatFeePerDeal?: number;
    outcomePercent?: number;
    tierConfiguration?: PricingTier[];
    minFeePerDeal?: number;
    platformAccessFee?: number;
    minDealValue?: number;
  };
}

export interface AdminDashboardStats {
  activePlans: number;
  pendingEvents: number;
  flaggedForReview: number;
  currentMonthFees: number;
  currentMonthDeals: number;
  currentMonthDealValue: number;
  totalLifetimeRevenue: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============= Request DTOs =============

export interface CreateOutcomePricingPlanDto {
  organizationId: string;
  pricingModel: OutcomePricingModel;
  revenueSharePercent?: number;
  tierConfiguration?: PricingTier[];
  flatFeePerDeal?: number;
  baseSubscriptionId?: string;
  outcomePercent?: number;
  monthlyCap?: number;
  minDealValue?: number;
  // Profitability safeguards
  minFeePerDeal?: number;
  platformAccessFee?: number;
  // Access control
  grantsFullAccess?: boolean;
  billingDay?: number;
  currency?: string;
  isActive?: boolean;
}

export interface UpdateOutcomePricingPlanDto {
  pricingModel?: OutcomePricingModel;
  revenueSharePercent?: number;
  tierConfiguration?: PricingTier[];
  flatFeePerDeal?: number;
  baseSubscriptionId?: string;
  outcomePercent?: number;
  monthlyCap?: number;
  minDealValue?: number;
  // Profitability safeguards
  minFeePerDeal?: number;
  platformAccessFee?: number;
  // Access control
  grantsFullAccess?: boolean;
  billingDay?: number;
  currency?: string;
  isActive?: boolean;
}

export interface ListOutcomeEventsParams {
  page?: number;
  limit?: number;
  status?: OutcomeEventStatus;
  organizationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ListOutcomePlansParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// ============= Organization API (User's org) =============

export const outcomeBillingApi = {
  // Get my organization's pricing plan
  getMyPlan: async (): Promise<OutcomePricingPlan | null> => {
    const response = await client.get('/outcome-billing/plan');
    return response.data;
  },

  // Get my organization's outcome events
  getMyEvents: async (params?: ListOutcomeEventsParams): Promise<PaginatedResponse<OutcomeEvent>> => {
    const response = await client.get('/outcome-billing/events', { params });
    return response.data;
  },

  // Get my organization's billing stats
  getMyStats: async (): Promise<OutcomeBillingStats | null> => {
    const response = await client.get('/outcome-billing/stats');
    return response.data;
  },
};

// ============= Admin API =============

export const adminOutcomeBillingApi = {
  // Dashboard
  getDashboard: async (): Promise<AdminDashboardStats> => {
    const response = await client.get('/admin/outcome-billing/dashboard');
    return response.data;
  },

  // Pricing Plans
  createPlan: async (data: CreateOutcomePricingPlanDto): Promise<OutcomePricingPlan> => {
    const response = await client.post('/admin/outcome-billing/plans', data);
    return response.data;
  },

  listPlans: async (params?: ListOutcomePlansParams): Promise<PaginatedResponse<OutcomePricingPlan>> => {
    const response = await client.get('/admin/outcome-billing/plans', { params });
    return response.data;
  },

  getPlanById: async (id: string): Promise<OutcomePricingPlan | null> => {
    const response = await client.get(`/admin/outcome-billing/plans/${id}`);
    return response.data;
  },

  getPlanByOrganization: async (orgId: string): Promise<OutcomePricingPlan | null> => {
    const response = await client.get(`/admin/outcome-billing/plans/organization/${orgId}`);
    return response.data;
  },

  updatePlan: async (id: string, data: UpdateOutcomePricingPlanDto): Promise<OutcomePricingPlan> => {
    const response = await client.patch(`/admin/outcome-billing/plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id: string): Promise<void> => {
    await client.delete(`/admin/outcome-billing/plans/${id}`);
  },

  // Outcome Events
  listEvents: async (params?: ListOutcomeEventsParams): Promise<PaginatedResponse<OutcomeEvent>> => {
    const response = await client.get('/admin/outcome-billing/events', { params });
    return response.data;
  },

  getEventById: async (id: string): Promise<OutcomeEvent | null> => {
    const response = await client.get(`/admin/outcome-billing/events/${id}`);
    return response.data;
  },

  waiveEvent: async (id: string, reason: string): Promise<OutcomeEvent> => {
    const response = await client.post(`/admin/outcome-billing/events/${id}/waive`, { reason });
    return response.data;
  },

  voidEvent: async (id: string, reason: string): Promise<OutcomeEvent> => {
    const response = await client.post(`/admin/outcome-billing/events/${id}/void`, { reason });
    return response.data;
  },

  resolveReview: async (id: string, action: 'approve' | 'void' | 'waive', reason?: string): Promise<OutcomeEvent> => {
    const response = await client.post(`/admin/outcome-billing/events/${id}/resolve`, { action, reason });
    return response.data;
  },

  // Invoice Generation
  generateInvoice: async (orgId: string): Promise<any> => {
    const response = await client.post(`/admin/outcome-billing/generate-invoice/${orgId}`);
    return response.data;
  },

  processBilling: async (): Promise<{ message: string }> => {
    const response = await client.post('/admin/outcome-billing/process-billing');
    return response.data;
  },

  // Organization Stats
  getOrganizationStats: async (orgId: string): Promise<OutcomeBillingStats | null> => {
    const response = await client.get(`/admin/outcome-billing/stats/${orgId}`);
    return response.data;
  },
};

export default outcomeBillingApi;
