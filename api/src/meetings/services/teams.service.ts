/**
 * Microsoft Teams Integration Service
 * 
 * Handles Teams meeting management, recording retrieval, and transcript processing
 * Uses Microsoft Graph API with application permissions
 * 
 * @see https://learn.microsoft.com/en-us/graph/api/resources/onlinemeeting
 * @see https://learn.microsoft.com/en-us/graph/api/resources/calltranscript
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface TeamsMeeting {
  id: string;
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  subject: string;
  joinWebUrl: string;
  joinMeetingIdSettings?: {
    joinMeetingId: string;
    passcode: string;
  };
  videoTeleconferenceId?: string;
  participants: TeamsParticipants;
  chatInfo?: {
    threadId: string;
    messageId: string;
  };
  allowRecording: boolean;
  allowTranscription: boolean;
  recordAutomatically: boolean;
}

export interface TeamsParticipants {
  organizer: TeamsParticipant;
  attendees: TeamsParticipant[];
}

export interface TeamsParticipant {
  identity: {
    user?: {
      id: string;
      displayName: string;
      tenantId?: string;
    };
    guest?: {
      id: string;
      displayName: string;
    };
  };
  upn?: string;
  role: 'presenter' | 'attendee' | 'producer' | 'coorganizer';
}

export interface TeamsRecording {
  id: string;
  meetingId: string;
  createdDateTime: string;
  recordingContentUrl: string;
  content?: Buffer;
}

export interface TeamsTranscript {
  id: string;
  meetingId: string;
  createdDateTime: string;
  transcriptContentUrl: string;
  content?: TeamsTranscriptContent[];
}

export interface TeamsTranscriptContent {
  text: string;
  speakerName: string;
  speakerId?: string;
  timestamp: string;
  startTime: number;
  endTime: number;
}

export interface TeamsCallRecord {
  id: string;
  type: 'peerToPeer' | 'groupCall';
  startDateTime: string;
  endDateTime: string;
  joinWebUrl?: string;
  organizer?: {
    user: {
      id: string;
      displayName: string;
    };
  };
  participants: TeamsCallParticipant[];
}

export interface TeamsCallParticipant {
  id: string;
  identity: {
    user?: {
      id: string;
      displayName: string;
    };
  };
  caller?: {
    id: string;
    displayName: string;
  };
  callee?: {
    id: string;
    displayName: string;
  };
}

export interface TeamsWebhookPayload {
  value: Array<{
    subscriptionId: string;
    changeType: 'created' | 'updated' | 'deleted';
    resource: string;
    resourceData: {
      '@odata.type': string;
      '@odata.id': string;
      id: string;
    };
    clientState?: string;
  }>;
}

@Injectable()
export class TeamsService implements OnModuleInit {
  private readonly logger = new Logger(TeamsService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';
  private readonly graphBetaUrl = 'https://graph.microsoft.com/beta';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    const tenantId = this.configService.get<string>('TEAMS_TENANT_ID');
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      this.logger.warn('Teams credentials not configured - Teams integration will be disabled');
    } else {
      this.logger.log('Teams integration configured');
      await this.getAccessToken();
    }
  }

  /**
   * Get OAuth access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tenantId = this.configService.get<string>('TEAMS_TENANT_ID');
    const clientId = this.configService.get<string>('TEAMS_CLIENT_ID');
    const clientSecret = this.configService.get<string>('TEAMS_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Teams credentials not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://graph.microsoft.com/.default',
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      this.logger.log('Teams access token refreshed');
      return this.accessToken!;
    } catch (error) {
      this.logger.error('Failed to get Teams access token', error);
      throw error;
    }
  }

  /**
   * Create a new Teams meeting
   */
  async createMeeting(params: {
    subject: string;
    startDateTime: Date;
    endDateTime: Date;
    organizerUserId: string;
    attendees?: Array<{ email: string; displayName?: string }>;
    enableRecording?: boolean;
    enableTranscription?: boolean;
    recordAutomatically?: boolean;
  }): Promise<TeamsMeeting> {
    const token = await this.getAccessToken();

    const meetingData = {
      subject: params.subject,
      startDateTime: params.startDateTime.toISOString(),
      endDateTime: params.endDateTime.toISOString(),
      allowRecording: params.enableRecording !== false,
      allowTranscription: params.enableTranscription !== false,
      recordAutomatically: params.recordAutomatically ?? true, // Auto-record by default
      participants: {
        attendees: params.attendees?.map(a => ({
          identity: {
            user: {
              displayName: a.displayName || a.email,
            },
          },
          upn: a.email,
          role: 'attendee',
        })) || [],
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.graphUrl}/users/${params.organizerUserId}/onlineMeetings`,
          meetingData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Created Teams meeting: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Teams meeting', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string, organizerUserId: string): Promise<TeamsMeeting> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        },
      ),
    );

    return response.data;
  }

  /**
   * Get meeting by join URL
   */
  async getMeetingByJoinUrl(joinUrl: string, userId: string): Promise<TeamsMeeting | null> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.graphUrl}/users/${userId}/onlineMeetings`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
              $filter: `joinWebUrl eq '${joinUrl}'`,
            },
          },
        ),
      );

      const meetings = response.data.value || [];
      return meetings.length > 0 ? meetings[0] : null;
    } catch (error) {
      this.logger.error('Failed to get meeting by join URL', error);
      return null;
    }
  }

  /**
   * Get meeting transcripts
   */
  async getMeetingTranscripts(meetingId: string, organizerUserId: string): Promise<TeamsTranscript[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}/transcripts`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          },
        ),
      );

      return response.data.value || [];
    } catch (error) {
      this.logger.error(`Failed to get transcripts for meeting ${meetingId}`, error);
      return [];
    }
  }

  /**
   * Download transcript content
   */
  async downloadTranscriptContent(
    meetingId: string,
    transcriptId: string,
    organizerUserId: string,
    format: 'text/vtt' | 'application/json' = 'text/vtt',
  ): Promise<string> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': format,
          },
        },
      ),
    );

    return response.data;
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(meetingId: string, organizerUserId: string): Promise<TeamsRecording[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}/recordings`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          },
        ),
      );

      return response.data.value || [];
    } catch (error) {
      this.logger.error(`Failed to get recordings for meeting ${meetingId}`, error);
      return [];
    }
  }

  /**
   * Download recording content
   */
  async downloadRecordingContent(
    meetingId: string,
    recordingId: string,
    organizerUserId: string,
  ): Promise<Buffer> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}/recordings/${recordingId}/content`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer',
        },
      ),
    );

    return Buffer.from(response.data);
  }

  /**
   * Get call records for a user (includes meeting history)
   */
  async getCallRecords(
    fromDate: Date,
    toDate: Date,
  ): Promise<TeamsCallRecord[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.graphUrl}/communications/callRecords`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
              $filter: `startDateTime ge ${fromDate.toISOString()} and endDateTime le ${toDate.toISOString()}`,
            },
          },
        ),
      );

      return response.data.value || [];
    } catch (error) {
      this.logger.error('Failed to get call records', error);
      return [];
    }
  }

  /**
   * Parse VTT transcript to structured content
   */
  parseVttTranscript(vttContent: string): TeamsTranscriptContent[] {
    const segments: TeamsTranscriptContent[] = [];
    const lines = vttContent.split('\n');
    
    let currentSegment: Partial<TeamsTranscriptContent> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
        continue;
      }

      // Parse timestamp line
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        currentSegment.startTime = this.vttTimeToSeconds(timestampMatch[1]);
        currentSegment.endTime = this.vttTimeToSeconds(timestampMatch[2]);
        currentSegment.timestamp = timestampMatch[1];
        continue;
      }

      // Parse speaker and text
      if (currentSegment.startTime !== undefined && line) {
        // Teams VTT format: <v Speaker Name>Text</v>
        const speakerMatch = line.match(/<v\s+([^>]+)>(.+)<\/v>/);
        if (speakerMatch) {
          currentSegment.speakerName = speakerMatch[1].trim();
          currentSegment.text = speakerMatch[2].trim();
        } else {
          // Alternative format: "Speaker Name: Text"
          const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
          if (colonMatch) {
            currentSegment.speakerName = colonMatch[1].trim();
            currentSegment.text = colonMatch[2].trim();
          } else {
            currentSegment.text = line;
            currentSegment.speakerName = 'Unknown';
          }
        }

        if (currentSegment.text) {
          segments.push(currentSegment as TeamsTranscriptContent);
          currentSegment = {};
        }
      }
    }

    return segments;
  }

  /**
   * Convert VTT timestamp to seconds
   */
  private vttTimeToSeconds(vttTime: string): number {
    const parts = vttTime.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Create a webhook subscription for meeting events
   */
  async createSubscription(params: {
    resource: string;
    changeTypes: ('created' | 'updated' | 'deleted')[];
    notificationUrl: string;
    expirationDateTime: Date;
    clientState?: string;
  }): Promise<{ id: string; expirationDateTime: string }> {
    const token = await this.getAccessToken();

    const subscriptionData = {
      changeType: params.changeTypes.join(','),
      notificationUrl: params.notificationUrl,
      resource: params.resource,
      expirationDateTime: params.expirationDateTime.toISOString(),
      clientState: params.clientState || 'iris-crm-webhook',
    };

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.graphUrl}/subscriptions`,
        subscriptionData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    this.logger.log(`Created Teams subscription: ${response.data.id}`);
    return response.data;
  }

  /**
   * Handle webhook notifications
   */
  async handleWebhook(payload: TeamsWebhookPayload): Promise<{
    event: string;
    meetingId?: string;
    data?: any;
  }[]> {
    const results: { event: string; meetingId?: string; data?: any }[] = [];

    for (const notification of payload.value) {
      this.logger.log(`Received Teams webhook: ${notification.changeType} on ${notification.resource}`);

      // Extract meeting ID from resource path
      const meetingIdMatch = notification.resource.match(/onlineMeetings\/([^/]+)/);
      const meetingId = meetingIdMatch ? meetingIdMatch[1] : undefined;

      if (notification.resource.includes('/transcripts')) {
        results.push({
          event: 'transcript_ready',
          meetingId,
          data: {
            transcriptId: notification.resourceData.id,
            changeType: notification.changeType,
          },
        });
      } else if (notification.resource.includes('/recordings')) {
        results.push({
          event: 'recording_ready',
          meetingId,
          data: {
            recordingId: notification.resourceData.id,
            changeType: notification.changeType,
          },
        });
      } else if (notification.resource.includes('/onlineMeetings')) {
        results.push({
          event: notification.changeType === 'created' ? 'meeting_created' : 'meeting_updated',
          meetingId,
          data: notification.resourceData,
        });
      }
    }

    return results;
  }

  /**
   * Validate webhook notification (validation request)
   */
  validateWebhookEndpoint(validationToken: string): string {
    return validationToken;
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string, organizerUserId: string): Promise<void> {
    const token = await this.getAccessToken();

    await firstValueFrom(
      this.httpService.delete(
        `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        },
      ),
    );

    this.logger.log(`Deleted Teams meeting ${meetingId}`);
  }

  /**
   * Update meeting settings
   */
  async updateMeeting(
    meetingId: string,
    organizerUserId: string,
    updates: Partial<Pick<TeamsMeeting, 'subject' | 'startDateTime' | 'endDateTime' | 'allowRecording' | 'allowTranscription' | 'recordAutomatically'>>,
  ): Promise<TeamsMeeting> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.patch(
        `${this.graphUrl}/users/${organizerUserId}/onlineMeetings/${meetingId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    this.logger.log(`Updated Teams meeting ${meetingId}`);
    return response.data;
  }
}
