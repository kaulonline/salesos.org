import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SalesOSEmailService } from '../email/salesos-email.service';
import { TaskPriority, ActivityType, Prisma } from '@prisma/client';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  TriggerWorkflowDto,
  WorkflowListQueryDto,
  ExecutionListQueryDto,
  WorkflowResponse,
  WorkflowExecutionResponse,
  WorkflowStats,
  WorkflowStatus,
  WorkflowExecutionStatus,
  WorkflowTriggerType,
  WorkflowEntityType,
  WorkflowActionType,
  ConditionOperator,
  WorkflowCondition,
  WorkflowAction,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: SalesOSEmailService,
  ) {}

  /**
   * Create a new workflow
   */
  async create(userId: string, dto: CreateWorkflowDto): Promise<WorkflowResponse> {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: 'DRAFT',
        triggerType: dto.triggerType,
        triggerEntity: dto.triggerEntity,
        triggerConfig: (dto.triggerConfig || {}) as Prisma.InputJsonValue,
        conditions: (dto.conditions || []) as unknown as Prisma.InputJsonValue,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
        runOnce: dto.runOnce ?? false,
        delayMinutes: dto.delayMinutes ?? 0,
        createdById: userId,
      },
    });

    return this.mapWorkflowToResponse(workflow);
  }

  /**
   * Get all workflows
   */
  async findAll(query: WorkflowListQueryDto): Promise<{ workflows: WorkflowResponse[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.triggerType) {
      where.triggerType = query.triggerType;
    }
    if (query.triggerEntity) {
      where.triggerEntity = query.triggerEntity;
    }

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
        include: {
          _count: {
            select: { executions: true },
          },
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      workflows: workflows.map((w) => this.mapWorkflowToResponse(w)),
      total,
    };
  }

  /**
   * Get workflow by ID
   */
  async findOne(id: string): Promise<WorkflowResponse> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        _count: {
          select: { executions: true },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return this.mapWorkflowToResponse(workflow);
  }

  /**
   * Update a workflow
   */
  async update(id: string, userId: string, dto: UpdateWorkflowDto): Promise<WorkflowResponse> {
    const existing = await this.prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const workflow = await this.prisma.workflow.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.triggerType && { triggerType: dto.triggerType }),
        ...(dto.triggerEntity && { triggerEntity: dto.triggerEntity }),
        ...(dto.triggerConfig && { triggerConfig: dto.triggerConfig as Prisma.InputJsonValue }),
        ...(dto.conditions && { conditions: dto.conditions as unknown as Prisma.InputJsonValue }),
        ...(dto.actions && { actions: dto.actions as unknown as Prisma.InputJsonValue }),
        ...(dto.runOnce !== undefined && { runOnce: dto.runOnce }),
        ...(dto.delayMinutes !== undefined && { delayMinutes: dto.delayMinutes }),
        lastModifiedById: userId,
      },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    return this.mapWorkflowToResponse(workflow);
  }

  /**
   * Delete a workflow
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.workflow.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    await this.prisma.workflow.delete({ where: { id } });
  }

  /**
   * Activate a workflow
   */
  async activate(id: string, userId: string): Promise<WorkflowResponse> {
    return this.update(id, userId, { status: WorkflowStatus.ACTIVE });
  }

  /**
   * Deactivate a workflow
   */
  async deactivate(id: string, userId: string): Promise<WorkflowResponse> {
    return this.update(id, userId, { status: WorkflowStatus.INACTIVE });
  }

  /**
   * Manually trigger a workflow
   */
  async triggerManually(dto: TriggerWorkflowDto, userId: string): Promise<WorkflowExecutionResponse> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${dto.workflowId} not found`);
    }

    if (workflow.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot trigger an inactive workflow');
    }

    // Create execution record
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId: dto.workflowId,
        status: 'PENDING',
        triggeredBy: userId,
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      include: {
        workflow: {
          select: { name: true },
        },
      },
    });

    // Execute the workflow asynchronously
    this.executeWorkflow(execution.id, workflow, dto.entityType, dto.entityId, dto.context || {});

    return this.mapExecutionToResponse(execution);
  }

  /**
   * Process trigger event from other services
   */
  async processTrigger(
    triggerType: WorkflowTriggerType,
    entityType: WorkflowEntityType,
    entityId: string,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    // Find all active workflows matching this trigger
    const workflows = await this.prisma.workflow.findMany({
      where: {
        status: 'ACTIVE',
        triggerType,
        triggerEntity: entityType,
      },
    });

    for (const workflow of workflows) {
      // Check if conditions match
      const conditionsMet = await this.evaluateConditions(
        workflow.conditions as unknown as WorkflowCondition[],
        entityType,
        entityId,
        context,
      );

      if (!conditionsMet) {
        continue;
      }

      // Check runOnce constraint
      if (workflow.runOnce) {
        const existingExecution = await this.prisma.workflowExecution.findFirst({
          where: {
            workflowId: workflow.id,
            entityType,
            entityId,
            status: { in: ['COMPLETED', 'RUNNING'] },
          },
        });

        if (existingExecution) {
          this.logger.debug(`Skipping workflow ${workflow.id} - already executed for ${entityType}:${entityId}`);
          continue;
        }
      }

      // Create execution record
      const execution = await this.prisma.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          status: 'PENDING',
          triggeredBy: 'SYSTEM',
          entityType,
          entityId,
        },
      });

      // Handle delay
      if (workflow.delayMinutes > 0) {
        // In production, this would use a job queue like Bull
        setTimeout(
          () => this.executeWorkflow(execution.id, workflow, entityType, entityId, context),
          workflow.delayMinutes * 60 * 1000,
        );
      } else {
        this.executeWorkflow(execution.id, workflow, entityType, entityId, context);
      }
    }
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(
    executionId: string,
    workflow: { id: string; actions: unknown },
    entityType: string,
    entityId: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Update status to running
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Get the entity data
      const entityData = await this.getEntityData(entityType, entityId);
      if (!entityData) {
        throw new Error(`Entity ${entityType}:${entityId} not found`);
      }

      const actions = workflow.actions as unknown as WorkflowAction[];
      const actionResults: unknown[] = [];

      // Execute each action
      for (const action of actions) {
        try {
          const result = await this.executeAction(action, entityType, entityId, entityData, context);
          actionResults.push({ type: action.type, success: true, result });
        } catch (error) {
          actionResults.push({
            type: action.type,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.logger.error(`Action ${action.type} failed:`, error);
        }
      }

      // Update execution as completed
      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionResults: actionResults as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Workflow execution ${executionId} failed:`, error);

      await this.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: WorkflowCondition[] | null,
    entityType: string,
    entityId: string,
    context: Record<string, unknown>,
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const entityData = await this.getEntityData(entityType, entityId);
    if (!entityData) {
      return false;
    }

    // Merge entity data with context
    const data = { ...entityData, ...context };

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(data, condition.field);
      const conditionValue = condition.value;

      let matches = false;

      switch (condition.operator) {
        case ConditionOperator.EQUALS:
          matches = fieldValue === conditionValue;
          break;
        case ConditionOperator.NOT_EQUALS:
          matches = fieldValue !== conditionValue;
          break;
        case ConditionOperator.CONTAINS:
          matches =
            typeof fieldValue === 'string' &&
            typeof conditionValue === 'string' &&
            fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
          break;
        case ConditionOperator.NOT_CONTAINS:
          matches =
            typeof fieldValue === 'string' &&
            typeof conditionValue === 'string' &&
            !fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
          break;
        case ConditionOperator.STARTS_WITH:
          matches =
            typeof fieldValue === 'string' &&
            typeof conditionValue === 'string' &&
            fieldValue.toLowerCase().startsWith(conditionValue.toLowerCase());
          break;
        case ConditionOperator.ENDS_WITH:
          matches =
            typeof fieldValue === 'string' &&
            typeof conditionValue === 'string' &&
            fieldValue.toLowerCase().endsWith(conditionValue.toLowerCase());
          break;
        case ConditionOperator.GREATER_THAN:
          matches = Number(fieldValue) > Number(conditionValue);
          break;
        case ConditionOperator.LESS_THAN:
          matches = Number(fieldValue) < Number(conditionValue);
          break;
        case ConditionOperator.GREATER_THAN_OR_EQUAL:
          matches = Number(fieldValue) >= Number(conditionValue);
          break;
        case ConditionOperator.LESS_THAN_OR_EQUAL:
          matches = Number(fieldValue) <= Number(conditionValue);
          break;
        case ConditionOperator.IS_EMPTY:
          matches = fieldValue === null || fieldValue === undefined || fieldValue === '';
          break;
        case ConditionOperator.IS_NOT_EMPTY:
          matches = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
          break;
        case ConditionOperator.CHANGED:
          matches = !!(context.changedFields && Array.isArray(context.changedFields) && context.changedFields.includes(condition.field));
          break;
        case ConditionOperator.CHANGED_TO:
          matches = !!(
            context.changedFields &&
            Array.isArray(context.changedFields) &&
            context.changedFields.includes(condition.field) &&
            fieldValue === conditionValue
          );
          break;
        case ConditionOperator.CHANGED_FROM:
          matches = !!(
            context.previousValues &&
            typeof context.previousValues === 'object' &&
            (context.previousValues as Record<string, unknown>)[condition.field] === conditionValue
          );
          break;
        default:
          matches = false;
      }

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    const config = action.config as Record<string, unknown>;

    switch (action.type) {
      case WorkflowActionType.UPDATE_FIELD:
        return this.executeUpdateField(entityType, entityId, config);

      case WorkflowActionType.CREATE_TASK:
        return this.executeCreateTask(entityType, entityId, entityData, config);

      case WorkflowActionType.SEND_NOTIFICATION:
        return this.executeSendNotification(entityData, config);

      case WorkflowActionType.ASSIGN_OWNER:
        return this.executeAssignOwner(entityType, entityId, config);

      case WorkflowActionType.CREATE_ACTIVITY:
        return this.executeCreateActivity(entityType, entityId, config);

      case WorkflowActionType.SEND_EMAIL:
        return this.executeSendEmail(entityData, config);

      case WorkflowActionType.WEBHOOK_CALL:
        return this.executeWebhookCall(entityData, config);

      case WorkflowActionType.ADD_TAG:
      case WorkflowActionType.REMOVE_TAG:
        // Tags would require a tags system
        this.logger.log(`Tag action: ${action.type} - ${JSON.stringify(config)}`);
        return { success: true };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute UPDATE_FIELD action
   */
  private async executeUpdateField(
    entityType: string,
    entityId: string,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { fieldName, value } = config;

    const model = this.getEntityModel(entityType);
    if (!model) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const updated = await (this.prisma[model] as any).update({
      where: { id: entityId },
      data: { [fieldName as string]: value },
    });

    return { fieldName, value, updated: true };
  }

  /**
   * Execute CREATE_TASK action
   */
  private async executeCreateTask(
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { subject, description, dueInDays, priority, assignToOwner, assignToUserId } = config;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (Number(dueInDays) || 3));

    const ownerId =
      assignToOwner && entityData.ownerId
        ? entityData.ownerId
        : assignToUserId || (entityData.ownerId as string);

    const taskPriority = (priority as string) || 'NORMAL';
    const validPriority = Object.values(TaskPriority).includes(taskPriority as TaskPriority)
      ? (taskPriority as TaskPriority)
      : TaskPriority.NORMAL;

    const task = await this.prisma.task.create({
      data: {
        subject: this.interpolateString(subject as string, entityData),
        description: description ? this.interpolateString(description as string, entityData) : null,
        dueDate,
        priority: validPriority,
        status: 'NOT_STARTED',
        ownerId: ownerId as string,
        ...(entityType === 'LEAD' && { leadId: entityId }),
        ...(entityType === 'CONTACT' && { contactId: entityId }),
        ...(entityType === 'ACCOUNT' && { accountId: entityId }),
        ...(entityType === 'OPPORTUNITY' && { opportunityId: entityId }),
      },
    });

    return { taskId: task.id, subject: task.subject };
  }

  /**
   * Execute SEND_EMAIL action
   */
  private async executeSendEmail(
    entityData: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { emailType, to, subject, customMessage } = config;

    // Determine recipient email
    let recipientEmail = to as string;
    if (!recipientEmail || recipientEmail === '{{email}}') {
      recipientEmail = entityData.email as string;
    }

    if (!recipientEmail) {
      this.logger.warn('Cannot send email: no recipient email address');
      return { sent: false, reason: 'No recipient email address' };
    }

    // Get recipient name
    const recipientName = entityData.firstName
      ? `${entityData.firstName} ${entityData.lastName || ''}`.trim()
      : (entityData.name as string) || 'there';

    try {
      // Route to appropriate email template based on emailType
      switch (emailType) {
        case 'welcome':
        case 'WELCOME':
          await this.emailService.sendWelcomeEmail({
            to: recipientEmail,
            userName: recipientName,
          });
          break;

        case 'lead_assigned':
        case 'LEAD_ASSIGNED':
          await this.emailService.sendLeadAssignedEmail({
            to: recipientEmail,
            userName: recipientName,
            leadName: `${entityData.firstName || ''} ${entityData.lastName || ''}`.trim(),
            leadEmail: entityData.email as string,
            leadCompany: entityData.company as string,
            leadSource: entityData.leadSource as string,
            leadId: entityData.id as string,
          });
          break;

        case 'follow_up_reminder':
        case 'FOLLOW_UP_REMINDER':
          await this.emailService.sendFollowUpReminderEmail({
            to: recipientEmail,
            userName: recipientName,
            contactName: `${entityData.firstName || ''} ${entityData.lastName || ''}`.trim(),
            contactEmail: entityData.email as string,
            contactCompany: entityData.company as string,
            daysSinceContact: 3,
            suggestedAction: customMessage as string || 'Schedule a follow-up call',
            contactId: entityData.id as string,
          });
          break;

        case 'task_reminder':
        case 'TASK_REMINDER':
          await this.emailService.sendTaskReminderEmail({
            to: recipientEmail,
            userName: recipientName,
            taskTitle: (entityData.subject || entityData.title || 'Task') as string,
            taskDescription: entityData.description as string,
            dueDate: new Date().toLocaleDateString(),
            relatedTo: entityData.company ? { type: 'Company', name: entityData.company as string } : undefined,
            taskId: entityData.id as string,
          });
          break;

        case 'deal_won':
        case 'DEAL_WON':
          await this.emailService.sendDealWonEmail({
            to: recipientEmail,
            userName: recipientName,
            dealName: entityData.name as string || 'Deal',
            dealValue: `$${entityData.amount || 0}`,
            contactName: 'Contact',
            companyName: entityData.accountName as string || 'Account',
            closedDate: new Date().toLocaleDateString(),
            dealId: entityData.id as string,
          });
          break;

        case 'deal_lost':
        case 'DEAL_LOST':
          await this.emailService.sendDealLostEmail({
            to: recipientEmail,
            userName: recipientName,
            dealName: entityData.name as string || 'Deal',
            dealValue: `$${entityData.amount || 0}`,
            contactName: 'Contact',
            companyName: entityData.accountName as string || 'Account',
            lostReason: entityData.lostReason as string,
            dealId: entityData.id as string,
          });
          break;

        default:
          // Generic welcome email as fallback
          this.logger.log(`Sending default welcome email for type: ${emailType}`);
          await this.emailService.sendWelcomeEmail({
            to: recipientEmail,
            userName: recipientName,
          });
      }

      this.logger.log(`Email sent successfully to ${recipientEmail} (type: ${emailType})`);
      return { sent: true, to: recipientEmail, emailType };
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipientEmail}:`, error);
      return { sent: false, reason: error.message, to: recipientEmail };
    }
  }

  /**
   * Execute SEND_NOTIFICATION action
   */
  private async executeSendNotification(
    entityData: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { title, message, notifyOwner, notifyUserIds } = config;

    const userIds: string[] = [];

    if (notifyOwner && entityData.ownerId) {
      userIds.push(entityData.ownerId as string);
    }

    if (notifyUserIds && Array.isArray(notifyUserIds)) {
      userIds.push(...notifyUserIds);
    }

    // In production, this would create notifications via NotificationsModule
    this.logger.log(`Would notify users ${userIds.join(', ')}: ${title} - ${message}`);

    return { notified: userIds.length, userIds };
  }

  /**
   * Execute ASSIGN_OWNER action
   */
  private async executeAssignOwner(
    entityType: string,
    entityId: string,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId, roundRobin, roundRobinUserIds } = config;

    let assigneeId = userId as string;

    if (roundRobin && roundRobinUserIds && Array.isArray(roundRobinUserIds)) {
      // Simple round-robin: pick based on current time
      const index = Date.now() % roundRobinUserIds.length;
      assigneeId = roundRobinUserIds[index];
    }

    const model = this.getEntityModel(entityType);
    if (!model) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    await (this.prisma[model] as any).update({
      where: { id: entityId },
      data: { ownerId: assigneeId },
    });

    return { assignedTo: assigneeId };
  }

  /**
   * Execute CREATE_ACTIVITY action
   */
  private async executeCreateActivity(
    entityType: string,
    entityId: string,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { type, subject, description } = config;

    const activityTypeValue = (type as string) || 'INTERNAL_NOTE';
    const validActivityType = Object.values(ActivityType).includes(activityTypeValue as ActivityType)
      ? (activityTypeValue as ActivityType)
      : ActivityType.INTERNAL_NOTE;

    // Get the owner from entity data to use as userId
    const entityData = await this.getEntityData(entityType, entityId);
    const userId = (entityData?.ownerId as string) || (entityData?.userId as string);

    if (!userId) {
      throw new Error('Cannot create activity: no user ID available');
    }

    const activity = await this.prisma.activity.create({
      data: {
        type: validActivityType,
        subject: subject as string,
        description: (description as string) || null,
        userId,
        activityDate: new Date(),
        ...(entityType === 'LEAD' && { leadId: entityId }),
        ...(entityType === 'CONTACT' && { contactId: entityId }),
        ...(entityType === 'ACCOUNT' && { accountId: entityId }),
        ...(entityType === 'OPPORTUNITY' && { opportunityId: entityId }),
      },
    });

    return { activityId: activity.id };
  }

  /**
   * Execute WEBHOOK_CALL action
   */
  private async executeWebhookCall(
    entityData: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    const { url, method, headers, includeRecordData } = config;

    const body = includeRecordData ? JSON.stringify(entityData) : undefined;

    try {
      const response = await fetch(url as string, {
        method: (method as string) || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>),
        },
        body,
      });

      return {
        status: response.status,
        success: response.ok,
      };
    } catch (error) {
      throw new Error(`Webhook call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get entity data by type and ID
   */
  private async getEntityData(entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    const model = this.getEntityModel(entityType);
    if (!model) {
      return null;
    }

    return (this.prisma[model] as any).findUnique({
      where: { id: entityId },
    });
  }

  /**
   * Get Prisma model name for entity type
   */
  private getEntityModel(entityType: string): string | null {
    const modelMap: Record<string, string> = {
      LEAD: 'lead',
      CONTACT: 'contact',
      ACCOUNT: 'account',
      OPPORTUNITY: 'opportunity',
      TASK: 'task',
    };

    return modelMap[entityType] || null;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  /**
   * Interpolate string with entity data
   */
  private interpolateString(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  /**
   * Get workflow execution history
   */
  async getExecutions(query: ExecutionListQueryDto): Promise<{ executions: WorkflowExecutionResponse[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (query.workflowId) {
      where.workflowId = query.workflowId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }

    const [executions, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
        include: {
          workflow: {
            select: { name: true },
          },
        },
      }),
      this.prisma.workflowExecution.count({ where }),
    ]);

    return {
      executions: executions.map((e) => this.mapExecutionToResponse(e)),
      total,
    };
  }

  /**
   * Get workflow statistics
   */
  async getStats(): Promise<WorkflowStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      executionsToday,
    ] = await Promise.all([
      this.prisma.workflow.count(),
      this.prisma.workflow.count({ where: { status: 'ACTIVE' } }),
      this.prisma.workflowExecution.count(),
      this.prisma.workflowExecution.count({ where: { status: 'COMPLETED' } }),
      this.prisma.workflowExecution.count({ where: { status: 'FAILED' } }),
      this.prisma.workflowExecution.count({ where: { createdAt: { gte: today } } }),
    ]);

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      executionsToday,
    };
  }

  /**
   * Map workflow to response
   */
  private mapWorkflowToResponse(workflow: any): WorkflowResponse {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status as WorkflowStatus,
      triggerType: workflow.triggerType as WorkflowTriggerType,
      triggerEntity: workflow.triggerEntity as WorkflowEntityType,
      triggerConfig: workflow.triggerConfig as Record<string, unknown>,
      conditions: workflow.conditions as WorkflowCondition[],
      actions: workflow.actions as WorkflowAction[],
      runOnce: workflow.runOnce,
      delayMinutes: workflow.delayMinutes,
      createdById: workflow.createdById,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      executionCount: workflow._count?.executions,
      lastExecutedAt: workflow.executions?.[0]?.createdAt,
    };
  }

  /**
   * Map execution to response
   */
  private mapExecutionToResponse(execution: any): WorkflowExecutionResponse {
    return {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflow?.name || 'Unknown',
      status: execution.status as WorkflowExecutionStatus,
      triggeredBy: execution.triggeredBy,
      entityType: execution.entityType,
      entityId: execution.entityId,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      actionResults: execution.actionResults,
      errorMessage: execution.errorMessage,
      createdAt: execution.createdAt,
    };
  }
}
