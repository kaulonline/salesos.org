// Payment Gateway Interface - Defines common interface for Stripe and Razorpay
import { PaymentGateway } from '@prisma/client';

export interface CreateCheckoutSessionParams {
  customerId: string;
  customerEmail: string;
  stripeCustomerId?: string; // Existing Stripe customer ID to use
  razorpayCustomerId?: string; // Existing Razorpay customer ID to use
  licenseTypeId: string;
  billingCycle: 'monthly' | 'yearly';
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
  gateway: PaymentGateway;
}

export interface CreateCustomerParams {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface CustomerResult {
  customerId: string;
  gateway: PaymentGateway;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  couponId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gateway: PaymentGateway;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  immediately?: boolean;
}

export interface CreatePaymentIntentParams {
  customerId: string;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  status: string;
  gateway: PaymentGateway;
}

export interface RefundParams {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
  gateway: PaymentGateway;
}

export interface CreateCouponParams {
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  currency?: string;
  duration: 'once' | 'repeating' | 'forever';
  durationMonths?: number;
  maxRedemptions?: number;
}

export interface CouponResult {
  couponId: string;
  gateway: PaymentGateway;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  gateway: PaymentGateway;
}

export interface PaymentMethodResult {
  paymentMethodId: string;
  type: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  gateway: PaymentGateway;
}

export interface CustomerPortalResult {
  url: string;
  gateway: PaymentGateway;
}

// Payment Gateway Service Interface
export interface IPaymentGatewayService {
  readonly gateway: PaymentGateway;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  updateCustomer(customerId: string, params: Partial<CreateCustomerParams>): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;

  // Checkout
  createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult>;

  // Subscriptions
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<SubscriptionResult>;

  // Payments
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntentResult>;
  refund(params: RefundParams): Promise<RefundResult>;

  // Payment methods
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethodResult>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // Coupons
  createCoupon(params: CreateCouponParams): Promise<CouponResult>;
  deleteCoupon(couponId: string): Promise<void>;

  // Customer portal (Stripe only feature, Razorpay returns null)
  createCustomerPortalSession?(customerId: string, returnUrl: string): Promise<CustomerPortalResult | null>;

  // Webhook verification
  verifyWebhookSignature(payload: string | Buffer, signature: string): Promise<WebhookEvent>;
}
