import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, AssetFilters, ContractFilters } from '../api/assets';
import type {
  Asset,
  SupportContract,
  CreateAssetDto,
  UpdateAssetDto,
  CreateSupportContractDto,
  UpdateSupportContractDto,
} from '../types/asset';

// Query keys for assets
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters?: AssetFilters) => [...assetKeys.lists(), filters] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
  byAccount: (accountId: string) => [...assetKeys.all, 'account', accountId] as const,
  accountSummary: (accountId: string) => [...assetKeys.all, 'accountSummary', accountId] as const,
  expiring: (days: number) => [...assetKeys.all, 'expiring', days] as const,
  renewalPipeline: (period: string) => [...assetKeys.all, 'renewalPipeline', period] as const,
  stats: () => [...assetKeys.all, 'stats'] as const,
};

export const contractKeys = {
  all: ['supportContracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (filters?: ContractFilters) => [...contractKeys.lists(), filters] as const,
  detail: (id: string) => [...contractKeys.all, 'detail', id] as const,
  stats: () => [...contractKeys.all, 'stats'] as const,
};

/**
 * Hook for listing and managing assets
 */
export function useAssets(filters?: AssetFilters) {
  const queryClient = useQueryClient();

  const assetsQuery = useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => assetsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: assetKeys.stats(),
    queryFn: () => assetsApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAssetDto) => assetsApi.create(data),
    onSuccess: (newAsset) => {
      queryClient.setQueryData<Asset[]>(
        assetKeys.list(filters),
        (old) => (old ? [newAsset, ...old] : [newAsset])
      );
      queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetDto }) =>
      assetsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Asset[]>(
        assetKeys.list(filters),
        (old) => old?.map((a) => (a.id === updated.id ? updated : a))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Asset[]>(
        assetKeys.list(filters),
        (old) => old?.filter((a) => a.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    },
  });

  return {
    assets: assetsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: assetsQuery.isLoading,
    error: assetsQuery.error?.message ?? null,
    refetch: assetsQuery.refetch,
    create: (data: CreateAssetDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateAssetDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for getting a single asset
 */
export function useAsset(id: string | undefined) {
  const assetQuery = useQuery({
    queryKey: assetKeys.detail(id!),
    queryFn: () => assetsApi.getById(id!),
    enabled: !!id,
  });

  return {
    asset: assetQuery.data ?? null,
    loading: assetQuery.isLoading,
    error: assetQuery.error?.message ?? null,
    refetch: assetQuery.refetch,
  };
}

/**
 * Hook for getting assets by account
 */
export function useAccountAssets(accountId: string | undefined) {
  const queryClient = useQueryClient();

  const assetsQuery = useQuery({
    queryKey: assetKeys.byAccount(accountId!),
    queryFn: () => assetsApi.getByAccount(accountId!),
    enabled: !!accountId,
  });

  const summaryQuery = useQuery({
    queryKey: assetKeys.accountSummary(accountId!),
    queryFn: () => assetsApi.getAccountSummary(accountId!),
    enabled: !!accountId,
  });

  return {
    assets: assetsQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    loading: assetsQuery.isLoading || summaryQuery.isLoading,
    error: assetsQuery.error?.message ?? summaryQuery.error?.message ?? null,
    refetch: () => {
      assetsQuery.refetch();
      summaryQuery.refetch();
    },
  };
}

/**
 * Hook for getting expiring assets
 */
export function useExpiringAssets(days = 90) {
  const expiringQuery = useQuery({
    queryKey: assetKeys.expiring(days),
    queryFn: () => assetsApi.getExpiring(days),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: expiringQuery.data ?? null,
    loading: expiringQuery.isLoading,
    error: expiringQuery.error?.message ?? null,
    refetch: expiringQuery.refetch,
  };
}

/**
 * Hook for getting renewal pipeline
 */
export function useRenewalPipeline(period = 'quarter') {
  const pipelineQuery = useQuery({
    queryKey: assetKeys.renewalPipeline(period),
    queryFn: () => assetsApi.getRenewalPipeline(period),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: pipelineQuery.data ?? null,
    loading: pipelineQuery.isLoading,
    error: pipelineQuery.error?.message ?? null,
    refetch: pipelineQuery.refetch,
  };
}

/**
 * Hook for listing and managing support contracts
 */
export function useSupportContracts(filters?: ContractFilters) {
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: contractKeys.list(filters),
    queryFn: () => assetsApi.getAllContracts(filters),
  });

  const statsQuery = useQuery({
    queryKey: contractKeys.stats(),
    queryFn: () => assetsApi.getContractStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateSupportContractDto) => assetsApi.createContract(data),
    onSuccess: (newContract) => {
      queryClient.setQueryData<SupportContract[]>(
        contractKeys.list(filters),
        (old) => (old ? [newContract, ...old] : [newContract])
      );
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupportContractDto }) =>
      assetsApi.updateContract(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<SupportContract[]>(
        contractKeys.list(filters),
        (old) => old?.map((c) => (c.id === updated.id ? updated : c))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetsApi.deleteContract(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SupportContract[]>(
        contractKeys.list(filters),
        (old) => old?.filter((c) => c.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
    },
  });

  const assignAssetsMutation = useMutation({
    mutationFn: ({ contractId, assetIds }: { contractId: string; assetIds: string[] }) =>
      assetsApi.assignAssetsToContract(contractId, assetIds),
    onSuccess: (_, { contractId }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });

  return {
    contracts: contractsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: contractsQuery.isLoading,
    error: contractsQuery.error?.message ?? null,
    refetch: contractsQuery.refetch,
    create: (data: CreateSupportContractDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateSupportContractDto) =>
      updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    assignAssets: (contractId: string, assetIds: string[]) =>
      assignAssetsMutation.mutateAsync({ contractId, assetIds }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for getting a single support contract
 */
export function useSupportContract(id: string | undefined) {
  const contractQuery = useQuery({
    queryKey: contractKeys.detail(id!),
    queryFn: () => assetsApi.getContractById(id!),
    enabled: !!id,
  });

  return {
    contract: contractQuery.data ?? null,
    loading: contractQuery.isLoading,
    error: contractQuery.error?.message ?? null,
    refetch: contractQuery.refetch,
  };
}
