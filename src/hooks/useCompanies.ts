import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, AccountFilters } from '../api/accounts';
import { queryKeys } from '../lib/queryKeys';
import type { Account, CreateAccountDto, UpdateAccountDto, AccountStats } from '../types';

// Hook for listing companies with caching and background refresh
export function useCompanies(filters?: AccountFilters) {
  const queryClient = useQueryClient();

  // Query for companies list
  const companiesQuery = useQuery({
    queryKey: queryKeys.companies.list(filters),
    queryFn: () => accountsApi.getAll(filters),
  });

  // Query for company stats
  const statsQuery = useQuery({
    queryKey: queryKeys.companies.stats(),
    queryFn: () => accountsApi.getStats(),
    staleTime: 60 * 1000,
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateAccountDto) => accountsApi.create(data),
    onSuccess: (newCompany) => {
      queryClient.setQueryData<Account[]>(
        queryKeys.companies.list(filters),
        (old) => (old ? [newCompany, ...old] : [newCompany])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats() });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDto }) =>
      accountsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.list(filters) });
      const previousCompanies = queryClient.getQueryData<Account[]>(queryKeys.companies.list(filters));

      queryClient.setQueryData<Account[]>(
        queryKeys.companies.list(filters),
        (old) => old?.map((c) => (c.id === id ? { ...c, ...data } : c))
      );

      return { previousCompanies };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCompanies) {
        queryClient.setQueryData(queryKeys.companies.list(filters), context.previousCompanies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.list(filters) });
      const previousCompanies = queryClient.getQueryData<Account[]>(queryKeys.companies.list(filters));

      queryClient.setQueryData<Account[]>(
        queryKeys.companies.list(filters),
        (old) => old?.filter((c) => c.id !== id)
      );

      return { previousCompanies };
    },
    onError: (_err, _id, context) => {
      if (context?.previousCompanies) {
        queryClient.setQueryData(queryKeys.companies.list(filters), context.previousCompanies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats() });
    },
  });

  return {
    // Data
    companies: companiesQuery.data ?? [],
    stats: statsQuery.data ?? null,

    // Loading states
    loading: companiesQuery.isLoading,
    isRefetching: companiesQuery.isRefetching,
    statsLoading: statsQuery.isLoading,

    // Error states
    error: companiesQuery.error?.message ?? null,

    // Actions
    refetch: companiesQuery.refetch,
    fetchStats: statsQuery.refetch,

    // Mutations
    create: (data: CreateAccountDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateAccountDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single company
export function useCompany(id: string | undefined) {
  const companyQuery = useQuery({
    queryKey: queryKeys.companies.detail(id!),
    queryFn: () => accountsApi.getById(id!),
    enabled: !!id,
  });

  // Query for company hierarchy
  const hierarchyQuery = useQuery({
    queryKey: queryKeys.companies.hierarchy(id!),
    queryFn: () => accountsApi.getHierarchy(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // Hierarchy changes rarely
  });

  // Query for company revenue
  const revenueQuery = useQuery({
    queryKey: queryKeys.companies.revenue(id!),
    queryFn: () => accountsApi.getRevenue(id!),
    enabled: !!id,
  });

  return {
    company: companyQuery.data ?? null,
    hierarchy: hierarchyQuery.data ?? null,
    revenue: revenueQuery.data ?? null,
    loading: companyQuery.isLoading,
    error: companyQuery.error?.message ?? null,
    refetch: companyQuery.refetch,
  };
}

// Prefetch helper for hover states
export function usePrefetchCompany() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.companies.detail(id),
      queryFn: () => accountsApi.getById(id),
      staleTime: 30 * 1000,
    });
  };
}
