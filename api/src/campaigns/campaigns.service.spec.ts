import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../database/prisma.service';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: PrismaService;

  const mockOwner = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
  const orgId = 'org-1';

  const mockCampaign = {
    id: 'campaign-1',
    name: 'Spring Outreach',
    campaignType: 'Email',
    status: 'PLANNED',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    budgetedCost: 10000,
    actualCost: 5000,
    expectedRevenue: 50000,
    description: 'Spring email campaign',
    numSent: 1000,
    numResponses: 200,
    numConverted: 50,
    ownerId: 'user-1',
    organizationId: orgId,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: mockOwner,
  };

  const mockCampaignWithOpportunities = {
    ...mockCampaign,
    opportunities: [
      { id: 'opp-1', name: 'Deal A', stage: 'Closed Won', amount: 20000, isWon: true, isClosed: true },
      { id: 'opp-2', name: 'Deal B', stage: 'Negotiation', amount: 15000, isWon: false, isClosed: false },
      { id: 'opp-3', name: 'Deal C', stage: 'Closed Won', amount: 10000, isWon: true, isClosed: true },
    ],
    _count: { opportunities: 3 },
  };

  const mockPrisma = {
    campaign: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createCampaign ────────────────────────────────────────────────

  describe('createCampaign', () => {
    it('should create a campaign with default PLANNED status', async () => {
      const dto = { name: 'New Campaign', campaignType: 'Email' };
      mockPrisma.campaign.create.mockResolvedValue({ ...mockCampaign, ...dto });

      const result = await service.createCampaign(dto, 'user-1', orgId);

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          status: 'PLANNED',
          ownerId: 'user-1',
          organizationId: orgId,
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.name).toBe('New Campaign');
    });

    it('should use provided status when specified', async () => {
      const dto = { name: 'Active Campaign', status: 'ACTIVE' as any };
      mockPrisma.campaign.create.mockResolvedValue({ ...mockCampaign, ...dto });

      await service.createCampaign(dto, 'user-1', orgId);

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  // ─── getCampaign ──────────────────────────────────────────────────

  describe('getCampaign', () => {
    it('should return campaign with metrics for the owner', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaignWithOpportunities);

      const result = await service.getCampaign('campaign-1', 'user-1', orgId);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1', ownerId: 'user-1', organizationId: orgId },
        }),
      );
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.wonRevenue).toBe(30000);
      expect(result.metrics.totalOpportunities).toBe(3);
      expect(result.metrics.wonOpportunities).toBe(2);
    });

    it('should allow admin to access any campaign (no ownerId filter)', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaignWithOpportunities);

      await service.getCampaign('campaign-1', 'user-1', orgId, true);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1', organizationId: orgId },
        }),
      );
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaign('nonexistent', 'user-1', orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate response rate and conversion rate correctly', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaignWithOpportunities);

      const result = await service.getCampaign('campaign-1', 'user-1', orgId);

      // numResponses=200, numSent=1000 => 20%
      expect(result.metrics.responseRate).toBe(20);
      // numConverted=50, numSent=1000 => 5%
      expect(result.metrics.conversionRate).toBe(5);
    });

    it('should calculate ROI correctly based on won revenue and actual cost', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaignWithOpportunities);

      const result = await service.getCampaign('campaign-1', 'user-1', orgId);

      // wonRevenue=30000, actualCost=5000 => ROI = ((30000 - 5000) / 5000) * 100 = 500%
      expect(result.metrics.roi).toBe(500);
    });

    it('should handle zero numSent gracefully (no division by zero)', async () => {
      const campaignWithZeroSent = {
        ...mockCampaignWithOpportunities,
        numSent: 0,
        numResponses: 0,
        numConverted: 0,
      };
      mockPrisma.campaign.findFirst.mockResolvedValue(campaignWithZeroSent);

      const result = await service.getCampaign('campaign-1', 'user-1', orgId);

      expect(result.metrics.responseRate).toBe(0);
      expect(result.metrics.conversionRate).toBe(0);
    });

    it('should handle zero actualCost (ROI is 0)', async () => {
      const campaignWithZeroCost = {
        ...mockCampaignWithOpportunities,
        actualCost: 0,
      };
      mockPrisma.campaign.findFirst.mockResolvedValue(campaignWithZeroCost);

      const result = await service.getCampaign('campaign-1', 'user-1', orgId);

      expect(result.metrics.roi).toBe(0);
    });
  });

  // ─── listCampaigns ────────────────────────────────────────────────

  describe('listCampaigns', () => {
    it('should return all campaigns for the organization', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.listCampaigns(undefined, orgId);

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.listCampaigns({ status: 'ACTIVE' as any }, orgId);

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should filter by campaignType when provided', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.listCampaigns({ campaignType: 'Email' }, orgId);

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ campaignType: 'Email' }),
        }),
      );
    });

    it('should filter by ownerId for non-admin users', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.listCampaigns({ ownerId: 'user-1' }, orgId, false);

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('should NOT filter by ownerId for admin users', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.listCampaigns({ ownerId: 'user-1' }, orgId, true);

      const callArgs = mockPrisma.campaign.findMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('ownerId');
    });
  });

  // ─── updateCampaign ───────────────────────────────────────────────

  describe('updateCampaign', () => {
    it('should update a campaign when found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.update.mockResolvedValue({ ...mockCampaign, name: 'Updated Name' });

      const result = await service.updateCampaign('campaign-1', 'user-1', { name: 'Updated Name' }, orgId);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', ownerId: 'user-1', organizationId: orgId },
      });
      expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
        data: { name: 'Updated Name' },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCampaign('nonexistent', 'user-1', { name: 'X' }, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to update any campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.update.mockResolvedValue(mockCampaign);

      await service.updateCampaign('campaign-1', 'user-1', { name: 'Admin Update' }, orgId, true);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', organizationId: orgId },
      });
    });
  });

  // ─── deleteCampaign ───────────────────────────────────────────────

  describe('deleteCampaign', () => {
    it('should delete a campaign when found', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.delete.mockResolvedValue(mockCampaign);

      await service.deleteCampaign('campaign-1', 'user-1', orgId);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', ownerId: 'user-1', organizationId: orgId },
      });
      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteCampaign('nonexistent', 'user-1', orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow admin to delete any campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      mockPrisma.campaign.delete.mockResolvedValue(mockCampaign);

      await service.deleteCampaign('campaign-1', 'user-1', orgId, true);

      expect(mockPrisma.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-1', organizationId: orgId },
      });
    });
  });

  // ─── getCampaignStats ─────────────────────────────────────────────

  describe('getCampaignStats', () => {
    it('should return aggregate campaign statistics', async () => {
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.campaign.groupBy
        .mockResolvedValueOnce([
          { status: 'PLANNED', _count: 3 },
          { status: 'ACTIVE', _count: 5 },
          { status: 'COMPLETED', _count: 2 },
        ])
        .mockResolvedValueOnce([
          { campaignType: 'Email', _count: 6 },
          { campaignType: 'Webinar', _count: 4 },
        ]);
      mockPrisma.campaign.aggregate
        .mockResolvedValueOnce({ _sum: { budgetedCost: 100000 } })
        .mockResolvedValueOnce({ _sum: { actualCost: 75000 } })
        .mockResolvedValueOnce({ _sum: { numSent: 5000 } })
        .mockResolvedValueOnce({ _sum: { numResponses: 1000 } });

      const result = await service.getCampaignStats(orgId);

      expect(result.total).toBe(10);
      expect(result.byStatus).toHaveLength(3);
      expect(result.byType).toHaveLength(2);
      expect(result.totalBudget).toBe(100000);
      expect(result.totalActual).toBe(75000);
      expect(result.totalSent).toBe(5000);
      expect(result.totalResponses).toBe(1000);
      // overallResponseRate = (1000 / 5000) * 100 = 20
      expect(result.overallResponseRate).toBe(20);
    });

    it('should handle zero numSent for overall response rate', async () => {
      mockPrisma.campaign.count.mockResolvedValue(0);
      mockPrisma.campaign.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.campaign.aggregate
        .mockResolvedValueOnce({ _sum: { budgetedCost: null } })
        .mockResolvedValueOnce({ _sum: { actualCost: null } })
        .mockResolvedValueOnce({ _sum: { numSent: null } })
        .mockResolvedValueOnce({ _sum: { numResponses: null } });

      const result = await service.getCampaignStats(orgId);

      expect(result.total).toBe(0);
      expect(result.overallResponseRate).toBe(0);
      expect(result.totalBudget).toBe(0);
      expect(result.totalActual).toBe(0);
    });

    it('should filter by ownerId for non-admin users', async () => {
      mockPrisma.campaign.count.mockResolvedValue(2);
      mockPrisma.campaign.groupBy.mockResolvedValue([]);
      mockPrisma.campaign.aggregate.mockResolvedValue({ _sum: {} });

      await service.getCampaignStats(orgId, 'user-1', false);

      expect(mockPrisma.campaign.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ ownerId: 'user-1' }),
      });
    });

    it('should NOT filter by ownerId for admin users', async () => {
      mockPrisma.campaign.count.mockResolvedValue(10);
      mockPrisma.campaign.groupBy.mockResolvedValue([]);
      mockPrisma.campaign.aggregate.mockResolvedValue({ _sum: {} });

      await service.getCampaignStats(orgId, 'user-1', true);

      const callArgs = mockPrisma.campaign.count.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('ownerId');
    });
  });

  // ─── getCampaignROI ───────────────────────────────────────────────

  describe('getCampaignROI', () => {
    it('should return ROI analysis for a campaign', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(mockCampaignWithOpportunities);

      const result = await service.getCampaignROI('campaign-1', 'user-1', orgId);

      expect(result.campaignId).toBe('campaign-1');
      expect(result.campaignName).toBe('Spring Outreach');
      expect(result.budgetedCost).toBe(10000);
      expect(result.actualCost).toBe(5000);
      expect(result.expectedRevenue).toBe(50000);
      expect(result.actualRevenue).toBe(30000);
      expect(result.roi).toBe(500);
      expect(result.responseRate).toBe(20);
      expect(result.conversionRate).toBe(5);
      expect(result.totalOpportunities).toBe(3);
      expect(result.wonOpportunities).toBe(2);
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.getCampaignROI('nonexistent', 'user-1', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
