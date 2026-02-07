import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { Quote, QuoteStatus, QuoteLineItem, Prisma } from '@prisma/client';
import { validateForeignKeyId } from '../common/validators/foreign-key.validator';

interface CreateQuoteDto {
  opportunityId: string;
  accountId: string;
  name: string;
  validUntil?: Date;
  paymentTerms?: string;
  description?: string;
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
}

interface AddLineItemDto {
  productName: string;
  productCode?: string;
  description?: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  discount?: number;
}

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  // Create quote
  async createQuote(data: CreateQuoteDto, ownerId: string, organizationId: string): Promise<Quote> {
    this.logger.log(`Creating quote: ${data.name}`);

    // Validate foreign key IDs are in correct format (not Salesforce IDs)
    validateForeignKeyId(data.opportunityId, 'opportunityId', 'Opportunity');
    validateForeignKeyId(data.accountId, 'accountId', 'Account');

    // Generate quote number
    const count = await this.prisma.quote.count();
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        name: data.name,
        status: QuoteStatus.DRAFT,
        opportunityId: data.opportunityId,
        accountId: data.accountId,
        ownerId,
        organizationId,
        validUntil: data.validUntil,
        paymentTerms: data.paymentTerms,
        description: data.description,
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
      },
      include: {
        opportunity: true,
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Get quote by ID (with ownership verification)
  async getQuote(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        opportunity: true,
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        contract: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }

    return quote;
  }

  // List quotes
  async listQuotes(filters?: {
    status?: QuoteStatus;
    opportunityId?: string;
    accountId?: string;
    ownerId?: string;
    quoteNumber?: string;
  }, isAdmin?: boolean, organizationId?: string): Promise<Quote[]> {
    const where: Prisma.QuoteWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.opportunityId) {
      where.opportunityId = filters.opportunityId;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.quoteNumber) {
      // Support both exact match (Q-2025-003) and partial match (2025-003, 003)
      where.quoteNumber = { contains: filters.quoteNumber, mode: 'insensitive' };
    }

    return this.prisma.quote.findMany({
      where,
      include: {
        opportunity: {
          select: { id: true, name: true },
        },
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update quote (with ownership verification)
  async updateQuote(id: string, userId: string, data: Partial<CreateQuoteDto>, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({ where });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Cannot update an accepted quote');
    }

    return this.prisma.quote.update({
      where: { id },
      data,
      include: {
        opportunity: true,
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // Add line item to quote (with ownership verification)
  async addLineItem(quoteId: string, userId: string, data: AddLineItemDto, isAdmin: boolean, organizationId: string): Promise<QuoteLineItem> {
    this.logger.log(`Adding line item to quote ${quoteId}. Data received: ${JSON.stringify(data)}`);

    const where: any = { id: quoteId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: { lineItems: true },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    if (quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Cannot modify an accepted quote');
    }

    // totalPrice = (quantity * unitPrice) - discount
    const discount = data.discount || 0;
    const totalPrice = Math.max(0, (data.quantity * data.unitPrice) - discount);
    const sortOrder = quote.lineItems.length + 1;

    const lineItem = await this.prisma.quoteLineItem.create({
      data: {
        quoteId,
        productName: data.productName,
        productCode: data.productCode,
        description: data.description,
        quantity: data.quantity,
        listPrice: data.listPrice,
        unitPrice: data.unitPrice,
        discount: data.discount || 0,
        totalPrice,
        sortOrder,
      },
    });

    // Recalculate quote totals
    await this.recalculateQuoteTotals(quoteId);

    return lineItem;
  }

  // Update line item (with ownership verification via quote)
  async updateLineItem(lineItemId: string, userId: string, data: Partial<AddLineItemDto>, isAdmin: boolean, organizationId: string): Promise<QuoteLineItem> {
    const lineItem = await this.prisma.quoteLineItem.findUnique({
      where: { id: lineItemId },
      include: { quote: true },
    });

    if (!lineItem) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Verify quote ownership
    if (!isAdmin && lineItem.quote.ownerId !== userId) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Verify organization
    if ((lineItem.quote as any).organizationId !== organizationId) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    if (lineItem.quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Cannot modify an accepted quote');
    }

    const quantity = data.quantity ?? lineItem.quantity;
    const unitPrice = data.unitPrice ?? lineItem.unitPrice;
    const discount = data.discount ?? lineItem.discount ?? 0;
    // totalPrice = (quantity * unitPrice) - discount
    const totalPrice = Math.max(0, (quantity * unitPrice) - discount);

    const updated = await this.prisma.quoteLineItem.update({
      where: { id: lineItemId },
      data: {
        ...data,
        totalPrice,
      },
    });

    // Recalculate quote totals
    await this.recalculateQuoteTotals(lineItem.quoteId);

    return updated;
  }

  // Remove line item (with ownership verification via quote)
  async removeLineItem(lineItemId: string, userId: string, isAdmin: boolean, organizationId: string): Promise<void> {
    const lineItem = await this.prisma.quoteLineItem.findUnique({
      where: { id: lineItemId },
      include: { quote: true },
    });

    if (!lineItem) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Verify quote ownership
    if (!isAdmin && lineItem.quote.ownerId !== userId) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    // Verify organization
    if ((lineItem.quote as any).organizationId !== organizationId) {
      throw new NotFoundException(`Line item ${lineItemId} not found`);
    }

    if (lineItem.quote.status === QuoteStatus.ACCEPTED) {
      throw new BadRequestException('Cannot modify an accepted quote');
    }

    await this.prisma.quoteLineItem.delete({ where: { id: lineItemId } });

    // Recalculate quote totals
    await this.recalculateQuoteTotals(lineItem.quoteId);
  }

  // Recalculate quote totals
  private async recalculateQuoteTotals(quoteId: string): Promise<void> {
    const lineItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });

    if (!quote) return;

    const discount = quote.discount || 0;
    const tax = quote.tax || 0;
    const shippingHandling = quote.shippingHandling || 0;
    const totalPrice = subtotal - discount + tax + shippingHandling;

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        totalPrice,
      },
    });
  }

  // Send quote (with ownership verification)
  async sendQuote(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: { lineItems: true },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }

    if (quote.lineItems.length === 0) {
      throw new BadRequestException('Cannot send a quote without line items');
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Only draft quotes can be sent');
    }

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        sentDate: new Date(),
      },
    });
  }

  // Accept quote (with ownership verification)
  async acceptQuote(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        opportunity: { select: { name: true } },
        account: { select: { name: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException('Only sent quotes can be accepted');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.ACCEPTED,
        acceptedDate: new Date(),
      },
    });

    // Send Quote Accepted notification to the quote owner
    const amount = quote.totalPrice ? `$${quote.totalPrice.toLocaleString()}` : 'N/A';
    this.notificationScheduler.sendSystemNotification(
      quote.ownerId,
      '✅ Quote Accepted!',
      `"${quote.name}" for ${amount} has been accepted`,
      {
        type: 'DEAL_UPDATE',
        priority: 'HIGH',
        action: 'VIEW_QUOTE',
        actionData: {
          quoteId: id,
          quoteNumber: quote.quoteNumber,
          opportunityId: quote.opportunityId,
          opportunityName: (quote as any).opportunity?.name,
          accountId: quote.accountId,
          accountName: (quote as any).account?.name,
          amount: quote.totalPrice,
        },
      },
    ).catch((err) => this.logger.error(`Failed to send Quote Accepted notification: ${err.message}`));

    return updated;
  }

  // Reject quote (with ownership verification)
  async rejectQuote(id: string, userId: string, reason: string | undefined, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        opportunity: { select: { name: true } },
        account: { select: { name: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote ${id} not found`);
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException('Only sent quotes can be rejected');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.REJECTED,
        rejectedDate: new Date(),
        rejectedReason: reason,
      },
    });

    // Send Quote Rejected notification to the quote owner
    const amount = quote.totalPrice ? `$${quote.totalPrice.toLocaleString()}` : 'N/A';
    this.notificationScheduler.sendSystemNotification(
      quote.ownerId,
      'Quote Rejected',
      `"${quote.name}" (${amount}) was rejected${reason ? `: ${reason}` : ''}`,
      {
        type: 'DEAL_UPDATE',
        priority: 'NORMAL',
        action: 'VIEW_QUOTE',
        actionData: {
          quoteId: id,
          quoteNumber: quote.quoteNumber,
          opportunityId: quote.opportunityId,
          opportunityName: (quote as any).opportunity?.name,
          accountId: quote.accountId,
          accountName: (quote as any).account?.name,
          amount: quote.totalPrice,
          rejectedReason: reason,
        },
      },
    ).catch((err) => this.logger.error(`Failed to send Quote Rejected notification: ${err.message}`));

    return updated;
  }

  // Get quote statistics
  async getQuoteStats(ownerId: string | undefined, isAdmin: boolean, organizationId: string): Promise<any> {
    const where: Prisma.QuoteWhereInput = (ownerId && !isAdmin) ? { ownerId } : {};

    where.organizationId = organizationId;

    const [total, byStatus, totalValue, acceptedValue] = await Promise.all([
      this.prisma.quote.count({ where }),
      this.prisma.quote.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.quote.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      this.prisma.quote.aggregate({
        where: { ...where, status: QuoteStatus.ACCEPTED },
        _sum: { totalPrice: true },
      }),
    ]);

    return {
      total,
      byStatus,
      totalValue: totalValue._sum.totalPrice || 0,
      acceptedValue: acceptedValue._sum.totalPrice || 0,
    };
  }

  // Generate PDF data for quote
  async generatePdf(quoteId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: any = { id: quoteId };
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({
      where,
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        account: { select: { id: true, name: true, phone: true, website: true } },
        opportunity: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!isAdmin && quote.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Return quote data for client-side PDF generation
    return {
      quote,
      generatedAt: new Date().toISOString(),
    };
  }

  // Clone a quote
  async cloneQuote(quoteId: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id: quoteId };
    where.organizationId = organizationId;
    const originalQuote = await this.prisma.quote.findFirst({
      where,
      include: { lineItems: true },
    });

    if (!originalQuote) {
      throw new NotFoundException('Quote not found');
    }

    if (!isAdmin && originalQuote.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Generate new quote number
    const count = await this.prisma.quote.count();
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Create the cloned quote
    const clonedQuote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        name: `${originalQuote.name} (Copy)`,
        status: QuoteStatus.DRAFT,
        opportunityId: originalQuote.opportunityId,
        accountId: originalQuote.accountId,
        ownerId: userId,
        organizationId,
        validUntil: originalQuote.validUntil,
        paymentTerms: originalQuote.paymentTerms,
        description: originalQuote.description,
        discount: originalQuote.discount,
        tax: originalQuote.tax,
        shippingHandling: originalQuote.shippingHandling,
        subtotal: originalQuote.subtotal,
        totalPrice: originalQuote.totalPrice,
        billingStreet: originalQuote.billingStreet,
        billingCity: originalQuote.billingCity,
        billingState: originalQuote.billingState,
        billingPostalCode: originalQuote.billingPostalCode,
        billingCountry: originalQuote.billingCountry,
        shippingStreet: originalQuote.shippingStreet,
        shippingCity: originalQuote.shippingCity,
        shippingState: originalQuote.shippingState,
        shippingPostalCode: originalQuote.shippingPostalCode,
        shippingCountry: originalQuote.shippingCountry,
      },
      include: {
        opportunity: true,
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Clone line items
    if (originalQuote.lineItems.length > 0) {
      await this.prisma.quoteLineItem.createMany({
        data: originalQuote.lineItems.map((item, index) => ({
          quoteId: clonedQuote.id,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          description: item.description,
          quantity: item.quantity,
          listPrice: item.listPrice,
          unitPrice: item.unitPrice,
          discount: item.discount,
          totalPrice: item.totalPrice,
          sortOrder: index + 1,
        })),
      });
    }

    return clonedQuote;
  }

  // Recalculate quote totals (public method)
  async recalculateQuote(quoteId: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Quote> {
    const where: any = { id: quoteId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const quote = await this.prisma.quote.findFirst({ where });

    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }

    await this.recalculateQuoteTotals(quoteId);

    const updatedQuote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        opportunity: true,
        account: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!updatedQuote) {
      throw new NotFoundException(`Quote ${quoteId} not found after recalculation`);
    }

    return updatedQuote;
  }
}
