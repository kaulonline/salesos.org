import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PlaybookTrigger,
  PlaybookStepType,
  PlaybookExecutionStatus,
  PlaybookStepStatus,
} from '@prisma/client';

export interface CreatePlaybookDto {
  name: string;
  description?: string;
  trigger: PlaybookTrigger;
  targetStage?: string;
  targetDealType?: string;
  isActive?: boolean;
  steps?: CreatePlaybookStepDto[];
}

export interface UpdatePlaybookDto {
  name?: string;
  description?: string;
  trigger?: PlaybookTrigger;
  targetStage?: string;
  targetDealType?: string;
  isActive?: boolean;
}

export interface CreatePlaybookStepDto {
  type: PlaybookStepType;
  title: string;
  description?: string;
  daysOffset?: number;
  isRequired?: boolean;
  config?: Record<string, any>;
}

export interface UpdatePlaybookStepDto {
  type?: PlaybookStepType;
  title?: string;
  description?: string;
  daysOffset?: number;
  isRequired?: boolean;
  config?: Record<string, any>;
  order?: number;
}

export interface StartPlaybookDto {
  dealId?: string;
  leadId?: string;
  accountId?: string;
}

@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CRUD Operations
  // ============================================

  async findAll(organizationId: string, filters?: { isActive?: boolean; trigger?: PlaybookTrigger }) {
    const where: any = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.trigger) where.trigger = filters.trigger;
    where.organizationId = organizationId;

    return this.prisma.playbook.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        steps: { orderBy: { order: 'asc' } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const where: any = { id };
    where.organizationId = organizationId;

    const playbook = await this.prisma.playbook.findFirst({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        steps: { orderBy: { order: 'asc' } },
        executions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            currentStep: true,
            totalSteps: true,
            successScore: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new NotFoundException('Playbook not found');
    }

    return playbook;
  }

  async create(dto: CreatePlaybookDto, userId: string, organizationId: string) {
    this.logger.log(`Creating playbook: ${dto.name}`);

    const playbook = await this.prisma.playbook.create({
      data: {
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        targetStage: dto.targetStage,
        targetDealType: dto.targetDealType,
        isActive: dto.isActive ?? true,
        createdBy: userId,
        organizationId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Create steps if provided
    if (dto.steps && dto.steps.length > 0) {
      await this.prisma.playbookStep.createMany({
        data: dto.steps.map((step, index) => ({
          playbookId: playbook.id,
          order: index + 1,
          type: step.type,
          title: step.title,
          description: step.description,
          daysOffset: step.daysOffset ?? 0,
          isRequired: step.isRequired ?? false,
          config: step.config || {},
          organizationId,
        })),
      });
    }

    return this.findOne(playbook.id, organizationId);
  }

  async update(id: string, dto: UpdatePlaybookDto, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.playbook.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        targetStage: dto.targetStage,
        targetDealType: dto.targetDealType,
        isActive: dto.isActive,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        steps: { orderBy: { order: 'asc' } },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    // Check if playbook has active executions
    const activeExecutions = await this.prisma.playbookExecution.count({
      where: {
        playbookId: id,
        status: PlaybookExecutionStatus.IN_PROGRESS,
      },
    });

    if (activeExecutions > 0) {
      throw new BadRequestException(
        `Cannot delete playbook with ${activeExecutions} active execution(s). Cancel them first.`,
      );
    }

    await this.prisma.playbook.delete({ where: { id } });

    return { success: true };
  }

  async duplicate(id: string, userId: string, organizationId: string) {
    const original = await this.findOne(id, organizationId);

    const newPlaybook = await this.prisma.playbook.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        trigger: original.trigger,
        targetStage: original.targetStage,
        targetDealType: original.targetDealType,
        isActive: false, // Start as inactive
        createdBy: userId,
        organizationId,
      },
    });

    // Copy steps
    if (original.steps.length > 0) {
      await this.prisma.playbookStep.createMany({
        data: original.steps.map(step => ({
          playbookId: newPlaybook.id,
          order: step.order,
          type: step.type,
          title: step.title,
          description: step.description,
          daysOffset: step.daysOffset,
          isRequired: step.isRequired,
          config: step.config || {},
          organizationId,
        })),
      });
    }

    return this.findOne(newPlaybook.id, organizationId);
  }

  // ============================================
  // Step Management
  // ============================================

  async addStep(playbookId: string, dto: CreatePlaybookStepDto, organizationId: string) {
    const playbook = await this.findOne(playbookId, organizationId);

    // Get the next order number
    const maxOrder = playbook.steps.length > 0
      ? Math.max(...playbook.steps.map(s => s.order))
      : 0;

    await this.prisma.playbookStep.create({
      data: {
        playbookId,
        order: maxOrder + 1,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        daysOffset: dto.daysOffset ?? 0,
        isRequired: dto.isRequired ?? false,
        config: dto.config || {},
      },
    });

    return this.findOne(playbookId, organizationId);
  }

  async updateStep(playbookId: string, stepId: string, dto: UpdatePlaybookStepDto, organizationId: string) {
    await this.findOne(playbookId, organizationId);

    const step = await this.prisma.playbookStep.findFirst({
      where: { id: stepId, playbookId },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    await this.prisma.playbookStep.update({
      where: { id: stepId },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        daysOffset: dto.daysOffset,
        isRequired: dto.isRequired,
        config: dto.config,
        order: dto.order,
      },
    });

    return this.findOne(playbookId, organizationId);
  }

  async deleteStep(playbookId: string, stepId: string, organizationId: string) {
    await this.findOne(playbookId, organizationId);

    const step = await this.prisma.playbookStep.findFirst({
      where: { id: stepId, playbookId },
    });

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    await this.prisma.playbookStep.delete({ where: { id: stepId } });

    // Reorder remaining steps
    const remainingSteps = await this.prisma.playbookStep.findMany({
      where: { playbookId },
      orderBy: { order: 'asc' },
    });

    await Promise.all(
      remainingSteps.map((s, index) =>
        this.prisma.playbookStep.update({
          where: { id: s.id },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findOne(playbookId, organizationId);
  }

  async reorderSteps(playbookId: string, stepIds: string[], organizationId: string) {
    await this.findOne(playbookId, organizationId);

    await Promise.all(
      stepIds.map((stepId, index) =>
        this.prisma.playbookStep.update({
          where: { id: stepId },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findOne(playbookId, organizationId);
  }

  // ============================================
  // Execution Management
  // ============================================

  async startExecution(playbookId: string, dto: StartPlaybookDto, userId: string, organizationId: string) {
    const playbook = await this.findOne(playbookId, organizationId);

    if (!playbook.isActive) {
      throw new BadRequestException('Playbook is not active');
    }

    if (playbook.steps.length === 0) {
      throw new BadRequestException('Playbook has no steps');
    }

    if (!dto.dealId && !dto.leadId && !dto.accountId) {
      throw new BadRequestException('Must specify a deal, lead, or account');
    }

    // Check for existing active execution on the same entity
    const existingExecution = await this.prisma.playbookExecution.findFirst({
      where: {
        playbookId,
        status: PlaybookExecutionStatus.IN_PROGRESS,
        OR: [
          dto.dealId ? { dealId: dto.dealId } : {},
          dto.leadId ? { leadId: dto.leadId } : {},
          dto.accountId ? { accountId: dto.accountId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    if (existingExecution) {
      throw new BadRequestException('This playbook is already running on this entity');
    }

    // Create execution
    const execution = await this.prisma.playbookExecution.create({
      data: {
        playbookId,
        userId,
        dealId: dto.dealId,
        leadId: dto.leadId,
        accountId: dto.accountId,
        totalSteps: playbook.steps.length,
        currentStep: 1,
      },
    });

    // Create step executions
    await this.prisma.playbookStepExecution.createMany({
      data: playbook.steps.map(step => ({
        executionId: execution.id,
        stepId: step.id,
        status: step.order === 1 ? PlaybookStepStatus.IN_PROGRESS : PlaybookStepStatus.PENDING,
        scheduledAt: this.calculateScheduledDate(step.daysOffset),
      })),
    });

    // Increment usage count
    await this.prisma.playbook.update({
      where: { id: playbookId },
      data: { usageCount: { increment: 1 } },
    });

    return this.getExecution(execution.id, organizationId);
  }

  async getExecution(executionId: string, organizationId: string) {
    const where: any = { id: executionId };
    where.organizationId = organizationId;

    const execution = await this.prisma.playbookExecution.findFirst({
      where,
      include: {
        playbook: { select: { id: true, name: true } },
        stepExecutions: {
          include: {
            step: true,
          },
          orderBy: { step: { order: 'asc' } },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    return execution;
  }

  async getExecutions(organizationId: string, filters?: {
    playbookId?: string;
    dealId?: string;
    status?: PlaybookExecutionStatus;
    userId?: string;
  }) {
    const where: any = {};
    if (filters?.playbookId) where.playbookId = filters.playbookId;
    if (filters?.dealId) where.dealId = filters.dealId;
    if (filters?.status) where.status = filters.status;
    if (filters?.userId) where.userId = filters.userId;
    where.organizationId = organizationId;

    return this.prisma.playbookExecution.findMany({
      where,
      include: {
        playbook: { select: { id: true, name: true } },
        stepExecutions: {
          include: { step: { select: { title: true, type: true } } },
          orderBy: { step: { order: 'asc' } },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async completeStep(executionId: string, stepId: string, organizationId: string, outcome?: string, notes?: string) {
    const execution = await this.getExecution(executionId, organizationId);

    if (execution.status !== PlaybookExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Execution is not in progress');
    }

    const stepExecution = execution.stepExecutions.find(se => se.stepId === stepId);
    if (!stepExecution) {
      throw new NotFoundException('Step execution not found');
    }

    // Update step as completed
    await this.prisma.playbookStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: PlaybookStepStatus.COMPLETED,
        completedAt: new Date(),
        outcome,
        notes,
      },
    });

    // Find next pending step
    const nextStepExecution = execution.stepExecutions.find(
      se => se.status === PlaybookStepStatus.PENDING,
    );

    if (nextStepExecution) {
      // Update next step to in progress
      await this.prisma.playbookStepExecution.update({
        where: { id: nextStepExecution.id },
        data: { status: PlaybookStepStatus.IN_PROGRESS, startedAt: new Date() },
      });

      // Update execution current step
      await this.prisma.playbookExecution.update({
        where: { id: executionId },
        data: { currentStep: { increment: 1 } },
      });
    } else {
      // All steps completed
      await this.completeExecution(executionId);
    }

    return this.getExecution(executionId, organizationId);
  }

  async skipStep(executionId: string, stepId: string, organizationId: string, reason?: string) {
    const execution = await this.getExecution(executionId, organizationId);

    const stepExecution = execution.stepExecutions.find(se => se.stepId === stepId);
    if (!stepExecution) {
      throw new NotFoundException('Step execution not found');
    }

    // Check if step is required
    if (stepExecution.step.isRequired) {
      throw new BadRequestException('Cannot skip a required step');
    }

    // Update step as skipped
    await this.prisma.playbookStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: PlaybookStepStatus.SKIPPED,
        skippedAt: new Date(),
        notes: reason,
      },
    });

    // Move to next step
    const nextStepExecution = execution.stepExecutions.find(
      se => se.status === PlaybookStepStatus.PENDING && se.stepId !== stepId,
    );

    if (nextStepExecution) {
      await this.prisma.playbookStepExecution.update({
        where: { id: nextStepExecution.id },
        data: { status: PlaybookStepStatus.IN_PROGRESS, startedAt: new Date() },
      });

      await this.prisma.playbookExecution.update({
        where: { id: executionId },
        data: { currentStep: { increment: 1 } },
      });
    } else {
      await this.completeExecution(executionId);
    }

    return this.getExecution(executionId, organizationId);
  }

  async cancelExecution(executionId: string, organizationId: string) {
    const execution = await this.getExecution(executionId, organizationId);

    if (execution.status !== PlaybookExecutionStatus.IN_PROGRESS) {
      throw new BadRequestException('Execution is not in progress');
    }

    await this.prisma.playbookExecution.update({
      where: { id: executionId },
      data: {
        status: PlaybookExecutionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    return this.getExecution(executionId, organizationId);
  }

  private async completeExecution(executionId: string) {
    const execution = await this.prisma.playbookExecution.findUnique({
      where: { id: executionId },
      include: {
        stepExecutions: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    // Calculate success score
    const completedSteps = execution.stepExecutions.filter(
      se => se.status === PlaybookStepStatus.COMPLETED,
    ).length;
    const totalSteps = execution.stepExecutions.length;
    const successScore = (completedSteps / totalSteps) * 100;

    await this.prisma.playbookExecution.update({
      where: { id: executionId },
      data: {
        status: PlaybookExecutionStatus.COMPLETED,
        completedAt: new Date(),
        successScore,
      },
    });

    // Update playbook success rate
    const allExecutions = await this.prisma.playbookExecution.findMany({
      where: {
        playbookId: execution.playbookId,
        status: PlaybookExecutionStatus.COMPLETED,
      },
      select: { successScore: true },
    });

    const avgSuccessRate =
      allExecutions.reduce((sum, e) => sum + (e.successScore || 0), 0) / allExecutions.length;

    await this.prisma.playbook.update({
      where: { id: execution.playbookId },
      data: { successRate: avgSuccessRate },
    });
  }

  private calculateScheduledDate(daysOffset: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  }

  // ============================================
  // Stats
  // ============================================

  async getStats(organizationId: string) {
    const where: any = {};
    where.organizationId = organizationId;

    const whereActive: any = { isActive: true };
    whereActive.organizationId = organizationId;

    const whereUsage: any = { usageCount: { gt: 0 } };
    whereUsage.organizationId = organizationId;

    const [total, active, totalUsage] = await Promise.all([
      this.prisma.playbook.count({ where }),
      this.prisma.playbook.count({ where: whereActive }),
      this.prisma.playbook.aggregate({ where, _sum: { usageCount: true } }),
    ]);

    const avgSuccessRate = await this.prisma.playbook.aggregate({
      where: whereUsage,
      _avg: { successRate: true },
    });

    return {
      totalPlaybooks: total,
      activePlaybooks: active,
      totalUsage: totalUsage._sum.usageCount || 0,
      avgSuccessRate: Math.round(avgSuccessRate._avg.successRate || 0),
    };
  }
}
