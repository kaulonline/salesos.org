import client from './client';
import type {
  WebForm,
  CreateWebFormDto,
  UpdateWebFormDto,
  WebFormSubmission,
  WebFormStats,
  WebFormEmbedCode,
  PublicWebForm,
  SubmitWebFormDto,
  SubmitWebFormResult,
  QueryFilters,
} from '../types';

export interface WebFormFilters extends QueryFilters {
  isActive?: boolean;
}

export interface WebFormSubmissionFilters extends QueryFilters {
  status?: 'PROCESSED' | 'FAILED' | 'DUPLICATE' | 'PENDING_VERIFICATION';
  dateFrom?: string;
  dateTo?: string;
}

export const webFormsApi = {
  /**
   * Get all web forms
   */
  getAll: async (filters?: WebFormFilters): Promise<WebForm[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<WebForm[]>(`/web-forms?${params.toString()}`);
    return response.data;
  },

  /**
   * Get web form statistics
   */
  getStats: async (): Promise<WebFormStats> => {
    const response = await client.get<any>('/web-forms/stats');
    // Transform backend format to frontend expected format
    const data = response.data;
    return {
      total: data.forms?.total ?? data.total ?? 0,
      active: data.forms?.active ?? data.active ?? 0,
      totalSubmissions: data.submissions?.total ?? data.totalSubmissions ?? 0,
      averageConversionRate: data.averageConversionRate ?? 0,
    };
  },

  /**
   * Get a single web form by ID
   */
  getById: async (id: string): Promise<WebForm> => {
    const response = await client.get<WebForm>(`/web-forms/${id}`);
    return response.data;
  },

  /**
   * Create a new web form
   */
  create: async (data: CreateWebFormDto): Promise<WebForm> => {
    const response = await client.post<WebForm>('/web-forms', data);
    return response.data;
  },

  /**
   * Update a web form
   */
  update: async (id: string, data: UpdateWebFormDto): Promise<WebForm> => {
    const response = await client.patch<WebForm>(`/web-forms/${id}`, data);
    return response.data;
  },

  /**
   * Delete a web form
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/web-forms/${id}`);
  },

  /**
   * Activate a web form
   */
  activate: async (id: string): Promise<WebForm> => {
    const response = await client.post<WebForm>(`/web-forms/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate a web form
   */
  deactivate: async (id: string): Promise<WebForm> => {
    const response = await client.post<WebForm>(`/web-forms/${id}/deactivate`);
    return response.data;
  },

  /**
   * Get embed code for a web form
   */
  getEmbedCode: async (id: string): Promise<WebFormEmbedCode> => {
    const response = await client.get<WebFormEmbedCode>(`/web-forms/${id}/embed-code`);
    return response.data;
  },

  /**
   * Get submissions for a web form
   */
  getSubmissions: async (
    formId: string,
    filters?: WebFormSubmissionFilters
  ): Promise<WebFormSubmission[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<WebFormSubmission[]>(
      `/web-forms/${formId}/submissions?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Clone a web form
   */
  clone: async (id: string, name?: string): Promise<WebForm> => {
    const response = await client.post<WebForm>(`/web-forms/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Check if slug is available
   */
  checkSlugAvailability: async (slug: string): Promise<{ available: boolean }> => {
    const response = await client.get<{ available: boolean }>(
      `/web-forms/check-slug?slug=${encodeURIComponent(slug)}`
    );
    return response.data;
  },
};

// Public API (no authentication required)
export const publicWebFormsApi = {
  /**
   * Get public form definition by slug
   */
  getBySlug: async (slug: string): Promise<PublicWebForm> => {
    const response = await client.get<PublicWebForm>(`/public/forms/${slug}`);
    return response.data;
  },

  /**
   * Submit a web form
   */
  submit: async (slug: string, data: SubmitWebFormDto): Promise<SubmitWebFormResult> => {
    const response = await client.post<SubmitWebFormResult>(`/public/forms/${slug}/submit`, data);
    return response.data;
  },
};

export default webFormsApi;
