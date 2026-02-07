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
export class Auth0Service extends BaseIntegrationService {
  protected readonly provider = 'auth0';
  protected readonly displayName = 'Auth0';
  protected readonly logger = new Logger(Auth0Service.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly domain: string;
  private readonly redirectUri: string;

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
    this.clientId = this.configService.get('AUTH0_CLIENT_ID') || '';
    this.clientSecret = this.configService.get('AUTH0_CLIENT_SECRET') || '';
    this.domain = this.configService.get('AUTH0_DOMAIN') || '';
    this.redirectUri = this.configService.get('AUTH0_REDIRECT_URI') ||
      `${this.configService.get('APP_URL')}/api/integrations/auth0/callback`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken || !credentials?.domain) {
      return { success: false, message: 'No access token configured' };
    }

    try {
      const response = await axios.get(`https://${credentials.domain}/api/v2/users`, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: { per_page: 1 },
      });

      return {
        success: true,
        message: 'Connected to Auth0',
        details: { usersFound: response.data.length > 0 },
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
    if (!this.clientId || !this.domain) {
      throw new Error('Auth0 OAuth not configured. Set AUTH0_CLIENT_ID and AUTH0_DOMAIN in environment.');
    }

    const state = this.generateState();
    const scopes = ['openid', 'profile', 'email', 'read:users', 'read:roles'].join(' ');
    const authUrl = `https://${this.domain}/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `audience=${encodeURIComponent(`https://${this.domain}/api/v2/`)}&` +
      `state=${state}`;

    return { authUrl, state };
  }

  async handleOAuthCallback(code: string): Promise<IntegrationCredentials> {
    const response = await axios.post(
      `https://${this.domain}/oauth/token`,
      {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      },
      { headers: { 'Content-Type': 'application/json' } },
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

  private async refreshAccessToken(): Promise<void> {
    const credentials = await this.getCredentials();
    if (!credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `https://${credentials.domain || this.domain}/oauth/token`,
      {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: credentials.refreshToken,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    await this.saveCredentials({
      ...credentials,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + response.data.expires_in * 1000).toISOString(),
    });
  }

  async getUsers(page = 0, perPage = 50): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Auth0 not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v2/users`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      params: { page, per_page: perPage, include_totals: true },
    });

    return response.data;
  }

  async getRoles(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Auth0 not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v2/roles`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async getUserRoles(userId: string): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Auth0 not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v2/users/${userId}/roles`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  async getConnections(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.accessToken) throw new Error('Auth0 not connected');

    const response = await axios.get(`https://${credentials.domain}/api/v2/connections`, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });

    return response.data;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
