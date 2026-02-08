// Partner Portal Types

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

export type PartnerTier = 'REGISTERED' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type PartnerUserRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export interface PortalPartner {
  id: string;
  companyName: string;
  website?: string;
  logoUrl?: string;
  tier: PartnerTier;
  totalRevenue: number;
  totalDeals: number;
  commissionRate?: number;
  discountRate?: number;
  partnerManager?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PortalProfile {
  partner: PortalPartner;
  role: PartnerUserRole;
  isPrimary: boolean;
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
    byStatus: Array<{ status: DealRegistrationStatus; count: number }>;
  };
  assignedAccounts: number;
}

export interface PortalAccount {
  id: string;
  partnerId: string;
  accountId: string;
  isExclusive: boolean;
  expiresAt?: string;
  notes?: string;
  assignedAt: string;
  account: {
    id: string;
    name: string;
    website?: string;
    industry?: string;
    type?: string;
  };
}

export interface PortalDeal {
  registrationId: string;
  registrationNumber: string;
  commissionRate?: number;
  opportunity: {
    id: string;
    name: string;
    amount?: number;
    stage: string;
    closeDate?: string;
    isClosed: boolean;
    isWon: boolean;
    account?: {
      id: string;
      name: string;
    };
  };
}

export interface DealRegistration {
  id: string;
  partnerId: string;
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
  notes?: string;
  status: DealRegistrationStatus;
  approvedAt?: string;
  approvedUntil?: string;
  commissionRate?: number;
  estimatedCommission?: number;
  rejectionReason?: string;
  opportunityId?: string;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
  opportunity?: {
    id: string;
    name: string;
    stage: string;
    amount?: number;
  };
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
