import { useState, useCallback, useEffect } from 'react';
import { meetingsApi, MeetingFilters } from '../api/meetings';
import type {
  Meeting,
  CreateMeetingDto,
  UpdateMeetingDto,
  MeetingAnalysis,
  MeetingInsights,
} from '../types';

interface UseMeetingsReturn {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateMeetingDto) => Promise<Meeting>;
  update: (id: string, data: UpdateMeetingDto) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;
}

export function useMeetings(initialFilters?: MeetingFilters): UseMeetingsReturn {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<MeetingFilters | undefined>(initialFilters);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getAll(filters);
      setMeetings(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const create = useCallback(async (data: CreateMeetingDto): Promise<Meeting> => {
    const meeting = await meetingsApi.create(data);
    setMeetings((prev) => [meeting, ...prev]);
    return meeting;
  }, []);

  const update = useCallback(async (id: string, data: UpdateMeetingDto): Promise<Meeting> => {
    const updated = await meetingsApi.update(id, data);
    setMeetings((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMeeting = useCallback(async (id: string): Promise<void> => {
    await meetingsApi.delete(id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return {
    meetings,
    loading,
    error,
    refetch: fetchMeetings,
    create,
    update,
    deleteMeeting,
  };
}

export function useMeeting(id: string | undefined) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeeting = useCallback(async () => {
    if (!id) {
      setMeeting(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getById(id);
      setMeeting(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch meeting');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAnalysis = useCallback(async () => {
    if (!id) return;
    try {
      const data = await meetingsApi.getAnalysis(id);
      setAnalysis(data);
    } catch (err: unknown) {
      console.error('Failed to fetch analysis');
    }
  }, [id]);

  const fetchInsights = useCallback(async () => {
    if (!id) return;
    try {
      const data = await meetingsApi.getInsights(id);
      setInsights(data);
    } catch (err: unknown) {
      console.error('Failed to fetch insights');
    }
  }, [id]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return { meeting, analysis, insights, loading, error, refetch: fetchMeeting, fetchAnalysis, fetchInsights };
}

// Calendar-specific hook to group meetings by date
export function useCalendarMeetings(year: number, month: number) {
  const [meetingsByDate, setMeetingsByDate] = useState<Record<number, Meeting[]>>({});
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalHours: 0,
    externalMeetings: 0,
    internalMeetings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingsApi.getAll({ startDate, endDate });

      // Group meetings by day of month
      const grouped: Record<number, Meeting[]> = {};
      let totalHours = 0;
      let external = 0;
      let internal = 0;

      data.forEach((meeting) => {
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

      setMeetingsByDate(grouped);
      setStats({
        totalMeetings: data.length,
        totalHours: Math.round(totalHours),
        externalMeetings: external,
        internalMeetings: internal,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return { meetingsByDate, stats, loading, error, refetch: fetchMeetings };
}
