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
export class IntercomService extends BaseIntegrationService {
  protected readonly provider = 'intercom';
  protected readonly displayName = 'Intercom';
  protected readonly logger = new Logger(IntercomService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('INTERCOM_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('INTERCOM_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('INTERCOM_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/intercom/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.intercom.io/me', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
      });

      return {
        success: true,
        message: `Connected to ${response.data.app?.name || 'Intercom'}`,
        details: {
          appId: response.data.app?.id_code,
          type: response.data.type,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async initiateOAuth(): Promise<OAuthResult> {
    if (!this.clientId) {
      throw new Error('Intercom OAuth not configured. Set INTERCOM_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://app.intercom.com/oauth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://api.intercom.io/auth/eagle/token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const credentials: IntegrationCredentials = {
      accessToken: response.data.token,
    };

    await this.saveCredentials(credentials);
    return credentials;
  }

  async getContacts(page = 1): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Intercom not connected');

    const response = await axios.get('https://api.intercom.io/contacts', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: 'application/json',
      },
      params: { per_page: 50, page },
    });

    return response.data;
  }

  async getConversations(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Intercom not connected');

    const response = await axios.get('https://api.intercom.io/conversations', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getCompanies(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Intercom not connected');

    const response = await axios.get('https://api.intercom.io/companies', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async sendMessage(contactId: string, message: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Intercom not connected');

    const response = await axios.post(
      'https://api.intercom.io/messages',
      {
        message_type: 'inapp',
        body: message,
        from: { type: 'admin', id: 'admin_id' },
        to: { type: 'contact', id: contactId },
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
