import client from './client';
import type {
  Quote,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteLineItem,
  CreateQuoteLineItemDto,
  UpdateQuoteLineItemDto,
  SendQuoteDto,
  ApproveQuoteDto,
  RejectQuoteDto,
  QuoteStats,
  QuoteStatus,
  QuotePdfOptions,
  QueryFilters,
} from '../types';

export interface QuoteFilters extends QueryFilters {
  status?: QuoteStatus;
  opportunityId?: string;
  accountId?: string;
  ownerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const quotesApi = {
  /**
   * Get all quotes with optional filters
   */
  getAll: async (filters?: QuoteFilters): Promise<Quote[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Quote[]>(`/quotes?${params.toString()}`);
    return response.data;
  },

  /**
   * Get quote statistics
   */
  getStats: async (): Promise<QuoteStats> => {
    const response = await client.get<QuoteStats>('/quotes/stats');
    return response.data;
  },

  /**
   * Get a single quote by ID
   */
  getById: async (id: string): Promise<Quote> => {
    const response = await client.get<Quote>(`/quotes/${id}`);
    return response.data;
  },

  /**
   * Get quotes for an opportunity
   */
  getByOpportunity: async (opportunityId: string): Promise<Quote[]> => {
    const response = await client.get<Quote[]>(`/quotes?opportunityId=${opportunityId}`);
    return response.data;
  },

  /**
   * Create a new quote
   */
  create: async (data: CreateQuoteDto): Promise<Quote> => {
    const response = await client.post<Quote>('/quotes', data);
    return response.data;
  },

  /**
   * Create quote from opportunity
   */
  createFromOpportunity: async (opportunityId: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/from-opportunity/${opportunityId}`);
    return response.data;
  },

  /**
   * Update a quote
   */
  update: async (id: string, data: UpdateQuoteDto): Promise<Quote> => {
    const response = await client.patch<Quote>(`/quotes/${id}`, data);
    return response.data;
  },

  /**
   * Delete a quote
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/quotes/${id}`);
  },

  /**
   * Clone a quote
   */
  clone: async (id: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/clone`);
    return response.data;
  },

  // Line item management
  /**
   * Add line item to quote
   */
  addLineItem: async (quoteId: string, data: CreateQuoteLineItemDto): Promise<QuoteLineItem> => {
    const response = await client.post<QuoteLineItem>(`/quotes/${quoteId}/line-items`, data);
    return response.data;
  },

  /**
   * Update a line item
   */
  updateLineItem: async (
    _quoteId: string, // Not used in URL but kept for API consistency
    lineItemId: string,
    data: UpdateQuoteLineItemDto
  ): Promise<QuoteLineItem> => {
    const response = await client.patch<QuoteLineItem>(
      `/quotes/line-items/${lineItemId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a line item
   */
  deleteLineItem: async (_quoteId: string, lineItemId: string): Promise<void> => {
    await client.delete(`/quotes/line-items/${lineItemId}`);
  },

  /**
   * Reorder line items
   */
  reorderLineItems: async (quoteId: string, lineItemIds: string[]): Promise<void> => {
    await client.post(`/quotes/${quoteId}/line-items/reorder`, { lineItemIds });
  },

  // Quote actions
  /**
   * Send quote to recipient
   */
  send: async (id: string, data: SendQuoteDto): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/send`, data);
    return response.data;
  },

  /**
   * Submit quote for approval
   */
  submitForApproval: async (id: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/submit-for-approval`);
    return response.data;
  },

  /**
   * Approve a quote
   */
  approve: async (id: string, data?: ApproveQuoteDto): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/approve`, data || {});
    return response.data;
  },

  /**
   * Reject a quote
   */
  reject: async (id: string, data: RejectQuoteDto): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/reject`, data);
    return response.data;
  },

  /**
   * Mark quote as accepted (by customer)
   */
  markAccepted: async (id: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/accept`);
    return response.data;
  },

  /**
   * Cancel a quote
   */
  cancel: async (id: string, reason?: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/cancel`, { reason });
    return response.data;
  },

  // PDF
  /**
   * Get quote data for PDF generation
   */
  getPdfData: async (id: string): Promise<{ quote: Quote; generatedAt: string }> => {
    const response = await client.get<{ quote: Quote; generatedAt: string }>(`/quotes/${id}/pdf`);
    return response.data;
  },

  // Sync with opportunity
  /**
   * Sync quote amount to opportunity
   */
  syncToOpportunity: async (id: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/sync-to-opportunity`);
    return response.data;
  },

  // Recalculate totals
  /**
   * Recalculate quote totals
   */
  recalculate: async (id: string): Promise<Quote> => {
    const response = await client.post<Quote>(`/quotes/${id}/recalculate`);
    return response.data;
  },

  // ========== QUOTE DOCUMENTS ==========

  /**
   * Upload a document to a quote with AI processing
   */
  uploadDocument: async (quoteId: string, file: File): Promise<QuoteDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<QuoteDocument>(
      `/quotes/${quoteId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Get all documents for a quote
   */
  getDocuments: async (quoteId: string): Promise<QuoteDocument[]> => {
    const response = await client.get<QuoteDocument[]>(`/quotes/${quoteId}/documents`);
    return response.data;
  },

  /**
   * Get a single document with AI summary
   */
  getDocument: async (docId: string): Promise<QuoteDocument> => {
    const response = await client.get<QuoteDocument>(`/quotes/documents/${docId}`);
    return response.data;
  },

  /**
   * Delete a document
   */
  deleteDocument: async (docId: string): Promise<void> => {
    await client.delete(`/quotes/documents/${docId}`);
  },

  /**
   * Reprocess a document with AI
   */
  reprocessDocument: async (docId: string): Promise<{ message: string }> => {
    const response = await client.post<{ message: string }>(`/quotes/documents/${docId}/reprocess`);
    return response.data;
  },
};

// QuoteDocument type
export interface QuoteDocument {
  id: string;
  quoteId: string;
  filename: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes?: number;
  summary?: string;
  extractedText?: string;
  keyTerms?: string[];
  tableCount?: number;
  pageCount?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';
  processedAt?: string;
  errorMessage?: string;
  uploadedBy: string;
  uploader?: { id: string; name: string | null; email: string };
  createdAt: string;
  updatedAt: string;
}

export default quotesApi;
