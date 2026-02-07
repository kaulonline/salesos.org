import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationStatus } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';
import { ApnsPushService } from './apns-push.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly apnsPushService: ApnsPushService,
  ) {}

  /**
   * Process scheduled notifications every minute
   * Uses atomic claim to prevent race conditions in cluster mode
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    const now = new Date();

    // Atomically claim notifications by updating status in a single query
    // This prevents multiple cluster workers from processing the same notification
    const claimedNotifications = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`
      UPDATE push_notifications
      SET status = 'SENT'::"NotificationStatus", "updatedAt" = NOW()
      WHERE id IN (
        SELECT id FROM push_notifications
        WHERE status = 'PENDING'::"NotificationStatus"
          AND "scheduledFor" <= ${now}
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;

    if (claimedNotifications.length === 0) {
      return;
    }

    // Fetch full notification data for claimed IDs
    const scheduledNotifications = await this.prisma.pushNotification.findMany({
      where: {
        id: { in: claimedNotifications.map((n) => n.id) },
      },
    });

    this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

    for (const notification of scheduledNotifications) {
      try {
        // Skip notifications without a valid userId
        if (!notification.userId) {
          this.logger.warn(`Skipping notification ${notification.id}: no userId`);
          continue;
        }

        // Try WebSocket first
        const wsPushed = this.notificationsGateway.pushToUser(notification.userId, {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          priority: notification.priority,
          action: notification.action || undefined,
          actionData: notification.actionData as Record<string, any> | undefined,
          createdAt: notification.createdAt,
        });

        let delivered = wsPushed;

        // Fallback to APNs if WebSocket failed
        if (!wsPushed) {
          const apnsResult = await this.apnsPushService.sendToUser(
            notification.userId,
            notification.title,
            notification.body,
            {
              data: {
                notificationId: notification.id,
                type: notification.type,
                action: notification.action,
              },
              notificationId: notification.id,
            },
          );
          delivered = apnsResult.sent > 0;
        }

        // Update status to DELIVERED if successful, back to PENDING if failed
        await this.prisma.pushNotification.update({
          where: { id: notification.id },
          data: {
            status: delivered ? NotificationStatus.DELIVERED : NotificationStatus.PENDING,
            sentAt: delivered ? new Date() : undefined,
            errorMessage: delivered ? undefined : 'Failed to deliver via WebSocket and APNs',
          },
        });

        if (delivered) {
          this.logger.debug(`Delivered scheduled notification ${notification.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process notification ${notification.id}:`, error);
        await this.prisma.pushNotification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
  }

  /**
   * Process task reminders - runs every 5 minutes
   * Uses atomic claim to prevent race conditions in cluster mode
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processTaskReminders() {
    const now = new Date();

    // Atomically claim tasks by setting reminderSent = true first
    const claimedTasks = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`
      UPDATE "Task"
      SET "reminderSent" = true, "updatedAt" = NOW()
      WHERE id IN (
        SELECT id FROM "Task"
        WHERE "reminderDate" <= ${now}
          AND status != 'COMPLETED'
          AND "reminderSent" = false
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;

    if (claimedTasks.length === 0) {
      return;
    }

    // Fetch full task data with owner
    const upcomingTasks = await this.prisma.task.findMany({
      where: {
        id: { in: claimedTasks.map((t) => t.id) },
      },
      include: {
        owner: true,
      },
    });

    this.logger.log(`Processing ${upcomingTasks.length} task reminders`);

    for (const task of upcomingTasks) {
      try {
        // Create notification
        const notification = await this.prisma.pushNotification.create({
          data: {
            userId: task.ownerId,
            title: 'Task Reminder',
            body: `"${task.subject}" is due soon`,
            type: 'TASK_REMINDER',
            priority: task.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
            status: NotificationStatus.PENDING,
            source: 'system',
            actionData: { taskId: task.id },
          },
        });

        // Deliver via WebSocket or APNs
        const wsPushed = this.notificationsGateway.pushToUser(task.ownerId, {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          priority: notification.priority,
          actionData: { taskId: task.id },
          createdAt: notification.createdAt,
        });

        if (!wsPushed) {
          await this.apnsPushService.sendToUser(
            task.ownerId,
            notification.title,
            notification.body,
            {
              data: {
                notificationId: notification.id,
                type: 'TASK_REMINDER',
                taskId: task.id,
              },
              notificationId: notification.id,
            },
          );
        }

        await this.prisma.pushNotification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.DELIVERED, sentAt: new Date() },
        });

        this.logger.debug(`Sent reminder for task ${task.id}`);
      } catch (error) {
        this.logger.error(`Failed to send reminder for task ${task.id}:`, error);
        // Revert reminderSent on failure so it can be retried
        await this.prisma.task.update({
          where: { id: task.id },
          data: { reminderSent: false },
        });
      }
    }
  }

  /**
   * Send system notification to a user (can be called from other services)
   */
  async sendSystemNotification(
    userId: string,
    title: string,
    body: string,
    options: {
      type?: string;
      priority?: string;
      action?: string;
      actionData?: Record<string, any>;
    } = {},
  ) {
    const notification = await this.prisma.pushNotification.create({
      data: {
        userId,
        title,
        body,
        type: (options.type as any) || 'SYSTEM_ALERT',
        priority: (options.priority as any) || 'NORMAL',
        action: options.action,
        actionData: options.actionData,
        status: NotificationStatus.PENDING,
        source: 'system',
      },
    });

    // Send via WebSocket for real-time in-app updates
    this.notificationsGateway.pushToUser(userId, {
      id: notification.id,
      title,
      body,
      type: notification.type,
      priority: notification.priority,
      action: options.action,
      actionData: options.actionData,
      createdAt: notification.createdAt,
    });

    // Always send via APNs to mobile devices (for background/lock screen notifications)
    await this.apnsPushService.sendToUser(userId, title, body, {
      data: {
        notificationId: notification.id,
        type: notification.type,
        action: options.action,
        ...options.actionData,
      },
      notificationId: notification.id,
    });

    await this.prisma.pushNotification.update({
      where: { id: notification.id },
      data: { status: NotificationStatus.SENT, sentAt: new Date() },
    });

    return notification;
  }
}
