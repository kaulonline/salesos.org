import { useState, useCallback, useEffect } from 'react';
import { tasksApi, TaskFilters } from '../api/tasks';
import type { Task, CreateTaskDto, UpdateTaskDto } from '../types';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateTaskDto) => Promise<Task>;
  update: (id: string, data: UpdateTaskDto) => Promise<Task>;
  remove: (id: string) => Promise<void>;
  complete: (id: string) => Promise<Task>;
}

export function useTasks(initialFilters?: TaskFilters): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<TaskFilters | undefined>(initialFilters);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.getAll(filters);
      setTasks(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const create = useCallback(async (data: CreateTaskDto): Promise<Task> => {
    const task = await tasksApi.create(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const update = useCallback(async (id: string, data: UpdateTaskDto): Promise<Task> => {
    const updated = await tasksApi.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const complete = useCallback(async (id: string): Promise<Task> => {
    const updated = await tasksApi.complete(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    create,
    update,
    remove,
    complete,
  };
}
