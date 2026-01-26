import client from './client';
import type {
  Webhook,
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookLog,
  WebhookTestResult,
  WebhookStats,
  WebhookEvent,
  QueryFilters,
} from '../types';

export interface WebhookFilters extends QueryFilters {
  status?: 'ACTIVE' | 'INACTIVE' | 'FAILING';
  event?: WebhookEvent;
}

export interface WebhookLogFilters extends QueryFilters {
  success?: boolean;
  event?: WebhookEvent;
  dateFrom?: string;
  dateTo?: string;
}

export const webhooksApi = {
  /**
   * Get all webhooks
   */
  getAll: async (filters?: WebhookFilters): Promise<Webhook[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Webhook[]>(`/webhooks?${params.toString()}`);
    return response.data;
  },

  /**
   * Get webhook statistics
   */
  getStats: async (): Promise<WebhookStats> => {
    const response = await client.get<WebhookStats>('/webhooks/stats');
    return response.data;
  },

  /**
   * Get a single webhook by ID
   */
  getById: async (id: string): Promise<Webhook> => {
    const response = await client.get<Webhook>(`/webhooks/${id}`);
    return response.data;
  },

  /**
   * Create a new webhook
   */
  create: async (data: CreateWebhookDto): Promise<Webhook> => {
    const response = await client.post<Webhook>('/webhooks', data);
    return response.data;
  },

  /**
   * Update a webhook
   */
  update: async (id: string, data: UpdateWebhookDto): Promise<Webhook> => {
    const response = await client.patch<Webhook>(`/webhooks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a webhook
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/webhooks/${id}`);
  },

  /**
   * Activate a webhook
   */
  activate: async (id: string): Promise<Webhook> => {
    const response = await client.post<Webhook>(`/webhooks/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate a webhook
   */
  deactivate: async (id: string): Promise<Webhook> => {
    const response = await client.post<Webhook>(`/webhooks/${id}/deactivate`);
    return response.data;
  },

  /**
   * Test a webhook with sample payload
   */
  test: async (id: string, event?: WebhookEvent): Promise<WebhookTestResult> => {
    const response = await client.post<WebhookTestResult>(`/webhooks/${id}/test`, { event });
    return response.data;
  },

  /**
   * Get logs for a webhook
   */
  getLogs: async (webhookId: string, filters?: WebhookLogFilters): Promise<WebhookLog[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<WebhookLog[]>(
      `/webhooks/${webhookId}/logs?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Retry a failed webhook delivery
   */
  retryDelivery: async (webhookId: string, logId: string): Promise<WebhookLog> => {
    const response = await client.post<WebhookLog>(`/webhooks/${webhookId}/logs/${logId}/retry`);
    return response.data;
  },

  /**
   * Get available webhook events
   */
  getAvailableEvents: async (): Promise<{ event: WebhookEvent; label: string; description: string }[]> => {
    const response = await client.get<{ event: WebhookEvent; label: string; description: string }[]>(
      '/webhooks/events'
    );
    return response.data;
  },

  /**
   * Reset webhook failure count
   */
  resetFailures: async (id: string): Promise<Webhook> => {
    const response = await client.post<Webhook>(`/webhooks/${id}/reset-failures`);
    return response.data;
  },

  /**
   * Regenerate webhook secret
   */
  regenerateSecret: async (id: string): Promise<{ secret: string }> => {
    const response = await client.post<{ secret: string }>(`/webhooks/${id}/regenerate-secret`);
    return response.data;
  },
};

export default webhooksApi;
