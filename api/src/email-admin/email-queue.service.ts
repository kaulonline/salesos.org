import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { ApplicationLogService, LogCategory, TransactionStatus } from '../admin/application-log.service';
import { EmailQueueStatus, Prisma } from '@prisma/client';
import { EmailTemplatesService } from './email-templates.service';
import { EmailQueueQueryDto, SendEmailDto, SendTemplateEmailDto } from './dto';

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  totalToday: number;
}

@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);
  private isProcessing = false;

  // Configuration
  private readonly MAX_CONCURRENT = 5;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [60000, 300000, 900000]; // 1min, 5min, 15min

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly templatesService: EmailTemplatesService,
    private readonly applicationLogService: ApplicationLogService,
  ) {}

  async onModuleInit() {
    this.logger.log('Email Queue Service initialized');
    // Reset any stuck "PROCESSING" items on startup
    await this.resetStuckItems();
  }

  // ============================================
  // QUEUE OPERATIONS
  // ============================================

  async enqueue(dto: SendEmailDto, userId?: string, source: string = 'api') {
    const item = await this.prisma.emailQueueItem.create({
      data: {
        toEmail: dto.to,
        toName: dto.toName,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText || '',
        ccEmails: dto.cc || [],
        bccEmails: dto.bcc || [],
        replyTo: dto.replyTo,
        priority: dto.priority || 0,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        userId,
        leadId: dto.leadId,
        contactId: dto.contactId,
        accountId: dto.accountId,
        opportunityId: dto.opportunityId,
        source,
        status: 'PENDING',
      },
    });

    this.logger.debug(`Email queued: ${item.id} to ${dto.to}`);
    return item;
  }

  async enqueueFromTemplate(dto: SendTemplateEmailDto, userId?: string, source: string = 'template') {
    const template = await this.templatesService.getTemplate(dto.templateId);

    // Render template with variables
    const rendered = this.templatesService.renderTemplate(
      {
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText || undefined,
      },
      dto.variables || {},
    );

    const item = await this.prisma.emailQueueItem.create({
      data: {
        templateId: dto.templateId,
        toEmail: dto.to,
        toName: dto.toName,
        subject: rendered.subject,
        bodyHtml: rendered.bodyHtml,
        bodyText: rendered.bodyText,
        ccEmails: dto.cc || [],
        bccEmails: dto.bcc || [],
        priority: dto.priority || 0,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        userId,
        leadId: dto.leadId,
        contactId: dto.contactId,
        accountId: dto.accountId,
        opportunityId: dto.opportunityId,
        source,
        status: 'PENDING',
      },
    });

    this.logger.debug(`Template email queued: ${item.id} using template ${template.name}`);
    return item;
  }

  async enqueueBulk(
    templateId: string,
    recipients: Array<{ email: string; name?: string; variables?: Record<string, string> }>,
    campaignId?: string,
    userId?: string,
  ) {
    const template = await this.templatesService.getTemplate(templateId);
    const items: any[] = [];

    for (const recipient of recipients) {
      const rendered = this.templatesService.renderTemplate(
        {
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText || undefined,
        },
        recipient.variables || {},
      );

      items.push({
        templateId,
        campaignId,
        toEmail: recipient.email,
        toName: recipient.name,
        subject: rendered.subject,
        bodyHtml: rendered.bodyHtml,
        bodyText: rendered.bodyText,
        userId,
        source: campaignId ? 'campaign' : 'bulk',
        status: 'PENDING',
      });
    }

    const result = await this.prisma.emailQueueItem.createMany({
      data: items,
    });

    this.logger.log(`Bulk emails queued: ${result.count} emails`);
    return { count: result.count };
  }

  async getQueueItem(id: string) {
    const item = await this.prisma.emailQueueItem.findUnique({
      where: { id },
      include: {
        template: {
          select: { id: true, name: true, slug: true },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Queue item with ID ${id} not found`);
    }

    return item;
  }

  async getQueue(query: EmailQueueQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EmailQueueItemWhereInput = {};

    if (query.status) {
      where.status = query.status as EmailQueueStatus;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.search) {
      where.OR = [
        { toEmail: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.emailQueueItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          toEmail: true,
          toName: true,
          subject: true,
          status: true,
          priority: true,
          source: true,
          attempts: true,
          maxAttempts: true,
          scheduledFor: true,
          sentAt: true,
          errorMessage: true,
          createdAt: true,
          template: {
            select: { id: true, name: true },
          },
          campaign: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.emailQueueItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async cancelQueueItem(id: string) {
    const item = await this.prisma.emailQueueItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Queue item with ID ${id} not found`);
    }

    if (item.status !== 'PENDING') {
      throw new Error(`Cannot cancel item with status ${item.status}`);
    }

    return this.prisma.emailQueueItem.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async retryQueueItem(id: string) {
    const item = await this.prisma.emailQueueItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Queue item with ID ${id} not found`);
    }

    if (item.status !== 'FAILED') {
      throw new Error(`Can only retry failed items`);
    }

    return this.prisma.emailQueueItem.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        errorMessage: null,
        errorCode: null,
        nextRetryAt: null,
      },
    });
  }

  async getStats(): Promise<QueueStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, processing, sent, failed, totalToday] = await Promise.all([
      this.prisma.emailQueueItem.count({ where: { status: 'PENDING' } }),
      this.prisma.emailQueueItem.count({ where: { status: 'PROCESSING' } }),
      this.prisma.emailQueueItem.count({ where: { status: 'SENT' } }),
      this.prisma.emailQueueItem.count({ where: { status: 'FAILED' } }),
      this.prisma.emailQueueItem.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return { pending, processing, sent, failed, totalToday };
  }

  // ============================================
  // QUEUE PROCESSING
  // ============================================

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending items that are ready to send
      const items = await this.prisma.emailQueueItem.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date() } },
          ],
        },
        take: this.MAX_CONCURRENT,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (items.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${items.length} queued emails`);

      // Process items in parallel
      await Promise.all(items.map(item => this.processItem(item)));
    } catch (error) {
      this.logger.error(`Queue processing error: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: any) {
    const correlationId = this.applicationLogService.generateCorrelationId();

    try {
      // Mark as processing
      await this.prisma.emailQueueItem.update({
        where: { id: item.id },
        data: {
          status: 'PROCESSING',
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Check if email service is ready
      if (!this.emailService.isReady()) {
        throw new Error('Email service not configured');
      }

      // Send the email
      const result = await this.emailService.sendGeneralEmail({
        to: item.toEmail,
        subject: item.subject,
        body: item.bodyHtml,
      });

      // Update as sent
      await this.prisma.emailQueueItem.update({
        where: { id: item.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Update template stats
      if (item.templateId) {
        await this.prisma.emailTemplate.update({
          where: { id: item.templateId },
          data: { sendCount: { increment: 1 } },
        });
      }

      // Update campaign stats
      if (item.campaignId) {
        await this.prisma.emailCampaign.update({
          where: { id: item.campaignId },
          data: { sentCount: { increment: 1 } },
        });
      }

      await this.applicationLogService.logTransaction(
        'EmailQueueService.processItem',
        'EMAIL_SENT',
        TransactionStatus.SUCCESS,
        `Email sent to ${item.toEmail}`,
        {
          correlationId,
          entityType: 'EmailQueueItem',
          entityId: item.id,
          category: LogCategory.EMAIL,
        },
      );

      this.logger.debug(`Email sent: ${item.id} to ${item.toEmail}`);
    } catch (error) {
      const attempts = item.attempts + 1;
      const shouldRetry = attempts < this.MAX_RETRIES;

      await this.prisma.emailQueueItem.update({
        where: { id: item.id },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          errorMessage: error.message,
          errorCode: error.code || 'UNKNOWN',
          nextRetryAt: shouldRetry
            ? new Date(Date.now() + this.RETRY_DELAYS[attempts - 1])
            : null,
        },
      });

      // Update campaign stats if failed
      if (!shouldRetry && item.campaignId) {
        await this.prisma.emailCampaign.update({
          where: { id: item.campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      await this.applicationLogService.logTransaction(
        'EmailQueueService.processItem',
        'EMAIL_SEND_FAILED',
        shouldRetry ? TransactionStatus.PENDING : TransactionStatus.FAILED,
        `Email failed: ${error.message}. ${shouldRetry ? `Retry ${attempts}/${this.MAX_RETRIES}` : 'Max retries exceeded'}`,
        {
          correlationId,
          entityType: 'EmailQueueItem',
          entityId: item.id,
          category: LogCategory.EMAIL,
          error,
        },
      );

      this.logger.warn(
        `Email failed: ${item.id} - ${error.message}. ${shouldRetry ? 'Will retry' : 'Max retries exceeded'}`,
      );
    }
  }

  // ============================================
  // MAINTENANCE
  // ============================================

  private async resetStuckItems() {
    const result = await this.prisma.emailQueueItem.updateMany({
      where: {
        status: 'PROCESSING',
        lastAttemptAt: {
          lt: new Date(Date.now() - 300000), // 5 minutes ago
        },
      },
      data: {
        status: 'PENDING',
      },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} stuck queue items`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldItems() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.emailQueueItem.deleteMany({
      where: {
        status: { in: ['SENT', 'FAILED', 'CANCELLED'] },
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old queue items`);
    }
  }
}
