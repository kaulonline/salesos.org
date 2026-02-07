/**
 * Support Agent Tool Executor
 *
 * Executes tool calls made by the support agent and returns structured results.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../email/email.service';
import { SlaService } from '../sla.service';
import { PageIndexService } from '../../pageindex/pageindex.service';
import { TicketStatus, TicketPriority, TicketCategory, TaskStatus, TaskPriority } from '@prisma/client';
import { ToolResult, TicketContext } from '../dto/agent-action.dto';
import {
  UpdateTicketStatusInput,
  UpdateTicketPriorityInput,
  SendResponseInput,
  RequestMoreInfoInput,
  EscalateToSupervisorInput,
  RouteToSpecialistInput,
  AddInternalNoteInput,
  AddTicketTagsInput,
  SendCsatRequestInput,
  CreateFollowUpTaskInput,
  SearchKnowledgeBaseInput,
  LookupCustomerHistoryInput,
  LogDecisionInput,
} from '../dto/agent-action.dto';
import {
  generateTicketResponseEmail,
  generateCSATFeedbackEmail,
} from '../../email/templates/premium-email-templates';

@Injectable()
export class SupportAgentExecutor {
  private readonly logger = new Logger(SupportAgentExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly slaService: SlaService,
    @Optional() private readonly pageIndexService?: PageIndexService,
  ) {}

  /**
   * Execute a tool and return the result
   */
  async execute(
    toolName: string,
    input: Record<string, any>,
    ticketId: string,
    ctx?: TicketContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const ticket = await this.prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: { responses: true },
      });

      if (!ticket) {
        return { success: false, error: `Ticket not found: ${ticketId}` };
      }

      let result: ToolResult;

      switch (toolName) {
        // Ticket Management
        case 'update_ticket_status':
          result = await this.updateTicketStatus(ticket, input as UpdateTicketStatusInput);
          break;
        case 'update_ticket_priority':
          result = await this.updateTicketPriority(ticket, input as UpdateTicketPriorityInput);
          break;
        case 'add_ticket_tags':
          result = await this.addTicketTags(ticket, input as AddTicketTagsInput);
          break;

        // Communication
        case 'send_response':
          result = await this.sendResponse(ticket, input as SendResponseInput);
          break;
        case 'request_more_info':
          result = await this.requestMoreInfo(ticket, input as RequestMoreInfoInput);
          break;
        case 'send_csat_request':
          result = await this.sendCsatRequest(ticket, input as SendCsatRequestInput);
          break;
        case 'acknowledge_receipt':
          result = await this.acknowledgeReceipt(ticket, input);
          break;

        // Escalation
        case 'escalate_to_supervisor':
          result = await this.escalateToSupervisor(ticket, input as EscalateToSupervisorInput);
          break;
        case 'route_to_specialist':
          result = await this.routeToSpecialist(ticket, input as RouteToSpecialistInput);
          break;
        case 'flag_for_review':
          result = await this.flagForReview(ticket, input as { flag: string; notes: string });
          break;

        // Knowledge
        case 'search_knowledge_base':
          result = await this.searchKnowledgeBase(input as SearchKnowledgeBaseInput);
          break;
        case 'lookup_customer_history':
          result = await this.lookupCustomerHistory(input as LookupCustomerHistoryInput);
          break;
        case 'check_known_issues':
          result = await this.checkKnownIssues(input as { symptoms: string[] });
          break;

        // Business
        case 'create_followup_task':
          result = await this.createFollowUpTask(ticket, input as CreateFollowUpTaskInput);
          break;
        case 'schedule_callback':
          result = await this.scheduleCallback(ticket, input as { preferredTime: string; topic: string });
          break;

        // System
        case 'add_internal_note':
          result = await this.addInternalNote(ticket, input as AddInternalNoteInput);
          break;
        case 'log_decision':
          result = await this.logDecision(ticket, input as LogDecisionInput);
          break;
        case 'set_reminder':
          result = await this.setReminder(ticket, input as { reminderDate: string; message: string });
          break;

        default:
          result = { success: false, error: `Unknown tool: ${toolName}` };
      }

      // Log the action
      const duration = Date.now() - startTime;
      await this.logAgentAction(ticketId, toolName, input, result, duration);

      return result;
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // Ticket Management Tools
  // ============================================================================

  private async updateTicketStatus(
    ticket: any,
    input: UpdateTicketStatusInput,
  ): Promise<ToolResult> {
    const previousStatus = ticket.status;

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: input.status as TicketStatus,
        resolvedAt: input.status === 'RESOLVED' ? new Date() : undefined,
      },
    });

    // Log the change
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[AGENT] Status changed: ${previousStatus} -> ${input.status}\nReason: ${input.reason}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    this.logger.log(`Updated ticket ${ticket.caseId} status: ${previousStatus} -> ${input.status}`);

    return {
      success: true,
      message: `Status updated from ${previousStatus} to ${input.status}`,
      data: { previousStatus, newStatus: input.status },
    };
  }

  private async updateTicketPriority(
    ticket: any,
    input: UpdateTicketPriorityInput,
  ): Promise<ToolResult> {
    const previousPriority = ticket.priority;

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        priority: input.priority as TicketPriority,
      },
    });

    // Log the change
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[AGENT] Priority changed: ${previousPriority} -> ${input.priority}\nReason: ${input.reason}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    this.logger.log(`Updated ticket ${ticket.caseId} priority: ${previousPriority} -> ${input.priority}`);

    return {
      success: true,
      message: `Priority updated from ${previousPriority} to ${input.priority}`,
      data: { previousPriority, newPriority: input.priority },
    };
  }

  private async addTicketTags(
    ticket: any,
    input: AddTicketTagsInput,
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};
    const existingTags = metadata.tags || [];
    const newTags = [...new Set([...existingTags, ...input.tags])];

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        metadata: {
          ...metadata,
          tags: newTags,
        },
      },
    });

    return {
      success: true,
      message: `Added tags: ${input.tags.join(', ')}`,
      data: { tags: newTags },
    };
  }

  // ============================================================================
  // Communication Tools
  // ============================================================================

  private async sendResponse(
    ticket: any,
    input: SendResponseInput,
  ): Promise<ToolResult> {
    // Check for duplicate email within last 5 minutes to prevent spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEmailResponse = await this.prisma.ticketResponse.findFirst({
      where: {
        ticketId: ticket.id,
        isInternal: false,
        isAiGenerated: true,
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentEmailResponse) {
      this.logger.warn(
        `Skipping duplicate email send for ticket ${ticket.caseId} - email sent ${Math.round((Date.now() - recentEmailResponse.createdAt.getTime()) / 1000)}s ago`,
      );
      return {
        success: true,
        message: 'Response already sent recently (duplicate prevented)',
        data: { duplicatePrevented: true },
      };
    }

    // Create response record
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: input.message,
        isInternal: false,
        isAiGenerated: true,
      },
    });

    // Send email to customer using premium template
    try {
      const statusUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/status/${ticket.feedbackToken || ticket.id}`;
      const emailContent = generateTicketResponseEmail({
        userName: ticket.name || 'Valued Customer',
        caseId: ticket.caseId,
        subject: ticket.subject,
        responseContent: input.message,
        statusUrl,
      });

      await this.email.sendPremiumEmail({
        to: ticket.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      this.logger.error(`Failed to send email for ticket ${ticket.caseId}: ${emailError.message}`);
      // Don't fail the whole operation if email fails
    }

    // Update status if requested
    if (input.markAsWaiting) {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.WAITING_ON_CUSTOMER },
      });
    }

    // Record first response for SLA tracking
    await this.slaService.recordFirstResponse(ticket.id);

    this.logger.log(`Sent response to ticket ${ticket.caseId}`);

    return {
      success: true,
      message: 'Response sent to customer',
      data: {
        emailSent: true,
        statusUpdated: input.markAsWaiting || false,
        responseLength: input.message.length,
      },
    };
  }

  private async requestMoreInfo(
    ticket: any,
    input: RequestMoreInfoInput,
  ): Promise<ToolResult> {
    // Check for duplicate email within last 5 minutes to prevent spam
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEmailResponse = await this.prisma.ticketResponse.findFirst({
      where: {
        ticketId: ticket.id,
        isInternal: false,
        isAiGenerated: true,
        createdAt: { gte: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentEmailResponse) {
      this.logger.warn(
        `Skipping duplicate info request for ticket ${ticket.caseId} - email sent ${Math.round((Date.now() - recentEmailResponse.createdAt.getTime()) / 1000)}s ago`,
      );
      return {
        success: true,
        message: 'Information request already sent recently (duplicate prevented)',
        data: { duplicatePrevented: true },
      };
    }

    const message = `${input.context}\n\nTo help resolve your issue, could you please provide the following information:\n\n${input.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nThank you for your patience.`;

    // Create response and send
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: message,
        isInternal: false,
        isAiGenerated: true,
      },
    });

    // Update status to waiting
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.WAITING_ON_CUSTOMER },
    });

    // Send email using premium template
    try {
      const statusUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/status/${ticket.feedbackToken || ticket.id}`;
      const emailContent = generateTicketResponseEmail({
        userName: ticket.name || 'Valued Customer',
        caseId: ticket.caseId,
        subject: ticket.subject,
        responseContent: message,
        statusUrl,
      });

      await this.email.sendPremiumEmail({
        to: ticket.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      this.logger.error(`Failed to send email: ${emailError.message}`);
    }

    // Record first response for SLA tracking
    await this.slaService.recordFirstResponse(ticket.id);

    return {
      success: true,
      message: `Requested ${input.questions.length} pieces of information`,
      data: { questions: input.questions },
    };
  }

  private async sendCsatRequest(
    ticket: any,
    input: SendCsatRequestInput,
  ): Promise<ToolResult> {
    // Check if feedback was already sent
    if (ticket.feedbackSentAt) {
      this.logger.log(`Feedback already sent for ticket ${ticket.caseId}`);
      return { success: true, message: 'Feedback request already sent previously' };
    }

    // Generate feedback token if not exists
    let feedbackToken = ticket.feedbackToken;
    if (!feedbackToken) {
      feedbackToken = `fb_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    // Update ticket with token and mark feedback as sent
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        feedbackToken,
        feedbackSentAt: new Date(),
      },
    });

    const feedbackUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/feedback/${feedbackToken}`;

    // Send CSAT email using premium template
    try {
      const emailContent = generateCSATFeedbackEmail({
        userName: ticket.name || 'Valued Customer',
        caseId: ticket.caseId,
        subject: ticket.subject,
        personalizedMessage: "Thank you for contacting IRIS Support. We'd love to hear about your experience and how we can continue to improve.",
        feedbackUrl,
      });

      await this.email.sendPremiumEmail({
        to: ticket.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      this.logger.error(`Failed to send CSAT email: ${emailError.message}`);
      return { success: false, error: emailError.message };
    }

    return {
      success: true,
      message: 'Customer satisfaction survey sent',
      data: { timing: input.timing, feedbackUrl },
    };
  }

  private async acknowledgeReceipt(
    ticket: any,
    input: { customMessage?: string },
  ): Promise<ToolResult> {
    const message = input.customMessage ||
      `Thank you for reaching out to IRIS Support. We've received your request and will get back to you shortly. Your case number is ${ticket.caseId}.`;

    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: message,
        isInternal: false,
        isAiGenerated: true,
      },
    });

    return {
      success: true,
      message: 'Acknowledgment sent',
      data: { message },
    };
  }

  // ============================================================================
  // Escalation Tools
  // ============================================================================

  private async escalateToSupervisor(
    ticket: any,
    input: EscalateToSupervisorInput,
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        priority: TicketPriority.CRITICAL,
        metadata: {
          ...metadata,
          escalated: true,
          escalatedAt: new Date().toISOString(),
          escalationUrgency: input.urgency,
          escalationReason: input.reason,
          suggestedAction: input.suggestedAction,
        },
      },
    });

    // Log escalation
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[AGENT] ESCALATED (${input.urgency.toUpperCase()} urgency)\nReason: ${input.reason}${input.suggestedAction ? `\nSuggested action: ${input.suggestedAction}` : ''}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    this.logger.warn(`Escalated ticket ${ticket.caseId}: ${input.reason}`);

    return {
      success: true,
      message: `Ticket escalated with ${input.urgency} urgency`,
      data: { escalated: true, urgency: input.urgency },
    };
  }

  private async routeToSpecialist(
    ticket: any,
    input: RouteToSpecialistInput,
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};

    // Map team to category
    const teamToCategoryMap: Record<string, TicketCategory> = {
      billing: TicketCategory.BILLING,
      technical: TicketCategory.PERFORMANCE,
      security: TicketCategory.SECURITY,
      legal: TicketCategory.OTHER,
    };
    const category = teamToCategoryMap[input.team] || TicketCategory.OTHER;

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        category,
        metadata: {
          ...metadata,
          routedTo: input.team,
          routedAt: new Date().toISOString(),
          routeReason: input.reason,
        },
      },
    });

    // Log routing
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[AGENT] Routed to ${input.team.toUpperCase()} team\nReason: ${input.reason}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    return {
      success: true,
      message: `Routed to ${input.team} team`,
      data: { team: input.team },
    };
  }

  private async flagForReview(
    ticket: any,
    input: { flag: string; notes: string },
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};
    const flags = metadata.flags || [];

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        metadata: {
          ...metadata,
          flags: [...flags, { flag: input.flag, notes: input.notes, at: new Date().toISOString() }],
        },
      },
    });

    return {
      success: true,
      message: `Flagged as: ${input.flag}`,
      data: { flag: input.flag },
    };
  }

  // ============================================================================
  // Knowledge Tools
  // ============================================================================

  private async searchKnowledgeBase(
    input: SearchKnowledgeBaseInput,
  ): Promise<ToolResult> {
    // Check if PageIndexService is available
    if (!this.pageIndexService) {
      this.logger.warn('PageIndexService not available - returning fallback response');
      return {
        success: true,
        message: 'Knowledge base service not configured',
        data: {
          query: input.query,
          results: [],
          note: 'PageIndex service is not available. Please configure PAGEINDEX_SERVICE_URL.',
        },
      };
    }

    try {
      // Get list of indexed documents
      const docsResponse = await this.pageIndexService.listDocuments();
      const documents = docsResponse.documents || [];

      if (documents.length === 0) {
        return {
          success: true,
          message: 'No documents indexed in knowledge base',
          data: {
            query: input.query,
            results: [],
            note: 'The knowledge base is empty. Please index documents first.',
          },
        };
      }

      // Search across all indexed documents
      const allResults: Array<{
        documentId: string;
        filename: string;
        title: string;
        summary: string;
        relevanceScore: number;
        startPage: number;
        endPage: number;
      }> = [];

      for (const doc of documents) {
        try {
          const searchResults = await this.pageIndexService.searchDocument(
            doc.document_id,
            input.query,
            input.limit || 5,
          );

          for (const result of searchResults) {
            allResults.push({
              documentId: doc.document_id,
              filename: doc.filename,
              title: result.title,
              summary: result.summary,
              relevanceScore: result.relevance_score,
              startPage: result.start_page,
              endPage: result.end_page,
            });
          }
        } catch (searchError) {
          this.logger.warn(`Failed to search document ${doc.document_id}: ${searchError.message}`);
        }
      }

      // Sort by relevance score and limit results
      const sortedResults = allResults
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, input.limit || 10);

      return {
        success: true,
        message: `Found ${sortedResults.length} results across ${documents.length} documents`,
        data: {
          query: input.query,
          documentsSearched: documents.length,
          results: sortedResults.map(r => ({
            source: r.filename,
            title: r.title,
            snippet: r.summary,
            relevanceScore: r.relevanceScore,
            pages: `${r.startPage}-${r.endPage}`,
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Knowledge base search failed: ${error.message}`);
      return {
        success: false,
        error: `Knowledge base search failed: ${error.message}`,
        data: {
          query: input.query,
          results: [],
        },
      };
    }
  }

  private async lookupCustomerHistory(
    input: LookupCustomerHistoryInput,
  ): Promise<ToolResult> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { email: input.email },
      orderBy: { createdAt: 'desc' },
      take: input.limit || 10,
      select: {
        id: true,
        caseId: true,
        subject: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    return {
      success: true,
      message: `Found ${tickets.length} previous tickets`,
      data: {
        email: input.email,
        ticketCount: tickets.length,
        tickets: tickets.map(t => ({
          caseId: t.caseId,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          category: t.category,
          createdAt: t.createdAt.toISOString(),
          resolved: t.status === 'RESOLVED' || t.status === 'CLOSED',
        })),
      },
    };
  }

  private async checkKnownIssues(
    input: { symptoms: string[] },
  ): Promise<ToolResult> {
    // TODO: Integrate with issue tracking system
    return {
      success: true,
      message: 'No known issues matching symptoms',
      data: {
        symptoms: input.symptoms,
        knownIssues: [],
        note: 'Issue tracking integration pending',
      },
    };
  }

  // ============================================================================
  // Business Tools
  // ============================================================================

  private async createFollowUpTask(
    ticket: any,
    input: CreateFollowUpTaskInput,
  ): Promise<ToolResult> {
    // Create a task linked to the ticket
    const task = await this.prisma.task.create({
      data: {
        subject: input.title,
        description: `Follow-up for support ticket ${ticket.caseId}`,
        dueDate: new Date(input.dueDate),
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        ownerId: ticket.userId || ticket.assignedToId,
        metadata: {
          supportTicketId: ticket.id,
          supportCaseId: ticket.caseId,
          createdByAgent: true,
        },
      },
    });

    return {
      success: true,
      message: `Created follow-up task: ${input.title}`,
      data: { taskId: task.id, dueDate: input.dueDate },
    };
  }

  private async scheduleCallback(
    ticket: any,
    input: { preferredTime: string; topic: string },
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        metadata: {
          ...metadata,
          callbackRequested: true,
          callbackTime: input.preferredTime,
          callbackTopic: input.topic,
        },
      },
    });

    // Log the callback request
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[AGENT] Callback scheduled\nPreferred time: ${input.preferredTime}\nTopic: ${input.topic}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    return {
      success: true,
      message: 'Callback scheduled',
      data: { preferredTime: input.preferredTime, topic: input.topic },
    };
  }

  // ============================================================================
  // System Tools
  // ============================================================================

  private async addInternalNote(
    ticket: any,
    input: AddInternalNoteInput,
  ): Promise<ToolResult> {
    await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: `[INTERNAL] ${input.note}`,
        isInternal: true,
        isAiGenerated: true,
      },
    });

    return {
      success: true,
      message: 'Internal note added',
      data: { noteLength: input.note.length },
    };
  }

  private async logDecision(
    ticket: any,
    input: LogDecisionInput,
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};
    const decisions = metadata.agentDecisions || [];

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        metadata: {
          ...metadata,
          agentDecisions: [
            ...decisions,
            {
              decision: input.decision,
              confidence: input.confidence,
              reasoning: input.reasoning,
              at: new Date().toISOString(),
            },
          ],
        },
      },
    });

    return {
      success: true,
      message: 'Decision logged',
      data: { decision: input.decision, confidence: input.confidence },
    };
  }

  private async setReminder(
    ticket: any,
    input: { reminderDate: string; message: string },
  ): Promise<ToolResult> {
    const metadata = (ticket.metadata as Record<string, any>) || {};
    const reminders = metadata.reminders || [];

    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        metadata: {
          ...metadata,
          reminders: [
            ...reminders,
            {
              date: input.reminderDate,
              message: input.message,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });

    return {
      success: true,
      message: `Reminder set for ${input.reminderDate}`,
      data: { reminderDate: input.reminderDate },
    };
  }

  // ============================================================================
  // Logging
  // ============================================================================

  private async logAgentAction(
    ticketId: string,
    toolName: string,
    input: Record<string, any>,
    result: ToolResult,
    duration: number,
  ): Promise<void> {
    try {
      await this.prisma.supportAgentAction.create({
        data: {
          ticketId,
          toolName,
          input,
          result: result as unknown as Record<string, any>,
          status: result.success ? 'EXECUTED' : 'FAILED',
          duration,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log agent action: ${error.message}`);
    }
  }

}
