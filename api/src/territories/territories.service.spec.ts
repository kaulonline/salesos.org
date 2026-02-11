import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TerritoriesService } from './territories.service';
import { PrismaService } from '../database/prisma.service';

describe('TerritoriesService', () => {
  let service: TerritoriesService;

  const mockPrisma = {
    territory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    territoryPerformance: {
      create: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
    },
    territoryAccount: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
    },
  };

  const userId = 'user-1';
  const orgId = 'org-1';
  const territoryId = 'territory-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TerritoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TerritoriesService>(TerritoriesService);
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return all territories for admin users', async () => {
      const territories = [
        {
          id: 'territory-1',
          name: 'West Coast',
          ownerId: 'user-2',
          owner: { id: 'user-2', name: 'Jane', email: 'jane@test.com' },
          performanceStats: null,
          _count: { accountMappings: 5 },
        },
      ];
      mockPrisma.territory.findMany.mockResolvedValue(territories);

      const result = await service.findAll(userId, true, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].accounts).toBe(5);
      expect(mockPrisma.territory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter territories by ownerId for non-admin users', async () => {
      mockPrisma.territory.findMany.mockResolvedValue([]);

      await service.findAll(userId, false, orgId);

      expect(mockPrisma.territory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: userId, organizationId: orgId },
        }),
      );
    });

    it('should map account counts correctly from _count', async () => {
      const territories = [
        {
          id: 't1',
          _count: { accountMappings: 10 },
          owner: null,
          performanceStats: null,
        },
        {
          id: 't2',
          _count: { accountMappings: 0 },
          owner: null,
          performanceStats: null,
        },
      ];
      mockPrisma.territory.findMany.mockResolvedValue(territories);

      const result = await service.findAll(userId, true, orgId);

      expect(result[0].accounts).toBe(10);
      expect(result[1].accounts).toBe(0);
    });
  });

  // ============================================
  // findOne
  // ============================================

  describe('findOne', () => {
    const mockTerritory = {
      id: territoryId,
      name: 'West Coast',
      ownerId: userId,
      organizationId: orgId,
      criteria: {},
      owner: { id: userId, name: 'Test User', email: 'test@test.com' },
      performanceStats: null,
      accountMappings: [],
    };

    it('should return a territory when found as admin', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);

      const result = await service.findOne(territoryId, userId, true, orgId);

      expect(result).toEqual(mockTerritory);
      expect(mockPrisma.territory.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: territoryId, organizationId: orgId }),
        }),
      );
    });

    it('should return a territory when found and user is owner', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);

      const result = await service.findOne(territoryId, userId, false, orgId);

      expect(result).toEqual(mockTerritory);
    });

    it('should throw NotFoundException when territory does not exist', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin user is not the owner', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...mockTerritory,
        ownerId: 'other-user',
      });

      await expect(
        service.findOne(territoryId, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to view territory owned by another user', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...mockTerritory,
        ownerId: 'other-user',
      });

      const result = await service.findOne(territoryId, userId, true, orgId);

      expect(result.ownerId).toBe('other-user');
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    const createDto = {
      name: 'West Coast',
      type: 'GEOGRAPHIC' as const,
      description: 'West Coast territory',
      criteria: { states: ['CA', 'OR', 'WA'] },
    };

    it('should create a territory and performance stats', async () => {
      const created = { id: 'new-territory', ...createDto, owner: { id: userId, name: 'Test', email: 'test@test.com' } };
      mockPrisma.territory.create.mockResolvedValue(created);
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      const result = await service.create(createDto, userId, orgId);

      expect(result).toEqual(created);
      expect(mockPrisma.territory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'West Coast',
            type: 'GEOGRAPHIC',
            ownerId: userId,
            organizationId: orgId,
          }),
        }),
      );
      expect(mockPrisma.territoryPerformance.create).toHaveBeenCalledWith({
        data: { territoryId: 'new-territory' },
      });
    });

    it('should use provided ownerId when specified', async () => {
      const dto = { ...createDto, ownerId: 'other-user' };
      mockPrisma.territory.create.mockResolvedValue({ id: 'new', ...dto, owner: {} });
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      await service.create(dto, userId, orgId);

      expect(mockPrisma.territory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerId: 'other-user' }),
        }),
      );
    });

    it('should use default ownerId (caller) when ownerId is not provided', async () => {
      mockPrisma.territory.create.mockResolvedValue({ id: 'new', ...createDto, owner: {} });
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      await service.create(createDto, userId, orgId);

      expect(mockPrisma.territory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ownerId: userId }),
        }),
      );
    });

    it('should default criteria to empty object when not provided', async () => {
      const dto = { name: 'Test', type: 'GEOGRAPHIC' as const };
      mockPrisma.territory.create.mockResolvedValue({ id: 'new', ...dto, owner: {} });
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      await service.create(dto, userId, orgId);

      expect(mockPrisma.territory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ criteria: {} }),
        }),
      );
    });

    it('should use provided color when specified', async () => {
      const dto = { ...createDto, color: '#FF0000' };
      mockPrisma.territory.create.mockResolvedValue({ id: 'new', ...dto, owner: {} });
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      await service.create(dto, userId, orgId);

      expect(mockPrisma.territory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ color: '#FF0000' }),
        }),
      );
    });

    it('should generate a color when none is provided', async () => {
      mockPrisma.territory.create.mockResolvedValue({ id: 'new', ...createDto, owner: {} });
      mockPrisma.territoryPerformance.create.mockResolvedValue({});

      await service.create(createDto, userId, orgId);

      const calledData = mockPrisma.territory.create.mock.calls[0][0].data;
      expect(calledData.color).toBeDefined();
      expect(typeof calledData.color).toBe('string');
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    const mockTerritory = {
      id: territoryId,
      name: 'West Coast',
      ownerId: userId,
      criteria: {},
      owner: { id: userId, name: 'Test', email: 'test@test.com' },
      performanceStats: null,
      accountMappings: [],
    };

    it('should update a territory', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      const updated = { ...mockTerritory, name: 'Updated Name', performanceStats: null };
      mockPrisma.territory.update.mockResolvedValue(updated);

      const result = await service.update(
        territoryId,
        { name: 'Updated Name' },
        userId,
        true,
        orgId,
      );

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.territory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: territoryId },
          data: expect.objectContaining({ name: 'Updated Name' }),
        }),
      );
    });

    it('should throw NotFoundException if territory does not exist', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(null);

      await expect(
        service.update(territoryId, { name: 'X' }, userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update isActive field', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territory.update.mockResolvedValue({ ...mockTerritory, isActive: false });

      await service.update(territoryId, { isActive: false }, userId, true, orgId);

      expect(mockPrisma.territory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    const mockTerritory = {
      id: territoryId,
      name: 'West Coast',
      ownerId: userId,
      criteria: {},
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should delete a territory and return success', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territory.delete.mockResolvedValue(mockTerritory);

      const result = await service.delete(territoryId, userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.territory.delete).toHaveBeenCalledWith({ where: { id: territoryId } });
    });

    it('should throw NotFoundException if territory does not exist', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin tries to delete someone else territory', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...mockTerritory,
        ownerId: 'other-user',
      });

      await expect(
        service.delete(territoryId, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // assignAccounts
  // ============================================

  describe('assignAccounts', () => {
    const mockTerritory = {
      id: territoryId,
      name: 'West Coast',
      ownerId: userId,
      criteria: {},
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should assign accounts to a territory', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      const accounts = [
        { id: 'acc-1', name: 'Acme', billingState: 'CA' },
        { id: 'acc-2', name: 'Beta', billingState: 'OR' },
      ];
      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.territoryAccount.upsert.mockResolvedValue({});
      // mock recalculatePerformance dependencies
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.assignAccounts(
        territoryId,
        { accountIds: ['acc-1', 'acc-2'] },
        userId,
        true,
        orgId,
      );

      expect(result.success).toBe(true);
      expect(result.assigned).toBe(2);
      expect(mockPrisma.territoryAccount.upsert).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when some accounts are not found', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.account.findMany.mockResolvedValue([{ id: 'acc-1', name: 'Acme' }]);

      await expect(
        service.assignAccounts(
          territoryId,
          { accountIds: ['acc-1', 'acc-2'] },
          userId,
          true,
          orgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when accounts do not match territory criteria', async () => {
      const territoryWithCriteria = {
        ...mockTerritory,
        criteria: { states: ['CA'] },
      };
      mockPrisma.territory.findFirst.mockResolvedValue(territoryWithCriteria);
      const accounts = [
        { id: 'acc-1', name: 'Texas Co', billingState: 'TX', billingCountry: null, industry: null, numberOfEmployees: null, annualRevenue: null, type: null },
      ];
      mockPrisma.account.findMany.mockResolvedValue(accounts);

      await expect(
        service.assignAccounts(
          territoryId,
          { accountIds: ['acc-1'] },
          userId,
          true,
          orgId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow assignment when criteria is empty', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      const accounts = [{ id: 'acc-1', name: 'Acme' }];
      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.territoryAccount.upsert.mockResolvedValue({});
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.assignAccounts(
        territoryId,
        { accountIds: ['acc-1'] },
        userId,
        true,
        orgId,
      );

      expect(result.success).toBe(true);
    });

    it('should pass matching criteria validation with correct accounts', async () => {
      const territoryWithCriteria = {
        ...mockTerritory,
        criteria: { states: ['CA'] },
      };
      mockPrisma.territory.findFirst.mockResolvedValue(territoryWithCriteria);
      const accounts = [
        { id: 'acc-1', name: 'California Co', billingState: 'CA', billingCountry: null, industry: null, numberOfEmployees: null, annualRevenue: null, type: null },
      ];
      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.territoryAccount.upsert.mockResolvedValue({});
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.assignAccounts(
        territoryId,
        { accountIds: ['acc-1'] },
        userId,
        true,
        orgId,
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // removeAccount
  // ============================================

  describe('removeAccount', () => {
    const mockTerritory = {
      id: territoryId,
      ownerId: userId,
      criteria: {},
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should remove an account from a territory', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territoryAccount.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.removeAccount(territoryId, 'acc-1', userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.territoryAccount.deleteMany).toHaveBeenCalledWith({
        where: { territoryId, accountId: 'acc-1' },
      });
    });

    it('should throw NotFoundException if territory does not exist', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(null);

      await expect(
        service.removeAccount(territoryId, 'acc-1', userId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // getAccounts
  // ============================================

  describe('getAccounts', () => {
    const mockTerritory = {
      id: territoryId,
      ownerId: userId,
      criteria: {},
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should return mapped accounts with computed fields', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territoryAccount.findMany.mockResolvedValue([
        {
          assignedAt: new Date('2024-01-01'),
          account: {
            id: 'acc-1',
            name: 'Acme',
            opportunities: [{ amount: 5000 }, { amount: 3000 }],
            _count: { contacts: 3, opportunities: 5 },
          },
        },
      ]);

      const result = await service.getAccounts(territoryId, userId, true, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].openPipeline).toBe(8000);
      expect(result[0].contacts).toBe(3);
      expect(result[0].deals).toBe(5);
      expect(result[0].assignedAt).toEqual(new Date('2024-01-01'));
    });

    it('should handle accounts with no open opportunities', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territoryAccount.findMany.mockResolvedValue([
        {
          assignedAt: new Date(),
          account: {
            id: 'acc-1',
            name: 'Acme',
            opportunities: [],
            _count: { contacts: 0, opportunities: 0 },
          },
        },
      ]);

      const result = await service.getAccounts(territoryId, userId, true, orgId);

      expect(result[0].openPipeline).toBe(0);
    });

    it('should handle opportunities with null amounts', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue(mockTerritory);
      mockPrisma.territoryAccount.findMany.mockResolvedValue([
        {
          assignedAt: new Date(),
          account: {
            id: 'acc-1',
            name: 'Acme',
            opportunities: [{ amount: null }, { amount: 1000 }],
            _count: { contacts: 0, opportunities: 2 },
          },
        },
      ]);

      const result = await service.getAccounts(territoryId, userId, true, orgId);

      expect(result[0].openPipeline).toBe(1000);
    });
  });

  // ============================================
  // autoAssignAccounts
  // ============================================

  describe('autoAssignAccounts', () => {
    const baseMockTerritory = {
      id: territoryId,
      ownerId: userId,
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should throw BadRequestException when territory has no criteria', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: {},
      });

      await expect(
        service.autoAssignAccounts(territoryId, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when criteria is null', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: null,
      });

      await expect(
        service.autoAssignAccounts(territoryId, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return zero assigned when no matching accounts found', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: { states: ['CA'] },
      });
      mockPrisma.account.findMany.mockResolvedValue([]);

      const result = await service.autoAssignAccounts(territoryId, userId, true, orgId);

      expect(result).toEqual({
        success: true,
        assigned: 0,
        message: 'No matching accounts found',
      });
    });

    it('should auto-assign matching accounts based on state criteria', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: { states: ['CA', 'OR'] },
      });
      // First call for autoAssign account find
      mockPrisma.account.findMany
        .mockResolvedValueOnce([{ id: 'acc-1' }, { id: 'acc-2' }])
        // Second call for assignAccounts validation
        .mockResolvedValueOnce([
          { id: 'acc-1', name: 'A', billingState: 'CA' },
          { id: 'acc-2', name: 'B', billingState: 'OR' },
        ]);
      mockPrisma.territoryAccount.upsert.mockResolvedValue({});
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.autoAssignAccounts(territoryId, userId, true, orgId);

      expect(result.success).toBe(true);
      expect(result.assigned).toBe(2);
    });

    it('should handle nested criteria structure', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: { geographic: { states: ['TX'] } },
      });
      mockPrisma.account.findMany
        .mockResolvedValueOnce([{ id: 'acc-1' }])
        .mockResolvedValueOnce([{ id: 'acc-1', name: 'Texas Co', billingState: 'TX' }]);
      mockPrisma.territoryAccount.upsert.mockResolvedValue({});
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.autoAssignAccounts(territoryId, userId, true, orgId);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // recalculatePerformance
  // ============================================

  describe('recalculatePerformance', () => {
    it('should reset stats when no accounts are mapped', async () => {
      mockPrisma.territoryAccount.findMany.mockResolvedValue([]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      await service.recalculatePerformance(territoryId);

      expect(mockPrisma.territoryPerformance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { territoryId },
          update: expect.objectContaining({
            accountCount: 0,
            pipelineValue: 0,
            closedWonValue: 0,
            closedLostValue: 0,
            openDealsCount: 0,
            avgDealSize: 0,
            winRate: 0,
          }),
        }),
      );
    });

    it('should calculate performance stats correctly', async () => {
      mockPrisma.territoryAccount.findMany.mockResolvedValue([
        { accountId: 'acc-1' },
        { accountId: 'acc-2' },
      ]);
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: 10000, isClosed: false, isWon: false }, // open
        { amount: 20000, isClosed: true, isWon: true },   // closed won
        { amount: 5000, isClosed: true, isWon: false },    // closed lost
        { amount: 30000, isClosed: true, isWon: true },    // closed won
      ]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      await service.recalculatePerformance(territoryId);

      expect(mockPrisma.territoryPerformance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            accountCount: 2,
            pipelineValue: 10000,
            closedWonValue: 50000,
            closedLostValue: 5000,
            openDealsCount: 1,
            avgDealSize: 25000, // 50000 / 2
            winRate: expect.closeTo(66.666, 1), // 2/3 * 100
          }),
        }),
      );
    });

    it('should handle zero closed deals for win rate', async () => {
      mockPrisma.territoryAccount.findMany.mockResolvedValue([{ accountId: 'acc-1' }]);
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: 5000, isClosed: false, isWon: false },
      ]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      await service.recalculatePerformance(territoryId);

      expect(mockPrisma.territoryPerformance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            winRate: 0,
            avgDealSize: 0,
          }),
        }),
      );
    });

    it('should handle opportunities with null amounts', async () => {
      mockPrisma.territoryAccount.findMany.mockResolvedValue([{ accountId: 'acc-1' }]);
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { amount: null, isClosed: true, isWon: true },
        { amount: 10000, isClosed: true, isWon: true },
      ]);
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      await service.recalculatePerformance(territoryId);

      expect(mockPrisma.territoryPerformance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            closedWonValue: 10000,
            avgDealSize: 5000, // 10000 / 2
          }),
        }),
      );
    });
  });

  // ============================================
  // getStats
  // ============================================

  describe('getStats', () => {
    it('should return aggregated stats for an organization', async () => {
      mockPrisma.territory.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8); // active
      mockPrisma.territory.findMany.mockResolvedValue([
        { id: 't1' },
        { id: 't2' },
      ]);
      mockPrisma.territoryAccount.count.mockResolvedValue(50);
      mockPrisma.territoryPerformance.aggregate.mockResolvedValue({
        _sum: {
          pipelineValue: { toNumber: () => 500000 },
          closedWonValue: { toNumber: () => 200000 },
        },
      });

      const result = await service.getStats(orgId);

      expect(result).toEqual({
        totalTerritories: 10,
        activeTerritories: 8,
        totalAssignedAccounts: 50,
        totalPipeline: 500000,
        totalClosedWon: 200000,
      });
    });

    it('should handle null sums when no performance data exists', async () => {
      mockPrisma.territory.count.mockResolvedValue(0);
      mockPrisma.territory.findMany.mockResolvedValue([]);
      mockPrisma.territoryAccount.count.mockResolvedValue(0);
      mockPrisma.territoryPerformance.aggregate.mockResolvedValue({
        _sum: { pipelineValue: null, closedWonValue: null },
      });

      const result = await service.getStats(orgId);

      expect(result.totalPipeline).toBe(0);
      expect(result.totalClosedWon).toBe(0);
    });
  });

  // ============================================
  // cleanupMismatchedAccounts
  // ============================================

  describe('cleanupMismatchedAccounts', () => {
    const baseMockTerritory = {
      id: territoryId,
      ownerId: userId,
      owner: null,
      performanceStats: null,
      accountMappings: [],
    };

    it('should return no removals when territory has no criteria', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: {},
      });

      const result = await service.cleanupMismatchedAccounts(territoryId, userId, true, orgId);

      expect(result.removedCount).toBe(0);
      expect(result.message).toContain('no criteria');
    });

    it('should remove accounts that do not match criteria', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: { states: ['CA'] },
      });
      mockPrisma.territoryAccount.findMany
        // First call for cleanupMismatchedAccounts
        .mockResolvedValueOnce([
          {
            account: { id: 'acc-1', name: 'CA Co', billingState: 'CA', billingCountry: null, industry: null, numberOfEmployees: null, annualRevenue: null, type: null },
          },
          {
            account: { id: 'acc-2', name: 'TX Co', billingState: 'TX', billingCountry: null, industry: null, numberOfEmployees: null, annualRevenue: null, type: null },
          },
        ])
        // Second call for recalculatePerformance
        .mockResolvedValueOnce([]);
      mockPrisma.territoryAccount.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.territoryPerformance.upsert.mockResolvedValue({});

      const result = await service.cleanupMismatchedAccounts(territoryId, userId, true, orgId);

      expect(result.removedCount).toBe(1);
      expect(mockPrisma.territoryAccount.deleteMany).toHaveBeenCalledWith({
        where: {
          territoryId,
          accountId: { in: ['acc-2'] },
        },
      });
    });

    it('should report all matching if no mismatches found', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: { states: ['CA'] },
      });
      mockPrisma.territoryAccount.findMany.mockResolvedValue([
        {
          account: { id: 'acc-1', name: 'CA Co', billingState: 'CA', billingCountry: null, industry: null, numberOfEmployees: null, annualRevenue: null, type: null },
        },
      ]);

      const result = await service.cleanupMismatchedAccounts(territoryId, userId, true, orgId);

      expect(result.removedCount).toBe(0);
      expect(result.message).toContain('All accounts match');
    });

    it('should handle null criteria', async () => {
      mockPrisma.territory.findFirst.mockResolvedValue({
        ...baseMockTerritory,
        criteria: null,
      });

      const result = await service.cleanupMismatchedAccounts(territoryId, userId, true, orgId);

      expect(result.removedCount).toBe(0);
    });
  });
});
