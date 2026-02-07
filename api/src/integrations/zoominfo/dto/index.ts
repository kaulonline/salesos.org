import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchCompanyDto {
  @ApiPropertyOptional({ description: 'Company name to search' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company domain to search' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'Industry filter' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Employee count range (min-max)' })
  @IsOptional()
  @IsString()
  employeeRange?: string;

  @ApiPropertyOptional({ description: 'Revenue range (min-max)' })
  @IsOptional()
  @IsString()
  revenueRange?: string;

  @ApiPropertyOptional({ description: 'Maximum results', default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class GetCompanyChangesDto {
  @ApiProperty({ description: 'Company IDs to check for changes' })
  @IsArray()
  @IsString({ each: true })
  companyIds: string[];

  @ApiPropertyOptional({ description: 'Number of days to look back', default: 30 })
  @IsOptional()
  @IsNumber()
  daysBack?: number;
}

export class SearchContactsDto {
  @ApiPropertyOptional({ description: 'Company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Job title filter' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Seniority level filter' })
  @IsOptional()
  @IsString()
  seniorityLevel?: string;

  @ApiPropertyOptional({ description: 'Department filter' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Maximum results', default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export interface ZoominfoConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: number;
}

export interface CompanyInfo {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  revenueRange?: string;
  founded?: number;
  headquarters?: {
    city: string;
    state: string;
    country: string;
  };
  description?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  technologies?: string[];
}

export interface ExecutiveChange {
  companyId: string;
  companyName: string;
  changeType: 'NEW_HIRE' | 'DEPARTURE' | 'PROMOTION' | 'ROLE_CHANGE';
  executiveName: string;
  previousTitle?: string;
  newTitle?: string;
  previousCompany?: string;
  department?: string;
  linkedinUrl?: string;
  detectedAt: Date;
}

export interface FundingEvent {
  companyId: string;
  companyName: string;
  fundingType: string;
  amount?: number;
  currency?: string;
  round?: string;
  investors?: string[];
  announcedDate: Date;
  sourceUrl?: string;
}

export interface TechStackChange {
  companyId: string;
  companyName: string;
  changeType: 'ADDED' | 'REMOVED';
  technology: string;
  category: string;
  detectedAt: Date;
}

export interface CompanyNews {
  companyId: string;
  companyName: string;
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt: Date;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
}

export interface ContactInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  seniorityLevel?: string;
  department?: string;
  companyId?: string;
  companyName?: string;
  linkedinUrl?: string;
}
