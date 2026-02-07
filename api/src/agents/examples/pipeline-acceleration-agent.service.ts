/**
 * IRIS Agent Framework - Pipeline Acceleration Agent
 * 
 * This agent identifies opportunities to accelerate deals through the pipeline:
 * - Finds deals that can be fast-tracked
 * - Recommends next best actions
 * - Identifies deals with high momentum
 * - Suggests optimal engagement timing
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
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
  ActionType,
} from '../types';

/**
 * Pipeline Acceleration Analysis from LLM
 */
interface AccelerationAnalysis {
  canAccelerate: boolean;
  accelerationScore: number; // 0-100
  momentum: 'INCREASING' | 'STABLE' | 'DECLINING';
  nextBestActions: {
    action: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    timing: string;
  }[];
  blockers: string[];
  opportunities: string[];
  recommendedStageMove: string | null;
  reasoning: string;
}

@Injectable()
export class PipelineAccelerationAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.PIPELINE_ACCELERATION;
  protected readonly logger = new Logger(PipelineAccelerationAgentService.name);
  
  protected readonly config: AgentConfig = {
    type: AgentType.PIPELINE_ACCELERATION,
    name: 'Pipeline Accelerator',
    description: 'Identifies opportunities to accelerate deals and recommends next best actions',
    version: '1.0.0',
    
    // Run twice daily for pipeline acceleration
    schedule: {
      cron: '0 8,16 * * *', // 8 AM and 4 PM daily
      enabled: true, // ENABLED - identifies deals needing acceleration
    },
    
    // Trigger on significant events
    eventTriggers: [
      { eventName: 'crm.opportunity.stage_changed' },
      { eventName: 'crm.meeting.completed' },
      { eventName: 'crm.email.replied' },
    ],
    
    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 25,
      maxAlertsPerExecution: 15,
      maxActionsPerExecution: 10,
    },
    
    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Pipeline Acceleration analysis...');

    // If triggered for a specific opportunity
    if (context.entityType === CRMEntityType.OPPORTUNITY && context.entityId) {
      await this.analyzeOpportunityForAcceleration(context.entityId, context);
      return;
    }

    // Get opportunities with recent positive momentum
    const opportunities = await this.getAccelerationCandidates(context);
    this.logger.log(`Analyzing ${opportunities.length} acceleration candidates`);

    let analyzed = 0;
    for (const opp of opportunities) {
      if (this.getElapsedTimeMs() > 55000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      await this.analyzeOpportunityForAcceleration(opp.id, context);
      analyzed++;
    }

    // Summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Pipeline Acceleration Scan Complete',
      description: `Analyzed ${analyzed} opportunities for acceleration potential`,
    });
  }

  private async analyzeOpportunityForAcceleration(
    opportunityId: string,
    context: AgentContext,
  ): Promise<void> {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        account: { select: { id: true, name: true, industry: true } },
        owner: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { activityDate: 'desc' }, take: 15 },
        tasks: { orderBy: { dueDate: 'asc' }, take: 10 },
        contactRoles: { include: { contact: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!opportunity) {
      this.logger.warn(`Opportunity ${opportunityId} not found`);
      return;
    }

    // Skip closed deals
    if (['CLOSED_WON', 'CLOSED_LOST'].includes(opportunity.stage)) {
      return;
    }

    const cacheKey = `acceleration:${opportunityId}`;
    const analysis = await this.getCached<AccelerationAnalysis>(
      cacheKey,
      async () => this.performAccelerationAnalysis(opportunity),
      1800, // 30 minute cache
    );

    await this.processAccelerationAnalysis(opportunity, analysis, context);
  }

  private async performAccelerationAnalysis(opportunity: any): Promise<AccelerationAnalysis> {
    // Calculate activity momentum
    const recentActivities = opportunity.activities?.filter((a: any) => {
      const actDate = new Date(a.activityDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return actDate > weekAgo;
    }).length || 0;

    const olderActivities = opportunity.activities?.filter((a: any) => {
      const actDate = new Date(a.activityDate);
      const weekAgo = new Date();
      const twoWeeksAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      return actDate <= weekAgo && actDate > twoWeeksAgo;
    }).length || 0;

    const momentumTrend = recentActivities > olderActivities ? 'INCREASING' :
                         recentActivities === olderActivities ? 'STABLE' : 'DECLINING';

    const daysInStage = opportunity.stageChangedAt
      ? Math.floor((Date.now() - new Date(opportunity.stageChangedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const prompt = `Analyze this opportunity for acceleration potential:

OPPORTUNITY:
- Name: ${opportunity.name}
- Account: ${opportunity.account?.name || 'Unknown'} (${opportunity.account?.industry || 'Unknown industry'})
- Amount: $${opportunity.amount?.toLocaleString() || 'Not set'}
- Stage: ${opportunity.stage}
- Days in Current Stage: ${daysInStage}
- Close Date: ${opportunity.closeDate ? new Date(opportunity.closeDate).toLocaleDateString() : 'Not set'}
- Probability: ${opportunity.probability || opportunity.winProbability || 'Not set'}%

ENGAGEMENT METRICS:
- Activities This Week: ${recentActivities}
- Activities Last Week: ${olderActivities}
- Momentum Trend: ${momentumTrend}
- Total Contacts: ${opportunity.contactRoles?.length || 0}
- Open Tasks: ${opportunity.tasks?.filter((t: any) => t.status !== 'COMPLETED').length || 0}

RECENT ACTIVITIES:
${opportunity.activities?.slice(0, 7).map((a: any) => 
  `- ${a.type}: ${a.subject} (${a.activityDate ? new Date(a.activityDate).toLocaleDateString() : 'No date'})`
).join('\n') || 'No recent activities'}

KEY CONTACTS:
${opportunity.contactRoles?.map((cr: any) => 
  `- ${cr.contact?.firstName} ${cr.contact?.lastName}: ${cr.role || 'Unknown role'}`
).join('\n') || 'No contacts linked'}

Provide a JSON analysis:
{
  "canAccelerate": <boolean - true if deal can be accelerated>,
  "accelerationScore": <0-100 - likelihood of successful acceleration>,
  "momentum": "INCREASING|STABLE|DECLINING",
  "nextBestActions": [
    {"action": "<specific action>", "impact": "HIGH|MEDIUM|LOW", "timing": "<when to do it>"}
  ],
  "blockers": ["<blocker 1>", "<blocker 2>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "recommendedStageMove": "<next stage or null>",
  "reasoning": "<brief explanation>"
}

Consider:
- High momentum + engaged contacts = good acceleration candidate
- Missing decision maker = blocker
- Recent meetings + follow-up = opportunity
- Long time in stage without progress = needs intervention`;

    const systemPrompt = `You are an AI sales acceleration expert. Identify opportunities to move deals forward faster.
Return ONLY valid JSON. Focus on actionable, specific recommendations.`;

    return this.callLLMForJSON<AccelerationAnalysis>(prompt, systemPrompt);
  }

  private async processAccelerationAnalysis(
    opportunity: any,
    analysis: AccelerationAnalysis,
    context: AgentContext,
  ): Promise<void> {
    // Add insight
    this.addInsight({
      type: analysis.canAccelerate ? InsightType.BUYING_SIGNAL : InsightType.INFORMATION,
      priority: analysis.accelerationScore > 70 ? Priority.HIGH : Priority.MEDIUM,
      confidence: analysis.accelerationScore / 100,
      title: `${opportunity.name}: ${analysis.canAccelerate ? 'Acceleration Ready' : 'Needs Attention'}`,
      description: analysis.reasoning,
      recommendation: analysis.nextBestActions[0]?.action,
      entityType: CRMEntityType.OPPORTUNITY,
      entityId: opportunity.id,
      evidence: [
        ...analysis.opportunities.map(o => ({ source: 'Opportunity', excerpt: o })),
        ...analysis.blockers.map(b => ({ source: 'Blocker', excerpt: b })),
      ],
    });

    // Create alert for high-potential acceleration candidates
    if (analysis.canAccelerate && analysis.accelerationScore > 60 && context.userId) {
      await this.createAlert({
        alertType: AlertType.OPPORTUNITY_DETECTED,
        priority: analysis.accelerationScore > 80 ? Priority.HIGH : Priority.MEDIUM,
        title: `🚀 ${opportunity.name} ready to accelerate`,
        description: `Acceleration Score: ${analysis.accelerationScore}/100. Momentum: ${analysis.momentum}. ${analysis.reasoning}`,
        recommendation: analysis.nextBestActions.map(a => `${a.action} (${a.timing})`).join('; '),
        userId: context.userId,
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opportunity.id,
        suggestedActions: analysis.nextBestActions.slice(0, 3).map(nba => ({
          label: nba.action,
          actionType: ActionType.CREATE_TASK,
          params: { 
            subject: nba.action, 
            opportunityId: opportunity.id,
            priority: nba.impact === 'HIGH' ? 'HIGH' : 'NORMAL',
          },
        })),
        metadata: {
          accelerationScore: analysis.accelerationScore,
          momentum: analysis.momentum,
          blockers: analysis.blockers,
          recommendedStageMove: analysis.recommendedStageMove,
        },
      });
    }

    // Create task recommendations as insights (actions require approval workflow)
    if (analysis.canAccelerate && analysis.nextBestActions.length > 0) {
      const topAction = analysis.nextBestActions[0];
      if (topAction.impact === 'HIGH') {
        this.addInsight({
          type: InsightType.FOLLOW_UP_NEEDED,
          priority: Priority.HIGH,
          confidence: analysis.accelerationScore / 100,
          title: `Action Required: ${topAction.action}`,
          description: `High-impact action for ${opportunity.name}`,
          recommendation: topAction.action,
          entityType: CRMEntityType.OPPORTUNITY,
          entityId: opportunity.id,
        });
      }
    }
  }

  private calculateDueDate(timing: string): string {
    const now = new Date();
    const lower = timing.toLowerCase();
    
    if (lower.includes('today') || lower.includes('immediate')) {
      return now.toISOString();
    } else if (lower.includes('tomorrow') || lower.includes('24 hour')) {
      now.setDate(now.getDate() + 1);
    } else if (lower.includes('week') || lower.includes('7 day')) {
      now.setDate(now.getDate() + 7);
    } else if (lower.includes('2 day') || lower.includes('48 hour')) {
      now.setDate(now.getDate() + 2);
    } else {
      now.setDate(now.getDate() + 3); // Default 3 days
    }
    
    return now.toISOString();
  }

  private async getAccelerationCandidates(context: AgentContext): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = {
      stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      // Focus on deals with recent activity (showing momentum)
      lastActivityDate: { gte: thirtyDaysAgo },
    };

    if (context.userId) {
      where.ownerId = context.userId;
    }

    return this.prisma.opportunity.findMany({
      where,
      take: context.scope?.maxEntities || 30,
      orderBy: [
        { amount: 'desc' },
        { lastActivityDate: 'desc' },
      ],
      select: { id: true },
    });
  }
}


