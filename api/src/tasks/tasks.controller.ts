import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { SalesforceService } from '../salesforce/salesforce.service';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

// Map human-readable status names to Prisma enum values
const STATUS_NAME_MAP: Record<string, TaskStatus> = {
  'pending': TaskStatus.NOT_STARTED,
  'not started': TaskStatus.NOT_STARTED,
  'open': TaskStatus.NOT_STARTED,
  'in progress': TaskStatus.IN_PROGRESS,
  'in_progress': TaskStatus.IN_PROGRESS,
  'working': TaskStatus.IN_PROGRESS,
  'waiting': TaskStatus.WAITING,
  'on hold': TaskStatus.WAITING,
  'deferred': TaskStatus.DEFERRED,
  'completed': TaskStatus.COMPLETED,
  'done': TaskStatus.COMPLETED,
  'closed': TaskStatus.COMPLETED,
};

function parseTaskStatus(status?: string): TaskStatus | undefined {
  if (!status) return undefined;

  // Check if it's already a valid enum value
  if (Object.values(TaskStatus).includes(status as TaskStatus)) {
    return status as TaskStatus;
  }

  // Try to map from human-readable name
  const normalized = status.toLowerCase().trim();
  return STATUS_NAME_MAP[normalized];
}

@ApiTags('Tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly salesforceService: SalesforceService,
  ) {}

  @Post()
  create(
    @Request() req,
    @Body() createDto: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.createTask(createDto, userId, organizationId);
  }

  @Get()
  async findAll(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('assignedToId') assignedToId?: string,
    @Query('leadId') leadId?: string,
    @Query('accountId') accountId?: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('overdue') overdue?: string,
    @Query('source') source?: string,
  ) {
    const ownerId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';

    // If source=salesforce, fetch from Salesforce instead
    if (source === 'salesforce') {
      try {
        const result = await this.salesforceService.query(
          ownerId,
          `SELECT Id, Subject, Description, Status, Priority, ActivityDate, OwnerId, WhoId, WhatId, CreatedDate
           FROM Task
           ORDER BY ActivityDate ASC NULLS LAST
           LIMIT 100`
        );
        // Transform Salesforce tasks to match local format
        return (result.records || []).map((task: any) => ({
          id: task.Id,
          subject: task.Subject,
          description: task.Description,
          status: task.Status,
          priority: task.Priority,
          dueDate: task.ActivityDate,
          ownerId: task.OwnerId,
          leadId: task.WhoId?.startsWith('00Q') ? task.WhoId : null,
          contactId: task.WhoId?.startsWith('003') ? task.WhoId : null,
          accountId: task.WhatId?.startsWith('001') ? task.WhatId : null,
          opportunityId: task.WhatId?.startsWith('006') ? task.WhatId : null,
          createdAt: task.CreatedDate,
          source: 'salesforce',
        }));
      } catch (error) {
        // Log error without exposing sensitive details
        this.logger.error(`Failed to fetch Salesforce tasks for userId: ${ownerId}`, error instanceof Error ? error.message : 'Unknown error');
        return [];
      }
    }

    return this.tasksService.listTasks(organizationId, {
      status: parseTaskStatus(status),
      priority,
      ownerId,
      assignedToId: assignedToId || undefined,  // Only filter by assignedToId if explicitly provided
      leadId,
      accountId,
      contactId,
      opportunityId,
      overdue: overdue === 'true',
    }, isAdmin);
  }

  @Get('stats')
  getStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user.userId;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.getTaskStats(organizationId, userId, isAdmin);
  }

  @Get(':id')
  findOne(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.getTask(id, req.user.userId, organizationId, isAdmin);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.updateTask(id, req.user.userId, updateDto, organizationId, isAdmin);
  }

  @Post(':id/complete')
  complete(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.completeTask(id, req.user.userId, organizationId, isAdmin);
  }

  @Delete(':id')
  remove(
    @Request() req,
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.tasksService.deleteTask(id, req.user.userId, organizationId, isAdmin);
  }
}
