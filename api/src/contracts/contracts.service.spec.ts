import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';

describe('ContractsService', () => {
  let service: ContractsService;

  const mockContract = {
    id: 'contract-1',
    accountId: 'account-1',
    quoteId: null,
    ownerId: 'user-1',
    organizationId: 'org-1',
    contractNumber: 'C-2026-00001',
    contractName: 'Enterprise License Agreement',
    status: 'DRAFT',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    contractTerm: 12,
    contractValue: 50000,
    billingFrequency: 'Monthly',
    autoRenew: false,
    renewalDate: new Date('2027-01-01'),
    renewalNoticeDate: null,
    renewalReminder: false,
    signedDate: null,
    activatedDate: null,
    terminatedDate: null,
    terminationReason: null,
    description: 'A test contract',
    specialTerms: null,
    metadata: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    account: { id: 'account-1', name: 'Test Account' },
    quote: null,
    owner: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  };

  const mockPrisma = {
    contract: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    quote: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationScheduler = {
    sendSystemNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationSchedulerService, useValue: mockNotificationScheduler },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createContract ─────────────────────────────────────────────────────────

  describe('createContract', () => {
    const createDto = {
      accountId: 'account-1',
      contractName: 'New Contract',
      startDate: new Date('2026-03-01'),
      contractTerm: 12,
      contractValue: 25000,
      billingFrequency: 'Annually',
      autoRenew: true,
      description: 'Test description',
    };

    it('should create a contract with generated number and calculated renewal date', async () => {
      mockPrisma.contract.count.mockResolvedValue(5);
      mockPrisma.contract.create.mockResolvedValue({
        ...mockContract,
        ...createDto,
        contractNumber: `C-${new Date().getFullYear()}-00006`,
        status: 'DRAFT',
      });

      const result = await service.createContract(createDto, 'user-1', 'org-1');

      expect(result).toBeDefined();
      expect(mockPrisma.contract.count).toHaveBeenCalled();
      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractNumber: `C-${new Date().getFullYear()}-00006`,
            contractName: 'New Contract',
            status: 'DRAFT',
            accountId: 'account-1',
            ownerId: 'user-1',
            organizationId: 'org-1',
            autoRenew: true,
            renewalDate: expect.any(Date),
          }),
          include: expect.objectContaining({
            account: true,
            quote: true,
          }),
        }),
      );
    });

    it('should generate correct sequential contract number', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockImplementation((args: any) => ({
        ...mockContract,
        contractNumber: args.data.contractNumber,
      }));

      const result = await service.createContract(createDto, 'user-1', 'org-1');

      expect(result.contractNumber).toBe(`C-${new Date().getFullYear()}-00001`);
    });

    it('should set renewalDate when startDate and contractTerm are provided', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockImplementation((args: any) => ({
        ...mockContract,
        renewalDate: args.data.renewalDate,
      }));

      await service.createContract(createDto, 'user-1', 'org-1');

      const expectedRenewalDate = new Date('2026-03-01');
      expectedRenewalDate.setMonth(expectedRenewalDate.getMonth() + 12);

      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalDate: expectedRenewalDate,
          }),
        }),
      );
    });

    it('should set renewalDate to null when startDate is missing', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockResolvedValue(mockContract);

      const dtoWithoutStart = {
        accountId: 'account-1',
        contractName: 'No Start Date',
        contractTerm: 12,
      };

      await service.createContract(dtoWithoutStart, 'user-1', 'org-1');

      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalDate: null,
          }),
        }),
      );
    });

    it('should set autoRenew to false when not provided', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockResolvedValue(mockContract);

      const dtoNoAutoRenew = {
        accountId: 'account-1',
        contractName: 'No Auto Renew',
      };

      await service.createContract(dtoNoAutoRenew, 'user-1', 'org-1');

      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            autoRenew: false,
          }),
        }),
      );
    });

    it('should verify quote is accepted when quoteId is provided', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', status: 'ACCEPTED' });
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockResolvedValue({ ...mockContract, quoteId: 'quote-1' });

      const dtoWithQuote = {
        accountId: 'account-1',
        contractName: 'From Quote',
        quoteId: 'quote-1',
      };

      await service.createContract(dtoWithQuote, 'user-1', 'org-1');

      expect(mockPrisma.quote.findUnique).toHaveBeenCalledWith({ where: { id: 'quote-1' } });
      expect(mockPrisma.contract.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when linked quote does not exist', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      const dtoWithQuote = {
        accountId: 'account-1',
        contractName: 'From Quote',
        quoteId: 'non-existent',
      };

      await expect(
        service.createContract(dtoWithQuote, 'user-1', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is not accepted', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', status: 'DRAFT' });

      const dtoWithQuote = {
        accountId: 'account-1',
        contractName: 'From Quote',
        quoteId: 'quote-1',
      };

      await expect(
        service.createContract(dtoWithQuote, 'user-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when contract already exists for quote', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue({ id: 'quote-1', status: 'ACCEPTED' });
      mockPrisma.contract.findUnique.mockResolvedValue({ id: 'existing-contract' });

      const dtoWithQuote = {
        accountId: 'account-1',
        contractName: 'From Quote',
        quoteId: 'quote-1',
      };

      await expect(
        service.createContract(dtoWithQuote, 'user-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getContract ────────────────────────────────────────────────────────────

  describe('getContract', () => {
    it('should return the contract when found as admin', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(mockContract);

      const result = await service.getContract('contract-1', 'user-1', true, 'org-1');

      expect(result).toEqual(mockContract);
      expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contract-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should include ownerId in where clause for non-admin users', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(mockContract);

      await service.getContract('contract-1', 'user-1', false, 'org-1');

      expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contract-1',
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should not include ownerId in where clause for admin users', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(mockContract);

      await service.getContract('contract-1', 'admin-1', true, 'org-1');

      const callArgs = mockPrisma.contract.findFirst.mock.calls[0][0];
      expect(callArgs.where.ownerId).toBeUndefined();
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.getContract('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-admin accessing another users contract', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.getContract('contract-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include account, quote with lineItems, and owner in the result', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(mockContract);

      await service.getContract('contract-1', 'user-1', true, 'org-1');

      expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            account: true,
            quote: expect.objectContaining({
              include: { lineItems: true },
            }),
            owner: expect.objectContaining({
              select: { id: true, name: true, email: true },
            }),
          }),
        }),
      );
    });
  });

  // ─── listContracts ──────────────────────────────────────────────────────────

  describe('listContracts', () => {
    it('should return a list of contracts ordered by createdAt desc', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([mockContract]);

      const result = await service.listContracts(undefined, true, 'org-1');

      expect(result).toEqual([mockContract]);
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({ status: 'ACTIVATED' as any }, true, 'org-1');

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVATED' }),
        }),
      );
    });

    it('should filter by accountId when provided', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({ accountId: 'account-1' }, true, 'org-1');

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: 'account-1' }),
        }),
      );
    });

    it('should filter by ownerId for non-admin users', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({ ownerId: 'user-1' }, false, 'org-1');

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('should not filter by ownerId for admin users even when ownerId is provided', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({ ownerId: 'user-1' }, true, 'org-1');

      const callArgs = mockPrisma.contract.findMany.mock.calls[0][0];
      expect(callArgs.where.ownerId).toBeUndefined();
    });

    it('should filter by renewalDue with 60-day window and ACTIVATED status', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({ renewalDue: true }, true, 'org-1');

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVATED',
            renewalDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should handle empty filters', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);

      await service.listContracts({}, true, 'org-1');

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
        }),
      );
    });
  });

  // ─── updateContract ─────────────────────────────────────────────────────────

  describe('updateContract', () => {
    it('should update the contract when found as admin', async () => {
      const updatedContract = { ...mockContract, contractName: 'Updated Name' };
      mockPrisma.contract.findFirst.mockResolvedValue(mockContract);
      mockPrisma.contract.update.mockResolvedValue(updatedContract);

      const result = await service.updateContract(
        'contract-1',
        'user-1',
        { contractName: 'Updated Name' },
        true,
        'org-1',
      );

      expect(result.contractName).toBe('Updated Name');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.updateContract('non-existent', 'user-1', { contractName: 'Foo' }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-admin not owning the contract', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.updateContract('contract-1', 'other-user', { contractName: 'Foo' }, false, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should recalculate renewalDate when startDate changes', async () => {
      const existingContract = { ...mockContract, startDate: new Date('2026-01-01'), contractTerm: 12, renewalDate: new Date('2027-01-01') };
      mockPrisma.contract.findFirst.mockResolvedValue(existingContract);
      mockPrisma.contract.update.mockImplementation((args: any) => ({
        ...existingContract,
        ...args.data,
      }));

      await service.updateContract(
        'contract-1',
        'user-1',
        { startDate: new Date('2026-06-01') },
        true,
        'org-1',
      );

      const expectedRenewalDate = new Date('2026-06-01');
      expectedRenewalDate.setMonth(expectedRenewalDate.getMonth() + 12);

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalDate: expectedRenewalDate,
          }),
        }),
      );
    });

    it('should recalculate renewalDate when contractTerm changes', async () => {
      const existingContract = { ...mockContract, startDate: new Date('2026-01-01'), contractTerm: 12, renewalDate: new Date('2027-01-01') };
      mockPrisma.contract.findFirst.mockResolvedValue(existingContract);
      mockPrisma.contract.update.mockImplementation((args: any) => ({
        ...existingContract,
        ...args.data,
      }));

      await service.updateContract(
        'contract-1',
        'user-1',
        { contractTerm: 24 },
        true,
        'org-1',
      );

      const expectedRenewalDate = new Date('2026-01-01');
      expectedRenewalDate.setMonth(expectedRenewalDate.getMonth() + 24);

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalDate: expectedRenewalDate,
          }),
        }),
      );
    });

    it('should keep existing renewalDate when neither startDate nor contractTerm changes', async () => {
      const existingRenewal = new Date('2027-01-01');
      const existingContract = { ...mockContract, renewalDate: existingRenewal };
      mockPrisma.contract.findFirst.mockResolvedValue(existingContract);
      mockPrisma.contract.update.mockImplementation((args: any) => ({
        ...existingContract,
        ...args.data,
      }));

      await service.updateContract(
        'contract-1',
        'user-1',
        { description: 'Updated desc' },
        true,
        'org-1',
      );

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalDate: existingRenewal,
          }),
        }),
      );
    });
  });

  // ─── submitForReview ────────────────────────────────────────────────────────

  describe('submitForReview', () => {
    it('should transition a DRAFT contract to IN_REVIEW', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      const reviewContract = { ...mockContract, status: 'IN_REVIEW' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);
      mockPrisma.contract.update.mockResolvedValue(reviewContract);

      const result = await service.submitForReview('contract-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('IN_REVIEW');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          data: { status: 'IN_REVIEW' },
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.submitForReview('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when contract is not DRAFT', async () => {
      const activatedContract = { ...mockContract, status: 'ACTIVATED' };
      mockPrisma.contract.findFirst.mockResolvedValue(activatedContract);

      await expect(
        service.submitForReview('contract-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include ownerId in where clause for non-admin', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);
      mockPrisma.contract.update.mockResolvedValue({ ...draftContract, status: 'IN_REVIEW' });

      await service.submitForReview('contract-1', 'user-1', false, 'org-1');

      expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'user-1',
          }),
        }),
      );
    });
  });

  // ─── approveContract ────────────────────────────────────────────────────────

  describe('approveContract', () => {
    it('should transition an IN_REVIEW contract to APPROVED', async () => {
      const inReviewContract = { ...mockContract, status: 'IN_REVIEW' };
      const approvedContract = { ...mockContract, status: 'APPROVED' };
      mockPrisma.contract.findFirst.mockResolvedValue(inReviewContract);
      mockPrisma.contract.update.mockResolvedValue(approvedContract);

      const result = await service.approveContract('contract-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          data: { status: 'APPROVED' },
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.approveContract('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when contract is not IN_REVIEW', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);

      await expect(
        service.approveContract('contract-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── activateContract ───────────────────────────────────────────────────────

  describe('activateContract', () => {
    it('should transition an APPROVED contract to ACTIVATED', async () => {
      const approvedContract = {
        ...mockContract,
        status: 'APPROVED',
        renewalDate: new Date('2027-01-01'),
        account: { name: 'Test Account' },
      };
      const activatedContract = {
        ...mockContract,
        status: 'ACTIVATED',
        activatedDate: expect.any(Date),
      };
      mockPrisma.contract.findFirst.mockResolvedValue(approvedContract);
      mockPrisma.contract.update.mockResolvedValue(activatedContract);

      const result = await service.activateContract('contract-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('ACTIVATED');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          data: expect.objectContaining({
            status: 'ACTIVATED',
            activatedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should calculate renewalNoticeDate 30 days before renewalDate', async () => {
      const renewalDate = new Date('2027-06-15');
      const approvedContract = {
        ...mockContract,
        status: 'APPROVED',
        renewalDate,
        account: { name: 'Test Account' },
      };
      mockPrisma.contract.findFirst.mockResolvedValue(approvedContract);
      mockPrisma.contract.update.mockResolvedValue({ ...approvedContract, status: 'ACTIVATED' });

      await service.activateContract('contract-1', 'user-1', true, 'org-1');

      const expectedNoticeDate = new Date(renewalDate);
      expectedNoticeDate.setDate(expectedNoticeDate.getDate() - 30);

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalNoticeDate: expectedNoticeDate,
          }),
        }),
      );
    });

    it('should set renewalNoticeDate to null when renewalDate is null', async () => {
      const approvedContract = {
        ...mockContract,
        status: 'APPROVED',
        renewalDate: null,
        account: { name: 'Test Account' },
      };
      mockPrisma.contract.findFirst.mockResolvedValue(approvedContract);
      mockPrisma.contract.update.mockResolvedValue({ ...approvedContract, status: 'ACTIVATED' });

      await service.activateContract('contract-1', 'user-1', true, 'org-1');

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            renewalNoticeDate: null,
          }),
        }),
      );
    });

    it('should send a system notification on activation', async () => {
      const approvedContract = {
        ...mockContract,
        status: 'APPROVED',
        contractValue: 50000,
        account: { name: 'Test Account' },
      };
      mockPrisma.contract.findFirst.mockResolvedValue(approvedContract);
      mockPrisma.contract.update.mockResolvedValue({ ...approvedContract, status: 'ACTIVATED' });

      await service.activateContract('contract-1', 'user-1', true, 'org-1');

      expect(mockNotificationScheduler.sendSystemNotification).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Contract Activated'),
        expect.stringContaining('Enterprise License Agreement'),
        expect.objectContaining({
          type: 'DEAL_UPDATE',
          priority: 'HIGH',
          action: 'VIEW_CONTRACT',
        }),
      );
    });

    it('should not throw when notification fails', async () => {
      const approvedContract = {
        ...mockContract,
        status: 'APPROVED',
        account: { name: 'Test Account' },
      };
      mockPrisma.contract.findFirst.mockResolvedValue(approvedContract);
      mockPrisma.contract.update.mockResolvedValue({ ...approvedContract, status: 'ACTIVATED' });
      mockNotificationScheduler.sendSystemNotification.mockRejectedValue(new Error('Notification failed'));

      const result = await service.activateContract('contract-1', 'user-1', true, 'org-1');

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.activateContract('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when contract is not APPROVED', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);

      await expect(
        service.activateContract('contract-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── terminateContract ──────────────────────────────────────────────────────

  describe('terminateContract', () => {
    it('should terminate an ACTIVATED contract with reason', async () => {
      const activatedContract = { ...mockContract, status: 'ACTIVATED' };
      const terminatedContract = {
        ...mockContract,
        status: 'TERMINATED',
        terminatedDate: expect.any(Date),
        terminationReason: 'Customer churn',
      };
      mockPrisma.contract.findFirst.mockResolvedValue(activatedContract);
      mockPrisma.contract.update.mockResolvedValue(terminatedContract);

      const result = await service.terminateContract('contract-1', 'user-1', 'Customer churn', true, 'org-1');

      expect(result.status).toBe('TERMINATED');
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          data: expect.objectContaining({
            status: 'TERMINATED',
            terminatedDate: expect.any(Date),
            terminationReason: 'Customer churn',
          }),
        }),
      );
    });

    it('should terminate without a reason when reason is undefined', async () => {
      const activatedContract = { ...mockContract, status: 'ACTIVATED' };
      mockPrisma.contract.findFirst.mockResolvedValue(activatedContract);
      mockPrisma.contract.update.mockResolvedValue({ ...activatedContract, status: 'TERMINATED' });

      await service.terminateContract('contract-1', 'user-1', undefined, true, 'org-1');

      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            terminationReason: undefined,
          }),
        }),
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.terminateContract('non-existent', 'user-1', undefined, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when contract is not ACTIVATED', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);

      await expect(
        service.terminateContract('contract-1', 'user-1', 'Reason', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── renewContract ──────────────────────────────────────────────────────────

  describe('renewContract', () => {
    it('should renew an ACTIVATED contract and mark old one as EXPIRED', async () => {
      const activatedContract = {
        ...mockContract,
        status: 'ACTIVATED',
        endDate: new Date('2027-01-01'),
        contractTerm: 12,
      };
      mockPrisma.contract.findFirst.mockResolvedValue(activatedContract);
      mockPrisma.contract.count.mockResolvedValue(5);
      mockPrisma.contract.create.mockImplementation((args: any) => ({
        ...mockContract,
        id: 'contract-2',
        contractNumber: args.data.contractNumber,
        contractName: args.data.contractName,
        status: 'ACTIVATED',
      }));
      mockPrisma.contract.update.mockResolvedValue({ ...activatedContract, status: 'EXPIRED' });

      const result = await service.renewContract('contract-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('ACTIVATED');
      expect(result.contractName).toContain('(Renewal)');
      expect(mockPrisma.contract.create).toHaveBeenCalled();
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
          data: { status: 'EXPIRED' },
        }),
      );
    });

    it('should throw BadRequestException when contract is not ACTIVATED', async () => {
      const draftContract = { ...mockContract, status: 'DRAFT' };
      mockPrisma.contract.findFirst.mockResolvedValue(draftContract);

      await expect(
        service.renewContract('contract-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);

      await expect(
        service.renewContract('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use endDate as start of new contract when available', async () => {
      const endDate = new Date('2027-06-15');
      const activatedContract = {
        ...mockContract,
        status: 'ACTIVATED',
        endDate,
        contractTerm: 12,
      };
      mockPrisma.contract.findFirst.mockResolvedValue(activatedContract);
      mockPrisma.contract.count.mockResolvedValue(0);
      mockPrisma.contract.create.mockImplementation((args: any) => ({
        ...mockContract,
        id: 'contract-2',
        startDate: args.data.startDate,
        status: 'ACTIVATED',
        contractName: args.data.contractName,
      }));
      mockPrisma.contract.update.mockResolvedValue({ ...activatedContract, status: 'EXPIRED' });

      await service.renewContract('contract-1', 'user-1', true, 'org-1');

      expect(mockPrisma.contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: endDate,
          }),
        }),
      );
    });
  });

  // ─── getContractStats ───────────────────────────────────────────────────────

  describe('getContractStats', () => {
    it('should return aggregate contract statistics for admin', async () => {
      mockPrisma.contract.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      mockPrisma.contract.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: 3 },
        { status: 'ACTIVATED', _count: 5 },
        { status: 'EXPIRED', _count: 2 },
      ]);
      mockPrisma.contract.aggregate
        .mockResolvedValueOnce({ _sum: { contractValue: 500000 } })
        .mockResolvedValueOnce({ _sum: { contractValue: 250000 } });

      const result = await service.getContractStats(undefined, true, 'org-1');

      expect(result.total).toBe(10);
      expect(result.totalValue).toBe(500000);
      expect(result.activeValue).toBe(250000);
      expect(result.renewalsDueNext30Days).toBe(2);
      expect(result.byStatus).toEqual([
        { status: 'DRAFT', _count: 3 },
        { status: 'ACTIVATED', _count: 5 },
        { status: 'EXPIRED', _count: 2 },
      ]);
    });

    it('should handle zero contracts gracefully', async () => {
      mockPrisma.contract.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.contract.groupBy.mockResolvedValue([]);
      mockPrisma.contract.aggregate
        .mockResolvedValueOnce({ _sum: { contractValue: null } })
        .mockResolvedValueOnce({ _sum: { contractValue: null } });

      const result = await service.getContractStats('user-1', false, 'org-1');

      expect(result.total).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.activeValue).toBe(0);
      expect(result.renewalsDueNext30Days).toBe(0);
    });

    it('should filter by ownerId for non-admin users', async () => {
      mockPrisma.contract.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1);
      mockPrisma.contract.groupBy.mockResolvedValue([]);
      mockPrisma.contract.aggregate
        .mockResolvedValueOnce({ _sum: { contractValue: 100000 } })
        .mockResolvedValueOnce({ _sum: { contractValue: 50000 } });

      await service.getContractStats('user-1', false, 'org-1');

      expect(mockPrisma.contract.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('should not filter by ownerId for admin users', async () => {
      mockPrisma.contract.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2);
      mockPrisma.contract.groupBy.mockResolvedValue([]);
      mockPrisma.contract.aggregate
        .mockResolvedValueOnce({ _sum: { contractValue: 100000 } })
        .mockResolvedValueOnce({ _sum: { contractValue: 50000 } });

      await service.getContractStats('admin-1', true, 'org-1');

      const firstCountCall = mockPrisma.contract.count.mock.calls[0][0];
      expect(firstCountCall.where.ownerId).toBeUndefined();
    });
  });
});
