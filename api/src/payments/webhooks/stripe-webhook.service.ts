// Stripe Webhook Service - Processes Stripe webhook events
import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StripeService } from '../gateways/stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async handleWebhook(payload: Buffer, signature: string) {
    // Verify and parse the webhook
    const event = await this.stripeService.verifyWebhookSignature(payload, signature);

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
        gateway: PaymentGateway.STRIPE,
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
      this.logger.error(`Failed to process Stripe webhook ${event.type}:`, error);

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
    this.logger.log(`Processing Stripe event: ${eventType}`);

    switch (eventType) {
      // Checkout completed
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(data);
        break;

      // Subscription events
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(data);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(data);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data);
        break;

      // Invoice events
      case 'invoice.created':
        await this.handleInvoiceCreated(data);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(data);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data);
        break;

      // Payment events
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(data);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(data);
        break;

      // Charge events
      case 'charge.refunded':
        await this.handleChargeRefunded(data);
        break;

      default:
        this.logger.log(`Unhandled Stripe event type: ${eventType}`);
    }
  }

  private async handleCheckoutCompleted(data: any) {
    const { id, metadata, subscription, customer } = data;

    this.logger.log(`Checkout completed: ${id}, customer: ${customer}, subscription: ${subscription}`);
    this.logger.log(`Checkout metadata: ${JSON.stringify(metadata)}`);

    // Always link the Stripe customer ID to the billing customer if we have metadata
    if (metadata?.customerId) {
      const billingCustomer = await this.prisma.billingCustomer.findUnique({
        where: { id: metadata.customerId },
      });

      if (billingCustomer) {
        // Always update the stripeCustomerId to ensure they match
        await this.prisma.billingCustomer.update({
          where: { id: metadata.customerId },
          data: { stripeCustomerId: customer },
        });
        this.logger.log(`Updated billing customer ${metadata.customerId} with Stripe customer ${customer}`);
      } else {
        this.logger.warn(`Billing customer ${metadata.customerId} not found`);
      }
    }

    // If this is a subscription checkout, the subscription.created event will handle the rest
    this.logger.log(`Checkout session ${id} completed for subscription ${subscription}`);
  }

  private async handleSubscriptionCreated(data: any) {
    const { id, customer, status, current_period_start, current_period_end, metadata, items } = data;

    this.logger.log(`Subscription created: ${id}, Stripe customer: ${customer}`);
    this.logger.log(`Subscription metadata: ${JSON.stringify(metadata)}`);

    // Find billing customer - first try by stripeCustomerId, then by metadata.customerId
    let billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { stripeCustomerId: customer },
    });

    // Fallback: find by customerId in metadata
    if (!billingCustomer && metadata?.customerId) {
      billingCustomer = await this.prisma.billingCustomer.findUnique({
        where: { id: metadata.customerId },
      });

      // Update the stripeCustomerId if found by metadata
      if (billingCustomer) {
        await this.prisma.billingCustomer.update({
          where: { id: billingCustomer.id },
          data: { stripeCustomerId: customer },
        });
        this.logger.log(`Updated billing customer ${billingCustomer.id} with Stripe customer ${customer}`);
      }
    }

    if (!billingCustomer) {
      this.logger.error(`No billing customer found for Stripe customer ${customer} or metadata customerId ${metadata?.customerId}`);
      return;
    }

    // Get license type from metadata
    const licenseTypeId = metadata?.licenseTypeId;
    if (!licenseTypeId) {
      this.logger.warn(`No licenseTypeId in subscription metadata`);
      return;
    }

    // Get price details
    const item = items?.data?.[0];
    const unitAmount = item?.price?.unit_amount || 0;
    const interval = item?.price?.recurring?.interval || 'month';

    // Check for existing active subscription (duplicate prevention)
    const existingActiveSubscription = await this.prisma.subscription.findFirst({
      where: {
        customerId: billingCustomer.id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        stripeSubscriptionId: { not: id }, // Exclude current subscription
      },
    });

    if (existingActiveSubscription) {
      this.logger.warn(`Duplicate subscription detected for customer ${billingCustomer.id}. Existing: ${existingActiveSubscription.stripeSubscriptionId}, New: ${id}`);

      // Cancel the old subscription in Stripe immediately
      if (existingActiveSubscription.stripeSubscriptionId) {
        try {
          await this.stripeService.cancelSubscription({
            subscriptionId: existingActiveSubscription.stripeSubscriptionId,
            immediately: true,
          });
          this.logger.log(`Canceled old subscription ${existingActiveSubscription.stripeSubscriptionId} to prevent duplicate`);
        } catch (error) {
          this.logger.error(`Failed to cancel old subscription ${existingActiveSubscription.stripeSubscriptionId}:`, error);
        }
      }

      // Mark old subscription as canceled in database
      await this.prisma.subscription.update({
        where: { id: existingActiveSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: 'Replaced by new subscription',
        },
      });
    }

    // Create subscription record
    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: id },
      create: {
        customerId: billingCustomer.id,
        licenseTypeId,
        stripeSubscriptionId: id,
        gateway: PaymentGateway.STRIPE,
        status: this.mapStripeSubscriptionStatus(status),
        billingCycle: interval === 'year' ? 'yearly' : 'monthly',
        currentPeriodStart: new Date(current_period_start * 1000),
        currentPeriodEnd: new Date(current_period_end * 1000),
        unitAmount,
        currency: item?.price?.currency?.toUpperCase() || 'USD',
      },
      update: {
        status: this.mapStripeSubscriptionStatus(status),
        currentPeriodStart: new Date(current_period_start * 1000),
        currentPeriodEnd: new Date(current_period_end * 1000),
      },
    });

    // Create or update user license
    await this.createOrUpdateUserLicense(billingCustomer.userId, licenseTypeId, new Date(current_period_end * 1000));
  }

  private async handleSubscriptionUpdated(data: any) {
    const { id, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at, items } = data;

    this.logger.log(`Subscription updated: ${id}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: id },
      include: { customer: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${id} not found in database`);
      return;
    }

    // Extract price details to detect plan changes
    const item = items?.data?.[0];
    const unitAmount = item?.price?.unit_amount;
    const interval = item?.price?.recurring?.interval;
    const priceMetadata = item?.price?.metadata;

    // Try to find the new license type from price metadata or by matching price
    let newLicenseTypeId: string | undefined;
    if (priceMetadata?.licenseTypeId) {
      newLicenseTypeId = priceMetadata.licenseTypeId;
    } else if (unitAmount) {
      // Try to match by price amount
      const matchingLicenseType = await this.prisma.licenseType.findFirst({
        where: interval === 'year'
          ? { priceYearly: unitAmount }
          : { priceMonthly: unitAmount },
      });
      newLicenseTypeId = matchingLicenseType?.id;
    }

    const updateData: any = {
      status: this.mapStripeSubscriptionStatus(status),
      currentPeriodStart: new Date(current_period_start * 1000),
      currentPeriodEnd: new Date(current_period_end * 1000),
      cancelAtPeriodEnd: cancel_at_period_end,
      canceledAt: canceled_at ? new Date(canceled_at * 1000) : null,
    };

    // If plan changed, update license type and amount
    if (newLicenseTypeId && newLicenseTypeId !== subscription.licenseTypeId) {
      this.logger.log(`Plan change detected for subscription ${id}: ${subscription.licenseTypeId} -> ${newLicenseTypeId}`);
      updateData.licenseTypeId = newLicenseTypeId;
      updateData.unitAmount = unitAmount;
      updateData.billingCycle = interval === 'year' ? 'yearly' : 'monthly';

      // Update user license
      await this.createOrUpdateUserLicense(
        subscription.customer.userId,
        newLicenseTypeId,
        new Date(current_period_end * 1000),
      );
    } else if (unitAmount && unitAmount !== subscription.unitAmount) {
      // Price changed but same plan (e.g., billing cycle change)
      updateData.unitAmount = unitAmount;
      updateData.billingCycle = interval === 'year' ? 'yearly' : 'monthly';
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });
  }

  private async handleSubscriptionDeleted(data: any) {
    const { id } = data;

    this.logger.log(`Subscription deleted: ${id}`);

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: id },
      include: { customer: true },
    });

    if (!subscription) {
      this.logger.warn(`Subscription ${id} not found in database`);
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    // Update user license status
    await this.prisma.userLicense.updateMany({
      where: {
        userId: subscription.customer.userId,
        licenseTypeId: subscription.licenseTypeId,
        status: 'ACTIVE',
      },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  private async handleInvoiceCreated(data: any) {
    const { id, subscription, customer, status, amount_due, amount_paid, currency, lines } = data;

    this.logger.log(`Invoice created: ${id}`);

    const billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { stripeCustomerId: customer },
    });

    if (!billingCustomer) {
      this.logger.warn(`No billing customer found for Stripe customer ${customer}`);
      return;
    }

    // Find subscription if exists
    let subscriptionRecord: { id: string } | null = null;
    if (subscription) {
      subscriptionRecord = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription },
        select: { id: true },
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Create invoice
    const invoice = await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: id },
      create: {
        invoiceNumber,
        customerId: billingCustomer.id,
        subscriptionId: subscriptionRecord?.id,
        stripeInvoiceId: id,
        gateway: PaymentGateway.STRIPE,
        status: this.mapStripeInvoiceStatus(status),
        currency: currency.toUpperCase(),
        amountDue: amount_due,
        amountPaid: amount_paid,
        total: amount_due,
        subtotal: amount_due,
      },
      update: {
        status: this.mapStripeInvoiceStatus(status),
        amountDue: amount_due,
        amountPaid: amount_paid,
      },
    });

    // Create line items
    if (lines?.data) {
      for (const line of lines.data) {
        await this.prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            description: line.description || 'Subscription',
            quantity: line.quantity || 1,
            unitAmount: line.unit_amount_excluding_tax || line.amount,
            amount: line.amount,
            periodStart: line.period?.start ? new Date(line.period.start * 1000) : null,
            periodEnd: line.period?.end ? new Date(line.period.end * 1000) : null,
          },
        });
      }
    }
  }

  private async handleInvoicePaid(data: any) {
    const { id, amount_paid, hosted_invoice_url, invoice_pdf } = data;

    this.logger.log(`Invoice paid: ${id}`);

    await this.prisma.invoice.updateMany({
      where: { stripeInvoiceId: id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaid: amount_paid,
        paidAt: new Date(),
        hostedInvoiceUrl: hosted_invoice_url,
        pdfUrl: invoice_pdf,
      },
    });
  }

  private async handleInvoicePaymentFailed(data: any) {
    const { id } = data;

    this.logger.log(`Invoice payment failed: ${id}`);

    await this.prisma.invoice.updateMany({
      where: { stripeInvoiceId: id },
      data: {
        status: InvoiceStatus.OPEN,
      },
    });
  }

  private async handlePaymentSucceeded(data: any) {
    const { id, customer, amount, currency, payment_method_types, payment_method, metadata } = data;

    this.logger.log(`Payment succeeded: ${id}`);

    const billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { stripeCustomerId: customer },
    });

    if (!billingCustomer) {
      this.logger.warn(`No billing customer found for Stripe customer ${customer}`);
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
      where: { stripePaymentIntentId: id },
      create: {
        customerId: billingCustomer.id,
        invoiceId: invoice?.id,
        stripePaymentIntentId: id,
        gateway: PaymentGateway.STRIPE,
        status: PaymentStatus.SUCCEEDED,
        amount,
        currency: currency.toUpperCase(),
        paymentMethodType: payment_method_types?.[0] || 'card',
        metadata,
      },
      update: {
        status: PaymentStatus.SUCCEEDED,
      },
    });
  }

  private async handlePaymentFailed(data: any) {
    const { id, customer, amount, currency, last_payment_error } = data;

    this.logger.log(`Payment failed: ${id}`);

    const billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { stripeCustomerId: customer },
    });

    if (!billingCustomer) {
      return;
    }

    await this.prisma.payment.upsert({
      where: { stripePaymentIntentId: id },
      create: {
        customerId: billingCustomer.id,
        stripePaymentIntentId: id,
        gateway: PaymentGateway.STRIPE,
        status: PaymentStatus.FAILED,
        amount,
        currency: currency.toUpperCase(),
        failureCode: last_payment_error?.code,
        failureMessage: last_payment_error?.message,
      },
      update: {
        status: PaymentStatus.FAILED,
        failureCode: last_payment_error?.code,
        failureMessage: last_payment_error?.message,
      },
    });
  }

  private async handleChargeRefunded(data: any) {
    const { id, payment_intent, amount_refunded } = data;

    this.logger.log(`Charge refunded: ${id}`);

    if (payment_intent) {
      await this.prisma.payment.updateMany({
        where: { stripePaymentIntentId: payment_intent },
        data: {
          refundedAmount: amount_refunded,
          refundedAt: new Date(),
          status: PaymentStatus.REFUNDED,
        },
      });
    }
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private mapStripeInvoiceStatus(status: string): InvoiceStatus {
    switch (status) {
      case 'draft':
        return InvoiceStatus.DRAFT;
      case 'open':
        return InvoiceStatus.OPEN;
      case 'paid':
        return InvoiceStatus.PAID;
      case 'void':
        return InvoiceStatus.VOID;
      case 'uncollectible':
        return InvoiceStatus.UNCOLLECTIBLE;
      default:
        return InvoiceStatus.OPEN;
    }
  }

  private async createOrUpdateUserLicense(userId: string, licenseTypeId: string, endDate: Date) {
    // First, deactivate ALL other active licenses for this user
    await this.prisma.userLicense.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        licenseTypeId: { not: licenseTypeId },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Now find or create the license for the new plan
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
