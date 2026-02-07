import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeetingRsvpStatus, MeetingSessionStatus, MeetingParticipant, MeetingSession } from '@prisma/client';

/**
 * Response source types for tracking how RSVP responses are received
 */
export type ResponseSource = 
  | 'email_ics'       // ICS file parsed from email
  | 'zoom_api'        // Zoom registrant/participant API
  | 'teams_api'       // Microsoft Graph API
  | 'google_api'      // Google Calendar API
  | 'attendee_webhook'// Attendee bot service webhook
  | 'manual';         // Manually updated via UI

/**
 * DTO for processing RSVP response
 */
export interface ProcessRsvpResponseDto {
  meetingSessionId: string;
  email: string;
  responseStatus: MeetingRsvpStatus;
  responseSource: ResponseSource;
  responseNote?: string;
  rawPayload?: any;
}

/**
 * DTO for cancellation request
 */
export interface CancellationRequestDto {
  meetingSessionId: string;
  requesterEmail: string;
  reason?: string;
  source: ResponseSource;
}

/**
 * MeetingInviteResponseService
 * 
 * Handles all meeting invite response tracking:
 * - RSVP responses (Accept/Decline/Tentative)
 * - Meeting cancellation requests from attendees
 * - Sending cancellation notifications
 * - Syncing response status with calendar platforms
 */
@Injectable()
export class MeetingInviteResponseService {
  private readonly logger = new Logger(MeetingInviteResponseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== RSVP RESPONSE PROCESSING ====================

  /**
   * Process an RSVP response from any source
   * Updates participant status and creates audit log
   */
  async processRsvpResponse(dto: ProcessRsvpResponseDto): Promise<{
    success: boolean;
    participant?: MeetingParticipant;
    isNewResponse: boolean;
    previousStatus?: MeetingRsvpStatus;
  }> {
    this.logger.log(`Processing RSVP response: ${dto.email} -> ${dto.responseStatus} for meeting ${dto.meetingSessionId}`);

    try {
      // Find or create the participant
      let participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingSessionId: dto.meetingSessionId,
          email: dto.email,
        },
      });

      const previousStatus = participant?.responseStatus as MeetingRsvpStatus | undefined;
      const isNewResponse = !previousStatus || previousStatus === 'PENDING';

      if (participant) {
        // Update existing participant
        participant = await this.prisma.meetingParticipant.update({
          where: { id: participant.id },
          data: {
            responseStatus: dto.responseStatus,
            responseAt: new Date(),
            responseNote: dto.responseNote,
          },
        });
      } else {
        // Create new participant with response
        participant = await this.prisma.meetingParticipant.create({
          data: {
            meetingSessionId: dto.meetingSessionId,
            name: dto.email.split('@')[0], // Use email prefix as name
            email: dto.email,
            role: 'attendee',
            responseStatus: dto.responseStatus,
            responseAt: new Date(),
            responseNote: dto.responseNote,
          },
        });
      }

      // Create response history record
      await this.prisma.meetingInviteResponse.create({
        data: {
          meetingSessionId: dto.meetingSessionId,
          participantEmail: dto.email,
          participantName: participant.name,
          newStatus: dto.responseStatus,
          previousStatus: previousStatus,
          responseSource: dto.responseSource,
          rawResponse: dto.rawPayload,
        },
      });

      // Emit event for real-time updates
      this.eventEmitter.emit('meeting.rsvp.received', {
        meetingSessionId: dto.meetingSessionId,
        participantId: participant.id,
        email: dto.email,
        responseStatus: dto.responseStatus,
        previousStatus,
        source: dto.responseSource,
      });

      // If declined, check if we need to notify meeting owner
      if (dto.responseStatus === 'DECLINED') {
        await this.handleDeclinedResponse(dto.meetingSessionId, participant);
      }

      this.logger.log(`RSVP processed: ${dto.email} is ${dto.responseStatus} for meeting ${dto.meetingSessionId}`);

      return {
        success: true,
        participant,
        isNewResponse,
        previousStatus,
      };
    } catch (error) {
      this.logger.error(`Failed to process RSVP response: ${error.message}`);
      return { success: false, isNewResponse: false };
    }
  }

  /**
   * Handle when an attendee declines the meeting
   */
  private async handleDeclinedResponse(meetingSessionId: string, participant: MeetingParticipant): Promise<void> {
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: { owner: true },
    });

    if (!meeting || !meeting.owner) return;

    // Emit event for notification
    this.eventEmitter.emit('meeting.attendee.declined', {
      meetingSessionId,
      meetingTitle: meeting.title,
      declinedBy: participant.email || participant.name,
      ownerEmail: meeting.owner.email,
      ownerName: meeting.owner.name,
    });
  }

  /**
   * Parse an ICS response email and extract RSVP status
   * Handles METHOD:REPLY calendar responses
   */
  parseIcsResponse(icsContent: string): {
    method: string;
    status?: MeetingRsvpStatus;
    email?: string;
    meetingUid?: string;
  } | null {
    try {
      const lines = icsContent.split(/\r?\n/);
      let method = '';
      let status: MeetingRsvpStatus | undefined;
      let email: string | undefined;
      let meetingUid: string | undefined;

      for (const line of lines) {
        if (line.startsWith('METHOD:')) {
          method = line.substring(7).trim();
        } else if (line.startsWith('UID:')) {
          meetingUid = line.substring(4).trim();
        } else if (line.includes('PARTSTAT=')) {
          const partstatMatch = line.match(/PARTSTAT=([A-Z_-]+)/);
          if (partstatMatch) {
            const partstat = partstatMatch[1];
            switch (partstat) {
              case 'ACCEPTED':
                status = 'ACCEPTED';
                break;
              case 'DECLINED':
                status = 'DECLINED';
                break;
              case 'TENTATIVE':
                status = 'TENTATIVE';
                break;
              case 'NEEDS-ACTION':
                status = 'PENDING';
                break;
            }
          }
          // Extract email from ATTENDEE line
          const mailtoMatch = line.match(/mailto:([^\s;]+)/i);
          if (mailtoMatch) {
            email = mailtoMatch[1].toLowerCase();
          }
        }
      }

      if (!method) return null;

      return { method, status, email, meetingUid };
    } catch (error) {
      this.logger.error(`Failed to parse ICS response: ${error.message}`);
      return null;
    }
  }

  /**
   * Process an inbound ICS calendar response email
   */
  async processInboundIcsResponse(
    meetingSessionId: string,
    icsContent: string,
  ): Promise<{ success: boolean; message: string }> {
    const parsed = this.parseIcsResponse(icsContent);

    if (!parsed) {
      return { success: false, message: 'Failed to parse ICS content' };
    }

    if (parsed.method !== 'REPLY') {
      return { success: false, message: `Unsupported ICS method: ${parsed.method}` };
    }

    if (!parsed.status || !parsed.email) {
      return { success: false, message: 'Missing status or email in ICS response' };
    }

    const result = await this.processRsvpResponse({
      meetingSessionId,
      email: parsed.email,
      responseStatus: parsed.status,
      responseSource: 'email_ics',
      rawPayload: { icsContent },
    });

    return {
      success: result.success,
      message: result.success
        ? `Processed ${parsed.email} response: ${parsed.status}`
        : 'Failed to process response',
    };
  }

  // ==================== MEETING CANCELLATION ====================

  /**
   * Process a cancellation request from an attendee
   */
  async processCancellationRequest(dto: CancellationRequestDto): Promise<{
    success: boolean;
    message: string;
    meetingCancelled: boolean;
  }> {
    this.logger.log(`Processing cancellation request from ${dto.requesterEmail} for meeting ${dto.meetingSessionId}`);

    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: dto.meetingSessionId },
      include: {
        owner: true,
        participants: true,
      },
    });

    if (!meeting) {
      return { success: false, message: 'Meeting not found', meetingCancelled: false };
    }

    // Check if requester is the host/owner
    const isHost = meeting.owner.email.toLowerCase() === dto.requesterEmail.toLowerCase();
    
    if (isHost) {
      // Host requesting cancellation - cancel the entire meeting
      return this.cancelMeeting(dto.meetingSessionId, dto.requesterEmail, dto.reason);
    } else {
      // Attendee requesting cancellation - mark as declined
      await this.processRsvpResponse({
        meetingSessionId: dto.meetingSessionId,
        email: dto.requesterEmail,
        responseStatus: 'DECLINED',
        responseSource: dto.source,
        responseNote: dto.reason || 'Requested cancellation',
      });

      return {
        success: true,
        message: 'Attendee marked as declined',
        meetingCancelled: false,
      };
    }
  }

  /**
   * Cancel a meeting and notify all participants
   */
  async cancelMeeting(
    meetingSessionId: string,
    cancelledBy: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string; meetingCancelled: boolean }> {
    this.logger.log(`Cancelling meeting ${meetingSessionId} by ${cancelledBy}`);

    try {
      const meeting = await this.prisma.meetingSession.findUnique({
        where: { id: meetingSessionId },
        include: {
          owner: true,
          participants: {
            where: {
              email: { not: null },
              responseStatus: { not: 'DECLINED' },
            },
          },
        },
      });

      if (!meeting) {
        return { success: false, message: 'Meeting not found', meetingCancelled: false };
      }

      // Update meeting status
      await this.prisma.meetingSession.update({
        where: { id: meetingSessionId },
        data: {
          status: 'CANCELLED' as MeetingSessionStatus,
          cancelledAt: new Date(),
          cancelledBy,
          cancellationReason: reason,
        },
      });

      // Send cancellation notifications to all participants
      const participantEmails = meeting.participants
        .filter(p => p.email)
        .map(p => p.email!);

      if (participantEmails.length > 0) {
        await this.sendCancellationNotifications(meeting, participantEmails, reason);
      }

      // Emit cancellation event
      this.eventEmitter.emit('meeting.cancelled', {
        meetingSessionId,
        meetingTitle: meeting.title,
        cancelledBy,
        reason,
        participantCount: participantEmails.length,
      });

      this.logger.log(`Meeting ${meetingSessionId} cancelled, notified ${participantEmails.length} participants`);

      return {
        success: true,
        message: `Meeting cancelled, ${participantEmails.length} participants notified`,
        meetingCancelled: true,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel meeting: ${error.message}`);
      return { success: false, message: error.message, meetingCancelled: false };
    }
  }

  /**
   * Send cancellation email notifications with ICS METHOD:CANCEL
   */
  async sendCancellationNotifications(
    meeting: MeetingSession & { owner: { name: string | null; email: string } },
    recipientEmails: string[],
    reason?: string,
  ): Promise<void> {
    const icsContent = this.generateCancellationIcs({
      title: meeting.title,
      startDate: meeting.scheduledStart,
      organizerName: meeting.owner.name || 'IRIS Sales CRM',
      organizerEmail: meeting.owner.email,
      attendees: recipientEmails,
      meetingUid: meeting.id,
    });

    try {
      await this.emailService.sendMeetingCancellation({
        to: recipientEmails,
        meetingTitle: meeting.title,
        meetingDate: meeting.scheduledStart,
        reason,
        organizerName: meeting.owner.name || 'IRIS Sales CRM',
        icsContent,
      });

      // Update participants with cancellation sent timestamp
      await this.prisma.meetingParticipant.updateMany({
        where: {
          meetingSessionId: meeting.id,
          email: { in: recipientEmails },
        },
        data: {
          cancellationSentAt: new Date(),
        },
      });

      // Mark meeting as notification sent
      await this.prisma.meetingSession.update({
        where: { id: meeting.id },
        data: { cancellationNotificationSent: true },
      });

      this.logger.log(`Cancellation notifications sent to ${recipientEmails.length} recipients`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation notifications: ${error.message}`);
    }
  }

  /**
   * Generate ICS content for meeting cancellation (METHOD:CANCEL)
   */
  generateCancellationIcs(params: {
    title: string;
    startDate: Date;
    organizerName: string;
    organizerEmail: string;
    attendees: string[];
    meetingUid: string;
  }): string {
    const { title, startDate, organizerName, organizerEmail, attendees, meetingUid } = params;
    const now = new Date();

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeICS = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    const attendeeLines = attendees
      .map(email => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${email}:mailto:${email}`)
      .join('\r\n');

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IRIS Sales CRM//Meeting Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:CANCEL',
      'X-WR-TIMEZONE:UTC',
      'BEGIN:VEVENT',
      `UID:${meetingUid}@iris-crm.com`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(startDate)}`,
      `SUMMARY:CANCELLED: ${escapeICS(title)}`,
      `DESCRIPTION:This meeting has been cancelled.`,
      `ORGANIZER;CN=${escapeICS(organizerName)}:mailto:${organizerEmail}`,
      attendeeLines,
      'STATUS:CANCELLED',
      'SEQUENCE:1',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(line => line !== '').join('\r\n');

    return icsLines;
  }

  // ==================== RESPONSE QUERIES ====================

  /**
   * Get all RSVP responses for a meeting
   */
  async getMeetingResponses(meetingSessionId: string): Promise<{
    summary: {
      accepted: number;
      declined: number;
      tentative: number;
      pending: number;
      noResponse: number;
    };
    participants: Array<{
      id: string;
      name: string;
      email: string | null;
      responseStatus: MeetingRsvpStatus;
      responseAt: Date | null;
    }>;
  }> {
    const participants = await this.prisma.meetingParticipant.findMany({
      where: { meetingSessionId },
      select: {
        id: true,
        name: true,
        email: true,
        responseStatus: true,
        responseAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = {
      accepted: 0,
      declined: 0,
      tentative: 0,
      pending: 0,
      noResponse: 0,
    };

    for (const p of participants) {
      switch (p.responseStatus) {
        case 'ACCEPTED': summary.accepted++; break;
        case 'DECLINED': summary.declined++; break;
        case 'TENTATIVE': summary.tentative++; break;
        case 'PENDING': summary.pending++; break;
        case 'NO_RESPONSE': summary.noResponse++; break;
      }
    }

    return { summary, participants };
  }

  /**
   * Get response history for a meeting (audit log)
   */
  async getResponseHistory(meetingSessionId: string) {
    return this.prisma.meetingInviteResponse.findMany({
      where: { meetingSessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resend invite to non-responsive participants
   */
  async resendInvitesToPending(meetingSessionId: string): Promise<{
    success: boolean;
    sentCount: number;
  }> {
    const meeting = await this.prisma.meetingSession.findUnique({
      where: { id: meetingSessionId },
      include: {
        owner: true,
        participants: {
          where: {
            responseStatus: { in: ['PENDING', 'NO_RESPONSE'] },
            email: { not: null },
          },
        },
      },
    });

    if (!meeting || meeting.participants.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const pendingEmails = meeting.participants.map(p => p.email!);

    // Send reminder invites
    await this.emailService.sendMeetingInvite({
      to: pendingEmails,
      subject: `Reminder: ${meeting.title}`,
      meetingTitle: meeting.title,
      meetingDate: meeting.scheduledStart,
      duration: meeting.duration || 60,
      joinUrl: meeting.meetingUrl || '',
      platform: meeting.platform as 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET',
      organizerName: meeting.owner.name || undefined,
      organizerEmail: meeting.owner.email,
    });

    // Update reminder sent timestamp
    await this.prisma.meetingParticipant.updateMany({
      where: {
        meetingSessionId,
        email: { in: pendingEmails },
      },
      data: {
        reminderSentAt: new Date(),
      },
    });

    return { success: true, sentCount: pendingEmails.length };
  }

  // ==================== PLATFORM SYNC ====================

  /**
   * Sync response status from Google Calendar API
   */
  async syncFromGoogleCalendar(
    meetingSessionId: string,
    attendees: Array<{ email: string; responseStatus: string }>,
  ): Promise<void> {
    for (const attendee of attendees) {
      let status: MeetingRsvpStatus;
      switch (attendee.responseStatus) {
        case 'accepted': status = 'ACCEPTED'; break;
        case 'declined': status = 'DECLINED'; break;
        case 'tentative': status = 'TENTATIVE'; break;
        case 'needsAction': status = 'PENDING'; break;
        default: status = 'NO_RESPONSE';
      }

      await this.processRsvpResponse({
        meetingSessionId,
        email: attendee.email,
        responseStatus: status,
        responseSource: 'google_api',
      });
    }
  }

  /**
   * Sync response status from Zoom registrants API
   */
  async syncFromZoomRegistrants(
    meetingSessionId: string,
    registrants: Array<{ email: string; status: string }>,
  ): Promise<void> {
    for (const registrant of registrants) {
      let status: MeetingRsvpStatus;
      switch (registrant.status) {
        case 'approved': status = 'ACCEPTED'; break;
        case 'denied': status = 'DECLINED'; break;
        case 'pending': status = 'PENDING'; break;
        default: status = 'NO_RESPONSE';
      }

      await this.processRsvpResponse({
        meetingSessionId,
        email: registrant.email,
        responseStatus: status,
        responseSource: 'zoom_api',
      });
    }
  }

  /**
   * Sync response status from Microsoft Teams/Graph API
   */
  async syncFromTeamsAttendees(
    meetingSessionId: string,
    attendees: Array<{ emailAddress: { address: string }; status: { response: string } }>,
  ): Promise<void> {
    for (const attendee of attendees) {
      let status: MeetingRsvpStatus;
      switch (attendee.status.response) {
        case 'accepted': status = 'ACCEPTED'; break;
        case 'declined': status = 'DECLINED'; break;
        case 'tentativelyAccepted': status = 'TENTATIVE'; break;
        case 'notResponded': status = 'PENDING'; break;
        default: status = 'NO_RESPONSE';
      }

      await this.processRsvpResponse({
        meetingSessionId,
        email: attendee.emailAddress.address,
        responseStatus: status,
        responseSource: 'teams_api',
      });
    }
  }
}
