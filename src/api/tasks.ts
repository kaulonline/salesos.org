import client from './client';
import type { Task, CreateTaskDto, UpdateTaskDto, QueryFilters } from '../types';

export interface TaskFilters extends QueryFilters {
  status?: string;
  priority?: string;
  type?: string;
  assignedToId?: string;
  leadId?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  dueDate?: string;
}

export const tasksApi = {
  /**
   * Get all tasks with optional filters
   */
  getAll: async (filters?: TaskFilters): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<Task[]>(`/tasks?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single task by ID
   */
  getById: async (id: string): Promise<Task> => {
    const response = await client.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  /**
   * Create a new task
   */
  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await client.post<Task>('/tasks', data);
    return response.data;
  },

  /**
   * Update a task
   */
  update: async (id: string, data: UpdateTaskDto): Promise<Task> => {
    const response = await client.patch<Task>(`/tasks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a task
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/tasks/${id}`);
  },

  /**
   * Mark task as complete
   */
  complete: async (id: string): Promise<Task> => {
    const response = await client.patch<Task>(`/tasks/${id}`, {
      status: 'COMPLETED',
      completedDate: new Date().toISOString(),
    });
    return response.data;
  },
};

export default tasksApi;
