export type LeadSource =
  | 'WEB'
  | 'PHONE_INQUIRY'
  | 'PARTNER_REFERRAL'
  | 'PURCHASED_LIST'
  | 'EXTERNAL_REFERRAL'
  | 'EMPLOYEE_REFERRAL'
  | 'TRADE_SHOW'
  | 'WEB_FORM'
  | 'SOCIAL_MEDIA'
  | 'EMAIL_CAMPAIGN'
  | 'WEBINAR'
  | 'COLD_CALL'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'NURTURING'
  | 'CONVERTED'
  | 'LOST';

export type LeadRating = 'HOT' | 'WARM' | 'COLD';

export type BuyingIntent = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface Lead {
  id: string;
  ownerId: string;
  campaignId?: string;
  firstName: string;
  lastName: string;
  salutation?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  leadSource?: LeadSource;
  status: LeadStatus;
  rating?: LeadRating;
  industry?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  description?: string;
  isQualified: boolean;
  qualifiedDate?: string;
  disqualifiedReason?: string;
  leadScore?: number;
  buyingIntent?: BuyingIntent;
  painPoints?: string[];
  budget?: number;
  timeline?: string;
  convertedDate?: string;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  lastContactedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadDto {
  firstName: string;
  lastName: string;
  salutation?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  leadSource?: LeadSource;
  campaignId?: string;
  status?: LeadStatus;
  rating?: LeadRating;
  industry?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  description?: string;
  painPoints?: string[];
  budget?: number;
  timeline?: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  isQualified?: boolean;
  disqualifiedReason?: string;
  leadScore?: number;
  buyingIntent?: BuyingIntent;
}

export interface ConvertLeadDto {
  createAccount?: boolean;
  createContact?: boolean;
  createOpportunity?: boolean;
  opportunityName?: string;
  opportunityAmount?: number;
  accountName?: string;
  existingAccountId?: string;
}

export interface ConvertLeadResult {
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  byRating: Record<LeadRating, number>;
  avgScore: number;
  newThisWeek: number;
  convertedThisMonth: number;
}

export interface LeadScoreResult {
  score: number;
  factors: {
    factor: string;
    impact: number;
    reason: string;
  }[];
}
