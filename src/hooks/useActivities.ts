import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesApi } from '../api/activities';
import { queryKeys } from '../lib/queryKeys';
import type { Activity, CreateActivityDto, ActivityFilters } from '../types';

// Hook for listing activities with caching and background refresh
export function useActivities(filters?: ActivityFilters) {
  const queryClient = useQueryClient();

  // Query for activities list
  const activitiesQuery = useQuery({
    queryKey: queryKeys.activities.list(filters),
    queryFn: () => activitiesApi.getAll(filters),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateActivityDto) => activitiesApi.create(data),
    onSuccess: (newActivity) => {
      queryClient.setQueryData<Activity[]>(
        queryKeys.activities.list(filters),
        (old) => (old ? [newActivity, ...old] : [newActivity])
      );
      // Also invalidate related entity caches since activity might affect them
      if (newActivity.leadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(newActivity.leadId) });
      }
      if (newActivity.contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(newActivity.contactId) });
      }
      if (newActivity.accountId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.detail(newActivity.accountId) });
      }
      if (newActivity.opportunityId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(newActivity.opportunityId) });
      }
    },
  });

  return {
    // Data
    activities: activitiesQuery.data ?? [],

    // Loading states
    loading: activitiesQuery.isLoading,
    isRefetching: activitiesQuery.isRefetching,

    // Error states
    error: activitiesQuery.error?.message ?? null,

    // Actions
    refetch: activitiesQuery.refetch,

    // Mutations
    create: (data: CreateActivityDto) => createMutation.mutateAsync(data),

    // Mutation states
    isCreating: createMutation.isPending,
  };
}

// Hook for recent activities (commonly used in dashboard)
export function useRecentActivities(limit: number = 10) {
  return useActivities({ limit });
}
