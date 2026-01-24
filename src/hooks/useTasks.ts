import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, TaskFilters } from '../api/tasks';
import { queryKeys } from '../lib/queryKeys';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../types';

// Hook for listing tasks with caching and background refresh
export function useTasks(filters?: TaskFilters) {
  const queryClient = useQueryClient();

  // Query for tasks list
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => tasksApi.getAll(filters),
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateTaskDto) => tasksApi.create(data),
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(filters),
        (old) => (old ? [newTask, ...old] : [newTask])
      );
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
      tasksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(filters) });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(filters));

      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(filters),
        (old) => old?.map((t) => (t.id === id ? { ...t, ...data } : t))
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.list(filters), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(filters) });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(filters));

      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(filters),
        (old) => old?.filter((t) => t.id !== id)
      );

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.list(filters), context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });

  // Complete mutation with optimistic updates
  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(filters) });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(filters));

      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(filters),
        (old) => old?.map((t) => (t.id === id ? { ...t, status: 'COMPLETED' as const } : t))
      );

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks.list(filters), context.previousTasks);
      }
    },
    onSuccess: (updatedTask) => {
      // Update with server response
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(filters),
        (old) => old?.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    },
  });

  return {
    // Data
    tasks: tasksQuery.data ?? [],

    // Loading states
    loading: tasksQuery.isLoading,
    isRefetching: tasksQuery.isRefetching,

    // Error states
    error: tasksQuery.error?.message ?? null,

    // Actions
    refetch: tasksQuery.refetch,

    // Mutations
    create: (data: CreateTaskDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateTaskDto) => updateMutation.mutateAsync({ id, data }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    complete: (id: string) => completeMutation.mutateAsync(id),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCompleting: completeMutation.isPending,
  };
}

// Hook for today's tasks (commonly used in dashboard)
export function useTodaysTasks() {
  const today = new Date().toISOString().split('T')[0];
  return useTasks({ dueDate: today });
}

// Hook for overdue tasks
export function useOverdueTasks() {
  const today = new Date().toISOString().split('T')[0];
  return useTasks({ dueBefore: today, status: 'PENDING' });
}
