import client from './client';
import type {
  OpportunitySplit,
  CreateSplitDto,
  UpdateSplitDto,
  OpportunitySplitsResponse,
  UserSplitsResponse,
  SplitStats,
} from '../types/split';

export interface SplitFilters {
  status?: string;
  includeInForecast?: boolean;
  userId?: string;
}

export const splitsApi = {
  // ============================================
  // Opportunity Splits
  // ============================================

  /**
   * Get all splits for an opportunity
   */
  getOpportunitySplits: async (opportunityId: string): Promise<OpportunitySplitsResponse> => {
    const response = await client.get<OpportunitySplitsResponse>(
      `/opportunities/${opportunityId}/splits`
    );
    return response.data;
  },

  /**
   * Create a new split for an opportunity
   */
  createSplit: async (opportunityId: string, data: CreateSplitDto): Promise<OpportunitySplit> => {
    const response = await client.post<OpportunitySplit>(
      `/opportunities/${opportunityId}/splits`,
      data
    );
    return response.data;
  },

  /**
   * Update a split
   */
  updateSplit: async (
    opportunityId: string,
    splitId: string,
    data: UpdateSplitDto
  ): Promise<OpportunitySplit> => {
    const response = await client.patch<OpportunitySplit>(
      `/opportunities/${opportunityId}/splits/${splitId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a split
   */
  deleteSplit: async (opportunityId: string, splitId: string): Promise<void> => {
    await client.delete(`/opportunities/${opportunityId}/splits/${splitId}`);
  },

  /**
   * Approve a split
   */
  approveSplit: async (opportunityId: string, splitId: string): Promise<OpportunitySplit> => {
    const response = await client.post<OpportunitySplit>(
      `/opportunities/${opportunityId}/splits/${splitId}/approve`
    );
    return response.data;
  },

  /**
   * Reject a split
   */
  rejectSplit: async (
    opportunityId: string,
    splitId: string,
    reason?: string
  ): Promise<OpportunitySplit> => {
    const response = await client.post<OpportunitySplit>(
      `/opportunities/${opportunityId}/splits/${splitId}/reject`,
      { reason }
    );
    return response.data;
  },

  /**
   * Recalculate split amounts after opportunity amount changes
   */
  recalculateSplits: async (
    opportunityId: string
  ): Promise<{ success: boolean; updatedCount: number }> => {
    const response = await client.post<{ success: boolean; updatedCount: number }>(
      `/opportunities/${opportunityId}/splits/recalculate`
    );
    return response.data;
  },

  // ============================================
  // User Splits
  // ============================================

  /**
   * Get current user's splits
   */
  getMySplits: async (filters?: SplitFilters): Promise<UserSplitsResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeInForecast !== undefined) {
      params.append('includeInForecast', String(filters.includeInForecast));
    }
    const response = await client.get<UserSplitsResponse>(
      `/splits/my-splits?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get team splits (admin only)
   */
  getTeamSplits: async (filters?: SplitFilters): Promise<OpportunitySplit[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId);
    const response = await client.get<OpportunitySplit[]>(
      `/splits/team-splits?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get split statistics
   */
  getStats: async (): Promise<SplitStats> => {
    const response = await client.get<SplitStats>('/splits/stats');
    return response.data;
  },

  // ============================================
  // AI Features
  // ============================================

  /**
   * Get AI-suggested splits for an opportunity
   */
  suggestSplits: async (opportunityId: string): Promise<{
    userId: string;
    userName: string;
    suggestedPercent: number;
    splitType: string;
    reasoning: string;
    historicalBasis?: string;
  }[]> => {
    const response = await client.get(`/opportunities/${opportunityId}/splits/ai/suggest`);
    return response.data;
  },

  /**
   * Analyze quota impact of splits
   */
  analyzeQuotaImpact: async (opportunityId: string): Promise<{
    userId: string;
    userName: string;
    currentQuota: number;
    attainmentBefore: number;
    attainmentAfter: number;
    creditAmount: number;
    impactAssessment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  }[]> => {
    const response = await client.get(`/opportunities/${opportunityId}/splits/ai/quota-impact`);
    return response.data;
  },

  /**
   * Detect conflicts in split configuration
   */
  detectConflicts: async (opportunityId: string): Promise<{
    type: 'OVER_100' | 'DUPLICATE' | 'MISSING_PRIMARY' | 'UNUSUAL_PATTERN' | 'POLICY_VIOLATION';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    affectedUsers: string[];
    suggestedResolution: string;
  }[]> => {
    const response = await client.get(`/opportunities/${opportunityId}/splits/ai/conflicts`);
    return response.data;
  },

  /**
   * Get comprehensive split analytics
   */
  getAnalytics: async (opportunityId: string): Promise<{
    opportunityId: string;
    totalPercent: number;
    splitCount: number;
    conflicts: {
      type: string;
      severity: string;
      description: string;
      affectedUsers: string[];
      suggestedResolution: string;
    }[];
    suggestions: string[];
    complianceStatus: 'COMPLIANT' | 'NEEDS_REVIEW' | 'VIOLATION';
  }> => {
    const response = await client.get(`/opportunities/${opportunityId}/splits/ai/analytics`);
    return response.data;
  },

  /**
   * Get full AI recommendation for splits
   */
  getAIRecommendation: async (opportunityId: string): Promise<{
    recommendation: string;
    suggestedSplits: {
      userId: string;
      userName: string;
      suggestedPercent: number;
      splitType: string;
      reasoning: string;
    }[];
    confidence: number;
    reasoning: string;
  }> => {
    const response = await client.get(`/opportunities/${opportunityId}/splits/ai/recommendation`);
    return response.data;
  },
};
