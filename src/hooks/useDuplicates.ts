import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { duplicatesApi, DuplicateSet, MergeRequest } from '../api/duplicates';
import { queryKeys } from '../lib/queryKeys';

export function useDuplicateSets(entityType?: string, status?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.duplicates.list({ entityType, status }),
    queryFn: () => duplicatesApi.getDuplicateSets(entityType, status),
  });

  const scanMutation = useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) =>
      duplicatesApi.scanForDuplicates(entityType, entityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.duplicates.all });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => duplicatesApi.dismissDuplicateSet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.duplicates.all });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: MergeRequest }) =>
      duplicatesApi.mergeEntities(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.duplicates.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });

  return {
    duplicateSets: query.data || [],
    loading: query.isLoading,
    error: query.error?.message,
    scan: scanMutation.mutateAsync,
    dismiss: dismissMutation.mutateAsync,
    merge: mergeMutation.mutateAsync,
    isScanning: scanMutation.isPending,
    isDismissing: dismissMutation.isPending,
    isMerging: mergeMutation.isPending,
  };
}

export function useDuplicateSet(id?: string) {
  const query = useQuery({
    queryKey: queryKeys.duplicates.detail(id || ''),
    queryFn: () => duplicatesApi.getDuplicateSet(id!),
    enabled: !!id,
  });

  return {
    duplicateSet: query.data,
    loading: query.isLoading,
    error: query.error?.message,
  };
}
