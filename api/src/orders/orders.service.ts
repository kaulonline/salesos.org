import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OrderStatus, OrderPaymentStatus, OrderFulfillmentStatus, Prisma } from '@prisma/client';
import { OrderPdfGenerator } from './pdf-generator.util';

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  action: string;
  description: string;
  createdAt: Date;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly pdfGenerator?: OrderPdfGenerator,
  ) {}

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${year}`,
        },
      },
      orderBy: { orderNumber: 'desc' },
    });

    const lastNum = lastOrder
      ? parseInt(lastOrder.orderNumber.split('-')[2], 10)
      : 0;
    return `ORD-${year}-${String(lastNum + 1).padStart(5, '0')}`;
  }

  async createOrder(
    data: {
      accountId: string;
      quoteId?: string;
      name: string;
      orderDate?: string;
      expectedDeliveryDate?: string;
      paymentTerms?: string;
      shippingMethod?: string;
      notes?: string;
      internalNotes?: string;
      billingStreet?: string;
      billingCity?: string;
      billingState?: string;
      billingPostalCode?: string;
      billingCountry?: string;
      shippingStreet?: string;
      shippingCity?: string;
      shippingState?: string;
      shippingPostalCode?: string;
      shippingCountry?: string;
    },
    userId: string,
    organizationId: string,
  ) {
    const orderNumber = await this.generateOrderNumber();

    return this.prisma.order.create({
      data: {
        orderNumber,
        ownerId: userId,
        accountId: data.accountId,
        quoteId: data.quoteId,
        name: data.name,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        paymentTerms: data.paymentTerms,
        shippingMethod: data.shippingMethod,
        notes: data.notes,
        internalNotes: data.internalNotes,
        billingStreet: data.billingStreet,
        billingCity: data.billingCity,
        billingState: data.billingState,
        billingPostalCode: data.billingPostalCode,
        billingCountry: data.billingCountry,
        shippingStreet: data.shippingStreet,
        shippingCity: data.shippingCity,
        shippingState: data.shippingState,
        shippingPostalCode: data.shippingPostalCode,
        shippingCountry: data.shippingCountry,
        organizationId,
      },
      include: {
        lineItems: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async convertQuoteToOrder(
    quoteId: string,
    userId: string,
    organizationId: string,
    data?: {
      orderDate?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      internalNotes?: string;
    },
  ) {
    const where: Prisma.QuoteWhereInput = { id: quoteId };
    where.organizationId = organizationId;

    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        lineItems: true,
        account: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.status !== 'ACCEPTED' && quote.status !== 'SENT') {
      throw new BadRequestException(
        'Only accepted or sent quotes can be converted to orders',
      );
    }

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        ownerId: userId,
        accountId: quote.accountId,
        quoteId: quote.id,
        name: `Order from ${quote.name}`,
        orderDate: data?.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data?.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : undefined,
        subtotal: quote.subtotal,
        discount: quote.discount,
        tax: quote.tax,
        shipping: quote.shippingHandling,
        total: quote.totalPrice,
        notes: data?.notes,
        internalNotes: data?.internalNotes,
        billingStreet: quote.billingStreet,
        billingCity: quote.billingCity,
        billingState: quote.billingState,
        billingPostalCode: quote.billingPostalCode,
        billingCountry: quote.billingCountry,
        shippingStreet: quote.shippingStreet,
        shippingCity: quote.shippingCity,
        shippingState: quote.shippingState,
        shippingPostalCode: quote.shippingPostalCode,
        shippingCountry: quote.shippingCountry,
        organizationId,
        lineItems: {
          create: quote.lineItems.map((item, index) => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });

    return order;
  }

  async listOrders(
    filters: {
      status?: OrderStatus;
      paymentStatus?: OrderPaymentStatus;
      fulfillmentStatus?: OrderFulfillmentStatus;
      accountId?: string;
      search?: string;
      ownerId?: string;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = {};

    where.organizationId = organizationId;

    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.fulfillmentStatus) where.fulfillmentStatus = filters.fulfillmentStatus;
    if (filters.accountId) where.accountId = filters.accountId;
    if (!isAdmin && filters.ownerId) where.ownerId = filters.ownerId;

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true },
        },
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        account: {
          select: { id: true, name: true, phone: true, website: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async updateOrder(
    id: string,
    userId: string,
    data: {
      name?: string;
      status?: OrderStatus;
      paymentStatus?: OrderPaymentStatus;
      fulfillmentStatus?: OrderFulfillmentStatus;
      expectedDeliveryDate?: string;
      paymentTerms?: string;
      paymentMethod?: string;
      shippingMethod?: string;
      trackingNumber?: string;
      notes?: string;
      internalNotes?: string;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = { id };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.status) updateData.status = data.status;
    if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus;
    if (data.fulfillmentStatus) updateData.fulfillmentStatus = data.fulfillmentStatus;
    if (data.expectedDeliveryDate) {
      updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);
    }
    if (data.paymentTerms) updateData.paymentTerms = data.paymentTerms;
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data.shippingMethod) updateData.shippingMethod = data.shippingMethod;
    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: { id: true, name: true },
        },
        lineItems: true,
      },
    });
  }

  async addLineItem(
    orderId: string,
    userId: string,
    data: {
      productId?: string;
      productName: string;
      productCode?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      tax?: number;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const discount = data.discount || 0;
    const tax = data.tax || 0;
    const totalPrice = data.quantity * data.unitPrice - discount + tax;

    const lineItem = await this.prisma.orderLineItem.create({
      data: {
        orderId,
        productId: data.productId,
        productName: data.productName,
        productCode: data.productCode,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount,
        tax,
        totalPrice,
      },
    });

    await this.recalculateOrderTotals(orderId);

    return lineItem;
  }

  async updateLineItem(
    lineItemId: string,
    userId: string,
    data: {
      productName?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      tax?: number;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const lineItem = await this.prisma.orderLineItem.findUnique({
      where: { id: lineItemId },
      include: { order: true },
    });

    if (!lineItem) {
      throw new NotFoundException('Line item not found');
    }

    if (lineItem.order.organizationId !== organizationId) {
      throw new NotFoundException('Line item not found');
    }

    if (!isAdmin && lineItem.order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const quantity = data.quantity ?? lineItem.quantity;
    const unitPrice = data.unitPrice ?? lineItem.unitPrice;
    const discount = data.discount ?? lineItem.discount;
    const tax = data.tax ?? lineItem.tax;
    const totalPrice = quantity * unitPrice - discount + tax;

    const updated = await this.prisma.orderLineItem.update({
      where: { id: lineItemId },
      data: {
        productName: data.productName,
        description: data.description,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discount: data.discount,
        tax: data.tax,
        totalPrice,
      },
    });

    await this.recalculateOrderTotals(lineItem.orderId);

    return updated;
  }

  async removeLineItem(lineItemId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const lineItem = await this.prisma.orderLineItem.findUnique({
      where: { id: lineItemId },
      include: { order: true },
    });

    if (!lineItem) {
      throw new NotFoundException('Line item not found');
    }

    if (lineItem.order.organizationId !== organizationId) {
      throw new NotFoundException('Line item not found');
    }

    if (!isAdmin && lineItem.order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.orderLineItem.delete({ where: { id: lineItemId } });
    await this.recalculateOrderTotals(lineItem.orderId);

    return { success: true };
  }

  private async recalculateOrderTotals(orderId: string) {
    const lineItems = await this.prisma.orderLineItem.findMany({
      where: { orderId },
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    const total = subtotal - (order?.discount || 0) + (order?.tax || 0) + (order?.shipping || 0);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, total },
    });
  }

  async updateFulfillment(
    orderId: string,
    userId: string,
    data: {
      trackingNumber?: string;
      shippedAt?: string;
      deliveredAt?: string;
      status?: OrderFulfillmentStatus;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.shippedAt) updateData.shippedAt = new Date(data.shippedAt);
    if (data.deliveredAt) updateData.deliveredAt = new Date(data.deliveredAt);
    if (data.status) updateData.fulfillmentStatus = data.status;

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        lineItems: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async updatePayment(
    orderId: string,
    userId: string,
    data: {
      paymentMethod?: string;
      paidAmount?: number;
      paidAt?: string;
      status?: OrderPaymentStatus;
    },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount;
    if (data.paidAt) updateData.paidAt = new Date(data.paidAt);
    if (data.status) updateData.paymentStatus = data.status;

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        lineItems: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getOrderStats(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = isAdmin ? {} : { ownerId: userId };
    where.organizationId = organizationId;

    // Get start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      total,
      byStatus,
      byPaymentStatus,
      byFulfillmentStatus,
      totalRevenue,
      paidRevenue,
      ordersThisMonth,
      revenueThisMonth,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['fulfillmentStatus'],
        where,
        _count: true,
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: {
          ...where,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          ...where,
          createdAt: { gte: startOfMonth },
        },
        _sum: { total: true },
      }),
    ]);

    const totalRev = Number(totalRevenue._sum.total) || 0;
    const paidRev = Number(paidRevenue._sum.total) || 0;
    const pendingRev = totalRev - paidRev;
    const avgOrderValue = total > 0 ? totalRev / total : 0;

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>,
      ),
      byPaymentStatus: byPaymentStatus.reduce(
        (acc, item) => ({ ...acc, [item.paymentStatus]: item._count }),
        {} as Record<string, number>,
      ),
      byFulfillmentStatus: byFulfillmentStatus.reduce(
        (acc, item) => ({ ...acc, [item.fulfillmentStatus]: item._count }),
        {} as Record<string, number>,
      ),
      totalRevenue: totalRev,
      paidRevenue: paidRev,
      pendingRevenue: pendingRev,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      ordersThisMonth,
      revenueThisMonth: Number(revenueThisMonth._sum.total) || 0,
    };
  }

  async cancelOrder(orderId: string, userId: string, organizationId: string, isAdmin: boolean = false, reason?: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot cancel this order');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        internalNotes: reason
          ? `${order.internalNotes || ''}\nCancellation reason: ${reason}`
          : order.internalNotes,
      },
      include: {
        lineItems: true,
        account: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getTimeline(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Return basic timeline based on order dates
    const timeline: OrderTimelineEvent[] = [];

    timeline.push({
      id: `${orderId}-created`,
      orderId,
      action: 'created',
      description: 'Order was created',
      createdAt: order.createdAt,
    });

    if (order.status !== 'DRAFT') {
      timeline.push({
        id: `${orderId}-confirmed`,
        orderId,
        action: 'confirmed',
        description: 'Order was confirmed',
        createdAt: order.updatedAt,
      });
    }

    if (order.shippedAt) {
      timeline.push({
        id: `${orderId}-shipped`,
        orderId,
        action: 'shipped',
        description: `Order was shipped${order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ''}`,
        createdAt: order.shippedAt,
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        id: `${orderId}-delivered`,
        orderId,
        action: 'delivered',
        description: 'Order was delivered',
        createdAt: order.deliveredAt,
      });
    }

    return timeline.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async confirmOrder(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
      throw new BadRequestException('Order cannot be confirmed in current status');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
      include: {
        lineItems: true,
        account: { select: { id: true, name: true } },
      },
    });
  }

  async shipOrder(
    orderId: string,
    userId: string,
    data: { trackingNumber?: string; trackingUrl?: string },
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
        trackingNumber: data.trackingNumber,
        shippedAt: new Date(),
      },
      include: {
        lineItems: true,
        account: { select: { id: true, name: true } },
      },
    });
  }

  async deliverOrder(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
      include: {
        lineItems: true,
        account: { select: { id: true, name: true } },
      },
    });
  }

  async cloneOrder(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({
      where,
      include: { lineItems: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const newOrderNumber = await this.generateOrderNumber();

    return this.prisma.order.create({
      data: {
        orderNumber: newOrderNumber,
        ownerId: userId,
        accountId: order.accountId,
        name: `Copy of ${order.name || order.orderNumber}`,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        billingStreet: order.billingStreet,
        billingCity: order.billingCity,
        billingState: order.billingState,
        billingPostalCode: order.billingPostalCode,
        billingCountry: order.billingCountry,
        shippingStreet: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingState: order.shippingState,
        shippingPostalCode: order.shippingPostalCode,
        shippingCountry: order.shippingCountry,
        organizationId,
        lineItems: {
          create: order.lineItems.map((item, index) => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            tax: item.tax,
            totalPrice: item.totalPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: true,
        account: { select: { id: true, name: true } },
      },
    });
  }

  async recalculateOrder(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.recalculateOrderTotals(orderId);

    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lineItems: true,
        account: { select: { id: true, name: true } },
      },
    });
  }

  async generatePdf(orderId: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Buffer | { order: any; generatedAt: string }> {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        account: { select: { id: true, name: true, phone: true, website: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // If PDF generator is available, generate actual PDF
    if (this.pdfGenerator) {
      return this.pdfGenerator.generateOrderPdf(order);
    }

    // Fallback: return order data for client-side PDF generation
    return {
      order,
      generatedAt: new Date().toISOString(),
    };
  }

  async getByAccountId(accountId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = {
      accountId,
      ...(isAdmin ? {} : { ownerId: userId }),
    };
    where.organizationId = organizationId;

    return this.prisma.order.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOrder(orderId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OrderWhereInput = { id: orderId };
    where.organizationId = organizationId;

    const order = await this.prisma.order.findFirst({ where });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Only draft orders can be deleted');
    }

    await this.prisma.order.delete({ where: { id: orderId } });

    return { success: true };
  }
}
