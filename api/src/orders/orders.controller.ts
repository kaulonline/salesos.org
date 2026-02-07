import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { OrderStatus, OrderPaymentStatus, OrderFulfillmentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
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
  ) {
    return this.ordersService.createOrder(body, req.user.userId, organizationId);
  }

  @Post('convert-from-quote')
  async convertQuoteToOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      quoteId: string;
      orderDate?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      internalNotes?: string;
    },
  ) {
    return this.ordersService.convertQuoteToOrder(
      body.quoteId,
      req.user.userId,
      organizationId,
      body,
    );
  }

  @Get()
  async listOrders(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: OrderPaymentStatus,
    @Query('fulfillmentStatus') fulfillmentStatus?: OrderFulfillmentStatus,
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.listOrders(
      {
        status,
        paymentStatus,
        fulfillmentStatus,
        accountId,
        search,
        ownerId: req.user.userId,
      },
      isAdmin,
      organizationId,
    );
  }

  @Get('stats')
  async getOrderStats(
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.getOrderStats(req.user.userId, isAdmin, organizationId);
  }

  @Get(':id')
  async getOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.getOrder(id, req.user.userId, isAdmin, organizationId);
  }

  @Patch(':id')
  async updateOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
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
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.updateOrder(id, req.user.userId, body, isAdmin, organizationId);
  }

  @Post(':id/line-items')
  async addLineItem(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      productId?: string;
      productName: string;
      productCode?: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      tax?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.addLineItem(id, req.user.userId, body, isAdmin, organizationId);
  }

  @Patch('line-items/:lineItemId')
  async updateLineItem(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('lineItemId') lineItemId: string,
    @Body()
    body: {
      productName?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      tax?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.updateLineItem(
      lineItemId,
      req.user.userId,
      body,
      isAdmin,
      organizationId,
    );
  }

  @Delete('line-items/:lineItemId')
  async removeLineItem(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('lineItemId') lineItemId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.removeLineItem(
      lineItemId,
      req.user.userId,
      isAdmin,
      organizationId,
    );
  }

  @Patch(':id/fulfillment')
  async updateFulfillment(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      trackingNumber?: string;
      shippedAt?: string;
      deliveredAt?: string;
      status?: OrderFulfillmentStatus;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.updateFulfillment(
      id,
      req.user.userId,
      body,
      isAdmin,
      organizationId,
    );
  }

  @Patch(':id/payment')
  async updatePayment(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      paymentMethod?: string;
      paidAmount?: number;
      paidAt?: string;
      status?: OrderPaymentStatus;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.updatePayment(
      id,
      req.user.userId,
      body,
      isAdmin,
      organizationId,
    );
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.cancelOrder(id, req.user.userId, organizationId, isAdmin, reason);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.getTimeline(id, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/confirm')
  async confirmOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.confirmOrder(id, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/ship')
  async shipOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body() body: { trackingNumber?: string; trackingUrl?: string },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.shipOrder(id, req.user.userId, body, isAdmin, organizationId);
  }

  @Post(':id/deliver')
  async deliverOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.deliverOrder(id, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/clone')
  async cloneOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.cloneOrder(id, req.user.userId, isAdmin, organizationId);
  }

  @Post(':id/recalculate')
  async recalculateOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.recalculateOrder(id, req.user.userId, isAdmin, organizationId);
  }

  @Get(':id/pdf')
  async generatePdf(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const result = await this.ordersService.generatePdf(id, req.user.userId, isAdmin, organizationId);

    // If result is a Buffer, return as PDF file
    if (Buffer.isBuffer(result)) {
      // Get the order to include the order number in the filename
      const order = await this.ordersService.getOrder(id, req.user.userId, isAdmin, organizationId);
      const filename = `order-${order.orderNumber || id}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.length.toString(),
      });

      return new StreamableFile(result);
    }

    // Otherwise return JSON (fallback for client-side generation)
    return result;
  }

  @Get('account/:accountId')
  async getByAccountId(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('accountId') accountId: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.getByAccountId(accountId, req.user.userId, isAdmin, organizationId);
  }

  @Delete(':id')
  async deleteOrder(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.ordersService.deleteOrder(id, req.user.userId, isAdmin, organizationId);
  }
}
