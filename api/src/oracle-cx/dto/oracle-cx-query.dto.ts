import { IsString, IsOptional, IsNumber, IsObject, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Supported Oracle CX resource types
 */
export type OracleCXResourceType =
  | 'opportunities'
  | 'accounts'
  | 'contacts'
  | 'leads'
  | 'activities'
  | 'tasks'
  | 'revenues'
  | 'notes';

/**
 * DTO for querying Oracle CX resources
 */
export class OracleCXQueryDto {
  @IsString()
  resource: OracleCXResourceType;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsString()
  q?: string; // Quick search query
}

/**
 * DTO for creating Oracle CX records
 */
export class OracleCXCreateDto {
  @IsString()
  resource: OracleCXResourceType;

  @IsObject()
  data: Record<string, any>;
}

/**
 * DTO for updating Oracle CX records
 */
export class OracleCXUpdateDto {
  @IsString()
  resource: OracleCXResourceType;

  @IsString()
  recordId: string;

  @IsObject()
  data: Record<string, any>;
}

/**
 * Response type for Oracle CX query results
 */
export interface OracleCXQueryResult<T = any> {
  items: T[];
  totalResults: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  count: number;
}

/**
 * Response type for Oracle CX create operation
 */
export interface OracleCXCreateResult {
  id: string;
  links?: Array<{
    rel: string;
    href: string;
    name?: string;
    kind?: string;
  }>;
}

/**
 * Oracle CX API error response type
 */
export interface OracleCXApiError {
  type: string;
  title: string;
  detail: string;
  'o:errorCode'?: string;
  'o:errorPath'?: string;
}

/**
 * Oracle CX Opportunity structure
 */
export interface OracleCXOpportunity {
  OptyId: number;
  OptyNumber: string;
  Name: string;
  Description?: string;
  StatusCode?: string;
  SalesStage?: string;
  WinProb?: number;
  Revenue?: number;
  CurrencyCode?: string;
  EstimatedCloseDate?: string;
  ActualCloseDate?: string;
  AccountId?: number;
  AccountName?: string;
  PrimaryContactId?: number;
  PrimaryContactName?: string;
  OwnerResourceId?: number;
  OwnerResourceName?: string;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle CX Account structure
 */
export interface OracleCXAccount {
  PartyId: number;
  PartyNumber: string;
  PartyName: string;
  PartyType?: string;
  OrganizationName?: string;
  EmailAddress?: string;
  PhoneNumber?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  Industry?: string;
  AnnualRevenue?: number;
  EmployeeCount?: number;
  OwnerResourceId?: number;
  OwnerResourceName?: string;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle CX Contact structure
 */
export interface OracleCXContact {
  PartyId: number;
  PartyNumber: string;
  PartyName: string;
  FirstName?: string;
  LastName?: string;
  JobTitle?: string;
  EmailAddress?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  AccountId?: number;
  AccountName?: string;
  OwnerResourceId?: number;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle CX Lead structure
 */
export interface OracleCXLead {
  LeadId: number;
  LeadNumber: string;
  Name: string;
  Description?: string;
  StatusCode?: string;
  RankCode?: string;
  Score?: number;
  ContactId?: number;
  ContactName?: string;
  AccountId?: number;
  AccountName?: string;
  EmailAddress?: string;
  PhoneNumber?: string;
  OwnerResourceId?: number;
  OwnerResourceName?: string;
  CreationDate?: string;
  LastUpdateDate?: string;
}

/**
 * Oracle CX Activity structure
 */
export interface OracleCXActivity {
  ActivityId: number;
  ActivityNumber: string;
  ActivityName?: string;
  ActivityType?: string;
  ActivityStatus?: string;
  Description?: string;
  AccountId?: number;
  AccountName?: string;
  ContactId?: number;
  ContactName?: string;
  OptyId?: number;
  OptyName?: string;
  StartDate?: string;
  EndDate?: string;
  OwnerResourceId?: number;
  OwnerResourceName?: string;
  CreationDate?: string;
  LastUpdateDate?: string;
}
