/**
 * Support Agent Context Builder
 *
 * Builds comprehensive context for the support agent including ticket details,
 * customer history, and conversation thread.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TicketContext } from '../dto/agent-action.dto';
import { TicketStatus } from '@prisma/client';
import { SlaService, SLA_CONFIG } from '../sla.service';

@Injectable()
export class SupportAgentContext {
  private readonly logger = new Logger(SupportAgentContext.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slaService: SlaService,
  ) {}

  /**
   * Build full context for a ticket
   */
  async buildContext(ticketId: string): Promise<TicketContext> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Get customer's previous tickets
    const previousTickets = await this.prisma.supportTicket.count({
      where: {
        email: ticket.email,
        id: { not: ticketId },
      },
    });

    // Calculate ticket age
    const now = new Date();
    const ageMs = now.getTime() - ticket.createdAt.getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    let ticketAge: string;
    if (ageDays > 0) {
      ticketAge = `${ageDays} day${ageDays > 1 ? 's' : ''} ${ageHours % 24}h`;
    } else if (ageHours > 0) {
      ticketAge = `${ageHours} hour${ageHours > 1 ? 's' : ''} ${ageMinutes % 60}m`;
    } else {
      ticketAge = `${ageMinutes} minute${ageMinutes > 1 ? 's' : ''}`;
    }

    // Build conversation array
    const conversation = this.buildConversationArray(ticket, ticket.responses);

    // Format conversation for LLM
    const formattedConversation = this.formatConversation(ticket, ticket.responses);

    // Find last customer message and agent response
    const customerMessages = conversation.filter(c => c.role === 'customer');
    const agentMessages = conversation.filter(c => c.role === 'agent');

    // Get SLA status
    const slaStatus = await this.slaService.getSlaStatus(ticketId);
    const slaConfig = SLA_CONFIG[ticket.priority];

    return {
      ticket: {
        id: ticket.id,
        caseId: ticket.caseId,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt || undefined,
        metadata: (ticket.metadata as Record<string, any>) || undefined,
      },
      customer: {
        name: ticket.name || undefined,
        email: ticket.email,
        ticketCount: previousTickets + 1, // Include current ticket
        accountType: this.determineAccountType(ticket.email),
      },
      conversation,
      formattedConversation,
      ticketAge,
      ticketAgeMinutes: ageMinutes,
      responseCount: ticket.responses.length,
      lastCustomerMessage: customerMessages.length > 0
        ? customerMessages[customerMessages.length - 1].content
        : undefined,
      lastAgentResponse: agentMessages.length > 0
        ? agentMessages[agentMessages.length - 1].content
        : undefined,
      // SLA Information
      sla: slaStatus ? {
        overallStatus: slaStatus.overallStatus,
        timeRemaining: slaStatus.timeRemaining,
        escalationLevel: slaStatus.escalationLevel,
        firstResponseBreached: slaStatus.firstResponseBreached,
        resolutionBreached: slaStatus.resolutionBreached,
        firstResponseDue: slaStatus.firstResponseDue,
        resolutionDue: slaStatus.resolutionDue,
        targetFirstResponseHours: slaConfig.firstResponseHours,
        targetResolutionHours: slaConfig.resolutionHours,
      } : undefined,
    };
  }

  /**
   * Build structured conversation array
   */
  private buildConversationArray(
    ticket: any,
    responses: any[],
  ): TicketContext['conversation'] {
    const conversation: TicketContext['conversation'] = [];

    // Add original ticket as first message
    conversation.push({
      role: 'customer',
      content: `Subject: ${ticket.subject}\n\n${ticket.description}`,
      timestamp: ticket.createdAt,
      isInternal: false,
    });

    // Add all responses
    for (const response of responses) {
      let role: 'customer' | 'agent' | 'system';

      if (response.isInternal) {
        role = 'system';
      } else if (response.responderId || response.isAiGenerated) {
        role = 'agent';
      } else {
        role = 'customer';
      }

      conversation.push({
        role,
        content: response.content,
        timestamp: response.createdAt,
        isInternal: response.isInternal,
      });
    }

    return conversation;
  }

  /**
   * Format conversation for LLM consumption
   */
  private formatConversation(ticket: any, responses: any[]): string {
    let formatted = '';

    // Original request
    formatted += `[ORIGINAL REQUEST] (${this.formatDate(ticket.createdAt)})\n`;
    formatted += `From: ${ticket.name || 'Customer'} <${ticket.email}>\n`;
    formatted += `Subject: ${ticket.subject}\n\n`;
    formatted += `${ticket.description}\n`;
    formatted += '\n---\n\n';

    // Responses
    for (const response of responses) {
      const sender = this.getSenderLabel(response);
      formatted += `[${sender}] (${this.formatDate(response.createdAt)})\n`;
      formatted += `${response.content}\n`;
      formatted += '\n---\n\n';
    }

    return formatted.trim();
  }

  /**
   * Get sender label for a response
   */
  private getSenderLabel(response: any): string {
    if (response.isInternal) {
      return 'INTERNAL NOTE';
    }
    if (response.isAiGenerated) {
      return 'AI AGENT';
    }
    if (response.responderId) {
      return 'SUPPORT TEAM';
    }
    return 'CUSTOMER';
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Determine account type based on email domain
   */
  private determineAccountType(email: string): string {
    const domain = email.split('@')[1]?.toLowerCase();

    // VIP domains (customize as needed)
    const vipDomains = ['enterprise.com', 'bigcorp.com'];
    if (vipDomains.includes(domain)) {
      return 'VIP';
    }

    // Enterprise patterns
    if (email.includes('enterprise') || email.includes('corp')) {
      return 'Enterprise';
    }

    // Free email providers
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    if (freeProviders.includes(domain)) {
      return 'Standard';
    }

    // Business domain
    return 'Business';
  }

  /**
   * Get a summary of the ticket for quick reference
   */
  getTicketSummary(ctx: TicketContext): string {
    return `
Ticket ${ctx.ticket.caseId} | ${ctx.ticket.status} | ${ctx.ticket.priority}
Category: ${ctx.ticket.category}
Customer: ${ctx.customer.name || 'Unknown'} (${ctx.customer.email})
Account: ${ctx.customer.accountType} | Previous tickets: ${ctx.customer.ticketCount - 1}
Age: ${ctx.ticketAge} | Responses: ${ctx.responseCount}
`.trim();
  }
}
