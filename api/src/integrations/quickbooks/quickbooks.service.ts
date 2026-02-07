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
export class QuickBooksService extends BaseIntegrationService {
  protected readonly provider = 'quickbooks';
  protected readonly displayName = 'QuickBooks';
  protected readonly logger = new Logger(QuickBooksService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly environment: 'sandbox' | 'production';

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('QUICKBOOKS_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('QUICKBOOKS_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('QUICKBOOKS_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/quickbooks/callback`;
    this.environment = this.configService.get('QUICKBOOKS_ENVIRONMENT') === 'production' ? 'production' : 'sandbox';
  }

  private get baseUrl(): string {
    return this.environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.realmId) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/company/${credentials.realmId}/companyinfo/${credentials.realmId}`,
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            Accept: 'application/json',
          },
        },
      );

      return {
        success: true,
        message: `Connected to ${response.data.CompanyInfo.CompanyName}`,
        details: {
          companyName: response.data.CompanyInfo.CompanyName,
          country: response.data.CompanyInfo.Country,
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
      throw new Error('QuickBooks OAuth not configured. Set QUICKBOOKS_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = ['com.intuit.quickbooks.accounting'].join(' ');
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string, realmId: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
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

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      realmId,
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
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
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

  async getCustomers(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('QuickBooks not connected');

    const response = await axios.get(
      `${this.baseUrl}/v3/company/${credentials.realmId}/query`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
        params: { query: 'SELECT * FROM Customer MAXRESULTS 100' },
      },
    );

    return response.data.QueryResponse.Customer || [];
  }

  async getInvoices(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('QuickBooks not connected');

    const response = await axios.get(
      `${this.baseUrl}/v3/company/${credentials.realmId}/query`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
        params: { query: 'SELECT * FROM Invoice MAXRESULTS 100' },
      },
    );

    return response.data.QueryResponse.Invoice || [];
  }

  async getPayments(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('QuickBooks not connected');

    const response = await axios.get(
      `${this.baseUrl}/v3/company/${credentials.realmId}/query`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          Accept: 'application/json',
        },
        params: { query: 'SELECT * FROM Payment MAXRESULTS 100' },
      },
    );

    return response.data.QueryResponse.Payment || [];
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
