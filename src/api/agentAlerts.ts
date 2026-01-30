import client from './client';

// Types matching backend agent alerts
export type AgentType =
  | 'DEAL_HEALTH'
  | 'PIPELINE_ACCELERATION'
  | 'ACCOUNT_INTELLIGENCE'
  | 'OUTREACH_OPTIMIZATION'
  | 'COACHING';

export type AlertType =
  | 'DEAL_AT_RISK'
  | 'DEAL_STALLED'
  | 'ACCOUNT_AT_RISK'
  | 'EXPANSION_OPPORTUNITY'
  | 'COACHING_INSIGHT'
  | 'OUTREACH_RECOMMENDATION'
  | 'PIPELINE_BOTTLENECK'
  | 'URGENT_ACTION_NEEDED';

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type AlertStatus = 'PENDING' | 'ACKNOWLEDGED' | 'ACTIONED' | 'DISMISSED';

export interface SuggestedAction {
  label: string;
  actionType: 'CREATE_TASK' | 'SEND_EMAIL' | 'SCHEDULE_MEETING' | 'UPDATE_RECORD';
  params: Record<string, unknown>;
}

export interface AgentAlert {
  id: string;
  agentType: AgentType;
  alertType: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  recommendation: string;
  userId: string;
  entityType?: string;
  entityId?: string;
  status: AlertStatus;
  expiresAt?: string;
  suggestedActions: SuggestedAction[];
  metadata?: {
    healthScore?: number;
    riskFactors?: string[];
    positiveSignals?: string[];
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  actionedAt?: string;
  actionedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
}

export interface AgentAlertsResponse {
  data: AgentAlert[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AgentAlertFilters {
  page?: number;
  limit?: number;
  agentType?: AgentType;
  status?: AlertStatus;
  priority?: AlertPriority;
  entityType?: string;
}

export interface PendingAlertsSummary {
  total: number;
  byPriority: {
    URGENT?: number;
    HIGH?: number;
    MEDIUM?: number;
    LOW?: number;
  };
}

export const agentAlertsApi = {
  // Get all alerts with filters
  async getAll(filters?: AgentAlertFilters): Promise<AgentAlert[]> {
    const params = new URLSearchParams();
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());
    if (filters?.agentType) params.set('agentType', filters.agentType);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.entityType) params.set('entityType', filters.entityType);

    const queryString = params.toString();
    const response = await client.get(`/agents/alerts${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Get pending alerts summary
  async getPendingSummary(): Promise<PendingAlertsSummary> {
    const response = await client.get('/agents/alerts/pending');
    return response.data;
  },

  // Update alert status (acknowledge, action, dismiss)
  async updateStatus(id: string, status: AlertStatus, notes?: string): Promise<AgentAlert> {
    const response = await client.patch(`/agents/alerts/${id}`, { status, notes });
    return response.data;
  },

  // Acknowledge an alert
  async acknowledge(id: string): Promise<AgentAlert> {
    return this.updateStatus(id, 'ACKNOWLEDGED');
  },

  // Mark as actioned
  async markActioned(id: string, notes?: string): Promise<AgentAlert> {
    return this.updateStatus(id, 'ACTIONED', notes);
  },

  // Dismiss an alert
  async dismiss(id: string, reason?: string): Promise<AgentAlert> {
    return this.updateStatus(id, 'DISMISSED', reason);
  },

  // Delete an alert
  async delete(id: string): Promise<void> {
    await client.delete(`/agents/alerts/${id}`);
  },

  // Get queue status
  async getQueueStatus(): Promise<{
    queuedJobs: number;
    runningJobs: number;
    jobsByAgent: Record<string, number>;
  }> {
    const response = await client.get('/agents/queue/status');
    return response.data;
  },

  // Trigger an agent manually
  async triggerAgent(agentType: AgentType): Promise<{ executionId: string; status: string }> {
    const response = await client.post('/agents/trigger', { agentType });
    return response.data;
  },
};

export default agentAlertsApi;
