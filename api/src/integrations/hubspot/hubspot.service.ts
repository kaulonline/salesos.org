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
export class HubSpotService extends BaseIntegrationService {
  protected readonly provider = 'hubspot';
  protected readonly displayName = 'HubSpot';
  protected readonly logger = new Logger(HubSpotService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('HUBSPOT_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('HUBSPOT_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get('HUBSPOT_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/hubspot/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get('https://api.hubapi.com/account-info/v3/details', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected to HubSpot portal: ${response.data.portalId}`,
        details: {
          portalId: response.data.portalId,
          timeZone: response.data.timeZone,
          currency: response.data.currency,
        },
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Try to refresh token
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
      throw new Error('HubSpot OAuth not configured. Set HUBSPOT_CLIENT_ID in environment.');
    }

    const state = this.generateState();
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.companies.read',
      'crm.objects.companies.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.schemas.contacts.read',
      'crm.schemas.companies.read',
      'crm.schemas.deals.read',
    ].join(' ');

    const authUrl = `https://app.hubspot.com/oauth/authorize?` +
      `client_id=${this.clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
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
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: credentials.refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getContacts(limit = 100, after?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('HubSpot not connected');
    }

    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { limit, after, properties: 'firstname,lastname,email,phone,company' },
    });

    return response.data;
  }

  async getDeals(limit = 100, after?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('HubSpot not connected');
    }

    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/deals', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { limit, after, properties: 'dealname,amount,dealstage,closedate' },
    });

    return response.data;
  }

  async getCompanies(limit = 100, after?: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) {
      throw new Error('HubSpot not connected');
    }

    const response = await axios.get('https://api.hubapi.com/crm/v3/objects/companies', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { limit, after, properties: 'name,domain,industry,phone,city' },
    });

    return response.data;
  }

  async syncContacts(): Promise<{ imported: number; updated: number }> {
    this.logger.log('Starting HubSpot contact sync...');
    let imported = 0;
    let updated = 0;
    let after: string | undefined;

    try {
      do {
        const result = await this.getContacts(100, after);
        for (const contact of result.results) {
          // Sync logic here - upsert to local database
          // This is a placeholder for actual sync implementation
        }
        after = result.paging?.next?.after;
      } while (after);

      await this.updateLastSync();
      this.logger.log(`HubSpot sync complete: ${imported} imported, ${updated} updated`);
    } catch (error: any) {
      await this.updateLastSync(error.message);
      throw error;
    }

    return { imported, updated };
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
