import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { MeetingInviteResponseService } from './meeting-invite-response.service';
import { ZoomService } from './zoom.service';
import { TeamsService } from './teams.service';
import { GoogleMeetService } from './google-meet.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * MeetingResponseSyncService
 * 
 * Scheduled service for syncing meeting RSVP responses from calendar platforms.
 * Runs periodically to fetch updated attendee response statuses.
 */
@Injectable()
export class MeetingResponseSyncService {
  private readonly logger = new Logger(MeetingResponseSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteResponseService: MeetingInviteResponseService,
    private readonly zoomService: ZoomService,
    private readonly teamsService: TeamsService,
    private readonly googleMeetService: GoogleMeetService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sync responses for upcoming meetings every 5 minutes
   * Only syncs meetings scheduled within the next 7 days
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncUpcomingMeetingResponses() {
    this.logger.debug('Starting scheduled RSVP sync for upcoming meetings');

    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find upcoming meetings that need response sync
      const meetings = await this.prisma.meetingSession.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: now,
            lte: sevenDaysFromNow,
          },
          externalMeetingId: { not: null },
        },
        select: {
          id: true,
          platform: true,
          externalMeetingId: true,
          ownerId: true,
        },
        take: 50, // Limit to prevent overloading
      });

      if (meetings.length === 0) {
        return;
      }

      this.logger.log(`Syncing responses for ${meetings.length} upcoming meetings`);

      for (const meeting of meetings) {
        try {
          await this.syncMeetingResponses(meeting);
        } catch (error) {
          this.logger.warn(`Failed to sync responses for meeting ${meeting.id}: ${error.message}`);
        }
      }

      this.logger.debug('Completed scheduled RSVP sync');
    } catch (error) {
      this.logger.error(`Failed to run scheduled RSVP sync: ${error.message}`);
    }
  }

  /**
   * Sync responses for a specific meeting from its platform
   */
  private async syncMeetingResponses(meeting: {
    id: string;
    platform: string;
    externalMeetingId: string | null;
    ownerId: string;
  }): Promise<void> {
    if (!meeting.externalMeetingId) return;

    switch (meeting.platform) {
      case 'ZOOM':
        await this.syncZoomResponses(meeting.id, meeting.externalMeetingId);
        break;
      case 'TEAMS':
        await this.syncTeamsResponses(meeting.id, meeting.externalMeetingId, meeting.ownerId);
        break;
      case 'GOOGLE_MEET':
        await this.syncGoogleCalendarResponses(meeting.id, meeting.externalMeetingId);
        break;
      default:
        this.logger.debug(`Platform ${meeting.platform} does not support response sync`);
    }
  }

  /**
   * Sync responses from Zoom registrants API
   */
  private async syncZoomResponses(meetingSessionId: string, zoomMeetingId: string): Promise<void> {
    try {
      // Zoom registrants are available for webinar/registered meetings
      // For regular meetings, we track join/leave events via webhooks
      const participants = await this.zoomService.getMeetingParticipants(zoomMeetingId);
      
      if (participants.length > 0) {
        // Map Zoom participants to RSVP responses
        const registrants = participants.map(p => ({
          email: p.user_email,
          status: 'approved', // If they joined, they accepted
        }));

        await this.inviteResponseService.syncFromZoomRegistrants(meetingSessionId, registrants);
        this.logger.debug(`Synced ${registrants.length} Zoom participants for meeting ${meetingSessionId}`);
      }
    } catch (error) {
      // This may fail for meetings that haven't happened yet
      this.logger.debug(`Zoom sync skipped for ${meetingSessionId}: ${error.message}`);
    }
  }

  /**
   * Sync responses from Microsoft Teams Graph API
   */
  private async syncTeamsResponses(
    meetingSessionId: string,
    teamsMeetingId: string,
    organizerUserId: string,
  ): Promise<void> {
    try {
      const meeting = await this.teamsService.getMeeting(teamsMeetingId, organizerUserId);
      
      if (meeting.participants?.attendees && meeting.participants.attendees.length > 0) {
        const attendees = meeting.participants.attendees.map(a => ({
          emailAddress: { address: a.identity?.user?.displayName || a.upn || '' },
          status: { response: 'notResponded' }, // Teams API doesn't provide response status directly
        }));

        await this.inviteResponseService.syncFromTeamsAttendees(meetingSessionId, attendees);
        this.logger.debug(`Synced ${attendees.length} Teams attendees for meeting ${meetingSessionId}`);
      }
    } catch (error) {
      this.logger.debug(`Teams sync skipped for ${meetingSessionId}: ${error.message}`);
    }
  }

  /**
   * Sync responses from Google Calendar API
   */
  private async syncGoogleCalendarResponses(meetingSessionId: string, eventId: string): Promise<void> {
    try {
      // Note: This requires the event to have been created via Google Calendar API
      // with the meeting owner's calendar access
      const event = await this.googleMeetService.getCalendarEvent(eventId);
      
      if (event && event.attendees) {
        await this.inviteResponseService.syncFromGoogleCalendar(meetingSessionId, event.attendees);
        this.logger.debug(`Synced ${event.attendees.length} Google Calendar attendees for meeting ${meetingSessionId}`);
      }
    } catch (error) {
      this.logger.debug(`Google Calendar sync skipped for ${meetingSessionId}: ${error.message}`);
    }
  }

  /**
   * Check for meetings starting soon with pending RSVPs and send reminders
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkPendingRsvpsForUpcomingMeetings() {
    this.logger.debug('Checking for pending RSVPs on upcoming meetings');

    try {
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Find meetings starting in the next 24 hours with pending RSVPs
      const meetingsWithPendingRsvps = await this.prisma.meetingSession.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledStart: {
            gte: now,
            lte: twentyFourHoursFromNow,
          },
          participants: {
            some: {
              responseStatus: { in: ['PENDING', 'NO_RESPONSE'] },
              reminderSentAt: null,
            },
          },
        },
        include: {
          owner: { select: { email: true, name: true } },
          participants: {
            where: {
              responseStatus: { in: ['PENDING', 'NO_RESPONSE'] },
              reminderSentAt: null,
            },
          },
        },
      });

      for (const meeting of meetingsWithPendingRsvps) {
        const pendingCount = meeting.participants.length;
        
        // Emit event for notification system
        this.eventEmitter.emit('meeting.rsvp.pending_reminder', {
          meetingSessionId: meeting.id,
          meetingTitle: meeting.title,
          scheduledStart: meeting.scheduledStart,
          pendingCount,
          ownerEmail: meeting.owner.email,
        });

        this.logger.log(`Meeting ${meeting.id} has ${pendingCount} pending RSVPs before ${meeting.scheduledStart}`);
      }
    } catch (error) {
      this.logger.error(`Failed to check pending RSVPs: ${error.message}`);
    }
  }

  /**
   * Clean up old response history records (older than 90 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldResponseHistory() {
    this.logger.debug('Cleaning up old meeting response history');

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await this.prisma.meetingInviteResponse.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old meeting response history records`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old response history: ${error.message}`);
    }
  }
}
