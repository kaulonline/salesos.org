import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalWorkflowsApi, ApprovalWorkflowFilters, ApprovalRequestFilters } from '../api/approvalWorkflows';
import { queryKeys } from '../lib/queryKeys';
import type {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalRequest,
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  CreateApprovalStepDto,
  UpdateApprovalStepDto,
  SubmitForApprovalDto,
  ApprovalDecisionDto,
  ApprovalEntity,
} from '../types';

// ============ Workflow Hooks ============

export function useApprovalWorkflows(filters?: ApprovalWorkflowFilters) {
  const queryClient = useQueryClient();

  const workflowsQuery = useQuery({
    queryKey: queryKeys.approvalWorkflows.list(filters),
    queryFn: () => approvalWorkflowsApi.getAll(filters),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.approvalWorkflows.stats(),
    queryFn: () => approvalWorkflowsApi.getStats(),
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateApprovalWorkflowDto) => approvalWorkflowsApi.create(data),
    onSuccess: (newWorkflow) => {
      queryClient.setQueryData<ApprovalWorkflow[]>(
        queryKeys.approvalWorkflows.list(filters),
        (old) => (old ? [newWorkflow, ...old] : [newWorkflow])
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.stats() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApprovalWorkflowDto }) =>
      approvalWorkflowsApi.update(id, data),
    onSuccess: (updatedWorkflow) => {
      queryClient.setQueryData<ApprovalWorkflow[]>(
        queryKeys.approvalWorkflows.list(filters),
        (old) => old?.map((w) => (w.id === updatedWorkflow.id ? updatedWorkflow : w))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.detail(updatedWorkflow.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => approvalWorkflowsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ApprovalWorkflow[]>(
        queryKeys.approvalWorkflows.list(filters),
        (old) => old?.filter((w) => w.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.stats() });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => approvalWorkflowsApi.clone(id, name),
    onSuccess: (newWorkflow) => {
      queryClient.setQueryData<ApprovalWorkflow[]>(
        queryKeys.approvalWorkflows.list(filters),
        (old) => (old ? [newWorkflow, ...old] : [newWorkflow])
      );
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => approvalWorkflowsApi.toggleActive(id),
    onSuccess: (updatedWorkflow) => {
      queryClient.setQueryData<ApprovalWorkflow[]>(
        queryKeys.approvalWorkflows.list(filters),
        (old) => old?.map((w) => (w.id === updatedWorkflow.id ? updatedWorkflow : w))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.stats() });
    },
  });

  return {
    workflows: workflowsQuery.data ?? [],
    stats: statsQuery.data ?? null,
    loading: workflowsQuery.isLoading,
    error: workflowsQuery.error?.message ?? null,
    refetch: workflowsQuery.refetch,
    create: (data: CreateApprovalWorkflowDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateApprovalWorkflowDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    clone: (id: string, name: string) => cloneMutation.mutateAsync({ id, name }),
    toggleActive: (id: string) => toggleActiveMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useApprovalWorkflow(id: string | undefined) {
  const queryClient = useQueryClient();

  const workflowQuery = useQuery({
    queryKey: queryKeys.approvalWorkflows.detail(id!),
    queryFn: () => approvalWorkflowsApi.getById(id!),
    enabled: !!id,
  });

  // Step mutations
  const addStepMutation = useMutation({
    mutationFn: (data: CreateApprovalStepDto) => approvalWorkflowsApi.addStep(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.detail(id!) });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: UpdateApprovalStepDto }) =>
      approvalWorkflowsApi.updateStep(id!, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.detail(id!) });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => approvalWorkflowsApi.deleteStep(id!, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.detail(id!) });
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: (stepIds: string[]) => approvalWorkflowsApi.reorderSteps(id!, stepIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalWorkflows.detail(id!) });
    },
  });

  return {
    workflow: workflowQuery.data ?? null,
    loading: workflowQuery.isLoading,
    error: workflowQuery.error?.message ?? null,
    refetch: workflowQuery.refetch,
    addStep: (data: CreateApprovalStepDto) => addStepMutation.mutateAsync(data),
    updateStep: (stepId: string, data: UpdateApprovalStepDto) => updateStepMutation.mutateAsync({ stepId, data }),
    deleteStep: (stepId: string) => deleteStepMutation.mutateAsync(stepId),
    reorderSteps: (stepIds: string[]) => reorderStepsMutation.mutateAsync(stepIds),
    isAddingStep: addStepMutation.isPending,
    isUpdatingStep: updateStepMutation.isPending,
    isDeletingStep: deleteStepMutation.isPending,
  };
}

export function useWorkflowsByEntity(entity: ApprovalEntity | undefined) {
  const workflowsQuery = useQuery({
    queryKey: queryKeys.approvalWorkflows.byEntity(entity!),
    queryFn: () => approvalWorkflowsApi.getByEntity(entity!),
    enabled: !!entity,
  });

  return {
    workflows: workflowsQuery.data ?? [],
    loading: workflowsQuery.isLoading,
    error: workflowsQuery.error?.message ?? null,
  };
}

// ============ Request Hooks ============

export function useApprovalRequests(filters?: ApprovalRequestFilters) {
  const requestsQuery = useQuery({
    queryKey: queryKeys.approvalRequests.list(filters),
    queryFn: () => approvalWorkflowsApi.getRequests(filters),
  });

  return {
    requests: requestsQuery.data ?? [],
    loading: requestsQuery.isLoading,
    error: requestsQuery.error?.message ?? null,
    refetch: requestsQuery.refetch,
  };
}

export function usePendingApprovals() {
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: queryKeys.approvalRequests.pending(),
    queryFn: () => approvalWorkflowsApi.getPendingRequests(),
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });

  const decideMutation = useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: ApprovalDecisionDto }) =>
      approvalWorkflowsApi.decide(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.pending() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.lists() });
    },
  });

  return {
    pendingRequests: pendingQuery.data ?? [],
    loading: pendingQuery.isLoading,
    error: pendingQuery.error?.message ?? null,
    refetch: pendingQuery.refetch,
    decide: (requestId: string, data: ApprovalDecisionDto) => decideMutation.mutateAsync({ requestId, data }),
    isDeciding: decideMutation.isPending,
  };
}

export function useApprovalRequest(id: string | undefined) {
  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: queryKeys.approvalRequests.detail(id!),
    queryFn: () => approvalWorkflowsApi.getRequestById(id!),
    enabled: !!id,
  });

  const decideMutation = useMutation({
    mutationFn: (data: ApprovalDecisionDto) => approvalWorkflowsApi.decide(id!, data),
    onSuccess: (updatedRequest) => {
      queryClient.setQueryData(queryKeys.approvalRequests.detail(id!), updatedRequest);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.pending() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.lists() });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => approvalWorkflowsApi.cancelRequest(id!, reason),
    onSuccess: (updatedRequest) => {
      queryClient.setQueryData(queryKeys.approvalRequests.detail(id!), updatedRequest);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.pending() });
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.lists() });
    },
  });

  return {
    request: requestQuery.data ?? null,
    loading: requestQuery.isLoading,
    error: requestQuery.error?.message ?? null,
    refetch: requestQuery.refetch,
    decide: (data: ApprovalDecisionDto) => decideMutation.mutateAsync(data),
    cancel: (reason?: string) => cancelMutation.mutateAsync(reason),
    isDeciding: decideMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}

export function useSubmitForApproval() {
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data: SubmitForApprovalDto) => approvalWorkflowsApi.submitForApproval(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests.lists() });
      // Invalidate the entity that was submitted
      if (variables.entityType === 'QUOTE') {
        queryClient.invalidateQueries({ queryKey: queryKeys.quotes.detail(variables.entityId) });
      }
    },
  });

  return {
    submit: (data: SubmitForApprovalDto) => submitMutation.mutateAsync(data),
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error?.message ?? null,
  };
}

export function useEntityApprovalStatus(entityType: ApprovalEntity | undefined, entityId: string | undefined) {
  const statusQuery = useQuery({
    queryKey: queryKeys.approvalRequests.forEntity(entityType!, entityId!),
    queryFn: () => approvalWorkflowsApi.getRequestsForEntity(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });

  const checkQuery = useQuery({
    queryKey: queryKeys.approvalWorkflows.check(entityType!, entityId!),
    queryFn: () => approvalWorkflowsApi.checkApprovalRequired(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });

  const latestRequest = statusQuery.data?.[0] ?? null;
  const isPending = latestRequest?.status === 'PENDING';
  const isApproved = latestRequest?.status === 'APPROVED';
  const isRejected = latestRequest?.status === 'REJECTED';

  return {
    requests: statusQuery.data ?? [],
    latestRequest,
    requiresApproval: checkQuery.data?.required ?? false,
    applicableWorkflow: checkQuery.data?.workflow ?? null,
    isPending,
    isApproved,
    isRejected,
    loading: statusQuery.isLoading || checkQuery.isLoading,
    error: statusQuery.error?.message ?? checkQuery.error?.message ?? null,
  };
}

export function useApprovalHistory(entityType: ApprovalEntity | undefined, entityId: string | undefined) {
  const historyQuery = useQuery({
    queryKey: queryKeys.approvalRequests.history(entityType!, entityId!),
    queryFn: () => approvalWorkflowsApi.getApprovalHistory(entityType!, entityId!),
    enabled: !!entityType && !!entityId,
  });

  return {
    history: historyQuery.data ?? [],
    loading: historyQuery.isLoading,
    error: historyQuery.error?.message ?? null,
  };
}
