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
export class SlackService extends BaseIntegrationService {
  protected readonly provider = 'slack';
  protected readonly displayName = 'Slack';
  protected readonly logger = new Logger(SlackService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('SLACK_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('SLACK_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('SLACK_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/slack/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (response.data.ok) {
        return {
          success: true,
          message: `Connected to workspace: ${response.data.team}`,
          details: {
            team: response.data.team,
            user: response.data.user,
            teamId: response.data.team_id,
          },
        };
      }
      return { success: false, message: response.data.error || 'Connection failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async initiateOAuth(): Promise<OAuthResult> {
    if (!this.clientId) {
      throw new Error('Slack OAuth not configured. Set SLACK_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = [
      'channels:read',
      'chat:write',
      'users:read',
      'team:read',
      'incoming-webhook',
    ].join(',');

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${this.clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error || 'Failed to exchange code for token');
    }

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      teamId: response.data.team?.id,
      teamName: response.data.team?.name,
      botUserId: response.data.bot_user_id,
      scope: response.data.scope,
    };

    await this.saveCredentials(credentials);
    return credentials;
  }

  async sendMessage(channel: string, text: string, blocks?: any[]): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Slack not connected');
    }

    const response = await axios.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text, blocks },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    if (!response.data.ok) {
      throw new Error(response.data.error || 'Failed to send message');
    }

    return response.data;
  }

  async getChannels(): Promise<any[]> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('Slack not connected');
    }

    const response = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { types: 'public_channel,private_channel' },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error || 'Failed to fetch channels');
    }

    return response.data.channels;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
