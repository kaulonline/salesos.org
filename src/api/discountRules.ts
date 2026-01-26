import client from './client';
import type {
  DiscountRule,
  CreateDiscountRuleDto,
  UpdateDiscountRuleDto,
  ApplyDiscountDto,
  DiscountValidationResult,
  DiscountRuleStats,
  DiscountRuleType,
  QueryFilters,
} from '../types';

export interface DiscountRuleFilters extends QueryFilters {
  type?: DiscountRuleType;
  isActive?: boolean;
  includeExpired?: boolean;
}

export const discountRulesApi = {
  /**
   * Get all discount rules
   */
  getAll: async (filters?: DiscountRuleFilters): Promise<DiscountRule[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<DiscountRule[]>(`/discount-rules?${params.toString()}`);
    return response.data;
  },

  /**
   * Get discount rule statistics
   */
  getStats: async (): Promise<DiscountRuleStats> => {
    const response = await client.get<DiscountRuleStats>('/discount-rules/stats');
    return response.data;
  },

  /**
   * Get a single discount rule by ID
   */
  getById: async (id: string): Promise<DiscountRule> => {
    const response = await client.get<DiscountRule>(`/discount-rules/${id}`);
    return response.data;
  },

  /**
   * Get discount rule by promo code
   */
  getByCode: async (code: string): Promise<DiscountRule | null> => {
    const response = await client.get<DiscountRule | null>(`/discount-rules/code/${code}`);
    return response.data;
  },

  /**
   * Create a new discount rule
   */
  create: async (data: CreateDiscountRuleDto): Promise<DiscountRule> => {
    const response = await client.post<DiscountRule>('/discount-rules', data);
    return response.data;
  },

  /**
   * Update a discount rule
   */
  update: async (id: string, data: UpdateDiscountRuleDto): Promise<DiscountRule> => {
    const response = await client.patch<DiscountRule>(`/discount-rules/${id}`, data);
    return response.data;
  },

  /**
   * Delete a discount rule
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/discount-rules/${id}`);
  },

  /**
   * Validate a promo code for a quote
   */
  validateCode: async (code: string, quoteId: string): Promise<DiscountValidationResult> => {
    const response = await client.post<DiscountValidationResult>('/discount-rules/validate', {
      code,
      quoteId,
    });
    return response.data;
  },

  /**
   * Apply a discount rule to a quote
   */
  applyToQuote: async (data: ApplyDiscountDto): Promise<DiscountValidationResult> => {
    const response = await client.post<DiscountValidationResult>('/discount-rules/apply', data);
    return response.data;
  },

  /**
   * Remove applied discount from a quote
   */
  removeFromQuote: async (quoteId: string, ruleId: string): Promise<void> => {
    await client.delete(`/discount-rules/quotes/${quoteId}/rules/${ruleId}`);
  },

  /**
   * Get applicable discount rules for a quote
   */
  getApplicableRules: async (quoteId: string): Promise<DiscountRule[]> => {
    const response = await client.get<DiscountRule[]>(`/discount-rules/applicable/${quoteId}`);
    return response.data;
  },

  /**
   * Clone a discount rule
   */
  clone: async (id: string, name: string): Promise<DiscountRule> => {
    const response = await client.post<DiscountRule>(`/discount-rules/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Toggle discount rule active status
   */
  toggleActive: async (id: string): Promise<DiscountRule> => {
    const response = await client.post<DiscountRule>(`/discount-rules/${id}/toggle-active`);
    return response.data;
  },
};

export default discountRulesApi;
