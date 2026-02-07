import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CrmProvider, ApiServiceType } from '@prisma/client';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageTrackingService } from '../admin/usage-tracking.service';
import {
  OracleCXConnectionStatus,
  OracleCXSyncSettingsDto,
} from './dto/oracle-cx-connection.dto';
import {
  OracleCXQueryDto,
  OracleCXQueryResult,
  OracleCXCreateResult,
  OracleCXOpportunity,
  OracleCXAccount,
  OracleCXContact,
  OracleCXLead,
  OracleCXActivity,
} from './dto/oracle-cx-query.dto';

/**
 * Oracle CX OAuth configuration (loaded from database)
 */
interface OracleCXConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  loginUrl: string;
  tokenUrl: string;
  apiVersion: string;
}

/**
 * Token response from Oracle CX OAuth
 */
interface OracleCXTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Oracle CX user identity response
 */
interface OracleCXIdentity {
  userId: string;
  organizationId?: string;
  username: string;
  displayName: string;
  email?: string;
}

/**
 * API usage tracking for rate limit management
 */
interface ApiUsageStats {
  dailyCallCount: number;
  dailyCallLimit: number;
  resetDate: Date;
  lastCallTimestamp: Date;
  warningThreshold: number;
}

/**
 * Oracle CX resource mapping to API endpoints
 */
const RESOURCE_ENDPOINTS: Record<string, string> = {
  opportunities: 'opportunities',
  accounts: 'accounts',
  contacts: 'contacts',
  leads: 'leads',
  activities: 'activities',
  tasks: 'tasks',
  revenues: 'revenues',
  notes: 'notes',
};

@Injectable()
export class OracleCXService implements OnModuleInit {
  private readonly logger = new Logger(OracleCXService.name);
  private readonly encryptionKey: string;
  private readonly DEFAULT_API_VERSION = 'latest';

  // Cache for config to avoid DB hits on every request
  private configCache: { config: OracleCXConfig; expiresAt: number } | null = null;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Proactive token refresh configuration
  private readonly TOKEN_REFRESH_BUFFER_MINUTES = 15;
  private tokenRefreshInProgress = new Set<string>();

  // API usage tracking
  private apiUsage: ApiUsageStats = {
    dailyCallCount: 0,
    dailyCallLimit: 50000, // Oracle CX typical limit
    resetDate: new Date(),
    lastCallTimestamp: new Date(),
    warningThreshold: 0.8,
  };

  // Schema cache to avoid repeated describe calls
  private schemaCache: Map<string, { schema: any; expiresAt: number }> = new Map();
  private readonly SCHEMA_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {
    this.encryptionKey =
      process.env.CRM_ENCRYPTION_KEY ||
      process.env.ORACLE_CX_ENCRYPTION_KEY ||
      crypto
        .createHash('sha256')
        .update(process.env.JWT_SECRET || 'default-secret')
        .digest('hex')
        .slice(0, 32);
  }

  /**
   * On module initialization, run an initial token refresh check
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('OracleCXService initialized - scheduling proactive token refresh');
    setTimeout(() => this.proactiveTokenRefresh(), 15000);
  }

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Proactive Token Refresh - Runs every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async proactiveTokenRefresh(): Promise<void> {
    try {
      const bufferTime = new Date(
        Date.now() + this.TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000,
      );

      // Find Oracle CX connections expiring soon
      const oracleCXIntegration = await this.prisma.crmIntegration.findUnique({
        where: { provider: CrmProvider.ORACLE_CX },
      });

      if (!oracleCXIntegration) {
        return;
      }

      const expiringConnections = await this.prisma.crmConnection.findMany({
        where: {
          integrationId: oracleCXIntegration.id,
          isActive: true,
          expiresAt: {
            lte: bufferTime,
            gt: new Date(),
          },
        },
        select: {
          id: true,
          userId: true,
          refreshToken: true,
          expiresAt: true,
          displayName: true,
        },
      });

      if (expiringConnections.length === 0) {
        return;
      }

      this.logger.log(
        `Proactive token refresh: Found ${expiringConnections.length} Oracle CX connection(s) expiring soon`,
      );

      for (const connection of expiringConnections) {
        if (this.tokenRefreshInProgress.has(connection.id)) {
          continue;
        }

        try {
          this.tokenRefreshInProgress.add(connection.id);

          const minutesUntilExpiry = Math.round(
            (connection.expiresAt.getTime() - Date.now()) / 60000,
          );
          this.logger.log(
            `Refreshing Oracle CX token for ${connection.displayName || connection.userId} (expires in ${minutesUntilExpiry} minutes)`,
          );

          if (!connection.refreshToken) {
            this.logger.warn(`No refresh token available for connection ${connection.id}`);
            continue;
          }

          const decryptedRefreshToken = this.decrypt(connection.refreshToken);
          const { accessToken, expiresAt } = await this.refreshAccessToken(decryptedRefreshToken);

          const encryptedAccessToken = this.encrypt(accessToken);
          await this.prisma.crmConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: encryptedAccessToken,
              expiresAt,
              updatedAt: new Date(),
            },
          });

          this.logger.log(
            `Successfully refreshed Oracle CX token for ${connection.displayName || connection.userId}`,
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to refresh Oracle CX token for ${connection.displayName || connection.userId}: ${error.message}`,
          );
        } finally {
          this.tokenRefreshInProgress.delete(connection.id);
        }
      }
    } catch (error: any) {
      this.logger.error(`Oracle CX proactive token refresh error: ${error.message}`);
    }
  }

  /**
   * Force refresh a specific user's token
   */
  async forceRefreshToken(
    userId: string,
  ): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
    try {
      const connection = await this.getConnection(userId);

      if (!connection) {
        return { success: false, error: 'No Oracle CX connection found' };
      }

      if (!connection.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const decryptedRefreshToken = this.decrypt(connection.refreshToken);
      const { accessToken, expiresAt } = await this.refreshAccessToken(decryptedRefreshToken);

      const encryptedAccessToken = this.encrypt(accessToken);
      await this.prisma.crmConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: encryptedAccessToken,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Force refreshed Oracle CX token for user ${userId}`);
      return { success: true, expiresAt };
    } catch (error: any) {
      this.logger.error(`Force refresh failed for user ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ensure user has a valid token
   */
  async ensureValidToken(userId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(userId);

      if (!connection) {
        return false;
      }

      const bufferTime = new Date(
        Date.now() + this.TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000,
      );

      if (connection.expiresAt <= bufferTime) {
        this.logger.debug(`Oracle CX token for user ${userId} needs refresh`);
        const result = await this.forceRefreshToken(userId);
        return result.success;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`ensureValidToken failed for user ${userId}: ${error.message}`);
      return false;
    }
  }

  // ==================== CONFIGURATION ====================

  /**
   * Get Oracle CX configuration from database
   */
  private async getConfig(): Promise<OracleCXConfig> {
    if (this.configCache && Date.now() < this.configCache.expiresAt) {
      return this.configCache.config;
    }

    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.ORACLE_CX },
    });

    if (!integration || !integration.clientId || !integration.clientSecret) {
      // Fallback to environment variables
      // Oracle CX uses IDCS/IAM for OAuth - URLs are tenant-specific
      // Format: https://idcs-<IDCS_ID>.identity.oraclecloud.com
      const idcsBaseUrl = process.env.ORACLE_CX_IDCS_URL || '';

      const config: OracleCXConfig = {
        clientId: process.env.ORACLE_CX_CLIENT_ID || '',
        clientSecret: process.env.ORACLE_CX_CLIENT_SECRET || '',
        callbackUrl:
          process.env.ORACLE_CX_CALLBACK_URL ||
          'https://engage.iriseller.com/api/oracle-cx/oauth/callback',
        loginUrl:
          process.env.ORACLE_CX_LOGIN_URL ||
          (idcsBaseUrl ? `${idcsBaseUrl}/oauth2/v1/authorize` : ''),
        tokenUrl:
          process.env.ORACLE_CX_TOKEN_URL ||
          (idcsBaseUrl ? `${idcsBaseUrl}/oauth2/v1/token` : ''),
        apiVersion: process.env.ORACLE_CX_API_VERSION || this.DEFAULT_API_VERSION,
      };

      if (!config.clientId || !config.clientSecret) {
        throw new BadRequestException(
          'Oracle CX integration is not configured. Please contact your administrator.',
        );
      }

      if (!config.loginUrl || !config.tokenUrl) {
        throw new BadRequestException(
          'Oracle CX IDCS URLs are not configured. Please set ORACLE_CX_IDCS_URL or configure via Admin Panel.',
        );
      }

      return config;
    }

    // Additional config from JSON field (includes tokenUrl and instanceUrl)
    const additionalConfig = (integration.config as any) || {};

    // Derive token URL from login URL if not explicitly set
    const loginUrl = integration.loginUrl || '';
    const tokenUrl =
      additionalConfig.tokenUrl ||
      (loginUrl ? loginUrl.replace('/authorize', '/token') : '');

    const config: OracleCXConfig = {
      clientId: this.decrypt(integration.clientId),
      clientSecret: this.decrypt(integration.clientSecret),
      callbackUrl:
        integration.callbackUrl ||
        'https://engage.iriseller.com/api/oracle-cx/oauth/callback',
      loginUrl: loginUrl,
      tokenUrl: tokenUrl,
      apiVersion: integration.apiVersion || this.DEFAULT_API_VERSION,
    };

    if (!config.loginUrl || !config.tokenUrl) {
      throw new BadRequestException(
        'Oracle CX IDCS URLs are not configured. Please configure via Admin Panel → CRM Integrations.',
      );
    }

    this.configCache = {
      config,
      expiresAt: Date.now() + this.CONFIG_CACHE_TTL,
    };

    return config;
  }

  /**
   * Check if Oracle CX integration is enabled
   */
  async isEnabled(): Promise<boolean> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.ORACLE_CX },
      select: { isEnabled: true, isConfigured: true },
    });

    if (!integration) {
      return !!(
        process.env.ORACLE_CX_CLIENT_ID && process.env.ORACLE_CX_CLIENT_SECRET
      );
    }

    return integration.isEnabled && integration.isConfigured;
  }

  /**
   * Clear config cache
   */
  clearConfigCache(): void {
    this.configCache = null;
  }

  // ==================== ENCRYPTION ====================

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey),
        iv,
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  // ==================== OAUTH ====================

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const config = await this.getConfig();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: 'openid profile email offline_access',
      state,
    });

    return `${config.loginUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OracleCXTokenResponse> {
    const config = await this.getConfig();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error('Oracle CX token exchange failed:', error);
      throw new BadRequestException(
        error.error_description || 'Failed to exchange code for tokens',
      );
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date; newRefreshToken?: string }> {
    const config = await this.getConfig();

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error('Oracle CX token refresh failed:', error);
      throw new UnauthorizedException(
        'Session expired. Please reconnect to Oracle CX.',
      );
    }

    const tokens: OracleCXTokenResponse = await response.json();

    // Oracle CX tokens typically expire in 1 hour
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    return {
      accessToken: tokens.access_token,
      expiresAt,
      newRefreshToken: tokens.refresh_token,
    };
  }

  /**
   * Get user identity from Oracle CX
   */
  async getUserIdentity(
    accessToken: string,
    instanceUrl: string,
  ): Promise<OracleCXIdentity> {
    // Oracle CX uses /hcmRestApi/resources for user info or /crmRestApi/resources
    // For simplicity, we'll parse from the token or use a resource endpoint
    const response = await fetch(
      `${instanceUrl}/salesApi/resources/latest/salesPartyResources?onlyData=true&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      // If we can't get identity, create a basic one
      this.logger.warn('Could not fetch Oracle CX user identity');
      return {
        userId: 'unknown',
        username: 'Oracle CX User',
        displayName: 'Oracle CX User',
      };
    }

    const data = await response.json();
    const resource = data.items?.[0];

    return {
      userId: resource?.ResourceId?.toString() || 'unknown',
      organizationId: resource?.OrganizationId?.toString(),
      username: resource?.ResourceEmail || resource?.ResourceName || 'Oracle CX User',
      displayName: resource?.ResourceName || 'Oracle CX User',
      email: resource?.ResourceEmail,
    };
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Get Oracle CX connection for a user
   */
  private async getConnection(userId: string) {
    const oracleCXIntegration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.ORACLE_CX },
    });

    if (!oracleCXIntegration) {
      return null;
    }

    return this.prisma.crmConnection.findUnique({
      where: {
        userId_integrationId: {
          userId,
          integrationId: oracleCXIntegration.id,
        },
      },
    });
  }

  /**
   * Store Oracle CX connection for a user
   */
  async storeConnection(
    userId: string,
    tokens: OracleCXTokenResponse,
    identity: OracleCXIdentity,
    instanceUrl: string,
    isSandbox = false,
  ): Promise<void> {
    // Ensure Oracle CX integration exists
    let integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.ORACLE_CX },
    });

    if (!integration) {
      integration = await this.prisma.crmIntegration.create({
        data: {
          provider: CrmProvider.ORACLE_CX,
          name: 'Oracle CX Sales Cloud',
          isEnabled: true,
          isConfigured: true,
        },
      });
    }

    const encryptedAccessToken = this.encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? this.encrypt(tokens.refresh_token)
      : '';

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await this.prisma.crmConnection.upsert({
      where: {
        userId_integrationId: {
          userId,
          integrationId: integration.id,
        },
      },
      update: {
        instanceUrl,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        externalOrgId: identity.organizationId,
        externalUserId: identity.userId,
        username: identity.username,
        displayName: identity.displayName,
        email: identity.email,
        isSandbox,
        isActive: true,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        updatedAt: new Date(),
      },
      create: {
        userId,
        integrationId: integration.id,
        instanceUrl,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        externalOrgId: identity.organizationId,
        externalUserId: identity.userId,
        username: identity.username,
        displayName: identity.displayName,
        email: identity.email,
        isSandbox,
        isActive: true,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        syncSettings: {
          autoSyncOpportunities: true,
          autoSyncAccounts: true,
          autoSyncContacts: true,
          autoSyncLeads: true,
          syncInterval: 15,
          bidirectionalSync: false,
        },
      },
    });

    this.logger.log(
      `Oracle CX connection stored for user ${userId}, org ${identity.organizationId}`,
    );
  }

  /**
   * Get connection status for a user
   */
  async getConnectionStatus(userId: string): Promise<OracleCXConnectionStatus> {
    try {
      const connection = await this.getConnection(userId);

      if (!connection) {
        return { connected: false };
      }

      const isExpired = new Date() > connection.expiresAt;

      return {
        connected: !isExpired && connection.isActive,
        connection: {
          id: connection.id,
          instanceUrl: connection.instanceUrl,
          externalOrgId: connection.externalOrgId || undefined,
          externalUserId: connection.externalUserId || undefined,
          displayName: connection.displayName || undefined,
          isSandbox: connection.isSandbox,
          isActive: connection.isActive,
          connectedAt: connection.createdAt,
          expiresAt: connection.expiresAt,
          lastSyncAt: connection.lastSyncAt || undefined,
          lastError: connection.lastError || undefined,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Oracle CX connection status:', error);
      return { connected: false, error: 'Failed to check connection status' };
    }
  }

  /**
   * Get access token using Client Credentials flow (for admin-level integration)
   * This is used when no user-specific OAuth connection exists
   */
  private clientCredentialsCache: {
    accessToken: string;
    expiresAt: number;
  } | null = null;

  private async getClientCredentialsToken(): Promise<{ accessToken: string; instanceUrl: string }> {
    // Check cache first
    if (this.clientCredentialsCache && Date.now() < this.clientCredentialsCache.expiresAt - 60000) {
      const config = await this.getConfig();
      const integration = await this.prisma.crmIntegration.findUnique({
        where: { provider: CrmProvider.ORACLE_CX },
      });
      const additionalConfig = (integration?.config as any) || {};
      const instanceUrl = additionalConfig.instanceUrl || process.env.ORACLE_CX_INSTANCE_URL || '';

      return {
        accessToken: this.clientCredentialsCache.accessToken,
        instanceUrl,
      };
    }

    const config = await this.getConfig();
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.ORACLE_CX },
    });
    const additionalConfig = (integration?.config as any) || {};
    const instanceUrl = additionalConfig.instanceUrl || process.env.ORACLE_CX_INSTANCE_URL || '';

    if (!instanceUrl) {
      throw new BadRequestException(
        'Oracle CX instance URL is not configured. Please configure via Admin Panel → CRM Sources.',
      );
    }

    this.logger.log('Fetching Oracle CX token using Client Credentials flow...');

    const tokenUrl = config.tokenUrl;
    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    // Get scope from config (stored in integration.config.scope)
    const scopeFromConfig = additionalConfig.scope || 'urn:opc:resource:consumer::all';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: scopeFromConfig,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Client Credentials token request failed: ${response.status} - ${errorText}`);
      throw new UnauthorizedException(
        `Failed to obtain Oracle CX access token: ${response.status}`,
      );
    }

    const tokens: OracleCXTokenResponse = await response.json();

    // Cache the token
    this.clientCredentialsCache = {
      accessToken: tokens.access_token,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
    };

    this.logger.log('Successfully obtained Oracle CX token via Client Credentials flow');

    return {
      accessToken: tokens.access_token,
      instanceUrl,
    };
  }

  /**
   * Get a valid access token
   */
  async getValidAccessToken(
    userId: string,
  ): Promise<{ accessToken: string; instanceUrl: string }> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      // Fall back to Client Credentials flow for admin-level access
      this.logger.log(`No user connection found for ${userId}, using Client Credentials flow`);
      return this.getClientCredentialsToken();
    }

    // Check if token needs refresh
    const needsRefresh =
      new Date() > new Date(connection.expiresAt.getTime() - 5 * 60 * 1000);

    if (needsRefresh && connection.refreshToken) {
      try {
        const decryptedRefreshToken = this.decrypt(connection.refreshToken);
        const { accessToken, expiresAt, newRefreshToken } =
          await this.refreshAccessToken(decryptedRefreshToken);

        const encryptedAccessToken = this.encrypt(accessToken);
        const updateData: any = {
          accessToken: encryptedAccessToken,
          expiresAt,
          updatedAt: new Date(),
        };

        if (newRefreshToken) {
          updateData.refreshToken = this.encrypt(newRefreshToken);
        }

        await this.prisma.crmConnection.update({
          where: { id: connection.id },
          data: updateData,
        });

        return { accessToken, instanceUrl: connection.instanceUrl };
      } catch (error) {
        this.logger.error('Failed to refresh Oracle CX token:', error);
        throw new UnauthorizedException(
          'Session expired. Please reconnect to Oracle CX.',
        );
      }
    }

    return {
      accessToken: this.decrypt(connection.accessToken),
      instanceUrl: connection.instanceUrl,
    };
  }

  /**
   * Disconnect Oracle CX for a user
   */
  async disconnect(userId: string): Promise<void> {
    const connection = await this.getConnection(userId);

    if (connection) {
      // Attempt to revoke the token
      try {
        const accessToken = this.decrypt(connection.accessToken);
        const config = await this.getConfig();
        await fetch(
          `${config.tokenUrl.replace('/token', '/revoke')}?token=${accessToken}`,
          { method: 'POST' },
        );
      } catch (error) {
        this.logger.warn('Failed to revoke Oracle CX token:', error);
      }

      await this.prisma.crmConnection.delete({
        where: { id: connection.id },
      });
    }

    this.logger.log(`Oracle CX disconnected for user ${userId}`);
  }

  // ==================== API OPERATIONS ====================

  /**
   * Track API call and check limits
   */
  private trackApiCall(): void {
    const now = new Date();

    if (now.toDateString() !== this.apiUsage.resetDate.toDateString()) {
      this.logger.log(
        `Resetting daily API counter. Previous day total: ${this.apiUsage.dailyCallCount}`,
      );
      this.apiUsage.dailyCallCount = 0;
      this.apiUsage.resetDate = now;
    }

    this.apiUsage.dailyCallCount++;
    this.apiUsage.lastCallTimestamp = now;

    const usagePercent =
      this.apiUsage.dailyCallCount / this.apiUsage.dailyCallLimit;

    if (usagePercent >= this.apiUsage.warningThreshold) {
      this.logger.warn(
        `Oracle CX API usage at ${(usagePercent * 100).toFixed(1)}% (${this.apiUsage.dailyCallCount}/${this.apiUsage.dailyCallLimit})`,
      );
    }
  }

  /**
   * Check if we should throttle requests
   */
  shouldThrottle(): boolean {
    const usagePercent =
      this.apiUsage.dailyCallCount / this.apiUsage.dailyCallLimit;
    return usagePercent >= 0.95;
  }

  /**
   * Get API usage statistics
   */
  getApiUsageStats(): ApiUsageStats {
    return { ...this.apiUsage };
  }

  /**
   * Query Oracle CX resources
   */
  async query<T = any>(
    userId: string,
    resource: string,
    options?: Partial<OracleCXQueryDto>,
  ): Promise<OracleCXQueryResult<T>> {
    if (this.shouldThrottle()) {
      this.logger.warn('Oracle CX API limit approaching - throttling request');
      throw new Error('Oracle CX API limit approaching. Please try again later.');
    }
    this.trackApiCall();

    const startTime = Date.now();
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    // Build query parameters
    const params = new URLSearchParams();
    params.set('onlyData', 'true');

    if (options?.limit) {
      params.set('limit', options.limit.toString());
    }
    if (options?.offset) {
      params.set('offset', options.offset.toString());
    }
    if (options?.fields) {
      // Handle both string (comma-separated) and array formats
      const fieldsStr = Array.isArray(options.fields)
        ? options.fields.join(',')
        : options.fields;
      if (fieldsStr) {
        params.set('fields', fieldsStr);
      }
    }
    if (options?.orderBy) {
      params.set('orderBy', options.orderBy);
    }
    if (options?.q) {
      params.set('q', options.q);
    }
    if (options?.filters) {
      // Handle filters - check if 'q' contains a direct SCIM query
      if (options.filters.q && typeof options.filters.q === 'string') {
        // Direct SCIM filter syntax (e.g., "Name co 'John'")
        const existingQ = params.get('q');
        params.set('q', existingQ ? `${existingQ};${options.filters.q}` : options.filters.q);
      } else {
        // Convert other filters to Oracle CX q parameter format (e.g., { StatusCode: 'QUALIFIED' })
        const filterClauses = Object.entries(options.filters)
          .filter(([key]) => key !== 'q') // Skip 'q' key if present
          .map(([key, value]) => `${key}=${value}`)
          .join(';');
        if (filterClauses) {
          const existingQ = params.get('q');
          params.set('q', existingQ ? `${existingQ};${filterClauses}` : filterClauses);
        }
      }
    }

    // Remove trailing slash from instanceUrl to avoid double slashes
    const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
    const url = `${baseUrl}/salesApi/resources/${config.apiVersion}/${endpoint}?${params.toString()}`;
    this.logger.log(`Oracle CX query URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;
    const success = response.ok;

    this.usageTrackingService
      .logUsage({
        userId,
        serviceType: ApiServiceType.ORACLE_CX,
        serviceName: 'oracle-cx-api',
        operation: `query_${resource}`,
        apiCalls: 1,
        latencyMs,
        success,
        metadata: { resource, instanceUrl },
      })
      .catch((err) =>
        this.logger.error(`Failed to log Oracle CX usage: ${err.message}`),
      );

    if (!response.ok) {
      const errorText = await response.text();
      let error: any = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { rawError: errorText };
      }
      const errorMessage =
        error.detail || error.title || error.message || error.rawError || 'Oracle CX query failed';
      this.logger.error(`Oracle CX query error (${response.status}): ${errorMessage}`, {
        resource,
        status: response.status,
        url: url,
        errorBody: errorText.substring(0, 500)
      });
      throw new Error(`Oracle CX query failed (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();

    return {
      items: result.items || [],
      totalResults: result.totalResults || result.items?.length || 0,
      offset: result.offset || 0,
      limit: result.limit || options?.limit || 50,
      hasMore: result.hasMore || false,
      count: result.count || result.items?.length || 0,
    };
  }

  /**
   * Get a single record by ID
   */
  async getById<T = any>(
    userId: string,
    resource: string,
    recordId: string,
    fields?: string[],
  ): Promise<T | null> {
    if (this.shouldThrottle()) {
      throw new Error('Oracle CX API limit approaching. Please try again later.');
    }
    this.trackApiCall();

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    const params = new URLSearchParams({ onlyData: 'true' });
    if (fields && fields.length > 0) {
      params.set('fields', fields.join(','));
    }

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}/${endpoint}/${recordId}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to get Oracle CX record');
    }

    return response.json();
  }

  /**
   * Create a record in Oracle CX
   */
  async create(
    userId: string,
    resource: string,
    data: Record<string, any>,
  ): Promise<OracleCXCreateResult> {
    if (this.shouldThrottle()) {
      throw new Error('Oracle CX API limit approaching. Please try again later.');
    }
    this.trackApiCall();

    const startTime = Date.now();
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}/${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    const latencyMs = Date.now() - startTime;
    const success = response.ok;

    this.usageTrackingService
      .logUsage({
        userId,
        serviceType: ApiServiceType.ORACLE_CX,
        serviceName: 'oracle-cx-api',
        operation: `create_${resource}`,
        apiCalls: 1,
        latencyMs,
        success,
        metadata: { resource },
      })
      .catch((err) =>
        this.logger.error(`Failed to log Oracle CX usage: ${err.message}`),
      );

    if (!response.ok) {
      const errorText = await response.text();
      let error: any = {};
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { rawError: errorText };
      }
      const errorMessage =
        error.detail || error.title || error.message || error.rawError || 'Failed to create Oracle CX record';
      this.logger.error(`Oracle CX create error (${response.status}): ${errorMessage}`, {
        resource,
        url,
        data,
        statusCode: response.status,
        fullError: errorText.substring(0, 1000),
      });
      throw new Error(`Oracle CX create failed (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();

    // Extract ID from response (Oracle CX returns different ID fields per resource)
    const idField = this.getIdFieldForResource(resource);
    const id = result[idField]?.toString() || result.id?.toString() || '';

    return {
      id,
      links: result.links,
    };
  }

  /**
   * Update a record in Oracle CX
   */
  async update(
    userId: string,
    resource: string,
    recordId: string,
    data: Record<string, any>,
  ): Promise<void> {
    if (this.shouldThrottle()) {
      throw new Error('Oracle CX API limit approaching. Please try again later.');
    }
    this.trackApiCall();

    const startTime = Date.now();
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}/${endpoint}/${recordId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    const latencyMs = Date.now() - startTime;
    const success = response.ok;

    this.usageTrackingService
      .logUsage({
        userId,
        serviceType: ApiServiceType.ORACLE_CX,
        serviceName: 'oracle-cx-api',
        operation: `update_${resource}`,
        apiCalls: 1,
        latencyMs,
        success,
        metadata: { resource, recordId },
      })
      .catch((err) =>
        this.logger.error(`Failed to log Oracle CX usage: ${err.message}`),
      );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage =
        error.detail || error.title || 'Failed to update Oracle CX record';
      this.logger.error(`Oracle CX update error: ${errorMessage}`, {
        resource,
        recordId,
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a record in Oracle CX
   */
  async delete(userId: string, resource: string, recordId: string): Promise<void> {
    if (this.shouldThrottle()) {
      throw new Error('Oracle CX API limit approaching. Please try again later.');
    }
    this.trackApiCall();

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}/${endpoint}/${recordId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({}));
      const errorMessage =
        error.detail || error.title || 'Failed to delete Oracle CX record';
      this.logger.error(`Oracle CX delete error: ${errorMessage}`, {
        resource,
        recordId,
      });
      throw new Error(errorMessage);
    }
  }

  // ==================== SCHEMA DISCOVERY ====================

  /**
   * Describe a resource schema (with caching)
   */
  async describeResource(
    userId: string,
    resource: string,
  ): Promise<any> {
    // Check cache first
    const cacheKey = `schema_${resource}`;
    const cached = this.schemaCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`Using cached schema for ${resource}`);
      return cached.schema;
    }

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const endpoint = RESOURCE_ENDPOINTS[resource] || resource;
    const config = await this.getConfig();

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}/${endpoint}/describe`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // Try alternate describe endpoint
      const altUrl = `${instanceUrl}/salesApi/resources/${config.apiVersion}/describe/${endpoint}`;
      const altResponse = await fetch(altUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!altResponse.ok) {
        throw new Error(`Failed to describe resource: ${resource}`);
      }

      const schema = await altResponse.json();
      // Cache the schema
      this.schemaCache.set(cacheKey, {
        schema,
        expiresAt: Date.now() + this.SCHEMA_CACHE_TTL,
      });
      return schema;
    }

    const schema = await response.json();
    // Cache the schema
    this.schemaCache.set(cacheKey, {
      schema,
      expiresAt: Date.now() + this.SCHEMA_CACHE_TTL,
    });
    return schema;
  }

  /**
   * Get writable fields for a resource (for create/update operations)
   */
  async getWritableFields(
    userId: string,
    resource: string,
  ): Promise<{ name: string; type: string; required: boolean; description?: string }[]> {
    const schema = await this.describeResource(userId, resource);

    // Extract attributes from schema
    const resources = schema?.Resources || {};
    const resourceSchema = resources[resource] || {};
    const attributes = resourceSchema.attributes || schema.attributes || [];

    return attributes
      .filter((attr: any) => attr.updatable === true)
      .map((attr: any) => ({
        name: attr.name,
        type: attr.type || 'string',
        required: attr.mandatory === true || attr.inputRequired === true,
        description: attr.title || attr.annotations?.description,
      }));
  }

  /**
   * Get all available resources
   */
  async describeAll(userId: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
    const config = await this.getConfig();

    const url = `${instanceUrl}/salesApi/resources/${config.apiVersion}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Oracle CX resource catalog');
    }

    return response.json();
  }

  // ==================== SYNC SETTINGS ====================

  /**
   * Get sync settings for a user
   */
  async getSyncSettings(userId: string): Promise<OracleCXSyncSettingsDto> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new UnauthorizedException('No Oracle CX connection found');
    }

    const settings = (connection.syncSettings as any) || {};

    return {
      autoSyncOpportunities: settings.autoSyncOpportunities ?? true,
      autoSyncAccounts: settings.autoSyncAccounts ?? true,
      autoSyncContacts: settings.autoSyncContacts ?? true,
      autoSyncLeads: settings.autoSyncLeads ?? true,
      bidirectionalSync: settings.bidirectionalSync ?? false,
      syncInterval: settings.syncInterval ?? 15,
    };
  }

  /**
   * Update sync settings for a user
   */
  async updateSyncSettings(
    userId: string,
    settings: OracleCXSyncSettingsDto,
  ): Promise<void> {
    const connection = await this.getConnection(userId);

    if (!connection) {
      throw new UnauthorizedException('No Oracle CX connection found');
    }

    const currentSettings = (connection.syncSettings as any) || {};

    await this.prisma.crmConnection.update({
      where: { id: connection.id },
      data: {
        syncSettings: { ...currentSettings, ...settings },
        updatedAt: new Date(),
      },
    });
  }

  // ==================== TEST CONNECTION ====================

  /**
   * Test the Oracle CX connection
   */
  async testConnection(
    userId: string,
  ): Promise<{ success: boolean; message: string; orgInfo?: any }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      const config = await this.getConfig();

      // Query a simple resource to verify connection
      const response = await fetch(
        `${instanceUrl}/salesApi/resources/${config.apiVersion}/opportunities?limit=1&onlyData=true`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        return { success: false, message: 'Failed to query Oracle CX' };
      }

      const connection = await this.getConnection(userId);

      return {
        success: true,
        message: 'Connection successful',
        orgInfo: {
          instanceUrl,
          displayName: connection?.displayName,
          externalOrgId: connection?.externalOrgId,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get the ID field name for a resource
   */
  private getIdFieldForResource(resource: string): string {
    const idFields: Record<string, string> = {
      opportunities: 'OptyId',
      accounts: 'PartyId',
      contacts: 'PartyId',
      leads: 'LeadId',
      activities: 'ActivityId',
      tasks: 'TaskId',
      revenues: 'RevenueId',
      notes: 'NoteId',
    };
    return idFields[resource] || 'Id';
  }

  /**
   * Build Oracle CX Lightning URL for a record
   */
  buildRecordUrl(
    instanceUrl: string,
    resource: string,
    recordId: string,
  ): string {
    // Oracle CX Sales Cloud URL pattern
    return `${instanceUrl}/fscmUI/faces/deeplink?objType=${resource}&objKey=${recordId}&action=view`;
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * List opportunities with optional filters
   */
  async listOpportunities(
    userId: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: string;
      stage?: string;
      minAmount?: number;
      search?: string;
    },
  ): Promise<OracleCXQueryResult<OracleCXOpportunity>> {
    const queryFilters: Record<string, any> = {};
    let q = '';

    if (filters?.status) {
      queryFilters.StatusCode = filters.status;
    }
    if (filters?.stage) {
      queryFilters.SalesStage = filters.stage;
    }
    if (filters?.minAmount) {
      q = `Revenue >= ${filters.minAmount}`;
    }
    if (filters?.search) {
      q = q ? `${q};Name LIKE '*${filters.search}*'` : `Name LIKE '*${filters.search}*'`;
    }

    return this.query<OracleCXOpportunity>(userId, 'opportunities', {
      limit,
      offset,
      filters: queryFilters,
      q: q || undefined,
      orderBy: 'LastUpdateDate:desc',
    });
  }

  /**
   * List accounts with optional filters
   */
  async listAccounts(
    userId: string,
    limit = 50,
    offset = 0,
    filters?: {
      industry?: string;
      search?: string;
    },
  ): Promise<OracleCXQueryResult<OracleCXAccount>> {
    const queryFilters: Record<string, any> = {};
    let q = '';

    if (filters?.industry) {
      queryFilters.Industry = filters.industry;
    }
    if (filters?.search) {
      q = `PartyName LIKE '*${filters.search}*'`;
    }

    return this.query<OracleCXAccount>(userId, 'accounts', {
      limit,
      offset,
      filters: queryFilters,
      q: q || undefined,
      orderBy: 'LastUpdateDate:desc',
    });
  }

  /**
   * List contacts with optional filters
   */
  async listContacts(
    userId: string,
    limit = 50,
    offset = 0,
    filters?: {
      accountId?: string;
      search?: string;
    },
  ): Promise<OracleCXQueryResult<OracleCXContact>> {
    const queryFilters: Record<string, any> = {};
    let q = '';

    if (filters?.accountId) {
      queryFilters.AccountId = filters.accountId;
    }
    if (filters?.search) {
      q = `PartyName LIKE '*${filters.search}*'`;
    }

    return this.query<OracleCXContact>(userId, 'contacts', {
      limit,
      offset,
      filters: queryFilters,
      q: q || undefined,
      orderBy: 'LastUpdateDate:desc',
    });
  }

  /**
   * List leads with optional filters
   */
  async listLeads(
    userId: string,
    limit = 50,
    offset = 0,
    filters?: {
      status?: string;
      rating?: string;
      search?: string;
    },
  ): Promise<OracleCXQueryResult<OracleCXLead>> {
    const queryFilters: Record<string, any> = {};
    let q = '';

    if (filters?.status) {
      queryFilters.StatusCode = filters.status;
    }
    if (filters?.rating) {
      queryFilters.RankCode = filters.rating;
    }
    if (filters?.search) {
      q = `Name LIKE '*${filters.search}*'`;
    }

    return this.query<OracleCXLead>(userId, 'leads', {
      limit,
      offset,
      filters: queryFilters,
      q: q || undefined,
      orderBy: 'LastUpdateDate:desc',
    });
  }

  /**
   * Get activities for an entity
   */
  async getActivities(
    userId: string,
    entityId: string,
    entityType: 'opportunity' | 'account' | 'contact' | 'lead',
    limit = 50,
  ): Promise<OracleCXQueryResult<OracleCXActivity>> {
    const filterField =
      entityType === 'opportunity'
        ? 'OptyId'
        : entityType === 'account'
          ? 'AccountId'
          : entityType === 'contact'
            ? 'ContactId'
            : 'LeadId';

    return this.query<OracleCXActivity>(userId, 'activities', {
      limit,
      filters: { [filterField]: entityId },
      orderBy: 'LastUpdateDate:desc',
    });
  }

  /**
   * Get dashboard statistics from Oracle CX
   */
  async getDashboardStats(userId: string): Promise<{
    opportunities: { total: number; openValue: number };
    leads: { total: number; qualified: number };
    accounts: { total: number };
    activities: { total: number; overdue: number };
  }> {
    try {
      const [opportunities, leads, accounts, activities] = await Promise.all([
        this.query(userId, 'opportunities', { limit: 1 }),
        this.query(userId, 'leads', { limit: 1 }),
        this.query(userId, 'accounts', { limit: 1 }),
        this.query(userId, 'activities', { limit: 1 }),
      ]);

      return {
        opportunities: {
          total: opportunities.totalResults,
          openValue: 0, // Would need aggregation query
        },
        leads: {
          total: leads.totalResults,
          qualified: 0, // Would need filtered query
        },
        accounts: {
          total: accounts.totalResults,
        },
        activities: {
          total: activities.totalResults,
          overdue: 0, // Would need filtered query
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get dashboard stats: ${error.message}`);
      return {
        opportunities: { total: 0, openValue: 0 },
        leads: { total: 0, qualified: 0 },
        accounts: { total: 0 },
        activities: { total: 0, overdue: 0 },
      };
    }
  }
}
