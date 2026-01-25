export type CampaignStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ABORTED'
  | 'PAUSED';

export type CampaignType =
  | 'EMAIL'
  | 'WEBINAR'
  | 'CONFERENCE'
  | 'TRADE_SHOW'
  | 'ADVERTISEMENT'
  | 'DIRECT_MAIL'
  | 'REFERRAL_PROGRAM'
  | 'SOCIAL_MEDIA'
  | 'CONTENT_MARKETING'
  | 'SEO'
  | 'PPC'
  | 'PARTNER'
  | 'OTHER';

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description?: string;
  startDate?: string;
  endDate?: string;
  expectedRevenue?: number;
  budgetedCost?: number;
  actualCost?: number;
  expectedResponse?: number;
  numberSent?: number;
  parentCampaignId?: string;
  isActive: boolean;
  // Metrics
  numberOfLeads?: number;
  numberOfContacts?: number;
  numberOfOpportunities?: number;
  numberOfConvertedLeads?: number;
  amountAllOpportunities?: number;
  amountWonOpportunities?: number;
  // Calculated fields
  roi?: number;
  costPerLead?: number;
  conversionRate?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  name: string;
  type: CampaignType;
  status?: CampaignStatus;
  description?: string;
  startDate?: string;
  endDate?: string;
  expectedRevenue?: number;
  budgetedCost?: number;
  parentCampaignId?: string;
  isActive?: boolean;
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  actualCost?: number;
  expectedResponse?: number;
  numberSent?: number;
}

export interface CampaignStats {
  total: number;
  active: number;
  byType: Record<CampaignType, number>;
  byStatus: Record<CampaignStatus, number>;
  totalBudget: number;
  totalSpent: number;
  totalLeads: number;
  totalOpportunities: number;
  avgROI: number;
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  leadId?: string;
  contactId?: string;
  status: 'SENT' | 'RESPONDED' | 'CONVERTED' | 'OPTED_OUT';
  firstRespondedDate?: string;
  hasResponded: boolean;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
  };
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
}

export interface AddCampaignMemberDto {
  leadId?: string;
  contactId?: string;
  status?: 'SENT' | 'RESPONDED';
}
