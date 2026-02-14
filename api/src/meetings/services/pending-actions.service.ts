import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ActivitiesService } from '../../activities/activities.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { MeetingAnalysisResultDto, ActionItemDto } from '../dto';
import { ActivityType, PendingActionStatus, PendingActionType, DataSourceType, Priority } from '@prisma/client';

/**
 * Detected entity from meeting analysis
 */
interface DetectedEntity {
  type: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
  name: string;
  company?: string;
  id?: string;
  confidence: number;
}

/**
 * Service for managing pending meeting actions (human-in-the-loop approval).
 *
 * Instead of auto-executing CRM changes from meeting analysis,
 * this service creates proposals that require user approval before execution.
 */
@Injectable()
export class PendingActionsService {
  private readonly logger = new Logger(PendingActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly activitiesService: ActivitiesService,
    private readonly salesforceService: SalesforceService,
  ) {}

  /**
   * Check if human-in-the-loop mode is enabled
   */
  isApprovalModeEnabled(): boolean {
    return this.configService.get('app.meetingIntelligence.requireApproval', true);
  }

  /**
   * Generate pending actions from meeting analysis.
   * These actions will be displayed to the user for approval before execution.
   */
  async generatePendingActions(
    meeting: any,
    analysis: MeetingAnalysisResultDto,
    preferredDataSource: DataSourceType = DataSourceType.LOCAL,
  ): Promise<void> {
    this.logger.log(`Generating pending actions for meeting ${meeting.id} (dataSource: ${preferredDataSource})`);

    // === ENTITY DETECTION: Extract and match entities from analysis ===
    const detectedEntities = this.extractEntityMentions(analysis);
    let matchedEntities: DetectedEntity[] = [];
    let primaryLinkedEntity: DetectedEntity | null = null;

    // Search Salesforce for matching entities if connected
    if (detectedEntities.length > 0) {
      const hasSalesforceConnection = await this.checkSalesforceConnection(meeting.ownerId);
      if (hasSalesforceConnection) {
        this.logger.log(`Searching Salesforce for ${detectedEntities.length} detected entities`);
        matchedEntities = await this.findMatchingEntities(meeting.ownerId, detectedEntities);
        primaryLinkedEntity = this.getBestMatchedEntity(matchedEntities);

        if (primaryLinkedEntity?.id) {
          this.logger.log(`Primary linked entity: ${primaryLinkedEntity.type} "${primaryLinkedEntity.name}" (${primaryLinkedEntity.id})`);
        }
      } else {
        // If no Salesforce, still track detected entities for display
        matchedEntities = detectedEntities;
        primaryLinkedEntity = this.getBestMatchedEntity(matchedEntities);
      }
    }

    const pendingActions: Array<{
      actionType: PendingActionType;
      title: string;
      description: string;
      targetEntity: string;
      targetEntityId?: string;
      proposedData: any;
      priority: Priority;
      confidence?: number;
      salesforceObjectType?: string;
      linkedEntity?: DetectedEntity | null;
    }> = [];

    // 1. Generate task creation proposals from action items
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      for (const item of analysis.actionItems) {
        // Handle both DTO format (text) and service format (task)
        const taskText = (item as any).text || (item as any).task || 'Unknown task';
        // Parse due date - handle cases where it's "Not mentioned" or invalid
        const rawDueDate = item.dueDate;
        const isValidDate = rawDueDate &&
          rawDueDate !== 'Not mentioned' &&
          !isNaN(new Date(rawDueDate).getTime());
        const dueDate = isValidDate
          ? new Date(rawDueDate)
          : this.calculateDueDate(item.priority);

        // Determine linked entity for this task - use detected entity or fall back to meeting's linked records
        const linkedLead = matchedEntities.find(e => e.type === 'Lead' && e.id);
        const linkedAccount = matchedEntities.find(e => e.type === 'Account' && e.id);
        const linkedOpp = matchedEntities.find(e => e.type === 'Opportunity' && e.id);

        pendingActions.push({
          actionType: PendingActionType.CREATE_TASK,
          title: `Create Task: ${this.truncate(taskText, 50)}`,
          description: `From meeting "${meeting.title}"\n\nTask: ${taskText}\nAssignee mentioned: ${item.assignee || 'Not specified'}\nPriority: ${item.priority || 'Normal'}${primaryLinkedEntity ? `\n\nDetected Entity: ${primaryLinkedEntity.type} - ${primaryLinkedEntity.name}${primaryLinkedEntity.company ? ` (${primaryLinkedEntity.company})` : ''}` : ''}`,
          targetEntity: 'Task',
          targetEntityId: primaryLinkedEntity?.id,
          proposedData: {
            subject: taskText,
            description: `Auto-generated from meeting: ${meeting.title}\n\nAssignee mentioned: ${item.assignee || 'Not specified'}`,
            priority: this.mapPriority(item.priority),
            dueDate: dueDate.toISOString(),
            status: 'NOT_STARTED',
            // Use detected Salesforce IDs or fall back to meeting's linked records
            opportunityId: linkedOpp?.id || meeting.opportunityId,
            accountId: linkedAccount?.id || meeting.accountId,
            leadId: linkedLead?.id || meeting.leadId,
            // Include detected entity info for reference
            detectedEntity: primaryLinkedEntity,
          },
          priority: this.mapPriority(item.priority),
          confidence: primaryLinkedEntity?.id ? 0.95 : 0.85,
          salesforceObjectType: preferredDataSource === DataSourceType.SALESFORCE ? 'Task' : undefined,
          linkedEntity: primaryLinkedEntity,
        });
      }
    }

    // 2. Generate activity record proposal
    // Handle both DTO format (executiveSummary) and service format (summary)
    const summaryText = analysis.executiveSummary || (analysis as any).summary;
    const detailedText = analysis.detailedSummary || (analysis as any).keyPoints?.join('\n');

    if (summaryText || detailedText) {
      // Use detected entity IDs for activity linking
      const linkedLead = matchedEntities.find(e => e.type === 'Lead' && e.id);
      const linkedAccount = matchedEntities.find(e => e.type === 'Account' && e.id);
      const linkedOpp = matchedEntities.find(e => e.type === 'Opportunity' && e.id);

      pendingActions.push({
        actionType: PendingActionType.CREATE_ACTIVITY,
        title: `Log Meeting Activity: ${this.truncate(meeting.title || 'Meeting', 40)}`,
        description: `Create an activity record for the meeting with AI-generated summary and notes.${primaryLinkedEntity ? `\n\nLinked to: ${primaryLinkedEntity.type} - ${primaryLinkedEntity.name}${primaryLinkedEntity.company ? ` (${primaryLinkedEntity.company})` : ''}` : ''}`,
        targetEntity: 'Activity',
        targetEntityId: primaryLinkedEntity?.id,
        proposedData: {
          type: 'MEETING',
          subject: meeting.title,
          description: summaryText,
          outcome: detailedText,
          activityDate: meeting.actualStart || meeting.scheduledStart,
          duration: meeting.duration,
          // Use detected Salesforce IDs or fall back to meeting's linked records
          opportunityId: linkedOpp?.id || meeting.opportunityId,
          accountId: linkedAccount?.id || meeting.accountId,
          leadId: linkedLead?.id || meeting.leadId,
          // Include detected entities for reference
          detectedEntities: matchedEntities,
        },
        priority: Priority.MEDIUM,
        confidence: primaryLinkedEntity?.id ? 0.98 : 0.95,
        salesforceObjectType: preferredDataSource === DataSourceType.SALESFORCE ? 'Event' : undefined,
        linkedEntity: primaryLinkedEntity,
      });
    }

    // 3. Generate opportunity update proposal
    if (meeting.opportunityId) {
      const oppUpdates: any = {};
      const updateReasons: string[] = [];

      if (analysis.nextSteps && analysis.nextSteps.length > 0) {
        oppUpdates.nextStep = analysis.nextSteps[0];
        updateReasons.push(`Next step: "${analysis.nextSteps[0]}"`);
      }

      if (analysis.stageRecommendation) {
        oppUpdates.stage = analysis.stageRecommendation;
        updateReasons.push(`Stage change recommended: ${analysis.stageRecommendation}`);
      }

      if (analysis.probabilityChange) {
        oppUpdates.probabilityAdjustment = analysis.probabilityChange;
        updateReasons.push(`Probability adjustment: ${analysis.probabilityChange > 0 ? '+' : ''}${analysis.probabilityChange}%`);
      }

      if (analysis.concerns && analysis.concerns.length > 0) {
        oppUpdates.riskFactors = analysis.concerns;
        updateReasons.push(`${analysis.concerns.length} risk factors identified`);
      }

      if (Object.keys(oppUpdates).length > 0) {
        pendingActions.push({
          actionType: PendingActionType.UPDATE_OPPORTUNITY,
          title: `Update Opportunity from Meeting Insights`,
          description: `Suggested updates based on meeting analysis:\n\n${updateReasons.map(r => `• ${r}`).join('\n')}`,
          targetEntity: 'Opportunity',
          targetEntityId: meeting.opportunityId,
          proposedData: oppUpdates,
          priority: analysis.stageRecommendation ? Priority.HIGH : Priority.MEDIUM,
          confidence: 0.75,
          salesforceObjectType: preferredDataSource === DataSourceType.SALESFORCE ? 'Opportunity' : undefined,
        });
      }
    }

    // 4. Generate lead update proposal
    if (meeting.leadId && analysis.buyingSignals && analysis.buyingSignals.length > 0) {
      const avgConfidence = analysis.buyingSignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / analysis.buyingSignals.length;
      const buyingIntent = avgConfidence > 0.7 ? 'HIGH' : avgConfidence > 0.4 ? 'MEDIUM' : 'LOW';

      const leadUpdates: any = { buyingIntent };
      const updateReasons: string[] = [`Buying intent: ${buyingIntent} (${Math.round(avgConfidence * 100)}% confidence)`];

      if (analysis.concerns && analysis.concerns.length > 0) {
        leadUpdates.painPoints = analysis.concerns.slice(0, 5);
        updateReasons.push(`${analysis.concerns.length} pain points/concerns identified`);
      }

      if (analysis.budgetMentioned) {
        leadUpdates.budget = analysis.budgetMentioned;
        updateReasons.push(`Budget mentioned: $${analysis.budgetMentioned.toLocaleString()}`);
      }

      if (analysis.timelineMentioned) {
        leadUpdates.timeline = analysis.timelineMentioned;
        updateReasons.push(`Timeline: ${analysis.timelineMentioned}`);
      }

      pendingActions.push({
        actionType: PendingActionType.UPDATE_LEAD,
        title: `Update Lead from Meeting Insights`,
        description: `Suggested updates based on meeting analysis:\n\n${updateReasons.map(r => `• ${r}`).join('\n')}`,
        targetEntity: 'Lead',
        targetEntityId: meeting.leadId,
        proposedData: leadUpdates,
        priority: buyingIntent === 'HIGH' ? Priority.HIGH : Priority.MEDIUM,
        confidence: avgConfidence,
        salesforceObjectType: preferredDataSource === DataSourceType.SALESFORCE ? 'Lead' : undefined,
      });
    }

    // 5. Salesforce sync proposal (if local mode but SF connected)
    if (preferredDataSource === DataSourceType.LOCAL) {
      const hasConnection = await this.checkSalesforceConnection(meeting.ownerId);
      if (hasConnection && pendingActions.length > 0) {
        pendingActions.push({
          actionType: PendingActionType.SYNC_TO_SALESFORCE,
          title: `Sync to Salesforce`,
          description: `After applying the above changes locally, sync the updated records to Salesforce CRM.`,
          targetEntity: 'SalesforceSync',
          proposedData: {
            syncTypes: ['Task', 'Activity', 'Opportunity', 'Lead'].filter(t =>
              pendingActions.some(a => a.targetEntity === t)
            ),
          },
          priority: Priority.LOW,
          confidence: 1.0,
        });
      }
    }

    // Store all pending actions
    if (pendingActions.length > 0) {
      await this.prisma.pendingMeetingAction.createMany({
        data: pendingActions.map(action => ({
          meetingSessionId: meeting.id,
          userId: meeting.ownerId,
          actionType: action.actionType,
          title: action.title,
          description: action.description,
          targetEntity: action.targetEntity,
          targetEntityId: action.targetEntityId,
          proposedData: action.proposedData,
          originalAnalysis: analysis as any,
          dataSource: preferredDataSource,
          salesforceObjectType: action.salesforceObjectType,
          priority: action.priority,
          confidence: action.confidence,
          status: PendingActionStatus.PENDING,
        })),
      });

      this.logger.log(`Created ${pendingActions.length} pending actions for meeting ${meeting.id}`);
    }
  }

  /**
   * Get all pending actions for a meeting
   */
  async getPendingActionsForMeeting(meetingSessionId: string): Promise<any[]> {
    return this.prisma.pendingMeetingAction.findMany({
      where: { meetingSessionId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get all pending actions for a user
   */
  async getPendingActionsForUser(userId: string, status?: PendingActionStatus): Promise<any[]> {
    return this.prisma.pendingMeetingAction.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        meetingSession: {
          select: {
            id: true,
            title: true,
            scheduledStart: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Approve and execute a single pending action
   */
  async approveAction(actionId: string, userId: string): Promise<any> {
    const action = await this.prisma.pendingMeetingAction.findUnique({
      where: { id: actionId },
      include: { meetingSession: true },
    });

    if (!action) {
      throw new NotFoundException(`Pending action ${actionId} not found`);
    }

    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException(`Action is not pending (current status: ${action.status})`);
    }

    // Mark as executing
    await this.prisma.pendingMeetingAction.update({
      where: { id: actionId },
      data: {
        status: PendingActionStatus.EXECUTING,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });

    try {
      const resultEntityId = await this.executeAction(action);

      // Mark as completed
      await this.prisma.pendingMeetingAction.update({
        where: { id: actionId },
        data: {
          status: PendingActionStatus.COMPLETED,
          executedAt: new Date(),
          resultEntityId,
        },
      });

      this.logger.log(`Successfully executed pending action ${actionId}: ${action.actionType}`);
      return { success: true, resultEntityId };
    } catch (error) {
      // Mark as failed
      await this.prisma.pendingMeetingAction.update({
        where: { id: actionId },
        data: {
          status: PendingActionStatus.FAILED,
          executionError: error.message,
        },
      });

      this.logger.error(`Failed to execute pending action ${actionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve and execute multiple pending actions
   */
  async approveMultipleActions(actionIds: string[], userId: string): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const actionId of actionIds) {
      try {
        await this.approveAction(actionId, userId);
        results.success.push(actionId);
      } catch (error) {
        this.logger.error(`Failed to approve action ${actionId}: ${error.message}`);
        results.failed.push(actionId);
      }
    }

    return results;
  }

  /**
   * Approve all pending actions for a meeting
   */
  async approveAllForMeeting(meetingSessionId: string, userId: string): Promise<{ success: string[]; failed: string[] }> {
    const pendingActions = await this.prisma.pendingMeetingAction.findMany({
      where: {
        meetingSessionId,
        status: PendingActionStatus.PENDING,
      },
    });

    return this.approveMultipleActions(pendingActions.map(a => a.id), userId);
  }

  /**
   * Reject a pending action
   */
  async rejectAction(actionId: string, userId: string, reason?: string): Promise<void> {
    const action = await this.prisma.pendingMeetingAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Pending action ${actionId} not found`);
    }

    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException(`Action is not pending (current status: ${action.status})`);
    }

    await this.prisma.pendingMeetingAction.update({
      where: { id: actionId },
      data: {
        status: PendingActionStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: userId,
        rejectionReason: reason,
      },
    });

    this.logger.log(`Rejected pending action ${actionId}: ${reason || 'No reason provided'}`);
  }

  /**
   * Edit a pending action's proposed data before approval
   */
  async editAction(actionId: string, userId: string, updatedData: any): Promise<any> {
    const action = await this.prisma.pendingMeetingAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Pending action ${actionId} not found`);
    }

    if (action.status !== PendingActionStatus.PENDING) {
      throw new BadRequestException(`Action is not pending (current status: ${action.status})`);
    }

    // Merge the updated data with existing proposed data
    const mergedData = {
      ...(action.proposedData as any),
      ...updatedData,
    };

    return this.prisma.pendingMeetingAction.update({
      where: { id: actionId },
      data: {
        proposedData: mergedData,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Execute a single action based on its type
   */
  private async executeAction(action: any): Promise<string | undefined> {
    const proposedData = action.proposedData as any;

    switch (action.actionType) {
      case PendingActionType.CREATE_TASK:
        return this.executeCreateTask(action, proposedData);

      case PendingActionType.CREATE_ACTIVITY:
        return this.executeCreateActivity(action, proposedData);

      case PendingActionType.UPDATE_OPPORTUNITY:
        return this.executeUpdateOpportunity(action, proposedData);

      case PendingActionType.UPDATE_LEAD:
        return this.executeUpdateLead(action, proposedData);

      case PendingActionType.SYNC_TO_SALESFORCE:
        await this.executeSyncToSalesforce(action, proposedData);
        return undefined;

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }

  /**
   * Execute task creation
   */
  private async executeCreateTask(action: any, data: any): Promise<string> {
    if (action.dataSource === DataSourceType.SALESFORCE && action.salesforceObjectType) {
      // Create in Salesforce
      const result = await this.salesforceService.create(action.userId, 'Task', {
        Subject: data.subject,
        Description: data.description,
        Priority: data.priority,
        ActivityDate: data.dueDate,
        Status: 'Not Started',
        WhatId: data.opportunityId, // Link to opportunity if exists
      });
      return result.id;
    } else {
      // Get organizationId for user
      const organizationId = await this.getOrganizationIdForUser(action.userId);

      // Create locally
      const task = await this.prisma.task.create({
        data: {
          subject: data.subject,
          description: data.description,
          priority: data.priority,
          dueDate: new Date(data.dueDate),
          status: 'NOT_STARTED',
          ownerId: action.userId,
          organizationId: organizationId || undefined,
          opportunityId: data.opportunityId || undefined,
          accountId: data.accountId || undefined,
          leadId: data.leadId || undefined,
          meetingSessionId: action.meetingSessionId,
          metadata: {
            source: 'meeting_intelligence',
            pendingActionId: action.id,
          },
        },
      });
      return task.id;
    }
  }

  /**
   * Execute activity creation
   */
  private async executeCreateActivity(action: any, data: any): Promise<string> {
    if (action.dataSource === DataSourceType.SALESFORCE && action.salesforceObjectType) {
      // Create Event in Salesforce
      const result = await this.salesforceService.create(action.userId, 'Event', {
        Subject: data.subject,
        Description: data.description,
        ActivityDateTime: data.activityDate,
        DurationInMinutes: data.duration,
        WhatId: data.opportunityId,
      });
      return result.id;
    } else {
      // Get organizationId for user
      const organizationId = await this.getOrganizationIdForUser(action.userId);
      if (!organizationId) {
        throw new Error('User does not belong to an organization');
      }

      // Create locally
      const activity = await this.activitiesService.createActivity(
        {
          type: ActivityType.MEETING,
          subject: data.subject,
          description: data.description,
          outcome: data.outcome,
          activityDate: new Date(data.activityDate),
          duration: data.duration,
          opportunityId: data.opportunityId,
          accountId: data.accountId,
          leadId: data.leadId,
        },
        action.userId,
        organizationId,
      );
      return activity.id;
    }
  }

  /**
   * Execute opportunity update
   */
  private async executeUpdateOpportunity(action: any, data: any): Promise<string> {
    const opportunityId = action.targetEntityId;

    if (action.dataSource === DataSourceType.SALESFORCE) {
      // Update in Salesforce
      const sfData: any = {};
      if (data.nextStep) sfData.NextStep = data.nextStep;
      if (data.stage) sfData.StageName = data.stage;
      if (data.probabilityAdjustment) {
        // Get current probability and adjust
        const queryResult = await this.salesforceService.query(action.userId, `SELECT Probability FROM Opportunity WHERE Id = '${opportunityId}'`);
        const currentProb = queryResult?.records?.[0]?.Probability || 50;
        sfData.Probability = Math.min(100, Math.max(0, currentProb + data.probabilityAdjustment));
      }

      await this.salesforceService.update(action.userId, 'Opportunity', opportunityId, sfData);
    } else {
      // Update locally
      const updateData: any = {
        lastActivityDate: new Date(),
      };

      if (data.nextStep) updateData.nextStep = data.nextStep;
      if (data.stage) updateData.stage = data.stage;
      if (data.riskFactors) updateData.riskFactors = data.riskFactors;
      if (data.probabilityAdjustment) {
        const current = await this.prisma.opportunity.findUnique({
          where: { id: opportunityId },
          select: { probability: true },
        });
        updateData.probability = Math.min(100, Math.max(0, (current?.probability || 50) + data.probabilityAdjustment));
      }

      await this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: updateData,
      });
    }

    return opportunityId;
  }

  /**
   * Execute lead update
   */
  private async executeUpdateLead(action: any, data: any): Promise<string> {
    const leadId = action.targetEntityId;

    if (action.dataSource === DataSourceType.SALESFORCE) {
      // Update in Salesforce
      const sfData: any = {};
      if (data.buyingIntent) sfData.Rating = data.buyingIntent === 'HIGH' ? 'Hot' : data.buyingIntent === 'MEDIUM' ? 'Warm' : 'Cold';
      if (data.budget) sfData.AnnualRevenue = data.budget;

      await this.salesforceService.update(action.userId, 'Lead', leadId, sfData);
    } else {
      // Update locally
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          buyingIntent: data.buyingIntent,
          painPoints: data.painPoints,
          budget: data.budget,
          timeline: data.timeline,
          lastContactedAt: new Date(),
        },
      });
    }

    return leadId;
  }

  /**
   * Execute sync to Salesforce
   */
  private async executeSyncToSalesforce(action: any, data: any): Promise<void> {
    // Find all completed actions for this meeting that were executed locally
    const completedActions = await this.prisma.pendingMeetingAction.findMany({
      where: {
        meetingSessionId: action.meetingSessionId,
        status: PendingActionStatus.COMPLETED,
        dataSource: DataSourceType.LOCAL,
        resultEntityId: { not: null },
      },
    });

    this.logger.log(`Found ${completedActions.length} completed actions to sync to Salesforce`);

    for (const completedAction of completedActions) {
      try {
        if (completedAction.targetEntity === 'Task' && completedAction.resultEntityId) {
          // Get the local task
          const localTask = await this.prisma.task.findUnique({
            where: { id: completedAction.resultEntityId },
          });

          if (localTask) {
            // Create task in Salesforce
            const sfTask = await this.salesforceService.create(action.userId, 'Task', {
              Subject: localTask.subject,
              Description: localTask.description,
              Priority: localTask.priority === 'HIGH' ? 'High' : localTask.priority === 'LOW' ? 'Low' : 'Normal',
              ActivityDate: localTask.dueDate?.toISOString().split('T')[0],
              Status: 'Not Started',
            });

            this.logger.log(`Synced Task ${localTask.id} to Salesforce: ${sfTask.id}`);

            // Update local task metadata with Salesforce ID
            await this.prisma.task.update({
              where: { id: localTask.id },
              data: {
                metadata: {
                  ...(localTask.metadata as object || {}),
                  salesforceId: sfTask.id,
                  syncedToSalesforce: true,
                  salesforceSyncDate: new Date().toISOString(),
                },
              },
            });
          }
        } else if (completedAction.targetEntity === 'Activity' && completedAction.resultEntityId) {
          // Get the local activity
          const localActivity = await this.prisma.activity.findUnique({
            where: { id: completedAction.resultEntityId },
          });

          if (localActivity) {
            // Create event in Salesforce
            const sfEvent = await this.salesforceService.create(action.userId, 'Event', {
              Subject: localActivity.subject,
              Description: localActivity.description,
              ActivityDateTime: localActivity.activityDate?.toISOString(),
              DurationInMinutes: localActivity.duration || 60,
            });

            this.logger.log(`Synced Activity ${localActivity.id} to Salesforce: ${sfEvent.id}`);

            // Update local activity metadata with Salesforce ID
            await this.prisma.activity.update({
              where: { id: localActivity.id },
              data: {
                metadata: {
                  ...(localActivity.metadata as object || {}),
                  salesforceId: sfEvent.id,
                  syncedToSalesforce: true,
                  salesforceSyncDate: new Date().toISOString(),
                },
              },
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to sync ${completedAction.targetEntity} ${completedAction.resultEntityId} to Salesforce: ${error.message}`);
      }
    }
  }

  /**
   * Check if user has Salesforce connection
   */
  private async checkSalesforceConnection(userId: string): Promise<boolean> {
    const connection = await this.prisma.salesforceConnection.findUnique({
      where: { userId },
    });
    return !!connection;
  }

  /**
   * Get organization ID for a user from their active membership
   */
  private async getOrganizationIdForUser(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { organizationId: true },
    });
    return membership?.organizationId || null;
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority?: string): Date {
    const now = new Date();
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return new Date(now.setDate(now.getDate() + 2));
      case 'MEDIUM':
        return new Date(now.setDate(now.getDate() + 5));
      case 'LOW':
        return new Date(now.setDate(now.getDate() + 10));
      default:
        return new Date(now.setDate(now.getDate() + 7));
    }
  }

  /**
   * Map string priority to enum
   */
  private mapPriority(priority?: string): Priority {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return Priority.HIGH;
      case 'URGENT':
        return Priority.URGENT;
      case 'LOW':
        return Priority.LOW;
      default:
        return Priority.MEDIUM;
    }
  }

  /**
   * Truncate text to specified length (null-safe)
   */
  private truncate(text: string | null | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Regenerate pending actions from existing meeting analysis
   * Useful for meetings analyzed before approval mode was enabled or fixed
   */
  async regenerateFromExistingAnalysis(
    meetingSessionId: string,
    userId: string,
  ): Promise<{ generated: number; message: string }> {
    this.logger.log(`Regenerating pending actions for meeting ${meetingSessionId}`);

    // Get meeting with analysis
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        analysis: true,
        owner: { select: { settings: true } },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingSessionId} not found`);
    }

    if (!meeting.analysis) {
      throw new BadRequestException(`No analysis exists for meeting ${meetingSessionId}`);
    }

    // Verify ownership
    if (meeting.ownerId !== userId) {
      throw new BadRequestException('You can only regenerate actions for your own meetings');
    }

    // Delete any existing pending actions for this meeting (to avoid duplicates)
    const deleted = await this.prisma.pendingMeetingAction.deleteMany({
      where: {
        meetingSessionId,
        status: PendingActionStatus.PENDING, // Only delete pending ones, keep completed/rejected
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Deleted ${deleted.count} existing pending actions before regenerating`);
    }

    // Determine preferred data source from user settings
    const userSettings = meeting.owner?.settings as any;
    const preferredDataSource = userSettings?.crmDataSource === 'salesforce'
      ? DataSourceType.SALESFORCE
      : DataSourceType.LOCAL;

    // Generate new pending actions using the existing analysis
    await this.generatePendingActions(
      meeting,
      meeting.analysis as any,
      preferredDataSource,
    );

    // Count generated actions
    const generated = await this.prisma.pendingMeetingAction.count({
      where: {
        meetingSessionId,
        status: PendingActionStatus.PENDING,
      },
    });

    return {
      generated,
      message: `Successfully regenerated ${generated} pending actions from meeting analysis`,
    };
  }

  /**
   * Extract entity mentions from meeting analysis text
   * Looks for patterns like "Lead name: X", "associated with Y", person names, company names
   */
  private extractEntityMentions(analysis: any): DetectedEntity[] {
    const entities: DetectedEntity[] = [];
    const processedNames = new Set<string>();

    // Combine all text sources for entity extraction
    const textSources = [
      analysis.summary || analysis.executiveSummary || '',
      ...(analysis.keyPoints || []),
      ...(analysis.actionItems?.map((a: any) => `${a.task || a.text || ''} ${a.assignee || ''}`) || []),
      ...(analysis.decisions || []),
      ...(analysis.nextSteps || []),
    ].join(' ');

    // Pattern: "Lead name: X" or "lead named X"
    const leadNamePatterns = [
      /lead\s+(?:name[d]?|named|called)[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /(?:prospect|contact)\s+(?:name[d]?|named|called)[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    ];

    // Pattern: "associated with X" or "from X" (company)
    const companyPatterns = [
      /associated\s+with\s+([A-Z][A-Za-z\s&]+(?:Group|Inc|Corp|LLC|Ltd|Company)?)/gi,
      /(?:from|at|of)\s+([A-Z][A-Za-z\s&]+(?:Group|Inc|Corp|LLC|Ltd|Company))/gi,
      /company[:.]?\s*([A-Z][A-Za-z\s&]+(?:Group|Inc|Corp|LLC|Ltd|Company)?)/gi,
    ];

    // Pattern: Opportunity names
    const opportunityPatterns = [
      /opportunity[:.]?\s*([A-Z][A-Za-z\s]+(?:Deal|Project|Contract)?)/gi,
      /deal[:.]?\s*([A-Z][A-Za-z\s]+)/gi,
    ];

    // Extract lead/contact names
    for (const pattern of leadNamePatterns) {
      let match;
      while ((match = pattern.exec(textSources)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !processedNames.has(name.toLowerCase())) {
          processedNames.add(name.toLowerCase());
          entities.push({
            type: 'Lead',
            name,
            confidence: 0.8,
          });
        }
      }
    }

    // Extract company names
    for (const pattern of companyPatterns) {
      let match;
      while ((match = pattern.exec(textSources)) !== null) {
        const company = match[1].trim();
        if (company.length > 3 && !processedNames.has(company.toLowerCase())) {
          processedNames.add(company.toLowerCase());
          // Try to associate company with existing lead entities
          const existingLead = entities.find(e => e.type === 'Lead' && !e.company);
          if (existingLead) {
            existingLead.company = company;
          } else {
            entities.push({
              type: 'Account',
              name: company,
              confidence: 0.7,
            });
          }
        }
      }
    }

    // Extract opportunity names
    for (const pattern of opportunityPatterns) {
      let match;
      while ((match = pattern.exec(textSources)) !== null) {
        const name = match[1].trim();
        if (name.length > 3 && !processedNames.has(name.toLowerCase())) {
          processedNames.add(name.toLowerCase());
          entities.push({
            type: 'Opportunity',
            name,
            confidence: 0.6,
          });
        }
      }
    }

    this.logger.log(`Extracted ${entities.length} entity mentions from analysis`);
    return entities;
  }

  /**
   * Search Salesforce for matching entities
   */
  private async findMatchingEntities(
    userId: string,
    detectedEntities: DetectedEntity[],
  ): Promise<DetectedEntity[]> {
    const matchedEntities: DetectedEntity[] = [];

    for (const entity of detectedEntities) {
      try {
        let query: string;
        let matchedId: string | undefined;

        switch (entity.type) {
          case 'Lead':
            // Search by name and optionally company
            const nameParts = entity.name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';

            if (entity.company) {
              query = `SELECT Id, FirstName, LastName, Company FROM Lead WHERE (FirstName LIKE '%${firstName}%' OR LastName LIKE '%${lastName}%') AND Company LIKE '%${entity.company}%' LIMIT 1`;
            } else {
              query = `SELECT Id, FirstName, LastName, Company FROM Lead WHERE FirstName LIKE '%${firstName}%' OR LastName LIKE '%${lastName}%' OR Name LIKE '%${entity.name}%' LIMIT 1`;
            }

            const leadResult = await this.salesforceService.query(userId, query);
            if (leadResult?.records?.length > 0) {
              matchedId = leadResult.records[0].Id;
              entity.company = entity.company || leadResult.records[0].Company;
              this.logger.log(`Matched Lead "${entity.name}" to Salesforce ID: ${matchedId}`);
            }
            break;

          case 'Contact':
            const contactNameParts = entity.name.split(' ');
            const contactFirstName = contactNameParts[0] || '';
            const contactLastName = contactNameParts.slice(1).join(' ') || contactNameParts[0] || '';

            query = `SELECT Id, FirstName, LastName, Account.Name FROM Contact WHERE FirstName LIKE '%${contactFirstName}%' OR LastName LIKE '%${contactLastName}%' LIMIT 1`;

            const contactResult = await this.salesforceService.query(userId, query);
            if (contactResult?.records?.length > 0) {
              matchedId = contactResult.records[0].Id;
              this.logger.log(`Matched Contact "${entity.name}" to Salesforce ID: ${matchedId}`);
            }
            break;

          case 'Account':
            query = `SELECT Id, Name FROM Account WHERE Name LIKE '%${entity.name}%' LIMIT 1`;

            const accountResult = await this.salesforceService.query(userId, query);
            if (accountResult?.records?.length > 0) {
              matchedId = accountResult.records[0].Id;
              this.logger.log(`Matched Account "${entity.name}" to Salesforce ID: ${matchedId}`);
            }
            break;

          case 'Opportunity':
            query = `SELECT Id, Name, AccountId FROM Opportunity WHERE Name LIKE '%${entity.name}%' LIMIT 1`;

            const oppResult = await this.salesforceService.query(userId, query);
            if (oppResult?.records?.length > 0) {
              matchedId = oppResult.records[0].Id;
              this.logger.log(`Matched Opportunity "${entity.name}" to Salesforce ID: ${matchedId}`);
            }
            break;
        }

        matchedEntities.push({
          ...entity,
          id: matchedId,
          confidence: matchedId ? 0.95 : entity.confidence,
        });
      } catch (error) {
        this.logger.warn(`Failed to search for ${entity.type} "${entity.name}": ${error.message}`);
        matchedEntities.push(entity);
      }
    }

    return matchedEntities;
  }

  /**
   * Get the best matched entity for linking a pending action
   */
  private getBestMatchedEntity(matchedEntities: DetectedEntity[]): DetectedEntity | null {
    // Prefer entities with Salesforce IDs, sorted by confidence
    const withIds = matchedEntities
      .filter(e => e.id)
      .sort((a, b) => b.confidence - a.confidence);

    if (withIds.length > 0) {
      return withIds[0];
    }

    // Fall back to highest confidence entity without ID
    const sorted = matchedEntities.sort((a, b) => b.confidence - a.confidence);
    return sorted[0] || null;
  }
}
