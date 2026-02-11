import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CompetitorsService } from './competitors.service';
import { PrismaService } from '../database/prisma.service';

describe('CompetitorsService', () => {
  let service: CompetitorsService;

  const mockPrisma = {
    competitor: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    competitorProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    opportunityCompetitor: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    opportunity: {
      findFirst: jest.fn(),
    },
  };

  const orgId = 'org-1';
  const userId = 'user-1';

  const mockCompetitor = {
    id: 'comp-1',
    organizationId: orgId,
    name: 'Acme Corp',
    website: 'https://acme.com',
    logoUrl: null,
    description: 'Major competitor',
    tier: 'PRIMARY',
    status: 'ACTIVE',
    strengths: ['Brand recognition', 'Large sales team'],
    weaknesses: ['Expensive', 'Slow support'],
    differentiators: ['AI features'],
    targetMarket: 'Enterprise',
    pricingModel: 'Subscription',
    winsAgainst: 10,
    lossesAgainst: 5,
    winRateAgainst: 66.7,
    createdAt: new Date(),
    updatedAt: new Date(),
    products: [
      {
        id: 'cp-1',
        competitorId: 'comp-1',
        name: 'Acme CRM',
        comparableToProduct: { id: 'prod-1', name: 'Our CRM', sku: 'CRM-001' },
      },
    ],
    battlecards: [
      {
        id: 'bc-1',
        competitorId: 'comp-1',
        title: 'Acme Battlecard',
        isActive: true,
        version: 2,
      },
    ],
    _count: { opportunityLinks: 15 },
  };

  const mockCompetitorWithCounts = {
    ...mockCompetitor,
    _count: { battlecards: 1, products: 1, opportunityLinks: 15 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitorsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CompetitorsService>(CompetitorsService);
  });

  // ============ findAll ============

  describe('findAll', () => {
    it('should return all competitors for an organization', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([mockCompetitorWithCounts]);

      const result = await service.findAll({}, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Acme Corp');
      expect(result[0].battlecardCount).toBe(1);
      expect(result[0].productCount).toBe(1);
      expect(result[0].dealCount).toBe(15);
    });

    it('should filter by tier', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      await service.findAll({ tier: 'PRIMARY' }, orgId);

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId, tier: 'PRIMARY' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'INACTIVE' }, orgId);

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId, status: 'INACTIVE' }),
        }),
      );
    });

    it('should filter by search term (name and description)', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'acme' }, orgId);

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: orgId,
            OR: [
              { name: { contains: 'acme', mode: 'insensitive' } },
              { description: { contains: 'acme', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should return empty array when no competitors exist', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      const result = await service.findAll({}, orgId);

      expect(result).toEqual([]);
    });

    it('should sort by tier then name', async () => {
      mockPrisma.competitor.findMany.mockResolvedValue([]);

      await service.findAll({}, orgId);

      expect(mockPrisma.competitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ tier: 'asc' }, { name: 'asc' }],
        }),
      );
    });
  });

  // ============ findOne ============

  describe('findOne', () => {
    it('should return a competitor by id and organizationId', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);

      const result = await service.findOne('comp-1', orgId);

      expect(result.id).toBe('comp-1');
      expect(result.products).toHaveLength(1);
      expect(result.battlecards).toHaveLength(1);
    });

    it('should throw NotFoundException when competitor not found', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      await expect(service.findOne('comp-missing', orgId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('comp-missing', orgId)).rejects.toThrow(
        'Competitor not found',
      );
    });
  });

  // ============ create ============

  describe('create', () => {
    it('should create a new competitor', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue(null);
      mockPrisma.competitor.create.mockResolvedValue({
        id: 'comp-new',
        name: 'New Rival',
        organizationId: orgId,
        tier: 'SECONDARY',
        status: 'ACTIVE',
        strengths: [],
        weaknesses: [],
        differentiators: [],
      });

      const dto = { name: 'New Rival' };
      const result = await service.create(dto, orgId);

      expect(result.id).toBe('comp-new');
      expect(mockPrisma.competitor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            name: 'New Rival',
            tier: 'SECONDARY',
            strengths: [],
            weaknesses: [],
            differentiators: [],
          }),
        }),
      );
    });

    it('should create a competitor with all fields', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue(null);
      mockPrisma.competitor.create.mockResolvedValue({
        id: 'comp-full',
        name: 'Full Competitor',
        tier: 'PRIMARY',
        strengths: ['Fast'],
        weaknesses: ['Pricey'],
        differentiators: ['AI'],
        website: 'https://full.com',
        description: 'A full competitor',
        targetMarket: 'SMB',
        pricingModel: 'Usage-based',
      });

      const dto = {
        name: 'Full Competitor',
        tier: 'PRIMARY' as any,
        strengths: ['Fast'],
        weaknesses: ['Pricey'],
        differentiators: ['AI'],
        website: 'https://full.com',
        description: 'A full competitor',
        targetMarket: 'SMB',
        pricingModel: 'Usage-based',
      };

      const result = await service.create(dto, orgId);

      expect(result.name).toBe('Full Competitor');
      expect(mockPrisma.competitor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: 'PRIMARY',
            strengths: ['Fast'],
          }),
        }),
      );
    });

    it('should throw BadRequestException when duplicate name exists', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue({ id: 'comp-existing', name: 'Duplicate' });

      await expect(service.create({ name: 'Duplicate' }, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ name: 'Duplicate' }, orgId)).rejects.toThrow(
        'A competitor with this name already exists',
      );
    });
  });

  // ============ update ============

  describe('update', () => {
    it('should update an existing competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitor.update.mockResolvedValue({
        ...mockCompetitor,
        name: 'Acme Updated',
      });

      const result = await service.update('comp-1', { name: 'Acme Updated' }, orgId);

      expect(result.name).toBe('Acme Updated');
      expect(mockPrisma.competitor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comp-1' },
        }),
      );
    });

    it('should update status', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitor.update.mockResolvedValue({
        ...mockCompetitor,
        status: 'INACTIVE',
      });

      const result = await service.update('comp-1', { status: 'INACTIVE' as any }, orgId);

      expect(result.status).toBe('INACTIVE');
    });

    it('should throw NotFoundException when competitor does not exist', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      await expect(service.update('comp-missing', { name: 'X' }, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ delete ============

  describe('delete', () => {
    it('should delete an existing competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitor.delete.mockResolvedValue(mockCompetitor);

      const result = await service.delete('comp-1', orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.competitor.delete).toHaveBeenCalledWith({ where: { id: 'comp-1' } });
    });

    it('should throw NotFoundException when competitor does not exist', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      await expect(service.delete('comp-missing', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ============ getProducts ============

  describe('getProducts', () => {
    it('should return products for a competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitorProduct.findMany.mockResolvedValue([
        {
          id: 'cp-1',
          competitorId: 'comp-1',
          name: 'Acme CRM',
          comparableToProduct: { id: 'prod-1', name: 'Our CRM', sku: 'CRM-001' },
        },
      ]);

      const result = await service.getProducts('comp-1', orgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Acme CRM');
    });

    it('should throw NotFoundException when competitor does not exist', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      await expect(service.getProducts('comp-missing', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ============ addProduct ============

  describe('addProduct', () => {
    it('should add a product to a competitor', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitorProduct.create.mockResolvedValue({
        id: 'cp-new',
        competitorId: 'comp-1',
        name: 'Acme Analytics',
        featureGaps: ['No real-time'],
        featureAdvantages: ['Better UI'],
        comparableToProduct: null,
      });

      const dto = {
        name: 'Acme Analytics',
        featureGaps: ['No real-time'],
        featureAdvantages: ['Better UI'],
      };

      const result = await service.addProduct('comp-1', dto, orgId);

      expect(result.id).toBe('cp-new');
      expect(result.name).toBe('Acme Analytics');
    });

    it('should default arrays to empty when not provided', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.competitorProduct.create.mockResolvedValue({
        id: 'cp-min',
        competitorId: 'comp-1',
        name: 'Minimal Product',
      });

      const dto = { name: 'Minimal Product' };
      await service.addProduct('comp-1', dto, orgId);

      expect(mockPrisma.competitorProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featureGaps: [],
            featureAdvantages: [],
          }),
        }),
      );
    });

    it('should throw NotFoundException when competitor does not exist', async () => {
      mockPrisma.competitor.findFirst.mockResolvedValue(null);

      await expect(
        service.addProduct('comp-missing', { name: 'Product' }, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ updateProduct ============

  describe('updateProduct', () => {
    it('should update a competitor product', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue({
        id: 'cp-1',
        competitorId: 'comp-1',
        name: 'Old Name',
        competitor: { organizationId: orgId },
      });
      mockPrisma.competitorProduct.update.mockResolvedValue({
        id: 'cp-1',
        name: 'Updated Name',
      });

      const result = await service.updateProduct('cp-1', { name: 'Updated Name' }, orgId);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProduct('cp-missing', { name: 'X' }, orgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateProduct('cp-missing', { name: 'X' }, orgId),
      ).rejects.toThrow('Competitor product not found');
    });

    it('should throw NotFoundException when product belongs to different organization', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue({
        id: 'cp-1',
        competitor: { organizationId: 'other-org' },
      });

      await expect(
        service.updateProduct('cp-1', { name: 'X' }, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ deleteProduct ============

  describe('deleteProduct', () => {
    it('should delete a competitor product', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue({
        id: 'cp-1',
        competitor: { organizationId: orgId },
      });
      mockPrisma.competitorProduct.delete.mockResolvedValue({ id: 'cp-1' });

      const result = await service.deleteProduct('cp-1', orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.competitorProduct.delete).toHaveBeenCalledWith({
        where: { id: 'cp-1' },
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue(null);

      await expect(service.deleteProduct('cp-missing', orgId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when product belongs to different organization', async () => {
      mockPrisma.competitorProduct.findUnique.mockResolvedValue({
        id: 'cp-1',
        competitor: { organizationId: 'other-org' },
      });

      await expect(service.deleteProduct('cp-1', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ============ getOpportunityCompetitors ============

  describe('getOpportunityCompetitors', () => {
    it('should return competitors linked to an opportunity for admin', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([
        {
          id: 'oc-1',
          opportunityId: 'opp-1',
          competitorId: 'comp-1',
          isPrimary: true,
          threatLevel: 'HIGH',
          competitor: {
            id: 'comp-1',
            name: 'Acme Corp',
            battlecards: [{ id: 'bc-1', isActive: true, version: 2 }],
          },
        },
      ]);

      const result = await service.getOpportunityCompetitors('opp-1', userId, true, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].isPrimary).toBe(true);
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.getOpportunityCompetitors('opp-missing', userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getOpportunityCompetitors('opp-missing', userId, false, orgId),
      ).rejects.toThrow('Opportunity not found or access denied');
    });

    it('should check owner access for non-admin users', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([]);

      await service.getOpportunityCompetitors('opp-1', userId, false, orgId);

      expect(mockPrisma.opportunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'opp-1',
            organizationId: orgId,
            ownerId: userId,
          }),
        }),
      );
    });

    it('should not check owner for admin users', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([]);

      await service.getOpportunityCompetitors('opp-1', userId, true, orgId);

      expect(mockPrisma.opportunity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'opp-1',
            organizationId: orgId,
          },
        }),
      );
    });
  });

  // ============ linkOpportunityCompetitor ============

  describe('linkOpportunityCompetitor', () => {
    it('should link a competitor to an opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.opportunityCompetitor.findUnique.mockResolvedValue(null);
      mockPrisma.opportunityCompetitor.create.mockResolvedValue({
        id: 'oc-new',
        opportunityId: 'opp-1',
        competitorId: 'comp-1',
        isPrimary: false,
        threatLevel: 'MEDIUM',
        competitor: mockCompetitor,
      });

      const dto = { competitorId: 'comp-1' };
      const result = await service.linkOpportunityCompetitor('opp-1', dto, userId, true, orgId);

      expect(result.id).toBe('oc-new');
      expect(result.threatLevel).toBe('MEDIUM');
    });

    it('should set as primary and unset other primaries', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.opportunityCompetitor.findUnique.mockResolvedValue(null);
      mockPrisma.opportunityCompetitor.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opportunityCompetitor.create.mockResolvedValue({
        id: 'oc-primary',
        isPrimary: true,
        competitor: mockCompetitor,
      });

      const dto = { competitorId: 'comp-1', isPrimary: true, threatLevel: 'HIGH' as any };
      await service.linkOpportunityCompetitor('opp-1', dto, userId, true, orgId);

      expect(mockPrisma.opportunityCompetitor.updateMany).toHaveBeenCalledWith({
        where: { opportunityId: 'opp-1', isPrimary: true },
        data: { isPrimary: false },
      });
    });

    it('should throw BadRequestException when competitor already linked', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockPrisma.opportunityCompetitor.findUnique.mockResolvedValue({
        id: 'oc-existing',
        opportunityId: 'opp-1',
        competitorId: 'comp-1',
      });

      const dto = { competitorId: 'comp-1' };

      await expect(
        service.linkOpportunityCompetitor('opp-1', dto, userId, true, orgId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.linkOpportunityCompetitor('opp-1', dto, userId, true, orgId),
      ).rejects.toThrow('Competitor already linked to this opportunity');
    });

    it('should throw NotFoundException when opportunity not accessible', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const dto = { competitorId: 'comp-1' };

      await expect(
        service.linkOpportunityCompetitor('opp-missing', dto, userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ updateOpportunityCompetitor ============

  describe('updateOpportunityCompetitor', () => {
    it('should update a linked competitor', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.update.mockResolvedValue({
        id: 'oc-1',
        threatLevel: 'CRITICAL',
        competitor: mockCompetitor,
      });

      const result = await service.updateOpportunityCompetitor(
        'opp-1',
        'comp-1',
        { threatLevel: 'CRITICAL' as any },
        userId,
        true,
        orgId,
      );

      expect(result.threatLevel).toBe('CRITICAL');
    });

    it('should unset other primaries when setting as primary', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.opportunityCompetitor.update.mockResolvedValue({
        id: 'oc-1',
        isPrimary: true,
        competitor: mockCompetitor,
      });

      await service.updateOpportunityCompetitor(
        'opp-1',
        'comp-1',
        { isPrimary: true },
        userId,
        true,
        orgId,
      );

      expect(mockPrisma.opportunityCompetitor.updateMany).toHaveBeenCalledWith({
        where: {
          opportunityId: 'opp-1',
          isPrimary: true,
          competitorId: { not: 'comp-1' },
        },
        data: { isPrimary: false },
      });
    });
  });

  // ============ unlinkOpportunityCompetitor ============

  describe('unlinkOpportunityCompetitor', () => {
    it('should unlink a competitor from an opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.delete.mockResolvedValue({ id: 'oc-1' });

      const result = await service.unlinkOpportunityCompetitor('opp-1', 'comp-1', userId, true, orgId);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.opportunityCompetitor.delete).toHaveBeenCalledWith({
        where: {
          opportunityId_competitorId: { opportunityId: 'opp-1', competitorId: 'comp-1' },
        },
      });
    });

    it('should throw NotFoundException when opportunity not accessible', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.unlinkOpportunityCompetitor('opp-missing', 'comp-1', userId, false, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ markCompetitorAsWinner ============

  describe('markCompetitorAsWinner', () => {
    it('should mark a competitor as winner and update loss stats', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.update.mockResolvedValue({
        id: 'oc-1',
        wasCompetitorWinner: true,
        lossReasons: ['Price', 'Features'],
      });
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'comp-1',
        winsAgainst: 10,
        lossesAgainst: 5,
      });
      mockPrisma.competitor.update.mockResolvedValue({});

      const result = await service.markCompetitorAsWinner(
        'opp-1',
        'comp-1',
        ['Price', 'Features'],
        userId,
        true,
        orgId,
      );

      expect(result.wasCompetitorWinner).toBe(true);
      expect(result.lossReasons).toEqual(['Price', 'Features']);
      // updateWinLossStats called with isWin = false (we lost)
      expect(mockPrisma.competitor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comp-1' },
          data: expect.objectContaining({
            winsAgainst: 10,      // unchanged
            lossesAgainst: 6,     // incremented
          }),
        }),
      );
    });

    it('should use empty array when lossReasons is undefined', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({ id: 'opp-1' });
      mockPrisma.opportunityCompetitor.update.mockResolvedValue({
        id: 'oc-1',
        wasCompetitorWinner: true,
        lossReasons: [],
      });
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'comp-1',
        winsAgainst: 0,
        lossesAgainst: 0,
      });
      mockPrisma.competitor.update.mockResolvedValue({});

      await service.markCompetitorAsWinner('opp-1', 'comp-1', undefined, userId, true, orgId);

      expect(mockPrisma.opportunityCompetitor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lossReasons: [],
          }),
        }),
      );
    });
  });

  // ============ updateWinLossStats ============

  describe('updateWinLossStats', () => {
    it('should increment winsAgainst when isWin is true', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'comp-1',
        winsAgainst: 5,
        lossesAgainst: 3,
      });
      mockPrisma.competitor.update.mockResolvedValue({});

      await service.updateWinLossStats('comp-1', true);

      expect(mockPrisma.competitor.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: {
          winsAgainst: 6,
          lossesAgainst: 3,
          winRateAgainst: expect.closeTo(66.7, 0),
        },
      });
    });

    it('should increment lossesAgainst when isWin is false', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'comp-1',
        winsAgainst: 5,
        lossesAgainst: 3,
      });
      mockPrisma.competitor.update.mockResolvedValue({});

      await service.updateWinLossStats('comp-1', false);

      expect(mockPrisma.competitor.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: {
          winsAgainst: 5,
          lossesAgainst: 4,
          winRateAgainst: expect.closeTo(55.6, 0),
        },
      });
    });

    it('should handle zero total (no wins or losses)', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'comp-1',
        winsAgainst: 0,
        lossesAgainst: 0,
      });
      mockPrisma.competitor.update.mockResolvedValue({});

      await service.updateWinLossStats('comp-1', true);

      expect(mockPrisma.competitor.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: {
          winsAgainst: 1,
          lossesAgainst: 0,
          winRateAgainst: 100,
        },
      });
    });

    it('should do nothing when competitor not found', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue(null);

      await service.updateWinLossStats('comp-missing', true);

      expect(mockPrisma.competitor.update).not.toHaveBeenCalled();
    });
  });

  // ============ getStats ============

  describe('getStats', () => {
    it('should return aggregated competitor statistics', async () => {
      mockPrisma.competitor.count.mockResolvedValue(10);
      mockPrisma.competitor.groupBy
        .mockResolvedValueOnce([
          { tier: 'PRIMARY', _count: 3 },
          { tier: 'SECONDARY', _count: 7 },
        ])
        .mockResolvedValueOnce([
          { status: 'ACTIVE', _count: 8 },
          { status: 'INACTIVE', _count: 2 },
        ]);
      mockPrisma.competitor.findMany.mockResolvedValue([
        { id: 'comp-1', name: 'Acme', tier: 'PRIMARY', winsAgainst: 10, lossesAgainst: 5, winRateAgainst: 66.7 },
      ]);

      const result = await service.getStats(orgId);

      expect(result.total).toBe(10);
      expect(result.byTier).toEqual([
        { tier: 'PRIMARY', count: 3 },
        { tier: 'SECONDARY', count: 7 },
      ]);
      expect(result.byStatus).toEqual([
        { status: 'ACTIVE', count: 8 },
        { status: 'INACTIVE', count: 2 },
      ]);
      expect(result.topCompetitors).toHaveLength(1);
    });
  });

  // ============ getWinLossAnalytics ============

  describe('getWinLossAnalytics', () => {
    it('should return win/loss analytics by competitor', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: true, amount: 50000, closedDate: new Date() },
          wasCompetitorWinner: false,
          lossReasons: [],
        },
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: false, amount: 30000, closedDate: new Date() },
          wasCompetitorWinner: true,
          lossReasons: ['Price', 'Features'],
        },
      ]);

      const result = await service.getWinLossAnalytics({}, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].competitorId).toBe('comp-1');
      expect(result[0].wins).toBe(1);
      expect(result[0].losses).toBe(1);
      expect(result[0].wonAmount).toBe(50000);
      expect(result[0].lostAmount).toBe(30000);
      expect(result[0].winRate).toBe(50);
      expect(result[0].topLossReasons).toEqual([
        { reason: 'Price', count: 1 },
        { reason: 'Features', count: 1 },
      ]);
    });

    it('should filter by competitorId', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([]);

      await service.getWinLossAnalytics({ competitorId: 'comp-1' }, orgId);

      expect(mockPrisma.opportunityCompetitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            competitorId: 'comp-1',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([]);

      await service.getWinLossAnalytics(
        { dateFrom: '2025-01-01', dateTo: '2025-12-31' },
        orgId,
      );

      expect(mockPrisma.opportunityCompetitor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunity: expect.objectContaining({
              isClosed: true,
              closedDate: {
                gte: new Date('2025-01-01'),
                lte: new Date('2025-12-31'),
              },
            }),
          }),
        }),
      );
    });

    it('should return null winRate when no wins or losses', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: false, amount: 10000, closedDate: new Date() },
          wasCompetitorWinner: false,
          lossReasons: [],
        },
      ]);

      const result = await service.getWinLossAnalytics({}, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].wins).toBe(0);
      expect(result[0].losses).toBe(0);
      expect(result[0].winRate).toBeNull();
    });

    it('should return empty array when no data exists', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([]);

      const result = await service.getWinLossAnalytics({}, orgId);

      expect(result).toEqual([]);
    });

    it('should aggregate loss reasons across multiple links', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: false, amount: 20000 },
          wasCompetitorWinner: true,
          lossReasons: ['Price', 'Features'],
        },
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: false, amount: 15000 },
          wasCompetitorWinner: true,
          lossReasons: ['Price', 'Support'],
        },
      ]);

      const result = await service.getWinLossAnalytics({}, orgId);

      expect(result[0].losses).toBe(2);
      expect(result[0].topLossReasons).toEqual([
        { reason: 'Price', count: 2 },
        { reason: 'Features', count: 1 },
        { reason: 'Support', count: 1 },
      ]);
    });

    it('should handle null amounts gracefully', async () => {
      mockPrisma.opportunityCompetitor.findMany.mockResolvedValue([
        {
          competitorId: 'comp-1',
          competitor: { id: 'comp-1', name: 'Acme' },
          opportunity: { isWon: true, amount: null, closedDate: new Date() },
          wasCompetitorWinner: false,
          lossReasons: [],
        },
      ]);

      const result = await service.getWinLossAnalytics({}, orgId);

      expect(result[0].wonAmount).toBe(0);
    });
  });
});
