// Licensing DTOs - Data Transfer Objects for license management
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsEnum, 
  IsArray, 
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LicenseStatus, LicenseTier } from '@prisma/client';

// ============================================
// LICENSE TYPE DTOs
// ============================================

export class CreateLicenseTypeDto {
  @ApiProperty({ description: 'License type name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ description: 'Description of the license type' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: LicenseTier, description: 'License tier' })
  @IsEnum(LicenseTier)
  tier: LicenseTier;

  @ApiPropertyOptional({ description: 'Monthly price in cents' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ description: 'Yearly price in cents' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Default license duration in days', default: 365 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  defaultDurationDays?: number;

  @ApiPropertyOptional({ description: 'Trial duration in days', default: 14 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDurationDays?: number;

  @ApiPropertyOptional({ description: 'Maximum users allowed' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Maximum conversations per month' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxConversations?: number;

  @ApiPropertyOptional({ description: 'Maximum meetings per month' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxMeetings?: number;

  @ApiPropertyOptional({ description: 'Maximum documents indexed' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDocuments?: number;

  @ApiPropertyOptional({ description: 'Maximum API calls per day' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxApiCalls?: number;

  @ApiPropertyOptional({ description: 'Feature IDs to include' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureIds?: string[];

  @ApiPropertyOptional({ description: 'Is license type active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Show in pricing page', default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateLicenseTypeDto {
  @ApiPropertyOptional({ description: 'License type name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: LicenseTier })
  @IsEnum(LicenseTier)
  @IsOptional()
  tier?: LicenseTier;

  @ApiPropertyOptional({ description: 'Monthly price in cents' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional({ description: 'Yearly price in cents' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional({ description: 'Default license duration in days' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  defaultDurationDays?: number;

  @ApiPropertyOptional({ description: 'Trial duration in days' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDurationDays?: number;

  @ApiPropertyOptional({ description: 'Maximum users' })
  @IsNumber()
  @IsOptional()
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Maximum conversations' })
  @IsNumber()
  @IsOptional()
  maxConversations?: number;

  @ApiPropertyOptional({ description: 'Maximum meetings' })
  @IsNumber()
  @IsOptional()
  maxMeetings?: number;

  @ApiPropertyOptional({ description: 'Maximum documents' })
  @IsNumber()
  @IsOptional()
  maxDocuments?: number;

  @ApiPropertyOptional({ description: 'Maximum API calls' })
  @IsNumber()
  @IsOptional()
  maxApiCalls?: number;

  @ApiPropertyOptional({ description: 'Feature IDs to include' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureIds?: string[];

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is public' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

// ============================================
// LICENSE FEATURE DTOs
// ============================================

export class CreateLicenseFeatureDto {
  @ApiProperty({ description: 'Unique feature key (e.g., ai_chat)' })
  @IsString()
  @IsNotEmpty()
  featureKey: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Feature category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Icon name (Lucide)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Is feature enabled globally', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Requires a license to access', default: true })
  @IsBoolean()
  @IsOptional()
  requiresLicense?: boolean;

  @ApiPropertyOptional({ description: 'Default usage limit' })
  @IsNumber()
  @IsOptional()
  defaultLimit?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateLicenseFeatureDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Is enabled' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Requires license' })
  @IsBoolean()
  @IsOptional()
  requiresLicense?: boolean;

  @ApiPropertyOptional({ description: 'Default limit' })
  @IsNumber()
  @IsOptional()
  defaultLimit?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

// ============================================
// USER LICENSE DTOs
// ============================================

export class AssignLicenseDto {
  @ApiProperty({ description: 'User ID to assign license to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'License type ID' })
  @IsString()
  @IsNotEmpty()
  licenseTypeId: string;

  @ApiPropertyOptional({ description: 'License start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'License end date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Is this a trial license', default: false })
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @ApiPropertyOptional({ description: 'Auto-renew license', default: true })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Custom limits override' })
  @IsOptional()
  customLimits?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Organization ID (for pool-based license assignment)' })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class UpdateUserLicenseDto {
  @ApiPropertyOptional({ enum: LicenseStatus, description: 'License status' })
  @IsEnum(LicenseStatus)
  @IsOptional()
  status?: LicenseStatus;

  @ApiPropertyOptional({ description: 'New end date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Auto-renew' })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Custom limits' })
  @IsOptional()
  customLimits?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RenewLicenseDto {
  @ApiProperty({ description: 'Duration in days to extend the license' })
  @IsNumber()
  @Min(1)
  durationDays: number;
}

export class RevokeLicenseDto {
  @ApiProperty({ description: 'Reason for revoking the license' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SuspendLicenseDto {
  @ApiProperty({ description: 'Reason for suspending the license' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ChangeLicenseTypeDto {
  @ApiProperty({ description: 'New license type ID' })
  @IsString()
  @IsNotEmpty()
  newLicenseTypeId: string;

  @ApiPropertyOptional({ description: 'Reason for changing license type' })
  @IsString()
  @IsOptional()
  reason?: string;
}

// ============================================
// LICENSE CHECK DTOs
// ============================================

export class CheckFeatureAccessDto {
  @ApiProperty({ description: 'Feature key to check access for' })
  @IsString()
  @IsNotEmpty()
  featureKey: string;
}

export class CheckMultipleFeaturesDto {
  @ApiProperty({ description: 'Feature keys to check', type: [String] })
  @IsArray()
  @IsString({ each: true })
  featureKeys: string[];
}

export class RecordUsageDto {
  @ApiProperty({ description: 'Feature key' })
  @IsString()
  @IsNotEmpty()
  featureKey: string;

  @ApiPropertyOptional({ description: 'Usage count', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  usageCount?: number;

  @ApiPropertyOptional({ description: 'Action performed' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Related resource ID' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Resource type' })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface LicenseCheckResult {
  allowed: boolean;
  featureKey: string;
  reason?: string;
  licenseId?: string;
  licenseTier?: string;
  expiresAt?: Date;
  usageLimit?: number | null;
  currentUsage?: number;
}

export interface UserLicenseDetails {
  id: string;
  userId: string;
  licenseTypeId: string;
  organizationId: string | null;
  startDate: Date;
  endDate: Date;
  status: LicenseStatus;
  licenseKey: string;
  isTrial: boolean;
  trialEndDate: Date | null;
  autoRenew: boolean;
  customLimits: any;
  notes: string | null;
  assignedBy: string | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
  };
  licenseType: {
    id: string;
    name: string;
    tier: LicenseTier;
    features: any[];
  };
  entitlements: any[];
}

export interface LicenseTypeWithFeatures {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tier: LicenseTier;
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  defaultDurationDays: number;
  trialDurationDays: number;
  maxUsers: number | null;
  maxConversations: number | null;
  maxMeetings: number | null;
  maxDocuments: number | null;
  maxApiCalls: number | null;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  features: any[];
  userCount: number;
}

export interface LicenseDashboardStats {
  totalLicenses: number;
  activeLicenses: number;
  trialLicenses: number;
  expiredLicenses: number;
  expiringLicenses: number;
  recentAssignments: number;
  tierBreakdown: Array<{
    licenseTypeId: string;
    name: string;
    tier: string;
    count: number;
  }>;
  statusBreakdown: Array<{
    status: LicenseStatus;
    count: number;
  }>;
  topFeatureUsage: Array<{
    featureKey: string;
    usageCount: number;
  }>;
}

// ============================================
// QUERY DTOs
// ============================================

export class LicenseQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ enum: LicenseStatus, description: 'Filter by status' })
  @IsEnum(LicenseStatus)
  @IsOptional()
  status?: LicenseStatus;

  @ApiPropertyOptional({ description: 'Search by user email or name' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 50 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Filter by entity type' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsString()
  @IsOptional()
  action?: string;
}
