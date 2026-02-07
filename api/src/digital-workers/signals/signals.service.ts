import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { SearchService } from '../../search/search.service';
import { SignalType, SignalSource, SignalStatus, SignalPriority, RecommendedActionType, Prisma } from '@prisma/client';
import {
  GetSignalsDto,
  CreateSignalDto,
  AcknowledgeSignalDto,
  SignalResponse,
  SignalRecommendationResponse,
  ExecuteRecommendationDto,
  SignalsSummary,
} from '../dto/signals.dto';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Get signals with filtering
   */
  async getSignals(userId: string, dto: GetSignalsDto): Promise<SignalResponse[]> {
    const where: Prisma.AccountSignalWhereInput = {};

    // Filter by account
    if (dto.accountId) {
      where.accountId = dto.accountId;
    } else {
      // Only show signals for accounts owned by user
      where.account = { ownerId: userId };
    }

    // Filter by status
    if (dto.status) {
      where.status = dto.status;
    }

    // Filter by priority
    if (dto.priority) {
      where.priority = dto.priority;
    }

    // Filter by signal types
    if (dto.signalTypes && dto.signalTypes.length > 0) {
      where.type = { in: dto.signalTypes };
    }

    // Filter by timeframe
    if (dto.timeframe) {
      const now = new Date();
      let startDate: Date;
      switch (dto.timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      where.createdAt = { gte: startDate };
    }

    const signals = await this.prisma.accountSignal.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
      take: dto.limit || 50,
      skip: dto.offset || 0,
    });

    return signals.map(signal => ({
      ...signal,
      description: signal.description ?? undefined,
      recommendedAction: signal.recommendedAction ?? undefined,
      acknowledgedAt: signal.acknowledgedAt ?? undefined,
      acknowledgedBy: signal.acknowledgedBy ?? undefined,
      actionedAt: signal.actionedAt ?? undefined,
      actionedBy: signal.actionedBy ?? undefined,
      dismissedAt: signal.dismissedAt ?? undefined,
      dismissedBy: signal.dismissedBy ?? undefined,
      dismissReason: signal.dismissReason ?? undefined,
      expiresAt: signal.expiresAt ?? undefined,
      sourceId: signal.sourceId ?? undefined,
      accountName: signal.account.name,
      data: signal.data as Record<string, any>,
    }));
  }

  /**
   * Get a single signal by ID
   */
  async getSignalById(signalId: string, userId: string): Promise<SignalResponse> {
    const signal = await this.prisma.accountSignal.findFirst({
      where: {
        id: signalId,
        account: { ownerId: userId },
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    if (!signal) {
      throw new NotFoundException(`Signal with ID ${signalId} not found`);
    }

    return {
      ...signal,
      description: signal.description ?? undefined,
      recommendedAction: signal.recommendedAction ?? undefined,
      acknowledgedAt: signal.acknowledgedAt ?? undefined,
      acknowledgedBy: signal.acknowledgedBy ?? undefined,
      actionedAt: signal.actionedAt ?? undefined,
      actionedBy: signal.actionedBy ?? undefined,
      dismissedAt: signal.dismissedAt ?? undefined,
      dismissedBy: signal.dismissedBy ?? undefined,
      dismissReason: signal.dismissReason ?? undefined,
      expiresAt: signal.expiresAt ?? undefined,
      sourceId: signal.sourceId ?? undefined,
      accountName: signal.account.name,
      data: signal.data as Record<string, any>,
    };
  }

  /**
   * Create a new signal (for manual or external sources)
   */
  async createSignal(userId: string, dto: CreateSignalDto): Promise<SignalResponse> {
    // Verify account ownership
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, ownerId: userId },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${dto.accountId} not found`);
    }

    const signal = await this.prisma.accountSignal.create({
      data: {
        accountId: dto.accountId,
        createdById: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        confidence: dto.confidence || 0.5,
        source: dto.source,
        sourceId: dto.sourceId,
        data: dto.data || {},
        recommendedAction: dto.recommendedAction,
        priority: dto.priority || SignalPriority.MEDIUM,
        status: SignalStatus.PENDING,
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    return {
      ...signal,
      description: signal.description ?? undefined,
      recommendedAction: signal.recommendedAction ?? undefined,
      acknowledgedAt: signal.acknowledgedAt ?? undefined,
      acknowledgedBy: signal.acknowledgedBy ?? undefined,
      actionedAt: signal.actionedAt ?? undefined,
      actionedBy: signal.actionedBy ?? undefined,
      dismissedAt: signal.dismissedAt ?? undefined,
      dismissedBy: signal.dismissedBy ?? undefined,
      dismissReason: signal.dismissReason ?? undefined,
      expiresAt: signal.expiresAt ?? undefined,
      sourceId: signal.sourceId ?? undefined,
      accountName: signal.account.name,
      data: signal.data as Record<string, any>,
    };
  }

  /**
   * Acknowledge, action, or dismiss a signal
   */
  async acknowledgeSignal(
    signalId: string,
    userId: string,
    dto: AcknowledgeSignalDto,
  ): Promise<SignalResponse> {
    const signal = await this.prisma.accountSignal.findFirst({
      where: {
        id: signalId,
        account: { ownerId: userId },
      },
    });

    if (!signal) {
      throw new NotFoundException(`Signal with ID ${signalId} not found`);
    }

    const updateData: Prisma.AccountSignalUpdateInput = {};

    switch (dto.action) {
      case 'acknowledge':
        updateData.status = SignalStatus.ACKNOWLEDGED;
        updateData.acknowledgedAt = new Date();
        updateData.acknowledgedBy = userId;
        break;
      case 'action':
        updateData.status = SignalStatus.ACTIONED;
        updateData.actionedAt = new Date();
        updateData.actionedBy = userId;
        break;
      case 'dismiss':
        updateData.status = SignalStatus.DISMISSED;
        updateData.dismissedAt = new Date();
        updateData.dismissedBy = userId;
        updateData.dismissReason = dto.notes;
        break;
    }

    const updated = await this.prisma.accountSignal.update({
      where: { id: signalId },
      data: updateData,
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    return {
      ...updated,
      description: updated.description ?? undefined,
      recommendedAction: updated.recommendedAction ?? undefined,
      acknowledgedAt: updated.acknowledgedAt ?? undefined,
      acknowledgedBy: updated.acknowledgedBy ?? undefined,
      actionedAt: updated.actionedAt ?? undefined,
      actionedBy: updated.actionedBy ?? undefined,
      dismissedAt: updated.dismissedAt ?? undefined,
      dismissedBy: updated.dismissedBy ?? undefined,
      dismissReason: updated.dismissReason ?? undefined,
      expiresAt: updated.expiresAt ?? undefined,
      sourceId: updated.sourceId ?? undefined,
      accountName: updated.account.name,
      data: updated.data as Record<string, any>,
    };
  }

  /**
   * Get AI-generated recommendation for a signal
   */
  async getRecommendation(signalId: string, userId: string): Promise<SignalRecommendationResponse> {
    const signal = await this.prisma.accountSignal.findFirst({
      where: {
        id: signalId,
        account: { ownerId: userId },
      },
      include: {
        account: {
          include: {
            opportunities: {
              where: { stage: { not: 'CLOSED_WON' } },
              take: 5,
              orderBy: { updatedAt: 'desc' },
            },
            contacts: { take: 5 },
          },
        },
        recommendations: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!signal) {
      throw new NotFoundException(`Signal with ID ${signalId} not found`);
    }

    // Check if we already have a recent recommendation
    if (signal.recommendations.length > 0) {
      const existing = signal.recommendations[0];
      const age = Date.now() - existing.createdAt.getTime();
      // Return existing if less than 1 hour old
      if (age < 60 * 60 * 1000) {
        return {
          id: existing.id,
          signalId: existing.signalId,
          accountId: existing.accountId,
          action: existing.action,
          rationale: existing.rationale,
          priority: existing.priority,
          confidence: existing.confidence,
          suggestedAssignee: existing.suggestedAssignee || undefined,
          playbookId: existing.playbookId || undefined,
          suggestedContent: existing.suggestedContent as any,
          status: existing.status,
          createdAt: existing.createdAt,
        };
      }
    }

    // Generate new recommendation using Claude
    const recommendation = await this.generateRecommendation(signal);

    // Store recommendation
    const stored = await this.prisma.signalRecommendation.create({
      data: {
        signalId: signal.id,
        accountId: signal.accountId,
        action: recommendation.action as RecommendedActionType,
        rationale: recommendation.rationale,
        priority: recommendation.priority,
        confidence: recommendation.confidence,
        suggestedAssignee: recommendation.suggestedAssignee,
        suggestedContent: recommendation.suggestedContent,
      },
    });

    return {
      id: stored.id,
      signalId: stored.signalId,
      accountId: stored.accountId,
      action: stored.action,
      rationale: stored.rationale,
      priority: stored.priority,
      confidence: stored.confidence,
      suggestedAssignee: stored.suggestedAssignee || undefined,
      playbookId: stored.playbookId || undefined,
      suggestedContent: stored.suggestedContent as any,
      status: stored.status,
      createdAt: stored.createdAt,
    };
  }

  /**
   * Generate recommendation using Claude
   */
  private async generateRecommendation(signal: any): Promise<{
    action: string;
    rationale: string;
    priority: string;
    confidence: number;
    suggestedAssignee?: string;
    suggestedContent?: any;
  }> {
    const prompt = `
## Signal Analysis Request

### Signal Details
- Type: ${signal.type}
- Title: ${signal.title}
- Description: ${signal.description || 'N/A'}
- Source: ${signal.source}
- Confidence: ${signal.confidence}
- Data: ${JSON.stringify(signal.data)}

### Account Context
- Name: ${signal.account.name}
- Open Opportunities: ${signal.account.opportunities?.length || 0}
- Contacts: ${signal.account.contacts?.length || 0}

### Decision Framework
Based on the signal type and account context, determine:
1. **action**: One of: CREATE_OPPORTUNITY, UPDATE_OPPORTUNITY, SEND_EMAIL, SCHEDULE_CALL, SCHEDULE_MEETING, CREATE_TASK, ESCALATE_TO_MANAGER, LOG_INSIGHT, MONITOR
2. **rationale**: 2-3 sentences explaining why this action is recommended
3. **priority**: HIGH, MEDIUM, or LOW
4. **confidence**: 0.0 to 1.0
5. **suggestedAssignee**: account_owner, sales_manager, or sdr
6. **talkingPoints**: 3-5 bullet points for outreach

Respond in JSON format only.
`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [
          { role: 'system', content: `You are a sales operations AI that analyzes account signals and recommends actions.
                 Always respond with valid JSON matching the requested format.
                 Be specific and actionable in your recommendations.` },
          { role: 'user', content: prompt }
        ],
        maxTokens: 1000,
      });

      const parsed = JSON.parse(response);
      return {
        action: parsed.action || 'LOG_INSIGHT',
        rationale: parsed.rationale || 'Signal detected and logged for review.',
        priority: parsed.priority || 'MEDIUM',
        confidence: parsed.confidence || 0.7,
        suggestedAssignee: parsed.suggestedAssignee,
        suggestedContent: parsed.talkingPoints ? { talkingPoints: parsed.talkingPoints } : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to generate recommendation:', error);
      // Return default recommendation on error
      return {
        action: 'LOG_INSIGHT',
        rationale: 'Signal detected. Review and determine appropriate action.',
        priority: 'MEDIUM',
        confidence: 0.5,
      };
    }
  }

  /**
   * Execute a recommendation
   */
  async executeRecommendation(
    recommendationId: string,
    userId: string,
    dto: ExecuteRecommendationDto,
  ): Promise<{ success: boolean; result: any }> {
    const recommendation = await this.prisma.signalRecommendation.findFirst({
      where: { id: recommendationId },
      include: {
        signal: {
          include: {
            account: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!recommendation) {
      throw new NotFoundException(`Recommendation with ID ${recommendationId} not found`);
    }

    if (recommendation.signal.account.ownerId !== userId) {
      throw new BadRequestException('Not authorized to execute this recommendation');
    }

    // Execute based on action type
    let result: any;
    try {
      switch (recommendation.action) {
        case 'CREATE_OPPORTUNITY':
          result = await this.executeCreateOpportunity(recommendation, userId, dto.modifications);
          break;
        case 'CREATE_TASK':
          result = await this.executeCreateTask(recommendation, userId, dto.modifications);
          break;
        case 'LOG_INSIGHT':
          result = { logged: true, signalId: recommendation.signalId };
          break;
        default:
          result = { action: recommendation.action, status: 'pending_manual_execution' };
      }

      // Update recommendation status
      await this.prisma.signalRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: 'EXECUTED',
          executedAt: new Date(),
          executedBy: userId,
          result: result,
        },
      });

      // Mark signal as actioned
      await this.prisma.accountSignal.update({
        where: { id: recommendation.signalId },
        data: {
          status: SignalStatus.ACTIONED,
          actionedAt: new Date(),
          actionedBy: userId,
        },
      });

      return { success: true, result };
    } catch (error) {
      this.logger.error('Failed to execute recommendation:', error);

      await this.prisma.signalRecommendation.update({
        where: { id: recommendationId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private async executeCreateOpportunity(
    recommendation: any,
    userId: string,
    modifications?: Record<string, any>,
  ) {
    const opportunity = await this.prisma.opportunity.create({
      data: {
        name: modifications?.name || `Opportunity from ${recommendation.signal.title}`,
        accountId: recommendation.accountId,
        ownerId: userId,
        stage: 'QUALIFICATION',
        amount: modifications?.amount || 0,
        probability: 10,
        needsAnalysis: `Created from signal (${recommendation.signal.type}): ${recommendation.signal.title}`,
        nextStep: recommendation.rationale,
        metadata: {
          signalId: recommendation.signalId,
          recommendationId: recommendation.id,
          autoCreated: true,
          signalType: recommendation.signal.type,
        },
      },
    });

    return { opportunityId: opportunity.id, opportunityName: opportunity.name };
  }

  private async executeCreateTask(
    recommendation: any,
    userId: string,
    modifications?: Record<string, any>,
  ) {
    const task = await this.prisma.task.create({
      data: {
        subject: modifications?.title || `Follow up on: ${recommendation.signal.title}`,
        description: recommendation.rationale,
        ownerId: userId,
        assignedToId: userId,
        accountId: recommendation.accountId,
        priority: recommendation.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
        status: 'NOT_STARTED',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        metadata: {
          signalId: recommendation.signalId,
          recommendationId: recommendation.id,
          autoCreated: true,
        },
      },
    });

    return { taskId: task.id, taskSubject: task.subject };
  }

  /**
   * Get signals summary/stats
   */
  async getSignalsSummary(userId: string): Promise<SignalsSummary> {
    const signals = await this.prisma.accountSignal.findMany({
      where: {
        account: { ownerId: userId },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        status: true,
        priority: true,
        type: true,
        source: true,
      },
    });

    const summary: SignalsSummary = {
      pending: 0,
      critical: 0,
      high: 0,
      actioned: 0,
      byType: {},
      bySource: {},
    };

    for (const signal of signals) {
      if (signal.status === 'PENDING') {
        summary.pending++;
        if (signal.priority === 'CRITICAL') summary.critical++;
        if (signal.priority === 'HIGH') summary.high++;
      }
      if (signal.status === 'ACTIONED') summary.actioned++;

      summary.byType[signal.type] = (summary.byType[signal.type] || 0) + 1;
      summary.bySource[signal.source] = (summary.bySource[signal.source] || 0) + 1;
    }

    return summary;
  }

  /**
   * Detect signals from internal CRM data (called by scheduler)
   */
  async detectInternalSignals(userId: string): Promise<number> {
    this.logger.log(`Detecting internal signals for user ${userId}`);

    // Get strategic accounts
    const accounts = await this.prisma.account.findMany({
      where: {
        ownerId: userId,
        isStrategic: true,
      },
      include: {
        opportunities: {
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    let signalsCreated = 0;

    for (const account of accounts) {
      // Check for engagement changes
      const recentActivities = account.activities.filter(
        a => new Date(a.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      );
      const olderActivities = account.activities.filter(
        a => {
          const time = new Date(a.createdAt).getTime();
          return time > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
                 time <= Date.now() - 7 * 24 * 60 * 60 * 1000;
        }
      );

      // Engagement spike detection
      if (recentActivities.length > olderActivities.length * 1.5 && recentActivities.length >= 5) {
        const existingSignal = await this.prisma.accountSignal.findFirst({
          where: {
            accountId: account.id,
            type: SignalType.ENGAGEMENT_SPIKE,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingSignal) {
          await this.createSignal(userId, {
            accountId: account.id,
            type: SignalType.ENGAGEMENT_SPIKE,
            title: `${Math.round((recentActivities.length / Math.max(olderActivities.length, 1) - 1) * 100)}% increase in engagement`,
            description: `Activity increased from ${olderActivities.length} to ${recentActivities.length} in the past week`,
            confidence: 0.8,
            source: SignalSource.INTERNAL_CRM,
            priority: SignalPriority.MEDIUM,
            recommendedAction: 'SCHEDULE_CALL',
          });
          signalsCreated++;
        }
      }

      // Engagement decline detection
      if (olderActivities.length > recentActivities.length * 1.5 && olderActivities.length >= 5) {
        const existingSignal = await this.prisma.accountSignal.findFirst({
          where: {
            accountId: account.id,
            type: SignalType.ENGAGEMENT_DECLINE,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existingSignal) {
          await this.createSignal(userId, {
            accountId: account.id,
            type: SignalType.ENGAGEMENT_DECLINE,
            title: `${Math.round((1 - recentActivities.length / Math.max(olderActivities.length, 1)) * 100)}% decrease in engagement`,
            description: `Activity decreased from ${olderActivities.length} to ${recentActivities.length} in the past week`,
            confidence: 0.75,
            source: SignalSource.INTERNAL_CRM,
            priority: SignalPriority.HIGH,
            recommendedAction: 'SCHEDULE_CALL',
          });
          signalsCreated++;
        }
      }
    }

    this.logger.log(`Created ${signalsCreated} internal signals for user ${userId}`);
    return signalsCreated;
  }
}
