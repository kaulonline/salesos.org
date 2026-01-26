import client from './client';
import type {
  EmailTemplate,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTracking,
  SendEmailDto,
  EmailTrackingStats,
  EmailTemplateStats,
  MergeField,
  TemplateCategory,
  EmailTrackingStatus,
  QueryFilters,
} from '../types';

export interface EmailTemplateFilters extends QueryFilters {
  category?: TemplateCategory;
  isActive?: boolean;
  isShared?: boolean;
  ownerId?: string;
}

export interface EmailTrackingFilters extends QueryFilters {
  status?: EmailTrackingStatus;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Base path for email templates API (user-accessible)
const TEMPLATES_BASE = '/email-templates';

// Response type from backend for paginated templates
interface PaginatedTemplatesResponse {
  items: EmailTemplate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Response type from backend dashboard
interface DashboardResponse {
  templates: {
    total: number;
    totalSent: number;
    totalOpens: number;
    totalClicks: number;
    openRate: string | number;
    clickRate: string | number;
  };
  queue: unknown;
  campaigns: unknown;
  recentActivity: unknown;
}

export const emailTemplatesApi = {
  /**
   * Get all email templates
   */
  getAll: async (filters?: EmailTemplateFilters): Promise<EmailTemplate[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<PaginatedTemplatesResponse>(`${TEMPLATES_BASE}?${params.toString()}`);
    // Backend returns paginated response, extract items array
    return response.data.items || [];
  },

  /**
   * Get email template statistics
   */
  getStats: async (): Promise<EmailTemplateStats> => {
    const response = await client.get<EmailTemplateStats>(`${TEMPLATES_BASE}/stats`);
    return response.data;
  },

  /**
   * Get a single email template by ID
   */
  getById: async (id: string): Promise<EmailTemplate> => {
    const response = await client.get<EmailTemplate>(`${TEMPLATES_BASE}/${id}`);
    return response.data;
  },

  /**
   * Create a new email template
   */
  create: async (data: CreateEmailTemplateDto): Promise<EmailTemplate> => {
    const response = await client.post<EmailTemplate>(TEMPLATES_BASE, data);
    return response.data;
  },

  /**
   * Update an email template
   */
  update: async (id: string, data: UpdateEmailTemplateDto): Promise<EmailTemplate> => {
    const response = await client.put<EmailTemplate>(`${TEMPLATES_BASE}/${id}`, data);
    return response.data;
  },

  /**
   * Delete an email template
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`${TEMPLATES_BASE}/${id}`);
  },

  /**
   * Clone an email template
   */
  clone: async (id: string, name?: string): Promise<EmailTemplate> => {
    const response = await client.post<EmailTemplate>(`${TEMPLATES_BASE}/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Get available merge fields
   * Note: Merge fields are typically entity-specific, using static list for now
   */
  getMergeFields: async (): Promise<MergeField[]> => {
    // Return static merge fields since backend doesn't have dedicated endpoint
    return [
      { key: 'firstName', label: 'First Name', entity: 'contact' },
      { key: 'lastName', label: 'Last Name', entity: 'contact' },
      { key: 'email', label: 'Email', entity: 'contact' },
      { key: 'company', label: 'Company', entity: 'account' },
      { key: 'dealName', label: 'Deal Name', entity: 'opportunity' },
      { key: 'dealAmount', label: 'Deal Amount', entity: 'opportunity' },
    ] as MergeField[];
  },

  /**
   * Preview template with merge data
   */
  preview: async (
    id: string,
    mergeData: Record<string, string | number | boolean>
  ): Promise<{ subject: string; body: string }> => {
    const response = await client.post<{ subject: string; body: string }>(
      `${TEMPLATES_BASE}/${id}/preview`,
      { variables: mergeData }
    );
    return response.data;
  },
};

export const emailTrackingApi = {
  /**
   * Send an email
   */
  send: async (data: SendEmailDto): Promise<EmailTracking> => {
    const response = await client.post<EmailTracking>('/emails/send', data);
    return response.data;
  },

  /**
   * Get all tracked emails
   */
  getAll: async (filters?: EmailTrackingFilters): Promise<EmailTracking[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<EmailTracking[]>(`/emails/tracking?${params.toString()}`);
    return response.data;
  },

  /**
   * Get email tracking by ID
   */
  getById: async (id: string): Promise<EmailTracking> => {
    const response = await client.get<EmailTracking>(`/emails/tracking/${id}`);
    return response.data;
  },

  /**
   * Get email tracking statistics
   */
  getStats: async (dateFrom?: string, dateTo?: string): Promise<EmailTrackingStats> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const response = await client.get<EmailTrackingStats>(`/emails/tracking/stats?${params.toString()}`);
    return response.data;
  },

  /**
   * Get email activity for an entity
   */
  getByEntity: async (entityType: string, entityId: string): Promise<EmailTracking[]> => {
    const response = await client.get<EmailTracking[]>(
      `/emails/tracking?relatedEntityType=${entityType}&relatedEntityId=${entityId}`
    );
    return response.data;
  },

  /**
   * Resend a failed email
   */
  resend: async (id: string): Promise<EmailTracking> => {
    const response = await client.post<EmailTracking>(`/emails/tracking/${id}/resend`);
    return response.data;
  },
};

export default emailTemplatesApi;
