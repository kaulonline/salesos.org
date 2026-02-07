/**
 * Support Agent Safety Service
 *
 * Implements safety rules, rate limits, and validation for autonomous agent actions.
 * Ensures the agent operates within defined boundaries and escalates appropriately.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SUPPORT_AGENT_TOOLS } from './support-agent-tools';
import { TicketContext, SafetyValidationResult } from '../dto/agent-action.dto';

@Injectable()
export class SupportAgentSafety {
  private readonly logger = new Logger(SupportAgentSafety.name);

  // Actions that NEVER auto-execute - always require human approval
  private readonly BLOCKED_AUTO_EXECUTE = [
    'process_refund_request',
    'extend_trial',
  ];

  // Rate limits per ticket per hour
  private readonly RATE_LIMITS: Record<string, number> = {
    send_response: 3,
    update_ticket_status: 5,
    update_ticket_priority: 3,
    escalate_to_supervisor: 1,
    request_more_info: 2,
    add_internal_note: 10,
    log_decision: 20,
  };

  // Minimum ticket age in minutes before certain actions
  private readonly MIN_AGE_REQUIREMENTS: Record<string, number> = {
    // Can't close a ticket within 2 minutes
    CLOSED: 2,
    RESOLVED: 2,
  };

  // Prohibited content patterns in responses
  private readonly PROHIBITED_PATTERNS = [
    /password/i,
    /social security/i,
    /credit card number/i,
    /\b(?:api[_\s]?key|secret[_\s]?key)\b/i,
    /guarantee[sd]?\s+(?:refund|money\s+back)/i,
    /lawsuit|sue|attorney|lawyer/i,
  ];

  // Keywords that suggest escalation is needed
  private readonly ESCALATION_KEYWORDS = [
    'lawyer',
    'attorney',
    'lawsuit',
    'sue',
    'legal action',
    'cancel my account',
    'delete my data',
    'gdpr',
    'security breach',
    'data leak',
    'hacked',
    'fraud',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a tool call before execution
   */
  async validateToolCall(
    toolName: string,
    input: Record<string, any>,
    ctx: TicketContext,
  ): Promise<SafetyValidationResult> {
    const tool = SUPPORT_AGENT_TOOLS[toolName];

    if (!tool) {
      return { allowed: false, reason: `Unknown tool: ${toolName}` };
    }

    // Check if tool requires confirmation and thus needs human approval
    if (this.BLOCKED_AUTO_EXECUTE.includes(toolName)) {
      return {
        allowed: false,
        reason: `${toolName} requires human approval`,
        requiresReview: true,
      };
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(ctx.ticket.id, toolName);
    if (!rateLimitResult.allowed) {
      return rateLimitResult;
    }

    // Validate specific tool inputs
    const inputValidation = await this.validateToolInput(toolName, input, ctx);
    if (!inputValidation.allowed) {
      return inputValidation;
    }

    // Check for escalation indicators in the conversation
    if (this.shouldForceEscalation(ctx)) {
      if (toolName !== 'escalate_to_supervisor' && toolName !== 'flag_for_review') {
        this.logger.warn(`Ticket ${ctx.ticket.caseId} contains escalation keywords - flagging for review`);
        // Don't block the action, but flag the ticket
        await this.flagTicketForReview(ctx.ticket.id, 'Contains escalation-worthy keywords');
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limits for a tool on a specific ticket
   */
  private async checkRateLimit(
    ticketId: string,
    toolName: string,
  ): Promise<SafetyValidationResult> {
    const limit = this.RATE_LIMITS[toolName];
    if (!limit) {
      return { allowed: true }; // No rate limit for this tool
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCalls = await this.prisma.supportAgentAction.count({
      where: {
        ticketId,
        toolName,
        createdAt: { gte: oneHourAgo },
        status: 'EXECUTED',
      },
    });

    if (recentCalls >= limit) {
      return {
        allowed: false,
        reason: `Rate limit exceeded for ${toolName} (${recentCalls}/${limit} per hour)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate tool-specific input
   */
  private async validateToolInput(
    toolName: string,
    input: Record<string, any>,
    ctx: TicketContext,
  ): Promise<SafetyValidationResult> {
    switch (toolName) {
      case 'update_ticket_status': {
        const targetStatus = input.status as string;

        // Check minimum age requirements
        const minAge = this.MIN_AGE_REQUIREMENTS[targetStatus];
        if (minAge && ctx.ticketAgeMinutes < minAge) {
          return {
            allowed: false,
            reason: `Cannot set status to ${targetStatus} within ${minAge} minutes of creation`,
          };
        }

        // Can't close a ticket that's already closed
        if (targetStatus === 'CLOSED' && ctx.ticket.status === 'CLOSED') {
          return { allowed: false, reason: 'Ticket is already closed' };
        }

        // Can't reopen a closed ticket without explicit reason
        if (ctx.ticket.status === 'CLOSED' && targetStatus !== 'CLOSED') {
          return {
            allowed: false,
            reason: 'Cannot reopen a closed ticket - requires human review',
            requiresReview: true,
          };
        }

        break;
      }

      case 'send_response': {
        const message = input.message as string;

        // Check for prohibited content
        if (this.containsProhibitedContent(message)) {
          return {
            allowed: false,
            reason: 'Response contains prohibited content patterns',
            requiresReview: true,
          };
        }

        // Check message length
        if (message.length > 5000) {
          return { allowed: false, reason: 'Response exceeds 5000 character limit' };
        }

        if (message.length < 10) {
          return { allowed: false, reason: 'Response is too short' };
        }

        break;
      }

      case 'update_ticket_priority': {
        const targetPriority = input.priority as string;

        // Prevent downgrading CRITICAL priority without review
        if (ctx.ticket.priority === 'CRITICAL' && targetPriority !== 'CRITICAL') {
          return {
            allowed: false,
            reason: 'Cannot downgrade from CRITICAL priority without human review',
            requiresReview: true,
          };
        }

        break;
      }

      case 'process_refund_request': {
        // Always require human approval for refunds
        return {
          allowed: false,
          reason: 'Refunds require human approval',
          requiresReview: true,
        };
      }

      case 'extend_trial': {
        const days = input.days as number;
        if (days > 14) {
          return {
            allowed: false,
            reason: 'Trial extensions over 14 days require human approval',
            requiresReview: true,
          };
        }
        break;
      }

      case 'escalate_to_supervisor': {
        // This is always allowed but requires confirmation
        return {
          allowed: false,
          reason: 'Escalations require human review',
          requiresReview: true,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if message contains prohibited content
   */
  private containsProhibitedContent(message: string): boolean {
    return this.PROHIBITED_PATTERNS.some(pattern => pattern.test(message));
  }

  /**
   * Check if the ticket conversation contains escalation-worthy keywords
   */
  private shouldForceEscalation(ctx: TicketContext): boolean {
    const conversationText = ctx.formattedConversation.toLowerCase();
    return this.ESCALATION_KEYWORDS.some(keyword =>
      conversationText.includes(keyword.toLowerCase()),
    );
  }

  /**
   * Flag a ticket for human review
   */
  private async flagTicketForReview(ticketId: string, reason: string): Promise<void> {
    try {
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) return;

      const metadata = (ticket.metadata as Record<string, any>) || {};

      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          metadata: {
            ...metadata,
            flaggedForReview: true,
            flaggedAt: new Date().toISOString(),
            flagReason: reason,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to flag ticket ${ticketId}: ${error.message}`);
    }
  }

  /**
   * Get the maximum number of tool calls allowed per agent run
   */
  getMaxToolCallsPerRun(): number {
    return 5;
  }

  /**
   * Check if a tool can be auto-executed
   */
  canAutoExecute(toolName: string): boolean {
    const tool = SUPPORT_AGENT_TOOLS[toolName];
    if (!tool) return false;
    return tool.autoExecute && !this.BLOCKED_AUTO_EXECUTE.includes(toolName);
  }

  /**
   * Get safety summary for logging
   */
  getSafetySummary(): Record<string, any> {
    return {
      blockedTools: this.BLOCKED_AUTO_EXECUTE,
      rateLimits: this.RATE_LIMITS,
      minAgeRequirements: this.MIN_AGE_REQUIREMENTS,
      escalationKeywords: this.ESCALATION_KEYWORDS.length,
    };
  }
}
