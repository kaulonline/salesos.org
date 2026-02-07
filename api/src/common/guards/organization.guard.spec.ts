import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationGuard } from './organization.guard';
import { PrismaService } from '../../database/prisma.service';
import { REQUIRE_ORGANIZATION_KEY, ALLOW_CROSS_ORG_KEY } from '../decorators/organization.decorator';

describe('OrganizationGuard', () => {
  let guard: OrganizationGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const mockRequest = {
    user: null as any,
    organizationId: null as string | null,
    headers: {} as Record<string, string>,
    url: '/test',
    method: 'GET',
    organizationRole: null as string | null,
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            organizationMember: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<OrganizationGuard>(OrganizationGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mock request state
    mockRequest.user = null;
    mockRequest.organizationId = null;
    mockRequest.headers = {};
    mockRequest.organizationRole = null;
  });

  describe('Authentication', () => {
    it('should throw UnauthorizedException if user is not authenticated', async () => {
      mockRequest.user = null;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Admin with AllowCrossOrganization', () => {
    it('should allow admin with @AllowCrossOrganization decorator', async () => {
      mockRequest.user = { userId: 'admin-1', role: 'ADMIN' };
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === ALLOW_CROSS_ORG_KEY) return true;
        return false;
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should not allow non-admin with @AllowCrossOrganization decorator', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === ALLOW_CROSS_ORG_KEY) return true;
        return false;
      });

      // Without organizationId, should throw
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Organization Context Required (SECURITY CRITICAL)', () => {
    beforeEach(() => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    });

    it('should REJECT requests without organizationId', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = null;
      mockRequest.headers = {};

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Organization context required');
    });

    it('should REJECT requests with empty organizationId header', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.headers = { 'x-organization-id': '' };

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should accept organizationId from request object', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-123',
        role: 'MEMBER',
        isActive: true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationRole).toBe('MEMBER');
    });

    it('should accept organizationId from header', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.headers = { 'x-organization-id': 'org-456' };

      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-456',
        role: 'ADMIN',
        isActive: true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.organizationId).toBe('org-456');
    });

    it('should accept organizationId from user object', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER', organizationId: 'org-789' };

      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-789',
        role: 'OWNER',
        isActive: true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('Organization Membership Validation', () => {
    beforeEach(() => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    });

    it('should REJECT if user is not a member of the organization', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      // User is member of a different org
      (prisma.organizationMember.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Not member of requested org
        .mockResolvedValueOnce({ // Member of another org
          userId: 'user-1',
          organizationId: 'org-other',
          isActive: true,
        });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('do not have access');
    });

    it('should REJECT if user has no organization membership at all', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      (prisma.organizationMember.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Not member of requested org
        .mockResolvedValueOnce(null); // Not member of any org

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('must belong to an organization');
    });

    it('should REJECT if membership is inactive', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      // First call (with isActive: true) returns null
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValueOnce(null);
      // Second call (any membership) returns inactive
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        organizationId: 'org-123',
        isActive: false,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should store organization role in request', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-123',
        role: 'OWNER',
        isActive: true,
      });

      await guard.canActivate(mockContext);

      expect(mockRequest.organizationRole).toBe('OWNER');
    });
  });

  describe('@RequireOrganization decorator', () => {
    it('should throw if @RequireOrganization is set and no organizationId', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      (reflector.getAllAndOverride as jest.Mock).mockImplementation((key) => {
        if (key === REQUIRE_ORGANIZATION_KEY) return true;
        return false;
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Organization context required');
    });
  });

  describe('Security Edge Cases', () => {
    beforeEach(() => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    });

    it('should handle userId in different formats', async () => {
      // Some JWT strategies use 'id' instead of 'userId'
      mockRequest.user = { id: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-123',
        role: 'MEMBER',
        isActive: true,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should validate exact organization match', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = 'org-123';

      // Verify the correct where clause is used
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-123',
        role: 'MEMBER',
        isActive: true,
      });

      await guard.canActivate(mockContext);

      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'org-123',
          isActive: true,
        },
      });
    });

    it('should not allow null to bypass organization check', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = null as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should not allow undefined to bypass organization check', async () => {
      mockRequest.user = { userId: 'user-1', role: 'USER' };
      mockRequest.organizationId = undefined as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });
});
