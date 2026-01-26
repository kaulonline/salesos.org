// Discount Rule Types for SalesOS CRM
// Volume discounts, promo codes, and customer segment pricing

export type DiscountRuleType = 'VOLUME' | 'PROMO_CODE' | 'CUSTOMER_SEGMENT' | 'TIME_LIMITED' | 'BUNDLE';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type DiscountRuleStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SCHEDULED';

export interface VolumeCondition {
  minQuantity: number;
  maxQuantity?: number;
  discount: number;
  discountType: DiscountType;
}

export interface CustomerSegmentCondition {
  accountType?: string[];
  industry?: string[];
  region?: string[];
  minLifetimeValue?: number;
  minPurchaseHistory?: number;
}

export interface DiscountRuleConditions {
  // Volume-based conditions
  volumeTiers?: VolumeCondition[];
  // Product conditions
  productIds?: string[];
  productCategories?: string[];
  excludedProductIds?: string[];
  // Customer conditions
  customerSegment?: CustomerSegmentCondition;
  // Bundle conditions
  requiredProductIds?: string[];
  bundleMinQuantity?: number;
  // Other conditions
  minOrderValue?: number;
  maxOrderValue?: number;
  firstPurchaseOnly?: boolean;
  maxUsesPerCustomer?: number;
  maxTotalUses?: number;
}

export interface DiscountRule {
  id: string;
  name: string;
  description?: string;
  type: DiscountRuleType;
  code?: string; // For PROMO_CODE type
  discount: number;
  discountType: DiscountType;
  conditions: DiscountRuleConditions;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  priority: number; // Higher priority rules apply first
  stackable: boolean; // Can combine with other discounts
  currentUses: number;
  maxUses?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountRuleDto {
  name: string;
  description?: string;
  type: DiscountRuleType;
  code?: string;
  discount: number;
  discountType: DiscountType;
  conditions?: DiscountRuleConditions;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  priority?: number;
  stackable?: boolean;
  maxUses?: number;
}

export interface UpdateDiscountRuleDto {
  name?: string;
  description?: string;
  code?: string;
  discount?: number;
  discountType?: DiscountType;
  conditions?: DiscountRuleConditions;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
  priority?: number;
  stackable?: boolean;
  maxUses?: number;
}

export interface ApplyDiscountDto {
  quoteId: string;
  code?: string; // For promo codes
  ruleId?: string; // For direct rule application
}

export interface DiscountValidationResult {
  valid: boolean;
  discountAmount: number;
  message?: string;
  rule?: DiscountRule;
}

export interface DiscountRuleStats {
  total: number;
  active: number;
  expired: number;
  scheduled: number;
  totalSavings: number;
  byType: {
    type: DiscountRuleType;
    count: number;
    totalUses: number;
  }[];
  topPerformers: {
    id: string;
    name: string;
    uses: number;
    savings: number;
  }[];
}

// Helper constants
export const DISCOUNT_RULE_TYPES: { value: DiscountRuleType; label: string; description: string }[] = [
  { value: 'VOLUME', label: 'Volume Discount', description: 'Discount based on quantity purchased' },
  { value: 'PROMO_CODE', label: 'Promo Code', description: 'Customer enters a code at checkout' },
  { value: 'CUSTOMER_SEGMENT', label: 'Customer Segment', description: 'Automatic discount for specific customer groups' },
  { value: 'TIME_LIMITED', label: 'Time Limited', description: 'Discount available during specific period' },
  { value: 'BUNDLE', label: 'Bundle Discount', description: 'Discount when buying specific products together' },
];

export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
];
