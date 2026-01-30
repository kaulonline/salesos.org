import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playbooksApi } from '../api';
import { queryKeys } from '../lib/queryKeys';
import type {
  Playbook,
  CreatePlaybookDto,
  UpdatePlaybookDto,
  CreatePlaybookStepDto,
  UpdatePlaybookStepDto,
  StartPlaybookDto,
  PlaybookFilters,
  ExecutionFilters,
} from '../types/playbook';

/**
 * Hook to manage all playbooks with CRUD operations
 */
export function usePlaybooks(filters?: PlaybookFilters) {
  const queryClient = useQueryClient();

  // Fetch all playbooks
  const {
    data: playbooks = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playbooks.list(filters),
    queryFn: () => playbooksApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch playbook stats
  const {
    data: stats,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: queryKeys.playbooks.stats(),
    queryFn: playbooksApi.getStats,
    staleTime: 5 * 60 * 1000,
  });

  // Create playbook mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePlaybookDto) => playbooksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
    },
  });

  // Update playbook mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaybookDto }) =>
      playbooksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
    },
  });

  // Delete playbook mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => playbooksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
    },
  });

  // Duplicate playbook mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => playbooksApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
    },
  });

  return {
    playbooks,
    stats,
    loading,
    loadingStats,
    error: error?.message || null,
    refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: UpdatePlaybookDto) => updateMutation.mutateAsync({ id, data }),
    remove: deleteMutation.mutateAsync,
    duplicate: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}

/**
 * Hook to manage a single playbook and its steps
 */
export function usePlaybook(id: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch single playbook
  const {
    data: playbook,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playbooks.detail(id || ''),
    queryFn: () => playbooksApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Add step mutation
  const addStepMutation = useMutation({
    mutationFn: (data: CreatePlaybookStepDto) => playbooksApi.addStep(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.list() });
    },
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: UpdatePlaybookStepDto }) =>
      playbooksApi.updateStep(id!, stepId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.detail(id!) });
    },
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => playbooksApi.deleteStep(id!, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.list() });
    },
  });

  // Reorder steps mutation
  const reorderStepsMutation = useMutation({
    mutationFn: (stepIds: string[]) => playbooksApi.reorderSteps(id!, stepIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.detail(id!) });
    },
  });

  // Start execution mutation
  const startExecutionMutation = useMutation({
    mutationFn: (data: StartPlaybookDto) => playbooksApi.startExecution(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.stats() });
    },
  });

  return {
    playbook,
    loading,
    error: error?.message || null,
    refetch,
    addStep: addStepMutation.mutateAsync,
    updateStep: (stepId: string, data: UpdatePlaybookStepDto) =>
      updateStepMutation.mutateAsync({ stepId, data }),
    deleteStep: deleteStepMutation.mutateAsync,
    reorderSteps: reorderStepsMutation.mutateAsync,
    startExecution: startExecutionMutation.mutateAsync,
    isAddingStep: addStepMutation.isPending,
    isUpdatingStep: updateStepMutation.isPending,
    isDeletingStep: deleteStepMutation.isPending,
    isReordering: reorderStepsMutation.isPending,
    isStartingExecution: startExecutionMutation.isPending,
  };
}

/**
 * Hook to manage playbook executions
 */
export function usePlaybookExecutions(filters?: ExecutionFilters) {
  const queryClient = useQueryClient();

  // Fetch all executions
  const {
    data: executions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playbooks.executionsList(filters),
    queryFn: () => playbooksApi.getExecutions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes - executions change more often
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: ({ executionId, stepId, outcome, notes }: { executionId: string; stepId: string; outcome?: string; notes?: string }) =>
      playbooksApi.completeStep(executionId, stepId, outcome, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.stats() });
    },
  });

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: ({ executionId, stepId, reason }: { executionId: string; stepId: string; reason?: string }) =>
      playbooksApi.skipStep(executionId, stepId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
    },
  });

  // Cancel execution mutation
  const cancelExecutionMutation = useMutation({
    mutationFn: (executionId: string) => playbooksApi.cancelExecution(executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.stats() });
    },
  });

  return {
    executions,
    loading,
    error: error?.message || null,
    refetch,
    completeStep: (executionId: string, stepId: string, outcome?: string, notes?: string) =>
      completeStepMutation.mutateAsync({ executionId, stepId, outcome, notes }),
    skipStep: (executionId: string, stepId: string, reason?: string) =>
      skipStepMutation.mutateAsync({ executionId, stepId, reason }),
    cancelExecution: cancelExecutionMutation.mutateAsync,
    isCompletingStep: completeStepMutation.isPending,
    isSkippingStep: skipStepMutation.isPending,
    isCancellingExecution: cancelExecutionMutation.isPending,
  };
}

/**
 * Hook to get a single execution
 */
export function usePlaybookExecution(executionId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: execution,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.playbooks.execution(executionId || ''),
    queryFn: () => playbooksApi.getExecution(executionId!),
    enabled: !!executionId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: ({ stepId, outcome, notes }: { stepId: string; outcome?: string; notes?: string }) =>
      playbooksApi.completeStep(executionId!, stepId, outcome, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.execution(executionId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.stats() });
    },
  });

  // Skip step mutation
  const skipStepMutation = useMutation({
    mutationFn: ({ stepId, reason }: { stepId: string; reason?: string }) =>
      playbooksApi.skipStep(executionId!, stepId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.execution(executionId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
    },
  });

  // Cancel execution mutation
  const cancelExecutionMutation = useMutation({
    mutationFn: () => playbooksApi.cancelExecution(executionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.execution(executionId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.executions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.stats() });
    },
  });

  return {
    execution,
    loading,
    error: error?.message || null,
    refetch,
    completeStep: (stepId: string, outcome?: string, notes?: string) =>
      completeStepMutation.mutateAsync({ stepId, outcome, notes }),
    skipStep: (stepId: string, reason?: string) =>
      skipStepMutation.mutateAsync({ stepId, reason }),
    cancelExecution: cancelExecutionMutation.mutateAsync,
    isCompletingStep: completeStepMutation.isPending,
    isSkippingStep: skipStepMutation.isPending,
    isCancellingExecution: cancelExecutionMutation.isPending,
  };
}
