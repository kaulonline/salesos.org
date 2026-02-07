import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EmailTrackingService, SendTrackedEmailParams, InboundEmailParams } from './email-tracking.service';
import { ImapPollingService } from './imap-polling.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';
import { EmailThreadStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

// ==================== DTOs ====================

class SendTrackedEmailDto {
  @IsString()
  to: string | string[];

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsArray()
  cc?: string[];

  @IsOptional()
  @IsArray()
  bcc?: string[];
}

class InboundEmailWebhookDto {
  @IsString()
  messageId: string;

  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  references?: string[];

  @IsString()
  fromEmail: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsArray()
  @IsString({ each: true })
  toEmails: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ccEmails?: string[];

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}


class GetThreadsQueryDto {
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  status?: EmailThreadStatus;
}

// ==================== CONTROLLER ====================

@Controller('email-tracking')
export class EmailTrackingController {
  private readonly logger = new Logger(EmailTrackingController.name);

  constructor(
    private readonly emailTrackingService: EmailTrackingService,
    private readonly imapPollingService: ImapPollingService,
    private readonly prisma: PrismaService,
  ) { }

  // ==================== SEND EMAIL ====================

  /**
   * Send a tracked email to a lead/contact
   */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendTrackedEmail(
    @Body() dto: SendTrackedEmailDto,
    @Req() req: any,
  ) {
    this.logger.log(`Send email request: ${JSON.stringify(dto)}`);
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`User ID: ${userId}`);

    const result = await this.emailTrackingService.sendTrackedEmail(dto, userId);

    return {
      success: result.sent,
      threadId: result.thread.id,
      messageId: result.message.id,
      message: result.sent
        ? 'Email sent and tracking started'
        : 'Email queued but sending failed',
    };
  }

  // ==================== WEBHOOKS ====================

  /**
   * Webhook endpoint for inbound email processing
   * This can be called by email providers (SendGrid, Mailgun, etc.) or IMAP polling service
   */
  @Post('webhook/inbound')
  @HttpCode(HttpStatus.OK)
  async processInboundWebhook(
    @Body() dto: InboundEmailWebhookDto,
    @Query('api_key') apiKey?: string,
  ) {
    // Validate webhook API key
    const expectedKey = process.env.EMAIL_WEBHOOK_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      this.logger.warn('Invalid webhook API key');
      return { success: false, error: 'Unauthorized' };
    }

    this.logger.log(`Received inbound email webhook from: ${dto.fromEmail}`);

    try {
      const result = await this.emailTrackingService.processInboundEmail({
        messageId: dto.messageId,
        inReplyTo: dto.inReplyTo,
        references: dto.references,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName,
        toEmails: dto.toEmails,
        ccEmails: dto.ccEmails,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
      });

      return {
        success: true,
        threadId: result.thread.id,
        messageId: result.message.id,
        intent: result.analysis.intent,
        sentiment: result.analysis.sentiment,
        actionsPerformed: result.crmActionsPerformed.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process inbound email: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Webhook for email delivery status updates (opened, clicked, bounced)
   */
  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  async processStatusWebhook(
    @Body() body: {
      messageId: string;
      event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
      timestamp?: string;
    },
    @Query('api_key') apiKey?: string,
  ) {
    // Validate webhook API key
    const expectedKey = process.env.EMAIL_WEBHOOK_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      this.logger.warn('Invalid webhook API key');
      return { success: false, error: 'Unauthorized' };
    }

    this.logger.log(`Received status webhook: ${body.event} for ${body.messageId}`);

    try {
      const timestamp = body.timestamp ? new Date(body.timestamp) : undefined;
      const result = await this.emailTrackingService.updateEmailStatus(
        body.messageId,
        body.event,
        timestamp,
      );

      return {
        success: result.success,
        message: result.message,
        event: body.event,
        messageId: body.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to process status webhook: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ==================== THREAD MANAGEMENT ====================

  /**
   * Get all email threads for the current user
   */
  @Get('threads')
  @UseGuards(JwtAuthGuard)
  async getThreads(
    @Req() req: any,
    @Query() query: GetThreadsQueryDto,
  ) {
    const userId = req.user?.userId || req.user?.id;

    const threads = await this.emailTrackingService.getThreads(userId, {
      leadId: query.leadId,
      accountId: query.accountId,
      contactId: query.contactId,
      opportunityId: query.opportunityId,
      status: query.status,
    });

    return {
      success: true,
      count: threads.length,
      threads,
    };
  }

  /**
   * Get a specific thread with all messages
   */
  @Get('threads/:id')
  @UseGuards(JwtAuthGuard)
  async getThread(
    @Param('id') threadId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;

    const thread = await this.emailTrackingService.getThread(threadId, userId);

    return {
      success: true,
      thread,
    };
  }

  /**
   * Get threads awaiting response
   */
  @Get('awaiting-response')
  @UseGuards(JwtAuthGuard)
  async getAwaitingResponse(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;

    const threads = await this.emailTrackingService.getThreadsAwaitingResponse(userId);

    return {
      success: true,
      count: threads.length,
      threads,
    };
  }

  // ==================== IMAP POLLING ====================

  /**
   * Get IMAP polling status
   */
  @Get('imap/status')
  @UseGuards(JwtAuthGuard)
  async getImapStatus() {
    const status = this.imapPollingService.getStatus();

    return {
      success: true,
      ...status,
    };
  }

  /**
   * Force an immediate IMAP poll for new emails
   */
  @Post('imap/poll')
  @UseGuards(JwtAuthGuard)
  async forceImapPoll() {
    this.logger.log('Manual IMAP poll requested');

    const result = await this.imapPollingService.forcePoll();

    return result;
  }

  // ==================== DRAFT MANAGEMENT ====================

  /**
   * List all pending drafts
   */
  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  async listDrafts(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const drafts = await this.prisma.emailDraft.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(!status && { status: 'PENDING_REVIEW' }),
      },
      include: {
        thread: {
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        inReplyToMessage: {
          select: { id: true, subject: true, fromEmail: true, sentAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });

    return {
      success: true,
      count: drafts.length,
      drafts: drafts.map(draft => ({
        id: draft.id,
        threadId: draft.threadId,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        bodyText: draft.bodyText,
        toEmails: draft.toEmails,
        status: draft.status,
        confidence: draft.confidence,
        createdAt: draft.createdAt,
        reviewedAt: draft.reviewedAt,
        lead: draft.thread.lead,
        contact: draft.thread.contact,
        inReplyTo: draft.inReplyToMessage,
      })),
    };
  }

  /**
   * Get a specific draft
   */
  @Get('drafts/:draftId')
  @UseGuards(JwtAuthGuard)
  async getDraft(@Param('draftId') draftId: string) {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: {
        thread: {
          include: {
            lead: true,
            contact: true,
            account: true,
          },
        },
        inReplyToMessage: true,
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    return {
      success: true,
      draft: {
        id: draft.id,
        threadId: draft.threadId,
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        bodyText: draft.bodyText,
        toEmails: draft.toEmails,
        status: draft.status,
        confidence: draft.confidence,
        createdAt: draft.createdAt,
        reviewedAt: draft.reviewedAt,
        thread: draft.thread,
        inReplyToMessage: draft.inReplyToMessage,
        // CRM actions performed based on the inbound email analysis
        actionsPerformed: draft.inReplyToMessage?.crmActionsPerformed || [],
      },
    };
  }


  /**
   * Update a draft (edit before sending)
   */
  @Patch('drafts/:draftId')
  @UseGuards(JwtAuthGuard)
  async updateDraft(
    @Param('draftId') draftId: string,
    @Body() updateData: {
      subject?: string;
      bodyHtml?: string;
      bodyText?: string;
      toEmails?: string[];
    },
  ) {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    if (draft.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(`Draft ${draftId} is not pending review (status: ${draft.status})`);
    }

    // Build update data - only include fields that exist in schema
    const updateFields: any = {
      reviewedAt: new Date(),
    };
    if (updateData.subject) updateFields.subject = updateData.subject;
    if (updateData.bodyHtml) {
      updateFields.bodyHtml = updateData.bodyHtml;
      updateFields.editedContent = updateData.bodyHtml;
    }
    if (updateData.bodyText) updateFields.bodyText = updateData.bodyText;
    if (updateData.toEmails) updateFields.toEmails = updateData.toEmails;

    const updatedDraft = await this.prisma.emailDraft.update({
      where: { id: draftId },
      data: updateFields,
    });

    return {
      success: true,
      message: 'Draft updated successfully',
      draft: updatedDraft,
    };
  }

  /**
   * Send a draft
   */
  @Post('drafts/:draftId/send')
  @UseGuards(JwtAuthGuard)
  async sendDraft(@Param('draftId') draftId: string) {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: {
        thread: true,
        inReplyToMessage: true,
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    if (draft.status === 'SENT') {
      throw new BadRequestException(`Draft ${draftId} has already been sent`);
    }

    if (draft.status === 'REJECTED') {
      throw new BadRequestException(`Draft ${draftId} has been rejected`);
    }

    // Send the email
    const result = await this.emailTrackingService.sendDraftEmail(draftId);

    return result;
  }

  /**
   * Discard/reject a draft
   */
  @Delete('drafts/:draftId')
  @UseGuards(JwtAuthGuard)
  async discardDraft(@Param('draftId') draftId: string) {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    if (draft.status === 'SENT') {
      throw new BadRequestException(`Cannot discard a sent draft`);
    }

    await this.prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Draft discarded successfully',
    };
  }
}
