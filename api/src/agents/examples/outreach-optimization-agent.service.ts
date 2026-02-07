/**
 * IRIS Agent Framework - Outreach Optimization Agent
 * 
 * This agent optimizes sales outreach:
 * - Identifies best times to contact leads/contacts
 * - Suggests personalized messaging
 * - Tracks response patterns
 * - Recommends follow-up strategies
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
 * Outreach Optimization Analysis from LLM
 */
interface OutreachAnalysis {
  engagementScore: number; // 0-100
  responsePattern: 'RESPONSIVE' | 'MODERATE' | 'LOW' | 'UNRESPONSIVE';
  bestContactTime: string;
  bestChannel: 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'MEETING';
  messagingRecommendations: {
    tone: string;
    topics: string[];
    avoidTopics: string[];
  };
  followUpStrategy: {
    nextAction: string;
    timing: string;
    channel: string;
  };
  personalizationTips: string[];
  reasoning: string;
}

@Injectable()
export class OutreachOptimizationAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.OUTREACH_OPTIMIZATION;
  protected readonly logger = new Logger(OutreachOptimizationAgentService.name);
  
  protected readonly config: AgentConfig = {
    type: AgentType.OUTREACH_OPTIMIZATION,
    name: 'Outreach Optimizer',
    description: 'Optimizes sales outreach timing, messaging, and follow-up strategies',
    version: '1.0.0',
    
    // Run every morning on weekdays to optimize outreach
    schedule: {
      cron: '0 7 * * 1-5', // 7 AM weekdays
      enabled: true, // ENABLED - provides daily outreach recommendations
    },
    
    // Trigger on engagement events
    eventTriggers: [
      { eventName: 'crm.email.opened' },
      { eventName: 'crm.email.replied' },
      { eventName: 'crm.lead.created' },
    ],
    
    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 20,
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
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Outreach Optimization analysis...');

    // If triggered for a specific lead
    if (context.entityType === CRMEntityType.LEAD && context.entityId) {
      await this.analyzeLeadOutreach(context.entityId, context);
      return;
    }

    // Get leads needing outreach
    const leads = await this.getLeadsNeedingOutreach(context);
    this.logger.log(`Analyzing outreach for ${leads.length} leads`);

    let analyzed = 0;
    for (const lead of leads) {
      if (this.getElapsedTimeMs() > 50000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      await this.analyzeLeadOutreach(lead.id, context);
      analyzed++;
    }

    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Outreach Optimization Complete',
      description: `Analyzed outreach strategy for ${analyzed} leads`,
    });
  }

  private async analyzeLeadOutreach(leadId: string, context: AgentContext): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        activities: { orderBy: { activityDate: 'desc' }, take: 15 },
        tasks: { orderBy: { dueDate: 'asc' }, take: 5 },
        emailThreads: {
          include: {
            emails: { orderBy: { sentAt: 'desc' }, take: 10 },
          },
          take: 5,
        },
        notes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!lead) {
      this.logger.warn(`Lead ${leadId} not found`);
      return;
    }

    // Skip converted or lost leads
    if (['CONVERTED', 'LOST', 'UNQUALIFIED'].includes(lead.status)) {
      return;
    }

    const cacheKey = `outreach:${leadId}`;
    const analysis = await this.getCached<OutreachAnalysis>(
      cacheKey,
      async () => this.performOutreachAnalysis(lead),
      1800, // 30 minute cache
    );

    await this.processOutreachAnalysis(lead, analysis, context);
  }

  private async performOutreachAnalysis(lead: any): Promise<OutreachAnalysis> {
    // Analyze email engagement
    const allEmails = lead.emailThreads?.flatMap((t: any) => t.emails) || [];
    const sentEmails = allEmails.filter((e: any) => e.direction === 'OUTBOUND');
    const receivedEmails = allEmails.filter((e: any) => e.direction === 'INBOUND');
    const responseRate = sentEmails.length > 0 
      ? (receivedEmails.length / sentEmails.length) * 100 
      : 0;

    // Analyze activity patterns
    const activityTypes = lead.activities?.reduce((acc: any, a: any) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate days since last contact
    const lastActivity = lead.activities?.[0];
    const daysSinceContact = lastActivity?.activityDate
      ? Math.floor((Date.now() - new Date(lastActivity.activityDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const prompt = `Analyze outreach optimization for this lead:

LEAD PROFILE:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Lead Score: ${lead.leadScore || 'Not scored'}
- Status: ${lead.status}
- Source: ${lead.source || 'Unknown'}
- Days Since Last Contact: ${daysSinceContact}

ENGAGEMENT HISTORY:
- Total Activities: ${lead.activities?.length || 0}
- Activity Types: ${JSON.stringify(activityTypes)}
- Emails Sent: ${sentEmails.length}
- Emails Received: ${receivedEmails.length}
- Response Rate: ${responseRate.toFixed(1)}%

RECENT ACTIVITIES:
${lead.activities?.slice(0, 5).map((a: any) => 
  `- ${a.type}: ${a.subject} (${a.activityDate ? new Date(a.activityDate).toLocaleDateString() : 'No date'})`
).join('\n') || 'No activities'}

RECENT EMAIL SUBJECTS:
${allEmails.slice(0, 5).map((e: any) => 
  `- [${e.direction}] ${e.subject}`
).join('\n') || 'No emails'}

NOTES:
${lead.notes?.slice(0, 2).map((n: any) => 
  `- ${n.content?.substring(0, 100)}...`
).join('\n') || 'No notes'}

Provide a JSON analysis:
{
  "engagementScore": <0-100>,
  "responsePattern": "RESPONSIVE|MODERATE|LOW|UNRESPONSIVE",
  "bestContactTime": "<specific time recommendation>",
  "bestChannel": "EMAIL|PHONE|LINKEDIN|MEETING",
  "messagingRecommendations": {
    "tone": "<recommended tone>",
    "topics": ["<topic 1>", "<topic 2>"],
    "avoidTopics": ["<avoid 1>"]
  },
  "followUpStrategy": {
    "nextAction": "<specific action>",
    "timing": "<when>",
    "channel": "<channel>"
  },
  "personalizationTips": ["<tip 1>", "<tip 2>"],
  "reasoning": "<brief explanation>"
}

Consider:
- Low response rate = try different channel/timing
- High engagement = move to meeting
- Industry context for messaging
- Title for appropriate tone`;

    const systemPrompt = `You are an AI sales engagement expert. Optimize outreach strategies for better response rates.
Return ONLY valid JSON. Be specific and actionable.`;

    return this.callLLMForJSON<OutreachAnalysis>(prompt, systemPrompt);
  }

  private async processOutreachAnalysis(
    lead: any,
    analysis: OutreachAnalysis,
    context: AgentContext,
  ): Promise<void> {
    // Add insight
    this.addInsight({
      type: analysis.engagementScore > 60 ? InsightType.BUYING_SIGNAL : InsightType.FOLLOW_UP_NEEDED,
      priority: analysis.responsePattern === 'UNRESPONSIVE' ? Priority.HIGH : Priority.MEDIUM,
      confidence: analysis.engagementScore / 100,
      title: `${lead.firstName} ${lead.lastName}: ${analysis.responsePattern} engagement`,
      description: analysis.reasoning,
      recommendation: analysis.followUpStrategy.nextAction,
      entityType: CRMEntityType.LEAD,
      entityId: lead.id,
      evidence: analysis.personalizationTips.map(tip => ({ source: 'Personalization', excerpt: tip })),
    });

    // Create alert for follow-up
    if (context.userId && analysis.responsePattern !== 'RESPONSIVE') {
      await this.createAlert({
        alertType: AlertType.FOLLOW_UP_OVERDUE,
        priority: analysis.responsePattern === 'UNRESPONSIVE' ? Priority.HIGH : Priority.MEDIUM,
        title: `📧 Optimize outreach to ${lead.firstName} ${lead.lastName}`,
        description: `Engagement: ${analysis.engagementScore}/100. Best channel: ${analysis.bestChannel}. ${analysis.reasoning}`,
        recommendation: `${analysis.followUpStrategy.nextAction} via ${analysis.followUpStrategy.channel} (${analysis.followUpStrategy.timing})`,
        userId: context.userId,
        entityType: CRMEntityType.LEAD,
        entityId: lead.id,
        suggestedActions: [
          {
            label: analysis.followUpStrategy.nextAction,
            actionType: analysis.bestChannel === 'EMAIL' ? ActionType.DRAFT_EMAIL : ActionType.CREATE_TASK,
            params: {
              leadId: lead.id,
              subject: analysis.messagingRecommendations.topics[0],
            },
          },
          ...analysis.personalizationTips.slice(0, 2).map(tip => ({
            label: tip,
            actionType: ActionType.CREATE_NOTE,
            params: { leadId: lead.id, content: tip },
          })),
        ],
        metadata: {
          engagementScore: analysis.engagementScore,
          bestContactTime: analysis.bestContactTime,
          bestChannel: analysis.bestChannel,
          messagingRecommendations: analysis.messagingRecommendations,
        },
      });
    }

    // Create follow-up insight
    if (analysis.responsePattern !== 'RESPONSIVE') {
      this.addInsight({
        type: InsightType.FOLLOW_UP_NEEDED,
        priority: analysis.responsePattern === 'UNRESPONSIVE' ? Priority.HIGH : Priority.MEDIUM,
        confidence: analysis.engagementScore / 100,
        title: `Follow up: ${analysis.followUpStrategy.nextAction}`,
        description: `Recommended follow-up for ${lead.firstName} ${lead.lastName} via ${analysis.followUpStrategy.channel}`,
        recommendation: `${analysis.followUpStrategy.nextAction} (${analysis.followUpStrategy.timing})`,
        entityType: CRMEntityType.LEAD,
        entityId: lead.id,
      });
    }
  }

  private calculateFollowUpDate(timing: string): string {
    const now = new Date();
    const lower = timing.toLowerCase();
    
    if (lower.includes('today') || lower.includes('immediate')) {
      return now.toISOString();
    } else if (lower.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
    } else if (lower.includes('week')) {
      now.setDate(now.getDate() + 7);
    } else if (lower.includes('2 day') || lower.includes('48')) {
      now.setDate(now.getDate() + 2);
    } else if (lower.includes('3 day')) {
      now.setDate(now.getDate() + 3);
    } else {
      now.setDate(now.getDate() + 2); // Default 2 days
    }
    
    return now.toISOString();
  }

  private async getLeadsNeedingOutreach(context: AgentContext): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
      status: { notIn: ['CONVERTED', 'LOST', 'UNQUALIFIED'] },
      OR: [
        { lastContactedAt: { lt: sevenDaysAgo } },
        { lastContactedAt: null },
      ],
    };

    if (context.userId) {
      where.ownerId = context.userId;
    }

    return this.prisma.lead.findMany({
      where,
      take: context.scope?.maxEntities || 25,
      orderBy: [
        { leadScore: 'desc' },
        { createdAt: 'asc' },
      ],
      select: { id: true },
    });
  }
}


