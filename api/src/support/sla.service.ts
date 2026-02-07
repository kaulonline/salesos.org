import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { TicketPriority, TicketStatus, SupportTicket } from '@prisma/client';
import {
  generateTicketProgressEmail,
  generateSlaWarningEmail,
  generateSlaBreachEmail,
} from '../email/templates/premium-email-templates';

/**
 * SLA Configuration based on ticket priority
 * Times are in hours
 */
export const SLA_CONFIG: Record<
  TicketPriority,
  {
    firstResponseHours: number;
    resolutionHours: number;
    customerUpdateIntervalHours: number; // How often to send progress updates
  }
> = {
  CRITICAL: {
    firstResponseHours: 1,
    resolutionHours: 4,
    customerUpdateIntervalHours: 1,
  },
  HIGH: {
    firstResponseHours: 4,
    resolutionHours: 24,
    customerUpdateIntervalHours: 4,
  },
  MEDIUM: {
    firstResponseHours: 8,
    resolutionHours: 48,
    customerUpdateIntervalHours: 12,
  },
  LOW: {
    firstResponseHours: 24,
    resolutionHours: 72,
    customerUpdateIntervalHours: 24,
  },
};

/**
 * Escalation levels and their thresholds
 */
export const ESCALATION_THRESHOLDS = {
  WARNING: 0.5, // 50% of SLA time elapsed
  CRITICAL: 0.75, // 75% of SLA time elapsed
  BREACHED: 1.0, // 100% - SLA breached
};

export interface SlaStatus {
  ticketId: string;
  caseId: string;
  priority: TicketPriority;

  // First Response SLA
  firstResponseDue: Date | null;
  firstRespondedAt: Date | null;
  firstResponseBreached: boolean;
  firstResponsePercentElapsed: number;

  // Resolution SLA
  resolutionDue: Date | null;
  resolvedAt: Date | null;
  resolutionBreached: boolean;
  resolutionPercentElapsed: number;

  // Overall status
  escalationLevel: number;
  overallStatus: 'on_track' | 'warning' | 'critical' | 'breached';
  timeRemaining: string; // Human readable
}

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ==================== SLA CALCULATION ====================

  /**
   * Calculate and set SLA deadlines for a new ticket
   */
  async setSlaDeadlines(ticketId: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const config = SLA_CONFIG[ticket.priority];
    const now = ticket.createdAt;

    const firstResponseDue = new Date(
      now.getTime() + config.firstResponseHours * 60 * 60 * 1000,
    );
    const resolutionDue = new Date(
      now.getTime() + config.resolutionHours * 60 * 60 * 1000,
    );

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        firstResponseDue,
        resolutionDue,
      },
    });

    this.logger.log(
      `SLA set for ${ticket.caseId}: First response due ${firstResponseDue.toISOString()}, Resolution due ${resolutionDue.toISOString()}`,
    );

    return updated;
  }

  /**
   * Record first response time
   */
  async recordFirstResponse(ticketId: string): Promise<void> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.firstRespondedAt) {
      return; // Already recorded or ticket not found
    }

    const now = new Date();
    const breached =
      ticket.firstResponseDue && now > ticket.firstResponseDue;

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        firstRespondedAt: now,
        slaBreached: breached ? true : ticket.slaBreached,
        slaBreachType: breached
          ? ticket.slaBreachType
            ? 'BOTH'
            : 'FIRST_RESPONSE'
          : ticket.slaBreachType,
      },
    });

    if (breached) {
      this.logger.warn(
        `First response SLA breached for ${ticket.caseId}`,
      );
    } else {
      this.logger.log(
        `First response recorded for ${ticket.caseId} within SLA`,
      );
    }
  }

  /**
   * Get detailed SLA status for a ticket
   */
  async getSlaStatus(ticketId: string): Promise<SlaStatus | null> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return null;

    const now = new Date();

    // Calculate first response metrics
    const firstResponseBreached =
      ticket.firstResponseDue &&
      !ticket.firstRespondedAt &&
      now > ticket.firstResponseDue;

    const firstResponsePercentElapsed = this.calculatePercentElapsed(
      ticket.createdAt,
      ticket.firstResponseDue,
      ticket.firstRespondedAt || now,
    );

    // Calculate resolution metrics
    const resolutionBreached =
      ticket.resolutionDue &&
      !ticket.resolvedAt &&
      now > ticket.resolutionDue;

    const resolutionPercentElapsed = this.calculatePercentElapsed(
      ticket.createdAt,
      ticket.resolutionDue,
      ticket.resolvedAt || now,
    );

    // Determine overall status based on highest risk
    const maxPercent = Math.max(
      ticket.firstRespondedAt ? 0 : firstResponsePercentElapsed,
      ticket.resolvedAt ? 0 : resolutionPercentElapsed,
    );

    let overallStatus: 'on_track' | 'warning' | 'critical' | 'breached';
    if (maxPercent >= 1) {
      overallStatus = 'breached';
    } else if (maxPercent >= 0.75) {
      overallStatus = 'critical';
    } else if (maxPercent >= 0.5) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'on_track';
    }

    // Calculate time remaining
    const targetDue = ticket.resolvedAt
      ? null
      : ticket.firstRespondedAt
        ? ticket.resolutionDue
        : ticket.firstResponseDue;

    const timeRemaining = targetDue
      ? this.formatTimeRemaining(targetDue.getTime() - now.getTime())
      : 'N/A';

    return {
      ticketId: ticket.id,
      caseId: ticket.caseId,
      priority: ticket.priority,
      firstResponseDue: ticket.firstResponseDue,
      firstRespondedAt: ticket.firstRespondedAt,
      firstResponseBreached: firstResponseBreached || false,
      firstResponsePercentElapsed,
      resolutionDue: ticket.resolutionDue,
      resolvedAt: ticket.resolvedAt,
      resolutionBreached: resolutionBreached || false,
      resolutionPercentElapsed,
      escalationLevel: ticket.escalationLevel,
      overallStatus,
      timeRemaining,
    };
  }

  private calculatePercentElapsed(
    start: Date,
    due: Date | null,
    current: Date,
  ): number {
    if (!due) return 0;

    const totalTime = due.getTime() - start.getTime();
    const elapsedTime = current.getTime() - start.getTime();

    return Math.min(elapsedTime / totalTime, 2); // Cap at 200%
  }

  private formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Overdue';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  // ==================== SCHEDULED MONITORING ====================

  /**
   * Check SLA status every 5 minutes and take appropriate actions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorSlaCompliance(): Promise<void> {
    // In cluster mode, only run on the primary worker (NODE_APP_INSTANCE=0)
    const instanceId = process.env.NODE_APP_INSTANCE || '0';
    if (instanceId !== '0') {
      return; // Skip on non-primary workers
    }

    this.logger.log('Running SLA compliance check...');

    try {
      // First, set SLA deadlines for any open tickets that don't have them yet
      const ticketsWithoutSla = await this.prisma.supportTicket.findMany({
        where: {
          status: {
            in: [
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_ON_CUSTOMER,
            ],
          },
          resolutionDue: null,
        },
      });

      for (const ticket of ticketsWithoutSla) {
        await this.setSlaDeadlines(ticket.id);
        this.logger.log(`Set SLA deadlines for existing ticket ${ticket.caseId}`);
      }

      // Find all open tickets with SLA deadlines
      const openTickets = await this.prisma.supportTicket.findMany({
        where: {
          status: {
            in: [
              TicketStatus.OPEN,
              TicketStatus.IN_PROGRESS,
              TicketStatus.WAITING_ON_CUSTOMER,
            ],
          },
          resolutionDue: { not: null },
        },
      });

      for (const ticket of openTickets) {
        await this.checkAndEscalateTicket(ticket);
      }

      this.logger.log(
        `SLA check complete. Processed ${openTickets.length} tickets`,
      );
    } catch (error) {
      this.logger.error(`SLA monitoring error: ${error.message}`);
    }
  }

  /**
   * Check individual ticket and escalate if needed
   */
  private async checkAndEscalateTicket(
    ticket: SupportTicket,
  ): Promise<void> {
    const status = await this.getSlaStatus(ticket.id);
    if (!status) return;

    const newEscalationLevel = this.calculateEscalationLevel(status);

    // Only take action if escalation level increased
    if (newEscalationLevel > ticket.escalationLevel) {
      await this.handleEscalation(ticket, status, newEscalationLevel);
    }

    // Check if we should send a customer progress update
    await this.checkCustomerProgressUpdate(ticket, status);
  }

  private calculateEscalationLevel(status: SlaStatus): number {
    if (status.overallStatus === 'breached') return 3;
    if (status.overallStatus === 'critical') return 2;
    if (status.overallStatus === 'warning') return 1;
    return 0;
  }

  /**
   * Handle ticket escalation
   */
  private async handleEscalation(
    ticket: SupportTicket,
    status: SlaStatus,
    newLevel: number,
  ): Promise<void> {
    this.logger.warn(
      `Escalating ${ticket.caseId} from level ${ticket.escalationLevel} to ${newLevel}`,
    );

    // Update escalation level
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        escalationLevel: newLevel,
        slaBreached: newLevel >= 3,
        slaBreachType:
          newLevel >= 3
            ? ticket.firstRespondedAt
              ? 'RESOLUTION'
              : 'FIRST_RESPONSE'
            : ticket.slaBreachType,
      },
    });

    // Send internal alert
    await this.sendInternalAlert(ticket, status, newLevel);

    // If breached, also notify customer
    if (newLevel >= 3) {
      await this.sendBreachNotification(ticket, status);
    }
  }

  /**
   * Check if we should send a customer progress update
   */
  private async checkCustomerProgressUpdate(
    ticket: SupportTicket,
    status: SlaStatus,
  ): Promise<void> {
    // Only send updates for tickets that are in progress or waiting
    const activeStatuses: TicketStatus[] = [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_ON_CUSTOMER,
      TicketStatus.OPEN,
    ];
    if (!activeStatuses.includes(ticket.status)) {
      return;
    }

    const config = SLA_CONFIG[ticket.priority];
    const updateIntervalMs =
      config.customerUpdateIntervalHours * 60 * 60 * 1000;

    const lastUpdate =
      ticket.lastCustomerUpdateAt || ticket.createdAt;
    const timeSinceLastUpdate =
      Date.now() - lastUpdate.getTime();

    // Send update if interval has passed and ticket is still open
    if (timeSinceLastUpdate >= updateIntervalMs) {
      await this.sendCustomerProgressUpdate(ticket, status);
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Send progress update to customer
   */
  async sendCustomerProgressUpdate(
    ticket: SupportTicket,
    status: SlaStatus,
  ): Promise<void> {
    try {
      const emailContent = generateTicketProgressEmail({
        userName: ticket.name || 'Valued Customer',
        caseId: ticket.caseId,
        subject: ticket.subject,
        status: ticket.status,
        timeRemaining: status.timeRemaining,
        escalationLevel: status.escalationLevel,
        statusUrl: `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/status/${ticket.feedbackToken || ticket.id}`,
      });

      await this.emailService.sendPremiumEmail({
        to: ticket.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Update tracking
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          lastCustomerUpdateAt: new Date(),
          customerUpdateCount: { increment: 1 },
        },
      });

      this.logger.log(
        `Sent progress update for ${ticket.caseId} to ${ticket.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send progress update for ${ticket.caseId}: ${error.message}`,
      );
    }
  }

  /**
   * Send internal SLA warning/alert to admins
   */
  async sendInternalAlert(
    ticket: SupportTicket,
    status: SlaStatus,
    escalationLevel: number,
  ): Promise<void> {
    try {
      // Get admin emails
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No admins found for SLA alert');
        return;
      }

      const alertType =
        escalationLevel >= 3
          ? 'BREACHED'
          : escalationLevel >= 2
            ? 'CRITICAL'
            : 'WARNING';

      const emailContent = generateSlaWarningEmail({
        caseId: ticket.caseId,
        subject: ticket.subject,
        customerEmail: ticket.email,
        priority: ticket.priority,
        alertType,
        timeRemaining: status.timeRemaining,
        percentElapsed: Math.round(
          Math.max(
            status.firstResponsePercentElapsed,
            status.resolutionPercentElapsed,
          ) * 100,
        ),
        ticketUrl: `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/admin/support/${ticket.id}`,
      });

      // Send to all admins
      for (const admin of admins) {
        await this.emailService.sendPremiumEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }

      // Update tracking
      await this.prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          lastInternalAlertAt: new Date(),
          internalAlertCount: { increment: 1 },
        },
      });

      this.logger.log(
        `Sent ${alertType} alert for ${ticket.caseId} to ${admins.length} admins`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send internal alert for ${ticket.caseId}: ${error.message}`,
      );
    }
  }

  /**
   * Send SLA breach notification to customer with apology
   */
  async sendBreachNotification(
    ticket: SupportTicket,
    status: SlaStatus,
  ): Promise<void> {
    try {
      const emailContent = generateSlaBreachEmail({
        userName: ticket.name || 'Valued Customer',
        caseId: ticket.caseId,
        subject: ticket.subject,
        breachType: status.firstResponseBreached
          ? 'response'
          : 'resolution',
        statusUrl: `${process.env.FRONTEND_URL || 'https://engage.iriseller.com'}/support/status/${ticket.feedbackToken || ticket.id}`,
      });

      await this.emailService.sendPremiumEmail({
        to: ticket.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      this.logger.log(
        `Sent breach notification for ${ticket.caseId} to ${ticket.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send breach notification for ${ticket.caseId}: ${error.message}`,
      );
    }
  }

  // ==================== REPORTING ====================

  /**
   * Get SLA compliance report
   */
  async getSlaReport(days: number = 30): Promise<{
    totalTickets: number;
    withinSla: number;
    breached: number;
    averageFirstResponseHours: number;
    averageResolutionHours: number;
    byPriority: Record<
      TicketPriority,
      { total: number; breached: number }
    >;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        createdAt: { gte: since },
        status: {
          in: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
        },
      },
    });

    const totalTickets = tickets.length;
    const breached = tickets.filter((t) => t.slaBreached).length;
    const withinSla = totalTickets - breached;

    // Calculate averages
    let totalFirstResponse = 0;
    let firstResponseCount = 0;
    let totalResolution = 0;
    let resolutionCount = 0;

    const byPriority: Record<
      TicketPriority,
      { total: number; breached: number }
    > = {
      CRITICAL: { total: 0, breached: 0 },
      HIGH: { total: 0, breached: 0 },
      MEDIUM: { total: 0, breached: 0 },
      LOW: { total: 0, breached: 0 },
    };

    for (const ticket of tickets) {
      byPriority[ticket.priority].total++;
      if (ticket.slaBreached) {
        byPriority[ticket.priority].breached++;
      }

      if (ticket.firstRespondedAt) {
        totalFirstResponse +=
          ticket.firstRespondedAt.getTime() -
          ticket.createdAt.getTime();
        firstResponseCount++;
      }

      if (ticket.resolvedAt) {
        totalResolution +=
          ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
        resolutionCount++;
      }
    }

    const msToHours = (ms: number) => ms / (1000 * 60 * 60);

    return {
      totalTickets,
      withinSla,
      breached,
      averageFirstResponseHours:
        firstResponseCount > 0
          ? Math.round(
              (msToHours(totalFirstResponse / firstResponseCount) *
                10) /
                10,
            )
          : 0,
      averageResolutionHours:
        resolutionCount > 0
          ? Math.round(
              (msToHours(totalResolution / resolutionCount) * 10) /
                10,
            )
          : 0,
      byPriority,
    };
  }
}
