import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PrismaService } from '../database/prisma.service';
import { SalesOSEmailService } from '../email/salesos-email.service';

// Mock bcrypt and crypto
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-random-token-hex'),
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('hashed-token'),
    }),
  }),
}));

describe('PartnersService', () => {
  let service: PartnersService;

  const mockPrisma = {
    partner: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    partnerUser: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    partnerAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
    },
    dealRegistration: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockEmailService = {
    sendPartnerInvitationEmail: jest.fn(),
  };

  const orgId = 'org-1';
  const userId = 'user-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SalesOSEmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
  });

  // ============================================
  // findAll
  // ============================================
  describe('findAll', () => {
    it('should return all partners for admin', async () => {
      const partners = [
        { id: 'p1', companyName: 'Partner A', organizationId: orgId },
        { id: 'p2', companyName: 'Partner B', organizationId: orgId },
      ];
      mockPrisma.partner.findMany.mockResolvedValue(partners);

      const result = await service.findAll({}, userId, true, orgId);

      expect(result).toEqual(partners);
      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('should allow managers to view partners', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      const result = await service.findAll({}, userId, false, orgId, 'MANAGER');

      expect(result).toEqual([]);
      expect(mockPrisma.partner.findMany).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-admin non-manager users', async () => {
      await expect(
        service.findAll({}, userId, false, orgId, 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should filter by status', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'APPROVED' }, userId, true, orgId);

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should filter by tier', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await service.findAll({ tier: 'GOLD' }, userId, true, orgId);

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier: 'GOLD' }),
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await service.findAll({ type: 'RESELLER' }, userId, true, orgId);

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'RESELLER' }),
        }),
      );
    });

    it('should filter by search with OR on companyName and website', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'acme' }, userId, true, orgId);

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { companyName: { contains: 'acme', mode: 'insensitive' } },
              { website: { contains: 'acme', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'APPROVED', tier: 'GOLD', type: 'RESELLER' }, userId, true, orgId);

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            status: 'APPROVED',
            tier: 'GOLD',
            type: 'RESELLER',
          }),
        }),
      );
    });
  });

  // ============================================
  // findOne
  // ============================================
  describe('findOne', () => {
    const mockPartner = {
      id: 'p1',
      companyName: 'Partner A',
      organizationId: orgId,
      users: [{ userId: 'user-1', user: { id: 'user-1', name: 'User', email: 'u@test.com' } }],
      partnerManager: null,
      _count: { accounts: 0, dealRegistrations: 0 },
    };

    it('should return a partner by ID for admin', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(mockPartner);

      const result = await service.findOne('p1', userId, true, orgId);

      expect(result).toEqual(mockPartner);
      expect(mockPrisma.partner.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1', organizationId: orgId },
        }),
      );
    });

    it('should return a partner for a member (non-admin)', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(mockPartner);

      const result = await service.findOne('p1', 'user-1', false, orgId);

      expect(result).toEqual(mockPartner);
    });

    it('should throw NotFoundException when partner not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-member non-admin', async () => {
      const partner = {
        ...mockPartner,
        users: [{ userId: 'other-user', user: { id: 'other-user', name: 'Other', email: 'o@test.com' } }],
      };
      mockPrisma.partner.findFirst.mockResolvedValue(partner);

      await expect(
        service.findOne('p1', 'user-1', false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // create
  // ============================================
  describe('create', () => {
    const createDto = {
      companyName: 'New Partner',
      website: 'https://newpartner.com',
    };

    it('should create a partner successfully', async () => {
      const created = { id: 'p-new', ...createDto, organizationId: orgId, status: 'PENDING' };
      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue(created);

      const result = await service.create(createDto, userId, true, orgId);

      expect(result.id).toBe('p-new');
      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            companyName: 'New Partner',
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.create(createDto, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for duplicate company name', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'existing', companyName: 'New Partner' });

      await expect(
        service.create(createDto, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default type RESELLER when not specified', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({ id: 'p-new', type: 'RESELLER' });

      await service.create({ companyName: 'X' }, userId, true, orgId);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'RESELLER' }),
        }),
      );
    });

    it('should use default tier REGISTERED when not specified', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({ id: 'p-new', tier: 'REGISTERED' });

      await service.create({ companyName: 'X' }, userId, true, orgId);

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'REGISTERED' }),
        }),
      );
    });

    it('should parse contract dates when provided', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue(null);
      mockPrisma.partner.create.mockResolvedValue({ id: 'p-new' });

      await service.create(
        { companyName: 'X', contractStartDate: '2024-01-01', contractEndDate: '2025-01-01' },
        userId,
        true,
        orgId,
      );

      expect(mockPrisma.partner.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractStartDate: new Date('2024-01-01'),
            contractEndDate: new Date('2025-01-01'),
          }),
        }),
      );
    });
  });

  // ============================================
  // update
  // ============================================
  describe('update', () => {
    const existingPartner = {
      id: 'p1',
      companyName: 'Partner A',
      organizationId: orgId,
      users: [{ userId: 'user-1' }],
    };

    it('should update a partner successfully', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(existingPartner);
      mockPrisma.partner.update.mockResolvedValue({ ...existingPartner, companyName: 'Updated' });

      const result = await service.update('p1', { companyName: 'Updated' }, userId, true, orgId);

      expect(result.companyName).toBe('Updated');
      expect(mockPrisma.partner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
        }),
      );
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.update('p1', { companyName: 'Updated' }, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when partner not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { companyName: 'Updated' }, userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // delete
  // ============================================
  describe('delete', () => {
    const existingPartner = {
      id: 'p1',
      companyName: 'Partner A',
      organizationId: orgId,
      users: [{ userId: 'user-1' }],
    };

    it('should delete a partner successfully', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(existingPartner);
      mockPrisma.partner.delete.mockResolvedValue(existingPartner);

      const result = await service.delete('p1', userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.partner.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.delete('p1', userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when partner not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getPartnerUsers
  // ============================================
  describe('getPartnerUsers', () => {
    it('should return partner users', async () => {
      const partner = {
        id: 'p1',
        organizationId: orgId,
        users: [{ userId: 'user-1' }],
      };
      const partnerUsers = [
        { id: 'pu1', userId: 'user-1', role: 'ADMIN', isPrimary: true },
      ];
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.partnerUser.findMany.mockResolvedValue(partnerUsers);

      const result = await service.getPartnerUsers('p1', userId, true, orgId);

      expect(result).toEqual(partnerUsers);
      expect(mockPrisma.partnerUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partnerId: 'p1' },
        }),
      );
    });
  });

  // ============================================
  // addPartnerUser
  // ============================================
  describe('addPartnerUser', () => {
    const partner = {
      id: 'p1',
      organizationId: orgId,
      users: [{ userId: 'user-1' }],
    };

    it('should add a user to a partner', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'User 2' });
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);
      mockPrisma.partnerUser.create.mockResolvedValue({
        id: 'pu-new',
        partnerId: 'p1',
        userId: 'user-2',
        role: 'MEMBER',
        isPrimary: false,
      });

      const result = await service.addPartnerUser('p1', { userId: 'user-2' }, userId, true, orgId);

      expect(result.id).toBe('pu-new');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.addPartnerUser('p1', { userId: 'user-2' }, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when user not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addPartnerUser('p1', { userId: 'nonexistent' }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already a member', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      mockPrisma.partnerUser.findUnique.mockResolvedValue({ id: 'pu-existing' });

      await expect(
        service.addPartnerUser('p1', { userId: 'user-2' }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other primary users when setting isPrimary', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);
      mockPrisma.partnerUser.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.partnerUser.create.mockResolvedValue({
        id: 'pu-new',
        isPrimary: true,
      });

      await service.addPartnerUser('p1', { userId: 'user-2', isPrimary: true }, userId, true, orgId);

      expect(mockPrisma.partnerUser.updateMany).toHaveBeenCalledWith({
        where: { partnerId: 'p1', isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  // ============================================
  // invitePartnerUser
  // ============================================
  describe('invitePartnerUser', () => {
    const partner = { id: 'p1', companyName: 'Partner A', organizationId: orgId };

    it('should invite an existing user to a partner', async () => {
      const existingUser = { id: 'user-2', email: 'test@test.com', settings: {} };
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: userId, name: 'Admin', email: 'admin@test.com' }) // inviter
        .mockResolvedValueOnce(existingUser); // existing user check
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue(existingUser);
      mockPrisma.partnerUser.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.partnerUser.create.mockResolvedValue({
        id: 'pu-new',
        partnerId: 'p1',
        userId: 'user-2',
        user: { id: 'user-2', name: 'Test', email: 'test@test.com' },
      });
      mockEmailService.sendPartnerInvitationEmail.mockResolvedValue(true);

      const result = await service.invitePartnerUser('p1', { email: 'test@test.com' }, userId, true, orgId);

      expect(result.id).toBe('pu-new');
      expect(result.invitationSent).toBe(true);
      expect(mockEmailService.sendPartnerInvitationEmail).toHaveBeenCalled();
    });

    it('should create a new user when email not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: userId, name: 'Admin', email: 'admin@test.com' }) // inviter
        .mockResolvedValueOnce(null); // user doesn't exist
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'new@test.com',
        settings: { partnerInvite: {} },
      });
      mockPrisma.partnerUser.create.mockResolvedValue({
        id: 'pu-new',
        partnerId: 'p1',
        userId: 'user-new',
        user: { id: 'user-new', name: null, email: 'new@test.com' },
      });
      mockEmailService.sendPartnerInvitationEmail.mockResolvedValue(true);

      const result = await service.invitePartnerUser('p1', { email: 'new@test.com', name: 'New User' }, userId, true, orgId);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            name: 'New User',
            role: 'USER',
            status: 'PENDING',
          }),
        }),
      );
      expect(result.invitationSent).toBe(true);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.invitePartnerUser('p1', { email: 'x@test.com' }, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when partner not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      await expect(
        service.invitePartnerUser('nonexistent', { email: 'x@test.com' }, userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already a member', async () => {
      const existingUser = { id: 'user-2', email: 'test@test.com', settings: {} };
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: userId, name: 'Admin', email: 'admin@test.com' })
        .mockResolvedValueOnce(existingUser);
      mockPrisma.partnerUser.findUnique.mockResolvedValue({ id: 'pu-existing' });

      await expect(
        service.invitePartnerUser('p1', { email: 'test@test.com' }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle failed email sending gracefully', async () => {
      const existingUser = { id: 'user-2', email: 'test@test.com', settings: {} };
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: userId, name: 'Admin', email: 'admin@test.com' })
        .mockResolvedValueOnce(existingUser);
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue(existingUser);
      mockPrisma.partnerUser.create.mockResolvedValue({
        id: 'pu-new',
        partnerId: 'p1',
        userId: 'user-2',
        user: { id: 'user-2', email: 'test@test.com' },
      });
      mockEmailService.sendPartnerInvitationEmail.mockResolvedValue(false);

      const result = await service.invitePartnerUser('p1', { email: 'test@test.com' }, userId, true, orgId);

      expect(result.invitationSent).toBe(false);
    });
  });

  // ============================================
  // updatePartnerUser
  // ============================================
  describe('updatePartnerUser', () => {
    it('should update a partner user role', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue({
        id: 'pu1',
        partnerId: 'p1',
        partner: { organizationId: orgId },
      });
      mockPrisma.partnerUser.update.mockResolvedValue({
        id: 'pu1',
        role: 'ADMIN',
      });

      const result = await service.updatePartnerUser('pu1', { role: 'ADMIN' as any }, userId, true, orgId);

      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.updatePartnerUser('pu1', { role: 'ADMIN' as any }, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when partner user not found', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePartnerUser('nonexistent', { role: 'ADMIN' as any }, userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when partner user belongs to different org', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue({
        id: 'pu1',
        partnerId: 'p1',
        partner: { organizationId: 'other-org' },
      });

      await expect(
        service.updatePartnerUser('pu1', { role: 'ADMIN' as any }, userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other primary users when setting isPrimary', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue({
        id: 'pu1',
        partnerId: 'p1',
        partner: { organizationId: orgId },
      });
      mockPrisma.partnerUser.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.partnerUser.update.mockResolvedValue({ id: 'pu1', isPrimary: true });

      await service.updatePartnerUser('pu1', { isPrimary: true }, userId, true, orgId);

      expect(mockPrisma.partnerUser.updateMany).toHaveBeenCalledWith({
        where: { partnerId: 'p1', isPrimary: true, id: { not: 'pu1' } },
        data: { isPrimary: false },
      });
    });
  });

  // ============================================
  // removePartnerUser
  // ============================================
  describe('removePartnerUser', () => {
    it('should remove a partner user', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue({
        id: 'pu1',
        partner: { organizationId: orgId },
      });
      mockPrisma.partnerUser.delete.mockResolvedValue({ id: 'pu1' });

      const result = await service.removePartnerUser('pu1', userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.partnerUser.delete).toHaveBeenCalledWith({ where: { id: 'pu1' } });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.removePartnerUser('pu1', userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when partner user not found', async () => {
      mockPrisma.partnerUser.findUnique.mockResolvedValue(null);

      await expect(
        service.removePartnerUser('nonexistent', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getPartnerAccounts
  // ============================================
  describe('getPartnerAccounts', () => {
    it('should return partner accounts', async () => {
      const partner = { id: 'p1', organizationId: orgId, users: [{ userId }] };
      const accounts = [{ id: 'pa1', account: { id: 'a1', name: 'Account A' } }];
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.partnerAccount.findMany.mockResolvedValue(accounts);

      const result = await service.getPartnerAccounts('p1', userId, true, orgId);

      expect(result).toEqual(accounts);
    });
  });

  // ============================================
  // assignAccount
  // ============================================
  describe('assignAccount', () => {
    const partner = { id: 'p1', organizationId: orgId, users: [{ userId }] };

    it('should assign an account to a partner', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', organizationId: orgId });
      mockPrisma.partnerAccount.findUnique.mockResolvedValue(null);
      mockPrisma.partnerAccount.create.mockResolvedValue({
        id: 'pa-new',
        partnerId: 'p1',
        accountId: 'a1',
      });

      const result = await service.assignAccount('p1', { accountId: 'a1' }, userId, true, orgId);

      expect(result.id).toBe('pa-new');
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.assignAccount('p1', { accountId: 'a1' }, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when account not found', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.assignAccount('p1', { accountId: 'nonexistent' }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when account already assigned', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', organizationId: orgId });
      mockPrisma.partnerAccount.findUnique.mockResolvedValue({ id: 'pa-existing' });

      await expect(
        service.assignAccount('p1', { accountId: 'a1' }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when account has existing exclusive assignment', async () => {
      mockPrisma.partner.findFirst.mockResolvedValue(partner);
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'a1', organizationId: orgId });
      mockPrisma.partnerAccount.findUnique.mockResolvedValue(null);
      mockPrisma.partnerAccount.findFirst.mockResolvedValue({ id: 'pa-exclusive', isExclusive: true });

      await expect(
        service.assignAccount('p1', { accountId: 'a1', isExclusive: true }, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // unassignAccount
  // ============================================
  describe('unassignAccount', () => {
    it('should unassign an account from a partner', async () => {
      mockPrisma.partnerAccount.delete.mockResolvedValue({ id: 'pa1' });

      const result = await service.unassignAccount('p1', 'a1', userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.partnerAccount.delete).toHaveBeenCalledWith({
        where: { partnerId_accountId: { partnerId: 'p1', accountId: 'a1' } },
      });
    });

    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.unassignAccount('p1', 'a1', userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // getPartnerForUser
  // ============================================
  describe('getPartnerForUser', () => {
    it('should return partner info for a user', async () => {
      const partnerUser = {
        userId,
        role: 'MEMBER',
        isPrimary: false,
        partner: {
          id: 'p1',
          companyName: 'Partner A',
          partnerManager: null,
        },
      };
      mockPrisma.partnerUser.findFirst.mockResolvedValue(partnerUser);

      const result = await service.getPartnerForUser(userId, orgId);

      expect(result.partner.companyName).toBe('Partner A');
      expect(result.role).toBe('MEMBER');
    });

    it('should throw NotFoundException when user has no partner', async () => {
      mockPrisma.partnerUser.findFirst
        .mockResolvedValueOnce(null)  // main query
        .mockResolvedValueOnce(null); // debug query
      mockPrisma.partnerUser.findMany.mockResolvedValue([]); // debug all users

      await expect(
        service.getPartnerForUser(userId, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getPortalDashboard
  // ============================================
  describe('getPortalDashboard', () => {
    it('should return portal dashboard data', async () => {
      const partnerUser = { userId, partnerId: 'p1' };
      const partner = {
        id: 'p1',
        companyName: 'Partner A',
        tier: 'GOLD',
        totalRevenue: 100000,
        totalDeals: 10,
      };
      const registrations = [{ status: 'APPROVED', _count: 5 }];

      mockPrisma.partnerUser.findFirst.mockResolvedValue(partnerUser);
      mockPrisma.partner.findUnique.mockResolvedValue(partner);
      mockPrisma.dealRegistration.groupBy.mockResolvedValue(registrations);
      mockPrisma.partnerAccount.count.mockResolvedValue(3);

      const result = await service.getPortalDashboard(userId, orgId);

      expect(result.partner.companyName).toBe('Partner A');
      expect(result.registrations.total).toBe(5);
      expect(result.assignedAccounts).toBe(3);
    });

    it('should throw ForbiddenException when user has no active partner', async () => {
      mockPrisma.partnerUser.findFirst
        .mockResolvedValueOnce(null)  // main query
        .mockResolvedValueOnce(null); // debug query

      await expect(
        service.getPortalDashboard(userId, orgId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // getPortalAccounts
  // ============================================
  describe('getPortalAccounts', () => {
    it('should return portal accounts', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.partnerAccount.findMany.mockResolvedValue([
        { account: { id: 'a1', name: 'Account A' } },
      ]);

      const result = await service.getPortalAccounts(userId, undefined, orgId);

      expect(result).toHaveLength(1);
    });

    it('should filter accounts by search', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.partnerAccount.findMany.mockResolvedValue([]);

      await service.getPortalAccounts(userId, 'acme', orgId);

      expect(mockPrisma.partnerAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            account: {
              OR: [
                { name: { contains: 'acme', mode: 'insensitive' } },
                { domain: { contains: 'acme', mode: 'insensitive' } },
              ],
            },
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user has no active partner', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);

      await expect(
        service.getPortalAccounts(userId, undefined, orgId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // getPortalDeals
  // ============================================
  describe('getPortalDeals', () => {
    it('should return portal deals', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.dealRegistration.findMany.mockResolvedValue([
        {
          id: 'dr1',
          registrationNumber: 'DR-001',
          commissionRate: 10,
          opportunity: { id: 'opp1', name: 'Deal 1', amount: 50000 },
        },
      ]);

      const result = await service.getPortalDeals(userId, undefined, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].registrationId).toBe('dr1');
      expect(result[0].opportunity.name).toBe('Deal 1');
    });

    it('should filter deals by open status', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.dealRegistration.findMany.mockResolvedValue([]);

      await service.getPortalDeals(userId, 'open', orgId);

      expect(mockPrisma.dealRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunity: { isClosed: false },
          }),
        }),
      );
    });

    it('should filter deals by won status', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.dealRegistration.findMany.mockResolvedValue([]);

      await service.getPortalDeals(userId, 'won', orgId);

      expect(mockPrisma.dealRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunity: { isClosed: true, isWon: true },
          }),
        }),
      );
    });

    it('should filter deals by lost status', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue({ userId, partnerId: 'p1' });
      mockPrisma.dealRegistration.findMany.mockResolvedValue([]);

      await service.getPortalDeals(userId, 'lost', orgId);

      expect(mockPrisma.dealRegistration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunity: { isClosed: true, isWon: false },
          }),
        }),
      );
    });

    it('should throw ForbiddenException when user has no active partner', async () => {
      mockPrisma.partnerUser.findFirst.mockResolvedValue(null);

      await expect(
        service.getPortalDeals(userId, undefined, orgId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================
  // getStats
  // ============================================
  describe('getStats', () => {
    it('should return partner statistics for admin', async () => {
      mockPrisma.partner.count.mockResolvedValue(10);
      mockPrisma.partner.groupBy
        .mockResolvedValueOnce([{ status: 'APPROVED', _count: 5 }])
        .mockResolvedValueOnce([{ tier: 'GOLD', _count: 3 }])
        .mockResolvedValueOnce([{ type: 'RESELLER', _count: 7 }]);
      mockPrisma.partner.aggregate.mockResolvedValue({ _sum: { totalRevenue: 500000 } });

      const result = await service.getStats(userId, true, orgId);

      expect(result.total).toBe(10);
      expect(result.byStatus).toHaveLength(1);
      expect(result.totalPartnerRevenue).toBe(500000);
    });

    it('should allow managers to view stats', async () => {
      mockPrisma.partner.count.mockResolvedValue(0);
      mockPrisma.partner.groupBy.mockResolvedValue([]);
      mockPrisma.partner.aggregate.mockResolvedValue({ _sum: { totalRevenue: null } });

      const result = await service.getStats(userId, false, orgId, 'MANAGER');

      expect(result.totalPartnerRevenue).toBe(0);
    });

    it('should throw ForbiddenException for non-admin non-manager', async () => {
      await expect(
        service.getStats(userId, false, orgId, 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return 0 for totalPartnerRevenue when sum is null', async () => {
      mockPrisma.partner.count.mockResolvedValue(0);
      mockPrisma.partner.groupBy.mockResolvedValue([]);
      mockPrisma.partner.aggregate.mockResolvedValue({ _sum: { totalRevenue: null } });

      const result = await service.getStats(userId, true, orgId);

      expect(result.totalPartnerRevenue).toBe(0);
    });
  });
});
