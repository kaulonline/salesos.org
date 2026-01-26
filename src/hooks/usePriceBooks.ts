import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priceBooksApi, PriceBookFilters, PriceBookEntryFilters } from '../api/priceBooks';
import { queryKeys } from '../lib/queryKeys';
import type {
  PriceBook,
  CreatePriceBookDto,
  UpdatePriceBookDto,
  PriceBookEntry,
  CreatePriceBookEntryDto,
  UpdatePriceBookEntryDto,
} from '../types';

export function usePriceBooks(filters?: PriceBookFilters) {
  const queryClient = useQueryClient();

  const priceBooksQuery = useQuery({
    queryKey: queryKeys.priceBooks.list(filters),
    queryFn: () => priceBooksApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.priceBooks.stats(),
    queryFn: () => priceBooksApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreatePriceBookDto) => priceBooksApi.create(data),
    onSuccess: (newPriceBook) => {
      queryClient.setQueryData<PriceBook[]>(
        queryKeys.priceBooks.list(filters),
        (old) => (old ? [...old, newPriceBook] : [newPriceBook])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.priceBooks.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceBookDto }) =>
      priceBooksApi.update(id, data),
    onSuccess: (updatedPriceBook) => {
      queryClient.setQueryData<PriceBook[]>(
        queryKeys.priceBooks.list(filters),
        (old) => old?.map((pb) => (pb.id === updatedPriceBook.id ? updatedPriceBook : pb))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => priceBooksApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<PriceBook[]>(
        queryKeys.priceBooks.list(filters),
        (old) => old?.filter((pb) => pb.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.priceBooks.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => priceBooksApi.clone(id, name),
    onSuccess: (newPriceBook) => {
      queryClient.setQueryData<PriceBook[]>(
        queryKeys.priceBooks.list(filters),
        (old) => (old ? [...old, newPriceBook] : [newPriceBook])
      );
    },
  });

  return {
    priceBooks: priceBooksQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: priceBooksQuery.isLoading,
    error: priceBooksQuery.error?.message ?? null,
    refetch: priceBooksQuery.refetch,
    create: (data: CreatePriceBookDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdatePriceBookDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    clone: (id: string, name: string) => cloneMutation.mutateAsync({ id, name }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePriceBook(id: string | undefined) {
  const priceBookQuery = useQuery({
    queryKey: queryKeys.priceBooks.detail(id!),
    queryFn: () => priceBooksApi.getById(id!),
    enabled: !!id,
  });

  return {
    priceBook: priceBookQuery.data ?? null,
    loading: priceBookQuery.isLoading,
    error: priceBookQuery.error?.message ?? null,
    refetch: priceBookQuery.refetch,
  };
}

export function useStandardPriceBook() {
  const standardQuery = useQuery({
    queryKey: queryKeys.priceBooks.standard(),
    queryFn: () => priceBooksApi.getStandard(),
  });

  return {
    priceBook: standardQuery.data ?? null,
    loading: standardQuery.isLoading,
    error: standardQuery.error?.message ?? null,
  };
}

export function usePriceBookEntries(priceBookId: string | undefined, filters?: PriceBookEntryFilters) {
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: queryKeys.priceBooks.entries(priceBookId!),
    queryFn: () => priceBooksApi.getEntries(priceBookId!, filters),
    enabled: !!priceBookId,
  });

  const addEntryMutation = useMutation({
    mutationFn: (data: CreatePriceBookEntryDto) => priceBooksApi.addEntry(priceBookId!, data),
    onSuccess: (newEntry) => {
      queryClient.setQueryData<PriceBookEntry[]>(
        queryKeys.priceBooks.entries(priceBookId!),
        (old) => (old ? [...old, newEntry] : [newEntry])
      );
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: UpdatePriceBookEntryDto }) =>
      priceBooksApi.updateEntry(priceBookId!, entryId, data),
    onSuccess: (updatedEntry) => {
      queryClient.setQueryData<PriceBookEntry[]>(
        queryKeys.priceBooks.entries(priceBookId!),
        (old) => old?.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
      );
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => priceBooksApi.deleteEntry(priceBookId!, entryId),
    onSuccess: (_, entryId) => {
      queryClient.setQueryData<PriceBookEntry[]>(
        queryKeys.priceBooks.entries(priceBookId!),
        (old) => old?.filter((e) => e.id !== entryId)
      );
    },
  });

  return {
    entries: entriesQuery.data ?? [],
    loading: entriesQuery.isLoading,
    error: entriesQuery.error?.message ?? null,
    refetch: entriesQuery.refetch,
    addEntry: (data: CreatePriceBookEntryDto) => addEntryMutation.mutateAsync(data),
    updateEntry: (entryId: string, data: UpdatePriceBookEntryDto) =>
      updateEntryMutation.mutateAsync({ entryId, data }),
    deleteEntry: (entryId: string) => deleteEntryMutation.mutateAsync(entryId),
    isAdding: addEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
  };
}
