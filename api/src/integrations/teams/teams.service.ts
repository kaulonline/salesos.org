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
export class TeamsService extends BaseIntegrationService {
  protected readonly provider = 'teams';
  protected readonly displayName = 'Microsoft Teams';
  protected readonly logger = new Logger(TeamsService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tenantId: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('MICROSOFT_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('MICROSOFT_CLIENT_SECRET') || '';
    this.tenantId = this.configService.get('MICROSOFT_TENANT_ID') || 'common';
    this.redirectUri = this.configService.get('TEAMS_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/teams/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.displayName}`,
        details: {
          email: response.data.mail || response.data.userPrincipalName,
          id: response.data.id,
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
      throw new Error('Microsoft Teams OAuth not configured. Set MICROSOFT_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = [
      'User.Read',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All',
      'Chat.ReadWrite',
      'ChannelMessage.Send',
      'offline_access',
    ].join(' ');

    const authUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
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
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
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

  async getTeams(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Teams not connected');

    const response = await axios.get('https://graph.microsoft.com/v1.0/me/joinedTeams', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data.value;
  }

  async getChannels(teamId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Teams not connected');

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data.value;
  }

  async sendChannelMessage(teamId: string, channelId: string, message: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Teams not connected');

    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
      { body: { content: message } },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
