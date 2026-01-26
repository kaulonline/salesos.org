import client from './client';
import type {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalRequest,
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  CreateApprovalStepDto,
  UpdateApprovalStepDto,
  SubmitForApprovalDto,
  ApprovalDecisionDto,
  ApprovalWorkflowStats,
  ApprovalEntity,
  ApprovalStatus,
  QueryFilters,
} from '../types';

export interface ApprovalWorkflowFilters extends QueryFilters {
  entity?: ApprovalEntity;
  isActive?: boolean;
}

export interface ApprovalRequestFilters extends QueryFilters {
  entityType?: ApprovalEntity;
  status?: ApprovalStatus;
  requestedById?: string;
  approverId?: string;
}

export const approvalWorkflowsApi = {
  // ============ Workflows ============

  /**
   * Get all approval workflows
   */
  getAll: async (filters?: ApprovalWorkflowFilters): Promise<ApprovalWorkflow[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<ApprovalWorkflow[]>(`/approval-workflows?${params.toString()}`);
    return response.data;
  },

  /**
   * Get workflow statistics
   */
  getStats: async (): Promise<ApprovalWorkflowStats> => {
    const response = await client.get<ApprovalWorkflowStats>('/approval-workflows/stats');
    return response.data;
  },

  /**
   * Get a single workflow by ID
   */
  getById: async (id: string): Promise<ApprovalWorkflow> => {
    const response = await client.get<ApprovalWorkflow>(`/approval-workflows/${id}`);
    return response.data;
  },

  /**
   * Get workflows for an entity type
   */
  getByEntity: async (entity: ApprovalEntity): Promise<ApprovalWorkflow[]> => {
    const response = await client.get<ApprovalWorkflow[]>(`/approval-workflows/entity/${entity}`);
    return response.data;
  },

  /**
   * Create a new workflow
   */
  create: async (data: CreateApprovalWorkflowDto): Promise<ApprovalWorkflow> => {
    const response = await client.post<ApprovalWorkflow>('/approval-workflows', data);
    return response.data;
  },

  /**
   * Update a workflow
   */
  update: async (id: string, data: UpdateApprovalWorkflowDto): Promise<ApprovalWorkflow> => {
    const response = await client.patch<ApprovalWorkflow>(`/approval-workflows/${id}`, data);
    return response.data;
  },

  /**
   * Delete a workflow
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/approval-workflows/${id}`);
  },

  /**
   * Clone a workflow
   */
  clone: async (id: string, name: string): Promise<ApprovalWorkflow> => {
    const response = await client.post<ApprovalWorkflow>(`/approval-workflows/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Toggle workflow active status
   */
  toggleActive: async (id: string): Promise<ApprovalWorkflow> => {
    const response = await client.post<ApprovalWorkflow>(`/approval-workflows/${id}/toggle-active`);
    return response.data;
  },

  // ============ Steps ============

  /**
   * Add a step to a workflow
   */
  addStep: async (workflowId: string, data: CreateApprovalStepDto): Promise<ApprovalStep> => {
    const response = await client.post<ApprovalStep>(`/approval-workflows/${workflowId}/steps`, data);
    return response.data;
  },

  /**
   * Update a step
   */
  updateStep: async (workflowId: string, stepId: string, data: UpdateApprovalStepDto): Promise<ApprovalStep> => {
    const response = await client.patch<ApprovalStep>(`/approval-workflows/${workflowId}/steps/${stepId}`, data);
    return response.data;
  },

  /**
   * Delete a step
   */
  deleteStep: async (workflowId: string, stepId: string): Promise<void> => {
    await client.delete(`/approval-workflows/${workflowId}/steps/${stepId}`);
  },

  /**
   * Reorder steps
   */
  reorderSteps: async (workflowId: string, stepIds: string[]): Promise<ApprovalStep[]> => {
    const response = await client.post<ApprovalStep[]>(`/approval-workflows/${workflowId}/steps/reorder`, { stepIds });
    return response.data;
  },

  // ============ Requests ============

  /**
   * Get all approval requests
   */
  getRequests: async (filters?: ApprovalRequestFilters): Promise<ApprovalRequest[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<ApprovalRequest[]>(`/approval-requests?${params.toString()}`);
    return response.data;
  },

  /**
   * Get pending approval requests for current user
   */
  getPendingRequests: async (): Promise<ApprovalRequest[]> => {
    const response = await client.get<ApprovalRequest[]>('/approval-requests/pending');
    return response.data;
  },

  /**
   * Get approval request by ID
   */
  getRequestById: async (id: string): Promise<ApprovalRequest> => {
    const response = await client.get<ApprovalRequest>(`/approval-requests/${id}`);
    return response.data;
  },

  /**
   * Get approval requests for an entity
   */
  getRequestsForEntity: async (entityType: ApprovalEntity, entityId: string): Promise<ApprovalRequest[]> => {
    const response = await client.get<ApprovalRequest[]>(`/approval-requests/entity/${entityType}/${entityId}`);
    return response.data;
  },

  /**
   * Submit an entity for approval
   */
  submitForApproval: async (data: SubmitForApprovalDto): Promise<ApprovalRequest> => {
    const response = await client.post<ApprovalRequest>('/approval-requests/submit', data);
    return response.data;
  },

  /**
   * Make a decision on an approval request
   */
  decide: async (requestId: string, data: ApprovalDecisionDto): Promise<ApprovalRequest> => {
    const response = await client.post<ApprovalRequest>(`/approval-requests/${requestId}/decide`, data);
    return response.data;
  },

  /**
   * Cancel an approval request
   */
  cancelRequest: async (requestId: string, reason?: string): Promise<ApprovalRequest> => {
    const response = await client.post<ApprovalRequest>(`/approval-requests/${requestId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Get approval history for an entity
   */
  getApprovalHistory: async (entityType: ApprovalEntity, entityId: string): Promise<ApprovalRequest[]> => {
    const response = await client.get<ApprovalRequest[]>(`/approval-requests/history/${entityType}/${entityId}`);
    return response.data;
  },

  /**
   * Check if entity requires approval
   */
  checkApprovalRequired: async (entityType: ApprovalEntity, entityId: string): Promise<{ required: boolean; workflow?: ApprovalWorkflow }> => {
    const response = await client.get<{ required: boolean; workflow?: ApprovalWorkflow }>(
      `/approval-workflows/check/${entityType}/${entityId}`
    );
    return response.data;
  },
};

export default approvalWorkflowsApi;
