import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import type { NotificationFilters } from '../api/notifications';

// Query keys for notifications
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters?: NotificationFilters) => [...notificationKeys.all, 'list', filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

export function useNotifications(filters?: NotificationFilters) {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationsApi.getAll(filters),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    // Data
    notifications: notificationsQuery.data?.notifications || [],
    total: notificationsQuery.data?.total || 0,
    unreadCount: notificationsQuery.data?.unreadCount || 0,
    page: notificationsQuery.data?.page || 1,
    pageSize: notificationsQuery.data?.pageSize || 20,
    totalPages: notificationsQuery.data?.totalPages || 1,

    // Loading states
    loading: notificationsQuery.isLoading,
    isFetching: notificationsQuery.isFetching,

    // Error state
    error: notificationsQuery.error,

    // Mutations
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,

    // Mutation states
    markingAsRead: markAsReadMutation.isPending,
    markingAllAsRead: markAllAsReadMutation.isPending,
    deleting: deleteMutation.isPending,

    // Refetch
    refetch: notificationsQuery.refetch,
  };
}
