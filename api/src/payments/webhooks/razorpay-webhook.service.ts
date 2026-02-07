// Razorpay Webhook Service - Processes Razorpay webhook events
import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RazorpayService } from '../gateways/razorpay.service';

@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async handleWebhook(payload: string, signature: string) {
    // Verify and parse the webhook
    const event = await this.razorpayService.verifyWebhookSignature(payload, signature);

    // Check for duplicate event (idempotency)
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent?.processed) {
      this.logger.log(`Webhook event ${event.id} already processed`);
      return;
    }

    // Store the event
    await this.prisma.webhookEvent.upsert({
      where: { eventId: event.id },
      create: {
        eventId: event.id,
        gateway: PaymentGateway.RAZORPAY,
        eventType: event.type,
        payload: event.data,
      },
      update: {
        payload: event.data,
      },
    });

    // Process the event
    try {
      await this.processEvent(event.type, event.data);

      // Mark as processed
      await this.prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to process Razorpay webhook ${event.type}:`, error);

      // Record the error
      await this.prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: error.message,
        },
      });

      throw error;
    }
  }

  private async processEvent(eventType: string, data: Record<string, any>) {
    this.logger.log(`Processing Razorpay event: ${eventType}`);

    switch (eventType) {
      // Payment events
      case 'payment.authorized':
        await this.handlePaymentAuthorized(data);
        break;
      case 'payment.captured':
        await this.handlePaymentCaptured(data);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(data);
        break;

      // Order events
      case 'order.paid':
        await this.handleOrderPaid(data);
        break;

      // Subscription events
      case 'subscription.activated':
        await this.handleSubscriptionActivated(data);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(data);
        break;
      case 'subscription.completed':
        await this.handleSubscriptionCompleted(data);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(data);
        break;
      case 'subscription.halted':
        await this.handleSubscriptionHalted(data);
        break;

      // Invoice events
      case 'invoice.paid':
        await this.handleInvoicePaid(data);
        break;
      case 'invoice.expired':
        await this.handleInvoiceExpired(data);
        break;

      // Payment link events
      case 'payment_link.paid':
        await this.handlePaymentLinkPaid(data);
        break;

      // Refund events
      case 'refund.processed':
        await this.handleRefundProcessed(data);
        break;

      default:
        this.logger.log(`Unhandled Razorpay event type: ${eventType}`);
    }
  }

  private async handlePaymentAuthorized(data: any) {
    const payment = data.payment?.entity;
    if (!payment) return;

    this.logger.log(`Payment authorized: ${payment.id}`);

    // Payment is authorized but not captured yet
    // This is usually handled automatically
  }

  private async handlePaymentCaptured(data: any) {
    const payment = data.payment?.entity;
    if (!payment) return;

    this.logger.log(`Payment captured: ${payment.id}`);

    const { id, order_id, amount, currency, method, notes } = payment;

    // Find billing customer from order notes
    const customerId = notes?.customerId;
    if (!customerId) {
      this.logger.warn(`No customerId in payment notes`);
      return;
    }

    const billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: { id: customerId },
    });

    if (!billingCustomer) {
      this.logger.warn(`Billing customer ${customerId} not found`);
      return;
    }

    // Find related invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        customerId: billingCustomer.id,
        status: InvoiceStatus.OPEN,
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.prisma.payment.upsert({
      where: { razorpayPaymentId: id },
      create: {
        customerId: billingCustomer.id,
        invoiceId: invoice?.id,
        razorpayPaymentId: id,
        gateway: PaymentGateway.RAZORPAY,
        status: PaymentStatus.SUCCEEDED,
        amount: Math.floor(amount / 100), // Razorpay amounts are in paise
        currency: currency.toUpperCase(),
        paymentMethodType: method,
        metadata: { orderId: order_id },
      },
      update: {
        status: PaymentStatus.SUCCEEDED,
      },
    });

    // If there's a license type in notes, create the subscription/license
    if (notes?.licenseTypeId) {
      await this.createOrUpdateUserLicense(
        billingCustomer.userId,
        notes.licenseTypeId,
        this.calculateEndDate(notes.billingCycle || 'monthly'),
      );
    }
  }

  private async handlePaymentFailed(data: any) {
    const payment = data.payment?.entity;
    if (!payment) return;

    this.logger.log(`Payment failed: ${payment.id}`);

    const { id, amount, currency, error_code, error_description, notes } = payment;

    const customerId = notes?.customerId;
    if (!customerId) return;

    const billingCustomer = await this.prisma.billingCustomer.findUnique({
      where: { id: customerId },
    });

    if (!billingCustomer) return;

    await this.prisma.payment.upsert({
      where: { razorpayPaymentId: id },
      create: {
        customerId: billingCustomer.id,
        razorpayPaymentId: id,
        gateway: PaymentGateway.RAZORPAY,
        status: PaymentStatus.FAILED,
        amount: Math.floor(amount / 100),
        currency: currency.toUpperCase(),
        failureCode: error_code,
        failureMessage: error_description,
      },
      update: {
        status: PaymentStatus.FAILED,
        failureCode: error_code,
        failureMessage: error_description,
      },
    });
  }

  private async handleOrderPaid(data: any) {
    const order = data.order?.entity;
    if (!order) return;

    this.logger.log(`Order paid: ${order.id}`);

    // Order paid is usually followed by payment.captured
    // The license creation is handled there
  }

  private async handleSubscriptionActivated(data: any) {
    const subscription = data.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription activated: ${subscription.id}`);

    const { id, customer_id, plan_id, status, current_start, current_end, notes } = subscription;

    // Find billing customer
    const billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { razorpayCustomerId: customer_id },
    });

    if (!billingCustomer) {
      this.logger.warn(`No billing customer found for Razorpay customer ${customer_id}`);
      return;
    }

    const licenseTypeId = notes?.licenseTypeId;
    if (!licenseTypeId) {
      this.logger.warn(`No licenseTypeId in subscription notes`);
      return;
    }

    // Get license type for pricing
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id: licenseTypeId },
    });

    await this.prisma.subscription.upsert({
      where: { razorpaySubscriptionId: id },
      create: {
        customerId: billingCustomer.id,
        licenseTypeId,
        razorpaySubscriptionId: id,
        gateway: PaymentGateway.RAZORPAY,
        status: this.mapRazorpaySubscriptionStatus(status),
        billingCycle: notes?.billingCycle || 'monthly',
        currentPeriodStart: new Date(current_start * 1000),
        currentPeriodEnd: new Date(current_end * 1000),
        unitAmount: licenseType?.priceMonthly || 0,
        currency: 'INR',
      },
      update: {
        status: this.mapRazorpaySubscriptionStatus(status),
        currentPeriodStart: new Date(current_start * 1000),
        currentPeriodEnd: new Date(current_end * 1000),
      },
    });

    // Create user license
    await this.createOrUpdateUserLicense(billingCustomer.userId, licenseTypeId, new Date(current_end * 1000));
  }

  private async handleSubscriptionCharged(data: any) {
    const subscription = data.subscription?.entity;
    const payment = data.payment?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription charged: ${subscription.id}`);

    // Update subscription period
    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        currentPeriodStart: new Date(subscription.current_start * 1000),
        currentPeriodEnd: new Date(subscription.current_end * 1000),
      },
    });

    // Record the payment if included
    if (payment) {
      await this.handlePaymentCaptured({ payment: { entity: payment } });
    }
  }

  private async handleSubscriptionCompleted(data: any) {
    const subscription = data.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription completed: ${subscription.id}`);

    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });
  }

  private async handleSubscriptionCancelled(data: any) {
    const subscription = data.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription cancelled: ${subscription.id}`);

    const dbSubscription = await this.prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
      include: { customer: true },
    });

    if (dbSubscription) {
      await this.prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });

      // Update user license
      await this.prisma.userLicense.updateMany({
        where: {
          userId: dbSubscription.customer.userId,
          licenseTypeId: dbSubscription.licenseTypeId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CANCELLED',
        },
      });
    }
  }

  private async handleSubscriptionHalted(data: any) {
    const subscription = data.subscription?.entity;
    if (!subscription) return;

    this.logger.log(`Subscription halted: ${subscription.id}`);

    await this.prisma.subscription.updateMany({
      where: { razorpaySubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  private async handleInvoicePaid(data: any) {
    const invoice = data.invoice?.entity;
    if (!invoice) return;

    this.logger.log(`Invoice paid: ${invoice.id}`);

    await this.prisma.invoice.updateMany({
      where: { razorpayInvoiceId: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  private async handleInvoiceExpired(data: any) {
    const invoice = data.invoice?.entity;
    if (!invoice) return;

    this.logger.log(`Invoice expired: ${invoice.id}`);

    await this.prisma.invoice.updateMany({
      where: { razorpayInvoiceId: invoice.id },
      data: {
        status: InvoiceStatus.VOID,
      },
    });
  }

  private async handlePaymentLinkPaid(data: any) {
    const paymentLink = data.payment_link?.entity;
    const payment = data.payment?.entity;
    if (!paymentLink || !payment) return;

    this.logger.log(`Payment link paid: ${paymentLink.id}`);

    // Handle the payment
    await this.handlePaymentCaptured({ payment: { entity: payment } });
  }

  private async handleRefundProcessed(data: any) {
    const refund = data.refund?.entity;
    if (!refund) return;

    this.logger.log(`Refund processed: ${refund.id}`);

    const { payment_id, amount } = refund;

    await this.prisma.payment.updateMany({
      where: { razorpayPaymentId: payment_id },
      data: {
        refundedAmount: Math.floor(amount / 100),
        refundedAt: new Date(),
        status: PaymentStatus.REFUNDED,
      },
    });
  }

  private mapRazorpaySubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'pending':
        return SubscriptionStatus.TRIALING;
      case 'halted':
        return SubscriptionStatus.PAST_DUE;
      case 'cancelled':
        return SubscriptionStatus.CANCELED;
      case 'completed':
        return SubscriptionStatus.EXPIRED;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private calculateEndDate(billingCycle: string): Date {
    const now = new Date();
    if (billingCycle === 'yearly') {
      return new Date(now.setFullYear(now.getFullYear() + 1));
    }
    return new Date(now.setMonth(now.getMonth() + 1));
  }

  private async createOrUpdateUserLicense(userId: string, licenseTypeId: string, endDate: Date) {
    const existingLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        licenseTypeId,
      },
    });

    if (existingLicense) {
      await this.prisma.userLicense.update({
        where: { id: existingLicense.id },
        data: {
          status: 'ACTIVE',
          endDate,
        },
      });
    } else {
      await this.prisma.userLicense.create({
        data: {
          userId,
          licenseTypeId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate,
        },
      });
    }
  }
}
