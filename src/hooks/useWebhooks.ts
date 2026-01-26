import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { webhooksApi, WebhookFilters, WebhookLogFilters } from '../api/webhooks';
import { queryKeys } from '../lib/queryKeys';
import type { Webhook, CreateWebhookDto, UpdateWebhookDto, WebhookEvent } from '../types';

export function useWebhooks(filters?: WebhookFilters) {
  const queryClient = useQueryClient();

  const webhooksQuery = useQuery({
    queryKey: queryKeys.webhooks.list(filters),
    queryFn: () => webhooksApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.webhooks.stats(),
    queryFn: () => webhooksApi.getStats().catch(() => ({
      total: 0,
      active: 0,
      totalDeliveries: 0,
      deliveryRate: 0,
    })),
    staleTime: 60 * 1000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWebhookDto) => webhooksApi.create(data),
    onSuccess: (newWebhook) => {
      queryClient.setQueryData<Webhook[]>(
        queryKeys.webhooks.list(filters),
        (old) => (old ? [newWebhook, ...old] : [newWebhook])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookDto }) =>
      webhooksApi.update(id, data),
    onSuccess: (updatedWebhook) => {
      queryClient.setQueryData<Webhook[]>(
        queryKeys.webhooks.list(filters),
        (old) => old?.map((w) => (w.id === updatedWebhook.id ? updatedWebhook : w))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Webhook[]>(
        queryKeys.webhooks.list(filters),
        (old) => old?.filter((w) => w.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.stats() });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.activate(id),
    onSuccess: (updatedWebhook) => {
      queryClient.setQueryData<Webhook[]>(
        queryKeys.webhooks.list(filters),
        (old) => old?.map((w) => (w.id === updatedWebhook.id ? updatedWebhook : w))
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.deactivate(id),
    onSuccess: (updatedWebhook) => {
      queryClient.setQueryData<Webhook[]>(
        queryKeys.webhooks.list(filters),
        (old) => old?.map((w) => (w.id === updatedWebhook.id ? updatedWebhook : w))
      );
    },
  });

  return {
    webhooks: webhooksQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: webhooksQuery.isLoading,
    error: webhooksQuery.error?.message ?? null,
    refetch: webhooksQuery.refetch,
    create: (data: CreateWebhookDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateWebhookDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    activate: (id: string) => activateMutation.mutateAsync(id),
    deactivate: (id: string) => deactivateMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useWebhook(id: string | undefined) {
  const queryClient = useQueryClient();

  const webhookQuery = useQuery({
    queryKey: queryKeys.webhooks.detail(id!),
    queryFn: () => webhooksApi.getById(id!),
    enabled: !!id,
  });

  const testMutation = useMutation({
    mutationFn: (event?: WebhookEvent) => webhooksApi.test(id!, event),
  });

  const regenerateSecretMutation = useMutation({
    mutationFn: () => webhooksApi.regenerateSecret(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.detail(id!) });
    },
  });

  const resetFailuresMutation = useMutation({
    mutationFn: () => webhooksApi.resetFailures(id!),
    onSuccess: (updatedWebhook) => {
      queryClient.setQueryData(queryKeys.webhooks.detail(id!), updatedWebhook);
    },
  });

  return {
    webhook: webhookQuery.data ?? null,
    loading: webhookQuery.isLoading,
    error: webhookQuery.error?.message ?? null,
    refetch: webhookQuery.refetch,
    test: (event?: WebhookEvent) => testMutation.mutateAsync(event),
    testResult: testMutation.data,
    isTesting: testMutation.isPending,
    regenerateSecret: () => regenerateSecretMutation.mutateAsync(),
    isRegenerating: regenerateSecretMutation.isPending,
    newSecret: regenerateSecretMutation.data?.secret,
    resetFailures: () => resetFailuresMutation.mutateAsync(),
    isResetting: resetFailuresMutation.isPending,
  };
}

export function useWebhookLogs(webhookId: string | undefined, filters?: WebhookLogFilters) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: queryKeys.webhooks.logs(webhookId!),
    queryFn: () => webhooksApi.getLogs(webhookId!, filters),
    enabled: !!webhookId,
  });

  const retryMutation = useMutation({
    mutationFn: (logId: string) => webhooksApi.retryDelivery(webhookId!, logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.logs(webhookId!) });
    },
  });

  return {
    logs: logsQuery.data ?? [],
    loading: logsQuery.isLoading,
    error: logsQuery.error?.message ?? null,
    refetch: logsQuery.refetch,
    retry: (logId: string) => retryMutation.mutateAsync(logId),
    isRetrying: retryMutation.isPending,
  };
}

export function useWebhookEvents() {
  const eventsQuery = useQuery({
    queryKey: queryKeys.webhooks.events(),
    queryFn: () => webhooksApi.getAvailableEvents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    events: eventsQuery.data ?? [],
    loading: eventsQuery.isLoading,
    error: eventsQuery.error?.message ?? null,
  };
}
