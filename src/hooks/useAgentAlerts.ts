import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentAlertsApi } from '../api/agentAlerts';
import type { AgentAlertFilters, AlertStatus } from '../api/agentAlerts';

// Query keys for agent alerts
export const agentAlertKeys = {
  all: ['agentAlerts'] as const,
  list: (filters?: AgentAlertFilters) => [...agentAlertKeys.all, 'list', filters] as const,
  pending: () => [...agentAlertKeys.all, 'pending'] as const,
  queue: () => [...agentAlertKeys.all, 'queue'] as const,
};

export function useAgentAlerts(filters?: AgentAlertFilters) {
  const queryClient = useQueryClient();

  // Fetch alerts
  const alertsQuery = useQuery({
    queryKey: agentAlertKeys.list(filters),
    queryFn: () => agentAlertsApi.getAll(filters),
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Fetch pending summary
  const pendingSummaryQuery = useQuery({
    queryKey: agentAlertKeys.pending(),
    queryFn: () => agentAlertsApi.getPendingSummary(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: AlertStatus; notes?: string }) =>
      agentAlertsApi.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.all });
    },
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => agentAlertsApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.all });
    },
  });

  // Mark as actioned mutation
  const actionedMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      agentAlertsApi.markActioned(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.all });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      agentAlertsApi.dismiss(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.all });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentAlertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.all });
    },
  });

  return {
    // Data
    alerts: alertsQuery.data || [],
    pendingSummary: pendingSummaryQuery.data,
    totalPending: pendingSummaryQuery.data?.total || 0,

    // Loading states
    loading: alertsQuery.isLoading,
    isFetching: alertsQuery.isFetching,
    pendingLoading: pendingSummaryQuery.isLoading,

    // Error state
    error: alertsQuery.error,

    // Actions
    acknowledge: acknowledgeMutation.mutateAsync,
    markActioned: (id: string, notes?: string) => actionedMutation.mutateAsync({ id, notes }),
    dismiss: (id: string, reason?: string) => dismissMutation.mutateAsync({ id, reason }),
    deleteAlert: deleteMutation.mutateAsync,
    updateStatus: (id: string, status: AlertStatus, notes?: string) =>
      updateStatusMutation.mutateAsync({ id, status, notes }),

    // Mutation states
    acknowledging: acknowledgeMutation.isPending,
    actioning: actionedMutation.isPending,
    dismissing: dismissMutation.isPending,
    deleting: deleteMutation.isPending,

    // Refetch
    refetch: alertsQuery.refetch,
    refetchPending: pendingSummaryQuery.refetch,
  };
}

// Hook for queue status
export function useAgentQueue() {
  const queueQuery = useQuery({
    queryKey: agentAlertKeys.queue(),
    queryFn: () => agentAlertsApi.getQueueStatus(),
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });

  return {
    queuedJobs: queueQuery.data?.queuedJobs || 0,
    runningJobs: queueQuery.data?.runningJobs || 0,
    jobsByAgent: queueQuery.data?.jobsByAgent || {},
    loading: queueQuery.isLoading,
    refetch: queueQuery.refetch,
  };
}

// Hook for triggering agents
export function useAgentTrigger() {
  const queryClient = useQueryClient();

  const triggerMutation = useMutation({
    mutationFn: agentAlertsApi.triggerAgent,
    onSuccess: () => {
      // Invalidate queue status after triggering
      queryClient.invalidateQueries({ queryKey: agentAlertKeys.queue() });
    },
  });

  return {
    trigger: triggerMutation.mutateAsync,
    triggering: triggerMutation.isPending,
    error: triggerMutation.error,
  };
}
