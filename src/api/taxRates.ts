import client from './client';
import type {
  TaxRate,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxRateStats,
  TaxType,
  QueryFilters,
} from '../types';

export interface TaxRateFilters extends QueryFilters {
  country?: string;
  region?: string;
  taxType?: TaxType;
  isActive?: boolean;
  isDefault?: boolean;
}

export const taxRatesApi = {
  /**
   * Get all tax rates
   */
  getAll: async (filters?: TaxRateFilters): Promise<TaxRate[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<TaxRate[]>(`/tax-rates?${params.toString()}`);
    return response.data;
  },

  /**
   * Get tax rate statistics
   */
  getStats: async (): Promise<TaxRateStats> => {
    const response = await client.get<TaxRateStats>('/tax-rates/stats');
    return response.data;
  },

  /**
   * Get a single tax rate by ID
   */
  getById: async (id: string): Promise<TaxRate> => {
    const response = await client.get<TaxRate>(`/tax-rates/${id}`);
    return response.data;
  },

  /**
   * Get default tax rate for a location
   */
  getDefault: async (country: string, region?: string): Promise<TaxRate | null> => {
    const params = new URLSearchParams({ country });
    if (region) params.append('region', region);
    const response = await client.get<TaxRate | null>(`/tax-rates/default?${params.toString()}`);
    return response.data;
  },

  /**
   * Create a new tax rate
   */
  create: async (data: CreateTaxRateDto): Promise<TaxRate> => {
    const response = await client.post<TaxRate>('/tax-rates', data);
    return response.data;
  },

  /**
   * Update a tax rate
   */
  update: async (id: string, data: UpdateTaxRateDto): Promise<TaxRate> => {
    const response = await client.patch<TaxRate>(`/tax-rates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a tax rate
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/tax-rates/${id}`);
  },

  /**
   * Calculate tax for an address
   */
  calculate: async (data: TaxCalculationRequest): Promise<TaxCalculationResult> => {
    const response = await client.post<TaxCalculationResult>('/tax-rates/calculate', data);
    return response.data;
  },

  /**
   * Set a tax rate as default for its location
   */
  setAsDefault: async (id: string): Promise<TaxRate> => {
    const response = await client.post<TaxRate>(`/tax-rates/${id}/set-default`);
    return response.data;
  },

  /**
   * Toggle tax rate active status
   */
  toggleActive: async (id: string): Promise<TaxRate> => {
    const response = await client.post<TaxRate>(`/tax-rates/${id}/toggle-active`);
    return response.data;
  },

  /**
   * Get tax rates for a specific country
   */
  getByCountry: async (country: string): Promise<TaxRate[]> => {
    const response = await client.get<TaxRate[]>(`/tax-rates/country/${country}`);
    return response.data;
  },

  /**
   * Bulk import tax rates
   */
  bulkImport: async (rates: CreateTaxRateDto[]): Promise<{ created: number; updated: number }> => {
    const response = await client.post<{ created: number; updated: number }>('/tax-rates/bulk-import', { rates });
    return response.data;
  },
};

export default taxRatesApi;
