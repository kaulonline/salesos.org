import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi, QuoteFilters } from '../api/quotes';
import { queryKeys } from '../lib/queryKeys';
import type {
  Quote,
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteLineItem,
  CreateQuoteLineItemDto,
  UpdateQuoteLineItemDto,
  SendQuoteDto,
  ApproveQuoteDto,
  RejectQuoteDto,
} from '../types';

export function useQuotes(filters?: QuoteFilters) {
  const queryClient = useQueryClient();

  const quotesQuery = useQuery({
    queryKey: queryKeys.quotes.list(filters),
    queryFn: () => quotesApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.quotes.stats(),
    queryFn: () => quotesApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateQuoteDto) => quotesApi.create(data),
    onSuccess: (newQuote) => {
      queryClient.setQueryData<Quote[]>(
        queryKeys.quotes.list(filters),
        (old) => (old ? [newQuote, ...old] : [newQuote])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuoteDto }) =>
      quotesApi.update(id, data),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData<Quote[]>(
        queryKeys.quotes.list(filters),
        (old) => old?.map((q) => (q.id === updatedQuote.id ? updatedQuote : q))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Quote[]>(
        queryKeys.quotes.list(filters),
        (old) => old?.filter((q) => q.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.stats() });
    },
  });

  return {
    quotes: quotesQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: quotesQuery.isLoading,
    error: quotesQuery.error?.message ?? null,
    refetch: quotesQuery.refetch,
    create: (data: CreateQuoteDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateQuoteDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useQuotesByOpportunity(opportunityId: string | undefined) {
  const quotesQuery = useQuery({
    queryKey: queryKeys.quotes.byOpportunity(opportunityId!),
    queryFn: () => quotesApi.getByOpportunity(opportunityId!),
    enabled: !!opportunityId,
  });

  return {
    quotes: quotesQuery.data ?? [],
    loading: quotesQuery.isLoading,
    error: quotesQuery.error?.message ?? null,
    refetch: quotesQuery.refetch,
  };
}

export function useQuote(id: string | undefined) {
  const queryClient = useQueryClient();

  const quoteQuery = useQuery({
    queryKey: queryKeys.quotes.detail(id!),
    queryFn: () => quotesApi.getById(id!),
    enabled: !!id,
  });

  // Line item mutations
  const addLineItemMutation = useMutation({
    mutationFn: (data: CreateQuoteLineItemDto) => quotesApi.addLineItem(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(id!) });
    },
  });

  const updateLineItemMutation = useMutation({
    mutationFn: ({ lineItemId, data }: { lineItemId: string; data: UpdateQuoteLineItemDto }) =>
      quotesApi.updateLineItem(id!, lineItemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(id!) });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: (lineItemId: string) => quotesApi.deleteLineItem(id!, lineItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(id!) });
    },
  });

  // Quote action mutations
  const sendMutation = useMutation({
    mutationFn: (data: SendQuoteDto) => quotesApi.send(id!, data),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (data?: ApproveQuoteDto) => quotesApi.approve(id!, data),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: RejectQuoteDto) => quotesApi.reject(id!, data),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: () => quotesApi.clone(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const markAcceptedMutation = useMutation({
    mutationFn: () => quotesApi.markAccepted(id!),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => quotesApi.cancel(id!, reason),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: () => quotesApi.recalculate(id!),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(id!), updatedQuote);
    },
  });

  return {
    quote: quoteQuery.data ?? null,
    loading: quoteQuery.isLoading,
    error: quoteQuery.error?.message ?? null,
    refetch: quoteQuery.refetch,

    // Line item actions
    addLineItem: (data: CreateQuoteLineItemDto) => addLineItemMutation.mutateAsync(data),
    updateLineItem: (lineItemId: string, data: UpdateQuoteLineItemDto) =>
      updateLineItemMutation.mutateAsync({ lineItemId, data }),
    deleteLineItem: (lineItemId: string) => deleteLineItemMutation.mutateAsync(lineItemId),

    // Quote actions
    send: (data: SendQuoteDto) => sendMutation.mutateAsync(data),
    approve: (data?: ApproveQuoteDto) => approveMutation.mutateAsync(data),
    reject: (data: RejectQuoteDto) => rejectMutation.mutateAsync(data),
    clone: () => cloneMutation.mutateAsync(),
    markAccepted: () => markAcceptedMutation.mutateAsync(),
    cancel: (reason?: string) => cancelMutation.mutateAsync(reason),
    recalculate: () => recalculateMutation.mutateAsync(),

    // Loading states
    isSending: sendMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCloning: cloneMutation.isPending,
    isAccepting: markAcceptedMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRecalculating: recalculateMutation.isPending,
  };
}

export function useCreateQuoteFromOpportunity() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (opportunityId: string) => quotesApi.createFromOpportunity(opportunityId),
    onSuccess: (newQuote, opportunityId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.byOpportunity(opportunityId) });
    },
  });

  return {
    createFromOpportunity: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
