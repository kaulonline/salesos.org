/**
 * Support Agent Service
 *
 * Main orchestrator for the LLM-driven autonomous support agent.
 * Uses Claude with tool calling to analyze tickets and take appropriate actions.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { SupportAgentExecutor } from './support-agent-executor';
import { SupportAgentContext } from './support-agent-context';
import { SupportAgentSafety } from './support-agent-safety';
import { getAnthropicToolDefinitions, validateToolInput } from './support-agent-tools';
import {
  TicketEventType,
  AgentResult,
  ExecutedAction,
  TicketContext,
} from '../dto/agent-action.dto';

const SUPPORT_AGENT_SYSTEM_PROMPT = `You are IRIS Support Agent, an AI-powered customer support specialist for IRIS CRM.

## Your Role
You handle customer support tickets autonomously, making decisions and taking actions to resolve issues efficiently while maintaining excellent customer experience.

## Guidelines

### Communication Style
- Be warm, professional, and empathetic
- Acknowledge the customer's frustration when present
- Use their name when available
- Keep responses concise but thorough (3-4 paragraphs maximum)
- Never make up product features or capabilities
- If unsure, say so and escalate

### Decision Making
- Analyze the full conversation context before acting
- Consider customer sentiment and urgency
- Take the minimum actions needed to resolve the issue
- Don't over-communicate (one clear response is better than multiple)
- When in doubt, flag for human review rather than guess

### Safety Rules
- NEVER auto-process refunds without human approval
- NEVER share sensitive customer data
- NEVER make promises about features or timelines you can't guarantee
- ALWAYS escalate security or legal concerns immediately
- ALWAYS log your reasoning for complex decisions
- NEVER write your own feedback/survey requests in send_response - use send_csat_request tool instead

### Customer Feedback (CSAT)
- When a ticket is resolved, use the send_csat_request tool to request feedback
- NEVER write your own "rate our service" or "how was your experience" messages via send_response
- The send_csat_request tool sends a professionally designed feedback email automatically
- Only send ONE feedback request per ticket - do not duplicate

### Action Priority
1. Understand the issue completely
2. Address the customer's immediate concern
3. Take appropriate status/priority actions
4. Set up any needed follow-ups

### When to Escalate
- Customer mentions legal action, lawsuit, or attorney
- Security breach or data leak concerns
- VIP customer with unresolved issue
- Customer explicitly asks for a manager
- You're unsure how to proceed after 2+ resolution attempts
- Financial disputes over significant amounts

### Response Quality
- Maximum 3-4 paragraphs
- Include specific next steps when applicable
- Set clear expectations for resolution time
- Thank them for their patience when appropriate
- Don't use excessive formatting (no markdown headers, minimal bullets)

### Status Changes
- OPEN: Ticket needs attention, being worked on
- IN_PROGRESS: Actively working on the issue
- WAITING_ON_CUSTOMER: Sent a question, waiting for customer reply
- RESOLVED: Issue is fixed, customer confirmed or clearly satisfied
- CLOSED: Ticket is finalized, no further action needed

### When to Close/Resolve
- Customer explicitly says "thank you, that worked" or similar
- Customer confirms the solution worked
- Customer says "I'm good", "all set", "close this ticket"
- No response from customer for 7+ days after providing solution

### SLA Compliance (IMPORTANT)
Every ticket has SLA (Service Level Agreement) deadlines that MUST be respected:
- **First Response SLA**: You must send an initial response within the target time
- **Resolution SLA**: The ticket must be resolved within the target time

SLA Status Levels:
- **on_track**: Plenty of time remaining - proceed normally
- **warning** (50% elapsed): Prioritize this ticket, ensure a response is sent
- **critical** (75% elapsed): URGENT - Take immediate action to respond/resolve
- **breached**: SLA has been missed - Apologize and escalate if needed

When SLA is at WARNING or CRITICAL level:
1. Prioritize sending a response immediately
2. If you cannot resolve, at least acknowledge the issue
3. Set clear expectations with the customer
4. Consider escalating if resolution will be delayed

When SLA is BREACHED:
1. Include an apology in your response for the delay
2. Prioritize resolution over other tickets
3. Consider escalating to supervisor for visibility

You have access to various tools. Use them thoughtfully to resolve tickets efficiently.
Take action using the available tools - don't just describe what should be done.`;

interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string;
}

@Injectable()
export class SupportAgentService {
  private readonly logger = new Logger(SupportAgentService.name);
  private readonly MAX_TOOL_CALLS = 5; // Prevent infinite loops

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly executor: SupportAgentExecutor,
    private readonly context: SupportAgentContext,
    private readonly safety: SupportAgentSafety,
  ) {}

  /**
   * Process a ticket event with the autonomous agent
   */
  async processTicketEvent(
    ticketId: string,
    eventType: TicketEventType,
    agentConfig?: {
      agentId?: string;
      agentName?: string;
      specialization?: string;
      customSystemPrompt?: string | null;
    },
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const agentLabel = agentConfig?.agentName || 'Default Agent';
    this.logger.log(`Processing ${eventType} for ticket ${ticketId} with ${agentLabel}`);

    try {
      // Idempotency check: prevent duplicate processing within 2 minutes
      // Check if there are any recent agent actions for this ticket
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentAction = await this.prisma.supportAgentAction.findFirst({
        where: {
          ticketId,
          createdAt: { gte: twoMinutesAgo },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentAction) {
        this.logger.warn(
          `Skipping duplicate agent run for ticket ${ticketId} (${eventType}) - last action ${Math.round((Date.now() - recentAction.createdAt.getTime()) / 1000)}s ago`,
        );
        return {
          success: true,
          actions: [],
          summary: 'Duplicate processing prevented (idempotency check)',
        };
      }

      // Build full context
      const ctx = await this.context.buildContext(ticketId);

      this.logger.log(`Context built for ${ctx.ticket.caseId}: ${ctx.ticketAge} old, ${ctx.responseCount} responses`);

      // Run agent loop with optional agent-specific configuration
      const result = await this.runAgentLoop(ctx, eventType, agentConfig);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Agent ${agentLabel} completed for ${ctx.ticket.caseId}: ${result.actions.length} actions in ${duration}ms`,
      );

      // Log completion
      await this.logAgentRun(ticketId, eventType, result, duration, agentConfig?.agentId);

      return result;
    } catch (error) {
      this.logger.error(`Agent ${agentLabel} failed for ticket ${ticketId}: ${error.message}`);
      return {
        success: false,
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Run the agent loop with Claude
   */
  private async runAgentLoop(
    ctx: TicketContext,
    eventType: TicketEventType,
    agentConfig?: {
      agentId?: string;
      agentName?: string;
      specialization?: string;
      customSystemPrompt?: string | null;
    },
  ): Promise<AgentResult> {
    const messages: Message[] = [
      { role: 'user', content: this.buildPrompt(ctx, eventType) },
    ];

    const executedActions: ExecutedAction[] = [];
    const pendingActions: { id: string; toolName: string; input: any; reason: string }[] = [];
    let iterations = 0;
    
    // Track email-sending tools to prevent duplicates in same session
    const emailToolsUsed = new Set<string>();

    const tools = getAnthropicToolDefinitions();

    // Get the system prompt - use custom if provided, otherwise use specialization-specific, or default
    const systemPrompt = agentConfig?.customSystemPrompt
      || this.getSpecializationPrompt(agentConfig?.specialization, agentConfig?.agentName)
      || SUPPORT_AGENT_SYSTEM_PROMPT;

    while (iterations < this.MAX_TOOL_CALLS) {
      iterations++;

      // Call Claude with tools
      const response = await this.anthropic.createMessageWithTools({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        system: systemPrompt,
        tools,
        maxTokens: 2048,
        temperature: 0.3,
      });

      // Check if Claude wants to use a tool
      const toolUseBlocks = this.extractToolUseBlocks(response);

      if (toolUseBlocks.length === 0) {
        // Claude is done - extract final message
        const textContent = this.extractTextContent(response);

        return {
          success: true,
          actions: executedActions,
          summary: textContent,
          pendingActions,
        };
      }

      // Process each tool use
      const toolResults: MessageContent[] = [];

      for (const toolUse of toolUseBlocks) {
        // Validate input
        const validation = validateToolInput(toolUse.name, toolUse.input);
        if (!validation.valid) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Validation error: ${validation.error}`,
          });
          continue;
        }

        // Check for duplicate email-sending tools in this session
        const emailSendingTools = ['send_response', 'request_more_info'];
        if (emailSendingTools.includes(toolUse.name) && emailToolsUsed.has(toolUse.name)) {
          this.logger.warn(
            `Preventing duplicate ${toolUse.name} call in same agent session for ticket ${ctx.ticket.caseId}`,
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Already sent customer communication in this session. Use add_internal_note instead for additional context.`,
          });
          continue;
        }
        
        // Safety check
        const safetyResult = await this.safety.validateToolCall(
          toolUse.name,
          toolUse.input,
          ctx,
        );

        if (!safetyResult.allowed) {
          if (safetyResult.requiresReview) {
            // Queue for human review
            const pendingAction = await this.queueForReview(
              ctx.ticket.id,
              toolUse.name,
              toolUse.input,
              safetyResult.reason || 'Requires human approval',
            );
            pendingActions.push({
              id: pendingAction.id,
              toolName: toolUse.name,
              input: toolUse.input,
              reason: safetyResult.reason || 'Requires human approval',
            });
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Action blocked: ${safetyResult.reason}. ${safetyResult.requiresReview ? 'This has been queued for human review.' : ''}`,
          });
          continue;
        }

        // Execute the tool
        const result = await this.executor.execute(
          toolUse.name,
          toolUse.input,
          ctx.ticket.id,
          ctx,
        );

        // Track email-sending tools
        if (emailSendingTools.includes(toolUse.name)) {
          emailToolsUsed.add(toolUse.name);
        }

        executedActions.push({
          tool: toolUse.name,
          input: toolUse.input,
          result,
          timestamp: new Date(),
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Add assistant response and tool results to conversation
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    // Max iterations reached
    this.logger.warn(`Agent hit max iterations (${this.MAX_TOOL_CALLS}) for ticket ${ctx.ticket.caseId}`);

    return {
      success: true,
      actions: executedActions,
      summary: 'Agent completed with max iterations reached',
      pendingActions,
    };
  }

  /**
   * Build the prompt for the agent
   */
  private buildPrompt(ctx: TicketContext, eventType: TicketEventType): string {
    const eventDescription = {
      new_ticket: 'A new support ticket has been received.',
      customer_reply: 'The customer has replied to this ticket.',
      scheduled_check: 'This is a scheduled check on an open ticket.',
      manual_trigger: 'An admin has manually triggered agent review.',
    };

    // Build SLA section if available
    let slaSection = '';
    if (ctx.sla) {
      const urgencyIcon = {
        on_track: '✅',
        warning: '⚠️',
        critical: '🚨',
        breached: '❌',
      }[ctx.sla.overallStatus];

      slaSection = `
## SLA Status ${urgencyIcon}
- **Overall Status**: ${ctx.sla.overallStatus.toUpperCase()}
- **Time Remaining**: ${ctx.sla.timeRemaining}
- **Escalation Level**: ${ctx.sla.escalationLevel}
- **First Response Due**: ${ctx.sla.firstResponseDue ? new Date(ctx.sla.firstResponseDue).toISOString() : 'N/A'}
- **First Response Breached**: ${ctx.sla.firstResponseBreached ? 'YES - respond immediately!' : 'No'}
- **Resolution Due**: ${ctx.sla.resolutionDue ? new Date(ctx.sla.resolutionDue).toISOString() : 'N/A'}
- **Resolution Breached**: ${ctx.sla.resolutionBreached ? 'YES - prioritize resolution!' : 'No'}
- **Target Response Time**: ${ctx.sla.targetFirstResponseHours} hours
- **Target Resolution Time**: ${ctx.sla.targetResolutionHours} hours
${ctx.sla.overallStatus === 'warning' ? '\n⚠️ SLA WARNING: Time is running out. Prioritize this ticket!' : ''}
${ctx.sla.overallStatus === 'critical' ? '\n🚨 SLA CRITICAL: Immediate action required! Respond NOW!' : ''}
${ctx.sla.overallStatus === 'breached' ? '\n❌ SLA BREACHED: Include an apology for the delay in your response!' : ''}
`;
    }

    return `## Event
${eventDescription[eventType]}
${slaSection}
## Ticket Summary
${this.context.getTicketSummary(ctx)}

## Full Conversation
${ctx.formattedConversation}

## Your Task
Analyze this ticket and take appropriate actions. Consider:
1. What is the customer asking for or experiencing?
2. What is their current sentiment (frustrated, satisfied, neutral)?
3. What actions should be taken immediately?
4. Do we need more information from them?
5. Should this be escalated?
6. What response (if any) should we send?
7. Should the ticket status or priority be updated?
${ctx.sla?.overallStatus === 'breached' ? '8. SLA is BREACHED - apologize for the delay in your response!' : ''}
${ctx.sla?.overallStatus === 'critical' ? '8. SLA is CRITICAL - send a response immediately!' : ''}

Be proactive but not overwhelming - take the minimum necessary actions to move this ticket toward resolution.

If the customer indicates they're satisfied or the issue is resolved (saying things like "thanks, that worked", "I'm good", "close this ticket", etc.), update the status to RESOLVED.

Take action now using the available tools.`;
  }

  /**
   * Extract tool use blocks from Claude response
   */
  private extractToolUseBlocks(response: any): Array<{ id: string; name: string; input: any }> {
    if (!response.content || !Array.isArray(response.content)) {
      return [];
    }

    return response.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));
  }

  /**
   * Extract text content from Claude response
   */
  private extractTextContent(response: any): string {
    if (!response.content || !Array.isArray(response.content)) {
      return '';
    }

    const textBlocks = response.content.filter((block: any) => block.type === 'text');
    return textBlocks.map((block: any) => block.text).join('\n');
  }

  /**
   * Queue an action for human review
   */
  private async queueForReview(
    ticketId: string,
    toolName: string,
    input: Record<string, any>,
    reason: string,
  ): Promise<{ id: string }> {
    const pending = await this.prisma.supportAgentPendingAction.create({
      data: {
        ticketId,
        toolName,
        input,
        reason,
        status: 'PENDING',
      },
    });

    this.logger.log(`Queued ${toolName} for review on ticket ${ticketId}: ${reason}`);

    return { id: pending.id };
  }

  /**
   * Log the agent run for auditing
   */
  private async logAgentRun(
    ticketId: string,
    eventType: TicketEventType,
    result: AgentResult,
    duration: number,
    agentId?: string,
  ): Promise<void> {
    try {
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) return;

      const metadata = (ticket.metadata as Record<string, any>) || {};
      const agentRuns = metadata.agentRuns || [];

      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          metadata: {
            ...metadata,
            agentRuns: [
              ...agentRuns.slice(-9), // Keep last 10 runs
              {
                eventType,
                agentId,
                actionsCount: result.actions.length,
                pendingCount: result.pendingActions?.length || 0,
                success: result.success,
                duration,
                summary: result.summary?.substring(0, 200),
                timestamp: new Date().toISOString(),
              },
            ],
            lastAgentRun: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log agent run: ${error.message}`);
    }
  }

  /**
   * Get specialization-specific system prompt for an AI agent
   */
  private getSpecializationPrompt(specialization?: string, agentName?: string): string | null {
    if (!specialization) return null;

    const basePrompt = SUPPORT_AGENT_SYSTEM_PROMPT;
    const name = agentName || 'Support Agent';

    const specializationAddons: Record<string, string> = {
      GENERAL: `
## Agent Identity
You are ${name}, a versatile IRIS Support AI specializing in general customer inquiries.
You handle a wide range of support requests and know when to route complex issues to specialists.

## Your Strengths
- Quick triage and categorization of issues
- Clear, helpful responses for common questions
- Efficient routing to specialized teams when needed
- Excellent customer communication`,

      TECHNICAL: `
## Agent Identity
You are ${name}, IRIS's Technical Support AI specialist.
You excel at debugging, troubleshooting, and resolving technical issues.

## Your Strengths
- Deep technical understanding of CRM integrations
- Ability to guide users through complex configurations
- Log analysis and error diagnosis
- API troubleshooting and webhook debugging

## Technical Guidelines
- Ask for error messages, logs, and steps to reproduce
- Provide step-by-step technical solutions
- Reference documentation when helpful
- Escalate to engineering only for true bugs`,

      BILLING: `
## Agent Identity
You are ${name}, IRIS's Billing Support AI specialist.
You handle subscription, payment, and account-related inquiries with care and precision.

## Your Strengths
- Subscription and pricing expertise
- Invoice and payment troubleshooting
- Understanding of billing cycles and proration
- Empathetic handling of financial concerns

## Billing Guidelines
- ALWAYS flag refund requests for human approval
- Never promise specific amounts without verification
- Explain billing clearly and transparently
- Be extra empathetic - billing issues cause stress`,

      ONBOARDING: `
## Agent Identity
You are ${name}, IRIS's Onboarding AI specialist.
You help new customers get started and maximize their success with IRIS CRM.

## Your Strengths
- Guiding new users through setup
- Explaining features and best practices
- Identifying training opportunities
- Building customer confidence

## Onboarding Guidelines
- Be encouraging and patient with new users
- Provide step-by-step guidance
- Offer to schedule onboarding calls for complex setups
- Celebrate their progress and wins`,

      ESCALATION: `
## Agent Identity
You are ${name}, IRIS's Senior Support AI handling escalated issues.
You have broader permissions and handle complex, high-priority cases that require special attention.

## Your Strengths
- Handling frustrated or VIP customers
- Complex multi-issue tickets
- Cases requiring management attention
- High-stakes customer retention

## Escalation Guidelines
- Acknowledge the customer's frustration first
- Take ownership of the entire issue
- Provide concrete next steps with timelines
- Loop in human supervisors when needed
- You have authority to offer goodwill gestures`,

      SALES: `
## Agent Identity
You are ${name}, IRIS's Sales Support AI specialist.
You handle pre-sales inquiries, demo requests, and help convert prospects to customers.

## Your Strengths
- Product knowledge and feature explanations
- Competitive positioning
- Demo scheduling and preparation
- Trial extension and upgrade paths

## Sales Guidelines
- Focus on customer value, not features
- Identify upsell opportunities naturally
- Route hot leads to sales team promptly
- Never pressure - educate and guide`,

      ENTERPRISE: `
## Agent Identity
You are ${name}, IRIS's Enterprise Support AI specialist.
You provide white-glove support for our largest and most strategic customers.

## Your Strengths
- Deep account knowledge and history
- Complex enterprise integration support
- Cross-functional coordination
- Executive-level communication

## Enterprise Guidelines
- Check account health and history before responding
- Coordinate with Customer Success team
- Faster SLA expectations for enterprise accounts
- Proactive communication on any delays`,
    };

    const addon = specializationAddons[specialization] || specializationAddons.GENERAL;

    return `${basePrompt}\n${addon}`;
  }

  /**
   * Approve a pending action and execute it
   */
  async approvePendingAction(actionId: string, reviewerId: string): Promise<AgentResult> {
    const pending = await this.prisma.supportAgentPendingAction.findUnique({
      where: { id: actionId },
      include: { ticket: true },
    });

    if (!pending) {
      return { success: false, actions: [], error: 'Pending action not found' };
    }

    if (pending.status !== 'PENDING') {
      return { success: false, actions: [], error: 'Action already reviewed' };
    }

    // Execute the action
    const result = await this.executor.execute(
      pending.toolName,
      pending.input as Record<string, any>,
      pending.ticketId,
    );

    // Update pending action
    await this.prisma.supportAgentPendingAction.update({
      where: { id: actionId },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    return {
      success: result.success,
      actions: [
        {
          tool: pending.toolName,
          input: pending.input as Record<string, any>,
          result,
          timestamp: new Date(),
        },
      ],
    };
  }

  /**
   * Reject a pending action
   */
  async rejectPendingAction(actionId: string, reviewerId: string, reason: string): Promise<void> {
    await this.prisma.supportAgentPendingAction.update({
      where: { id: actionId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });
  }

  /**
   * Get pending actions for review
   */
  async getPendingActions(limit = 50): Promise<any[]> {
    return this.prisma.supportAgentPendingAction.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        ticket: {
          select: {
            id: true,
            caseId: true,
            subject: true,
            email: true,
            status: true,
            priority: true,
          },
        },
      },
    });
  }

  /**
   * Get agent action history for a ticket
   */
  async getTicketAgentHistory(ticketId: string): Promise<any[]> {
    return this.prisma.supportAgentAction.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
