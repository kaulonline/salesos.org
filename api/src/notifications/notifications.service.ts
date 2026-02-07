import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType, NotificationPriority, NotificationStatus, Prisma, UserRole } from '@prisma/client';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SendNotificationDto,
  BroadcastNotificationDto,
  ScheduleNotificationDto,
  NotificationFiltersDto,
} from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== TEMPLATE MANAGEMENT ====================

  async createTemplate(dto: CreateTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        type: dto.type || NotificationType.CUSTOM,
        priority: dto.priority || NotificationPriority.NORMAL,
        channel: dto.channel,
        targetRoles: dto.targetRoles || [],
        targetLicenseTiers: dto.targetLicenseTiers || [],
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async getTemplates(activeOnly: boolean = false) {
    return this.prisma.notificationTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplateById(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.notificationTemplate.delete({ where: { id } });
  }

  // ==================== NOTIFICATION CREATION ====================

  async sendToUser(userId: string, dto: SendNotificationDto, createdBy?: string) {
    // Render template if templateId is provided
    let title = dto.title;
    let body = dto.body;

    if (dto.templateId) {
      const template = await this.getTemplateById(dto.templateId);
      title = this.renderTemplate(template.titleTemplate, dto.actionData || {});
      body = this.renderTemplate(template.bodyTemplate, dto.actionData || {});
    }

    const notification = await this.prisma.pushNotification.create({
      data: {
        userId,
        title,
        body,
        type: dto.type || NotificationType.CUSTOM,
        priority: dto.priority || NotificationPriority.NORMAL,
        templateId: dto.templateId,
        action: dto.action,
        actionData: dto.actionData as Prisma.InputJsonValue,
        metadata: dto.metadata as Prisma.InputJsonValue,
        status: NotificationStatus.PENDING,
        createdBy,
        source: createdBy ? 'admin' : 'system',
      },
    });

    return notification;
  }

  async broadcast(dto: BroadcastNotificationDto, createdBy?: string) {
    // Get target users based on filters
    const where: Prisma.UserWhereInput = { status: 'ACTIVE' };

    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      where.id = { in: dto.targetUserIds };
    }

    if (dto.targetRoles && dto.targetRoles.length > 0) {
      where.role = { in: dto.targetRoles as UserRole[] };
    }

    // If targeting by license tier, we need to join with user licenses
    let userIds: string[];

    if (dto.targetLicenseTiers && dto.targetLicenseTiers.length > 0) {
      const usersWithLicense = await this.prisma.userLicense.findMany({
        where: {
          status: 'ACTIVE',
          licenseType: {
            tier: { in: dto.targetLicenseTiers as any[] },
          },
        },
        select: { userId: true },
      });
      userIds = usersWithLicense.map((ul) => ul.userId);
    } else {
      const users = await this.prisma.user.findMany({
        where,
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    // Create notifications for all target users
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.sendToUser(userId, dto, createdBy),
      ),
    );

    return {
      count: notifications.length,
      notifications,
    };
  }

  async scheduleNotification(dto: ScheduleNotificationDto, createdBy?: string) {
    return this.prisma.pushNotification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        type: dto.type || NotificationType.CUSTOM,
        priority: dto.priority || NotificationPriority.NORMAL,
        templateId: dto.templateId,
        action: dto.action,
        actionData: dto.actionData as Prisma.InputJsonValue,
        metadata: dto.metadata as Prisma.InputJsonValue,
        status: NotificationStatus.PENDING,
        scheduledFor: new Date(dto.scheduledFor),
        createdBy,
        source: createdBy ? 'admin' : 'system',
      },
    });
  }

  // ==================== NOTIFICATION DELIVERY ====================

  async markAsSent(notificationId: string) {
    return this.prisma.pushNotification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async markAsDelivered(notificationId: string) {
    return this.prisma.pushNotification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.pushNotification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.pushNotification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.pushNotification.updateMany({
      where: {
        userId,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED] },
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  // ==================== NOTIFICATION QUERIES ====================

  async getUserNotifications(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    unreadOnly: boolean = false,
  ) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.PushNotificationWhereInput = { userId };
    if (unreadOnly) {
      where.status = { in: [NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED] };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.pushNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pushNotification.count({ where }),
      this.prisma.pushNotification.count({
        where: {
          userId,
          status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED] },
        },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getNotificationById(id: string) {
    const notification = await this.prisma.pushNotification.findUnique({
      where: { id },
      include: { template: true, user: { select: { id: true, email: true, name: true } } },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.pushNotification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.pushNotification.delete({ where: { id } });
  }

  // ==================== ADMIN QUERIES ====================

  async getNotifications(filters?: NotificationFiltersDto) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PushNotificationWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.startDate) {
      where.createdAt = { gte: new Date(filters.startDate) };
    }
    if (filters?.endDate) {
      const existingFilter = (where.createdAt as Record<string, unknown>) || {};
      where.createdAt = { ...existingFilter, lte: new Date(filters.endDate) };
    }

    const [notifications, total] = await Promise.all([
      this.prisma.pushNotification.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pushNotification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getNotificationStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.PushNotificationWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, delivered, read, failed] = await Promise.all([
      this.prisma.pushNotification.count({ where }),
      this.prisma.pushNotification.count({ where: { ...where, status: NotificationStatus.SENT } }),
      this.prisma.pushNotification.count({ where: { ...where, status: NotificationStatus.DELIVERED } }),
      this.prisma.pushNotification.count({ where: { ...where, status: NotificationStatus.READ } }),
      this.prisma.pushNotification.count({ where: { ...where, status: NotificationStatus.FAILED } }),
    ]);

    // By type
    const byType = await this.prisma.pushNotification.groupBy({
      by: ['type'],
      where,
      _count: { id: true },
    });

    // By priority
    const byPriority = await this.prisma.pushNotification.groupBy({
      by: ['priority'],
      where,
      _count: { id: true },
    });

    // Recent trend (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyTrend = await this.prisma.$queryRaw<
      Array<{ date: Date; count: number }>
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::int as count
      FROM push_notifications
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `;

    return {
      total,
      byStatus: { sent, delivered, read, failed, pending: total - sent - delivered - read - failed },
      byType: byType.map((item) => ({ type: item.type, count: item._count.id })),
      byPriority: byPriority.map((item) => ({ priority: item.priority, count: item._count.id })),
      dailyTrend: dailyTrend.map((item) => ({ date: item.date, count: Number(item.count) })),
      deliveryRate: total > 0 ? Math.round(((delivered + read) / total) * 100) : 0,
      readRate: sent + delivered + read > 0 ? Math.round((read / (sent + delivered + read)) * 100) : 0,
    };
  }

  // ==================== SCHEDULED NOTIFICATION PROCESSING ====================

  async processScheduledNotifications() {
    const now = new Date();

    const scheduledNotifications = await this.prisma.pushNotification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        scheduledFor: { lte: now },
      },
      take: 100, // Process in batches
    });

    const results = await Promise.all(
      scheduledNotifications.map((notification) =>
        this.markAsSent(notification.id),
      ),
    );

    return {
      processedCount: results.length,
      notifications: results,
    };
  }

  // ==================== UTILITY METHODS ====================

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  async getPendingNotificationsForUser(userId: string) {
    return this.prisma.pushNotification.findMany({
      where: {
        userId,
        status: NotificationStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== USER SEARCH FOR TARGETING ====================

  async searchUsers(query: string, limit: number = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }
}
