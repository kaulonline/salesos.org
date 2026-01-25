import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api/products';
import type { Product, CreateProductDto, UpdateProductDto, ProductFilters, ProductStats } from '../api/products';
import { queryKeys } from '../lib/queryKeys';

export function useProducts(filters?: ProductFilters) {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: queryKeys.products.list(filters || {}),
    queryFn: () => productsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.products.stats(),
    queryFn: () => productsApi.getStats(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProductDto) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: UpdateProductDto }) =>
      productsApi.bulkUpdate(ids, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  return {
    // Data
    products: productsQuery.data || [],
    stats: statsQuery.data as ProductStats | undefined,

    // Loading states
    loading: productsQuery.isLoading,
    statsLoading: statsQuery.isLoading,

    // Error states
    error: productsQuery.error,
    statsError: statsQuery.error,

    // Mutations
    create: createMutation.mutateAsync,
    update: (id: string, data: UpdateProductDto) => updateMutation.mutateAsync({ id, data }),
    delete: deleteMutation.mutateAsync,
    bulkUpdate: (ids: string[], updates: UpdateProductDto) => bulkUpdateMutation.mutateAsync({ ids, updates }),
    bulkDelete: bulkDeleteMutation.mutateAsync,

    // Mutation states
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    // Refetch
    refetch: productsQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

export function useProduct(id: string | undefined) {
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(id || ''),
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductDto) => productsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  return {
    product: productQuery.data as Product | undefined,
    loading: productQuery.isLoading,
    error: productQuery.error,
    update: updateMutation.mutateAsync,
    updating: updateMutation.isPending,
    refetch: productQuery.refetch,
  };
}
