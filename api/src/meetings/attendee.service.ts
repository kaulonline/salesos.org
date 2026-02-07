import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface AttendeeBot {
  id: string;
  metadata?: Record<string, unknown>;
  meeting_url: string;
  state: 'joining' | 'in_waiting_room' | 'in_meeting' | 'joined_recording' | 'ended' | 'fatal_error';
  events: Array<{
    type: string;
    created_at: string;
  }>;
  transcription_state: 'not_started' | 'in_progress' | 'complete' | 'failed';
  recording_state: 'not_started' | 'in_progress' | 'complete' | 'failed';
  join_at?: string;
  deduplication_key?: string;
}

export interface AttendeeTranscript {
  speaker_name: string;
  speaker_uuid: string;
  speaker_user_uuid: string | null;
  speaker_is_host?: boolean;
  timestamp_ms: number;
  duration_ms: number;
  transcription: {
    transcript: string;
  };
}

export interface CreateBotOptions {
  meeting_url: string;
  bot_name: string;
  metadata?: Record<string, unknown>;
  zoom_settings?: {
    sdk?: 'native' | 'web';
  };
  recording_settings?: {
    recording_type?: 'audio_only' | 'audio_and_video';
  };
  transcription_settings?: {
    provider?: 'deepgram' | 'assembly_ai' | 'openai';
  };
  automatic_leave_settings?: {
    wait_for_host_timeout_seconds?: number;
    empty_meeting_timeout_seconds?: number;
  };
}

@Injectable()
export class AttendeeService implements OnModuleInit {
  private readonly logger = new Logger(AttendeeService.name);
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private isConfigured = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.apiKey = this.configService.get<string>('ATTENDEE_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('ATTENDEE_URL') || 'http://localhost:8000';

    if (!this.apiKey) {
      this.logger.warn('ATTENDEE_API_KEY not configured - Attendee bot service will not be available');
      return;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.isConfigured = true;
    this.logger.log(`Attendee service initialized - URL: ${this.baseUrl}`);
  }

  /**
   * Check if the Attendee service is configured and available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a new meeting bot
   */
  async createBot(options: CreateBotOptions): Promise<AttendeeBot> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      const payload: Record<string, unknown> = {
        meeting_url: options.meeting_url,
        bot_name: options.bot_name,
      };

      if (options.metadata) {
        payload.metadata = options.metadata;
      }

      // Default to web SDK for Zoom (doesn't require SDK approval)
      if (options.zoom_settings) {
        payload.zoom_settings = options.zoom_settings;
      } else if (options.meeting_url.includes('zoom.us')) {
        payload.zoom_settings = { sdk: 'web' };
      }

      if (options.recording_settings) {
        payload.recording_settings = options.recording_settings;
      }

      if (options.transcription_settings) {
        payload.transcription_settings = options.transcription_settings;
      }

      if (options.automatic_leave_settings) {
        payload.automatic_leave_settings = options.automatic_leave_settings;
      }

      this.logger.log(`Creating bot for meeting: ${options.meeting_url}`);
      this.logger.debug(`Bot payload: ${JSON.stringify(payload)}`);
      const response = await this.client.post<AttendeeBot>('/api/v1/bots', payload);
      this.logger.log(`Bot created: ${response.data.id}, state: ${response.data.state}`);
      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Failed to create bot: ${errorDetail}`);
      throw error;
    }
  }

  /**
   * Get bot status
   */
  async getBot(botId: string): Promise<AttendeeBot> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      const response = await this.client.get<AttendeeBot>(`/api/v1/bots/${botId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get bot ${botId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transcript for a bot
   */
  async getTranscript(botId: string): Promise<AttendeeTranscript[]> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      const response = await this.client.get<AttendeeTranscript[]>(`/api/v1/bots/${botId}/transcript`);
      // The API returns an array directly, not wrapped in an object
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      this.logger.error(`Failed to get transcript for bot ${botId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recording for a bot
   */
  async getRecording(botId: string): Promise<{ url: string }> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      const response = await this.client.get<{ url: string }>(`/api/v1/bots/${botId}/recording`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get recording for bot ${botId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Leave meeting and end bot
   */
  async leaveBot(botId: string): Promise<AttendeeBot> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      this.logger.log(`Leaving bot: ${botId}`);
      const response = await this.client.post<AttendeeBot>(`/api/v1/bots/${botId}/leave`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to leave bot ${botId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a bot
   */
  async deleteBot(botId: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      await this.client.delete(`/api/v1/bots/${botId}`);
      this.logger.log(`Bot deleted: ${botId}`);
    } catch (error) {
      this.logger.error(`Failed to delete bot ${botId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all bots
   */
  async listBots(): Promise<{ results: AttendeeBot[]; count: number }> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    try {
      const response = await this.client.get<{ results: AttendeeBot[]; count: number }>('/api/v1/bots');
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list bots: ${error.message}`);
      throw error;
    }
  }

  /**
   * Poll for bot status until meeting ends or timeout
   */
  async waitForMeetingEnd(botId: string, timeoutMs = 3600000, pollIntervalMs = 5000): Promise<AttendeeBot> {
    if (!this.isConfigured) {
      throw new Error('Attendee service is not configured');
    }

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const bot = await this.getBot(botId);
      
      if (bot.state === 'ended' || bot.state === 'fatal_error') {
        return bot;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for meeting to end (bot: ${botId})`);
  }

  /**
   * Send bot to a meeting and wait for transcription
   * Returns the bot with transcript when meeting ends
   */
  async recordMeeting(meetingUrl: string, botName: string, metadata?: Record<string, unknown>): Promise<{
    bot: AttendeeBot;
    transcript: AttendeeTranscript[];
  }> {
    const bot = await this.createBot({
      meeting_url: meetingUrl,
      bot_name: botName,
      metadata,
      zoom_settings: { sdk: 'web' },
      recording_settings: { recording_type: 'audio_and_video' },
    });

    const finalBot = await this.waitForMeetingEnd(bot.id);
    const transcript = await this.getTranscript(bot.id);

    return { bot: finalBot, transcript };
  }
}
