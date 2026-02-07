import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { Task, TaskStatus, TaskPriority, Prisma } from '@prisma/client';
import { validateCrmForeignKeys } from '../common/validators/foreign-key.validator';

interface CreateTaskDto {
  subject: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  reminderDate?: Date;
  assignedToId?: string;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
}

interface UpdateTaskDto extends Partial<CreateTaskDto> {}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  // Create task
  async createTask(data: CreateTaskDto, ownerId: string, organizationId: string): Promise<Task> {
    this.logger.log(`Creating task: ${data.subject}`);

    // Validate all foreign key IDs are in correct format (not Salesforce IDs)
    validateCrmForeignKeys(data);

    const assignedToId = data.assignedToId || ownerId;

    const task = await this.prisma.task.create({
      data: {
        subject: data.subject,
        description: data.description,
        status: data.status || TaskStatus.NOT_STARTED,
        priority: data.priority || TaskPriority.NORMAL,
        dueDate: data.dueDate,
        reminderDate: data.reminderDate,
        ownerId,
        assignedToId,
        leadId: data.leadId,
        accountId: data.accountId,
        contactId: data.contactId,
        opportunityId: data.opportunityId,
        organizationId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send Task Assigned notification if assigned to someone other than the owner
    if (assignedToId !== ownerId) {
      const dueDate = data.dueDate ? new Date(data.dueDate) : null;
      const dueInfo = dueDate ? ` - Due: ${dueDate.toLocaleDateString()}` : '';
      const priorityInfo = data.priority && data.priority !== TaskPriority.NORMAL ? ` [${data.priority}]` : '';

      this.notificationScheduler.sendSystemNotification(
        assignedToId,
        '📋 New Task Assigned',
        `"${data.subject}"${priorityInfo}${dueInfo}`,
        {
          type: 'TASK_REMINDER',
          priority: data.priority === TaskPriority.HIGH || data.priority === TaskPriority.URGENT ? 'HIGH' : 'NORMAL',
          action: 'VIEW_TASK',
          actionData: {
            taskId: task.id,
            subject: data.subject,
            priority: data.priority || TaskPriority.NORMAL,
            dueDate: dueDate?.toISOString(),
            assignedBy: (task as any).owner?.name || ownerId,
          },
        },
      ).catch((err) => this.logger.error(`Failed to send Task Assigned notification: ${err.message}`));
    }

    return task;
  }

  // Get task by ID (with ownership verification)
  async getTask(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const task = await this.prisma.task.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        account: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, title: true },
        },
        opportunity: {
          select: { id: true, name: true, stage: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  // List tasks with filtering
  async listTasks(organizationId: string, filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    ownerId?: string;
    assignedToId?: string;
    leadId?: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
    overdue?: boolean;
  }, isAdmin?: boolean): Promise<Task[]> {
    const where: Prisma.TaskWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters?.leadId) {
      where.leadId = filters.leadId;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters?.opportunityId) {
      where.opportunityId = filters.opportunityId;
    }

    if (filters?.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: TaskStatus.COMPLETED };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        account: {
          select: { id: true, name: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        opportunity: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  // Update task (with ownership verification)
  async updateTask(id: string, userId: string, data: UpdateTaskDto, organizationId: string, isAdmin?: boolean): Promise<Task> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const task = await this.prisma.task.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // If completing task, set completed date
    const updateData: Prisma.TaskUpdateInput = { ...data };
    if (data.status === TaskStatus.COMPLETED && !task.completedDate) {
      updateData.completedDate = new Date();
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send Task Reassigned notification if assignedTo changed to a different user
    if (data.assignedToId && data.assignedToId !== task.assignedToId && data.assignedToId !== task.ownerId) {
      const dueInfo = task.dueDate ? ` - Due: ${new Date(task.dueDate).toLocaleDateString()}` : '';
      const priorityInfo = task.priority && task.priority !== TaskPriority.NORMAL ? ` [${task.priority}]` : '';

      this.notificationScheduler.sendSystemNotification(
        data.assignedToId,
        '📋 Task Reassigned to You',
        `"${task.subject}"${priorityInfo}${dueInfo}`,
        {
          type: 'TASK_REMINDER',
          priority: task.priority === TaskPriority.HIGH || task.priority === TaskPriority.URGENT ? 'HIGH' : 'NORMAL',
          action: 'VIEW_TASK',
          actionData: {
            taskId: id,
            subject: task.subject,
            priority: task.priority,
            dueDate: task.dueDate?.toISOString(),
            assignedBy: (task as any).owner?.name || task.ownerId,
          },
        },
      ).catch((err) => this.logger.error(`Failed to send Task Reassigned notification: ${err.message}`));
    }

    return updated;
  }

  // Complete task (with ownership verification)
  async completeTask(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<Task> {
    return this.updateTask(id, userId, {
      status: TaskStatus.COMPLETED,
    }, organizationId, isAdmin);
  }

  // Delete task (with ownership verification)
  async deleteTask(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const task = await this.prisma.task.findFirst({ where });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    await this.prisma.task.delete({ where: { id } });
    this.logger.log(`Deleted task ${id}`);
  }

  // Get task statistics
  async getTaskStats(organizationId: string, userId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.TaskWhereInput = (userId && !isAdmin)
      ? {
          OR: [{ ownerId: userId }, { assignedToId: userId }],
        }
      : {};

    where.organizationId = organizationId;

    const now = new Date();

    const [total, byStatus, byPriority, overdue, dueToday] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { not: TaskStatus.COMPLETED },
          dueDate: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
            lt: new Date(now.setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus,
      byPriority,
      overdue,
      dueToday,
    };
  }
}
