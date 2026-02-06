import client from './client';

export type AgentType =
  | 'DEAL_HEALTH'
  | 'PIPELINE_ACCELERATION'
  | 'ACCOUNT_INTELLIGENCE'
  | 'OUTREACH_OPTIMIZATION'
  | 'COACHING'
  | 'NEXT_BEST_ACTION';

export type AgentStatusType = 'ACTIVE' | 'PAUSED' | 'ERROR' | 'DISABLED';

export interface AgentStatus {
  type: AgentType;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  requiresApproval: boolean;
  lastExecutedAt?: string;
  executionCount: number;
  errorCount: number;
  schedule?: {
    enabled: boolean;
    cron?: string;
  };
  limits: {
    maxExecutionTimeMs: number;
    maxLLMCalls: number;
    maxAlertsPerExecution: number;
    rateLimitPerHour: number;
    rateLimitPerDay: number;
  };
}

export interface AgentExecution {
  id: string;
  agentType: AgentType;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  triggeredBy: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  alertsCreated: number;
  actionsCreated: number;
  error?: string;
  createdAt: string;
}

export interface QueueStatus {
  queuedJobs: number;
  runningJobs: number;
  jobsByAgent: Record<string, number>;
}

export interface TriggerResponse {
  executionId: string;
  agentType: AgentType;
  status: string;
  message: string;
}

export interface AnalyticsSummary {
  period: string;
  executions: Record<string, Record<string, number>>;
  alerts: Record<string, Record<string, number>>;
  actions: Record<string, Record<string, number>>;
}

export const agentsApi = {
  // List all registered agents
  async getAll(): Promise<AgentStatus[]> {
    const response = await client.get('/agents');
    return response.data;
  },

  // Get specific agent status
  async getAgent(agentType: AgentType): Promise<AgentStatus> {
    const response = await client.get(`/agents/${agentType}`);
    return response.data;
  },

  // Trigger an agent manually
  async trigger(
    agentType: AgentType,
    options?: {
      entityType?: string;
      entityId?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      metadata?: Record<string, unknown>;
    }
  ): Promise<TriggerResponse> {
    const response = await client.post('/agents/trigger', {
      agentType,
      ...options,
    });
    return response.data;
  },

  // Update agent configuration (Admin only)
  async updateConfig(
    agentType: AgentType,
    config: {
      enabled?: boolean;
      requiresApproval?: boolean;
      scheduleEnabled?: boolean;
      scheduleCron?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await client.patch(`/agents/${agentType}/config`, config);
    return response.data;
  },

  // Get queue status
  async getQueueStatus(): Promise<QueueStatus> {
    const response = await client.get('/agents/queue/status');
    return response.data;
  },

  // Get execution history
  async getExecutions(filters?: {
    agentType?: AgentType;
    status?: string;
    days?: number;
    limit?: number;
  }): Promise<AgentExecution[]> {
    const params = new URLSearchParams();
    if (filters?.agentType) params.set('agentType', filters.agentType);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.days) params.set('days', filters.days.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const queryString = params.toString();
    const response = await client.get(`/agents/executions${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Get execution details
  async getExecution(executionId: string): Promise<AgentExecution> {
    const response = await client.get(`/agents/executions/${executionId}`);
    return response.data;
  },

  // Get analytics summary (Admin only)
  async getAnalytics(): Promise<AnalyticsSummary> {
    const response = await client.get('/agents/analytics/summary');
    return response.data;
  },
};

export default agentsApi;
