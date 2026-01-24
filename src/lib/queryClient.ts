import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

// Error handler for queries and mutations
function handleError(error: unknown, context?: string) {
  const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
  const message = err.response?.data?.message || err.message || 'An unexpected error occurred';

  // Log error for debugging (will be replaced with Sentry in production)
  console.error(`[${context || 'Query'}] Error:`, message, error);

  // Don't show toast for 401 errors - handled by axios interceptor
  if (err.response?.status === 401) {
    return;
  }
}

// Create a client with sensible defaults for a CRM application
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      handleError(error, `Query: ${query.queryKey.join('/')}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      handleError(error, `Mutation: ${mutation.options.mutationKey?.join('/') || 'unknown'}`);
    },
  }),
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 30 seconds
      // This prevents unnecessary refetches when navigating between pages
      staleTime: 30 * 1000,

      // Cache time: Keep data in cache for 5 minutes after component unmounts
      gcTime: 5 * 60 * 1000,

      // Retry failed queries up to 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,

      // Network mode: allow fetching even when offline (show stale data)
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure (except for validation errors)
      retry: (failureCount, error) => {
        const err = error as { response?: { status?: number } };
        // Don't retry client errors (4xx)
        if (err.response?.status && err.response.status >= 400 && err.response.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000,

      networkMode: 'offlineFirst',
    },
  },
});

// Helper to invalidate all queries for a specific entity
export function invalidateEntityQueries(entity: string) {
  return queryClient.invalidateQueries({ queryKey: [entity] });
}

// Helper to prefetch data (useful for hover/preloading)
export function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 30 * 1000,
  });
}

// Helper to get cached data without triggering a fetch
export function getCachedData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData<T>(queryKey);
}

// Helper to set cached data manually (for optimistic updates)
export function setCachedData<T>(queryKey: readonly unknown[], data: T) {
  return queryClient.setQueryData<T>(queryKey, data);
}

export default queryClient;
