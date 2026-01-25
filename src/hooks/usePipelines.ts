import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelinesApi } from '../api';
import { queryKeys } from '../lib/queryKeys';
import type {
  Pipeline,
  CreatePipelineDto,
  UpdatePipelineDto,
  CreatePipelineStageDto,
  UpdatePipelineStageDto,
} from '../types';

/**
 * Hook to manage all pipelines with CRUD operations
 */
export function usePipelines() {
  const queryClient = useQueryClient();

  // Fetch all pipelines
  const {
    data: pipelines = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: pipelinesApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get default pipeline
  const {
    data: defaultPipeline,
    isLoading: loadingDefault,
  } = useQuery({
    queryKey: queryKeys.pipelines.default(),
    queryFn: pipelinesApi.getDefault,
    staleTime: 5 * 60 * 1000,
  });

  // Create pipeline mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePipelineDto) => pipelinesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
  });

  // Update pipeline mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePipelineDto }) =>
      pipelinesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
  });

  // Delete pipeline mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
  });

  // Set default pipeline mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
  });

  // Duplicate pipeline mutation
  const duplicateMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      pipelinesApi.duplicate(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    },
  });

  return {
    pipelines,
    defaultPipeline,
    loading,
    loadingDefault,
    error: error?.message || null,
    refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: UpdatePipelineDto) => updateMutation.mutateAsync({ id, data }),
    remove: deleteMutation.mutateAsync,
    setDefault: setDefaultMutation.mutateAsync,
    duplicate: (id: string, newName: string) => duplicateMutation.mutateAsync({ id, newName }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook to manage a single pipeline and its stages
 */
export function usePipeline(id: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch single pipeline
  const {
    data: pipeline,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.pipelines.detail(id || ''),
    queryFn: () => pipelinesApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Create stage mutation
  const createStageMutation = useMutation({
    mutationFn: (data: CreatePipelineStageDto) =>
      pipelinesApi.createStage(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
    },
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: ({ stageId, data }: { stageId: string; data: UpdatePipelineStageDto }) =>
      pipelinesApi.updateStage(id!, stageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
    },
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: (stageId: string) => pipelinesApi.deleteStage(id!, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
    },
  });

  // Reorder stages mutation
  const reorderStagesMutation = useMutation({
    mutationFn: (stageIds: string[]) =>
      pipelinesApi.reorderStages(id!, { stageIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.list() });
    },
  });

  return {
    pipeline,
    loading,
    error: error?.message || null,
    refetch,
    createStage: createStageMutation.mutateAsync,
    updateStage: (stageId: string, data: UpdatePipelineStageDto) =>
      updateStageMutation.mutateAsync({ stageId, data }),
    deleteStage: deleteStageMutation.mutateAsync,
    reorderStages: reorderStagesMutation.mutateAsync,
    isCreatingStage: createStageMutation.isPending,
    isUpdatingStage: updateStageMutation.isPending,
    isDeletingStage: deleteStageMutation.isPending,
    isReordering: reorderStagesMutation.isPending,
  };
}
