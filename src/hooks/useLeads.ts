import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi, LeadFilters } from '../api/leads';
import { queryKeys } from '../lib/queryKeys';
import type { Lead, CreateLeadDto, UpdateLeadDto, ConvertLeadDto, LeadStats } from '../types';

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
