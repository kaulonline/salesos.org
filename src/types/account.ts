export type AccountType =
  | 'PROSPECT'
  | 'CUSTOMER'
  | 'PARTNER'
  | 'RESELLER'
  | 'COMPETITOR'
  | 'OTHER';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CHURNED' | 'AT_RISK';

export type AccountRating = 'HOT' | 'WARM' | 'COLD';

export type ChurnRisk = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface Account {
  id: string;
  ownerId: string;
  name: string;
  website?: string;
  domain?: string;
  phone?: string;
  fax?: string;
  industry?: string;
  type: AccountType;
  numberOfEmployees?: number;
  annualRevenue?: number;
  description?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  accountStatus?: AccountStatus;
  rating?: AccountRating;
  healthScore?: number;
  lifetimeValue?: number;
  churnRisk?: ChurnRisk;
  painPoints?: string[];
  techStack?: string[];
  competitors?: string[];
  parentAccountId?: string;
  lastActivityDate?: string;
  nextActivityDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Relationship counts (may be included from backend)
  contactCount?: number;
  opportunityCount?: number;
  _count?: {
    contacts?: number;
    opportunities?: number;
  };
}

export interface CreateAccountDto {
  name: string;
  type?: AccountType;
  industry?: string;
  phone?: string;
  website?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  description?: string;
  parentAccountId?: string;
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {
  accountStatus?: AccountStatus;
  rating?: AccountRating;
  healthScore?: number;
  churnRisk?: ChurnRisk;
  painPoints?: string[];
  competitors?: string[];
}

export interface AccountStats {
  total: number;
  byType: Record<AccountType, number>;
  byStatus: Record<AccountStatus, number>;
  byRating: Record<AccountRating, number>;
  totalRevenue: number;
  avgHealthScore: number;
  atRiskCount: number;
}

export interface AccountHierarchy {
  account: Account;
  parent?: Account;
  children: Account[];
}

export interface AccountRevenue {
  accountId: string;
  totalRevenue: number;
  closedWonDeals: number;
  openDeals: number;
  avgDealSize: number;
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
}
