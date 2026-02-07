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
export class SalesforceService extends BaseIntegrationService {
  protected readonly provider = 'salesforce';
  protected readonly displayName = 'Salesforce';
  protected readonly logger = new Logger(SalesforceService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('SALESFORCE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('SALESFORCE_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('SALESFORCE_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/salesforce/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(
        `${credentials.instanceUrl}/services/data/v58.0/sobjects`,
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
      );

      return {
        success: true,
        message: 'Connected to Salesforce',
        details: { sobjects: response.data.sobjects?.length || 0 },
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
      throw new Error('Salesforce OAuth not configured. Set SALESFORCE_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const authUrl = `https://login.salesforce.com/services/oauth2/authorize?` +
      `response_type=code&` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent('api refresh_token offline_access')}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://login.salesforce.com/services/oauth2/token',
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
      instanceUrl: response.data.instance_url,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
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
      'https://login.salesforce.com/services/oauth2/token',
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
      instanceUrl: response.data.instance_url || credentials.instanceUrl,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
  }

  async getContacts(limit = 100): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Salesforce not connected');

    const response = await axios.get(
      `${credentials.instanceUrl}/services/data/v58.0/query`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { q: `SELECT Id, Name, Email, Phone, Account.Name FROM Contact LIMIT ${limit}` },
      },
    );

    return response.data.records;
  }

  async getOpportunities(limit = 100): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Salesforce not connected');

    const response = await axios.get(
      `${credentials.instanceUrl}/services/data/v58.0/query`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { q: `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity LIMIT ${limit}` },
      },
    );

    return response.data.records;
  }

  async getAccounts(limit = 100): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Salesforce not connected');

    const response = await axios.get(
      `${credentials.instanceUrl}/services/data/v58.0/query`,
      {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { q: `SELECT Id, Name, Industry, Website, AnnualRevenue FROM Account LIMIT ${limit}` },
      },
    );

    return response.data.records;
  }

  async syncContacts(): Promise<{ imported: number }> {
    const contacts = await this.getContacts(500);
    // Sync logic would go here
    return { imported: contacts.length };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
