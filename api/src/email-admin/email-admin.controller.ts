import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { Roles, RolesGuard } from '../admin/admin.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTriggersService } from './email-triggers.service';
import { PrismaService } from '../database/prisma.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
  CreateEmailCampaignDto,
  UpdateEmailCampaignDto,
  EmailCampaignQueryDto,
  SendEmailDto,
  SendTemplateEmailDto,
  SendBulkEmailDto,
  EmailQueueQueryDto,
  UpdateEmailPreferencesDto,
  EmailStatsQueryDto,
} from './dto';

@ApiTags('Email Admin')
@ApiBearerAuth()
@Controller('admin/email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailAdminController {
  constructor(
    private readonly templatesService: EmailTemplatesService,
    private readonly queueService: EmailQueueService,
    private readonly triggersService: EmailTriggersService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================
  // DASHBOARD & STATS
  // ============================================

  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email admin dashboard statistics' })
  async getDashboard() {
    const [queueStats, templateStats, campaignStats, recentActivity] = await Promise.all([
      this.queueService.getStats(),
      this.prisma.emailTemplate.aggregate({
        _count: true,
        _sum: { sendCount: true, openCount: true, clickCount: true },
      }),
      this.prisma.emailCampaign.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.emailQueueItem.findMany({
        where: { status: 'SENT' },
        take: 10,
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          toEmail: true,
          subject: true,
          sentAt: true,
          source: true,
        },
      }),
    ]);

    const totalSent = templateStats._sum.sendCount || 0;
    const totalOpens = templateStats._sum.openCount || 0;
    const totalClicks = templateStats._sum.clickCount || 0;

    return {
      queue: queueStats,
      templates: {
        total: templateStats._count,
        totalSent,
        totalOpens,
        totalClicks,
        openRate: totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : 0,
        clickRate: totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : 0,
      },
      campaigns: campaignStats.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {},
      ),
      recentActivity,
    };
  }

  @Get('stats')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email statistics over time' })
  async getStats(@Query() query: EmailStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const stats = await this.prisma.emailQueueItem.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    const dailyStats = await this.prisma.$queryRaw`
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed
      FROM email_queue
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    return {
      summary: stats.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {},
      ),
      daily: dailyStats,
    };
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  @Get('templates')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all email templates' })
  async getTemplates(@Query() query: EmailTemplateQueryDto) {
    return this.templatesService.getAllTemplates(query);
  }

  @Get('templates/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  @Post('templates')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new email template' })
  async createTemplate(@Request() req, @Body() dto: CreateEmailTemplateDto) {
    return this.templatesService.createTemplate(dto, req.user.userId);
  }

  @Put('templates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update email template' })
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.templatesService.updateTemplate(id, dto, req.user.userId);
  }

  @Delete('templates/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete email template' })
  async deleteTemplate(@Request() req, @Param('id') id: string) {
    return this.templatesService.deleteTemplate(id, req.user.userId);
  }

  @Post('templates/:id/duplicate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Duplicate email template' })
  async duplicateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.templatesService.duplicateTemplate(id, name, req.user.userId);
  }

  @Patch('templates/:id/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate email template' })
  async activateTemplate(@Request() req, @Param('id') id: string) {
    return this.templatesService.activateTemplate(id, req.user.userId);
  }

  @Patch('templates/:id/archive')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Archive email template' })
  async archiveTemplate(@Request() req, @Param('id') id: string) {
    return this.templatesService.archiveTemplate(id, req.user.userId);
  }

  @Post('templates/:id/preview')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Preview email template with variables' })
  async previewTemplate(
    @Param('id') id: string,
    @Body('variables') variables: Record<string, string>,
  ) {
    const template = await this.templatesService.getTemplate(id);
    return this.templatesService.renderTemplate(
      {
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText || undefined,
      },
      variables || {},
    );
  }

  // ============================================
  // EMAIL CAMPAIGNS
  // ============================================

  @Get('campaigns')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all email campaigns' })
  async getCampaigns(@Query() query: EmailCampaignQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.emailCampaign.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { id: true, name: true } },
        },
      }),
      this.prisma.emailCampaign.count({ where }),
    ]);

    return {
      items: campaigns,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Get('campaigns/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email campaign by ID' })
  async getCampaign(@Param('id') id: string) {
    return this.prisma.emailCampaign.findUniqueOrThrow({
      where: { id },
      include: {
        template: true,
        queuedEmails: {
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            toEmail: true,
            status: true,
            sentAt: true,
            errorMessage: true,
          },
        },
      },
    });
  }

  @Post('campaigns')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create new email campaign' })
  async createCampaign(@Request() req, @Body() dto: CreateEmailCampaignDto) {
    return this.prisma.emailCampaign.create({
      data: {
        ...dto,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        createdBy: req.user.userId,
      },
    });
  }

  @Put('campaigns/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update email campaign' })
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateEmailCampaignDto) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: {
        ...dto,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      },
    });
  }

  @Delete('campaigns/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete email campaign' })
  async deleteCampaign(@Param('id') id: string) {
    await this.prisma.emailCampaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully' };
  }

  @Post('campaigns/:id/start')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Start sending email campaign' })
  async startCampaign(@Request() req, @Param('id') id: string) {
    const campaign = await this.prisma.emailCampaign.findUniqueOrThrow({
      where: { id },
      include: { template: true },
    });

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error(`Campaign cannot be started from status ${campaign.status}`);
    }

    // Get recipients based on targeting
    let recipients: Array<{ email: string; name?: string; userId: string }> = [];

    if (campaign.recipientType === 'all') {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, email: true, name: true },
      });
      recipients = users.map(u => ({ email: u.email, name: u.name || undefined, userId: u.id }));
    } else if (campaign.recipientType === 'role' && campaign.targetRoles.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE', role: { in: campaign.targetRoles as any } },
        select: { id: true, email: true, name: true },
      });
      recipients = users.map(u => ({ email: u.email, name: u.name || undefined, userId: u.id }));
    } else if (campaign.recipientType === 'custom' && campaign.recipientList.length > 0) {
      recipients = campaign.recipientList.map(email => ({ email, userId: '' }));
    }

    // Update campaign status
    await this.prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        totalRecipients: recipients.length,
      },
    });

    // Queue all emails
    await this.queueService.enqueueBulk(
      campaign.templateId,
      recipients.map(r => ({
        email: r.email,
        name: r.name,
        variables: { firstName: r.name?.split(' ')[0] || 'there' },
      })),
      id,
      req.user.userId,
    );

    return { message: `Campaign started with ${recipients.length} recipients` };
  }

  @Post('campaigns/:id/pause')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Pause email campaign' })
  async pauseCampaign(@Param('id') id: string) {
    return this.prisma.emailCampaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  @Post('campaigns/:id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel email campaign' })
  async cancelCampaign(@Param('id') id: string) {
    // Cancel pending queue items for this campaign
    await this.prisma.emailQueueItem.updateMany({
      where: { campaignId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    return this.prisma.emailCampaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============================================
  // EMAIL QUEUE
  // ============================================

  @Get('queue')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email queue' })
  async getQueue(@Query() query: EmailQueueQueryDto) {
    return this.queueService.getQueue(query);
  }

  @Get('queue/stats')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get email queue statistics' })
  async getQueueStats() {
    return this.queueService.getStats();
  }

  @Get('queue/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get queue item by ID' })
  async getQueueItem(@Param('id') id: string) {
    return this.queueService.getQueueItem(id);
  }

  @Post('queue/:id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel queued email' })
  async cancelQueueItem(@Param('id') id: string) {
    return this.queueService.cancelQueueItem(id);
  }

  @Post('queue/:id/retry')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retry failed email' })
  async retryQueueItem(@Param('id') id: string) {
    return this.queueService.retryQueueItem(id);
  }

  // ============================================
  // SEND EMAILS
  // ============================================

  @Post('send')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send an email immediately or queue it' })
  async sendEmail(@Request() req, @Body() dto: SendEmailDto) {
    return this.queueService.enqueue(dto, req.user.userId, 'admin');
  }

  @Post('send/template')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send email using a template' })
  async sendTemplateEmail(@Request() req, @Body() dto: SendTemplateEmailDto) {
    return this.queueService.enqueueFromTemplate(dto, req.user.userId, 'admin');
  }

  @Post('send/bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send bulk emails using a template' })
  async sendBulkEmail(@Request() req, @Body() dto: SendBulkEmailDto) {
    return this.queueService.enqueueBulk(
      dto.templateId,
      dto.recipients,
      undefined,
      req.user.userId,
    );
  }

  @Post('send/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send test email to verify configuration' })
  async sendTestEmail(@Request() req, @Body('to') to: string) {
    return this.queueService.enqueue(
      {
        to,
        subject: 'IRIS Email Test',
        bodyHtml: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email from IRIS Sales CRM.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <p style="color: #6b7280; font-size: 14px;">Sent by: ${req.user.email}</p>
        `,
      },
      req.user.userId,
      'test',
    );
  }

  // ============================================
  // EMAIL PREFERENCES
  // ============================================

  @Get('preferences')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users with their email preferences' })
  async getAllUsersWithPreferences(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('emailsEnabled') emailsEnabled?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const size = parseInt(pageSize || '20', 10);
    const skip = (pageNum - 1) * size;

    // Build user filter
    const userWhere: any = { status: 'ACTIVE' };
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: size,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    // Get email preferences for these users
    const userIds = users.map(u => u.id);
    const preferences = await this.prisma.emailNotificationPreferences.findMany({
      where: { userId: { in: userIds } },
    });

    // Create a map for quick lookup
    const prefsMap = new Map(preferences.map(p => [p.userId, p]));

    // Merge users with their preferences
    let usersWithPrefs = users.map(user => ({
      ...user,
      emailPreferences: prefsMap.get(user.id) || {
        emailsEnabled: true, // default
        dailyDigest: true,
        weeklyReport: true,
        monthlyReport: false,
        newLeadAssigned: true,
        leadStatusChange: true,
        dealStageChange: true,
        dealWonLost: true,
        taskAssigned: true,
        taskDueReminder: true,
        meetingReminder: true,
        aiInsights: true,
        systemAlerts: true,
        securityAlerts: true,
        marketingEmails: false,
        productUpdates: true,
      },
    }));

    // Filter by emailsEnabled if specified
    if (emailsEnabled !== undefined) {
      const filterEnabled = emailsEnabled === 'true';
      usersWithPrefs = usersWithPrefs.filter(u => u.emailPreferences.emailsEnabled === filterEnabled);
    }

    // Count users with emails enabled/disabled
    const allPrefs = await this.prisma.emailNotificationPreferences.findMany({
      select: { emailsEnabled: true },
    });
    const enabledCount = allPrefs.filter(p => p.emailsEnabled).length;
    const disabledCount = allPrefs.filter(p => !p.emailsEnabled).length;
    const defaultCount = total - allPrefs.length; // Users without explicit preferences (default enabled)

    return {
      items: usersWithPrefs,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
      stats: {
        enabled: enabledCount + defaultCount,
        disabled: disabledCount,
        total,
      },
    };
  }

  @Post('preferences/bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update email preferences for multiple users' })
  async bulkUpdatePreferences(
    @Body() dto: { userIds: string[]; emailsEnabled: boolean },
  ) {
    const { userIds, emailsEnabled } = dto;

    // Upsert preferences for each user
    const results = await Promise.all(
      userIds.map(userId =>
        this.prisma.emailNotificationPreferences.upsert({
          where: { userId },
          update: { emailsEnabled },
          create: { userId, emailsEnabled },
        }),
      ),
    );

    return {
      updated: results.length,
      emailsEnabled,
    };
  }

  @Get('preferences/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get user email preferences' })
  async getUserPreferences(@Param('userId') userId: string) {
    let preferences = await this.prisma.emailNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.emailNotificationPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  @Put('preferences/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user email preferences' })
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.prisma.emailNotificationPreferences.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  // ============================================
  // TRIGGER TESTING (DEV)
  // ============================================

  @Post('test-trigger/:event')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test email trigger (development only)' })
  async testTrigger(
    @Param('event') event: string,
    @Body() params: Record<string, string>,
  ) {
    switch (event) {
      case 'daily_digest':
        await this.triggersService.sendDailyDigest(params.userId);
        break;
      default:
        return { error: `Unknown event: ${event}` };
    }

    return { message: `Trigger ${event} executed` };
  }
}
