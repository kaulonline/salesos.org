import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EmailTemplateCategory,
  EmailTemplateStatus,
  EmailCampaignStatus,
} from '@prisma/client';

// ============================================
// EMAIL TEMPLATE DTOs
// ============================================

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  subject: string;

  @IsString()
  bodyHtml: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsEnum(EmailTemplateCategory)
  category?: EmailTemplateCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  useIrisBranding?: boolean;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];
}

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsString()
  preheader?: string;

  @IsOptional()
  @IsEnum(EmailTemplateCategory)
  category?: EmailTemplateCategory;

  @IsOptional()
  @IsEnum(EmailTemplateStatus)
  status?: EmailTemplateStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  useIrisBranding?: boolean;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];
}

export class EmailTemplateQueryDto {
  @IsOptional()
  @IsEnum(EmailTemplateCategory)
  category?: EmailTemplateCategory;

  @IsOptional()
  @IsEnum(EmailTemplateStatus)
  status?: EmailTemplateStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================
// EMAIL CAMPAIGN DTOs
// ============================================

export class CreateEmailCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  recipientType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipientList?: string[];

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class UpdateEmailCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  recipientType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipientList?: string[];

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsEnum(EmailCampaignStatus)
  status?: EmailCampaignStatus;
}

export class EmailCampaignQueryDto {
  @IsOptional()
  @IsEnum(EmailCampaignStatus)
  status?: EmailCampaignStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================
// EMAIL SEND DTOs
// ============================================

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsString()
  subject: string;

  @IsString()
  bodyHtml: string;

  @IsOptional()
  @IsString()
  bodyText?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}

export class SendTemplateEmailDto {
  @IsString()
  templateId: string;

  @IsEmail()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}

export class SendBulkEmailDto {
  @IsString()
  templateId: string;

  @IsArray()
  recipients: Array<{
    email: string;
    name?: string;
    variables?: Record<string, string>;
  }>;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

// ============================================
// EMAIL QUEUE DTOs
// ============================================

export class EmailQueueQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================
// EMAIL PREFERENCES DTOs
// ============================================

export class UpdateEmailPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyDigest?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyReport?: boolean;

  @IsOptional()
  @IsBoolean()
  monthlyReport?: boolean;

  @IsOptional()
  @IsBoolean()
  newLeadAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  leadStatusChange?: boolean;

  @IsOptional()
  @IsBoolean()
  dealStageChange?: boolean;

  @IsOptional()
  @IsBoolean()
  dealWonLost?: boolean;

  @IsOptional()
  @IsBoolean()
  taskAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  taskDueReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  meetingReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  aiInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  securityAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;

  @IsOptional()
  @IsString()
  digestTime?: string;

  @IsOptional()
  @IsString()
  digestTimezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  digestDays?: string[];
}

// ============================================
// EMAIL STATISTICS DTOs
// ============================================

export class EmailStatsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}
