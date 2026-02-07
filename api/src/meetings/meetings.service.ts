import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  ScheduleMeetingDto,
  UploadTranscriptDto,
  SearchMeetingsDto,
  MeetingSessionStatus,
} from './dto';
import { MeetingOrchestratorService } from './services/meeting-orchestrator.service';
import { ZoomService } from './services/zoom.service';
import { TeamsService } from './services/teams.service';
import { EmailService } from '../email/email.service';
import { SalesforceService } from '../salesforce/salesforce.service';
import { MeetingSession as PrismaMeetingSession } from '@prisma/client';

// Re-export Prisma type for use in controller
export type MeetingSession = PrismaMeetingSession;

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: MeetingOrchestratorService,
    private readonly emailService: EmailService,
    private readonly zoomService: ZoomService,
    private readonly teamsService: TeamsService,
    private readonly salesforceService: SalesforceService,
  ) { }

  /**
   * Schedule a meeting for recording
   */
  async scheduleMeeting(dto: ScheduleMeetingDto, userId: string): Promise<MeetingSession> {
    this.logger.log(`Scheduling meeting: ${dto.title}`);

    // Create meeting session in database
    const meeting = await this.createMeeting({
      title: dto.title,
      platform: dto.platform,
      meetingLink: dto.meetingLink,
      scheduledAt: dto.scheduledAt,
      opportunityId: dto.opportunityId,
      accountId: dto.accountId,
      leadId: dto.leadId,
    }, userId);

    // Schedule meeting via the orchestrator (handles platform-specific APIs)
    const platformMap: Record<string, 'zoom' | 'teams' | 'google_meet'> = {
      'ZOOM': 'zoom',
      'TEAMS': 'teams',
      'GOOGLE_MEET': 'google_meet',
    };
    const mappedPlatform = platformMap[dto.platform] || 'zoom';

    const scheduledMeeting = await this.orchestrator.scheduleMeeting({
      platform: mappedPlatform,
      title: dto.title,
      startTime: new Date(dto.scheduledAt),
      duration: dto.duration || 60,
      hostEmail: dto.hostEmail,
      hostUserId: dto.hostUserId,
      attendees: dto.attendeeEmails?.map(email => ({ email })),
      crmContext: {
        opportunityId: dto.opportunityId,
        accountId: dto.accountId,
        leadId: dto.leadId,
      },
    });

    // Update meeting with the join URL and external ID from the platform
    const updatedMeeting = await this.prisma.meetingSession.update({
      where: { id: meeting.id },
      data: {
        meetingUrl: scheduledMeeting.joinUrl,
        externalMeetingId: scheduledMeeting.externalId,
      },
    });

    this.logger.log(`Meeting scheduled with URL: ${scheduledMeeting.joinUrl}`);

    // Send email invites to attendees
    if (dto.attendeeEmails && dto.attendeeEmails.length > 0 && scheduledMeeting.joinUrl) {
      const emailResult = await this.emailService.sendMeetingInvite({
        to: dto.attendeeEmails,
        subject: `Meeting Invitation: ${dto.title}`,
        meetingTitle: dto.title,
        meetingDate: new Date(dto.scheduledAt),
        duration: dto.duration || 60,
        joinUrl: scheduledMeeting.joinUrl,
        platform: dto.platform as 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET',
        description: undefined,
        organizerEmail: dto.hostEmail,
      });

      if (emailResult.success) {
        this.logger.log(`Meeting invites sent to: ${dto.attendeeEmails.join(', ')}`);
        
        // Create participant records for tracking RSVP responses
        for (const email of dto.attendeeEmails) {
          await this.prisma.meetingParticipant.create({
            data: {
              meetingSessionId: meeting.id,
              name: email.split('@')[0], // Use email prefix as name
              email: email,
              role: 'attendee',
              responseStatus: 'PENDING',
              inviteSentAt: new Date(),
            },
          });
        }
        this.logger.log(`Created ${dto.attendeeEmails.length} participant records for RSVP tracking`);
      } else {
        this.logger.warn(`Failed to send meeting invites: ${emailResult.error}`);
      }
    }

    return updatedMeeting;
  }

  /**
   * Create a meeting session
   */
  async createMeeting(dto: CreateMeetingDto, userId: string): Promise<MeetingSession> {
    // Use Prisma to create the meeting session
    const meeting = await this.prisma.meetingSession.create({
      data: {
        title: dto.title,
        platform: dto.platform as any, // MeetingPlatform enum
        externalMeetingId: dto.externalMeetingId || null,
        meetingUrl: dto.meetingLink || null,
        scheduledStart: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
        description: dto.description || null,
        ownerId: userId,
        opportunityId: dto.opportunityId || null,
        accountId: dto.accountId || null,
        leadId: dto.leadId || null,
        status: 'SCHEDULED',
        recordingStatus: 'NOT_STARTED',
      },
    });

    this.logger.log(`Created meeting: ${meeting.id}`);
    return meeting;
  }

  /**
   * Create an ad-hoc meeting session for immediate bot join
   * This is used when someone provides just a meeting URL
   */
  async createAdHocMeeting(data: {
    title: string;
    platform: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | 'WEBEX' | 'OTHER';
    meetingUrl: string;
    externalMeetingId: string;
    password?: string;
    opportunityId?: string;
    accountId?: string;
    leadId?: string;
  }, userId: string): Promise<MeetingSession> {
    this.logger.log(`Creating ad-hoc meeting: ${data.title} (${data.platform})`);

    const meeting = await this.prisma.meetingSession.create({
      data: {
        title: data.title,
        platform: data.platform as any,
        externalMeetingId: data.externalMeetingId,
        meetingUrl: data.meetingUrl,
        scheduledStart: new Date(), // Now
        actualStart: new Date(), // Starting immediately
        description: `Ad-hoc meeting joined via URL`,
        ownerId: userId,
        opportunityId: data.opportunityId || null,
        accountId: data.accountId || null,
        leadId: data.leadId || null,
        status: 'IN_PROGRESS', // Already in progress
        recordingStatus: 'NOT_STARTED',
        botStatus: 'joining',
        metadata: {
          isAdHoc: true,
          joinedAt: new Date().toISOString(),
          password: data.password, // Store encrypted in production
        },
      },
    });

    this.logger.log(`Created ad-hoc meeting: ${meeting.id}`);
    return meeting;
  }

  /**
   * Get meetings with filters
   */
  async getMeetings(query: SearchMeetingsDto, userId: string, isAdmin?: boolean): Promise<MeetingSession[]> {
    this.logger.log(`Getting meetings with filters: ${JSON.stringify(query)}`);

    const where: any = {};
    if (userId && !isAdmin) {
      where.ownerId = userId;
    }

    if (query.opportunityId) where.opportunityId = query.opportunityId;
    if (query.accountId) where.accountId = query.accountId;
    if (query.leadId) where.leadId = query.leadId;
    if (query.status) where.status = query.status;
    if (query.platform) where.platform = query.platform;

    if (query.dateFrom || query.dateTo) {
      where.scheduledStart = {};
      if (query.dateFrom) where.scheduledStart.gte = new Date(query.dateFrom);
      if (query.dateTo) where.scheduledStart.lte = new Date(query.dateTo);
    }

    const meetings = await this.prisma.meetingSession.findMany({
      where,
      take: query.limit || 50,
      orderBy: { scheduledStart: 'desc' },
      include: {
        participants: true,
      },
    });

    // Auto-enrich meetings with CRM context based on participant emails
    const enrichedMeetings = await Promise.all(
      meetings.map(meeting => this.autoLinkCrmContext(meeting, userId))
    );

    return enrichedMeetings;
  }

  /**
   * Auto-link meeting to CRM entities based on participant emails
   * Respects user's crmDataSource setting (local or salesforce)
   */
  private async autoLinkCrmContext(meeting: any, userId: string): Promise<MeetingSession> {
    // Skip if already has CRM context
    if (meeting.leadId || meeting.accountId || meeting.opportunityId) {
      return meeting;
    }

    // Get participant emails (excluding internal users)
    const participantEmails = (meeting.participants || [])
      .filter((p: any) => p.email && !p.isInternal && !p.isBot)
      .map((p: any) => p.email.toLowerCase());

    if (participantEmails.length === 0) {
      // Try to extract email from meeting title (e.g., "Meeting with john@example.com")
      const emailMatch = meeting.title?.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        participantEmails.push(emailMatch[0].toLowerCase());
      }
    }

    if (participantEmails.length === 0) {
      return meeting;
    }

    try {
      // Get user's CRM data source preference
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });
      const crmDataSource = (user?.settings as any)?.crmDataSource || 'local';

      if (crmDataSource === 'salesforce') {
        // Search Salesforce for matching Lead/Contact
        return await this.autoLinkFromSalesforce(meeting, userId, participantEmails);
      } else {
        // Search local IRIS database
        return await this.autoLinkFromLocalDb(meeting, userId, participantEmails);
      }
    } catch (error) {
      this.logger.warn(`Failed to auto-link CRM context for meeting ${meeting.id}: ${error.message}`);
    }

    return meeting;
  }

  /**
   * Auto-link meeting from local IRIS database
   */
  private async autoLinkFromLocalDb(meeting: any, userId: string, participantEmails: string[]): Promise<MeetingSession> {
    // First try to match against Leads
    const matchedLead = await this.prisma.lead.findFirst({
      where: {
        ownerId: userId,
        email: { in: participantEmails, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (matchedLead) {
      const updated = await this.prisma.meetingSession.update({
        where: { id: meeting.id },
        data: { leadId: matchedLead.id },
      });
      this.logger.log(`Auto-linked meeting ${meeting.id} to local lead ${matchedLead.id}`);
      return { ...meeting, ...updated };
    }

    // Try to match against Contacts
    const matchedContact = await this.prisma.contact.findFirst({
      where: {
        ownerId: userId,
        email: { in: participantEmails, mode: 'insensitive' },
      },
      select: { id: true, accountId: true },
    });

    if (matchedContact) {
      const updated = await this.prisma.meetingSession.update({
        where: { id: meeting.id },
        data: { accountId: matchedContact.accountId || meeting.accountId },
      });

      await this.prisma.meetingParticipant.updateMany({
        where: {
          meetingSessionId: meeting.id,
          email: { in: participantEmails, mode: 'insensitive' },
        },
        data: { contactId: matchedContact.id },
      });

      this.logger.log(`Auto-linked meeting ${meeting.id} to local contact ${matchedContact.id}`);
      return { ...meeting, ...updated, contactId: matchedContact.id };
    }

    return meeting;
  }

  /**
   * Auto-link meeting from Salesforce CRM
   */
  private async autoLinkFromSalesforce(meeting: any, userId: string, participantEmails: string[]): Promise<MeetingSession> {
    // Build email list for SOQL IN clause
    const emailList = participantEmails.map(e => `'${e}'`).join(',');

    // Search for Lead in Salesforce
    try {
      const leadResult = await this.salesforceService.query(
        userId,
        `SELECT Id, Email FROM Lead WHERE Email IN (${emailList}) LIMIT 1`
      );

      if (leadResult.records?.length > 0) {
        const sfLeadId = leadResult.records[0].Id;
        // Store Salesforce Lead ID in metadata for mobile app
        const updated = await this.prisma.meetingSession.update({
          where: { id: meeting.id },
          data: {
            metadata: {
              ...(meeting.metadata || {}),
              salesforceLeadId: sfLeadId,
            },
          },
        });
        this.logger.log(`Auto-linked meeting ${meeting.id} to Salesforce lead ${sfLeadId}`);
        return { ...meeting, ...updated, salesforceLeadId: sfLeadId };
      }
    } catch (error) {
      this.logger.warn(`Salesforce Lead search failed: ${error.message}`);
    }

    // Search for Contact in Salesforce
    try {
      const contactResult = await this.salesforceService.query(
        userId,
        `SELECT Id, Email, AccountId FROM Contact WHERE Email IN (${emailList}) LIMIT 1`
      );

      if (contactResult.records?.length > 0) {
        const sfContact = contactResult.records[0];
        const updated = await this.prisma.meetingSession.update({
          where: { id: meeting.id },
          data: {
            metadata: {
              ...(meeting.metadata || {}),
              salesforceContactId: sfContact.Id,
              salesforceAccountId: sfContact.AccountId,
            },
          },
        });
        this.logger.log(`Auto-linked meeting ${meeting.id} to Salesforce contact ${sfContact.Id}`);
        return {
          ...meeting,
          ...updated,
          salesforceContactId: sfContact.Id,
          salesforceAccountId: sfContact.AccountId,
        };
      }
    } catch (error) {
      this.logger.warn(`Salesforce Contact search failed: ${error.message}`);
    }

    return meeting;
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(id: string, userId: string, isAdmin?: boolean): Promise<MeetingSession> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
      include: {
        opportunity: true,
        account: true,
        lead: true,
        participants: {
          include: { contact: true },
        },
        analysis: true,
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
        insights: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    // Auto-enrich with CRM context if not already linked
    return this.autoLinkCrmContext(meeting, userId);
  }

  /**
   * Get transcript for a meeting
   */
  async getTranscript(meetingId: string, userId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id: meetingId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
      include: {
        transcriptSegments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    return {
      raw: meeting.transcriptText,
      segments: meeting.transcriptSegments,
    };
  }

  /**
   * Get analysis for a meeting
   * Returns null if no analysis exists (instead of throwing 404)
   */
  async getAnalysis(meetingId: string, userId: string, isAdmin?: boolean): Promise<any> {
    // First verify the user owns this meeting (or is admin)
    const where: any = { id: meetingId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    const analysis = await this.prisma.meetingAnalysis.findUnique({
      where: { meetingSessionId: meetingId },
    });

    // Return null if no analysis exists - don't throw 404
    return analysis || null;
  }

  /**
   * Upload transcript manually
   */
  async uploadTranscript(meetingId: string, dto: UploadTranscriptDto, userId: string, isAdmin?: boolean): Promise<MeetingSession> {
    this.logger.log(`Uploading transcript for meeting: ${meetingId}`);

    const where: any = { id: meetingId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    // Update meeting with transcript
    const updated = await this.prisma.meetingSession.update({
      where: { id: meetingId },
      data: {
        transcriptText: dto.transcript,
        status: 'COMPLETED',
      },
    });

    // Create transcript segments if provided
    if (dto.segments && dto.segments.length > 0) {
      await this.prisma.transcriptSegment.createMany({
        data: dto.segments.map((seg) => ({
          meetingSessionId: meetingId,
          text: seg.text,
          startTime: seg.startTime,
          endTime: seg.endTime,
          duration: seg.endTime - seg.startTime,
          speakerName: seg.speakerLabel || 'Unknown',
        })),
      });
    }

    return updated;
  }

  /**
   * Get action items from a meeting
   */
  async getActionItems(meetingId: string, userId: string, isAdmin?: boolean): Promise<any[]> {
    const analysis = await this.getAnalysis(meetingId, userId, isAdmin);
    return analysis?.actionItems || [];
  }

  /**
   * Get insights from a meeting
   */
  async getInsights(meetingId: string, userId: string, isAdmin?: boolean): Promise<any[]> {
    // First verify the user owns this meeting (or is admin)
    const where: any = { id: meetingId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    return this.prisma.meetingInsight.findMany({
      where: { meetingSessionId: meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update meeting
   */
  async updateMeeting(id: string, dto: UpdateMeetingDto, userId: string, isAdmin?: boolean): Promise<MeetingSession> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({ where });
    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    return this.prisma.meetingSession.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status as any,
        actualStart: dto.startedAt ? new Date(dto.startedAt) : undefined,
        actualEnd: dto.endedAt ? new Date(dto.endedAt) : undefined,
        duration: dto.duration,
        recordingUrl: dto.recordingUrl,
      },
    });
  }

  /**
   * Delete meeting - removes from provider (Zoom/Teams) and database
   */
  async deleteMeeting(id: string, userId: string, isAdmin?: boolean): Promise<void> {
    this.logger.log(`Deleting meeting: ${id}`);

    // Verify ownership before deleting (or is admin)
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    // Get the external meeting ID - try stored value first, then parse from URL
    let externalMeetingId = meeting.externalMeetingId;

    if (!externalMeetingId && meeting.meetingUrl) {
      externalMeetingId = this.extractMeetingIdFromUrl(meeting.meetingUrl, meeting.platform);
      if (externalMeetingId) {
        this.logger.log(`Extracted meeting ID from URL: ${externalMeetingId}`);
      }
    }

    // Delete from provider first (if we have an external meeting ID)
    if (externalMeetingId) {
      try {
        if (meeting.platform === 'ZOOM') {
          await this.zoomService.deleteMeeting(externalMeetingId);
          this.logger.log(`Deleted Zoom meeting: ${externalMeetingId}`);
        } else if (meeting.platform === 'TEAMS') {
          // Teams requires organizer user ID
          await this.teamsService.deleteMeeting(externalMeetingId, meeting.ownerId);
          this.logger.log(`Deleted Teams meeting: ${externalMeetingId}`);
        } else {
          this.logger.warn(`Platform ${meeting.platform} deletion not supported yet`);
        }
      } catch (providerError: any) {
        // Log error but continue with database deletion
        // The meeting might already be deleted on provider side or credentials expired
        this.logger.warn(`Failed to delete meeting from provider ${meeting.platform}: ${providerError.message}`);
      }
    } else {
      this.logger.warn(`No external meeting ID found for meeting ${id}, skipping provider deletion`);
    }

    // Delete from database (cascade delete handles related records)
    await this.prisma.meetingSession.delete({
      where: { id },
    });

    this.logger.log(`Meeting ${id} deleted from database`);
  }

  /**
   * Extract meeting ID from a meeting URL
   */
  private extractMeetingIdFromUrl(url: string, platform: string): string | null {
    try {
      if (platform === 'ZOOM') {
        // Zoom URLs: https://zoom.us/j/1234567890 or https://us02web.zoom.us/j/1234567890?pwd=xxx
        const zoomMatch = url.match(/zoom\.us\/j\/(\d+)/i);
        if (zoomMatch) {
          return zoomMatch[1];
        }
      } else if (platform === 'TEAMS') {
        // Teams URLs contain the meeting ID in the path
        // Example: https://teams.microsoft.com/l/meetup-join/19%3ameeting_xxx
        const teamsMatch = url.match(/meetup-join\/([^\/\?]+)/i);
        if (teamsMatch) {
          return decodeURIComponent(teamsMatch[1]);
        }
      } else if (platform === 'GOOGLE_MEET') {
        // Google Meet URLs: https://meet.google.com/abc-defg-hij
        const meetMatch = url.match(/meet\.google\.com\/([a-z-]+)/i);
        if (meetMatch) {
          return meetMatch[1];
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to parse meeting URL: ${url}`);
    }
    return null;
  }

  /**
   * Handle meeting deleted webhook event
   * Called when a meeting is deleted/cancelled in the platform (e.g., Zoom)
   */
  async handleMeetingDeleted(
    externalMeetingId: string,
    platform: string,
  ): Promise<void> {
    this.logger.log(`Processing meeting deletion for ${platform} meeting: ${externalMeetingId}`);

    // Find the meeting session by external meeting ID
    const meetingSession = await this.prisma.meetingSession.findFirst({
      where: {
        OR: [
          { externalMeetingId: externalMeetingId },
          { externalMeetingId: externalMeetingId.toString() },
        ],
        platform: platform.toUpperCase() as any,
      },
    });

    if (!meetingSession) {
      this.logger.warn(`No meeting session found for ${platform} meeting ID: ${externalMeetingId}`);
      return;
    }

    // Delete the meeting session (cascade delete will handle related records)
    await this.prisma.meetingSession.delete({
      where: { id: meetingSession.id },
    });

    this.logger.log(`Deleted meeting session ${meetingSession.id} for ${platform} meeting ${externalMeetingId}`);
  }

  /**
   * Handle transcript webhook from meeting bot service
   */
  async handleTranscriptWebhook(payload: {
    meetingSessionId: string;
    transcript: string;
    segments?: any[];
    isFinal?: boolean;
  }): Promise<void> {
    this.logger.log(`Processing transcript webhook for: ${payload.meetingSessionId}`);

    // Update transcript
    await this.prisma.meetingSession.update({
      where: { id: payload.meetingSessionId },
      data: {
        transcriptText: payload.transcript,
        status: payload.isFinal ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    // Store segments
    if (payload.segments) {
      await this.prisma.transcriptSegment.createMany({
        data: payload.segments.map((seg) => ({
          meetingSessionId: payload.meetingSessionId,
          text: seg.text,
          startTime: seg.startTime,
          endTime: seg.endTime,
          duration: seg.endTime - seg.startTime,
          speakerName: seg.speakerName || seg.speakerLabel || 'Unknown',
        })),
      });
    }

    // If final, trigger analysis
    if (payload.isFinal) {
      this.logger.log(`Meeting ended, queuing analysis for: ${payload.meetingSessionId}`);
    }
  }

  /**
   * Handle status webhook from meeting bot service
   */
  async handleStatusWebhook(payload: {
    meetingSessionId: string;
    status: string;
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    participants?: any[];
  }): Promise<void> {
    this.logger.log(`Processing status webhook for: ${payload.meetingSessionId}`);

    await this.prisma.meetingSession.update({
      where: { id: payload.meetingSessionId },
      data: {
        status: payload.status as any,
        actualStart: payload.startedAt ? new Date(payload.startedAt) : undefined,
        actualEnd: payload.endedAt ? new Date(payload.endedAt) : undefined,
        duration: payload.duration,
      },
    });

    // Update participants
    if (payload.participants) {
      for (const participant of payload.participants) {
        // Check if participant exists
        const existing = await this.prisma.meetingParticipant.findFirst({
          where: {
            meetingSessionId: payload.meetingSessionId,
            email: participant.email,
          },
        });

        if (existing) {
          await this.prisma.meetingParticipant.update({
            where: { id: existing.id },
            data: {
              leftAt: participant.leftAt ? new Date(participant.leftAt) : undefined,
              speakingDuration: participant.speakingTime,
            },
          });
        } else {
          await this.prisma.meetingParticipant.create({
            data: {
              meetingSessionId: payload.meetingSessionId,
              name: participant.name,
              email: participant.email,
              joinedAt: participant.joinedAt ? new Date(participant.joinedAt) : undefined,
            },
          });
        }
      }
    }
  }

  /**
   * Handle Zoom recording ready webhook event
   * Called when a Zoom recording is completed and available for download
   */
  async handleRecordingReady(
    meetingId: string,
    data: {
      recording_files?: Array<{
        id: string;
        file_type: string;
        download_url: string;
        file_size?: number;
      }>;
      download_token?: string;
    },
  ): Promise<void> {
    this.logger.log(`Processing recording ready for Zoom meeting: ${meetingId}`);

    // Find the meeting session by external meeting ID
    const meetingSession = await this.prisma.meetingSession.findFirst({
      where: {
        OR: [
          { externalMeetingId: meetingId },
          { externalMeetingId: meetingId.toString() },
        ],
      },
    });

    if (!meetingSession) {
      this.logger.warn(`No meeting session found for Zoom meeting ID: ${meetingId}`);
      return;
    }

    // Update recording status
    await this.prisma.meetingSession.update({
      where: { id: meetingSession.id },
      data: {
        recordingStatus: 'COMPLETED',
        recordingUrl: data.recording_files?.find(f => f.file_type === 'MP4')?.download_url,
      },
    });

    // If there's a transcript file, trigger transcript processing
    const transcriptFile = data.recording_files?.find(f =>
      f.file_type === 'TRANSCRIPT' || f.file_type === 'VTT'
    );

    if (transcriptFile) {
      this.logger.log(`Transcript available for meeting ${meetingSession.id}, queueing for processing`);
      // The orchestrator handles downloading and processing the transcript
      await this.orchestrator.processMeeting(
        meetingSession.id,
        'zoom',
        meetingId,
        {
          opportunityId: meetingSession.opportunityId || undefined,
          accountId: meetingSession.accountId || undefined,
          leadId: meetingSession.leadId || undefined,
        },
      );
    }

    this.logger.log(`Recording ready processed for meeting: ${meetingSession.id}`);
  }

  /**
   * Search across meeting transcripts
   */
  async searchTranscripts(query: string, userId: string, filters?: SearchMeetingsDto, isAdmin?: boolean): Promise<MeetingSession[]> {
    this.logger.log(`Searching transcripts for: ${query}`);

    const where: any = {
      transcriptText: {
        contains: query,
        mode: 'insensitive',
      },
    };
    if (userId && !isAdmin) {
      where.ownerId = userId;
    }

    if (filters?.opportunityId) where.opportunityId = filters.opportunityId;
    if (filters?.accountId) where.accountId = filters.accountId;

    return this.prisma.meetingSession.findMany({
      where,
      take: 20,
      orderBy: { scheduledStart: 'desc' },
    });
  }

  /**
   * Get meetings for an opportunity
   */
  async getMeetingsForOpportunity(opportunityId: string, userId: string, isAdmin?: boolean): Promise<MeetingSession[]> {
    return this.getMeetings({ opportunityId }, userId, isAdmin);
  }

  /**
   * Get meetings for an account
   */
  async getMeetingsForAccount(accountId: string, userId: string, isAdmin?: boolean): Promise<MeetingSession[]> {
    return this.getMeetings({ accountId }, userId, isAdmin);
  }

  /**
   * Get audit logs for a meeting
   */
  async getAuditLogs(
    meetingId: string,
    userId: string,
    isAdmin?: boolean,
    options?: {
      action?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    logs: any[];
    total: number;
    hasMore: boolean;
  }> {
    // First verify the user owns this meeting (or is admin)
    const where: any = { id: meetingId };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    const meeting = await this.prisma.meetingSession.findFirst({
      where,
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting ${meetingId} not found`);
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Build where clause for audit logs
    const auditWhere: any = { meetingSessionId: meetingId };
    if (options?.action) {
      auditWhere.changeType = options.action.toUpperCase();
    }

    // Get total count
    const total = await this.prisma.crmAuditLog.count({
      where: auditWhere,
    });

    // Get logs
    const logs = await this.prisma.crmAuditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Transform logs to match frontend expected format
    const transformedLogs = logs.map(log => ({
      id: log.id,
      meetingId: log.meetingSessionId,
      meetingTitle: meeting.title,
      action: log.changeType.toLowerCase(),
      status: 'success', // Default status
      entityType: log.entityType.toLowerCase(),
      entityId: log.entityId,
      entityName: null,
      previousValue: log.previousValue ? JSON.parse(log.previousValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
      changeDescription: `${log.changeType} on ${log.entityType}`,
      userId: log.userId,
      userName: null,
      timestamp: log.createdAt.toISOString(),
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return {
      logs: transformedLogs,
      total,
      hasMore: offset + logs.length < total,
    };
  }
}
