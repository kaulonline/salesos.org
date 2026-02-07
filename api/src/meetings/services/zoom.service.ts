/**
 * Zoom Integration Service
 * 
 * Handles Zoom meeting management, recording retrieval, and transcript processing
 * Uses Zoom Server-to-Server OAuth and Meeting SDK APIs
 * 
 * @see https://developers.zoom.us/docs/api/
 * @see https://developers.zoom.us/docs/meeting-sdk/
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ZoomMeeting {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  password?: string;
  settings: ZoomMeetingSettings;
}

export interface ZoomMeetingSettings {
  host_video: boolean;
  participant_video: boolean;
  join_before_host: boolean;
  mute_upon_entry: boolean;
  auto_recording: 'local' | 'cloud' | 'none';
  waiting_room: boolean;
}

export interface ZoomRecording {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: 'MP4' | 'M4A' | 'TRANSCRIPT' | 'CHAT' | 'CC' | 'CSV';
  file_extension: string;
  file_size: number;
  play_url?: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomTranscript {
  meeting_id: string;
  recording_id: string;
  transcript_url: string;
  content?: ZoomTranscriptContent[];
}

export interface ZoomTranscriptContent {
  text: string;
  start_time: number;
  end_time: number;
  speaker_name?: string;
  speaker_id?: string;
}

export interface ZoomParticipant {
  id: string;
  user_id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time?: string;
  duration: number;
  attentiveness_score?: number;
}

export interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: any;
  };
}

@Injectable()
export class ZoomService implements OnModuleInit {
  private readonly logger = new Logger(ZoomService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  private readonly baseUrl = 'https://api.zoom.us/v2';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    // Validate configuration on startup
    const accountId = this.configService.get<string>('ZOOM_ACCOUNT_ID');
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');

    if (!accountId || !clientId || !clientSecret) {
      this.logger.warn('Zoom credentials not configured - Zoom integration will be disabled');
    } else {
      this.logger.log('Zoom integration configured');
      // Pre-fetch access token
      await this.getAccessToken();
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const accountId = this.configService.get<string>('ZOOM_ACCOUNT_ID');
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');

    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Zoom credentials not configured');
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await firstValueFrom(
        this.httpService.post(
          'https://zoom.us/oauth/token',
          `grant_type=account_credentials&account_id=${accountId}`,
          {
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour, refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      this.logger.log('Zoom access token refreshed');
      return this.accessToken!;
    } catch (error) {
      this.logger.error('Failed to get Zoom access token', error);
      throw error;
    }
  }

  /**
   * Create a new Zoom meeting with cloud recording enabled
   */
  async createMeeting(params: {
    topic: string;
    startTime: Date;
    duration: number; // in minutes
    hostEmail: string;
    agenda?: string;
    enableTranscription?: boolean;
    invitees?: string[]; // Email addresses of attendees to invite
  }): Promise<ZoomMeeting> {
    const token = await this.getAccessToken();

    const meetingData: any = {
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: params.startTime.toISOString(),
      duration: params.duration,
      timezone: 'UTC',
      agenda: params.agenda || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        auto_recording: 'cloud', // Enable cloud recording automatically
        waiting_room: true,
        // Enable audio transcription
        audio_transcription: params.enableTranscription !== false,
        // Send email notifications to invitees
        meeting_invitees: params.invitees?.map(email => ({ email })),
      },
    };

    try {
      // For Server-to-Server OAuth, use 'me' to create meetings on behalf of the account owner
      // The hostEmail is used for reference but the meeting is created under the account
      const userId = 'me';
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/users/${userId}/meetings`,
          meetingData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Created Zoom meeting: ${response.data.id} for host: ${params.hostEmail}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Zoom meeting', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string | number): Promise<ZoomMeeting> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    );

    return response.data;
  }

  /**
   * Get meeting participants (after meeting ends)
   */
  async getMeetingParticipants(meetingId: string): Promise<ZoomParticipant[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/past_meetings/${meetingId}/participants`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          },
        ),
      );

      return response.data.participants || [];
    } catch (error) {
      this.logger.error(`Failed to get participants for meeting ${meetingId}`, error);
      return [];
    }
  }

  /**
   * Get cloud recordings for a meeting
   */
  async getMeetingRecordings(meetingId: string): Promise<ZoomRecording | null> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/meetings/${meetingId}/recordings`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.warn(`No recordings found for meeting ${meetingId}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Download transcript from Zoom recording
   */
  async downloadTranscript(recording: ZoomRecording): Promise<string | null> {
    const transcriptFile = recording.recording_files.find(
      f => f.file_type === 'TRANSCRIPT' || f.file_extension === 'vtt',
    );

    if (!transcriptFile) {
      this.logger.warn(`No transcript file found for meeting ${recording.id}`);
      return null;
    }

    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(transcriptFile.download_url, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { access_token: token },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to download transcript', error);
      throw error;
    }
  }

  /**
   * Download audio file from Zoom recording
   * Returns the audio file buffer for processing with Whisper
   */
  async downloadAudio(recording: ZoomRecording): Promise<Buffer | null> {
    const audioFile = recording.recording_files.find(
      f => f.file_type === 'M4A' || f.recording_type === 'audio_only',
    );

    if (!audioFile) {
      // Fall back to video file if no audio-only file
      const videoFile = recording.recording_files.find(f => f.file_type === 'MP4');
      if (!videoFile) {
        this.logger.warn(`No audio or video file found for meeting ${recording.id}`);
        return null;
      }
      return this.downloadFile(videoFile.download_url);
    }

    return this.downloadFile(audioFile.download_url);
  }

  /**
   * Download a file from Zoom
   */
  private async downloadFile(url: string): Promise<Buffer> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { access_token: token },
        responseType: 'arraybuffer',
      }),
    );

    return Buffer.from(response.data);
  }

  /**
   * Parse VTT transcript format to structured content
   */
  parseVttTranscript(vttContent: string): ZoomTranscriptContent[] {
    const segments: ZoomTranscriptContent[] = [];
    const lines = vttContent.split('\n');
    
    let currentSegment: Partial<ZoomTranscriptContent> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
        continue;
      }

      // Parse timestamp line (e.g., "00:00:01.000 --> 00:00:04.000")
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        currentSegment.start_time = this.vttTimeToSeconds(timestampMatch[1]);
        currentSegment.end_time = this.vttTimeToSeconds(timestampMatch[2]);
        continue;
      }

      // Parse speaker and text line (e.g., "John Doe: Hello everyone")
      if (currentSegment.start_time !== undefined && line) {
        const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
        if (speakerMatch) {
          currentSegment.speaker_name = speakerMatch[1].trim();
          currentSegment.text = speakerMatch[2].trim();
        } else {
          currentSegment.text = line;
        }

        if (currentSegment.text) {
          segments.push(currentSegment as ZoomTranscriptContent);
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
   * Handle Zoom webhook events
   */
  async handleWebhook(payload: ZoomWebhookPayload): Promise<{
    event: string;
    meetingId?: string;
    data?: any;
  }> {
    this.logger.log(`Received Zoom webhook: ${payload.event}`);

    switch (payload.event) {
      case 'meeting.started':
        return {
          event: 'meeting_started',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            topic: payload.payload.object.topic,
            host_id: payload.payload.object.host_id,
            start_time: payload.payload.object.start_time,
          },
        };

      case 'meeting.ended':
        return {
          event: 'meeting_ended',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            topic: payload.payload.object.topic,
            duration: payload.payload.object.duration,
            end_time: payload.payload.object.end_time,
          },
        };

      case 'recording.completed':
        return {
          event: 'recording_ready',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            recording_files: payload.payload.object.recording_files,
            download_token: payload.payload.object.download_token,
          },
        };

      case 'recording.transcript_completed':
        return {
          event: 'transcript_ready',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            recording_id: payload.payload.object.recording_id,
          },
        };

      case 'meeting.participant_joined':
        return {
          event: 'participant_joined',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            participant: payload.payload.object.participant,
          },
        };

      case 'meeting.participant_left':
        return {
          event: 'participant_left',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            participant: payload.payload.object.participant,
          },
        };

      case 'meeting.deleted':
        return {
          event: 'meeting_deleted',
          meetingId: payload.payload.object.id?.toString(),
          data: {
            topic: payload.payload.object.topic,
            host_id: payload.payload.object.host_id,
          },
        };

      default:
        this.logger.debug(`Unhandled Zoom webhook event: ${payload.event}`);
        return { event: payload.event };
    }
  }

  /**
   * Verify Zoom webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const crypto = require('crypto');
    const webhookSecret = this.configService.get<string>('ZOOM_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      this.logger.warn('ZOOM_WEBHOOK_SECRET not configured - skipping signature verification');
      return true;
    }

    const message = `v0:${timestamp}:${payload}`;
    const hashForVerify = crypto
      .createHmac('sha256', webhookSecret)
      .update(message)
      .digest('hex');
    
    const expectedSignature = `v0=${hashForVerify}`;
    return signature === expectedSignature;
  }

  /**
   * Get user's upcoming meetings
   */
  async getUpcomingMeetings(userEmail: string): Promise<ZoomMeeting[]> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/users/${userEmail}/meetings`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { type: 'upcoming' },
        },
      ),
    );

    return response.data.meetings || [];
  }

  /**
   * Update meeting settings (e.g., enable recording)
   */
  async updateMeetingSettings(
    meetingId: string | number,
    settings: Partial<ZoomMeetingSettings>,
  ): Promise<void> {
    const token = await this.getAccessToken();

    await firstValueFrom(
      this.httpService.patch(
        `${this.baseUrl}/meetings/${meetingId}`,
        { settings },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    this.logger.log(`Updated settings for meeting ${meetingId}`);
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string | number): Promise<void> {
    const token = await this.getAccessToken();

    await firstValueFrom(
      this.httpService.delete(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }),
    );

    this.logger.log(`Deleted meeting ${meetingId}`);
  }
}
