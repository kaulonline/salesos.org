// Revenue Split Types for SalesOS CRM
// Allows multiple sales reps to share credit on deals

export type SplitType = 'REVENUE' | 'OVERLAY' | 'QUOTA' | 'REFERRAL' | 'MANAGEMENT';
export type SplitStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export interface OpportunitySplit {
  id: string;
  opportunityId: string;
  organizationId?: string;
  userId: string;
  splitType: SplitType;
  splitPercent: number;
  splitAmount?: number;
  includeInQuota: boolean;
  includeInForecast: boolean;
  status: SplitStatus;
  approvedById?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string;
  };
  approvedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  opportunity?: {
    id: string;
    name: string;
    amount?: number;
    stage?: string;
    closeDate?: string;
    isClosed: boolean;
    isWon: boolean;
    account?: {
      id: string;
      name: string;
    };
  };
}

export interface CreateSplitDto {
  userId: string;
  splitType?: SplitType;
  splitPercent: number;
  includeInQuota?: boolean;
  includeInForecast?: boolean;
  notes?: string;
}

export interface UpdateSplitDto {
  splitType?: SplitType;
  splitPercent?: number;
  includeInQuota?: boolean;
  includeInForecast?: boolean;
  notes?: string;
}

export interface SplitSummary {
  totalPercent: number;
  splitCount: number;
  isComplete: boolean;
  pendingApproval: number;
}

export interface OpportunitySplitsResponse {
  splits: OpportunitySplit[];
  summary: SplitSummary;
}

export interface UserSplitsResponse {
  splits: OpportunitySplit[];
  totals: {
    totalAmount: number;
    forecastAmount: number;
    wonAmount: number;
  };
}

export interface SplitStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalApprovedAmount: number;
  byType: {
    type: SplitType;
    count: number;
    amount: number;
  }[];
}

// UI helper constants
export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  REVENUE: 'Revenue',
  OVERLAY: 'Overlay',
  QUOTA: 'Quota Only',
  REFERRAL: 'Referral',
  MANAGEMENT: 'Management',
};

export const SPLIT_STATUS_COLORS: Record<SplitStatus, string> = {
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  APPROVED: 'bg-[#93C01F]/20 text-[#93C01F]',
  REJECTED: 'bg-red-100 text-red-700',
  LOCKED: 'bg-[#F8F8F6] text-[#666]',
};
