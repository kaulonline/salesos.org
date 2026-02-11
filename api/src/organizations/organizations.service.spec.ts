import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../database/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockOrganization = {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    domain: 'acme.com',
    contactEmail: 'admin@acme.com',
    contactPhone: null,
    billingEmail: null,
    address: null,
    city: null,
    state: null,
    country: null,
    postalCode: null,
    logoUrl: null,
    primaryColor: null,
    status: 'ACTIVE',
    maxMembers: 100,
    settings: null,
    metadata: null,
    notes: null,
    createdBy: 'admin-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    members: [],
    licenses: [],
    codes: [],
    _count: { members: 5, licenses: 2, codes: 3 },
  };

  const mockOrganizationCode = {
    id: 'code-1',
    code: 'ACME-2025-ABCD1234',
    organizationId: 'org-1',
    description: 'Test code',
    status: 'ACTIVE',
    maxUses: 50,
    currentUses: 10,
    validFrom: new Date('2025-01-01'),
    validUntil: new Date('2026-12-31'),
    defaultRole: 'MEMBER',
    autoAssignLicenseId: null,
    notes: null,
    createdBy: 'admin-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    organization: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp', status: 'ACTIVE' },
  };

  const mockMember = {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'MEMBER',
    isActive: true,
    joinedAt: new Date('2025-02-01'),
    department: 'Engineering',
    title: 'Developer',
    invitedBy: null,
    registrationCode: null,
    user: { id: 'user-1', email: 'user@acme.com', name: 'Test User', avatarUrl: null },
    organization: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
  };

  const mockPrisma = {
    organization: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationCode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    organizationLicense: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userLicense: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    licenseType: {
      findUnique: jest.fn(),
    },
    licenseEntitlement: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ============================================
  // ORGANIZATION CRUD
  // ============================================

  describe('createOrganization', () => {
    const createDto = {
      name: 'Acme Corp',
      slug: 'acme-corp',
      domain: 'acme.com',
      contactEmail: 'admin@acme.com',
    };

    it('should create a new organization successfully', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        ...mockOrganization,
        _count: { members: 0, licenses: 0 },
      });

      const result = await service.createOrganization(createDto as any, 'admin-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Acme Corp');
      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Acme Corp',
            slug: 'acme-corp',
            createdBy: 'admin-1',
          }),
        }),
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        slug: 'acme-corp',
      });

      await expect(
        service.createOrganization(createDto as any, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when domain already exists', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        slug: 'different-slug',
        domain: 'acme.com',
      });

      await expect(
        service.createOrganization(createDto as any, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getOrganization', () => {
    it('should return organization by ID', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.getOrganization('org-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('org-1');
      expect(result.name).toBe('Acme Corp');
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-1' } }),
      );
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrganization('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return organization by slug', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.getOrganizationBySlug('acme-corp');

      expect(result).toBeDefined();
      expect(result.slug).toBe('acme-corp');
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'acme-corp' } }),
      );
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrganizationBySlug('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllOrganizations', () => {
    it('should return paginated organizations', async () => {
      const orgs = [
        { ...mockOrganization, _count: { members: 5, licenses: 2, codes: 3 } },
      ];
      mockPrisma.organization.findMany.mockResolvedValue(orgs);
      mockPrisma.organization.count.mockResolvedValue(1);

      const result = await service.getAllOrganizations(1, 20);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].memberCount).toBe(5);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by status when provided', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);
      mockPrisma.organization.count.mockResolvedValue(0);

      await service.getAllOrganizations(1, 20, 'ACTIVE' as any);

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should support search parameter', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);
      mockPrisma.organization.count.mockResolvedValue(0);

      await service.getAllOrganizations(1, 20, undefined, 'acme');

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: 'acme', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('updateOrganization', () => {
    const updateDto = { name: 'Acme Corp Updated' };

    it('should update organization successfully', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        name: 'Acme Corp Updated',
      });

      const result = await service.updateOrganization('org-1', updateDto as any);

      expect(result.name).toBe('Acme Corp Updated');
      expect(mockPrisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'org-1' },
          data: updateDto,
        }),
      );
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganization('non-existent', updateDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when domain is taken by another org', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org-2',
        domain: 'other.com',
      });

      await expect(
        service.updateOrganization('org-1', { domain: 'other.com' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization with no active members', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationMember.count.mockResolvedValue(0);
      mockPrisma.$transaction.mockResolvedValue(undefined);

      await expect(
        service.deleteOrganization('org-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when organization has active members and force is false', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationMember.count.mockResolvedValue(5);

      await expect(
        service.deleteOrganization('org-1', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should force delete organization with active members when force is true', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationMember.count.mockResolvedValue(5);
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === 'function') {
          await fn({
            organizationCode: { deleteMany: jest.fn() },
            organizationMember: { deleteMany: jest.fn() },
            organization: { delete: jest.fn() },
          });
        }
      });

      await expect(
        service.deleteOrganization('org-1', true),
      ).resolves.toBeUndefined();
    });
  });

  // ============================================
  // ORGANIZATION CODE MANAGEMENT
  // ============================================

  describe('createOrganizationCode', () => {
    const createCodeDto = {
      organizationId: 'org-1',
      description: 'New code',
      maxUses: 100,
    };

    it('should create an organization code successfully', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);
      mockPrisma.organizationCode.create.mockResolvedValue(mockOrganizationCode);

      const result = await service.createOrganizationCode(createCodeDto as any, 'admin-1');

      expect(result).toBeDefined();
      expect(result.organizationId).toBe('org-1');
      expect(mockPrisma.organizationCode.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when code already exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationCode.findUnique.mockResolvedValue(mockOrganizationCode);

      await expect(
        service.createOrganizationCode(
          { ...createCodeDto, code: 'ACME-2025-ABCD1234' } as any,
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when auto-assign license type is invalid', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrganizationCode(
          { ...createCodeDto, autoAssignLicenseId: 'bad-id' } as any,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrganizationCode', () => {
    it('should return organization code by ID', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(mockOrganizationCode);

      const result = await service.getOrganizationCode('code-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('code-1');
    });

    it('should throw NotFoundException when code does not exist', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrganizationCode('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllOrganizationCodes', () => {
    it('should return paginated organization codes', async () => {
      mockPrisma.organizationCode.findMany.mockResolvedValue([mockOrganizationCode]);
      mockPrisma.organizationCode.count.mockResolvedValue(1);

      const result = await service.getAllOrganizationCodes(1, 20);

      expect(result.codes).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateOrganizationCode', () => {
    it('should update organization code successfully', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(mockOrganizationCode);
      mockPrisma.organizationCode.update.mockResolvedValue({
        ...mockOrganizationCode,
        description: 'Updated description',
      });

      const result = await service.updateOrganizationCode('code-1', {
        description: 'Updated description',
      } as any);

      expect(result.description).toBe('Updated description');
    });

    it('should throw NotFoundException when code does not exist', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganizationCode('non-existent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateOrganizationCode', () => {
    it('should return valid result for a valid active code', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2027-12-31'),
      });

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(true);
      expect(result.organization).toBeDefined();
      expect(result.organization!.id).toBe('org-1');
    });

    it('should return invalid when code does not exist', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);

      const result = await service.validateOrganizationCode('INVALID-CODE');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid organization code');
    });

    it('should return invalid when code is revoked', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        status: 'REVOKED',
      });

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Code is revoked');
    });

    it('should return invalid when organization is not active', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        organization: { ...mockOrganizationCode.organization, status: 'SUSPENDED' },
      });

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Organization is not active');
    });

    it('should return invalid when code has expired', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-12-31'),
      });
      mockPrisma.organizationCode.update.mockResolvedValue({});

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Code has expired');
    });

    it('should return invalid when max uses reached', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        maxUses: 10,
        currentUses: 10,
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2027-12-31'),
      });
      mockPrisma.organizationCode.update.mockResolvedValue({});

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Code has reached maximum uses');
    });

    it('should return invalid when code is not yet valid', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        validFrom: futureDate,
        validUntil: new Date('2027-12-31'),
      });

      const result = await service.validateOrganizationCode('ACME-2025-ABCD1234');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Code is not yet valid');
    });
  });

  describe('useOrganizationCode', () => {
    it('should increment usage count', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        currentUses: 5,
        maxUses: 50,
      });
      mockPrisma.organizationCode.update.mockResolvedValue({});

      await service.useOrganizationCode('ACME-2025-ABCD1234');

      expect(mockPrisma.organizationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentUses: 6,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should set status to EXHAUSTED when max uses reached', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        currentUses: 49,
        maxUses: 50,
      });
      mockPrisma.organizationCode.update.mockResolvedValue({});

      await service.useOrganizationCode('ACME-2025-ABCD1234');

      expect(mockPrisma.organizationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentUses: 50,
            status: 'EXHAUSTED',
          }),
        }),
      );
    });

    it('should throw NotFoundException when code does not exist', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(null);

      await expect(
        service.useOrganizationCode('INVALID-CODE'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeOrganizationCode', () => {
    it('should revoke code and deactivate members', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(mockOrganizationCode);
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          id: 'member-1',
          userId: 'user-1',
          user: { email: 'user@acme.com' },
        },
      ]);
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'lic-1',
        licenseTypeId: 'lt-1',
        notes: null,
      });
      mockPrisma.userLicense.update.mockResolvedValue({});
      mockPrisma.organizationLicense.updateMany.mockResolvedValue({});
      mockPrisma.organizationMember.update.mockResolvedValue({});
      mockPrisma.organizationCode.update.mockResolvedValue({});

      const result = await service.revokeOrganizationCode('code-1');

      expect(result.affectedUsers).toBe(1);
      expect(mockPrisma.organizationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REVOKED' },
        }),
      );
    });

    it('should throw BadRequestException when code is already revoked', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        status: 'REVOKED',
      });

      await expect(
        service.revokeOrganizationCode('code-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivateOrganizationCode', () => {
    it('should reactivate a revoked code and restore members', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue({
        ...mockOrganizationCode,
        status: 'REVOKED',
      });
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          id: 'member-1',
          userId: 'user-1',
          user: { email: 'user@acme.com' },
        },
      ]);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'lic-1',
        licenseTypeId: 'lt-1',
        notes: null,
        endDate: futureDate,
      });
      mockPrisma.userLicense.update.mockResolvedValue({});
      mockPrisma.organizationLicense.updateMany.mockResolvedValue({});
      mockPrisma.organizationMember.update.mockResolvedValue({});
      mockPrisma.organizationCode.update.mockResolvedValue({});

      const result = await service.reactivateOrganizationCode('code-1');

      expect(result.affectedUsers).toBe(1);
      expect(result.resumedLicenses).toBe(1);
      expect(mockPrisma.organizationCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ACTIVE' },
        }),
      );
    });

    it('should throw BadRequestException when code is not revoked', async () => {
      mockPrisma.organizationCode.findUnique.mockResolvedValue(mockOrganizationCode);

      await expect(
        service.reactivateOrganizationCode('code-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // ORGANIZATION MEMBER MANAGEMENT
  // ============================================

  describe('addOrganizationMember', () => {
    const addMemberDto = { userId: 'user-1', role: 'MEMBER' };

    it('should add a new member to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@acme.com',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.organizationMember.count.mockResolvedValue(5);
      mockPrisma.organizationMember.create.mockResolvedValue(mockMember);

      const result = await service.addOrganizationMember(
        'org-1',
        addMemberDto as any,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(mockPrisma.organizationMember.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addOrganizationMember('org-1', addMemberDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already an active member', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@acme.com',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        isActive: true,
      });

      await expect(
        service.addOrganizationMember('org-1', addMemberDto as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate an inactive member instead of creating a new one', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@acme.com',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        isActive: false,
      });
      mockPrisma.organizationMember.update.mockResolvedValue({
        ...mockMember,
        isActive: true,
      });

      const result = await service.addOrganizationMember(
        'org-1',
        addMemberDto as any,
      );

      expect(result.isActive).toBe(true);
      expect(mockPrisma.organizationMember.update).toHaveBeenCalled();
      expect(mockPrisma.organizationMember.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when organization is not active', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        status: 'SUSPENDED',
      });

      await expect(
        service.addOrganizationMember('org-1', addMemberDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when max member limit is reached', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        maxMembers: 5,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@acme.com',
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.organizationMember.count.mockResolvedValue(5);

      await expect(
        service.addOrganizationMember('org-1', addMemberDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return active members with license info', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          ...mockMember,
          user: {
            id: 'user-1',
            email: 'user@acme.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'USER',
            status: 'ACTIVE',
            lastLoginAt: null,
          },
        },
      ]);
      mockPrisma.userLicense.findMany.mockResolvedValue([
        {
          id: 'lic-1',
          userId: 'user-1',
          licenseTypeId: 'lt-1',
          status: 'ACTIVE',
          licenseType: { id: 'lt-1', name: 'Pro' },
        },
      ]);

      const result = await service.getOrganizationMembers('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].license).toBeDefined();
      expect(result[0].license!.licenseTypeName).toBe('Pro');
    });

    it('should return members without license info when none exists', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          ...mockMember,
          user: {
            id: 'user-1',
            email: 'user@acme.com',
            name: 'Test User',
            avatarUrl: null,
            role: 'USER',
            status: 'ACTIVE',
            lastLoginAt: null,
          },
        },
      ]);
      mockPrisma.userLicense.findMany.mockResolvedValue([]);

      const result = await service.getOrganizationMembers('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].license).toBeNull();
    });
  });

  describe('updateOrganizationMember', () => {
    it('should update member role', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.organizationMember.update.mockResolvedValue({
        ...mockMember,
        role: 'ADMIN',
      });

      const result = await service.updateOrganizationMember(
        'org-1',
        'user-1',
        { role: 'ADMIN' } as any,
      );

      expect(result.role).toBe('ADMIN');
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrganizationMember('org-1', 'user-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting last owner', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        role: 'OWNER',
      });
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      await expect(
        service.updateOrganizationMember('org-1', 'user-1', {
          role: 'MEMBER',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeOrganizationMember', () => {
    it('should deactivate member successfully', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        role: 'MEMBER',
      });
      mockPrisma.organizationMember.update.mockResolvedValue({
        ...mockMember,
        isActive: false,
      });

      await expect(
        service.removeOrganizationMember('org-1', 'user-1'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.organizationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(
        service.removeOrganizationMember('org-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removing last owner', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        role: 'OWNER',
        user: { email: 'owner@acme.com' },
        organization: { name: 'Acme Corp' },
      });
      mockPrisma.organizationMember.count.mockResolvedValue(1);

      await expect(
        service.removeOrganizationMember('org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserOrganization', () => {
    it('should return user organization membership', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        ...mockMember,
        organization: {
          ...mockOrganization,
          licenses: [],
        },
      });

      const result = await service.getUserOrganization('user-1');

      expect(result).toBeDefined();
      expect(result!.userId).toBe('user-1');
    });

    it('should return null when user has no organization membership', async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      const result = await service.getUserOrganization('user-1');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // ORGANIZATION LICENSE MANAGEMENT
  // ============================================

  describe('createOrganizationLicense', () => {
    const createLicenseDto = {
      organizationId: 'org-1',
      licenseTypeId: 'lt-1',
      endDate: '2026-12-31',
      totalSeats: 50,
    };

    it('should create a new organization license', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.licenseType.findUnique.mockResolvedValue({
        id: 'lt-1',
        name: 'Pro',
        tier: 'PRO',
      });
      mockPrisma.organizationLicense.findFirst.mockResolvedValue(null);
      mockPrisma.organizationLicense.create.mockResolvedValue({
        id: 'ol-1',
        ...createLicenseDto,
        licenseKey: 'IRISORG-AAAA-BBBB-CCCC',
        organization: { id: 'org-1', name: 'Acme Corp', slug: 'acme-corp' },
        licenseType: { id: 'lt-1', name: 'Pro', tier: 'PRO' },
      });

      const result = await service.createOrganizationLicense(
        createLicenseDto as any,
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(mockPrisma.organizationLicense.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when organization is not active', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...mockOrganization,
        status: 'SUSPENDED',
      });

      await expect(
        service.createOrganizationLicense(createLicenseDto as any, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when license type does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.licenseType.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrganizationLicense(createLicenseDto as any, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when active license of same type already exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.licenseType.findUnique.mockResolvedValue({
        id: 'lt-1',
        name: 'Pro',
      });
      mockPrisma.organizationLicense.findFirst.mockResolvedValue({
        id: 'ol-existing',
      });

      await expect(
        service.createOrganizationLicense(createLicenseDto as any, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateOrganizationLicense', () => {
    it('should update license successfully', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        totalSeats: 50,
        usedSeats: 10,
      });
      mockPrisma.organizationLicense.update.mockResolvedValue({
        id: 'ol-1',
        totalSeats: 100,
        usedSeats: 10,
      });

      const result = await service.updateOrganizationLicense('ol-1', {
        totalSeats: 100,
      } as any);

      expect(result.totalSeats).toBe(100);
    });

    it('should throw NotFoundException when license does not exist', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganizationLicense('non-existent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reducing seats below usage', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        totalSeats: 50,
        usedSeats: 30,
      });

      await expect(
        service.updateOrganizationLicense('ol-1', { totalSeats: 20 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('allocateLicenseSeat', () => {
    it('should allocate a seat from the license pool', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        organizationId: 'org-1',
        licenseTypeId: 'lt-1',
        status: 'ACTIVE',
        totalSeats: 50,
        usedSeats: 10,
        endDate: new Date('2026-12-31'),
        licenseKey: 'IRISORG-AAAA-BBBB-CCCC',
        organization: mockOrganization,
        licenseType: {
          id: 'lt-1',
          name: 'Pro',
          features: [{ id: 'f-1', defaultLimit: 100 }],
        },
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.userLicense.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([
        {
          id: 'ul-1',
          userId: 'user-1',
          licenseTypeId: 'lt-1',
          licenseType: { features: [] },
          user: { id: 'user-1', email: 'user@acme.com', name: 'Test User' },
        },
        {},
      ]);

      const result = await service.allocateLicenseSeat('ol-1', 'user-1', 'admin-1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-1');
    });

    it('should throw NotFoundException when org license does not exist', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.allocateLicenseSeat('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when license is not active', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        status: 'EXPIRED',
      });

      await expect(
        service.allocateLicenseSeat('ol-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no seats available', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        status: 'ACTIVE',
        totalSeats: 10,
        usedSeats: 10,
      });

      await expect(
        service.allocateLicenseSeat('ol-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is not a member', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        organizationId: 'org-1',
        status: 'ACTIVE',
        totalSeats: 50,
        usedSeats: 10,
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);

      await expect(
        service.allocateLicenseSeat('ol-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user already has this license type', async () => {
      mockPrisma.organizationLicense.findUnique.mockResolvedValue({
        id: 'ol-1',
        organizationId: 'org-1',
        licenseTypeId: 'lt-1',
        status: 'ACTIVE',
        totalSeats: 50,
        usedSeats: 10,
      });
      mockPrisma.organizationMember.findFirst.mockResolvedValue(mockMember);
      mockPrisma.userLicense.findFirst.mockResolvedValue({
        id: 'ul-existing',
        status: 'ACTIVE',
      });

      await expect(
        service.allocateLicenseSeat('ol-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deallocateLicenseSeat', () => {
    it('should deallocate a seat and return to pool', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        userId: 'user-1',
        organizationId: 'org-1',
        licenseTypeId: 'lt-1',
        user: { email: 'user@acme.com' },
      });
      mockPrisma.organizationLicense.findFirst.mockResolvedValue({
        id: 'ol-1',
        status: 'ACTIVE',
      });
      mockPrisma.$transaction.mockResolvedValue([]);

      await expect(
        service.deallocateLicenseSeat('ul-1'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user license does not exist', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue(null);

      await expect(
        service.deallocateLicenseSeat('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when license is not from an org pool', async () => {
      mockPrisma.userLicense.findUnique.mockResolvedValue({
        id: 'ul-1',
        userId: 'user-1',
        organizationId: null,
        user: { email: 'user@acme.com' },
      });

      await expect(
        service.deallocateLicenseSeat('ul-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableSeats', () => {
    it('should return available seats for active licenses', async () => {
      mockPrisma.organizationLicense.findMany.mockResolvedValue([
        {
          id: 'ol-1',
          totalSeats: 50,
          usedSeats: 30,
          endDate: new Date('2026-12-31'),
          licenseType: { id: 'lt-1', name: 'Pro', tier: 'PRO' },
        },
      ]);

      const result = await service.getAvailableSeats('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].availableSeats).toBe(20);
      expect(result[0].totalSeats).toBe(50);
      expect(result[0].usedSeats).toBe(30);
    });

    it('should return empty array when no active licenses', async () => {
      mockPrisma.organizationLicense.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSeats('org-1');

      expect(result).toHaveLength(0);
    });
  });
});
