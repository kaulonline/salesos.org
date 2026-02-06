import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, AgentType, AgentStatus, AgentStatusType, AgentExecution, QueueStatus } from '../api/agents';

const agentKeys = {
  all: ['agents'] as const,
  list: () => [...agentKeys.all, 'list'] as const,
  detail: (type: AgentType) => [...agentKeys.all, 'detail', type] as const,
  executions: (filters?: any) => [...agentKeys.all, 'executions', filters] as const,
  queue: () => [...agentKeys.all, 'queue'] as const,
  analytics: () => [...agentKeys.all, 'analytics'] as const,
};

export function useAgents() {
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: agentKeys.list(),
    queryFn: () => agentsApi.getAll(),
    staleTime: 30 * 1000, // 30 seconds
  });

  const queueQuery = useQuery({
    queryKey: agentKeys.queue(),
    queryFn: () => agentsApi.getQueueStatus(),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  const triggerMutation = useMutation({
    mutationFn: ({
      agentType,
      options,
    }: {
      agentType: AgentType;
      options?: {
        entityType?: string;
        entityId?: string;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      };
    }) => agentsApi.trigger(agentType, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      queryClient.invalidateQueries({ queryKey: agentKeys.queue() });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({
      agentType,
      config,
    }: {
      agentType: AgentType;
      config: {
        enabled?: boolean;
        requiresApproval?: boolean;
        scheduleEnabled?: boolean;
        scheduleCron?: string;
      };
    }) => agentsApi.updateConfig(agentType, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });

  // Calculate aggregate stats from agents
  const stats = {
    totalAgents: agentsQuery.data?.length || 0,
    activeAgents: agentsQuery.data?.filter((a) => a.enabled).length || 0,
    totalExecutions: agentsQuery.data?.reduce((sum, a) => sum + a.executionCount, 0) || 0,
    totalErrors: agentsQuery.data?.reduce((sum, a) => sum + a.errorCount, 0) || 0,
    queuedJobs: queueQuery.data?.queuedJobs || 0,
    runningJobs: queueQuery.data?.runningJobs || 0,
  };

  return {
    agents: agentsQuery.data || [],
    loading: agentsQuery.isLoading,
    error: agentsQuery.error?.message || null,
    refetch: agentsQuery.refetch,

    queueStatus: queueQuery.data || null,
    queueLoading: queueQuery.isLoading,

    stats,

    trigger: (agentType: AgentType, options?: any) =>
      triggerMutation.mutateAsync({ agentType, options }),
    isTriggering: triggerMutation.isPending,

    updateConfig: (agentType: AgentType, config: any) =>
      updateConfigMutation.mutateAsync({ agentType, config }),
    isUpdating: updateConfigMutation.isPending,
  };
}

export function useAgent(agentType: AgentType | undefined) {
  const query = useQuery({
    queryKey: agentKeys.detail(agentType!),
    queryFn: () => agentsApi.getAgent(agentType!),
    enabled: !!agentType,
  });

  return {
    agent: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

export function useAgentExecutions(filters?: {
  agentType?: AgentType;
  status?: string;
  days?: number;
  limit?: number;
}) {
  const query = useQuery({
    queryKey: agentKeys.executions(filters),
    queryFn: () => agentsApi.getExecutions(filters),
    staleTime: 30 * 1000,
  });

  return {
    executions: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

export function useAgentAnalytics() {
  const query = useQuery({
    queryKey: agentKeys.analytics(),
    queryFn: () => agentsApi.getAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    analytics: query.data || null,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, status }: { type: AgentType; status: AgentStatusType }) =>
      agentsApi.updateConfig(type, { enabled: status === 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

export function useRunAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type }: { type: AgentType }) =>
      agentsApi.trigger(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
      queryClient.invalidateQueries({ queryKey: agentKeys.executions() });
    },
  });
}
