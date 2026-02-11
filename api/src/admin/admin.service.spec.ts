import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLogService } from './application-log.service';
import { SalesOSEmailService } from '../email/salesos-email.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
    },
    meetingSession: {
      count: jest.fn(),
    },
    meetingInsight: {
      count: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
    opportunity: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    feedbackEntry: {
      groupBy: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    featureFlag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    integrationConfig: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    adminAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    signalRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    agentConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    agentExecution: {
      findUnique: jest.fn(),
    },
    apiUsageSummary: {
      aggregate: jest.fn(),
    },
    apiUsageLog: {
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockAppLog = {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    logTransaction: jest.fn().mockResolvedValue(undefined),
  };

  const mockModuleRef = {
    get: jest.fn().mockReturnValue(null),
  };

  const mockEmailService = {
    generateVerificationCode: jest.fn().mockReturnValue('123456'),
    generateResetToken: jest.fn().mockReturnValue('reset-token-abc'),
    sendForgotPasswordEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // Re-apply default mock implementations after reset
    mockAppLog.logTransaction.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: ApplicationLogService, useValue: mockAppLog },
        { provide: ModuleRef, useValue: mockModuleRef },
        { provide: SalesOSEmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getDashboardStats', () => {
    it('should return aggregated dashboard statistics', async () => {
      // User stats
      mockPrisma.user.count
        .mockResolvedValueOnce(100)  // total
        .mockResolvedValueOnce(85)   // active
        .mockResolvedValueOnce(10)   // newThisMonth
        .mockResolvedValueOnce(100); // for conversation avgPerUser

      // Conversation stats
      mockPrisma.conversation.count
        .mockResolvedValueOnce(500)  // total
        .mockResolvedValueOnce(50);  // thisWeek

      // Meeting stats
      mockPrisma.meetingSession.count
        .mockResolvedValueOnce(200)  // total
        .mockResolvedValueOnce(30)   // scheduled
        .mockResolvedValueOnce(150); // completed
      mockPrisma.meetingInsight.count.mockResolvedValueOnce(450);

      // CRM stats
      mockPrisma.lead.count.mockResolvedValueOnce(300);
      mockPrisma.opportunity.count.mockResolvedValueOnce(50);
      mockPrisma.opportunity.aggregate.mockResolvedValueOnce({
        _sum: { amount: 1500000 },
      });

      // System stats
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      mockPrisma.systemConfig.count.mockResolvedValueOnce(5);
      mockPrisma.featureFlag.count.mockResolvedValueOnce(3);
      mockPrisma.integrationConfig.count.mockResolvedValueOnce(2);

      // AI stats
      mockPrisma.apiUsageSummary.aggregate.mockResolvedValueOnce({
        _sum: { totalTokens: 500000, totalCost: 25.5, totalApiCalls: 1000 },
      });
      mockPrisma.apiUsageLog.aggregate.mockResolvedValueOnce({
        _avg: { latencyMs: 350 },
      });

      // Feedback
      mockPrisma.feedbackEntry.groupBy.mockResolvedValueOnce([
        { rating: 'POSITIVE', _count: 80 },
        { rating: 'NEGATIVE', _count: 20 },
      ]);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('users');
      expect(result.users.total).toBe(100);
      expect(result.users.active).toBe(85);
      expect(result.users.newThisMonth).toBe(10);
      expect(result).toHaveProperty('conversations');
      expect(result).toHaveProperty('meetings');
      expect(result).toHaveProperty('crm');
      expect(result).toHaveProperty('ai');
      expect(result).toHaveProperty('system');
      expect(result.crm.totalPipelineValue).toBe(1500000);
      expect(result.ai.feedbackScore).toBe(80);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'alice@example.com',
          name: 'Alice',
          role: 'USER',
          status: 'ACTIVE',
          avatarUrl: null,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { conversations: 5, leads: 3, opportunities: 2 },
          organizationMemberships: [],
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getAllUsers(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.items[0]).toHaveProperty('conversationCount', 5);
    });

    it('should filter by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getAllUsers(1, 20, 'alice');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getAllUsers(1, 20, undefined, 'ADMIN');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });
  });

  describe('getUser', () => {
    it('should return a user by ID', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE',
        avatarUrl: null,
        settings: {},
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { conversations: 5, leads: 3, opportunities: 2, activities: 10 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user and log audit action', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        status: 'ACTIVE',
        avatarUrl: null,
        settings: {},
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { conversations: 0, leads: 0, opportunities: 0, activities: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.updateUser('user-1', { role: 'ADMIN' } as any, 'admin-1');

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { role: 'ADMIN' },
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent', { role: 'ADMIN' } as any, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and log audit action', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-2', email: 'user@example.com', name: 'User' })
        .mockResolvedValueOnce({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.user.delete.mockResolvedValue({});
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.deleteUser('user-2', 'admin-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
    });

    it('should throw BadRequestException when trying to self-delete', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', status: 'SUSPENDED' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.suspendUser('user-1', 'admin-1');

      expect(result.status).toBe('SUSPENDED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { status: 'SUSPENDED' },
        }),
      );
    });
  });

  describe('activateUser', () => {
    it('should activate a user', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.activateUser('user-1', 'admin-1');

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'UPDATE', entityType: 'User', userId: 'admin-1', timestamp: new Date() },
      ];

      mockPrisma.adminAuditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.adminAuditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by userId', async () => {
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({ userId: 'admin-1' });

      expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'admin-1' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(0);

      await service.getAuditLogs({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configs with secrets masked', async () => {
      const mockConfigs = [
        { key: 'app_url', value: 'https://example.com', isSecret: false, category: 'general' },
        { key: 'api_key', value: 'secret-value', isSecret: true, category: 'ai' },
      ];

      mockPrisma.systemConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getAllConfigs();

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe('https://example.com');
      expect(result[1].value).toBe('••••••••');
    });

    it('should filter by category', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      await service.getAllConfigs('ai');

      expect(mockPrisma.systemConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'ai' },
        }),
      );
    });
  });

  describe('getConfig', () => {
    it('should return a single config by key', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'app_url',
        value: 'https://example.com',
        isSecret: false,
      });

      const result = await service.getConfig('app_url');
      expect(result.value).toBe('https://example.com');
    });

    it('should throw NotFoundException for missing config', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

      await expect(service.getConfig('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should mask secret config values', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'api_key',
        value: 'real-secret',
        isSecret: true,
      });

      const result = await service.getConfig('api_key');
      expect(result.value).toBe('••••••••');
    });
  });

  describe('updateConfig', () => {
    it('should update a config and log audit action', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue({
        key: 'app_url',
        value: 'https://old.com',
        isSecret: false,
      });
      mockPrisma.systemConfig.update.mockResolvedValue({
        key: 'app_url',
        value: 'https://new.com',
        isSecret: false,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.updateConfig('app_url', 'https://new.com', 'admin-1');

      expect(result.value).toBe('https://new.com');
      expect(mockPrisma.systemConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'app_url' },
          data: { value: 'https://new.com', updatedBy: 'admin-1' },
        }),
      );
    });

    it('should throw NotFoundException for missing config', async () => {
      mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

      await expect(
        service.updateConfig('nonexistent', 'val', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllFeatureFlags', () => {
    it('should return all feature flags', async () => {
      const mockFlags = [
        { key: 'web_research', name: 'Web Research', enabled: true, category: 'ai' },
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFlags);

      const result = await service.getAllFeatureFlags();

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('web_research');
    });

    it('should filter by category', async () => {
      mockPrisma.featureFlag.findMany.mockResolvedValue([]);

      await service.getAllFeatureFlags('ai');

      expect(mockPrisma.featureFlag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'ai' },
        }),
      );
    });
  });

  describe('getFeatureFlag', () => {
    it('should return a feature flag by key', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'web_research',
        name: 'Web Research',
        enabled: true,
      });

      const result = await service.getFeatureFlag('web_research');
      expect(result.key).toBe('web_research');
    });

    it('should throw NotFoundException for missing flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.getFeatureFlag('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleFeatureFlag', () => {
    it('should toggle a feature flag and log audit action', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'web_research',
        enabled: true,
      });
      mockPrisma.featureFlag.update.mockResolvedValue({
        key: 'web_research',
        enabled: false,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.adminAuditLog.create.mockResolvedValue({});

      const result = await service.toggleFeatureFlag('web_research', false, 'admin-1');

      expect(result.enabled).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for an enabled flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'web_research',
        enabled: true,
        allowedUsers: [],
        allowedRoles: [],
        rolloutPercentage: 100,
      });

      const result = await service.isFeatureEnabled('web_research');
      expect(result).toBe(true);
    });

    it('should return false for a disabled flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'web_research',
        enabled: false,
        allowedUsers: [],
        allowedRoles: [],
        rolloutPercentage: 100,
      });

      const result = await service.isFeatureEnabled('web_research');
      expect(result).toBe(false);
    });

    it('should return false when flag does not exist', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await service.isFeatureEnabled('nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when user is not in allowedUsers', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'beta_feature',
        enabled: true,
        allowedUsers: ['user-2'],
        allowedRoles: [],
        rolloutPercentage: 100,
      });

      const result = await service.isFeatureEnabled('beta_feature', 'user-1');
      expect(result).toBe(false);
    });

    it('should return false when role is not in allowedRoles', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        key: 'admin_feature',
        enabled: true,
        allowedUsers: [],
        allowedRoles: ['ADMIN'],
        rolloutPercentage: 100,
      });

      const result = await service.isFeatureEnabled('admin_feature', undefined, 'USER');
      expect(result).toBe(false);
    });
  });

  describe('getAllIntegrations', () => {
    it('should return all integrations', async () => {
      const mockIntegrations = [
        { id: 'int-1', provider: 'salesforce', name: 'Salesforce' },
      ];

      mockPrisma.integrationConfig.findMany.mockResolvedValue(mockIntegrations);

      const result = await service.getAllIntegrations();

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('salesforce');
    });
  });

  describe('getIntegration', () => {
    it('should return integration by provider', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue({
        id: 'int-1',
        provider: 'salesforce',
        credentials: { apiKey: 'secret' },
      });

      const result = await service.getIntegration('salesforce');

      expect(result.provider).toBe('salesforce');
      expect(result.credentials).toEqual({ configured: true });
    });

    it('should throw NotFoundException for missing integration', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue(null);

      await expect(service.getIntegration('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should mask credentials in response', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue({
        id: 'int-1',
        provider: 'salesforce',
        credentials: { apiKey: 'secret-key' },
      });

      const result = await service.getIntegration('salesforce');
      expect(result.credentials).toEqual({ configured: true });
    });

    it('should return null credentials when none configured', async () => {
      mockPrisma.integrationConfig.findFirst.mockResolvedValue({
        id: 'int-1',
        provider: 'salesforce',
        credentials: null,
      });

      const result = await service.getIntegration('salesforce');
      expect(result.credentials).toBeNull();
    });
  });

  describe('resetUserPassword', () => {
    it('should send password reset email', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          settings: {},
        })
        .mockResolvedValueOnce({ name: 'Admin', email: 'admin@example.com' });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.adminAuditLog.create.mockResolvedValue({});
      mockEmailService.generateVerificationCode.mockReturnValue('123456');
      mockEmailService.generateResetToken.mockReturnValue('reset-token-abc');
      mockEmailService.sendForgotPasswordEmail.mockResolvedValue(true);

      const result = await service.resetUserPassword('user-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(mockEmailService.sendForgotPasswordEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          resetCode: '123456',
          resetToken: 'reset-token-abc',
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetUserPassword('nonexistent', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when email fails to send', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        settings: {},
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockEmailService.generateVerificationCode.mockReturnValue('123456');
      mockEmailService.generateResetToken.mockReturnValue('reset-token-abc');
      mockEmailService.sendForgotPasswordEmail.mockResolvedValueOnce(false);

      await expect(service.resetUserPassword('user-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSignalRules', () => {
    it('should return all signal rules', async () => {
      const mockRules = [
        { id: 'rule-1', name: 'Test Rule', isActive: true },
      ];

      mockPrisma.signalRule.findMany.mockResolvedValue(mockRules);

      const result = await service.getSignalRules();
      expect(result).toHaveLength(1);
    });

    it('should filter by isActive', async () => {
      mockPrisma.signalRule.findMany.mockResolvedValue([]);

      await service.getSignalRules(true);

      expect(mockPrisma.signalRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  describe('getSignalRule', () => {
    it('should return a signal rule by ID', async () => {
      mockPrisma.signalRule.findUnique.mockResolvedValue({ id: 'rule-1', name: 'Test Rule' });

      const result = await service.getSignalRule('rule-1');
      expect(result.id).toBe('rule-1');
    });

    it('should throw NotFoundException for missing rule', async () => {
      mockPrisma.signalRule.findUnique.mockResolvedValue(null);

      await expect(service.getSignalRule('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
