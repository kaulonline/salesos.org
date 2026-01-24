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
}

export interface CreateOpportunityDto {
  accountId: string;
  name: string;
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
  period: string;
  committed: number;
  bestCase: number;
  pipeline: number;
  quota?: number;
  byMonth: {
    month: string;
    forecast: number;
    actual?: number;
  }[];
}

export interface AddContactToOpportunityDto {
  contactId: string;
  role: string;
  isPrimary?: boolean;
}
