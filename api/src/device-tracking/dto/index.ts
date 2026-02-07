import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsNumber } from 'class-validator';
import { DeviceType, SessionStatus, PushTokenType } from '@prisma/client';

export class RegisterDeviceDto {
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsOptional()
  @IsEnum(PushTokenType)
  pushTokenType?: PushTokenType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdatePushTokenDto {
  @IsString()
  deviceId: string;

  @IsString()
  pushToken: string;

  @IsEnum(PushTokenType)
  pushTokenType: PushTokenType;
}

export class UpdatePushPreferencesDto {
  @IsString()
  deviceId: string;

  @IsBoolean()
  pushEnabled: boolean;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class StartSessionDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class TrackFeatureUsageDto {
  @IsString()
  featureKey: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class DeviceAnalyticsFiltersDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;
}

export class SessionAnalyticsFiltersDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
