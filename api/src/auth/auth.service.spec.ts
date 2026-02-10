import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLogService } from '../admin/application-log.service';
import { SystemSettingsService } from '../admin/system-settings.service';
import { PremiumEmailService } from '../email/premium-email.service';
import { SalesOSEmailService } from '../email/salesos-email.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { CsrfService } from './csrf.service';
import { CacheService } from '../cache/cache.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$10$hashedpassword',
    role: 'USER',
    avatarUrl: null,
    status: 'ACTIVE',
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    emailNotificationPreferences: {
      findUnique: jest.fn(),
    },
    partnerUser: {
      findFirst: jest.fn(),
    },
    userLicense: {
      findFirst: jest.fn(),
    },
    organizationLicense: {
      findMany: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockCache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockAppLog = {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    logTransaction: jest.fn().mockResolvedValue(undefined),
  };

  const mockSystemSettings = {
    isLoginNotificationsEnabled: jest.fn().mockResolvedValue(false),
    isGeoIpLookupEnabled: jest.fn().mockResolvedValue(false),
    get: jest.fn().mockResolvedValue(false),
  };

  const mockTokenBlacklist = {
    trackSession: jest.fn().mockResolvedValue(undefined),
    revokeToken: jest.fn().mockResolvedValue(undefined),
    untrackSession: jest.fn().mockResolvedValue(undefined),
    revokeAllUserSessions: jest.fn().mockResolvedValue(3),
    isRevoked: jest.fn().mockResolvedValue(false),
    getActiveSessionCount: jest.fn().mockResolvedValue(1),
  };

  const mockCsrf = {
    generateCsrfToken: jest.fn().mockReturnValue('mock-csrf-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: ApplicationLogService, useValue: mockAppLog },
        { provide: SystemSettingsService, useValue: mockSystemSettings },
        { provide: PremiumEmailService, useValue: { sendWelcomeEmail: jest.fn().mockResolvedValue(undefined), generateVerificationCode: jest.fn().mockReturnValue('123456'), generateResetToken: jest.fn().mockReturnValue('reset-token') } },
        { provide: SalesOSEmailService, useValue: { sendWelcomeEmail: jest.fn().mockResolvedValue(undefined), sendLoginNotificationEmail: jest.fn().mockResolvedValue(undefined), sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined), sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined), sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined) } },
        { provide: OrganizationsService, useValue: { validateOrganizationCode: jest.fn(), addOrganizationMember: jest.fn(), useOrganizationCode: jest.fn(), allocateLicenseSeat: jest.fn() } },
        { provide: TokenBlacklistService, useValue: mockTokenBlacklist },
        { provide: CsrfService, useValue: mockCsrf },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('validateUser', () => {
    it('should return user data (without passwordHash) on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null on invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nobody@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      mockCache.get.mockResolvedValueOnce(Date.now() + 900000); // locked for 15 min

      await expect(
        service.validateUser('locked@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should update last login time on successful authentication', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateUser('test@example.com', 'password123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { lastLoginAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('login', () => {
    it('should return access_token, csrf_token, and user data', async () => {
      const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER', avatarUrl: null };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);

      const result = await service.login(user);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('csrf_token', 'mock-csrf-token');
      expect(result.user).toHaveProperty('id', 'user-1');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should include organizationId in JWT when user has active membership', async () => {
      const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER', avatarUrl: null };
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        organization: { id: 'org-1', status: 'ACTIVE', name: 'Test Org' },
        role: 'MEMBER',
        isActive: true,
      });
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);

      await service.login(user);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('should track session for token revocation', async () => {
      const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'USER', avatarUrl: null };
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);

      await service.login(user);

      expect(mockTokenBlacklist.trackSession).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
    });
  });

  describe('register', () => {
    it('should create a new user and return login tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue({ ...mockUser, passwordHash: 'hashed' });
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-new', name: 'Personal' });
      mockPrisma.organizationMember.create.mockResolvedValue({});
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);

      const result = await service.register({
        email: 'new@example.com',
        password: 'securepass',
        name: 'New User',
      } as any);

      expect(result).toHaveProperty('access_token');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            name: 'New User',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password',
          name: 'Dup User',
        } as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', 'oldpass', 'newpass');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { passwordHash: 'newHash' },
        }),
      );
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrongpass', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-missing', 'pass', 'newpass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return success even for non-existent email (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@example.com');

      expect(result.success).toBe(true);
    });
  });

  describe('logout', () => {
    it('should revoke the token and untrack session', async () => {
      const expiresAt = new Date(Date.now() + 3600000);

      const result = await service.logout('jti-123', 'user-1', expiresAt);

      expect(result.success).toBe(true);
      expect(mockTokenBlacklist.revokeToken).toHaveBeenCalledWith('jti-123', expiresAt, 'user-1');
      expect(mockTokenBlacklist.untrackSession).toHaveBeenCalledWith('user-1', 'jti-123');
    });
  });

  describe('logoutAllSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const result = await service.logoutAllSessions('user-1');

      expect(result.success).toBe(true);
      expect(result.sessionsRevoked).toBe(3);
      expect(mockTokenBlacklist.revokeAllUserSessions).toHaveBeenCalledWith('user-1');
    });
  });

  describe('isTokenRevoked', () => {
    it('should check if a token is revoked', async () => {
      mockTokenBlacklist.isRevoked.mockResolvedValue(true);

      const result = await service.isTokenRevoked('jti-123');
      expect(result).toBe(true);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with organization data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        organizationMemberships: [
          {
            organizationId: 'org-1',
            role: 'MEMBER',
            organization: { id: 'org-1', name: 'Test Org', status: 'ACTIVE' },
          },
        ],
      });

      const result = await service.getUserProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.organizationId).toBe('org-1');
      expect(result.organizationName).toBe('Test Org');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('user-missing')).rejects.toThrow(UnauthorizedException);
    });
  });
});
