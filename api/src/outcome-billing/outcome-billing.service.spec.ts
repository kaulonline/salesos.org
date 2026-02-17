import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OutcomeBillingService } from './outcome-billing.service';
import { PrismaService } from '../database/prisma.service';

describe('OutcomeBillingService', () => {
  let service: OutcomeBillingService;
  let prisma: PrismaService;

  // ============= Mock Data =============

  const mockOrganization = {
    id: 'org-1',
    name: 'Test Corp',
    slug: 'test-corp',
  };

  const basePlan = {
    id: 'plan-1',
    organizationId: 'org-1',
    pricingModel: 'REVENUE_SHARE' as const,
    revenueSharePercent: 2.5,
    tierConfiguration: null,
    flatFeePerDeal: null,
    baseSubscriptionId: null,
    outcomePercent: null,
    monthlyCap: null,
    minDealValue: 500000, // $5,000
    minFeePerDeal: 10000, // $100
    platformAccessFee: 4900, // $49
    grantsFullAccess: true,
    billingDay: 1,
    currency: 'USD',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockOpportunity = {
    id: 'opp-1',
    name: 'Big Deal',
    amount: 25000, // $25,000
    closedDate: new Date('2026-02-10'),
    ownerId: 'user-1',
    account: { name: 'Acme Inc' },
    owner: { id: 'user-1', name: 'John Doe' },
  };

  const mockOutcomeEvent = {
    id: 'event-1',
    organizationId: 'org-1',
    outcomePricingPlanId: 'plan-1',
    opportunityId: 'opp-1',
    opportunityName: 'Big Deal',
    accountName: 'Acme Inc',
    dealAmount: 2500000, // $25,000 in cents
    closedDate: new Date('2026-02-10'),
    ownerId: 'user-1',
    ownerName: 'John Doe',
    feeAmount: 62500, // $625
    feeCalculation: { model: 'REVENUE_SHARE', dealAmount: 2500000, percent: 2.5 },
    status: 'PENDING' as const,
    invoiceId: null,
    invoiceLineItemId: null,
    invoicedAt: null,
    billingPeriodStart: new Date('2026-02-01'),
    billingPeriodEnd: new Date('2026-02-28'),
    adminNotes: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-02-10'),
  };

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
    },
    outcomePricingPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    outcomeEvent: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    opportunity: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutcomeBillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OutcomeBillingService>(OutcomeBillingService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================================
  // FEE CALCULATION TESTS - Pure logic, most critical
  // =============================================================

  describe('calculateFee', () => {
    describe('REVENUE_SHARE model', () => {
      it('should calculate 2.5% revenue share correctly', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: 2.5 };
        const result = service.calculateFee(2500000, plan as any, 0); // $25,000 deal

        expect(result.feeAmount).toBe(62500); // $625
        expect(result.calculation.model).toBe('REVENUE_SHARE');
        expect(result.calculation.percent).toBe(2.5);
      });

      it('should calculate 5% revenue share correctly', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: 5 };
        const result = service.calculateFee(1000000, plan as any, 0); // $10,000 deal

        expect(result.feeAmount).toBe(50000); // $500
      });

      it('should handle 0% revenue share', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: 0 };
        const result = service.calculateFee(2500000, plan as any, 0);

        // revenueSharePercent is 0, which is falsy, so fee stays 0
        expect(result.feeAmount).toBe(0);
      });

      it('should handle null revenueSharePercent', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: null, minFeePerDeal: null };
        const result = service.calculateFee(2500000, plan as any, 0);

        expect(result.feeAmount).toBe(0);
      });

      it('should round to nearest cent', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: 3.3 };
        // $15,000 deal * 3.3% = $495.00 exactly = 49500 cents
        const result = service.calculateFee(1500000, plan as any, 0);

        expect(result.feeAmount).toBe(49500);
        expect(Number.isInteger(result.feeAmount)).toBe(true);
      });

      it('should round fractional cents correctly', () => {
        const plan = { ...basePlan, pricingModel: 'REVENUE_SHARE' as const, revenueSharePercent: 2.5, minFeePerDeal: null };
        // $10,001 deal = 1000100 cents * 2.5% = 25002.5 -> rounds to 25003
        const result = service.calculateFee(1000100, plan as any, 0);

        expect(result.feeAmount).toBe(25003); // Math.round(25002.5)
        expect(Number.isInteger(result.feeAmount)).toBe(true);
      });
    });

    describe('TIERED_FLAT_FEE model', () => {
      const tieredPlan = {
        ...basePlan,
        pricingModel: 'TIERED_FLAT_FEE' as const,
        revenueSharePercent: null,
        tierConfiguration: [
          { minAmount: 0, maxAmount: 500000, fee: 25000 },         // $0-$5K -> $250
          { minAmount: 500000, maxAmount: 2500000, fee: 50000 },   // $5K-$25K -> $500
          { minAmount: 2500000, maxAmount: 10000000, fee: 100000 }, // $25K-$100K -> $1000
          { minAmount: 10000000, maxAmount: null, fee: 250000 },   // $100K+ -> $2500
        ],
        minFeePerDeal: null,
      };

      it('should match the correct tier for a $10,000 deal', () => {
        const result = service.calculateFee(1000000, tieredPlan as any, 0);

        expect(result.feeAmount).toBe(50000); // $500
        expect(result.calculation.tier).toEqual({ minAmount: 500000, maxAmount: 2500000, fee: 50000 });
      });

      it('should match lowest tier for small deals', () => {
        // Override minDealValue to null so the tier matching is tested independently
        const noMinPlan = { ...tieredPlan, minDealValue: null };
        const result = service.calculateFee(300000, noMinPlan as any, 0); // $3,000

        expect(result.feeAmount).toBe(25000); // $250
      });

      it('should reject small deals below minDealValue even if tier exists', () => {
        // tieredPlan inherits minDealValue: 500000 ($5,000) from basePlan
        const result = service.calculateFee(300000, tieredPlan as any, 0); // $3,000

        expect(result.feeAmount).toBe(0);
        expect(result.calculation.belowMinimum).toBe(true);
      });

      it('should match highest tier (no upper bound) for large deals', () => {
        const result = service.calculateFee(15000000, tieredPlan as any, 0); // $150,000

        expect(result.feeAmount).toBe(250000); // $2500
      });

      it('should match tier at exact boundary', () => {
        const result = service.calculateFee(2500000, tieredPlan as any, 0); // Exactly $25,000

        expect(result.feeAmount).toBe(50000); // $500 (matches $5K-$25K tier since 2500000 <= 2500000)
      });

      it('should return 0 when no tier matches', () => {
        const noMatchPlan = {
          ...tieredPlan,
          tierConfiguration: [
            { minAmount: 1000000, maxAmount: 2000000, fee: 50000 }, // Only covers $10K-$20K
          ],
        };
        const result = service.calculateFee(500000, noMatchPlan as any, 0); // $5,000 - no matching tier

        expect(result.feeAmount).toBe(0);
      });

      it('should handle null/empty tier configuration', () => {
        const emptyPlan = { ...tieredPlan, tierConfiguration: null };
        const result = service.calculateFee(1000000, emptyPlan as any, 0);

        expect(result.feeAmount).toBe(0);
      });
    });

    describe('FLAT_PER_DEAL model', () => {
      const flatPlan = {
        ...basePlan,
        pricingModel: 'FLAT_PER_DEAL' as const,
        revenueSharePercent: null,
        flatFeePerDeal: 15000, // $150 per deal
        minFeePerDeal: null,
      };

      it('should charge fixed fee regardless of deal size', () => {
        const smallDeal = service.calculateFee(500000, flatPlan as any, 0);  // $5,000 deal
        const bigDeal = service.calculateFee(50000000, flatPlan as any, 0); // $500,000 deal

        expect(smallDeal.feeAmount).toBe(15000); // $150
        expect(bigDeal.feeAmount).toBe(15000);   // $150
      });

      it('should handle null flatFeePerDeal', () => {
        const nullPlan = { ...flatPlan, flatFeePerDeal: null };
        const result = service.calculateFee(1000000, nullPlan as any, 0);

        expect(result.feeAmount).toBe(0);
      });
    });

    describe('HYBRID model', () => {
      const hybridPlan = {
        ...basePlan,
        pricingModel: 'HYBRID' as const,
        revenueSharePercent: null,
        outcomePercent: 1.0,
        baseSubscriptionId: 'sub-123',
        minFeePerDeal: null,
      };

      it('should calculate hybrid outcome percentage', () => {
        const result = service.calculateFee(2500000, hybridPlan as any, 0); // $25,000 deal

        expect(result.feeAmount).toBe(25000); // 1% of $25,000 = $250
        expect(result.calculation.percent).toBe(1.0);
      });

      it('should handle null outcomePercent', () => {
        const nullPlan = { ...hybridPlan, outcomePercent: null };
        const result = service.calculateFee(2500000, nullPlan as any, 0);

        expect(result.feeAmount).toBe(0);
      });
    });

    describe('Minimum fee per deal (profitability safeguard)', () => {
      it('should apply minimum fee when calculated fee is below threshold', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 1,    // 1%
          minFeePerDeal: 10000,      // $100 minimum
        };
        // $6,000 deal * 1% = $60 -> below $100 minimum
        const result = service.calculateFee(600000, plan as any, 0);

        expect(result.feeAmount).toBe(10000); // $100 minimum applied
        expect(result.calculation.minFeeApplied).toBe(true);
        expect(result.calculation.calculatedFee).toBe(6000); // Original $60
      });

      it('should NOT apply minimum fee when calculated fee exceeds threshold', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 2.5,
          minFeePerDeal: 10000, // $100 minimum
        };
        // $25,000 deal * 2.5% = $625 -> above $100 minimum
        const result = service.calculateFee(2500000, plan as any, 0);

        expect(result.feeAmount).toBe(62500); // $625, no minimum applied
        expect(result.calculation.minFeeApplied).toBeUndefined();
      });

      it('should NOT apply minimum fee when fee is zero', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: null,
          minFeePerDeal: 10000,
        };
        const result = service.calculateFee(2500000, plan as any, 0);

        // Fee is 0 because revenueSharePercent is null; min fee only applies when fee > 0
        expect(result.feeAmount).toBe(0);
        expect(result.calculation.minFeeApplied).toBeUndefined();
      });
    });

    describe('Minimum deal value', () => {
      it('should return zero fee for deals below minimum value', () => {
        const plan = {
          ...basePlan,
          minDealValue: 500000, // $5,000 minimum
        };
        const result = service.calculateFee(400000, plan as any, 0); // $4,000 deal

        expect(result.feeAmount).toBe(0);
        expect(result.calculation.belowMinimum).toBe(true);
      });

      it('should process deals at exactly the minimum value', () => {
        const plan = {
          ...basePlan,
          minDealValue: 500000, // $5,000 minimum
          revenueSharePercent: 2.5,
        };
        const result = service.calculateFee(500000, plan as any, 0); // Exactly $5,000

        // 500000 < 500000 is false, so it should process
        expect(result.feeAmount).toBe(12500); // $125
        expect(result.calculation.belowMinimum).toBeUndefined();
      });

      it('should skip minimum value check when minDealValue is null', () => {
        const plan = {
          ...basePlan,
          minDealValue: null,
          revenueSharePercent: 2.5,
          minFeePerDeal: null,
        };
        const result = service.calculateFee(100, plan as any, 0); // Very small deal

        expect(result.feeAmount).toBe(3); // Math.round(100 * 0.025)
        expect(result.calculation.belowMinimum).toBeUndefined();
      });
    });

    describe('Monthly cap', () => {
      it('should cap fee when total would exceed monthly cap', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 2.5,
          monthlyCap: 100000, // $1,000 monthly cap
          minFeePerDeal: null,
        };
        // Already billed $800 this month, new fee would be $625 -> cap to $200
        const result = service.calculateFee(2500000, plan as any, 80000);

        expect(result.feeAmount).toBe(20000); // $200 (remaining cap)
        expect(result.calculation.originalFee).toBe(62500); // Original $625
        expect(result.calculation.cappedTo).toBe(20000);
      });

      it('should set fee to zero when cap already reached', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 2.5,
          monthlyCap: 100000, // $1,000 monthly cap
          minFeePerDeal: null,
        };
        // Already billed $1,000+ this month
        const result = service.calculateFee(2500000, plan as any, 100000);

        expect(result.feeAmount).toBe(0);
        expect(result.calculation.cappedToZero).toBe(true);
      });

      it('should not cap when no monthly cap is set', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 2.5,
          monthlyCap: null,
          minFeePerDeal: null,
        };
        const result = service.calculateFee(2500000, plan as any, 99999999);

        expect(result.feeAmount).toBe(62500); // No cap applied
        expect(result.calculation.cappedToZero).toBeUndefined();
        expect(result.calculation.cappedTo).toBeUndefined();
      });

      it('should allow full fee when under cap', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 2.5,
          monthlyCap: 200000, // $2,000 monthly cap
          minFeePerDeal: null,
        };
        const result = service.calculateFee(2500000, plan as any, 0);

        expect(result.feeAmount).toBe(62500); // $625, well under $2,000 cap
        expect(result.calculation.cappedTo).toBeUndefined();
      });
    });

    describe('Combined safeguards', () => {
      it('should apply minimum fee THEN monthly cap', () => {
        const plan = {
          ...basePlan,
          pricingModel: 'REVENUE_SHARE' as const,
          revenueSharePercent: 1,
          minFeePerDeal: 10000, // $100 minimum
          monthlyCap: 15000,    // $150 cap
        };
        // $6,000 deal * 1% = $60 -> min fee $100 -> then cap to remaining $50
        const result = service.calculateFee(600000, plan as any, 10000);

        expect(result.feeAmount).toBe(5000); // $50 remaining cap
        expect(result.calculation.minFeeApplied).toBe(true);
        expect(result.calculation.originalFee).toBe(10000); // After min fee
        expect(result.calculation.cappedTo).toBe(5000);
      });
    });
  });

  // =============================================================
  // PRICING PLAN MANAGEMENT TESTS
  // =============================================================

  describe('createPricingPlan', () => {
    it('should create a revenue share plan with defaults', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);
      mockPrisma.outcomePricingPlan.create.mockResolvedValue(basePlan);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'REVENUE_SHARE' as const,
        revenueSharePercent: 2.5,
      };

      const result = await service.createPricingPlan(dto);

      expect(result).toEqual(basePlan);
      expect(mockPrisma.outcomePricingPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          pricingModel: 'REVENUE_SHARE',
          revenueSharePercent: 2.5,
          minFeePerDeal: 10000,
          minDealValue: 500000,
          platformAccessFee: 4900,
          grantsFullAccess: true,
          billingDay: 1,
          currency: 'USD',
          isActive: true,
        }),
      });
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const dto = {
        organizationId: 'non-existent',
        pricingModel: 'REVENUE_SHARE' as const,
        revenueSharePercent: 2.5,
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when plan already exists for org', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'REVENUE_SHARE' as const,
        revenueSharePercent: 2.5,
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate REVENUE_SHARE requires revenueSharePercent', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'REVENUE_SHARE' as const,
        // Missing revenueSharePercent
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate TIERED_FLAT_FEE requires tierConfiguration', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'TIERED_FLAT_FEE' as const,
        // Missing tierConfiguration
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate FLAT_PER_DEAL requires flatFeePerDeal', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'FLAT_PER_DEAL' as const,
        // Missing flatFeePerDeal
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate HYBRID requires outcomePercent', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const dto = {
        organizationId: 'org-1',
        pricingModel: 'HYBRID' as const,
        // Missing outcomePercent
      };

      await expect(service.createPricingPlan(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updatePricingPlan', () => {
    it('should update plan fields', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.outcomePricingPlan.update.mockResolvedValue({
        ...basePlan,
        revenueSharePercent: 3.0,
      });

      const result = await service.updatePricingPlan('plan-1', {
        revenueSharePercent: 3.0,
      });

      expect(result.revenueSharePercent).toBe(3.0);
      expect(mockPrisma.outcomePricingPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ revenueSharePercent: 3.0 }),
      });
    });

    it('should throw NotFoundException when plan does not exist', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePricingPlan('non-existent', { revenueSharePercent: 3.0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePricingPlan', () => {
    it('should delete plan with no pending events', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        ...basePlan,
        outcomeEvents: [],
      });
      mockPrisma.outcomePricingPlan.delete.mockResolvedValue(basePlan);

      await expect(service.deletePricingPlan('plan-1')).resolves.not.toThrow();
      expect(mockPrisma.outcomePricingPlan.delete).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
      });
    });

    it('should throw NotFoundException when plan does not exist', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      await expect(service.deletePricingPlan('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when plan has pending events', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        ...basePlan,
        outcomeEvents: [mockOutcomeEvent],
      });

      await expect(service.deletePricingPlan('plan-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listPricingPlans', () => {
    it('should return paginated plans', async () => {
      mockPrisma.outcomePricingPlan.findMany.mockResolvedValue([basePlan]);
      mockPrisma.outcomePricingPlan.count.mockResolvedValue(1);

      const result = await service.listPricingPlans({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by isActive', async () => {
      mockPrisma.outcomePricingPlan.findMany.mockResolvedValue([]);
      mockPrisma.outcomePricingPlan.count.mockResolvedValue(0);

      await service.listPricingPlans({ isActive: true });

      expect(mockPrisma.outcomePricingPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });
  });

  // =============================================================
  // OUTCOME EVENT RECORDING TESTS
  // =============================================================

  describe('recordDealOutcome', () => {
    it('should record outcome event for a closed deal', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.outcomeEvent.findFirst.mockResolvedValue(null); // No existing event
      mockPrisma.outcomeEvent.aggregate.mockResolvedValue({ _sum: { feeAmount: 0 } });
      mockPrisma.outcomeEvent.create.mockResolvedValue(mockOutcomeEvent);

      const result = await service.recordDealOutcome('opp-1', 'org-1');

      expect(result).toEqual(mockOutcomeEvent);
      expect(mockPrisma.outcomeEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          outcomePricingPlanId: 'plan-1',
          opportunityId: 'opp-1',
          opportunityName: 'Big Deal',
          accountName: 'Acme Inc',
          dealAmount: 2500000,
          status: 'PENDING',
        }),
      });
    });

    it('should return null when no active plan exists', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const result = await service.recordDealOutcome('opp-1', 'org-1');

      expect(result).toBeNull();
      expect(mockPrisma.outcomeEvent.create).not.toHaveBeenCalled();
    });

    it('should return null when plan is inactive', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        ...basePlan,
        isActive: false,
      });

      const result = await service.recordDealOutcome('opp-1', 'org-1');

      expect(result).toBeNull();
    });

    it('should return null when opportunity is not found', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.opportunity.findUnique.mockResolvedValue(null);

      const result = await service.recordDealOutcome('opp-999', 'org-1');

      expect(result).toBeNull();
    });

    it('should return null when deal amount is below minimum', async () => {
      const smallOpp = { ...mockOpportunity, amount: 40 }; // $40
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.opportunity.findUnique.mockResolvedValue(smallOpp);

      const result = await service.recordDealOutcome('opp-1', 'org-1');

      expect(result).toBeNull();
      expect(mockPrisma.outcomeEvent.create).not.toHaveBeenCalled();
    });

    it('should return existing event if one already exists for opportunity', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.outcomeEvent.findFirst.mockResolvedValue(mockOutcomeEvent);

      const result = await service.recordDealOutcome('opp-1', 'org-1');

      expect(result).toEqual(mockOutcomeEvent);
      expect(mockPrisma.outcomeEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('flagEventForReview', () => {
    it('should flag a PENDING event for review', async () => {
      const flaggedEvent = { ...mockOutcomeEvent, status: 'FLAGGED_FOR_REVIEW', adminNotes: 'Deal reopened' };
      mockPrisma.outcomeEvent.findFirst.mockResolvedValue(mockOutcomeEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue(flaggedEvent);

      const result = await service.flagEventForReview('opp-1', 'Deal reopened');

      expect(result?.status).toBe('FLAGGED_FOR_REVIEW');
      expect(mockPrisma.outcomeEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          status: 'FLAGGED_FOR_REVIEW',
          adminNotes: 'Deal reopened',
        },
      });
    });

    it('should return null when no active event exists', async () => {
      mockPrisma.outcomeEvent.findFirst.mockResolvedValue(null);

      const result = await service.flagEventForReview('opp-999', 'Deal reopened');

      expect(result).toBeNull();
    });
  });

  // =============================================================
  // EVENT MANAGEMENT TESTS (waive, void, resolve)
  // =============================================================

  describe('waiveEvent', () => {
    it('should waive a PENDING event', async () => {
      const waived = { ...mockOutcomeEvent, status: 'WAIVED', adminNotes: 'Customer goodwill', reviewedBy: 'admin-1' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(mockOutcomeEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue(waived);

      const result = await service.waiveEvent('event-1', 'Customer goodwill', 'admin-1');

      expect(result.status).toBe('WAIVED');
      expect(mockPrisma.outcomeEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          status: 'WAIVED',
          adminNotes: 'Customer goodwill',
          reviewedBy: 'admin-1',
        }),
      });
    });

    it('should waive a FLAGGED_FOR_REVIEW event', async () => {
      const flaggedEvent = { ...mockOutcomeEvent, status: 'FLAGGED_FOR_REVIEW' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(flaggedEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue({ ...flaggedEvent, status: 'WAIVED' });

      const result = await service.waiveEvent('event-1', 'Goodwill', 'admin-1');

      expect(result.status).toBe('WAIVED');
    });

    it('should throw NotFoundException for non-existent event', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.waiveEvent('non-existent', 'reason', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for INVOICED events', async () => {
      const invoicedEvent = { ...mockOutcomeEvent, status: 'INVOICED' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(invoicedEvent);

      await expect(
        service.waiveEvent('event-1', 'reason', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for PAID events', async () => {
      const paidEvent = { ...mockOutcomeEvent, status: 'PAID' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(paidEvent);

      await expect(
        service.waiveEvent('event-1', 'reason', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('voidEvent', () => {
    it('should void a PENDING event', async () => {
      const voided = { ...mockOutcomeEvent, status: 'VOIDED', adminNotes: 'Invalid deal', reviewedBy: 'admin-1' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(mockOutcomeEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue(voided);

      const result = await service.voidEvent('event-1', 'Invalid deal', 'admin-1');

      expect(result.status).toBe('VOIDED');
    });

    it('should throw BadRequestException for INVOICED events', async () => {
      const invoicedEvent = { ...mockOutcomeEvent, status: 'INVOICED' };
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(invoicedEvent);

      await expect(
        service.voidEvent('event-1', 'reason', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveReview', () => {
    const flaggedEvent = { ...mockOutcomeEvent, status: 'FLAGGED_FOR_REVIEW', adminNotes: 'Deal reopened' };

    it('should approve a flagged event (back to PENDING)', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(flaggedEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue({ ...flaggedEvent, status: 'PENDING' });

      const result = await service.resolveReview('event-1', 'approve', 'Deal confirmed valid', 'admin-1');

      expect(result.status).toBe('PENDING');
      expect(mockPrisma.outcomeEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          status: 'PENDING',
          reviewedBy: 'admin-1',
        }),
      });
    });

    it('should void a flagged event', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(flaggedEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue({ ...flaggedEvent, status: 'VOIDED' });

      const result = await service.resolveReview('event-1', 'void', 'Deal was fake', 'admin-1');

      expect(result.status).toBe('VOIDED');
    });

    it('should waive a flagged event', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(flaggedEvent);
      mockPrisma.outcomeEvent.update.mockResolvedValue({ ...flaggedEvent, status: 'WAIVED' });

      const result = await service.resolveReview('event-1', 'waive', 'Customer relations', 'admin-1');

      expect(result.status).toBe('WAIVED');
    });

    it('should throw BadRequestException if event is not flagged', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(mockOutcomeEvent); // PENDING status

      await expect(
        service.resolveReview('event-1', 'approve', undefined, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent event', async () => {
      mockPrisma.outcomeEvent.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReview('non-existent', 'approve', undefined, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =============================================================
  // STATISTICS & REPORTING TESTS
  // =============================================================

  describe('getOutcomeBillingStats', () => {
    it('should return null when no plan exists', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const result = await service.getOutcomeBillingStats('org-1');

      expect(result).toBeNull();
    });

    it('should return comprehensive stats for organization', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(basePlan);
      mockPrisma.outcomeEvent.findMany
        .mockResolvedValueOnce([mockOutcomeEvent]) // current period
        .mockResolvedValueOnce([]);                 // last period
      mockPrisma.outcomeEvent.aggregate.mockResolvedValue({
        _sum: { feeAmount: 125000 },
        _count: 5,
      });

      const result = await service.getOutcomeBillingStats('org-1');

      expect(result).toBeDefined();
      expect(result!.currentPeriodFees).toBe(62500);
      expect(result!.currentPeriodDeals).toBe(1);
      expect(result!.currentPeriodDealValue).toBe(2500000);
      expect(result!.lastPeriodFees).toBe(0);
      expect(result!.lastPeriodDeals).toBe(0);
      expect(result!.totalLifetimeFees).toBe(125000);
      expect(result!.totalLifetimeDeals).toBe(5);
      expect(result!.pricingModel).toBe('REVENUE_SHARE');
    });

    it('should calculate cap utilization when monthly cap is set', async () => {
      const cappedPlan = { ...basePlan, monthlyCap: 200000 }; // $2,000 cap
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(cappedPlan);
      mockPrisma.outcomeEvent.findMany
        .mockResolvedValueOnce([mockOutcomeEvent]) // current period: $625 fees
        .mockResolvedValueOnce([]);
      mockPrisma.outcomeEvent.aggregate.mockResolvedValue({ _sum: { feeAmount: 0 }, _count: 0 });

      const result = await service.getOutcomeBillingStats('org-1');

      expect(result!.monthlyCap).toBe(200000);
      expect(result!.capRemaining).toBe(137500); // $2,000 - $625 = $1,375
      expect(result!.capUtilizationPercent).toBe(31); // 62500/200000 * 100 = 31.25 -> 31
    });
  });

  describe('getAdminDashboardStats', () => {
    it('should aggregate admin dashboard metrics', async () => {
      mockPrisma.outcomePricingPlan.count.mockResolvedValue(3);
      mockPrisma.outcomeEvent.count
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(2); // flagged
      mockPrisma.outcomeEvent.aggregate
        .mockResolvedValueOnce({
          _sum: { feeAmount: 150000, dealAmount: 6000000 },
          _count: 4,
        })
        .mockResolvedValueOnce({
          _sum: { feeAmount: 500000 },
        });

      const result = await service.getAdminDashboardStats();

      expect(result.activePlans).toBe(3);
      expect(result.pendingEvents).toBe(5);
      expect(result.flaggedForReview).toBe(2);
      expect(result.currentMonthFees).toBe(150000);
      expect(result.currentMonthDeals).toBe(4);
      expect(result.currentMonthDealValue).toBe(6000000);
      expect(result.totalLifetimeRevenue).toBe(500000);
    });
  });

  // =============================================================
  // ACCESS CONTROL TESTS
  // =============================================================

  describe('hasOutcomeBasedAccess', () => {
    it('should return true for org with active plan granting full access', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        isActive: true,
        grantsFullAccess: true,
      });

      const result = await service.hasOutcomeBasedAccess('org-1');

      expect(result).toBe(true);
    });

    it('should return false for inactive plan', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        isActive: false,
        grantsFullAccess: true,
      });

      const result = await service.hasOutcomeBasedAccess('org-1');

      expect(result).toBe(false);
    });

    it('should return false when grantsFullAccess is false', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        isActive: true,
        grantsFullAccess: false,
      });

      const result = await service.hasOutcomeBasedAccess('org-1');

      expect(result).toBe(false);
    });

    it('should return false when no plan exists', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const result = await service.hasOutcomeBasedAccess('org-1');

      expect(result).toBe(false);
    });
  });

  describe('userHasOutcomeBasedAccess', () => {
    it('should return true when user belongs to org with outcome billing access', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { organizationId: 'org-1' },
      ]);
      mockPrisma.outcomePricingPlan.findFirst.mockResolvedValue(basePlan);

      const result = await service.userHasOutcomeBasedAccess('user-1');

      expect(result).toBe(true);
    });

    it('should return false when user has no memberships', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);

      const result = await service.userHasOutcomeBasedAccess('user-1');

      expect(result).toBe(false);
    });

    it('should return false when no org has outcome billing', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        { organizationId: 'org-1' },
      ]);
      mockPrisma.outcomePricingPlan.findFirst.mockResolvedValue(null);

      const result = await service.userHasOutcomeBasedAccess('user-1');

      expect(result).toBe(false);
    });
  });

  // =============================================================
  // QUERY TESTS
  // =============================================================

  describe('getOutcomeEvents', () => {
    it('should return paginated events', async () => {
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([mockOutcomeEvent]);
      mockPrisma.outcomeEvent.count.mockResolvedValue(1);

      const result = await service.getOutcomeEvents({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.outcomeEvent.count.mockResolvedValue(0);

      await service.getOutcomeEvents({ status: 'PENDING' as any });

      expect(mockPrisma.outcomeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.outcomeEvent.count.mockResolvedValue(0);

      await service.getOutcomeEvents({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(mockPrisma.outcomeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            closedDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter by organizationId', async () => {
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([]);
      mockPrisma.outcomeEvent.count.mockResolvedValue(0);

      await service.getOutcomeEvents({ organizationId: 'org-1' });

      expect(mockPrisma.outcomeEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
    });
  });

  describe('getCurrentMonthBilledAmount', () => {
    it('should return aggregate fee amount for current month', async () => {
      mockPrisma.outcomeEvent.aggregate.mockResolvedValue({
        _sum: { feeAmount: 125000 },
      });

      const result = await service.getCurrentMonthBilledAmount('org-1');

      expect(result).toBe(125000);
    });

    it('should return 0 when no events exist', async () => {
      mockPrisma.outcomeEvent.aggregate.mockResolvedValue({
        _sum: { feeAmount: null },
      });

      const result = await service.getCurrentMonthBilledAmount('org-1');

      expect(result).toBe(0);
    });
  });
});
