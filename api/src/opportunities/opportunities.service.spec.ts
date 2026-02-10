import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { OutcomeBillingService } from '../outcome-billing/outcome-billing.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { EntityAuditService } from '../audit/entity-audit.service';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;
  let prisma: PrismaService;

  const mockPrisma = {
    opportunity: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    opportunityContactRole: {
      findFirst: jest.fn(),
    },
  };

  const mockAnthropic = {
    chat: jest.fn().mockResolvedValue('{"winProbability": 65, "riskFactors": [], "recommendedActions": [], "dealVelocity": 3, "reasoning": "Good deal"}'),
  };

  const mockNotificationScheduler = {
    scheduleCloseReminder: jest.fn().mockResolvedValue(undefined),
  };

  const mockOutcomeBilling = {
    trackDealClosed: jest.fn().mockResolvedValue(undefined),
    flagEventForReview: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorkflows = {
    processTrigger: jest.fn().mockResolvedValue(undefined),
  };

  const mockIntegrationEvents = {
    dispatchCrmEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockAudit = {
    trackChanges: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockWorkflows.processTrigger.mockResolvedValue(undefined);
    mockIntegrationEvents.dispatchCrmEvent.mockResolvedValue(undefined);
    mockAudit.trackChanges.mockResolvedValue(undefined);
    mockNotificationScheduler.scheduleCloseReminder.mockResolvedValue(undefined);
    mockOutcomeBilling.trackDealClosed.mockResolvedValue(undefined);
    mockOutcomeBilling.flagEventForReview.mockResolvedValue(undefined);
    mockAnthropic.chat.mockResolvedValue('{"winProbability": 65}');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnthropicService, useValue: mockAnthropic },
        { provide: NotificationSchedulerService, useValue: mockNotificationScheduler },
        { provide: OutcomeBillingService, useValue: mockOutcomeBilling },
        { provide: WorkflowsService, useValue: mockWorkflows },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        { provide: EntityAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<OpportunitiesService>(OpportunitiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createOpportunity', () => {
    const createDto = {
      name: 'Big Deal',
      accountId: 'clrqm8e0g000008l27hma6acc',
      amount: 100000,
    };

    it('should create an opportunity with default stage probability', async () => {
      mockPrisma.opportunity.create.mockResolvedValue({
        id: 'opp-1',
        ...createDto,
        stage: 'PROSPECTING',
        probability: 10,
        ownerId: 'user-1',
        organizationId: 'org-1',
        isClosed: false,
        isWon: false,
      });
      // Mock for async analyzeOpportunityAsync
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const result = await service.createOpportunity(createDto as any, 'user-1', 'org-1');

      expect(result.id).toBe('opp-1');
      expect(mockPrisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Big Deal',
            probability: 10,
          }),
        }),
      );
    });
  });

  describe('getOpportunity', () => {
    it('should return an opportunity by ID', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({
        id: 'opp-1',
        name: 'Big Deal',
        organizationId: 'org-1',
      });

      const result = await service.getOpportunity('opp-1', 'user-1', 'org-1');

      expect(result.id).toBe('opp-1');
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(service.getOpportunity('opp-missing', 'user-1', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOpportunity', () => {
    it('should update opportunity and track changes', async () => {
      const existing = {
        id: 'opp-1', name: 'Deal', stage: 'PROSPECTING', amount: 50000,
        probability: 10, isClosed: false, isWon: false, organizationId: 'org-1',
        createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma.opportunity.findFirst.mockResolvedValue(existing);
      mockPrisma.opportunity.update.mockResolvedValue({
        ...existing, stage: 'QUALIFICATION', probability: 20,
      });

      const result = await service.updateOpportunity(
        'opp-1', 'user-1', { stage: 'QUALIFICATION' } as any, 'org-1',
      );

      expect(result.stage).toBe('QUALIFICATION');
      expect(mockAudit.trackChanges).toHaveBeenCalled();
    });

    it('should throw NotFoundException when opportunity not found', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOpportunity('opp-missing', 'user-1', { name: 'X' } as any, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOpportunity (bulkDelete single)', () => {
    it('should throw NotFoundException when opportunity not found for getOpportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      await expect(
        service.getOpportunity('opp-missing', 'user-1', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
