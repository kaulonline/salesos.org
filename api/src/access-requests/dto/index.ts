import {
  IsEmail,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  MaxLength,
  IsEmpty,
  IsNotEmpty,
  Matches,
} from 'class-validator';

// List of personal email domains to reject
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'live.com',
  'msn.com',
];

export enum AccessRequestStatus {
  PENDING = 'PENDING',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
}

export enum AccessRequestType {
  FREE_TRIAL = 'FREE_TRIAL',
  DEMO = 'DEMO',
  ENTERPRISE = 'ENTERPRISE',
  PARTNER = 'PARTNER',
  OTHER = 'OTHER',
}

/**
 * DTO for creating a new access request (public endpoint)
 */
export class CreateAccessRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100)
  lastName: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(200)
  companyName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  companySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsEnum(AccessRequestType)
  requestType?: AccessRequestType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  howHeard?: string;

  // UTM parameters (captured from URL)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  // Honeypot field - should always be empty (bots often fill this)
  @IsOptional()
  @IsEmpty({ message: 'Invalid submission' })
  company_website?: string;
}

/**
 * DTO for updating an access request (admin endpoint)
 */
export class UpdateAccessRequestDto {
  @IsOptional()
  @IsEnum(AccessRequestStatus)
  status?: AccessRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  organizationCodeSent?: string;
}

/**
 * Query parameters for listing access requests (admin)
 */
export class AccessRequestQueryDto {
  @IsOptional()
  @IsEnum(AccessRequestStatus)
  status?: AccessRequestStatus;

  @IsOptional()
  @IsEnum(AccessRequestType)
  requestType?: AccessRequestType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

/**
 * DTO for sending organization code
 */
export class SendOrgCodeDto {
  @IsString()
  @IsNotEmpty()
  organizationCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  personalMessage?: string;
}

/**
 * Validate that email is not from a personal domain
 */
export function isBusinessEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !PERSONAL_EMAIL_DOMAINS.includes(domain) : false;
}

export { PERSONAL_EMAIL_DOMAINS };
