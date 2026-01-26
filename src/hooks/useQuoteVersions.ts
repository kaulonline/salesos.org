import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteVersionsApi, QuoteVersionFilters } from '../api/quoteVersions';
import { queryKeys } from '../lib/queryKeys';
import type {
  QuoteVersion,
  QuoteVersionComparison,
  CreateQuoteVersionDto,
  RestoreVersionDto,
  CompareVersionsDto,
} from '../types';

export function useQuoteVersions(quoteId: string | undefined, filters?: QuoteVersionFilters) {
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: queryKeys.quoteVersions.list(quoteId!, filters),
    queryFn: () => quoteVersionsApi.getVersions(quoteId!, filters),
    enabled: !!quoteId,
  });

  const createMutation = useMutation({
    mutationFn: (data?: CreateQuoteVersionDto) => quoteVersionsApi.createVersion(quoteId!, data),
    onSuccess: (newVersion) => {
      queryClient.setQueryData<QuoteVersion[]>(
        queryKeys.quoteVersions.list(quoteId!, filters),
        (old) => (old ? [newVersion, ...old] : [newVersion])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.quoteVersions.latest(quoteId!) });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (data: RestoreVersionDto) => quoteVersionsApi.restoreVersion(quoteId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quoteVersions.list(quoteId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(quoteId!) });
    },
  });

  return {
    versions: versionsQuery.data ?? [],
    loading: versionsQuery.isLoading,
    error: versionsQuery.error?.message ?? null,
    refetch: versionsQuery.refetch,
    createVersion: (data?: CreateQuoteVersionDto) => createMutation.mutateAsync(data),
    restoreVersion: (data: RestoreVersionDto) => restoreMutation.mutateAsync(data),
    isCreating: createMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function useQuoteVersion(quoteId: string | undefined, versionId: string | undefined) {
  const versionQuery = useQuery({
    queryKey: queryKeys.quoteVersions.detail(quoteId!, versionId!),
    queryFn: () => quoteVersionsApi.getVersion(quoteId!, versionId!),
    enabled: !!quoteId && !!versionId,
  });

  return {
    version: versionQuery.data ?? null,
    loading: versionQuery.isLoading,
    error: versionQuery.error?.message ?? null,
    refetch: versionQuery.refetch,
  };
}

export function useLatestQuoteVersion(quoteId: string | undefined) {
  const latestQuery = useQuery({
    queryKey: queryKeys.quoteVersions.latest(quoteId!),
    queryFn: () => quoteVersionsApi.getLatestVersion(quoteId!),
    enabled: !!quoteId,
  });

  return {
    latestVersion: latestQuery.data ?? null,
    loading: latestQuery.isLoading,
    error: latestQuery.error?.message ?? null,
  };
}

export function useQuoteVersionCount(quoteId: string | undefined) {
  const countQuery = useQuery({
    queryKey: queryKeys.quoteVersions.count(quoteId!),
    queryFn: () => quoteVersionsApi.getVersionCount(quoteId!),
    enabled: !!quoteId,
  });

  return {
    count: countQuery.data ?? 0,
    loading: countQuery.isLoading,
  };
}

export function useCompareQuoteVersions(quoteId: string | undefined) {
  const compareMutation = useMutation({
    mutationFn: (data: CompareVersionsDto) => quoteVersionsApi.compareVersions(quoteId!, data),
  });

  return {
    compare: (versionAId: string, versionBId: string) =>
      compareMutation.mutateAsync({ versionAId, versionBId }),
    comparison: compareMutation.data ?? null,
    isComparing: compareMutation.isPending,
    error: compareMutation.error?.message ?? null,
    reset: compareMutation.reset,
  };
}

export function useChangesSinceVersion(quoteId: string | undefined, versionId: string | undefined) {
  const changesQuery = useQuery({
    queryKey: queryKeys.quoteVersions.changesSince(quoteId!, versionId!),
    queryFn: () => quoteVersionsApi.getChangesSinceVersion(quoteId!, versionId!),
    enabled: !!quoteId && !!versionId,
  });

  return {
    changes: changesQuery.data ?? null,
    loading: changesQuery.isLoading,
    error: changesQuery.error?.message ?? null,
  };
}

export function useQuoteVersionStats() {
  const statsQuery = useQuery({
    queryKey: queryKeys.quoteVersions.stats(),
    queryFn: () => quoteVersionsApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: statsQuery.data ?? null,
    loading: statsQuery.isLoading,
    error: statsQuery.error?.message ?? null,
  };
}
