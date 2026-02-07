/**
 * Agent Action DTOs and Interfaces for the LLM-Driven Support Agent
 */

export interface TicketContext {
  ticket: {
    id: string;
    caseId: string;
    status: string;
    priority: string;
    category: string;
    subject: string;
    description: string;
    createdAt: Date;
    resolvedAt?: Date;
    metadata?: Record<string, any>;
  };
  customer: {
    name?: string;
    email: string;
    ticketCount: number;
    accountType?: string;
    company?: string;
  };
  conversation: Array<{
    role: 'customer' | 'agent' | 'system';
    content: string;
    timestamp: Date;
    isInternal: boolean;
  }>;
  formattedConversation: string;
  ticketAge: string;
  ticketAgeMinutes: number;
  responseCount: number;
  lastCustomerMessage?: string;
  lastAgentResponse?: string;
  // SLA Information
  sla?: {
    overallStatus: 'on_track' | 'warning' | 'critical' | 'breached';
    timeRemaining: string;
    escalationLevel: number;
    firstResponseBreached: boolean;
    resolutionBreached: boolean;
    firstResponseDue: Date | null;
    resolutionDue: Date | null;
    targetFirstResponseHours: number;
    targetResolutionHours: number;
  };
}

export interface ToolResult {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  error?: string;
}

export interface ExecutedAction {
  tool: string;
  input: Record<string, any>;
  result: ToolResult;
  timestamp: Date;
  duration?: number;
}

export interface AgentResult {
  success: boolean;
  actions: ExecutedAction[];
  summary?: string;
  pendingActions?: PendingActionInfo[];
  error?: string;
}

export interface PendingActionInfo {
  id: string;
  toolName: string;
  input: Record<string, any>;
  reason: string;
}

export interface SafetyValidationResult {
  allowed: boolean;
  reason?: string;
  requiresReview?: boolean;
}

export type TicketEventType = 'new_ticket' | 'customer_reply' | 'scheduled_check' | 'manual_trigger';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  autoExecute: boolean;
  requiresConfirmation: boolean;
  category: 'ticket' | 'communication' | 'escalation' | 'knowledge' | 'business' | 'system';
}

// Tool input types
export interface UpdateTicketStatusInput {
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  reason: string;
}

export interface UpdateTicketPriorityInput {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
}

export interface SendResponseInput {
  message: string;
  markAsWaiting?: boolean;
}

export interface RequestMoreInfoInput {
  questions: string[];
  context: string;
}

export interface EscalateToSupervisorInput {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestedAction?: string;
}

export interface RouteToSpecialistInput {
  team: 'billing' | 'technical' | 'security' | 'legal';
  reason: string;
}

export interface AddInternalNoteInput {
  note: string;
}

export interface AddTicketTagsInput {
  tags: string[];
}

export interface SendCsatRequestInput {
  timing: 'immediate' | 'delayed';
}

export interface CreateFollowUpTaskInput {
  title: string;
  dueDate: string;
  assignee?: string;
}

export interface SearchKnowledgeBaseInput {
  query: string;
  limit?: number;
}

export interface LookupCustomerHistoryInput {
  email: string;
  limit?: number;
}

export interface LogDecisionInput {
  decision: string;
  confidence: number;
  reasoning?: string;
}

export interface ProcessRefundRequestInput {
  transactionId: string;
  amount?: number;
  reason: string;
}

export interface ExtendTrialInput {
  days: number;
  reason: string;
}
