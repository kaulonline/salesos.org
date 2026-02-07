import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { NotificationType, NotificationPriority, NotificationStatus } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  titleTemplate: string;

  @IsString()
  bodyTemplate: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  channel: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLicenseTiers?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  titleTemplate?: string;

  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLicenseTiers?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsObject()
  actionData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BroadcastNotificationDto extends SendNotificationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLicenseTiers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetUserIds?: string[];
}

export class ScheduleNotificationDto extends SendNotificationDto {
  @IsString()
  userId: string;

  @IsDateString()
  scheduledFor: string;
}

export class NotificationFiltersDto {
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
