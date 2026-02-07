import { Injectable, Logger, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EmailProvider, ConnectionStatus, Prisma } from '@prisma/client';
import { UpdateEmailConnectionDto } from './dto/email-integration.dto';
import * as crypto from 'crypto';

// OAuth configuration interface
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  userInfoUrl: string;
}

// Token response from OAuth providers
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

// User info from providers
interface UserInfo {
  email: string;
  name?: string;
  id?: string;
}

@Injectable()
export class EmailIntegrationsService {
  private readonly logger = new Logger(EmailIntegrationsService.name);
  private readonly oauthStates = new Map<string, { userId: string; provider: EmailProvider; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get OAuth configuration for a provider
   */
  private getOAuthConfig(provider: EmailProvider): OAuthConfig {
    const baseRedirectUri = this.configService.get<string>('APP_URL', 'http://localhost:4000');

    switch (provider) {
      case EmailProvider.GMAIL:
        return {
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID', ''),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
          redirectUri: `${baseRedirectUri}/api/email-integrations/callback/gmail`,
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ],
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        };

      case EmailProvider.OUTLOOK:
        return {
          clientId: this.configService.get<string>('MICROSOFT_CLIENT_ID', ''),
          clientSecret: this.configService.get<string>('MICROSOFT_CLIENT_SECRET', ''),
          redirectUri: `${baseRedirectUri}/api/email-integrations/callback/outlook`,
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          scopes: [
            'offline_access',
            'https://graph.microsoft.com/Mail.Read',
            'https://graph.microsoft.com/Mail.Send',
            'https://graph.microsoft.com/User.Read',
          ],
          userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        };

      default:
        throw new BadRequestException(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async initiateOAuth(userId: string, provider: EmailProvider): Promise<{ authUrl: string; state: string }> {
    const config = this.getOAuthConfig(provider);

    if (!config.clientId || !config.clientSecret) {
      throw new BadRequestException(`${provider} OAuth is not configured. Please set up the client credentials.`);
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with expiration (10 minutes)
    this.oauthStates.set(state, {
      userId,
      provider,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    // Clean up old states
    this.cleanupExpiredStates();

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline', // For Gmail refresh tokens
      prompt: 'consent', // Force consent to get refresh token
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    this.logger.log(`Initiated OAuth for ${provider}, state: ${state.substring(0, 8)}...`);

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(
    provider: EmailProvider,
    code: string,
    state: string,
  ): Promise<{ success: boolean; connectionId?: string; email?: string; error?: string }> {
    // Verify state
    const stateData = this.oauthStates.get(state);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (stateData.expiresAt < Date.now()) {
      this.oauthStates.delete(state);
      throw new UnauthorizedException('OAuth state has expired');
    }

    if (stateData.provider !== provider) {
      throw new BadRequestException('Provider mismatch');
    }

    const { userId } = stateData;
    this.oauthStates.delete(state);

    const config = this.getOAuthConfig(provider);

    try {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(config, code);

      // Get user info
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // Calculate token expiration
      const tokenExpiresAt = tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;

      // Upsert connection
      const connection = await this.prisma.emailConnection.upsert({
        where: {
          userId_provider_email: {
            userId,
            provider,
            email: userInfo.email,
          },
        },
        update: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || undefined,
          tokenExpiresAt,
          status: ConnectionStatus.ACTIVE,
          lastError: null,
          providerUserId: userInfo.id,
          updatedAt: new Date(),
        },
        create: {
          userId,
          provider,
          email: userInfo.email,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          tokenExpiresAt,
          status: ConnectionStatus.ACTIVE,
          providerUserId: userInfo.id,
          providerData: { name: userInfo.name } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`OAuth successful for ${provider}: ${userInfo.email}`);

      return {
        success: true,
        connectionId: connection.id,
        email: userInfo.email,
      };
    } catch (error) {
      this.logger.error(`OAuth callback failed for ${provider}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(config: OAuthConfig, code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      this.logger.error(`Token exchange failed: ${errorData}`);
      throw new BadRequestException('Failed to exchange authorization code');
    }

    return response.json();
  }

  /**
   * Get user info from provider
   */
  private async getUserInfo(provider: EmailProvider, accessToken: string): Promise<UserInfo> {
    const config = this.getOAuthConfig(provider);

    const response = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to get user info');
    }

    const data = await response.json();

    if (provider === EmailProvider.GMAIL) {
      return {
        email: data.email,
        name: data.name,
        id: data.id,
      };
    } else if (provider === EmailProvider.OUTLOOK) {
      return {
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        id: data.id,
      };
    }

    throw new BadRequestException('Unknown provider');
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await this.prisma.emailConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (!connection.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    const config = this.getOAuthConfig(connection.provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      await this.prisma.emailConnection.update({
        where: { id: connectionId },
        data: {
          status: ConnectionStatus.EXPIRED,
          lastError: 'Refresh token expired or revoked',
        },
      });
      throw new BadRequestException('Failed to refresh access token');
    }

    const tokenData: TokenResponse = await response.json();

    await this.prisma.emailConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        status: ConnectionStatus.ACTIVE,
        lastError: null,
      },
    });

    this.logger.log(`Refreshed token for connection ${connectionId}`);
  }

  /**
   * Get all email connections for a user
   */
  async getConnections(userId: string) {
    return this.prisma.emailConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        syncEnabled: true,
        syncIncoming: true,
        syncOutgoing: true,
        lastSyncAt: true,
        emailsSynced: true,
        lastEmailAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific connection
   */
  async getConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.emailConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        syncEnabled: true,
        syncIncoming: true,
        syncOutgoing: true,
        lastSyncAt: true,
        emailsSynced: true,
        lastEmailAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }

  /**
   * Update connection settings
   */
  async updateConnection(connectionId: string, userId: string, dto: UpdateEmailConnectionDto) {
    const connection = await this.prisma.emailConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return this.prisma.emailConnection.update({
      where: { id: connectionId },
      data: {
        syncEnabled: dto.syncEnabled,
        syncIncoming: dto.syncIncoming,
        syncOutgoing: dto.syncOutgoing,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        status: true,
        syncEnabled: true,
        syncIncoming: true,
        syncOutgoing: true,
        lastSyncAt: true,
        emailsSynced: true,
        lastEmailAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Disconnect/delete an email connection
   */
  async deleteConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await this.prisma.emailConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Optionally revoke tokens with provider
    // For now, just delete the connection
    await this.prisma.emailConnection.delete({
      where: { id: connectionId },
    });

    this.logger.log(`Deleted email connection ${connectionId}`);
  }

  /**
   * Get available integrations with their configuration status
   */
  getAvailableIntegrations() {
    const gmailConfigured = !!(
      this.configService.get<string>('GOOGLE_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    );

    const outlookConfigured = !!(
      this.configService.get<string>('MICROSOFT_CLIENT_ID') &&
      this.configService.get<string>('MICROSOFT_CLIENT_SECRET')
    );

    return [
      {
        provider: EmailProvider.GMAIL,
        name: 'Gmail',
        description: 'Connect your Gmail account to sync emails and send from CRM',
        configured: gmailConfigured,
        icon: 'gmail',
      },
      {
        provider: EmailProvider.OUTLOOK,
        name: 'Microsoft Outlook',
        description: 'Connect your Outlook/Microsoft 365 account for email sync',
        configured: outlookConfigured,
        icon: 'outlook',
      },
    ];
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, value] of this.oauthStates.entries()) {
      if (value.expiresAt < now) {
        this.oauthStates.delete(key);
      }
    }
  }

  /**
   * Trigger a manual sync for a connection
   */
  async triggerSync(connectionId: string, userId: string) {
    const connection = await this.prisma.emailConnection.findFirst({
      where: {
        id: connectionId,
        userId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new BadRequestException('Connection is not active');
    }

    // Check if token needs refresh
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      await this.refreshAccessToken(connectionId);
    }

    // TODO: Implement actual email sync
    // For now, just update lastSyncAt
    await this.prisma.emailConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return { success: true, message: 'Sync triggered' };
  }
}
