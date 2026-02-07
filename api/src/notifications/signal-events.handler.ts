/**
 * Signal Events Handler
 *
 * Listens for agent events (signals.detected, etc.) and pushes
 * real-time notifications to users via WebSocket.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

interface SignalDetectedPayload {
  count: number;
  userId: string;
}

interface RecommendationReadyPayload {
  signalId: string;
  accountId: string;
  recommendation: {
    id: string;
    actionType: string;
    priority: string;
    confidence: number;
  };
  userId: string;
}

@Injectable()
export class SignalEventsHandler {
  private readonly logger = new Logger(SignalEventsHandler.name);

  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Handle signals.detected event from Listening Agent
   * Creates notifications for high-priority signals and pushes via WebSocket
   */
  @OnEvent('signals.detected')
  async handleSignalsDetected(payload: SignalDetectedPayload) {
    this.logger.log(`Handling signals.detected: ${payload.count} signals for user ${payload.userId}`);

    if (payload.count === 0) {
      return;
    }

    try {
      // Get the latest signals for this user
      const signals = await this.prisma.accountSignal.findMany({
        where: {
          createdById: payload.userId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        take: payload.count,
        include: {
          account: {
            select: { name: true },
          },
        },
      });

      if (signals.length === 0) {
        this.logger.debug('No pending signals found');
        return;
      }

      // Create notifications for high-priority signals
      const highPrioritySignals = signals.filter(
        (s) => s.priority === 'CRITICAL' || s.priority === 'HIGH'
      );

      for (const signal of highPrioritySignals) {
        try {
          // Create notification record using sendToUser
          const notification = await this.notificationsService.sendToUser(payload.userId, {
            title: `${signal.priority} Signal: ${signal.title}`,
            body: `${signal.account?.name || 'Unknown Account'}: ${signal.description?.substring(0, 150) || 'New signal detected'}...`,
            type: NotificationType.CUSTOM,
            priority: signal.priority === 'CRITICAL' ? NotificationPriority.URGENT : NotificationPriority.HIGH,
            action: 'VIEW_SIGNAL',
            actionData: {
              signalId: signal.id,
              accountId: signal.accountId,
              signalType: signal.type,
            },
          });

          // Push via WebSocket
          this.notificationsGateway.pushToUser(payload.userId, {
            id: notification.id,
            title: notification.title,
            body: notification.body,
            type: 'SIGNAL',
            priority: signal.priority,
            action: 'VIEW_SIGNAL',
            actionData: {
              signalId: signal.id,
              accountId: signal.accountId,
            },
            createdAt: new Date(),
          });

          this.logger.debug(`Pushed notification for signal ${signal.id}`);
        } catch (notifError) {
          this.logger.error(`Failed to create notification for signal ${signal.id}:`, notifError);
        }
      }

      // Emit a batch update event for the signals panel
      // This allows the frontend to refresh the signals list
      this.notificationsGateway.server.to(`user:${payload.userId}`).emit('signals_updated', {
        count: payload.count,
        highPriority: highPrioritySignals.length,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Pushed ${highPrioritySignals.length} notifications and signals_updated event to user ${payload.userId}`
      );
    } catch (error) {
      this.logger.error('Error handling signals.detected event:', error);
    }
  }

  /**
   * Handle recommendation.ready event from Reasoning Agent
   * Notifies user when AI recommendation is available for a signal
   */
  @OnEvent('signal.recommendation.ready')
  async handleRecommendationReady(payload: RecommendationReadyPayload) {
    this.logger.log(
      `Handling recommendation.ready: signal ${payload.signalId} for user ${payload.userId}`
    );

    try {
      // Emit specific event for recommendation availability
      this.notificationsGateway.server.to(`user:${payload.userId}`).emit('recommendation_ready', {
        signalId: payload.signalId,
        accountId: payload.accountId,
        actionType: payload.recommendation.actionType,
        priority: payload.recommendation.priority,
        confidence: payload.recommendation.confidence,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Pushed recommendation_ready event for signal ${payload.signalId}`);
    } catch (error) {
      this.logger.error('Error handling recommendation.ready event:', error);
    }
  }

  /**
   * Handle agent.execution.complete event
   * Notifies user when an agent has finished executing
   */
  @OnEvent('agent.execution.complete')
  async handleAgentExecutionComplete(payload: {
    agentType: string;
    userId: string;
    success: boolean;
    insightsCount?: number;
    actionsCount?: number;
  }) {
    this.logger.log(
      `Handling agent.execution.complete: ${payload.agentType} for user ${payload.userId}`
    );

    try {
      // Emit agent execution status
      this.notificationsGateway.server.to(`user:${payload.userId}`).emit('agent_execution_complete', {
        agentType: payload.agentType,
        success: payload.success,
        insightsCount: payload.insightsCount || 0,
        actionsCount: payload.actionsCount || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling agent.execution.complete event:', error);
    }
  }

  /**
   * Handle signal.action.executed event
   * Notifies user when a recommended action has been executed
   */
  @OnEvent('signal.action.executed')
  async handleSignalActionExecuted(payload: {
    signalId: string;
    actionType: string;
    userId: string;
    success: boolean;
    result?: any;
  }) {
    this.logger.log(
      `Handling signal.action.executed: ${payload.actionType} on signal ${payload.signalId}`
    );

    try {
      // Create a notification for the executed action
      const notification = await this.notificationsService.sendToUser(payload.userId, {
        title: payload.success ? 'Action Completed' : 'Action Failed',
        body: payload.success
          ? `Successfully executed ${payload.actionType.toLowerCase().replace('_', ' ')}`
          : `Failed to execute ${payload.actionType.toLowerCase().replace('_', ' ')}`,
        type: NotificationType.CUSTOM,
        priority: payload.success ? NotificationPriority.NORMAL : NotificationPriority.HIGH,
        action: 'VIEW_SIGNAL',
        actionData: {
          signalId: payload.signalId,
          actionType: payload.actionType,
          success: payload.success,
        },
      });

      // Push via WebSocket
      this.notificationsGateway.pushToUser(payload.userId, {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: 'ACTION_RESULT',
        priority: payload.success ? 'NORMAL' : 'HIGH',
        action: 'VIEW_SIGNAL',
        actionData: {
          signalId: payload.signalId,
          actionType: payload.actionType,
          success: payload.success,
        },
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error('Error handling signal.action.executed event:', error);
    }
  }
}
