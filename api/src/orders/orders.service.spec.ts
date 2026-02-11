import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../database/prisma.service';
import { IntegrationEventsService } from '../integrations/events/integration-events.service';
import { OrderPdfGenerator } from './pdf-generator.util';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-2026-00001',
    ownerId: 'user-1',
    accountId: 'account-1',
    quoteId: null,
    name: 'Test Order',
    status: 'DRAFT',
    paymentStatus: 'PENDING',
    fulfillmentStatus: 'UNFULFILLED',
    orderDate: new Date(),
    expectedDeliveryDate: null,
    subtotal: 100,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 100,
    paymentTerms: null,
    paymentMethod: null,
    shippingMethod: null,
    trackingNumber: null,
    notes: null,
    internalNotes: null,
    billingStreet: null,
    billingCity: null,
    billingState: null,
    billingPostalCode: null,
    billingCountry: null,
    shippingStreet: null,
    shippingCity: null,
    shippingState: null,
    shippingPostalCode: null,
    shippingCountry: null,
    shippedAt: null,
    deliveredAt: null,
    paidAmount: 0,
    paidAt: null,
    organizationId: 'org-1',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    lineItems: [],
    account: { id: 'account-1', name: 'Test Account' },
  };

  const mockLineItem = {
    id: 'li-1',
    orderId: 'order-1',
    productId: 'prod-1',
    productName: 'Widget',
    productCode: 'WDG-001',
    description: 'A widget',
    quantity: 2,
    unitPrice: 50,
    discount: 0,
    tax: 0,
    totalPrice: 100,
    sortOrder: 0,
    order: mockOrder,
  };

  const mockPrisma = {
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    orderLineItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quote: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockIntegrationEvents = {
    dispatchCrmEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockPdfGenerator = {
    generateOrderPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        { provide: OrderPdfGenerator, useValue: mockPdfGenerator },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createOrder ────────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('should create an order via transaction and dispatch integration event', async () => {
      const createdOrder = {
        ...mockOrder,
        account: { id: 'account-1', name: 'Test Account' },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          order: {
            create: jest.fn().mockResolvedValue(createdOrder),
          },
        };
        return cb(tx);
      });

      const result = await service.createOrder(
        { accountId: 'account-1', name: 'Test Order' },
        'user-1',
        'org-1',
      );

      expect(result).toEqual(createdOrder);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockIntegrationEvents.dispatchCrmEvent).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          type: 'ORDER_CREATED',
          entityType: 'order',
        }),
      );
    });

    it('should generate a sequential order number', async () => {
      const year = new Date().getFullYear();

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([
            { orderNumber: `ORD-${year}-00003` },
          ]),
          order: {
            create: jest.fn().mockImplementation((args: any) => ({
              ...mockOrder,
              orderNumber: args.data.orderNumber,
            })),
          },
        };
        return cb(tx);
      });

      const result = await service.createOrder(
        { accountId: 'account-1', name: 'Test Order' },
        'user-1',
        'org-1',
      );

      expect(result.orderNumber).toBe(`ORD-${year}-00004`);
    });
  });

  // ─── listOrders ─────────────────────────────────────────────────────────────

  describe('listOrders', () => {
    it('should return a list of orders with account and line items', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.listOrders({}, true, 'org-1');

      expect(result).toEqual([mockOrder]);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1' }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.listOrders({ status: 'CONFIRMED' as any }, true, 'org-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
    });

    it('should filter by search across orderNumber and name', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.listOrders({ search: 'Widget' }, true, 'org-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { orderNumber: { contains: 'Widget', mode: 'insensitive' } },
              { name: { contains: 'Widget', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by ownerId when not admin', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.listOrders({ ownerId: 'user-1' }, false, 'org-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'user-1' }),
        }),
      );
    });
  });

  // ─── getOrder ───────────────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('should return the order when found and user is admin', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-1', 'user-1', true, 'org-1');

      expect(result).toEqual(mockOrder);
    });

    it('should return the order when user is the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getOrder('order-1', 'user-1', false, 'org-1');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrder('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.getOrder('order-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── updateOrder ────────────────────────────────────────────────────────────

  describe('updateOrder', () => {
    it('should update the order when user is admin', async () => {
      const updatedOrder = { ...mockOrder, name: 'Updated Order' };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrder(
        'order-1',
        'user-1',
        { name: 'Updated Order' },
        true,
        'org-1',
      );

      expect(result.name).toBe('Updated Order');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ name: 'Updated Order' }),
        }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrder('non-existent', 'user-1', { name: 'Foo' }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.updateOrder('order-1', 'other-user', { name: 'Foo' }, false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── addLineItem ────────────────────────────────────────────────────────────

  describe('addLineItem', () => {
    it('should add a line item and recalculate totals', async () => {
      const newLineItem = { ...mockLineItem };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.orderLineItem.create.mockResolvedValue(newLineItem);
      mockPrisma.orderLineItem.findMany.mockResolvedValue([newLineItem]);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const result = await service.addLineItem(
        'order-1',
        'user-1',
        { productName: 'Widget', quantity: 2, unitPrice: 50 },
        true,
        'org-1',
      );

      expect(result).toEqual(newLineItem);
      expect(mockPrisma.orderLineItem.create).toHaveBeenCalled();
      // recalculateOrderTotals should have been called
      expect(mockPrisma.orderLineItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderId: 'order-1' } }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.addLineItem(
          'non-existent',
          'user-1',
          { productName: 'Widget', quantity: 1, unitPrice: 10 },
          true,
          'org-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.addLineItem(
          'order-1',
          'other-user',
          { productName: 'Widget', quantity: 1, unitPrice: 10 },
          false,
          'org-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── updateLineItem ────────────────────────────────────────────────────────

  describe('updateLineItem', () => {
    it('should update a line item and recalculate totals', async () => {
      const lineItemWithOrder = {
        ...mockLineItem,
        order: { ...mockOrder, organizationId: 'org-1' },
      };
      const updatedItem = { ...mockLineItem, quantity: 5, totalPrice: 250 };

      mockPrisma.orderLineItem.findUnique.mockResolvedValue(lineItemWithOrder);
      mockPrisma.orderLineItem.update.mockResolvedValue(updatedItem);
      mockPrisma.orderLineItem.findMany.mockResolvedValue([updatedItem]);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const result = await service.updateLineItem(
        'li-1',
        'user-1',
        { quantity: 5 },
        true,
        'org-1',
      );

      expect(result.quantity).toBe(5);
      expect(mockPrisma.orderLineItem.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when line item does not exist', async () => {
      mockPrisma.orderLineItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLineItem('non-existent', 'user-1', { quantity: 1 }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when line item belongs to different org', async () => {
      const lineItemWithOrder = {
        ...mockLineItem,
        order: { ...mockOrder, organizationId: 'other-org' },
      };
      mockPrisma.orderLineItem.findUnique.mockResolvedValue(lineItemWithOrder);

      await expect(
        service.updateLineItem('li-1', 'user-1', { quantity: 1 }, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeLineItem ────────────────────────────────────────────────────────

  describe('removeLineItem', () => {
    it('should delete a line item and recalculate totals', async () => {
      const lineItemWithOrder = {
        ...mockLineItem,
        order: { ...mockOrder, organizationId: 'org-1' },
      };

      mockPrisma.orderLineItem.findUnique.mockResolvedValue(lineItemWithOrder);
      mockPrisma.orderLineItem.delete.mockResolvedValue(lineItemWithOrder);
      mockPrisma.orderLineItem.findMany.mockResolvedValue([]);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const result = await service.removeLineItem('li-1', 'user-1', true, 'org-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.orderLineItem.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'li-1' } }),
      );
    });

    it('should throw NotFoundException when line item does not exist', async () => {
      mockPrisma.orderLineItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeLineItem('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancelOrder ────────────────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('should cancel a draft order', async () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder('order-1', 'user-1', 'org-1', true);

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should throw BadRequestException for delivered orders', async () => {
      const deliveredOrder = { ...mockOrder, status: 'DELIVERED' };
      mockPrisma.order.findFirst.mockResolvedValue(deliveredOrder);

      await expect(
        service.cancelOrder('order-1', 'user-1', 'org-1', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already cancelled orders', async () => {
      const cancelledOrder = { ...mockOrder, status: 'CANCELLED' };
      mockPrisma.order.findFirst.mockResolvedValue(cancelledOrder);

      await expect(
        service.cancelOrder('order-1', 'user-1', 'org-1', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelOrder('non-existent', 'user-1', 'org-1', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should append cancellation reason to internalNotes', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CANCELLED' });

      await service.cancelOrder('order-1', 'user-1', 'org-1', true, 'Customer requested');

      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            internalNotes: expect.stringContaining('Customer requested'),
          }),
        }),
      );
    });
  });

  // ─── confirmOrder ──────────────────────────────────────────────────────────

  describe('confirmOrder', () => {
    it('should confirm a draft order', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(confirmedOrder);

      const result = await service.confirmOrder('order-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('CONFIRMED');
    });

    it('should throw BadRequestException when order is not DRAFT or PENDING', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      mockPrisma.order.findFirst.mockResolvedValue(confirmedOrder);

      await expect(
        service.confirmOrder('order-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmOrder('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── shipOrder ─────────────────────────────────────────────────────────────

  describe('shipOrder', () => {
    it('should update order to shipped status with tracking number', async () => {
      const shippedOrder = { ...mockOrder, status: 'SHIPPED', trackingNumber: 'TRACK-123' };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(shippedOrder);

      const result = await service.shipOrder(
        'order-1',
        'user-1',
        { trackingNumber: 'TRACK-123' },
        true,
        'org-1',
      );

      expect(result.status).toBe('SHIPPED');
      expect(result.trackingNumber).toBe('TRACK-123');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SHIPPED',
            fulfillmentStatus: 'FULFILLED',
            trackingNumber: 'TRACK-123',
            shippedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.shipOrder('non-existent', 'user-1', {}, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deliverOrder ──────────────────────────────────────────────────────────

  describe('deliverOrder', () => {
    it('should update order to delivered status', async () => {
      const deliveredOrder = { ...mockOrder, status: 'DELIVERED', deliveredAt: new Date() };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(deliveredOrder);

      const result = await service.deliverOrder('order-1', 'user-1', true, 'org-1');

      expect(result.status).toBe('DELIVERED');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DELIVERED',
            deliveredAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.deliverOrder('order-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── cloneOrder ────────────────────────────────────────────────────────────

  describe('cloneOrder', () => {
    it('should clone an existing order with new order number', async () => {
      const orderWithItems = {
        ...mockOrder,
        lineItems: [mockLineItem],
      };
      const clonedOrder = {
        ...mockOrder,
        id: 'order-2',
        orderNumber: 'ORD-2026-00002',
        name: 'Copy of Test Order',
      };

      mockPrisma.order.findFirst.mockResolvedValue(orderWithItems);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([
            { orderNumber: 'ORD-2026-00001' },
          ]),
          order: {
            create: jest.fn().mockResolvedValue(clonedOrder),
          },
        };
        return cb(tx);
      });

      const result = await service.cloneOrder('order-1', 'user-1', true, 'org-1');

      expect(result.name).toBe('Copy of Test Order');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.cloneOrder('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.cloneOrder('order-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteOrder ───────────────────────────────────────────────────────────

  describe('deleteOrder', () => {
    it('should delete a draft order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.delete.mockResolvedValue(mockOrder);

      const result = await service.deleteOrder('order-1', 'user-1', true, 'org-1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.order.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-1' } }),
      );
    });

    it('should throw BadRequestException when order is not draft', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      mockPrisma.order.findFirst.mockResolvedValue(confirmedOrder);

      await expect(
        service.deleteOrder('order-1', 'user-1', true, 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteOrder('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.deleteOrder('order-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getOrderStats ────────────────────────────────────────────────────────

  describe('getOrderStats', () => {
    it('should return aggregate order statistics for admin', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // ordersThisMonth
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ status: 'DRAFT', _count: 4 }, { status: 'CONFIRMED', _count: 6 }])
        .mockResolvedValueOnce([{ paymentStatus: 'PENDING', _count: 7 }, { paymentStatus: 'PAID', _count: 3 }])
        .mockResolvedValueOnce([{ fulfillmentStatus: 'UNFULFILLED', _count: 8 }, { fulfillmentStatus: 'FULFILLED', _count: 2 }]);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 5000 } }) // totalRevenue
        .mockResolvedValueOnce({ _sum: { total: 2000 } }) // paidRevenue
        .mockResolvedValueOnce({ _sum: { total: 1500 } }); // revenueThisMonth

      const result = await service.getOrderStats('user-1', true, 'org-1');

      expect(result.total).toBe(10);
      expect(result.totalRevenue).toBe(5000);
      expect(result.paidRevenue).toBe(2000);
      expect(result.pendingRevenue).toBe(3000);
      expect(result.averageOrderValue).toBe(500);
      expect(result.ordersThisMonth).toBe(3);
      expect(result.revenueThisMonth).toBe(1500);
      expect(result.byStatus).toEqual({ DRAFT: 4, CONFIRMED: 6 });
      expect(result.byPaymentStatus).toEqual({ PENDING: 7, PAID: 3 });
      expect(result.byFulfillmentStatus).toEqual({ UNFULFILLED: 8, FULFILLED: 2 });
    });

    it('should handle zero orders gracefully', async () => {
      mockPrisma.order.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.order.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } });

      const result = await service.getOrderStats('user-1', true, 'org-1');

      expect(result.total).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.paidRevenue).toBe(0);
      expect(result.pendingRevenue).toBe(0);
      expect(result.averageOrderValue).toBe(0);
    });
  });

  // ─── getTimeline ──────────────────────────────────────────────────────────

  describe('getTimeline', () => {
    it('should return timeline events for a draft order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.getTimeline('order-1', 'user-1', true, 'org-1');

      expect(result.length).toBe(1);
      expect(result[0].action).toBe('created');
    });

    it('should include confirmed event for non-draft orders', async () => {
      const confirmedOrder = { ...mockOrder, status: 'CONFIRMED' };
      mockPrisma.order.findFirst.mockResolvedValue(confirmedOrder);

      const result = await service.getTimeline('order-1', 'user-1', true, 'org-1');

      expect(result.length).toBe(2);
      const actions = result.map((e: any) => e.action);
      expect(actions).toContain('created');
      expect(actions).toContain('confirmed');
    });

    it('should include shipped and delivered events when dates are present', async () => {
      const fullOrder = {
        ...mockOrder,
        status: 'DELIVERED',
        shippedAt: new Date('2026-01-20'),
        deliveredAt: new Date('2026-01-25'),
        trackingNumber: 'TRACK-999',
      };
      mockPrisma.order.findFirst.mockResolvedValue(fullOrder);

      const result = await service.getTimeline('order-1', 'user-1', true, 'org-1');

      expect(result.length).toBe(4);
      const actions = result.map((e: any) => e.action);
      expect(actions).toContain('shipped');
      expect(actions).toContain('delivered');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.getTimeline('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── convertQuoteToOrder ──────────────────────────────────────────────────

  describe('convertQuoteToOrder', () => {
    const mockQuote = {
      id: 'quote-1',
      name: 'Test Quote',
      status: 'ACCEPTED',
      accountId: 'account-1',
      subtotal: 200,
      discount: 10,
      tax: 15,
      shippingHandling: 5,
      totalPrice: 210,
      billingStreet: '123 Main St',
      billingCity: 'Springfield',
      billingState: 'IL',
      billingPostalCode: '62701',
      billingCountry: 'US',
      shippingStreet: '456 Oak Ave',
      shippingCity: 'Springfield',
      shippingState: 'IL',
      shippingPostalCode: '62701',
      shippingCountry: 'US',
      organizationId: 'org-1',
      lineItems: [
        {
          productId: 'prod-1',
          productName: 'Widget',
          productCode: 'WDG-001',
          description: 'A widget',
          quantity: 2,
          unitPrice: 100,
          discount: 0,
          totalPrice: 200,
        },
      ],
      account: { id: 'account-1', name: 'Test Account' },
    };

    it('should convert an accepted quote to an order', async () => {
      const createdOrder = {
        ...mockOrder,
        quoteId: 'quote-1',
        name: 'Order from Test Quote',
      };

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          quote: { findFirst: jest.fn().mockResolvedValue(mockQuote) },
          $queryRaw: jest.fn().mockResolvedValue([]),
          order: { create: jest.fn().mockResolvedValue(createdOrder) },
        };
        return cb(tx);
      });

      const result = await service.convertQuoteToOrder('quote-1', 'user-1', 'org-1');

      expect(result.quoteId).toBe('quote-1');
      expect(result.name).toBe('Order from Test Quote');
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          quote: { findFirst: jest.fn().mockResolvedValue(null) },
        };
        return cb(tx);
      });

      await expect(
        service.convertQuoteToOrder('non-existent', 'user-1', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when quote status is DRAFT', async () => {
      const draftQuote = { ...mockQuote, status: 'DRAFT' };

      mockPrisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          quote: { findFirst: jest.fn().mockResolvedValue(draftQuote) },
        };
        return cb(tx);
      });

      await expect(
        service.convertQuoteToOrder('quote-1', 'user-1', 'org-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateFulfillment ────────────────────────────────────────────────────

  describe('updateFulfillment', () => {
    it('should update fulfillment details', async () => {
      const updatedOrder = {
        ...mockOrder,
        fulfillmentStatus: 'FULFILLED',
        trackingNumber: 'TRACK-456',
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateFulfillment(
        'order-1',
        'user-1',
        { trackingNumber: 'TRACK-456', status: 'FULFILLED' as any },
        true,
        'org-1',
      );

      expect(result.trackingNumber).toBe('TRACK-456');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updateFulfillment('non-existent', 'user-1', {}, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updatePayment ────────────────────────────────────────────────────────

  describe('updatePayment', () => {
    it('should update payment details', async () => {
      const updatedOrder = {
        ...mockOrder,
        paymentStatus: 'PAID',
        paymentMethod: 'Credit Card',
        paidAmount: 100,
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updatePayment(
        'order-1',
        'user-1',
        { paymentMethod: 'Credit Card', paidAmount: 100, status: 'PAID' as any },
        true,
        'org-1',
      );

      expect(result.paymentStatus).toBe('PAID');
      expect(result.paymentMethod).toBe('Credit Card');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePayment('non-existent', 'user-1', {}, true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── generatePdf ──────────────────────────────────────────────────────────

  describe('generatePdf', () => {
    it('should use pdfGenerator when available', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.generatePdf('order-1', 'user-1', true, 'org-1');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockPdfGenerator.generateOrderPdf).toHaveBeenCalledWith(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePdf('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin is not the owner', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      await expect(
        service.generatePdf('order-1', 'other-user', false, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── generatePdf without pdfGenerator ─────────────────────────────────────

  describe('generatePdf (no pdfGenerator)', () => {
    let serviceWithoutPdf: OrdersService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: IntegrationEventsService, useValue: mockIntegrationEvents },
        ],
      }).compile();

      serviceWithoutPdf = module.get<OrdersService>(OrdersService);
    });

    it('should return order data for client-side generation when pdfGenerator is not available', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

      const result = await serviceWithoutPdf.generatePdf('order-1', 'user-1', true, 'org-1');

      expect(result).toHaveProperty('order');
      expect(result).toHaveProperty('generatedAt');
    });
  });

  // ─── getByAccountId ───────────────────────────────────────────────────────

  describe('getByAccountId', () => {
    it('should return orders for a given account (admin)', async () => {
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.getByAccountId('account-1', 'user-1', true, 'org-1');

      expect(result).toEqual([mockOrder]);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-1',
            organizationId: 'org-1',
          }),
        }),
      );
    });

    it('should filter by ownerId when non-admin', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      await service.getByAccountId('account-1', 'user-1', false, 'org-1');

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-1',
            ownerId: 'user-1',
          }),
        }),
      );
    });
  });

  // ─── recalculateOrder ─────────────────────────────────────────────────────

  describe('recalculateOrder', () => {
    it('should recalculate totals and return the updated order', async () => {
      const updatedOrder = { ...mockOrder, subtotal: 200, total: 200 };

      mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.orderLineItem.findMany.mockResolvedValue([mockLineItem]);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(mockOrder)       // inside recalculateOrderTotals
        .mockResolvedValueOnce(updatedOrder);    // final return
      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await service.recalculateOrder('order-1', 'user-1', true, 'org-1');

      expect(result).toEqual(updatedOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.recalculateOrder('non-existent', 'user-1', true, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
