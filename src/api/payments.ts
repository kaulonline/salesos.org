import client from './client';

// ============= Types =============

export type PaymentGateway = 'STRIPE' | 'RAZORPAY';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'PAUSED' | 'EXPIRED';
export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponDuration = 'ONCE' | 'REPEATING' | 'FOREVER';

// Stripe Sync Result Type
export interface StripeSyncResult {
  customersProcessed: number;
  customersCreated: number;
  customersUpdated: number;
  subscriptionsProcessed: number;
  subscriptionsCreated: number;
  subscriptionsUpdated: number;
  invoicesProcessed: number;
  invoicesCreated: number;
  paymentsProcessed: number;
  paymentsCreated: number;
  errors: string[];
}

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BillingCustomer {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  razorpayCustomerId?: string;
  billingEmail?: string;
  billingName?: string;
  billingPhone?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
  defaultPaymentMethodId?: string;
  preferredGateway?: PaymentGateway;
  country?: string;
  currency: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  licenseTypeId: string;
  stripeSubscriptionId?: string;
  razorpaySubscriptionId?: string;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'yearly';
  gateway: PaymentGateway;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  cancelReason?: string;
  trialStart?: string;
  trialEnd?: string;
  quantity: number;
  unitAmount: number;
  currency: string;
  discountAmount: number;
  couponId?: string;
  licenseType?: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    description?: string;
    priceMonthly?: number;
    priceYearly?: number;
    maxUsers?: number;
    maxConversations?: number;
    maxLeads?: number;
    maxDocuments?: number;
    features?: string[];
  };
  coupon?: Coupon;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  subscriptionId?: string;
  stripeInvoiceId?: string;
  razorpayInvoiceId?: string;
  status: InvoiceStatus;
  gateway?: PaymentGateway;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  invoiceDate: string;
  dueDate?: string;
  paidAt?: string;
  billingReason?: string;
  description?: string;
  notes?: string;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  lineItems?: InvoiceLineItem[];
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  periodStart?: string;
  periodEnd?: string;
  type?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  invoiceId?: string;
  stripePaymentIntentId?: string;
  razorpayPaymentId?: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethodType?: string;
  cardBrand?: string;
  cardLast4?: string;
  failureCode?: string;
  failureMessage?: string;
  refundedAmount: number;
  refundedAt?: string;
  refundReason?: string;
  receiptUrl?: string;
  customer?: {
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  };
  invoice?: Invoice;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  stripePaymentMethodId?: string;
  razorpayTokenId?: string;
  gateway: PaymentGateway;
  type: string;
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardFunding?: string;
  billingDetails?: BillingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  currency?: string;
  duration: CouponDuration;
  durationMonths?: number;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  timesRedeemed: number;
  appliesToPlans: string[];
  minPurchaseAmount?: number;
  firstTimeOnly: boolean;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  stripeCouponId?: string;
  razorpayCouponId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  gateway: PaymentGateway;
  publishableKey?: string;
}

export interface CustomerPortalSession {
  url: string;
  gateway: PaymentGateway;
}

export interface CouponValidation {
  valid: boolean;
  message?: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    duration: CouponDuration;
    durationMonths?: number;
  };
  discountAmount?: number;
}

export interface UpgradePreview {
  currentPlan: {
    id?: string;
    name?: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
  };
  newPlan: {
    id: string;
    name: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
  };
  proration: {
    unusedCredit: number;
    newPlanCharge: number;
    netAmount: number;
    remainingDays: number;
    lines: Array<{
      description: string;
      amount: number;
      quantity: number;
    }>;
  };
  isUpgrade: boolean;
  message: string;
}

export interface ExistingSubscriptionError {
  message: string;
  code: 'EXISTING_SUBSCRIPTION';
  subscriptionId: string;
  currentPlan: {
    id: string;
    name: string;
    tier: string;
  };
}

export interface PaymentsDashboard {
  totalRevenue: number;
  mrr: number;
  mrrGrowth: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnedThisMonth: number;
  recentPayments: Payment[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============= API Functions =============

export const paymentsApi = {
  // ============= Checkout =============

  createCheckoutSession: async (data: {
    licenseTypeId: string;
    billingCycle: 'monthly' | 'yearly';
    couponCode?: string;
    gateway?: PaymentGateway;
  }): Promise<CheckoutSession> => {
    const response = await client.post<CheckoutSession>('/payments/checkout', data);
    return response.data;
  },

  // ============= Billing Customer =============

  getBillingCustomer: async (): Promise<BillingCustomer | null> => {
    try {
      const response = await client.get<BillingCustomer>('/payments/billing/customer');
      return response.data;
    } catch {
      return null;
    }
  },

  updateBillingCustomer: async (data: Partial<BillingCustomer>): Promise<BillingCustomer> => {
    const response = await client.put<BillingCustomer>('/payments/billing/customer', data);
    return response.data;
  },

  createCustomerPortalSession: async (): Promise<CustomerPortalSession> => {
    const response = await client.post<CustomerPortalSession>('/payments/billing/portal');
    return response.data;
  },

  // ============= Subscriptions =============

  getSubscriptions: async (params?: {
    page?: number;
    limit?: number;
    status?: SubscriptionStatus;
  }): Promise<PaginatedResponse<Subscription>> => {
    const response = await client.get<PaginatedResponse<Subscription>>('/payments/subscriptions', { params });
    return response.data;
  },

  getSubscription: async (id: string): Promise<Subscription> => {
    const response = await client.get<Subscription>(`/payments/subscriptions/${id}`);
    return response.data;
  },

  cancelSubscription: async (id: string, data?: {
    immediately?: boolean;
    reason?: string;
  }): Promise<Subscription> => {
    const response = await client.post<Subscription>(`/payments/subscriptions/${id}/cancel`, data || {});
    return response.data;
  },

  resumeSubscription: async (id: string): Promise<Subscription> => {
    const response = await client.post<Subscription>(`/payments/subscriptions/${id}/resume`);
    return response.data;
  },

  changeSubscriptionPlan: async (id: string, data: {
    newLicenseTypeId: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<Subscription & {
    invoice?: {
      id: string;
      invoiceNumber: string;
      amountDue: number;
      amountPaid: number;
      status: InvoiceStatus;
      hostedInvoiceUrl?: string;
      pdfUrl?: string;
    };
  }> => {
    const response = await client.post<Subscription & {
      invoice?: {
        id: string;
        invoiceNumber: string;
        amountDue: number;
        amountPaid: number;
        status: InvoiceStatus;
        hostedInvoiceUrl?: string;
        pdfUrl?: string;
      };
    }>(`/payments/subscriptions/${id}/change-plan`, data);
    return response.data;
  },

  previewSubscriptionChange: async (id: string, params: {
    newLicenseTypeId: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<UpgradePreview> => {
    const response = await client.get<UpgradePreview>(`/payments/subscriptions/${id}/upgrade-preview`, { params });
    return response.data;
  },

  // ============= Invoices =============

  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
  }): Promise<PaginatedResponse<Invoice>> => {
    const response = await client.get<PaginatedResponse<Invoice>>('/payments/invoices', { params });
    return response.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await client.get<Invoice>(`/payments/invoices/${id}`);
    return response.data;
  },

  downloadInvoicePdf: async (id: string, invoiceNumber: string): Promise<void> => {
    const response = await client.get(`/payments/invoices/${id}/pdf`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============= Payment Methods =============

  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await client.get<PaymentMethod[]>('/payments/payment-methods');
    return response.data;
  },

  addPaymentMethod: async (data: {
    paymentMethodId: string;
    gateway: PaymentGateway;
    setAsDefault?: boolean;
  }): Promise<PaymentMethod> => {
    const response = await client.post<PaymentMethod>('/payments/payment-methods', data);
    return response.data;
  },

  removePaymentMethod: async (id: string): Promise<void> => {
    await client.delete(`/payments/payment-methods/${id}`);
  },

  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    await client.put(`/payments/payment-methods/${id}/default`);
  },

  // ============= Coupons =============

  validateCoupon: async (data: {
    code: string;
    licenseTypeId?: string;
    amount?: number;
  }): Promise<CouponValidation> => {
    // Use public endpoint for coupon validation (no auth required)
    const response = await client.post<CouponValidation>('/payments/public/coupons/validate', data);
    return response.data;
  },
};

// ============= Admin API Functions =============

export const adminPaymentsApi = {
  // Dashboard
  getDashboard: async (): Promise<PaymentsDashboard> => {
    const response = await client.get<PaymentsDashboard>('/admin/payments/dashboard');
    return response.data;
  },

  // Transactions
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Payment>> => {
    const response = await client.get<PaginatedResponse<Payment>>('/admin/payments/transactions', { params });
    return response.data;
  },

  refundPayment: async (id: string, data?: {
    amount?: number;
    reason?: string;
  }): Promise<Payment> => {
    const response = await client.post<Payment>(`/admin/payments/transactions/${id}/refund`, data || {});
    return response.data;
  },

  // Coupons
  getCoupons: async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Coupon>> => {
    const response = await client.get<PaginatedResponse<Coupon>>('/admin/payments/coupons', { params });
    return response.data;
  },

  createCoupon: async (data: {
    code: string;
    name: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    currency?: string;
    duration: CouponDuration;
    durationMonths?: number;
    maxRedemptions?: number;
    maxRedemptionsPerUser?: number;
    appliesToPlans?: string[];
    minPurchaseAmount?: number;
    firstTimeOnly?: boolean;
    startsAt?: string;
    expiresAt?: string;
    syncToStripe?: boolean;
  }): Promise<Coupon> => {
    const response = await client.post<Coupon>('/admin/payments/coupons', data);
    return response.data;
  },

  updateCoupon: async (id: string, data: Partial<Coupon>): Promise<Coupon> => {
    const response = await client.put<Coupon>(`/admin/payments/coupons/${id}`, data);
    return response.data;
  },

  deleteCoupon: async (id: string): Promise<void> => {
    await client.delete(`/admin/payments/coupons/${id}`);
  },

  // Pricing
  updatePricing: async (licenseTypeId: string, data: {
    priceMonthly?: number;
    priceYearly?: number;
    currency?: string;
  }): Promise<any> => {
    const response = await client.put(`/admin/payments/pricing/${licenseTypeId}`, data);
    return response.data;
  },

  // Gateway Configuration
  getGatewayConfigs: async (): Promise<GatewayConfig[]> => {
    const response = await client.get<GatewayConfig[]>('/admin/payments/gateways');
    return response.data;
  },

  getGatewayConfig: async (provider: PaymentGateway): Promise<GatewayConfig> => {
    const response = await client.get<GatewayConfig>(`/admin/payments/gateways/${provider}`);
    return response.data;
  },

  updateGatewayConfig: async (provider: PaymentGateway, data: UpdateGatewayConfigDto): Promise<GatewayConfig> => {
    const response = await client.put<GatewayConfig>(`/admin/payments/gateways/${provider}`, { provider, ...data });
    return response.data;
  },

  testGatewayConnection: async (provider: PaymentGateway): Promise<{ success: boolean; message: string }> => {
    const response = await client.post<{ success: boolean; message: string }>(`/admin/payments/gateways/${provider}/test`);
    return response.data;
  },

  // Stripe Sync
  syncStripeData: async (): Promise<StripeSyncResult> => {
    const response = await client.post<StripeSyncResult>('/admin/payments/sync/stripe');
    return response.data;
  },
};

// Gateway Configuration Types
export interface GatewayConfig {
  id: string;
  provider: PaymentGateway;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  supportedCurrencies: string[];
  supportedCountries: string[];
  testMode: boolean;
  connectionStatus?: string;
  lastTestedAt?: string;
  hasSecretKey?: boolean;
  hasWebhookSecret?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateGatewayConfigDto {
  name?: string;
  isActive?: boolean;
  isDefault?: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  supportedCurrencies?: string[];
  supportedCountries?: string[];
  testMode?: boolean;
}

export default paymentsApi;
