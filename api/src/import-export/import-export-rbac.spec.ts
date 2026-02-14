import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../common/guards/roles.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { PrismaService } from '../database/prisma.service';

/**
 * RBAC Security Tests for Import/Export
 *
 * These tests verify that:
 * 1. Only ADMIN and OWNER can import data
 * 2. MEMBER and MANAGER roles are blocked from import operations
 * 3. Organization membership is validated before allowing access
 * 4. Guards are properly enforcing role-based permissions
 */
describe('Import/Export - RBAC Security', () => {
  let rolesGuard: RolesGuard;
  let organizationGuard: OrganizationGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const ORG_ID = 'org_test_123';
  const USER_ID = 'user_test_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        OrganizationGuard,
        Reflector,
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

    rolesGuard = module.get<RolesGuard>(RolesGuard);
    organizationGuard = module.get<OrganizationGuard>(OrganizationGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('RolesGuard - Import Endpoint Access', () => {
    const createMockContext = (organizationRole: string, requiredRoles: string[]) => {
      const mockRequest = {
        user: { userId: USER_ID },
        organizationId: ORG_ID,
        organizationRole, // Set by OrganizationGuard
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      // Mock reflector to return required roles
      jest.spyOn(reflector, 'get').mockReturnValue(requiredRoles);

      return mockContext;
    };

    it('should allow ADMIN to import data', () => {
      const context = createMockContext('ADMIN', ['ADMIN', 'OWNER']);
      const result = rolesGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow OWNER to import data', () => {
      const context = createMockContext('OWNER', ['ADMIN', 'OWNER']);
      const result = rolesGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should DENY MANAGER from importing data', () => {
      const context = createMockContext('MANAGER', ['ADMIN', 'OWNER']);
      const result = rolesGuard.canActivate(context);
      expect(result).toBe(false); // ✅ CRITICAL: MANAGER blocked
    });

    it('should DENY MEMBER from importing data', () => {
      const context = createMockContext('MEMBER', ['ADMIN', 'OWNER']);
      const result = rolesGuard.canActivate(context);
      expect(result).toBe(false); // ✅ CRITICAL: MEMBER blocked
    });

    it('should deny access when no organizationRole is set', () => {
      const mockRequest = {
        user: { userId: USER_ID, role: 'USER' }, // Global role, not org role
        organizationId: ORG_ID,
        // organizationRole is missing!
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      jest.spyOn(reflector, 'get').mockReturnValue(['ADMIN', 'OWNER']);

      const result = rolesGuard.canActivate(mockContext);
      expect(result).toBe(false); // ✅ No org role = denied
    });

    it('should use organizationRole instead of global user.role', () => {
      const mockRequest = {
        user: { userId: USER_ID, role: 'ADMIN' }, // Global ADMIN
        organizationId: ORG_ID,
        organizationRole: 'MEMBER', // But only MEMBER in this org
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      jest.spyOn(reflector, 'get').mockReturnValue(['ADMIN', 'OWNER']);

      const result = rolesGuard.canActivate(mockContext);
      expect(result).toBe(false); // ✅ Organization role takes precedence
    });
  });

  describe('OrganizationGuard - Membership Validation', () => {
    const createMockContext = (user: any, orgId: string) => {
      const mockRequest = {
        user,
        url: '/api/import-export/import',
        method: 'POST',
        headers: {},
      };

      if (orgId) {
        mockRequest.headers['x-organization-id'] = orgId;
      }

      return {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;
    };

    it('should allow access when user belongs to organization', async () => {
      const mockUser = { userId: USER_ID, organizationId: ORG_ID };
      const mockMembership = {
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'ADMIN',
        isActive: true,
      };

      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(mockMembership as any);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockContext(mockUser, ORG_ID);
      const result = await organizationGuard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          organizationId: ORG_ID,
          isActive: true,
        },
      });

      // ✅ CRITICAL: organizationRole should be set on request
      const request = context.switchToHttp().getRequest();
      expect(request.organizationRole).toBe('ADMIN');
    });

    it('should DENY access when user does not belong to organization', async () => {
      const mockUser = { userId: USER_ID, organizationId: ORG_ID };

      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockContext(mockUser, ORG_ID);

      await expect(organizationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY access when organization membership is inactive', async () => {
      const mockUser = { userId: USER_ID, organizationId: ORG_ID };
      const mockMembership = {
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'ADMIN',
        isActive: false, // ❌ Inactive
      };

      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockContext(mockUser, ORG_ID);

      await expect(organizationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should DENY access when trying to access different organization', async () => {
      const mockUser = { userId: USER_ID, organizationId: 'org_user_belongs_to' };
      const targetOrgId = 'org_different'; // Trying to access different org

      // User doesn't have membership in targetOrgId
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockContext(mockUser, targetOrgId);

      await expect(organizationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);

      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          organizationId: targetOrgId, // ✅ Checking membership in target org
          isActive: true,
        },
      });
    });
  });

  describe('Combined Guard Security - Import Flow', () => {
    it('should require both authentication AND organization membership', async () => {
      // Test flow: JwtAuthGuard -> OrganizationGuard -> RolesGuard

      const mockUser = { userId: USER_ID, organizationId: ORG_ID };
      const mockMembership = {
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'ADMIN',
        isActive: true,
      };

      // Step 1: OrganizationGuard verifies membership
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(mockMembership as any);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockRequest = {
        user: mockUser,
        organizationId: ORG_ID,
        url: '/api/import-export/import',
        method: 'POST',
        headers: {},
      };

      const orgContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const orgResult = await organizationGuard.canActivate(orgContext);
      expect(orgResult).toBe(true);
      expect(mockRequest.organizationRole).toBe('ADMIN'); // Set by OrganizationGuard

      // Step 2: RolesGuard checks if ADMIN role is allowed
      jest.spyOn(reflector, 'get').mockReturnValue(['ADMIN', 'OWNER']);

      const rolesContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const rolesResult = rolesGuard.canActivate(rolesContext);
      expect(rolesResult).toBe(true); // ✅ ADMIN is allowed
    });

    it('should block MEMBER even if they belong to organization', async () => {
      const mockUser = { userId: USER_ID, organizationId: ORG_ID };
      const mockMembership = {
        userId: USER_ID,
        organizationId: ORG_ID,
        role: 'MEMBER', // ❌ Only MEMBER role
        isActive: true,
      };

      // Step 1: OrganizationGuard allows (user belongs to org)
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(mockMembership as any);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockRequest = {
        user: mockUser,
        organizationId: ORG_ID,
        url: '/api/import-export/import',
        method: 'POST',
        headers: {},
      };

      const orgContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const orgResult = await organizationGuard.canActivate(orgContext);
      expect(orgResult).toBe(true); // Org check passes
      expect(mockRequest.organizationRole).toBe('MEMBER');

      // Step 2: RolesGuard blocks MEMBER role
      jest.spyOn(reflector, 'get').mockReturnValue(['ADMIN', 'OWNER']);

      const rolesContext = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const rolesResult = rolesGuard.canActivate(rolesContext);
      expect(rolesResult).toBe(false); // ✅ MEMBER blocked from import
    });
  });

  describe('Security Scenarios', () => {
    it('Scenario: User A (ADMIN in Org A) tries to import to Org B', async () => {
      const userA = { userId: 'user_a', organizationId: 'org_a' };
      const targetOrgB = 'org_b';

      // User A has no membership in Org B
      jest.spyOn(prisma.organizationMember, 'findFirst').mockResolvedValue(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockRequest = {
        user: userA,
        headers: { 'x-organization-id': targetOrgB },
        url: '/api/import-export/import',
        method: 'POST',
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      // ✅ EXPECTED: ForbiddenException (no membership in Org B)
      await expect(organizationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('Scenario: User tries to import without organizationId', async () => {
      const user = { userId: USER_ID }; // No organizationId

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockRequest = {
        user,
        url: '/api/import-export/import',
        method: 'POST',
        headers: {},
      };

      const context = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      // ✅ EXPECTED: ForbiddenException (no organization context)
      await expect(organizationGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
