import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { meetingsApi, MeetingFilters } from '../api/meetings';
import { queryKeys } from '../lib/queryKeys';
import type {
  Meeting,
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingAnalysis,
  MeetingInsights,
} from '../types';

// Hook for listing meetings with caching and background refresh
export function useMeetings(filters?: MeetingFilters) {
  const queryClient = useQueryClient();

  // Query for meetings list
  const meetingsQuery = useQuery({
    queryKey: queryKeys.meetings.list(filters),
    queryFn: () => meetingsApi.getAll(filters),
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: (data: CreateMeetingDto) => meetingsApi.create(data),
    onSuccess: (newMeeting) => {
      queryClient.setQueryData<Meeting[]>(
        queryKeys.meetings.list(filters),
        (old) => (old ? [newMeeting, ...old] : [newMeeting])
      );
      // Invalidate calendar views
      if (newMeeting.startTime) {
        const date = new Date(newMeeting.startTime);
        queryClient.invalidateQueries({
          queryKey: queryKeys.meetings.calendar(date.getFullYear(), date.getMonth()),
        });
      }
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMeetingDto }) =>
      meetingsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meetings.list(filters) });
      const previousMeetings = queryClient.getQueryData<Meeting[]>(queryKeys.meetings.list(filters));

      queryClient.setQueryData<Meeting[]>(
        queryKeys.meetings.list(filters),
        (old) => old?.map((m) => (m.id === id ? { ...m, ...data } : m))
      );

      return { previousMeetings };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(queryKeys.meetings.list(filters), context.previousMeetings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => meetingsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.meetings.list(filters) });
      const previousMeetings = queryClient.getQueryData<Meeting[]>(queryKeys.meetings.list(filters));

      queryClient.setQueryData<Meeting[]>(
        queryKeys.meetings.list(filters),
        (old) => old?.filter((m) => m.id !== id)
      );

      return { previousMeetings };
    },
    onError: (_err, _id, context) => {
      if (context?.previousMeetings) {
        queryClient.setQueryData(queryKeys.meetings.list(filters), context.previousMeetings);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetings.lists() });
    },
  });

  return {
    // Data
    meetings: meetingsQuery.data ?? [],

    // Loading states
    loading: meetingsQuery.isLoading,
    isRefetching: meetingsQuery.isRefetching,

    // Error states
    error: meetingsQuery.error?.message ?? null,

    // Actions
    refetch: meetingsQuery.refetch,

    // Mutations
    create: (data: CreateMeetingDto) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateMeetingDto) => updateMutation.mutateAsync({ id, data }),
    deleteMeeting: (id: string) => deleteMutation.mutateAsync(id),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for single meeting with analysis and insights
export function useMeeting(id: string | undefined) {
  const meetingQuery = useQuery({
    queryKey: queryKeys.meetings.detail(id!),
    queryFn: () => meetingsApi.getById(id!),
    enabled: !!id,
  });

  // Query for analysis (lazy loaded)
  const analysisQuery = useQuery({
    queryKey: queryKeys.meetings.analysis(id!),
    queryFn: () => meetingsApi.getAnalysis(id!),
    enabled: false,
  });

  // Query for insights (lazy loaded)
  const insightsQuery = useQuery({
    queryKey: queryKeys.meetings.insights(id!),
    queryFn: () => meetingsApi.getInsights(id!),
    enabled: false,
  });

  const fetchAnalysis = () => {
    if (id) analysisQuery.refetch();
  };

  const fetchInsights = () => {
    if (id) insightsQuery.refetch();
  };

  return {
    meeting: meetingQuery.data ?? null,
    analysis: analysisQuery.data ?? null,
    insights: insightsQuery.data ?? null,
    loading: meetingQuery.isLoading,
    analysisLoading: analysisQuery.isLoading || analysisQuery.isFetching,
    insightsLoading: insightsQuery.isLoading || insightsQuery.isFetching,
    error: meetingQuery.error?.message ?? null,
    refetch: meetingQuery.refetch,
    fetchAnalysis,
    fetchInsights,
  };
}

// Calendar-specific hook with date grouping
export function useCalendarMeetings(year: number, month: number) {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const meetingsQuery = useQuery({
    queryKey: queryKeys.meetings.calendar(year, month),
    queryFn: () => meetingsApi.getAll({ startDate, endDate }),
  });

  // Compute grouped meetings and stats from raw data
  const { meetingsByDate, stats } = useMemo(() => {
    const meetings = meetingsQuery.data ?? [];
    const grouped: Record<number, Meeting[]> = {};
    let totalHours = 0;
    let external = 0;
    let internal = 0;

    meetings.forEach((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      const day = meetingDate.getDate();

      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(meeting);

      // Calculate hours
      const start = new Date(meeting.startTime);
      const end = new Date(meeting.endTime);
      totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      // Count by type
      if (meeting.accountId || meeting.opportunityId) {
        external++;
      } else {
        internal++;
      }
    });

    return {
      meetingsByDate: grouped,
      stats: {
        totalMeetings: meetings.length,
        totalHours: Math.round(totalHours),
        externalMeetings: external,
        internalMeetings: internal,
      },
    };
  }, [meetingsQuery.data]);

  return {
    meetingsByDate,
    stats,
    loading: meetingsQuery.isLoading,
    error: meetingsQuery.error?.message ?? null,
    refetch: meetingsQuery.refetch,
  };
}

// Prefetch helper for hover states
export function usePrefetchMeeting() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.meetings.detail(id),
      queryFn: () => meetingsApi.getById(id),
      staleTime: 30 * 1000,
    });
  };
}
