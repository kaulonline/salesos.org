// Organization DTOs - Data Transfer Objects for organization management
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus, OrganizationMemberRole, OrganizationCodeStatus } from '@prisma/client';

// ============================================
// ORGANIZATION DTOs
// ============================================

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'URL-friendly slug (alphanumeric and hyphens only)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug: string;

  @ApiPropertyOptional({ description: 'Company domain for email validation (e.g., acme.com)' })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/, { message: 'Invalid domain format' })
  domain?: string;

  @ApiProperty({ description: 'Primary contact email' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Billing email' })
  @IsEmail()
  @IsOptional()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Street address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary brand color (hex)' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g., #FF5500)' })
  primaryColor?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus, default: 'PENDING' })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Maximum organization members' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Organization settings (JSON)' })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Company domain' })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({ description: 'Primary contact email' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Billing email' })
  @IsEmail()
  @IsOptional()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary color' })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Max members' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Settings' })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================
// ORGANIZATION CODE DTOs
// ============================================

export class CreateOrganizationCodeDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Custom code (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[A-Z0-9-]+$/, { message: 'Code must contain only uppercase letters, numbers, and hyphens' })
  code?: string;

  @ApiPropertyOptional({ description: 'Internal description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Max uses (null = unlimited)' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date (null = never expires)' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ enum: OrganizationMemberRole, default: 'MEMBER' })
  @IsEnum(OrganizationMemberRole)
  @IsOptional()
  defaultRole?: OrganizationMemberRole;

  @ApiPropertyOptional({ description: 'Auto-assign license type ID on registration' })
  @IsString()
  @IsOptional()
  autoAssignLicenseId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrganizationCodeDto {
  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Max uses' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Valid until' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ enum: OrganizationCodeStatus })
  @IsEnum(OrganizationCodeStatus)
  @IsOptional()
  status?: OrganizationCodeStatus;

  @ApiPropertyOptional({ enum: OrganizationMemberRole })
  @IsEnum(OrganizationMemberRole)
  @IsOptional()
  defaultRole?: OrganizationMemberRole;

  @ApiPropertyOptional({ description: 'Auto-assign license ID' })
  @IsString()
  @IsOptional()
  autoAssignLicenseId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ============================================
// ORGANIZATION MEMBER DTOs
// ============================================

export class AddOrganizationMemberDto {
  @ApiProperty({ description: 'User ID to add' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ enum: OrganizationMemberRole, default: 'MEMBER' })
  @IsEnum(OrganizationMemberRole)
  @IsOptional()
  role?: OrganizationMemberRole;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Job title' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateOrganizationMemberDto {
  @ApiPropertyOptional({ enum: OrganizationMemberRole })
  @IsEnum(OrganizationMemberRole)
  @IsOptional()
  role?: OrganizationMemberRole;

  @ApiPropertyOptional({ description: 'Is member active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Title' })
  @IsString()
  @IsOptional()
  title?: string;
}

// ============================================
// ORGANIZATION LICENSE DTOs
// ============================================

export class CreateOrganizationLicenseDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'License type ID' })
  @IsString()
  @IsNotEmpty()
  licenseTypeId: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Total seats purchased' })
  @IsNumber()
  @Min(1)
  totalSeats: number;

  @ApiPropertyOptional({ description: 'Auto-renew' })
  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Custom limits override' })
  @IsOptional()
  customLimits?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Purchase order ID' })
  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'Contract ID' })
  @IsString()
  @IsOptional()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrganizationLicenseDto {
  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Total seats' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  totalSeats?: number;

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

// ============================================
// VALIDATION DTOs
// ============================================

export class ValidateOrganizationCodeDto {
  @ApiProperty({ description: 'Organization code to validate' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  code: string;
}

export class RegisterWithOrganizationDto {
  @ApiProperty({ description: 'Organization registration code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  organizationCode: string;

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  company?: string;
}

// ============================================
// QUERY DTOs
// ============================================

export class OrganizationQueryDto {
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

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @IsEnum(OrganizationStatus)
  @IsOptional()
  status?: OrganizationStatus;

  @ApiPropertyOptional({ description: 'Search by name or domain' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class OrganizationCodeQueryDto {
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

  @ApiPropertyOptional({ enum: OrganizationCodeStatus })
  @IsEnum(OrganizationCodeStatus)
  @IsOptional()
  status?: OrganizationCodeStatus;

  @ApiPropertyOptional({ description: 'Organization ID filter' })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface OrganizationCodeValidationResult {
  valid: boolean;
  reason?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  defaultRole?: OrganizationMemberRole;
  autoAssignLicenseId?: string;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  contactEmail: string;
  status: OrganizationStatus;
  memberCount: number;
  activeLicenseCount: number;
  createdAt: Date;
}

export interface OrganizationMemberDetails {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationMemberRole;
  isActive: boolean;
  joinedAt: Date;
  department: string | null;
  title: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}
