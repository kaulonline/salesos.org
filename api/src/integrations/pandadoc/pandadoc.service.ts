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
export class PandaDocService extends BaseIntegrationService {
  protected readonly provider = 'pandadoc';
  protected readonly displayName = 'PandaDoc';
  protected readonly logger = new Logger(PandaDocService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('PANDADOC_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('PANDADOC_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('PANDADOC_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/pandadoc/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.pandadoc.com/public/v1/members/current', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.email}`,
        details: {
          email: response.data.email,
          membership_id: response.data.membership_id,
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
      throw new Error('PandaDoc OAuth not configured. Set PANDADOC_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = ['read+write'].join(' ');
    const authUrl = `https://app.pandadoc.com/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://api.pandadoc.com/oauth2/access_token',
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
      'https://api.pandadoc.com/oauth2/access_token',
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

  async getDocuments(status?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('PandaDoc not connected');

    const params: any = {};
    if (status) params.status = status;

    const response = await axios.get('https://api.pandadoc.com/public/v1/documents', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params,
    });

    return response.data;
  }

  async getDocumentDetails(documentId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('PandaDoc not connected');

    const response = await axios.get(`https://api.pandadoc.com/public/v1/documents/${documentId}/details`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async createDocument(data: {
    name: string;
    templateId?: string;
    recipients: { email: string; role: string }[];
    tokens?: { name: string; value: string }[];
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('PandaDoc not connected');

    const response = await axios.post(
      'https://api.pandadoc.com/public/v1/documents',
      data,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async sendDocument(documentId: string, message?: string, subject?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('PandaDoc not connected');

    const response = await axios.post(
      `https://api.pandadoc.com/public/v1/documents/${documentId}/send`,
      { message, subject },
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async getTemplates(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('PandaDoc not connected');

    const response = await axios.get('https://api.pandadoc.com/public/v1/templates', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
