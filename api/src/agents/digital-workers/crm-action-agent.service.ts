/**
 * IRIS Digital Worker Agent - CRM Action Agent
 *
 * Creates and updates CRM records based on signals:
 * - Creates follow-up tasks from recommendations
 * - Updates opportunity stages and details
 * - Logs activities for completed actions
 * - Processes signal recommendations automatically
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
  ActionType,
  Priority,
  CRMEntityType,
} from '../types';

/**
 * CRM action to execute
 */
interface CRMAction {
  type: 'CREATE_TASK' | 'UPDATE_OPPORTUNITY' | 'LOG_ACTIVITY' | 'CREATE_NOTE' | 'UPDATE_LEAD';
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  reason: string;
}

interface ActionPlan {
  actions: CRMAction[];
  summary: string;
}

@Injectable()
export class CrmActionAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.CRM_ACTION;
  protected readonly logger = new Logger(CrmActionAgentService.name);

  protected readonly config: AgentConfig = {
    type: AgentType.CRM_ACTION,
    name: 'CRM Action Agent',
    description: 'Creates/updates CRM records based on signals',
    version: '1.0.0',

    // Run every 5 minutes for real-time processing
    schedule: {
      cron: '*/5 * * * *',
      enabled: true,
    },

    // Also trigger on specific events
    eventTriggers: [
      { eventName: 'signal.recommendation.ready' },
      { eventName: 'meeting.analysis.completed' },
      { eventName: 'action.approved' },
    ],

    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 10,
      maxActionsPerExecution: 20,
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
    this.logger.log('Starting CRM Action Agent - processing pending actions...');

    // Process different sources of CRM actions
    let actionsExecuted = 0;

    // 1. Process approved signal recommendations
    const signalActions = await this.processSignalRecommendations(context);
    actionsExecuted += signalActions;

    // 2. Process meeting action items
    const meetingActions = await this.processMeetingActionItems(context);
    actionsExecuted += meetingActions;

    // 3. Process explicit action requests from context
    if (context.metadata?.actionRequest) {
      const explicitActions = await this.processExplicitAction(context);
      actionsExecuted += explicitActions;
    }

    // Generate summary insight
    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'CRM Actions Complete',
      description: `Executed ${actionsExecuted} CRM actions`,
    });
  }

  private async processSignalRecommendations(context: AgentContext): Promise<number> {
    if (!context.userId) {
      this.logger.warn('Skipping signal recommendations - no userId in context');
      return 0;
    }

    // Get signals with approved recommendations that haven't been actioned
    const signals = await this.prisma.accountSignal.findMany({
      where: {
        status: 'ACKNOWLEDGED',
        actionedAt: null,
        account: {
          ownerId: context.userId,
        },
        recommendedAction: { not: null },
      },
      include: {
        account: true,
      },
      take: 10,
    });

    let actionsExecuted = 0;

    for (const signal of signals) {
      if (this.getElapsedTimeMs() > 50000) break;

      try {
        const recommendation = typeof signal.recommendedAction === 'string'
          ? JSON.parse(signal.recommendedAction)
          : signal.recommendedAction;

        if (recommendation?.actionType) {
          await this.executeRecommendedAction(signal, recommendation, context);
          actionsExecuted++;

          // Mark signal as actioned
          await this.prisma.accountSignal.update({
            where: { id: signal.id },
            data: {
              status: 'ACTIONED',
              actionedAt: new Date(),
              actionedBy: 'CRM_ACTION_AGENT',
            },
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to process signal ${signal.id}: ${error}`);
      }
    }

    return actionsExecuted;
  }

  private async executeRecommendedAction(signal: any, recommendation: any, context: AgentContext): Promise<void> {
    const { actionType, talkingPoints } = recommendation;

    switch (actionType) {
      case 'CREATE_TASK':
      case 'SCHEDULE_CALL':
        await this.createFollowUpTask(signal, recommendation, context);
        break;

      case 'UPDATE_OPPORTUNITY':
        await this.updateRelatedOpportunity(signal, recommendation, context);
        break;

      case 'SEND_EMAIL':
        // Queue for email agent instead of direct execution
        this.eventEmitter.emit('email.action.requested', {
          signalId: signal.id,
          accountId: signal.accountId,
          talkingPoints,
          userId: context.userId,
        });
        break;

      case 'ESCALATE':
        await this.createEscalationTask(signal, recommendation, context);
        break;

      case 'MONITOR':
        await this.createMonitoringTask(signal, recommendation, context);
        break;
    }
  }

  private async createFollowUpTask(signal: any, recommendation: any, context: AgentContext): Promise<void> {
    const ownerId = context.userId || signal.account?.ownerId;
    if (!ownerId) {
      this.logger.warn(`Skipping follow-up task for signal ${signal.id} - no owner available`);
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (recommendation.priority === 'URGENT' ? 1 : 3));

    const task = await this.prisma.task.create({
      data: {
        subject: recommendation.title || `Follow up: ${signal.title}`,
        description: `${recommendation.description || ''}\n\nTalking Points:\n${(recommendation.talkingPoints || []).map((p: string) => `- ${p}`).join('\n')}\n\nGenerated from signal: ${signal.type}`,
        status: 'NOT_STARTED',
        priority: recommendation.priority === 'URGENT' ? 'HIGH' : 'NORMAL',
        dueDate,
        accountId: signal.accountId,
        ownerId,
      },
    });

    // Log activity
    await this.logActivity('TASK_CREATED', signal.accountId, context, {
      taskId: task.id,
      reason: `Created from ${signal.type} signal`,
    });

    this.addInsight({
      type: InsightType.FOLLOW_UP_NEEDED,
      priority: this.mapPriority(recommendation.priority),
      confidence: 0.9,
      title: `Task Created: ${task.subject}`,
      description: `Follow-up task created for ${signal.account.name}`,
      entityType: CRMEntityType.TASK,
      entityId: task.id,
    });
  }

  private async updateRelatedOpportunity(signal: any, recommendation: any, context: AgentContext): Promise<void> {
    // Find open opportunities for this account
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        accountId: signal.accountId,
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
      },
      orderBy: { amount: 'desc' },
      take: 1,
    });

    if (opportunities.length === 0) return;

    const opp = opportunities[0];
    const updateData: any = {};

    // Determine updates based on signal type
    if (signal.type === 'FUNDING' || signal.type === 'EXPANSION') {
      // Positive signals might increase deal value or probability
      if (opp.probability && opp.probability < 80) {
        updateData.probability = Math.min(opp.probability + 10, 90);
      }
    } else if (signal.type === 'EXEC_CHANGE') {
      // Executive changes might affect timeline
      updateData.nextStep = `Re-engage with new stakeholders - ${signal.title}`;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.opportunity.update({
        where: { id: opp.id },
        data: updateData,
      });

      await this.logActivity('OPPORTUNITY_UPDATED', signal.accountId, context, {
        opportunityId: opp.id,
        updates: updateData,
        reason: `Updated due to ${signal.type} signal`,
      });

      this.addInsight({
        type: InsightType.INFORMATION,
        priority: Priority.MEDIUM,
        confidence: 0.8,
        title: `Opportunity Updated: ${opp.name}`,
        description: `Updated based on ${signal.type} signal`,
        entityType: CRMEntityType.OPPORTUNITY,
        entityId: opp.id,
      });
    }
  }

  private async createEscalationTask(signal: any, recommendation: any, context: AgentContext): Promise<void> {
    const ownerId = context.userId || signal.account?.ownerId;
    if (!ownerId) {
      this.logger.warn(`Skipping escalation task for signal ${signal.id} - no owner available`);
      return;
    }

    const task = await this.prisma.task.create({
      data: {
        subject: `ESCALATION: ${recommendation.title || signal.title}`,
        description: `Escalation required for ${signal.account.name}\n\nSignal: ${signal.type}\n${signal.description}\n\nRecommended Action: ${recommendation.description}`,
        status: 'NOT_STARTED',
        priority: 'HIGH',
        dueDate: new Date(), // Due today
        accountId: signal.accountId,
        ownerId,
      },
    });

    this.addInsight({
      type: InsightType.RISK_DETECTED,
      priority: Priority.URGENT,
      confidence: 0.95,
      title: `Escalation Created: ${signal.account.name}`,
      description: recommendation.description,
      entityType: CRMEntityType.TASK,
      entityId: task.id,
    });
  }

  private async createMonitoringTask(signal: any, recommendation: any, context: AgentContext): Promise<void> {
    const ownerId = context.userId || signal.account?.ownerId;
    if (!ownerId) {
      this.logger.warn(`Skipping monitoring task for signal ${signal.id} - no owner available`);
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Review in a week

    await this.prisma.task.create({
      data: {
        subject: `Monitor: ${signal.title}`,
        description: `Continue monitoring ${signal.account.name} for ${signal.type}\n\nOriginal signal: ${signal.description}`,
        status: 'NOT_STARTED',
        priority: 'NORMAL',
        dueDate,
        accountId: signal.accountId,
        ownerId,
      },
    });
  }

  private async processMeetingActionItems(context: AgentContext): Promise<number> {
    // Get recent meeting analyses with pending action items
    const meetings = await this.prisma.meetingSession.findMany({
      where: {
        status: 'COMPLETED',
        ownerId: context.userId,
        analysis: { isNot: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        analysis: true,
      },
      take: 5,
    });

    let actionsCreated = 0;

    for (const meeting of meetings) {
      if (this.getElapsedTimeMs() > 50000) break;

      try {
        const analysis = meeting.analysis as any;

        if (analysis?.actionItems) {
          for (const item of analysis.actionItems) {
            // Check if task already exists
            const existing = await this.prisma.task.findFirst({
              where: {
                subject: { contains: item.title || item.description?.substring(0, 50) },
                ownerId: context.userId,
                createdAt: { gte: meeting.createdAt },
              },
            });

            if (!existing) {
              const taskOwnerId = context.userId || meeting.ownerId;
              if (!taskOwnerId) continue;

              await this.prisma.task.create({
                data: {
                  subject: item.title || item.description?.substring(0, 100),
                  description: `From meeting: ${meeting.title}\n\n${item.description || item.title}`,
                  status: 'NOT_STARTED',
                  priority: item.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
                  dueDate: item.dueDate ? new Date(item.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                  accountId: meeting.accountId || undefined,
                  opportunityId: meeting.opportunityId || undefined,
                  ownerId: taskOwnerId,
                },
              });
              actionsCreated++;
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to process meeting ${meeting.id}: ${error}`);
      }
    }

    return actionsCreated;
  }

  private async processExplicitAction(context: AgentContext): Promise<number> {
    const actionRequest = context.metadata?.actionRequest as CRMAction;

    if (!actionRequest) return 0;

    try {
      switch (actionRequest.type) {
        case 'CREATE_TASK':
          if (!context.userId) {
            this.logger.warn('Skipping explicit CREATE_TASK - no userId in context');
            return 0;
          }
          await this.prisma.task.create({
            data: {
              subject: actionRequest.data.subject as string || 'New Task',
              description: actionRequest.data.description as string,
              status: (actionRequest.data.status as any) || 'NOT_STARTED',
              priority: (actionRequest.data.priority as any) || 'NORMAL',
              dueDate: actionRequest.data.dueDate ? new Date(actionRequest.data.dueDate as string) : undefined,
              accountId: actionRequest.data.accountId as string,
              opportunityId: actionRequest.data.opportunityId as string,
              ownerId: context.userId,
            },
          });
          break;

        case 'UPDATE_OPPORTUNITY':
          await this.prisma.opportunity.update({
            where: { id: actionRequest.entityId },
            data: actionRequest.data,
          });
          break;

        case 'LOG_ACTIVITY':
          if (!context.userId) {
            this.logger.warn('Skipping explicit LOG_ACTIVITY - no userId in context');
            return 0;
          }
          await this.prisma.activity.create({
            data: {
              type: (actionRequest.data.type as any) || 'OTHER',
              subject: actionRequest.data.subject as string || 'Activity',
              description: actionRequest.data.description as string,
              accountId: actionRequest.data.accountId as string,
              opportunityId: actionRequest.data.opportunityId as string,
              userId: context.userId,
            },
          });
          break;

        case 'CREATE_NOTE':
          await this.prisma.note.create({
            data: {
              body: actionRequest.data.body as string || '',
              title: actionRequest.data.title as string,
              accountId: actionRequest.data.accountId as string,
              opportunityId: actionRequest.data.opportunityId as string,
              userId: context.userId!,
            },
          });
          break;

        case 'UPDATE_LEAD':
          await this.prisma.lead.update({
            where: { id: actionRequest.entityId },
            data: actionRequest.data,
          });
          break;
      }

      this.addInsight({
        type: InsightType.INFORMATION,
        priority: Priority.LOW,
        confidence: 1,
        title: `CRM Action Executed: ${actionRequest.type}`,
        description: actionRequest.reason,
      });

      return 1;
    } catch (error) {
      this.logger.error(`Failed to execute explicit action: ${error}`);
      return 0;
    }
  }

  private async logActivity(type: string, accountId: string, context: AgentContext, metadata: any): Promise<void> {
    await this.prisma.activity.create({
      data: {
        type: 'OTHER' as any, // Using OTHER for agent-generated activities
        subject: `CRM Action Agent: ${type}`,
        description: JSON.stringify(metadata),
        accountId,
        userId: context.userId!,
      },
    });
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
}
