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
export class DropboxService extends BaseIntegrationService {
  protected readonly provider = 'dropbox';
  protected readonly displayName = 'Dropbox';
  protected readonly logger = new Logger(DropboxService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('DROPBOX_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('DROPBOX_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('DROPBOX_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/dropbox/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.post(
        'https://api.dropboxapi.com/2/users/get_current_account',
        null,
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
      );

      return {
        success: true,
        message: `Connected as ${response.data.name.display_name}`,
        details: {
          email: response.data.email,
          accountId: response.data.account_id,
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
      throw new Error('Dropbox OAuth not configured. Set DROPBOX_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `token_access_type=offline&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://api.dropboxapi.com/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
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
      'https://api.dropboxapi.com/oauth2/token',
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
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async listFolder(path = ''): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Dropbox not connected');

    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { path: path || '', recursive: false },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async getSharedLink(path: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Dropbox not connected');

    const response = await axios.post(
      'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
      { path },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async uploadFile(path: string, content: Buffer): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Dropbox not connected');

    const response = await axios.post(
      'https://content.dropboxapi.com/2/files/upload',
      content,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true }),
        },
      },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
