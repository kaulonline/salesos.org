import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import { queryKeys } from '../lib/queryKeys';
import type {
  Order,
  OrderFilters,
  CreateOrderDto,
  UpdateOrderDto,
  CreateOrderLineItemDto,
  UpdateOrderLineItemDto,
  ConvertQuoteToOrderDto,
  FulfillOrderDto,
  RecordPaymentDto,
} from '../types/order';

export function useOrders(filters?: OrderFilters) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersApi.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateOrderDto) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    loading: ordersQuery.isLoading,
    error: ordersQuery.error?.message ?? null,
    refetch: ordersQuery.refetch,
    create: (data: CreateOrderDto) => createMutation.mutateAsync(data),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useOrder(id: string | undefined) {
  const queryClient = useQueryClient();
  const isNewOrder = id === 'new';

  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(id!),
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id && !isNewOrder,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrderDto) => ordersApi.update(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => ordersApi.confirm(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => ordersApi.cancel(id!, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const shipMutation = useMutation({
    mutationFn: (data: { trackingNumber?: string; trackingUrl?: string }) => ordersApi.ship(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => ordersApi.deliver(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: (data: FulfillOrderDto) => ordersApi.fulfill(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (data: RecordPaymentDto) => ordersApi.recordPayment(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: () => ordersApi.clone(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: () => ordersApi.recalculate(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(id!), updated);
    },
  });

  return {
    order: orderQuery.data ?? null,
    loading: orderQuery.isLoading,
    error: orderQuery.error?.message ?? null,
    refetch: orderQuery.refetch,
    update: (data: UpdateOrderDto) => updateMutation.mutateAsync(data),
    confirm: () => confirmMutation.mutateAsync(),
    cancel: (reason?: string) => cancelMutation.mutateAsync(reason),
    ship: (data: { trackingNumber?: string; trackingUrl?: string }) => shipMutation.mutateAsync(data),
    deliver: () => deliverMutation.mutateAsync(),
    fulfill: (data: FulfillOrderDto) => fulfillMutation.mutateAsync(data),
    recordPayment: (data: RecordPaymentDto) => recordPaymentMutation.mutateAsync(data),
    clone: () => cloneMutation.mutateAsync(),
    recalculate: () => recalculateMutation.mutateAsync(),
    isUpdating: updateMutation.isPending,
    isConfirming: confirmMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isShipping: shipMutation.isPending,
    isDelivering: deliverMutation.isPending,
    isFulfilling: fulfillMutation.isPending,
    isRecordingPayment: recordPaymentMutation.isPending,
    isCloning: cloneMutation.isPending,
    isRecalculating: recalculateMutation.isPending,
  };
}

export function useOrderLineItems(orderId: string | undefined) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (data: CreateOrderLineItemDto) => ordersApi.addLineItem(orderId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId!) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineItemId, data }: { lineItemId: string; data: UpdateOrderLineItemDto }) =>
      ordersApi.updateLineItem(orderId!, lineItemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId!) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (lineItemId: string) => ordersApi.removeLineItem(orderId!, lineItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId!) });
    },
  });

  return {
    addLineItem: (data: CreateOrderLineItemDto) => addMutation.mutateAsync(data),
    updateLineItem: (lineItemId: string, data: UpdateOrderLineItemDto) =>
      updateMutation.mutateAsync({ lineItemId, data }),
    removeLineItem: (lineItemId: string) => removeMutation.mutateAsync(lineItemId),
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}

export function useOrderStats() {
  const statsQuery = useQuery({
    queryKey: queryKeys.orders.stats(),
    queryFn: () => ordersApi.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: statsQuery.data ?? null,
    loading: statsQuery.isLoading,
    error: statsQuery.error?.message ?? null,
  };
}

export function useOrderTimeline(orderId: string | undefined) {
  const isNewOrder = orderId === 'new';

  const timelineQuery = useQuery({
    queryKey: queryKeys.orders.timeline(orderId!),
    queryFn: () => ordersApi.getTimeline(orderId!),
    enabled: !!orderId && !isNewOrder,
  });

  return {
    timeline: timelineQuery.data ?? [],
    loading: timelineQuery.isLoading,
    error: timelineQuery.error?.message ?? null,
    refetch: timelineQuery.refetch,
  };
}

export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: (data: ConvertQuoteToOrderDto) => ordersApi.convertFromQuote(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(order.quoteId!) });
    },
  });

  return {
    convert: (data: ConvertQuoteToOrderDto) => convertMutation.mutateAsync(data),
    isConverting: convertMutation.isPending,
    error: convertMutation.error?.message ?? null,
  };
}

export function useAccountOrders(accountId: string | undefined) {
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.byAccount(accountId!),
    queryFn: () => ordersApi.getByAccountId(accountId!),
    enabled: !!accountId,
  });

  return {
    orders: ordersQuery.data ?? [],
    loading: ordersQuery.isLoading,
    error: ordersQuery.error?.message ?? null,
    refetch: ordersQuery.refetch,
  };
}

export function useDownloadOrderPdf() {
  const downloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const blob = await ordersApi.generatePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  return {
    download: (id: string) => downloadMutation.mutateAsync(id),
    isDownloading: downloadMutation.isPending,
    error: downloadMutation.error?.message ?? null,
  };
}
