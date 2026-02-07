/**
 * IRIS Agent Framework - Next Best Action Agent
 *
 * AI-powered next best action recommendations for Phase 1 of the Vertiv O2O journey.
 * This agent recommends prioritized next actions for sales reps based on:
 * - Account history and signals
 * - Seller performance patterns
 * - Time-to-close estimates
 * - Competition status
 * - Win pattern alignment
 *
 * Features:
 * - Prioritized action recommendations with confidence scores
 * - Action sequencing (email -> call -> meeting)
 * - Integration with deal health and coaching insights
 * - Support for Oracle CX, Salesforce, and local data sources
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

// ==================== TYPE DEFINITIONS ====================

/**
 * Action types supported by the agent
 */
export enum NextActionType {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  MEETING = 'MEETING',
  LINKEDIN = 'LINKEDIN',
  PROPOSAL = 'PROPOSAL',
  DEMO = 'DEMO',
  FOLLOW_UP = 'FOLLOW_UP',
  INTERNAL_ESCALATION = 'INTERNAL_ESCALATION',
  COMPETITIVE_RESPONSE = 'COMPETITIVE_RESPONSE',
  CHAMPION_NURTURE = 'CHAMPION_NURTURE',
}

/**
 * Urgency levels for actions
 */
export enum ActionUrgency {
  IMMEDIATE = 'IMMEDIATE', // Within 24 hours
  URGENT = 'URGENT', // Within 48 hours
  STANDARD = 'STANDARD', // Within a week
  LOW = 'LOW', // Opportunistic
}

/**
 * Account signal for analysis
 */
interface AccountSignal {
  type: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  source: string;
  timestamp: Date;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Seller performance metrics
 */
interface SellerPerformanceMetrics {
  winRate: number;
  avgCycleTime: number;
  avgDealSize: number;
  activityScore: number;
  responseTimeAvg: number; // Hours
  emailOpenRate: number;
  meetingConversionRate: number;
  strongestActionTypes: NextActionType[];
  weakestActionTypes: NextActionType[];
}

/**
 * Competition status
 */
interface CompetitionStatus {
  competitors: string[];
  competitivePosition: 'WINNING' | 'COMPETITIVE' | 'BEHIND' | 'UNKNOWN';
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  competitorStrengths: string[];
  ourDifferentiators: string[];
}

/**
 * Win pattern from historical data
 */
interface WinPattern {
  patternName: string;
  successRate: number;
  keyActions: string[];
  typicalSequence: NextActionType[];
  avgTimeToClose: number;
  dealSizeRange: { min: number; max: number };
}

/**
 * Recommended action from the agent
 */
interface RecommendedAction {
  id: string;
  actionType: NextActionType;
  urgency: ActionUrgency;
  confidence: number; // 0-1
  priority: number; // 1-10, higher is more important

  // Action details
  title: string;
  description: string;
  expectedOutcome: string;

  // Targeting
  targetEntityType: CRMEntityType;
  targetEntityId: string;
  targetEntityName: string;

  // Optional contact targeting
  targetContactId?: string;
  targetContactName?: string;

  // Sequencing
  sequencePosition: number; // Position in multi-step sequence
  prerequisiteActionIds: string[];
  followUpActionIds: string[];

  // Timing
  suggestedTiming: string;
  optimalTimeWindow?: { start: Date; end: Date };

  // Context
  reasoning: string;
  supportingSignals: AccountSignal[];
  winPatternAlignment: number; // 0-1

  // Templates/content assistance
  suggestedTemplate?: string;
  talkingPoints?: string[];
}

/**
 * Next Best Action Analysis from LLM
 */
interface NextBestActionAnalysis {
  opportunityId: string;
  opportunityName: string;
  overallAssessment: 'STRONG_MOMENTUM' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'AT_RISK';
  timeToCloseEstimate: number; // Days
  confidenceInEstimate: number; // 0-1

  recommendedActions: Array<{
    actionType: NextActionType;
    urgency: ActionUrgency;
    confidence: number;
    priority: number;
    title: string;
    description: string;
    expectedOutcome: string;
    reasoning: string;
    suggestedTiming: string;
    talkingPoints: string[];
    sequencePosition: number;
  }>;

  competitionAnalysis: {
    threatLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    competitivePosition: 'WINNING' | 'COMPETITIVE' | 'BEHIND' | 'UNKNOWN';
    competitorActions: string[];
    counterStrategies: string[];
  };

  winPatternAlignment: {
    score: number;
    matchingPatterns: string[];
    missingElements: string[];
    recommendedPatternActions: string[];
  };

  riskFactors: string[];
  opportunityFactors: string[];

  actionSequence: {
    immediate: string[];
    shortTerm: string[];
    mediumTerm: string[];
  };

  reasoning: string;
}

@Injectable()
export class NextBestActionAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.NEXT_BEST_ACTION;
  protected readonly logger = new Logger(NextBestActionAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.NEXT_BEST_ACTION,
    name: 'Next Best Action Recommender',
    description:
      'AI-powered next best action recommendations for sales reps based on account signals, seller patterns, and win analysis',
    version: '1.0.0',

    // Run every 2 hours during business hours
    schedule: {
      cron: '0 8,10,12,14,16 * * 1-5', // Every 2 hours, Mon-Fri
      enabled: true,
    },

    // Trigger on key events
    eventTriggers: [
      { eventName: 'crm.opportunity.stage_change', debounceMs: 30000 },
      { eventName: 'crm.meeting.completed', debounceMs: 60000 },
      { eventName: 'crm.email.received', debounceMs: 120000 },
      { eventName: 'crm.signal.detected', debounceMs: 30000 },
      { eventName: 'crm.activity.created', debounceMs: 60000 },
    ],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 30,
      maxAlertsPerExecution: 20,
      maxActionsPerExecution: 15,
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

  // ==================== MAIN EXECUTION ====================

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Next Best Action analysis...');

    // Determine data source
    let dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local';
    let dataSourceLabel = 'local IRIS database';

    if (context.userId) {
      const sourceInfo = await this.determineDataSource(context.userId);
      dataSource = sourceInfo.dataSource;
      dataSourceLabel = sourceInfo.dataSourceLabel;
      this.logger.log(`Using ${dataSource} data source for user ${context.userId}`);
    }

    // If triggered for a specific opportunity
    if (context.entityType === CRMEntityType.OPPORTUNITY && context.entityId) {
      await this.analyzeOpportunityForNextActions(context.entityId, context, dataSource);
      return;
    }

    // Get opportunities to analyze
    const opportunities = await this.getOpportunitiesForAnalysis(context, dataSource);
    this.logger.log(`Analyzing ${opportunities.length} opportunities for next best actions from ${dataSourceLabel}`);

    let analyzed = 0;
    for (const opp of opportunities) {
      if (this.getElapsedTimeMs() > 55000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      await this.analyzeOpportunityForNextActions(opp.id, context, dataSource);
      analyzed++;
    }

    // Summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Next Best Action Analysis Complete',
      description: `Analyzed ${analyzed} opportunities and generated action recommendations from ${dataSourceLabel}`,
    });
  }

  // ==================== OPPORTUNITY ANALYSIS ====================

  private async analyzeOpportunityForNextActions(
    opportunityId: string,
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<void> {
    // Fetch opportunity data
    const opportunity = await this.fetchOpportunityData(opportunityId, context.userId!, dataSource);
    if (!opportunity) {
      this.logger.warn(`Opportunity ${opportunityId} not found`);
      return;
    }

    // Skip closed deals
    const stage = opportunity.stage || opportunity.stageName || '';
    if (['CLOSED_WON', 'CLOSED_LOST', 'Closed Won', 'Closed Lost'].includes(stage)) {
      return;
    }

    // Gather analysis inputs
    const [
      accountSignals,
      sellerMetrics,
      competitionStatus,
      winPatterns,
    ] = await Promise.all([
      this.getAccountSignals(opportunity.accountId, context.userId!, dataSource),
      this.getSellerPerformanceMetrics(context.userId!, dataSource),
      this.getCompetitionStatus(opportunity, dataSource),
      this.getWinPatterns(opportunity, dataSource),
    ]);

    // Perform AI analysis
    const cacheKey = `nba:${opportunityId}:${new Date().toISOString().split('T')[0]}`;
    const analysis = await this.getCached<NextBestActionAnalysis>(
      cacheKey,
      async () => this.performNextBestActionAnalysis(
        opportunity,
        accountSignals,
        sellerMetrics,
        competitionStatus,
        winPatterns,
      ),
      1800, // 30 minute cache
    );

    // Process analysis and create alerts/insights
    await this.processAnalysis(opportunity, analysis, accountSignals, context);
  }

  // ==================== DATA GATHERING ====================

  private async fetchOpportunityData(
    opportunityId: string,
    userId: string,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<any> {
    if (dataSource === 'oracle_cx') {
      const opp = await this.fetchOpportunityFromOracleCX(opportunityId, userId);
      if (opp) return opp;
    } else if (dataSource === 'salesforce') {
      const opp = await this.fetchOpportunityFromSalesforce(opportunityId, userId);
      if (opp) return opp;
    }

    // Fallback to local database
    return this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        account: { select: { id: true, name: true, industry: true, annualRevenue: true } },
        owner: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { activityDate: 'desc' }, take: 20 },
        tasks: { orderBy: { dueDate: 'asc' }, take: 15 },
        contactRoles: { include: { contact: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  private async fetchOpportunityFromSalesforce(opportunityId: string, userId: string): Promise<any | null> {
    try {
      const soql = `
        SELECT Id, Name, StageName, Amount, Probability, CloseDate,
               LastActivityDate, NextStep, Description, Type, LeadSource,
               Account.Id, Account.Name, Account.Industry, Account.AnnualRevenue,
               Owner.Id, Owner.Name, Owner.Email
        FROM Opportunity
        WHERE Id = '${opportunityId}'
      `;
      const result = await this.querySalesforce<any>(userId, soql);
      if (!result?.records?.length) return null;

      const sf = result.records[0];

      // Get activities
      const activitiesSoql = `
        SELECT Id, Subject, ActivityDate, Type, Description, Status
        FROM Task WHERE WhatId = '${opportunityId}'
        ORDER BY ActivityDate DESC LIMIT 20
      `;
      const activitiesResult = await this.querySalesforce<any>(userId, activitiesSoql);

      // Get contact roles
      const contactsSoql = `
        SELECT Id, Role, IsPrimary, Contact.Id, Contact.FirstName, Contact.LastName,
               Contact.Title, Contact.Email, Contact.Phone
        FROM OpportunityContactRole WHERE OpportunityId = '${opportunityId}'
      `;
      const contactsResult = await this.querySalesforce<any>(userId, contactsSoql);

      return {
        id: sf.Id,
        name: sf.Name,
        stage: sf.StageName,
        stageName: sf.StageName,
        amount: sf.Amount,
        probability: sf.Probability,
        closeDate: sf.CloseDate,
        lastActivityDate: sf.LastActivityDate,
        nextStep: sf.NextStep,
        description: sf.Description,
        accountId: sf.Account?.Id,
        account: sf.Account ? {
          id: sf.Account.Id,
          name: sf.Account.Name,
          industry: sf.Account.Industry,
          annualRevenue: sf.Account.AnnualRevenue,
        } : null,
        owner: sf.Owner ? {
          id: sf.Owner.Id,
          name: sf.Owner.Name,
          email: sf.Owner.Email,
        } : null,
        activities: (activitiesResult?.records || []).map((a: any) => ({
          id: a.Id,
          subject: a.Subject,
          activityDate: a.ActivityDate,
          type: a.Type,
          description: a.Description,
          status: a.Status,
        })),
        contactRoles: (contactsResult?.records || []).map((cr: any) => ({
          role: cr.Role,
          isPrimary: cr.IsPrimary,
          contact: cr.Contact ? {
            id: cr.Contact.Id,
            firstName: cr.Contact.FirstName,
            lastName: cr.Contact.LastName,
            title: cr.Contact.Title,
            email: cr.Contact.Email,
            phone: cr.Contact.Phone,
          } : null,
        })),
        _dataSource: 'salesforce',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch opportunity from Salesforce: ${error}`);
      return null;
    }
  }

  private async fetchOpportunityFromOracleCX(opportunityId: string, userId: string): Promise<any | null> {
    try {
      const opty = await this.getOracleCXById<any>(userId, 'opportunities', opportunityId);
      if (!opty) return null;

      // Get activities
      const activitiesResult = await this.queryOracleCX<any>(userId, 'activities', {
        limit: 20,
        filters: { OptyId: opportunityId },
        orderBy: 'LastUpdateDate:desc',
      });

      return {
        id: opty.OptyId?.toString() || opportunityId,
        name: opty.Name,
        stage: opty.SalesStage,
        stageName: opty.SalesStage,
        amount: opty.Revenue,
        probability: opty.WinProb,
        closeDate: opty.EstimatedCloseDate,
        lastActivityDate: opty.LastUpdateDate,
        nextStep: opty.NextStep,
        description: opty.Description,
        accountId: opty.AccountId?.toString(),
        account: opty.AccountId ? {
          id: opty.AccountId?.toString(),
          name: opty.AccountName,
          industry: opty.Industry,
        } : null,
        activities: (activitiesResult?.items || []).map((a: any) => ({
          id: a.ActivityId?.toString(),
          subject: a.ActivityName,
          activityDate: a.StartDate || a.EndDate,
          type: a.ActivityType,
          description: a.Description,
        })),
        contactRoles: [], // Would need separate query
        _dataSource: 'oracle_cx',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch opportunity from Oracle CX: ${error}`);
      return null;
    }
  }

  /**
   * Get account signals from various sources
   */
  private async getAccountSignals(
    accountId: string | undefined,
    userId: string,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<AccountSignal[]> {
    const signals: AccountSignal[] = [];

    if (!accountId) return signals;

    try {
      // Get local signals from database
      const localSignals = await this.prisma.accountSignal.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []);

      for (const signal of localSignals) {
        signals.push({
          type: signal.type || 'UNKNOWN',
          strength: this.mapConfidenceToStrength(signal.confidence || 0.5),
          source: signal.source || 'IRIS',
          timestamp: signal.createdAt || new Date(),
          description: signal.description || '',
          metadata: (signal.data as Record<string, unknown>) || {},
        });
      }

      // Get recent activities as engagement signals
      const activities = await this.prisma.activity.findMany({
        where: { accountId },
        orderBy: { activityDate: 'desc' },
        take: 10,
      });

      for (const activity of activities) {
        signals.push({
          type: 'ENGAGEMENT',
          strength: activity.outcome === 'COMPLETED' ? 'STRONG' : 'MODERATE',
          source: 'Activity',
          timestamp: activity.activityDate || new Date(),
          description: `${activity.type}: ${activity.subject}`,
        });
      }

      // Get email engagement signals
      const emailThreads = await this.prisma.emailThread.findMany({
        where: {
          userId,
          accountId,
        },
        orderBy: { lastEmailAt: 'desc' },
        take: 10,
      });

      for (const thread of emailThreads) {
        if (thread.status === 'RESPONDED') {
          signals.push({
            type: 'EMAIL_ENGAGEMENT',
            strength: 'STRONG',
            source: 'Email',
            timestamp: thread.lastEmailAt || new Date(),
            description: `Email reply received: ${thread.subject}`,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Error gathering account signals: ${error}`);
    }

    return signals;
  }

  private mapConfidenceToStrength(confidence: number): 'STRONG' | 'MODERATE' | 'WEAK' {
    if (confidence >= 0.7) return 'STRONG';
    if (confidence >= 0.4) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Get seller performance metrics
   */
  private async getSellerPerformanceMetrics(
    userId: string,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<SellerPerformanceMetrics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    try {
      // Get opportunities
      const opportunities = await this.prisma.opportunity.findMany({
        where: {
          ownerId: userId,
          createdAt: { gte: ninetyDaysAgo },
        },
      });

      const wonOpps = opportunities.filter((o) => o.stage === 'CLOSED_WON');
      const lostOpps = opportunities.filter((o) => o.stage === 'CLOSED_LOST');

      // Calculate win rate
      const totalClosed = wonOpps.length + lostOpps.length;
      const winRate = totalClosed > 0 ? (wonOpps.length / totalClosed) * 100 : 50;

      // Calculate avg cycle time
      let avgCycleTime = 45; // Default
      if (wonOpps.length > 0) {
        const totalDays = wonOpps.reduce((sum, o) => {
          const created = new Date(o.createdAt);
          const closed = o.closeDate ? new Date(o.closeDate) : new Date();
          return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgCycleTime = totalDays / wonOpps.length;
      }

      // Calculate avg deal size
      const avgDealSize = wonOpps.length > 0
        ? wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0) / wonOpps.length
        : 0;

      // Get activities
      const activities = await this.prisma.activity.findMany({
        where: {
          userId,
          activityDate: { gte: thirtyDaysAgo },
        },
      });

      const meetings = activities.filter((a) => a.type === 'MEETING');
      const calls = activities.filter((a) => a.type === 'CALL');
      const emails = activities.filter((a) => a.type === 'EMAIL');

      // Calculate activity score
      const activityScore = activities.length;

      // Determine strongest action types based on success correlation
      const strongestActionTypes: NextActionType[] = [];
      const weakestActionTypes: NextActionType[] = [];

      if (meetings.length > calls.length && meetings.length > emails.length) {
        strongestActionTypes.push(NextActionType.MEETING);
      }
      if (calls.length >= 5) {
        strongestActionTypes.push(NextActionType.CALL);
      }
      if (emails.length < 5) {
        weakestActionTypes.push(NextActionType.EMAIL);
      }

      return {
        winRate,
        avgCycleTime,
        avgDealSize,
        activityScore,
        responseTimeAvg: 4, // Default - would need email tracking
        emailOpenRate: 0.45, // Default - would need email tracking
        meetingConversionRate: meetings.length > 0 ? 0.6 : 0.4,
        strongestActionTypes: strongestActionTypes.length > 0 ? strongestActionTypes : [NextActionType.MEETING],
        weakestActionTypes,
      };
    } catch (error) {
      this.logger.warn(`Error getting seller metrics: ${error}`);
      return {
        winRate: 50,
        avgCycleTime: 45,
        avgDealSize: 50000,
        activityScore: 10,
        responseTimeAvg: 4,
        emailOpenRate: 0.45,
        meetingConversionRate: 0.5,
        strongestActionTypes: [NextActionType.MEETING],
        weakestActionTypes: [],
      };
    }
  }

  /**
   * Get competition status for an opportunity
   */
  private async getCompetitionStatus(
    opportunity: any,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<CompetitionStatus> {
    // In a production system, this would pull from competition tracking
    // For now, analyze from opportunity metadata/notes

    const competitors: string[] = [];
    let competitivePosition: 'WINNING' | 'COMPETITIVE' | 'BEHIND' | 'UNKNOWN' = 'UNKNOWN';
    let threatLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';

    try {
      // Check for competitor mentions in notes
      const notes = opportunity.notes || [];
      for (const note of notes) {
        const content = (note.content || '').toLowerCase();
        // Common competitor patterns
        if (content.includes('competitor') || content.includes('competing')) {
          threatLevel = 'MEDIUM';
        }
        if (content.includes('losing') || content.includes('behind')) {
          competitivePosition = 'BEHIND';
          threatLevel = 'HIGH';
        }
        if (content.includes('winning') || content.includes('preferred')) {
          competitivePosition = 'WINNING';
          threatLevel = 'LOW';
        }
      }

      // Check opportunity metadata for competitors
      if (opportunity.competitors) {
        if (Array.isArray(opportunity.competitors)) {
          competitors.push(...opportunity.competitors);
        }
        if (competitors.length > 0) {
          threatLevel = threatLevel === 'NONE' ? 'MEDIUM' : threatLevel;
          if (competitivePosition === 'UNKNOWN') {
            competitivePosition = 'COMPETITIVE';
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Error getting competition status: ${error}`);
    }

    return {
      competitors,
      competitivePosition,
      threatLevel,
      competitorStrengths: [],
      ourDifferentiators: [],
    };
  }

  /**
   * Get win patterns for similar opportunities
   */
  private async getWinPatterns(
    opportunity: any,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<WinPattern[]> {
    // In a production system, this would analyze historical won deals
    // with similar characteristics (industry, size, stage)

    const patterns: WinPattern[] = [
      {
        patternName: 'Multi-Threaded Executive Engagement',
        successRate: 0.78,
        keyActions: [
          'Engage 3+ stakeholders',
          'Executive sponsor identified',
          'Technical validation completed',
        ],
        typicalSequence: [NextActionType.EMAIL, NextActionType.CALL, NextActionType.MEETING, NextActionType.DEMO],
        avgTimeToClose: 45,
        dealSizeRange: { min: 50000, max: 500000 },
      },
      {
        patternName: 'Fast Track with Champion',
        successRate: 0.82,
        keyActions: [
          'Strong internal champion',
          'Clear timeline urgency',
          'Budget confirmed',
        ],
        typicalSequence: [NextActionType.MEETING, NextActionType.PROPOSAL, NextActionType.MEETING],
        avgTimeToClose: 30,
        dealSizeRange: { min: 25000, max: 150000 },
      },
      {
        patternName: 'Technical-Led Sale',
        successRate: 0.71,
        keyActions: [
          'POC/pilot completed',
          'Technical requirements documented',
          'Integration plan approved',
        ],
        typicalSequence: [NextActionType.CALL, NextActionType.DEMO, NextActionType.MEETING, NextActionType.PROPOSAL],
        avgTimeToClose: 60,
        dealSizeRange: { min: 100000, max: 1000000 },
      },
    ];

    return patterns;
  }

  // ==================== AI ANALYSIS ====================

  private async performNextBestActionAnalysis(
    opportunity: any,
    signals: AccountSignal[],
    sellerMetrics: SellerPerformanceMetrics,
    competition: CompetitionStatus,
    winPatterns: WinPattern[],
  ): Promise<NextBestActionAnalysis> {
    const daysSinceActivity = opportunity.lastActivityDate
      ? Math.floor((Date.now() - new Date(opportunity.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const daysUntilClose = opportunity.closeDate
      ? Math.floor((new Date(opportunity.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const recentSignals = signals.filter(s => {
      const signalAge = (Date.now() - new Date(s.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return signalAge <= 14;
    });

    const strongSignals = recentSignals.filter(s => s.strength === 'STRONG');

    const prompt = `You are an expert sales strategist. Analyze this opportunity and recommend the next best actions.

OPPORTUNITY DETAILS:
- Name: ${opportunity.name}
- Account: ${opportunity.account?.name || 'Unknown'} (${opportunity.account?.industry || 'Unknown industry'})
- Deal Size: $${(opportunity.amount || 0).toLocaleString()}
- Current Stage: ${opportunity.stage || opportunity.stageName}
- Days Until Close: ${daysUntilClose ?? 'Not set'}
- Days Since Last Activity: ${daysSinceActivity}
- Win Probability: ${opportunity.probability || opportunity.winProbability || 'Not set'}%
- Next Step: ${opportunity.nextStep || 'Not defined'}

CONTACTS ENGAGED:
${(opportunity.contactRoles || []).map((cr: any) =>
  `- ${cr.contact?.firstName} ${cr.contact?.lastName}: ${cr.role || 'Unknown role'} (${cr.contact?.title || 'Unknown title'})`
).join('\n') || 'No contacts linked'}

RECENT ACTIVITIES (last 20):
${(opportunity.activities || []).slice(0, 10).map((a: any) =>
  `- ${a.type || 'Activity'}: ${a.subject} (${a.activityDate ? new Date(a.activityDate).toLocaleDateString() : 'No date'})`
).join('\n') || 'No recent activities'}

ACCOUNT SIGNALS (recent):
${recentSignals.slice(0, 8).map(s =>
  `- [${s.strength}] ${s.type}: ${s.description}`
).join('\n') || 'No recent signals'}

SELLER PERFORMANCE:
- Win Rate: ${sellerMetrics.winRate.toFixed(1)}%
- Avg Cycle Time: ${sellerMetrics.avgCycleTime.toFixed(0)} days
- Strongest Actions: ${sellerMetrics.strongestActionTypes.join(', ')}
- Activity Score (30d): ${sellerMetrics.activityScore}

COMPETITION STATUS:
- Position: ${competition.competitivePosition}
- Threat Level: ${competition.threatLevel}
- Known Competitors: ${competition.competitors.length > 0 ? competition.competitors.join(', ') : 'None identified'}

WIN PATTERNS TO FOLLOW:
${winPatterns.map(p =>
  `- ${p.patternName} (${(p.successRate * 100).toFixed(0)}% success): ${p.keyActions.slice(0, 2).join(', ')}`
).join('\n')}

Based on this analysis, provide next best action recommendations in this JSON format:
{
  "opportunityId": "${opportunity.id}",
  "opportunityName": "${opportunity.name}",
  "overallAssessment": "STRONG_MOMENTUM|ON_TRACK|NEEDS_ATTENTION|AT_RISK",
  "timeToCloseEstimate": <number of days>,
  "confidenceInEstimate": <0-1>,
  "recommendedActions": [
    {
      "actionType": "EMAIL|CALL|MEETING|LINKEDIN|PROPOSAL|DEMO|FOLLOW_UP|INTERNAL_ESCALATION|COMPETITIVE_RESPONSE|CHAMPION_NURTURE",
      "urgency": "IMMEDIATE|URGENT|STANDARD|LOW",
      "confidence": <0-1>,
      "priority": <1-10>,
      "title": "<brief action title>",
      "description": "<detailed action description>",
      "expectedOutcome": "<what this action should achieve>",
      "reasoning": "<why this action is recommended>",
      "suggestedTiming": "<when to take this action>",
      "talkingPoints": ["<point 1>", "<point 2>"],
      "sequencePosition": <1-5 position in recommended sequence>
    }
  ],
  "competitionAnalysis": {
    "threatLevel": "HIGH|MEDIUM|LOW|NONE",
    "competitivePosition": "WINNING|COMPETITIVE|BEHIND|UNKNOWN",
    "competitorActions": ["<actions competitors might take>"],
    "counterStrategies": ["<how to counter competition>"]
  },
  "winPatternAlignment": {
    "score": <0-100>,
    "matchingPatterns": ["<patterns this deal matches>"],
    "missingElements": ["<elements needed for success>"],
    "recommendedPatternActions": ["<specific actions from win patterns>"]
  },
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "opportunityFactors": ["<opportunity 1>", "<opportunity 2>"],
  "actionSequence": {
    "immediate": ["<actions for today/tomorrow>"],
    "shortTerm": ["<actions for this week>"],
    "mediumTerm": ["<actions for next 2-4 weeks>"]
  },
  "reasoning": "<overall explanation of the recommendation strategy>"
}

IMPORTANT GUIDELINES:
1. Recommend 3-5 prioritized actions
2. Consider seller strengths (${sellerMetrics.strongestActionTypes.join(', ')})
3. Account for days since last activity (${daysSinceActivity} days)
4. If deal is stalled (>14 days no activity), prioritize re-engagement
5. Match actions to win patterns when possible
6. Include at least one action that addresses any competitive threats
7. Sequence actions logically (e.g., EMAIL before CALL before MEETING)
8. Be specific and actionable in descriptions`;

    const systemPrompt = `You are an expert AI sales strategist specializing in next best action recommendations. Your recommendations must be:
1. Data-driven - based on the signals, metrics, and patterns provided
2. Actionable - specific enough that a rep can execute immediately
3. Prioritized - ranked by impact and urgency
4. Sequenced - logically ordered for maximum effectiveness
5. Contextual - appropriate for the deal stage, size, and competition

Return ONLY valid JSON matching the specified format. Be specific and practical.`;

    return this.callLLMForJSON<NextBestActionAnalysis>(prompt, systemPrompt);
  }

  // ==================== RESULT PROCESSING ====================

  private async processAnalysis(
    opportunity: any,
    analysis: NextBestActionAnalysis,
    signals: AccountSignal[],
    context: AgentContext,
  ): Promise<void> {
    // Create main insight
    this.addInsight({
      type: this.mapAssessmentToInsightType(analysis.overallAssessment),
      priority: this.mapAssessmentToPriority(analysis.overallAssessment),
      confidence: analysis.confidenceInEstimate,
      title: `${opportunity.name}: ${this.formatAssessment(analysis.overallAssessment)}`,
      description: analysis.reasoning.substring(0, 300),
      recommendation: analysis.recommendedActions[0]?.title,
      entityType: CRMEntityType.OPPORTUNITY,
      entityId: opportunity.id,
      evidence: [
        ...analysis.riskFactors.map(r => ({ source: 'Risk Factor', excerpt: r })),
        ...analysis.opportunityFactors.map(o => ({ source: 'Opportunity Factor', excerpt: o })),
      ],
      metadata: {
        timeToCloseEstimate: analysis.timeToCloseEstimate,
        winPatternScore: analysis.winPatternAlignment.score,
        competitivePosition: analysis.competitionAnalysis.competitivePosition,
        threatLevel: analysis.competitionAnalysis.threatLevel,
      },
    });

    // Create alerts for top recommended actions
    if (context.userId) {
      for (const action of analysis.recommendedActions.slice(0, 3)) {
        await this.createAlert({
          alertType: AlertType.NEXT_BEST_ACTION,
          priority: this.mapActionUrgencyToPriority(action.urgency),
          title: `${action.title}`,
          description: action.description,
          recommendation: action.reasoning,
          userId: context.userId,
          entityType: CRMEntityType.OPPORTUNITY,
          entityId: opportunity.id,
          suggestedActions: [{
            label: action.title,
            actionType: this.mapNextActionTypeToActionType(action.actionType),
            params: {
              opportunityId: opportunity.id,
              actionType: action.actionType,
              talkingPoints: action.talkingPoints,
              suggestedTiming: action.suggestedTiming,
            },
          }],
          metadata: {
            actionType: action.actionType,
            confidence: action.confidence,
            priority: action.priority,
            sequencePosition: action.sequencePosition,
            expectedOutcome: action.expectedOutcome,
            talkingPoints: action.talkingPoints,
          },
        });
      }
    }

    // Create insight for win pattern gaps
    if (analysis.winPatternAlignment.score < 60 && analysis.winPatternAlignment.missingElements.length > 0) {
      this.addInsight({
        type: InsightType.SKILL_GAP,
        priority: Priority.MEDIUM,
        confidence: 0.8,
        title: `Win Pattern Gap: ${opportunity.name}`,
        description: `This deal is missing key success patterns: ${analysis.winPatternAlignment.missingElements.slice(0, 3).join(', ')}`,
        recommendation: analysis.winPatternAlignment.recommendedPatternActions[0],
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opportunity.id,
      });
    }

    // Create alert for competitive threats
    if (analysis.competitionAnalysis.threatLevel === 'HIGH') {
      await this.createAlert({
        alertType: AlertType.URGENT_ACTION,
        priority: Priority.HIGH,
        title: `Competitive Threat: ${opportunity.name}`,
        description: `Competition status: ${analysis.competitionAnalysis.competitivePosition}. ${analysis.competitionAnalysis.counterStrategies[0] || 'Review competitive positioning.'}`,
        recommendation: analysis.competitionAnalysis.counterStrategies.join('; '),
        userId: context.userId!,
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opportunity.id,
      });
    }

    // Queue recommended actions
    for (const action of analysis.recommendedActions) {
      this.queueAction({
        actionType: this.mapNextActionTypeToActionType(action.actionType),
        priority: this.mapActionUrgencyToPriority(action.urgency),
        description: `${action.title}: ${action.description}`,
        params: {
          opportunityId: opportunity.id,
          actionType: action.actionType,
          expectedOutcome: action.expectedOutcome,
          talkingPoints: action.talkingPoints,
          suggestedTiming: action.suggestedTiming,
          sequencePosition: action.sequencePosition,
        },
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opportunity.id,
        requiresApproval: false,
      });
    }
  }

  // ==================== HELPERS ====================

  private async getOpportunitiesForAnalysis(
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx',
  ): Promise<{ id: string }[]> {
    // Prioritize opportunities that need attention
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const where: any = {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
    };

    if (context.userId) {
      where.ownerId = context.userId;
    }

    // Get opportunities with various priority criteria
    return this.prisma.opportunity.findMany({
      where,
      take: context.scope?.maxEntities || 25,
      orderBy: [
        { closeDate: 'asc' }, // Closing soon first
        { amount: 'desc' }, // Higher value
        { lastActivityDate: 'asc' }, // Stale deals
      ],
      select: { id: true },
    });
  }

  private mapAssessmentToInsightType(assessment: string): InsightType {
    switch (assessment) {
      case 'STRONG_MOMENTUM':
        return InsightType.BUYING_SIGNAL;
      case 'ON_TRACK':
        return InsightType.INFORMATION;
      case 'NEEDS_ATTENTION':
        return InsightType.FOLLOW_UP_NEEDED;
      case 'AT_RISK':
        return InsightType.RISK_DETECTED;
      default:
        return InsightType.INFORMATION;
    }
  }

  private mapAssessmentToPriority(assessment: string): Priority {
    switch (assessment) {
      case 'AT_RISK':
        return Priority.URGENT;
      case 'NEEDS_ATTENTION':
        return Priority.HIGH;
      case 'ON_TRACK':
        return Priority.MEDIUM;
      case 'STRONG_MOMENTUM':
        return Priority.LOW;
      default:
        return Priority.MEDIUM;
    }
  }

  private formatAssessment(assessment: string): string {
    switch (assessment) {
      case 'STRONG_MOMENTUM':
        return 'Strong Momentum';
      case 'ON_TRACK':
        return 'On Track';
      case 'NEEDS_ATTENTION':
        return 'Needs Attention';
      case 'AT_RISK':
        return 'At Risk';
      default:
        return assessment;
    }
  }

  private mapActionUrgencyToPriority(urgency: ActionUrgency | string): Priority {
    switch (urgency) {
      case ActionUrgency.IMMEDIATE:
      case 'IMMEDIATE':
        return Priority.URGENT;
      case ActionUrgency.URGENT:
      case 'URGENT':
        return Priority.HIGH;
      case ActionUrgency.STANDARD:
      case 'STANDARD':
        return Priority.MEDIUM;
      case ActionUrgency.LOW:
      case 'LOW':
        return Priority.LOW;
      default:
        return Priority.MEDIUM;
    }
  }

  private mapNextActionTypeToActionType(nextActionType: NextActionType | string): ActionType {
    switch (nextActionType) {
      case NextActionType.EMAIL:
      case 'EMAIL':
        return ActionType.SEND_EMAIL;
      case NextActionType.MEETING:
      case 'MEETING':
      case NextActionType.DEMO:
      case 'DEMO':
        return ActionType.SCHEDULE_MEETING;
      case NextActionType.CALL:
      case 'CALL':
        return ActionType.LOG_ACTIVITY;
      case NextActionType.PROPOSAL:
      case 'PROPOSAL':
        return ActionType.CREATE_TASK;
      default:
        return ActionType.CREATE_TASK;
    }
  }
}
