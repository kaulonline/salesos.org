import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi, ApiKeyFilters } from '../api/apiKeys';
import { queryKeys } from '../lib/queryKeys';
import type { ApiKey, CreateApiKeyDto, UpdateApiKeyDto } from '../types';

export function useApiKeys(filters?: ApiKeyFilters) {
  const queryClient = useQueryClient();

  const keysQuery = useQuery({
    queryKey: queryKeys.apiKeys.list(filters),
    queryFn: () => apiKeysApi.getAll(filters),
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.apiKeys.usage(),
    queryFn: () => apiKeysApi.getUsage().catch(() => ({
      requestsToday: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      requestsByKey: [],
    })),
    staleTime: 60 * 1000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateApiKeyDto) => apiKeysApi.create(data),
    onSuccess: (response) => {
      queryClient.setQueryData<ApiKey[]>(
        queryKeys.apiKeys.list(filters),
        (old) => (old ? [response.apiKey, ...old] : [response.apiKey])
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyDto }) =>
      apiKeysApi.update(id, data),
    onSuccess: (updatedKey) => {
      queryClient.setQueryData<ApiKey[]>(
        queryKeys.apiKeys.list(filters),
        (old) => old?.map((k) => (k.id === updatedKey.id ? updatedKey : k))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ApiKey[]>(
        queryKeys.apiKeys.list(filters),
        (old) => old?.filter((k) => k.id !== id)
      );
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: (updatedKey) => {
      queryClient.setQueryData<ApiKey[]>(
        queryKeys.apiKeys.list(filters),
        (old) => old?.map((k) => (k.id === updatedKey.id ? updatedKey : k))
      );
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.regenerate(id),
    onSuccess: (response) => {
      queryClient.setQueryData<ApiKey[]>(
        queryKeys.apiKeys.list(filters),
        (old) => old?.map((k) => (k.id === response.apiKey.id ? response.apiKey : k))
      );
    },
  });

  return {
    keys: keysQuery.data ?? [],
    usage: usageQuery.data ?? null,
    loading: keysQuery.isLoading,
    error: keysQuery.error?.message ?? null,
    refetch: keysQuery.refetch,
    create: (data: CreateApiKeyDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateApiKeyDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    revoke: (id: string) => revokeMutation.mutateAsync(id),
    regenerate: (id: string) => regenerateMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRevoking: revokeMutation.isPending,
    // Return the secret key from create/regenerate mutations
    lastCreatedKey: createMutation.data,
    lastRegeneratedKey: regenerateMutation.data,
  };
}

export function useApiKey(id: string | undefined) {
  const keyQuery = useQuery({
    queryKey: queryKeys.apiKeys.detail(id!),
    queryFn: () => apiKeysApi.getById(id!),
    enabled: !!id,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.apiKeys.keyUsage(id!),
    queryFn: () => apiKeysApi.getKeyUsage(id!).catch(() => ({
      requestsToday: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      requestsByKey: [],
    })),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: false,
  });

  const testMutation = useMutation({
    mutationFn: () => apiKeysApi.test(id!),
  });

  return {
    key: keyQuery.data ?? null,
    usage: usageQuery.data ?? null,
    loading: keyQuery.isLoading,
    error: keyQuery.error?.message ?? null,
    refetch: keyQuery.refetch,
    test: () => testMutation.mutateAsync(),
    testResult: testMutation.data,
    isTesting: testMutation.isPending,
  };
}
