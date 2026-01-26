import client from './client';
import type {
  PriceBook,
  CreatePriceBookDto,
  UpdatePriceBookDto,
  PriceBookEntry,
  CreatePriceBookEntryDto,
  UpdatePriceBookEntryDto,
  BulkCreatePriceBookEntriesDto,
  PriceBookStats,
  QueryFilters,
} from '../types';

export interface PriceBookFilters extends QueryFilters {
  isActive?: boolean;
  isStandard?: boolean;
  currency?: string;
}

export interface PriceBookEntryFilters extends QueryFilters {
  productId?: string;
  isActive?: boolean;
}

export const priceBooksApi = {
  /**
   * Get all price books
   */
  getAll: async (filters?: PriceBookFilters): Promise<PriceBook[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<PriceBook[]>(`/price-books?${params.toString()}`);
    return response.data;
  },

  /**
   * Get price book statistics
   */
  getStats: async (): Promise<PriceBookStats> => {
    const response = await client.get<PriceBookStats>('/price-books/stats');
    return response.data;
  },

  /**
   * Get a single price book by ID
   */
  getById: async (id: string): Promise<PriceBook> => {
    const response = await client.get<PriceBook>(`/price-books/${id}`);
    return response.data;
  },

  /**
   * Get standard price book
   */
  getStandard: async (): Promise<PriceBook> => {
    const response = await client.get<PriceBook>('/price-books/standard');
    return response.data;
  },

  /**
   * Create a new price book
   */
  create: async (data: CreatePriceBookDto): Promise<PriceBook> => {
    const response = await client.post<PriceBook>('/price-books', data);
    return response.data;
  },

  /**
   * Update a price book
   */
  update: async (id: string, data: UpdatePriceBookDto): Promise<PriceBook> => {
    const response = await client.patch<PriceBook>(`/price-books/${id}`, data);
    return response.data;
  },

  /**
   * Delete a price book
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/price-books/${id}`);
  },

  /**
   * Clone a price book
   */
  clone: async (id: string, name: string): Promise<PriceBook> => {
    const response = await client.post<PriceBook>(`/price-books/${id}/clone`, { name });
    return response.data;
  },

  // Price book entries
  /**
   * Get entries for a price book
   */
  getEntries: async (priceBookId: string, filters?: PriceBookEntryFilters): Promise<PriceBookEntry[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<PriceBookEntry[]>(
      `/price-books/${priceBookId}/entries?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Add entry to price book
   */
  addEntry: async (priceBookId: string, data: CreatePriceBookEntryDto): Promise<PriceBookEntry> => {
    const response = await client.post<PriceBookEntry>(`/price-books/${priceBookId}/entries`, data);
    return response.data;
  },

  /**
   * Bulk add entries to price book
   */
  bulkAddEntries: async (
    priceBookId: string,
    data: BulkCreatePriceBookEntriesDto
  ): Promise<{ count: number }> => {
    const response = await client.post<{ count: number }>(
      `/price-books/${priceBookId}/entries/bulk`,
      data
    );
    return response.data;
  },

  /**
   * Update a price book entry
   */
  updateEntry: async (
    priceBookId: string,
    entryId: string,
    data: UpdatePriceBookEntryDto
  ): Promise<PriceBookEntry> => {
    const response = await client.patch<PriceBookEntry>(
      `/price-books/${priceBookId}/entries/${entryId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a price book entry
   */
  deleteEntry: async (priceBookId: string, entryId: string): Promise<void> => {
    await client.delete(`/price-books/${priceBookId}/entries/${entryId}`);
  },

  /**
   * Get product price from a price book
   */
  getProductPrice: async (
    priceBookId: string,
    productId: string,
    quantity?: number
  ): Promise<PriceBookEntry | null> => {
    const params = quantity ? `?quantity=${quantity}` : '';
    const response = await client.get<PriceBookEntry | null>(
      `/price-books/${priceBookId}/products/${productId}/price${params}`
    );
    return response.data;
  },
};

export default priceBooksApi;
