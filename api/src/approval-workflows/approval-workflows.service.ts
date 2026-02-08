import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApprovalEntity, ApprovalStatus, ApprovalAction, Prisma } from '@prisma/client';
import {
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  CreateApprovalStepDto,
  UpdateApprovalStepDto,
  SubmitForApprovalDto,
  ApprovalDecisionDto,
} from './dto/approval-workflow.dto';

@Injectable()
export class ApprovalWorkflowsService {
  private readonly logger = new Logger(ApprovalWorkflowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============ Workflows ============

  async getStats(organizationId: string) {
    const [total, active, byEntity, pendingRequests, avgApprovalTime] = await Promise.all([
      this.prisma.approvalWorkflow.count({ where: { organizationId } }),
      this.prisma.approvalWorkflow.count({ where: { organizationId, isActive: true } }),
      this.prisma.approvalWorkflow.groupBy({
        by: ['entity'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.approvalRequest.count({
        where: { organizationId, status: 'PENDING' },
      }),
      this.calculateAvgApprovalTime(organizationId),
    ]);

    return {
      total,
      active,
      byEntity: byEntity.map((item) => ({
        entity: item.entity,
        count: item._count,
      })),
      pendingRequests,
      avgApprovalTime,
    };
  }

  private async calculateAvgApprovalTime(organizationId: string): Promise<number> {
    const completedRequests = await this.prisma.approvalRequest.findMany({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'REJECTED'] },
        completedAt: { not: null },
      },
      select: {
        submittedAt: true,
        completedAt: true,
      },
      take: 100,
      orderBy: { completedAt: 'desc' },
    });

    if (completedRequests.length === 0) return 0;

    const totalHours = completedRequests.reduce((acc, req) => {
      const diff = req.completedAt!.getTime() - req.submittedAt.getTime();
      return acc + diff / (1000 * 60 * 60); // Convert to hours
    }, 0);

    return Math.round((totalHours / completedRequests.length) * 10) / 10;
  }

  async findAll(organizationId: string, filters?: { entity?: ApprovalEntity; isActive?: boolean }) {
    const where: Prisma.ApprovalWorkflowWhereInput = { organizationId };

    if (filters?.entity) {
      where.entity = filters.entity;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.approvalWorkflow.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id, organizationId },
      include: {
        steps: {
          orderBy: { order: 'asc' },
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { requests: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Approval workflow ${id} not found`);
    }

    return workflow;
  }

  async findByEntity(entity: ApprovalEntity, organizationId: string) {
    return this.prisma.approvalWorkflow.findMany({
      where: { entity, organizationId, isActive: true },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { priority: 'desc' },
    });
  }

  async create(dto: CreateApprovalWorkflowDto, userId: string, organizationId: string) {
    this.logger.log(`Creating approval workflow: ${dto.name}`);

    return this.prisma.approvalWorkflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        entity: dto.entity,
        conditions: (dto.conditions || []) as any,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
        createdById: userId,
        organizationId,
      },
      include: {
        steps: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateApprovalWorkflowDto, organizationId: string) {
    await this.findOne(id, organizationId); // Verify exists

    return this.prisma.approvalWorkflow.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        conditions: dto.conditions as any,
        isActive: dto.isActive,
        priority: dto.priority,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const workflow = await this.findOne(id, organizationId);

    // Check for pending requests
    const pendingRequests = await this.prisma.approvalRequest.count({
      where: { workflowId: id, status: 'PENDING' },
    });

    if (pendingRequests > 0) {
      throw new BadRequestException(
        `Cannot delete workflow with ${pendingRequests} pending approval requests`,
      );
    }

    await this.prisma.approvalWorkflow.delete({ where: { id } });
    this.logger.log(`Deleted approval workflow ${id}`);
  }

  async clone(id: string, name: string, userId: string, organizationId: string) {
    const source = await this.findOne(id, organizationId);

    return this.prisma.$transaction(async (tx) => {
      // Create new workflow
      const workflow = await tx.approvalWorkflow.create({
        data: {
          name,
          description: source.description,
          entity: source.entity,
          conditions: source.conditions as any,
          isActive: false, // Start inactive
          priority: source.priority,
          createdById: userId,
          organizationId,
        },
      });

      // Clone steps
      if (source.steps.length > 0) {
        await tx.approvalStep.createMany({
          data: source.steps.map((step) => ({
            workflowId: workflow.id,
            order: step.order,
            name: step.name,
            description: step.description,
            approverType: step.approverType,
            approverId: step.approverId,
            roleId: step.roleId,
            autoApproveAfterHours: step.autoApproveAfterHours,
            autoRejectAfterHours: step.autoRejectAfterHours,
            requireComment: step.requireComment,
            allowDelegation: step.allowDelegation,
          })),
        });
      }

      return this.findOne(workflow.id, organizationId);
    });
  }

  async toggleActive(id: string, organizationId: string) {
    const workflow = await this.findOne(id, organizationId);

    return this.prisma.approvalWorkflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  // ============ Steps ============

  async addStep(workflowId: string, dto: CreateApprovalStepDto, organizationId: string) {
    await this.findOne(workflowId, organizationId); // Verify workflow exists

    // Validate approver for USER type
    if (dto.approverType === 'USER' && dto.approverId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.approverId },
      });
      if (!user) {
        throw new NotFoundException(`User ${dto.approverId} not found`);
      }
    }

    return this.prisma.approvalStep.create({
      data: {
        workflowId,
        order: dto.order,
        name: dto.name,
        description: dto.description,
        approverType: dto.approverType,
        approverId: dto.approverId,
        roleId: dto.roleId,
        autoApproveAfterHours: dto.autoApproveAfterHours,
        autoRejectAfterHours: dto.autoRejectAfterHours,
        requireComment: dto.requireComment ?? false,
        allowDelegation: dto.allowDelegation ?? true,
      },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateStep(
    workflowId: string,
    stepId: string,
    dto: UpdateApprovalStepDto,
    organizationId: string,
  ) {
    await this.findOne(workflowId, organizationId);

    const step = await this.prisma.approvalStep.findFirst({
      where: { id: stepId, workflowId },
    });

    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found in workflow ${workflowId}`);
    }

    return this.prisma.approvalStep.update({
      where: { id: stepId },
      data: dto,
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deleteStep(workflowId: string, stepId: string, organizationId: string) {
    await this.findOne(workflowId, organizationId);

    const step = await this.prisma.approvalStep.findFirst({
      where: { id: stepId, workflowId },
    });

    if (!step) {
      throw new NotFoundException(`Step ${stepId} not found in workflow ${workflowId}`);
    }

    await this.prisma.approvalStep.delete({ where: { id: stepId } });
  }

  async reorderSteps(workflowId: string, stepIds: string[], organizationId: string) {
    await this.findOne(workflowId, organizationId);

    // Update each step's order
    await this.prisma.$transaction(
      stepIds.map((id, index) =>
        this.prisma.approvalStep.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    // Return updated steps
    return this.prisma.approvalStep.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // ============ Requests ============

  async findAllRequests(
    organizationId: string,
    filters?: {
      entityType?: ApprovalEntity;
      status?: ApprovalStatus;
      requestedById?: string;
      approverId?: string;
    },
  ) {
    const where: Prisma.ApprovalRequestWhereInput = { organizationId };

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.requestedById) {
      where.requestedById = filters.requestedById;
    }

    return this.prisma.approvalRequest.findMany({
      where,
      include: {
        workflow: {
          select: { id: true, name: true, entity: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        decisions: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
            delegatedTo: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { decidedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingRequests(userId: string, organizationId: string) {
    // Find requests where user is the approver for the current step
    const requests = await this.prisma.approvalRequest.findMany({
      where: {
        organizationId,
        status: 'PENDING',
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        decisions: true,
      },
    });

    // Filter to requests where user is the approver for the current step
    return requests.filter((request) => {
      const currentStep = request.workflow.steps.find(
        (s) => s.order === request.currentStepOrder,
      );
      if (!currentStep) return false;

      // Check if user is the approver
      if (currentStep.approverType === 'USER') {
        return currentStep.approverId === userId;
      }

      // For MANAGER/SKIP_LEVEL_MANAGER, would need to look up org hierarchy
      // For ROLE, would need to check user's roles
      // Simplified for now - just check USER type
      return false;
    });
  }

  async findRequestById(id: string, organizationId: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, organizationId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
              include: {
                approver: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        decisions: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
            step: {
              select: { id: true, name: true, order: true },
            },
            delegatedTo: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { decidedAt: 'asc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Approval request ${id} not found`);
    }

    return request;
  }

  async findRequestsForEntity(
    entityType: ApprovalEntity,
    entityId: string,
    organizationId: string,
  ) {
    return this.prisma.approvalRequest.findMany({
      where: { entityType, entityId, organizationId },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        decisions: {
          include: {
            approver: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitForApproval(dto: SubmitForApprovalDto, userId: string, organizationId: string) {
    // Find applicable workflow
    const workflows = await this.findByEntity(dto.entityType, organizationId);

    if (workflows.length === 0) {
      throw new BadRequestException(`No active approval workflow found for ${dto.entityType}`);
    }

    // Get the highest priority workflow (they're already sorted)
    const workflow = workflows[0];

    if (workflow.steps.length === 0) {
      throw new BadRequestException('Approval workflow has no steps configured');
    }

    // Get entity details
    const entityDetails = await this.getEntityDetails(dto.entityType, dto.entityId);

    return this.prisma.approvalRequest.create({
      data: {
        workflowId: workflow.id,
        entityType: dto.entityType,
        entityId: dto.entityId,
        entityName: entityDetails.name,
        entityDetails: entityDetails,
        requestedById: userId,
        currentStepOrder: 1,
        status: 'PENDING',
        organizationId,
      },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  private async getEntityDetails(
    entityType: ApprovalEntity,
    entityId: string,
  ): Promise<{ name: string; [key: string]: any }> {
    switch (entityType) {
      case 'QUOTE':
        const quote = await this.prisma.quote.findUnique({
          where: { id: entityId },
          select: { id: true, name: true, totalPrice: true, status: true },
        });
        if (!quote) throw new NotFoundException(`Quote ${entityId} not found`);
        return {
          id: quote.id,
          name: quote.name || `Quote ${quote.id}`,
          total: quote.totalPrice,
          status: quote.status,
        };

      case 'ORDER':
        const order = await this.prisma.order.findUnique({
          where: { id: entityId },
          select: { id: true, name: true, orderNumber: true, total: true, status: true },
        });
        if (!order) throw new NotFoundException(`Order ${entityId} not found`);
        return {
          id: order.id,
          name: order.name || `Order ${order.orderNumber}`,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
        };

      case 'CONTRACT':
        const contract = await this.prisma.contract.findUnique({
          where: { id: entityId },
          select: { id: true, contractName: true, contractValue: true, status: true },
        });
        if (!contract) throw new NotFoundException(`Contract ${entityId} not found`);
        return {
          id: contract.id,
          name: contract.contractName,
          value: contract.contractValue,
          status: contract.status,
        };

      default:
        return { name: `${entityType} ${entityId}` };
    }
  }

  async makeDecision(
    requestId: string,
    dto: ApprovalDecisionDto,
    userId: string,
    organizationId: string,
  ) {
    const request = await this.findRequestById(requestId, organizationId);

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase()}`);
    }

    const currentStep = request.workflow.steps.find(
      (s) => s.order === request.currentStepOrder,
    );

    if (!currentStep) {
      throw new BadRequestException('Invalid workflow state - no current step');
    }

    // Verify user is authorized to make decision
    // Simplified - in production would check role/manager hierarchy
    if (currentStep.approverType === 'USER' && currentStep.approverId !== userId) {
      throw new ForbiddenException('You are not authorized to approve this request');
    }

    // Handle delegation
    if (dto.action === 'DELEGATE') {
      if (!dto.delegateToId) {
        throw new BadRequestException('delegateToId is required for delegation');
      }
      if (!currentStep.allowDelegation) {
        throw new BadRequestException('Delegation is not allowed for this step');
      }
    }

    // Get approver info
    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      // Create decision record
      await tx.approvalDecision.create({
        data: {
          requestId,
          stepId: currentStep.id,
          stepOrder: currentStep.order,
          approverId: userId,
          action: dto.action,
          comment: dto.comment,
          delegatedToId: dto.delegateToId,
        },
      });

      // Update request based on action
      let newStatus: ApprovalStatus = 'PENDING';
      let newStepOrder = request.currentStepOrder;
      let completedAt: Date | null = null;

      if (dto.action === 'APPROVE') {
        // Check if there are more steps
        const nextStep = request.workflow.steps.find(
          (s) => s.order === currentStep.order + 1,
        );

        if (nextStep) {
          newStepOrder = nextStep.order;
        } else {
          newStatus = 'APPROVED';
          completedAt = new Date();
        }
      } else if (dto.action === 'REJECT') {
        newStatus = 'REJECTED';
        completedAt = new Date();
      }
      // DELEGATE and ESCALATE keep status as PENDING

      return tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          currentStepOrder: newStepOrder,
          completedAt,
        },
        include: {
          workflow: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          decisions: {
            include: {
              approver: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { decidedAt: 'asc' },
          },
        },
      });
    });
  }

  async cancelRequest(requestId: string, reason: string | undefined, userId: string, organizationId: string) {
    const request = await this.findRequestById(requestId, organizationId);

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel request with status ${request.status}`);
    }

    // Only requester can cancel
    if (request.requestedById !== userId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    return this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
      include: {
        workflow: {
          select: { id: true, name: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getApprovalHistory(
    entityType: ApprovalEntity,
    entityId: string,
    organizationId: string,
  ) {
    return this.findRequestsForEntity(entityType, entityId, organizationId);
  }

  async checkApprovalRequired(
    entityType: ApprovalEntity,
    entityId: string,
    organizationId: string,
  ) {
    const workflows = await this.findByEntity(entityType, organizationId);

    if (workflows.length === 0) {
      return { required: false };
    }

    // In production, would evaluate conditions against entity
    // For now, if an active workflow exists, approval is required
    return {
      required: true,
      workflow: workflows[0],
    };
  }
}
