// Partner Relationship Management (PRM) Types for SalesOS CRM
// Partner portal with deal registration workflow

export type PartnerStatus = 'PROSPECT' | 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'TERMINATED';
export type PartnerTier = 'REGISTERED' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type PartnerType = 'RESELLER' | 'REFERRAL' | 'TECHNOLOGY' | 'SYSTEM_INTEGRATOR' | 'OEM' | 'AFFILIATE';
export type DealRegistrationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'WON'
  | 'LOST';
export type PartnerUserRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface Partner {
  id: string;
  organizationId?: string;
  companyName: string;
  website?: string;
  logoUrl?: string;
  type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  commissionRate?: number;
  discountRate?: number;
  portalEnabled: boolean;
  totalRevenue: number;
  totalDeals: number;
  totalRegistrations: number;
  partnerManagerId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  territory?: string;
  industry: string[];
  certifications: string[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  partnerManager?: {
    id: string;
    name: string | null;
    email: string;
  };
  users?: PartnerUser[];
  accounts?: PartnerAccount[];
}

export interface PartnerUser {
  id: string;
  partnerId: string;
  userId: string;
  role: PartnerUserRole;
  isPrimary: boolean;
  isActive: boolean;
  invitedAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface PartnerAccount {
  id: string;
  partnerId: string;
  accountId: string;
  isExclusive: boolean;
  assignedAt: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
    website?: string;
    industry?: string;
    type?: string;
    annualRevenue?: number;
  };
}

export interface DealRegistration {
  id: string;
  partnerId: string;
  organizationId?: string;
  registrationNumber: string;
  accountName: string;
  accountId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactTitle?: string;
  estimatedValue?: number;
  estimatedCloseDate?: string;
  productInterest: string[];
  useCase?: string;
  competitorInfo?: string;
  status: DealRegistrationStatus;
  approvedAt?: string;
  approvedById?: string;
  approvedUntil?: string;
  rejectedAt?: string;
  rejectedById?: string;
  rejectionReason?: string;
  commissionRate?: number;
  estimatedCommission?: number;
  opportunityId?: string;
  convertedAt?: string;
  convertedById?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  partner?: {
    id: string;
    companyName: string;
    tier: PartnerTier;
  };
  account?: {
    id: string;
    name: string;
  };
  opportunity?: {
    id: string;
    name: string;
    stage?: string;
    amount?: number;
  };
  approvedBy?: {
    id: string;
    name: string | null;
  };
}

export interface CreatePartnerDto {
  companyName: string;
  website?: string;
  logoUrl?: string;
  type?: PartnerType;
  tier?: PartnerTier;
  status?: PartnerStatus;
  commissionRate?: number;
  discountRate?: number;
  portalEnabled?: boolean;
  partnerManagerId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  territory?: string;
  industry?: string[];
  certifications?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {
  status?: PartnerStatus;
}

export interface AddPartnerUserDto {
  userId: string;
  role?: PartnerUserRole;
  isPrimary?: boolean;
}

export interface AssignAccountDto {
  accountId: string;
  isExclusive?: boolean;
  expiresAt?: string;
  notes?: string;
}

export interface CreateDealRegistrationDto {
  accountName: string;
  accountId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactTitle?: string;
  estimatedValue?: number;
  estimatedCloseDate?: string;
  productInterest?: string[];
  useCase?: string;
  competitorInfo?: string;
  notes?: string;
}

export interface UpdateDealRegistrationDto extends Partial<CreateDealRegistrationDto> {}

export interface PartnerStats {
  total: number;
  active?: number;
  totalRevenue?: number;
  byStatus: { status: PartnerStatus; count: number }[];
  byTier: { tier: PartnerTier; count: number }[];
  byType: { type: PartnerType; count: number }[];
  totalPartnerRevenue: number;
}

export interface DealRegistrationStats {
  total: number;
  pending?: number;
  byStatus: { status: DealRegistrationStatus; count: number }[];
  totalEstimatedValue: number;
  totalEstimatedCommission: number;
  avgApprovalDays: number;
}

export interface PortalDashboard {
  partner: {
    id: string;
    companyName: string;
    tier: PartnerTier;
    totalRevenue: number;
    totalDeals: number;
  };
  registrations: {
    total: number;
    byStatus: { status: DealRegistrationStatus; count: number }[];
  };
  assignedAccounts: number;
}

// UI helper constants
export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  PROSPECT: 'Prospect',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
};

export const PARTNER_STATUS_COLORS: Record<PartnerStatus, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  APPROVED: 'bg-[#93C01F]/20 text-[#93C01F]',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-red-100 text-red-700',
};

export const PARTNER_TIER_LABELS: Record<PartnerTier, string> = {
  REGISTERED: 'Registered',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
};

export const PARTNER_TIER_COLORS: Record<PartnerTier, string> = {
  REGISTERED: 'bg-[#F8F8F6] text-[#666]',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  PLATINUM: 'bg-purple-100 text-purple-700',
};

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  RESELLER: 'Reseller',
  REFERRAL: 'Referral',
  TECHNOLOGY: 'Technology',
  SYSTEM_INTEGRATOR: 'System Integrator',
  OEM: 'OEM',
  AFFILIATE: 'Affiliate',
};

export const DEAL_REG_STATUS_LABELS: Record<DealRegistrationStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
  WON: 'Won',
  LOST: 'Lost',
};

export const DEAL_REG_STATUS_COLORS: Record<DealRegistrationStatus, string> = {
  DRAFT: 'bg-[#F8F8F6] text-[#666]',
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-[#93C01F]/20 text-[#93C01F]',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-[#F8F8F6] text-[#666]',
  CONVERTED: 'bg-purple-100 text-purple-700',
  WON: 'bg-[#93C01F]/20 text-[#93C01F]',
  LOST: 'bg-red-100 text-red-700',
};

// Aliases for shorter import names
export const STATUS_LABELS = PARTNER_STATUS_LABELS;
export const STATUS_COLORS = PARTNER_STATUS_COLORS;
export const TIER_LABELS = PARTNER_TIER_LABELS;
export const TIER_COLORS = PARTNER_TIER_COLORS;
export const TYPE_LABELS = PARTNER_TYPE_LABELS;
export const REGISTRATION_STATUS_LABELS = DEAL_REG_STATUS_LABELS;
export const REGISTRATION_STATUS_COLORS = DEAL_REG_STATUS_COLORS;
