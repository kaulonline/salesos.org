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
export class GongService extends BaseIntegrationService {
  protected readonly provider = 'gong';
  protected readonly displayName = 'Gong';
  protected readonly logger = new Logger(GongService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('GONG_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('GONG_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('GONG_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/gong/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.gong.io/v2/users', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { limit: 1 },
      });

      return {
        success: true,
        message: 'Connected to Gong',
        details: { usersCount: response.data.totalRecords },
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
      throw new Error('Gong OAuth not configured. Set GONG_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = ['api:calls:read:basic', 'api:users:read', 'api:stats:scorecards'].join(' ');
    const authUrl = `https://app.gong.io/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://app.gong.io/oauth2/generate-customer-token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
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
      'https://app.gong.io/oauth2/generate-customer-token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getCalls(fromDateTime?: string, toDateTime?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Gong not connected');

    const params: any = {};
    if (fromDateTime) params.fromDateTime = fromDateTime;
    if (toDateTime) params.toDateTime = toDateTime;

    const response = await axios.get('https://api.gong.io/v2/calls', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params,
    });

    return response.data;
  }

  async getCallTranscript(callId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Gong not connected');

    const response = await axios.post(
      'https://api.gong.io/v2/calls/transcript',
      { filter: { callIds: [callId] } },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async getUsers(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Gong not connected');

    const response = await axios.get('https://api.gong.io/v2/users', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async getStats(fromDate: string, toDate: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Gong not connected');

    const response = await axios.post(
      'https://api.gong.io/v2/stats/activity/aggregate',
      { filter: { fromDate, toDate } },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
