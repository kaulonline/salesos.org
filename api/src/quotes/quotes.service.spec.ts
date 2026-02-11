import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';

describe('QuotesService', () => {
  let service: QuotesService;

  const mockQuote = {
    id: 'quote-1',
    quoteNumber: 'Q-2026-00001',
    name: 'Enterprise License',
    status: 'DRAFT',
    opportunityId: 'opp-1',
    accountId: 'account-1',
    ownerId: 'user-1',
    organizationId: 'org-1',
    subtotal: 1000,
    discount: 0,
    tax: 50,
    shippingHandling: 10,
    totalPrice: 1060,
    validUntil: null,
    paymentTerms: 'Net 30',
    description: 'Enterprise license quote',
    billingStreet: '123 Main St',
    billingCity: 'Springfield',
    billingState: 'IL',
    billingPostalCode: '62701',
    billingCountry: 'US',
    shippingStreet: null,
    shippingCity: null,
    shippingState: null,
    shippingPostalCode: null,
    shippingCountry: null,
    sentDate: null,
    acceptedDate: null,
    rejectedDate: null,
    rejectedReason: null,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
    opportunity: { id: 'opp-1', name: 'Big Deal' },
    account: { id: 'account-1', name: 'Acme Corp' },
    owner: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    lineItems: [],
    contract: null,
  };

  const mockLineItem = {
    id: 'li-1',
    quoteId: 'quote-1',
    productName: 'Widget Pro',
    productCode: 'WDG-001',
    description: 'Premium widget',
    quantity: 5,
    listPrice: 200,
    unitPrice: 180,
    discount: 100,
    totalPrice: 800,
    sortOrder: 1,
    productId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    quote: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
    },
    quoteLineItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockNotificationScheduler = {
    sendSystemNotification: jest.fn().mockResolvedValue(undefined),
  };

  const mockIntegrationEvents = {
    dispatchCrmEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationSchedulerService, useValue: mockNotificationScheduler },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createQuote ──────────────────────────────────────────────────────────

  describe('createQuote', () => {
    const createDto = {
      opportunityId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      accountId: 'clyyyyyyyyyyyyyyyyyyyyyyyyy',
      name: 'Enterprise License',
      paymentTerms: 'Net 30',
      description: 'A quote',
    };

    it('should create a quote with a generated quote number', async () => {
      mockPrisma.quote.count.mockResolvedValue(5);
      const year = new Date().getFullYear();
      const expectedNumber = `Q-${year}-00006`;

      mockPrisma.quote.create.mockImplementation((args: any) => ({
        ...mockQuote,
        quoteNumber: args.data.quoteNumber,
        name: args.data.name,
      }));

      const result = await service.createQuote(createDto, 'user-1', 'org-1');

      expect(result.quoteNumber).toBe(expectedNumber);
      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Enterprise License',
            status: 'DRAFT',
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should set status to DRAFT on creation', async () => {
      mockPrisma.quote.count.mockResolvedValue(0);
      mockPrisma.quote.create.mockImplementation((args: any) => ({
        ...mockQuote,
        status: args.data.status,
      }));

      const result = await service.createQuote(createDto, 'user-1', 'org-1');

      expect(result.status).toBe('DRAFT');
    });

    it('should include opportunity, account, and owner in the response', async () => {
      mockPrisma.quote.count.mockResolvedValue(0);
      mockPrisma.quote.create.mockResolvedValue(mockQuote);

      await service.createQuote(createDto, 'user-1', 'org-1');

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            opportunity: true,
            account: true,
            owner: expect.objectContaining({
              select: { id: true, name: true, email: true },
            }),
          }),
        }),
      );
    });

    it('should throw BadRequestException for Salesforce-style IDs', async () => {
      const badDto = {
        ...createDto,
        opportunityId: '006000000000001AAA', // Salesforce ID
      };

      await expect(
        service.createQuote(badDto, 'user-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getQuote ─────────────────────────────────────────────────────────────

  describe('getQuote', () => {
    it('should return the quote when found (admin)', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      const result = await service.getQuote('quote-1', 'user-1', true, 'org-1');

      expect(result).toEqual(mockQuote);
      expect(mockPrisma.quote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'quote-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      await service.getQuote('quote-1', 'user-1', false, 'org-1');

      expect(mockPrisma.quote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'quote-1',
            ownerId: 'user-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should not filter by ownerId when admin', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      await service.getQuote('quote-1', 'admin-user', true, 'org-1');

      const call = mockPrisma.quote.findFirst.mock.calls[0][0];
      expect(call.where.ownerId).toBeUndefined();
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuote('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin does not own the quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.getQuote('quote-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listQuotes ───────────────────────────────────────────────────────────

  describe('listQuotes', () => {
    it('should return all quotes for the organization', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([mockQuote]);

      const result = await service.listQuotes({}, true, 'org-1');

      expect(result).toEqual([mockQuote]);
      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ status: 'DRAFT' as any }, true, 'org-1');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });

    it('should filter by opportunityId when provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ opportunityId: 'opp-1' }, true, 'org-1');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ opportunityId: 'opp-1' }),
        }),
      );
    });

    it('should filter by accountId when provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ accountId: 'account-1' }, true, 'org-1');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: 'account-1' }),
        }),
      );
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ ownerId: 'user-1' }, false, 'org-1');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('should not filter by ownerId when admin even if provided', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ ownerId: 'user-1' }, true, 'org-1');

      const call = mockPrisma.quote.findMany.mock.calls[0][0];
      expect(call.where.ownerId).toBeUndefined();
    });

    it('should filter by quoteNumber with case-insensitive contains', async () => {
      mockPrisma.quote.findMany.mockResolvedValue([]);

      await service.listQuotes({ quoteNumber: '003' }, true, 'org-1');

      expect(mockPrisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quoteNumber: { contains: '003', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  // ─── updateQuote ──────────────────────────────────────────────────────────

  describe('updateQuote', () => {
    it('should update a quote when found and not accepted', async () => {
      const updatedQuote = { ...mockQuote, name: 'Updated Quote' };
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);

      const result = await service.updateQuote('quote-1', 'user-1', { name: 'Updated Quote' }, true, 'org-1');

      expect(result.name).toBe('Updated Quote');
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-1' },
          data: { name: 'Updated Quote' },
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.updateQuote('non-existent', 'user-1', { name: 'Foo' }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is accepted', async () => {
      const acceptedQuote = { ...mockQuote, status: 'ACCEPTED' };
      mockPrisma.quote.findFirst.mockResolvedValue(acceptedQuote);

      await expect(
        service.updateQuote('quote-1', 'user-1', { name: 'Foo' }, true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.updateQuote('quote-1', 'other-user', { name: 'Foo' }, false, 'org-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.quote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: 'other-user',
          }),
        }),
      );
    });
  });

  // ─── addLineItem ──────────────────────────────────────────────────────────

  describe('addLineItem', () => {
    const lineItemDto = {
      productName: 'Widget Pro',
      productCode: 'WDG-001',
      description: 'Premium widget',
      quantity: 5,
      listPrice: 200,
      unitPrice: 180,
      discount: 100,
    };

    it('should add a line item and recalculate totals', async () => {
      const quoteWithItems = { ...mockQuote, lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quoteLineItem.create.mockResolvedValue(mockLineItem);
      // recalculateQuoteTotals
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([mockLineItem]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      const result = await service.addLineItem('quote-1', 'user-1', lineItemDto, true, 'org-1');

      expect(result).toEqual(mockLineItem);
      expect(mockPrisma.quoteLineItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quoteId: 'quote-1',
            productName: 'Widget Pro',
            totalPrice: 800, // (5 * 180) - 100
            sortOrder: 1,
          }),
        }),
      );
    });

    it('should calculate totalPrice as max(0, quantity * unitPrice - discount)', async () => {
      const quoteWithItems = { ...mockQuote, lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quoteLineItem.create.mockResolvedValue(mockLineItem);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      await service.addLineItem('quote-1', 'user-1', {
        productName: 'Cheap',
        quantity: 1,
        listPrice: 10,
        unitPrice: 5,
        discount: 100, // Discount exceeds price
      }, true, 'org-1');

      expect(mockPrisma.quoteLineItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalPrice: 0, // max(0, 1*5 - 100) = 0
          }),
        }),
      );
    });

    it('should default discount to 0 when not provided', async () => {
      const quoteWithItems = { ...mockQuote, lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quoteLineItem.create.mockResolvedValue(mockLineItem);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      await service.addLineItem('quote-1', 'user-1', {
        productName: 'Simple',
        quantity: 2,
        listPrice: 50,
        unitPrice: 50,
      }, true, 'org-1');

      expect(mockPrisma.quoteLineItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discount: 0,
            totalPrice: 100, // 2 * 50
          }),
        }),
      );
    });

    it('should set sortOrder based on existing line items count', async () => {
      const quoteWithItems = {
        ...mockQuote,
        lineItems: [{ id: 'li-existing' }, { id: 'li-existing-2' }],
      };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quoteLineItem.create.mockResolvedValue(mockLineItem);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      await service.addLineItem('quote-1', 'user-1', lineItemDto, true, 'org-1');

      expect(mockPrisma.quoteLineItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 3, // 2 existing + 1
          }),
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.addLineItem('non-existent', 'user-1', lineItemDto, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is accepted', async () => {
      const acceptedQuote = { ...mockQuote, status: 'ACCEPTED', lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(acceptedQuote);

      await expect(
        service.addLineItem('quote-1', 'user-1', lineItemDto, true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateLineItem ───────────────────────────────────────────────────────

  describe('updateLineItem', () => {
    it('should update a line item and recalculate totals', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, organizationId: 'org-1' },
      };
      const updatedItem = { ...mockLineItem, quantity: 10, totalPrice: 1700 };

      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);
      mockPrisma.quoteLineItem.update.mockResolvedValue(updatedItem);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([updatedItem]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      const result = await service.updateLineItem('li-1', 'user-1', { quantity: 10 }, true, 'org-1');

      expect(result.quantity).toBe(10);
      expect(mockPrisma.quoteLineItem.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when line item does not exist', async () => {
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLineItem('non-existent', 'user-1', { quantity: 1 }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin does not own the quote', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, ownerId: 'other-user', organizationId: 'org-1' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);

      await expect(
        service.updateLineItem('li-1', 'user-1', { quantity: 1 }, false, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when line item belongs to different org', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, organizationId: 'other-org' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);

      await expect(
        service.updateLineItem('li-1', 'user-1', { quantity: 1 }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is accepted', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, status: 'ACCEPTED', organizationId: 'org-1' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);

      await expect(
        service.updateLineItem('li-1', 'user-1', { quantity: 1 }, true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── removeLineItem ───────────────────────────────────────────────────────

  describe('removeLineItem', () => {
    it('should delete a line item and recalculate totals', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, organizationId: 'org-1' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);
      mockPrisma.quoteLineItem.delete.mockResolvedValue(lineItemWithQuote);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      await service.removeLineItem('li-1', 'user-1', true, 'org-1');

      expect(mockPrisma.quoteLineItem.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'li-1' } }),
      );
    });

    it('should throw NotFoundException when line item does not exist', async () => {
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeLineItem('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when non-admin does not own the quote', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, ownerId: 'other-user', organizationId: 'org-1' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);

      await expect(
        service.removeLineItem('li-1', 'user-1', false, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is accepted', async () => {
      const lineItemWithQuote = {
        ...mockLineItem,
        quote: { ...mockQuote, status: 'ACCEPTED', organizationId: 'org-1' },
      };
      mockPrisma.quoteLineItem.findUnique.mockResolvedValue(lineItemWithQuote);

      await expect(
        service.removeLineItem('li-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── sendQuote ────────────────────────────────────────────────────────────

  describe('sendQuote', () => {
    it('should send a draft quote with line items', async () => {
      const quoteWithItems = {
        ...mockQuote,
        status: 'DRAFT',
        lineItems: [mockLineItem],
      };
      const sentQuote = { ...mockQuote, status: 'SENT', sentDate: new Date() };

      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quote.update.mockResolvedValue(sentQuote);

      const result = await service.sendQuote('quote-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('SENT');
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-1' },
          data: expect.objectContaining({
            status: 'SENT',
            sentDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should dispatch an integration event when quote is sent', async () => {
      const quoteWithItems = {
        ...mockQuote,
        status: 'DRAFT',
        lineItems: [mockLineItem],
      };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'SENT' });

      await service.sendQuote('quote-1', 'user-1', true, 'org-1');

      expect(mockIntegrationEvents.dispatchCrmEvent).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          type: 'QUOTE_SENT',
          entityType: 'quote',
          entityId: 'quote-1',
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.sendQuote('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote has no line items', async () => {
      const quoteNoItems = { ...mockQuote, status: 'DRAFT', lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteNoItems);

      await expect(
        service.sendQuote('quote-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quote is not in DRAFT status', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        lineItems: [mockLineItem],
      };
      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);

      await expect(
        service.sendQuote('quote-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw even if integration event dispatch fails', async () => {
      const quoteWithItems = {
        ...mockQuote,
        status: 'DRAFT',
        lineItems: [mockLineItem],
      };
      mockPrisma.quote.findFirst.mockResolvedValue(quoteWithItems);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'SENT' });
      mockIntegrationEvents.dispatchCrmEvent.mockRejectedValue(new Error('Network error'));

      const result = await service.sendQuote('quote-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('SENT');
    });
  });

  // ─── acceptQuote ──────────────────────────────────────────────────────────

  describe('acceptQuote', () => {
    it('should accept a sent quote', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      const acceptedQuote = { ...mockQuote, status: 'ACCEPTED', acceptedDate: new Date() };

      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue(acceptedQuote);

      const result = await service.acceptQuote('quote-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('ACCEPTED');
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'quote-1' },
          data: expect.objectContaining({
            status: 'ACCEPTED',
            acceptedDate: expect.any(Date),
          }),
        }),
      );
    });

    it('should send a notification when quote is accepted', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' });

      await service.acceptQuote('quote-1', 'user-1', true, 'org-1');

      expect(mockNotificationScheduler.sendSystemNotification).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Quote Accepted'),
        expect.any(String),
        expect.objectContaining({
          type: 'DEAL_UPDATE',
          priority: 'HIGH',
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptQuote('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is not in SENT status', async () => {
      const draftQuote = { ...mockQuote, status: 'DRAFT' };
      mockPrisma.quote.findFirst.mockResolvedValue(draftQuote);

      await expect(
        service.acceptQuote('quote-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw even if notification fails', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' });
      mockNotificationScheduler.sendSystemNotification.mockRejectedValue(new Error('fail'));

      const result = await service.acceptQuote('quote-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('ACCEPTED');
    });
  });

  // ─── rejectQuote ──────────────────────────────────────────────────────────

  describe('rejectQuote', () => {
    it('should reject a sent quote with a reason', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      const rejectedQuote = {
        ...mockQuote,
        status: 'REJECTED',
        rejectedDate: new Date(),
        rejectedReason: 'Too expensive',
      };

      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue(rejectedQuote);

      const result = await service.rejectQuote('quote-1', 'user-1', 'Too expensive', true, 'org-1');

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            rejectedReason: 'Too expensive',
          }),
        }),
      );
    });

    it('should reject a quote without a reason', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'REJECTED' });

      await service.rejectQuote('quote-1', 'user-1', undefined, true, 'org-1');

      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rejectedReason: undefined,
          }),
        }),
      );
    });

    it('should send a notification when quote is rejected', async () => {
      const sentQuote = {
        ...mockQuote,
        status: 'SENT',
        opportunity: { name: 'Big Deal' },
        account: { name: 'Acme Corp' },
      };
      mockPrisma.quote.findFirst.mockResolvedValue(sentQuote);
      mockPrisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'REJECTED' });

      await service.rejectQuote('quote-1', 'user-1', 'Reason', true, 'org-1');

      expect(mockNotificationScheduler.sendSystemNotification).toHaveBeenCalledWith(
        'user-1',
        'Quote Rejected',
        expect.stringContaining('Reason'),
        expect.objectContaining({
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
        }),
      );
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.rejectQuote('non-existent', 'user-1', undefined, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote is not in SENT status', async () => {
      const draftQuote = { ...mockQuote, status: 'DRAFT' };
      mockPrisma.quote.findFirst.mockResolvedValue(draftQuote);

      await expect(
        service.rejectQuote('quote-1', 'user-1', undefined, true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getQuoteStats ────────────────────────────────────────────────────────

  describe('getQuoteStats', () => {
    it('should return aggregate stats for admin', async () => {
      mockPrisma.quote.count.mockResolvedValue(10);
      mockPrisma.quote.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: 4 },
        { status: 'SENT', _count: 3 },
        { status: 'ACCEPTED', _count: 3 },
      ]);
      mockPrisma.quote.aggregate
        .mockResolvedValueOnce({ _sum: { totalPrice: 50000 } })
        .mockResolvedValueOnce({ _sum: { totalPrice: 15000 } });

      const result = await service.getQuoteStats('user-1', true, 'org-1');

      expect(result.total).toBe(10);
      expect(result.totalValue).toBe(50000);
      expect(result.acceptedValue).toBe(15000);
      expect(result.byStatus).toEqual([
        { status: 'DRAFT', _count: 4 },
        { status: 'SENT', _count: 3 },
        { status: 'ACCEPTED', _count: 3 },
      ]);
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.quote.count.mockResolvedValue(5);
      mockPrisma.quote.groupBy.mockResolvedValue([]);
      mockPrisma.quote.aggregate
        .mockResolvedValueOnce({ _sum: { totalPrice: null } })
        .mockResolvedValueOnce({ _sum: { totalPrice: null } });

      await service.getQuoteStats('user-1', false, 'org-1');

      expect(mockPrisma.quote.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });

    it('should handle zero quotes gracefully', async () => {
      mockPrisma.quote.count.mockResolvedValue(0);
      mockPrisma.quote.groupBy.mockResolvedValue([]);
      mockPrisma.quote.aggregate
        .mockResolvedValueOnce({ _sum: { totalPrice: null } })
        .mockResolvedValueOnce({ _sum: { totalPrice: null } });

      const result = await service.getQuoteStats(undefined, true, 'org-1');

      expect(result.total).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.acceptedValue).toBe(0);
    });
  });

  // ─── generatePdf ──────────────────────────────────────────────────────────

  describe('generatePdf', () => {
    it('should return quote data for PDF generation', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      const result = await service.generatePdf('quote-1', 'user-1', true, 'org-1');

      expect(result).toHaveProperty('quote');
      expect(result).toHaveProperty('generatedAt');
      expect(result.quote).toEqual(mockQuote);
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePdf('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      await expect(
        service.generatePdf('quote-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to generate PDF for any quote', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);

      const result = await service.generatePdf('quote-1', 'admin-user', true, 'org-1');

      expect(result.quote).toEqual(mockQuote);
    });
  });

  // ─── cloneQuote ───────────────────────────────────────────────────────────

  describe('cloneQuote', () => {
    it('should clone a quote with its line items', async () => {
      const originalQuote = {
        ...mockQuote,
        lineItems: [mockLineItem],
      };
      const clonedQuote = {
        ...mockQuote,
        id: 'quote-2',
        quoteNumber: 'Q-2026-00002',
        name: 'Enterprise License (Copy)',
        status: 'DRAFT',
        ownerId: 'user-1',
      };

      mockPrisma.quote.findFirst.mockResolvedValue(originalQuote);
      mockPrisma.quote.count.mockResolvedValue(1);
      mockPrisma.quote.create.mockResolvedValue(clonedQuote);
      mockPrisma.quoteLineItem.createMany.mockResolvedValue({ count: 1 });

      const result = await service.cloneQuote('quote-1', 'user-1', true, 'org-1');

      expect(result.name).toBe('Enterprise License (Copy)');
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.quoteLineItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              quoteId: 'quote-2',
              productName: 'Widget Pro',
            }),
          ]),
        }),
      );
    });

    it('should not clone line items when original has none', async () => {
      const originalQuote = { ...mockQuote, lineItems: [] };
      const clonedQuote = { ...mockQuote, id: 'quote-2', name: 'Enterprise License (Copy)' };

      mockPrisma.quote.findFirst.mockResolvedValue(originalQuote);
      mockPrisma.quote.count.mockResolvedValue(1);
      mockPrisma.quote.create.mockResolvedValue(clonedQuote);

      await service.cloneQuote('quote-1', 'user-1', true, 'org-1');

      expect(mockPrisma.quoteLineItem.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.cloneQuote('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue({ ...mockQuote, lineItems: [] });

      await expect(
        service.cloneQuote('quote-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set the cloning user as the new owner', async () => {
      const originalQuote = { ...mockQuote, lineItems: [] };
      mockPrisma.quote.findFirst.mockResolvedValue(originalQuote);
      mockPrisma.quote.count.mockResolvedValue(5);
      mockPrisma.quote.create.mockResolvedValue({ ...mockQuote, ownerId: 'new-user' });

      await service.cloneQuote('quote-1', 'new-user', true, 'org-1');

      expect(mockPrisma.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'new-user',
          }),
        }),
      );
    });
  });

  // ─── recalculateQuote ─────────────────────────────────────────────────────

  describe('recalculateQuote', () => {
    it('should recalculate totals and return the updated quote', async () => {
      const updatedQuote = { ...mockQuote, subtotal: 800, totalPrice: 860 };

      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([mockLineItem]);
      mockPrisma.quote.findUnique
        .mockResolvedValueOnce(mockQuote)       // inside recalculateQuoteTotals
        .mockResolvedValueOnce(updatedQuote);    // final return
      mockPrisma.quote.update.mockResolvedValue(updatedQuote);

      const result = await service.recalculateQuote('quote-1', 'user-1', true, 'org-1');

      expect(result).toEqual(updatedQuote);
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(null);

      await expect(
        service.recalculateQuote('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when quote disappears after recalculation', async () => {
      mockPrisma.quote.findFirst.mockResolvedValue(mockQuote);
      mockPrisma.quoteLineItem.findMany.mockResolvedValue([]);
      mockPrisma.quote.findUnique
        .mockResolvedValueOnce(mockQuote)   // inside recalculateQuoteTotals
        .mockResolvedValueOnce(null);        // disappears after recalculation
      mockPrisma.quote.update.mockResolvedValue(mockQuote);

      await expect(
        service.recalculateQuote('quote-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
