import client from './client';
import type {
  Territory,
  TerritoryAccount,
  TerritoryStats,
  CreateTerritoryDto,
  UpdateTerritoryDto,
  AssignAccountsDto,
} from '../types/territory';

export const territoriesApi = {
  /**
   * Get all territories
   */
  getAll: async (): Promise<Territory[]> => {
    const response = await client.get<Territory[]>('/territories');
    return response.data;
  },

  /**
   * Get a single territory by ID
   */
  getById: async (id: string): Promise<Territory> => {
    const response = await client.get<Territory>(`/territories/${id}`);
    return response.data;
  },

  /**
   * Get territory statistics
   */
  getStats: async (): Promise<TerritoryStats> => {
    const response = await client.get<TerritoryStats>('/territories/stats');
    return response.data;
  },

  /**
   * Create a new territory
   */
  create: async (data: CreateTerritoryDto): Promise<Territory> => {
    const response = await client.post<Territory>('/territories', data);
    return response.data;
  },

  /**
   * Update a territory
   */
  update: async (id: string, data: UpdateTerritoryDto): Promise<Territory> => {
    const response = await client.patch<Territory>(`/territories/${id}`, data);
    return response.data;
  },

  /**
   * Delete a territory
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/territories/${id}`);
  },

  /**
   * Get accounts assigned to a territory
   */
  getAccounts: async (id: string): Promise<TerritoryAccount[]> => {
    const response = await client.get<TerritoryAccount[]>(`/territories/${id}/accounts`);
    return response.data;
  },

  /**
   * Assign accounts to a territory
   */
  assignAccounts: async (id: string, data: AssignAccountsDto): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>(`/territories/${id}/accounts`, data);
    return response.data;
  },

  /**
   * Remove an account from a territory
   */
  removeAccount: async (territoryId: string, accountId: string): Promise<void> => {
    await client.delete(`/territories/${territoryId}/accounts/${accountId}`);
  },

  /**
   * Auto-assign accounts based on territory criteria
   */
  autoAssign: async (id: string): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>(`/territories/${id}/auto-assign`);
    return response.data;
  },

  /**
   * Recalculate territory performance metrics
   */
  recalculate: async (id: string): Promise<{ success: boolean }> => {
    const response = await client.post<{ success: boolean }>(`/territories/${id}/recalculate`);
    return response.data;
  },
};

export default territoriesApi;
