import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
  OAuthResult,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class ZoomService extends BaseIntegrationService {
  protected readonly provider = 'zoom';
  protected readonly displayName = 'Zoom';
  protected readonly logger = new Logger(ZoomService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('ZOOM_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('ZOOM_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('ZOOM_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/zoom/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.first_name} ${response.data.last_name}`,
        details: {
          userId: response.data.id,
          email: response.data.email,
          type: response.data.type,
          pmi: response.data.pmi,
        },
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          await this.refreshAccessToken();
          return this.testConnection();
        } catch {
          return { success: false, message: 'Token expired and refresh failed' };
        }
      }
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async initiateOAuth(): Promise<OAuthResult> {
    if (!this.clientId) {
      throw new Error('Zoom OAuth not configured. Set ZOOM_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://zoom.us/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
      },
    );

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      scope: response.data.scope,
    };

    await this.saveCredentials(credentials);
    return credentials;
  }

  private async refreshAccessToken(): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
      },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getMeetings(type: 'scheduled' | 'live' | 'upcoming' = 'upcoming'): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Zoom not connected');
    }

    const response = await axios.get('https://api.zoom.us/v2/users/me/meetings', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { type },
    });

    return response.data;
  }

  async getRecordings(from?: string, to?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Zoom not connected');
    }

    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;

    const response = await axios.get('https://api.zoom.us/v2/users/me/recordings', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params,
    });

    return response.data;
  }

  async createMeeting(options: {
    topic: string;
    startTime: string;
    duration: number;
    agenda?: string;
    timezone?: string;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Zoom not connected');
    }

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: options.startTime,
        duration: options.duration,
        timezone: options.timezone || 'UTC',
        agenda: options.agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          auto_recording: 'cloud',
        },
      },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async getMeetingDetails(meetingId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Zoom not connected');
    }

    const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
