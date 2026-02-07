/**
 * Support Agent Tool Definitions
 *
 * All tools available to the LLM-driven support agent with Zod schemas
 * for validation and Anthropic-compatible JSON schemas for tool calling.
 */

import { z } from 'zod';

// ============================================================================
// Category 1: Ticket Management Tools
// ============================================================================

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'])
    .describe('New status for the ticket'),
  reason: z.string()
    .describe('Explanation for why you are changing the status'),
});

export const updateTicketPrioritySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .describe('New priority level'),
  reason: z.string()
    .describe('Why the priority should be changed'),
});

export const addTicketTagsSchema = z.object({
  tags: z.array(z.string())
    .describe('Tags to add for categorization'),
});

export const assignTicketSchema = z.object({
  assigneeEmail: z.string().email()
    .describe('Email of the team member to assign'),
  reason: z.string()
    .describe('Why this person should handle the ticket'),
});

// ============================================================================
// Category 2: Customer Communication Tools
// ============================================================================

export const sendResponseSchema = z.object({
  message: z.string()
    .min(10)
    .max(5000)
    .describe('The response message to send to the customer'),
  markAsWaiting: z.boolean()
    .optional()
    .describe('Set status to WAITING_ON_CUSTOMER after sending'),
});

export const requestMoreInfoSchema = z.object({
  questions: z.array(z.string())
    .min(1)
    .max(5)
    .describe('Specific questions to ask the customer'),
  context: z.string()
    .describe('Context about why this information is needed'),
});

export const sendCsatRequestSchema = z.object({
  timing: z.enum(['immediate', 'delayed'])
    .describe('When to send the satisfaction survey'),
});

export const acknowledgeReceiptSchema = z.object({
  customMessage: z.string()
    .optional()
    .describe('Optional custom acknowledgment message'),
});

// ============================================================================
// Category 3: Escalation & Routing Tools
// ============================================================================

export const escalateToSupervisorSchema = z.object({
  urgency: z.enum(['low', 'medium', 'high', 'critical'])
    .describe('How urgent is the escalation'),
  reason: z.string()
    .describe('Detailed explanation for escalation'),
  suggestedAction: z.string()
    .optional()
    .describe('What you think should happen next'),
});

export const routeToSpecialistSchema = z.object({
  team: z.enum(['billing', 'technical', 'security', 'legal'])
    .describe('Which specialized team should handle this'),
  reason: z.string()
    .describe('Why this team is appropriate'),
});

export const flagForReviewSchema = z.object({
  flag: z.string()
    .describe('Short flag label (e.g., "unusual_request", "potential_churn")'),
  notes: z.string()
    .describe('Additional context for reviewers'),
});

// ============================================================================
// Category 4: Knowledge & Research Tools
// ============================================================================

export const searchKnowledgeBaseSchema = z.object({
  query: z.string()
    .describe('Search query for help articles'),
  limit: z.number()
    .optional()
    .default(5)
    .describe('Maximum results to return'),
});

export const lookupCustomerHistorySchema = z.object({
  email: z.string().email()
    .describe('Customer email to look up'),
  limit: z.number()
    .optional()
    .default(10)
    .describe('Maximum past tickets to retrieve'),
});

export const checkKnownIssuesSchema = z.object({
  symptoms: z.array(z.string())
    .describe('Symptoms or error messages to check'),
});

// ============================================================================
// Category 5: Business Actions Tools
// ============================================================================

export const processRefundRequestSchema = z.object({
  transactionId: z.string()
    .describe('Transaction ID from customer'),
  amount: z.number()
    .optional()
    .describe('Amount to refund, if specified'),
  reason: z.string()
    .describe('Reason for the refund'),
});

export const extendTrialSchema = z.object({
  days: z.number()
    .min(1)
    .max(30)
    .describe('Number of days to extend'),
  reason: z.string()
    .describe('Justification for the extension'),
});

export const createFollowUpTaskSchema = z.object({
  title: z.string()
    .describe('Task title'),
  dueDate: z.string()
    .describe('Due date in ISO format'),
  assignee: z.string()
    .optional()
    .describe('Email of person to assign the task'),
});

export const scheduleCallbackSchema = z.object({
  preferredTime: z.string()
    .describe('Customer preferred callback time'),
  topic: z.string()
    .describe('What the callback should cover'),
});

// ============================================================================
// Category 6: System Actions Tools
// ============================================================================

export const addInternalNoteSchema = z.object({
  note: z.string()
    .describe('Internal note visible only to team'),
});

export const logDecisionSchema = z.object({
  decision: z.string()
    .describe('What decision was made'),
  confidence: z.number()
    .min(0)
    .max(1)
    .describe('Confidence level 0-1'),
  reasoning: z.string()
    .optional()
    .describe('Explanation of reasoning'),
});

export const setReminderSchema = z.object({
  reminderDate: z.string()
    .describe('When to remind in ISO format'),
  message: z.string()
    .describe('Reminder message'),
});

// ============================================================================
// Tool Definitions for Anthropic API
// ============================================================================

export interface SupportAgentTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  autoExecute: boolean;
  requiresConfirmation: boolean;
  category: 'ticket' | 'communication' | 'escalation' | 'knowledge' | 'business' | 'system';
}

export const SUPPORT_AGENT_TOOLS: Record<string, SupportAgentTool> = {
  // Ticket Management
  update_ticket_status: {
    name: 'update_ticket_status',
    description: `Update the ticket status. Use this when:
- Customer confirms issue is resolved -> RESOLVED
- Customer provides requested info -> OPEN (from WAITING_ON_CUSTOMER)
- Waiting for customer response -> WAITING_ON_CUSTOMER
- Ticket is being worked on -> IN_PROGRESS
- Ticket is finalized and no further action needed -> CLOSED`,
    inputSchema: updateTicketStatusSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'ticket',
  },

  update_ticket_priority: {
    name: 'update_ticket_priority',
    description: `Change the priority level. Consider:
- CRITICAL: Security issues, data loss, complete system failures, legal threats
- HIGH: Major functionality broken affecting business operations
- MEDIUM: Feature not working but has workaround
- LOW: Questions, minor issues, enhancement requests`,
    inputSchema: updateTicketPrioritySchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'ticket',
  },

  add_ticket_tags: {
    name: 'add_ticket_tags',
    description: 'Add categorization tags to help with reporting and routing.',
    inputSchema: addTicketTagsSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'ticket',
  },

  assign_ticket: {
    name: 'assign_ticket',
    description: 'Assign the ticket to a specific team member based on expertise needed.',
    inputSchema: assignTicketSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'ticket',
  },

  // Customer Communication
  send_response: {
    name: 'send_response',
    description: `Send a response to the customer. The message should be:
- Professional and empathetic
- Specific to their issue
- Include next steps when applicable
- Never make up product features or capabilities
- 3-4 paragraphs maximum`,
    inputSchema: sendResponseSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'communication',
  },

  request_more_info: {
    name: 'request_more_info',
    description: 'Ask the customer for additional details needed to resolve their issue.',
    inputSchema: requestMoreInfoSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'communication',
  },

  send_csat_request: {
    name: 'send_csat_request',
    description: 'Request customer satisfaction feedback after resolving a ticket.',
    inputSchema: sendCsatRequestSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'communication',
  },

  acknowledge_receipt: {
    name: 'acknowledge_receipt',
    description: 'Send a quick acknowledgment that we received their message.',
    inputSchema: acknowledgeReceiptSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'communication',
  },

  // Escalation & Routing
  escalate_to_supervisor: {
    name: 'escalate_to_supervisor',
    description: `Escalate ticket to a supervisor. Use when:
- Customer is extremely frustrated or threatening to leave
- Issue has security or legal implications
- Multiple failed resolution attempts (3+)
- VIP customer with complex issue
- You are unsure how to proceed`,
    inputSchema: escalateToSupervisorSchema,
    autoExecute: false, // Requires human approval
    requiresConfirmation: true,
    category: 'escalation',
  },

  route_to_specialist: {
    name: 'route_to_specialist',
    description: 'Route to a specialized team (billing, technical, security, legal) when expertise is needed.',
    inputSchema: routeToSpecialistSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'escalation',
  },

  flag_for_review: {
    name: 'flag_for_review',
    description: 'Flag the ticket for human review without full escalation.',
    inputSchema: flagForReviewSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'escalation',
  },

  // Knowledge & Research
  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: 'Search our help articles and documentation to find relevant solutions.',
    inputSchema: searchKnowledgeBaseSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'knowledge',
  },

  lookup_customer_history: {
    name: 'lookup_customer_history',
    description: 'Look up customer past tickets and interactions for context.',
    inputSchema: lookupCustomerHistorySchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'knowledge',
  },

  check_known_issues: {
    name: 'check_known_issues',
    description: 'Check if the reported issue matches any known bugs or outages.',
    inputSchema: checkKnownIssuesSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'knowledge',
  },

  // Business Actions
  process_refund_request: {
    name: 'process_refund_request',
    description: `Initiate a refund for the customer. ONLY use when:
- Customer explicitly requests a refund
- You have transaction details
- The request seems legitimate
NOTE: This requires human approval before execution.`,
    inputSchema: processRefundRequestSchema,
    autoExecute: false, // Never auto-execute financial actions
    requiresConfirmation: true,
    category: 'business',
  },

  extend_trial: {
    name: 'extend_trial',
    description: 'Extend customer trial period as a goodwill gesture.',
    inputSchema: extendTrialSchema,
    autoExecute: false, // Requires review
    requiresConfirmation: true,
    category: 'business',
  },

  create_followup_task: {
    name: 'create_followup_task',
    description: 'Create a follow-up task to ensure the issue is fully resolved.',
    inputSchema: createFollowUpTaskSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'business',
  },

  schedule_callback: {
    name: 'schedule_callback',
    description: 'Schedule a callback with the customer for complex issues.',
    inputSchema: scheduleCallbackSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'business',
  },

  // System Actions
  add_internal_note: {
    name: 'add_internal_note',
    description: 'Add an internal note visible only to the support team.',
    inputSchema: addInternalNoteSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'system',
  },

  log_decision: {
    name: 'log_decision',
    description: 'Log your decision and reasoning for audit purposes.',
    inputSchema: logDecisionSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'system',
  },

  set_reminder: {
    name: 'set_reminder',
    description: 'Set a reminder for follow-up on this ticket.',
    inputSchema: setReminderSchema,
    autoExecute: true,
    requiresConfirmation: false,
    category: 'system',
  },
};

/**
 * Convert Zod schema to JSON Schema for Anthropic tool calling
 * Uses zod-to-json-schema-like logic but simplified for our use case
 */
function zodToJsonSchema(schema: z.ZodType<any>): Record<string, any> {
  // Handle ZodObject
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType<any>;
      properties[key] = zodFieldToJsonSchema(fieldSchema);

      // Check if field is optional
      if (!fieldSchema.isOptional()) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required };
  }

  return { type: 'object', properties: {}, required: [] };
}

function zodFieldToJsonSchema(schema: z.ZodType<any>): Record<string, any> {
  // Get description if available
  const description = (schema as any).description;

  // Handle optional wrapper
  if (schema instanceof z.ZodOptional) {
    return zodFieldToJsonSchema((schema as any)._def.innerType);
  }

  // Handle default wrapper
  if (schema instanceof z.ZodDefault) {
    return zodFieldToJsonSchema((schema as any)._def.innerType);
  }

  // String
  if (schema instanceof z.ZodString) {
    const result: Record<string, any> = { type: 'string' };
    if (description) result.description = description;
    return result;
  }

  // Number
  if (schema instanceof z.ZodNumber) {
    const result: Record<string, any> = { type: 'number' };
    if (description) result.description = description;
    return result;
  }

  // Boolean
  if (schema instanceof z.ZodBoolean) {
    const result: Record<string, any> = { type: 'boolean' };
    if (description) result.description = description;
    return result;
  }

  // Enum
  if (schema instanceof z.ZodEnum) {
    const result: Record<string, any> = {
      type: 'string',
      enum: (schema as any)._def.values,
    };
    if (description) result.description = description;
    return result;
  }

  // Array
  if (schema instanceof z.ZodArray) {
    const result: Record<string, any> = {
      type: 'array',
      items: zodFieldToJsonSchema((schema as any)._def.type),
    };
    if (description) result.description = description;
    return result;
  }

  return { type: 'string' };
}

/**
 * Get Anthropic-compatible tool definitions
 */
export function getAnthropicToolDefinitions(): Array<{
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}> {
  return Object.values(SUPPORT_AGENT_TOOLS).map(tool => {
    const jsonSchema = zodToJsonSchema(tool.inputSchema);
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: jsonSchema.properties || {},
        required: jsonSchema.required || [],
      },
    };
  });
}

/**
 * Validate tool input against its schema
 */
export function validateToolInput(toolName: string, input: unknown): { valid: boolean; error?: string } {
  const tool = SUPPORT_AGENT_TOOLS[toolName];
  if (!tool) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    tool.inputSchema.parse(input);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Zod 4 uses 'issues', earlier versions use 'errors'
      const issues = (error as any).issues || (error as any).errors || [];
      return { valid: false, error: issues.map((e: any) => e.message).join(', ') };
    }
    return { valid: false, error: 'Validation failed' };
  }
}
