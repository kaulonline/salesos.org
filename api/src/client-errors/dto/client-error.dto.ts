import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Error severity levels from client
 */
export enum ClientErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  FATAL = 'fatal',
}

/**
 * Context information for the error
 */
export class ErrorContextDto {
  @IsOptional()
  @IsString()
  screenName?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * User context information
 */
export class UserContextDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}

/**
 * Device information
 */
export class DeviceInfoDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  buildNumber?: string;
}

/**
 * Breadcrumb for debugging
 */
export class BreadcrumbDto {
  @IsString()
  message: string;

  @IsString()
  category: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for client error reports
 */
export class ReportClientErrorDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  errorMessage: string;

  @IsOptional()
  @IsString()
  errorType?: string;

  @IsOptional()
  @IsString()
  stackTrace?: string;

  @IsString()
  severity: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorContextDto)
  context?: ErrorContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserContextDto)
  userContext?: UserContextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbDto)
  breadcrumbs?: BreadcrumbDto[];

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsBoolean()
  isFatal?: boolean;

  @IsOptional()
  @IsBoolean()
  isReported?: boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

/**
 * Query options for fetching client errors
 */
export class ClientErrorQueryDto {
  @IsOptional()
  @IsString()
  clientSource?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  screenName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFatal?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number;
}
