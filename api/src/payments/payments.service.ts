// Payments Service - Coordinates payment operations across Stripe and Razorpay
import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway, SubscriptionStatus, InvoiceStatus, PaymentStatus, DiscountType, CouponDuration } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StripeService } from './gateways/stripe.service';
import { RazorpayService } from './gateways/razorpay.service';
import {
  CreateCheckoutSessionDto,
  UpdateBillingCustomerDto,
  CancelSubscriptionDto,
  ChangeSubscriptionPlanDto,
  AddPaymentMethodDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  RefundPaymentDto,
  UpdateLicenseTypePricingDto,
} from './dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
    private readonly razorpayService: RazorpayService,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
  }

  // ============= Gateway Selection =============

  private getGatewayService(gateway: PaymentGateway) {
    switch (gateway) {
      case PaymentGateway.STRIPE:
        return this.stripeService;
      case PaymentGateway.RAZORPAY:
        return this.razorpayService;
      default:
        throw new BadRequestException('Invalid payment gateway');
    }
  }

  private async detectGateway(country?: string): Promise<PaymentGateway> {
    // India uses Razorpay, rest uses Stripe
    if (country?.toUpperCase() === 'IN') {
      return PaymentGateway.RAZORPAY;
    }
    return PaymentGateway.STRIPE;
  }

  // ============= User Validation =============

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      this.logger.error(`Invalid userId provided: ${userId}`);
      throw new UnauthorizedException('User ID is required. Please log in again.');
    }
  }

  // ============= Billing Customer =============

  async getBillingCustomer(userId: string) {
    this.validateUserId(userId);

    const customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return customer;
  }

  async getOrCreateBillingCustomer(userId: string) {
    this.validateUserId(userId);

    let customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      customer = await this.prisma.billingCustomer.create({
        data: {
          userId,
          billingEmail: user.email,
          billingName: user.name,
        },
      });
    }

    return customer;
  }

  async updateBillingCustomer(userId: string, dto: UpdateBillingCustomerDto) {
    const customer = await this.getOrCreateBillingCustomer(userId);

    const updated = await this.prisma.billingCustomer.update({
      where: { id: customer.id },
      data: {
        billingEmail: dto.billingEmail,
        billingName: dto.billingName,
        billingPhone: dto.billingPhone,
        billingAddress: dto.billingAddress ? JSON.parse(JSON.stringify(dto.billingAddress)) : undefined,
        taxId: dto.taxId,
        preferredGateway: dto.preferredGateway,
        country: dto.country,
        currency: dto.currency,
      },
    });

    // Sync with gateway if customer exists
    if (customer.stripeCustomerId) {
      await this.stripeService.updateCustomer(customer.stripeCustomerId, {
        userId,
        email: dto.billingEmail || customer.billingEmail!,
        name: dto.billingName,
        phone: dto.billingPhone,
        address: dto.billingAddress,
      });
    }

    if (customer.razorpayCustomerId) {
      await this.razorpayService.updateCustomer(customer.razorpayCustomerId, {
        userId,
        email: dto.billingEmail || customer.billingEmail!,
        name: dto.billingName,
        phone: dto.billingPhone,
      });
    }

    return updated;
  }

  // ============= Checkout =============

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const customer = await this.getOrCreateBillingCustomer(userId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for existing active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        licenseType: true,
      },
    });

    if (existingSubscription) {
      const error = new BadRequestException({
        message: 'You already have an active subscription. Please upgrade or change your plan from the subscription page.',
        code: 'EXISTING_SUBSCRIPTION',
        subscriptionId: existingSubscription.id,
        currentPlan: {
          id: existingSubscription.licenseType?.id,
          name: existingSubscription.licenseType?.name,
          tier: existingSubscription.licenseType?.tier,
        },
      });
      throw error;
    }

    // Determine gateway
    const gateway = dto.gateway || customer.preferredGateway || await this.detectGateway(customer.country || undefined);
    const gatewayService = this.getGatewayService(gateway);

    // Ensure gateway customer exists and get the customer ID
    let stripeCustomerId = customer.stripeCustomerId;
    let razorpayCustomerId = customer.razorpayCustomerId;

    if (gateway === PaymentGateway.STRIPE && !stripeCustomerId) {
      const result = await this.stripeService.createCustomer({
        userId,
        email: user.email,
        name: user.name || undefined,
      });
      stripeCustomerId = result.customerId;
      await this.prisma.billingCustomer.update({
        where: { id: customer.id },
        data: { stripeCustomerId },
      });
    } else if (gateway === PaymentGateway.RAZORPAY && !razorpayCustomerId) {
      const result = await this.razorpayService.createCustomer({
        userId,
        email: user.email,
        name: user.name || undefined,
      });
      razorpayCustomerId = result.customerId;
      await this.prisma.billingCustomer.update({
        where: { id: customer.id },
        data: { razorpayCustomerId },
      });
    }

    // Create checkout session with the gateway customer ID
    const session = await gatewayService.createCheckoutSession({
      customerId: customer.id,
      customerEmail: user.email,
      stripeCustomerId: stripeCustomerId || undefined,
      razorpayCustomerId: razorpayCustomerId || undefined,
      licenseTypeId: dto.licenseTypeId,
      billingCycle: dto.billingCycle,
      couponCode: dto.couponCode,
      successUrl: `${this.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${this.appUrl}/billing/cancel`,
      metadata: {
        userId,
        customerId: customer.id,
      },
    });

    return {
      ...session,
      publishableKey: gateway === PaymentGateway.STRIPE
        ? this.stripeService.getPublishableKey()
        : this.razorpayService.getKeyId(),
    };
  }

  // ============= Subscriptions =============

  async getSubscriptions(userId: string, params?: { page?: number; limit?: number; status?: SubscriptionStatus }) {
    this.validateUserId(userId);

    const customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { customerId: customer.id };
    if (params?.status) {
      where.status = params.status;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          licenseType: true,
          coupon: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        licenseType: true,
        coupon: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Verify ownership
    if (subscription.customer.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return subscription;
  }

  async cancelSubscription(userId: string, subscriptionId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.getSubscription(userId, subscriptionId);
    const gatewayService = this.getGatewayService(subscription.gateway);

    // Cancel in gateway
    const gatewaySubId = subscription.gateway === PaymentGateway.STRIPE
      ? subscription.stripeSubscriptionId
      : subscription.razorpaySubscriptionId;

    if (gatewaySubId) {
      await gatewayService.cancelSubscription({
        subscriptionId: gatewaySubId,
        immediately: dto.immediately,
      });
    }

    // Update in database
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: dto.immediately ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: !dto.immediately,
        canceledAt: new Date(),
        cancelReason: dto.reason,
      },
    });

    return updated;
  }

  async resumeSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.getSubscription(userId, subscriptionId);

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not scheduled for cancellation');
    }

    const gatewayService = this.getGatewayService(subscription.gateway);
    const gatewaySubId = subscription.gateway === PaymentGateway.STRIPE
      ? subscription.stripeSubscriptionId
      : subscription.razorpaySubscriptionId;

    if (gatewaySubId) {
      await gatewayService.resumeSubscription(gatewaySubId);
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
      },
    });

    return updated;
  }

  async changeSubscriptionPlan(userId: string, subscriptionId: string, dto: ChangeSubscriptionPlanDto) {
    const subscription = await this.getSubscription(userId, subscriptionId);

    // Validate subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      throw new BadRequestException('Can only change plan for active subscriptions');
    }

    // Prevent same-plan changes
    if (subscription.licenseTypeId === dto.newLicenseTypeId &&
        (!dto.billingCycle || dto.billingCycle === subscription.billingCycle)) {
      throw new BadRequestException('Already on this plan');
    }

    // Get new license type
    const newLicenseType = await this.prisma.licenseType.findUnique({
      where: { id: dto.newLicenseTypeId },
    });

    if (!newLicenseType) {
      throw new NotFoundException('License type not found');
    }

    // Calculate new price
    const billingCycle = dto.billingCycle || subscription.billingCycle;
    const newPrice = billingCycle === 'monthly'
      ? newLicenseType.priceMonthly
      : newLicenseType.priceYearly;

    if (!newPrice) {
      throw new BadRequestException('Pricing not configured for this plan');
    }

    // Only Stripe subscriptions can be updated via API
    if (subscription.gateway !== PaymentGateway.STRIPE || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('Subscription plan changes are only supported for Stripe subscriptions');
    }

    // Get or create Stripe price for the new plan
    const stripePriceId = await this.stripeService.getOrCreatePrice({
      licenseTypeId: newLicenseType.id,
      licenseTypeName: newLicenseType.name,
      amount: newPrice,
      currency: newLicenseType.currency || 'USD',
      interval: billingCycle === 'monthly' ? 'month' : 'year',
    });

    // Update subscription in Stripe (handles proration automatically)
    this.logger.log(`Calling Stripe to update subscription ${subscription.stripeSubscriptionId} to price ${stripePriceId}`);
    const stripeResult = await this.stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      stripePriceId,
    );
    this.logger.log(`Stripe result: status=${stripeResult.status}, latestInvoice=${JSON.stringify(stripeResult.latestInvoice)}`);

    // Update subscription in database
    // Only update period dates if they're valid (end > start). Otherwise, keep original period end.
    const periodDatesValid = stripeResult.currentPeriodEnd > stripeResult.currentPeriodStart;
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        licenseTypeId: dto.newLicenseTypeId,
        billingCycle,
        unitAmount: newPrice,
        // Keep original period dates if Stripe returns invalid ones (same timestamp)
        ...(periodDatesValid ? {
          currentPeriodStart: stripeResult.currentPeriodStart,
          currentPeriodEnd: stripeResult.currentPeriodEnd,
        } : {}),
      },
      include: {
        licenseType: true,
      },
    });

    // Sync invoice to database if one was created
    let invoice: {
      id: string;
      invoiceNumber: string;
      amountDue: number;
      amountPaid: number;
      status: InvoiceStatus;
      hostedInvoiceUrl: string | null;
      pdfUrl: string | null;
    } | null = null;
    if (stripeResult.latestInvoice) {
      this.logger.log(`Syncing invoice ${stripeResult.latestInvoice.id} to database`);
      const invoiceNumber = `INV-${Date.now()}`;
      invoice = await this.prisma.invoice.upsert({
        where: { stripeInvoiceId: stripeResult.latestInvoice.id },
        create: {
          invoiceNumber,
          customerId: subscription.customerId,
          subscriptionId: subscriptionId,
          stripeInvoiceId: stripeResult.latestInvoice.id,
          gateway: PaymentGateway.STRIPE,
          status: this.mapStripeInvoiceStatus(stripeResult.latestInvoice.status),
          currency: subscription.currency || 'USD',
          amountDue: stripeResult.latestInvoice.amountDue,
          amountPaid: stripeResult.latestInvoice.amountPaid,
          total: stripeResult.latestInvoice.amountDue,
          subtotal: stripeResult.latestInvoice.amountDue,
          hostedInvoiceUrl: stripeResult.latestInvoice.hostedInvoiceUrl,
          pdfUrl: stripeResult.latestInvoice.pdfUrl,
          invoiceDate: new Date(),
          paidAt: stripeResult.latestInvoice.status === 'paid' ? new Date() : null,
        },
        update: {
          status: this.mapStripeInvoiceStatus(stripeResult.latestInvoice.status),
          amountPaid: stripeResult.latestInvoice.amountPaid,
          hostedInvoiceUrl: stripeResult.latestInvoice.hostedInvoiceUrl,
          pdfUrl: stripeResult.latestInvoice.pdfUrl,
          paidAt: stripeResult.latestInvoice.status === 'paid' ? new Date() : null,
        },
      });
      this.logger.log(`Invoice synced to database: id=${invoice.id}, invoiceNumber=${invoice.invoiceNumber}, status=${invoice.status}`);
    } else {
      this.logger.log(`No invoice returned from Stripe`);
    }

    // Update user license - first deactivate all other active licenses
    await this.prisma.userLicense.updateMany({
      where: {
        userId: subscription.customer.userId,
        status: 'ACTIVE',
        licenseTypeId: { not: dto.newLicenseTypeId },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Find or create the license for the new plan
    const existingLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId: subscription.customer.userId,
        licenseTypeId: dto.newLicenseTypeId,
      },
    });

    if (existingLicense) {
      await this.prisma.userLicense.update({
        where: { id: existingLicense.id },
        data: {
          status: 'ACTIVE',
          endDate: stripeResult.currentPeriodEnd,
        },
      });
    } else {
      await this.prisma.userLicense.create({
        data: {
          userId: subscription.customer.userId,
          licenseTypeId: dto.newLicenseTypeId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: stripeResult.currentPeriodEnd,
        },
      });
    }

    this.logger.log(`Subscription ${subscriptionId} changed to plan ${newLicenseType.name} (${billingCycle})`);

    // Return subscription with invoice details
    return {
      ...updated,
      invoice: invoice ? {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: invoice.amountDue,
        amountPaid: invoice.amountPaid,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        pdfUrl: invoice.pdfUrl,
      } : null,
    };
  }

  private mapStripeInvoiceStatus(status: string): InvoiceStatus {
    switch (status) {
      case 'paid': return InvoiceStatus.PAID;
      case 'open': return InvoiceStatus.OPEN;
      case 'draft': return InvoiceStatus.DRAFT;
      case 'void': return InvoiceStatus.VOID;
      case 'uncollectible': return InvoiceStatus.UNCOLLECTIBLE;
      default: return InvoiceStatus.OPEN;
    }
  }

  async previewSubscriptionChange(userId: string, subscriptionId: string, newLicenseTypeId: string, billingCycle?: 'monthly' | 'yearly') {
    const subscription = await this.getSubscription(userId, subscriptionId);

    // Validate subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      throw new BadRequestException('Can only preview changes for active subscriptions');
    }

    // Get current and new license types
    const currentPlan = subscription.licenseType;
    const newPlan = await this.prisma.licenseType.findUnique({
      where: { id: newLicenseTypeId },
    });

    if (!newPlan) {
      throw new NotFoundException('License type not found');
    }

    const targetBillingCycle = billingCycle || subscription.billingCycle;
    const newPrice = targetBillingCycle === 'monthly'
      ? newPlan.priceMonthly
      : newPlan.priceYearly;

    if (!newPrice) {
      throw new BadRequestException('Pricing not configured for this plan');
    }

    // Only Stripe subscriptions can preview
    if (subscription.gateway !== PaymentGateway.STRIPE || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('Preview is only available for Stripe subscriptions');
    }

    // Get or create Stripe price for the new plan
    const stripePriceId = await this.stripeService.getOrCreatePrice({
      licenseTypeId: newPlan.id,
      licenseTypeName: newPlan.name,
      amount: newPrice,
      currency: newPlan.currency || 'USD',
      interval: targetBillingCycle === 'monthly' ? 'month' : 'year',
    });

    // Use Stripe's invoice preview API to get the EXACT amount that will be charged
    // This accounts for all accumulated prorations and credits
    const stripePreview = await this.stripeService.previewSubscriptionChange({
      subscriptionId: subscription.stripeSubscriptionId,
      newPriceId: stripePriceId,
    });

    const currentPrice = subscription.unitAmount || 0;
    const isUpgrade = newPrice > currentPrice;

    // Parse the Stripe preview lines
    const lines = stripePreview.lines.map(line => ({
      description: line.description,
      amount: line.amount,
      quantity: line.quantity,
    }));

    // Calculate credit and charge from Stripe's actual amounts
    let unusedCredit = 0;
    let newPlanCharge = 0;
    for (const line of stripePreview.lines) {
      if (line.amount < 0) {
        unusedCredit += Math.abs(line.amount);
      } else {
        newPlanCharge += line.amount;
      }
    }

    const netAmount = stripePreview.amountDue;

    // Calculate remaining days for display
    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const remainingDays = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      currentPlan: {
        id: currentPlan?.id,
        name: currentPlan?.name,
        price: currentPrice,
        billingCycle: subscription.billingCycle,
      },
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPrice,
        billingCycle: targetBillingCycle,
      },
      proration: {
        unusedCredit,
        newPlanCharge,
        netAmount,
        remainingDays,
        lines,
      },
      isUpgrade,
      message: netAmount > 0
        ? `You will be charged $${(netAmount / 100).toFixed(2)} now.`
        : netAmount < 0
          ? `You will receive a credit of $${(Math.abs(netAmount) / 100).toFixed(2)} applied to future invoices.`
          : `No charge - your credit covers the upgrade.`,
    };
  }

  // ============= Invoices =============

  async getInvoices(userId: string, params?: { page?: number; limit?: number; status?: InvoiceStatus }) {
    this.validateUserId(userId);

    const customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { customerId: customer.id };
    if (params?.status) {
      where.status = params.status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          subscription: {
            include: { licenseType: true },
          },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvoice(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        subscription: {
          include: { licenseType: true },
        },
        lineItems: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.customer.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return invoice;
  }

  // ============= Payment Methods =============

  async getPaymentMethods(userId: string) {
    const customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
      include: { paymentMethods: true },
    });

    if (!customer) {
      return [];
    }

    return customer.paymentMethods;
  }

  async addPaymentMethod(userId: string, dto: AddPaymentMethodDto) {
    const customer = await this.getOrCreateBillingCustomer(userId);
    const gatewayService = this.getGatewayService(dto.gateway);

    // Get gateway customer ID
    const gatewayCustomerId = dto.gateway === PaymentGateway.STRIPE
      ? customer.stripeCustomerId
      : customer.razorpayCustomerId;

    if (!gatewayCustomerId) {
      throw new BadRequestException('Please complete a checkout first to add payment methods');
    }

    // Attach in gateway
    const result = await gatewayService.attachPaymentMethod(gatewayCustomerId, dto.paymentMethodId);

    // Save in database
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        customerId: customer.id,
        gateway: dto.gateway,
        type: result.type,
        stripePaymentMethodId: dto.gateway === PaymentGateway.STRIPE ? dto.paymentMethodId : null,
        razorpayTokenId: dto.gateway === PaymentGateway.RAZORPAY ? dto.paymentMethodId : null,
        cardBrand: result.cardBrand,
        cardLast4: result.cardLast4,
        cardExpMonth: result.cardExpMonth,
        cardExpYear: result.cardExpYear,
        isDefault: dto.setAsDefault || false,
      },
    });

    // If setting as default, update others
    if (dto.setAsDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: {
          customerId: customer.id,
          id: { not: paymentMethod.id },
        },
        data: { isDefault: false },
      });
    }

    return paymentMethod;
  }

  async removePaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      include: { customer: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.customer.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const gatewayService = this.getGatewayService(paymentMethod.gateway);
    const gatewayPmId = paymentMethod.gateway === PaymentGateway.STRIPE
      ? paymentMethod.stripePaymentMethodId
      : paymentMethod.razorpayTokenId;

    if (gatewayPmId) {
      await gatewayService.detachPaymentMethod(gatewayPmId);
    }

    await this.prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      include: { customer: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.customer.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Update in gateway
    const gatewayService = this.getGatewayService(paymentMethod.gateway);
    const gatewayCustomerId = paymentMethod.gateway === PaymentGateway.STRIPE
      ? paymentMethod.customer.stripeCustomerId
      : paymentMethod.customer.razorpayCustomerId;
    const gatewayPmId = paymentMethod.gateway === PaymentGateway.STRIPE
      ? paymentMethod.stripePaymentMethodId
      : paymentMethod.razorpayTokenId;

    if (gatewayCustomerId && gatewayPmId) {
      await gatewayService.setDefaultPaymentMethod(gatewayCustomerId, gatewayPmId);
    }

    // Update in database
    await this.prisma.paymentMethod.updateMany({
      where: { customerId: paymentMethod.customerId },
      data: { isDefault: false },
    });

    await this.prisma.paymentMethod.update({
      where: { id: paymentMethodId },
      data: { isDefault: true },
    });

    await this.prisma.billingCustomer.update({
      where: { id: paymentMethod.customerId },
      data: { defaultPaymentMethodId: paymentMethodId },
    });
  }

  // ============= Customer Portal =============

  async createCustomerPortalSession(userId: string) {
    const customer = await this.prisma.billingCustomer.findUnique({
      where: { userId },
    });

    if (!customer?.stripeCustomerId) {
      throw new BadRequestException('Stripe customer not found. Please complete a checkout first.');
    }

    const result = await this.stripeService.createCustomerPortalSession(
      customer.stripeCustomerId,
      `${this.appUrl}/billing`,
    );

    return result;
  }

  // ============= Coupons =============

  async validateCoupon(dto: ValidateCouponDto, userId?: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: dto.code.toUpperCase(),
        isActive: true,
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: new Date() } },
            ],
          },
        ],
      },
    });

    if (!coupon) {
      return { valid: false, message: 'Invalid or expired coupon code' };
    }

    // Check max redemptions
    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      return { valid: false, message: 'Coupon has reached maximum redemptions' };
    }

    // Check per-user redemptions
    if (userId && coupon.maxRedemptionsPerUser) {
      const userRedemptions = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      });
      if (userRedemptions >= coupon.maxRedemptionsPerUser) {
        return { valid: false, message: 'You have already used this coupon' };
      }
    }

    // Check first-time only
    if (coupon.firstTimeOnly && userId) {
      const existingSubscription = await this.prisma.subscription.findFirst({
        where: {
          customer: { userId },
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
      });
      if (existingSubscription) {
        return { valid: false, message: 'This coupon is for new customers only' };
      }
    }

    // Check plan restrictions
    if (dto.licenseTypeId && coupon.appliesToPlans.length > 0) {
      if (!coupon.appliesToPlans.includes(dto.licenseTypeId)) {
        return { valid: false, message: 'Coupon does not apply to this plan' };
      }
    }

    // Check minimum purchase
    if (dto.amount && coupon.minPurchaseAmount && dto.amount < coupon.minPurchaseAmount) {
      return {
        valid: false,
        message: `Minimum purchase of $${(coupon.minPurchaseAmount / 100).toFixed(2)} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = dto.amount ? Math.floor(dto.amount * (coupon.discountValue / 100)) : 0;
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        duration: coupon.duration,
        durationMonths: coupon.durationMonths,
      },
      discountAmount,
    };
  }

  // ============= Admin Methods =============

  async getPaymentGatewayConfigs() {
    return this.prisma.paymentGatewayConfig.findMany();
  }

  async getAllCoupons(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCoupon(dto: CreateCouponDto) {
    // Create in database
    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        currency: dto.currency,
        duration: dto.duration,
        durationMonths: dto.durationMonths,
        maxRedemptions: dto.maxRedemptions,
        maxRedemptionsPerUser: dto.maxRedemptionsPerUser,
        appliesToPlans: dto.appliesToPlans || [],
        minPurchaseAmount: dto.minPurchaseAmount,
        firstTimeOnly: dto.firstTimeOnly || false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Auto-sync to Stripe
    try {
      const result = await this.stripeService.createCoupon({
        code: coupon.code,
        name: coupon.name,
        discountType: dto.discountType === DiscountType.PERCENTAGE ? 'percentage' : 'fixed_amount',
        discountValue: dto.discountValue,
        currency: dto.currency,
        duration: dto.duration === CouponDuration.ONCE ? 'once' :
          dto.duration === CouponDuration.REPEATING ? 'repeating' : 'forever',
        durationMonths: dto.durationMonths,
        maxRedemptions: dto.maxRedemptions,
      });

      // Update coupon with Stripe ID
      const updatedCoupon = await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { stripeCouponId: result.couponId },
      });

      this.logger.log(`Coupon ${coupon.code} synced to Stripe: ${result.couponId}`);
      return updatedCoupon;
    } catch (error) {
      this.logger.error(`Failed to sync coupon ${coupon.code} to Stripe`, error);
      // Return the coupon even if Stripe sync fails - it will work locally
    }

    return coupon;
  }

  async updateCoupon(couponId: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        name: dto.name,
        description: dto.description,
        maxRedemptions: dto.maxRedemptions,
        maxRedemptionsPerUser: dto.maxRedemptionsPerUser,
        appliesToPlans: dto.appliesToPlans,
        minPurchaseAmount: dto.minPurchaseAmount,
        firstTimeOnly: dto.firstTimeOnly,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCoupon(couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    // Delete from Stripe if synced
    if (coupon.stripeCouponId) {
      try {
        await this.stripeService.deleteCoupon(coupon.stripeCouponId);
        this.logger.log(`Coupon ${coupon.code} deleted from Stripe: ${coupon.stripeCouponId}`);
      } catch (error) {
        this.logger.error(`Failed to delete coupon ${coupon.code} from Stripe`, error);
      }
    }

    // Soft delete by deactivating
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });

    this.logger.log(`Coupon ${coupon.code} deactivated`);
  }

  async getAllPayments(params?: { page?: number; limit?: number; status?: PaymentStatus; startDate?: string; endDate?: string }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.createdAt.lte = new Date(params.endDate);
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
          invoice: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async refundPayment(paymentId: string, dto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    const gatewayService = this.getGatewayService(payment.gateway);
    const gatewayPaymentId = payment.gateway === PaymentGateway.STRIPE
      ? payment.stripePaymentIntentId
      : payment.razorpayPaymentId;

    if (!gatewayPaymentId) {
      throw new BadRequestException('Payment gateway ID not found');
    }

    const result = await gatewayService.refund({
      paymentId: gatewayPaymentId,
      amount: dto.amount,
      reason: dto.reason,
    });

    // Update payment record
    const refundedAmount = payment.refundedAmount + result.amount;
    const newStatus = refundedAmount >= payment.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        refundedAmount,
        refundedAt: new Date(),
        refundReason: dto.reason,
      },
    });
  }

  async updateLicenseTypePricing(licenseTypeId: string, dto: UpdateLicenseTypePricingDto) {
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id: licenseTypeId },
    });

    if (!licenseType) {
      throw new NotFoundException('License type not found');
    }

    return this.prisma.licenseType.update({
      where: { id: licenseTypeId },
      data: {
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        currency: dto.currency,
      },
    });
  }

  async getPaymentsDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue,
      activeSubscriptions,
      trialSubscriptions,
      churnedSubscriptions,
      recentPayments,
    ] = await Promise.all([
      // Total revenue (all time)
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED },
        _sum: { amount: true },
      }),
      // This month's revenue
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Last month's revenue
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCEEDED,
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth,
          },
        },
        _sum: { amount: true },
      }),
      // Active subscriptions count
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      // Trial subscriptions count
      this.prisma.subscription.count({
        where: { status: SubscriptionStatus.TRIALING },
      }),
      // Churned this month
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: { gte: startOfMonth },
        },
      }),
      // Recent payments
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCEEDED },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const mrr = monthlyRevenue._sum.amount || 0;
    const lastMrr = lastMonthRevenue._sum.amount || 0;
    const mrrGrowth = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0;

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      mrr,
      mrrGrowth,
      activeSubscriptions,
      trialSubscriptions,
      churnedThisMonth: churnedSubscriptions,
      recentPayments,
    };
  }

  // ============= Stripe Sync Methods =============

  async syncStripeData() {
    this.logger.log('Starting Stripe data sync...');
    const results = {
      customersProcessed: 0,
      customersCreated: 0,
      customersUpdated: 0,
      subscriptionsProcessed: 0,
      subscriptionsCreated: 0,
      subscriptionsUpdated: 0,
      invoicesProcessed: 0,
      invoicesCreated: 0,
      paymentsProcessed: 0,
      paymentsCreated: 0,
      errors: [] as string[],
    };

    try {
      // Fetch all subscriptions from Stripe
      const stripeSubscriptions = await this.stripeService.listAllSubscriptions();
      this.logger.log(`Found ${stripeSubscriptions.length} subscriptions in Stripe`);

      for (const stripeSub of stripeSubscriptions) {
        try {
          results.subscriptionsProcessed++;
          await this.syncSubscription(stripeSub, results);
        } catch (error) {
          const errorMsg = `Failed to sync subscription ${stripeSub.id}: ${error.message}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Sync payments for all billing customers
      const billingCustomers = await this.prisma.billingCustomer.findMany({
        where: { stripeCustomerId: { not: null } },
      });

      for (const customer of billingCustomers) {
        if (!customer.stripeCustomerId) continue;
        try {
          const charges = await this.stripeService.listCustomerCharges(customer.stripeCustomerId);
          for (const charge of charges) {
            await this.syncCharge(charge, customer.id, results);
          }
        } catch (error) {
          const errorMsg = `Failed to sync payments for customer ${customer.id}: ${error.message}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      this.logger.log(`Stripe sync completed: ${JSON.stringify(results)}`);
      return results;
    } catch (error) {
      this.logger.error('Stripe sync failed:', error);
      throw error;
    }
  }

  private async syncCharge(charge: any, customerId: string, results: any) {
    results.paymentsProcessed++;

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { stripePaymentIntentId: charge.payment_intent },
          { stripePaymentIntentId: charge.id }, // Some old charges might use charge ID
        ],
      },
    });

    if (existingPayment) {
      return; // Already synced
    }

    // Find related invoice
    let invoiceId: string | undefined;
    if (charge.invoice) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { stripeInvoiceId: charge.invoice as string },
      });
      invoiceId = invoice?.id;
    }

    await this.prisma.payment.create({
      data: {
        customerId,
        invoiceId,
        stripePaymentIntentId: charge.payment_intent as string || charge.id,
        gateway: PaymentGateway.STRIPE,
        status: charge.status === 'succeeded' ? PaymentStatus.SUCCEEDED :
               charge.status === 'failed' ? PaymentStatus.FAILED : PaymentStatus.PENDING,
        amount: charge.amount,
        currency: charge.currency.toUpperCase(),
        paymentMethodType: charge.payment_method_details?.type || 'card',
        cardBrand: charge.payment_method_details?.card?.brand,
        cardLast4: charge.payment_method_details?.card?.last4,
        receiptUrl: charge.receipt_url,
        refundedAmount: charge.amount_refunded || 0,
        createdAt: new Date(charge.created * 1000),
      },
    });

    results.paymentsCreated++;
  }

  private async syncSubscription(stripeSub: any, results: any) {
    const stripeCustomer = stripeSub.customer as any;
    const stripeCustomerId = typeof stripeCustomer === 'string' ? stripeCustomer : stripeCustomer?.id;
    const customerEmail = typeof stripeCustomer === 'string' ? null : stripeCustomer?.email;

    if (!stripeCustomerId) {
      results.errors.push(`Subscription ${stripeSub.id} has no customer`);
      return;
    }

    // Find or create billing customer
    let billingCustomer = await this.prisma.billingCustomer.findFirst({
      where: { stripeCustomerId },
    });

    if (!billingCustomer && customerEmail) {
      // Try to find user by email
      const user = await this.prisma.user.findFirst({
        where: { email: customerEmail },
      });

      if (user) {
        // Check if user already has a billing customer
        billingCustomer = await this.prisma.billingCustomer.findUnique({
          where: { userId: user.id },
        });

        if (billingCustomer) {
          // Update existing billing customer with Stripe ID
          billingCustomer = await this.prisma.billingCustomer.update({
            where: { id: billingCustomer.id },
            data: { stripeCustomerId },
          });
          results.customersUpdated++;
        } else {
          // Create new billing customer
          billingCustomer = await this.prisma.billingCustomer.create({
            data: {
              userId: user.id,
              stripeCustomerId,
              billingEmail: customerEmail,
              billingName: stripeCustomer?.name,
            },
          });
          results.customersCreated++;
        }
        results.customersProcessed++;
      } else {
        results.errors.push(`No user found for Stripe customer ${stripeCustomerId} with email ${customerEmail}`);
        return;
      }
    }

    if (!billingCustomer) {
      results.errors.push(`Could not find or create billing customer for Stripe customer ${stripeCustomerId}`);
      return;
    }

    // Get license type from metadata or try to match by price
    let licenseTypeId = stripeSub.metadata?.licenseTypeId;

    if (!licenseTypeId) {
      // Try to find license type by price amount
      const item = stripeSub.items?.data?.[0];
      const unitAmount = item?.price?.unit_amount;
      const interval = item?.price?.recurring?.interval;

      if (unitAmount) {
        const licenseType = await this.prisma.licenseType.findFirst({
          where: interval === 'year'
            ? { priceYearly: unitAmount }
            : { priceMonthly: unitAmount },
        });
        licenseTypeId = licenseType?.id;
      }
    }

    if (!licenseTypeId) {
      // Use default starter plan as fallback
      const defaultLicense = await this.prisma.licenseType.findFirst({
        where: { tier: 'STARTER' },
      });
      licenseTypeId = defaultLicense?.id;
    }

    if (!licenseTypeId) {
      results.errors.push(`No license type found for subscription ${stripeSub.id}`);
      return;
    }

    // Map Stripe status to our status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.PAUSED,
      incomplete: SubscriptionStatus.ACTIVE,
      incomplete_expired: SubscriptionStatus.EXPIRED,
      unpaid: SubscriptionStatus.PAST_DUE,
    };

    const item = stripeSub.items?.data?.[0];

    // Handle date conversion - Stripe returns Unix timestamps
    const periodStart = stripeSub.current_period_start;
    const periodEnd = stripeSub.current_period_end;
    const canceledAt = stripeSub.canceled_at;

    // Validate dates before creating
    const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : new Date();
    const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    this.logger.log(`Subscription ${stripeSub.id}: periodStart=${periodStart}, periodEnd=${periodEnd}, status=${stripeSub.status}`);

    const subscriptionData = {
      customerId: billingCustomer.id,
      licenseTypeId,
      stripeSubscriptionId: stripeSub.id,
      gateway: PaymentGateway.STRIPE,
      status: statusMap[stripeSub.status] || SubscriptionStatus.ACTIVE,
      billingCycle: item?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end || false,
      canceledAt: canceledAt ? new Date(canceledAt * 1000) : null,
      unitAmount: item?.price?.unit_amount || 0,
      currency: item?.price?.currency?.toUpperCase() || 'USD',
    };

    // Upsert subscription
    const existingSub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (existingSub) {
      await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: subscriptionData,
      });
      results.subscriptionsUpdated++;
    } else {
      await this.prisma.subscription.create({
        data: subscriptionData,
      });
      results.subscriptionsCreated++;

      // Also create/update user license
      const existingLicense = await this.prisma.userLicense.findFirst({
        where: {
          userId: billingCustomer.userId,
          licenseTypeId,
        },
      });

      if (existingLicense) {
        await this.prisma.userLicense.update({
          where: { id: existingLicense.id },
          data: {
            status: 'ACTIVE',
            endDate: currentPeriodEnd,
          },
        });
      } else {
        await this.prisma.userLicense.create({
          data: {
            userId: billingCustomer.userId,
            licenseTypeId,
            status: 'ACTIVE',
            startDate: currentPeriodStart,
            endDate: currentPeriodEnd,
          },
        });
      }
    }

    // Sync invoices for this customer
    try {
      const stripeInvoices = await this.stripeService.listCustomerInvoices(stripeCustomerId);
      for (const stripeInvoice of stripeInvoices) {
        await this.syncInvoice(stripeInvoice, billingCustomer.id, results);
      }
    } catch (error) {
      results.errors.push(`Failed to sync invoices for customer ${stripeCustomerId}: ${error.message}`);
    }
  }

  private async syncInvoice(stripeInvoice: any, billingCustomerId: string, results: any) {
    results.invoicesProcessed++;

    const invoiceStatusMap: Record<string, InvoiceStatus> = {
      draft: InvoiceStatus.DRAFT,
      open: InvoiceStatus.OPEN,
      paid: InvoiceStatus.PAID,
      void: InvoiceStatus.VOID,
      uncollectible: InvoiceStatus.UNCOLLECTIBLE,
    };

    // Find subscription if exists
    let subscriptionId: string | null = null;
    if (stripeInvoice.subscription) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeInvoice.subscription },
        select: { id: true },
      });
      subscriptionId = subscription?.id || null;
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { stripeInvoiceId: stripeInvoice.id },
    });

    const invoiceData = {
      customerId: billingCustomerId,
      subscriptionId,
      stripeInvoiceId: stripeInvoice.id,
      gateway: PaymentGateway.STRIPE,
      status: invoiceStatusMap[stripeInvoice.status] || InvoiceStatus.OPEN,
      currency: stripeInvoice.currency?.toUpperCase() || 'USD',
      subtotal: stripeInvoice.subtotal || 0,
      total: stripeInvoice.total || 0,
      amountDue: stripeInvoice.amount_due || 0,
      amountPaid: stripeInvoice.amount_paid || 0,
      discountAmount: stripeInvoice.total_discount_amounts?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0,
      taxAmount: stripeInvoice.tax || 0,
      invoiceDate: stripeInvoice.created ? new Date(stripeInvoice.created * 1000) : new Date(),
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
      paidAt: stripeInvoice.status_transitions?.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      pdfUrl: stripeInvoice.invoice_pdf,
    };

    if (existingInvoice) {
      await this.prisma.invoice.update({
        where: { id: existingInvoice.id },
        data: invoiceData,
      });
    } else {
      await this.prisma.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber: `INV-${stripeInvoice.number || Date.now()}`,
        },
      });
      results.invoicesCreated++;
    }
  }
}
