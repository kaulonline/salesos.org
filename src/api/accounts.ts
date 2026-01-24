import client from './client';
import type {
  Account,
  CreateAccountDto,
  UpdateAccountDto,
  AccountStats,
  AccountHierarchy,
  AccountRevenue,
  QueryFilters,
} from '../types';

export interface AccountFilters extends QueryFilters {
  type?: string;
  status?: string;
  industry?: string;
  ownerId?: string;
}

export const accountsApi = {
  /**
   * Get all accounts with optional filters
   */
  getAll: async (filters?: AccountFilters): Promise<Account[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Account[]>(`/accounts?${params.toString()}`);
    return response.data;
  },

  /**
   * Get account statistics
   */
  getStats: async (): Promise<AccountStats> => {
    const response = await client.get<AccountStats>('/accounts/stats');
    return response.data;
  },

  /**
   * Get a single account by ID
   */
  getById: async (id: string): Promise<Account> => {
    const response = await client.get<Account>(`/accounts/${id}`);
    return response.data;
  },

  /**
   * Get account hierarchy (parent/children)
   */
  getHierarchy: async (id: string): Promise<AccountHierarchy> => {
    const response = await client.get<AccountHierarchy>(`/accounts/${id}/hierarchy`);
    return response.data;
  },

  /**
   * Get account revenue analytics
   */
  getRevenue: async (id: string): Promise<AccountRevenue> => {
    const response = await client.get<AccountRevenue>(`/accounts/${id}/revenue`);
    return response.data;
  },

  /**
   * Create a new account
   */
  create: async (data: CreateAccountDto): Promise<Account> => {
    const response = await client.post<Account>('/accounts', data);
    return response.data;
  },

  /**
   * Update an account
   */
  update: async (id: string, data: UpdateAccountDto): Promise<Account> => {
    const response = await client.patch<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  /**
   * Delete an account
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/accounts/${id}`);
  },

  // Bulk Operations
  bulkUpdate: async (ids: string[], updates: Partial<Account>): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/accounts/bulk/update', { ids, updates });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/accounts/bulk/delete', { ids });
    return response.data;
  },

  bulkAssign: async (ids: string[], newOwnerId: string): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>('/accounts/bulk/assign', { ids, newOwnerId });
    return response.data;
  },
};

export default accountsApi;
