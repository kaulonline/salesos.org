// API Key & Webhook Types for SalesOS CRM
// Public REST API access with rate limiting

export type ApiKeyScope =
  | 'READ_LEADS'
  | 'WRITE_LEADS'
  | 'READ_CONTACTS'
  | 'WRITE_CONTACTS'
  | 'READ_ACCOUNTS'
  | 'WRITE_ACCOUNTS'
  | 'READ_OPPORTUNITIES'
  | 'WRITE_OPPORTUNITIES'
  | 'READ_PRODUCTS'
  | 'WRITE_PRODUCTS'
  | 'READ_QUOTES'
  | 'WRITE_QUOTES'
  | 'READ_TASKS'
  | 'WRITE_TASKS'
  | 'READ_ACTIVITIES'
  | 'WEBHOOKS';

export type ApiKeyStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  keyHash?: string;
  scopes: ApiKeyScope[] | string[];
  status: ApiKeyStatus;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  allowedIps?: string[];
  allowedDomains?: string[];
  ipWhitelist?: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  lastUsedIp?: string;
  usageCount: number;
  usageCountToday: number;
  createdAt: string;
  updatedAt: string;
  message?: string;
  [key: string]: any;
}

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  scopes: ApiKeyScope[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
  allowedDomains?: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyDto {
  name?: string;
  description?: string;
  scopes?: ApiKeyScope[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
  allowedDomains?: string[];
  expiresAt?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ApiKeyCreateResponse {
  apiKey: ApiKey;
  secretKey: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  byEndpoint: { endpoint: string; count: number }[];
  byDay: { date: string; count: number }[];
  byHour: { hour: number; count: number }[];
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  rateLimitHits: number;
}

// Webhook Types
export type WebhookEvent =
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.converted'
  | 'lead.assigned'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'account.created'
  | 'account.updated'
  | 'account.deleted'
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'opportunity.deleted'
  | 'opportunity.stage_changed'
  | 'opportunity.won'
  | 'opportunity.lost'
  | 'quote.created'
  | 'quote.sent'
  | 'quote.viewed'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'task.created'
  | 'task.completed'
  | 'form.submitted';

export type WebhookStatus = 'ACTIVE' | 'INACTIVE' | 'FAILING';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret?: string;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  failureCount: number;
  consecutiveFailures: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  attempt: number;
  createdAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  responseStatus?: number;
  responseTime?: number;
  responseBody?: string;
  errorMessage?: string;
}

export interface WebhookStats {
  total: number;
  active: number;
  failing: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  avgResponseTime: number;
  byEvent: Record<WebhookEvent, number>;
}

// API scope labels and descriptions
export const API_SCOPE_DEFINITIONS: Record<ApiKeyScope, { label: string; description: string }> = {
  READ_LEADS: { label: 'Read Leads', description: 'View lead records' },
  WRITE_LEADS: { label: 'Write Leads', description: 'Create, update, and delete leads' },
  READ_CONTACTS: { label: 'Read Contacts', description: 'View contact records' },
  WRITE_CONTACTS: { label: 'Write Contacts', description: 'Create, update, and delete contacts' },
  READ_ACCOUNTS: { label: 'Read Accounts', description: 'View account records' },
  WRITE_ACCOUNTS: { label: 'Write Accounts', description: 'Create, update, and delete accounts' },
  READ_OPPORTUNITIES: { label: 'Read Opportunities', description: 'View opportunity records' },
  WRITE_OPPORTUNITIES: { label: 'Write Opportunities', description: 'Create, update, and delete opportunities' },
  READ_PRODUCTS: { label: 'Read Products', description: 'View product catalog' },
  WRITE_PRODUCTS: { label: 'Write Products', description: 'Create, update, and delete products' },
  READ_QUOTES: { label: 'Read Quotes', description: 'View quote records' },
  WRITE_QUOTES: { label: 'Write Quotes', description: 'Create, update, and delete quotes' },
  READ_TASKS: { label: 'Read Tasks', description: 'View task records' },
  WRITE_TASKS: { label: 'Write Tasks', description: 'Create, update, and delete tasks' },
  READ_ACTIVITIES: { label: 'Read Activities', description: 'View activity history' },
  WEBHOOKS: { label: 'Webhooks', description: 'Manage webhook subscriptions' },
};

// Webhook event labels
export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'lead.created': 'Lead Created',
  'lead.updated': 'Lead Updated',
  'lead.deleted': 'Lead Deleted',
  'lead.converted': 'Lead Converted',
  'lead.assigned': 'Lead Assigned',
  'contact.created': 'Contact Created',
  'contact.updated': 'Contact Updated',
  'contact.deleted': 'Contact Deleted',
  'account.created': 'Account Created',
  'account.updated': 'Account Updated',
  'account.deleted': 'Account Deleted',
  'opportunity.created': 'Opportunity Created',
  'opportunity.updated': 'Opportunity Updated',
  'opportunity.deleted': 'Opportunity Deleted',
  'opportunity.stage_changed': 'Opportunity Stage Changed',
  'opportunity.won': 'Opportunity Won',
  'opportunity.lost': 'Opportunity Lost',
  'quote.created': 'Quote Created',
  'quote.sent': 'Quote Sent',
  'quote.viewed': 'Quote Viewed',
  'quote.accepted': 'Quote Accepted',
  'quote.rejected': 'Quote Rejected',
  'task.created': 'Task Created',
  'task.completed': 'Task Completed',
  'form.submitted': 'Form Submitted',
};
