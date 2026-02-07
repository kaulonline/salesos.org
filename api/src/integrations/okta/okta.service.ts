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
export class OktaService extends BaseIntegrationService {
  protected readonly provider = 'okta';
  protected readonly displayName = 'Okta SSO';
  protected readonly logger = new Logger(OktaService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly domain: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('OKTA_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('OKTA_CLIENT_SECRET') || '';
    this.domain = this.configService.get('OKTA_DOMAIN') || '';
    this.redirectUri = this.configService.get('OKTA_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/okta/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.domain) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(`https://${credentials.domain}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      return {
        success: true,
        message: `Connected as ${response.data.profile.email}`,
        details: {
          email: response.data.profile.email,
          firstName: response.data.profile.firstName,
          lastName: response.data.profile.lastName,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async initiateOAuth(): Promise<OAuthResult> {
    if (!this.clientId || !this.domain) {
      throw new Error('Okta OAuth not configured. Set OKTA_CLIENT_ID and OKTA_DOMAIN in environment.');
    }

    const state = this.generateState();
    const scopes = ['openid', 'profile', 'email', 'okta.users.read'].join(' ');
    const authUrl = `https://${this.domain}/oauth2/v1/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      `https://${this.domain}/oauth2/v1/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const credentials: IntegrationCredentials = {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      idToken: response.data.id_token,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
      domain: this.domain,
    };

    await this.saveCredentials(credentials);
    return credentials;
  }

  async getUsers(limit = 200): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Okta not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v1/users`, {
      headers: { Authorization: `SSWS ${credentials.accessToken}` },
      params: { limit },
    });

    return response.data;
  }

  async getGroups(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Okta not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v1/groups`, {
      headers: { Authorization: `SSWS ${credentials.accessToken}` },
    });

    return response.data;
  }

  async getUserGroups(userId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Okta not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v1/users/${userId}/groups`, {
      headers: { Authorization: `SSWS ${credentials.accessToken}` },
    });

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
