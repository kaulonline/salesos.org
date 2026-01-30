import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pageIndexApi,
  PageIndexDocument,
  PageIndexHealth,
  IndexingStatus,
  SearchResult,
  DocumentTree,
} from '../api/pageIndex';

// Query keys
export const pageIndexKeys = {
  all: ['pageIndex'] as const,
  health: () => [...pageIndexKeys.all, 'health'] as const,
  documents: () => [...pageIndexKeys.all, 'documents'] as const,
  document: (id: string) => [...pageIndexKeys.all, 'document', id] as const,
  status: (id: string) => [...pageIndexKeys.all, 'status', id] as const,
  search: (documentId: string, query: string) => [...pageIndexKeys.all, 'search', documentId, query] as const,
};

// Health check hook
export function usePageIndexHealth() {
  return useQuery<PageIndexHealth, Error>({
    queryKey: pageIndexKeys.health(),
    queryFn: pageIndexApi.getHealth,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// List documents hook
export function usePageIndexDocuments() {
  return useQuery<PageIndexDocument[], Error>({
    queryKey: pageIndexKeys.documents(),
    queryFn: pageIndexApi.listDocuments,
    staleTime: 10000, // 10 seconds
  });
}

// Get single document hook
export function usePageIndexDocument(documentId: string) {
  return useQuery<DocumentTree, Error>({
    queryKey: pageIndexKeys.document(documentId),
    queryFn: () => pageIndexApi.getDocument(documentId),
    enabled: !!documentId,
  });
}

// Get indexing status hook (for polling)
export function usePageIndexStatus(documentId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery<IndexingStatus, Error>({
    queryKey: pageIndexKeys.status(documentId),
    queryFn: () => pageIndexApi.getStatus(documentId),
    enabled: options?.enabled ?? !!documentId,
    refetchInterval: options?.refetchInterval ?? 2000, // Poll every 2 seconds by default
  });
}

// Upload document mutation
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }: {
      file: File;
      options?: { addSummary?: boolean; addDescription?: boolean; sync?: boolean };
    }) => pageIndexApi.indexDocument(file, options),
    onSuccess: () => {
      // Invalidate documents list to refetch
      queryClient.invalidateQueries({ queryKey: pageIndexKeys.documents() });
    },
  });
}

// Delete document mutation
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => pageIndexApi.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pageIndexKeys.documents() });
    },
  });
}

// Search document hook
export function useSearchDocument(documentId: string, query: string, maxResults = 5) {
  return useQuery<SearchResult[], Error>({
    queryKey: pageIndexKeys.search(documentId, query),
    queryFn: () => pageIndexApi.searchDocument(documentId, query, maxResults),
    enabled: !!documentId && !!query && query.length > 2,
    staleTime: 60000, // 1 minute
  });
}

// Search mutation (for on-demand search)
export function useSearchMutation() {
  return useMutation({
    mutationFn: ({ documentId, query, maxResults = 5 }: {
      documentId: string;
      query: string;
      maxResults?: number;
    }) => pageIndexApi.searchDocument(documentId, query, maxResults),
  });
}

// Search all documents mutation
export function useSearchAllMutation() {
  return useMutation({
    mutationFn: ({ query, maxResults = 10 }: { query: string; maxResults?: number }) =>
      pageIndexApi.searchAll(query, maxResults),
  });
}
