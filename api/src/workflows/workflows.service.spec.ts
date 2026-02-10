import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { PrismaService } from '../database/prisma.service';
import { SalesOSEmailService } from '../email/salesos-email.service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let prisma: PrismaService;

  const mockPrisma = {
    workflow: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workflowExecution: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    task: {
      create: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    opportunity: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contact: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockEmailService.sendEmail.mockResolvedValue(undefined);
    mockEmailService.sendTemplateEmail.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SalesOSEmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a workflow in DRAFT status', async () => {
      const createDto = {
        name: 'Welcome Email',
        description: 'Send welcome email on new lead',
        triggerType: 'RECORD_CREATED',
        triggerEntity: 'LEAD',
        actions: [{ type: 'SEND_EMAIL', config: { template: 'welcome' } }],
      };

      mockPrisma.workflow.create.mockResolvedValue({
        id: 'wf-1',
        ...createDto,
        status: 'DRAFT',
        createdById: 'user-1',
        conditions: [],
        triggerConfig: {},
        runOnce: false,
        delayMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { executions: 0 },
      });

      const result = await service.create('user-1', createDto as any);

      expect(result).toBeDefined();
      expect(result.name).toBe('Welcome Email');
      expect(mockPrisma.workflow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Welcome Email',
            status: 'DRAFT',
            createdById: 'user-1',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return workflows with pagination', async () => {
      mockPrisma.workflow.findMany.mockResolvedValue([
        {
          id: 'wf-1', name: 'Workflow 1', status: 'ACTIVE',
          triggerType: 'RECORD_CREATED', triggerEntity: 'LEAD',
          conditions: [], actions: [], triggerConfig: {},
          runOnce: false, delayMinutes: 0,
          createdAt: new Date(), updatedAt: new Date(),
          _count: { executions: 5 },
        },
      ]);
      mockPrisma.workflow.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a workflow by ID', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({
        id: 'wf-1',
        name: 'Test Workflow',
        status: 'ACTIVE',
        triggerType: 'RECORD_CREATED',
        triggerEntity: 'LEAD',
        conditions: [],
        actions: [],
        triggerConfig: {},
        runOnce: false,
        delayMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        executions: [],
        _count: { executions: 0 },
      });

      const result = await service.findOne('wf-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Workflow');
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.findOne('wf-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({ id: 'wf-1', name: 'Old Name' });
      mockPrisma.workflow.update.mockResolvedValue({
        id: 'wf-1',
        name: 'New Name',
        status: 'ACTIVE',
        triggerType: 'RECORD_CREATED',
        triggerEntity: 'LEAD',
        conditions: [],
        actions: [],
        triggerConfig: {},
        runOnce: false,
        delayMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { executions: 0 },
      });

      const result = await service.update('wf-1', 'user-1', { name: 'New Name' } as any);

      expect(result.name).toBe('New Name');
      expect(mockPrisma.workflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wf-1' },
        }),
      );
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.update('wf-missing', 'user-1', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a workflow', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue({ id: 'wf-1' });
      mockPrisma.workflow.delete.mockResolvedValue({ id: 'wf-1' });

      await service.delete('wf-1');

      expect(mockPrisma.workflow.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'wf-1' } }),
      );
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockPrisma.workflow.findUnique.mockResolvedValue(null);

      await expect(service.delete('wf-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('processTrigger', () => {
    it('should find and execute matching active workflows', async () => {
      const workflow = {
        id: 'wf-1',
        name: 'Lead Workflow',
        status: 'ACTIVE',
        triggerType: 'RECORD_CREATED',
        triggerEntity: 'LEAD',
        triggerConfig: {},
        conditions: [],
        actions: [{ type: 'SEND_EMAIL', config: { to: 'admin@test.com', subject: 'New Lead', body: 'Test' } }],
        runOnce: false,
        delayMinutes: 0,
      };
      mockPrisma.workflow.findMany.mockResolvedValue([workflow]);
      mockPrisma.workflowExecution.create.mockResolvedValue({ id: 'exec-1', status: 'RUNNING' });
      mockPrisma.workflowExecution.update.mockResolvedValue({ id: 'exec-1', status: 'COMPLETED' });

      await service.processTrigger(
        'RECORD_CREATED' as any,
        'LEAD' as any,
        'lead-1',
        { firstName: 'John', lastName: 'Doe' },
      );

      expect(mockPrisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            triggerType: 'RECORD_CREATED',
            triggerEntity: 'LEAD',
          }),
        }),
      );
    });
  });
});
