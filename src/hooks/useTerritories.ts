import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { territoriesApi } from '../api';
import { queryKeys } from '../lib/queryKeys';
import type {
  Territory,
  CreateTerritoryDto,
  UpdateTerritoryDto,
  AssignAccountsDto,
} from '../types/territory';

/**
 * Hook to manage all territories with CRUD operations
 */
export function useTerritories() {
  const queryClient = useQueryClient();

  // Fetch all territories
  const {
    data: territories = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.territories.list(),
    queryFn: territoriesApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch territory stats
  const {
    data: stats,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: queryKeys.territories.stats(),
    queryFn: territoriesApi.getStats,
    staleTime: 5 * 60 * 1000,
  });

  // Create territory mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTerritoryDto) => territoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.all });
    },
  });

  // Update territory mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTerritoryDto }) =>
      territoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.all });
    },
  });

  // Delete territory mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => territoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.all });
    },
  });

  return {
    territories,
    stats,
    loading,
    loadingStats,
    error: error?.message || null,
    refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: UpdateTerritoryDto) => updateMutation.mutateAsync({ id, data }),
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook to manage a single territory and its accounts
 */
export function useTerritory(id: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch single territory
  const {
    data: territory,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.territories.detail(id || ''),
    queryFn: () => territoriesApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch territory accounts
  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: queryKeys.territories.accounts(id || ''),
    queryFn: () => territoriesApi.getAccounts(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Assign accounts mutation
  const assignAccountsMutation = useMutation({
    mutationFn: (data: AssignAccountsDto) => territoriesApi.assignAccounts(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.accounts(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.stats() });
    },
  });

  // Remove account mutation
  const removeAccountMutation = useMutation({
    mutationFn: (accountId: string) => territoriesApi.removeAccount(id!, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.accounts(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.stats() });
    },
  });

  // Auto-assign mutation
  const autoAssignMutation = useMutation({
    mutationFn: () => territoriesApi.autoAssign(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.accounts(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.stats() });
    },
  });

  // Recalculate performance mutation
  const recalculateMutation = useMutation({
    mutationFn: () => territoriesApi.recalculate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.territories.stats() });
    },
  });

  return {
    territory,
    accounts,
    loading,
    loadingAccounts,
    error: error?.message || null,
    refetch,
    refetchAccounts,
    assignAccounts: assignAccountsMutation.mutateAsync,
    removeAccount: removeAccountMutation.mutateAsync,
    autoAssign: autoAssignMutation.mutateAsync,
    recalculate: recalculateMutation.mutateAsync,
    isAssigning: assignAccountsMutation.isPending,
    isRemoving: removeAccountMutation.isPending,
    // Aliases for component compatibility
    isAssigningAccounts: assignAccountsMutation.isPending,
    isRemovingAccount: removeAccountMutation.isPending,
    isAutoAssigning: autoAssignMutation.isPending,
    isRecalculating: recalculateMutation.isPending,
  };
}
