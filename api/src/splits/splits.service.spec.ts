import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SplitsService, CreateSplitDto, UpdateSplitDto } from './splits.service';
import { PrismaService } from '../database/prisma.service';

describe('SplitsService', () => {
  let service: SplitsService;

  const mockPrisma = {
    opportunitySplit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    opportunity: {
      findFirst: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
  };

  const orgId = 'org-1';
  const userId = 'user-1';
  const adminId = 'admin-1';
  const opportunityId = 'opp-1';
  const splitId = 'split-1';

  const mockOpportunity = {
    id: opportunityId,
    amount: 10000,
    ownerId: userId,
    isClosed: false,
  };

  const mockSplit = {
    id: splitId,
    opportunityId,
    organizationId: orgId,
    userId: 'user-2',
    splitType: 'REVENUE',
    splitPercent: 50,
    splitAmount: 5000,
    includeInQuota: true,
    includeInForecast: true,
    status: 'PENDING',
    approvedById: null,
    approvedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SplitsService>(SplitsService);
  });

  // ============================================
  // getOpportunitySplits
  // ============================================

  describe('getOpportunitySplits', () => {
    it('should return splits with summary for an opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      const splits = [
        { ...mockSplit, splitPercent: 60, status: 'APPROVED' },
        { ...mockSplit, id: 'split-2', splitPercent: 40, status: 'PENDING' },
      ];
      mockPrisma.opportunitySplit.findMany.mockResolvedValue(splits);

      const result = await service.getOpportunitySplits(opportunityId, userId, false, orgId);

      expect(result.splits).toHaveLength(2);
      expect(result.summary.totalPercent).toBe(100);
      expect(result.summary.splitCount).toBe(2);
      expect(result.summary.isComplete).toBe(true);
      expect(result.summary.pendingApproval).toBe(1);
    });

    it('should mark isComplete false when total is not 100%', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([
        { ...mockSplit, splitPercent: 60, status: 'APPROVED' },
      ]);

      const result = await service.getOpportunitySplits(opportunityId, userId, false, orgId);

      expect(result.summary.isComplete).toBe(false);
      expect(result.summary.totalPercent).toBe(60);
    });

    it('should throw NotFoundException if opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.getOpportunitySplits(opportunityId, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to access any opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([]);

      await service.getOpportunitySplits(opportunityId, adminId, true, orgId);

      expect(mockPrisma.opportunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ ownerId: adminId }),
        }),
      );
    });

    it('should restrict non-admin to their own opportunities', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([]);

      await service.getOpportunitySplits(opportunityId, userId, false, orgId);

      expect(mockPrisma.opportunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: userId }),
        }),
      );
    });
  });

  // ============================================
  // createSplit
  // ============================================

  describe('createSplit', () => {
    const createDto: CreateSplitDto = {
      userId: 'user-2',
      splitPercent: 50,
      splitType: 'REVENUE' as any,
      includeInQuota: true,
      includeInForecast: true,
      notes: 'Test split',
    };

    it('should create a split successfully', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findUnique.mockResolvedValue(null);
      mockPrisma.opportunitySplit.create.mockResolvedValue({
        ...mockSplit,
        ...createDto,
        splitAmount: 5000,
        status: 'PENDING',
      });

      const result = await service.createSplit(opportunityId, createDto, userId, false, orgId);

      expect(result.splitPercent).toBe(50);
      expect(mockPrisma.opportunitySplit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            opportunityId,
            splitPercent: 50,
            splitAmount: 5000,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should auto-approve when created by admin', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findUnique.mockResolvedValue(null);
      mockPrisma.opportunitySplit.create.mockResolvedValue({
        ...mockSplit,
        status: 'APPROVED',
        approvedById: adminId,
      });

      await service.createSplit(opportunityId, createDto, adminId, true, orgId);

      expect(mockPrisma.opportunitySplit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedById: adminId,
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid percentage (0)', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.createSplit(opportunityId, { ...createDto, splitPercent: 0 }, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid percentage (> 100)', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.createSplit(opportunityId, { ...createDto, splitPercent: 101 }, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative percentage', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.createSplit(opportunityId, { ...createDto, splitPercent: -10 }, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if split already exists for user/type', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findUnique.mockResolvedValue(mockSplit);

      await expect(
        service.createSplit(opportunityId, createDto, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set splitAmount to null when opportunity has no amount', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ ...mockOpportunity, amount: null });
      mockPrisma.opportunitySplit.findUnique.mockResolvedValue(null);
      mockPrisma.opportunitySplit.create.mockResolvedValue({
        ...mockSplit,
        splitAmount: null,
      });

      await service.createSplit(opportunityId, createDto, userId, false, orgId);

      expect(mockPrisma.opportunitySplit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ splitAmount: null }),
        }),
      );
    });

    it('should default splitType to REVENUE when not provided', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findUnique.mockResolvedValue(null);
      mockPrisma.opportunitySplit.create.mockResolvedValue(mockSplit);

      const dto: CreateSplitDto = { userId: 'user-2', splitPercent: 50 };
      await service.createSplit(opportunityId, dto, userId, false, orgId);

      expect(mockPrisma.opportunitySplit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ splitType: 'REVENUE' }),
        }),
      );
    });

    it('should throw NotFoundException if opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.createSplit(opportunityId, createDto, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // updateSplit
  // ============================================

  describe('updateSplit', () => {
    const updateDto: UpdateSplitDto = {
      splitPercent: 75,
    };

    it('should update a split successfully', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...mockSplit,
        splitPercent: 75,
        splitAmount: 7500,
      });

      const result = await service.updateSplit(splitId, updateDto, userId, false, orgId);

      expect(result.splitPercent).toBe(75);
    });

    it('should throw NotFoundException if split not found', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSplit('missing-id', updateDto, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating locked split', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue({
        ...mockSplit,
        status: 'LOCKED',
      });
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.updateSplit(splitId, updateDto, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid percentage on update', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.updateSplit(splitId, { splitPercent: 150 }, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should recalculate splitAmount when percentage changes', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...mockSplit,
        splitPercent: 75,
        splitAmount: 7500,
      });

      await service.updateSplit(splitId, { splitPercent: 75 }, adminId, true, orgId);

      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ splitAmount: 7500 }),
        }),
      );
    });

    it('should reset approval when non-admin updates an approved split', async () => {
      const approvedSplit = { ...mockSplit, status: 'APPROVED' };
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(approvedSplit);
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...approvedSplit,
        status: 'PENDING',
        approvedById: null,
        approvedAt: null,
      });

      await service.updateSplit(splitId, { notes: 'updated' }, userId, false, orgId);

      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            approvedById: null,
            approvedAt: null,
          }),
        }),
      );
    });
  });

  // ============================================
  // deleteSplit
  // ============================================

  describe('deleteSplit', () => {
    it('should delete a split successfully', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.delete.mockResolvedValue(mockSplit);

      const result = await service.deleteSplit(splitId, userId, false, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.opportunitySplit.delete).toHaveBeenCalledWith({
        where: { id: splitId },
      });
    });

    it('should throw NotFoundException if split not found', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteSplit('missing-id', userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deleting locked split', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue({
        ...mockSplit,
        status: 'LOCKED',
      });
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);

      await expect(
        service.deleteSplit(splitId, userId, false, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // approveSplit
  // ============================================

  describe('approveSplit', () => {
    it('should approve a split when user is admin', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...mockSplit,
        status: 'APPROVED',
        approvedById: adminId,
      });

      const result = await service.approveSplit(splitId, adminId, true, orgId);

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedById: adminId,
          }),
        }),
      );
    });

    it('should throw ForbiddenException when non-admin tries to approve', async () => {
      await expect(
        service.approveSplit(splitId, userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when approving locked split', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue({
        ...mockSplit,
        status: 'LOCKED',
      });

      await expect(
        service.approveSplit(splitId, adminId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if split not found', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(null);

      await expect(
        service.approveSplit('missing-id', adminId, true, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // rejectSplit
  // ============================================

  describe('rejectSplit', () => {
    it('should reject a split with reason', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(mockSplit);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...mockSplit,
        status: 'REJECTED',
        notes: 'Rejected: Too high',
      });

      const result = await service.rejectSplit(splitId, 'Too high', adminId, true, orgId);

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            notes: 'Rejected: Too high',
          }),
        }),
      );
    });

    it('should reject a split without reason, preserving existing notes', async () => {
      const splitWithNotes = { ...mockSplit, notes: 'Original notes' };
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue(splitWithNotes);
      mockPrisma.opportunitySplit.update.mockResolvedValue({
        ...splitWithNotes,
        status: 'REJECTED',
      });

      await service.rejectSplit(splitId, undefined, adminId, true, orgId);

      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Original notes',
          }),
        }),
      );
    });

    it('should throw ForbiddenException when non-admin tries to reject', async () => {
      await expect(
        service.rejectSplit(splitId, 'reason', userId, false, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when rejecting locked split', async () => {
      mockPrisma.opportunitySplit.findFirst.mockResolvedValue({
        ...mockSplit,
        status: 'LOCKED',
      });

      await expect(
        service.rejectSplit(splitId, 'reason', adminId, true, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // getUserSplits
  // ============================================

  describe('getUserSplits', () => {
    const splitsWithOpportunity = [
      {
        ...mockSplit,
        splitAmount: 5000,
        includeInForecast: true,
        opportunity: { id: 'opp-1', name: 'Deal 1', amount: 10000, stage: 'Negotiation', closeDate: new Date(), isClosed: false, isWon: false, account: { id: 'acc-1', name: 'Acme' } },
      },
      {
        ...mockSplit,
        id: 'split-2',
        splitAmount: 3000,
        includeInForecast: true,
        opportunity: { id: 'opp-2', name: 'Deal 2', amount: 6000, stage: 'Closed Won', closeDate: new Date(), isClosed: true, isWon: true, account: { id: 'acc-2', name: 'Corp' } },
      },
    ];

    it('should return user splits with totals', async () => {
      mockPrisma.opportunitySplit.findMany.mockResolvedValue(splitsWithOpportunity);

      const result = await service.getUserSplits(userId, {}, orgId);

      expect(result.splits).toHaveLength(2);
      expect(result.totals.totalAmount).toBe(8000);
      expect(result.totals.wonAmount).toBe(3000);
      expect(result.totals.forecastAmount).toBe(5000);
    });

    it('should apply status filter', async () => {
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([]);

      await service.getUserSplits(userId, { status: 'APPROVED' }, orgId);

      expect(mockPrisma.opportunitySplit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED' }),
        }),
      );
    });

    it('should apply includeInForecast filter', async () => {
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([]);

      await service.getUserSplits(userId, { includeInForecast: true }, orgId);

      expect(mockPrisma.opportunitySplit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ includeInForecast: true }),
        }),
      );
    });
  });

  // ============================================
  // getTeamSplits
  // ============================================

  describe('getTeamSplits', () => {
    it('should throw ForbiddenException for non-admin', async () => {
      await expect(
        service.getTeamSplits(userId, false, {}, orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return team splits for admin', async () => {
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([mockSplit]);

      const result = await service.getTeamSplits(adminId, true, {}, orgId);

      expect(result).toHaveLength(1);
    });

    it('should filter by userId when provided', async () => {
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([]);

      await service.getTeamSplits(adminId, true, { userId: 'user-2' }, orgId);

      expect(mockPrisma.opportunitySplit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-2' }),
        }),
      );
    });
  });

  // ============================================
  // getSplitStats
  // ============================================

  describe('getSplitStats', () => {
    it('should return stats for admin (all org splits)', async () => {
      mockPrisma.opportunitySplit.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5);
      mockPrisma.opportunitySplit.groupBy.mockResolvedValue([
        { splitType: 'REVENUE', _count: 8, _sum: { splitAmount: 50000 } },
        { splitType: 'OVERLAY', _count: 2, _sum: { splitAmount: 10000 } },
      ]);
      mockPrisma.opportunitySplit.aggregate.mockResolvedValue({
        _sum: { splitAmount: 40000 },
      });

      const result = await service.getSplitStats(adminId, true, orgId);

      expect(result.total).toBe(10);
      expect(result.pending).toBe(3);
      expect(result.approved).toBe(5);
      expect(result.rejected).toBe(2);
      expect(result.totalApprovedAmount).toBe(40000);
      expect(result.byType).toHaveLength(2);
    });

    it('should filter by userId for non-admin', async () => {
      mockPrisma.opportunitySplit.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      mockPrisma.opportunitySplit.groupBy.mockResolvedValue([]);
      mockPrisma.opportunitySplit.aggregate.mockResolvedValue({
        _sum: { splitAmount: null },
      });

      const result = await service.getSplitStats(userId, false, orgId);

      expect(result.totalApprovedAmount).toBe(0);
    });
  });

  // ============================================
  // recalculateSplitAmounts
  // ============================================

  describe('recalculateSplitAmounts', () => {
    it('should recalculate all split amounts', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpportunity);
      mockPrisma.opportunitySplit.findMany.mockResolvedValue([
        { id: 'split-1', splitPercent: 60 },
        { id: 'split-2', splitPercent: 40 },
      ]);
      mockPrisma.opportunitySplit.update.mockResolvedValue({});

      const result = await service.recalculateSplitAmounts(opportunityId, userId, false, orgId);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockPrisma.opportunitySplit.update).toHaveBeenCalledTimes(2);
    });

    it('should return early if opportunity has no amount', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ ...mockOpportunity, amount: null });

      const result = await service.recalculateSplitAmounts(opportunityId, userId, false, orgId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Opportunity has no amount to split');
    });

    it('should throw NotFoundException if opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.recalculateSplitAmounts(opportunityId, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // lockSplitsForClosedDeal
  // ============================================

  describe('lockSplitsForClosedDeal', () => {
    it('should lock all splits for an opportunity', async () => {
      mockPrisma.opportunitySplit.updateMany.mockResolvedValue({ count: 3 });

      await service.lockSplitsForClosedDeal(opportunityId);

      expect(mockPrisma.opportunitySplit.updateMany).toHaveBeenCalledWith({
        where: { opportunityId },
        data: { status: 'LOCKED' },
      });
    });
  });
});
