/**
 * Google Meet Integration Service
 * 
 * Handles Google Meet management, recording retrieval, and transcript processing
 * Uses Google Meet REST API with Google Workspace service account
 * 
 * @see https://developers.google.com/meet/api/guides/overview
 * @see https://developers.google.com/workspace/meet/api/reference/rest
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GoogleMeetSpace {
  name: string; // format: spaces/{spaceId}
  meetingUri: string;
  meetingCode: string;
  config?: GoogleMeetConfig;
}

export interface GoogleMeetConfig {
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  entryPointAccess: 'ALL' | 'CREATOR_APP_ONLY';
}

export interface GoogleMeetConference {
  name: string; // format: conferenceRecords/{conferenceId}
  startTime: string;
  endTime?: string;
  expireTime: string;
  space: string; // reference to space name
}

export interface GoogleMeetParticipant {
  name: string; // format: conferenceRecords/{conferenceId}/participants/{participantId}
  earliestStartTime: string;
  latestEndTime?: string;
  signedinUser?: {
    user: string;
    displayName: string;
  };
  anonymousUser?: {
    displayName: string;
  };
  phoneUser?: {
    displayName: string;
  };
}

export interface GoogleMeetParticipantSession {
  name: string;
  startTime: string;
  endTime?: string;
}

export interface GoogleMeetRecording {
  name: string; // format: conferenceRecords/{conferenceId}/recordings/{recordingId}
  state: 'RECORDING_STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime: string;
  endTime?: string;
  driveDestination?: {
    file: string; // Google Drive file resource name
    exportUri: string;
  };
}

export interface GoogleMeetTranscript {
  name: string; // format: conferenceRecords/{conferenceId}/transcripts/{transcriptId}
  state: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime: string;
  endTime?: string;
  docsDestination?: {
    document: string;
    exportUri: string;
  };
}

export interface GoogleMeetTranscriptEntry {
  name: string;
  participant: string;
  text: string;
  languageCode: string;
  startTime: string;
  endTime: string;
}

export interface GoogleCalendarEvent {
  id: string;
  status: string;
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  conferenceData?: {
    conferenceId: string;
    conferenceSolution: {
      key: { type: string };
      name: string;
    };
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

@Injectable()
export class GoogleMeetService implements OnModuleInit {
  private readonly logger = new Logger(GoogleMeetService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private readonly meetApiUrl = 'https://meet.googleapis.com/v2';
  private readonly calendarApiUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    const serviceAccountKey = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
    const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');

    if (!serviceAccountKey || !clientEmail) {
      this.logger.warn('Google credentials not configured - Google Meet integration will be disabled');
    } else {
      this.logger.log('Google Meet integration configured');
      await this.getAccessToken();
    }
  }

  /**
   * Get OAuth access token using service account JWT
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const serviceAccountKey = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
    const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY');

    if (!serviceAccountKey && (!clientEmail || !privateKey)) {
      throw new Error('Google credentials not configured');
    }

    try {
      // Create JWT for service account authentication
      const jwt = await this.createServiceAccountJWT(
        clientEmail!,
        privateKey!.replace(/\\n/g, '\n'),
      );

      // Exchange JWT for access token
      const response = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      this.logger.log('Google access token refreshed');
      return this.accessToken!;
    } catch (error) {
      this.logger.error('Failed to get Google access token', error);
      throw error;
    }
  }

  /**
   * Create JWT for service account authentication
   */
  private async createServiceAccountJWT(clientEmail: string, privateKey: string): Promise<string> {
    const crypto = require('crypto');
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      sub: clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // 1 hour expiry
      scope: [
        'https://www.googleapis.com/auth/meetings.space.readonly',
        'https://www.googleapis.com/auth/meetings.space.created',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.readonly',
      ].join(' '),
    };

    const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${base64Header}.${base64Payload}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Create a new Google Meet space
   */
  async createMeetSpace(config?: GoogleMeetConfig): Promise<GoogleMeetSpace> {
    const token = await this.getAccessToken();

    const spaceData = config ? { config } : {};

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.meetApiUrl}/spaces`,
          spaceData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Created Google Meet space: ${response.data.name}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Google Meet space', error);
      throw error;
    }
  }

  /**
   * Get a meeting space by name
   */
  async getMeetSpace(spaceName: string): Promise<GoogleMeetSpace> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(`${this.meetApiUrl}/${spaceName}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    );

    return response.data;
  }

  /**
   * Get conference records for a space
   */
  async getConferenceRecords(spaceFilter?: string): Promise<GoogleMeetConference[]> {
    const token = await this.getAccessToken();

    const params: any = {};
    if (spaceFilter) {
      params.filter = `space.name="${spaceFilter}"`;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.meetApiUrl}/conferenceRecords`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params,
        }),
      );

      return response.data.conferenceRecords || [];
    } catch (error) {
      this.logger.error('Failed to get conference records', error);
      return [];
    }
  }

  /**
   * Get a specific conference record
   */
  async getConferenceRecord(conferenceName: string): Promise<GoogleMeetConference> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(`${this.meetApiUrl}/${conferenceName}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    );

    return response.data;
  }

  /**
   * Get participants for a conference
   */
  async getParticipants(conferenceName: string): Promise<GoogleMeetParticipant[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.meetApiUrl}/${conferenceName}/participants`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      );

      return response.data.participants || [];
    } catch (error) {
      this.logger.error(`Failed to get participants for ${conferenceName}`, error);
      return [];
    }
  }

  /**
   * Get recordings for a conference
   */
  async getRecordings(conferenceName: string): Promise<GoogleMeetRecording[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.meetApiUrl}/${conferenceName}/recordings`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      );

      return response.data.recordings || [];
    } catch (error) {
      this.logger.error(`Failed to get recordings for ${conferenceName}`, error);
      return [];
    }
  }

  /**
   * Get transcripts for a conference
   */
  async getTranscripts(conferenceName: string): Promise<GoogleMeetTranscript[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.meetApiUrl}/${conferenceName}/transcripts`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      );

      return response.data.transcripts || [];
    } catch (error) {
      this.logger.error(`Failed to get transcripts for ${conferenceName}`, error);
      return [];
    }
  }

  /**
   * Get transcript entries
   */
  async getTranscriptEntries(transcriptName: string): Promise<GoogleMeetTranscriptEntry[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.meetApiUrl}/${transcriptName}/entries`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      );

      return response.data.transcriptEntries || [];
    } catch (error) {
      this.logger.error(`Failed to get transcript entries for ${transcriptName}`, error);
      return [];
    }
  }

  /**
   * Download recording from Google Drive
   */
  async downloadRecording(recording: GoogleMeetRecording): Promise<Buffer | null> {
    if (!recording.driveDestination?.exportUri) {
      this.logger.warn('Recording does not have a Drive destination');
      return null;
    }

    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(recording.driveDestination.exportUri, {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Failed to download recording', error);
      throw error;
    }
  }

  /**
   * Create a calendar event with Google Meet
   */
  async createCalendarEventWithMeet(params: {
    summary: string;
    startDateTime: Date;
    endDateTime: Date;
    attendees?: Array<{ email: string }>;
    calendarId?: string;
  }): Promise<GoogleCalendarEvent> {
    const token = await this.getAccessToken();
    const calendarId = params.calendarId || 'primary';

    const eventData = {
      summary: params.summary,
      start: {
        dateTime: params.startDateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: params.endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: params.attendees || [],
      conferenceData: {
        createRequest: {
          requestId: `iris-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.calendarApiUrl}/calendars/${calendarId}/events`,
          eventData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params: {
              conferenceDataVersion: 1,
              sendUpdates: 'all',
            },
          },
        ),
      );

      this.logger.log(`Created Calendar event with Meet: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create calendar event with Meet', error);
      throw error;
    }
  }

  /**
   * Get upcoming calendar events with Google Meet
   */
  async getUpcomingMeetEvents(params: {
    calendarId?: string;
    maxResults?: number;
  }): Promise<GoogleCalendarEvent[]> {
    const token = await this.getAccessToken();
    const calendarId = params.calendarId || 'primary';

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.calendarApiUrl}/calendars/${calendarId}/events`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
              timeMin: new Date().toISOString(),
              maxResults: params.maxResults || 20,
              singleEvents: true,
              orderBy: 'startTime',
            },
          },
        ),
      );

      // Filter events with Google Meet
      const events = response.data.items || [];
      return events.filter((e: GoogleCalendarEvent) => 
        e.conferenceData?.conferenceSolution?.key?.type === 'hangoutsMeet'
      );
    } catch (error) {
      this.logger.error('Failed to get upcoming events', error);
      return [];
    }
  }

  /**
   * Extract meeting code from Meet URL
   */
  extractMeetingCode(meetUrl: string): string | null {
    // Format: https://meet.google.com/xxx-xxxx-xxx
    const match = meetUrl.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match ? match[1] : null;
  }

  /**
   * Parse transcript entries to structured format
   */
  parseTranscriptEntries(entries: GoogleMeetTranscriptEntry[]): Array<{
    text: string;
    speakerName: string;
    startTime: number;
    endTime: number;
  }> {
    return entries.map(entry => ({
      text: entry.text,
      speakerName: entry.participant, // Will need to resolve to actual name
      startTime: this.isoToSeconds(entry.startTime),
      endTime: this.isoToSeconds(entry.endTime),
    }));
  }

  /**
   * Convert ISO timestamp to seconds
   */
  private isoToSeconds(isoTime: string): number {
    return new Date(isoTime).getTime() / 1000;
  }

  /**
   * Subscribe to Google Workspace events (for real-time notifications)
   * Note: Requires Google Workspace Events API setup
   */
  async createWorkspaceSubscription(params: {
    targetResource: string; // format: //meet.googleapis.com/spaces/{spaceId}
    eventTypes: string[];
    notificationEndpoint: string;
    expirationTime: Date;
  }): Promise<{ name: string; expireTime: string }> {
    const token = await this.getAccessToken();

    const subscriptionData = {
      targetResource: params.targetResource,
      eventTypes: params.eventTypes,
      payloadOptions: {
        includeResource: true,
      },
      notificationEndpoint: {
        pubsubTopic: params.notificationEndpoint,
      },
      ttl: `${Math.floor((params.expirationTime.getTime() - Date.now()) / 1000)}s`,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://workspaceevents.googleapis.com/v1/subscriptions',
          subscriptionData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Created Google Workspace subscription: ${response.data.name}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Workspace subscription', error);
      throw error;
    }
  }

  /**
   * Handle Google Workspace event notifications
   */
  handleWorkspaceEvent(payload: any): {
    event: string;
    conferenceId?: string;
    data?: any;
  } {
    this.logger.log(`Received Google Workspace event: ${payload.eventType}`);

    // Extract conference ID from the payload
    const conferenceIdMatch = payload.targetResource?.match(/conferenceRecords\/([^/]+)/);
    const conferenceId = conferenceIdMatch ? conferenceIdMatch[1] : undefined;

    switch (payload.eventType) {
      case 'google.workspace.meet.conference.v2.started':
        return {
          event: 'meeting_started',
          conferenceId,
          data: payload.resource,
        };

      case 'google.workspace.meet.conference.v2.ended':
        return {
          event: 'meeting_ended',
          conferenceId,
          data: payload.resource,
        };

      case 'google.workspace.meet.participant.v2.joined':
        return {
          event: 'participant_joined',
          conferenceId,
          data: payload.resource,
        };

      case 'google.workspace.meet.participant.v2.left':
        return {
          event: 'participant_left',
          conferenceId,
          data: payload.resource,
        };

      case 'google.workspace.meet.recording.v2.fileGenerated':
        return {
          event: 'recording_ready',
          conferenceId,
          data: payload.resource,
        };

      case 'google.workspace.meet.transcript.v2.fileGenerated':
        return {
          event: 'transcript_ready',
          conferenceId,
          data: payload.resource,
        };

      default:
        this.logger.debug(`Unhandled Google Workspace event: ${payload.eventType}`);
        return { event: payload.eventType };
    }
  }

  /**
   * Get a calendar event by ID to check attendee responses
   */
  async getCalendarEvent(eventId: string, calendarId: string = 'primary'): Promise<GoogleCalendarEvent | null> {
    try {
      const token = await this.getAccessToken();

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.calendarApiUrl}/calendars/${calendarId}/events/${eventId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.debug(`Calendar event not found: ${eventId}`);
        return null;
      }
      this.logger.error(`Failed to get calendar event: ${error.message}`);
      throw error;
    }
  }
}
