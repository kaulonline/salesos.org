// Outcome Billing DTOs - Data Transfer Objects for Outcome-Based Billing API
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OutcomePricingModel, OutcomeEventStatus } from '@prisma/client';

// ============= Pricing Tier Configuration =============

export class PricingTierDto {
  @IsNumber()
  @Min(0)
  minAmount: number; // Min deal value in cents

  @IsOptional()
  @IsNumber()
  maxAmount?: number | null; // Max deal value in cents (null = no upper limit)

  @IsNumber()
  @Min(0)
  fee: number; // Fee in cents
}

// ============= Pricing Plan DTOs =============

export class CreateOutcomePricingPlanDto {
  @IsString()
  organizationId: string;

  @IsEnum(OutcomePricingModel)
  pricingModel: OutcomePricingModel;

  // Revenue Share
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  revenueSharePercent?: number;

  // Tiered Flat Fee
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  tierConfiguration?: PricingTierDto[];

  // Flat Per Deal
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatFeePerDeal?: number;

  // Hybrid
  @IsOptional()
  @IsString()
  baseSubscriptionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  outcomePercent?: number;

  // Limits
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCap?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDealValue?: number;

  // Profitability safeguards
  @IsOptional()
  @IsNumber()
  @Min(0)
  minFeePerDeal?: number; // Minimum fee per deal in cents (e.g., 10000 = $100)

  @IsOptional()
  @IsNumber()
  @Min(0)
  platformAccessFee?: number; // Monthly platform fee in cents

  // Access control
  @IsOptional()
  @IsBoolean()
  grantsFullAccess?: boolean; // Whether this plan grants full platform access

  // Billing settings
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  billingDay?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOutcomePricingPlanDto {
  @IsOptional()
  @IsEnum(OutcomePricingModel)
  pricingModel?: OutcomePricingModel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  revenueSharePercent?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  tierConfiguration?: PricingTierDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  flatFeePerDeal?: number;

  @IsOptional()
  @IsString()
  baseSubscriptionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  outcomePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCap?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDealValue?: number;

  // Profitability safeguards
  @IsOptional()
  @IsNumber()
  @Min(0)
  minFeePerDeal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  platformAccessFee?: number;

  // Access control
  @IsOptional()
  @IsBoolean()
  grantsFullAccess?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  billingDay?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============= Outcome Event DTOs =============

export class WaiveEventDto {
  @IsString()
  reason: string;
}

export class VoidEventDto {
  @IsString()
  reason: string;
}

export class ResolveReviewDto {
  @IsEnum(['approve', 'void', 'waive'])
  action: 'approve' | 'void' | 'waive';

  @IsOptional()
  @IsString()
  reason?: string;
}

// ============= Query DTOs =============

export class ListOutcomeEventsQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsEnum(OutcomeEventStatus)
  status?: OutcomeEventStatus;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ListOutcomePlansQueryDto {
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

// ============= Response Types =============

export interface OutcomeBillingStats {
  // Current period
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  currentPeriodFees: number;
  currentPeriodDeals: number;
  currentPeriodDealValue: number;

  // Cap tracking
  monthlyCap: number | null;
  capRemaining: number | null;
  capUtilizationPercent: number | null;

  // Historical
  lastPeriodFees: number;
  lastPeriodDeals: number;
  totalLifetimeFees: number;
  totalLifetimeDeals: number;

  // Plan info
  pricingModel: OutcomePricingModel;
  planDetails: {
    revenueSharePercent?: number;
    flatFeePerDeal?: number;
    outcomePercent?: number;
    tierConfiguration?: PricingTierDto[];
    minFeePerDeal?: number;
    platformAccessFee?: number;
    minDealValue?: number;
  };
}

export interface FeeCalculationResult {
  feeAmount: number;
  calculation: {
    model: OutcomePricingModel;
    dealAmount: number;
    percent?: number;
    tier?: PricingTierDto;
    originalFee?: number;
    cappedTo?: number;
    cappedToZero?: boolean;
    belowMinimum?: boolean;
    minFeeApplied?: boolean; // True if minFeePerDeal was used instead of calculated fee
    calculatedFee?: number;  // Original calculated fee before minFee adjustment
  };
}
