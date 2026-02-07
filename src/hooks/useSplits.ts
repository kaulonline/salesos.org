import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { splitsApi, SplitFilters } from '../api/splits';
import type {
  CreateSplitDto,
  UpdateSplitDto,
  OpportunitySplit,
} from '../types/split';

// Query keys for splits
export const splitKeys = {
  all: ['splits'] as const,
  opportunity: (opportunityId: string) => [...splitKeys.all, 'opportunity', opportunityId] as const,
  mySplits: (filters?: SplitFilters) => [...splitKeys.all, 'my-splits', filters] as const,
  teamSplits: (filters?: SplitFilters) => [...splitKeys.all, 'team-splits', filters] as const,
  stats: () => [...splitKeys.all, 'stats'] as const,
};

/**
 * Hook for managing splits on an opportunity
 */
export function useOpportunitySplits(opportunityId: string | undefined) {
  const queryClient = useQueryClient();

  const splitsQuery = useQuery({
    queryKey: splitKeys.opportunity(opportunityId!),
    queryFn: () => splitsApi.getOpportunitySplits(opportunityId!),
    enabled: !!opportunityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSplitDto) => splitsApi.createSplit(opportunityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
      queryClient.invalidateQueries({ queryKey: splitKeys.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ splitId, data }: { splitId: string; data: UpdateSplitDto }) =>
      splitsApi.updateSplit(opportunityId!, splitId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (splitId: string) => splitsApi.deleteSplit(opportunityId!, splitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
      queryClient.invalidateQueries({ queryKey: splitKeys.stats() });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (splitId: string) => splitsApi.approveSplit(opportunityId!, splitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
      queryClient.invalidateQueries({ queryKey: splitKeys.stats() });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ splitId, reason }: { splitId: string; reason?: string }) =>
      splitsApi.rejectSplit(opportunityId!, splitId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
      queryClient.invalidateQueries({ queryKey: splitKeys.stats() });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: () => splitsApi.recalculateSplits(opportunityId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: splitKeys.opportunity(opportunityId!) });
    },
  });

  return {
    splits: splitsQuery.data?.splits ?? [],
    summary: splitsQuery.data?.summary ?? null,
    loading: splitsQuery.isLoading,
    error: splitsQuery.error?.message ?? null,
    refetch: splitsQuery.refetch,
    create: (data: CreateSplitDto) => createMutation.mutateAsync(data),
    update: (splitId: string, data: UpdateSplitDto) =>
      updateMutation.mutateAsync({ splitId, data }),
    remove: (splitId: string) => deleteMutation.mutateAsync(splitId),
    approve: (splitId: string) => approveMutation.mutateAsync(splitId),
    reject: (splitId: string, reason?: string) =>
      rejectMutation.mutateAsync({ splitId, reason }),
    recalculate: () => recalculateMutation.mutateAsync(),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

/**
 * Hook for getting current user's splits
 */
export function useMySplits(filters?: SplitFilters) {
  const splitsQuery = useQuery({
    queryKey: splitKeys.mySplits(filters),
    queryFn: () => splitsApi.getMySplits(filters),
  });

  return {
    splits: splitsQuery.data?.splits ?? [],
    totals: splitsQuery.data?.totals ?? { totalAmount: 0, forecastAmount: 0, wonAmount: 0 },
    loading: splitsQuery.isLoading,
    error: splitsQuery.error?.message ?? null,
    refetch: splitsQuery.refetch,
  };
}

/**
 * Hook for getting team splits (admin only)
 */
export function useTeamSplits(filters?: SplitFilters) {
  const splitsQuery = useQuery({
    queryKey: splitKeys.teamSplits(filters),
    queryFn: () => splitsApi.getTeamSplits(filters),
  });

  return {
    splits: splitsQuery.data ?? [],
    loading: splitsQuery.isLoading,
    error: splitsQuery.error?.message ?? null,
    refetch: splitsQuery.refetch,
  };
}

/**
 * Hook for getting split statistics
 */
export function useSplitStats() {
  const statsQuery = useQuery({
    queryKey: splitKeys.stats(),
    queryFn: () => splitsApi.getStats(),
    staleTime: 60 * 1000,
  });

  return {
    stats: statsQuery.data ?? null,
    loading: statsQuery.isLoading,
    error: statsQuery.error?.message ?? null,
  };
}
