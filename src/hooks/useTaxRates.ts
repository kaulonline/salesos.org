import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRatesApi, TaxRateFilters } from '../api/taxRates';
import { queryKeys } from '../lib/queryKeys';
import type {
  TaxRate,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  TaxCalculationRequest,
} from '../types';

export function useTaxRates(filters?: TaxRateFilters) {
  const queryClient = useQueryClient();

  const ratesQuery = useQuery({
    queryKey: queryKeys.taxRates.list(filters),
    queryFn: () => taxRatesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.taxRates.stats(),
    queryFn: () => taxRatesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTaxRateDto) => taxRatesApi.create(data),
    onSuccess: (newRate) => {
      queryClient.setQueryData<TaxRate[]>(
        queryKeys.taxRates.list(filters),
        (old) => (old ? [newRate, ...old] : [newRate])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.taxRates.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaxRateDto }) =>
      taxRatesApi.update(id, data),
    onSuccess: (updatedRate) => {
      queryClient.setQueryData<TaxRate[]>(
        queryKeys.taxRates.list(filters),
        (old) => old?.map((r) => (r.id === updatedRate.id ? updatedRate : r))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxRatesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<TaxRate[]>(
        queryKeys.taxRates.list(filters),
        (old) => old?.filter((r) => r.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.taxRates.stats() });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => taxRatesApi.setAsDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxRates.lists() });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => taxRatesApi.toggleActive(id),
    onSuccess: (updatedRate) => {
      queryClient.setQueryData<TaxRate[]>(
        queryKeys.taxRates.list(filters),
        (old) => old?.map((r) => (r.id === updatedRate.id ? updatedRate : r))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.taxRates.stats() });
    },
  });

  return {
    rates: ratesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: ratesQuery.isLoading,
    error: ratesQuery.error?.message ?? null,
    refetch: ratesQuery.refetch,
    create: (data: CreateTaxRateDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateTaxRateDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    setAsDefault: (id: string) => setDefaultMutation.mutateAsync(id),
    toggleActive: (id: string) => toggleActiveMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useTaxRate(id: string | undefined) {
  const rateQuery = useQuery({
    queryKey: queryKeys.taxRates.detail(id!),
    queryFn: () => taxRatesApi.getById(id!),
    enabled: !!id,
  });

  return {
    rate: rateQuery.data ?? null,
    loading: rateQuery.isLoading,
    error: rateQuery.error?.message ?? null,
    refetch: rateQuery.refetch,
  };
}

export function useDefaultTaxRate(country: string | undefined, region?: string) {
  const defaultQuery = useQuery({
    queryKey: queryKeys.taxRates.default(country!, region),
    queryFn: () => taxRatesApi.getDefault(country!, region),
    enabled: !!country,
  });

  return {
    defaultRate: defaultQuery.data ?? null,
    loading: defaultQuery.isLoading,
    error: defaultQuery.error?.message ?? null,
  };
}

export function useTaxCalculation() {
  const calculateMutation = useMutation({
    mutationFn: (data: TaxCalculationRequest) => taxRatesApi.calculate(data),
  });

  return {
    calculate: (data: TaxCalculationRequest) => calculateMutation.mutateAsync(data),
    isCalculating: calculateMutation.isPending,
    result: calculateMutation.data ?? null,
    error: calculateMutation.error?.message ?? null,
    reset: calculateMutation.reset,
  };
}

export function useTaxRatesByCountry(country: string | undefined) {
  const ratesQuery = useQuery({
    queryKey: queryKeys.taxRates.byCountry(country!),
    queryFn: () => taxRatesApi.getByCountry(country!),
    enabled: !!country,
  });

  return {
    rates: ratesQuery.data ?? [],
    loading: ratesQuery.isLoading,
    error: ratesQuery.error?.message ?? null,
    refetch: ratesQuery.refetch,
  };
}

export function useBulkImportTaxRates() {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (rates: CreateTaxRateDto[]) => taxRatesApi.bulkImport(rates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taxRates.all });
    },
  });

  return {
    bulkImport: (rates: CreateTaxRateDto[]) => importMutation.mutateAsync(rates),
    isImporting: importMutation.isPending,
    result: importMutation.data ?? null,
    error: importMutation.error?.message ?? null,
  };
}
