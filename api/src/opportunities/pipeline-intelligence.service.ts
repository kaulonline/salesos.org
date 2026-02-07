import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { SalesforceService } from '../salesforce/salesforce.service';
import {
  PipelineFiltersDto,
  ForecastCategory,
  MEDDICStatus,
  BuyerStatus,
  ChampionStatus,
  MEDDICScoreDto,
  UpdateMEDDICDto,
  UpdateForecastCategoryDto,
  PipelineDealResponseDto,
  PipelineStatsResponseDto,
  ForecastSummaryDto,
  DealWarningDto,
} from './dto/pipeline.dto';
import { OpportunityStage } from '@prisma/client';

@Injectable()
export class PipelineIntelligenceService {
  private readonly logger = new Logger(PipelineIntelligenceService.name);

  // Forecast category labels
  private readonly forecastLabels: Record<ForecastCategory, string> = {
    [ForecastCategory.COMMIT]: 'Commit',
    [ForecastCategory.MOST_LIKELY]: 'Most Likely',
    [ForecastCategory.BEST_CASE]: 'Best Case',
    [ForecastCategory.KEY_DEALS]: 'Key Deals',
    [ForecastCategory.MUST_WIN]: 'Must Win',
    [ForecastCategory.LOW_LIKELIHOOD]: 'Low Likelihood',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly salesforce: SalesforceService,
  ) {}

  /**
   * Get pipeline deals with MEDDIC scoring and forecasting
   */
  async getPipelineDeals(
    filters: PipelineFiltersDto,
    userId: string,
    isAdmin?: boolean,
  ): Promise<PipelineDealResponseDto[]> {
    this.logger.log(`Fetching pipeline deals with filters: ${JSON.stringify(filters)}, mode: ${filters.mode || 'local'}`);

    // If Salesforce mode, fetch from Salesforce
    if (filters.mode === 'salesforce') {
      return this.getPipelineDealsFromSalesforce(filters, userId);
    }

    // Local mode - fetch from IRIS database
    const where: any = {
      isClosed: false,
    };

    if (!isAdmin) {
      where.ownerId = userId;
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.stage) {
      where.stage = filters.stage;
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    if (filters.closeDateFrom || filters.closeDateTo) {
      where.closeDate = {};
      if (filters.closeDateFrom) where.closeDate.gte = new Date(filters.closeDateFrom);
      if (filters.closeDateTo) where.closeDate.lte = new Date(filters.closeDateTo);
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { account: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const opportunities = await this.prisma.opportunity.findMany({
      where,
      include: {
        account: true,
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        contactRoles: {
          include: { contact: true },
        },
        activities: {
          where: {
            activityDate: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          orderBy: { activityDate: 'desc' },
        },
        tasks: {
          where: {
            status: { not: 'COMPLETED' },
          },
        },
      },
      orderBy: [
        { closeDate: 'asc' },
        { amount: 'desc' },
      ],
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    return opportunities.map((opp) => this.transformToPipelineDeal(opp));
  }

  /**
   * Get pipeline deals from Salesforce
   */
  private async getPipelineDealsFromSalesforce(
    filters: PipelineFiltersDto,
    userId: string,
  ): Promise<PipelineDealResponseDto[]> {
    try {
      // Build SOQL WHERE clause
      const whereClauses: string[] = ['IsClosed = false'];

      if (filters.stage) {
        whereClauses.push(`StageName = '${filters.stage}'`);
      }

      if (filters.minAmount) {
        whereClauses.push(`Amount >= ${filters.minAmount}`);
      }

      if (filters.maxAmount) {
        whereClauses.push(`Amount <= ${filters.maxAmount}`);
      }

      if (filters.closeDateFrom) {
        whereClauses.push(`CloseDate >= ${filters.closeDateFrom.split('T')[0]}`);
      }

      if (filters.closeDateTo) {
        whereClauses.push(`CloseDate <= ${filters.closeDateTo.split('T')[0]}`);
      }

      if (filters.search) {
        whereClauses.push(`(Name LIKE '%${filters.search}%' OR Account.Name LIKE '%${filters.search}%')`);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      const soql = `
        SELECT Id, Name, Account.Name, Account.Id, Amount, StageName, Probability,
               CloseDate, Type, LeadSource, CreatedDate, LastModifiedDate,
               Owner.Name, Owner.Email
        FROM Opportunity
        ${whereClause}
        ORDER BY CloseDate ASC NULLS LAST, Amount DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await this.salesforce.query(userId, soql);

      return (result.records || []).map((opp: any) => this.transformSalesforceOpportunity(opp));
    } catch (error) {
      this.logger.error(`Failed to fetch pipeline deals from Salesforce: ${error.message}`);
      // Fall back to empty array rather than throwing
      return [];
    }
  }

  /**
   * Transform Salesforce opportunity to pipeline deal format
   */
  private transformSalesforceOpportunity(opp: any): PipelineDealResponseDto {
    const probability = opp.Probability || 0;

    return {
      id: opp.Id,
      name: opp.Name || 'Untitled',
      accountId: opp.Account?.Id || '',
      accountName: opp.Account?.Name || 'Unknown',
      amount: opp.Amount || 0,
      stage: opp.StageName || 'Unknown',
      probability,
      closeDate: opp.CloseDate ? new Date(opp.CloseDate) : null,
      forecastCategory: this.inferForecastCategory(opp.StageName, probability),
      meddic: {
        metrics: MEDDICStatus.MISSING,
        economicBuyer: BuyerStatus.UNKNOWN,
        decisionCriteria: MEDDICStatus.MISSING,
        decisionProcess: MEDDICStatus.MISSING,
        identifyPain: MEDDICStatus.MISSING,
        champion: ChampionStatus.NONE,
        score: 0,
      },
      warnings: this.calculateSalesforceWarnings(opp),
      contactCount: 0,
      owner: {
        id: '',
        name: opp.Owner?.Name || 'Unknown',
        email: opp.Owner?.Email || '',
      },
      activities: [],
      lastActivityDate: opp.LastModifiedDate ? new Date(opp.LastModifiedDate) : null,
      createdAt: opp.CreatedDate ? new Date(opp.CreatedDate) : new Date(),
      updatedAt: opp.LastModifiedDate ? new Date(opp.LastModifiedDate) : new Date(),
    };
  }

  /**
   * Calculate warnings for Salesforce opportunity
   */
  private calculateSalesforceWarnings(opp: any): DealWarningDto[] {
    const warnings: DealWarningDto[] = [];
    const now = new Date();

    // Check for passed close date
    if (opp.CloseDate && new Date(opp.CloseDate) < now) {
      warnings.push({
        type: 'close-date-passed',
        message: 'Close date has passed',
        severity: 'high',
      });
    }

    // Check for stale (no recent modification)
    if (opp.LastModifiedDate) {
      const lastMod = new Date(opp.LastModifiedDate);
      const daysSinceUpdate = (now.getTime() - lastMod.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 14) {
        warnings.push({
          type: 'stale',
          message: `No updates in ${Math.floor(daysSinceUpdate)} days`,
          severity: 'medium',
        });
      }
    }

    return warnings;
  }

  /**
   * Get pipeline statistics and forecasts
   */
  async getPipelineStats(
    filters: PipelineFiltersDto,
    userId: string,
    isAdmin?: boolean,
  ): Promise<PipelineStatsResponseDto> {
    const deals = await this.getPipelineDeals(filters, userId, isAdmin);

    const totalPipeline = deals.reduce((sum, d) => sum + d.amount, 0);
    const averageDealSize = deals.length > 0 ? totalPipeline / deals.length : 0;

    // Calculate forecast summaries
    const forecastMap = new Map<ForecastCategory, { total: number; count: number }>();
    Object.values(ForecastCategory).forEach((cat) => {
      forecastMap.set(cat, { total: 0, count: 0 });
    });

    deals.forEach((deal) => {
      const current = forecastMap.get(deal.forecastCategory) || { total: 0, count: 0 };
      forecastMap.set(deal.forecastCategory, {
        total: current.total + deal.amount,
        count: current.count + 1,
      });
    });

    const forecasts: ForecastSummaryDto[] = Object.values(ForecastCategory).map((cat) => {
      const data = forecastMap.get(cat) || { total: 0, count: 0 };
      return {
        category: cat,
        label: this.forecastLabels[cat],
        totalAmount: data.total,
        dealCount: data.count,
      };
    });

    // Calculate at-risk and stale deals
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const staleDealsCount = deals.filter(
      (d) => !d.lastActivityDate || new Date(d.lastActivityDate) < staleThreshold,
    ).length;
    const atRiskDealsCount = deals.filter((d) => d.warnings.length > 0).length;

    // Win rate (from closed opportunities)
    const closedOpps = await this.prisma.opportunity.findMany({
      where: {
        isClosed: true,
        closedDate: {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      select: { isWon: true, amount: true },
    });
    const wonCount = closedOpps.filter((o) => o.isWon).length;
    const winRate = closedOpps.length > 0 ? (wonCount / closedOpps.length) * 100 : 0;

    // Calculate target attainment from user quota stored in settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });
    const userSettings = (user?.settings as any) || {};
    const quarterlyQuota = userSettings.salesQuota || 0;
    const wonAmount = closedOpps
      .filter((o) => o.isWon)
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const targetAttainment = quarterlyQuota > 0 ? (wonAmount / quarterlyQuota) * 100 : 0;

    return {
      targetAttainment,
      pipelineCoverage: totalPipeline,
      totalPipeline,
      averageDealSize,
      winRate,
      forecasts,
      staleDealsCount,
      atRiskDealsCount,
    };
  }

  /**
   * Update MEDDIC score for an opportunity
   */
  async updateMEDDIC(dto: UpdateMEDDICDto, userId: string): Promise<MEDDICScoreDto> {
    this.logger.log(`Updating MEDDIC for opportunity: ${dto.opportunityId}`);

    // Get current MEDDIC data (stored in opportunity metadata)
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: dto.opportunityId },
      select: { metadata: true, ownerId: true },
    });

    if (!opp) {
      throw new Error('Opportunity not found');
    }

    const currentMeddic = (opp.metadata as any)?.meddic || {};
    const updatedMeddic = {
      metrics: dto.metrics || currentMeddic.metrics || 'missing',
      economicBuyer: dto.economicBuyer || currentMeddic.economicBuyer || 'unknown',
      decisionCriteria: dto.decisionCriteria || currentMeddic.decisionCriteria || 'missing',
      decisionProcess: dto.decisionProcess || currentMeddic.decisionProcess || 'missing',
      identifyPain: dto.identifyPain || currentMeddic.identifyPain || 'missing',
      champion: dto.champion || currentMeddic.champion || 'none',
      notes: dto.notes || currentMeddic.notes,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
    };

    // Calculate score
    const score = this.calculateMEDDICScore(updatedMeddic);
    updatedMeddic['score'] = score;

    await this.prisma.opportunity.update({
      where: { id: dto.opportunityId },
      data: {
        metadata: {
          ...(opp.metadata as object || {}),
          meddic: updatedMeddic,
        },
      },
    });

    return {
      metrics: updatedMeddic.metrics,
      economicBuyer: updatedMeddic.economicBuyer,
      decisionCriteria: updatedMeddic.decisionCriteria,
      decisionProcess: updatedMeddic.decisionProcess,
      identifyPain: updatedMeddic.identifyPain,
      champion: updatedMeddic.champion,
      score,
    };
  }

  /**
   * Update forecast category for an opportunity
   */
  async updateForecastCategory(
    dto: UpdateForecastCategoryDto,
    userId: string,
  ): Promise<{ success: boolean; forecastCategory: ForecastCategory }> {
    this.logger.log(`Updating forecast category for opportunity: ${dto.opportunityId}`);

    const opp = await this.prisma.opportunity.findUnique({
      where: { id: dto.opportunityId },
      select: { metadata: true },
    });

    if (!opp) {
      throw new Error('Opportunity not found');
    }

    await this.prisma.opportunity.update({
      where: { id: dto.opportunityId },
      data: {
        metadata: {
          ...(opp.metadata as object || {}),
          forecastCategory: dto.forecastCategory,
          forecastHistory: [
            ...((opp.metadata as any)?.forecastHistory || []),
            {
              category: dto.forecastCategory,
              reason: dto.reason,
              changedBy: userId,
              changedAt: new Date().toISOString(),
            },
          ],
        },
      },
    });

    return {
      success: true,
      forecastCategory: dto.forecastCategory,
    };
  }

  /**
   * AI-powered MEDDIC analysis
   */
  async analyzeMEDDIC(opportunityId: string): Promise<{
    suggestedScores: MEDDICScoreDto;
    insights: string[];
    recommendations: string[];
  }> {
    this.logger.log(`Analyzing MEDDIC for opportunity: ${opportunityId}`);

    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        account: true,
        contactRoles: { include: { contact: true } },
        activities: { orderBy: { activityDate: 'desc' }, take: 20 },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        tasks: true,
      },
    });

    if (!opp) {
      throw new Error('Opportunity not found');
    }

    // Build context for AI analysis
    const context = {
      opportunity: {
        name: opp.name,
        amount: opp.amount,
        stage: opp.stage,
        closeDate: opp.closeDate,
        needsAnalysis: opp.needsAnalysis,
        proposedSolution: opp.proposedSolution,
        competitors: opp.competitors,
      },
      account: opp.account,
      contacts: opp.contactRoles.map((cr) => ({
        name: `${cr.contact.firstName} ${cr.contact.lastName}`,
        title: cr.contact.title,
        role: cr.role,
        isPrimary: cr.isPrimary,
      })),
      recentActivities: opp.activities.slice(0, 10),
      notes: opp.notes.map((n) => n.body),
    };

    const prompt = `Analyze this sales opportunity and provide MEDDIC scoring suggestions.

Opportunity Context:
${JSON.stringify(context, null, 2)}

Provide a JSON response with:
1. suggestedScores: MEDDIC scores (metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion)
2. insights: Array of key insights about the deal
3. recommendations: Array of recommended next actions

Use these values:
- metrics: complete/partial/missing
- economicBuyer: identified/engaged/unknown
- decisionCriteria/decisionProcess/identifyPain: complete/partial/missing
- champion: strong/developing/none`;

    try {
      const response = await this.anthropic.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2048,
        temperature: 0.3,
      });
      const analysis = JSON.parse(response);

      return {
        suggestedScores: {
          ...analysis.suggestedScores,
          score: this.calculateMEDDICScore(analysis.suggestedScores),
        },
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze MEDDIC: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform opportunity to pipeline deal response
   */
  private transformToPipelineDeal(opp: any): PipelineDealResponseDto {
    const meddic = (opp.metadata as any)?.meddic || {};
    const forecastCategory =
      (opp.metadata as any)?.forecastCategory ||
      this.inferForecastCategory(opp.stage, opp.probability);

    // Calculate warnings
    const warnings = this.calculateWarnings(opp);

    // Group activities by date
    const activityByDate = new Map<string, number>();
    opp.activities?.forEach((act: any) => {
      const dateKey = new Date(act.activityDate).toDateString();
      activityByDate.set(dateKey, (activityByDate.get(dateKey) || 0) + 1);
    });

    const activities = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date,
        type: 'mixed',
        count: activityByDate.get(date.toDateString()) || 0,
      };
    }).reverse();

    return {
      id: opp.id,
      name: opp.name,
      accountId: opp.accountId,
      accountName: opp.account?.name || 'Unknown',
      amount: opp.amount || 0,
      stage: opp.stage,
      probability: opp.probability || 0,
      closeDate: opp.closeDate,
      forecastCategory,
      meddic: {
        metrics: meddic.metrics || 'missing',
        economicBuyer: meddic.economicBuyer || 'unknown',
        decisionCriteria: meddic.decisionCriteria || 'missing',
        decisionProcess: meddic.decisionProcess || 'missing',
        identifyPain: meddic.identifyPain || 'missing',
        champion: meddic.champion || 'none',
        score: meddic.score || this.calculateMEDDICScore(meddic),
      },
      warnings,
      contactCount: opp.contactRoles?.length || 0,
      owner: {
        id: opp.owner?.id || '',
        name: opp.owner?.name || 'Unknown',
        email: opp.owner?.email || '',
        avatarUrl: opp.owner?.avatarUrl,
      },
      activities,
      lastActivityDate: opp.activities?.[0]?.activityDate || null,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    };
  }

  /**
   * Calculate MEDDIC score from individual components
   */
  private calculateMEDDICScore(meddic: any): number {
    const weights = {
      metrics: 15,
      economicBuyer: 20,
      decisionCriteria: 15,
      decisionProcess: 15,
      identifyPain: 15,
      champion: 20,
    };

    const scores: Record<string, Record<string, number>> = {
      metrics: { complete: 1, partial: 0.5, missing: 0 },
      economicBuyer: { engaged: 1, identified: 0.7, unknown: 0 },
      decisionCriteria: { complete: 1, partial: 0.5, missing: 0 },
      decisionProcess: { complete: 1, partial: 0.5, missing: 0 },
      identifyPain: { complete: 1, partial: 0.5, missing: 0 },
      champion: { strong: 1, developing: 0.5, none: 0 },
    };

    let total = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      const value = meddic[key] || 'missing';
      const scoreMap = scores[key] || { [value]: 0 };
      total += (scoreMap[value] || 0) * weight;
    });

    return Math.round(total);
  }

  /**
   * Infer forecast category from stage and probability
   */
  private inferForecastCategory(stage: string, probability: number): ForecastCategory {
    if (probability >= 90) return ForecastCategory.COMMIT;
    if (probability >= 70) return ForecastCategory.MOST_LIKELY;
    if (probability >= 50) return ForecastCategory.BEST_CASE;
    if (probability >= 30) return ForecastCategory.KEY_DEALS;
    if (probability >= 10) return ForecastCategory.MUST_WIN;
    return ForecastCategory.LOW_LIKELIHOOD;
  }

  /**
   * Calculate warnings for a deal
   */
  private calculateWarnings(opp: any): DealWarningDto[] {
    const warnings: DealWarningDto[] = [];
    const now = new Date();

    // Check for stale activity
    const lastActivity = opp.activities?.[0]?.activityDate;
    if (!lastActivity || new Date(lastActivity) < new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)) {
      warnings.push({
        type: 'stale',
        message: 'No activity in the last 14 days',
        severity: 'medium',
      });
    }

    // Check for missing next step
    const openTasks = opp.tasks?.filter((t: any) => t.status !== 'COMPLETED');
    if (!openTasks?.length && !opp.nextStep) {
      warnings.push({
        type: 'no-next-step',
        message: 'No next steps defined',
        severity: 'high',
      });
    }

    // Check for passed close date
    if (opp.closeDate && new Date(opp.closeDate) < now) {
      warnings.push({
        type: 'close-date-passed',
        message: 'Close date has passed',
        severity: 'high',
      });
    }

    // Check for missing contacts
    if (!opp.contactRoles?.length) {
      warnings.push({
        type: 'missing-contact',
        message: 'No contacts associated',
        severity: 'medium',
      });
    }

    return warnings;
  }
}
