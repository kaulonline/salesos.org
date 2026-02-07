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
export class XeroService extends BaseIntegrationService {
  protected readonly provider = 'xero';
  protected readonly displayName = 'Xero';
  protected readonly logger = new Logger(XeroService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('XERO_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('XERO_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('XERO_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/xero/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.xero.com/connections', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      const tenants = response.data;
      return {
        success: true,
        message: `Connected to ${tenants.length} organization(s)`,
        details: { organizations: tenants.map((t: any) => t.tenantName) },
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
      throw new Error('Xero OAuth not configured. Set XERO_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings',
      'offline_access',
    ].join(' ');

    const authUrl = `https://login.xero.com/identity/connect/authorize?` +
      `response_type=code&` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://identity.xero.com/connect/token',
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

    // Get tenant ID
    const tenantsResponse = await axios.get('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${response.data.access_token}` },
    });

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      tenantId: tenantsResponse.data[0]?.tenantId,
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
      'https://identity.xero.com/connect/token',
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

  async getContacts(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials.tenantId) throw new Error('Xero not connected');

    const response = await axios.get('https://api.xero.com/api.xro/2.0/Contacts', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId,
      },
    });

    return response.data.Contacts;
  }

  async getInvoices(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials.tenantId) throw new Error('Xero not connected');

    const response = await axios.get('https://api.xero.com/api.xro/2.0/Invoices', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId,
      },
    });

    return response.data.Invoices;
  }

  async getPayments(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials.tenantId) throw new Error('Xero not connected');

    const response = await axios.get('https://api.xero.com/api.xro/2.0/Payments', {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId,
      },
    });

    return response.data.Payments;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
