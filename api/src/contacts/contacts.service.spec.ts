import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../database/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { EntityAuditService } from '../audit/entity-audit.service';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: PrismaService;

  const mockPrisma = {
    contact: {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowsService, useValue: mockWorkflows },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        { provide: EntityAuditService, useValue: mockAudit },
        { provide: EnrichmentService, useValue: undefined },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createContact', () => {
    const createDto = {
      accountId: 'clrqm8e0g000008l27hma6acc',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@test.com',
    };

    it('should create a contact with valid accountId', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'clrqm8e0g000008l27hma6acc', name: 'Acme' });
      mockPrisma.contact.create.mockResolvedValue({
        id: 'contact-1',
        ...createDto,
        ownerId: 'user-1',
        organizationId: 'org-1',
      });

      const result = await service.createContact(createDto as any, 'user-1', 'org-1');

      expect(result.id).toBe('contact-1');
      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when account does not exist', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.createContact(createDto as any, 'user-1', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate reportsToId when provided', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'clrqm8e0g000008l27hma6acc' });
      mockPrisma.contact.findUnique.mockResolvedValue(null);

      await expect(
        service.createContact(
          { ...createDto, reportsToId: 'clrqm8e0g000008l27hma6bad' } as any,
          'user-1',
          'org-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should succeed when reportsToId is valid', async () => {
      mockPrisma.account.findUnique.mockResolvedValue({ id: 'clrqm8e0g000008l27hma6acc' });
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'clrqm8e0g000008l27hmaboss' });
      mockPrisma.contact.create.mockResolvedValue({
        id: 'contact-1',
        ...createDto,
        reportsToId: 'clrqm8e0g000008l27hmaboss',
        ownerId: 'user-1',
        organizationId: 'org-1',
      });

      const result = await service.createContact(
        { ...createDto, reportsToId: 'clrqm8e0g000008l27hmaboss' } as any,
        'user-1',
        'org-1',
      );

      expect(result.id).toBe('contact-1');
    });
  });

  describe('getContact', () => {
    it('should return a contact by ID', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c-1', firstName: 'Jane', lastName: 'Smith', organizationId: 'org-1',
      });

      const result = await service.getContact('c-1', 'user-1', 'org-1');

      expect(result.id).toBe('c-1');
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.getContact('c-missing', 'user-1', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listContacts', () => {
    it('should return contacts list', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c-1', firstName: 'Jane', lastName: 'Smith' },
      ]);

      const result = await service.listContacts({}, 'org-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('updateContact', () => {
    it('should update a contact and track audit changes', async () => {
      const existing = { id: 'c-1', firstName: 'Jane', lastName: 'Smith', organizationId: 'org-1' };
      mockPrisma.contact.findFirst.mockResolvedValue(existing);
      mockPrisma.contact.update.mockResolvedValue({ ...existing, firstName: 'Janet' });

      const result = await service.updateContact('c-1', 'user-1', { firstName: 'Janet' } as any, 'org-1');

      expect(result.firstName).toBe('Janet');
      expect(mockAudit.trackChanges).toHaveBeenCalled();
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.updateContact('c-missing', 'user-1', { firstName: 'X' } as any, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: 'c-1', organizationId: 'org-1' });
      mockPrisma.contact.delete.mockResolvedValue({ id: 'c-1' });

      await service.deleteContact('c-1', 'user-1', 'org-1');

      expect(mockPrisma.contact.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c-1' } }),
      );
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.deleteContact('c-missing', 'user-1', 'org-1')).rejects.toThrow(NotFoundException);
    });
  });
});
