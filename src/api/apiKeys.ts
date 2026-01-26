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
    // Backend returns different field names, transform to frontend format
    const response = await client.get<Array<{
      id: string;
      name: string;
      description?: string;
      keyPrefix: string;
      scopes: string[];
      rateLimit: number;
      rateLimitWindow: number;
      ipWhitelist?: string[];
      status: string;
      expiresAt?: string | null;
      lastUsedAt?: string | null;
      usageCount: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/api-keys?${params.toString()}`);

    return response.data.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes as ApiKey['scopes'],
      status: key.status as ApiKey['status'],
      rateLimitPerMinute: key.rateLimit,
      rateLimitPerDay: key.rateLimit * 60 * 24,
      allowedIps: key.ipWhitelist,
      expiresAt: key.expiresAt || undefined,
      lastUsedAt: key.lastUsedAt || undefined,
      usageCount: key.usageCount,
      usageCountToday: 0,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));
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
    // Backend returns flat object with 'key' field, transform to expected format
    const response = await client.post<{
      id: string;
      name: string;
      key: string;
      keyPrefix: string;
      scopes: string[];
      rateLimit: number;
      rateLimitWindow: number;
      expiresAt: string | null;
      createdAt: string;
      message: string;
    }>('/api-keys', data);

    const { key, ...apiKeyData } = response.data;
    return {
      apiKey: {
        ...apiKeyData,
        description: '',
        status: 'ACTIVE' as const,
        rateLimitPerMinute: apiKeyData.rateLimit,
        rateLimitPerDay: apiKeyData.rateLimit * 60 * 24,
        usageCount: 0,
        usageCountToday: 0,
        updatedAt: apiKeyData.createdAt,
      },
      secretKey: key,
    };
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
    // Backend returns { id, key, keyPrefix, message }
    const response = await client.post<{
      id: string;
      key: string;
      keyPrefix: string;
      message: string;
    }>(`/api-keys/${id}/regenerate`);

    return {
      apiKey: {
        id: response.data.id,
        name: '',
        keyPrefix: response.data.keyPrefix,
        scopes: [],
        status: 'ACTIVE' as const,
        rateLimitPerMinute: 60,
        rateLimitPerDay: 10000,
        usageCount: 0,
        usageCountToday: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      secretKey: response.data.key,
    };
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
