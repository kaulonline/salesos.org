import client from './client';
import type {
  ApiKey,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyCreateResponse,
  ApiKeyUsageStats,
  QueryFilters,
} from '../types';

export interface ApiKeyFilters extends QueryFilters {
  status?: 'ACTIVE' | 'INACTIVE' | 'REVOKED' | 'EXPIRED';
}

export const apiKeysApi = {
  /**
   * Get all API keys
   */
  getAll: async (filters?: ApiKeyFilters): Promise<ApiKey[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<ApiKey[]>(`/api-keys?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single API key by ID
   */
  getById: async (id: string): Promise<ApiKey> => {
    const response = await client.get<ApiKey>(`/api-keys/${id}`);
    return response.data;
  },

  /**
   * Create a new API key
   */
  create: async (data: CreateApiKeyDto): Promise<ApiKeyCreateResponse> => {
    const response = await client.post<ApiKeyCreateResponse>('/api-keys', data);
    return response.data;
  },

  /**
   * Update an API key
   */
  update: async (id: string, data: UpdateApiKeyDto): Promise<ApiKey> => {
    const response = await client.patch<ApiKey>(`/api-keys/${id}`, data);
    return response.data;
  },

  /**
   * Delete an API key
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/api-keys/${id}`);
  },

  /**
   * Revoke an API key
   */
  revoke: async (id: string): Promise<ApiKey> => {
    const response = await client.post<ApiKey>(`/api-keys/${id}/revoke`);
    return response.data;
  },

  /**
   * Regenerate an API key (creates new secret)
   */
  regenerate: async (id: string): Promise<ApiKeyCreateResponse> => {
    const response = await client.post<ApiKeyCreateResponse>(`/api-keys/${id}/regenerate`);
    return response.data;
  },

  /**
   * Get usage statistics for all API keys
   */
  getUsage: async (dateFrom?: string, dateTo?: string): Promise<ApiKeyUsageStats> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const response = await client.get<ApiKeyUsageStats>(`/api-keys/usage?${params.toString()}`);
    return response.data;
  },

  /**
   * Get usage statistics for a specific API key
   */
  getKeyUsage: async (id: string, dateFrom?: string, dateTo?: string): Promise<ApiKeyUsageStats> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const response = await client.get<ApiKeyUsageStats>(`/api-keys/${id}/usage?${params.toString()}`);
    return response.data;
  },

  /**
   * Test an API key
   */
  test: async (id: string): Promise<{ valid: boolean; scopes: string[] }> => {
    const response = await client.post<{ valid: boolean; scopes: string[] }>(`/api-keys/${id}/test`);
    return response.data;
  },
};

export default apiKeysApi;
