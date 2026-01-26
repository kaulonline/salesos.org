import client from './client';
import type {
  QuoteVersion,
  QuoteVersionComparison,
  CreateQuoteVersionDto,
  RestoreVersionDto,
  CompareVersionsDto,
  QuoteVersionStats,
  QueryFilters,
} from '../types';

export interface QuoteVersionFilters extends QueryFilters {
  createdById?: string;
  fromDate?: string;
  toDate?: string;
}

export const quoteVersionsApi = {
  /**
   * Get all versions for a quote
   */
  getVersions: async (quoteId: string, filters?: QuoteVersionFilters): Promise<QuoteVersion[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<QuoteVersion[]>(`/quotes/${quoteId}/versions?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a specific version
   */
  getVersion: async (quoteId: string, versionId: string): Promise<QuoteVersion> => {
    const response = await client.get<QuoteVersion>(`/quotes/${quoteId}/versions/${versionId}`);
    return response.data;
  },

  /**
   * Get the latest version
   */
  getLatestVersion: async (quoteId: string): Promise<QuoteVersion | null> => {
    const response = await client.get<QuoteVersion | null>(`/quotes/${quoteId}/versions/latest`);
    return response.data;
  },

  /**
   * Get version by number
   */
  getVersionByNumber: async (quoteId: string, versionNumber: number): Promise<QuoteVersion> => {
    const response = await client.get<QuoteVersion>(`/quotes/${quoteId}/versions/number/${versionNumber}`);
    return response.data;
  },

  /**
   * Create a new version snapshot
   */
  createVersion: async (quoteId: string, data?: CreateQuoteVersionDto): Promise<QuoteVersion> => {
    const response = await client.post<QuoteVersion>(`/quotes/${quoteId}/versions`, data || {});
    return response.data;
  },

  /**
   * Restore quote to a previous version
   */
  restoreVersion: async (quoteId: string, data: RestoreVersionDto): Promise<QuoteVersion> => {
    const response = await client.post<QuoteVersion>(`/quotes/${quoteId}/versions/restore`, data);
    return response.data;
  },

  /**
   * Compare two versions
   */
  compareVersions: async (quoteId: string, data: CompareVersionsDto): Promise<QuoteVersionComparison> => {
    const response = await client.post<QuoteVersionComparison>(`/quotes/${quoteId}/versions/compare`, data);
    return response.data;
  },

  /**
   * Get version statistics
   */
  getStats: async (): Promise<QuoteVersionStats> => {
    const response = await client.get<QuoteVersionStats>('/quote-versions/stats');
    return response.data;
  },

  /**
   * Get version count for a quote
   */
  getVersionCount: async (quoteId: string): Promise<number> => {
    const response = await client.get<{ count: number }>(`/quotes/${quoteId}/versions/count`);
    return response.data.count;
  },

  /**
   * Delete a version (admin only, typically not exposed)
   */
  deleteVersion: async (quoteId: string, versionId: string): Promise<void> => {
    await client.delete(`/quotes/${quoteId}/versions/${versionId}`);
  },

  /**
   * Get changes between current quote and a version
   */
  getChangesSinceVersion: async (quoteId: string, versionId: string): Promise<QuoteVersionComparison> => {
    const response = await client.get<QuoteVersionComparison>(
      `/quotes/${quoteId}/versions/${versionId}/changes-since`
    );
    return response.data;
  },
};

export default quoteVersionsApi;
