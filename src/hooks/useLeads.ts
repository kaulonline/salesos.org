import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { leadsApi, LeadFilters } from '../api/leads';
import { queryKeys } from '../lib/queryKeys';
import type { Lead, CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadStats } from '../types';

// Page size for infinite scroll
const DEFAULT_PAGE_SIZE = 50;

// Hook for listing leads with caching and background refresh
export function useLeads(filters?: LeadFilters) {
  const queryClient = useQueryClient();

  // Query for leads list
  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => leadsApi.getAll(filters),
  });

  // Query for lead stats
  const statsQuery = useQuery({
    queryKey: queryKeys.leads.stats(),
    queryFn: () => leadsApi.getStats(),
    staleTime: 60 * 1000, // Stats can be stale for 1 minute
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateLeadDto) => leadsApi.create(data),
    onSuccess: (newLead) => {
      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => (old ? [newLead, ...old] : [newLead])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats() });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDto }) =>
      leadsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.list(filters) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads.list(filters));

      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => old?.map((l) => (l.id === id ? { ...l, ...data } : l))
      );

      return { previousLeads };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads.list(filters), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.list(filters) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads.list(filters));

      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => old?.filter((l) => l.id !== id)
      );

      return { previousLeads };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads.list(filters), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats() });
    },
  });

  // Score mutation
  const scoreMutation = useMutation({
    mutationFn: (id: string) => leadsApi.score(id),
    onSuccess: (result, id) => {
      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => old?.map((l) => (l.id === id ? { ...l, leadScore: result.score } : l))
      );
    },
  });

  // Convert mutation
  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertLeadDto }) =>
      leadsApi.convert(id, data),
    onSuccess: (_result, { id }) => {
      // Remove converted lead from list
      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => old?.filter((l) => l.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats() });
      // Invalidate related entities that might have been created
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => leadsApi.bulkDelete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.list(filters) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads.list(filters));

      queryClient.setQueryData<Lead[]>(
        queryKeys.leads.list(filters),
        (old) => old?.filter((l) => !ids.includes(l.id))
      );

      return { previousLeads };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads.list(filters), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats() });
    },
  });

  return {
    // Data
    leads: leadsQuery.data ?? [],
    stats: statsQuery.data ?? null,

    // Loading states
    loading: leadsQuery.isLoading,
    isRefetching: leadsQuery.isRefetching,
    statsLoading: statsQuery.isLoading,

    // Error states
    error: leadsQuery.error?.message ?? null,

    // Actions
    refetch: leadsQuery.refetch,
    fetchStats: statsQuery.refetch,

    // Mutations
    create: (data: CreateLeadDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateLeadDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    score: (id: string) => scoreMutation.mutateAsync(id),
    convert: (id: string, data: ConvertLeadDto) => convertMutation.mutateAsync({ id, data }),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConverting: convertMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

// Hook for single lead
export function useLead(id: string | undefined) {
  const leadQuery = useQuery({
    queryKey: queryKeys.leads.detail(id!),
    queryFn: () => leadsApi.getById(id!),
    enabled: !!id,
  });

  return {
    lead: leadQuery.data ?? null,
    loading: leadQuery.isLoading,
    error: leadQuery.error?.message ?? null,
    refetch: leadQuery.refetch,
  };
}

// Prefetch helper for hover states
export function usePrefetchLead() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.leads.detail(id),
      queryFn: () => leadsApi.getById(id),
      staleTime: 30 * 1000,
    });
  };
}

/**
 * Infinite scroll hook for large lead lists
 * Uses cursor-based pagination for efficient loading
 */
export function useLeadsInfinite(filters?: Omit<LeadFilters, 'page' | 'limit'>) {
  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQuery({
    queryKey: [...queryKeys.leads.all, 'infinite', filters],
    queryFn: async ({ pageParam }) => {
      const response = await leadsApi.getAll({
        ...filters,
        cursor: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      });
      // API should return { data: Lead[], nextCursor?: string }
      // If API returns array, wrap it
      if (Array.isArray(response)) {
        return {
          data: response,
          nextCursor: response.length >= DEFAULT_PAGE_SIZE ? response[response.length - 1]?.id : undefined,
        };
      }
      return response;
    },
    getNextPageParam: (lastPage) => {
      // If lastPage is an array (old API format)
      if (Array.isArray(lastPage)) {
        return lastPage.length >= DEFAULT_PAGE_SIZE ? lastPage[lastPage.length - 1]?.id : undefined;
      }
      return lastPage.nextCursor;
    },
    initialPageParam: undefined as string | undefined,
  });

  // Flatten all pages into a single array
  const leads = infiniteQuery.data?.pages.flatMap((page) => {
    if (Array.isArray(page)) return page;
    return page.data || [];
  }) ?? [];

  // Mutation to add a new lead to the cache
  const addToCache = (newLead: Lead) => {
    queryClient.setQueryData(
      [...queryKeys.leads.all, 'infinite', filters],
      (old: typeof infiniteQuery.data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, index) => {
            if (index === 0) {
              if (Array.isArray(page)) {
                return [newLead, ...page];
              }
              return { ...page, data: [newLead, ...(page.data || [])] };
            }
            return page;
          }),
        };
      }
    );
  };

  // Mutation to remove a lead from the cache
  const removeFromCache = (leadId: string) => {
    queryClient.setQueryData(
      [...queryKeys.leads.all, 'infinite', filters],
      (old: typeof infiniteQuery.data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => {
            if (Array.isArray(page)) {
              return page.filter((l) => l.id !== leadId);
            }
            return { ...page, data: (page.data || []).filter((l: Lead) => l.id !== leadId) };
          }),
        };
      }
    );
  };

  return {
    // Data
    leads,
    totalCount: leads.length,

    // Infinite scroll state
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,

    // Loading states
    isLoading: infiniteQuery.isLoading,
    isRefetching: infiniteQuery.isRefetching,

    // Error state
    error: infiniteQuery.error?.message ?? null,

    // Actions
    refetch: infiniteQuery.refetch,
    addToCache,
    removeFromCache,
  };
}
