/**
 * IRIS Digital Worker Agent - Listening Agent
 *
 * Monitors external data sources for account signals including:
 * - Executive changes
 * - Funding events
 * - Business expansion
 * - Technology changes
 * - News and announcements
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { ZoominfoService } from '../../integrations/zoominfo/zoominfo.service';
import { SnowflakeService } from '../../integrations/snowflake/snowflake.service';
import { BaseAgentService, DEFAULT_AGENT_LIMITS } from '../base/base-agent.service';
import { createCRMTools } from '../tools/crm-tools';
import {
  AgentType,
  AgentContext,
  AgentConfig,
  AgentTool,
  InsightType,
  Priority,
  CRMEntityType,
} from '../types';

/**
 * Signal detection result from LLM analysis
 */
interface DetectedSignal {
  type: 'EXEC_CHANGE' | 'FUNDING' | 'EXPANSION' | 'TECH_CHANGE' | 'NEWS' | 'COMPETITIVE_THREAT';
  title: string;
  description: string;
  confidence: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  recommendedAction: string;
}

interface SignalAnalysisResult {
  signals: DetectedSignal[];
  summary: string;
}

@Injectable()
export class ListeningAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.LISTENING;
  protected readonly logger = new Logger(ListeningAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.LISTENING,
    name: 'Listening Agent',
    description: 'Monitors external data sources for account signals',
    version: '1.0.0',

    // Run hourly to monitor for new signals
    schedule: {
      cron: '0 * * * *', // Every hour
      enabled: true,
    },

    eventTriggers: [],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 30,
      maxAlertsPerExecution: 20,
    },

    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
    @Optional() private readonly zoominfoService?: ZoominfoService,
    @Optional() private readonly snowflakeService?: SnowflakeService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Listening Agent - monitoring for account signals...');

    // Get strategic accounts to monitor
    const accounts = await this.getStrategicAccounts(context);
    this.logger.log(`Monitoring ${accounts.length} strategic accounts for signals`);

    let signalsDetected = 0;

    for (const account of accounts) {
      // Check execution time limit
      if (this.getElapsedTimeMs() > 50000) {
        this.logger.warn('Approaching time limit, stopping signal detection');
        break;
      }

      const signals = await this.detectSignalsForAccount(account, context);
      signalsDetected += signals.length;

      // Create signals in database
      for (const signal of signals) {
        await this.createAccountSignal(account, signal, context);
      }
    }

    // Generate summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Signal Detection Complete',
      description: `Monitored ${accounts.length} accounts, detected ${signalsDetected} new signals`,
    });

    // Emit event for reasoning agent to process new signals
    if (signalsDetected > 0) {
      this.eventEmitter.emit('signals.detected', {
        count: signalsDetected,
        userId: context.userId,
      });
    }
  }

  private async getStrategicAccounts(context: AgentContext): Promise<any[]> {
    // Get accounts with high value opportunities or strategic importance
    const accounts = await this.prisma.account.findMany({
      where: {
        ownerId: context.userId,
      },
      include: {
        opportunities: {
          where: {
            stage: {
              notIn: ['CLOSED_WON', 'CLOSED_LOST'],
            },
          },
        },
      },
      take: 20, // Limit to top 20 accounts per execution
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return accounts;
  }

  private async detectSignalsForAccount(account: any, context: AgentContext): Promise<DetectedSignal[]> {
    // Check cache to avoid re-analyzing recently checked accounts
    const cacheKey = `signals:${account.id}`;
    const lastCheck = await this.cacheService.get<number>(cacheKey);

    if (lastCheck && Date.now() - lastCheck < 3600000) { // 1 hour cache
      return [];
    }

    // First, get signals from external sources (ZoomInfo, Snowflake)
    const externalSignals = await this.detectExternalSignals(account, context);
    this.logger.log(`External sources detected ${externalSignals.length} signals for ${account.name}`);

    // Gather account context for LLM-based signal detection
    const accountContext = await this.gatherAccountContext(account);

    // Use LLM to detect additional signals from CRM context
    const prompt = `Analyze the following account information and detect any significant business signals that a sales team should be aware of.

ACCOUNT: ${account.name}
INDUSTRY: ${account.industry || 'Unknown'}
WEBSITE: ${account.website || 'Unknown'}
ANNUAL REVENUE: ${account.annualRevenue || 'Unknown'}
EMPLOYEES: ${account.numberOfEmployees || 'Unknown'}

RECENT CONTEXT:
${accountContext}

${externalSignals.length > 0 ? `ALREADY DETECTED SIGNALS (from external sources - do not duplicate these):
${externalSignals.map(s => `- ${s.type}: ${s.title}`).join('\n')}` : ''}

SIGNAL TYPES TO DETECT:
- EXEC_CHANGE: Leadership or executive team changes
- FUNDING: Funding rounds, investments, or financial events
- EXPANSION: Business expansion, new offices, hiring sprees
- TECH_CHANGE: Technology stack changes or digital transformation
- NEWS: Significant company news or announcements
- COMPETITIVE_THREAT: Competitor activity or market changes

Analyze and return any ADDITIONAL detected signals from the CRM context. If no clear signals are found beyond what's already detected, return an empty signals array.

Return JSON format:
{
  "signals": [
    {
      "type": "SIGNAL_TYPE",
      "title": "Brief signal title",
      "description": "Detailed description of the signal",
      "confidence": 0.8,
      "priority": "HIGH",
      "source": "CRM Analysis",
      "recommendedAction": "Suggested next step"
    }
  ],
  "summary": "Brief summary of findings"
}`;

    const systemPrompt = `You are an AI sales intelligence analyst specializing in detecting business signals from account data. Be conservative - only report signals with clear evidence. Focus on actionable insights. Do not duplicate signals that are already detected from external sources.`;

    try {
      const result = await this.callLLMForJSON<SignalAnalysisResult>(prompt, systemPrompt);
      const llmSignals = result.signals || [];

      // Combine external and LLM-detected signals
      const allSignals = [...externalSignals, ...llmSignals];

      // Cache the check timestamp
      await this.cacheService.set(cacheKey, Date.now(), 3600);

      this.logger.log(`Total signals detected for ${account.name}: ${allSignals.length} (${externalSignals.length} external, ${llmSignals.length} from LLM)`);
      return allSignals;
    } catch (error) {
      this.logger.warn(`Failed to analyze signals for account ${account.name}: ${error}`);
      // Return external signals even if LLM analysis fails
      return externalSignals;
    }
  }

  private async gatherAccountContext(account: any): Promise<string> {
    const context: string[] = [];

    // Get recent activities
    const activities = await this.prisma.activity.findMany({
      where: {
        OR: [
          { accountId: account.id },
          { opportunity: { accountId: account.id } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    if (activities.length > 0) {
      context.push('RECENT ACTIVITIES:');
      activities.forEach(a => {
        context.push(`- ${a.type}: ${a.subject} (${a.createdAt.toLocaleDateString()})`);
      });
    }

    // Get open opportunities
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        accountId: account.id,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      take: 3,
    });

    if (opportunities.length > 0) {
      context.push('\nOPEN OPPORTUNITIES:');
      opportunities.forEach(o => {
        context.push(`- ${o.name}: $${o.amount || 0} (${o.stage})`);
      });
    }

    // Get contacts
    const contacts = await this.prisma.contact.findMany({
      where: { accountId: account.id },
      take: 5,
    });

    if (contacts.length > 0) {
      context.push('\nKEY CONTACTS:');
      contacts.forEach(c => {
        context.push(`- ${c.firstName} ${c.lastName}: ${c.title || 'Unknown title'}`);
      });
    }

    return context.join('\n') || 'No recent context available';
  }

  /**
   * Detect signals from external sources (ZoomInfo, Snowflake)
   * Returns signals from external APIs if integrations are connected
   */
  private async detectExternalSignals(account: any, context: AgentContext): Promise<DetectedSignal[]> {
    const signals: DetectedSignal[] = [];

    // Check ZoomInfo for market intelligence signals
    if (this.zoominfoService && await this.zoominfoService.isConnected()) {
      try {
        // Use company name or domain as identifier for ZoomInfo
        const companyId = account.metadata?.zoominfoId || account.name;
        const externalSignals = await this.zoominfoService.detectSignals([companyId], 30);

        // Transform executive changes to signals
        for (const change of externalSignals.executiveChanges) {
          signals.push({
            type: 'EXEC_CHANGE',
            title: `${change.changeType}: ${change.executiveName}`,
            description: `${change.executiveName} - ${change.previousTitle || 'N/A'} to ${change.newTitle || 'new role'} at ${change.companyName}`,
            confidence: 0.9,
            priority: change.newTitle?.includes('CEO') || change.newTitle?.includes('CRO') ? 'HIGH' : 'MEDIUM',
            source: 'ZoomInfo',
            recommendedAction: 'Schedule introductory call with new executive',
          });
        }

        // Transform funding events to signals
        for (const event of externalSignals.fundingEvents) {
          signals.push({
            type: 'FUNDING',
            title: `${event.fundingType}: $${((event.amount || 0) / 1000000).toFixed(1)}M`,
            description: `${event.companyName} raised ${event.round || 'funding'} round from ${event.investors?.join(', ') || 'undisclosed investors'}`,
            confidence: 0.95,
            priority: (event.amount || 0) > 50000000 ? 'HIGH' : 'MEDIUM',
            source: 'ZoomInfo',
            recommendedAction: 'Reach out with expansion proposal',
          });
        }

        // Transform tech changes to signals
        for (const change of externalSignals.techChanges) {
          signals.push({
            type: 'TECH_CHANGE',
            title: `Tech Stack: ${change.changeType} ${change.technology}`,
            description: `${change.companyName} ${change.changeType} ${change.technology} (${change.category})`,
            confidence: 0.85,
            priority: 'MEDIUM',
            source: 'ZoomInfo',
            recommendedAction: 'Discuss integration opportunities',
          });
        }

        // Transform news to signals (limit to top 3)
        for (const news of externalSignals.news.slice(0, 3)) {
          signals.push({
            type: 'NEWS',
            title: news.title,
            description: news.summary || news.title,
            confidence: 0.8,
            priority: news.sentiment === 'positive' ? 'MEDIUM' : 'LOW',
            source: 'ZoomInfo',
            recommendedAction: 'Reference in next conversation',
          });
        }

        this.logger.log(`ZoomInfo detected ${signals.length} signals for ${account.name}`);
      } catch (error) {
        this.logger.warn(`ZoomInfo signal detection failed for ${account.name}: ${error}`);
      }
    }

    // Check Snowflake for usage signals
    if (this.snowflakeService && await this.snowflakeService.isConnected()) {
      try {
        const externalId = account.externalId || account.id;
        const usageChanges = await this.snowflakeService.detectUsageChanges([externalId]);

        for (const change of usageChanges) {
          const signalType = change.changeType === 'spike' ? 'EXPANSION' : 'COMPETITIVE_THREAT';
          signals.push({
            type: signalType as any,
            title: `${change.metric} ${change.changeType}: ${change.percentChange > 0 ? '+' : ''}${change.percentChange}%`,
            description: `${change.metric.replace('_', ' ')} changed from ${change.previousValue} to ${change.currentValue} (week-over-week)`,
            confidence: 0.9,
            priority: Math.abs(change.percentChange) > 50 ? 'HIGH' : 'MEDIUM',
            source: 'Snowflake',
            recommendedAction: change.changeType === 'spike'
              ? 'Discuss expansion opportunity'
              : 'Schedule health check call to understand concerns',
          });
        }

        this.logger.log(`Snowflake detected ${usageChanges.length} usage signals for ${account.name}`);
      } catch (error) {
        this.logger.warn(`Snowflake signal detection failed for ${account.name}: ${error}`);
      }
    }

    return signals;
  }

  private async createAccountSignal(account: any, signal: DetectedSignal, context: AgentContext): Promise<void> {
    try {
      await this.prisma.accountSignal.create({
        data: {
          accountId: account.id,
          createdById: context.userId!,
          type: signal.type as any, // Cast to SignalType enum
          title: signal.title,
          description: signal.description,
          confidence: signal.confidence,
          priority: signal.priority as any, // Cast to SignalPriority enum
          source: 'INTERNAL_CRM' as any, // Default to INTERNAL_CRM for agent-detected signals
          status: 'PENDING',
          recommendedAction: signal.recommendedAction,
          data: { detectedBy: 'LISTENING_AGENT', originalSource: signal.source, timestamp: new Date() },
        },
      });

      // Add insight for this signal
      this.addInsight({
        type: InsightType.BUYING_SIGNAL,
        priority: this.mapPriority(signal.priority),
        confidence: signal.confidence,
        title: `${account.name}: ${signal.title}`,
        description: signal.description,
        entityType: CRMEntityType.ACCOUNT,
        entityId: account.id,
      });

      this.logger.log(`Created signal for ${account.name}: ${signal.type}`);
    } catch (error) {
      this.logger.error(`Failed to create signal: ${error}`);
    }
  }

  private mapPriority(priority: string): Priority {
    const map: Record<string, Priority> = {
      CRITICAL: Priority.URGENT,
      HIGH: Priority.HIGH,
      MEDIUM: Priority.MEDIUM,
      LOW: Priority.LOW,
    };
    return map[priority] || Priority.MEDIUM;
  }
}
