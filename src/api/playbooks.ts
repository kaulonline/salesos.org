import client from './client';
import type {
  Playbook,
  PlaybookStep,
  PlaybookExecution,
  PlaybookStats,
  CreatePlaybookDto,
  UpdatePlaybookDto,
  CreatePlaybookStepDto,
  UpdatePlaybookStepDto,
  StartPlaybookDto,
  PlaybookFilters,
  ExecutionFilters,
} from '../types/playbook';

export const playbooksApi = {
  // ============================================
  // Playbook CRUD
  // ============================================

  /**
   * Get all playbooks with optional filters
   */
  getAll: async (filters?: PlaybookFilters): Promise<Playbook[]> => {
    const params = new URLSearchParams();
    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }
    if (filters?.trigger) {
      params.append('trigger', filters.trigger);
    }
    const queryString = params.toString();
    const url = queryString ? `/playbooks?${queryString}` : '/playbooks';
    const response = await client.get<Playbook[]>(url);
    return response.data;
  },

  /**
   * Get a single playbook by ID
   */
  getById: async (id: string): Promise<Playbook> => {
    const response = await client.get<Playbook>(`/playbooks/${id}`);
    return response.data;
  },

  /**
   * Get playbook statistics
   */
  getStats: async (): Promise<PlaybookStats> => {
    const response = await client.get<PlaybookStats>('/playbooks/stats');
    return response.data;
  },

  /**
   * Create a new playbook
   */
  create: async (data: CreatePlaybookDto): Promise<Playbook> => {
    const response = await client.post<Playbook>('/playbooks', data);
    return response.data;
  },

  /**
   * Update a playbook
   */
  update: async (id: string, data: UpdatePlaybookDto): Promise<Playbook> => {
    const response = await client.patch<Playbook>(`/playbooks/${id}`, data);
    return response.data;
  },

  /**
   * Delete a playbook
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/playbooks/${id}`);
  },

  /**
   * Duplicate a playbook
   */
  duplicate: async (id: string): Promise<Playbook> => {
    const response = await client.post<Playbook>(`/playbooks/${id}/duplicate`);
    return response.data;
  },

  // ============================================
  // Step Management
  // ============================================

  /**
   * Add a step to a playbook
   */
  addStep: async (playbookId: string, data: CreatePlaybookStepDto): Promise<PlaybookStep> => {
    const response = await client.post<PlaybookStep>(`/playbooks/${playbookId}/steps`, data);
    return response.data;
  },

  /**
   * Update a step
   */
  updateStep: async (playbookId: string, stepId: string, data: UpdatePlaybookStepDto): Promise<PlaybookStep> => {
    const response = await client.patch<PlaybookStep>(`/playbooks/${playbookId}/steps/${stepId}`, data);
    return response.data;
  },

  /**
   * Delete a step
   */
  deleteStep: async (playbookId: string, stepId: string): Promise<void> => {
    await client.delete(`/playbooks/${playbookId}/steps/${stepId}`);
  },

  /**
   * Reorder steps
   */
  reorderSteps: async (playbookId: string, stepIds: string[]): Promise<PlaybookStep[]> => {
    const response = await client.post<PlaybookStep[]>(`/playbooks/${playbookId}/steps/reorder`, { stepIds });
    return response.data;
  },

  // ============================================
  // Execution Management
  // ============================================

  /**
   * Get all executions with optional filters
   */
  getExecutions: async (filters?: ExecutionFilters): Promise<PlaybookExecution[]> => {
    const params = new URLSearchParams();
    if (filters?.playbookId) params.append('playbookId', filters.playbookId);
    if (filters?.dealId) params.append('dealId', filters.dealId);
    if (filters?.status) params.append('status', filters.status);
    const queryString = params.toString();
    const url = queryString ? `/playbooks/executions/list?${queryString}` : '/playbooks/executions/list';
    const response = await client.get<PlaybookExecution[]>(url);
    return response.data;
  },

  /**
   * Get a single execution by ID
   */
  getExecution: async (executionId: string): Promise<PlaybookExecution> => {
    const response = await client.get<PlaybookExecution>(`/playbooks/executions/${executionId}`);
    return response.data;
  },

  /**
   * Start a playbook execution
   */
  startExecution: async (playbookId: string, data: StartPlaybookDto): Promise<PlaybookExecution> => {
    const response = await client.post<PlaybookExecution>(`/playbooks/${playbookId}/start`, data);
    return response.data;
  },

  /**
   * Complete a step in an execution
   */
  completeStep: async (executionId: string, stepId: string, outcome?: string, notes?: string): Promise<PlaybookExecution> => {
    const response = await client.post<PlaybookExecution>(
      `/playbooks/executions/${executionId}/steps/${stepId}/complete`,
      { outcome, notes }
    );
    return response.data;
  },

  /**
   * Skip a step in an execution
   */
  skipStep: async (executionId: string, stepId: string, reason?: string): Promise<PlaybookExecution> => {
    const response = await client.post<PlaybookExecution>(
      `/playbooks/executions/${executionId}/steps/${stepId}/skip`,
      { reason }
    );
    return response.data;
  },

  /**
   * Cancel an execution
   */
  cancelExecution: async (executionId: string): Promise<PlaybookExecution> => {
    const response = await client.post<PlaybookExecution>(`/playbooks/executions/${executionId}/cancel`);
    return response.data;
  },
};

export default playbooksApi;
