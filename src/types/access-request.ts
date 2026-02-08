/**
 * Access Request Types
 * For the Request Access form and Admin management
 */

export type AccessRequestStatus =
  | 'PENDING'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED';

export type AccessRequestType =
  | 'FREE_TRIAL'
  | 'DEMO'
  | 'ENTERPRISE'
  | 'PARTNER'
  | 'OTHER';

export type AIPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AIInsights {
  buyingIntent: string;
  urgency: string;
  budgetIndicator: string;
  decisionMakerLikelihood: string;
  fitScore: string;
  riskFactors: string[];
  positiveSignals: string[];
}

export interface AICompanyInfo {
  estimatedRevenue: string;
  employeeRange: string;
  industryVertical: string;
  techMaturity: string;
  potentialUseCase: string;
}

export interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  jobTitle?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  requestType: AccessRequestType;
  interests: string[];
  message?: string;
  howHeard?: string;
  status: AccessRequestStatus;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  convertedLeadId?: string;
  organizationCodeSent?: string;
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  internalNotes?: string;
  rejectionReason?: string;
  // AI Fields
  aiScore?: number;
  aiPriority?: AIPriority;
  aiInsights?: AIInsights;
  aiCompanyInfo?: AICompanyInfo;
  aiRecommendedActions?: string[];
  aiSummary?: string;
  aiEnrichedAt?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  contactedAt?: string;
  convertedAt?: string;
}

export interface CreateAccessRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  jobTitle?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  requestType?: AccessRequestType;
  interests?: string[];
  message?: string;
  howHeard?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface UpdateAccessRequestDto {
  status?: AccessRequestStatus;
  internalNotes?: string;
  rejectionReason?: string;
  assignedToId?: string;
  organizationCodeSent?: string;
}

export interface SendOrgCodeDto {
  organizationCode: string;
  personalMessage?: string;
}

export interface AccessRequestStats {
  total: number;
  pending: number;
  thisWeek: number;
  converted: number;
  conversionRate: string;
  byStatus: Record<AccessRequestStatus, number>;
  byType: Record<AccessRequestType, number>;
}

export interface AccessRequestListResponse {
  requests: AccessRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Constants for form dropdowns
export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

export const INDUSTRIES = [
  { value: 'technology', label: 'Technology & SaaS' },
  { value: 'financial', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare & Life Sciences' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'services', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

export const INTERESTS = [
  { value: 'crm', label: 'CRM & Pipeline Management' },
  { value: 'coaching', label: 'AI Sales Coaching' },
  { value: 'analytics', label: 'Revenue Intelligence & Analytics' },
  { value: 'partners', label: 'Partner Management' },
  { value: 'enterprise', label: 'Enterprise Features' },
];

export const REQUEST_TYPES = [
  { value: 'FREE_TRIAL', label: 'Free Trial' },
  { value: 'DEMO', label: 'Schedule a Demo' },
  { value: 'ENTERPRISE', label: 'Enterprise Inquiry' },
  { value: 'PARTNER', label: 'Partnership Inquiry' },
];

export const HOW_HEARD_OPTIONS = [
  { value: 'google', label: 'Google Search' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event / Conference' },
  { value: 'other', label: 'Other' },
];

// Personal email domains to reject
export const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'live.com',
  'msn.com',
];

export function isBusinessEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !PERSONAL_EMAIL_DOMAINS.includes(domain) : false;
}
