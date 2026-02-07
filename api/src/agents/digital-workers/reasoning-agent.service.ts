/**
 * IRIS Digital Worker Agent - Reasoning Agent
 *
 * Analyzes pending signals and generates AI-powered recommendations:
 * - Prioritizes signals based on impact and urgency
 * - Generates specific action recommendations
 * - Identifies patterns across multiple signals
 * - Triggers downstream action agents
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
} from '../types';

/**
 * Signal recommendation from LLM analysis
 */
interface SignalRecommendation {
  actionType: 'SCHEDULE_CALL' | 'SEND_EMAIL' | 'CREATE_TASK' | 'UPDATE_OPPORTUNITY' | 'ESCALATE' | 'MONITOR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description: string;
  talkingPoints: string[];
  urgency: string;
  confidence: number;
}

interface SignalAnalysis {
  recommendation: SignalRecommendation;
  reasoning: string;
  relatedSignals: string[];
}

@Injectable()
export class ReasoningAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.REASONING;
  protected readonly logger = new Logger(ReasoningAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.REASONING,
    name: 'Reasoning Agent',
    description: 'Analyzes signals and generates recommendations',
    version: '1.0.0',

    // Run every 5 minutes for near real-time analysis
    schedule: {
      cron: '*/5 * * * *',
      enabled: true,
    },

    // Also trigger when new signals are detected
    eventTriggers: [
      { eventName: 'signals.detected' },
      { eventName: 'signal.created' },
    ],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 50,
      maxAlertsPerExecution: 30,
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
    this.logger.log('Starting Reasoning Agent - analyzing pending signals...');

    // Get pending signals that need analysis
    const signals = await this.getPendingSignals(context);
    this.logger.log(`Found ${signals.length} pending signals to analyze`);

    let recommendationsGenerated = 0;

    for (const signal of signals) {
      // Check execution time limit
      if (this.getElapsedTimeMs() > 50000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      const analysis = await this.analyzeSignal(signal, context);

      if (analysis) {
        await this.processRecommendation(signal, analysis, context);
        recommendationsGenerated++;
      }
    }

    // Generate summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Signal Analysis Complete',
      description: `Analyzed ${signals.length} signals, generated ${recommendationsGenerated} recommendations`,
    });
  }

  private async getPendingSignals(context: AgentContext): Promise<any[]> {
    return this.prisma.accountSignal.findMany({
      where: {
        status: 'PENDING',
        account: {
          ownerId: context.userId,
        },
      },
      include: {
        account: {
          include: {
            opportunities: {
              where: {
                stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
              },
              take: 3,
            },
            contacts: {
              take: 5,
            },
          },
        },
      },
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
      take: 30,
    });
  }

  private async analyzeSignal(signal: any, context: AgentContext): Promise<SignalAnalysis | null> {
    const account = signal.account;

    // Build context for analysis
    const opportunityContext = account.opportunities?.map((o: any) =>
      `${o.name}: $${o.amount || 0} (${o.stage}, closes ${o.closeDate?.toLocaleDateString() || 'TBD'})`
    ).join('\n') || 'No open opportunities';

    const contactContext = account.contacts?.map((c: any) =>
      `${c.firstName} ${c.lastName} - ${c.title || 'Unknown'} (${c.email || 'no email'})`
    ).join('\n') || 'No contacts';

    const prompt = `Analyze this sales signal and provide a specific action recommendation.

SIGNAL DETAILS:
Type: ${signal.type}
Title: ${signal.title}
Description: ${signal.description}
Confidence: ${signal.confidence}
Priority: ${signal.priority}
Source: ${signal.source}

ACCOUNT CONTEXT:
Account: ${account.name}
Industry: ${account.industry || 'Unknown'}
Revenue: ${account.annualRevenue || 'Unknown'}

OPEN OPPORTUNITIES:
${opportunityContext}

KEY CONTACTS:
${contactContext}

Based on this signal and context, determine:
1. The best action type (SCHEDULE_CALL, SEND_EMAIL, CREATE_TASK, UPDATE_OPPORTUNITY, ESCALATE, or MONITOR)
2. Priority and urgency
3. Specific talking points or content for the action
4. Reasoning for your recommendation

Return JSON format:
{
  "recommendation": {
    "actionType": "SCHEDULE_CALL",
    "priority": "HIGH",
    "title": "Action title",
    "description": "What to do and why",
    "talkingPoints": ["Point 1", "Point 2"],
    "urgency": "Act within 24 hours",
    "confidence": 0.85
  },
  "reasoning": "Explanation of why this action is recommended",
  "relatedSignals": []
}`;

    const systemPrompt = `You are an AI sales strategy advisor. Analyze signals and provide actionable, specific recommendations. Focus on high-impact actions that can move deals forward. Be practical and consider the sales context.`;

    try {
      return await this.callLLMForJSON<SignalAnalysis>(prompt, systemPrompt);
    } catch (error) {
      this.logger.warn(`Failed to analyze signal ${signal.id}: ${error}`);
      return null;
    }
  }

  private async processRecommendation(signal: any, analysis: SignalAnalysis, context: AgentContext): Promise<void> {
    const { recommendation, reasoning } = analysis;

    // Update signal with recommendation
    await this.prisma.accountSignal.update({
      where: { id: signal.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: 'REASONING_AGENT',
        recommendedAction: JSON.stringify(recommendation),
      },
    });

    // Create alert for user
    await this.createAlert({
      alertType: this.mapActionTypeToAlertType(recommendation.actionType),
      priority: this.mapPriority(recommendation.priority),
      title: recommendation.title,
      description: recommendation.description,
      recommendation: reasoning,
      userId: context.userId!,
      entityType: CRMEntityType.ACCOUNT,
      entityId: signal.accountId,
      suggestedActions: [{
        label: this.getActionLabel(recommendation.actionType),
        actionType: this.mapToActionType(recommendation.actionType),
        params: {
          signalId: signal.id,
          accountId: signal.accountId,
          talkingPoints: recommendation.talkingPoints,
        },
      }],
      metadata: {
        signalId: signal.id,
        signalType: signal.type,
        confidence: recommendation.confidence,
        urgency: recommendation.urgency,
      },
    });

    // Add insight
    this.addInsight({
      type: InsightType.FOLLOW_UP_NEEDED,
      priority: this.mapPriority(recommendation.priority),
      confidence: recommendation.confidence,
      title: `${signal.account.name}: ${recommendation.title}`,
      description: reasoning,
      entityType: CRMEntityType.ACCOUNT,
      entityId: signal.accountId,
    });

    // Emit event for action agents if immediate action needed
    if (recommendation.priority === 'URGENT' || recommendation.priority === 'HIGH') {
      this.eventEmitter.emit('signal.recommendation.ready', {
        signalId: signal.id,
        accountId: signal.accountId,
        recommendation,
        userId: context.userId,
      });
    }

    this.logger.log(`Generated recommendation for signal ${signal.id}: ${recommendation.actionType}`);
  }

  private mapActionTypeToAlertType(actionType: string): AlertType {
    const map: Record<string, AlertType> = {
      SCHEDULE_CALL: AlertType.FOLLOW_UP_OVERDUE,
      SEND_EMAIL: AlertType.ATTENTION_NEEDED,
      CREATE_TASK: AlertType.ATTENTION_NEEDED,
      UPDATE_OPPORTUNITY: AlertType.OPPORTUNITY_DETECTED,
      ESCALATE: AlertType.URGENT_ACTION,
      MONITOR: AlertType.FYI,
    };
    return map[actionType] || AlertType.ATTENTION_NEEDED;
  }

  private mapPriority(priority: string): Priority {
    const map: Record<string, Priority> = {
      URGENT: Priority.URGENT,
      HIGH: Priority.HIGH,
      MEDIUM: Priority.MEDIUM,
      LOW: Priority.LOW,
    };
    return map[priority] || Priority.MEDIUM;
  }

  private mapToActionType(actionType: string): any {
    const map: Record<string, string> = {
      SCHEDULE_CALL: 'SCHEDULE_MEETING',
      SEND_EMAIL: 'SEND_EMAIL',
      CREATE_TASK: 'CREATE_TASK',
      UPDATE_OPPORTUNITY: 'UPDATE_OPPORTUNITY',
      ESCALATE: 'SEND_NOTIFICATION',
      MONITOR: 'CREATE_TASK',
    };
    return map[actionType] || 'CREATE_TASK';
  }

  private getActionLabel(actionType: string): string {
    const labels: Record<string, string> = {
      SCHEDULE_CALL: 'Schedule Call',
      SEND_EMAIL: 'Send Email',
      CREATE_TASK: 'Create Task',
      UPDATE_OPPORTUNITY: 'Update Deal',
      ESCALATE: 'Escalate',
      MONITOR: 'Set Reminder',
    };
    return labels[actionType] || 'Take Action';
  }
}
