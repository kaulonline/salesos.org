import apiClient from './client';

export enum WorkflowTriggerType {
  RECORD_CREATED = 'RECORD_CREATED',
  RECORD_UPDATED = 'RECORD_UPDATED',
  RECORD_DELETED = 'RECORD_DELETED',
  FIELD_CHANGED = 'FIELD_CHANGED',
  STAGE_CHANGED = 'STAGE_CHANGED',
  TIME_BASED = 'TIME_BASED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
}

export enum WorkflowActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_FIELD = 'UPDATE_FIELD',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  WEBHOOK_CALL = 'WEBHOOK_CALL',
  ASSIGN_OWNER = 'ASSIGN_OWNER',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  CREATE_ACTIVITY = 'CREATE_ACTIVITY',
}

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowEntityType {
  LEAD = 'LEAD',
  CONTACT = 'CONTACT',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
  TASK = 'TASK',
}

export enum ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
  CHANGED = 'CHANGED',
  CHANGED_TO = 'CHANGED_TO',
  CHANGED_FROM = 'CHANGED_FROM',
}

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  triggerType: WorkflowTriggerType;
  triggerEntity: WorkflowEntityType;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  runOnce?: boolean;
  delayMinutes?: number;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  triggerType?: WorkflowTriggerType;
  triggerEntity?: WorkflowEntityType;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  runOnce?: boolean;
  delayMinutes?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  triggerType: WorkflowTriggerType;
  triggerEntity: WorkflowEntityType;
  triggerConfig: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  runOnce: boolean;
  delayMinutes: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  executionCount?: number;
  lastExecutedAt?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowExecutionStatus;
  triggeredBy?: string;
  entityType: string;
  entityId: string;
  startedAt?: string;
  completedAt?: string;
  actionResults?: unknown[];
  errorMessage?: string;
  createdAt: string;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  executionsToday: number;
}

export interface WorkflowConfig {
  triggerTypes: { value: string; label: string; description: string }[];
  actionTypes: { value: string; label: string; description: string }[];
  conditionOperators: { value: string; label: string }[];
  entityTypes: { value: string; label: string }[];
}

export interface WorkflowListParams {
  status?: WorkflowStatus;
  triggerType?: WorkflowTriggerType;
  triggerEntity?: WorkflowEntityType;
  limit?: number;
  offset?: number;
}

export interface ExecutionListParams {
  workflowId?: string;
  status?: WorkflowExecutionStatus;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export const workflowsApi = {
  /**
   * Get workflow configuration options
   */
  getConfig: async (): Promise<WorkflowConfig> => {
    const response = await apiClient.get<WorkflowConfig>('/workflows/config');
    return response.data;
  },

  /**
   * Get workflow statistics
   */
  getStats: async (): Promise<WorkflowStats> => {
    const response = await apiClient.get<WorkflowStats>('/workflows/stats');
    return response.data;
  },

  /**
   * List all workflows
   */
  getAll: async (params?: WorkflowListParams): Promise<{ workflows: Workflow[]; total: number }> => {
    const response = await apiClient.get('/workflows', { params });
    return response.data;
  },

  /**
   * Get a single workflow by ID
   */
  getById: async (id: string): Promise<Workflow> => {
    const response = await apiClient.get<Workflow>(`/workflows/${id}`);
    return response.data;
  },

  /**
   * Create a new workflow
   */
  create: async (workflow: CreateWorkflowRequest): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>('/workflows', workflow);
    return response.data;
  },

  /**
   * Update a workflow
   */
  update: async (id: string, workflow: UpdateWorkflowRequest): Promise<Workflow> => {
    const response = await apiClient.put<Workflow>(`/workflows/${id}`, workflow);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workflows/${id}`);
  },

  /**
   * Activate a workflow
   */
  activate: async (id: string): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>(`/workflows/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate a workflow
   */
  deactivate: async (id: string): Promise<Workflow> => {
    const response = await apiClient.post<Workflow>(`/workflows/${id}/deactivate`);
    return response.data;
  },

  /**
   * Manually trigger a workflow
   */
  trigger: async (workflowId: string, entityType: WorkflowEntityType, entityId: string): Promise<WorkflowExecution> => {
    const response = await apiClient.post<WorkflowExecution>('/workflows/trigger', {
      workflowId,
      entityType,
      entityId,
    });
    return response.data;
  },

  /**
   * Get execution history
   */
  getExecutions: async (params?: ExecutionListParams): Promise<{ executions: WorkflowExecution[]; total: number }> => {
    const response = await apiClient.get('/workflows/executions', { params });
    return response.data;
  },

  /**
   * Get executions for a specific workflow
   */
  getWorkflowExecutions: async (
    workflowId: string,
    params?: Omit<ExecutionListParams, 'workflowId'>,
  ): Promise<{ executions: WorkflowExecution[]; total: number }> => {
    const response = await apiClient.get(`/workflows/${workflowId}/executions`, { params });
    return response.data;
  },
};

export default workflowsApi;
