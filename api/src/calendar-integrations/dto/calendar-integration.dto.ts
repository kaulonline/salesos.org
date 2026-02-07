import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { CalendarProvider } from '@prisma/client';

export class InitiateCalendarOAuthDto {
  @IsEnum(CalendarProvider)
  provider: CalendarProvider;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class CompleteCalendarOAuthDto {
  @IsString()
  code: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}

export class UpdateCalendarConnectionDto {
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  syncPastDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  syncFutureDays?: number;

  @IsOptional()
  @IsString()
  calendarId?: string;
}

export class CalendarConnectionResponseDto {
  id: string;
  provider: CalendarProvider;
  email: string;
  status: string;
  calendarId: string | null;
  calendarName: string | null;
  syncEnabled: boolean;
  syncPastDays: number;
  syncFutureDays: number;
  lastSyncAt: Date | null;
  eventsSynced: number;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarListResponseDto {
  id: string;
  name: string;
  primary: boolean;
  accessRole: string;
}
