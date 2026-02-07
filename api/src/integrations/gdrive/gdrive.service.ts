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
export class GDriveService extends BaseIntegrationService {
  protected readonly provider = 'gdrive';
  protected readonly displayName = 'Google Drive';
  protected readonly logger = new Logger(GDriveService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('GDRIVE_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/gdrive/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://www.googleapis.com/drive/v3/about', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { fields: 'user' },
      });

      return {
        success: true,
        message: `Connected as ${response.data.user.displayName}`,
        details: {
          email: response.data.user.emailAddress,
          displayName: response.data.user.displayName,
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
      throw new Error('Google Drive OAuth not configured. Set GOOGLE_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
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
      'https://oauth2.googleapis.com/token',
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
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async listFiles(folderId?: string, pageToken?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Google Drive not connected');

    const params: any = {
      pageSize: 100,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)',
    };
    if (folderId) params.q = `'${folderId}' in parents`;
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params,
    });

    return response.data;
  }

  async getFile(fileId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Google Drive not connected');

    const response = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { fields: '*' },
    });

    return response.data;
  }

  async createFolder(name: string, parentId?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Google Drive not connected');

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) metadata.parents = [parentId];

    const response = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      metadata,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
