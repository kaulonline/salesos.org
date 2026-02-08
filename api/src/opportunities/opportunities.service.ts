import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { OutcomeBillingService } from '../outcome-billing/outcome-billing.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { WorkflowTriggerType, WorkflowEntityType } from '../workflows/dto/workflow.dto';
import { Opportunity, OpportunityStage, Prisma } from '@prisma/client';
import { validateForeignKeyId } from '../common/validators/foreign-key.validator';

interface CreateOpportunityDto {
  name: string;
  accountId: string;
  amount?: number;
  closeDate?: Date;
  opportunitySource?: string;
  type?: string;
  stage?: OpportunityStage;
  probability?: number;
  needsAnalysis?: string;
  proposedSolution?: string;
  competitors?: string[];
  nextStep?: string;
}

interface UpdateOpportunityDto extends Partial<CreateOpportunityDto> {}

interface OpportunityAnalysis {
  winProbability: number;
  riskFactors: string[];
  recommendedActions: string[];
  dealVelocity: number;
  reasoning: string;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  // Stage-based probability defaults
  private readonly stageProbabilities: Record<OpportunityStage, number> = {
    [OpportunityStage.PROSPECTING]: 10,
    [OpportunityStage.QUALIFICATION]: 20,
    [OpportunityStage.NEEDS_ANALYSIS]: 30,
    [OpportunityStage.VALUE_PROPOSITION]: 40,
    [OpportunityStage.DECISION_MAKERS_IDENTIFIED]: 50,
    [OpportunityStage.PERCEPTION_ANALYSIS]: 60,
    [OpportunityStage.PROPOSAL_PRICE_QUOTE]: 75,
    [OpportunityStage.NEGOTIATION_REVIEW]: 90,
    [OpportunityStage.CLOSED_WON]: 100,
    [OpportunityStage.CLOSED_LOST]: 0,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly notificationScheduler: NotificationSchedulerService,
    @Inject(forwardRef(() => OutcomeBillingService))
    private readonly outcomeBillingService: OutcomeBillingService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  // Create new opportunity
  async createOpportunity(data: CreateOpportunityDto, ownerId: string, organizationId: string): Promise<Opportunity> {
    this.logger.log(`Creating opportunity: ${data.name}`);

    // Validate accountId is in correct format (not Salesforce ID)
    validateForeignKeyId(data.accountId, 'accountId', 'Account');

    const stage = data.stage || OpportunityStage.PROSPECTING;
    const probability = data.probability ?? this.stageProbabilities[stage];

    const opportunity = await this.prisma.opportunity.create({
      data: {
        name: data.name,
        accountId: data.accountId,
        ownerId,
        organizationId,
        amount: data.amount,
        closeDate: data.closeDate,
        opportunitySource: data.opportunitySource as any,
        type: data.type as any,
        stage,
        probability,
        expectedRevenue: data.amount ? data.amount * (probability / 100) : null,
        needsAnalysis: data.needsAnalysis,
        proposedSolution: data.proposedSolution,
        competitors: data.competitors || [],
        nextStep: data.nextStep,
      },
      include: {
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Analyze opportunity asynchronously
    this.analyzeOpportunityAsync(opportunity.id, ownerId, organizationId).catch((err) => {
      this.logger.error(`Failed to analyze opportunity ${opportunity.id}: ${err.message}`);
    });

    // Trigger workflows for opportunity creation
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_CREATED,
      WorkflowEntityType.OPPORTUNITY,
      opportunity.id,
      { opportunity, ownerId, organizationId }
    ).catch((err) => {
      this.logger.error(`Failed to process workflows for opportunity ${opportunity.id}: ${err.message}`);
    });

    return opportunity;
  }

  // Get opportunity by ID (with ownership verification)
  async getOpportunity(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({
      where,
      include: {
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        contactRoles: {
          include: {
            contact: true,
          },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { activityDate: 'desc' },
          take: 10,
        },
        notes: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }

    return opportunity;
  }

  // List opportunities with filtering and cursor-based pagination
  async listOpportunities(filters: {
    stage?: OpportunityStage;
    ownerId?: string;
    accountId?: string;
    isClosed?: boolean;
    minAmount?: number;
    search?: string;
    cursor?: string;
    limit?: number;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Opportunity[] | { data: Opportunity[]; nextCursor?: string; hasMore: boolean }> {
    const where: Prisma.OpportunityWhereInput = {};

    if (filters?.stage) {
      where.stage = filters.stage;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.isClosed !== undefined) {
      where.isClosed = filters.isClosed;
    }

    if (filters?.minAmount) {
      where.amount = { gte: filters.minAmount };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { account: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    where.organizationId = organizationId;

    const includeConfig = {
      account: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      contactRoles: {
        where: { isPrimary: true },
        include: {
          contact: true,
        },
      },
    };

    const orderByConfig = [
      { isClosed: 'asc' as const },
      { closeDate: 'asc' as const },
      { amount: 'desc' as const },
    ];

    // If cursor/limit provided, use cursor-based pagination
    if (filters?.limit) {
      const limit = Math.min(filters.limit, 100); // Cap at 100
      const queryOptions: any = {
        where,
        include: includeConfig,
        orderBy: orderByConfig,
        take: limit + 1, // Fetch one extra to check if there are more
      };

      if (filters.cursor) {
        queryOptions.skip = 1; // Skip the cursor itself
        queryOptions.cursor = { id: filters.cursor };
      }

      const opportunities = await this.prisma.opportunity.findMany(queryOptions);

      const hasMore = opportunities.length > limit;
      const data = hasMore ? opportunities.slice(0, limit) : opportunities;
      const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

      return {
        data,
        nextCursor,
        hasMore,
      };
    }

    // Default: return all matching opportunities (backward compatible)
    return this.prisma.opportunity.findMany({
      where,
      include: includeConfig,
      orderBy: orderByConfig,
    });
  }

  // Update opportunity (with ownership verification)
  async updateOpportunity(id: string, userId: string, data: UpdateOpportunityDto, organizationId: string, isAdmin?: boolean): Promise<Opportunity> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }

    const updateData: Prisma.OpportunityUpdateInput = {};

    // Copy non-enum fields
    Object.keys(data).forEach((key) => {
      if (key !== 'opportunitySource' && key !== 'type') {
        updateData[key] = data[key];
      }
    });

    // Handle enum fields properly
    if (data.opportunitySource) updateData.opportunitySource = data.opportunitySource as any;
    if (data.type) updateData.type = data.type as any;

    // Update probability based on stage if stage changed
    if (data.stage && data.stage !== opportunity.stage) {
      updateData.probability = this.stageProbabilities[data.stage];

      // Check if deal is being reopened (changed from CLOSED_WON to another stage)
      if (opportunity.isWon && data.stage !== OpportunityStage.CLOSED_WON) {
        // Reset isClosed and isWon if reopening
        updateData.isClosed = false;
        updateData.isWon = false;
        updateData.closedDate = null;

        // Flag any existing outcome events for manual review
        this.outcomeBillingService
          .flagEventForReview(id, `Deal reopened - changed from CLOSED_WON to ${data.stage}`)
          .catch((err) => this.logger.error(`Failed to flag outcome event for review: ${err.message}`));
      }
    }

    // Recalculate expected revenue
    const newAmount = data.amount ?? opportunity.amount;
    const newProbability = (updateData.probability as number) ?? opportunity.probability;
    if (newAmount && newProbability) {
      updateData.expectedRevenue = newAmount * (newProbability / 100);
    }

    // Calculate deal velocity (days in current stage)
    const daysInStage = Math.floor(
      (new Date().getTime() - opportunity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    updateData.dealVelocity = daysInStage;

    const stageChanged = data.stage && data.stage !== opportunity.stage;
    const previousStage = opportunity.stage;

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Trigger workflows for opportunity update
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_UPDATED,
      WorkflowEntityType.OPPORTUNITY,
      id,
      { opportunity: updated, userId, organizationId, previousData: opportunity }
    ).catch((err) => {
      this.logger.error(`Failed to process update workflows for opportunity ${id}: ${err.message}`);
    });

    // Trigger stage changed workflow if stage changed
    if (stageChanged) {
      this.workflowsService.processTrigger(
        WorkflowTriggerType.STAGE_CHANGED,
        WorkflowEntityType.OPPORTUNITY,
        id,
        { opportunity: updated, previousStage, newStage: data.stage, userId, organizationId }
      ).catch((err) => {
        this.logger.error(`Failed to process stage change workflows for opportunity ${id}: ${err.message}`);
      });
    }

    return updated;
  }

  // Move opportunity to next stage (with ownership verification)
  async advanceStage(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<Opportunity> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }

    if (opportunity.isClosed) {
      throw new BadRequestException('Cannot advance a closed opportunity');
    }

    const stages = Object.values(OpportunityStage).filter(
      (s) => s !== OpportunityStage.CLOSED_WON && s !== OpportunityStage.CLOSED_LOST,
    );
    const currentIndex = stages.findIndex((s) => s === opportunity.stage);

    if (currentIndex === stages.length - 1) {
      throw new BadRequestException('Opportunity is already at the final stage before close');
    }

    const nextStage = stages[currentIndex + 1];

    return this.updateOpportunity(id, userId, { stage: nextStage }, organizationId, isAdmin);
  }

  // Close opportunity as won (with ownership verification)
  async closeWon(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<Opportunity> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({
      where,
      include: { account: true },
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }

    if (opportunity.isClosed) {
      throw new BadRequestException('Opportunity is already closed');
    }

    // Update opportunity
    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        stage: OpportunityStage.CLOSED_WON,
        isClosed: true,
        isWon: true,
        closedDate: new Date(),
        probability: 100,
      },
    });

    // Update account to CUSTOMER if it was PROSPECT
    if (opportunity.account.type === 'PROSPECT') {
      await this.prisma.account.update({
        where: { id: opportunity.accountId },
        data: {
          type: 'CUSTOMER',
          accountStatus: 'ACTIVE',
        },
      });
    }

    this.logger.log(`Closed opportunity ${id} as WON`);

    // Record outcome event for billing (if org has outcome pricing plan)
    this.outcomeBillingService
      .recordDealOutcome(id, organizationId)
      .catch((err) => this.logger.error(`Failed to record outcome event: ${err.message}`));

    // Send Deal Won notification to the opportunity owner
    const amount = opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : 'N/A';
    this.notificationScheduler.sendSystemNotification(
      opportunity.ownerId,
      '🎉 Deal Won!',
      `Congratulations! "${opportunity.name}" closed for ${amount}`,
      {
        type: 'DEAL_UPDATE',
        priority: 'HIGH',
        action: 'VIEW_OPPORTUNITY',
        actionData: {
          opportunityId: id,
          accountId: opportunity.accountId,
          accountName: opportunity.account.name,
          amount: opportunity.amount,
        },
      },
    ).catch((err) => this.logger.error(`Failed to send Deal Won notification: ${err.message}`));

    return updated;
  }

  // Close opportunity as lost (with ownership verification)
  async closeLost(id: string, userId: string, organizationId: string, reason?: string, isAdmin?: boolean): Promise<Opportunity> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({
      where,
      include: { account: true },
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${id} not found`);
    }

    if (opportunity.isClosed) {
      throw new BadRequestException('Opportunity is already closed');
    }

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        stage: OpportunityStage.CLOSED_LOST,
        isClosed: true,
        isWon: false,
        closedDate: new Date(),
        lostReason: reason,
        probability: 0,
      },
    });

    this.logger.log(`Closed opportunity ${id} as LOST: ${reason || 'No reason provided'}`);

    // Send Deal Lost notification to the opportunity owner
    const amount = opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : 'N/A';
    this.notificationScheduler.sendSystemNotification(
      opportunity.ownerId,
      'Deal Lost',
      `"${opportunity.name}" (${amount}) was closed lost${reason ? `: ${reason}` : ''}`,
      {
        type: 'DEAL_UPDATE',
        priority: 'NORMAL',
        action: 'VIEW_OPPORTUNITY',
        actionData: {
          opportunityId: id,
          accountId: opportunity.accountId,
          accountName: opportunity.account.name,
          amount: opportunity.amount,
          lostReason: reason,
        },
      },
    ).catch((err) => this.logger.error(`Failed to send Deal Lost notification: ${err.message}`));

    return updated;
  }

  // AI-powered opportunity analysis (with ownership verification)
  async analyzeOpportunity(opportunityId: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<OpportunityAnalysis> {
    const opportunity = await this.getOpportunity(opportunityId, userId, organizationId, isAdmin);

    const prompt = this.buildAnalysisPrompt(opportunity);

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content:
              'You are an AI sales analyst. Analyze the opportunity and provide win probability, risk factors, and recommended actions. Respond in JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 1500,
      });

      // Strip markdown code fences if present (```json ... ```)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        // Remove opening fence (```json or ```)
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing fence
        jsonStr = jsonStr.replace(/\n?```\s*$/, '');
      }
      const result = JSON.parse(jsonStr) as OpportunityAnalysis;

      // Calculate deal velocity
      const daysInStage = Math.floor(
        (new Date().getTime() - opportunity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Convert structured objects to strings for Prisma storage
      // Prisma schema stores these as String[] arrays
      const riskFactorStrings = result.riskFactors?.map((rf: any) =>
        typeof rf === 'string' ? rf : `[${rf.severity}] ${rf.factor}: ${rf.description}`
      ) || [];
      const actionStrings = result.recommendedActions?.map((ra: any) =>
        typeof ra === 'string' ? ra : `[${ra.priority}] ${ra.action}: ${ra.rationale}`
      ) || [];

      // Update opportunity with analysis (storing as strings)
      await this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          winProbability: result.winProbability,
          riskFactors: riskFactorStrings,
          recommendedActions: actionStrings,
          dealVelocity: daysInStage,
        },
      });

      this.logger.log(
        `Analyzed opportunity ${opportunityId}: ${(result.winProbability * 100).toFixed(0)}% win probability`,
      );

      // Return the full structured response to the frontend
      return { ...result, dealVelocity: daysInStage };
    } catch (error) {
      this.logger.error(`Failed to analyze opportunity ${opportunityId}: ${error.message}`);
      throw error;
    }
  }

  // Async analysis (fire and forget)
  private async analyzeOpportunityAsync(opportunityId: string, userId: string, organizationId: string): Promise<void> {
    try {
      await this.analyzeOpportunity(opportunityId, userId, organizationId, undefined);
    } catch (error) {
      this.logger.error(`Async analysis failed for opportunity ${opportunityId}: ${error.message}`);
    }
  }

  // Add contact to opportunity with role (with ownership verification)
  async addContact(
    opportunityId: string,
    userId: string,
    contactId: string,
    organizationId: string,
    role?: string,
    isPrimary: boolean = false,
    isAdmin?: boolean,
  ): Promise<any> {
    // Verify ownership first
    const where: any = { id: opportunityId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await this.prisma.opportunityContactRole.updateMany({
        where: { opportunityId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.opportunityContactRole.create({
      data: {
        opportunityId,
        contactId,
        role: role as any,
        isPrimary,
      },
      include: {
        contact: true,
      },
    });
  }

  /**
   * Get all contacts associated with an opportunity
   */
  async getContacts(opportunityId: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any[]> {
    const where: any = { id: opportunityId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    return this.prisma.opportunityContactRole.findMany({
      where: { opportunityId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            avatarUrl: true,
            department: true,
            seniorityLevel: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Update a contact's role on an opportunity
   */
  async updateContact(
    opportunityId: string,
    contactId: string,
    userId: string,
    data: { role?: string; isPrimary?: boolean },
    organizationId: string,
    isAdmin?: boolean,
  ): Promise<any> {
    const where: any = { id: opportunityId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    const contactRole = await this.prisma.opportunityContactRole.findUnique({
      where: {
        opportunityId_contactId: { opportunityId, contactId },
      },
    });

    if (!contactRole) {
      throw new NotFoundException(`Contact ${contactId} not found on opportunity ${opportunityId}`);
    }

    // If setting as primary, unset other primary contacts
    if (data.isPrimary) {
      await this.prisma.opportunityContactRole.updateMany({
        where: { opportunityId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.opportunityContactRole.update({
      where: {
        opportunityId_contactId: { opportunityId, contactId },
      },
      data: {
        role: data.role as any,
        isPrimary: data.isPrimary,
      },
      include: {
        contact: true,
      },
    });
  }

  /**
   * Remove a contact from an opportunity
   */
  async removeContact(opportunityId: string, contactId: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id: opportunityId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    const contactRole = await this.prisma.opportunityContactRole.findUnique({
      where: {
        opportunityId_contactId: { opportunityId, contactId },
      },
    });

    if (!contactRole) {
      throw new NotFoundException(`Contact ${contactId} not found on opportunity ${opportunityId}`);
    }

    await this.prisma.opportunityContactRole.delete({
      where: {
        opportunityId_contactId: { opportunityId, contactId },
      },
    });
  }

  /**
   * Set a contact as the primary contact for an opportunity
   */
  async setPrimaryContact(opportunityId: string, contactId: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id: opportunityId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const opportunity = await this.prisma.opportunity.findFirst({ where });
    if (!opportunity) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found`);
    }

    // Unset all primary contacts first
    await this.prisma.opportunityContactRole.updateMany({
      where: { opportunityId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set the new primary contact
    return this.prisma.opportunityContactRole.update({
      where: {
        opportunityId_contactId: { opportunityId, contactId },
      },
      data: { isPrimary: true },
      include: {
        contact: true,
      },
    });
  }

  // Get pipeline statistics
  async getPipelineStats(organizationId: string, ownerId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.OpportunityWhereInput = {
      isClosed: false,
      ...(ownerId && !isAdmin && { ownerId }),
      organizationId,
    };

    const [opportunities, byStage, totalValue, expectedRevenue] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.groupBy({
        by: ['stage'],
        where,
        _count: true,
        _sum: {
          amount: true,
          expectedRevenue: true,
        },
      }),
      this.prisma.opportunity.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.opportunity.aggregate({
        where,
        _sum: {
          expectedRevenue: true,
        },
      }),
    ]);

    // Get closed stats
    const [wonCount, lostCount, wonValue] = await Promise.all([
      this.prisma.opportunity.count({
        where: { isWon: true, ...(ownerId && !isAdmin && { ownerId }), organizationId },
      }),
      this.prisma.opportunity.count({
        where: { isClosed: true, isWon: false, ...(ownerId && !isAdmin && { ownerId }), organizationId },
      }),
      this.prisma.opportunity.aggregate({
        where: { isWon: true, ...(ownerId && !isAdmin && { ownerId }), organizationId },
        _sum: { amount: true },
      }),
    ]);

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;

    return {
      openOpportunities: opportunities,
      byStage,
      totalPipelineValue: totalValue._sum.amount || 0,
      expectedRevenue: expectedRevenue._sum.expectedRevenue || 0,
      wonCount,
      lostCount,
      wonValue: wonValue._sum.amount || 0,
      winRate,
    };
  }

  // Get forecasting data
  async getForecast(organizationId: string, ownerId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.OpportunityWhereInput = {
      isClosed: false,
      ...(ownerId && !isAdmin && { ownerId }),
      organizationId,
    };

    // Group by close date month
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        ...where,
        closeDate: { not: null },
      },
      select: {
        closeDate: true,
        amount: true,
        expectedRevenue: true,
        probability: true,
        stage: true,
      },
    });

    // Get current quarter boundaries
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const quarterStartMonth = currentQuarter * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);

    // Group by month and calculate quarter totals
    const forecast: Record<string, any> = {};
    let quarterRevenue = 0;
    let quarterCommit = 0;
    let quarterBestCase = 0;
    let quarterOppCount = 0;
    let highProbabilityCount = 0;

    opportunities.forEach((opp) => {
      if (!opp.closeDate) return;

      const month = opp.closeDate.toISOString().slice(0, 7); // YYYY-MM
      if (!forecast[month]) {
        forecast[month] = {
          month,
          bestCase: 0,
          mostLikely: 0,
          commit: 0,
          closed: 0,
        };
      }

      const amount = opp.amount || 0;
      const expectedRev = opp.expectedRevenue || (amount * (opp.probability || 0) / 100);
      forecast[month].bestCase += amount;
      forecast[month].mostLikely += expectedRev;

      // Commit: >= 75% probability
      if (opp.probability && opp.probability >= 75) {
        forecast[month].commit += expectedRev;
      }

      // Calculate current quarter totals
      if (opp.closeDate >= quarterStart && opp.closeDate <= quarterEnd) {
        quarterBestCase += amount;
        quarterRevenue += expectedRev;
        quarterOppCount++;
        if (opp.probability && opp.probability >= 75) {
          quarterCommit += expectedRev;
          highProbabilityCount++;
        }
      }
    });

    // Determine confidence level based on high-probability deals ratio
    let confidence: string;
    if (quarterOppCount === 0) {
      confidence = 'Low';
    } else {
      const commitRatio = quarterCommit / (quarterRevenue || 1);
      const highProbRatio = highProbabilityCount / quarterOppCount;
      if (commitRatio >= 0.7 || highProbRatio >= 0.5) {
        confidence = 'High';
      } else if (commitRatio >= 0.4 || highProbRatio >= 0.3) {
        confidence = 'Medium';
      } else {
        confidence = 'Low';
      }
    }

    // Return object with quarterRevenue for frontend compatibility
    return {
      quarterRevenue: Math.round(quarterRevenue),
      quarterBestCase: Math.round(quarterBestCase),
      quarterCommit: Math.round(quarterCommit),
      confidence,
      quarterName: `Q${currentQuarter + 1} ${now.getFullYear()}`,
      opportunityCount: quarterOppCount,
      monthly: Object.values(forecast).sort((a: any, b: any) => a.month.localeCompare(b.month)),
    };
  }

  // Helper: Build analysis prompt
  private buildAnalysisPrompt(opportunity: any): string {
    return `
Analyze this sales opportunity and provide a comprehensive assessment:

Opportunity Information:
- Name: ${opportunity.name}
- Account: ${opportunity.account.name}
- Amount: ${opportunity.amount ? `$${opportunity.amount.toLocaleString()}` : 'Unknown'}
- Current Stage: ${opportunity.stage}
- Current Probability: ${opportunity.probability}%
- Close Date: ${opportunity.closeDate ? opportunity.closeDate.toISOString().split('T')[0] : 'Not set'}
- Days in Current Stage: ${opportunity.dealVelocity || 'Unknown'}

${opportunity.needsAnalysis ? `Needs Analysis: ${opportunity.needsAnalysis}` : ''}
${opportunity.proposedSolution ? `Proposed Solution: ${opportunity.proposedSolution}` : ''}
${opportunity.competitors?.length > 0 ? `Competitors: ${opportunity.competitors.join(', ')}` : ''}
${opportunity.nextStep ? `Next Step: ${opportunity.nextStep}` : ''}

Contacts Involved:
${opportunity.contactRoles?.length > 0 ? opportunity.contactRoles.map((cr: any) => `- ${cr.contact.firstName} ${cr.contact.lastName} (${cr.contact.title || 'Unknown'})${cr.isPrimary ? ' - Primary' : ''}`).join('\n') : 'No contacts linked'}

Recent Activities:
${opportunity.activities?.length > 0 ? opportunity.activities.slice(0, 5).map((a: any) => `- ${a.type}: ${a.subject} (${a.activityDate.toISOString().split('T')[0]})`).join('\n') : 'No recent activities'}

Please provide your assessment in this EXACT JSON format:
{
  "winProbability": <number between 0 and 1>,
  "dealHealth": "<HEALTHY|AT_RISK|CRITICAL>",
  "riskFactors": [
    {
      "factor": "<brief risk title>",
      "severity": "<HIGH|MEDIUM|LOW>",
      "description": "<detailed explanation>"
    }
  ],
  "recommendedActions": [
    {
      "action": "<specific action to take>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "rationale": "<why this action matters>"
    }
  ],
  "insights": ["<key insight 1>", "<key insight 2>"]
}

Guidelines:
- winProbability: Based on stage, engagement, and deal health (0-1)
- dealHealth: HEALTHY (on track), AT_RISK (needs attention), or CRITICAL (urgent issues)
- riskFactors: 2-4 risks with severity levels
- recommendedActions: 2-4 specific next steps with priorities
- insights: 2-3 key observations about the opportunity

Consider:
- Stage alignment with close date
- Contact engagement and roles
- Deal velocity (time in stage)
- Competition
- Completeness of qualification
- Recent activity patterns

Respond ONLY with the JSON object, no additional text.
`.trim();
  }

  // ============ Bulk Operations ============

  async bulkUpdate(ids: string[], userId: string, updates: any, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.opportunity.updateMany({
      where,
      data: updates,
    });

    return {
      message: `Successfully updated ${result.count} opportunities`,
      count: result.count,
    };
  }

  async bulkDelete(ids: string[], userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.opportunity.deleteMany({ where });

    return {
      message: `Successfully deleted ${result.count} opportunities`,
      count: result.count,
    };
  }

  async bulkAssign(ids: string[], userId: string, newOwnerId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.opportunity.updateMany({
      where,
      data: { ownerId: newOwnerId },
    });

    return {
      message: `Successfully assigned ${result.count} opportunities to new owner`,
      count: result.count,
    };
  }

  async bulkUpdateStage(ids: string[], userId: string, stage: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.opportunity.updateMany({
      where,
      data: { stage: stage as any },
    });

    return {
      message: `Successfully updated stage for ${result.count} opportunities`,
      count: result.count,
    };
  }
}
