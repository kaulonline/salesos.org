// Competitor Intelligence Types for SalesOS CRM
// Track competitors with battlecards and win/loss analysis

export type CompetitorTier = 'PRIMARY' | 'SECONDARY' | 'EMERGING' | 'INDIRECT';
export type CompetitorStatus = 'ACTIVE' | 'INACTIVE' | 'ACQUIRED' | 'MERGED';
export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Competitor {
  id: string;
  organizationId?: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  tier: CompetitorTier;
  status: CompetitorStatus;
  strengths: string[];
  weaknesses: string[];
  differentiators: string[];
  targetMarket?: string;
  pricingModel?: string;
  winsAgainst: number;
  lossesAgainst: number;
  winRateAgainst?: number;
  createdAt: string;
  updatedAt: string;
  products?: CompetitorProduct[];
  battlecards?: Battlecard[];
  battlecardCount?: number;
  productCount?: number;
  dealCount?: number;
}

export interface CompetitorProduct {
  id: string;
  competitorId: string;
  name: string;
  comparableToProductId?: string;
  featureGaps: string[];
  featureAdvantages: string[];
  positioning?: string;
  pricingInfo?: string;
  createdAt: string;
  updatedAt: string;
  comparableToProduct?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface Battlecard {
  id: string;
  competitorId: string;
  title: string;
  overview?: string;
  keyTalkingPoints: string[];
  objectionHandling?: { objection: string; response: string }[];
  trapQuestions: string[];
  winThemes: string[];
  loseThemes: string[];
  pricingComparison?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityCompetitor {
  id: string;
  opportunityId: string;
  competitorId: string;
  isPrimary: boolean;
  threatLevel: ThreatLevel;
  notes?: string;
  wasCompetitorWinner?: boolean;
  lossReasons: string[];
  createdAt: string;
  updatedAt: string;
  competitor?: Competitor;
}

export interface CreateCompetitorDto {
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  tier?: CompetitorTier;
  status?: CompetitorStatus;
  strengths?: string[];
  weaknesses?: string[];
  differentiators?: string[];
  targetMarket?: string;
  pricingModel?: string;
}

export interface UpdateCompetitorDto extends Partial<CreateCompetitorDto> {
  status?: CompetitorStatus;
}

export interface CreateCompetitorProductDto {
  name: string;
  comparableToProductId?: string;
  featureGaps?: string[];
  featureAdvantages?: string[];
  positioning?: string;
  pricingInfo?: string;
}

export interface CreateBattlecardDto {
  title: string;
  overview?: string;
  keyTalkingPoints?: string[];
  objectionHandling?: { objection: string; response: string }[];
  trapQuestions?: string[];
  winThemes?: string[];
  loseThemes?: string[];
  pricingComparison?: string;
}

export interface UpdateBattlecardDto extends Partial<CreateBattlecardDto> {
  isActive?: boolean;
}

export interface LinkOpportunityCompetitorDto {
  competitorId: string;
  isPrimary?: boolean;
  threatLevel?: ThreatLevel;
  notes?: string;
}

export interface CompetitorStats {
  total: number;
  primary?: number;
  totalWins?: number;
  overallWinRate?: number;
  byTier: { tier: CompetitorTier; count: number }[];
  byStatus: { status: CompetitorStatus; count: number }[];
  topCompetitors: {
    id: string;
    name: string;
    tier: CompetitorTier;
    winsAgainst: number;
    lossesAgainst: number;
    winRateAgainst?: number;
  }[];
}

export interface WinLossAnalytics {
  competitorId: string;
  name: string;
  wins: number;
  losses: number;
  wonAmount: number;
  lostAmount: number;
  winRate?: number;
  topLossReasons: { reason: string; count: number }[];
}

// UI helper constants
export const COMPETITOR_TIER_LABELS: Record<CompetitorTier, string> = {
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary',
  EMERGING: 'Emerging',
  INDIRECT: 'Indirect',
};

export const COMPETITOR_TIER_COLORS: Record<CompetitorTier, string> = {
  PRIMARY: 'bg-red-100 text-red-700',
  SECONDARY: 'bg-orange-100 text-orange-700',
  EMERGING: 'bg-blue-100 text-blue-700',
  INDIRECT: 'bg-[#F8F8F6] text-[#666]',
};

export const THREAT_LEVEL_COLORS: Record<ThreatLevel, string> = {
  LOW: 'bg-[#93C01F]/20 text-[#93C01F]',
  MEDIUM: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export const COMPETITOR_STATUS_LABELS: Record<CompetitorStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ACQUIRED: 'Acquired',
  MERGED: 'Merged',
};

export const COMPETITOR_STATUS_COLORS: Record<CompetitorStatus, string> = {
  ACTIVE: 'bg-[#93C01F]/20 text-[#93C01F]',
  INACTIVE: 'bg-[#F8F8F6] text-[#666]',
  ACQUIRED: 'bg-purple-100 text-purple-700',
  MERGED: 'bg-blue-100 text-blue-700',
};

// Aliases for shorter import names
export const TIER_LABELS = COMPETITOR_TIER_LABELS;
export const TIER_COLORS = COMPETITOR_TIER_COLORS;
export const STATUS_LABELS = COMPETITOR_STATUS_LABELS;
export const STATUS_COLORS = COMPETITOR_STATUS_COLORS;
