// Email Template & Tracking Types for SalesOS CRM
// Reusable templates with merge fields and open/click tracking

export type TemplateCategory =
  | 'SALES'
  | 'FOLLOW_UP'
  | 'QUOTE'
  | 'MEETING'
  | 'ONBOARDING'
  | 'NURTURING'
  | 'ANNOUNCEMENT'
  | 'CUSTOM';

export type MergeFieldEntity = 'contact' | 'account' | 'opportunity' | 'user' | 'quote' | 'lead';

export interface MergeField {
  key: string;
  label: string;
  entity: MergeFieldEntity;
  example: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  previewText?: string;
  category: TemplateCategory;
  isActive: boolean;
  isShared: boolean;
  ownerId: string;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailTemplateDto {
  name: string;
  subject: string;
  body: string;
  previewText?: string;
  category?: TemplateCategory;
  isShared?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  body?: string;
  previewText?: string;
  category?: TemplateCategory;
  isActive?: boolean;
  isShared?: boolean;
}

// Email Tracking Types
export type EmailTrackingStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'SPAM';

export interface EmailClick {
  id: string;
  url: string;
  clickedAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface EmailTracking {
  id: string;
  emailId: string;
  templateId?: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  openCount: number;
  uniqueOpens: number;
  clickCount: number;
  uniqueClicks: number;
  clicks: EmailClick[];
  status: EmailTrackingStatus;
  errorMessage?: string;
  relatedEntityType?: 'LEAD' | 'CONTACT' | 'OPPORTUNITY' | 'QUOTE';
  relatedEntityId?: string;
  userId: string;
}

export interface SendEmailDto {
  templateId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  relatedEntityType?: 'LEAD' | 'CONTACT' | 'OPPORTUNITY' | 'QUOTE';
  relatedEntityId?: string;
  scheduleAt?: string;
  mergeData?: Record<string, string | number | boolean>;
}

export interface EmailTrackingStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  averageOpenTime?: number;
  topLinks: { url: string; clicks: number }[];
  byDay: { date: string; sent: number; opened: number; clicked: number }[];
}

export interface EmailTemplateStats {
  total: number;
  active: number;
  shared: number;
  byCategory: Record<TemplateCategory, number>;
  topTemplates: { id: string; name: string; usageCount: number }[];
}

// Default merge fields
export const DEFAULT_MERGE_FIELDS: MergeField[] = [
  // Contact fields
  { key: '{{contact.firstName}}', label: 'Contact First Name', entity: 'contact', example: 'John' },
  { key: '{{contact.lastName}}', label: 'Contact Last Name', entity: 'contact', example: 'Doe' },
  { key: '{{contact.fullName}}', label: 'Contact Full Name', entity: 'contact', example: 'John Doe' },
  { key: '{{contact.email}}', label: 'Contact Email', entity: 'contact', example: 'john@company.com' },
  { key: '{{contact.phone}}', label: 'Contact Phone', entity: 'contact', example: '+1 555-123-4567' },
  { key: '{{contact.title}}', label: 'Contact Title', entity: 'contact', example: 'VP of Sales' },

  // Account fields
  { key: '{{account.name}}', label: 'Account Name', entity: 'account', example: 'Acme Corp' },
  { key: '{{account.website}}', label: 'Account Website', entity: 'account', example: 'www.acme.com' },
  { key: '{{account.industry}}', label: 'Account Industry', entity: 'account', example: 'Technology' },

  // Opportunity fields
  { key: '{{opportunity.name}}', label: 'Opportunity Name', entity: 'opportunity', example: 'Enterprise Deal' },
  { key: '{{opportunity.amount}}', label: 'Opportunity Amount', entity: 'opportunity', example: '$50,000' },
  { key: '{{opportunity.stage}}', label: 'Opportunity Stage', entity: 'opportunity', example: 'Proposal' },
  { key: '{{opportunity.closeDate}}', label: 'Close Date', entity: 'opportunity', example: 'Dec 31, 2024' },

  // Quote fields
  { key: '{{quote.number}}', label: 'Quote Number', entity: 'quote', example: 'Q-2024-001' },
  { key: '{{quote.total}}', label: 'Quote Total', entity: 'quote', example: '$25,000' },
  { key: '{{quote.expirationDate}}', label: 'Quote Expiration', entity: 'quote', example: 'Jan 15, 2025' },
  { key: '{{quote.viewLink}}', label: 'Quote View Link', entity: 'quote', example: '[View Quote]' },

  // User fields
  { key: '{{user.name}}', label: 'Your Name', entity: 'user', example: 'Jane Smith' },
  { key: '{{user.email}}', label: 'Your Email', entity: 'user', example: 'jane@salesos.com' },
  { key: '{{user.phone}}', label: 'Your Phone', entity: 'user', example: '+1 555-987-6543' },
  { key: '{{user.title}}', label: 'Your Title', entity: 'user', example: 'Account Executive' },
  { key: '{{user.signature}}', label: 'Email Signature', entity: 'user', example: '-- Jane Smith | AE' },

  // Lead fields
  { key: '{{lead.firstName}}', label: 'Lead First Name', entity: 'lead', example: 'Mike' },
  { key: '{{lead.lastName}}', label: 'Lead Last Name', entity: 'lead', example: 'Johnson' },
  { key: '{{lead.company}}', label: 'Lead Company', entity: 'lead', example: 'Startup Inc' },
  { key: '{{lead.email}}', label: 'Lead Email', entity: 'lead', example: 'mike@startup.io' },
];

// Template category labels
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  SALES: 'Sales Outreach',
  FOLLOW_UP: 'Follow Up',
  QUOTE: 'Quote & Proposal',
  MEETING: 'Meeting',
  ONBOARDING: 'Onboarding',
  NURTURING: 'Lead Nurturing',
  ANNOUNCEMENT: 'Announcement',
  CUSTOM: 'Custom',
};
