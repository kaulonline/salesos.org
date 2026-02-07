import client from './client';
import type {
  Asset,
  SupportContract,
  CreateAssetDto,
  UpdateAssetDto,
  CreateSupportContractDto,
  UpdateSupportContractDto,
  AssetStats,
  ContractStats,
  AccountAssetSummary,
  ExpiringAssetsResponse,
  RenewalPipelineResponse,
  AssetStatus,
  ContractStatus,
} from '../types/asset';

export interface AssetFilters {
  accountId?: string;
  status?: AssetStatus;
  search?: string;
  expiringDays?: number;
}

export interface ContractFilters {
  accountId?: string;
  status?: ContractStatus;
  expiringDays?: number;
}

export const assetsApi = {
  // ============================================
  // Assets CRUD
  // ============================================

  /**
   * Get all assets
   */
  getAll: async (filters?: AssetFilters): Promise<Asset[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Asset[]>(`/assets?${params.toString()}`);
    return response.data;
  },

  /**
   * Get asset statistics
   */
  getStats: async (): Promise<AssetStats> => {
    const response = await client.get<AssetStats>('/assets/stats');
    return response.data;
  },

  /**
   * Get expiring assets
   */
  getExpiring: async (days = 90): Promise<ExpiringAssetsResponse> => {
    const response = await client.get<ExpiringAssetsResponse>(`/assets/expiring?days=${days}`);
    return response.data;
  },

  /**
   * Get renewal pipeline
   */
  getRenewalPipeline: async (period = 'quarter'): Promise<RenewalPipelineResponse> => {
    const response = await client.get<RenewalPipelineResponse>(
      `/assets/renewal-pipeline?period=${period}`
    );
    return response.data;
  },

  /**
   * Get a single asset by ID
   */
  getById: async (id: string): Promise<Asset> => {
    const response = await client.get<Asset>(`/assets/${id}`);
    return response.data;
  },

  /**
   * Create a new asset
   */
  create: async (data: CreateAssetDto): Promise<Asset> => {
    const response = await client.post<Asset>('/assets', data);
    return response.data;
  },

  /**
   * Update an asset
   */
  update: async (id: string, data: UpdateAssetDto): Promise<Asset> => {
    const response = await client.patch<Asset>(`/assets/${id}`, data);
    return response.data;
  },

  /**
   * Delete an asset
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/assets/${id}`);
  },

  // ============================================
  // Account Assets
  // ============================================

  /**
   * Get assets for an account
   */
  getByAccount: async (accountId: string, status?: AssetStatus): Promise<Asset[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await client.get<Asset[]>(`/accounts/${accountId}/assets${params}`);
    return response.data;
  },

  /**
   * Get asset summary for an account
   */
  getAccountSummary: async (accountId: string): Promise<AccountAssetSummary> => {
    const response = await client.get<AccountAssetSummary>(
      `/accounts/${accountId}/assets/summary`
    );
    return response.data;
  },

  // ============================================
  // Support Contracts
  // ============================================

  /**
   * Get all support contracts
   */
  getAllContracts: async (filters?: ContractFilters): Promise<SupportContract[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<SupportContract[]>(
      `/support-contracts?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get support contract statistics
   */
  getContractStats: async (): Promise<ContractStats> => {
    const response = await client.get<ContractStats>('/support-contracts/stats');
    return response.data;
  },

  /**
   * Get a single support contract by ID
   */
  getContractById: async (id: string): Promise<SupportContract> => {
    const response = await client.get<SupportContract>(`/support-contracts/${id}`);
    return response.data;
  },

  /**
   * Create a new support contract
   */
  createContract: async (data: CreateSupportContractDto): Promise<SupportContract> => {
    const response = await client.post<SupportContract>('/support-contracts', data);
    return response.data;
  },

  /**
   * Update a support contract
   */
  updateContract: async (
    id: string,
    data: UpdateSupportContractDto
  ): Promise<SupportContract> => {
    const response = await client.patch<SupportContract>(`/support-contracts/${id}`, data);
    return response.data;
  },

  /**
   * Delete a support contract
   */
  deleteContract: async (id: string): Promise<void> => {
    await client.delete(`/support-contracts/${id}`);
  },

  /**
   * Assign assets to a contract
   */
  assignAssetsToContract: async (
    contractId: string,
    assetIds: string[]
  ): Promise<{ success: boolean; assignedCount: number }> => {
    const response = await client.post<{ success: boolean; assignedCount: number }>(
      `/support-contracts/${contractId}/assets`,
      { assetIds }
    );
    return response.data;
  },

  // ============================================
  // AI Features
  // ============================================

  /**
   * Calculate renewal risk scores for assets
   */
  calculateRenewalRisk: async (options?: {
    accountId?: string;
    daysAhead?: number;
  }): Promise<{
    assetId: string;
    assetName: string;
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskFactors: string[];
    recommendations: string[];
    predictedRenewalProbability: number;
  }[]> => {
    const params = new URLSearchParams();
    if (options?.accountId) params.append('accountId', options.accountId);
    if (options?.daysAhead) params.append('daysAhead', String(options.daysAhead));
    const response = await client.get(`/assets/ai/renewal-risk?${params.toString()}`);
    return response.data;
  },

  /**
   * Generate AI-powered upsell recommendations for an account
   */
  generateUpsellRecommendations: async (accountId: string): Promise<{
    accountId: string;
    accountName: string;
    recommendation: string;
    products: string[];
    estimatedValue: number;
    confidence: number;
    reasoning: string;
    nextSteps: string[];
  }[]> => {
    const response = await client.get(`/accounts/${accountId}/ai/upsell-recommendations`);
    return response.data;
  },

  /**
   * Calculate asset health score
   */
  calculateAssetHealth: async (assetId: string): Promise<{
    assetId: string;
    healthScore: number;
    healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
    issues: string[];
    recommendations: string[];
  }> => {
    const response = await client.get(`/assets/${assetId}/ai/health-score`);
    return response.data;
  },

  /**
   * Analyze license optimization opportunities
   */
  analyzeLicenseOptimization: async (accountId: string): Promise<{
    accountId: string;
    currentSeats: number;
    usedSeats: number;
    utilizationRate: number;
    recommendation: 'MAINTAIN' | 'DOWNSIZE' | 'EXPAND';
    suggestedSeats: number;
    annualSavingsOrCost: number;
    reasoning: string;
  }[]> => {
    const response = await client.get(`/accounts/${accountId}/ai/license-optimization`);
    return response.data;
  },

  /**
   * Generate personalized renewal message
   */
  generateRenewalMessage: async (
    assetId: string,
    style: 'formal' | 'friendly' | 'urgent' = 'friendly'
  ): Promise<{
    subject: string;
    body: string;
    callToAction: string;
  }> => {
    const response = await client.post(`/assets/${assetId}/ai/renewal-message`, { style });
    return response.data;
  },
};
