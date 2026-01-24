import { useState, useCallback, useEffect } from 'react';
import { activitiesApi } from '../api/activities';
import type { Activity, CreateActivityDto, ActivityFilters } from '../types';

interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateActivityDto) => Promise<Activity>;
}

export function useActivities(initialFilters?: ActivityFilters): UseActivitiesReturn {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<ActivityFilters | undefined>(initialFilters);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.getAll(filters);
      setActivities(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const create = useCallback(async (data: CreateActivityDto): Promise<Activity> => {
    const activity = await activitiesApi.create(data);
    setActivities((prev) => [activity, ...prev]);
    return activity;
  }, []);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    create,
  };
}
