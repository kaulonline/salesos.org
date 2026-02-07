import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsDateString } from 'class-validator';

export enum ExportEntityType {
  LEAD = 'LEAD',
  CONTACT = 'CONTACT',
  ACCOUNT = 'ACCOUNT',
  OPPORTUNITY = 'OPPORTUNITY',
  ACTIVITY = 'ACTIVITY',
  TASK = 'TASK',
}

export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON',
}

export class ExportRequestDto {
  @IsEnum(ExportEntityType)
  entityType: ExportEntityType;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[]; // Specific fields to export

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>; // Filter criteria

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[]; // Specific record IDs to export
}

export interface ExportResult {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  entityType: ExportEntityType;
  format: ExportFormat;
  totalRecords: number;
  downloadUrl?: string;
  fileName?: string;
  startedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  error?: string;
}

export interface ExportFieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required?: boolean;
}

export const LEAD_EXPORT_FIELDS: ExportFieldDefinition[] = [
  { name: 'firstName', label: 'First Name', type: 'string', required: true },
  { name: 'lastName', label: 'Last Name', type: 'string', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'phone' },
  { name: 'company', label: 'Company', type: 'string' },
  { name: 'title', label: 'Title', type: 'string' },
  { name: 'status', label: 'Status', type: 'string' },
  { name: 'rating', label: 'Rating', type: 'string' },
  { name: 'leadSource', label: 'Lead Source', type: 'string' },
  { name: 'leadScore', label: 'Lead Score', type: 'number' },
  { name: 'industry', label: 'Industry', type: 'string' },
  { name: 'website', label: 'Website', type: 'string' },
  { name: 'address', label: 'Address', type: 'string' },
  { name: 'city', label: 'City', type: 'string' },
  { name: 'state', label: 'State', type: 'string' },
  { name: 'country', label: 'Country', type: 'string' },
  { name: 'postalCode', label: 'Postal Code', type: 'string' },
  { name: 'createdAt', label: 'Created Date', type: 'date' },
];

export const CONTACT_EXPORT_FIELDS: ExportFieldDefinition[] = [
  { name: 'firstName', label: 'First Name', type: 'string', required: true },
  { name: 'lastName', label: 'Last Name', type: 'string', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'phone' },
  { name: 'mobilePhone', label: 'Mobile Phone', type: 'phone' },
  { name: 'title', label: 'Title', type: 'string' },
  { name: 'department', label: 'Department', type: 'string' },
  { name: 'account.name', label: 'Account Name', type: 'string' },
  { name: 'mailingAddress', label: 'Mailing Address', type: 'string' },
  { name: 'createdAt', label: 'Created Date', type: 'date' },
];

export const ACCOUNT_EXPORT_FIELDS: ExportFieldDefinition[] = [
  { name: 'name', label: 'Account Name', type: 'string', required: true },
  { name: 'type', label: 'Type', type: 'string' },
  { name: 'industry', label: 'Industry', type: 'string' },
  { name: 'phone', label: 'Phone', type: 'phone' },
  { name: 'website', label: 'Website', type: 'string' },
  { name: 'annualRevenue', label: 'Annual Revenue', type: 'number' },
  { name: 'numberOfEmployees', label: 'Employees', type: 'number' },
  { name: 'billingAddress', label: 'Billing Address', type: 'string' },
  { name: 'billingCity', label: 'Billing City', type: 'string' },
  { name: 'billingState', label: 'Billing State', type: 'string' },
  { name: 'billingCountry', label: 'Billing Country', type: 'string' },
  { name: 'createdAt', label: 'Created Date', type: 'date' },
];

export const OPPORTUNITY_EXPORT_FIELDS: ExportFieldDefinition[] = [
  { name: 'name', label: 'Opportunity Name', type: 'string', required: true },
  { name: 'account.name', label: 'Account Name', type: 'string' },
  { name: 'stage', label: 'Stage', type: 'string' },
  { name: 'amount', label: 'Amount', type: 'number' },
  { name: 'probability', label: 'Probability', type: 'number' },
  { name: 'closeDate', label: 'Close Date', type: 'date' },
  { name: 'type', label: 'Type', type: 'string' },
  { name: 'opportunitySource', label: 'Source', type: 'string' },
  { name: 'nextStep', label: 'Next Step', type: 'string' },
  { name: 'isClosed', label: 'Is Closed', type: 'boolean' },
  { name: 'isWon', label: 'Is Won', type: 'boolean' },
  { name: 'createdAt', label: 'Created Date', type: 'date' },
];
