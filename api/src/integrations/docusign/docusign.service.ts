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
export class DocuSignService extends BaseIntegrationService {
  protected readonly provider = 'docusign';
  protected readonly displayName = 'DocuSign';
  protected readonly logger = new Logger(DocuSignService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('DOCUSIGN_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('DOCUSIGN_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('DOCUSIGN_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/docusign/callback`;
    // Use demo environment by default, production would be account.docusign.com
    this.baseUrl = this.configService.get('DOCUSIGN_BASE_URL') || 'https://demo.docusign.net';
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/restapi/v2.1/accounts/${credentials.accountId}/users`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: 'Connected to DocuSign',
        details: {
          accountId: credentials.accountId,
          usersCount: response.data.users?.length || 0,
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
      throw new Error('DocuSign OAuth not configured. Set DOCUSIGN_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = ['signature', 'impersonation'].join(' ');

    const authUrl = `https://account-d.docusign.com/oauth/auth?` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const tokenResponse = await axios.post(
      'https://account-d.docusign.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
      },
    );

    // Get user info to find account ID
    const userInfoResponse = await axios.get('https://account-d.docusign.com/oauth/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
    });

    const account = userInfoResponse.data.accounts?.[0];
    const credentials: IntegrationCredentials = {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000).toISOString(),
      accountId: account?.account_id,
      baseUri: account?.base_uri,
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
      'https://account-d.docusign.com/oauth/token',
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

  async createEnvelope(options: {
    documentBase64: string;
    documentName: string;
    signerEmail: string;
    signerName: string;
    subject: string;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.accountId) {
      throw new Error('DocuSign not connected');
    }

    const envelope = {
      emailSubject: options.subject,
      documents: [{
        documentBase64: options.documentBase64,
        name: options.documentName,
        fileExtension: 'pdf',
        documentId: '1',
      }],
      recipients: {
        signers: [{
          email: options.signerEmail,
          name: options.signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              documentId: '1',
              pageNumber: '1',
              xPosition: '100',
              yPosition: '100',
            }],
          },
        }],
      },
      status: 'sent',
    };

    const response = await axios.post(
      `${credentials.baseUri}/restapi/v2.1/accounts/${credentials.accountId}/envelopes`,
      envelope,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  async getEnvelopes(fromDate?: Date): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.accountId) {
      throw new Error('DocuSign not connected');
    }

    const params: any = {};
    if (fromDate) {
      params.from_date = fromDate.toISOString();
    }

    const response = await axios.get(
      `${credentials.baseUri}/restapi/v2.1/accounts/${credentials.accountId}/envelopes`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params,
      },
    );

    return response.data;
  }

  async getEnvelopeStatus(envelopeId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.accountId) {
      throw new Error('DocuSign not connected');
    }

    const response = await axios.get(
      `${credentials.baseUri}/restapi/v2.1/accounts/${credentials.accountId}/envelopes/${envelopeId}`,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
