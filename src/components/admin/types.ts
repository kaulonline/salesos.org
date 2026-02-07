/**
 * Shared types for Admin components
 */
import type { LicenseTier, PreGeneratedKeyStatus } from '../../api/licensing';
import type { Coupon, Payment, GatewayConfig, PaymentGateway } from '../../api/payments';

export type TabType = 'overview' | 'users' | 'billing' | 'features' | 'settings' | 'audit' | 'backups';
export type BillingSubTab = 'dashboard' | 'pricing-plans' | 'events' | 'invoices';

// Admin Dashboard Stats
export interface AdminStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  crm: {
    leads: number;
    contacts: number;
    accounts: number;
    opportunities: number;
  };
  ai: {
    totalTokensUsed: number;
    successRate: number;
  };
  system: {
    version: string;
    uptime: number;
    lastBackup: string;
  };
}

// Admin User
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  createdAt: string;
}

// Feature Flag
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
}

// System Config
export interface SystemConfig {
  key: string;
  value: string;
  category: string;
  description?: string;
}

// License Type
export interface LicenseType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tier: LicenseTier;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number;
  maxConversations: number;
  maxLeads: number;
  maxDocuments: number;
  isActive: boolean;
  isPublic: boolean;
  _count?: {
    userLicenses: number;
  };
  userCount?: number;
}

// Outcome Pricing Plan
export interface OutcomePricingPlan {
  id: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
  };
  pricingModel: 'REVENUE_SHARE' | 'FLAT_PER_DEAL' | 'TIERED_FLAT_FEE' | 'HYBRID';
  revenueSharePercent?: number;
  flatFeePerDeal?: number;
  tieredRates?: {
    minAmount: number;
    maxAmount: number;
    fee: number;
  }[];
  outcomePercent?: number;
  minDealValue?: number;
  minFeePerDeal?: number;
  platformAccessFee?: number;
  monthlyCap?: number;
  grantsFullAccess: boolean;
  isActive: boolean;
  createdAt: string;
}

// Outcome Event
export interface OutcomeEvent {
  id: string;
  organizationId: string;
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  dealAmount: number;
  feeAmount: number;
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'FLAGGED_FOR_REVIEW' | 'WAIVED' | 'VOIDED';
  closedDate: string;
  ownerName?: string;
  adminNotes?: string;
  createdAt: string;
}

// Plan Form State
export interface PlanFormState {
  name: string;
  slug: string;
  description: string;
  tier: LicenseTier;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number;
  maxConversations: number;
  maxLeads: number;
  maxDocuments: number;
  isActive: boolean;
  isPublic: boolean;
}

// Coupon Form State
export interface CouponFormState {
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  duration: 'ONCE' | 'FOREVER' | 'REPEATING';
  durationMonths: number;
  maxRedemptions?: number;
  expiresAt: string;
  syncToStripe: boolean;
}

// Gateway Form State
export interface GatewayFormState {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
  isActive: boolean;
}
