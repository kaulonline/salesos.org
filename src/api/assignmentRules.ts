import client from './client';
import type {
  AssignmentRule,
  CreateAssignmentRuleDto,
  UpdateAssignmentRuleDto,
  AssignmentRuleEntity,
  AssignmentRuleStats,
  TestAssignmentRuleDto,
  TestAssignmentRuleResult,
  ReorderAssignmentRulesDto,
  AssignableField,
  QueryFilters,
} from '../types';

export interface AssignmentRuleFilters extends QueryFilters {
  entity?: AssignmentRuleEntity;
  isActive?: boolean;
}

export const assignmentRulesApi = {
  /**
   * Get all assignment rules
   */
  getAll: async (filters?: AssignmentRuleFilters): Promise<AssignmentRule[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await client.get<AssignmentRule[]>(`/assignment-rules?${params.toString()}`);
    return response.data;
  },

  /**
   * Get assignment rule statistics
   */
  getStats: async (): Promise<AssignmentRuleStats> => {
    const response = await client.get<AssignmentRuleStats>('/assignment-rules/stats');
    return response.data;
  },

  /**
   * Get a single assignment rule by ID
   */
  getById: async (id: string): Promise<AssignmentRule> => {
    const response = await client.get<AssignmentRule>(`/assignment-rules/${id}`);
    return response.data;
  },

  /**
   * Create a new assignment rule
   */
  create: async (data: CreateAssignmentRuleDto): Promise<AssignmentRule> => {
    const response = await client.post<AssignmentRule>('/assignment-rules', data);
    return response.data;
  },

  /**
   * Update an assignment rule
   */
  update: async (id: string, data: UpdateAssignmentRuleDto): Promise<AssignmentRule> => {
    const response = await client.patch<AssignmentRule>(`/assignment-rules/${id}`, data);
    return response.data;
  },

  /**
   * Delete an assignment rule
   */
  delete: async (id: string): Promise<void> => {
    await client.delete(`/assignment-rules/${id}`);
  },

  /**
   * Activate an assignment rule
   */
  activate: async (id: string): Promise<AssignmentRule> => {
    const response = await client.post<AssignmentRule>(`/assignment-rules/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate an assignment rule
   */
  deactivate: async (id: string): Promise<AssignmentRule> => {
    const response = await client.post<AssignmentRule>(`/assignment-rules/${id}/deactivate`);
    return response.data;
  },

  /**
   * Test which rule matches a record
   */
  test: async (data: TestAssignmentRuleDto): Promise<TestAssignmentRuleResult> => {
    const response = await client.post<TestAssignmentRuleResult>('/assignment-rules/test', data);
    return response.data;
  },

  /**
   * Reorder assignment rules
   */
  reorder: async (data: ReorderAssignmentRulesDto): Promise<void> => {
    await client.post('/assignment-rules/reorder', data);
  },

  /**
   * Get assignable fields for an entity
   */
  getAssignableFields: async (entity: AssignmentRuleEntity): Promise<AssignableField[]> => {
    const response = await client.get<AssignableField[]>(
      `/assignment-rules/fields?entity=${entity}`
    );
    return response.data;
  },

  /**
   * Clone an assignment rule
   */
  clone: async (id: string, name?: string): Promise<AssignmentRule> => {
    const response = await client.post<AssignmentRule>(`/assignment-rules/${id}/clone`, { name });
    return response.data;
  },

  /**
   * Execute rules manually for a record
   */
  executeForRecord: async (
    entity: AssignmentRuleEntity,
    recordId: string
  ): Promise<{ assignedTo?: { id: string; name: string }; ruleId?: string }> => {
    const response = await client.post<{ assignedTo?: { id: string; name: string }; ruleId?: string }>(
      `/assignment-rules/execute`,
      { entity, recordId }
    );
    return response.data;
  },
};

export default assignmentRulesApi;
