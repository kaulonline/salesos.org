import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ActivitiesService } from '../../activities/activities.service';
import { MeetingAnalysisResultDto, ActionItemDto } from '../dto';
import { ActivityType } from '@prisma/client';
import { MeetingDataValidatorService } from './meeting-data-validator.service';
import { CrmAuditService, CrmChangeType } from './crm-audit.service';

/**
 * Service responsible for updating CRM records based on meeting analysis.
 * Intelligently creates tasks, updates opportunities, and stores insights
 * based on AI-extracted action items and meeting intelligence.
 * 
 * Includes validation guardrails and audit logging to ensure data quality.
 */
@Injectable()
export class CrmUpdaterService {
  private readonly logger = new Logger(CrmUpdaterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
    private readonly configService: ConfigService,
    private readonly validator: MeetingDataValidatorService,
    private readonly auditService: CrmAuditService,
  ) {}

  /**
   * Check if automatic CRM updates are enabled
   */
  private isAutoUpdateEnabled(): boolean {
    return this.configService.get('app.meetingIntelligence.autoUpdateCrm', true);
  }

  /**
   * Check if automatic task creation is enabled
   */
  private isAutoCreateTasksEnabled(): boolean {
    return this.configService.get('app.meetingIntelligence.autoCreateTasks', true);
  }

  /**
   * Check if automatic opportunity updates are enabled
   */
  private isAutoUpdateOpportunityEnabled(): boolean {
    return this.configService.get('app.meetingIntelligence.autoUpdateOpportunity', true);
  }

  /**
   * Check if automatic insights storage is enabled
   */
  private isAutoStoreInsightsEnabled(): boolean {
    return this.configService.get('app.meetingIntelligence.autoStoreInsights', true);
  }

  /**
   * Update CRM records based on meeting analysis.
   * Includes validation guardrails to prevent junk data.
   */
  async updateCrmFromAnalysis(meeting: any, analysis: MeetingAnalysisResultDto): Promise<void> {
    if (!this.isAutoUpdateEnabled()) {
      this.logger.log(`Automatic CRM updates disabled - skipping for meeting: ${meeting.id}`);
      return;
    }

    this.logger.log(`Validating and updating CRM from meeting analysis: ${meeting.id}`);

    // STEP 1: Validate the analysis data before making any CRM changes
    const validationResult = await this.validator.validateAnalysis(analysis, meeting.id);

    // Log validation warnings
    if (validationResult.warnings.length > 0) {
      this.logger.warn(`Validation warnings for meeting ${meeting.id}:`, validationResult.warnings);
      await this.auditService.logValidationWarning(meeting.id, validationResult.warnings, {
        originalAnalysis: {
          actionItems: analysis.actionItems?.length || 0,
          buyingSignals: analysis.buyingSignals?.length || 0,
          insights: (analysis.concerns?.length || 0) + (analysis.objections?.length || 0),
        },
      });
    }

    // If validation failed with errors, don't proceed
    if (!validationResult.isValid) {
      this.logger.error(`Validation failed for meeting ${meeting.id}: ${validationResult.errors.join(', ')}`);
      await this.auditService.logChange({
        changeType: CrmChangeType.VALIDATION_ERROR,
        source: 'MEETING_INTELLIGENCE' as any,
        entityType: 'MeetingAnalysis',
        entityId: meeting.id,
        metadata: { errors: validationResult.errors },
      });
      return;
    }

    // Use sanitized data for CRM updates
    const sanitizedAnalysis = validationResult.sanitizedData || analysis;

    // Track filtered data for audit
    const filteredCounts = {
      actionItems: (analysis.actionItems?.length || 0) - (sanitizedAnalysis.actionItems?.length || 0),
      buyingSignals: (analysis.buyingSignals?.length || 0) - (sanitizedAnalysis.buyingSignals?.length || 0),
      keyPoints: (analysis.keyPoints?.length || 0) - (sanitizedAnalysis.keyPoints?.length || 0),
    };

    if (filteredCounts.actionItems > 0 || filteredCounts.buyingSignals > 0) {
      await this.auditService.logDataFiltered(meeting.id, {
        ...filteredCounts,
        reasons: validationResult.warnings,
      });
    }

    try {
      // 1. Create Activity record for the meeting (always create)
      await this.createMeetingActivity(meeting, sanitizedAnalysis);
      await this.auditService.logChange({
        changeType: CrmChangeType.ACTIVITY_CREATED,
        source: 'MEETING_INTELLIGENCE' as any,
        entityType: 'Activity',
        entityId: meeting.id,
        meetingSessionId: meeting.id,
        newValue: { subject: meeting.title, type: 'MEETING' },
      });

      // 2. Create Tasks from action items (if enabled and have valid items)
      if (this.isAutoCreateTasksEnabled() && sanitizedAnalysis.actionItems?.length > 0) {
        await this.createTasksFromActionItems(meeting, sanitizedAnalysis.actionItems);
      } else if (!this.isAutoCreateTasksEnabled()) {
        this.logger.log(`Auto task creation disabled - ${sanitizedAnalysis.actionItems?.length || 0} action items not converted to tasks`);
      }

      // 3. Update Opportunity if applicable (if enabled)
      if (meeting.opportunityId && this.isAutoUpdateOpportunityEnabled()) {
        await this.updateOpportunity(meeting.opportunityId, sanitizedAnalysis);
      }

      // 4. Store insights for reference (if enabled)
      if (this.isAutoStoreInsightsEnabled()) {
        await this.storeMeetingInsights(meeting.id, sanitizedAnalysis);
      }

      // 5. Update Contact engagement if participants are linked
      await this.updateContactEngagement(meeting);

      // 6. Update Lead if linked
      if (meeting.leadId) {
        await this.updateLeadFromAnalysis(meeting.leadId, sanitizedAnalysis);
      }

      this.logger.log(`CRM update complete for meeting: ${meeting.id} (${sanitizedAnalysis.actionItems?.length || 0} tasks, validation: ${validationResult.warnings.length} warnings)`);
    } catch (error) {
      this.logger.error(`Failed to update CRM: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update Lead record based on meeting analysis
   */
  private async updateLeadFromAnalysis(leadId: string, analysis: MeetingAnalysisResultDto): Promise<void> {
    const updates: any = {};

    // Update buying intent based on buying signals
    if (analysis.buyingSignals && analysis.buyingSignals.length > 0) {
      const avgConfidence = analysis.buyingSignals.reduce((sum, s) => sum + (s.confidence || 0), 0) / analysis.buyingSignals.length;
      if (avgConfidence > 0.7) {
        updates.buyingIntent = 'HIGH';
      } else if (avgConfidence > 0.4) {
        updates.buyingIntent = 'MEDIUM';
      }
    }

    // Store pain points from concerns/objections
    if (analysis.concerns && analysis.concerns.length > 0) {
      updates.painPoints = analysis.concerns.slice(0, 5);
    }

    // Update budget if mentioned
    if (analysis.budgetMentioned) {
      updates.budget = analysis.budgetMentioned;
    }

    // Update timeline if mentioned
    if (analysis.timelineMentioned) {
      updates.timeline = analysis.timelineMentioned;
    }

    if (Object.keys(updates).length > 0) {
      try {
        // Get previous values for audit
        const previousLead = await this.prisma.lead.findUnique({
          where: { id: leadId },
          select: { buyingIntent: true, painPoints: true, budget: true, timeline: true },
        });

        await this.prisma.lead.update({
          where: { id: leadId },
          data: {
            ...updates,
            lastContactedAt: new Date(),
          },
        });

        // Audit the change
        await this.auditService.logLeadUpdated(leadId, '', previousLead, updates);
        
        this.logger.log(`Updated lead ${leadId} from meeting analysis: ${JSON.stringify(updates)}`);
      } catch (error) {
        this.logger.warn(`Failed to update lead ${leadId}: ${error}`);
      }
    }
  }

  /**
   * Create an Activity record for the meeting
   */
  private async createMeetingActivity(meeting: any, analysis: MeetingAnalysisResultDto): Promise<void> {
    // Get organizationId for the meeting owner
    const organizationId = await this.getOrganizationIdForUser(meeting.userId || meeting.ownerId);
    if (!organizationId) {
      this.logger.warn(`Cannot create activity for meeting ${meeting.id}: User does not belong to an organization`);
      return;
    }

    await this.activitiesService.createActivity(
      {
        type: ActivityType.MEETING,
        subject: meeting.title,
        description: analysis.executiveSummary,
        outcome: analysis.detailedSummary,
        activityDate: meeting.startedAt || meeting.scheduledAt,
        duration: meeting.duration,
        opportunityId: meeting.opportunityId,
        accountId: meeting.accountId,
        leadId: meeting.leadId,
      },
      meeting.userId || meeting.ownerId,
      organizationId,
    );

    this.logger.log(`Created meeting activity for: ${meeting.id}`);
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
   * Create Tasks from action items
   */
  private async createTasksFromActionItems(
    meeting: any,
    actionItems: ActionItemDto[],
  ): Promise<void> {
    if (!actionItems || actionItems.length === 0) {
      return;
    }

    const createdTasks: string[] = [];

    for (const item of actionItems) {
      // Calculate due date based on priority if not specified
      const dueDate = item.dueDate
        ? new Date(item.dueDate)
        : this.calculateDueDate(item.priority);

      try {
        const task = await this.prisma.task.create({
          data: {
            subject: item.text,
            description: `Auto-generated from meeting: ${meeting.title}\n\nAssignee mentioned: ${item.assignee || 'Not specified'}`,
            priority: this.mapPriority(item.priority),
            dueDate,
            status: 'NOT_STARTED',
            ownerId: meeting.ownerId,
            opportunityId: meeting.opportunityId || undefined,
            accountId: meeting.accountId || undefined,
            leadId: meeting.leadId || undefined,
            meetingSessionId: meeting.id,
            metadata: {
              source: 'meeting_intelligence',
              meetingTitle: meeting.title,
              originalAssignee: item.assignee,
              extractedPriority: item.priority,
            },
          },
        });
        createdTasks.push(task.id);

        // Audit the task creation
        await this.auditService.logTaskCreated(task.id, meeting.id, {
          subject: item.text,
          priority: item.priority,
          dueDate,
          assignee: item.assignee,
          originalActionItem: item.text,
        });

        this.logger.log(`Created task: ${task.id} - ${item.text}`);
      } catch (error) {
        this.logger.error(`Failed to create task for action item: ${item.text}`, error);
      }
    }

    this.logger.log(`Created ${createdTasks.length}/${actionItems.length} tasks from action items`);
  }

  /**
   * Update Opportunity based on analysis
   */
  private async updateOpportunity(
    opportunityId: string,
    analysis: MeetingAnalysisResultDto,
  ): Promise<void> {
    const updates: any = {};

    // Update next step if we have one
    if (analysis.nextSteps && analysis.nextSteps.length > 0) {
      updates.nextStep = analysis.nextSteps[0];
    }

    // Update risk factors
    if (analysis.concerns && analysis.concerns.length > 0) {
      updates.riskFactors = analysis.concerns;
    }

    // Update recommended actions
    if (analysis.recommendedActions && analysis.recommendedActions.length > 0) {
      updates.recommendedActions = analysis.recommendedActions;
    }

    // Update competitors
    if (analysis.competitors && analysis.competitors.length > 0) {
      updates.competitors = analysis.competitors;
    }

    // Consider stage recommendation - auto-update if confidence is high
    if (analysis.stageRecommendation) {
      this.logger.log(
        `Stage recommendation for opportunity ${opportunityId}: ${analysis.stageRecommendation}`,
      );
      // Auto-update stage based on meeting analysis
      updates.stage = analysis.stageRecommendation;
      
      // Create a notification/insight for stage change
      await this.createStageChangeInsight(opportunityId, analysis.stageRecommendation);
    }

    // Update win probability if recommended
    if (analysis.probabilityChange) {
      const currentOpp = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { probability: true },
      });
      
      if (currentOpp) {
        const newProbability = Math.min(100, Math.max(0, 
          (currentOpp.probability || 50) + analysis.probabilityChange
        ));
        updates.probability = newProbability;
        this.logger.log(
          `Updating probability: ${currentOpp.probability}% -> ${newProbability}% (${analysis.probabilityChange > 0 ? '+' : ''}${analysis.probabilityChange}%)`,
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
          ...updates,
          lastActivityDate: new Date(),
        },
      });
      this.logger.log(`Updated opportunity ${opportunityId}: ${JSON.stringify(updates)}`);
    }
  }

  /**
   * Create an insight record for stage change recommendations
   */
  private async createStageChangeInsight(opportunityId: string, newStage: string): Promise<void> {
    try {
      // Find the meeting session linked to this opportunity
      const meeting = await this.prisma.meetingSession.findFirst({
        where: { opportunityId },
        orderBy: { createdAt: 'desc' },
      });

      if (meeting) {
        await this.prisma.meetingInsight.create({
          data: {
            meetingSessionId: meeting.id,
            type: 'OPPORTUNITY',
            title: `Opportunity Stage Updated to ${newStage}`,
            description: `Based on meeting analysis, the opportunity stage has been automatically updated to ${newStage}.`,
            priority: 'HIGH',
            impactedEntity: 'Opportunity',
            impactedEntityId: opportunityId,
            suggestedAction: `Review stage change and verify it reflects the current deal status.`,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to create stage change insight: ${error}`);
    }
  }

  /**
   * Store insights from meeting for future reference
   */
  private async storeMeetingInsights(
    meetingSessionId: string,
    analysis: MeetingAnalysisResultDto,
  ): Promise<void> {
    const insights: Array<{
      type: string;
      title: string;
      description: string;
      confidence?: number;
      priority: string;
    }> = [];

    // Store buying signals as insights
    for (const signal of analysis.buyingSignals || []) {
      insights.push({
        type: 'BUYING_SIGNAL',
        title: 'Buying Signal Detected',
        description: signal.signal,
        confidence: signal.confidence,
        priority: signal.confidence > 0.7 ? 'HIGH' : 'MEDIUM',
      });
    }

    // Store objections as insights
    for (const objection of analysis.objections || []) {
      insights.push({
        type: 'OBJECTION',
        title: 'Customer Objection',
        description: objection.objection,
        priority: objection.resolved ? 'LOW' : 'HIGH',
      });
    }

    // Store concerns as insights
    for (const concern of analysis.concerns || []) {
      insights.push({
        type: 'RISK_ALERT',
        title: 'Risk/Concern Identified',
        description: concern,
        priority: 'MEDIUM',
      });
    }

    // Budget mention as insight
    if (analysis.budgetMentioned) {
      insights.push({
        type: 'BUDGET_INFO',
        title: 'Budget Mentioned',
        description: `Budget of $${analysis.budgetMentioned.toLocaleString()} was discussed`,
        priority: 'HIGH',
      });
    }

    // Timeline mention as insight
    if (analysis.timelineMentioned) {
      insights.push({
        type: 'TIMELINE_INFO',
        title: 'Timeline Mentioned',
        description: analysis.timelineMentioned,
        priority: 'HIGH',
      });
    }

    // Store all insights in the database
    this.logger.log(`Storing ${insights.length} insights for meeting ${meetingSessionId}`);

    for (const insight of insights) {
      try {
        await this.prisma.meetingInsight.create({
          data: {
            meetingSessionId,
            type: insight.type as any,
            title: insight.title,
            description: insight.description,
            confidence: insight.confidence,
            priority: insight.priority as any,
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to store insight: ${insight.title}`, error);
      }
    }

    this.logger.log(`Successfully stored insights for meeting ${meetingSessionId}`);
  }

  /**
   * Update contact engagement based on meeting participation
   */
  private async updateContactEngagement(meeting: any): Promise<void> {
    if (!meeting.participants) return;

    for (const participant of meeting.participants) {
      if (participant.contactId) {
        try {
          const meetingDate = meeting.actualStart || meeting.scheduledStart;
          await this.prisma.contact.update({
            where: { id: participant.contactId },
            data: {
              lastContactedAt: meetingDate,
              metadata: {
                lastMeetingId: meeting.id,
                lastMeetingTitle: meeting.title,
                lastMeetingDate: meetingDate,
              },
            },
          });
          this.logger.log(`Updated contact engagement: ${participant.contactId}`);
        } catch (error) {
          this.logger.error(`Failed to update contact ${participant.contactId}:`, error);
        }
      }
    }
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority?: string): Date {
    const now = new Date();
    switch (priority?.toUpperCase()) {
      case 'HIGH':
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
  private mapPriority(priority?: string): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'HIGH';
      case 'URGENT':
        return 'URGENT';
      case 'LOW':
        return 'LOW';
      default:
        return 'NORMAL';
    }
  }
}
