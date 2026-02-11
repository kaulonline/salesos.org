import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import { PrismaService } from '../database/prisma.service';

describe('ApprovalWorkflowsService', () => {
  let service: ApprovalWorkflowsService;

  const mockPrisma = {
    approvalWorkflow: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    approvalStep: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalDecision: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    quote: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const orgId = 'org-1';
  const userId = 'user-1';

  const mockWorkflow = {
    id: 'wf-1',
    name: 'Quote Approval',
    description: 'Approve quotes over $10k',
    entity: 'QUOTE',
    conditions: [],
    isActive: true,
    priority: 1,
    createdById: userId,
    organizationId: orgId,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: [
      {
        id: 'step-1',
        workflowId: 'wf-1',
        order: 1,
        name: 'Manager Review',
        description: null,
        approverType: 'USER',
        approverId: 'approver-1',
        roleId: null,
        autoApproveAfterHours: null,
        autoRejectAfterHours: null,
        requireComment: false,
        allowDelegation: true,
        approver: { id: 'approver-1', name: 'Manager', email: 'mgr@test.com' },
      },
      {
        id: 'step-2',
        workflowId: 'wf-1',
        order: 2,
        name: 'Director Review',
        description: null,
        approverType: 'USER',
        approverId: 'approver-2',
        roleId: null,
        autoApproveAfterHours: null,
        autoRejectAfterHours: null,
        requireComment: true,
        allowDelegation: false,
        approver: { id: 'approver-2', name: 'Director', email: 'dir@test.com' },
      },
    ],
    createdBy: { id: userId, name: 'Test User', email: 'test@test.com' },
    _count: { requests: 3 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalWorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ApprovalWorkflowsService>(ApprovalWorkflowsService);
  });

  // ============ getStats ============

  describe('getStats', () => {
    it('should return aggregated workflow statistics', async () => {
      mockPrisma.approvalWorkflow.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(3); // active
      mockPrisma.approvalWorkflow.groupBy.mockResolvedValue([
        { entity: 'QUOTE', _count: 2 },
        { entity: 'ORDER', _count: 3 },
      ]);
      mockPrisma.approvalRequest.count.mockResolvedValue(7);
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);

      const result = await service.getStats(orgId);

      expect(result.total).toBe(5);
      expect(result.active).toBe(3);
      expect(result.byEntity).toEqual([
        { entity: 'QUOTE', count: 2 },
        { entity: 'ORDER', count: 3 },
      ]);
      expect(result.pendingRequests).toBe(7);
      expect(result.avgApprovalTime).toBe(0);
    });

    it('should compute average approval time from completed requests', async () => {
      mockPrisma.approvalWorkflow.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      mockPrisma.approvalWorkflow.groupBy.mockResolvedValue([]);
      mockPrisma.approvalRequest.count.mockResolvedValue(0);

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        { submittedAt: fourHoursAgo, completedAt: twoHoursAgo },  // 2 hours
        { submittedAt: fourHoursAgo, completedAt: now },           // 4 hours
      ]);

      const result = await service.getStats(orgId);

      // Average: (2 + 4) / 2 = 3.0
      expect(result.avgApprovalTime).toBe(3);
    });
  });

  // ============ findAll ============

  describe('findAll', () => {
    it('should return all workflows for an organization', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([mockWorkflow]);

      const result = await service.findAll(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Quote Approval');
      expect(mockPrisma.approvalWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('should filter by entity', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([]);

      await service.findAll(orgId, { entity: 'QUOTE' as any });

      expect(mockPrisma.approvalWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, entity: 'QUOTE' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([]);

      await service.findAll(orgId, { isActive: true });

      expect(mockPrisma.approvalWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, isActive: true },
        }),
      );
    });

    it('should return empty array when no workflows exist', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([]);

      const result = await service.findAll(orgId);

      expect(result).toEqual([]);
    });
  });

  // ============ findOne ============

  describe('findOne', () => {
    it('should return a workflow by id and organizationId', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);

      const result = await service.findOne('wf-1', orgId);

      expect(result.id).toBe('wf-1');
      expect(result.steps).toHaveLength(2);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.findOne('wf-missing', orgId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('wf-missing', orgId)).rejects.toThrow(
        'Approval workflow wf-missing not found',
      );
    });
  });

  // ============ findByEntity ============

  describe('findByEntity', () => {
    it('should find active workflows for a given entity type', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([mockWorkflow]);

      const result = await service.findByEntity('QUOTE' as any, orgId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.approvalWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'QUOTE', organizationId: orgId, isActive: true },
          orderBy: { priority: 'desc' },
        }),
      );
    });
  });

  // ============ create ============

  describe('create', () => {
    it('should create a new approval workflow', async () => {
      const dto = {
        name: 'New Workflow',
        description: 'Test description',
        entity: 'QUOTE' as any,
        conditions: [{ field: 'total', operator: 'GREATER_THAN', value: 10000 }],
        isActive: true,
        priority: 5,
      };

      mockPrisma.approvalWorkflow.create.mockResolvedValue({
        id: 'wf-new',
        ...dto,
        createdById: userId,
        organizationId: orgId,
        steps: [],
        createdBy: { id: userId, name: 'Test User', email: 'test@test.com' },
      });

      const result = await service.create(dto, userId, orgId);

      expect(result.id).toBe('wf-new');
      expect(mockPrisma.approvalWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Workflow',
            entity: 'QUOTE',
            createdById: userId,
            organizationId: orgId,
            priority: 5,
          }),
        }),
      );
    });

    it('should default isActive to true and priority to 0', async () => {
      const dto = {
        name: 'Minimal Workflow',
        entity: 'ORDER' as any,
      };

      mockPrisma.approvalWorkflow.create.mockResolvedValue({
        id: 'wf-min',
        ...dto,
        isActive: true,
        priority: 0,
        conditions: [],
        createdById: userId,
        organizationId: orgId,
        steps: [],
        createdBy: { id: userId, name: 'Test', email: 't@t.com' },
      });

      await service.create(dto as any, userId, orgId);

      expect(mockPrisma.approvalWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            priority: 0,
            conditions: [],
          }),
        }),
      );
    });
  });

  // ============ update ============

  describe('update', () => {
    it('should update an existing workflow', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        name: 'Updated Name',
      });

      const result = await service.update('wf-1', { name: 'Updated Name' } as any, orgId);

      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wf-1' },
        }),
      );
    });

    it('should throw NotFoundException when workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.update('wf-missing', { name: 'X' } as any, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ delete ============

  describe('delete', () => {
    it('should delete a workflow with no pending requests', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalRequest.count.mockResolvedValue(0);
      mockPrisma.approvalWorkflow.delete.mockResolvedValue(mockWorkflow);

      await service.delete('wf-1', orgId);

      expect(mockPrisma.approvalWorkflow.delete).toHaveBeenCalledWith({
        where: { id: 'wf-1' },
      });
    });

    it('should throw BadRequestException when there are pending requests', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalRequest.count.mockResolvedValue(3);

      await expect(service.delete('wf-1', orgId)).rejects.toThrow(BadRequestException);
      await expect(service.delete('wf-1', orgId)).rejects.toThrow(
        'Cannot delete workflow with 3 pending approval requests',
      );
    });

    it('should throw NotFoundException when workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.delete('wf-missing', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ============ clone ============

  describe('clone', () => {
    it('should clone a workflow with its steps', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);

      const txMock = {
        approvalWorkflow: {
          create: jest.fn().mockResolvedValue({ id: 'wf-clone', organizationId: orgId }),
        },
        approvalStep: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
      // findOne is called again after clone to return the full workflow
      // First call for source, second call for cloned workflow
      mockPrisma.approvalWorkflow.findFirst
        .mockResolvedValueOnce(mockWorkflow) // source
        .mockResolvedValueOnce({ ...mockWorkflow, id: 'wf-clone', name: 'Cloned', isActive: false });

      const result = await service.clone('wf-1', 'Cloned', userId, orgId);

      expect(txMock.approvalWorkflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Cloned',
            isActive: false,
            createdById: userId,
            organizationId: orgId,
          }),
        }),
      );
      expect(txMock.approvalStep.createMany).toHaveBeenCalled();
    });

    it('should clone a workflow with no steps', async () => {
      const noStepsWorkflow = { ...mockWorkflow, steps: [] };
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(noStepsWorkflow);

      const txMock = {
        approvalWorkflow: {
          create: jest.fn().mockResolvedValue({ id: 'wf-clone2', organizationId: orgId }),
        },
        approvalStep: {
          createMany: jest.fn(),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
      mockPrisma.approvalWorkflow.findFirst
        .mockResolvedValueOnce(noStepsWorkflow)
        .mockResolvedValueOnce({ ...noStepsWorkflow, id: 'wf-clone2', name: 'Clone2' });

      await service.clone('wf-1', 'Clone2', userId, orgId);

      expect(txMock.approvalStep.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when source workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.clone('wf-missing', 'Cloned', userId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ toggleActive ============

  describe('toggleActive', () => {
    it('should toggle isActive from true to false', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        isActive: false,
      });

      const result = await service.toggleActive('wf-1', orgId);

      expect(result.isActive).toBe(false);
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
    });

    it('should toggle isActive from false to true', async () => {
      const inactiveWorkflow = { ...mockWorkflow, isActive: false };
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(inactiveWorkflow);
      mockPrisma.approvalWorkflow.update.mockResolvedValue({
        ...inactiveWorkflow,
        isActive: true,
      });

      const result = await service.toggleActive('wf-1', orgId);

      expect(result.isActive).toBe(true);
      expect(mockPrisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: true },
        }),
      );
    });

    it('should throw NotFoundException when workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(service.toggleActive('wf-missing', orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ============ addStep ============

  describe('addStep', () => {
    it('should add a step to an existing workflow', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'approver-3', name: 'VP', email: 'vp@test.com' });
      mockPrisma.approvalStep.create.mockResolvedValue({
        id: 'step-new',
        workflowId: 'wf-1',
        order: 3,
        name: 'VP Review',
        approverType: 'USER',
        approverId: 'approver-3',
        approver: { id: 'approver-3', name: 'VP', email: 'vp@test.com' },
      });

      const dto = {
        order: 3,
        name: 'VP Review',
        approverType: 'USER' as any,
        approverId: 'approver-3',
      };

      const result = await service.addStep('wf-1', dto as any, orgId);

      expect(result.id).toBe('step-new');
      expect(mockPrisma.approvalStep.create).toHaveBeenCalled();
    });

    it('should validate user exists when approverType is USER', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dto = {
        order: 3,
        name: 'VP Review',
        approverType: 'USER' as any,
        approverId: 'nonexistent-user',
      };

      await expect(service.addStep('wf-1', dto as any, orgId)).rejects.toThrow(NotFoundException);
      await expect(service.addStep('wf-1', dto as any, orgId)).rejects.toThrow(
        'User nonexistent-user not found',
      );
    });

    it('should not validate user when approverType is not USER', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalStep.create.mockResolvedValue({
        id: 'step-mgr',
        workflowId: 'wf-1',
        order: 3,
        name: 'Manager Review',
        approverType: 'MANAGER',
        approver: null,
      });

      const dto = {
        order: 3,
        name: 'Manager Review',
        approverType: 'MANAGER' as any,
      };

      await service.addStep('wf-1', dto as any, orgId);

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(
        service.addStep('wf-missing', { order: 1, name: 'Test', approverType: 'USER' } as any, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ updateStep ============

  describe('updateStep', () => {
    it('should update an existing step', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalStep.findFirst.mockResolvedValue(mockWorkflow.steps[0]);
      mockPrisma.approvalStep.update.mockResolvedValue({
        ...mockWorkflow.steps[0],
        name: 'Updated Step',
      });

      const result = await service.updateStep('wf-1', 'step-1', { name: 'Updated Step' } as any, orgId);

      expect(result.name).toBe('Updated Step');
    });

    it('should throw NotFoundException when step not found in workflow', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalStep.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStep('wf-1', 'step-missing', { name: 'X' } as any, orgId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateStep('wf-1', 'step-missing', { name: 'X' } as any, orgId),
      ).rejects.toThrow('Step step-missing not found in workflow wf-1');
    });
  });

  // ============ deleteStep ============

  describe('deleteStep', () => {
    it('should delete an existing step', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalStep.findFirst.mockResolvedValue(mockWorkflow.steps[0]);
      mockPrisma.approvalStep.delete.mockResolvedValue(mockWorkflow.steps[0]);

      await service.deleteStep('wf-1', 'step-1', orgId);

      expect(mockPrisma.approvalStep.delete).toHaveBeenCalledWith({ where: { id: 'step-1' } });
    });

    it('should throw NotFoundException when step not found', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.approvalStep.findFirst.mockResolvedValue(null);

      await expect(service.deleteStep('wf-1', 'step-missing', orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ reorderSteps ============

  describe('reorderSteps', () => {
    it('should reorder steps and return updated list', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockWorkflow);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.approvalStep.findMany.mockResolvedValue([
        { ...mockWorkflow.steps[1], order: 1 },
        { ...mockWorkflow.steps[0], order: 2 },
      ]);

      const result = await service.reorderSteps('wf-1', ['step-2', 'step-1'], orgId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
      ]);
    });

    it('should throw NotFoundException when workflow does not exist', async () => {
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderSteps('wf-missing', ['step-1'], orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ findAllRequests ============

  describe('findAllRequests', () => {
    it('should return all requests for an organization', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', status: 'PENDING', entityType: 'QUOTE' },
      ]);

      const result = await service.findAllRequests(orgId);

      expect(result).toHaveLength(1);
      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId },
        }),
      );
    });

    it('should filter by entityType and status', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);

      await service.findAllRequests(orgId, { entityType: 'ORDER' as any, status: 'PENDING' as any });

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, entityType: 'ORDER', status: 'PENDING' },
        }),
      );
    });

    it('should filter by requestedById', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([]);

      await service.findAllRequests(orgId, { requestedById: userId });

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, requestedById: userId },
        }),
      );
    });
  });

  // ============ findPendingRequests ============

  describe('findPendingRequests', () => {
    it('should return requests where user is the current step approver', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        {
          id: 'req-1',
          currentStepOrder: 1,
          workflow: {
            steps: [
              { order: 1, approverType: 'USER', approverId: userId },
            ],
          },
          requestedBy: { id: 'other-user', name: 'Other', email: 'other@test.com' },
          decisions: [],
        },
        {
          id: 'req-2',
          currentStepOrder: 1,
          workflow: {
            steps: [
              { order: 1, approverType: 'USER', approverId: 'other-approver' },
            ],
          },
          requestedBy: { id: 'other-user', name: 'Other', email: 'other@test.com' },
          decisions: [],
        },
      ]);

      const result = await service.findPendingRequests(userId, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
    });

    it('should exclude requests with MANAGER approver type', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        {
          id: 'req-mgr',
          currentStepOrder: 1,
          workflow: {
            steps: [
              { order: 1, approverType: 'MANAGER', approverId: null },
            ],
          },
          requestedBy: { id: 'other-user', name: 'Other', email: 'other@test.com' },
          decisions: [],
        },
      ]);

      const result = await service.findPendingRequests(userId, orgId);

      expect(result).toHaveLength(0);
    });

    it('should exclude requests with no matching current step', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        {
          id: 'req-nostep',
          currentStepOrder: 5,
          workflow: {
            steps: [
              { order: 1, approverType: 'USER', approverId: userId },
            ],
          },
          requestedBy: { id: 'other-user', name: 'Other', email: 'other@test.com' },
          decisions: [],
        },
      ]);

      const result = await service.findPendingRequests(userId, orgId);

      expect(result).toHaveLength(0);
    });
  });

  // ============ findRequestById ============

  describe('findRequestById', () => {
    it('should return a request by id', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        workflow: { steps: [] },
        requestedBy: { id: userId, name: 'Test', email: 'test@test.com' },
        decisions: [],
      });

      const result = await service.findRequestById('req-1', orgId);

      expect(result.id).toBe('req-1');
    });

    it('should throw NotFoundException when request not found', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(null);

      await expect(service.findRequestById('req-missing', orgId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findRequestById('req-missing', orgId)).rejects.toThrow(
        'Approval request req-missing not found',
      );
    });
  });

  // ============ submitForApproval ============

  describe('submitForApproval', () => {
    it('should submit a QUOTE entity for approval', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, steps: [mockWorkflow.steps[0]] },
      ]);
      mockPrisma.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        name: 'Big Quote',
        totalPrice: 50000,
        status: 'DRAFT',
      });
      mockPrisma.approvalRequest.create.mockResolvedValue({
        id: 'req-new',
        entityType: 'QUOTE',
        entityId: 'quote-1',
        status: 'PENDING',
        currentStepOrder: 1,
      });

      const dto = { entityType: 'QUOTE' as any, entityId: 'quote-1' };
      const result = await service.submitForApproval(dto, userId, orgId);

      expect(result.id).toBe('req-new');
      expect(result.status).toBe('PENDING');
    });

    it('should throw BadRequestException when no active workflow for entity', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([]);

      const dto = { entityType: 'QUOTE' as any, entityId: 'quote-1' };

      await expect(service.submitForApproval(dto, userId, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitForApproval(dto, userId, orgId)).rejects.toThrow(
        'No active approval workflow found for QUOTE',
      );
    });

    it('should throw BadRequestException when workflow has no steps', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, steps: [] },
      ]);

      const dto = { entityType: 'QUOTE' as any, entityId: 'quote-1' };

      await expect(service.submitForApproval(dto, userId, orgId)).rejects.toThrow(
        'Approval workflow has no steps configured',
      );
    });

    it('should throw NotFoundException when quote entity not found', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, steps: [mockWorkflow.steps[0]] },
      ]);
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      const dto = { entityType: 'QUOTE' as any, entityId: 'quote-missing' };

      await expect(service.submitForApproval(dto, userId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should submit an ORDER entity for approval', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, entity: 'ORDER', steps: [mockWorkflow.steps[0]] },
      ]);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        name: 'Order One',
        orderNumber: 'ORD-001',
        total: 20000,
        status: 'DRAFT',
      });
      mockPrisma.approvalRequest.create.mockResolvedValue({
        id: 'req-order',
        entityType: 'ORDER',
        entityId: 'order-1',
        status: 'PENDING',
      });

      const dto = { entityType: 'ORDER' as any, entityId: 'order-1' };
      const result = await service.submitForApproval(dto, userId, orgId);

      expect(result.entityType).toBe('ORDER');
    });

    it('should submit a CONTRACT entity for approval', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, entity: 'CONTRACT', steps: [mockWorkflow.steps[0]] },
      ]);
      mockPrisma.contract.findUnique.mockResolvedValue({
        id: 'contract-1',
        contractName: 'Enterprise Agreement',
        contractValue: 100000,
        status: 'DRAFT',
      });
      mockPrisma.approvalRequest.create.mockResolvedValue({
        id: 'req-contract',
        entityType: 'CONTRACT',
        entityId: 'contract-1',
        status: 'PENDING',
      });

      const dto = { entityType: 'CONTRACT' as any, entityId: 'contract-1' };
      const result = await service.submitForApproval(dto, userId, orgId);

      expect(result.entityType).toBe('CONTRACT');
    });

    it('should use fallback entity name for unknown entity types', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([
        { ...mockWorkflow, entity: 'DISCOUNT', steps: [mockWorkflow.steps[0]] },
      ]);
      mockPrisma.approvalRequest.create.mockResolvedValue({
        id: 'req-disc',
        entityType: 'DISCOUNT',
        entityId: 'disc-1',
        status: 'PENDING',
      });

      const dto = { entityType: 'DISCOUNT' as any, entityId: 'disc-1' };
      const result = await service.submitForApproval(dto, userId, orgId);

      expect(mockPrisma.approvalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityName: 'DISCOUNT disc-1',
          }),
        }),
      );
    });
  });

  // ============ makeDecision ============

  describe('makeDecision', () => {
    const mockRequest = {
      id: 'req-1',
      status: 'PENDING',
      currentStepOrder: 1,
      requestedById: 'requester-1',
      workflow: {
        steps: [
          {
            id: 'step-1',
            order: 1,
            approverType: 'USER',
            approverId: userId,
            allowDelegation: true,
            requireComment: false,
          },
          {
            id: 'step-2',
            order: 2,
            approverType: 'USER',
            approverId: 'approver-2',
            allowDelegation: false,
            requireComment: true,
          },
        ],
      },
      requestedBy: { id: 'requester-1', name: 'Requester', email: 'req@test.com' },
      decisions: [],
    };

    it('should approve and advance to next step', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });

      const txMock = {
        approvalDecision: { create: jest.fn().mockResolvedValue({}) },
        approvalRequest: {
          update: jest.fn().mockResolvedValue({
            ...mockRequest,
            currentStepOrder: 2,
            status: 'PENDING',
          }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const dto = { action: 'APPROVE' as any, comment: 'Looks good' };
      const result = await service.makeDecision('req-1', dto, userId, orgId);

      expect(txMock.approvalDecision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'APPROVE',
            comment: 'Looks good',
          }),
        }),
      );
      expect(txMock.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            currentStepOrder: 2,
            completedAt: null,
          }),
        }),
      );
    });

    it('should approve on final step and set status to APPROVED', async () => {
      const lastStepRequest = { ...mockRequest, currentStepOrder: 2 };
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(lastStepRequest);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Approver 2' });

      const txMock = {
        approvalDecision: { create: jest.fn().mockResolvedValue({}) },
        approvalRequest: {
          update: jest.fn().mockResolvedValue({
            ...lastStepRequest,
            status: 'APPROVED',
            completedAt: new Date(),
          }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const dto = { action: 'APPROVE' as any };
      // User approver-2 is the approver for step 2
      await service.makeDecision('req-1', dto, 'approver-2', orgId);

      expect(txMock.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject and set status to REJECTED', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });

      const txMock = {
        approvalDecision: { create: jest.fn().mockResolvedValue({}) },
        approvalRequest: {
          update: jest.fn().mockResolvedValue({
            ...mockRequest,
            status: 'REJECTED',
            completedAt: new Date(),
          }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const dto = { action: 'REJECT' as any, comment: 'Too expensive' };
      await service.makeDecision('req-1', dto, userId, orgId);

      expect(txMock.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw BadRequestException when request is not PENDING', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });

      const dto = { action: 'APPROVE' as any };

      await expect(service.makeDecision('req-1', dto, userId, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.makeDecision('req-1', dto, userId, orgId)).rejects.toThrow(
        'Request is already approved',
      );
    });

    it('should throw ForbiddenException when user is not the authorized approver', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockRequest);

      const dto = { action: 'APPROVE' as any };

      await expect(
        service.makeDecision('req-1', dto, 'unauthorized-user', orgId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when delegating without delegateToId', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockRequest);

      const dto = { action: 'DELEGATE' as any };

      await expect(service.makeDecision('req-1', dto, userId, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.makeDecision('req-1', dto, userId, orgId)).rejects.toThrow(
        'delegateToId is required for delegation',
      );
    });

    it('should throw BadRequestException when delegation is not allowed', async () => {
      const noDelRequest = {
        ...mockRequest,
        currentStepOrder: 2,
      };
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(noDelRequest);

      const dto = { action: 'DELEGATE' as any, delegateToId: 'delegate-user' };

      await expect(
        service.makeDecision('req-1', dto, 'approver-2', orgId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.makeDecision('req-1', dto, 'approver-2', orgId),
      ).rejects.toThrow('Delegation is not allowed for this step');
    });

    it('should handle DELEGATE action keeping PENDING status', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue(mockRequest);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });

      const txMock = {
        approvalDecision: { create: jest.fn().mockResolvedValue({}) },
        approvalRequest: {
          update: jest.fn().mockResolvedValue({
            ...mockRequest,
            status: 'PENDING',
          }),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const dto = { action: 'DELEGATE' as any, delegateToId: 'delegate-user' };
      await service.makeDecision('req-1', dto, userId, orgId);

      expect(txMock.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            completedAt: null,
          }),
        }),
      );
    });
  });

  // ============ cancelRequest ============

  describe('cancelRequest', () => {
    it('should cancel a pending request by the requester', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        requestedById: userId,
        workflow: { steps: [] },
        requestedBy: { id: userId, name: 'Test', email: 'test@test.com' },
        decisions: [],
      });
      mockPrisma.approvalRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'CANCELLED',
        completedAt: new Date(),
      });

      const result = await service.cancelRequest('req-1', 'No longer needed', userId, orgId);

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw BadRequestException when request is not PENDING', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
        requestedById: userId,
        workflow: { steps: [] },
        requestedBy: { id: userId, name: 'Test', email: 'test@test.com' },
        decisions: [],
      });

      await expect(
        service.cancelRequest('req-1', 'reason', userId, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not the requester', async () => {
      mockPrisma.approvalRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        requestedById: 'other-user',
        workflow: { steps: [] },
        requestedBy: { id: 'other-user', name: 'Other', email: 'other@test.com' },
        decisions: [],
      });

      await expect(
        service.cancelRequest('req-1', 'reason', userId, orgId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cancelRequest('req-1', 'reason', userId, orgId),
      ).rejects.toThrow('Only the requester can cancel this request');
    });
  });

  // ============ checkApprovalRequired ============

  describe('checkApprovalRequired', () => {
    it('should return required: true when active workflows exist', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([mockWorkflow]);

      const result = await service.checkApprovalRequired('QUOTE' as any, 'quote-1', orgId);

      expect(result.required).toBe(true);
      expect(result.workflow).toBeDefined();
    });

    it('should return required: false when no active workflows exist', async () => {
      mockPrisma.approvalWorkflow.findMany.mockResolvedValue([]);

      const result = await service.checkApprovalRequired('QUOTE' as any, 'quote-1', orgId);

      expect(result.required).toBe(false);
      expect((result as any).workflow).toBeUndefined();
    });
  });

  // ============ findRequestsForEntity / getApprovalHistory ============

  describe('getApprovalHistory', () => {
    it('should return requests for a specific entity', async () => {
      mockPrisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', entityType: 'QUOTE', entityId: 'quote-1' },
        { id: 'req-2', entityType: 'QUOTE', entityId: 'quote-1' },
      ]);

      const result = await service.getApprovalHistory('QUOTE' as any, 'quote-1', orgId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'QUOTE', entityId: 'quote-1', organizationId: orgId },
        }),
      );
    });
  });
});
