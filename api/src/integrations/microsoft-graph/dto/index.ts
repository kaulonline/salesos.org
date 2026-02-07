import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailabilityDto {
  @ApiProperty({ description: 'Start of the time range' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End of the time range' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Meeting duration in minutes', default: 30 })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Email addresses to check availability for' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event subject/title' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Event start time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Event end time' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Event description/body' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Attendee email addresses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Include Teams meeting link' })
  @IsOptional()
  @IsBoolean()
  isOnlineMeeting?: boolean;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email addresses' })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body (HTML)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'Save as draft instead of sending' })
  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}

export class GetEventsDto {
  @ApiPropertyOptional({ description: 'Start of date range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End of date range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Maximum events to return', default: 50 })
  @IsOptional()
  limit?: number;
}

export class GetEmailsDto {
  @ApiPropertyOptional({ description: 'Folder: inbox, sent, drafts', default: 'inbox' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Maximum emails to return', default: 25 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Only unread emails' })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;
}

export interface MicrosoftGraphConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  organizer?: string;
  attendees: Array<{
    email: string;
    name?: string;
    response?: 'accepted' | 'declined' | 'tentative' | 'none';
  }>;
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  body?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface Email {
  id: string;
  subject: string;
  from: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  bodyPreview: string;
  body?: string;
  receivedAt: Date;
  isRead: boolean;
  importance: 'low' | 'normal' | 'high';
  hasAttachments: boolean;
}

export interface CallRecording {
  id: string;
  meetingId: string;
  startTime: Date;
  endTime: Date;
  recordingUrl?: string;
  transcriptUrl?: string;
  participants: string[];
}
