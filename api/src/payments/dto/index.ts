// Payment DTOs - Data Transfer Objects for Payment API
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, Min, Max, IsDateString, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentGateway, DiscountType, CouponDuration, SubscriptionStatus, InvoiceStatus, PaymentStatus } from '@prisma/client';

// ============= Checkout DTOs =============

export class CreateCheckoutSessionDto {
  @IsString()
  licenseTypeId: string;

  @IsEnum(['monthly', 'yearly'])
  billingCycle: 'monthly' | 'yearly';

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}

export class VerifyPaymentDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}

// ============= Billing Customer DTOs =============

export class BillingAddressDto {
  @IsOptional()
  @IsString()
  line1?: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateBillingCustomerDto {
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  billingName?: string;

  @IsOptional()
  @IsString()
  billingPhone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsEnum(PaymentGateway)
  preferredGateway?: PaymentGateway;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

// ============= Subscription DTOs =============

export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  immediately?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangeSubscriptionPlanDto {
  @IsString()
  newLicenseTypeId: string;

  @IsOptional()
  @IsEnum(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
}

// ============= Payment Method DTOs =============

export class AddPaymentMethodDto {
  @IsString()
  paymentMethodId: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}

export class SetDefaultPaymentMethodDto {
  @IsString()
  paymentMethodId: string;
}

// ============= Invoice DTOs =============

export class PayInvoiceDto {
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

// ============= Coupon DTOs =============

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(1)
  discountValue: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(CouponDuration)
  duration: CouponDuration;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(36)
  durationMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptionsPerUser?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToPlans?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsBoolean()
  firstTimeOnly?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  syncToStripe?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRedemptionsPerUser?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliesToPlans?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsBoolean()
  firstTimeOnly?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  licenseTypeId?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

// ============= Admin Payment DTOs =============

export class UpdatePaymentGatewayConfigDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCurrencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCountries?: string[];

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLicenseTypePricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

// ============= Query DTOs =============

export class ListSubscriptionsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}

export class ListInvoicesQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ListCouponsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}

// ============= Payment Gateway Configuration DTOs =============

export class UpdateGatewayConfigDto {
  @IsEnum(PaymentGateway)
  provider: PaymentGateway;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  secretKey?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCurrencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedCountries?: string[];

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;
}

export class TestGatewayConnectionDto {
  @IsEnum(PaymentGateway)
  provider: PaymentGateway;
}
