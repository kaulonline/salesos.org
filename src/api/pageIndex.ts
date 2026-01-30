import { apiClient } from './client';

// Types for PageIndex service
export interface PageIndexDocument {
  document_id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  total_pages?: number;
  indexed_pages?: number;
  vector_count?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  file_size?: number;
}

export interface PageIndexHealth {
  status: string;
  vectorStore: boolean;
  documentCount: number;
}

export interface IndexingStatus {
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

export interface SearchResult {
  text: string;
  page_number?: number;
  section?: string;
  relevance_score: number;
  metadata?: Record<string, unknown>;
}

export interface DocumentTree {
  document_id: string;
  filename: string;
  sections: {
    title: string;
    summary?: string;
    content: string;
    page_numbers: number[];
    children?: DocumentTree['sections'];
  }[];
}

// API functions
export const pageIndexApi = {
  // Health check
  getHealth: async (): Promise<PageIndexHealth> => {
    const response = await apiClient.get<PageIndexHealth>('/pageindex/health');
    return response.data;
  },

  // List all documents
  listDocuments: async (): Promise<PageIndexDocument[]> => {
    const response = await apiClient.get<PageIndexDocument[]>('/pageindex/documents');
    return response.data;
  },

  // Get document by ID
  getDocument: async (documentId: string): Promise<DocumentTree> => {
    const response = await apiClient.get<DocumentTree>(`/pageindex/document/${documentId}`);
    return response.data;
  },

  // Get indexing status
  getStatus: async (documentId: string): Promise<IndexingStatus> => {
    const response = await apiClient.get<IndexingStatus>(`/pageindex/status/${documentId}`);
    return response.data;
  },

  // Upload and index a document
  indexDocument: async (
    file: File,
    options?: { addSummary?: boolean; addDescription?: boolean; sync?: boolean }
  ): Promise<{ document_id: string; status: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = options?.sync ? '/pageindex/index-sync' : '/pageindex/index';
    const params = new URLSearchParams();
    if (options?.addSummary !== undefined) params.append('addSummary', String(options.addSummary));
    if (options?.addDescription !== undefined) params.append('addDescription', String(options.addDescription));

    const response = await apiClient.post(
      `${endpoint}?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Delete a document
  deleteDocument: async (documentId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/pageindex/document/${documentId}`);
    return response.data;
  },

  // Search within a document
  searchDocument: async (
    documentId: string,
    query: string,
    maxResults = 5
  ): Promise<SearchResult[]> => {
    const response = await apiClient.post<SearchResult[]>(
      `/pageindex/search/${documentId}`,
      { query, maxResults }
    );
    return response.data;
  },

  // Search across all documents
  searchAll: async (query: string, maxResults = 10): Promise<SearchResult[]> => {
    // This will search across all documents
    const documents = await pageIndexApi.listDocuments();
    const allResults: SearchResult[] = [];

    // Search each completed document
    for (const doc of documents.filter(d => d.status === 'completed')) {
      try {
        const results = await pageIndexApi.searchDocument(doc.document_id, query, maxResults);
        allResults.push(...results.map(r => ({
          ...r,
          metadata: { ...r.metadata, document_id: doc.document_id, filename: doc.filename }
        })));
      } catch {
        // Continue with other documents if one fails
      }
    }

    // Sort by relevance and return top results
    return allResults
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
  },
};

export default pageIndexApi;
