import { IsString, IsOptional, IsArray, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============ Enums ============

export enum EnrichmentProvider {
  ZOOMINFO = 'zoominfo',
  APOLLO = 'apollo',
  CLEARBIT = 'clearbit',
}

export enum EntityType {
  LEAD = 'lead',
  CONTACT = 'contact',
  ACCOUNT = 'account',
}

export enum EnrichmentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

// ============ DTOs ============

export class EnrichLeadDto {
  @ApiProperty({ description: 'Lead ID to enrich' })
  @IsString()
  leadId: string;

  @ApiPropertyOptional({ description: 'Specific provider to use', enum: EnrichmentProvider })
  @IsOptional()
  @IsEnum(EnrichmentProvider)
  provider?: EnrichmentProvider;

  @ApiPropertyOptional({ description: 'Force re-enrichment even if recently enriched', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class EnrichContactDto {
  @ApiProperty({ description: 'Contact ID to enrich' })
  @IsString()
  contactId: string;

  @ApiPropertyOptional({ description: 'Specific provider to use', enum: EnrichmentProvider })
  @IsOptional()
  @IsEnum(EnrichmentProvider)
  provider?: EnrichmentProvider;

  @ApiPropertyOptional({ description: 'Force re-enrichment even if recently enriched', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class EnrichAccountDto {
  @ApiProperty({ description: 'Account ID to enrich' })
  @IsString()
  accountId: string;

  @ApiPropertyOptional({ description: 'Specific provider to use', enum: EnrichmentProvider })
  @IsOptional()
  @IsEnum(EnrichmentProvider)
  provider?: EnrichmentProvider;

  @ApiPropertyOptional({ description: 'Force re-enrichment even if recently enriched', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class BulkEnrichDto {
  @ApiProperty({ description: 'Entity type to enrich', enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Entity IDs to enrich', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiPropertyOptional({ description: 'Specific provider to use', enum: EnrichmentProvider })
  @IsOptional()
  @IsEnum(EnrichmentProvider)
  provider?: EnrichmentProvider;

  @ApiPropertyOptional({ description: 'Force re-enrichment even if recently enriched', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

// ============ Interfaces ============

export interface EnrichedPersonData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  seniorityLevel?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  avatarUrl?: string;
  company?: string;
  companyDomain?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  bio?: string;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    startYear?: number;
    endYear?: number;
  }>;
  employment?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }>;
}

export interface EnrichedCompanyData {
  name?: string;
  domain?: string;
  website?: string;
  industry?: string;
  subIndustry?: string;
  employeeCount?: number;
  employeeRange?: string;
  annualRevenue?: number;
  revenueRange?: string;
  founded?: number;
  description?: string;
  logoUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  phone?: string;
  location?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  techStack?: string[];
  tags?: string[];
  type?: string; // B2B, B2C, etc.
  naicsCode?: string;
  sicCode?: string;
  stockSymbol?: string;
  parentCompany?: string;
  ultimateParent?: string;
}

export interface EnrichmentResult {
  success: boolean;
  provider: EnrichmentProvider;
  entityId: string;
  entityType: EntityType;
  status: EnrichmentStatus;
  data?: EnrichedPersonData | EnrichedCompanyData;
  fieldsUpdated?: string[];
  error?: string;
  enrichedAt: Date;
  rawResponse?: any;
}

export interface BulkEnrichmentResult {
  total: number;
  successful: number;
  failed: number;
  results: EnrichmentResult[];
}

export interface ProviderStatus {
  provider: EnrichmentProvider;
  connected: boolean;
  configured: boolean;
  status: string;
  lastUsed?: Date;
  creditsRemaining?: number;
  error?: string;
}

export interface EnrichmentProviderConfig {
  provider: EnrichmentProvider;
  priority: number;
  enabled: boolean;
  fallbackOnError: boolean;
}
