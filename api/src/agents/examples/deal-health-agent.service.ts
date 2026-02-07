/**
 * IRIS Agent Framework - Deal Health Agent
 * 
 * Example implementation of an agent using the framework.
 * This agent monitors opportunity health and generates alerts for:
 * - Stalled deals (no activity for X days)
 * - At-risk deals (negative signals detected)
 * - Deals with upcoming close dates but low activity
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
  CRMEntityType,
} from '../types';

/**
 * Deal Health Analysis from LLM
 */
interface DealHealthAnalysis {
  overallHealth: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  healthScore: number; // 0-100
  riskFactors: string[];
  positiveSignals: string[];
  recommendedActions: string[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reasoning: string;
}

@Injectable()
export class DealHealthAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.DEAL_HEALTH;
  protected readonly logger = new Logger(DealHealthAgentService.name);
  
  protected readonly config: AgentConfig = {
    type: AgentType.DEAL_HEALTH,
    name: 'Deal Health Monitor',
    description: 'Monitors opportunity health and alerts on risks',
    version: '1.0.0',
    
    // Run every 4 hours to monitor deal health
    schedule: {
      cron: '0 */4 * * *',
      enabled: true, // ENABLED - monitors deal health and creates alerts
    },
    
    // Also trigger on opportunity events
    eventTriggers: [
      { eventName: 'crm.opportunity.updated' },
      { eventName: 'crm.activity.created' },
      { eventName: 'crm.meeting.completed' },
    ],
    
    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 20,
      maxAlertsPerExecution: 10,
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
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService, sfService, ocxService);
  }

  /**
   * Get tools available to this agent
   */
  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  /**
   * Main execution logic
   */
  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Deal Health analysis...');

    // Determine data source priority: Oracle CX > Salesforce > Local
    let dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local';
    let dataSourceLabel = 'local IRIS database';

    if (context.userId) {
      const sourceInfo = await this.determineDataSource(context.userId);
      dataSource = sourceInfo.dataSource;
      dataSourceLabel = sourceInfo.dataSourceLabel;
      this.logger.log(`Using ${dataSource} data source for user ${context.userId}`);
    }

    // If triggered for a specific opportunity, analyze just that one
    if (context.entityType === CRMEntityType.OPPORTUNITY && context.entityId) {
      await this.analyzeOpportunity(context.entityId, context, dataSource);
      return;
    }

    // Otherwise, analyze all open opportunities for the user
    const opportunities = await this.getOpenOpportunities(context, dataSource);
    this.logger.log(`Analyzing ${opportunities.length} open opportunities from ${dataSourceLabel}`);

    for (const opp of opportunities) {
      // Check execution time limit
      if (this.getElapsedTimeMs() > 50000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      await this.analyzeOpportunity(opp.id, context, dataSource);
    }

    // Generate summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Deal Health Analysis Complete',
      description: `Analyzed ${opportunities.length} opportunities from ${dataSourceLabel}`,
    });
  }

  /**
   * Analyze a single opportunity
   */
  private async analyzeOpportunity(
    opportunityId: string,
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local',
  ): Promise<void> {
    let opportunity: any = null;

    if (dataSource === 'oracle_cx' && context.userId) {
      // Fetch from Oracle CX
      opportunity = await this.fetchOpportunityFromOracleCX(opportunityId, context.userId);
    } else if (dataSource === 'salesforce' && context.userId) {
      // Fetch from Salesforce
      opportunity = await this.fetchOpportunityFromSalesforce(opportunityId, context.userId);
    }

    if (!opportunity) {
      // Fallback to local database
      opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
          account: { select: { id: true, name: true } },
          activities: { orderBy: { activityDate: 'desc' }, take: 10 },
          tasks: { where: { status: { not: 'COMPLETED' } } },
          contactRoles: { include: { contact: true } },
          notes: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    }

    if (!opportunity) {
      this.logger.warn(`Opportunity ${opportunityId} not found`);
      return;
    }

    // Check if we recently analyzed this opportunity (cache)
    const cacheKey = `analysis:${opportunityId}`;
    const cached = await this.getCached<DealHealthAnalysis>(
      cacheKey,
      async () => this.performAIAnalysis(opportunity),
      1800, // 30 minute cache
    );

    // Process the analysis
    await this.processAnalysis(opportunity, cached, context);
  }

  /**
   * Fetch opportunity data from Salesforce with related records
   */
  private async fetchOpportunityFromSalesforce(opportunityId: string, userId: string): Promise<any | null> {
    try {
      // Query opportunity with Account info
      const oppSoql = `
        SELECT Id, Name, StageName, Amount, Probability, CloseDate,
               LastActivityDate, NextStep, Description, Type, LeadSource,
               Account.Id, Account.Name
        FROM Opportunity
        WHERE Id = '${opportunityId}'
      `;
      const oppResult = await this.querySalesforce<any>(userId, oppSoql);
      if (!oppResult?.records?.length) return null;

      const sfOpp = oppResult.records[0];

      // Query related Tasks
      const tasksSoql = `
        SELECT Id, Subject, Status, Priority, ActivityDate
        FROM Task
        WHERE WhatId = '${opportunityId}' AND Status != 'Completed'
        ORDER BY ActivityDate ASC LIMIT 10
      `;
      const tasksResult = await this.querySalesforce<any>(userId, tasksSoql);

      // Query recent Activities/Events
      const eventsSoql = `
        SELECT Id, Subject, ActivityDateTime, Description
        FROM Event
        WHERE WhatId = '${opportunityId}'
        ORDER BY ActivityDateTime DESC LIMIT 10
      `;
      const eventsResult = await this.querySalesforce<any>(userId, eventsSoql);

      // Query OpportunityContactRoles
      const contactRolesSoql = `
        SELECT Id, Role, IsPrimary, Contact.Id, Contact.FirstName, Contact.LastName, Contact.Title
        FROM OpportunityContactRole
        WHERE OpportunityId = '${opportunityId}'
      `;
      const contactRolesResult = await this.querySalesforce<any>(userId, contactRolesSoql);

      // Map SF data to our expected format
      return {
        id: sfOpp.Id,
        name: sfOpp.Name,
        stage: sfOpp.StageName,
        amount: sfOpp.Amount,
        probability: sfOpp.Probability,
        winProbability: sfOpp.Probability,
        closeDate: sfOpp.CloseDate,
        lastActivityDate: sfOpp.LastActivityDate,
        nextStep: sfOpp.NextStep,
        description: sfOpp.Description,
        account: sfOpp.Account ? { id: sfOpp.Account.Id, name: sfOpp.Account.Name } : null,
        activities: (eventsResult?.records || []).map((e: any) => ({
          type: 'EVENT',
          subject: e.Subject,
          activityDate: e.ActivityDateTime,
        })),
        tasks: (tasksResult?.records || []).map((t: any) => ({
          subject: t.Subject,
          status: t.Status,
          priority: t.Priority,
          dueDate: t.ActivityDate,
        })),
        contactRoles: (contactRolesResult?.records || []).map((cr: any) => ({
          role: cr.Role,
          contact: cr.Contact ? {
            firstName: cr.Contact.FirstName,
            lastName: cr.Contact.LastName,
            title: cr.Contact.Title,
          } : null,
        })),
        notes: [], // SF doesn't have direct Notes on Opportunities by default
        _dataSource: 'salesforce',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch opportunity ${opportunityId} from Salesforce: ${error}`);
      return null;
    }
  }

  /**
   * Perform AI analysis of the opportunity
   */
  private async performAIAnalysis(opportunity: any): Promise<DealHealthAnalysis> {
    const daysSinceActivity = opportunity.lastActivityDate
      ? Math.floor((Date.now() - new Date(opportunity.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const daysUntilClose = opportunity.closeDate
      ? Math.floor((new Date(opportunity.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `Analyze this sales opportunity and assess its health:

OPPORTUNITY:
- Name: ${opportunity.name}
- Account: ${opportunity.account?.name || 'Unknown'}
- Amount: $${opportunity.amount?.toLocaleString() || 'Not set'}
- Stage: ${opportunity.stage}
- Close Date: ${opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString() : 'Not set'}
- Days Until Close: ${daysUntilClose ?? 'Unknown'}
- Days Since Last Activity: ${daysSinceActivity}
- Win Probability: ${opportunity.probability || opportunity.winProbability || 'Not set'}%
- Current Risk Factors: ${opportunity.riskFactors?.join(', ') || 'None recorded'}

RECENT ACTIVITIES (${opportunity.activities?.length || 0}):
${opportunity.activities?.slice(0, 5).map((a: any) => 
  `- ${a.type}: ${a.subject} (${a.activityDate ? new Date(a.activityDate).toLocaleDateString() : 'No date'})`
).join('\n') || 'No recent activities'}

OPEN TASKS (${opportunity.tasks?.length || 0}):
${opportunity.tasks?.slice(0, 3).map((t: any) => 
  `- ${t.subject} (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`
).join('\n') || 'No open tasks'}

CONTACTS (${opportunity.contactRoles?.length || 0}):
${opportunity.contactRoles?.map((cr: any) => 
  `- ${cr.contact?.firstName} ${cr.contact?.lastName} (${cr.role || 'Unknown role'})`
).join('\n') || 'No contacts linked'}

Provide a JSON analysis:
{
  "overallHealth": "HEALTHY|AT_RISK|CRITICAL",
  "healthScore": <0-100>,
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "positiveSignals": ["<positive 1>", "<positive 2>"],
  "recommendedActions": ["<action 1>", "<action 2>"],
  "urgency": "LOW|MEDIUM|HIGH|URGENT",
  "reasoning": "<brief explanation>"
}

Consider:
- Stalled deals (no activity in 14+ days) are AT_RISK
- Deals closing soon with low activity are CRITICAL
- Missing contacts or champion = risk factor
- Recent positive activities = positive signal`;

    const systemPrompt = `You are an AI sales analyst. Analyze opportunity health objectively.
Return ONLY valid JSON. Be specific about risks and actions.`;

    return this.callLLMForJSON<DealHealthAnalysis>(prompt, systemPrompt);
  }

  /**
   * Process analysis results and create alerts/insights
   */
  private async processAnalysis(
    opportunity: any,
    analysis: DealHealthAnalysis,
    context: AgentContext,
  ): Promise<void> {
    // Add insight for every analyzed opportunity
    this.addInsight({
      type: analysis.overallHealth === 'CRITICAL' ? InsightType.RISK_DETECTED :
            analysis.overallHealth === 'AT_RISK' ? InsightType.STALL_WARNING :
            InsightType.INFORMATION,
      priority: this.mapUrgency(analysis.urgency),
      confidence: analysis.healthScore / 100,
      title: `${opportunity.name}: ${analysis.overallHealth}`,
      description: analysis.reasoning,
      recommendation: analysis.recommendedActions[0],
      entityType: CRMEntityType.OPPORTUNITY,
      entityId: opportunity.id,
      evidence: analysis.riskFactors.map(r => ({ source: 'AI Analysis', excerpt: r })),
    });

    // Create alert for at-risk or critical deals
    if (analysis.overallHealth !== 'HEALTHY' && context.userId) {
      await this.createAlert({
        alertType: analysis.overallHealth === 'CRITICAL' ? AlertType.DEAL_AT_RISK : AlertType.DEAL_STALLED,
        priority: this.mapUrgency(analysis.urgency),
        title: `${opportunity.name} needs attention`,
        description: `Health Score: ${analysis.healthScore}/100. ${analysis.reasoning}`,
        recommendation: analysis.recommendedActions.join('; '),
        userId: context.userId,
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opportunity.id,
        suggestedActions: analysis.recommendedActions.map(action => ({
          label: action,
          actionType: 'CREATE_TASK' as any,
          params: { subject: action, opportunityId: opportunity.id },
        })),
        metadata: {
          healthScore: analysis.healthScore,
          riskFactors: analysis.riskFactors,
          positiveSignals: analysis.positiveSignals,
        },
      });
    }

    // Update opportunity with analysis results (only for local DB, not Salesforce)
    if (opportunity._dataSource !== 'salesforce') {
      try {
        await this.prisma.opportunity.update({
          where: { id: opportunity.id },
          data: {
            riskFactors: analysis.riskFactors,
            recommendedActions: analysis.recommendedActions,
            winProbability: analysis.healthScore / 100,
          },
        });
      } catch (error) {
        this.logger.warn(`Could not update opportunity ${opportunity.id}: ${error}`);
      }
    } else {
      this.logger.debug(`Skipping local DB update for Salesforce opportunity ${opportunity.id}`);
    }
  }

  /**
   * Get open opportunities for analysis
   */
  private async getOpenOpportunities(
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local',
  ): Promise<any[]> {
    // Try Oracle CX first if selected
    if (dataSource === 'oracle_cx' && context.userId) {
      const ocxOpps = await this.getOpenOpportunitiesFromOracleCX(context);
      if (ocxOpps && ocxOpps.length > 0) {
        return ocxOpps;
      }
    }

    // Try Salesforce if selected
    if (dataSource === 'salesforce' && context.userId) {
      const sfOpps = await this.getOpenOpportunitiesFromSalesforce(context);
      if (sfOpps && sfOpps.length > 0) {
        return sfOpps;
      }
    }

    // Fallback to local database
    const where: any = {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
    };

    if (context.userId) {
      where.ownerId = context.userId;
    }

    if (context.scope?.accountIds) {
      where.accountId = { in: context.scope.accountIds };
    }

    return this.prisma.opportunity.findMany({
      where,
      take: context.scope?.maxEntities || 50,
      orderBy: [
        { closeDate: 'asc' },
        { amount: 'desc' },
      ],
      select: { id: true },
    });
  }

  /**
   * Get open opportunities from Salesforce
   */
  private async getOpenOpportunitiesFromSalesforce(context: AgentContext): Promise<{ id: string }[] | null> {
    if (!context.userId) return null;

    try {
      const limit = context.scope?.maxEntities || 50;
      const soql = `
        SELECT Id FROM Opportunity
        WHERE IsClosed = false
        ORDER BY CloseDate ASC, Amount DESC NULLS LAST
        LIMIT ${limit}
      `;
      const result = await this.querySalesforce<{ Id: string }>(context.userId, soql);
      if (!result?.records) return null;

      return result.records.map(r => ({ id: r.Id }));
    } catch (error) {
      this.logger.warn(`Failed to fetch open opportunities from Salesforce: ${error}`);
      return null;
    }
  }

  /**
   * Get open opportunities from Oracle CX
   */
  private async getOpenOpportunitiesFromOracleCX(context: AgentContext): Promise<{ id: string }[] | null> {
    if (!context.userId) return null;

    try {
      const limit = context.scope?.maxEntities || 50;
      const result = await this.queryOracleCX<{ OptyId: number }>(
        context.userId,
        'opportunities',
        {
          limit,
          filters: {
            StatusCode: 'OPEN',
          },
          orderBy: 'EstimatedCloseDate:asc',
        },
      );

      if (!result?.items) return null;

      return result.items.map(r => ({ id: r.OptyId?.toString() }));
    } catch (error) {
      this.logger.warn(`Failed to fetch open opportunities from Oracle CX: ${error}`);
      return null;
    }
  }

  /**
   * Fetch opportunity data from Oracle CX with related records
   */
  private async fetchOpportunityFromOracleCX(opportunityId: string, userId: string): Promise<any | null> {
    try {
      // Get opportunity details
      const opty = await this.getOracleCXById<any>(userId, 'opportunities', opportunityId);
      if (!opty) return null;

      // Get related activities
      const activitiesResult = await this.queryOracleCX<any>(userId, 'activities', {
        limit: 10,
        filters: { OptyId: opportunityId },
        orderBy: 'LastUpdateDate:desc',
      });

      // Transform to common format
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
        account: opty.AccountId ? {
          id: opty.AccountId?.toString(),
          name: opty.AccountName,
        } : null,
        activities: (activitiesResult?.items || []).map((a: any) => ({
          id: a.ActivityId?.toString(),
          type: a.ActivityType,
          subject: a.ActivityName,
          activityDate: a.StartDate || a.EndDate,
          description: a.Description,
        })),
        tasks: [], // Would need separate query
        contactRoles: [], // Would need separate query
        notes: [], // Would need separate query
        _source: 'oracle_cx',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch opportunity ${opportunityId} from Oracle CX: ${error}`);
      return null;
    }
  }

  /**
   * Map urgency to priority
   */
  private mapUrgency(urgency: string): Priority {
    switch (urgency) {
      case 'URGENT': return Priority.URGENT;
      case 'HIGH': return Priority.HIGH;
      case 'MEDIUM': return Priority.MEDIUM;
      default: return Priority.LOW;
    }
  }
}












