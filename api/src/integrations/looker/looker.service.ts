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
export class LookerService extends BaseIntegrationService {
  protected readonly provider = 'looker';
  protected readonly displayName = 'Looker';
  protected readonly logger = new Logger(LookerService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('LOOKER_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('LOOKER_CLIENT_SECRET') || '';
    this.baseUrl = this.configService.get('LOOKER_BASE_URL') || '';
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.baseUrl) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(`${credentials.baseUrl}/api/4.0/user`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.display_name}`,
        details: {
          email: response.data.email,
          id: response.data.id,
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
    if (!this.clientId || !this.baseUrl) {
      throw new Error('Looker OAuth not configured. Set LOOKER_CLIENT_ID and LOOKER_BASE_URL in environment.');
    }

    // Looker uses API key authentication, not OAuth
    // Generate login token
    const response = await axios.post(
      `${this.baseUrl}/api/4.0/login`,
      null,
      {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
      },
    );

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      baseUrl: this.baseUrl,
    };

    await this.saveCredentials(credentials);

    return { authUrl: '', state: '' }; // No OAuth redirect needed
  }

  private async refreshAccessToken(): Promise<void> {
    const credentials = await this.getCredentials();
    const response = await axios.post(
      `${credentials?.baseUrl || this.baseUrl}/api/4.0/login`,
      null,
      {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
      },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getDashboards(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Looker not connected');

    const response = await axios.get(`${credentials.baseUrl}/api/4.0/dashboards`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async getLooks(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Looker not connected');

    const response = await axios.get(`${credentials.baseUrl}/api/4.0/looks`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async runLook(lookId: number, format = 'json'): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Looker not connected');

    const response = await axios.get(`${credentials.baseUrl}/api/4.0/looks/${lookId}/run/${format}`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async runQuery(queryId: number): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Looker not connected');

    const response = await axios.get(`${credentials.baseUrl}/api/4.0/queries/${queryId}/run/json`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }
}
