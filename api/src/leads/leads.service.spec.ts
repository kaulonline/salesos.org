import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ApplicationLogService } from '../admin/application-log.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { EntityAuditService } from '../audit/entity-audit.service';
import { DuplicateDetectionService } from '../duplicates/duplicate-detection.service';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockPrisma = {
    lead: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    account: { create: jest.fn() },
    contact: { create: jest.fn() },
    opportunity: { create: jest.fn() },
  };

  const mockAnthropic = {
    chat: jest.fn().mockResolvedValue('{"score": 75, "reasons": ["Good fit"]}'),
  };

  const mockAppLog = {
    info: jest.fn().mockResolvedValue(undefined),
    warn: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
    logTransaction: jest.fn().mockResolvedValue(undefined),
    generateCorrelationId: jest.fn().mockReturnValue('corr-123'),
  };

  const mockWorkflows = {
    processTrigger: jest.fn().mockResolvedValue(undefined),
  };

  const mockIntegrationEvents = {
    emit: jest.fn().mockResolvedValue(undefined),
    dispatchCrmEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockAudit = {
    trackChanges: jest.fn().mockResolvedValue(undefined),
  };

  const mockDuplicates = {
    scanForDuplicates: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    // Restore default mock implementations
    mockAppLog.logTransaction.mockResolvedValue(undefined);
    mockAppLog.generateCorrelationId.mockReturnValue('corr-123');
    mockAudit.trackChanges.mockResolvedValue(undefined);
    mockWorkflows.processTrigger.mockResolvedValue(undefined);
    mockIntegrationEvents.emit.mockResolvedValue(undefined);
    mockIntegrationEvents.dispatchCrmEvent.mockResolvedValue(undefined);
    mockDuplicates.scanForDuplicates.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnthropicService, useValue: mockAnthropic },
        { provide: ApplicationLogService, useValue: mockAppLog },
        { provide: WorkflowsService, useValue: mockWorkflows },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        { provide: EntityAuditService, useValue: mockAudit },
        { provide: DuplicateDetectionService, useValue: mockDuplicates },
        { provide: EnrichmentService, useValue: undefined },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a lead and return it', async () => {
      const createDto = { firstName: 'John', lastName: 'Doe', email: 'john@test.com' };
      const createdLead = { id: 'lead-1', ...createDto, ownerId: 'user-1', organizationId: 'org-1', status: 'NEW' };
      mockPrisma.lead.create.mockResolvedValue(createdLead);

      const result = await service.create('user-1', createDto as any, 'org-1');

      expect(result.id).toBe('lead-1');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should log the transaction', async () => {
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-1', firstName: 'John', lastName: 'Doe' });

      await service.create('user-1', { firstName: 'John', lastName: 'Doe' } as any, 'org-1');

      expect(mockAppLog.logTransaction).toHaveBeenCalledWith(
        'LeadsService.create',
        'LEAD_CREATE',
        expect.anything(),
        expect.stringContaining('Creating lead'),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return a lead by ID', async () => {
      const lead = { id: 'lead-1', firstName: 'John', lastName: 'Doe', organizationId: 'org-1' };
      mockPrisma.lead.findFirst.mockResolvedValue(lead);

      const result = await service.findOne('lead-1', 'user-1', 'org-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('lead-1');
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.findOne('lead-missing', 'user-1', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a lead and track changes', async () => {
      const existing = { id: 'lead-1', firstName: 'John', lastName: 'Doe', organizationId: 'org-1' };
      const updated = { ...existing, firstName: 'Jane' };
      mockPrisma.lead.findFirst.mockResolvedValue(existing);
      mockPrisma.lead.update.mockResolvedValue(updated);

      const result = await service.update('lead-1', 'user-1', 'org-1', { firstName: 'Jane' } as any);

      expect(result.firstName).toBe('Jane');
      expect(mockAudit.trackChanges).toHaveBeenCalled();
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.update('lead-missing', 'user-1', 'org-1', { firstName: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', organizationId: 'org-1' });
      mockPrisma.lead.delete.mockResolvedValue({ id: 'lead-1' });

      await service.remove('lead-1', 'user-1', 'org-1');

      expect(mockPrisma.lead.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'lead-1' } }),
      );
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.remove('lead-missing', 'user-1', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });
});
