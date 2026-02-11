import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    privacyPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    dataRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversation: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    uploadedFile: {
      findMany: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
    },
    emailNotificationPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset fs mocks to defaults
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ============================================
  // getUserById
  // ============================================

  describe('getUserById', () => {
    it('should return a user profile with parsed name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'john@test.com',
        name: 'John Doe',
        avatarUrl: null,
        role: 'USER',
        status: 'ACTIVE',
        settings: { jobTitle: 'Sales Rep', phone: '555-1234' },
        lastLoginAt: new Date('2024-01-01'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const result = await service.getUserById(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('john@test.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.jobTitle).toBe('Sales Rep');
      expect(result.phone).toBe('555-1234');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use settings firstName/lastName when available', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'jane@test.com',
        name: 'Jane Smith',
        avatarUrl: null,
        role: 'USER',
        status: 'ACTIVE',
        settings: { firstName: 'Janet', lastName: 'Smithson' },
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getUserById(userId);

      expect(result.firstName).toBe('Janet');
      expect(result.lastName).toBe('Smithson');
    });

    it('should handle null settings gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        name: null,
        avatarUrl: null,
        role: 'USER',
        status: 'ACTIVE',
        settings: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getUserById(userId);

      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
      expect(result.jobTitle).toBe('');
      expect(result.department).toBe('');
      expect(result.phone).toBe('');
    });

    it('should return default empty strings for missing profile fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@test.com',
        name: 'Test',
        avatarUrl: null,
        role: 'USER',
        status: 'ACTIVE',
        settings: {},
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getUserById(userId);

      expect(result.mobilePhone).toBe('');
      expect(result.location).toBe('');
      expect(result.department).toBe('');
    });
  });

  // ============================================
  // getUserPreferences
  // ============================================

  describe('getUserPreferences', () => {
    it('should return user preferences from settings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { theme: 'dark', fontSize: 'large' },
      });

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual({ theme: 'dark', fontSize: 'large' });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserPreferences(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty object when settings is null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: null });

      const result = await service.getUserPreferences(userId);

      expect(result).toEqual({});
    });
  });

  // ============================================
  // updateUserPreferences
  // ============================================

  describe('updateUserPreferences', () => {
    it('should merge new preferences with existing ones', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { theme: 'light', language: 'en' },
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserPreferences(userId, {
        theme: 'dark',
      } as any);

      expect(result).toEqual(
        expect.objectContaining({ theme: 'dark', language: 'en' }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserPreferences(userId, { theme: 'dark' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deep merge modelConfig when provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { modelConfig: { model: 'claude', temperature: 0.7 } },
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserPreferences(userId, {
        modelConfig: { model: 'gpt-4', temperature: 0.5 },
      } as any);

      expect(result.modelConfig).toEqual({ model: 'gpt-4', temperature: 0.5 });
    });

    it('should handle null existing settings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: null });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserPreferences(userId, {
        theme: 'dark',
      } as any);

      expect(result.theme).toBe('dark');
    });
  });

  // ============================================
  // updateLastLogin
  // ============================================

  describe('updateLastLogin', () => {
    it('should update lastLoginAt to current time', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateLastLogin(userId);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  // ============================================
  // updateUserProfile
  // ============================================

  describe('updateUserProfile', () => {
    it('should update user profile with name from firstName and lastName', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ settings: {} })
        .mockResolvedValueOnce({
          id: userId,
          email: 'test@test.com',
          name: 'John Smith',
          avatarUrl: null,
          role: 'USER',
          status: 'ACTIVE',
          settings: { firstName: 'John', lastName: 'Smith' },
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserProfile(userId, {
        firstName: 'John',
        lastName: 'Smith',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({ name: 'John Smith' }),
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserProfile(userId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update settings fields like jobTitle and department', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ settings: {} })
        .mockResolvedValueOnce({
          id: userId,
          email: 'test@test.com',
          name: 'Test',
          avatarUrl: null,
          role: 'USER',
          status: 'ACTIVE',
          settings: { jobTitle: 'Manager', department: 'Sales' },
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateUserProfile(userId, {
        jobTitle: 'Manager',
        department: 'Sales',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              jobTitle: 'Manager',
              department: 'Sales',
            }),
          }),
        }),
      );
    });

    it('should update avatarUrl directly on user record', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ settings: {} })
        .mockResolvedValueOnce({
          id: userId,
          email: 'test@test.com',
          name: null,
          avatarUrl: '/new-avatar.jpg',
          role: 'USER',
          status: 'ACTIVE',
          settings: {},
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateUserProfile(userId, {
        avatarUrl: '/new-avatar.jpg',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avatarUrl: '/new-avatar.jpg' }),
        }),
      );
    });
  });

  // ============================================
  // uploadAvatar
  // ============================================

  describe('uploadAvatar', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };

    it('should upload avatar and return URL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ avatarUrl: null });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.uploadAvatar(userId, mockFile as any);

      expect(result.avatarUrl).toContain('/uploads/avatars/');
      expect(result.avatarUrl).toContain(userId);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should delete old avatar file if it exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/old-avatar.jpg',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      await service.uploadAvatar(userId, mockFile as any);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not attempt to delete old file if user has no avatar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ avatarUrl: null });
      mockPrisma.user.update.mockResolvedValue({});

      await service.uploadAvatar(userId, mockFile as any);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should use file extension from original name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ avatarUrl: null });
      mockPrisma.user.update.mockResolvedValue({});

      const pngFile = { ...mockFile, originalname: 'photo.png' };
      const result = await service.uploadAvatar(userId, pngFile as any);

      expect(result.avatarUrl).toContain('.png');
    });
  });

  // ============================================
  // deleteAvatar
  // ============================================

  describe('deleteAvatar', () => {
    it('should delete avatar file and clear DB record', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/test.jpg',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.deleteAvatar(userId);

      expect(result).toEqual({ success: true });
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarUrl: null },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAvatar(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle user with no avatar gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ avatarUrl: null });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.deleteAvatar(userId);

      expect(result).toEqual({ success: true });
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw if avatar file does not exist on disk', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        avatarUrl: '/uploads/avatars/missing.jpg',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.deleteAvatar(userId);

      expect(result).toEqual({ success: true });
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // getUserQuota
  // ============================================

  describe('getUserQuota', () => {
    it('should return quota with default values when no settings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: null });
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      const result = await service.getUserQuota(userId);

      expect(result.salesQuota).toBe(100000);
      expect(result.quotaPeriod).toBe('monthly');
      expect(result.commissionRate).toBe(0.03);
      expect(result.currentValue).toBe(0);
      expect(result.quotaProgress).toBe(0);
    });

    it('should calculate currentValue from closed won opportunities', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { salesQuota: 50000, quotaPeriod: 'monthly' },
      });
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: 10000 },
        { amount: 15000 },
      ]);

      const result = await service.getUserQuota(userId);

      expect(result.currentValue).toBe(25000);
      expect(result.quotaProgress).toBe(0.5); // 25000 / 50000
    });

    it('should cap quotaProgress at 1 when over quota', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { salesQuota: 10000 },
      });
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: 15000 },
      ]);

      const result = await service.getUserQuota(userId);

      expect(result.quotaProgress).toBe(1);
    });

    it('should handle quarterly period calculation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { quotaPeriod: 'quarterly' },
      });
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      const result = await service.getUserQuota(userId);

      expect(result.quotaPeriod).toBe('quarterly');
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should handle yearly period calculation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { quotaPeriod: 'yearly' },
      });
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      const result = await service.getUserQuota(userId);

      expect(result.quotaPeriod).toBe('yearly');
    });

    it('should handle null opportunity amounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: null },
        { amount: 5000 },
      ]);

      const result = await service.getUserQuota(userId);

      expect(result.currentValue).toBe(5000);
    });

    it('should return 0 quota progress when salesQuota is 0', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { salesQuota: 0 },
      });
      mockPrisma.opportunity.findMany.mockResolvedValue([{ amount: 1000 }]);

      const result = await service.getUserQuota(userId);

      expect(result.quotaProgress).toBe(0);
    });
  });

  // ============================================
  // updateUserQuota
  // ============================================

  describe('updateUserQuota', () => {
    it('should update salesQuota in user settings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserQuota(userId, {
        salesQuota: 200000,
      });

      expect(result.salesQuota).toBe(200000);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userId },
          data: expect.objectContaining({
            settings: expect.objectContaining({ salesQuota: 200000 }),
          }),
        }),
      );
    });

    it('should update quotaPeriod in user settings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserQuota(userId, {
        quotaPeriod: 'quarterly',
      });

      expect(result.quotaPeriod).toBe('quarterly');
    });

    it('should preserve existing settings when updating quota', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: { theme: 'dark', salesQuota: 50000 },
      });
      mockPrisma.user.update.mockResolvedValue({});

      await service.updateUserQuota(userId, { salesQuota: 100000 });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              theme: 'dark',
              salesQuota: 100000,
            }),
          }),
        }),
      );
    });

    it('should return defaults when no quota data provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: null });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUserQuota(userId, {});

      expect(result.salesQuota).toBe(100000);
      expect(result.quotaPeriod).toBe('monthly');
    });
  });

  // ============================================
  // getPrivacyPreferences
  // ============================================

  describe('getPrivacyPreferences', () => {
    const mockPrefs = {
      analyticsEnabled: false,
      personalizationEnabled: true,
      crashReportingEnabled: true,
      aiTrainingConsent: false,
      contextRetentionEnabled: true,
      marketingEmailsEnabled: false,
      productUpdatesEnabled: true,
      retentionPeriodDays: null,
      lastConsentUpdate: new Date(),
      consentVersion: '1.0',
    };

    it('should return existing privacy preferences', async () => {
      mockPrisma.privacyPreferences.findUnique.mockResolvedValue(mockPrefs);

      const result = await service.getPrivacyPreferences(userId);

      expect(result.analyticsEnabled).toBe(false);
      expect(result.consentVersion).toBe('1.0');
    });

    it('should create default preferences when none exist', async () => {
      mockPrisma.privacyPreferences.findUnique.mockResolvedValue(null);
      mockPrisma.privacyPreferences.create.mockResolvedValue(mockPrefs);

      const result = await service.getPrivacyPreferences(userId);

      expect(mockPrisma.privacyPreferences.create).toHaveBeenCalledWith({
        data: { userId },
      });
      expect(result.analyticsEnabled).toBe(false);
    });
  });

  // ============================================
  // updatePrivacyPreferences
  // ============================================

  describe('updatePrivacyPreferences', () => {
    it('should upsert privacy preferences', async () => {
      const updated = {
        analyticsEnabled: true,
        personalizationEnabled: true,
        crashReportingEnabled: true,
        aiTrainingConsent: true,
        contextRetentionEnabled: true,
        marketingEmailsEnabled: false,
        productUpdatesEnabled: true,
        retentionPeriodDays: 90,
        lastConsentUpdate: new Date(),
        consentVersion: '1.0',
      };
      mockPrisma.privacyPreferences.upsert.mockResolvedValue(updated);

      const result = await service.updatePrivacyPreferences(userId, {
        analyticsEnabled: true,
        aiTrainingConsent: true,
        retentionPeriodDays: 90,
      });

      expect(result.analyticsEnabled).toBe(true);
      expect(result.retentionPeriodDays).toBe(90);
      expect(mockPrisma.privacyPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
            analyticsEnabled: true,
          }),
          update: expect.objectContaining({
            analyticsEnabled: true,
          }),
        }),
      );
    });
  });

  // ============================================
  // createDataExportRequest
  // ============================================

  describe('createDataExportRequest', () => {
    it('should create a data export request', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue(null);
      const mockRequest = {
        id: 'req-1',
        type: 'EXPORT',
        status: 'PENDING',
        reason: 'Personal records',
        downloadUrl: null,
        downloadExpiresAt: null,
        createdAt: new Date(),
        processedAt: null,
      };
      mockPrisma.dataRequest.create.mockResolvedValue(mockRequest);
      // processDataExportAsync calls update - mock it for background processing
      mockPrisma.dataRequest.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null); // for collectUserData

      const result = await service.createDataExportRequest(
        userId,
        'Personal records',
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result.type).toBe('EXPORT');
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when pending export exists', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue({
        id: 'existing-req',
        status: 'PENDING',
      });

      await expect(
        service.createDataExportRequest(userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // createDataDeletionRequest
  // ============================================

  describe('createDataDeletionRequest', () => {
    it('should create a deletion request with valid confirmation', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue(null);
      const mockRequest = {
        id: 'req-2',
        type: 'DELETION',
        status: 'PENDING',
        reason: 'Leaving',
        downloadUrl: null,
        downloadExpiresAt: null,
        createdAt: new Date(),
        processedAt: null,
      };
      mockPrisma.dataRequest.create.mockResolvedValue(mockRequest);

      const result = await service.createDataDeletionRequest(
        userId,
        'DELETE MY DATA',
        'Leaving',
      );

      expect(result.type).toBe('DELETION');
    });

    it('should throw BadRequestException with invalid confirmation phrase', async () => {
      await expect(
        service.createDataDeletionRequest(userId, 'wrong phrase'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when pending deletion exists', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'PROCESSING',
      });

      await expect(
        service.createDataDeletionRequest(userId, 'DELETE MY DATA'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // createAccountDeletionRequest
  // ============================================

  describe('createAccountDeletionRequest', () => {
    it('should create account deletion with valid password and phrase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.dataRequest.findFirst.mockResolvedValue(null);
      const mockRequest = {
        id: 'req-3',
        type: 'DELETION',
        status: 'PENDING',
        reason: null,
        downloadUrl: null,
        downloadExpiresAt: null,
        createdAt: new Date(),
        processedAt: null,
      };
      mockPrisma.dataRequest.create.mockResolvedValue(mockRequest);

      const result = await service.createAccountDeletionRequest(
        userId,
        'my-password',
        'DELETE MY ACCOUNT',
      );

      expect(result.type).toBe('DELETION');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'my-password',
        'hashed-password',
      );
    });

    it('should throw BadRequestException with invalid confirmation phrase', async () => {
      await expect(
        service.createAccountDeletionRequest(userId, 'pass', 'wrong'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createAccountDeletionRequest(
          userId,
          'pass',
          'DELETE MY ACCOUNT',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.createAccountDeletionRequest(
          userId,
          'wrong-password',
          'DELETE MY ACCOUNT',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when pending account deletion exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.dataRequest.findFirst.mockResolvedValue({
        id: 'existing',
        status: 'PENDING',
      });

      await expect(
        service.createAccountDeletionRequest(
          userId,
          'pass',
          'DELETE MY ACCOUNT',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // getDataRequests
  // ============================================

  describe('getDataRequests', () => {
    it('should return mapped data requests', async () => {
      mockPrisma.dataRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          type: 'EXPORT',
          status: 'COMPLETED',
          reason: 'test',
          downloadUrl: '/download/1',
          downloadExpiresAt: new Date(),
          createdAt: new Date(),
          processedAt: new Date(),
        },
      ]);

      const result = await service.getDataRequests(userId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
      expect(result[0].type).toBe('EXPORT');
    });

    it('should return empty array when no requests exist', async () => {
      mockPrisma.dataRequest.findMany.mockResolvedValue([]);

      const result = await service.getDataRequests(userId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // cancelDataRequest
  // ============================================

  describe('cancelDataRequest', () => {
    it('should cancel a pending data request', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        userId,
        status: 'PENDING',
      });
      mockPrisma.dataRequest.update.mockResolvedValue({
        id: 'req-1',
        type: 'EXPORT',
        status: 'CANCELLED',
        reason: null,
        downloadUrl: null,
        downloadExpiresAt: null,
        createdAt: new Date(),
        processedAt: null,
      });

      const result = await service.cancelDataRequest(userId, 'req-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException when request not found or not pending', async () => {
      mockPrisma.dataRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelDataRequest(userId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getDataRetentionInfo
  // ============================================

  describe('getDataRetentionInfo', () => {
    it('should return retention info with user preferences', async () => {
      mockPrisma.privacyPreferences.findUnique.mockResolvedValue({
        retentionPeriodDays: 90,
      });

      const result = await service.getDataRetentionInfo(userId);

      expect(result.defaultRetentionDays).toBe(365);
      expect(result.userRetentionDays).toBe(90);
      expect(result.dataCategories).toHaveLength(5);
    });

    it('should return null userRetentionDays when no preferences exist', async () => {
      mockPrisma.privacyPreferences.findUnique.mockResolvedValue(null);

      const result = await service.getDataRetentionInfo(userId);

      expect(result.userRetentionDays).toBeNull();
    });
  });

  // ============================================
  // getStorageUsage
  // ============================================

  describe('getStorageUsage', () => {
    it('should calculate storage usage correctly', async () => {
      mockPrisma.conversation.count.mockResolvedValue(10);
      mockPrisma.uploadedFile.findMany.mockResolvedValue([
        { sizeBytes: 5000 },
        { sizeBytes: 3000 },
      ]);

      const result = await service.getStorageUsage(userId);

      expect(result.chatMessages).toBe(10 * 2048); // 10 conversations * 2048
      expect(result.documents).toBe(8000);
      expect(result.cachedFiles).toBe(Math.floor(8000 * 0.3));
      expect(result.totalBytes).toBe(
        10 * 2048 + Math.floor(8000 * 0.3) + 8000,
      );
    });

    it('should handle zero conversations and files', async () => {
      mockPrisma.conversation.count.mockResolvedValue(0);
      mockPrisma.uploadedFile.findMany.mockResolvedValue([]);

      const result = await service.getStorageUsage(userId);

      expect(result.chatMessages).toBe(0);
      expect(result.documents).toBe(0);
      expect(result.cachedFiles).toBe(0);
      expect(result.totalBytes).toBe(0);
    });

    it('should handle files with null sizeBytes', async () => {
      mockPrisma.conversation.count.mockResolvedValue(0);
      mockPrisma.uploadedFile.findMany.mockResolvedValue([
        { sizeBytes: null },
        { sizeBytes: 2000 },
      ]);

      const result = await service.getStorageUsage(userId);

      expect(result.documents).toBe(2000);
    });
  });

  // ============================================
  // clearConversationHistory
  // ============================================

  describe('clearConversationHistory', () => {
    it('should delete all conversations and return count', async () => {
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 15 });

      const result = await service.clearConversationHistory(userId);

      expect(result).toEqual({ deleted: 15 });
      expect(mockPrisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return 0 when no conversations exist', async () => {
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.clearConversationHistory(userId);

      expect(result).toEqual({ deleted: 0 });
    });
  });

  // ============================================
  // clearCache
  // ============================================

  describe('clearCache', () => {
    it('should return success', async () => {
      const result = await service.clearCache(userId);

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // getEmailNotificationPreferences
  // ============================================

  describe('getEmailNotificationPreferences', () => {
    it('should return existing preferences', async () => {
      const prefs = {
        id: 'pref-1',
        userId,
        emailsEnabled: true,
        dailyDigest: true,
      };
      mockPrisma.emailNotificationPreferences.findUnique.mockResolvedValue(
        prefs,
      );

      const result = await service.getEmailNotificationPreferences(userId);

      expect(result).toEqual(prefs);
    });

    it('should create default preferences when none exist', async () => {
      mockPrisma.emailNotificationPreferences.findUnique.mockResolvedValue(
        null,
      );
      const defaultPrefs = { id: 'new-pref', userId, emailsEnabled: true };
      mockPrisma.emailNotificationPreferences.create.mockResolvedValue(
        defaultPrefs,
      );

      const result = await service.getEmailNotificationPreferences(userId);

      expect(mockPrisma.emailNotificationPreferences.create).toHaveBeenCalledWith(
        { data: { userId } },
      );
      expect(result).toEqual(defaultPrefs);
    });
  });

  // ============================================
  // updateEmailNotificationPreferences
  // ============================================

  describe('updateEmailNotificationPreferences', () => {
    it('should update existing email notification preferences', async () => {
      const existing = { id: 'pref-1', userId, emailsEnabled: true };
      mockPrisma.emailNotificationPreferences.findUnique.mockResolvedValue(
        existing,
      );
      const updated = { ...existing, emailsEnabled: false };
      mockPrisma.emailNotificationPreferences.update.mockResolvedValue(
        updated,
      );

      const result = await service.updateEmailNotificationPreferences(userId, {
        emailsEnabled: false,
      });

      expect(result.emailsEnabled).toBe(false);
      expect(
        mockPrisma.emailNotificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId },
        data: { emailsEnabled: false },
      });
    });

    it('should create preferences if none exist', async () => {
      mockPrisma.emailNotificationPreferences.findUnique.mockResolvedValue(
        null,
      );
      const created = { id: 'new', userId, emailsEnabled: false };
      mockPrisma.emailNotificationPreferences.create.mockResolvedValue(
        created,
      );

      const result = await service.updateEmailNotificationPreferences(userId, {
        emailsEnabled: false,
      });

      expect(result).toEqual(created);
      expect(
        mockPrisma.emailNotificationPreferences.create,
      ).toHaveBeenCalledWith({
        data: { userId, emailsEnabled: false },
      });
    });

    it('should update multiple notification fields at once', async () => {
      const existing = { id: 'pref-1', userId };
      mockPrisma.emailNotificationPreferences.findUnique.mockResolvedValue(
        existing,
      );
      mockPrisma.emailNotificationPreferences.update.mockResolvedValue({
        ...existing,
        dailyDigest: false,
        weeklyReport: false,
        taskAssigned: true,
      });

      const result = await service.updateEmailNotificationPreferences(userId, {
        dailyDigest: false,
        weeklyReport: false,
        taskAssigned: true,
      });

      expect(
        mockPrisma.emailNotificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId },
        data: { dailyDigest: false, weeklyReport: false, taskAssigned: true },
      });
    });
  });
});
