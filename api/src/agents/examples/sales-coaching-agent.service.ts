/**
 * IRIS Agent Framework - Sales Coaching Agent
 *
 * AI-powered sales coaching with accountability and learning from prior cycles.
 * This agent supports Vertiv MVP #2: AI-Enabled Sales Coaching
 *
 * Features:
 * - Analyzes rep performance against win patterns
 * - Provides coaching recommendations
 * - Tracks accountability against leadership priorities
 * - Monitors ramp time for new SEs
 * - Generates coaching insights and alerts
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import { BaseAgentService, DEFAULT_AGENT_LIMITS } from '../base/base-agent.service';
import { createCRMTools } from '../tools/crm-tools';
import {
  AgentType,
  AgentContext,
  AgentConfig,
  AgentTool,
  InsightType,
  AlertType,
  Priority,
  ActionType,
  CRMEntityType,
} from '../types';

/**
 * Rep Performance Metrics
 */
interface RepPerformanceMetrics {
  winRate: number;
  avgCycleTime: number;
  avgDealSize: number;
  activityScore: number;
  pipelineCoverage: number;
  forecastAccuracy: number;
  totalPipeline: number;
  closedWonRevenue: number;
  opportunitiesWorked: number;
  meetingsHeld: number;
  callsMade: number;
}

/**
 * Coaching Analysis from LLM
 */
interface CoachingAnalysis {
  overallRating: 'EXCEEDING' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';
  performanceScore: number; // 0-100
  strengths: string[];
  areasForImprovement: string[];
  coachingRecommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    recommendation: string;
    expectedImpact: string;
  }>;
  accountabilityChecks: Array<{
    priority: string;
    status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
    details: string;
  }>;
  rampStatus?: {
    weeksInRole: number;
    expectedProgress: number;
    actualProgress: number;
    onTrack: boolean;
    recommendations: string[];
  };
  winPatternAlignment: {
    score: number; // 0-100
    matchingPatterns: string[];
    missingPatterns: string[];
  };
  nextBestActions: string[];
  reasoning: string;
}

@Injectable()
export class SalesCoachingAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.COACHING;
  protected readonly logger = new Logger(SalesCoachingAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.COACHING,
    name: 'Sales Coaching Assistant',
    description:
      'AI-powered sales coaching with accountability and learning from prior cycles',
    version: '1.0.0',

    // Run weekly on Monday morning for coaching insights
    schedule: {
      cron: '0 8 * * 1', // 8 AM Mondays
      enabled: true, // ENABLED - weekly coaching recommendations
    },

    // Trigger on key events
    eventTriggers: [
      { eventName: 'crm.opportunity.stage_change', debounceMs: 60000 },
      { eventName: 'crm.meeting.completed', debounceMs: 30000 },
      { eventName: 'crm.quarter.end', debounceMs: 0 },
    ],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 25,
      maxAlertsPerExecution: 15,
    },

    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
    private readonly sfService: SalesforceService,
    private readonly ocxService: OracleCXService,
  ) {
    super();
    this.initializeBase(
      prisma,
      aiSdk,
      eventEmitter,
      cacheService,
      sfService,
      ocxService,
    );
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Sales Coaching analysis...');

    // Determine data source
    let dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local';
    let dataSourceLabel = 'local IRIS database';

    if (context.userId) {
      const sourceInfo = await this.determineDataSource(context.userId);
      dataSource = sourceInfo.dataSource;
      dataSourceLabel = sourceInfo.dataSourceLabel;
      this.logger.log(`Using ${dataSource} data source for user ${context.userId}`);
    }

    // Analyze the rep's performance
    const repId = context.userId;
    if (!repId) {
      this.logger.warn('No user ID provided for coaching analysis');
      return;
    }

    // Get rep's performance metrics
    const metrics = await this.getRepPerformanceMetrics(repId, dataSource);

    // Get historical win patterns for comparison
    const winPatterns = await this.getWinPatterns(repId, dataSource);

    // Get leadership priorities for accountability checking
    const priorities = await this.getLeadershipPriorities(repId);

    // Check if rep is in ramp period
    const rampInfo = await this.checkRampStatus(repId);

    // Perform AI analysis
    const cacheKey = `coaching:${repId}:${new Date().toISOString().split('T')[0]}`;
    const analysis = await this.getCached<CoachingAnalysis>(
      cacheKey,
      async () =>
        this.performCoachingAnalysis(metrics, winPatterns, priorities, rampInfo),
      3600, // 1 hour cache
    );

    // Process and create alerts/insights
    await this.processCoachingAnalysis(repId, analysis, metrics, context);

    // Summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Sales Coaching Analysis Complete',
      description: `Analyzed performance from ${dataSourceLabel}. Rating: ${analysis.overallRating}`,
    });
  }

  /**
   * Get rep's performance metrics
   */
  private async getRepPerformanceMetrics(
    repId: string,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<RepPerformanceMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    if (dataSource === 'oracle_cx') {
      return this.getMetricsFromOracleCX(repId, thirtyDaysAgo, ninetyDaysAgo);
    } else if (dataSource === 'salesforce') {
      return this.getMetricsFromSalesforce(repId, thirtyDaysAgo, ninetyDaysAgo);
    }

    return this.getMetricsFromLocal(repId, thirtyDaysAgo, ninetyDaysAgo);
  }

  /**
   * Get metrics from local database
   */
  private async getMetricsFromLocal(
    repId: string,
    thirtyDaysAgo: Date,
    ninetyDaysAgo: Date,
  ): Promise<RepPerformanceMetrics> {
    // Get opportunities
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        ownerId: repId,
        createdAt: { gte: ninetyDaysAgo },
      },
    });

    const wonOpps = opportunities.filter((o) => o.stage === 'CLOSED_WON');
    const lostOpps = opportunities.filter((o) => o.stage === 'CLOSED_LOST');
    const openOpps = opportunities.filter(
      (o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage || ''),
    );

    // Get activities
    const activities = await this.prisma.activity.findMany({
      where: {
        userId: repId,
        activityDate: { gte: thirtyDaysAgo },
      },
    });

    const meetings = activities.filter((a) => a.type === 'MEETING');
    const calls = activities.filter((a) => a.type === 'CALL');

    // Calculate metrics
    const totalClosed = wonOpps.length + lostOpps.length;
    const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 0;

    const avgCycleTime =
      wonOpps.length > 0
        ? wonOpps.reduce((sum, o) => {
            const created = new Date(o.createdAt);
            const closed = o.closeDate ? new Date(o.closeDate) : new Date();
            return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / wonOpps.length
        : 0;

    const avgDealSize =
      wonOpps.length > 0
        ? wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0) / wonOpps.length
        : 0;

    const totalPipeline = openOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const closedWonRevenue = wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);

    return {
      winRate,
      avgCycleTime,
      avgDealSize,
      activityScore: activities.length,
      pipelineCoverage: closedWonRevenue > 0 ? totalPipeline / closedWonRevenue : 0,
      forecastAccuracy: 0, // Would need historical forecast data
      totalPipeline,
      closedWonRevenue,
      opportunitiesWorked: opportunities.length,
      meetingsHeld: meetings.length,
      callsMade: calls.length,
    };
  }

  /**
   * Get metrics from Salesforce
   */
  private async getMetricsFromSalesforce(
    repId: string,
    thirtyDaysAgo: Date,
    ninetyDaysAgo: Date,
  ): Promise<RepPerformanceMetrics> {
    try {
      // Query won opportunities
      const wonSoql = `
        SELECT Id, Amount, CreatedDate, CloseDate
        FROM Opportunity
        WHERE OwnerId = '${repId}' AND StageName = 'Closed Won'
        AND CloseDate >= ${ninetyDaysAgo.toISOString().split('T')[0]}
      `;
      const wonResult = await this.querySalesforce<any>(repId, wonSoql);
      const wonOpps = wonResult?.records || [];

      // Query lost opportunities
      const lostSoql = `
        SELECT Id FROM Opportunity
        WHERE OwnerId = '${repId}' AND StageName = 'Closed Lost'
        AND CloseDate >= ${ninetyDaysAgo.toISOString().split('T')[0]}
      `;
      const lostResult = await this.querySalesforce<any>(repId, lostSoql);
      const lostOpps = lostResult?.records || [];

      // Query open pipeline
      const openSoql = `
        SELECT Id, Amount FROM Opportunity
        WHERE OwnerId = '${repId}' AND IsClosed = false
      `;
      const openResult = await this.querySalesforce<any>(repId, openSoql);
      const openOpps = openResult?.records || [];

      // Query activities
      const taskSoql = `
        SELECT Id, Type FROM Task
        WHERE OwnerId = '${repId}' AND CreatedDate >= ${thirtyDaysAgo.toISOString()}
      `;
      const taskResult = await this.querySalesforce<any>(repId, taskSoql);
      const tasks = taskResult?.records || [];

      const eventSoql = `
        SELECT Id FROM Event
        WHERE OwnerId = '${repId}' AND CreatedDate >= ${thirtyDaysAgo.toISOString()}
      `;
      const eventResult = await this.querySalesforce<any>(repId, eventSoql);
      const events = eventResult?.records || [];

      // Calculate metrics
      const totalClosed = wonOpps.length + lostOpps.length;
      const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 0;
      const closedWonRevenue = wonOpps.reduce((sum: number, o: any) => sum + (o.Amount || 0), 0);
      const totalPipeline = openOpps.reduce((sum: number, o: any) => sum + (o.Amount || 0), 0);

      const avgDealSize = wonOpps.length > 0 ? closedWonRevenue / wonOpps.length : 0;

      // Calculate avg cycle time
      let avgCycleTime = 0;
      if (wonOpps.length > 0) {
        const totalDays = wonOpps.reduce((sum: number, o: any) => {
          const created = new Date(o.CreatedDate);
          const closed = new Date(o.CloseDate);
          return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgCycleTime = totalDays / wonOpps.length;
      }

      return {
        winRate,
        avgCycleTime,
        avgDealSize,
        activityScore: tasks.length + events.length,
        pipelineCoverage: closedWonRevenue > 0 ? totalPipeline / closedWonRevenue : 0,
        forecastAccuracy: 0,
        totalPipeline,
        closedWonRevenue,
        opportunitiesWorked: wonOpps.length + lostOpps.length + openOpps.length,
        meetingsHeld: events.length,
        callsMade: tasks.filter((t: any) => t.Type === 'Call').length,
      };
    } catch (error) {
      this.logger.warn(`Failed to get Salesforce metrics: ${error}`);
      return this.getMetricsFromLocal(repId, thirtyDaysAgo, ninetyDaysAgo);
    }
  }

  /**
   * Get metrics from Oracle CX
   */
  private async getMetricsFromOracleCX(
    repId: string,
    thirtyDaysAgo: Date,
    ninetyDaysAgo: Date,
  ): Promise<RepPerformanceMetrics> {
    try {
      // Query opportunities
      const oppsResult = await this.queryOracleCX<any>(repId, 'opportunities', {
        limit: 500,
        filters: { OwnerResourceId: repId },
      });
      const opportunities = oppsResult?.items || [];

      const wonOpps = opportunities.filter((o: any) => o.StatusCode === 'WON');
      const lostOpps = opportunities.filter((o: any) => o.StatusCode === 'LOST');
      const openOpps = opportunities.filter(
        (o: any) => !['WON', 'LOST'].includes(o.StatusCode),
      );

      // Query activities
      const activitiesResult = await this.queryOracleCX<any>(repId, 'activities', {
        limit: 200,
        filters: { OwnerResourceId: repId },
      });
      const activities = activitiesResult?.items || [];

      // Calculate metrics
      const totalClosed = wonOpps.length + lostOpps.length;
      const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 0;
      const closedWonRevenue = wonOpps.reduce((sum: number, o: any) => sum + (o.Revenue || 0), 0);
      const totalPipeline = openOpps.reduce((sum: number, o: any) => sum + (o.Revenue || 0), 0);
      const avgDealSize = wonOpps.length > 0 ? closedWonRevenue / wonOpps.length : 0;

      // Estimate cycle time
      let avgCycleTime = 0;
      if (wonOpps.length > 0) {
        const oppsWithDates = wonOpps.filter(
          (o: any) => o.CreationDate && o.ActualCloseDate,
        );
        if (oppsWithDates.length > 0) {
          const totalDays = oppsWithDates.reduce((sum: number, o: any) => {
            const created = new Date(o.CreationDate);
            const closed = new Date(o.ActualCloseDate);
            return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0);
          avgCycleTime = totalDays / oppsWithDates.length;
        }
      }

      const meetings = activities.filter((a: any) => a.ActivityType === 'MEETING');
      const calls = activities.filter((a: any) => a.ActivityType === 'CALL');

      return {
        winRate,
        avgCycleTime,
        avgDealSize,
        activityScore: activities.length,
        pipelineCoverage: closedWonRevenue > 0 ? totalPipeline / closedWonRevenue : 0,
        forecastAccuracy: 0,
        totalPipeline,
        closedWonRevenue,
        opportunitiesWorked: opportunities.length,
        meetingsHeld: meetings.length,
        callsMade: calls.length,
      };
    } catch (error) {
      this.logger.warn(`Failed to get Oracle CX metrics: ${error}`);
      return this.getMetricsFromLocal(repId, thirtyDaysAgo, ninetyDaysAgo);
    }
  }

  /**
   * Get historical win patterns from configurable coaching config
   */
  private async getWinPatterns(
    repId: string,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<string[]> {
    // Try to get from coaching config
    try {
      const coachingConfig = await this.getCoachingConfig();
      if (coachingConfig?.winPatterns?.length) {
        // Format patterns with name and description
        return coachingConfig.winPatterns.map((p: { name: string; description: string; weight: number }) =>
          `${p.name} - ${p.description}`
        );
      }
    } catch (error) {
      this.logger.warn('Failed to load win patterns from config, using defaults');
    }

    // Fallback to default patterns
    return [
      'Multi-threaded engagement (3+ stakeholders)',
      'Executive sponsor identified early',
      'Proof of concept completed',
      'Business case documented',
      'Technical validation completed',
      'Competitive differentiation established',
      'Timeline aligned with customer initiative',
    ];
  }

  /**
   * Get leadership priorities from configurable coaching config
   */
  private async getLeadershipPriorities(repId: string): Promise<string[]> {
    // Try to get from coaching config
    try {
      const coachingConfig = await this.getCoachingConfig();
      if (coachingConfig?.leadershipPriorities?.length) {
        return coachingConfig.leadershipPriorities
          .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
          .map((p: { text: string }) => p.text);
      }
    } catch (error) {
      this.logger.warn('Failed to load leadership priorities from config, using defaults');
    }

    // Fallback to default priorities
    return [
      'Meet or exceed quarterly quota',
      'Maintain 3x pipeline coverage',
      'Complete 10+ customer meetings per week',
      'Update opportunities weekly',
      'Close deals within 90-day cycle',
    ];
  }

  /**
   * Get coaching configuration from database
   */
  private async getCoachingConfig(): Promise<any> {
    const cacheKey = 'coaching:config';
    return this.getCached<any>(
      cacheKey,
      async () => {
        const configEntry = await this.prisma.systemConfig.findUnique({
          where: { key: 'coaching_config' },
        });
        if (configEntry?.value) {
          return JSON.parse(configEntry.value);
        }
        return null;
      },
      3600, // 1 hour cache
    );
  }

  /**
   * Check if rep is in ramp period
   */
  private async checkRampStatus(
    repId: string,
  ): Promise<{ isRamping: boolean; weeksInRole: number; rampDurationWeeks: number; currentMilestone?: any } | null> {
    try {
      // Get user's start date
      const user = await this.prisma.user.findUnique({
        where: { id: repId },
        select: { createdAt: true },
      });

      if (!user) return null;

      // Calculate weeks in role
      const startDate = new Date(user.createdAt);
      const now = new Date();
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksInRole = Math.floor((now.getTime() - startDate.getTime()) / msPerWeek);

      // Get ramp settings from coaching config
      const coachingConfig = await this.getCoachingConfig();
      const rampDurationWeeks = coachingConfig?.rampSettings?.rampDurationWeeks || 12;

      // Check if still ramping
      const isRamping = weeksInRole < rampDurationWeeks;

      if (!isRamping) {
        return null;
      }

      // Find current milestone
      let currentMilestone = null;
      if (coachingConfig?.rampSettings?.milestones?.length) {
        const milestones = coachingConfig.rampSettings.milestones
          .sort((a: { weekNumber: number }, b: { weekNumber: number }) => a.weekNumber - b.weekNumber);

        // Find the milestone that applies to current week
        for (const milestone of milestones) {
          if (weeksInRole <= milestone.weekNumber) {
            currentMilestone = milestone;
            break;
          }
        }
      }

      return {
        isRamping,
        weeksInRole,
        rampDurationWeeks,
        currentMilestone,
      };
    } catch (error) {
      this.logger.warn(`Failed to check ramp status for ${repId}: ${error}`);
      return null;
    }
  }

  /**
   * Perform AI-powered coaching analysis
   */
  private async performCoachingAnalysis(
    metrics: RepPerformanceMetrics,
    winPatterns: string[],
    priorities: string[],
    rampInfo: { isRamping: boolean; weeksInRole: number; rampDurationWeeks: number; currentMilestone?: any } | null,
  ): Promise<CoachingAnalysis> {
    const prompt = `Analyze this sales rep's performance and provide coaching recommendations:

PERFORMANCE METRICS:
- Win Rate: ${metrics.winRate.toFixed(1)}%
- Avg Cycle Time: ${metrics.avgCycleTime.toFixed(0)} days
- Avg Deal Size: $${metrics.avgDealSize.toLocaleString()}
- Pipeline Coverage: ${metrics.pipelineCoverage.toFixed(1)}x
- Total Pipeline: $${metrics.totalPipeline.toLocaleString()}
- Closed Won Revenue: $${metrics.closedWonRevenue.toLocaleString()}
- Opportunities Worked: ${metrics.opportunitiesWorked}

ACTIVITY METRICS:
- Activity Score: ${metrics.activityScore}
- Meetings Held (30 days): ${metrics.meetingsHeld}
- Calls Made (30 days): ${metrics.callsMade}

WIN PATTERNS (from successful deals):
${winPatterns.map((p) => `- ${p}`).join('\n')}

LEADERSHIP PRIORITIES:
${priorities.map((p) => `- ${p}`).join('\n')}

${rampInfo ? `REP IS RAMPING: Week ${rampInfo.weeksInRole} of ${rampInfo.rampDurationWeeks}-week onboarding${rampInfo.currentMilestone ? ` (Current milestone: ${rampInfo.currentMilestone.name})` : ''}` : ''}

Analyze the performance and provide:
1. Overall rating (EXCEEDING, ON_TRACK, NEEDS_ATTENTION, or AT_RISK)
2. Performance score (0-100)
3. Key strengths (2-3 items)
4. Areas for improvement (2-3 items)
5. Specific coaching recommendations with priority and expected impact
6. Accountability status against each leadership priority
7. Win pattern alignment analysis
8. Top 3 next best actions

Respond in JSON format:
{
  "overallRating": "ON_TRACK",
  "performanceScore": 75,
  "strengths": ["...", "..."],
  "areasForImprovement": ["...", "..."],
  "coachingRecommendations": [
    {"priority": "HIGH", "category": "...", "recommendation": "...", "expectedImpact": "..."}
  ],
  "accountabilityChecks": [
    {"priority": "...", "status": "ON_TRACK", "details": "..."}
  ],
  "winPatternAlignment": {
    "score": 70,
    "matchingPatterns": ["..."],
    "missingPatterns": ["..."]
  },
  "nextBestActions": ["...", "...", "..."],
  "reasoning": "..."
}`;

    const systemPrompt = `You are an AI sales coaching assistant. Analyze the provided sales rep data and return a structured coaching analysis. Respond ONLY with valid JSON matching the expected format.`;
    const result = await this.callLLMForJSON<CoachingAnalysis>(prompt, systemPrompt);

    // Validate we have the expected result shape (the schema was removed from old callLLMForJSON signature)
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid coaching analysis result from LLM');
    }

    return result;
  }

  /**
   * Process coaching analysis and create alerts/insights
   */
  private async processCoachingAnalysis(
    repId: string,
    analysis: CoachingAnalysis,
    metrics: RepPerformanceMetrics,
    context: AgentContext,
  ): Promise<void> {
    // Create overall coaching insight
    this.addInsight({
      type:
        analysis.overallRating === 'EXCEEDING'
          ? InsightType.BEST_PRACTICE
          : analysis.overallRating === 'AT_RISK'
            ? InsightType.RISK_DETECTED
            : InsightType.INFORMATION,
      priority: this.mapRatingToPriority(analysis.overallRating),
      confidence: 0.85,
      title: `Sales Performance: ${analysis.overallRating}`,
      description: `Performance Score: ${analysis.performanceScore}/100. ${analysis.reasoning.substring(0, 200)}...`,
      metadata: {
        metrics,
        winPatternScore: analysis.winPatternAlignment.score,
      },
    });

    // Create alerts for high-priority coaching recommendations
    for (const rec of analysis.coachingRecommendations) {
      if (rec.priority === 'HIGH') {
        await this.createAlert({
          alertType: AlertType.COACHING_INSIGHT,
          priority: Priority.HIGH,
          title: `Coaching: ${rec.category}`,
          description: rec.recommendation,
          recommendation: rec.expectedImpact,
          userId: repId,
          entityType: CRMEntityType.LEAD, // Default entity type
          entityId: repId, // Use rep ID as entity reference
        });
      }
    }

    // Create alerts for at-risk accountability items
    for (const check of analysis.accountabilityChecks) {
      if (check.status === 'BEHIND' || check.status === 'AT_RISK') {
        await this.createAlert({
          alertType: AlertType.ACCOUNTABILITY_CHECK,
          priority: check.status === 'BEHIND' ? Priority.HIGH : Priority.MEDIUM,
          title: `Accountability: ${check.priority}`,
          description: check.details,
          recommendation: `Review this priority and take corrective action`,
          userId: repId,
          entityType: CRMEntityType.LEAD,
          entityId: repId,
        });
      }
    }

    // Create next best actions
    for (const action of analysis.nextBestActions.slice(0, 3)) {
      this.queueAction({
        actionType: ActionType.CREATE_TASK,
        priority: Priority.MEDIUM,
        description: action,
        params: { subject: 'Recommended Action', notes: action },
        requiresApproval: false,
      });
    }

    // Alert on low win pattern alignment
    if (analysis.winPatternAlignment.score < 50) {
      await this.createAlert({
        alertType: AlertType.NEXT_BEST_ACTION,
        priority: Priority.MEDIUM,
        title: 'Win Pattern Gap Detected',
        description: `Your deals are missing key success patterns: ${analysis.winPatternAlignment.missingPatterns.slice(0, 3).join(', ')}`,
        recommendation:
          'Review successful deal patterns and incorporate into your current opportunities',
        userId: repId,
        entityType: CRMEntityType.LEAD,
        entityId: repId,
      });
    }
  }

  /**
   * Map rating to priority
   */
  private mapRatingToPriority(
    rating: 'EXCEEDING' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK',
  ): Priority {
    switch (rating) {
      case 'AT_RISK':
        return Priority.URGENT;
      case 'NEEDS_ATTENTION':
        return Priority.HIGH;
      case 'ON_TRACK':
        return Priority.MEDIUM;
      case 'EXCEEDING':
        return Priority.LOW;
      default:
        return Priority.MEDIUM;
    }
  }
}
