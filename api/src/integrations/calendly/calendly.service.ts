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
export class CalendlyService extends BaseIntegrationService {
  protected readonly provider = 'calendly';
  protected readonly displayName = 'Calendly';
  protected readonly logger = new Logger(CalendlyService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('CALENDLY_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('CALENDLY_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('CALENDLY_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/calendly/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.calendly.com/users/me', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.resource.name}`,
        details: {
          email: response.data.resource.email,
          timezone: response.data.resource.timezone,
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
      throw new Error('Calendly OAuth not configured. Set CALENDLY_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://auth.calendly.com/oauth/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://auth.calendly.com/oauth/token',
      {
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
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
      'https://auth.calendly.com/oauth/token',
      {
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getCurrentUser(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Calendly not connected');

    const response = await axios.get('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data.resource;
  }

  async getEventTypes(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Calendly not connected');

    const user = await this.getCurrentUser();
    const response = await axios.get('https://api.calendly.com/event_types', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { user: user.uri },
    });

    return response.data.collection;
  }

  async getScheduledEvents(startTime?: string, endTime?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Calendly not connected');

    const user = await this.getCurrentUser();
    const params: any = { user: user.uri };
    if (startTime) params.min_start_time = startTime;
    if (endTime) params.max_start_time = endTime;

    const response = await axios.get('https://api.calendly.com/scheduled_events', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params,
    });

    return response.data.collection;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
