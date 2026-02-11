import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockTemplate = {
    id: 'template-1',
    name: 'Welcome Template',
    slug: 'welcome',
    description: 'Welcome notification',
    titleTemplate: 'Welcome {{name}}',
    bodyTemplate: 'Hello {{name}}, welcome to SalesOS!',
    type: 'CUSTOM',
    priority: 'NORMAL',
    channel: 'push',
    targetRoles: [],
    targetLicenseTiers: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Test Notification',
    body: 'This is a test notification',
    type: 'CUSTOM',
    priority: 'NORMAL',
    templateId: null,
    action: null,
    actionData: null,
    metadata: null,
    status: 'PENDING',
    scheduledFor: null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    createdBy: null,
    source: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    notificationTemplate: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pushNotification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    userLicense: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== TEMPLATE MANAGEMENT ====================

  describe('createTemplate', () => {
    it('should create a notification template', async () => {
      mockPrisma.notificationTemplate.create.mockResolvedValue(mockTemplate);

      const dto = {
        name: 'Welcome Template',
        slug: 'welcome',
        description: 'Welcome notification',
        titleTemplate: 'Welcome {{name}}',
        bodyTemplate: 'Hello {{name}}, welcome to SalesOS!',
        channel: 'push',
      };

      const result = await service.createTemplate(dto as any);

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.notificationTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Welcome Template',
          slug: 'welcome',
          channel: 'push',
          type: 'CUSTOM',
          priority: 'NORMAL',
          targetRoles: [],
          targetLicenseTiers: [],
          isActive: true,
        }),
      });
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Template' };
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.notificationTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.updateTemplate('template-1', { name: 'Updated Template' });

      expect(result.name).toBe('Updated Template');
      expect(mockPrisma.notificationTemplate.update).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        data: { name: 'Updated Template' },
      });
    });

    it('should throw NotFoundException when template does not exist', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTemplate('nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTemplates', () => {
    it('should return all templates when activeOnly is false', async () => {
      mockPrisma.notificationTemplate.findMany.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates(false);

      expect(result).toEqual([mockTemplate]);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return only active templates when activeOnly is true', async () => {
      mockPrisma.notificationTemplate.findMany.mockResolvedValue([mockTemplate]);

      await service.getTemplates(true);

      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return a template by id', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.getTemplateById('template-1');

      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template is not found', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getTemplateById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete an existing template', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.notificationTemplate.delete.mockResolvedValue(mockTemplate);

      const result = await service.deleteTemplate('template-1');

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.notificationTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template-1' },
      });
    });

    it('should throw NotFoundException when template does not exist', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

      await expect(service.deleteTemplate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== NOTIFICATION CREATION ====================

  describe('sendToUser', () => {
    it('should create a notification for a user without template', async () => {
      mockPrisma.pushNotification.create.mockResolvedValue(mockNotification);

      const dto = {
        title: 'Test Notification',
        body: 'This is a test notification',
      };

      const result = await service.sendToUser('user-1', dto as any);

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Test Notification',
          body: 'This is a test notification',
          status: 'PENDING',
          source: 'system',
        }),
      });
    });

    it('should set source to admin when createdBy is provided', async () => {
      mockPrisma.pushNotification.create.mockResolvedValue({
        ...mockNotification,
        createdBy: 'admin-1',
        source: 'admin',
      });

      const dto = {
        title: 'Admin Notification',
        body: 'Created by admin',
      };

      await service.sendToUser('user-1', dto as any, 'admin-1');

      expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: 'admin-1',
          source: 'admin',
        }),
      });
    });

    it('should render template when templateId is provided', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.pushNotification.create.mockResolvedValue({
        ...mockNotification,
        title: 'Welcome John',
        body: 'Hello John, welcome to SalesOS!',
      });

      const dto = {
        title: 'ignored',
        body: 'ignored',
        templateId: 'template-1',
        actionData: { name: 'John' },
      };

      await service.sendToUser('user-1', dto as any);

      expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Welcome John',
          body: 'Hello John, welcome to SalesOS!',
        }),
      });
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all active users when no filters are given', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrisma.pushNotification.create.mockResolvedValue(mockNotification);

      const dto = {
        title: 'Broadcast',
        body: 'Hello everyone',
      };

      const result = await service.broadcast(dto as any);

      expect(result.count).toBe(2);
      expect(mockPrisma.pushNotification.create).toHaveBeenCalledTimes(2);
    });

    it('should broadcast only to targeted user ids', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
      ]);
      mockPrisma.pushNotification.create.mockResolvedValue(mockNotification);

      const dto = {
        title: 'Targeted Broadcast',
        body: 'Hello select users',
        targetUserIds: ['user-1'],
      };

      const result = await service.broadcast(dto as any);

      expect(result.count).toBe(1);
    });

    it('should broadcast to users by license tier', async () => {
      mockPrisma.userLicense.findMany.mockResolvedValue([
        { userId: 'user-3' },
        { userId: 'user-4' },
      ]);
      mockPrisma.pushNotification.create.mockResolvedValue(mockNotification);

      const dto = {
        title: 'License Broadcast',
        body: 'Hello premium users',
        targetLicenseTiers: ['PREMIUM'],
      };

      const result = await service.broadcast(dto as any);

      expect(result.count).toBe(2);
      expect(mockPrisma.userLicense.findMany).toHaveBeenCalled();
    });
  });

  describe('scheduleNotification', () => {
    it('should create a scheduled notification', async () => {
      const scheduledNotif = { ...mockNotification, scheduledFor: new Date('2026-03-01T10:00:00Z') };
      mockPrisma.pushNotification.create.mockResolvedValue(scheduledNotif);

      const dto = {
        userId: 'user-1',
        title: 'Scheduled Notification',
        body: 'This will be sent later',
        scheduledFor: '2026-03-01T10:00:00Z',
      };

      const result = await service.scheduleNotification(dto as any);

      expect(result).toEqual(scheduledNotif);
      expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Scheduled Notification',
          scheduledFor: new Date('2026-03-01T10:00:00Z'),
          status: 'PENDING',
          source: 'system',
        }),
      });
    });

    it('should set source to admin when createdBy is provided', async () => {
      mockPrisma.pushNotification.create.mockResolvedValue(mockNotification);

      const dto = {
        userId: 'user-1',
        title: 'Scheduled',
        body: 'Later',
        scheduledFor: '2026-03-01T10:00:00Z',
      };

      await service.scheduleNotification(dto as any, 'admin-1');

      expect(mockPrisma.pushNotification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: 'admin-1',
          source: 'admin',
        }),
      });
    });
  });

  // ==================== NOTIFICATION DELIVERY ====================

  describe('markAsSent', () => {
    it('should update notification status to SENT', async () => {
      const sentNotif = { ...mockNotification, status: 'SENT', sentAt: new Date() };
      mockPrisma.pushNotification.update.mockResolvedValue(sentNotif);

      const result = await service.markAsSent('notif-1');

      expect(result.status).toBe('SENT');
      expect(mockPrisma.pushNotification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: 'SENT',
          sentAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsDelivered', () => {
    it('should update notification status to DELIVERED', async () => {
      const deliveredNotif = { ...mockNotification, status: 'DELIVERED', deliveredAt: new Date() };
      mockPrisma.pushNotification.update.mockResolvedValue(deliveredNotif);

      const result = await service.markAsDelivered('notif-1');

      expect(result.status).toBe('DELIVERED');
      expect(mockPrisma.pushNotification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotif = { ...mockNotification, status: 'READ', readAt: new Date() };
      mockPrisma.pushNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.pushNotification.update.mockResolvedValue(readNotif);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.status).toBe('READ');
      expect(mockPrisma.pushNotification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(mockPrisma.pushNotification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when notification does not belong to user', async () => {
      mockPrisma.pushNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('notif-1', 'wrong-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      mockPrisma.pushNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.pushNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['PENDING', 'SENT', 'DELIVERED'] },
        },
        data: {
          status: 'READ',
          readAt: expect.any(Date),
        },
      });
    });
  });

  // ==================== NOTIFICATION QUERIES ====================

  describe('getUserNotifications', () => {
    it('should return paginated notifications for a user', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.pushNotification.count
        .mockResolvedValueOnce(1)  // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.getUserNotifications('user-1', 1, 20, false);

      expect(result.notifications).toEqual([mockNotification]);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter for unread only when requested', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([]);
      mockPrisma.pushNotification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getUserNotifications('user-1', 1, 20, true);

      expect(mockPrisma.pushNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            status: { in: ['PENDING', 'SENT', 'DELIVERED'] },
          },
        }),
      );
    });

    it('should calculate correct pagination offset', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([]);
      mockPrisma.pushNotification.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10);

      const result = await service.getUserNotifications('user-1', 3, 10, false);

      expect(mockPrisma.pushNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(5);
    });
  });

  describe('getNotificationById', () => {
    it('should return a notification with included relations', async () => {
      const notifWithRelations = {
        ...mockNotification,
        template: null,
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
      };
      mockPrisma.pushNotification.findUnique.mockResolvedValue(notifWithRelations);

      const result = await service.getNotificationById('notif-1');

      expect(result).toEqual(notifWithRelations);
      expect(mockPrisma.pushNotification.findUnique).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        include: {
          template: true,
          user: { select: { id: true, email: true, name: true } },
        },
      });
    });

    it('should throw NotFoundException when notification is not found', async () => {
      mockPrisma.pushNotification.findUnique.mockResolvedValue(null);

      await expect(service.getNotificationById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification belonging to the user', async () => {
      mockPrisma.pushNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrisma.pushNotification.delete.mockResolvedValue(mockNotification);

      const result = await service.deleteNotification('notif-1', 'user-1');

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.pushNotification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(mockPrisma.pushNotification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });

    it('should throw NotFoundException when notification does not belong to user', async () => {
      mockPrisma.pushNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('notif-1', 'wrong-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== ADMIN QUERIES ====================

  describe('getNotifications', () => {
    it('should return paginated notifications with default filters', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.pushNotification.count.mockResolvedValue(1);

      const result = await service.getNotifications();

      expect(result.notifications).toEqual([mockNotification]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should apply status and type filters', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([]);
      mockPrisma.pushNotification.count.mockResolvedValue(0);

      await service.getNotifications({
        status: 'PENDING' as any,
        type: 'CUSTOM' as any,
        page: 2,
        pageSize: 10,
      });

      expect(mockPrisma.pushNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
            type: 'CUSTOM',
          }),
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should apply date range filters', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([]);
      mockPrisma.pushNotification.count.mockResolvedValue(0);

      await service.getNotifications({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(mockPrisma.pushNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          }),
        }),
      );
    });
  });

  describe('getNotificationStats', () => {
    it('should return aggregated notification statistics', async () => {
      mockPrisma.pushNotification.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(30)   // sent
        .mockResolvedValueOnce(20)   // delivered
        .mockResolvedValueOnce(40)   // read
        .mockResolvedValueOnce(5);   // failed
      mockPrisma.pushNotification.groupBy
        .mockResolvedValueOnce([{ type: 'CUSTOM', _count: { id: 100 } }])  // byType
        .mockResolvedValueOnce([{ priority: 'NORMAL', _count: { id: 100 } }]); // byPriority
      mockPrisma.$queryRaw.mockResolvedValue([
        { date: new Date('2026-02-10'), count: 15 },
      ]);

      const result = await service.getNotificationStats();

      expect(result.total).toBe(100);
      expect(result.byStatus.sent).toBe(30);
      expect(result.byStatus.delivered).toBe(20);
      expect(result.byStatus.read).toBe(40);
      expect(result.byStatus.failed).toBe(5);
      expect(result.byStatus.pending).toBe(5); // 100 - 30 - 20 - 40 - 5
      expect(result.byType).toEqual([{ type: 'CUSTOM', count: 100 }]);
      expect(result.byPriority).toEqual([{ priority: 'NORMAL', count: 100 }]);
      expect(result.dailyTrend).toEqual([{ date: new Date('2026-02-10'), count: 15 }]);
      expect(result.deliveryRate).toBe(60); // (20+40)/100 * 100
      expect(result.readRate).toBe(44);     // 40/(30+20+40) * 100 = 44.44 -> 44
    });

    it('should handle zero notifications gracefully', async () => {
      mockPrisma.pushNotification.count.mockResolvedValue(0);
      mockPrisma.pushNotification.groupBy.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getNotificationStats();

      expect(result.total).toBe(0);
      expect(result.deliveryRate).toBe(0);
      expect(result.readRate).toBe(0);
    });
  });

  // ==================== SCHEDULED NOTIFICATION PROCESSING ====================

  describe('processScheduledNotifications', () => {
    it('should process pending scheduled notifications', async () => {
      const scheduledNotifs = [
        { ...mockNotification, id: 'notif-1', scheduledFor: new Date('2026-02-01') },
        { ...mockNotification, id: 'notif-2', scheduledFor: new Date('2026-02-02') },
      ];
      mockPrisma.pushNotification.findMany.mockResolvedValue(scheduledNotifs);
      mockPrisma.pushNotification.update
        .mockResolvedValueOnce({ ...scheduledNotifs[0], status: 'SENT' })
        .mockResolvedValueOnce({ ...scheduledNotifs[1], status: 'SENT' });

      const result = await service.processScheduledNotifications();

      expect(result.processedCount).toBe(2);
      expect(mockPrisma.pushNotification.update).toHaveBeenCalledTimes(2);
    });

    it('should return zero when no scheduled notifications are pending', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([]);

      const result = await service.processScheduledNotifications();

      expect(result.processedCount).toBe(0);
      expect(result.notifications).toEqual([]);
    });
  });

  // ==================== UTILITY METHODS ====================

  describe('getPendingNotificationsForUser', () => {
    it('should return pending notifications for a user', async () => {
      mockPrisma.pushNotification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.getPendingNotificationsForUser('user-1');

      expect(result).toEqual([mockNotification]);
      expect(mockPrisma.pushNotification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('searchUsers', () => {
    it('should return matching users', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'USER', avatarUrl: null },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.searchUsers('John');

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'John', mode: 'insensitive' } },
            { email: { contains: 'John', mode: 'insensitive' } },
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
        take: 10,
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array for short queries', async () => {
      const result = await service.searchUsers('J');

      expect(result).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array for empty queries', async () => {
      const result = await service.searchUsers('');

      expect(result).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.searchUsers('test', 5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });
});
