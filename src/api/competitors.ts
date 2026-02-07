import client from './client';
import type {
  Competitor,
  CompetitorProduct,
  Battlecard,
  OpportunityCompetitor,
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CreateCompetitorProductDto,
  CreateBattlecardDto,
  UpdateBattlecardDto,
  LinkOpportunityCompetitorDto,
  CompetitorStats,
  WinLossAnalytics,
  CompetitorTier,
  CompetitorStatus,
} from '../types/competitor';

export interface CompetitorFilters {
  tier?: CompetitorTier;
  status?: CompetitorStatus;
  search?: string;
}

export interface WinLossFilters {
  competitorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const competitorsApi = {
  // ============================================
  // Competitors CRUD
  // ============================================

  /**
   * Get all competitors
   */
  getAll: async (filters?: CompetitorFilters): Promise<Competitor[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Competitor[]>(`/competitors?${params.toString()}`);
    return response.data;
  },

  /**
   * Get competitor statistics
   */
  getStats: async (): Promise<CompetitorStats> => {
    const response = await client.get<CompetitorStats>('/competitors/stats');
    return response.data;
  },

  /**
   * Get a single competitor by ID
   */
  getById: async (id: string): Promise<Competitor> => {
    const response = await client.get<Competitor>(`/competitors/${id}`);
    return response.data;
  },

  /**
   * Create a new competitor
   */
  create: async (data: CreateCompetitorDto): Promise<Competitor> => {
    const response = await client.post<Competitor>('/competitors', data);
    return response.data;
  },

  /**
   * Update a competitor
   */
  update: async (id: string, data: UpdateCompetitorDto): Promise<Competitor> => {
    const response = await client.patch<Competitor>(`/competitors/${id}`, data);
    return response.data;
  },

  /**
   * Delete a competitor
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/competitors/${id}`);
  },

  // ============================================
  // Competitor Products
  // ============================================

  /**
   * Get competitor products
   */
  getProducts: async (competitorId: string): Promise<CompetitorProduct[]> => {
    const response = await client.get<CompetitorProduct[]>(
      `/competitors/${competitorId}/products`
    );
    return response.data;
  },

  /**
   * Add a competitor product
   */
  addProduct: async (
    competitorId: string,
    data: CreateCompetitorProductDto
  ): Promise<CompetitorProduct> => {
    const response = await client.post<CompetitorProduct>(
      `/competitors/${competitorId}/products`,
      data
    );
    return response.data;
  },

  /**
   * Update a competitor product
   */
  updateProduct: async (
    competitorId: string,
    productId: string,
    data: Partial<CreateCompetitorProductDto>
  ): Promise<CompetitorProduct> => {
    const response = await client.patch<CompetitorProduct>(
      `/competitors/${competitorId}/products/${productId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a competitor product
   */
  deleteProduct: async (competitorId: string, productId: string): Promise<void> => {
    await client.delete(`/competitors/${competitorId}/products/${productId}`);
  },

  // ============================================
  // Battlecards
  // ============================================

  /**
   * Get battlecards for a competitor
   */
  getBattlecards: async (competitorId: string, activeOnly = true): Promise<Battlecard[]> => {
    const response = await client.get<Battlecard[]>(
      `/competitors/${competitorId}/battlecards?activeOnly=${activeOnly}`
    );
    return response.data;
  },

  /**
   * Create a battlecard
   */
  createBattlecard: async (
    competitorId: string,
    data: CreateBattlecardDto
  ): Promise<Battlecard> => {
    const response = await client.post<Battlecard>(
      `/competitors/${competitorId}/battlecards`,
      data
    );
    return response.data;
  },

  /**
   * Update a battlecard
   */
  updateBattlecard: async (
    battlecardId: string,
    data: UpdateBattlecardDto
  ): Promise<Battlecard> => {
    const response = await client.patch<Battlecard>(`/battlecards/${battlecardId}`, data);
    return response.data;
  },

  /**
   * Delete a battlecard
   */
  deleteBattlecard: async (battlecardId: string): Promise<void> => {
    await client.delete(`/battlecards/${battlecardId}`);
  },

  // ============================================
  // Opportunity Competitors
  // ============================================

  /**
   * Get competitors linked to an opportunity
   */
  getOpportunityCompetitors: async (opportunityId: string): Promise<OpportunityCompetitor[]> => {
    const response = await client.get<OpportunityCompetitor[]>(
      `/opportunities/${opportunityId}/competitors`
    );
    return response.data;
  },

  /**
   * Link a competitor to an opportunity
   */
  linkCompetitor: async (
    opportunityId: string,
    data: LinkOpportunityCompetitorDto
  ): Promise<OpportunityCompetitor> => {
    const response = await client.post<OpportunityCompetitor>(
      `/opportunities/${opportunityId}/competitors`,
      data
    );
    return response.data;
  },

  /**
   * Update an opportunity competitor link
   */
  updateOpportunityCompetitor: async (
    opportunityId: string,
    competitorId: string,
    data: Partial<LinkOpportunityCompetitorDto>
  ): Promise<OpportunityCompetitor> => {
    const response = await client.patch<OpportunityCompetitor>(
      `/opportunities/${opportunityId}/competitors/${competitorId}`,
      data
    );
    return response.data;
  },

  /**
   * Unlink a competitor from an opportunity
   */
  unlinkCompetitor: async (opportunityId: string, competitorId: string): Promise<void> => {
    await client.delete(`/opportunities/${opportunityId}/competitors/${competitorId}`);
  },

  /**
   * Mark a competitor as the winner (for close-lost deals)
   */
  markCompetitorAsWinner: async (
    opportunityId: string,
    competitorId: string,
    lossReasons?: string[]
  ): Promise<OpportunityCompetitor> => {
    const response = await client.post<OpportunityCompetitor>(
      `/opportunities/${opportunityId}/competitors/${competitorId}/mark-winner`,
      { lossReasons }
    );
    return response.data;
  },

  // ============================================
  // Analytics
  // ============================================

  /**
   * Get win/loss analytics by competitor
   */
  getWinLossAnalytics: async (filters?: WinLossFilters): Promise<WinLossAnalytics[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<WinLossAnalytics[]>(
      `/competitors/analytics/win-loss?${params.toString()}`
    );
    return response.data;
  },

  // ============================================
  // AI Features
  // ============================================

  /**
   * Generate AI-powered battlecard for a competitor
   * Returns cached version if available, unless regenerate=true
   */
  generateBattlecard: async (competitorId: string, regenerate = false): Promise<{
    title: string;
    overview: string;
    keyTalkingPoints: string[];
    objectionHandling: { objection: string; response: string }[];
    trapQuestions: string[];
    winThemes: string[];
    differentiators: string[];
    cached: boolean;
    generatedAt: string;
  }> => {
    const response = await client.post(`/competitors/${competitorId}/ai/generate-battlecard`, { regenerate });
    return response.data;
  },

  /**
   * Analyze win/loss patterns against a competitor
   * Returns cached version if available (up to 7 days old), unless regenerate=true
   */
  analyzeWinLossPatterns: async (competitorId: string, regenerate = false): Promise<{
    insights: { pattern: string; frequency: number; recommendation: string; confidence: number }[];
    summary: string;
    recommendations: string[];
    cached: boolean;
    generatedAt: string | null;
  }> => {
    const response = await client.get(`/competitors/${competitorId}/ai/win-loss-patterns?regenerate=${regenerate}`);
    return response.data;
  },

  /**
   * Generate AI response to a competitive objection
   */
  generateObjectionResponse: async (
    competitorId: string,
    objection: string
  ): Promise<{
    response: string;
    alternativeResponses: string[];
    proofPoints: string[];
    followUpQuestions: string[];
  }> => {
    const response = await client.post(`/competitors/${competitorId}/ai/objection-response`, {
      objection,
    });
    return response.data;
  },

  /**
   * Get competitive positioning recommendations for an opportunity
   */
  getPositioningRecommendations: async (opportunityId: string): Promise<{
    scenario: string;
    positioning: string;
    talkingPoints: string[];
    avoidTopics: string[];
  }[]> => {
    const response = await client.get(`/opportunities/${opportunityId}/ai/competitive-positioning`);
    return response.data;
  },

  /**
   * Analyze a call transcript for competitive mentions
   */
  analyzeCompetitiveCall: async (transcript: string): Promise<{
    competitorsMentioned: { name: string; context: string; sentiment: string }[];
    coachingPoints: string[];
    missedOpportunities: string[];
    effectiveTactics: string[];
  }> => {
    const response = await client.post('/competitors/ai/analyze-call', { transcript });
    return response.data;
  },
};
