/**
 * Pending Note Actions Service
 *
 * Manages AI-suggested actions from note processing:
 * - List pending actions for approval
 * - Approve/reject individual or bulk actions
 * - Execute approved actions (create tasks, update CRM)
 * - Track execution results
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PendingNoteAction,
  NoteActionType,
  NoteActionStatus,
  NoteProcessingStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

interface ExecutionResult {
  success: boolean;
  message: string;
  createdId?: string;
  salesforceId?: string;
  error?: string;
}

@Injectable()
export class PendingNoteActionsService {
  private readonly logger = new Logger(PendingNoteActionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get pending actions for a note
   */
  async getPendingActionsForNote(noteId: string, userId: string): Promise<PendingNoteAction[]> {
    return this.prisma.pendingNoteAction.findMany({
      where: {
        noteId,
        userId,
      },
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get all pending actions for a user
   */
  async getUserPendingActions(
    userId: string,
    options?: {
      status?: NoteActionStatus;
      actionType?: NoteActionType;
      limit?: number;
    },
  ): Promise<PendingNoteAction[]> {
    return this.prisma.pendingNoteAction.findMany({
      where: {
        userId,
        ...(options?.status && { status: options.status }),
        ...(options?.actionType && { actionType: options.actionType }),
      },
      include: {
        note: {
          select: { id: true, title: true, body: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Approve a single action
   */
  async approveAction(actionId: string, userId: string): Promise<PendingNoteAction> {
    const action = await this.prisma.pendingNoteAction.findFirst({
      where: { id: actionId, userId },
      include: { note: true },
    });

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    if (action.status !== NoteActionStatus.PENDING) {
      throw new BadRequestException(`Action ${actionId} is not pending (status: ${action.status})`);
    }

    // Mark as approved and execute
    const updated = await this.prisma.pendingNoteAction.update({
      where: { id: actionId },
      data: { status: NoteActionStatus.APPROVED },
    });

    // Execute the action
    await this.executeAction(updated, userId);

    const result = await this.prisma.pendingNoteAction.findUnique({
      where: { id: actionId },
    });

    if (!result) {
      throw new NotFoundException(`Action ${actionId} not found after execution`);
    }

    return result;
  }

  /**
   * Reject a single action
   */
  async rejectAction(actionId: string, userId: string): Promise<PendingNoteAction> {
    const action = await this.prisma.pendingNoteAction.findFirst({
      where: { id: actionId, userId },
    });

    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found`);
    }

    if (action.status !== NoteActionStatus.PENDING) {
      throw new BadRequestException(`Action ${actionId} is not pending`);
    }

    return this.prisma.pendingNoteAction.update({
      where: { id: actionId },
      data: { status: NoteActionStatus.REJECTED },
    });
  }

  /**
   * Bulk approve/reject actions
   */
  async bulkProcessActions(
    actionIds: string[],
    userId: string,
    approve: boolean,
  ): Promise<{ processed: number; failed: number; results: any[] }> {
    const results: any[] = [];
    let processed = 0;
    let failed = 0;

    for (const actionId of actionIds) {
      try {
        if (approve) {
          await this.approveAction(actionId, userId);
        } else {
          await this.rejectAction(actionId, userId);
        }
        processed++;
        results.push({ actionId, success: true });
      } catch (error) {
        failed++;
        results.push({ actionId, success: false, error: error.message });
      }
    }

    // Check if all actions for the note are processed
    for (const actionId of actionIds) {
      const action = await this.prisma.pendingNoteAction.findUnique({
        where: { id: actionId },
        select: { noteId: true },
      });

      if (action) {
        await this.checkAndUpdateNoteStatus(action.noteId);
      }
    }

    return { processed, failed, results };
  }

  /**
   * Execute an approved action
   */
  private async executeAction(action: PendingNoteAction, userId: string): Promise<void> {
    this.logger.log(`Executing action ${action.id} (${action.actionType})`);

    await this.prisma.pendingNoteAction.update({
      where: { id: action.id },
      data: { status: NoteActionStatus.EXECUTING },
    });

    let result: ExecutionResult;

    try {
      switch (action.actionType) {
        case NoteActionType.CREATE_TASK:
          result = await this.executeCreateTask(action, userId);
          break;

        case NoteActionType.UPDATE_OPPORTUNITY:
          result = await this.executeUpdateOpportunity(action, userId);
          break;

        case NoteActionType.UPDATE_LEAD:
          result = await this.executeUpdateLead(action, userId);
          break;

        case NoteActionType.UPDATE_ACCOUNT:
          result = await this.executeUpdateAccount(action, userId);
          break;

        case NoteActionType.UPDATE_CONTACT:
          result = await this.executeUpdateContact(action, userId);
          break;

        case NoteActionType.LINK_TO_ENTITY:
          result = await this.executeLinkToEntity(action);
          break;

        case NoteActionType.SYNC_TO_SALESFORCE:
          result = await this.executeSyncToSalesforce(action, userId);
          break;

        default:
          result = { success: false, message: `Unknown action type: ${action.actionType}` };
      }

      // Update action with result
      await this.prisma.pendingNoteAction.update({
        where: { id: action.id },
        data: {
          status: result.success ? NoteActionStatus.COMPLETED : NoteActionStatus.FAILED,
          executedAt: new Date(),
          executionResult: result as any,
          salesforceId: result.salesforceId,
          errorMessage: result.error,
        },
      });

      this.logger.log(`Action ${action.id} ${result.success ? 'completed' : 'failed'}: ${result.message}`);

    } catch (error) {
      this.logger.error(`Action ${action.id} execution error: ${error.message}`);

      await this.prisma.pendingNoteAction.update({
        where: { id: action.id },
        data: {
          status: NoteActionStatus.FAILED,
          executedAt: new Date(),
          errorMessage: error.message,
        },
      });
    }
  }

  /**
   * Execute CREATE_TASK action
   */
  private async executeCreateTask(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    const taskData = action.proposedValue as any;

    // Get note to link task to same entities
    const note = await this.prisma.note.findUnique({
      where: { id: action.noteId },
      select: { leadId: true, accountId: true, contactId: true, opportunityId: true },
    });

    // Map priority string to enum
    let priority: TaskPriority = TaskPriority.NORMAL;
    if (taskData.priority === 'HIGH') priority = TaskPriority.HIGH;
    else if (taskData.priority === 'LOW') priority = TaskPriority.LOW;
    else if (taskData.priority === 'URGENT') priority = TaskPriority.URGENT;

    // Parse due date
    let dueDate: Date | undefined;
    if (taskData.dueDate) {
      dueDate = new Date(taskData.dueDate);
    }

    const task = await this.prisma.task.create({
      data: {
        subject: taskData.subject || 'Follow-up from note',
        description: taskData.description || `Auto-generated from note intelligence`,
        status: TaskStatus.NOT_STARTED,
        priority,
        dueDate,
        ownerId: userId,
        assignedToId: userId,
        leadId: note?.leadId,
        accountId: note?.accountId,
        contactId: note?.contactId,
        opportunityId: note?.opportunityId,
      },
    });

    return {
      success: true,
      message: `Created task: ${task.subject}`,
      createdId: task.id,
    };
  }

  /**
   * Execute UPDATE_OPPORTUNITY action
   */
  private async executeUpdateOpportunity(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    const { fieldName, targetEntityId } = action;
    const proposedValue = action.proposedValue as any;

    if (!targetEntityId) {
      return { success: false, message: 'No opportunity ID specified' };
    }

    // Build update data based on field name
    const updateData: any = {};

    switch (fieldName) {
      case 'amount':
        updateData.amount = parseFloat(String(proposedValue).replace(/[^0-9.]/g, ''));
        break;
      case 'closeDate':
        updateData.closeDate = new Date(proposedValue);
        break;
      case 'stage':
        updateData.stage = proposedValue;
        break;
      case 'nextStep':
        updateData.nextStep = proposedValue;
        break;
      case 'probability':
        updateData.probability = parseInt(proposedValue);
        break;
      default:
        return { success: false, message: `Unknown field: ${fieldName}` };
    }

    const updated = await this.prisma.opportunity.update({
      where: { id: targetEntityId },
      data: updateData,
    });

    return {
      success: true,
      message: `Updated opportunity ${fieldName} to ${proposedValue}`,
      createdId: updated.id,
    };
  }

  /**
   * Execute UPDATE_LEAD action
   */
  private async executeUpdateLead(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    const { fieldName, targetEntityId } = action;
    const proposedValue = action.proposedValue;

    if (!targetEntityId) {
      return { success: false, message: 'No lead ID specified' };
    }

    const updateData: any = {};

    switch (fieldName) {
      case 'status':
        updateData.status = proposedValue;
        break;
      case 'rating':
        updateData.rating = proposedValue;
        break;
      case 'estimatedBudget':
        updateData.estimatedBudget = parseFloat(String(proposedValue).replace(/[^0-9.]/g, ''));
        break;
      default:
        return { success: false, message: `Unknown field: ${fieldName}` };
    }

    const updated = await this.prisma.lead.update({
      where: { id: targetEntityId },
      data: updateData,
    });

    return {
      success: true,
      message: `Updated lead ${fieldName} to ${proposedValue}`,
      createdId: updated.id,
    };
  }

  /**
   * Execute UPDATE_ACCOUNT action
   */
  private async executeUpdateAccount(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    const { fieldName, targetEntityId } = action;
    const proposedValue = action.proposedValue;

    if (!targetEntityId) {
      return { success: false, message: 'No account ID specified' };
    }

    const updateData: any = {};

    switch (fieldName) {
      case 'industry':
        updateData.industry = proposedValue;
        break;
      case 'type':
        updateData.type = proposedValue;
        break;
      case 'annualRevenue':
        updateData.annualRevenue = parseFloat(String(proposedValue).replace(/[^0-9.]/g, ''));
        break;
      default:
        return { success: false, message: `Unknown field: ${fieldName}` };
    }

    const updated = await this.prisma.account.update({
      where: { id: targetEntityId },
      data: updateData,
    });

    return {
      success: true,
      message: `Updated account ${fieldName}`,
      createdId: updated.id,
    };
  }

  /**
   * Execute UPDATE_CONTACT action
   */
  private async executeUpdateContact(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    const { fieldName, targetEntityId } = action;
    const proposedValue = action.proposedValue;

    if (!targetEntityId) {
      return { success: false, message: 'No contact ID specified' };
    }

    const updateData: any = {};

    switch (fieldName) {
      case 'title':
        updateData.title = proposedValue;
        break;
      case 'department':
        updateData.department = proposedValue;
        break;
      default:
        return { success: false, message: `Unknown field: ${fieldName}` };
    }

    const updated = await this.prisma.contact.update({
      where: { id: targetEntityId },
      data: updateData,
    });

    return {
      success: true,
      message: `Updated contact ${fieldName}`,
      createdId: updated.id,
    };
  }

  /**
   * Execute LINK_TO_ENTITY action
   */
  private async executeLinkToEntity(action: PendingNoteAction): Promise<ExecutionResult> {
    const { targetEntity, targetEntityId } = action;

    if (!targetEntityId) {
      return { success: false, message: 'No entity ID specified for linking' };
    }

    const updateData: any = {};

    switch (targetEntity) {
      case 'lead':
        updateData.leadId = targetEntityId;
        break;
      case 'account':
        updateData.accountId = targetEntityId;
        break;
      case 'contact':
        updateData.contactId = targetEntityId;
        break;
      case 'opportunity':
        updateData.opportunityId = targetEntityId;
        break;
      default:
        return { success: false, message: `Unknown entity type: ${targetEntity}` };
    }

    await this.prisma.note.update({
      where: { id: action.noteId },
      data: updateData,
    });

    return {
      success: true,
      message: `Linked note to ${targetEntity}`,
    };
  }

  /**
   * Execute SYNC_TO_SALESFORCE action
   * Note: Full implementation requires SalesforceService injection
   */
  private async executeSyncToSalesforce(action: PendingNoteAction, userId: string): Promise<ExecutionResult> {
    // This would integrate with SalesforceService to create ContentNote
    // For now, we'll mark it as a placeholder that can be extended
    this.logger.log(`Salesforce sync for note ${action.noteId} - requires SalesforceService integration`);

    return {
      success: false,
      message: 'Salesforce sync not yet implemented - requires ContentNote API integration',
    };
  }

  /**
   * Check if all actions are processed and update note status
   */
  private async checkAndUpdateNoteStatus(noteId: string): Promise<void> {
    const pendingCount = await this.prisma.pendingNoteAction.count({
      where: {
        noteId,
        status: NoteActionStatus.PENDING,
      },
    });

    if (pendingCount === 0) {
      await this.prisma.note.update({
        where: { id: noteId },
        data: { processingStatus: NoteProcessingStatus.COMPLETED },
      });
    }
  }

  /**
   * Get action statistics for a user
   */
  async getActionStats(userId: string): Promise<{
    pending: number;
    completed: number;
    rejected: number;
    failed: number;
  }> {
    const [pending, completed, rejected, failed] = await Promise.all([
      this.prisma.pendingNoteAction.count({ where: { userId, status: NoteActionStatus.PENDING } }),
      this.prisma.pendingNoteAction.count({ where: { userId, status: NoteActionStatus.COMPLETED } }),
      this.prisma.pendingNoteAction.count({ where: { userId, status: NoteActionStatus.REJECTED } }),
      this.prisma.pendingNoteAction.count({ where: { userId, status: NoteActionStatus.FAILED } }),
    ]);

    return { pending, completed, rejected, failed };
  }
}
