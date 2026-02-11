import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../database/prisma.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';

// Auto-mock heavy modules to prevent ts-jest from compiling their large dependency trees
jest.mock('../workflows/workflows.service');
jest.mock('../integrations/events/integration-events.service');
jest.mock('../integrations/enrichment/enrichment.service');

describe('AccountsService', () => {
  let service: AccountsService;

  const mockPrisma = {
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    opportunity: {
      count: jest.fn(),
    },
  };

  const mockWorkflows = {
    processTrigger: jest.fn(),
  };

  const mockIntegrationEvents = {
    dispatchCrmEvent: jest.fn(),
  };

  const ownerId = 'user-1';
  const orgId = 'org-1';
  const accountId = 'acc-1';

  beforeEach(async () => {
    jest.resetAllMocks();

    mockWorkflows.processTrigger.mockResolvedValue(undefined);
    mockIntegrationEvents.dispatchCrmEvent.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowsService, useValue: mockWorkflows },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        { provide: EnrichmentService, useValue: undefined },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    it('should create an account successfully', async () => {
      const createDto = {
        name: 'Acme Corp',
        type: 'PROSPECT' as any,
      };

      mockPrisma.account.create.mockResolvedValue({
        id: accountId,
        ...createDto,
        ownerId,
        organizationId: orgId,
      });

      const result = await service.createAccount(createDto, ownerId, orgId);

      expect(result.id).toBe(accountId);
      expect(result.name).toBe('Acme Corp');
    });
  });

  describe('getAccount', () => {
    it('should return an account by ID', async () => {
      const mockAccount = {
        id: accountId,
        name: 'Acme Corp',
        ownerId,
        organizationId: orgId,
      };

      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.getAccount(accountId, ownerId, orgId);

      expect(result.id).toBe(accountId);
      expect(result.name).toBe('Acme Corp');
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(service.getAccount('nonexistent', ownerId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listAccounts', () => {
    it('should return a list of accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'a1', name: 'Account 1' },
        { id: 'a2', name: 'Account 2' },
      ]);

      const result = await service.listAccounts(undefined, orgId);

      expect(result).toHaveLength(2);
    });
  });

  describe('updateAccount', () => {
    it('should update an account successfully', async () => {
      const existingAccount = {
        id: accountId,
        name: 'Old Name',
        ownerId,
        organizationId: orgId,
      };

      mockPrisma.account.findFirst.mockResolvedValue(existingAccount);
      mockPrisma.account.findMany.mockResolvedValue([]); // no descendants
      mockPrisma.account.update.mockResolvedValue({
        ...existingAccount,
        name: 'New Name',
      });

      const result = await service.updateAccount(
        accountId,
        ownerId,
        { name: 'New Name' },
        orgId,
      );

      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException when account does not exist', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAccount('nonexistent', ownerId, { name: 'New' }, orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('should delete an account successfully', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: accountId,
        _count: { opportunities: 0, childAccounts: 0 },
      });
      mockPrisma.opportunity.count.mockResolvedValue(0);
      mockPrisma.account.delete.mockResolvedValue({ id: accountId });

      await service.deleteAccount(accountId, ownerId, orgId);

      expect(mockPrisma.account.delete).toHaveBeenCalledWith({
        where: { id: accountId },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent', ownerId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
