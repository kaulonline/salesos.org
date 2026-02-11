import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LicensingService } from './licensing.service';
import { PrismaService } from '../database/prisma.service';

describe('LicensingService', () => {
  let service: LicensingService;
  let prisma: PrismaService;

  const mockAdminUserId = 'admin-user-1';

  const mockLicenseType = {
    id: 'lt-1',
    name: 'Professional Plan',
    slug: 'professional',
    description: 'Advanced features',
    tier: 'PROFESSIONAL',
    priceMonthly: 9900,
    priceYearly: 99000,
    currency: 'USD',
    defaultDurationDays: 30,
    trialDurationDays: 14,
    maxUsers: null,
    maxConversations: 5000,
    maxMeetings: 500,
    maxDocuments: 1000,
    maxApiCalls: 10000,
    isActive: true,
    isPublic: true,
    sortOrder: 3,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    features: [
      { id: 'feat-1', featureKey: 'ai_chat', name: 'AI Chat', category: 'ai', description: 'AI chat', defaultLimit: 100, sortOrder: 1 },
      { id: 'feat-2', featureKey: 'crm_sync', name: 'CRM Sync', category: 'crm', description: 'CRM sync', defaultLimit: null, sortOrder: 10 },
    ],
    _count: { userLicenses: 5 },
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    role: 'USER',
    status: 'ACTIVE',
  };

  const mockUserLicense = {
    id: 'ul-1',
    userId: 'user-1',
    licenseTypeId: 'lt-1',
    organizationId: null,
    licenseKey: 'IRISABC-1234-5678-9ABC',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    status: 'ACTIVE',
    isTrial: false,
    trialEndDate: null,
    autoRenew: true,
    customLimits: null,
    notes: null,
    assignedBy: 'admin-user-1',
    lastVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      role: 'USER',
    },
    licenseType: {
      id: 'lt-1',
      name: 'Professional Plan',
      tier: 'PROFESSIONAL',
      features: [
        { id: 'feat-1', featureKey: 'ai_chat', name: 'AI Chat', category: 'ai', description: 'AI chat', defaultLimit: 100, sortOrder: 1 },
      ],
    },
    entitlements: [
      {
        id: 'ent-1',
        userLicenseId: 'ul-1',
        featureId: 'feat-1',
        isEnabled: true,
        usageLimit: 100,
        currentUsage: 10,
        usagePeriod: 'monthly',
        periodResetAt: new Date('2025-02-01'),
        feature: { id: 'feat-1', featureKey: 'ai_chat', name: 'AI Chat', category: 'ai', description: 'AI chat', defaultLimit: 100 },
      },
    ],
  };

  const mockPrisma = {
    licenseType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    licenseFeature: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userLicense: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    licenseEntitlement: {
      createMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    licenseUsage: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    licenseAuditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    preGeneratedLicenseKey: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    organizationLicense: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LicensingService>(LicensingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================
  // LICENSE TYPES MANAGEMENT
  // ============================================

  describe('getAllLicenseTypes', () => {
    it('should return all license types with features and user count', async () => {
      mockPrisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);

      const result = await service.getAllLicenseTypes();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Professional Plan');
      expect(result[0].userCount).toBe(5);
      expect(mockPrisma.licenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            features: expect.any(Object),
            _count: expect.any(Object),
          }),
          orderBy: { sortOrder: 'asc' },
        }),
      );
    });

    it('should return empty array when no license types exist', async () => {
      mockPrisma.licenseType.findMany.mockResolvedValue([]);

      const result = await service.getAllLicenseTypes();

      expect(result).toHaveLength(0);
    });
  });

  describe('getLicenseType', () => {
    it('should return a license type by ID with features and user count', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);

      const result = await service.getLicenseType('lt-1');

      expect(result.id).toBe('lt-1');
      expect(result.name).toBe('Professional Plan');
      expect(result.userCount).toBe(5);
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(service.getLicenseType('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createLicenseType', () => {
    const createDto = {
      name: 'Starter Plan',
      slug: 'starter',
      tier: 'STARTER' as any,
      priceMonthly: 2900,
      featureIds: ['feat-1'],
    };

    it('should create a new license type and return it', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(null);
      mockPrisma.licenseType.create.mockResolvedValue({
        ...createDto,
        id: 'lt-new',
        features: [],
        _count: { userLicenses: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.createLicenseType(createDto, mockAdminUserId);

      expect(result.userCount).toBe(0);
      expect(mockPrisma.licenseType.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Starter Plan',
            slug: 'starter',
          }),
        }),
      );
    });

    it('should throw BadRequestException when name or slug already exists', async () => {
      mockPrisma.licenseType.findFirst.mockResolvedValue(mockLicenseType);

      await expect(
        service.createLicenseType(createDto, mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLicenseType', () => {
    const updateDto = { name: 'Updated Pro Plan' };

    it('should update and return the license type', async () => {
      // getLicenseType is called internally
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.licenseType.update.mockResolvedValue({
        ...mockLicenseType,
        name: 'Updated Pro Plan',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.updateLicenseType('lt-1', updateDto, mockAdminUserId);

      expect(result.name).toBe('Updated Pro Plan');
      expect(mockPrisma.licenseType.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lt-1' },
        }),
      );
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLicenseType('nonexistent', updateDto, mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLicenseType', () => {
    it('should delete a license type with no active users', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue({
        ...mockLicenseType,
        _count: { userLicenses: 0 },
      });
      mockPrisma.licenseType.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(service.deleteLicenseType('lt-1', mockAdminUserId)).resolves.toBeUndefined();
      expect(mockPrisma.licenseType.delete).toHaveBeenCalledWith({ where: { id: 'lt-1' } });
    });

    it('should throw BadRequestException when license type has active users', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);

      await expect(
        service.deleteLicenseType('lt-1', mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteLicenseType('nonexistent', mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // LICENSE FEATURES MANAGEMENT
  // ============================================

  describe('getAllFeatures', () => {
    it('should return all features', async () => {
      const mockFeatures = [
        { id: 'feat-1', featureKey: 'ai_chat', name: 'AI Chat', category: 'ai', _count: { licenseTypes: 3 } },
      ];
      mockPrisma.licenseFeature.findMany.mockResolvedValue(mockFeatures);

      const result = await service.getAllFeatures();

      expect(result).toHaveLength(1);
      expect(result[0].featureKey).toBe('ai_chat');
    });

    it('should filter features by category', async () => {
      mockPrisma.licenseFeature.findMany.mockResolvedValue([]);

      await service.getAllFeatures('crm');

      expect(mockPrisma.licenseFeature.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'crm' },
        }),
      );
    });
  });

  describe('getFeature', () => {
    it('should return a feature by ID', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        name: 'AI Chat',
        licenseTypes: [{ id: 'lt-1', name: 'Pro', tier: 'PROFESSIONAL' }],
      });

      const result = await service.getFeature('feat-1');

      expect(result.featureKey).toBe('ai_chat');
    });

    it('should throw NotFoundException when feature does not exist', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue(null);

      await expect(service.getFeature('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFeature', () => {
    const createDto = {
      featureKey: 'new_feature',
      name: 'New Feature',
      category: 'advanced',
    };

    it('should create a new feature', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue(null);
      mockPrisma.licenseFeature.create.mockResolvedValue({
        id: 'feat-new',
        ...createDto,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.createFeature(createDto, mockAdminUserId);

      expect(result.featureKey).toBe('new_feature');
      expect(mockPrisma.licenseFeature.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: createDto }),
      );
    });

    it('should throw BadRequestException when feature key already exists', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({ id: 'feat-1', featureKey: 'new_feature' });

      await expect(
        service.createFeature(createDto, mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFeature', () => {
    it('should delete a feature', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        licenseTypes: [],
      });
      mockPrisma.licenseFeature.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(service.deleteFeature('feat-1', mockAdminUserId)).resolves.toBeUndefined();
      expect(mockPrisma.licenseFeature.delete).toHaveBeenCalledWith({ where: { id: 'feat-1' } });
    });

    it('should throw NotFoundException when feature does not exist', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteFeature('nonexistent', mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // USER LICENSE MANAGEMENT
  // ============================================

  describe('getUserLicense', () => {
    it('should return user license details by ID', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);

      const result = await service.getUserLicense('ul-1');

      expect(result.id).toBe('ul-1');
      expect(result.userId).toBe('user-1');
      expect(result.licenseKey).toBe('IRISABC-1234-5678-9ABC');
    });

    it('should throw NotFoundException when user license does not exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(null);

      await expect(service.getUserLicense('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserLicenseByUserId', () => {
    it('should return active license for an active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      mockPrisma.userLicense.findFirst.mockResolvedValue(mockUserLicense);

      const result = await service.getUserLicenseByUserId('user-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('ul-1');
    });

    it('should return null for a disabled user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'DISABLED' });

      const result = await service.getUserLicenseByUserId('user-1');

      expect(result).toBeNull();
    });

    it('should return null for a non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserLicenseByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('assignLicense', () => {
    const assignDto = {
      userId: 'user-1',
      licenseTypeId: 'lt-1',
    };

    it('should assign a license to a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);
      mockPrisma.userLicense.create.mockResolvedValue(mockUserLicense);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.assignLicense(assignDto, mockAdminUserId);

      expect(result.id).toBe('ul-1');
      expect(mockPrisma.userLicense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            licenseTypeId: 'lt-1',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignLicense(assignDto, mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.assignLicense(assignDto, mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already has an active license of this type', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.userLicense.findFirst.mockResolvedValue(mockUserLicense);

      await expect(
        service.assignLicense(assignDto, mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a trial license when isTrial is true', async () => {
      const trialDto = { ...assignDto, isTrial: true };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);
      mockPrisma.userLicense.create.mockResolvedValue({ ...mockUserLicense, status: 'TRIAL', isTrial: true });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.assignLicense(trialDto, mockAdminUserId);

      expect(mockPrisma.userLicense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'TRIAL',
            isTrial: true,
          }),
        }),
      );
    });
  });

  describe('revokeLicense', () => {
    it('should revoke an existing license', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.userLicense.update.mockResolvedValue({
        ...mockUserLicense,
        status: 'CANCELLED',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(
        service.revokeLicense('ul-1', 'Policy violation', mockAdminUserId),
      ).resolves.toBeUndefined();

      expect(mockPrisma.userLicense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ul-1' },
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });

    it('should throw NotFoundException when license does not exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeLicense('nonexistent', 'reason', mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendLicense', () => {
    it('should suspend an existing license', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.userLicense.update.mockResolvedValue({
        ...mockUserLicense,
        status: 'SUSPENDED',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(
        service.suspendLicense('ul-1', 'Investigation', mockAdminUserId),
      ).resolves.toBeUndefined();

      expect(mockPrisma.userLicense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ul-1' },
          data: expect.objectContaining({
            status: 'SUSPENDED',
          }),
        }),
      );
    });
  });

  describe('resumeLicense', () => {
    it('should resume a suspended license that has not expired', async () => {
      const suspendedLicense = {
        ...mockUserLicense,
        status: 'SUSPENDED',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
      };
      mockPrisma.userLicense.findUnique.mockResolvedValue(suspendedLicense);
      mockPrisma.userLicense.update.mockResolvedValue({
        ...suspendedLicense,
        status: 'ACTIVE',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(
        service.resumeLicense('ul-1', mockAdminUserId),
      ).resolves.toBeUndefined();

      expect(mockPrisma.userLicense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should set status to EXPIRED when resuming a license past its end date', async () => {
      const suspendedExpiredLicense = {
        ...mockUserLicense,
        status: 'SUSPENDED',
        endDate: new Date('2020-01-01'), // already past
      };
      mockPrisma.userLicense.findUnique.mockResolvedValue(suspendedExpiredLicense);
      mockPrisma.userLicense.update.mockResolvedValue({
        ...suspendedExpiredLicense,
        status: 'EXPIRED',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await service.resumeLicense('ul-1', mockAdminUserId);

      expect(mockPrisma.userLicense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'EXPIRED',
          }),
        }),
      );
    });

    it('should throw BadRequestException when license is not suspended', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense); // status: ACTIVE

      await expect(
        service.resumeLicense('ul-1', mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('renewLicense', () => {
    it('should renew a license with the given duration', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.userLicense.update.mockResolvedValue({
        ...mockUserLicense,
        status: 'ACTIVE',
        endDate: new Date(mockUserLicense.endDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
      mockPrisma.licenseEntitlement.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.renewLicense('ul-1', 30, mockAdminUserId);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.userLicense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ul-1' },
          data: expect.objectContaining({
            status: 'ACTIVE',
            isTrial: false,
            trialEndDate: null,
          }),
        }),
      );
      expect(mockPrisma.licenseEntitlement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userLicenseId: 'ul-1' },
          data: expect.objectContaining({
            currentUsage: 0,
          }),
        }),
      );
    });
  });

  describe('unassignLicense', () => {
    it('should delete a license and its entitlements', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.licenseEntitlement.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.preGeneratedLicenseKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.userLicense.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(
        service.unassignLicense('ul-1', 'No longer needed', mockAdminUserId),
      ).resolves.toBeUndefined();

      expect(mockPrisma.licenseEntitlement.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userLicenseId: 'ul-1' } }),
      );
      expect(mockPrisma.userLicense.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ul-1' } }),
      );
    });

    it('should decrement org seat count when unassigning an org license', async () => {
      const orgLicense = { ...mockUserLicense, organizationId: 'org-1' };
      mockPrisma.userLicense.findUnique.mockResolvedValue(orgLicense);
      mockPrisma.licenseEntitlement.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.preGeneratedLicenseKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.organizationLicense.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.userLicense.delete.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await service.unassignLicense('ul-1', 'Left org', mockAdminUserId);

      expect(mockPrisma.organizationLicense.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
          }),
          data: { usedSeats: { decrement: 1 } },
        }),
      );
    });
  });

  // ============================================
  // LICENSE VALIDATION & FEATURE ACCESS
  // ============================================

  describe('validateLicenseKey', () => {
    it('should return allowed=true for a valid active license key', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        licenseKey: 'IRISABC-1234-5678-9ABC',
        status: 'ACTIVE',
        endDate: futureDate,
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        licenseType: { tier: 'PROFESSIONAL' },
      });
      mockPrisma.userLicense.update.mockResolvedValue({});

      const result = await service.validateLicenseKey('IRISABC-1234-5678-9ABC');

      expect(result.allowed).toBe(true);
      expect(result.licenseTier).toBe('PROFESSIONAL');
      expect(result.licenseId).toBe('ul-1');
    });

    it('should return allowed=false for an invalid license key', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(null);

      const result = await service.validateLicenseKey('INVALID-KEY');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Invalid license key');
    });

    it('should return allowed=false for a cancelled license', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        licenseKey: 'IRISABC-1234-5678-9ABC',
        status: 'CANCELLED',
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        user: { id: 'user-1' },
        licenseType: { tier: 'PROFESSIONAL' },
      });

      const result = await service.validateLicenseKey('IRISABC-1234-5678-9ABC');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cancelled');
    });

    it('should return allowed=false for an expired license', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        licenseKey: 'IRISABC-1234-5678-9ABC',
        status: 'ACTIVE',
        endDate: new Date('2020-01-01'),
        user: { id: 'user-1' },
        licenseType: { tier: 'PROFESSIONAL' },
      });

      const result = await service.validateLicenseKey('IRISABC-1234-5678-9ABC');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('License has expired');
    });
  });

  describe('checkFeatureAccess', () => {
    it('should return allowed=true when user has valid license with the feature', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        requiresLicense: true,
        isEnabled: true,
      });
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-1',
        endDate: futureDate,
        licenseType: {
          tier: 'PROFESSIONAL',
          features: [{ featureKey: 'ai_chat' }],
        },
        entitlements: [
          {
            isEnabled: true,
            usageLimit: 100,
            currentUsage: 10,
            feature: { featureKey: 'ai_chat' },
          },
        ],
      });

      const result = await service.checkFeatureAccess('user-1', 'ai_chat');

      expect(result.allowed).toBe(true);
      expect(result.featureKey).toBe('ai_chat');
      expect(result.usageLimit).toBe(100);
      expect(result.currentUsage).toBe(10);
    });

    it('should return allowed=false when feature does not exist', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue(null);

      const result = await service.checkFeatureAccess('user-1', 'nonexistent');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature not found');
    });

    it('should return allowed=true when feature does not require a license', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'free_feature',
        requiresLicense: false,
        isEnabled: true,
      });

      const result = await service.checkFeatureAccess('user-1', 'free_feature');

      expect(result.allowed).toBe(true);
    });

    it('should return allowed=false when feature is disabled system-wide', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        requiresLicense: true,
        isEnabled: false,
      });

      const result = await service.checkFeatureAccess('user-1', 'ai_chat');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature is disabled system-wide');
    });

    it('should return allowed=false when user has no active license', async () => {
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        requiresLicense: true,
        isEnabled: true,
      });
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);

      const result = await service.checkFeatureAccess('user-1', 'ai_chat');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No active license found');
    });

    it('should return allowed=false when usage limit is reached', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-1',
        featureKey: 'ai_chat',
        requiresLicense: true,
        isEnabled: true,
      });
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-1',
        endDate: futureDate,
        licenseType: {
          tier: 'STARTER',
          features: [{ featureKey: 'ai_chat' }],
        },
        entitlements: [
          {
            isEnabled: true,
            usageLimit: 50,
            currentUsage: 50,
            feature: { featureKey: 'ai_chat' },
          },
        ],
      });

      const result = await service.checkFeatureAccess('user-1', 'ai_chat');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Usage limit reached');
    });

    it('should return allowed=false when feature is not in license plan', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      mockPrisma.licenseFeature.findUnique.mockResolvedValue({
        id: 'feat-3',
        featureKey: 'advanced_analytics',
        requiresLicense: true,
        isEnabled: true,
      });
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-1',
        endDate: futureDate,
        licenseType: {
          tier: 'STARTER',
          features: [{ featureKey: 'ai_chat' }],
        },
        entitlements: [],
      });

      const result = await service.checkFeatureAccess('user-1', 'advanced_analytics');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature not included in license plan');
    });
  });

  // ============================================
  // GENERATE LICENSE KEYS
  // ============================================

  describe('generateLicenseKeys', () => {
    it('should generate the requested number of pre-generated license keys', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.preGeneratedLicenseKey.create
        .mockResolvedValueOnce({ id: 'pgk-1', licenseKey: 'IRISAAA-1111-2222-3333' })
        .mockResolvedValueOnce({ id: 'pgk-2', licenseKey: 'IRISBBB-4444-5555-6666' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.generateLicenseKeys('lt-1', 2, mockAdminUserId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.preGeneratedLicenseKey.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.generateLicenseKeys('nonexistent', 1, mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use custom duration when provided', async () => {
      mockPrisma.licenseType.findUnique.mockResolvedValue(mockLicenseType);
      mockPrisma.preGeneratedLicenseKey.create.mockResolvedValue({ id: 'pgk-1', licenseKey: 'IRISAAA-1111-2222-3333' });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await service.generateLicenseKeys('lt-1', 1, mockAdminUserId, {
        durationDays: 90,
        isTrial: true,
        notes: 'Custom trial',
      });

      expect(mockPrisma.preGeneratedLicenseKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationDays: 90,
            isTrial: true,
            notes: 'Custom trial',
          }),
        }),
      );
    });
  });

  // ============================================
  // APPLY LICENSE KEY
  // ============================================

  describe('applyLicenseKey', () => {
    const mockPreGenKey = {
      id: 'pgk-1',
      licenseKey: 'IRISABC-1111-2222-3333',
      licenseTypeId: 'lt-1',
      durationDays: 30,
      isTrial: false,
      status: 'AVAILABLE',
      expiresAt: null,
      licenseType: mockLicenseType,
    };

    it('should apply a pre-generated key and create a user license', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue(mockPreGenKey);
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);
      mockPrisma.userLicense.create.mockResolvedValue({
        id: 'ul-new',
        licenseType: { include: { features: true } },
      });
      mockPrisma.licenseEntitlement.create.mockResolvedValue({});
      mockPrisma.preGeneratedLicenseKey.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test', email: 'test@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});
      // For the getUserLicense call at the end
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);

      const result = await service.applyLicenseKey('user-1', 'IRISABC-1111-2222-3333');

      expect(result).toBeDefined();
      expect(mockPrisma.userLicense.create).toHaveBeenCalled();
      expect(mockPrisma.preGeneratedLicenseKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLAIMED',
            claimedByUserId: 'user-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when key does not exist', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue(null);

      await expect(
        service.applyLicenseKey('user-1', 'INVALID-KEY'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when key is not available', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue({
        ...mockPreGenKey,
        status: 'CLAIMED',
      });

      await expect(
        service.applyLicenseKey('user-1', 'IRISABC-1111-2222-3333'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when key has expired', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue({
        ...mockPreGenKey,
        expiresAt: new Date('2020-01-01'),
      });
      mockPrisma.preGeneratedLicenseKey.update.mockResolvedValue({});

      await expect(
        service.applyLicenseKey('user-1', 'IRISABC-1111-2222-3333'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already has an active license of this type', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue(mockPreGenKey);
      mockPrisma.userLicense.findFirst.mockResolvedValue(mockUserLicense);

      await expect(
        service.applyLicenseKey('user-1', 'IRISABC-1111-2222-3333'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // REVOKE PRE-GENERATED KEY
  // ============================================

  describe('revokePreGeneratedKey', () => {
    it('should revoke an available pre-generated key', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue({
        id: 'pgk-1',
        licenseKey: 'IRISABC-1111-2222-3333',
        status: 'AVAILABLE',
      });
      mockPrisma.preGeneratedLicenseKey.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      await expect(
        service.revokePreGeneratedKey('pgk-1', mockAdminUserId),
      ).resolves.toBeUndefined();

      expect(mockPrisma.preGeneratedLicenseKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pgk-1' },
          data: { status: 'REVOKED' },
        }),
      );
    });

    it('should throw NotFoundException when key does not exist', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue(null);

      await expect(
        service.revokePreGeneratedKey('nonexistent', mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when key is already claimed', async () => {
      mockPrisma.preGeneratedLicenseKey.findUnique.mockResolvedValue({
        id: 'pgk-1',
        licenseKey: 'IRISABC-1111-2222-3333',
        status: 'CLAIMED',
      });

      await expect(
        service.revokePreGeneratedKey('pgk-1', mockAdminUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // DASHBOARD STATS
  // ============================================

  describe('getDashboardStats', () => {
    it('should return aggregated dashboard statistics', async () => {
      mockPrisma.userLicense.count
        .mockResolvedValueOnce(100)   // totalLicenses
        .mockResolvedValueOnce(60)    // activeLicenses
        .mockResolvedValueOnce(10)    // trialLicenses
        .mockResolvedValueOnce(25)    // expiredLicenses
        .mockResolvedValueOnce(5)     // expiringLicenses
        .mockResolvedValueOnce(15);   // recentAssignments
      mockPrisma.userLicense.groupBy
        .mockResolvedValueOnce([{ licenseTypeId: 'lt-1', _count: 60 }])  // licensesByTier
        .mockResolvedValueOnce([{ status: 'ACTIVE', _count: 60 }]);      // licensesByStatus
      mockPrisma.licenseUsage.groupBy.mockResolvedValue([
        { featureKey: 'ai_chat', _sum: { usageCount: 500 } },
      ]);
      mockPrisma.licenseType.findMany.mockResolvedValue([
        { id: 'lt-1', name: 'Professional Plan', tier: 'PROFESSIONAL' },
      ]);

      const result = await service.getDashboardStats();

      expect(result.totalLicenses).toBe(100);
      expect(result.activeLicenses).toBe(60);
      expect(result.trialLicenses).toBe(10);
      expect(result.expiredLicenses).toBe(25);
      expect(result.expiringLicenses).toBe(5);
      expect(result.recentAssignments).toBe(15);
      expect(result.tierBreakdown).toHaveLength(1);
      expect(result.tierBreakdown[0].name).toBe('Professional Plan');
      expect(result.topFeatureUsage).toHaveLength(1);
      expect(result.topFeatureUsage[0].featureKey).toBe('ai_chat');
    });
  });

  // ============================================
  // SYNC LICENSE ENTITLEMENTS
  // ============================================

  describe('syncLicenseEntitlements', () => {
    it('should create missing entitlements for a license', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        licenseType: {
          features: [
            { id: 'feat-1', featureKey: 'ai_chat', defaultLimit: 100 },
            { id: 'feat-2', featureKey: 'crm_sync', defaultLimit: null },
          ],
        },
        entitlements: [
          { featureId: 'feat-1' },
        ],
      });
      mockPrisma.licenseEntitlement.createMany.mockResolvedValue({ count: 1 });

      const result = await service.syncLicenseEntitlements('ul-1');

      expect(result.created).toBe(1);
      expect(result.existing).toBe(1);
      expect(mockPrisma.licenseEntitlement.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              userLicenseId: 'ul-1',
              featureId: 'feat-2',
              isEnabled: true,
            }),
          ]),
        }),
      );
    });

    it('should return zero created when all entitlements already exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        licenseType: {
          features: [
            { id: 'feat-1', featureKey: 'ai_chat', defaultLimit: 100 },
          ],
        },
        entitlements: [
          { featureId: 'feat-1' },
        ],
      });

      const result = await service.syncLicenseEntitlements('ul-1');

      expect(result.created).toBe(0);
      expect(result.existing).toBe(1);
      expect(mockPrisma.licenseEntitlement.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when license does not exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.syncLicenseEntitlements('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // RECORD USAGE
  // ============================================

  describe('recordUsage', () => {
    it('should increment entitlement usage and create usage log', async () => {
      const futureReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-1',
        entitlements: [
          {
            id: 'ent-1',
            usagePeriod: 'monthly',
            periodResetAt: futureReset,
          },
        ],
      });
      mockPrisma.licenseEntitlement.update.mockResolvedValue({});
      mockPrisma.licenseUsage.create.mockResolvedValue({});

      await service.recordUsage('user-1', 'ai_chat', 1);

      expect(mockPrisma.licenseEntitlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ent-1' },
          data: expect.objectContaining({
            currentUsage: { increment: 1 },
          }),
        }),
      );
      expect(mockPrisma.licenseUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userLicenseId: 'ul-1',
            featureKey: 'ai_chat',
            usageCount: 1,
          }),
        }),
      );
    });

    it('should reset usage when period has expired', async () => {
      const pastReset = new Date('2020-01-01');
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-1',
        entitlements: [
          {
            id: 'ent-1',
            usagePeriod: 'monthly',
            periodResetAt: pastReset,
          },
        ],
      });
      mockPrisma.licenseEntitlement.update.mockResolvedValue({});
      mockPrisma.licenseUsage.create.mockResolvedValue({});

      await service.recordUsage('user-1', 'ai_chat', 5);

      expect(mockPrisma.licenseEntitlement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ent-1' },
          data: expect.objectContaining({
            currentUsage: 5,
            periodResetAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should do nothing when user has no active license', async () => {
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);

      await service.recordUsage('user-1', 'ai_chat', 1);

      expect(mockPrisma.licenseEntitlement.update).not.toHaveBeenCalled();
      expect(mockPrisma.licenseUsage.create).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // AUDIT LOGS
  // ============================================

  describe('getLicenseAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'CREATE', entityType: 'LicenseType', createdAt: new Date() },
      ];
      mockPrisma.licenseAuditLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.licenseAuditLog.count.mockResolvedValue(1);

      const result = await service.getLicenseAuditLogs(1, 50);

      expect(result.logs).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter audit logs by entityType and action', async () => {
      mockPrisma.licenseAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.licenseAuditLog.count.mockResolvedValue(0);

      await service.getLicenseAuditLogs(1, 50, 'UserLicense', 'ASSIGN');

      expect(mockPrisma.licenseAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'UserLicense', action: 'ASSIGN' },
        }),
      );
    });
  });

  // ============================================
  // GET MY LICENSE / GET MY FEATURES
  // ============================================

  describe('getMyLicense', () => {
    it('should return the active license for an active user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      mockPrisma.userLicense.findFirst.mockResolvedValue(mockUserLicense);

      const result = await service.getMyLicense('user-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('ul-1');
    });

    it('should return null for a disabled user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', status: 'DISABLED' });

      const result = await service.getMyLicense('user-1');

      expect(result).toBeNull();
    });

    it('should return null for a non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getMyLicense('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('changeLicenseType', () => {
    it('should change the license type for a user license', async () => {
      const newLicenseType = {
        ...mockLicenseType,
        id: 'lt-2',
        name: 'Enterprise Plan',
        tier: 'ENTERPRISE',
        features: [
          { id: 'feat-3', featureKey: 'advanced_analytics', defaultLimit: null },
        ],
      };

      // getUserLicense mock
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.licenseType.findUnique.mockResolvedValue(newLicenseType);
      // No existing target license
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);
      mockPrisma.licenseEntitlement.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.userLicense.update.mockResolvedValue({
        ...mockUserLicense,
        licenseTypeId: 'lt-2',
        licenseType: newLicenseType,
        entitlements: [],
        user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
      });
      mockPrisma.preGeneratedLicenseKey.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Admin', email: 'admin@test.com' });
      mockPrisma.licenseAuditLog.create.mockResolvedValue({});

      const result = await service.changeLicenseType('ul-1', 'lt-2', 'Upgrade', mockAdminUserId);

      expect(result.licenseTypeId).toBe('lt-2');
      expect(mockPrisma.licenseEntitlement.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userLicenseId: 'ul-1' },
        }),
      );
    });

    it('should throw NotFoundException when new license type does not exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(mockUserLicense);
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.changeLicenseType('ul-1', 'nonexistent', undefined, mockAdminUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
