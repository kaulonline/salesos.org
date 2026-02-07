// Razorpay Payment Gateway Service - Handles India payments via Razorpay
import { Injectable, Logger, BadRequestException, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
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
} from './gateway.interface';
import { PrismaService } from '../../database/prisma.service';
import { GatewayConfigService } from '../gateway-config.service';

@Injectable()
export class RazorpayService implements IPaymentGatewayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpayClient: Razorpay | null = null;
  private cachedKeySecret: string | null = null;
  readonly gateway = PaymentGateway.RAZORPAY;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GatewayConfigService))
    private readonly gatewayConfigService: GatewayConfigService,
  ) {
    // Try to initialize from environment variables at startup
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret) {
      this.razorpayClient = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.cachedKeySecret = keySecret;
    }
  }

  // Lazy initialization - load Razorpay keys from database if not already configured
  private async initializeRazorpay(): Promise<void> {
    if (this.razorpayClient) return;

    try {
      const keyId = await this.gatewayConfigService.getPublicKey(PaymentGateway.RAZORPAY);
      const keySecret = await this.gatewayConfigService.getDecryptedSecretKey(PaymentGateway.RAZORPAY);

      if (keyId && keySecret) {
        this.razorpayClient = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
        this.cachedKeySecret = keySecret;
        this.logger.log('Razorpay initialized from database configuration');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Razorpay from database', error);
    }
  }

  // Get configured Razorpay instance or throw
  private async getRazorpay(): Promise<Razorpay> {
    if (!this.razorpayClient) {
      await this.initializeRazorpay();
    }

    if (!this.razorpayClient) {
      throw new BadRequestException('Razorpay is not configured. Please contact support.');
    }

    return this.razorpayClient;
  }

  // Get the cached key secret for signature verification
  private async getKeySecret(): Promise<string> {
    if (!this.cachedKeySecret) {
      await this.initializeRazorpay();
    }

    if (!this.cachedKeySecret) {
      // Try environment variable
      const envSecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
      if (envSecret) return envSecret;

      // Try database
      const dbSecret = await this.gatewayConfigService.getDecryptedSecretKey(PaymentGateway.RAZORPAY);
      if (dbSecret) {
        this.cachedKeySecret = dbSecret;
        return dbSecret;
      }

      throw new BadRequestException('Razorpay key secret not configured');
    }

    return this.cachedKeySecret;
  }

  // Customer Management
  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    const razorpay = await this.getRazorpay();
    try {
      const customer = await razorpay.customers.create({
        email: params.email,
        name: params.name || params.email,
        contact: params.phone || '',
        notes: {
          userId: params.userId,
        },
      });

      return {
        customerId: customer.id,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay customer', error);
      throw new InternalServerErrorException('Failed to create payment customer');
    }
  }

  async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<void> {
    const razorpay = await this.getRazorpay();
    try {
      await razorpay.customers.edit(customerId, {
        email: params.email,
        name: params.name,
        contact: params.phone,
      });
    } catch (error) {
      this.logger.error('Failed to update Razorpay customer', error);
      throw new InternalServerErrorException('Failed to update payment customer');
    }
  }

  async deleteCustomer(_customerId: string): Promise<void> {
    // Razorpay doesn't support customer deletion
    this.logger.warn('Razorpay does not support customer deletion');
  }

  // Checkout Session - Razorpay uses Orders + Payment Links
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const razorpay = await this.getRazorpay();
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

      // Convert to INR paise (smallest currency unit)
      const amountInPaise = price; // Assuming price is already in paise

      // Create a Razorpay order
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          customerId: params.customerId,
          licenseTypeId: params.licenseTypeId,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      });

      // Create a payment link for easier checkout
      const paymentLink = await razorpay.paymentLink.create({
        amount: amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description: `Subscription: ${licenseType.name} (${params.billingCycle})`,
        customer: {
          email: params.customerEmail,
        },
        notify: {
          sms: false,
          email: true,
        },
        callback_url: params.successUrl,
        callback_method: 'get',
        notes: {
          customerId: params.customerId,
          licenseTypeId: params.licenseTypeId,
          billingCycle: params.billingCycle,
          orderId: order.id,
        },
      });

      return {
        sessionId: paymentLink.id,
        url: paymentLink.short_url,
        gateway: this.gateway,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to create Razorpay checkout session', error);
      throw new InternalServerErrorException('Failed to create checkout session');
    }
  }

  // Subscriptions - Razorpay has Plans and Subscriptions
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const razorpay = await this.getRazorpay();
    try {
      const subscription = await razorpay.subscriptions.create({
        plan_id: params.priceId, // Razorpay plan ID
        customer_notify: 1,
        total_count: 12, // Number of billing cycles
        notes: params.metadata,
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_start || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((subscription.current_end || Date.now() / 1000) * 1000),
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay subscription', error);
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<void> {
    const razorpay = await this.getRazorpay();
    try {
      await razorpay.subscriptions.cancel(params.subscriptionId, params.immediately);
    } catch (error) {
      this.logger.error('Failed to cancel Razorpay subscription', error);
      throw new InternalServerErrorException('Failed to cancel subscription');
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    const razorpay = await this.getRazorpay();
    try {
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      // Razorpay doesn't have a direct resume - subscription can be reactivated if paused
      // This is a simplified implementation

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_start || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((subscription.current_end || Date.now() / 1000) * 1000),
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to resume Razorpay subscription', error);
      throw new InternalServerErrorException('Failed to resume subscription');
    }
  }

  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<SubscriptionResult> {
    const razorpay = await this.getRazorpay();
    try {
      const subscription = await razorpay.subscriptions.update(subscriptionId, {
        plan_id: newPriceId,
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date((subscription.current_start || Date.now() / 1000) * 1000),
        currentPeriodEnd: new Date((subscription.current_end || Date.now() / 1000) * 1000),
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to update Razorpay subscription', error);
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  // Payments - Razorpay uses Orders
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const razorpay = await this.getRazorpay();
    try {
      // Razorpay uses "orders" instead of "payment intents"
      const order = await razorpay.orders.create({
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        receipt: `receipt_${Date.now()}`,
        notes: params.metadata,
      });

      return {
        paymentIntentId: order.id,
        clientSecret: order.id, // For Razorpay, the order ID is used
        status: order.status,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async confirmPayment(paymentIntentId: string, _paymentMethodId: string): Promise<PaymentIntentResult> {
    const razorpay = await this.getRazorpay();
    try {
      // In Razorpay, payment confirmation happens on the frontend
      // This method fetches the order status
      const order = await razorpay.orders.fetch(paymentIntentId);

      return {
        paymentIntentId: order.id,
        clientSecret: order.id,
        status: order.status,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to fetch Razorpay order', error);
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const razorpay = await this.getRazorpay();
    try {
      const refundParams: any = {
        speed: 'normal',
      };

      if (params.amount) {
        refundParams.amount = params.amount;
      }

      if (params.reason) {
        refundParams.notes = { reason: params.reason };
      }

      const refund = await razorpay.payments.refund(params.paymentId, refundParams);

      return {
        refundId: refund.id,
        amount: refund.amount || params.amount || 0,
        status: refund.status,
        gateway: this.gateway,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay refund', error);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  // Payment Methods - Razorpay uses tokens/cards
  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethodResult> {
    const razorpay = await this.getRazorpay();
    try {
      // Razorpay handles this differently - cards are saved via tokenization
      // This is a simplified implementation
      const token = await razorpay.customers.fetchTokens(customerId);
      const foundToken = token.items?.find((t: any) => t.id === paymentMethodId);

      if (!foundToken) {
        throw new BadRequestException('Payment method not found');
      }

      return {
        paymentMethodId: foundToken.id,
        type: foundToken.method || 'card',
        cardBrand: foundToken.card?.network,
        cardLast4: foundToken.card?.last4,
        cardExpMonth: foundToken.card?.expiry_month ? Number(foundToken.card.expiry_month) : undefined,
        cardExpYear: foundToken.card?.expiry_year ? Number(foundToken.card.expiry_year) : undefined,
        gateway: this.gateway,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to attach Razorpay payment method', error);
      throw new InternalServerErrorException('Failed to add payment method');
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    const razorpay = await this.getRazorpay();
    try {
      await razorpay.customers.deleteToken(paymentMethodId, paymentMethodId);
    } catch (error) {
      this.logger.error('Failed to detach Razorpay payment method', error);
      throw new InternalServerErrorException('Failed to remove payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]> {
    const razorpay = await this.getRazorpay();
    try {
      const tokens = await razorpay.customers.fetchTokens(customerId);

      return (tokens.items || []).map((token: any) => ({
        paymentMethodId: token.id,
        type: token.method || 'card',
        cardBrand: token.card?.network,
        cardLast4: token.card?.last4,
        cardExpMonth: token.card?.expiry_month,
        cardExpYear: token.card?.expiry_year,
        gateway: this.gateway,
      }));
    } catch (error) {
      this.logger.error('Failed to list Razorpay payment methods', error);
      throw new InternalServerErrorException('Failed to list payment methods');
    }
  }

  async setDefaultPaymentMethod(_customerId: string, _paymentMethodId: string): Promise<void> {
    // Razorpay doesn't have a built-in default payment method concept
    // This would need to be stored in our database
    this.logger.warn('Razorpay does not support default payment method via API');
  }

  // Coupons - Razorpay calls them "Offers" but doesn't have a direct coupon API
  // We'll handle coupon logic in our application
  async createCoupon(params: CreateCouponParams): Promise<CouponResult> {
    // Razorpay doesn't have a direct coupon API like Stripe
    // Coupons are managed in our database and applied during checkout
    this.logger.warn('Razorpay coupons managed locally - no gateway sync');
    return {
      couponId: params.code,
      gateway: this.gateway,
    };
  }

  async deleteCoupon(_couponId: string): Promise<void> {
    // No-op for Razorpay
    this.logger.warn('Razorpay coupons managed locally - no gateway sync');
  }

  // Webhook Verification
  async verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    // Try database first, then fall back to environment variable
    let webhookSecret = await this.gatewayConfigService.getDecryptedWebhookSecret(PaymentGateway.RAZORPAY);
    if (!webhookSecret) {
      webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || null;
    }

    if (!webhookSecret) {
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();

      // Razorpay uses HMAC SHA256 for webhook verification
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const event = JSON.parse(payloadString);

      return {
        id: event.event_id || `${event.event}_${Date.now()}`,
        type: event.event,
        data: event.payload,
        gateway: this.gateway,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to verify Razorpay webhook signature', error);
      throw new BadRequestException('Invalid webhook payload');
    }
  }

  // Get key ID for frontend
  async getKeyId(): Promise<string | null> {
    // Try database first, then fall back to environment variable
    const dbKey = await this.gatewayConfigService.getPublicKey(PaymentGateway.RAZORPAY);
    if (dbKey) return dbKey;
    return this.configService.get<string>('RAZORPAY_KEY_ID') || null;
  }

  // Verify payment signature (for frontend payment verification)
  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    try {
      const keySecret = await this.getKeySecret();

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      return expectedSignature === signature;
    } catch {
      return false;
    }
  }
}
