import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi, OpportunityFilters } from '../api/opportunities';
import { queryKeys } from '../lib/queryKeys';
import type {
  Opportunity,
  CreateOpportunityDto,
  UpdateOpportunityDto,
  CloseLostDto,
  CloseWonDto,
  PipelineStats,
  SalesForecast,
  OpportunityAnalysis,
} from '../types';

// Hook for listing deals with caching and background refresh
export function useDeals(filters?: OpportunityFilters) {
  const queryClient = useQueryClient();

  // Query for deals list
  const dealsQuery = useQuery({
    queryKey: queryKeys.deals.list(filters),
    queryFn: () => opportunitiesApi.getAll(filters),
  });

  // Query for pipeline stats
  const statsQuery = useQuery({
    queryKey: queryKeys.deals.pipelineStats(),
    queryFn: () => opportunitiesApi.getPipelineStats(),
    staleTime: 60 * 1000, // Stats can be stale for 1 minute
  });

  // Query for forecast
  const forecastQuery = useQuery({
    queryKey: queryKeys.deals.forecast(),
    queryFn: () => opportunitiesApi.getForecast(),
    staleTime: 60 * 1000,
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateOpportunityDto) => opportunitiesApi.create(data),
    onSuccess: (newDeal) => {
      // Optimistically add to list
      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => (old ? [newDeal, ...old] : [newDeal])
      );
      // Invalidate stats since they changed
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOpportunityDto }) =>
      opportunitiesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.list(filters) });

      // Snapshot previous value
      const previousDeals = queryClient.getQueryData<Opportunity[]>(queryKeys.deals.list(filters));

      // Optimistically update
      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.map((d) => (d.id === id ? { ...d, ...data } : d))
      );

      return { previousDeals };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousDeals) {
        queryClient.setQueryData(queryKeys.deals.list(filters), context.previousDeals);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
    },
  });

  // Advance stage mutation
  const advanceStageMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      opportunitiesApi.advanceStage(id, notes ? { notes } : undefined),
    onSuccess: (updatedDeal) => {
      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
      );
      queryClient.setQueryData(queryKeys.deals.detail(updatedDeal.id), updatedDeal);
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
    },
  });

  // Close won mutation
  const closeWonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data?: CloseWonDto }) =>
      opportunitiesApi.closeWon(id, data),
    onSuccess: (updatedDeal) => {
      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });

  // Close lost mutation
  const closeLostMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseLostDto }) =>
      opportunitiesApi.closeLost(id, data),
    onSuccess: (updatedDeal) => {
      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => opportunitiesApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.list(filters) });
      const previousDeals = queryClient.getQueryData<Opportunity[]>(queryKeys.deals.list(filters));

      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.filter((d) => d.id !== id)
      );

      return { previousDeals };
    },
    onError: (_err, _id, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(queryKeys.deals.list(filters), context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: string) => opportunitiesApi.analyze(id),
    onSuccess: (analysis, id) => {
      queryClient.setQueryData(queryKeys.deals.analysis(id), analysis);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => opportunitiesApi.bulkDelete(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deals.list(filters) });
      const previousDeals = queryClient.getQueryData<Opportunity[]>(queryKeys.deals.list(filters));

      queryClient.setQueryData<Opportunity[]>(
        queryKeys.deals.list(filters),
        (old) => old?.filter((d) => !ids.includes(d.id))
      );

      return { previousDeals };
    },
    onError: (_err, _ids, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(queryKeys.deals.list(filters), context.previousDeals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.pipelineStats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.forecast() });
    },
  });

  return {
    // Data
    deals: dealsQuery.data ?? [],
    pipelineStats: statsQuery.data ?? null,
    forecast: forecastQuery.data ?? null,

    // Loading states
    loading: dealsQuery.isLoading,
    isRefetching: dealsQuery.isRefetching,
    statsLoading: statsQuery.isLoading,
    forecastLoading: forecastQuery.isLoading,

    // Error states
    error: dealsQuery.error?.message ?? null,
    statsError: statsQuery.error?.message ?? null,

    // Actions
    refetch: dealsQuery.refetch,
    fetchPipelineStats: statsQuery.refetch,
    fetchForecast: forecastQuery.refetch,

    // Mutations
    create: (data: CreateOpportunityDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateOpportunityDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    advanceStage: (id: string, notes?: string) => advanceStageMutation.mutateAsync({ id, notes }),
    closeWon: (id: string, data?: CloseWonDto) => closeWonMutation.mutateAsync({ id, data }),
    closeLost: (id: string, data: CloseLostDto) => closeLostMutation.mutateAsync({ id, data }),
    analyze: (id: string) => analyzeMutation.mutateAsync(id),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutateAsync(ids),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAnalyzing: analyzeMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

// Hook for single deal with analysis
export function useDeal(id: string | undefined) {
  const queryClient = useQueryClient();

  // Query for deal details
  const dealQuery = useQuery({
    queryKey: queryKeys.deals.detail(id!),
    queryFn: () => opportunitiesApi.getById(id!),
    enabled: !!id,
  });

  // Query for analysis (lazy loaded)
  const analysisQuery = useQuery({
    queryKey: queryKeys.deals.analysis(id!),
    queryFn: () => opportunitiesApi.analyze(id!),
    enabled: false, // Only fetch when explicitly requested
  });

  const fetchAnalysis = () => {
    if (id) {
      analysisQuery.refetch();
    }
  };

  return {
    deal: dealQuery.data ?? null,
    analysis: analysisQuery.data ?? null,
    loading: dealQuery.isLoading,
    analysisLoading: analysisQuery.isLoading || analysisQuery.isFetching,
    error: dealQuery.error?.message ?? null,
    refetch: dealQuery.refetch,
    fetchAnalysis,
  };
}

// Hook for analyzing a deal (standalone)
export function useDealAnalysis(id: string | undefined) {
  return useQuery<OpportunityAnalysis>({
    queryKey: queryKeys.deals.analysis(id!),
    queryFn: () => opportunitiesApi.analyze(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Analysis is expensive, cache for 5 minutes
  });
}

// Prefetch helper for hover states
export function usePrefetchDeal() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.deals.detail(id),
      queryFn: () => opportunitiesApi.getById(id),
      staleTime: 30 * 1000,
    });
  };
}
