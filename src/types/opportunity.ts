export type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'NEEDS_ANALYSIS'
  | 'VALUE_PROPOSITION'
  | 'DECISION_MAKERS_IDENTIFIED'
  | 'PERCEPTION_ANALYSIS'
  | 'PROPOSAL_PRICE_QUOTE'
  | 'NEGOTIATION_REVIEW'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export type OpportunitySource =
  | 'EXISTING_CUSTOMER'
  | 'NEW_CUSTOMER'
  | 'PARTNER'
  | 'EMPLOYEE_REFERRAL'
  | 'EXTERNAL_REFERRAL'
  | 'ADVERTISEMENT'
  | 'TRADE_SHOW'
  | 'WEB'
  | 'WORD_OF_MOUTH'
  | 'OTHER';

export type OpportunityType =
  | 'NEW_BUSINESS'
  | 'EXISTING_BUSINESS'
  | 'UPSELL'
  | 'CROSS_SELL'
  | 'RENEWAL';

export interface Opportunity {
  id: string;
  accountId: string;
  ownerId: string;
  campaignId?: string;
  pipelineId?: string;
  stageId?: string;
  name: string;
  opportunitySource?: OpportunitySource;
  type?: OpportunityType;
  stage: OpportunityStage;
  amount?: number;
  probability?: number;
  expectedRevenue?: number;
  discount?: number;
  closeDate?: string;
  createdDate?: string;
  lastActivityDate?: string;
  nextActivityDate?: string;
  needsAnalysis?: string;
  proposedSolution?: string;
  competitors?: string[];
  nextStep?: string;
  winProbability?: number;
  riskFactors?: string[];
  recommendedActions?: string[];
  dealVelocity?: number;
  isClosed: boolean;
  isWon: boolean;
  lostReason?: string;
  closedDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
  owner?: {
    id: string;
    name: string;
  };
  contacts?: OpportunityContact[];
}

export interface CreateOpportunityDto {
  accountId: string;
  name: string;
  pipelineId?: string;
  stageId?: string;
  stage?: OpportunityStage;
  amount?: number;
  probability?: number;
  closeDate?: string;
  type?: OpportunityType;
  opportunitySource?: OpportunitySource;
  nextStep?: string;
  description?: string;
}

export interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {
  pipelineId?: string;
  stageId?: string;
  competitors?: string[];
  needsAnalysis?: string;
  proposedSolution?: string;
}

export interface AdvanceStageDto {
  notes?: string;
}

export interface CloseLostDto {
  lostReason: string;
  competitorWon?: string;
  notes?: string;
}

export interface CloseWonDto {
  finalAmount?: number;
  notes?: string;
}

export interface OpportunityAnalysis {
  winProbability: number;
  riskFactors: {
    factor: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }[];
  recommendedActions: {
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }[];
  dealHealth: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  insights: string[];
}

export interface PipelineStats {
  totalValue: number;
  totalDeals: number;
  totalOpportunities: number;
  avgDealSize: number;
  weightedPipeline: number;
  byStage: {
    stage: OpportunityStage;
    count: number;
    value: number;
  }[];
  winRate: number;
  avgDealCycle: number;
  closedWonThisMonth: number;
  closedWonValue: number;
}

export interface SalesForecast {
  // Backend fields
  quarterRevenue: number;
  quarterBestCase: number;
  quarterCommit: number;
  confidence: string;
  quarterName: string;
  opportunityCount: number;
  monthly: {
    month: string;
    bestCase: number;
    mostLikely: number;
    commit: number;
    closed: number;
  }[];
  // Optional legacy fields for compatibility
  period?: string;
  committed?: number;
  bestCase?: number;
  pipeline?: number;
  quota?: number;
  byMonth?: {
    month: string;
    forecast: number;
    actual?: number;
  }[];
}

export interface AddContactToOpportunityDto {
  contactId: string;
  role: OpportunityContactRole;
  isPrimary?: boolean;
}

// Opportunity Contact Junction - Buyer Committee
export type OpportunityContactRole =
  | 'DECISION_MAKER'
  | 'ECONOMIC_BUYER'
  | 'CHAMPION'
  | 'INFLUENCER'
  | 'TECHNICAL_BUYER'
  | 'END_USER'
  | 'BLOCKER'
  | 'EVALUATOR'
  | 'GATEKEEPER'
  | 'LEGAL'
  | 'PROCUREMENT'
  | 'OTHER';

export interface OpportunityContact {
  id: string;
  opportunityId: string;
  contactId: string;
  role: OpportunityContactRole;
  isPrimary: boolean;
  influence?: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
  engagementLevel?: 'HIGHLY_ENGAGED' | 'ENGAGED' | 'PASSIVE' | 'DISENGAGED';
  notes?: string;
  lastContactedAt?: string;
  // Flattened contact fields (populated by backend in some responses)
  firstName?: string;
  lastName?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  // Populated contact details
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    avatarUrl?: string;
    accountId?: string;
  };
}

export interface UpdateOpportunityContactDto {
  role?: OpportunityContactRole;
  isPrimary?: boolean;
  influence?: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'UNKNOWN';
  engagementLevel?: 'HIGHLY_ENGAGED' | 'ENGAGED' | 'PASSIVE' | 'DISENGAGED';
  notes?: string;
}
