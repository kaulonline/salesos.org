import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLogService, LogCategory, TransactionStatus } from '../admin/application-log.service';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
} from './dto';
import { EmailTemplateStatus, Prisma } from '@prisma/client';

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationLogService: ApplicationLogService,
  ) {}

  // ============================================
  // TEMPLATE CRUD OPERATIONS
  // ============================================

  async createTemplate(dto: CreateEmailTemplateDto, createdBy: string) {
    const correlationId = this.applicationLogService.generateCorrelationId();

    try {
      // Check for existing template with same name or slug
      const existing = await this.prisma.emailTemplate.findFirst({
        where: {
          OR: [{ name: dto.name }, { slug: dto.slug }],
        },
      });

      if (existing) {
        throw new ConflictException(
          existing.name === dto.name
            ? `Template with name "${dto.name}" already exists`
            : `Template with slug "${dto.slug}" already exists`,
        );
      }

      const template = await this.prisma.emailTemplate.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          subject: dto.subject,
          bodyHtml: dto.bodyHtml,
          bodyText: dto.bodyText || this.stripHtml(dto.bodyHtml),
          preheader: dto.preheader,
          category: dto.category || 'CUSTOM',
          status: 'DRAFT',
          variables: dto.variables || [],
          useIrisBranding: dto.useIrisBranding ?? true,
          ctaText: dto.ctaText,
          ctaUrl: dto.ctaUrl,
          targetRoles: dto.targetRoles || [],
          createdBy,
          lastEditedBy: createdBy,
        },
      });

      await this.applicationLogService.logTransaction(
        'EmailTemplatesService.createTemplate',
        'EMAIL_TEMPLATE_CREATE',
        TransactionStatus.SUCCESS,
        `Email template created: ${template.name}`,
        {
          correlationId,
          entityType: 'EmailTemplate',
          entityId: template.id,
          category: LogCategory.EMAIL,
          userId: createdBy,
        },
      );

      return template;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      await this.applicationLogService.logTransaction(
        'EmailTemplatesService.createTemplate',
        'EMAIL_TEMPLATE_CREATE',
        TransactionStatus.FAILED,
        `Failed to create email template: ${error.message}`,
        {
          correlationId,
          entityType: 'EmailTemplate',
          category: LogCategory.EMAIL,
          userId: createdBy,
          error,
        },
      );

      throw error;
    }
  }

  async updateTemplate(id: string, dto: UpdateEmailTemplateDto, editedBy: string) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    // Check for name conflicts if name is being changed
    if (dto.name && dto.name !== existing.name) {
      const nameConflict = await this.prisma.emailTemplate.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (nameConflict) {
        throw new ConflictException(`Template with name "${dto.name}" already exists`);
      }
    }

    const template = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...dto,
        bodyText: dto.bodyHtml ? this.stripHtml(dto.bodyHtml) : undefined,
        lastEditedBy: editedBy,
      },
    });

    this.logger.log(`Email template updated: ${template.name} by ${editedBy}`);
    return template;
  }

  async getTemplate(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            sentCount: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  async getTemplateBySlug(slug: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException(`Email template with slug "${slug}" not found`);
    }

    return template;
  }

  async getAllTemplates(query: EmailTemplateQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.EmailTemplateWhereInput = {};

    if (query.category) {
      where.category = query.category;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.emailTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          subject: true,
          category: true,
          status: true,
          variables: true,
          useIrisBranding: true,
          sendCount: true,
          openCount: true,
          clickCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);

    return {
      items: templates,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteTemplate(id: string, deletedBy: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        campaigns: {
          where: { status: { in: ['SCHEDULED', 'SENDING'] } },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    if (template.campaigns.length > 0) {
      throw new BadRequestException(
        `Cannot delete template with active campaigns. Archive the campaigns first.`,
      );
    }

    await this.prisma.emailTemplate.delete({ where: { id } });

    this.logger.log(`Email template deleted: ${template.name} by ${deletedBy}`);
    return { message: 'Template deleted successfully' };
  }

  async duplicateTemplate(id: string, newName: string, createdBy: string) {
    const original = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!original) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    // Generate unique slug
    const baseSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.emailTemplate.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const duplicate = await this.prisma.emailTemplate.create({
      data: {
        name: newName,
        slug,
        description: original.description ? `Copy of: ${original.description}` : null,
        subject: original.subject,
        bodyHtml: original.bodyHtml,
        bodyText: original.bodyText,
        preheader: original.preheader,
        category: original.category,
        status: 'DRAFT',
        variables: original.variables,
        useIrisBranding: original.useIrisBranding,
        ctaText: original.ctaText,
        ctaUrl: original.ctaUrl,
        targetRoles: original.targetRoles,
        createdBy,
        lastEditedBy: createdBy,
      },
    });

    this.logger.log(`Email template duplicated: ${original.name} -> ${newName}`);
    return duplicate;
  }

  async activateTemplate(id: string, editedBy: string) {
    return this.updateTemplate(id, { status: EmailTemplateStatus.ACTIVE }, editedBy);
  }

  async archiveTemplate(id: string, editedBy: string) {
    return this.updateTemplate(id, { status: EmailTemplateStatus.ARCHIVED }, editedBy);
  }

  // ============================================
  // TEMPLATE RENDERING
  // ============================================

  renderTemplate(template: { subject: string; bodyHtml: string; bodyText?: string }, variables: Record<string, string>) {
    let subject = template.subject;
    let bodyHtml = template.bodyHtml;
    let bodyText = template.bodyText || '';

    // Replace all {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      bodyText = bodyText.replace(regex, value);
    }

    return { subject, bodyHtml, bodyText };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================
  // DEFAULT TEMPLATES INITIALIZATION
  // ============================================

  async initializeDefaultTemplates() {
    const defaultTemplates = [
      {
        name: 'Welcome Email',
        slug: 'welcome-email',
        description: 'Welcome email for new users',
        subject: 'Welcome to IRIS Sales CRM, {{firstName}}!',
        category: 'NOTIFICATION',
        variables: ['firstName', 'email'],
        bodyHtml: `
          <h2>Welcome to IRIS, {{firstName}}!</h2>
          <p>We're excited to have you on board. IRIS is your AI-powered sales assistant that helps you close more deals with less effort.</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Import your leads and contacts</li>
            <li>Connect your Salesforce account</li>
            <li>Start your first AI-powered conversation</li>
          </ul>
        `,
      },
      {
        name: 'Password Reset',
        slug: 'password-reset',
        description: 'Password reset email with secure link',
        subject: 'Reset Your IRIS Password',
        category: 'TRANSACTIONAL',
        variables: ['firstName', 'resetUrl', 'expiryHours'],
        bodyHtml: `
          <h2>Reset Your Password</h2>
          <p>Hi {{firstName}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #006039; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
          </p>
          <p>This link will expire in {{expiryHours}} hours.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      },
      {
        name: 'New Lead Assigned',
        slug: 'new-lead-assigned',
        description: 'Notification when a new lead is assigned',
        subject: 'New Lead Assigned: {{leadName}} from {{companyName}}',
        category: 'NOTIFICATION',
        variables: ['firstName', 'leadName', 'companyName', 'leadEmail', 'leadSource', 'leadUrl'],
        bodyHtml: `
          <h2>New Lead Assigned to You</h2>
          <p>Hi {{firstName}},</p>
          <p>You have been assigned a new lead:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{leadName}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Company</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{companyName}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{leadEmail}}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Source</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{leadSource}}</td></tr>
          </table>
          <p style="text-align: center;">
            <a href="{{leadUrl}}" style="background-color: #006039; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Lead</a>
          </p>
        `,
      },
      {
        name: 'Deal Won',
        slug: 'deal-won',
        description: 'Celebration email when a deal is won',
        subject: '🎉 Congratulations! Deal Won: {{dealName}}',
        category: 'NOTIFICATION',
        variables: ['firstName', 'dealName', 'dealAmount', 'accountName', 'closeDate'],
        bodyHtml: `
          <h2 style="text-align: center;">🎉 Congratulations!</h2>
          <p style="text-align: center; font-size: 18px;">You've closed a deal!</p>
          <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #166534;">{{dealName}}</h3>
            <p style="font-size: 24px; font-weight: bold; color: #166534; margin: 10px 0;">{{dealAmount}}</p>
            <p style="color: #166534;">{{accountName}}</p>
          </div>
          <p>Keep up the great work, {{firstName}}!</p>
        `,
      },
      {
        name: 'Daily Digest',
        slug: 'daily-digest',
        description: 'Daily summary of sales activities',
        subject: 'Your Daily IRIS Digest - {{date}}',
        category: 'DIGEST',
        variables: ['firstName', 'date', 'newLeads', 'tasksDue', 'meetingsToday', 'pipelineValue'],
        bodyHtml: `
          <h2>Good morning, {{firstName}}!</h2>
          <p>Here's your daily sales summary for {{date}}:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; text-align: center; margin: 5px;">
                <div style="font-size: 24px; font-weight: bold; color: #006039;">{{newLeads}}</div>
                <div style="color: #6b7280;">New Leads</div>
              </td>
              <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; text-align: center; margin: 5px;">
                <div style="font-size: 24px; font-weight: bold; color: #d97706;">{{tasksDue}}</div>
                <div style="color: #6b7280;">Tasks Due</div>
              </td>
              <td style="padding: 15px; background-color: #f3f4f6; border-radius: 8px; text-align: center; margin: 5px;">
                <div style="font-size: 24px; font-weight: bold; color: #2563eb;">{{meetingsToday}}</div>
                <div style="color: #6b7280;">Meetings</div>
              </td>
            </tr>
          </table>
          <p style="text-align: center; font-size: 16px;">Pipeline Value: <strong>{{pipelineValue}}</strong></p>
        `,
      },
      {
        name: 'Task Due Reminder',
        slug: 'task-due-reminder',
        description: 'Reminder for tasks due soon',
        subject: 'Task Reminder: {{taskSubject}} is due {{dueDate}}',
        category: 'NOTIFICATION',
        variables: ['firstName', 'taskSubject', 'taskDescription', 'dueDate', 'priority', 'taskUrl'],
        bodyHtml: `
          <h2>Task Reminder</h2>
          <p>Hi {{firstName}},</p>
          <p>This is a reminder that you have a task due soon:</p>
          <div style="background-color: #f9fafb; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px;">{{taskSubject}}</h3>
            <p style="margin: 0; color: #6b7280;">{{taskDescription}}</p>
            <p style="margin: 10px 0 0; font-weight: bold;">Due: {{dueDate}} | Priority: {{priority}}</p>
          </div>
          <p style="text-align: center;">
            <a href="{{taskUrl}}" style="background-color: #006039; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
          </p>
        `,
      },
      {
        name: 'Meeting Reminder',
        slug: 'meeting-reminder',
        description: 'Reminder before scheduled meetings',
        subject: 'Meeting Reminder: {{meetingTitle}} at {{meetingTime}}',
        category: 'MEETING',
        variables: ['firstName', 'meetingTitle', 'meetingDate', 'meetingTime', 'meetingDuration', 'joinUrl', 'attendees'],
        bodyHtml: `
          <h2>Meeting Reminder</h2>
          <p>Hi {{firstName}},</p>
          <p>Your meeting is starting soon:</p>
          <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1e40af;">{{meetingTitle}}</h3>
            <p style="margin: 10px 0;"><strong>Date:</strong> {{meetingDate}}</p>
            <p style="margin: 10px 0;"><strong>Time:</strong> {{meetingTime}} ({{meetingDuration}} min)</p>
            <p style="margin: 10px 0;"><strong>Attendees:</strong> {{attendees}}</p>
          </div>
          <p style="text-align: center;">
            <a href="{{joinUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join Meeting</a>
          </p>
        `,
      },
    ];

    for (const template of defaultTemplates) {
      try {
        // Use upsert to handle race conditions in cluster mode
        await this.prisma.emailTemplate.upsert({
          where: { slug: template.slug },
          update: {}, // Do nothing if exists
          create: {
            ...template,
            category: template.category as any,
            bodyText: this.stripHtml(template.bodyHtml),
            status: 'ACTIVE',
            useIrisBranding: true,
            createdBy: 'system',
            lastEditedBy: 'system',
          },
        });
        this.logger.debug(`Ensured default email template exists: ${template.name}`);
      } catch (error) {
        // Ignore unique constraint errors (another instance may have created it)
        if (error?.code !== 'P2002') {
          this.logger.warn(`Failed to create template ${template.name}: ${error.message}`);
        }
      }
    }
  }
}
