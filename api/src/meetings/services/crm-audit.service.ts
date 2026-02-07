import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Types of CRM changes that can be audited
 */
export enum CrmChangeType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  OPPORTUNITY_UPDATED = 'OPPORTUNITY_UPDATED',
  OPPORTUNITY_STAGE_CHANGED = 'OPPORTUNITY_STAGE_CHANGED',
  OPPORTUNITY_PROBABILITY_CHANGED = 'OPPORTUNITY_PROBABILITY_CHANGED',
  LEAD_UPDATED = 'LEAD_UPDATED',
  LEAD_STATUS_CHANGED = 'LEAD_STATUS_CHANGED',
  INSIGHT_CREATED = 'INSIGHT_CREATED',
  ACTIVITY_CREATED = 'ACTIVITY_CREATED',
  CONTACT_UPDATED = 'CONTACT_UPDATED',
  NOTE_CREATED = 'NOTE_CREATED',
  VALIDATION_WARNING = 'VALIDATION_WARNING',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATA_FILTERED = 'DATA_FILTERED',
}

/**
 * Source of the CRM change
 */
export enum CrmChangeSource {
  MEETING_INTELLIGENCE = 'MEETING_INTELLIGENCE',
  AI_ANALYSIS = 'AI_ANALYSIS',
  USER_MANUAL = 'USER_MANUAL',
  API = 'API',
  SYSTEM = 'SYSTEM',
}

/**
 * Audit log entry structure
 */
export interface CrmAuditLogEntry {
  id?: string;
  changeType: CrmChangeType;
  source: CrmChangeSource;
  entityType: string; // 'Task', 'Opportunity', 'Lead', 'Insight', etc.
  entityId: string;
  meetingSessionId?: string;
  userId?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: {
    confidence?: number;
    reason?: string;
    validationWarnings?: string[];
    aiModel?: string;
    [key: string]: any;
  };
  createdAt?: Date;
}

/**
 * Service for auditing all CRM changes made by the Meeting Intelligence system.
 * This provides traceability, rollback capability, and data quality monitoring.
 */
@Injectable()
export class CrmAuditService {
  private readonly logger = new Logger(CrmAuditService.name);

  // In-memory buffer for batch logging (improves performance)
  private auditBuffer: CrmAuditLogEntry[] = [];
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(private readonly prisma: PrismaService) {
    // Periodically flush the audit buffer
    setInterval(() => this.flushBuffer(), this.FLUSH_INTERVAL_MS);
  }

  /**
   * Log a CRM change event
   */
  async logChange(entry: CrmAuditLogEntry): Promise<void> {
    const logEntry = {
      ...entry,
      createdAt: new Date(),
    };

    // Add to buffer
    this.auditBuffer.push(logEntry);

    // Log to console for immediate visibility
    this.logger.log(
      `[${entry.changeType}] ${entry.entityType}:${entry.entityId} ` +
      `from ${entry.source}${entry.meetingSessionId ? ` (meeting: ${entry.meetingSessionId})` : ''}`
    );

    // Flush if buffer is full
    if (this.auditBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  /**
   * Log task creation from meeting intelligence
   */
  async logTaskCreated(
    taskId: string,
    meetingSessionId: string,
    taskData: any,
    metadata?: { confidence?: number; validationWarnings?: string[] }
  ): Promise<void> {
    await this.logChange({
      changeType: CrmChangeType.TASK_CREATED,
      source: CrmChangeSource.MEETING_INTELLIGENCE,
      entityType: 'Task',
      entityId: taskId,
      meetingSessionId,
      newValue: {
        subject: taskData.subject,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        assignee: taskData.assignee,
      },
      metadata: {
        ...metadata,
        originalActionItem: taskData.originalActionItem,
      },
    });
  }

  /**
   * Log opportunity update from meeting intelligence
   */
  async logOpportunityUpdated(
    opportunityId: string,
    meetingSessionId: string,
    previousValue: any,
    newValue: any,
    changeType: CrmChangeType = CrmChangeType.OPPORTUNITY_UPDATED
  ): Promise<void> {
    await this.logChange({
      changeType,
      source: CrmChangeSource.MEETING_INTELLIGENCE,
      entityType: 'Opportunity',
      entityId: opportunityId,
      meetingSessionId,
      previousValue,
      newValue,
      metadata: {
        fieldsChanged: Object.keys(newValue),
      },
    });
  }

  /**
   * Log insight creation
   */
  async logInsightCreated(
    insightId: string,
    meetingSessionId: string,
    insightData: { type: string; title: string; confidence?: number }
  ): Promise<void> {
    await this.logChange({
      changeType: CrmChangeType.INSIGHT_CREATED,
      source: CrmChangeSource.AI_ANALYSIS,
      entityType: 'MeetingInsight',
      entityId: insightId,
      meetingSessionId,
      newValue: insightData,
      metadata: {
        confidence: insightData.confidence,
      },
    });
  }

  /**
   * Log validation warning (data quality issue)
   */
  async logValidationWarning(
    meetingSessionId: string,
    warnings: string[],
    context?: any
  ): Promise<void> {
    await this.logChange({
      changeType: CrmChangeType.VALIDATION_WARNING,
      source: CrmChangeSource.AI_ANALYSIS,
      entityType: 'MeetingAnalysis',
      entityId: meetingSessionId,
      meetingSessionId,
      metadata: {
        warnings,
        context,
      },
    });
  }

  /**
   * Log data that was filtered out (didn't meet quality thresholds)
   */
  async logDataFiltered(
    meetingSessionId: string,
    filteredData: {
      actionItems?: number;
      insights?: number;
      buyingSignals?: number;
      reasons?: string[];
    }
  ): Promise<void> {
    await this.logChange({
      changeType: CrmChangeType.DATA_FILTERED,
      source: CrmChangeSource.AI_ANALYSIS,
      entityType: 'MeetingAnalysis',
      entityId: meetingSessionId,
      meetingSessionId,
      metadata: {
        filteredCounts: filteredData,
        reasons: filteredData.reasons,
      },
    });
  }

  /**
   * Log lead update from meeting intelligence
   */
  async logLeadUpdated(
    leadId: string,
    meetingSessionId: string,
    previousValue: any,
    newValue: any
  ): Promise<void> {
    await this.logChange({
      changeType: CrmChangeType.LEAD_UPDATED,
      source: CrmChangeSource.MEETING_INTELLIGENCE,
      entityType: 'Lead',
      entityId: leadId,
      meetingSessionId,
      previousValue,
      newValue,
    });
  }

  /**
   * Flush the audit buffer to the database
   */
  private async flushBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    const entries = [...this.auditBuffer];
    this.auditBuffer = [];

    try {
      // Store in the database
      await this.prisma.crmAuditLog.createMany({
        data: entries.map(entry => ({
          changeType: entry.changeType,
          source: entry.source,
          entityType: entry.entityType,
          entityId: entry.entityId,
          meetingSessionId: entry.meetingSessionId,
          userId: entry.userId,
          previousValue: entry.previousValue ? JSON.stringify(entry.previousValue) : null,
          newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          createdAt: entry.createdAt,
        })),
      });

      this.logger.debug(`Flushed ${entries.length} audit log entries to database`);
    } catch (error) {
      this.logger.error(`Failed to flush audit log: ${error.message}`);
      // Put entries back in buffer for retry
      this.auditBuffer.unshift(...entries);
    }
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { limit?: number; since?: Date }
  ): Promise<CrmAuditLogEntry[]> {
    const logs = await this.prisma.crmAuditLog.findMany({
      where: {
        entityType,
        entityId,
        ...(options?.since && { createdAt: { gte: options.since } }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
    });

    return logs.map(log => ({
      id: log.id,
      changeType: log.changeType as CrmChangeType,
      source: log.source as CrmChangeSource,
      entityType: log.entityType,
      entityId: log.entityId,
      meetingSessionId: log.meetingSessionId || undefined,
      userId: log.userId || undefined,
      previousValue: log.previousValue ? JSON.parse(log.previousValue) : undefined,
      newValue: log.newValue ? JSON.parse(log.newValue) : undefined,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      createdAt: log.createdAt,
    }));
  }

  /**
   * Get audit history for a meeting session
   */
  async getMeetingAuditHistory(
    meetingSessionId: string
  ): Promise<CrmAuditLogEntry[]> {
    const logs = await this.prisma.crmAuditLog.findMany({
      where: { meetingSessionId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map(log => ({
      id: log.id,
      changeType: log.changeType as CrmChangeType,
      source: log.source as CrmChangeSource,
      entityType: log.entityType,
      entityId: log.entityId,
      meetingSessionId: log.meetingSessionId || undefined,
      previousValue: log.previousValue ? JSON.parse(log.previousValue) : undefined,
      newValue: log.newValue ? JSON.parse(log.newValue) : undefined,
      metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
      createdAt: log.createdAt,
    }));
  }

  /**
   * Get data quality metrics for a time period
   */
  async getDataQualityMetrics(
    since: Date
  ): Promise<{
    totalChanges: number;
    byChangeType: Record<string, number>;
    validationWarnings: number;
    filteredData: number;
    bySource: Record<string, number>;
  }> {
    const logs = await this.prisma.crmAuditLog.findMany({
      where: { createdAt: { gte: since } },
      select: { changeType: true, source: true },
    });

    const byChangeType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let validationWarnings = 0;
    let filteredData = 0;

    for (const log of logs) {
      byChangeType[log.changeType] = (byChangeType[log.changeType] || 0) + 1;
      bySource[log.source] = (bySource[log.source] || 0) + 1;

      if (log.changeType === CrmChangeType.VALIDATION_WARNING) {
        validationWarnings++;
      }
      if (log.changeType === CrmChangeType.DATA_FILTERED) {
        filteredData++;
      }
    }

    return {
      totalChanges: logs.length,
      byChangeType,
      validationWarnings,
      filteredData,
      bySource,
    };
  }

  /**
   * Rollback changes from a specific meeting (for error recovery)
   */
  async rollbackMeetingChanges(meetingSessionId: string): Promise<{
    rolledBack: number;
    errors: string[];
  }> {
    const history = await this.getMeetingAuditHistory(meetingSessionId);
    let rolledBack = 0;
    const errors: string[] = [];

    // Process in reverse order (most recent first)
    for (const entry of history.reverse()) {
      try {
        switch (entry.changeType) {
          case CrmChangeType.TASK_CREATED:
            await this.prisma.task.delete({ where: { id: entry.entityId } });
            rolledBack++;
            break;

          case CrmChangeType.INSIGHT_CREATED:
            await this.prisma.meetingInsight.delete({ where: { id: entry.entityId } });
            rolledBack++;
            break;

          case CrmChangeType.OPPORTUNITY_UPDATED:
          case CrmChangeType.OPPORTUNITY_STAGE_CHANGED:
          case CrmChangeType.OPPORTUNITY_PROBABILITY_CHANGED:
            if (entry.previousValue) {
              await this.prisma.opportunity.update({
                where: { id: entry.entityId },
                data: entry.previousValue,
              });
              rolledBack++;
            }
            break;

          case CrmChangeType.LEAD_UPDATED:
            if (entry.previousValue) {
              await this.prisma.lead.update({
                where: { id: entry.entityId },
                data: entry.previousValue,
              });
              rolledBack++;
            }
            break;

          case CrmChangeType.ACTIVITY_CREATED:
            await this.prisma.activity.delete({ where: { id: entry.entityId } });
            rolledBack++;
            break;
        }
      } catch (error) {
        errors.push(`Failed to rollback ${entry.changeType} for ${entry.entityId}: ${error.message}`);
      }
    }

    // Log the rollback action itself
    await this.logChange({
      changeType: CrmChangeType.VALIDATION_WARNING,
      source: CrmChangeSource.SYSTEM,
      entityType: 'MeetingSession',
      entityId: meetingSessionId,
      metadata: {
        action: 'ROLLBACK',
        rolledBack,
        errors,
      },
    });

    return { rolledBack, errors };
  }
}
