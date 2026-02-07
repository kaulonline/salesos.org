// Outcome Billing Service - Core business logic for outcome-based billing
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  OutcomePricingModel,
  OutcomeEventStatus,
  OutcomePricingPlan,
  OutcomeEvent,
  Prisma,
} from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import {
  CreateOutcomePricingPlanDto,
  UpdateOutcomePricingPlanDto,
  ListOutcomeEventsQueryDto,
  ListOutcomePlansQueryDto,
  OutcomeBillingStats,
  FeeCalculationResult,
  PricingTierDto,
} from './dto';

@Injectable()
export class OutcomeBillingService {
  private readonly logger = new Logger(OutcomeBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============= Pricing Plan Management =============

  async createPricingPlan(
    dto: CreateOutcomePricingPlanDto,
  ): Promise<OutcomePricingPlan> {
    // Validate that organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${dto.organizationId} not found`,
      );
    }

    // Check if plan already exists for this organization
    const existingPlan = await this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId: dto.organizationId },
    });

    if (existingPlan) {
      throw new BadRequestException(
        `Organization ${dto.organizationId} already has a pricing plan. Use update instead.`,
      );
    }

    // Validate pricing model configuration
    this.validatePricingConfiguration(dto);

    // Apply recommended defaults for profitability
    // Default revenue share: 2.5%
    // Default min fee: $100 per deal
    // Default min deal value: $5,000
    // Default platform access fee: $49/month
    const defaults = {
      revenueSharePercent: dto.pricingModel === 'REVENUE_SHARE' ? (dto.revenueSharePercent ?? 2.5) : dto.revenueSharePercent,
      minFeePerDeal: dto.minFeePerDeal ?? 10000, // $100 minimum per deal
      minDealValue: dto.minDealValue ?? 500000,  // $5,000 minimum deal value
      platformAccessFee: dto.platformAccessFee ?? 4900, // $49/month platform fee
    };

    return this.prisma.outcomePricingPlan.create({
      data: {
        organizationId: dto.organizationId,
        pricingModel: dto.pricingModel,
        revenueSharePercent: defaults.revenueSharePercent,
        tierConfiguration: dto.tierConfiguration as InputJsonValue | undefined,
        flatFeePerDeal: dto.flatFeePerDeal,
        baseSubscriptionId: dto.baseSubscriptionId,
        outcomePercent: dto.outcomePercent,
        monthlyCap: dto.monthlyCap,
        minDealValue: defaults.minDealValue,
        minFeePerDeal: defaults.minFeePerDeal,
        platformAccessFee: defaults.platformAccessFee,
        grantsFullAccess: dto.grantsFullAccess ?? true,
        billingDay: dto.billingDay ?? 1,
        currency: dto.currency ?? 'USD',
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updatePricingPlan(
    id: string,
    dto: UpdateOutcomePricingPlanDto,
  ): Promise<OutcomePricingPlan> {
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Pricing plan with ID ${id} not found`);
    }

    // Validate if pricing model is being changed
    if (dto.pricingModel || dto.revenueSharePercent !== undefined) {
      this.validatePricingConfiguration({
        pricingModel: dto.pricingModel ?? plan.pricingModel,
        revenueSharePercent:
          dto.revenueSharePercent ?? plan.revenueSharePercent ?? undefined,
        tierConfiguration: dto.tierConfiguration ?? (plan.tierConfiguration as unknown as PricingTierDto[] | undefined),
        flatFeePerDeal: dto.flatFeePerDeal ?? plan.flatFeePerDeal ?? undefined,
        outcomePercent: dto.outcomePercent ?? plan.outcomePercent ?? undefined,
      });
    }

    return this.prisma.outcomePricingPlan.update({
      where: { id },
      data: {
        pricingModel: dto.pricingModel,
        revenueSharePercent: dto.revenueSharePercent,
        tierConfiguration: dto.tierConfiguration as InputJsonValue | undefined,
        flatFeePerDeal: dto.flatFeePerDeal,
        baseSubscriptionId: dto.baseSubscriptionId,
        outcomePercent: dto.outcomePercent,
        monthlyCap: dto.monthlyCap,
        minDealValue: dto.minDealValue,
        minFeePerDeal: dto.minFeePerDeal,
        platformAccessFee: dto.platformAccessFee,
        grantsFullAccess: dto.grantsFullAccess,
        billingDay: dto.billingDay,
        currency: dto.currency,
        isActive: dto.isActive,
      },
    });
  }

  async deletePricingPlan(id: string): Promise<void> {
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { id },
      include: { outcomeEvents: { where: { status: 'PENDING' } } },
    });

    if (!plan) {
      throw new NotFoundException(`Pricing plan with ID ${id} not found`);
    }

    if (plan.outcomeEvents.length > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${plan.outcomeEvents.length} pending outcome events. Process or void them first.`,
      );
    }

    await this.prisma.outcomePricingPlan.delete({ where: { id } });
  }

  async getPricingPlanById(id: string): Promise<OutcomePricingPlan | null> {
    return this.prisma.outcomePricingPlan.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async getPricingPlanByOrganization(
    organizationId: string,
  ): Promise<OutcomePricingPlan | null> {
    return this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId },
      include: { organization: true },
    });
  }

  async listPricingPlans(query: ListOutcomePlansQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OutcomePricingPlanWhereInput = {};

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [plans, total] = await Promise.all([
      this.prisma.outcomePricingPlan.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.outcomePricingPlan.count({ where }),
    ]);

    return {
      data: plans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============= Outcome Event Recording =============

  /**
   * Record a deal outcome for billing purposes.
   * Called when an opportunity is closed-won.
   */
  async recordDealOutcome(
    opportunityId: string,
    organizationId: string,
  ): Promise<OutcomeEvent | null> {
    // Get the pricing plan for this organization
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId },
    });

    if (!plan || !plan.isActive) {
      this.logger.debug(
        `No active pricing plan for organization ${organizationId}, skipping outcome recording`,
      );
      return null;
    }

    // Get opportunity details
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        account: { select: { name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    if (!opportunity) {
      this.logger.warn(
        `Opportunity ${opportunityId} not found for outcome recording`,
      );
      return null;
    }

    // Check if opportunity amount meets minimum threshold
    const dealAmountCents = Math.round((opportunity.amount || 0) * 100);

    if (plan.minDealValue && dealAmountCents < plan.minDealValue) {
      this.logger.debug(
        `Deal ${opportunityId} amount ${dealAmountCents} below minimum ${plan.minDealValue}, skipping`,
      );
      return null;
    }

    // Check if outcome event already exists for this opportunity
    const existingEvent = await this.prisma.outcomeEvent.findFirst({
      where: {
        opportunityId,
        status: { notIn: ['VOIDED', 'WAIVED'] },
      },
    });

    if (existingEvent) {
      this.logger.warn(
        `Outcome event already exists for opportunity ${opportunityId}`,
      );
      return existingEvent;
    }

    // Get current month billing total for cap calculation
    const currentMonthTotal = await this.getCurrentMonthBilledAmount(
      organizationId,
    );

    // Calculate fee
    const { feeAmount, calculation } = this.calculateFee(
      dealAmountCents,
      plan,
      currentMonthTotal,
    );

    // Determine billing period (current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Create outcome event
    const event = await this.prisma.outcomeEvent.create({
      data: {
        organizationId,
        outcomePricingPlanId: plan.id,
        opportunityId,
        opportunityName: opportunity.name,
        accountName: opportunity.account?.name || 'Unknown Account',
        dealAmount: dealAmountCents,
        closedDate: opportunity.closedDate || new Date(),
        ownerId: opportunity.ownerId,
        ownerName: opportunity.owner?.name,
        feeAmount,
        feeCalculation: calculation as unknown as InputJsonValue,
        status: 'PENDING',
        billingPeriodStart,
        billingPeriodEnd,
      },
    });

    this.logger.log(
      `Recorded outcome event ${event.id} for opportunity ${opportunityId}: fee=$${(feeAmount / 100).toFixed(2)}`,
    );

    return event;
  }

  /**
   * Flag an outcome event for manual review when a deal is reopened.
   */
  async flagEventForReview(
    opportunityId: string,
    reason: string,
  ): Promise<OutcomeEvent | null> {
    const event = await this.prisma.outcomeEvent.findFirst({
      where: {
        opportunityId,
        status: { in: ['PENDING', 'INVOICED'] },
      },
    });

    if (!event) {
      this.logger.debug(
        `No active outcome event found for opportunity ${opportunityId}`,
      );
      return null;
    }

    const updated = await this.prisma.outcomeEvent.update({
      where: { id: event.id },
      data: {
        status: 'FLAGGED_FOR_REVIEW',
        adminNotes: reason,
      },
    });

    this.logger.warn(
      `Flagged outcome event ${event.id} for review: ${reason}`,
    );

    return updated;
  }

  // ============= Outcome Event Management =============

  async getOutcomeEvents(query: ListOutcomeEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OutcomeEventWhereInput = {};

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.closedDate = {};
      if (query.startDate) {
        where.closedDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.closedDate.lte = new Date(query.endDate);
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.outcomeEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          outcomePricingPlan: {
            select: {
              pricingModel: true,
              currency: true,
              organization: {
                select: { id: true, name: true },
              },
            },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, status: true },
          },
        },
        orderBy: { closedDate: 'desc' },
      }),
      this.prisma.outcomeEvent.count({ where }),
    ]);

    return {
      data: events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOutcomeEventById(id: string): Promise<OutcomeEvent | null> {
    return this.prisma.outcomeEvent.findUnique({
      where: { id },
      include: {
        outcomePricingPlan: true,
        invoice: true,
      },
    });
  }

  async waiveEvent(
    eventId: string,
    reason: string,
    reviewerId: string,
  ): Promise<OutcomeEvent> {
    const event = await this.prisma.outcomeEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Outcome event ${eventId} not found`);
    }

    if (!['PENDING', 'FLAGGED_FOR_REVIEW'].includes(event.status)) {
      throw new BadRequestException(
        `Cannot waive event with status ${event.status}. Only PENDING or FLAGGED_FOR_REVIEW events can be waived.`,
      );
    }

    return this.prisma.outcomeEvent.update({
      where: { id: eventId },
      data: {
        status: 'WAIVED',
        adminNotes: reason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async voidEvent(
    eventId: string,
    reason: string,
    reviewerId: string,
  ): Promise<OutcomeEvent> {
    const event = await this.prisma.outcomeEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Outcome event ${eventId} not found`);
    }

    if (!['PENDING', 'FLAGGED_FOR_REVIEW'].includes(event.status)) {
      throw new BadRequestException(
        `Cannot void event with status ${event.status}. Only PENDING or FLAGGED_FOR_REVIEW events can be voided.`,
      );
    }

    return this.prisma.outcomeEvent.update({
      where: { id: eventId },
      data: {
        status: 'VOIDED',
        adminNotes: reason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async resolveReview(
    eventId: string,
    action: 'approve' | 'void' | 'waive',
    reason: string | undefined,
    reviewerId: string,
  ): Promise<OutcomeEvent> {
    const event = await this.prisma.outcomeEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Outcome event ${eventId} not found`);
    }

    if (event.status !== 'FLAGGED_FOR_REVIEW') {
      throw new BadRequestException(
        `Event is not flagged for review. Current status: ${event.status}`,
      );
    }

    let newStatus: OutcomeEventStatus;
    switch (action) {
      case 'approve':
        newStatus = 'PENDING';
        break;
      case 'void':
        newStatus = 'VOIDED';
        break;
      case 'waive':
        newStatus = 'WAIVED';
        break;
    }

    return this.prisma.outcomeEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        adminNotes: reason
          ? `${event.adminNotes || ''}\nReview decision: ${action}. ${reason}`
          : `${event.adminNotes || ''}\nReview decision: ${action}`,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  // ============= Statistics & Reporting =============

  async getOutcomeBillingStats(
    organizationId: string,
  ): Promise<OutcomeBillingStats | null> {
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId },
    });

    if (!plan) {
      return null;
    }

    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const lastPeriodStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const lastPeriodEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // Current period stats
    const currentPeriodEvents = await this.prisma.outcomeEvent.findMany({
      where: {
        organizationId,
        billingPeriodStart: { gte: currentPeriodStart },
        billingPeriodEnd: { lte: currentPeriodEnd },
        status: { in: ['PENDING', 'INVOICED', 'PAID'] },
      },
    });

    const currentPeriodFees = currentPeriodEvents.reduce(
      (sum, e) => sum + e.feeAmount,
      0,
    );
    const currentPeriodDealValue = currentPeriodEvents.reduce(
      (sum, e) => sum + e.dealAmount,
      0,
    );

    // Last period stats
    const lastPeriodEvents = await this.prisma.outcomeEvent.findMany({
      where: {
        organizationId,
        billingPeriodStart: { gte: lastPeriodStart },
        billingPeriodEnd: { lte: lastPeriodEnd },
        status: { in: ['PENDING', 'INVOICED', 'PAID'] },
      },
    });

    const lastPeriodFees = lastPeriodEvents.reduce(
      (sum, e) => sum + e.feeAmount,
      0,
    );

    // Lifetime stats
    const lifetimeAgg = await this.prisma.outcomeEvent.aggregate({
      where: {
        organizationId,
        status: { in: ['INVOICED', 'PAID'] },
      },
      _sum: { feeAmount: true },
      _count: true,
    });

    // Cap calculation
    let capRemaining: number | null = null;
    let capUtilizationPercent: number | null = null;

    if (plan.monthlyCap) {
      capRemaining = Math.max(0, plan.monthlyCap - currentPeriodFees);
      capUtilizationPercent = Math.round(
        (currentPeriodFees / plan.monthlyCap) * 100,
      );
    }

    return {
      currentPeriodStart,
      currentPeriodEnd,
      currentPeriodFees,
      currentPeriodDeals: currentPeriodEvents.length,
      currentPeriodDealValue,
      monthlyCap: plan.monthlyCap,
      capRemaining,
      capUtilizationPercent,
      lastPeriodFees,
      lastPeriodDeals: lastPeriodEvents.length,
      totalLifetimeFees: lifetimeAgg._sum.feeAmount || 0,
      totalLifetimeDeals: lifetimeAgg._count,
      pricingModel: plan.pricingModel,
      planDetails: {
        revenueSharePercent: plan.revenueSharePercent ?? undefined,
        flatFeePerDeal: plan.flatFeePerDeal ?? undefined,
        outcomePercent: plan.outcomePercent ?? undefined,
        tierConfiguration: plan.tierConfiguration as unknown as PricingTierDto[] | undefined,
        minFeePerDeal: plan.minFeePerDeal ?? undefined,
        platformAccessFee: plan.platformAccessFee ?? undefined,
        minDealValue: plan.minDealValue ?? undefined,
      },
    };
  }

  async getAdminDashboardStats() {
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Active plans count
    const activePlansCount = await this.prisma.outcomePricingPlan.count({
      where: { isActive: true },
    });

    // Pending events
    const pendingEventsCount = await this.prisma.outcomeEvent.count({
      where: { status: 'PENDING' },
    });

    // Flagged for review
    const flaggedEventsCount = await this.prisma.outcomeEvent.count({
      where: { status: 'FLAGGED_FOR_REVIEW' },
    });

    // Current month revenue
    const currentMonthAgg = await this.prisma.outcomeEvent.aggregate({
      where: {
        billingPeriodStart: { gte: currentPeriodStart },
        status: { in: ['PENDING', 'INVOICED', 'PAID'] },
      },
      _sum: { feeAmount: true, dealAmount: true },
      _count: true,
    });

    // Total revenue all time
    const totalAgg = await this.prisma.outcomeEvent.aggregate({
      where: {
        status: { in: ['INVOICED', 'PAID'] },
      },
      _sum: { feeAmount: true },
    });

    return {
      activePlans: activePlansCount,
      pendingEvents: pendingEventsCount,
      flaggedForReview: flaggedEventsCount,
      currentMonthFees: currentMonthAgg._sum.feeAmount || 0,
      currentMonthDeals: currentMonthAgg._count,
      currentMonthDealValue: currentMonthAgg._sum.dealAmount || 0,
      totalLifetimeRevenue: totalAgg._sum.feeAmount || 0,
    };
  }

  // ============= Access Control =============

  /**
   * Check if an organization has full platform access through outcome billing.
   * Used by the licensing system to grant access without traditional licenses.
   */
  async hasOutcomeBasedAccess(organizationId: string): Promise<boolean> {
    const plan = await this.prisma.outcomePricingPlan.findUnique({
      where: { organizationId },
      select: { isActive: true, grantsFullAccess: true },
    });

    return !!(plan && plan.isActive && plan.grantsFullAccess);
  }

  /**
   * Check if a user has full platform access through their organization's outcome billing.
   */
  async userHasOutcomeBasedAccess(userId: string): Promise<boolean> {
    // Find user's organization memberships
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      select: { organizationId: true },
    });

    if (memberships.length === 0) {
      return false;
    }

    // Check if any org has active outcome billing with full access
    const plansWithAccess = await this.prisma.outcomePricingPlan.findFirst({
      where: {
        organizationId: { in: memberships.map((m) => m.organizationId) },
        isActive: true,
        grantsFullAccess: true,
      },
    });

    return !!plansWithAccess;
  }

  // ============= Helper Methods =============

  /**
   * Calculate the fee for a deal based on the pricing plan.
   */
  calculateFee(
    dealAmountCents: number,
    plan: OutcomePricingPlan,
    currentMonthTotalCents: number,
  ): FeeCalculationResult {
    let fee = 0;
    const calculation: FeeCalculationResult['calculation'] = {
      model: plan.pricingModel,
      dealAmount: dealAmountCents,
    };

    // Check minimum deal value
    if (plan.minDealValue && dealAmountCents < plan.minDealValue) {
      calculation.belowMinimum = true;
      return { feeAmount: 0, calculation };
    }

    switch (plan.pricingModel) {
      case OutcomePricingModel.REVENUE_SHARE:
        if (plan.revenueSharePercent) {
          fee = Math.round(
            dealAmountCents * (plan.revenueSharePercent / 100),
          );
          calculation.percent = plan.revenueSharePercent;
        }
        break;

      case OutcomePricingModel.TIERED_FLAT_FEE:
        if (plan.tierConfiguration) {
          const tiers = plan.tierConfiguration as unknown as PricingTierDto[];
          const tier = tiers.find(
            (t) =>
              dealAmountCents >= t.minAmount &&
              (t.maxAmount === null ||
                t.maxAmount === undefined ||
                dealAmountCents <= t.maxAmount),
          );
          if (tier) {
            fee = tier.fee;
            calculation.tier = tier;
          }
        }
        break;

      case OutcomePricingModel.FLAT_PER_DEAL:
        fee = plan.flatFeePerDeal || 0;
        break;

      case OutcomePricingModel.HYBRID:
        if (plan.outcomePercent) {
          fee = Math.round(dealAmountCents * (plan.outcomePercent / 100));
          calculation.percent = plan.outcomePercent;
        }
        break;
    }

    // Apply minimum fee per deal (profitability safeguard)
    if (plan.minFeePerDeal && fee > 0 && fee < plan.minFeePerDeal) {
      calculation.calculatedFee = fee;
      calculation.minFeeApplied = true;
      fee = plan.minFeePerDeal;
    }

    // Apply monthly cap
    if (plan.monthlyCap) {
      const remainingCap = plan.monthlyCap - currentMonthTotalCents;
      if (remainingCap <= 0) {
        fee = 0;
        calculation.cappedToZero = true;
      } else if (fee > remainingCap) {
        calculation.originalFee = fee;
        fee = remainingCap;
        calculation.cappedTo = remainingCap;
      }
    }

    return { feeAmount: fee, calculation };
  }

  /**
   * Get the total billed amount for the current month.
   */
  async getCurrentMonthBilledAmount(organizationId: string): Promise<number> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.prisma.outcomeEvent.aggregate({
      where: {
        organizationId,
        billingPeriodStart: { gte: periodStart },
        status: { in: ['PENDING', 'INVOICED', 'PAID'] },
      },
      _sum: { feeAmount: true },
    });

    return result._sum.feeAmount || 0;
  }

  /**
   * Validate pricing configuration based on model type.
   */
  private validatePricingConfiguration(
    dto: Partial<CreateOutcomePricingPlanDto>,
  ): void {
    switch (dto.pricingModel) {
      case OutcomePricingModel.REVENUE_SHARE:
        if (
          dto.revenueSharePercent === undefined ||
          dto.revenueSharePercent === null
        ) {
          throw new BadRequestException(
            'Revenue share percentage is required for REVENUE_SHARE pricing model',
          );
        }
        break;

      case OutcomePricingModel.TIERED_FLAT_FEE:
        if (
          !dto.tierConfiguration ||
          !Array.isArray(dto.tierConfiguration) ||
          dto.tierConfiguration.length === 0
        ) {
          throw new BadRequestException(
            'Tier configuration is required for TIERED_FLAT_FEE pricing model',
          );
        }
        break;

      case OutcomePricingModel.FLAT_PER_DEAL:
        if (dto.flatFeePerDeal === undefined || dto.flatFeePerDeal === null) {
          throw new BadRequestException(
            'Flat fee per deal is required for FLAT_PER_DEAL pricing model',
          );
        }
        break;

      case OutcomePricingModel.HYBRID:
        if (dto.outcomePercent === undefined || dto.outcomePercent === null) {
          throw new BadRequestException(
            'Outcome percentage is required for HYBRID pricing model',
          );
        }
        break;
    }
  }
}
