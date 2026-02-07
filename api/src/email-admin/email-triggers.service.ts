import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTemplatesService } from './email-templates.service';
import { ConfigService } from '@nestjs/config';

/**
 * EmailTriggersService handles automatic email notifications
 * triggered by CRM events (lead creation, deal updates, etc.)
 */
@Injectable()
export class EmailTriggersService {
  private readonly logger = new Logger(EmailTriggersService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: EmailQueueService,
    private readonly templatesService: EmailTemplatesService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  // ============================================
  // LEAD EVENTS
  // ============================================

  async onLeadCreated(leadId: string, assignedUserId: string) {
    try {
      const [lead, user, preferences] = await Promise.all([
        this.prisma.lead.findUnique({
          where: { id: leadId },
        }),
        this.prisma.user.findUnique({ where: { id: assignedUserId } }),
        this.getEmailPreferences(assignedUserId),
      ]);

      if (!lead || !user || !preferences?.newLeadAssigned) {
        return;
      }

      const template = await this.templatesService.getTemplateBySlug('new-lead-assigned');

      await this.queueService.enqueueFromTemplate(
        {
          templateId: template.id,
          to: user.email,
          toName: user.name || undefined,
          variables: {
            firstName: user.name?.split(' ')[0] || 'there',
            leadName: `${lead.firstName} ${lead.lastName}`.trim(),
            companyName: lead.company || 'Unknown',
            leadEmail: lead.email || 'Not provided',
            leadSource: lead.leadSource || 'OTHER',
            leadUrl: `${this.appUrl}/leads/${lead.id}`,
          },
          leadId,
        },
        user.id,
        'trigger:lead_created',
      );

      this.logger.debug(`Lead created email queued for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to trigger lead created email: ${error.message}`);
    }
  }

  async onLeadStatusChange(leadId: string, oldStatus: string, newStatus: string) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: { owner: true },
      });

      if (!lead || !lead.owner) return;

      const preferences = await this.getEmailPreferences(lead.ownerId);
      if (!preferences?.leadStatusChange) return;

      // Only notify on significant status changes
      const significantChanges = ['QUALIFIED', 'CONVERTED', 'LOST'];
      if (!significantChanges.includes(newStatus)) return;

      await this.queueService.enqueue(
        {
          to: lead.owner.email,
          subject: `Lead Status Update: ${lead.firstName} ${lead.lastName} is now ${newStatus}`,
          bodyHtml: `
            <h2>Lead Status Updated</h2>
            <p>The status of lead <strong>${lead.firstName} ${lead.lastName}</strong> has changed:</p>
            <p><strong>Previous Status:</strong> ${oldStatus}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
            <p><a href="${this.appUrl}/leads/${lead.id}" style="background-color: #006039; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Lead</a></p>
          `,
          leadId,
        },
        lead.ownerId,
        'trigger:lead_status_change',
      );
    } catch (error) {
      this.logger.error(`Failed to trigger lead status change email: ${error.message}`);
    }
  }

  // ============================================
  // OPPORTUNITY EVENTS
  // ============================================

  async onDealStageChange(opportunityId: string, oldStage: string, newStage: string) {
    try {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { owner: true, account: true },
      });

      if (!opportunity || !opportunity.owner) return;

      const preferences = await this.getEmailPreferences(opportunity.ownerId);
      if (!preferences?.dealStageChange) return;

      await this.queueService.enqueue(
        {
          to: opportunity.owner.email,
          subject: `Deal Update: ${opportunity.name} moved to ${newStage}`,
          bodyHtml: `
            <h2>Deal Stage Updated</h2>
            <p>Your deal <strong>${opportunity.name}</strong> has progressed:</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Account</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${opportunity.account?.name || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Previous Stage</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${oldStage}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>New Stage</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${newStage}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${opportunity.amount?.toLocaleString() || '0'}</td></tr>
            </table>
            <p><a href="${this.appUrl}/opportunities/${opportunity.id}" style="background-color: #006039; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Deal</a></p>
          `,
          opportunityId,
        },
        opportunity.ownerId,
        'trigger:deal_stage_change',
      );
    } catch (error) {
      this.logger.error(`Failed to trigger deal stage change email: ${error.message}`);
    }
  }

  async onDealWon(opportunityId: string) {
    try {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { owner: true, account: true },
      });

      if (!opportunity || !opportunity.owner) return;

      const preferences = await this.getEmailPreferences(opportunity.ownerId);
      if (!preferences?.dealWonLost) return;

      const template = await this.templatesService.getTemplateBySlug('deal-won');

      await this.queueService.enqueueFromTemplate(
        {
          templateId: template.id,
          to: opportunity.owner.email,
          toName: opportunity.owner.name || undefined,
          variables: {
            firstName: opportunity.owner.name?.split(' ')[0] || 'there',
            dealName: opportunity.name,
            dealAmount: `$${opportunity.amount?.toLocaleString() || '0'}`,
            accountName: opportunity.account?.name || 'Unknown Account',
            closeDate: opportunity.closeDate?.toLocaleDateString() || 'N/A',
          },
          opportunityId,
        },
        opportunity.ownerId,
        'trigger:deal_won',
      );

      this.logger.log(`Deal won celebration email queued for ${opportunity.owner.email}`);
    } catch (error) {
      this.logger.error(`Failed to trigger deal won email: ${error.message}`);
    }
  }

  async onDealLost(opportunityId: string, lostReason?: string) {
    try {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { owner: true, account: true },
      });

      if (!opportunity || !opportunity.owner) return;

      const preferences = await this.getEmailPreferences(opportunity.ownerId);
      if (!preferences?.dealWonLost) return;

      await this.queueService.enqueue(
        {
          to: opportunity.owner.email,
          subject: `Deal Lost: ${opportunity.name}`,
          bodyHtml: `
            <h2>Deal Closed - Lost</h2>
            <p>Unfortunately, the deal <strong>${opportunity.name}</strong> has been marked as lost.</p>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Account</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${opportunity.account?.name || 'N/A'}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${opportunity.amount?.toLocaleString() || '0'}</td></tr>
              ${lostReason ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${lostReason}</td></tr>` : ''}
            </table>
            <p>Don't be discouraged - every loss is a learning opportunity!</p>
            <p><a href="${this.appUrl}/opportunities/${opportunity.id}" style="background-color: #6b7280; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
          `,
          opportunityId,
        },
        opportunity.ownerId,
        'trigger:deal_lost',
      );
    } catch (error) {
      this.logger.error(`Failed to trigger deal lost email: ${error.message}`);
    }
  }

  // ============================================
  // TASK EVENTS
  // ============================================

  async onTaskAssigned(taskId: string, assignedToId: string) {
    try {
      const [task, assignedTo, preferences] = await Promise.all([
        this.prisma.task.findUnique({
          where: { id: taskId },
          include: { owner: true, lead: true, account: true, opportunity: true },
        }),
        this.prisma.user.findUnique({ where: { id: assignedToId } }),
        this.getEmailPreferences(assignedToId),
      ]);

      if (!task || !assignedTo || !preferences?.taskAssigned) return;

      await this.queueService.enqueue(
        {
          to: assignedTo.email,
          subject: `Task Assigned: ${task.subject}`,
          bodyHtml: `
            <h2>New Task Assigned</h2>
            <p>A new task has been assigned to you:</p>
            <div style="background-color: #f9fafb; border-left: 4px solid #006039; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0;">${task.subject}</h3>
              ${task.description ? `<p style="color: #6b7280; margin: 10px 0 0;">${task.description}</p>` : ''}
            </div>
            <table style="border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px;"><strong>Due Date:</strong></td><td style="padding: 8px;">${task.dueDate ? task.dueDate.toLocaleDateString() : 'Not set'}</td></tr>
              <tr><td style="padding: 8px;"><strong>Priority:</strong></td><td style="padding: 8px;">${task.priority || 'Normal'}</td></tr>
              <tr><td style="padding: 8px;"><strong>Assigned By:</strong></td><td style="padding: 8px;">${task.owner?.name || 'System'}</td></tr>
            </table>
            <p><a href="${this.appUrl}/tasks/${task.id}" style="background-color: #006039; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>
          `,
        },
        assignedToId,
        'trigger:task_assigned',
      );
    } catch (error) {
      this.logger.error(`Failed to trigger task assigned email: ${error.message}`);
    }
  }

  async onTaskDueReminder(taskId: string) {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { assignedTo: true },
      });

      if (!task || !task.assignedTo) return;

      const preferences = await this.getEmailPreferences(task.assignedToId!);
      if (!preferences?.taskDueReminder) return;

      const template = await this.templatesService.getTemplateBySlug('task-due-reminder');

      await this.queueService.enqueueFromTemplate(
        {
          templateId: template.id,
          to: task.assignedTo.email,
          toName: task.assignedTo.name || undefined,
          variables: {
            firstName: task.assignedTo.name?.split(' ')[0] || 'there',
            taskSubject: task.subject,
            taskDescription: task.description || 'No description provided',
            dueDate: task.dueDate?.toLocaleDateString() || 'Not set',
            priority: task.priority || 'Normal',
            taskUrl: `${this.appUrl}/tasks/${task.id}`,
          },
        },
        task.assignedToId!,
        'trigger:task_reminder',
      );
    } catch (error) {
      this.logger.error(`Failed to trigger task reminder email: ${error.message}`);
    }
  }

  // ============================================
  // MEETING EVENTS
  // ============================================

  async onMeetingReminder(meetingSessionId: string, minutesBefore: number) {
    try {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingSessionId },
        include: { owner: true, participants: true },
      });

      if (!meeting || !meeting.owner) return;

      const preferences = await this.getEmailPreferences(meeting.ownerId);
      if (!preferences?.meetingReminder) return;

      const template = await this.templatesService.getTemplateBySlug('meeting-reminder');

      // Build participant names list
      const participantNames = meeting.participants
        ?.map((p) => p.name || p.email)
        .join(', ') || 'No attendees listed';

      await this.queueService.enqueueFromTemplate(
        {
          templateId: template.id,
          to: meeting.owner.email,
          toName: meeting.owner.name || undefined,
          variables: {
            firstName: meeting.owner.name?.split(' ')[0] || 'there',
            meetingTitle: meeting.title,
            meetingDate: meeting.scheduledStart.toLocaleDateString(),
            meetingTime: meeting.scheduledStart.toLocaleTimeString(),
            meetingDuration: meeting.duration?.toString() || '30',
            joinUrl: meeting.meetingUrl || '#',
            attendees: participantNames,
          },
        },
        meeting.ownerId,
        'trigger:meeting_reminder',
      );

      this.logger.debug(`Meeting reminder queued for ${meeting.owner.email}`);
    } catch (error) {
      this.logger.error(`Failed to trigger meeting reminder email: ${error.message}`);
    }
  }

  // ============================================
  // DIGEST EMAILS
  // ============================================

  async sendDailyDigest(userId: string) {
    try {
      const [user, preferences] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.getEmailPreferences(userId),
      ]);

      if (!user || !preferences?.dailyDigest) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [newLeads, tasksDue, meetingsToday, pipelineStats] = await Promise.all([
        this.prisma.lead.count({
          where: { ownerId: userId, createdAt: { gte: today } },
        }),
        this.prisma.task.count({
          where: {
            assignedToId: userId,
            status: { not: 'COMPLETED' },
            dueDate: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.meetingSession.count({
          where: {
            ownerId: userId,
            scheduledStart: {
              gte: today,
              lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.opportunity.aggregate({
          where: {
            ownerId: userId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          _sum: { amount: true },
        }),
      ]);

      const template = await this.templatesService.getTemplateBySlug('daily-digest');

      await this.queueService.enqueueFromTemplate(
        {
          templateId: template.id,
          to: user.email,
          toName: user.name || undefined,
          variables: {
            firstName: user.name?.split(' ')[0] || 'there',
            date: new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            newLeads: newLeads.toString(),
            tasksDue: tasksDue.toString(),
            meetingsToday: meetingsToday.toString(),
            pipelineValue: `$${(pipelineStats._sum.amount || 0).toLocaleString()}`,
          },
        },
        userId,
        'trigger:daily_digest',
      );

      this.logger.debug(`Daily digest queued for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send daily digest: ${error.message}`);
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getEmailPreferences(userId: string) {
    let preferences = await this.prisma.emailNotificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = await this.prisma.emailNotificationPreferences.create({
        data: { userId },
      });
    }

    // Check master toggle
    if (!preferences.emailsEnabled) {
      return null;
    }

    return preferences;
  }
}
