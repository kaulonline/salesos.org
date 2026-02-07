import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsArray, IsEmail } from 'class-validator';

export enum MeetingPlatform {
  ZOOM = 'ZOOM',
  TEAMS = 'TEAMS',
  GOOGLE_MEET = 'GOOGLE_MEET',
  WEBEX = 'WEBEX',
  OTHER = 'OTHER',
}

export enum MeetingSessionStatus {
  SCHEDULED = 'SCHEDULED',
  JOINING = 'JOINING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

// RSVP response status for meeting invites
export enum MeetingRsvpStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE',
  NO_RESPONSE = 'NO_RESPONSE',
}

export class CreateMeetingDto {
  @IsString()
  title: string;

  @IsEnum(MeetingPlatform)
  platform: MeetingPlatform;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  externalMeetingId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ScheduleMeetingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsEnum(MeetingPlatform)
  platform: MeetingPlatform;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // Duration in minutes

  @IsOptional()
  @IsString()
  hostEmail?: string; // Required for Zoom

  @IsOptional()
  @IsString()
  hostUserId?: string; // Required for Teams

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendeeEmails?: string[]; // Email addresses of attendees to invite
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(MeetingSessionStatus)
  status?: MeetingSessionStatus;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @IsOptional()
  @IsString()
  processingError?: string;
}

export class UploadTranscriptDto {
  @IsString()
  transcript: string;

  @IsOptional()
  segments?: TranscriptSegmentDto[];
}

export class TranscriptSegmentDto {
  @IsString()
  text: string;

  @IsNumber()
  startTime: number;

  @IsNumber()
  endTime: number;

  @IsOptional()
  @IsString()
  speakerLabel?: string;

  @IsOptional()
  @IsNumber()
  confidence?: number;
}

export class SearchMeetingsDto {
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsEnum(MeetingSessionStatus)
  status?: MeetingSessionStatus;

  @IsOptional()
  @IsEnum(MeetingPlatform)
  platform?: MeetingPlatform;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class MeetingAnalysisResultDto {
  executiveSummary: string;
  detailedSummary?: string;
  keyPoints: string[];
  actionItems: ActionItemDto[];
  decisions: string[];
  questions: string[];
  concerns: string[];
  buyingSignals: BuyingSignalDto[];
  objections: ObjectionDto[];
  competitors: string[];
  pricingDiscussion?: string;
  budgetMentioned?: number;
  timelineMentioned?: string;
  nextSteps: string[];
  recommendedActions: string[];
  overallSentiment: string;
  customerSentiment?: string;
  engagementScore: number;
  stageRecommendation?: string;
  probabilityChange?: number;
  riskLevel?: string;
}

export class ActionItemDto {
  text: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
}

export class BuyingSignalDto {
  signal: string;
  confidence: number;
  context: string;
}

export class ObjectionDto {
  objection: string;
  response?: string;
  resolved?: boolean;
}

// ==================== AD-HOC MEETING JOIN ====================

export class JoinAdHocMeetingDto {
  @IsString()
  meetingUrl: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  botName?: string; // Defaults to "IRIS Agent"

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ParsedMeetingInfo {
  platform: MeetingPlatform;
  meetingId: string;
  password?: string;
  joinUrl: string;
  title?: string;
}

// ==================== RSVP & RESPONSE TRACKING ====================

export class UpdateParticipantResponseDto {
  @IsEmail()
  email: string;

  @IsEnum(MeetingRsvpStatus)
  responseStatus: MeetingRsvpStatus;

  @IsOptional()
  @IsString()
  responseNote?: string;
}

export class ProcessIcsResponseDto {
  @IsString()
  icsContent: string;
}

export class CancelMeetingDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[]; // Optional: only notify specific participants
}

export class ResendInvitesDto {
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[]; // Optional: only resend to specific participants
}

export class MeetingResponseSummaryDto {
  accepted: number;
  declined: number;
  tentative: number;
  pending: number;
  noResponse: number;
}

export class ParticipantResponseDto {
  id: string;
  name: string;
  email: string | null;
  responseStatus: MeetingRsvpStatus;
  responseAt: Date | null;
  inviteSentAt?: Date | null;
  reminderSentAt?: Date | null;
}

export class MeetingResponsesDto {
  summary: MeetingResponseSummaryDto;
  participants: ParticipantResponseDto[];
}

// Re-export pending action DTOs
export * from './pending-action.dto';

// Re-export meeting summary DTOs
export * from './meeting-summary.dto';
