// Stripe Payment Gateway Service - Handles US/Global payments via Stripe
import { Injectable, Logger, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentGateway } from '@prisma/client';
import {
  IPaymentGatewayService,
  CreateCustomerParams,
  CustomerResult,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  CreateSubscriptionParams,
  SubscriptionResult,
  CancelSubscriptionParams,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  RefundParams,
  RefundResult,
  PaymentMethodResult,
  CreateCouponParams,
  CouponResult,
  WebhookEvent,
  CustomerPortalResult,
} from './gateway.interface';
import { PrismaService } from '../../database/prisma.service';
import { GatewayConfigService } from '../gateway-config.service';

@Injectable()
export class StripeService implements IPaymentGatewayService {
  private readonly logger = new Logger(StripeService.name);
  private stripeClient: Stripe | null = null;
  readonly gateway = PaymentGateway.STRIPE;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GatewayConfigService))
    private readonly gatewayConfigService: GatewayConfigService,
  ) {
    // Try to initialize from environment variable at startup
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripeClient = new Stripe(secretKey);
    }
  }

  // Lazy initialization - load Stripe key from database if not already configured
  private async initializeStripe(): Promise<void> {
    if (this.stripeClient) return;

    try {
      const secretKey = await this.gatewayConfigService.getDecryptedSecretKey(PaymentGateway.STRIPE);
      if (secretKey) {
        this.stripeClient = new Stripe(secretKey);
        this.logger.log('Stripe initialized from database configuration');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Stripe from database', error);
    }
  }

  // Get configured Stripe instance or throw
  private async getStripe(): Promise<Stripe> {
    if (!this.stripeClient) {
      await this.initializeStripe();
    }

    if (!this.stripeClient) {
      throw new BadRequestException('Stripe is not configured. Please contact support.');
    }

    return this.stripeClient;
  }

  // Customer Management
  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    const stripe = await this.getStripe();
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        address: params.address ? {
          line1: params.address.line1,
          line2: params.address.line2,
          city: params.address.city,
          state: params.address.state,
          postal_code: params.address.postalCode,
          country: params.address.country,
        } : undefined,
        metadata: {
          userId: params.userId,
        },
      });

      return {
        customerId: customer.id,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new InternalServerErrorException('Failed to create payment customer');
    }
  }

  async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<void> {
    const stripe = await this.getStripe();
    try {
      await stripe.customers.update(customerId, {
        email: params.email,
        name: params.name,
        phone: params.phone,
        address: params.address ? {
          line1: params.address.line1,
          line2: params.address.line2,
          city: params.address.city,
          state: params.address.state,
          postal_code: params.address.postalCode,
          country: params.address.country,
        } : undefined,
      });
    } catch (error) {
      this.logger.error('Failed to update Stripe customer', error);
      throw new InternalServerErrorException('Failed to update payment customer');
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const stripe = await this.getStripe();
    try {
      await stripe.customers.del(customerId);
    } catch (error) {
      this.logger.error('Failed to delete Stripe customer', error);
      throw new InternalServerErrorException('Failed to delete payment customer');
    }
  }

  // Checkout Session
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const stripe = await this.getStripe();
    try {
      // Get license type for pricing
      const licenseType = await this.prisma.licenseType.findUnique({
        where: { id: params.licenseTypeId },
      });

      if (!licenseType) {
        throw new BadRequestException('Invalid license type');
      }

      const price = params.billingCycle === 'monthly'
        ? licenseType.priceMonthly
        : licenseType.priceYearly;

      if (!price) {
        throw new BadRequestException('Pricing not configured for this plan');
      }

      // Use existing Stripe customer ID if available, otherwise use email
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        ...(params.stripeCustomerId
          ? { customer: params.stripeCustomerId }
          : { customer_email: params.customerEmail }),
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: licenseType.currency.toLowerCase(),
            product_data: {
              name: licenseType.name,
              description: licenseType.description || undefined,
            },
            unit_amount: price,
            recurring: {
              interval: params.billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          ...params.metadata,
          customerId: params.customerId,
          licenseTypeId: params.licenseTypeId,
          billingCycle: params.billingCycle,
        },
        subscription_data: {
          metadata: {
            customerId: params.customerId,
            licenseTypeId: params.licenseTypeId,
          },
        },
      };

      // Apply coupon if provided
      if (params.couponCode) {
        const coupon = await this.prisma.coupon.findFirst({
          where: {
            code: params.couponCode,
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });

        if (coupon?.stripeCouponId) {
          sessionParams.discounts = [{ coupon: coupon.stripeCouponId }];
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        sessionId: session.id,
        url: session.url!,
        gateway: this.gateway,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to create Stripe checkout session', error);
      throw new InternalServerErrorException('Failed to create checkout session');
    }
  }

  // Subscriptions
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const stripe = await this.getStripe();
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        default_payment_method: params.paymentMethodId,
        metadata: params.metadata,
      };

      if (params.couponId) {
        subscriptionParams.discounts = [{ coupon: params.couponId }];
      }

      if (params.trialDays && params.trialDays > 0) {
        subscriptionParams.trial_period_days = params.trialDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams) as any;

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_period_start || subscription.currentPeriodStart || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end || subscription.currentPeriodEnd || Date.now() / 1000) * 1000),
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    const stripe = await this.getStripe();
    try {
      if (params.immediately) {
        await stripe.subscriptions.cancel(params.subscriptionId);
      } else {
        await stripe.subscriptions.update(params.subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      this.logger.error('Failed to cancel Stripe subscription', error);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const stripe = await this.getStripe();
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      }) as any;

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_period_start || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((subscription.current_period_end || Date.now() / 1000) * 1000),
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to resume Stripe subscription', error);
      throw new InternalServerErrorException('Failed to resume subscription');
    }
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<SubscriptionResult & {
    latestInvoice?: {
      id: string;
      amountDue: number;
      amountPaid: number;
      status: string;
      hostedInvoiceUrl?: string;
      pdfUrl?: string;
    }
  }> {
    const stripe = await this.getStripe();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

      this.logger.log(`Updating subscription ${subscriptionId} to price ${newPriceId}`);

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
        payment_behavior: 'error_if_incomplete',
      }) as any;

      this.logger.log(`Subscription updated. Status: ${updatedSubscription.status}, latest_invoice: ${updatedSubscription.latest_invoice}`);

      // Create an invoice immediately for the proration charges
      // This is needed because proration_behavior: 'create_prorations' only adds line items
      // to the upcoming invoice - it doesn't charge immediately
      let latestInvoice: any = null;

      try {
        // Create a new invoice for any pending proration items
        const newInvoice = await stripe.invoices.create({
          customer: subscription.customer,
          subscription: subscriptionId,
          auto_advance: true, // Automatically finalize and attempt payment
        });

        this.logger.log(`Created proration invoice ${newInvoice.id} with status ${newInvoice.status}, amount_due: ${newInvoice.amount_due}`);

        // If the invoice has a positive amount, finalize and pay it
        if (newInvoice.amount_due > 0 && newInvoice.status === 'draft') {
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(newInvoice.id);
          this.logger.log(`Finalized invoice ${finalizedInvoice.id}, status: ${finalizedInvoice.status}`);

          if (finalizedInvoice.status === 'open') {
            // Attempt to pay the invoice
            const paidInvoice = await stripe.invoices.pay(newInvoice.id);
            this.logger.log(`Paid invoice ${paidInvoice.id}, status: ${paidInvoice.status}`);
            latestInvoice = paidInvoice;
          } else {
            latestInvoice = finalizedInvoice;
          }
        } else if (newInvoice.amount_due === 0) {
          // No charge needed (credit applied), but we still have the invoice
          this.logger.log(`Invoice ${newInvoice.id} has zero amount due (credit applied)`);
          // Void the zero-amount draft invoice since it's not useful
          if (newInvoice.status === 'draft') {
            await stripe.invoices.del(newInvoice.id);
            this.logger.log(`Deleted zero-amount draft invoice ${newInvoice.id}`);
          }
        } else {
          latestInvoice = newInvoice;
        }
      } catch (invoiceError: any) {
        // If we can't create an invoice (e.g., no pending items), try to get the latest one
        this.logger.warn(`Could not create proration invoice: ${invoiceError.message}`);

        // Fall back to the subscription's latest invoice
        if (updatedSubscription.latest_invoice) {
          const invoiceId = typeof updatedSubscription.latest_invoice === 'string'
            ? updatedSubscription.latest_invoice
            : updatedSubscription.latest_invoice.id;

          try {
            latestInvoice = await stripe.invoices.retrieve(invoiceId);
            this.logger.log(`Retrieved existing invoice ${latestInvoice.id}, status: ${latestInvoice.status}`);
          } catch (retrieveError) {
            this.logger.warn(`Could not retrieve invoice ${invoiceId}`, retrieveError);
          }
        }
      }

      return {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodStart: new Date((updatedSubscription.current_period_start || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((updatedSubscription.current_period_end || Date.now() / 1000) * 1000),
        gateway: this.gateway,
        latestInvoice: latestInvoice ? {
          id: latestInvoice.id,
          amountDue: latestInvoice.amount_due,
          amountPaid: latestInvoice.amount_paid,
          status: latestInvoice.status,
          hostedInvoiceUrl: latestInvoice.hosted_invoice_url,
          pdfUrl: latestInvoice.invoice_pdf,
        } : undefined,
      };
    } catch (error: any) {
      this.logger.error('Failed to update Stripe subscription', error);

      // Provide more specific error messages
      if (error.type === 'StripeCardError') {
        throw new BadRequestException(error.message || 'Your card was declined. Please update your payment method.');
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new BadRequestException('Invalid subscription update request');
      }

      throw new InternalServerErrorException('Failed to update subscription. Please try again or contact support.');
    }
  }

  // Payments
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const stripe = await this.getStripe();
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: params.customerId,
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        payment_method: params.paymentMethodId,
        metadata: params.metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe payment intent', error);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntentResult> {
    const stripe = await this.getStripe();
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        status: paymentIntent.status,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to confirm Stripe payment', error);
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const stripe = await this.getStripe();
    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentId,
        amount: params.amount,
        reason: params.reason as Stripe.RefundCreateParams.Reason,
      });

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status || 'pending',
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  // Payment Methods
  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethodResult> {
    const stripe = await this.getStripe();
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return this.mapPaymentMethod(paymentMethod);
    } catch (error) {
      this.logger.error('Failed to attach Stripe payment method', error);
      throw new InternalServerErrorException('Failed to add payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    const stripe = await this.getStripe();
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      this.logger.error('Failed to detach Stripe payment method', error);
      throw new InternalServerErrorException('Failed to remove payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]> {
    const stripe = await this.getStripe();
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => this.mapPaymentMethod(pm));
    } catch (error) {
      this.logger.error('Failed to list Stripe payment methods', error);
      throw new InternalServerErrorException('Failed to list payment methods');
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    const stripe = await this.getStripe();
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to set default Stripe payment method', error);
      throw new InternalServerErrorException('Failed to set default payment method');
    }
  }

  // Coupons
  async createCoupon(params: CreateCouponParams): Promise<CouponResult> {
    const stripe = await this.getStripe();
    try {
      const couponParams: Stripe.CouponCreateParams = {
        id: params.code,
        name: params.name,
        duration: params.duration,
      };

      if (params.discountType === 'percentage') {
        couponParams.percent_off = params.discountValue;
      } else {
        couponParams.amount_off = params.discountValue;
        couponParams.currency = params.currency || 'usd';
      }

      if (params.duration === 'repeating' && params.durationMonths) {
        couponParams.duration_in_months = params.durationMonths;
      }

      if (params.maxRedemptions) {
        couponParams.max_redemptions = params.maxRedemptions;
      }

      const coupon = await stripe.coupons.create(couponParams);

      return {
        couponId: coupon.id,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe coupon', error);
      throw new InternalServerErrorException('Failed to create coupon');
    }
  }

  async deleteCoupon(couponId: string): Promise<void> {
    const stripe = await this.getStripe();
    try {
      await stripe.coupons.del(couponId);
    } catch (error) {
      this.logger.error('Failed to delete Stripe coupon', error);
      throw new InternalServerErrorException('Failed to delete coupon');
    }
  }

  // Customer Portal
  async createCustomerPortalSession(customerId: string, returnUrl: string): Promise<CustomerPortalResult> {
    const stripe = await this.getStripe();
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return {
        url: session.url,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe customer portal session', error);
      throw new InternalServerErrorException('Failed to create billing portal session');
    }
  }

  // Webhook Verification
  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const stripe = await this.getStripe();

    // Try database first, then fall back to environment variable
    let webhookSecret = await this.gatewayConfigService.getDecryptedWebhookSecret(PaymentGateway.STRIPE);
    if (!webhookSecret) {
      webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || null;
    }

    if (!webhookSecret) {
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      return {
        id: event.id,
        type: event.type,
        data: event.data.object as Record<string, any>,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to verify Stripe webhook signature', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // Helper methods
  private mapPaymentMethod(pm: Stripe.PaymentMethod): PaymentMethodResult {
    return {
      paymentMethodId: pm.id,
      type: pm.type,
      cardBrand: pm.card?.brand,
      cardLast4: pm.card?.last4,
      cardExpMonth: pm.card?.exp_month,
      cardExpYear: pm.card?.exp_year,
      gateway: this.gateway,
    };
  }

  // Get publishable key for frontend
  async getPublishableKey(): Promise<string | null> {
    // Try database first, then fall back to environment variable
    const dbKey = await this.gatewayConfigService.getPublicKey(PaymentGateway.STRIPE);
    if (dbKey) return dbKey;
    return this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || null;
  }

  // ============= Sync Methods =============

  // List all Stripe subscriptions for syncing
  async listAllSubscriptions(limit: number = 100): Promise<Stripe.Subscription[]> {
    const stripe = await this.getStripe();
    const subscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.subscriptions.list({
        limit,
        starting_after: startingAfter,
        expand: ['data.customer', 'data.items.data.price'],
      });

      subscriptions.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    return subscriptions;
  }

  // List all Stripe customers for syncing
  async listAllCustomers(limit: number = 100): Promise<Stripe.Customer[]> {
    const stripe = await this.getStripe();
    const customers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.customers.list({
        limit,
        starting_after: startingAfter,
      });

      customers.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    return customers;
  }

  // List all Stripe invoices for a customer
  async listCustomerInvoices(customerId: string, limit: number = 100): Promise<Stripe.Invoice[]> {
    const stripe = await this.getStripe();
    const invoices: Stripe.Invoice[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.invoices.list({
        customer: customerId,
        limit,
        starting_after: startingAfter,
      });

      invoices.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    return invoices;
  }

  // Get a single subscription by ID
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const stripe = await this.getStripe();
    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'items.data.price'],
    });
  }

  // Get a single customer by ID
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    const stripe = await this.getStripe();
    return stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>;
  }

  // Get or create a Stripe price for a license type and billing cycle
  async getOrCreatePrice(params: {
    licenseTypeId: string;
    licenseTypeName: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
  }): Promise<string> {
    const stripe = await this.getStripe();

    // List all prices and filter for matching ones (search API not available in all regions)
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      recurring: { interval: params.interval },
    });

    // Find price matching our criteria
    const existingPrice = prices.data.find(p =>
      p.metadata?.licenseTypeId === params.licenseTypeId &&
      p.unit_amount === params.amount &&
      p.currency?.toLowerCase() === params.currency.toLowerCase()
    );

    if (existingPrice) {
      return existingPrice.id;
    }

    // List products to find existing one
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    let productId: string;
    const existingProduct = products.data.find(p => p.metadata?.licenseTypeId === params.licenseTypeId);

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const product = await stripe.products.create({
        name: params.licenseTypeName,
        metadata: {
          licenseTypeId: params.licenseTypeId,
        },
      });
      productId = product.id;
    }

    // Create new price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: params.amount,
      currency: params.currency.toLowerCase(),
      recurring: {
        interval: params.interval,
      },
      metadata: {
        licenseTypeId: params.licenseTypeId,
        interval: params.interval,
      },
    });

    return price.id;
  }

  // Preview upcoming invoice for subscription change (proration preview)
  async previewSubscriptionChange(params: {
    subscriptionId: string;
    newPriceId: string;
  }): Promise<{
    amountDue: number;
    credit: number;
    prorationDate: number;
    lines: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  }> {
    const stripe = await this.getStripe();

    // Get the current subscription to find the item ID and current period end
    const subscription = await stripe.subscriptions.retrieve(params.subscriptionId) as any;
    const currentItem = subscription.items.data[0];
    const currentItemId = currentItem.id;
    // current_period_end is on the subscription item, not the subscription itself
    const currentPeriodEnd = currentItem.current_period_end;

    // Preview the upcoming invoice with the new price
    const upcomingInvoice = await stripe.invoices.createPreview({
      subscription: params.subscriptionId,
      subscription_details: {
        items: [{
          id: currentItemId,
          price: params.newPriceId,
        }],
        proration_behavior: 'create_prorations',
      },
    });

    // Filter to only include proration items (items within the current billing period)
    // Exclude the next cycle's recurring charge
    const prorationLines = upcomingInvoice.lines.data.filter((line: any) => {
      // If the line item's period starts at or after the current period end,
      // it's the next cycle's charge, not a proration
      if (line.period && line.period.start >= currentPeriodEnd) {
        return false;
      }
      return true;
    });

    // Calculate totals from proration items only
    let credit = 0;
    let amountDue = 0;
    const lines = prorationLines.map((line: any) => {
      if (line.amount < 0) {
        credit += Math.abs(line.amount);
      } else {
        amountDue += line.amount;
      }
      return {
        description: line.description || 'Subscription item',
        amount: line.amount,
        quantity: line.quantity || 1,
      };
    });

    // Net amount due is the sum of all proration items
    const netAmountDue = Math.max(0, amountDue - credit);

    return {
      amountDue: netAmountDue,
      credit,
      prorationDate: Math.floor(Date.now() / 1000),
      lines,
    };
  }

  // List all charges for a customer
  async listCustomerCharges(customerId: string, limit: number = 100): Promise<Stripe.Charge[]> {
    const stripe = await this.getStripe();
    const charges: Stripe.Charge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.charges.list({
        customer: customerId,
        limit,
        starting_after: startingAfter,
      });

      charges.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    return charges;
  }
}
