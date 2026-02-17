import { Test, TestingModule } from '@nestjs/testing';
import { OutcomeInvoiceGeneratorService } from './outcome-invoice-generator.service';
import { PrismaService } from '../database/prisma.service';

describe('OutcomeInvoiceGeneratorService', () => {
  let service: OutcomeInvoiceGeneratorService;
  let prisma: PrismaService;

  // ============= Mock Data =============

  const mockPlan = {
    id: 'plan-1',
    organizationId: 'org-1',
    pricingModel: 'REVENUE_SHARE',
    revenueSharePercent: 2.5,
    billingDay: 15,
    currency: 'USD',
    isActive: true,
    organization: {
      id: 'org-1',
      name: 'Test Corp',
      members: [
        {
          role: 'OWNER',
          isActive: true,
          user: {
            id: 'user-1',
            billingCustomer: { id: 'cust-1' },
          },
        },
      ],
    },
  };

  const mockPendingEvents = [
    {
      id: 'event-1',
      organizationId: 'org-1',
      outcomePricingPlanId: 'plan-1',
      opportunityId: 'opp-1',
      opportunityName: 'Deal Alpha',
      accountName: 'Acme Inc',
      dealAmount: 2500000,  // $25,000
      closedDate: new Date('2026-01-15'),
      ownerId: 'user-1',
      ownerName: 'John Doe',
      feeAmount: 62500,     // $625
      feeCalculation: { model: 'REVENUE_SHARE', dealAmount: 2500000, percent: 2.5 },
      status: 'PENDING',
      billingPeriodStart: new Date('2026-01-01'),
      billingPeriodEnd: new Date('2026-01-31'),
    },
    {
      id: 'event-2',
      organizationId: 'org-1',
      outcomePricingPlanId: 'plan-1',
      opportunityId: 'opp-2',
      opportunityName: 'Deal Beta',
      accountName: 'Beta Corp',
      dealAmount: 1000000,  // $10,000
      closedDate: new Date('2026-01-20'),
      ownerId: 'user-2',
      ownerName: 'Jane Smith',
      feeAmount: 25000,     // $250
      feeCalculation: { model: 'REVENUE_SHARE', dealAmount: 1000000, percent: 2.5 },
      status: 'PENDING',
      billingPeriodStart: new Date('2026-01-01'),
      billingPeriodEnd: new Date('2026-01-31'),
    },
  ];

  const mockInvoice = {
    id: 'inv-1',
    invoiceNumber: 'OBB-ORG001-TEST123',
    customerId: 'cust-1',
    status: 'OPEN',
    currency: 'USD',
    subtotal: 87500,
    discountAmount: 0,
    taxAmount: 0,
    total: 87500,
    amountPaid: 0,
    amountDue: 87500,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    billingReason: 'outcome_billing',
    lineItems: [
      {
        id: 'li-1',
        description: 'Deal closed: Deal Alpha (Acme Inc) - $25,000 deal',
        quantity: 1,
        unitAmount: 62500,
        amount: 62500,
        type: 'outcome_fee',
      },
      {
        id: 'li-2',
        description: 'Deal closed: Deal Beta (Beta Corp) - $10,000 deal',
        quantity: 1,
        unitAmount: 25000,
        amount: 25000,
        type: 'outcome_fee',
      },
    ],
  };

  // Transaction mock: execute the callback with the same mock prisma
  const mockTransaction = jest.fn((callback) => callback(mockPrisma));

  const mockPrisma = {
    outcomePricingPlan: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    outcomeEvent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: mockTransaction,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutcomeInvoiceGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OutcomeInvoiceGeneratorService>(
      OutcomeInvoiceGeneratorService,
    );
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================================
  // INVOICE GENERATION TESTS
  // =============================================================

  describe('generateOutcomeInvoice', () => {
    it('should generate invoice for pending outcome events', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.generateOutcomeInvoice('org-1');

      expect(result).toBeDefined();
      expect(result!.invoiceNumber).toBeDefined();
      expect(result!.total).toBe(87500); // $875 total
      expect(result!.lineItems).toHaveLength(2);
    });

    it('should create invoice with correct metadata', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      await service.generateOutcomeInvoice('org-1');

      // Check the transaction was called
      expect(mockTransaction).toHaveBeenCalled();

      // Check invoice.create was called with correct structure
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            status: 'OPEN',
            currency: 'USD',
            subtotal: 87500,
            total: 87500,
            amountDue: 87500,
            billingReason: 'outcome_billing',
            metadata: expect.objectContaining({
              organizationId: 'org-1',
              pricingModel: 'REVENUE_SHARE',
              eventCount: 2,
              totalDealValue: 3500000,
            }),
          }),
        }),
      );
    });

    it('should transition events from PENDING to INVOICED', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      await service.generateOutcomeInvoice('org-1');

      expect(mockPrisma.outcomeEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['event-1', 'event-2'] },
        },
        data: expect.objectContaining({
          status: 'INVOICED',
          invoiceId: 'inv-1',
        }),
      });
    });

    it('should return null when no active plan exists', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(null);

      const result = await service.generateOutcomeInvoice('org-1');

      expect(result).toBeNull();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should return null when plan is inactive', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        isActive: false,
      });

      const result = await service.generateOutcomeInvoice('org-1');

      expect(result).toBeNull();
    });

    it('should return null when no pending events exist', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([]);

      const result = await service.generateOutcomeInvoice('org-1');

      expect(result).toBeNull();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should return null when no billing customer is set up', async () => {
      const planNoBilling = {
        ...mockPlan,
        organization: {
          ...mockPlan.organization,
          members: [
            {
              role: 'OWNER',
              isActive: true,
              user: { id: 'user-1', billingCustomer: null },
            },
          ],
        },
      };
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(planNoBilling);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);

      const result = await service.generateOutcomeInvoice('org-1');

      expect(result).toBeNull();
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should create line items for each outcome event', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      await service.generateOutcomeInvoice('org-1');

      const createCall = mockPrisma.invoice.create.mock.calls[0][0];
      const lineItems = createCall.data.lineItems.create;

      expect(lineItems).toHaveLength(2);
      expect(lineItems[0]).toEqual(
        expect.objectContaining({
          quantity: 1,
          unitAmount: 62500,
          amount: 62500,
          type: 'outcome_fee',
        }),
      );
      expect(lineItems[1]).toEqual(
        expect.objectContaining({
          quantity: 1,
          unitAmount: 25000,
          amount: 25000,
          type: 'outcome_fee',
        }),
      );
    });

    it('should set 30-day due date', async () => {
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      await service.generateOutcomeInvoice('org-1');

      const createCall = mockPrisma.invoice.create.mock.calls[0][0];
      const dueDate = createCall.data.dueDate;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Allow 5 second tolerance for test execution time
      expect(Math.abs(dueDate.getTime() - thirtyDaysFromNow.getTime())).toBeLessThan(5000);
    });
  });

  // =============================================================
  // MARK EVENTS AS PAID TESTS
  // =============================================================

  describe('markEventsAsPaid', () => {
    it('should update INVOICED events to PAID', async () => {
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markEventsAsPaid('inv-1');

      expect(result).toBe(3);
      expect(mockPrisma.outcomeEvent.updateMany).toHaveBeenCalledWith({
        where: {
          invoiceId: 'inv-1',
          status: 'INVOICED',
        },
        data: {
          status: 'PAID',
        },
      });
    });

    it('should return 0 when no events match', async () => {
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markEventsAsPaid('non-existent-inv');

      expect(result).toBe(0);
    });
  });

  // =============================================================
  // DAILY BILLING CRON TESTS
  // =============================================================

  describe('processOutcomeBilling', () => {
    it('should process billing for organizations with matching billing day', async () => {
      const today = new Date().getDate();
      const planForToday = { ...mockPlan, billingDay: today };
      mockPrisma.outcomePricingPlan.findMany.mockResolvedValue([planForToday]);

      // Mock the invoice generation flow
      mockPrisma.outcomePricingPlan.findUnique.mockResolvedValue(planForToday);
      mockPrisma.outcomeEvent.findMany.mockResolvedValue(mockPendingEvents);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.outcomeEvent.updateMany.mockResolvedValue({ count: 2 });

      await service.processOutcomeBilling();

      // Should query for plans with today's billing day
      expect(mockPrisma.outcomePricingPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            billingDay: today,
          },
        }),
      );
    });

    it('should handle no organizations with billing day today', async () => {
      mockPrisma.outcomePricingPlan.findMany.mockResolvedValue([]);

      await expect(service.processOutcomeBilling()).resolves.not.toThrow();
    });

    it('should continue processing other orgs if one fails', async () => {
      const today = new Date().getDate();
      const plans = [
        { ...mockPlan, organizationId: 'org-fail', organization: { id: 'org-fail', name: 'Fail Corp' }, billingDay: today },
        { ...mockPlan, organizationId: 'org-pass', organization: { id: 'org-pass', name: 'Pass Corp' }, billingDay: today },
      ];
      mockPrisma.outcomePricingPlan.findMany.mockResolvedValue(plans);

      // First org fails, second succeeds
      mockPrisma.outcomePricingPlan.findUnique
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ ...mockPlan, organizationId: 'org-pass' });
      mockPrisma.outcomeEvent.findMany.mockResolvedValue([]);

      await expect(service.processOutcomeBilling()).resolves.not.toThrow();
    });
  });

  // =============================================================
  // INVOICE SUMMARY TESTS
  // =============================================================

  describe('getInvoiceSummary', () => {
    it('should return summary of recent invoices', async () => {
      const invoices = [
        { ...mockInvoice, status: 'PAID', total: 87500, amountDue: 0 },
        { ...mockInvoice, id: 'inv-2', status: 'OPEN', total: 50000, amountDue: 50000 },
      ];
      mockPrisma.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getInvoiceSummary('org-1');

      expect(result.totalInvoices).toBe(2);
      expect(result.totalAmount).toBe(137500); // $875 + $500
      expect(result.paidAmount).toBe(87500);   // Only PAID invoices
      expect(result.outstandingAmount).toBe(50000); // Only OPEN invoices
      expect(result.recentInvoices).toHaveLength(2);
    });

    it('should return empty summary when no invoices exist', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getInvoiceSummary('org-1');

      expect(result.totalInvoices).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.paidAmount).toBe(0);
      expect(result.outstandingAmount).toBe(0);
      expect(result.recentInvoices).toHaveLength(0);
    });

    it('should query with correct filters', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await service.getInvoiceSummary('org-1');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          billingReason: 'outcome_billing',
          metadata: {
            path: ['organizationId'],
            equals: 'org-1',
          },
        },
        include: { lineItems: true },
        orderBy: { invoiceDate: 'desc' },
        take: 12,
      });
    });
  });
});
