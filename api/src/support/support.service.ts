import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { EmailService } from '../email/email.service';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  SupportTicket,
  TicketResponse,
} from '@prisma/client';
import {
  CreateTicketDto,
  InitiateTicketDto,
  VerifyTicketDto,
  CheckTicketStatusDto,
} from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateResponseDto } from './dto/create-response.dto';
import { InboundEmailDto, TicketAIAnalysis, AutonomousAction } from './dto/inbound-email.dto';
import { TicketAIAnalysisService } from './ticket-ai-analysis.service';
import { SupportAgentService } from './agent/support-agent.service';
import { SlaService } from './sla.service';
import { SupportQueuesService } from './support-queues.service';
import { randomBytes } from 'crypto';
import {
  generateTicketVerificationEmail,
  generateTicketCreatedEmail,
  generateTicketResponseEmail,
  generateTicketStatusChangeEmail,
  generateCriticalTicketAlertEmail,
  generateCSATFeedbackEmail,
} from '../email/templates/premium-email-templates';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  // Feature flag for LLM-driven agent (set to true to enable)
  private readonly useLLMAgent = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly emailService: EmailService,
    private readonly aiAnalysis: TicketAIAnalysisService,
    private readonly supportAgent: SupportAgentService,
    private readonly slaService: SlaService,
    private readonly queuesService: SupportQueuesService,
  ) {}

  // ==================== SCHEDULED: PROCESS UNPROCESSED TICKETS ====================

  /**
   * Scheduled job to catch any tickets that weren't processed by the agent
   * Runs every minute to ensure no tickets are missed
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processUnprocessedTickets(): Promise<void> {
    // In cluster mode, only run on the primary worker
    const instanceId = process.env.NODE_APP_INSTANCE || '0';
    if (instanceId !== '0') return;

    if (!this.useLLMAgent) return;

    try {
      // Find tickets that are OPEN and have no agent actions
      // Also check tickets created more than 30 seconds ago (to avoid race conditions)
      const thirtySecondsAgo = new Date(Date.now() - 30000);

      const unprocessedTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: TicketStatus.OPEN,
          createdAt: { lt: thirtySecondsAgo },
          agentActions: { none: {} },
        },
        take: 5, // Process max 5 at a time to avoid overload
        orderBy: { createdAt: 'asc' },
      });

      if (unprocessedTickets.length === 0) return;

      this.logger.log(
        `Found ${unprocessedTickets.length} unprocessed tickets, processing...`,
      );

      for (const ticket of unprocessedTickets) {
        try {
          this.logger.log(`Processing missed ticket ${ticket.caseId}`);
          const result = await this.supportAgent.processTicketEvent(
            ticket.id,
            'new_ticket',
          );
          this.logger.log(
            `Agent completed for missed ticket ${ticket.caseId}: ${result.actions.length} actions`,
          );
        } catch (error) {
          this.logger.error(
            `Agent error for missed ticket ${ticket.caseId}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in processUnprocessedTickets: ${error.message}`);
    }
  }

  // ==================== INBOUND EMAIL PROCESSING ====================

  /**
   * Process an inbound email reply and add it to the ticket timeline
   * Also triggers AI analysis for autonomous actions
   */
  async processInboundEmail(email: InboundEmailDto): Promise<{
    success: boolean;
    ticketId?: string;
    caseId?: string;
    analysis?: TicketAIAnalysis;
    suggestedActions?: AutonomousAction[];
    message: string;
  }> {
    this.logger.log(`Processing inbound email from ${email.from}, subject: ${email.subject}`);

    // Extract Case ID from subject line (format: [IR-YYYY-XX] or Re: [IR-YYYY-XX])
    const caseIdMatch = email.subject.match(/\[?(IR-\d{4}-\d{2,})\]?/i);

    if (!caseIdMatch) {
      this.logger.warn(`No case ID found in email subject: ${email.subject}`);
      return {
        success: false,
        message: 'No valid case ID found in email subject',
      };
    }

    const caseId = caseIdMatch[1].toUpperCase();

    // Find the ticket
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        caseId,
        email: email.from.toLowerCase(),
      },
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found for case ${caseId} from ${email.from}`);
      return {
        success: false,
        caseId,
        message: 'Ticket not found or email does not match ticket owner',
      };
    }

    // Check for duplicate email by messageId
    if (email.messageId) {
      const existing = await this.prisma.ticketResponse.findFirst({
        where: { emailMessageId: email.messageId },
      });
      if (existing) {
        this.logger.debug(`Skipping duplicate email: ${email.messageId}`);
        return {
          success: true,
          ticketId: ticket.id,
          caseId,
          message: 'Email already processed (duplicate)',
        };
      }
    }

    // Clean up the email content (remove quoted text from previous emails)
    const cleanedContent = this.cleanEmailContent(email.text);

    // Skip if content is empty after cleaning
    if (!cleanedContent.trim()) {
      this.logger.debug(`Skipping email with empty content after cleaning`);
      return {
        success: true,
        ticketId: ticket.id,
        caseId,
        message: 'Email skipped (no new content)',
      };
    }

    // Add the customer reply as a response
    const response = await this.prisma.ticketResponse.create({
      data: {
        ticketId: ticket.id,
        content: cleanedContent,
        isInternal: false,
        isAiGenerated: false,
        emailMessageId: email.messageId || null,
        // No responderId since this is from the customer
      },
    });

    // Update ticket status if it was waiting on customer
    if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER) {
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.OPEN },
      });
    }

    // Update last activity timestamp
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`Added customer reply to ticket ${caseId}`);

    // Run autonomous agent on the updated ticket
    let analysis: TicketAIAnalysis | undefined;
    let suggestedActions: AutonomousAction[] = [];

    try {
      if (this.useLLMAgent) {
        // Use new LLM-driven support agent
        this.logger.log(`Running LLM agent for ticket ${caseId}`);
        const agentResult = await this.supportAgent.processTicketEvent(ticket.id, 'customer_reply');

        if (agentResult.success) {
          this.logger.log(
            `Agent completed for ${caseId}: ${agentResult.actions.length} actions, ` +
            `${agentResult.pendingActions?.length || 0} pending`
          );
        } else {
          this.logger.error(`Agent failed for ${caseId}: ${agentResult.error}`);
        }

        // Update ticket metadata with last customer reply timestamp
        await this.prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            metadata: {
              ...(ticket.metadata as object || {}),
              lastCustomerReply: new Date().toISOString(),
              lastAgentResult: {
                success: agentResult.success,
                actionsCount: agentResult.actions.length,
                pendingCount: agentResult.pendingActions?.length || 0,
                summary: agentResult.summary?.substring(0, 200),
              },
            } as any,
          },
        });
      } else {
        // Fallback to legacy rule-based AI analysis
        analysis = await this.aiAnalysis.analyzeTicket(ticket.id);
        suggestedActions = await this.aiAnalysis.generateAutonomousActions(ticket.id, analysis);

        // Auto-execute high-confidence, safe actions
        for (const action of suggestedActions) {
          if (action.confidence >= 0.85 && action.type === 'UPDATE_STATUS') {
            this.logger.log(`Auto-executing ${action.type} for ${caseId}: ${action.description}`);
            await this.aiAnalysis.executeAction(ticket.id, action);
            action.approved = true;
            action.executedAt = new Date();
          }
        }

        // Store suggested actions in ticket metadata for admin review
        await this.prisma.supportTicket.update({
          where: { id: ticket.id },
          data: {
            metadata: {
              ...(ticket.metadata as object || {}),
              pendingActions: JSON.parse(JSON.stringify(suggestedActions.filter(a => !a.approved))),
              lastCustomerReply: new Date().toISOString(),
            } as any,
          },
        });
      }
    } catch (error) {
      this.logger.error(`AI processing failed for ticket ${caseId}: ${error.message}`);
    }

    // Notify admins of new customer reply
    await this.notifyAdminsOfCustomerReply(ticket, cleanedContent, analysis);

    return {
      success: true,
      ticketId: ticket.id,
      caseId,
      analysis,
      suggestedActions,
      message: 'Email processed successfully',
    };
  }

  /**
   * Clean up email content by removing quoted previous messages
   */
  private cleanEmailContent(text: string): string {
    if (!text) return '';

    // Remove common email quote patterns
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    const trimmedLine = (line: string) => line.trim();

    for (const line of lines) {
      const t = trimmedLine(line);

      // Stop at common quote indicators
      if (
        // Quote prefix
        t.startsWith('>') ||
        // Gmail-style: "On Mon, Dec 28, 2025 at 1:21 AM Name <email> wrote:"
        (t.match(/^On\s+\w{3},?\s+\w{3}\s+\d{1,2},?\s+\d{4}/i) && t.includes('wrote:')) ||
        // Alternative Gmail: "On Sun, Dec 28, 2025 at 1:21 AM IRIS <email> wrote:"
        (t.toLowerCase().startsWith('on ') && t.includes(' wrote:')) ||
        // Outlook-style
        (t.includes('From:') && t.includes('@')) ||
        t.includes('-----Original Message-----') ||
        t.includes('________________________________') ||
        t.match(/^-{3,}$/) ||
        t.includes('Sent from my') ||
        // Yahoo/other mail clients
        t.match(/^-+\s*Forwarded message\s*-+$/i) ||
        t.match(/^-+\s*Original Message\s*-+$/i)
      ) {
        break;
      }
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n').trim();
  }

  /**
   * Notify admins when a customer replies to a ticket
   */
  private async notifyAdminsOfCustomerReply(
    ticket: SupportTicket,
    content: string,
    analysis?: TicketAIAnalysis
  ): Promise<void> {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['rosa@iriseller.com'];
    const adminUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/admin?tab=support&ticket=${ticket.id}`;

    const urgencyLabel = analysis
      ? `Sentiment: ${analysis.sentiment.toUpperCase()} | Urgency: ${analysis.urgencyScore}/10`
      : 'Analysis pending';

    const escalationWarning = analysis?.shouldEscalate
      ? `\n\n⚠️ ESCALATION RECOMMENDED: ${analysis.escalationReason}`
      : '';

    const subject = analysis?.shouldEscalate
      ? `🚨 [ESCALATE] Customer Reply on ${ticket.caseId}: ${ticket.subject}`
      : `📩 Customer Reply on ${ticket.caseId}: ${ticket.subject}`;

    // Simple notification email (not using premium template for internal notifications)
    await this.emailService.sendPremiumEmail({
      to: adminEmails,
      subject,
      text: `New customer reply on support ticket ${ticket.caseId}

Customer: ${ticket.name || 'Unknown'} (${ticket.email})
Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}

AI Analysis: ${urgencyLabel}${escalationWarning}

Customer Message:
${content.substring(0, 500)}${content.length > 500 ? '...' : ''}

View ticket: ${adminUrl}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #006039;">New Customer Reply</h2>
          <p><strong>Ticket:</strong> ${ticket.caseId}</p>
          <p><strong>Customer:</strong> ${ticket.name || 'Unknown'} (${ticket.email})</p>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Priority:</strong> ${ticket.priority}</p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 8px;">
            <strong>AI Analysis:</strong> ${urgencyLabel}
          </p>
          ${analysis?.shouldEscalate ? `<p style="color: #dc2626; font-weight: bold;">⚠️ ESCALATION RECOMMENDED: ${analysis.escalationReason}</p>` : ''}
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${content.substring(0, 500)}${content.length > 500 ? '...' : ''}</p>
          </div>
          <a href="${adminUrl}" style="display: inline-block; background: #006039; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">View Ticket</a>
        </div>
      `,
    });
  }

  /**
   * Get pending autonomous actions for admin review
   */
  async getPendingActions(ticketId: string): Promise<AutonomousAction[]> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return (ticket.metadata as any)?.pendingActions || [];
  }

  /**
   * Approve and execute a pending autonomous action
   */
  async approveAction(ticketId: string, actionIndex: number): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const pendingActions = (ticket.metadata as any)?.pendingActions || [];
    const action = pendingActions[actionIndex];

    if (!action) {
      throw new BadRequestException('Action not found');
    }

    await this.aiAnalysis.executeAction(ticketId, action, 'admin');

    // Remove from pending actions
    pendingActions.splice(actionIndex, 1);
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...(ticket.metadata as object || {}),
          pendingActions,
        },
      },
    });
  }

  /**
   * Dismiss a pending autonomous action
   */
  async dismissAction(ticketId: string, actionIndex: number): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const pendingActions = (ticket.metadata as any)?.pendingActions || [];
    pendingActions.splice(actionIndex, 1);

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        metadata: {
          ...(ticket.metadata as object || {}),
          pendingActions,
        },
      },
    });
  }

  /**
   * Re-analyze a ticket and generate new suggestions (or run LLM agent)
   */
  async reanalyzeTicket(ticketId: string): Promise<{
    analysis: TicketAIAnalysis;
    suggestedActions: AutonomousAction[];
    agentResult?: { success: boolean; actions: any[]; summary?: string };
  }> {
    // Use LLM agent if enabled
    if (this.useLLMAgent) {
      this.logger.log(`Running LLM agent for ticket ${ticketId}`);
      const agentResult = await this.supportAgent.processTicketEvent(ticketId, 'new_ticket');
      this.logger.log(`Agent completed: ${agentResult.actions.length} actions`);

      // Return compatible format
      return {
        analysis: {
          sentiment: 'neutral',
          urgencyScore: 5,
          suggestedPriority: 'MEDIUM',
          shouldEscalate: false,
          shouldClose: false,
          keyIssues: [],
          suggestedActions: agentResult.actions.map(a => a.tool),
          requiresHumanReview: false,
          confidence: 0.9,
        },
        suggestedActions: [],
        agentResult,
      };
    }

    // Fallback to old analysis
    const analysis = await this.aiAnalysis.analyzeTicket(ticketId);
    const suggestedActions = await this.aiAnalysis.generateAutonomousActions(ticketId, analysis);

    // Store in metadata
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (ticket) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          metadata: {
            ...(ticket.metadata as object || {}),
            pendingActions: JSON.parse(JSON.stringify(suggestedActions)),
          } as any,
        },
      });
    }

    return { analysis, suggestedActions };
  }

  // ==================== CASE ID GENERATION ====================

  /**
   * Generate a unique case ID in format IR-YYYY-XX
   * Where YYYY is the current year and XX is a sequential number
   */
  private async generateCaseId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `IR-${year}-`;

    // Count existing tickets for this year
    const count = await this.prisma.supportTicket.count({
      where: {
        caseId: { startsWith: prefix }
      }
    });

    // Generate next sequence number (padded to 2 digits minimum)
    const seq = String(count + 1).padStart(2, '0');
    return `${prefix}${seq}`;
  }

  // ==================== PUBLIC: EMAIL VERIFICATION FLOW ====================

  /**
   * Step 1: Initiate ticket submission - sends verification email
   */
  async initiateTicketSubmission(dto: InitiateTicketDto): Promise<{ message: string }> {
    // Generate verification token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification record with form data
    await this.prisma.ticketVerification.create({
      data: {
        email: dto.email.toLowerCase(),
        token,
        formData: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          subject: dto.subject,
          description: dto.description,
          category: dto.category,
          deviceInfo: dto.deviceInfo,
        },
        expiresAt,
      },
    });

    // Send verification email using premium template
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support?token=${token}`;

    const verificationEmail = generateTicketVerificationEmail({
      userName: dto.name || 'there',
      userEmail: dto.email,
      subject: dto.subject,
      verifyUrl,
      expiresInHours: 24,
    });

    await this.emailService.sendPremiumEmail({
      to: dto.email,
      subject: verificationEmail.subject,
      html: verificationEmail.html,
      text: verificationEmail.text,
    });

    this.logger.log(`Verification email sent to ${dto.email}`);
    return { message: 'Verification email sent. Please check your inbox and click the link to submit your request.' };
  }

  /**
   * Step 2: Verify email and create the ticket
   */
  async verifyAndCreateTicket(dto: VerifyTicketDto): Promise<SupportTicket> {
    // Find verification record
    const verification = await this.prisma.ticketVerification.findUnique({
      where: { token: dto.token },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (verification.verified) {
      throw new BadRequestException('This verification link has already been used');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification link has expired. Please submit a new request.');
    }

    // Mark as verified
    await this.prisma.ticketVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    // Create the ticket
    const formData = verification.formData as any;
    const caseId = await this.generateCaseId();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        caseId,
        email: formData.email,
        name: formData.name,
        subject: formData.subject,
        description: formData.description,
        category: formData.category as TicketCategory,
        deviceInfo: formData.deviceInfo,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
      },
    });

    // Set SLA deadlines for the ticket
    await this.slaService.setSlaDeadlines(ticket.id);

    // Send confirmation email to user
    await this.sendTicketConfirmationEmail(ticket);

    // If CRITICAL priority (set by admin later) or security issue, alert admins
    if (formData.category === 'SECURITY') {
      await this.sendCriticalTicketAlert(ticket);
    }

    this.logger.log(`Ticket ${caseId} created for ${formData.email}`);

    // Run LLM agent on new ticket (async, don't wait)
    if (this.useLLMAgent) {
      this.supportAgent
        .processTicketEvent(ticket.id, 'new_ticket')
        .then((result) => {
          this.logger.log(
            `Agent completed for public ticket ${caseId}: ${result.actions.length} actions`,
          );
        })
        .catch((error) => {
          this.logger.error(
            `Agent error for public ticket ${caseId}: ${error.message}`,
          );
        });
    }

    return ticket;
  }

  // ==================== PUBLIC: CHECK TICKET STATUS ====================

  /**
   * Check ticket status by case ID and email (for verification)
   */
  async checkTicketStatus(dto: CheckTicketStatusDto): Promise<{
    ticket: SupportTicket;
    responses: TicketResponse[];
  }> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        caseId: dto.caseId.toUpperCase(),
        email: dto.email.toLowerCase(),
      },
      include: {
        responses: {
          where: { isInternal: false }, // Only show customer-visible responses
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found. Please check your case ID and email.');
    }

    return { ticket, responses: ticket.responses };
  }

  // ==================== USER: MY TICKETS (for logged-in users) ====================

  /**
   * Get tickets for a logged-in user
   */
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        responses: {
          where: { isInternal: false },
          orderBy: { createdAt: 'desc' },
          take: 1, // Just get the latest response
        },
      },
    });
  }

  /**
   * Get single ticket for a user
   */
  async getUserTicket(userId: string, ticketId: string): Promise<SupportTicket & { responses: TicketResponse[] }> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: {
        responses: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Create ticket for logged-in user (skips email verification)
   */
  async createTicketForUser(userId: string, dto: CreateTicketDto): Promise<SupportTicket> {
    const caseId = await this.generateCaseId();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        caseId,
        userId,
        email: dto.email,
        name: dto.name,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
        priority: dto.priority || TicketPriority.MEDIUM,
        deviceInfo: dto.deviceInfo,
        metadata: dto.metadata,
      },
    });

    // Set SLA deadlines for the ticket
    await this.slaService.setSlaDeadlines(ticket.id);

    // Send confirmation email
    await this.sendTicketConfirmationEmail(ticket);

    // Alert admins if security issue
    if (dto.category === TicketCategory.SECURITY) {
      await this.sendCriticalTicketAlert(ticket);
    }

    // Run LLM agent on new ticket
    if (this.useLLMAgent) {
      try {
        this.logger.log(`Running LLM agent for new ticket ${caseId}`);
        const agentResult = await this.supportAgent.processTicketEvent(ticket.id, 'new_ticket');
        this.logger.log(`Agent completed for ${caseId}: ${agentResult.actions.length} actions`);
      } catch (error) {
        this.logger.error(`Agent error for new ticket ${caseId}: ${error.message}`);
      }
    }

    return ticket;
  }

  // ==================== ADMIN: TICKET MANAGEMENT ====================

  /**
   * Get all tickets with filtering (admin only)
   */
  async getAllTickets(filters: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    assignedToId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: SupportTicket[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.search) {
      where.OR = [
        { caseId: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [
          { priority: 'desc' }, // CRITICAL first
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { responses: true },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get ticket details (admin)
   */
  async getTicketById(ticketId: string): Promise<SupportTicket & { responses: TicketResponse[] }> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          orderBy: { createdAt: 'asc' },
          include: {
            responder: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Update ticket (admin)
   */
  async updateTicket(ticketId: string, dto: UpdateTicketDto, adminId: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { ...dto };

    // Handle status change
    const isClosing = (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) &&
      ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED;

    if (isClosing) {
      updateData.resolvedAt = new Date();
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Send status update email if status changed
    if (dto.status && dto.status !== ticket.status) {
      await this.sendStatusUpdateEmail(updatedTicket);
    }

    // Send critical alert if priority changed to CRITICAL
    if (dto.priority === TicketPriority.CRITICAL && ticket.priority !== TicketPriority.CRITICAL) {
      await this.sendCriticalTicketAlert(updatedTicket);
    }

    // Send feedback request when ticket is resolved/closed
    if (isClosing) {
      // Send feedback request asynchronously (don't block the response)
      this.sendFeedbackRequest(ticketId).catch(err => {
        this.logger.error(`Failed to send feedback request for ${updatedTicket.caseId}: ${err.message}`);
      });
    }

    return updatedTicket;
  }

  /**
   * Add response to ticket (admin)
   */
  async addResponse(
    ticketId: string,
    dto: CreateResponseDto,
    responderId: string
  ): Promise<TicketResponse> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const response = await this.prisma.ticketResponse.create({
      data: {
        ticketId,
        content: dto.content,
        isInternal: dto.isInternal || false,
        responderId,
      },
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === TicketStatus.OPEN) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // Send email to customer if not an internal note
    if (!dto.isInternal) {
      await this.sendResponseEmail(ticket, dto.content);
    }

    // Check for @mention of AI agents in any response and trigger them
    // This works for both internal notes and public responses
    await this.processAIMentions(ticketId, dto.content, ticket, response.id);

    return response;
  }

  /**
   * Process @mentions of AI agents in ticket responses
   * When someone writes "@NOVA" or "@AgentName", trigger that agent to process the ticket
   */
  private async processAIMentions(
    ticketId: string,
    content: string,
    ticket: SupportTicket,
    responseId?: string,
  ): Promise<void> {
    // Extract @mentions from the content (e.g., @NOVA, @Agent-Name)
    const mentionPattern = /@([A-Za-z][A-Za-z0-9_-]*)/g;
    const mentions = [...content.matchAll(mentionPattern)].map(m => m[1]);

    if (mentions.length === 0) {
      return;
    }

    this.logger.log(`Found @mentions in ticket ${ticket.caseId}: ${mentions.join(', ')}`);

    // Find AI agents matching the mentioned names (case-insensitive)
    for (const mention of mentions) {
      const agent = await this.prisma.supportAIAgent.findFirst({
        where: {
          name: { equals: mention, mode: 'insensitive' },
          status: 'ACTIVE',
          isOnline: true,
        },
      });

      if (agent) {
        this.logger.log(`Triggering AI agent "${agent.name}" for ticket ${ticket.caseId} (mentioned as @${mention})`);

        // Add visible acknowledgment that the agent is being triggered
        await this.prisma.ticketResponse.create({
          data: {
            ticketId,
            content: `🤖 **${agent.name}** is analyzing this ticket...`,
            isInternal: true,
            isAiGenerated: true,
            aiAgentId: agent.id,
          },
        });

        // Trigger the agent asynchronously
        this.processTicketWithAgent(ticketId, {
          id: agent.id,
          name: agent.name,
          specialization: agent.specialization,
          systemPrompt: agent.systemPrompt,
          autoReply: agent.autoReply,
        }).catch(error => {
          this.logger.error(`AI agent ${agent.name} processing failed for ticket ${ticket.caseId}: ${error.message}`);
          // Add error note so support team knows something went wrong
          this.prisma.ticketResponse.create({
            data: {
              ticketId,
              content: `⚠️ **${agent.name}** encountered an error while processing: ${error.message}`,
              isInternal: true,
              isAiGenerated: true,
              aiAgentId: agent.id,
            },
          }).catch(e => this.logger.error(`Failed to add error note: ${e.message}`));
        });

        // Only trigger the first matching agent to avoid duplicate processing
        break;
      } else {
        this.logger.debug(`No active AI agent found for mention @${mention}`);
      }
    }
  }

  // ==================== AI: DRAFT GENERATION ====================

  /**
   * Generate AI draft response for a ticket
   */
  async generateAiDraft(ticketId: string): Promise<string> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Build conversation context
    const conversationHistory = ticket.responses
      .map(r => `[${r.isInternal ? 'Internal Note' : 'Response'}]: ${r.content}`)
      .join('\n\n');

    const prompt = `You are a customer support agent for IRIS, an AI-powered CRM application for sales teams.

Generate a professional, helpful response to this support ticket:

Case ID: ${ticket.caseId}
Category: ${ticket.category.replace('_', ' ')}
Subject: ${ticket.subject}
Customer Name: ${ticket.name || 'Customer'}
Description: ${ticket.description}

${conversationHistory ? `Previous Responses:\n${conversationHistory}\n` : ''}

IMPORTANT FORMATTING RULES:
- Write in clean, flowing prose - NOT as a formatted document with headers
- Do NOT include "IRIS CRM Support Response" header or Case ID at the start
- Do NOT use horizontal rules (---) or section dividers
- Use simple paragraphs separated by line breaks
- Only use **bold** sparingly for emphasis on key actions (not for headers)
- Use bullet points only when listing 3+ items that are better as a list
- Keep the tone warm, professional, and conversational
- Address the customer by their first name naturally in the greeting
- End with a brief, genuine sign-off (not a formal signature block)

CONTENT GUIDELINES:
- Be empathetic and acknowledge their specific issue
- Provide clear next steps or solutions
- If you need more information, ask specific questions
- Keep response concise (2-3 short paragraphs)
- Do not make up features or capabilities

Example tone:
"Hi [Name], thank you for reaching out! I understand you're experiencing [issue]. Let me help you with that..."

Generate the response:`;

    try {
      const draft = await this.anthropic.generateFastCompletion({
        messages: [
          { role: 'system', content: 'You are a helpful customer support agent for IRIS CRM.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 1024,
        temperature: 0.7,
      });

      // Save the draft to the ticket
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { aiDraftResponse: draft },
      });

      return draft;
    } catch (error) {
      this.logger.error(`Failed to generate AI draft: ${error.message}`);
      throw new BadRequestException('Failed to generate AI draft response');
    }
  }

  // ==================== ADMIN: STATISTICS ====================

  /**
   * Get support ticket statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    avgResponseTime: number | null;
    openTickets: number;
    resolvedThisWeek: number;
  }> {
    const [
      total,
      statusCounts,
      categoryCounts,
      priorityCounts,
      openTickets,
      resolvedThisWeek,
    ] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),
      this.prisma.supportTicket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Convert group by results to records
    const byStatus: Record<string, number> = {};
    statusCounts.forEach(s => { byStatus[s.status] = s._count.status; });

    const byCategory: Record<string, number> = {};
    categoryCounts.forEach(c => { byCategory[c.category] = c._count.category; });

    const byPriority: Record<string, number> = {};
    priorityCounts.forEach(p => { byPriority[p.priority] = p._count.priority; });

    return {
      total,
      byStatus,
      byCategory,
      byPriority,
      avgResponseTime: null, // TODO: Calculate average response time
      openTickets,
      resolvedThisWeek,
    };
  }

  // ==================== EMAIL HELPERS (Using Premium Templates) ====================

  private async sendTicketConfirmationEmail(ticket: SupportTicket): Promise<void> {
    const statusUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support?caseId=${ticket.caseId}`;

    const email = generateTicketCreatedEmail({
      userName: ticket.name || 'there',
      caseId: ticket.caseId,
      subject: ticket.subject,
      category: ticket.category,
      statusUrl,
    });

    await this.emailService.sendPremiumEmail({
      to: ticket.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  private async sendStatusUpdateEmail(ticket: SupportTicket): Promise<void> {
    const statusUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support?caseId=${ticket.caseId}`;

    const email = generateTicketStatusChangeEmail({
      userName: ticket.name || 'there',
      caseId: ticket.caseId,
      subject: ticket.subject,
      newStatus: ticket.status,
      statusUrl,
    });

    await this.emailService.sendPremiumEmail({
      to: ticket.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  private async sendResponseEmail(ticket: SupportTicket, responseContent: string): Promise<void> {
    const statusUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support?caseId=${ticket.caseId}`;

    const email = generateTicketResponseEmail({
      userName: ticket.name || 'there',
      caseId: ticket.caseId,
      subject: ticket.subject,
      responseContent,
      statusUrl,
    });

    await this.emailService.sendPremiumEmail({
      to: ticket.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }

  private async sendCriticalTicketAlert(ticket: SupportTicket): Promise<void> {
    // Get admin emails from system settings or env
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['rosa@iriseller.com'];
    const adminUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/admin?tab=support&ticket=${ticket.id}`;

    const email = generateCriticalTicketAlertEmail({
      caseId: ticket.caseId,
      subject: ticket.subject,
      category: ticket.category,
      description: ticket.description,
      submitterEmail: ticket.email,
      submitterName: ticket.name || undefined,
      adminUrl,
    });

    await this.emailService.sendPremiumEmail({
      to: adminEmails,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    this.logger.warn(`Critical ticket alert sent for ${ticket.caseId}`);
  }

  // ==================== CSAT FEEDBACK ====================

  /**
   * Generate a personalized feedback email using LLM based on ticket context
   */
  private async generatePersonalizedFeedbackMessage(ticket: SupportTicket & { responses?: TicketResponse[] }): Promise<string> {
    try {
      // Build context from ticket history
      const responseCount = ticket.responses?.length || 0;
      const issueType = ticket.category.replace(/_/g, ' ').toLowerCase();
      const resolutionTime = ticket.resolvedAt && ticket.createdAt
        ? Math.ceil((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const prompt = `You are writing a brief, warm follow-up message for a customer who just had their support ticket resolved.

Ticket context:
- Customer name: ${ticket.name || 'Customer'}
- Issue type: ${issueType}
- Subject: ${ticket.subject}
- Description preview: ${ticket.description.substring(0, 200)}...
- Number of exchanges: ${responseCount}
- Resolution time: ${resolutionTime ? `${resolutionTime} day(s)` : 'Same day'}

Write a personalized, 2-3 sentence message that:
1. Acknowledges the specific issue they had (be specific, reference what they were dealing with)
2. Expresses genuine appreciation for their patience
3. Invites them to share feedback naturally

DO NOT:
- Use generic phrases like "We hope your issue was resolved"
- Be overly formal or robotic
- Use exclamation marks excessively
- Mention star ratings or the feedback form explicitly

Example tone: "Thank you for reaching out about the Salesforce sync issue you were experiencing. We appreciate your patience while our team worked through the configuration details. We'd love to hear how the support experience went for you."

Write the message:`;

      const message = await this.anthropic.generateFastCompletion({
        messages: [
          { role: 'system', content: 'You write brief, warm customer follow-up messages. Be personal and specific, not generic.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 256,
        temperature: 0.7,
      });

      return message.trim();
    } catch (error) {
      this.logger.error(`Failed to generate personalized feedback message: ${error.message}`);
      // Fallback to a generic but still decent message
      return `Thank you for reaching out to IRIS Support about "${ticket.subject}". We hope we were able to help resolve your concern. We'd love to hear about your experience working with our team.`;
    }
  }

  /**
   * Send a feedback request email after ticket resolution
   */
  async sendFeedbackRequest(ticketId: string): Promise<{ success: boolean; token?: string }> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
        assignedTo: {
          select: { name: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Don't send feedback request if already sent
    if (ticket.feedbackSentAt) {
      this.logger.log(`Feedback already sent for ticket ${ticket.caseId}`);
      return { success: false };
    }

    // Don't send if CSAT already submitted
    if (ticket.csatRating) {
      this.logger.log(`CSAT already submitted for ticket ${ticket.caseId}`);
      return { success: false };
    }

    // Generate unique feedback token
    const feedbackToken = randomBytes(32).toString('hex');

    // Update ticket with feedback token
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        feedbackToken,
        feedbackSentAt: new Date(),
      },
    });

    // Generate personalized message using LLM
    const personalizedMessage = await this.generatePersonalizedFeedbackMessage(ticket);

    // Build feedback URL
    const feedbackUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/feedback?token=${feedbackToken}`;

    // Generate and send email
    const email = generateCSATFeedbackEmail({
      userName: ticket.name || ticket.email.split('@')[0],
      caseId: ticket.caseId,
      subject: ticket.subject,
      personalizedMessage,
      feedbackUrl,
      agentName: ticket.assignedTo?.name || undefined,
    });

    await this.emailService.sendPremiumEmail({
      to: ticket.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    this.logger.log(`Feedback request sent for ticket ${ticket.caseId}`);
    return { success: true, token: feedbackToken };
  }

  /**
   * Submit CSAT feedback for a ticket
   */
  async submitFeedback(token: string, rating: number, feedback?: string): Promise<{ success: boolean; caseId?: string }> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Find ticket by feedback token
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { feedbackToken: token },
    });

    if (!ticket) {
      throw new BadRequestException('Invalid or expired feedback token');
    }

    // Check if feedback already submitted
    if (ticket.csatRating) {
      throw new BadRequestException('Feedback has already been submitted for this ticket');
    }

    // Save CSAT data
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        csatRating: rating,
        csatFeedback: feedback || null,
        csatSubmittedAt: new Date(),
      },
    });

    this.logger.log(`CSAT feedback submitted for ticket ${ticket.caseId}: ${rating}/5`);

    // If rating is low (1-2), notify admins
    if (rating <= 2) {
      await this.notifyAdminsOfLowCSAT(ticket, rating, feedback);
    }

    return { success: true, caseId: ticket.caseId };
  }

  /**
   * Get ticket by feedback token (for feedback page)
   */
  async getTicketByFeedbackToken(token: string): Promise<{
    caseId: string;
    subject: string;
    customerName: string;
    resolvedAt?: Date;
    alreadySubmitted: boolean;
  }> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { feedbackToken: token },
    });

    if (!ticket) {
      throw new NotFoundException('Invalid feedback token');
    }

    return {
      caseId: ticket.caseId,
      subject: ticket.subject,
      customerName: ticket.name || ticket.email.split('@')[0],
      resolvedAt: ticket.resolvedAt || undefined,
      alreadySubmitted: !!ticket.csatRating,
    };
  }

  /**
   * Notify admins when a low CSAT rating is submitted
   */
  private async notifyAdminsOfLowCSAT(ticket: SupportTicket, rating: number, feedback?: string): Promise<void> {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['rosa@iriseller.com'];
    const adminUrl = `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/admin?tab=support&ticket=${ticket.id}`;

    await this.emailService.sendPremiumEmail({
      to: adminEmails,
      subject: `⚠️ Low CSAT Rating: ${ticket.caseId} (${rating}/5)`,
      text: `Low customer satisfaction rating received

Case ID: ${ticket.caseId}
Customer: ${ticket.name || 'Unknown'} (${ticket.email})
Subject: ${ticket.subject}
Rating: ${rating}/5 stars

${feedback ? `Customer Feedback:\n${feedback}` : 'No additional feedback provided.'}

Review ticket: ${adminUrl}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #dc2626;">Low CSAT Rating Alert</h2>
          <p><strong>Case ID:</strong> ${ticket.caseId}</p>
          <p><strong>Customer:</strong> ${ticket.name || 'Unknown'} (${ticket.email})</p>
          <p><strong>Subject:</strong> ${ticket.subject}</p>
          <p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</p>
          ${feedback ? `<div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0; font-weight: bold;">Customer Feedback:</p>
            <p style="margin: 8px 0 0 0;">${feedback}</p>
          </div>` : '<p style="color: #6b7280; font-style: italic;">No additional feedback provided.</p>'}
          <a href="${adminUrl}" style="display: inline-block; background: #006039; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Review Ticket</a>
        </div>
      `,
    });

    this.logger.warn(`Low CSAT alert sent for ticket ${ticket.caseId}: ${rating}/5`);
  }

  /**
   * Get CSAT statistics for admin dashboard
   */
  async getCSATStats(): Promise<{
    totalResponses: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    responseRate: number;
    recentFeedback: Array<{
      caseId: string;
      rating: number;
      feedback?: string;
      submittedAt: Date;
    }>;
  }> {
    // Get all tickets with CSAT data
    const ticketsWithCSAT = await this.prisma.supportTicket.findMany({
      where: { csatRating: { not: null } },
      select: {
        caseId: true,
        csatRating: true,
        csatFeedback: true,
        csatSubmittedAt: true,
      },
      orderBy: { csatSubmittedAt: 'desc' },
    });

    // Get total closed tickets that had feedback sent
    const totalFeedbackSent = await this.prisma.supportTicket.count({
      where: { feedbackSentAt: { not: null } },
    });

    // Calculate metrics
    const totalResponses = ticketsWithCSAT.length;
    const averageRating = totalResponses > 0
      ? ticketsWithCSAT.reduce((sum, t) => sum + (t.csatRating || 0), 0) / totalResponses
      : 0;

    // Rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ticketsWithCSAT.forEach(t => {
      if (t.csatRating) {
        ratingDistribution[t.csatRating] = (ratingDistribution[t.csatRating] || 0) + 1;
      }
    });

    // Response rate
    const responseRate = totalFeedbackSent > 0
      ? (totalResponses / totalFeedbackSent) * 100
      : 0;

    // Recent feedback (last 10)
    const recentFeedback = ticketsWithCSAT.slice(0, 10).map(t => ({
      caseId: t.caseId,
      rating: t.csatRating!,
      feedback: t.csatFeedback || undefined,
      submittedAt: t.csatSubmittedAt!,
    }));

    return {
      totalResponses,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      responseRate: Math.round(responseRate * 10) / 10,
      recentFeedback,
    };
  }

  // ==================== AI AGENT ASSIGNMENT ====================

  /**
   * Assign a ticket to an AI agent and trigger autonomous processing
   */
  async assignToAIAgent(ticketId: string, agentId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found`);
    }

    const agent = await this.prisma.supportAIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`AI Agent with ID "${agentId}" not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        aiAgentId: agentId,
        status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
      },
      include: {
        aiAgent: true,
        queue: true,
      },
    });

    this.logger.log(`Assigned ticket ${ticket.caseId} to AI agent ${agent.name}`);

    // Trigger autonomous AI processing in the background
    // Don't await - let it run asynchronously so the API returns quickly
    this.processTicketWithAgent(ticketId, agent).catch(error => {
      this.logger.error(`AI agent processing failed for ticket ${ticket.caseId}: ${error.message}`);
    });

    return updated;
  }

  /**
   * Process a ticket with the assigned AI agent
   * This runs autonomously and executes safe actions automatically
   */
  private async processTicketWithAgent(ticketId: string, agent: {
    id: string;
    name: string;
    specialization: string;
    systemPrompt: string | null;
    autoReply: boolean;
  }) {
    if (!agent.autoReply) {
      this.logger.log(`AI agent ${agent.name} has autoReply disabled, skipping processing`);
      return;
    }

    this.logger.log(`Starting autonomous processing for ticket ${ticketId} with agent ${agent.name} (${agent.specialization})`);

    try {
      // Process the ticket event with the support agent service
      const result = await this.supportAgent.processTicketEvent(
        ticketId,
        'manual_trigger', // or could add new event type 'agent_assigned'
        {
          agentId: agent.id,
          agentName: agent.name,
          specialization: agent.specialization,
          customSystemPrompt: agent.systemPrompt,
        },
      );

      if (result.success) {
        this.logger.log(
          `AI agent ${agent.name} completed processing ticket ${ticketId}: ` +
          `${result.actions.length} actions executed, ${result.pendingActions?.length || 0} pending approval`,
        );
      } else {
        this.logger.warn(`AI agent processing returned unsuccessful for ticket ${ticketId}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`AI agent processing error for ticket ${ticketId}: ${error.message}`);
    }
  }

  /**
   * Route a ticket to the appropriate queue and assign an AI agent
   */
  async routeTicketToQueue(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found`);
    }

    // Find the best queue for this ticket
    const queueId = await this.queuesService.routeTicket({
      category: ticket.category,
      priority: ticket.priority,
      subject: ticket.subject,
      description: ticket.description,
    });

    if (!queueId) {
      this.logger.warn(`No queue found for ticket ${ticket.caseId}`);
      return { success: false, message: 'No matching queue found' };
    }

    // Find the best available agent in that queue
    const agentId = await this.queuesService.getBestAgent(queueId);

    // Update the ticket
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        queueId,
        aiAgentId: agentId,
        status: ticket.status === 'OPEN' && agentId ? 'IN_PROGRESS' : ticket.status,
      },
      include: {
        aiAgent: true,
        queue: true,
      },
    });

    this.logger.log(
      `Routed ticket ${ticket.caseId} to queue ${queueId}${agentId ? ` and assigned to agent ${agentId}` : ''}`
    );

    return {
      success: true,
      ticket: updated,
      queueId,
      agentId,
    };
  }
}
