import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class MarketoService extends BaseIntegrationService {
  protected readonly provider = 'marketo';
  protected readonly displayName = 'Marketo';
  protected readonly logger = new Logger(MarketoService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId || !credentials?.clientSecret || !credentials?.munchkinId) {
      return { success: false, message: 'No credentials configured' };
    }

    try {
      const token = await this.getAccessToken(credentials);
      return {
        success: true,
        message: 'Connected to Marketo',
        details: { munchkinId: credentials.munchkinId },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async saveCredentials(credentials: IntegrationCredentials): Promise<void> {
    await super.saveCredentials(credentials);
  }

  private async getAccessToken(credentials: IntegrationCredentials): Promise<string> {
    const response = await axios.get(
      `https://${credentials.munchkinId}.mktorest.com/identity/oauth/token`,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        },
      },
    );

    return response.data.access_token;
  }

  async getLeads(filterType: string, filterValues: string[]): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId) throw new Error('Marketo not connected');

    const token = await this.getAccessToken(credentials);
    const response = await axios.get(
      `https://${credentials.munchkinId}.mktorest.com/rest/v1/leads.json`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          filterType,
          filterValues: filterValues.join(','),
        },
      },
    );

    return response.data;
  }

  async getCampaigns(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId) throw new Error('Marketo not connected');

    const token = await this.getAccessToken(credentials);
    const response = await axios.get(
      `https://${credentials.munchkinId}.mktorest.com/rest/v1/campaigns.json`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
  }

  async getLists(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId) throw new Error('Marketo not connected');

    const token = await this.getAccessToken(credentials);
    const response = await axios.get(
      `https://${credentials.munchkinId}.mktorest.com/rest/v1/lists.json`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
  }

  async addLeadToList(listId: number, leadIds: number[]): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId) throw new Error('Marketo not connected');

    const token = await this.getAccessToken(credentials);
    const response = await axios.post(
      `https://${credentials.munchkinId}.mktorest.com/rest/v1/lists/${listId}/leads.json`,
      { input: leadIds.map(id => ({ id })) },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
  }

  async createOrUpdateLeads(leads: any[]): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.clientId) throw new Error('Marketo not connected');

    const token = await this.getAccessToken(credentials);
    const response = await axios.post(
      `https://${credentials.munchkinId}.mktorest.com/rest/v1/leads.json`,
      { action: 'createOrUpdate', input: leads },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
  }
}
