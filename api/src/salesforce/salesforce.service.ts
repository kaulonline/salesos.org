import { Injectable, Logger, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CrmProvider, ApiServiceType } from '@prisma/client';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsageTrackingService } from '../admin/usage-tracking.service';
import { IdValidator } from '../common/validators/id.validator';

// Salesforce OAuth configuration (now loaded from database)
interface SalesforceConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  loginUrl: string;
  apiVersion: string;
}

// Token response from Salesforce
interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  scope?: string;
}

// User identity from Salesforce
interface SalesforceIdentity {
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
  photos?: {
    picture: string;
    thumbnail: string;
  };
}

// Salesforce API Usage Tracking
interface ApiUsageStats {
  dailyCallCount: number;
  dailyCallLimit: number;
  resetDate: Date;
  lastCallTimestamp: Date;
  warningThreshold: number; // Percentage (0.8 = 80%)
}

@Injectable()
export class SalesforceService implements OnModuleInit {
  private readonly logger = new Logger(SalesforceService.name);
  private readonly encryptionKey: string;
  private readonly DEFAULT_API_VERSION = 'v59.0';

  /**
   * SOQL Injection Protection
   * Escapes user input for safe use in SOQL queries
   * - Escapes single quotes (replace ' with \')
   * - Escapes backslashes (replace \ with \\)
   * - Validates against SOQL injection patterns
   * - Handles null/undefined safely
   */
  private escapeSoql(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string if not already
    const str = String(value);

    // Check for potential SOQL injection patterns
    const dangerousPatterns = [
      /\bOR\b.*=.*'/i,           // OR clause injection
      /\bAND\b.*=.*'/i,          // AND clause injection
      /\bUNION\b/i,              // UNION injection (SOQL doesn't support but good to block)
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/i, // SQL keywords
      /--/,                       // SQL comment
      /\/\*/,                     // Block comment start
      /\*\//,                     // Block comment end
      /;/,                        // Statement terminator
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(str)) {
        this.logger.warn(`Potential SOQL injection attempt detected: ${str.substring(0, 100)}`);
        // Remove the dangerous pattern or return sanitized version
        // For safety, we'll still escape and continue, but log the warning
      }
    }

    // Escape backslashes first, then single quotes
    // This order is important to avoid double-escaping
    return str
      .replace(/\\/g, '\\\\')    // Escape backslashes
      .replace(/'/g, "\\'");     // Escape single quotes
  }

  /**
   * Validates and escapes a Salesforce ID for use in SOQL queries
   * Salesforce IDs are either 15 or 18 alphanumeric characters
   */
  private escapeSoqlId(id: string | null | undefined): string {
    if (id === null || id === undefined) {
      return '';
    }

    const str = String(id).trim();

    // Validate Salesforce ID format (15 or 18 alphanumeric characters)
    if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(str)) {
      this.logger.warn(`Invalid Salesforce ID format: ${str.substring(0, 50)}`);
      throw new BadRequestException('Invalid Salesforce ID format');
    }

    return str;
  }

  /**
   * Escapes a value for use in SOQL LIKE clauses
   * Additionally escapes LIKE wildcards (% and _) if they should be literal
   */
  private escapeSoqlLike(value: string | null | undefined, escapeWildcards: boolean = false): string {
    if (value === null || value === undefined) {
      return '';
    }

    let escaped = this.escapeSoql(value);

    if (escapeWildcards) {
      // Escape LIKE special characters
      escaped = escaped
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    }

    return escaped;
  }
  
  // Cache for config to avoid DB hits on every request
  private configCache: { config: SalesforceConfig; expiresAt: number } | null = null;
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Proactive token refresh configuration
  private readonly TOKEN_REFRESH_BUFFER_MINUTES = 15; // Refresh 15 minutes before expiry
  private tokenRefreshInProgress = new Set<string>(); // Track ongoing refreshes to prevent duplicates
  
  // API usage tracking for rate limit management
  private apiUsage: ApiUsageStats = {
    dailyCallCount: 0,
    dailyCallLimit: 100000, // Enterprise default, updated from Salesforce limits API
    resetDate: new Date(),
    lastCallTimestamp: new Date(),
    warningThreshold: 0.8, // Warn at 80% usage
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {
    // Get encryption key from environment (must be 32 hex chars for AES-256)
    const key = process.env.ENCRYPTION_KEY || process.env.CRM_ENCRYPTION_KEY || process.env.SALESFORCE_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for Salesforce credential encryption');
    }
    this.encryptionKey = key.slice(0, 32);
  }

  /**
   * On module initialization, run an initial token refresh check
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('SalesforceService initialized - scheduling proactive token refresh');
    // Run initial check after a short delay to let the app fully start
    setTimeout(() => this.proactiveTokenRefresh(), 10000);
  }

  /**
   * Proactive Token Refresh - Runs every 10 minutes
   * Checks all Salesforce connections and refreshes tokens that are close to expiring
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async proactiveTokenRefresh(): Promise<void> {
    try {
      // Find all connections that will expire within the buffer time
      const bufferTime = new Date(Date.now() + this.TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000);
      
      const expiringConnections = await this.prisma.salesforceConnection.findMany({
        where: {
          expiresAt: {
            lte: bufferTime, // Token expires within buffer time
            gt: new Date(),   // But hasn't expired yet
          },
        },
        select: {
          id: true,
          userId: true,
          refreshToken: true,
          expiresAt: true,
          username: true,
        },
      });

      if (expiringConnections.length === 0) {
        return; // No tokens need refresh
      }

      this.logger.log(`Proactive token refresh: Found ${expiringConnections.length} connection(s) expiring soon`);

      for (const connection of expiringConnections) {
        // Skip if already refreshing this connection
        if (this.tokenRefreshInProgress.has(connection.id)) {
          this.logger.debug(`Skipping ${connection.username} - refresh already in progress`);
          continue;
        }

        try {
          this.tokenRefreshInProgress.add(connection.id);
          
          const minutesUntilExpiry = Math.round((connection.expiresAt.getTime() - Date.now()) / 60000);
          this.logger.log(`Refreshing token for ${connection.username} (expires in ${minutesUntilExpiry} minutes)`);
          
          // Decrypt refresh token
          const decryptedRefreshToken = this.decrypt(connection.refreshToken);
          
          // Refresh the token
          const { accessToken, expiresAt } = await this.refreshAccessToken(decryptedRefreshToken);
          
          // Store the new access token
          const encryptedAccessToken = this.encrypt(accessToken);
          await this.prisma.salesforceConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: encryptedAccessToken,
              expiresAt,
              updatedAt: new Date(),
            },
          });

          this.logger.log(`Successfully refreshed token for ${connection.username} - new expiry: ${expiresAt.toISOString()}`);
        } catch (error: any) {
          this.logger.error(`Failed to refresh token for ${connection.username}: ${error.message}`);
          // Don't throw - continue with other connections
        } finally {
          this.tokenRefreshInProgress.delete(connection.id);
        }
      }
    } catch (error: any) {
      this.logger.error(`Proactive token refresh error: ${error.message}`);
    }
  }

  /**
   * Clean up expired OAuth states periodically
   * Runs every 5 minutes to remove expired OAuth state entries
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredOAuthStates(): Promise<void> {
    try {
      const result = await this.prisma.oAuthState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired OAuth state(s)`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to clean up OAuth states: ${error.message}`);
    }
  }

  /**
   * Force refresh a specific user's token (can be called externally)
   */
  async forceRefreshToken(userId: string): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
    try {
      const connection = await this.prisma.salesforceConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return { success: false, error: 'No Salesforce connection found' };
      }

      const decryptedRefreshToken = this.decrypt(connection.refreshToken);
      const { accessToken, expiresAt } = await this.refreshAccessToken(decryptedRefreshToken);
      
      const encryptedAccessToken = this.encrypt(accessToken);
      await this.prisma.salesforceConnection.update({
        where: { userId },
        data: {
          accessToken: encryptedAccessToken,
          expiresAt,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Force refreshed token for user ${userId} - new expiry: ${expiresAt.toISOString()}`);
      return { success: true, expiresAt };
    } catch (error: any) {
      this.logger.error(`Force refresh failed for user ${userId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a user's token needs refresh and refresh it if needed
   * Returns true if token is valid (either already valid or successfully refreshed)
   */
  async ensureValidToken(userId: string): Promise<boolean> {
    try {
      const connection = await this.prisma.salesforceConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return false;
      }

      // Check if token expires within buffer time
      const bufferTime = new Date(Date.now() + this.TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000);
      
      if (connection.expiresAt <= bufferTime) {
        this.logger.debug(`Token for user ${userId} needs refresh (expires: ${connection.expiresAt.toISOString()})`);
        const result = await this.forceRefreshToken(userId);
        return result.success;
      }

      return true; // Token is still valid
    } catch (error: any) {
      this.logger.error(`ensureValidToken failed for user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get Salesforce configuration from database
   */
  private async getConfig(): Promise<SalesforceConfig> {
    // Check cache first
    if (this.configCache && Date.now() < this.configCache.expiresAt) {
      return this.configCache.config;
    }

    // Load from database
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.SALESFORCE }
    });

    if (!integration || !integration.clientId || !integration.clientSecret) {
      // Fallback to environment variables for backward compatibility
      const config: SalesforceConfig = {
        clientId: process.env.SALESFORCE_CLIENT_ID || '',
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
        callbackUrl: process.env.SALESFORCE_CALLBACK_URL || 'https://engage.iriseller.com/api/salesforce/oauth/callback',
        loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        apiVersion: process.env.SALESFORCE_API_VERSION || 'v59.0',
      };
      
      if (!config.clientId || !config.clientSecret) {
        throw new BadRequestException('Salesforce integration is not configured. Please contact your administrator.');
      }
      
      return config;
    }

    // Decrypt credentials from database
    const config: SalesforceConfig = {
      clientId: this.decrypt(integration.clientId),
      clientSecret: this.decrypt(integration.clientSecret),
      callbackUrl: integration.callbackUrl || 'https://engage.iriseller.com/api/salesforce/oauth/callback',
      loginUrl: integration.loginUrl || 'https://login.salesforce.com',
      apiVersion: integration.apiVersion || 'v59.0',
    };

    // Cache the config
    this.configCache = {
      config,
      expiresAt: Date.now() + this.CONFIG_CACHE_TTL,
    };

    return config;
  }

  /**
   * Check if Salesforce integration is enabled
   */
  async isEnabled(): Promise<boolean> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider: CrmProvider.SALESFORCE },
      select: { isEnabled: true, isConfigured: true }
    });

    // If no DB config, check env variables
    if (!integration) {
      return !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
    }

    return integration.isEnabled && integration.isConfigured;
  }

  /**
   * Clear config cache (called when admin updates settings)
   */
  clearConfigCache(): void {
    this.configCache = null;
  }

  /**
   * Track API call and check limits
   * Call this before every Salesforce API request
   */
  private trackApiCall(): void {
    const now = new Date();
    
    // Reset daily counter if it's a new day
    if (now.toDateString() !== this.apiUsage.resetDate.toDateString()) {
      this.logger.log(`Resetting daily API counter. Previous day total: ${this.apiUsage.dailyCallCount}`);
      this.apiUsage.dailyCallCount = 0;
      this.apiUsage.resetDate = now;
    }
    
    this.apiUsage.dailyCallCount++;
    this.apiUsage.lastCallTimestamp = now;
    
    // Calculate usage percentage
    const usagePercent = this.apiUsage.dailyCallCount / this.apiUsage.dailyCallLimit;
    
    // Warn at threshold
    if (usagePercent >= this.apiUsage.warningThreshold) {
      this.logger.warn(
        `Salesforce API usage at ${(usagePercent * 100).toFixed(1)}% ` +
        `(${this.apiUsage.dailyCallCount}/${this.apiUsage.dailyCallLimit})`
      );
    }
    
    // Log every 1000 calls for monitoring
    if (this.apiUsage.dailyCallCount % 1000 === 0) {
      this.logger.log(
        `Salesforce API calls today: ${this.apiUsage.dailyCallCount}/${this.apiUsage.dailyCallLimit}`
      );
    }
  }

  /**
   * Check if we're approaching API limits
   * Returns true if we should throttle requests
   */
  shouldThrottle(): boolean {
    const usagePercent = this.apiUsage.dailyCallCount / this.apiUsage.dailyCallLimit;
    return usagePercent >= 0.95; // Throttle at 95% usage
  }

  /**
   * Get current API usage statistics
   */
  getApiUsageStats(): ApiUsageStats {
    return { ...this.apiUsage };
  }

  /**
   * Update API limits from Salesforce (call periodically)
   */
  async refreshApiLimits(userId: string): Promise<void> {
    try {
      const limits = await this.getOrgLimits(userId);
      if (limits?.DailyApiRequests) {
        this.apiUsage.dailyCallLimit = limits.DailyApiRequests.Max;
        this.apiUsage.dailyCallCount = limits.DailyApiRequests.Max - limits.DailyApiRequests.Remaining;
        this.logger.log(
          `Updated API limits from Salesforce: ${this.apiUsage.dailyCallCount}/${this.apiUsage.dailyCallLimit}`
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to refresh API limits: ${error.message}`);
    }
  }

  /**
   * Get API version from config
   */
  private async getApiVersion(): Promise<string> {
    const config = await this.getConfig();
    return config.apiVersion;
  }

  /**
   * Encrypt sensitive data before storing
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(text: string): string {
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    const config = await this.getConfig();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: 'api refresh_token offline_access',
      state,
      prompt: 'login consent',
    });

    return `${config.loginUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<SalesforceTokenResponse> {
    const config = await this.getConfig();
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
    });

    const response = await fetch(`${config.loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error('Token exchange failed:', error);
      throw new BadRequestException(error.error_description || 'Failed to exchange code for tokens');
    }

    return response.json();
  }

  /**
   * Get user identity from Salesforce
   */
  async getUserIdentity(accessToken: string, identityUrl: string): Promise<SalesforceIdentity> {
    const response = await fetch(identityUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user identity');
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const config = await this.getConfig();
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(`${config.loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Session expired. Please reconnect to Salesforce.');
    }

    const tokens = await response.json();
    
    // Salesforce access tokens typically expire in 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    return {
      accessToken: tokens.access_token,
      expiresAt,
    };
  }

  /**
   * Store Salesforce connection for a user
   */
  async storeConnection(
    userId: string,
    tokens: SalesforceTokenResponse,
    identity: SalesforceIdentity
  ): Promise<void> {
    const isSandbox = tokens.instance_url.includes('test.salesforce.com') || 
                      tokens.instance_url.includes('.sandbox.');

    // Encrypt tokens before storing
    const encryptedAccessToken = this.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.encrypt(tokens.refresh_token);

    // Calculate expiration (2 hours from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await this.prisma.salesforceConnection.upsert({
      where: { userId },
      update: {
        instanceUrl: tokens.instance_url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        orgId: identity.organization_id,
        username: identity.username,
        displayName: identity.display_name,
        email: identity.email,
        isSandbox,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        updatedAt: new Date(),
      },
      create: {
        userId,
        instanceUrl: tokens.instance_url,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        orgId: identity.organization_id,
        username: identity.username,
        displayName: identity.display_name,
        email: identity.email,
        isSandbox,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        syncSettings: {
          autoSyncLeads: true,
          autoSyncOpportunities: true,
          autoSyncContacts: true,
          autoSyncAccounts: true,
          syncInterval: 15,
          bidirectionalSync: false,
        },
      },
    });

    this.logger.log(`Salesforce connection stored for user ${userId}, org ${identity.organization_id}`);
  }

  /**
   * Get connection status for a user
   */
  async getConnectionStatus(userId: string): Promise<{
    connected: boolean;
    connection?: {
      id: string;
      instanceUrl: string;
      orgId: string;
      username: string;
      displayName?: string;
      email?: string;
      isSandbox: boolean;
      isConnected: boolean;
      connectedAt?: Date;
      expiresAt?: Date;
      scopes?: string[];
    };
    error?: string;
  }> {
    try {
      const connection = await this.prisma.salesforceConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return { connected: false };
      }

      // Check if token is expired
      const isExpired = new Date() > connection.expiresAt;

      return {
        connected: !isExpired,
        connection: {
          id: connection.id,
          instanceUrl: connection.instanceUrl,
          orgId: connection.orgId,
          username: connection.username,
          displayName: connection.displayName || undefined,
          email: connection.email || undefined,
          isSandbox: connection.isSandbox,
          isConnected: !isExpired,
          connectedAt: connection.createdAt,
          expiresAt: connection.expiresAt,
          scopes: connection.scopes,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get connection status:', error);
      return { connected: false, error: 'Failed to check connection status' };
    }
  }

  /**
   * Get a valid access token (refreshing if needed)
   */
  async getValidAccessToken(userId: string): Promise<{ accessToken: string; instanceUrl: string }> {
    const connection = await this.prisma.salesforceConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('No Salesforce connection found');
    }

    // Check if token needs refresh (refresh 5 minutes before expiry)
    const needsRefresh = new Date() > new Date(connection.expiresAt.getTime() - 5 * 60 * 1000);

    if (needsRefresh) {
      try {
        const decryptedRefreshToken = this.decrypt(connection.refreshToken);
        const { accessToken, expiresAt } = await this.refreshAccessToken(decryptedRefreshToken);
        
        // Store the new access token
        const encryptedAccessToken = this.encrypt(accessToken);
        await this.prisma.salesforceConnection.update({
          where: { userId },
          data: {
            accessToken: encryptedAccessToken,
            expiresAt,
            updatedAt: new Date(),
          },
        });

        return { accessToken, instanceUrl: connection.instanceUrl };
      } catch (error) {
        this.logger.error('Failed to refresh token:', error);
        throw new UnauthorizedException('Session expired. Please reconnect to Salesforce.');
      }
    }

    return {
      accessToken: this.decrypt(connection.accessToken),
      instanceUrl: connection.instanceUrl,
    };
  }

  /**
   * Disconnect Salesforce for a user
   */
  async disconnect(userId: string): Promise<void> {
    const connection = await this.prisma.salesforceConnection.findUnique({
      where: { userId },
    });

    if (connection) {
      // Attempt to revoke the token on Salesforce side
      try {
        const accessToken = this.decrypt(connection.accessToken);
        await fetch(`${connection.instanceUrl}/services/oauth2/revoke?token=${accessToken}`, {
          method: 'POST',
        });
      } catch (error) {
        this.logger.warn('Failed to revoke Salesforce token:', error);
      }

      // Delete the connection record
      await this.prisma.salesforceConnection.delete({
        where: { userId },
      });
    }

    this.logger.log(`Salesforce disconnected for user ${userId}`);
  }

  /**
   * Get the Salesforce instance URL for a user
   */
  async getInstanceUrl(userId: string): Promise<string> {
    const { instanceUrl } = await this.getValidAccessToken(userId);
    return instanceUrl;
  }

  /**
   * Build a Lightning URL for a Salesforce record
   */
  buildLightningUrl(instanceUrl: string, sobjectType: string, recordId: string): string {
    return `${instanceUrl}/lightning/r/${sobjectType}/${recordId}/view`;
  }

  /**
   * Test the Salesforce connection
   */
  async testConnection(userId: string): Promise<{ success: boolean; message: string; orgInfo?: any }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Query organization info
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/query?q=SELECT+Id,Name,OrganizationType,IsSandbox+FROM+Organization`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return { success: false, message: 'Failed to query Salesforce' };
      }

      const result = await response.json();
      const org = result.records?.[0];

      return {
        success: true,
        message: 'Connection successful',
        orgInfo: org ? {
          name: org.Name,
          type: org.OrganizationType,
          isSandbox: org.IsSandbox,
        } : undefined,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  /**
   * Get sync settings for a user
   */
  async getSyncSettings(userId: string): Promise<any> {
    const connection = await this.prisma.salesforceConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('No Salesforce connection found');
    }

    return connection.syncSettings || {
      autoSyncLeads: true,
      autoSyncOpportunities: true,
      autoSyncContacts: true,
      autoSyncAccounts: true,
      syncInterval: 15,
      bidirectionalSync: false,
    };
  }

  /**
   * Update sync settings for a user
   */
  async updateSyncSettings(userId: string, settings: any): Promise<void> {
    const connection = await this.prisma.salesforceConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      throw new UnauthorizedException('No Salesforce connection found');
    }

    const currentSettings = connection.syncSettings as any || {};
    
    await this.prisma.salesforceConnection.update({
      where: { userId },
      data: {
        syncSettings: { ...currentSettings, ...settings },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Execute a SOQL query against Salesforce
   */
  async query(userId: string, soql: string): Promise<any> {
    // Check if we should throttle due to API limits
    if (this.shouldThrottle()) {
      this.logger.warn('Salesforce API limit approaching - throttling request');
      throw new Error('Salesforce API limit approaching. Please try again later.');
    }
    this.trackApiCall();
    
    const startTime = Date.now();

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const latencyMs = Date.now() - startTime;
    const success = response.ok;
    
    // Track Salesforce API usage
    this.usageTrackingService.logUsage({
      userId,
      serviceType: ApiServiceType.SALESFORCE,
      serviceName: 'salesforce-api',
      operation: 'query',
      apiCalls: 1,
      latencyMs,
      success,
      metadata: {
        soqlLength: soql.length,
        instanceUrl,
      },
    }).catch(err => this.logger.error(`Failed to log SF usage: ${err.message}`));

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error[0]?.message || error.message || 'SOQL query failed';
      this.logger.error(`Salesforce query error: ${errorMessage}`, { soql: soql.substring(0, 100) });
      throw new Error(errorMessage);
    }

    const result = await response.json();
    // Ensure we always return a valid response structure
    return {
      totalSize: result.totalSize || 0,
      done: result.done ?? true,
      records: result.records || [],
    };
  }

  /**
   * Get a single record from Salesforce by ID
   */
  async getSingleRecord(userId: string, sobjectType: string, recordId: string): Promise<any> {
    if (this.shouldThrottle()) {
      this.logger.warn('Salesforce API limit approaching - throttling request');
      throw new Error('Salesforce API limit approaching. Please try again later.');
    }
    this.trackApiCall();
    const startTime = Date.now();

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/${sobjectType}/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const latencyMs = Date.now() - startTime;
    const success = response.ok;

    // Track Salesforce API usage
    this.usageTrackingService.logUsage({
      userId,
      serviceType: ApiServiceType.SALESFORCE,
      serviceName: 'salesforce-api',
      operation: 'getSingleRecord',
      apiCalls: 1,
      latencyMs,
      success,
      metadata: {
        sobjectType,
        recordId,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to get ${sobjectType} record: ${recordId}`);
    }

    return response.json();
  }

  /**
   * Create a record in Salesforce
   */
  async create(userId: string, sobjectType: string, data: any): Promise<any> {
    if (this.shouldThrottle()) {
      this.logger.warn('Salesforce API limit approaching - throttling request');
      throw new Error('Salesforce API limit approaching. Please try again later.');
    }
    this.trackApiCall();
    const startTime = Date.now();

    // Validate cross-reference fields in the data payload before creating
    this.validateCrossReferenceFields(data);

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/${sobjectType}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    const latencyMs = Date.now() - startTime;
    const success = response.ok;
    
    this.usageTrackingService.logUsage({
      userId,
      serviceType: ApiServiceType.SALESFORCE,
      serviceName: 'salesforce-api',
      operation: `create_${sobjectType}`,
      apiCalls: 1,
      latencyMs,
      success,
      metadata: { sobjectType },
    }).catch(err => this.logger.error(`Failed to log SF usage: ${err.message}`));

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const rawMessage = error[0]?.message || `Failed to create ${sobjectType}`;
      const errorMessage = this.formatSalesforceError(rawMessage, sobjectType);

      // Return proper HTTP status based on Salesforce response
      if (response.status === 400 || response.status === 404) {
        // Validation errors, missing required fields, invalid data
        throw new BadRequestException(errorMessage);
      }
      if (response.status === 401) {
        throw new UnauthorizedException('Salesforce session expired. Please reconnect.');
      }
      // For other errors, still throw but it will be caught as 500
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Update a record in Salesforce
   */
  async update(userId: string, sobjectType: string, recordId: string, data: any): Promise<void> {
    // Validate Salesforce ID format before making API call
    if (!IdValidator.isSalesforceId(recordId)) {
      const idType = IdValidator.getIdType(recordId);
      if (idType === 'local') {
        throw new BadRequestException(
          `Invalid Salesforce ${sobjectType} ID: "${recordId}" appears to be a local database ID (CUID format). ` +
          `For local database operations, use the regular update tools instead of Salesforce tools.`,
        );
      }
      throw new BadRequestException(
        `Invalid Salesforce ${sobjectType} ID format: "${recordId}". Expected a 15 or 18-character Salesforce ID.`,
      );
    }

    // Normalize 15-character ID to 18-character format for API consistency
    const normalizedRecordId = IdValidator.normalizeSalesforceId(recordId);

    // Validate data is a proper object (not array, string, or primitive)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException(
        `Invalid update data format for ${sobjectType}. Expected an object with field names and values.`,
      );
    }

    // Ensure no numeric keys (which would indicate array-like structure)
    const keys = Object.keys(data);
    if (keys.some(key => /^\d+$/.test(key))) {
      throw new BadRequestException(
        `Invalid update data format for ${sobjectType}. Found numeric keys (${keys.filter(k => /^\d+$/.test(k)).join(', ')}). Expected field names like 'Status', 'Name', etc.`,
      );
    }

    // Validate cross-reference fields in the data payload
    this.validateCrossReferenceFields(data);

    this.logger.debug(`Updating Salesforce ${sobjectType} record: ${normalizedRecordId} with data: ${JSON.stringify(data)}`);

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/${sobjectType}/${normalizedRecordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error[0]?.message || error?.message || `Failed to update ${sobjectType}`;
      const errorCode = error[0]?.errorCode || error?.errorCode || 'UNKNOWN';
      this.logger.error(`Salesforce update error for ${sobjectType}/${normalizedRecordId}: [${errorCode}] ${errorMessage}`);

      // Provide more helpful error messages for common Salesforce errors
      if (errorCode === 'NOT_FOUND' || errorMessage.includes('not found')) {
        throw new Error(`${sobjectType} record with ID ${normalizedRecordId} was not found. It may have been deleted.`);
      }
      if (errorCode === 'INVALID_CROSS_REFERENCE_KEY' || errorMessage.toLowerCase().includes('cross reference')) {
        throw new Error(`Invalid reference: The ${sobjectType} record ${normalizedRecordId} may have been deleted or you don't have access to it.`);
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate cross-reference fields (WhoId, WhatId, AccountId, etc.) in Salesforce data
   */
  private validateCrossReferenceFields(data: any): void {
    const crossRefFields = ['WhoId', 'WhatId', 'AccountId', 'ContactId', 'LeadId', 'OwnerId', 'ParentId'];

    for (const field of crossRefFields) {
      if (data[field]) {
        if (!IdValidator.isSalesforceId(data[field])) {
          const idType = IdValidator.getIdType(data[field]);
          if (idType === 'local') {
            throw new BadRequestException(
              `Invalid ${field}: "${data[field]}" appears to be a local database ID (CUID format). ` +
              `${field} must be a valid 18-character Salesforce ID.`,
            );
          }
          throw new BadRequestException(
            `Invalid ${field}: "${data[field]}" is not a valid Salesforce ID format. ` +
            `Expected a 15 or 18-character Salesforce ID.`,
          );
        }
      }
    }
  }

  /**
   * Format Salesforce API errors into user-friendly messages
   */
  private formatSalesforceError(rawMessage: string, sobjectType: string): string {
    // Map of technical patterns to user-friendly messages
    const errorMappings: Array<{ pattern: RegExp; message: string | ((match: RegExpMatchArray) => string) }> = [
      // State/Country picklist validation
      {
        pattern: /country\/territory must be specified before specifying a state/i,
        message: 'Please select a country before entering a state/province.',
      },
      // Required field missing
      {
        pattern: /Required fields are missing: \[([^\]]+)\]/i,
        message: (match) => `Please fill in the required field: ${match[1].replace(/,/g, ', ')}.`,
      },
      // Invalid ID reference
      {
        pattern: /invalid cross reference id/i,
        message: 'The selected related record is invalid or no longer exists.',
      },
      // Duplicate value
      {
        pattern: /duplicate value found.*duplicates value on record/i,
        message: 'A record with this value already exists. Please use a unique value.',
      },
      // Field integrity exception
      {
        pattern: /FIELD_INTEGRITY_EXCEPTION/i,
        message: 'One or more field values are invalid. Please check your input.',
      },
      // Invalid email format
      {
        pattern: /invalid email address/i,
        message: 'Please enter a valid email address.',
      },
      // Invalid phone format
      {
        pattern: /invalid phone/i,
        message: 'Please enter a valid phone number.',
      },
      // String too long
      {
        pattern: /data value too large.*maximum length is (\d+)/i,
        message: (match) => `Text is too long. Maximum ${match[1]} characters allowed.`,
      },
      // Invalid picklist value
      {
        pattern: /bad value for restricted picklist field: ([^:]+)/i,
        message: (match) => `Invalid option selected for ${match[1].trim()}.`,
      },
      // Insufficient privileges
      {
        pattern: /insufficient access rights/i,
        message: 'You do not have permission to perform this action.',
      },
      // Record type issue
      {
        pattern: /invalid record type/i,
        message: 'The selected record type is not available.',
      },
    ];

    // Try to match and transform the error
    for (const { pattern, message } of errorMappings) {
      const match = rawMessage.match(pattern);
      if (match) {
        return typeof message === 'function' ? message(match) : message;
      }
    }

    // If no pattern matched, clean up the raw message
    // Remove technical prefixes like field API names
    let cleanMessage = rawMessage
      .replace(/^[A-Z_]+:\s*/i, '') // Remove error code prefixes
      .replace(/for field: ([A-Za-z_]+)/g, (_, field) => {
        // Convert API field names to readable format
        const readable = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim();
        return `for ${readable}`;
      });

    // Capitalize first letter
    cleanMessage = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);

    // Ensure it ends with a period
    if (!cleanMessage.endsWith('.') && !cleanMessage.endsWith('!') && !cleanMessage.endsWith('?')) {
      cleanMessage += '.';
    }

    return cleanMessage;
  }

  /**
   * Describe an SObject (get metadata)
   */
  async describeSObject(userId: string, sobjectType: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/${sobjectType}/describe`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to describe ${sobjectType}`);
    }

    return response.json();
  }

  /**
   * Describe global - list all available SObjects in the org
   */
  async describeGlobal(userId: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to describe global objects');
    }

    return response.json();
  }

  /**
   * Search records using SOSL (Salesforce Object Search Language)
   */
  async search(userId: string, sosl: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/search?q=${encodeURIComponent(sosl)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || 'Search failed');
    }

    return response.json();
  }

  /**
   * Delete a record
   */
  async delete(userId: string, sobjectType: string, recordId: string): Promise<void> {
    // Validate Salesforce ID format before making API call
    if (!IdValidator.isSalesforceId(recordId)) {
      const idType = IdValidator.getIdType(recordId);
      if (idType === 'local') {
        throw new BadRequestException(
          `Invalid Salesforce ${sobjectType} ID: "${recordId}" appears to be a local database ID (CUID format). ` +
          `For local database operations, use the regular delete tools instead of Salesforce tools.`,
        );
      }
      throw new BadRequestException(
        `Invalid Salesforce ${sobjectType} ID format: "${recordId}". Expected a 15 or 18-character Salesforce ID.`,
      );
    }

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/${sobjectType}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || `Failed to delete ${sobjectType}`);
    }
  }

  // =============================================================================
  // ADMIN/CONFIG APIs - Tooling API & Metadata API
  // =============================================================================

  /**
   * Execute Tooling API query (for setup/config objects)
   */
  async toolingQuery(userId: string, soql: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || 'Tooling query failed');
    }

    return response.json();
  }

  /**
   * Create a record via Tooling API
   */
  async toolingCreate(userId: string, toolingType: string, data: any): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/${toolingType}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || `Failed to create ${toolingType}`);
    }

    return response.json();
  }

  /**
   * Update a record via Tooling API
   */
  async toolingUpdate(userId: string, toolingType: string, recordId: string, data: any): Promise<void> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/${toolingType}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || `Failed to update ${toolingType}`);
    }
  }

  /**
   * Delete a record via Tooling API
   */
  async toolingDelete(userId: string, toolingType: string, recordId: string): Promise<void> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/${toolingType}/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || `Failed to delete ${toolingType}`);
    }
  }

  /**
   * Describe a Tooling API object
   */
  async toolingDescribe(userId: string, toolingType: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/${toolingType}/describe`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to describe tooling object ${toolingType}`);
    }

    return response.json();
  }

  /**
   * List all available Tooling API objects
   */
  async listToolingObjects(userId: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list tooling objects');
    }

    return response.json();
  }

  /**
   * Execute anonymous Apex code
   */
  async executeAnonymousApex(userId: string, apexCode: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/executeAnonymous?anonymousBody=${encodeURIComponent(apexCode)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to execute Apex');
    }

    return response.json();
  }

  /**
   * Get org limits
   */
  async getOrgLimits(userId: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/limits`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get org limits');
    }

    return response.json();
  }

  /**
   * List users in the org
   */
  async listUsers(userId: string, limit: number = 50): Promise<any> {
    return this.query(userId, `SELECT Id, Username, Name, Email, IsActive, Profile.Name, UserRole.Name, LastLoginDate FROM User WHERE IsActive = true ORDER BY Name LIMIT ${limit}`);
  }

  /**
   * List profiles in the org
   */
  async listProfiles(userId: string): Promise<any> {
    return this.query(userId, 'SELECT Id, Name, Description, UserType FROM Profile ORDER BY Name');
  }

  /**
   * List permission sets
   */
  async listPermissionSets(userId: string): Promise<any> {
    return this.query(userId, 'SELECT Id, Name, Label, Description, IsCustom FROM PermissionSet WHERE IsOwnedByProfile = false ORDER BY Name');
  }

  /**
   * Assign permission set to user
   */
  async assignPermissionSet(userId: string, assigneeId: string, permissionSetId: string): Promise<any> {
    return this.create(userId, 'PermissionSetAssignment', {
      AssigneeId: assigneeId,
      PermissionSetId: permissionSetId,
    });
  }

  /**
   * List custom fields on an object
   */
  async listCustomFields(userId: string, objectName: string): Promise<any> {
    return this.toolingQuery(userId, `SELECT Id, DeveloperName, TableEnumOrId, FullName, Metadata FROM CustomField WHERE TableEnumOrId = '${this.escapeSoql(objectName)}'`);
  }

  /**
   * List validation rules on an object
   */
  async listValidationRules(userId: string, objectName: string): Promise<any> {
    return this.toolingQuery(userId, `SELECT Id, ValidationName, Active, ErrorMessage, EntityDefinition.DeveloperName FROM ValidationRule WHERE EntityDefinition.DeveloperName = '${this.escapeSoql(objectName)}'`);
  }

  /**
   * Toggle validation rule active/inactive
   */
  async toggleValidationRule(userId: string, validationRuleId: string, active: boolean): Promise<void> {
    await this.toolingUpdate(userId, 'ValidationRule', validationRuleId, {
      Metadata: { active },
    });
  }

  /**
   * List flows (Process Builder & Flow)
   */
  async listFlows(userId: string, activeOnly: boolean = true): Promise<any> {
    let query = 'SELECT Id, DeveloperName, MasterLabel, ProcessType, Status, Description FROM FlowDefinition';
    if (activeOnly) {
      query += " WHERE ActiveVersion != null";
    }
    return this.toolingQuery(userId, query);
  }

  /**
   * Get record types for an object
   */
  async listRecordTypes(userId: string, objectName: string): Promise<any> {
    return this.query(userId, `SELECT Id, Name, DeveloperName, Description, IsActive FROM RecordType WHERE SobjectType = '${this.escapeSoql(objectName)}' ORDER BY Name`);
  }

  /**
   * Get field-level security for a profile
   */
  async getFieldPermissions(userId: string, profileId: string, objectName: string): Promise<any> {
    const escapedProfileId = this.escapeSoqlId(profileId);
    return this.query(userId, `SELECT Id, Field, PermissionsEdit, PermissionsRead, SobjectType FROM FieldPermissions WHERE ParentId = '${escapedProfileId}' AND SobjectType = '${this.escapeSoql(objectName)}'`);
  }

  /**
   * List installed packages
   */
  async listInstalledPackages(userId: string): Promise<any> {
    return this.toolingQuery(userId, 'SELECT Id, SubscriberPackage.Name, SubscriberPackage.NamespacePrefix, SubscriberPackageVersion.MajorVersion, SubscriberPackageVersion.MinorVersion FROM InstalledSubscriberPackage');
  }

  /**
   * Get Apex classes
   */
  async listApexClasses(userId: string, limit: number = 100): Promise<any> {
    return this.toolingQuery(userId, `SELECT Id, Name, Status, IsValid, NamespacePrefix, CreatedDate, LastModifiedDate FROM ApexClass ORDER BY Name LIMIT ${limit}`);
  }

  /**
   * Get Apex triggers
   */
  async listApexTriggers(userId: string, objectName?: string): Promise<any> {
    let query = 'SELECT Id, Name, TableEnumOrId, Status, IsValid FROM ApexTrigger';
    if (objectName) {
      query += ` WHERE TableEnumOrId = '${this.escapeSoql(objectName)}'`;
    }
    return this.toolingQuery(userId, query);
  }

  /**
   * Run all tests or specific test class
   */
  async runApexTests(userId: string, testClassId?: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const body: any = {
      testLevel: testClassId ? 'RunSpecifiedTests' : 'RunLocalTests',
    };
    if (testClassId) {
      body.tests = [{ classId: testClassId }];
    }

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/runTestsAsynchronous`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error[0]?.message || 'Failed to run tests');
    }

    return response.json();
  }

  /**
   * Get test run results
   */
  async getTestResults(userId: string, testRunId: string): Promise<any> {
    const escapedTestRunId = this.escapeSoqlId(testRunId);
    return this.toolingQuery(userId, `SELECT Id, AsyncApexJobId, Status, ClassesCompleted, ClassesEnqueued, MethodsCompleted, MethodsEnqueued, MethodsFailed FROM ApexTestRunResult WHERE AsyncApexJobId = '${escapedTestRunId}'`);
  }

  // =============================================================================
  // METADATA MODIFICATION APIs - Create/Update Custom Fields, Objects, etc.
  // =============================================================================

  /**
   * Create a custom field on an object using Metadata API via Tooling API
   * Supports: Text, Number, Checkbox, Picklist, Date, DateTime, Email, Phone, URL, TextArea, LongTextArea, Currency, Percent, Lookup, MasterDetail
   */
  async createCustomField(
    userId: string, 
    objectName: string, 
    fieldDefinition: {
      fullName: string; // e.g., 'MyField__c' or just 'MyField' (will append __c)
      label: string;
      type: 'Text' | 'Number' | 'Checkbox' | 'Picklist' | 'Date' | 'DateTime' | 'Email' | 'Phone' | 'URL' | 'TextArea' | 'LongTextArea' | 'Currency' | 'Percent' | 'Lookup' | 'MasterDetail';
      length?: number; // For Text fields
      precision?: number; // For Number/Currency/Percent
      scale?: number; // Decimal places for Number/Currency/Percent
      required?: boolean;
      unique?: boolean;
      externalId?: boolean;
      defaultValue?: string | boolean | number;
      description?: string;
      helpText?: string;
      picklistValues?: string[]; // For Picklist type
      referenceTo?: string; // For Lookup/MasterDetail
      relationshipLabel?: string; // For Lookup/MasterDetail
      relationshipName?: string; // For Lookup/MasterDetail
    }
  ): Promise<{ success: boolean; fieldId?: string; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Ensure field name ends with __c
      const fieldApiName = fieldDefinition.fullName.endsWith('__c') 
        ? fieldDefinition.fullName 
        : `${fieldDefinition.fullName}__c`;

      // Build the metadata payload
      const metadata: any = {
        fullName: `${objectName}.${fieldApiName}`,
        label: fieldDefinition.label,
        type: fieldDefinition.type,
        required: fieldDefinition.required || false,
        unique: fieldDefinition.unique || false,
        externalId: fieldDefinition.externalId || false,
      };

      // Type-specific configurations
      switch (fieldDefinition.type) {
        case 'Text':
          metadata.length = fieldDefinition.length || 255;
          break;
        case 'TextArea':
          // TextArea doesn't need length
          break;
        case 'LongTextArea':
          metadata.length = fieldDefinition.length || 32768;
          metadata.visibleLines = 5;
          break;
        case 'Number':
          metadata.precision = fieldDefinition.precision || 18;
          metadata.scale = fieldDefinition.scale || 0;
          break;
        case 'Currency':
        case 'Percent':
          metadata.precision = fieldDefinition.precision || 18;
          metadata.scale = fieldDefinition.scale || 2;
          break;
        case 'Picklist':
          if (fieldDefinition.picklistValues && fieldDefinition.picklistValues.length > 0) {
            metadata.valueSet = {
              valueSetDefinition: {
                sorted: false,
                value: fieldDefinition.picklistValues.map((v, i) => ({
                  fullName: v.replace(/\s+/g, '_'),
                  default: i === 0,
                  label: v,
                })),
              },
            };
          }
          break;
        case 'Lookup':
        case 'MasterDetail':
          if (!fieldDefinition.referenceTo) {
            return {
              success: false,
              error: `${fieldDefinition.type} field requires a 'referenceTo' object name`,
              errorCode: 'MISSING_REFERENCE',
              suggestions: ['Specify the object this field should reference (e.g., Account, Contact, custom object)'],
            };
          }
          metadata.referenceTo = fieldDefinition.referenceTo;
          metadata.relationshipLabel = fieldDefinition.relationshipLabel || fieldDefinition.label + 's';
          metadata.relationshipName = fieldDefinition.relationshipName || 
            fieldApiName.replace('__c', '').replace(/[^a-zA-Z0-9]/g, '') + 's';
          if (fieldDefinition.type === 'MasterDetail') {
            metadata.writeRequiresMasterRead = false;
            metadata.reparentableMasterDetail = false;
          }
          break;
        case 'Checkbox':
          metadata.defaultValue = fieldDefinition.defaultValue === true ? 'true' : 'false';
          break;
      }

      if (fieldDefinition.description) {
        metadata.description = fieldDefinition.description;
      }
      if (fieldDefinition.helpText) {
        metadata.inlineHelpText = fieldDefinition.helpText;
      }
      if (fieldDefinition.defaultValue !== undefined && fieldDefinition.type !== 'Checkbox') {
        metadata.defaultValue = String(fieldDefinition.defaultValue);
      }

      // Use Tooling API CustomField sObject
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/CustomField`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: `${objectName}.${fieldApiName}`,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = Array.isArray(errorData) ? errorData[0]?.message : errorData.message;
        const errorCode = Array.isArray(errorData) ? errorData[0]?.errorCode : errorData.errorCode;
        
        return this.formatMetadataError(errorCode, errorMessage, 'createCustomField', {
          objectName,
          fieldName: fieldApiName,
          fieldType: fieldDefinition.type,
        });
      }

      const result = await response.json();
      return {
        success: true,
        fieldId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'UNEXPECTED_ERROR',
        suggestions: ['Check your Salesforce connection', 'Verify you have the required permissions'],
      };
    }
  }

  /**
   * Create a custom object using Metadata API via Tooling API
   */
  async createCustomObject(
    userId: string,
    objectDefinition: {
      fullName: string; // e.g., 'My_Object__c' or 'My_Object' (will append __c)
      label: string;
      pluralLabel: string;
      description?: string;
      nameFieldType?: 'Text' | 'AutoNumber';
      nameFieldLabel?: string;
      nameFieldFormat?: string; // For AutoNumber, e.g., 'OBJ-{0000}'
      allowReports?: boolean;
      allowActivities?: boolean;
      allowSearch?: boolean;
      sharingModel?: 'Private' | 'Read' | 'ReadWrite' | 'ControlledByParent';
    }
  ): Promise<{ success: boolean; objectId?: string; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Ensure object name ends with __c
      const objectApiName = objectDefinition.fullName.endsWith('__c')
        ? objectDefinition.fullName
        : `${objectDefinition.fullName}__c`;

      const metadata: any = {
        fullName: objectApiName,
        label: objectDefinition.label,
        pluralLabel: objectDefinition.pluralLabel,
        deploymentStatus: 'Deployed',
        sharingModel: objectDefinition.sharingModel || 'ReadWrite',
        enableReports: objectDefinition.allowReports !== false,
        enableActivities: objectDefinition.allowActivities !== false,
        enableSearch: objectDefinition.allowSearch !== false,
        nameField: {
          type: objectDefinition.nameFieldType || 'Text',
          label: objectDefinition.nameFieldLabel || `${objectDefinition.label} Name`,
        },
      };

      if (objectDefinition.nameFieldType === 'AutoNumber' && objectDefinition.nameFieldFormat) {
        metadata.nameField.displayFormat = objectDefinition.nameFieldFormat;
      }

      if (objectDefinition.description) {
        metadata.description = objectDefinition.description;
      }

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/CustomObject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: objectApiName,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = Array.isArray(errorData) ? errorData[0]?.message : errorData.message;
        const errorCode = Array.isArray(errorData) ? errorData[0]?.errorCode : errorData.errorCode;
        
        return this.formatMetadataError(errorCode, errorMessage, 'createCustomObject', {
          objectName: objectApiName,
        });
      }

      const result = await response.json();
      return {
        success: true,
        objectId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'UNEXPECTED_ERROR',
        suggestions: ['Check your Salesforce connection', 'Verify you have the required permissions'],
      };
    }
  }

  /**
   * Create or update a validation rule
   */
  async createValidationRule(
    userId: string,
    objectName: string,
    ruleDefinition: {
      name: string; // e.g., 'Require_Email_or_Phone'
      description?: string;
      errorConditionFormula: string; // Formula that returns TRUE when record is INVALID
      errorMessage: string;
      errorDisplayField?: string; // Field to display error on (optional)
      active?: boolean;
    }
  ): Promise<{ success: boolean; ruleId?: string; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const metadata = {
        fullName: `${objectName}.${ruleDefinition.name}`,
        active: ruleDefinition.active !== false,
        description: ruleDefinition.description || '',
        errorConditionFormula: ruleDefinition.errorConditionFormula,
        errorMessage: ruleDefinition.errorMessage,
        errorDisplayField: ruleDefinition.errorDisplayField,
      };

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ValidationRule`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: `${objectName}.${ruleDefinition.name}`,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = Array.isArray(errorData) ? errorData[0]?.message : errorData.message;
        const errorCode = Array.isArray(errorData) ? errorData[0]?.errorCode : errorData.errorCode;
        
        return this.formatMetadataError(errorCode, errorMessage, 'createValidationRule', {
          objectName,
          ruleName: ruleDefinition.name,
          formula: ruleDefinition.errorConditionFormula,
        });
      }

      const result = await response.json();
      return {
        success: true,
        ruleId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'UNEXPECTED_ERROR',
        suggestions: ['Check your formula syntax', 'Verify field API names are correct'],
      };
    }
  }

  /**
   * Add picklist values to an existing picklist field
   */
  async addPicklistValues(
    userId: string,
    objectName: string,
    fieldName: string,
    newValues: string[]
  ): Promise<{ success: boolean; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      // First, get the current field metadata
      const fieldApiName = fieldName.endsWith('__c') ? fieldName : `${fieldName}__c`;
      const escapedFieldDevName = this.escapeSoql(fieldApiName.replace('__c', ''));
      const escapedObjectName = this.escapeSoql(objectName);
      const existingField = await this.toolingQuery(
        userId,
        `SELECT Id, Metadata FROM CustomField WHERE DeveloperName = '${escapedFieldDevName}' AND TableEnumOrId = '${escapedObjectName}'`
      );

      if (!existingField.records || existingField.records.length === 0) {
        return {
          success: false,
          error: `Field ${fieldApiName} not found on ${objectName}`,
          errorCode: 'FIELD_NOT_FOUND',
          suggestions: [
            `Use sf_list_custom_fields to see available fields on ${objectName}`,
            `Check if the field API name is correct (should end with __c for custom fields)`,
          ],
        };
      }

      const record = existingField.records[0];
      const metadata = record.Metadata;

      if (!metadata.valueSet?.valueSetDefinition) {
        return {
          success: false,
          error: `Field ${fieldApiName} is not a picklist field or uses a global value set`,
          errorCode: 'NOT_PICKLIST',
          suggestions: ['This field may be a different type', 'Global value sets must be modified separately'],
        };
      }

      // Add new values to existing ones
      const existingValues = metadata.valueSet.valueSetDefinition.value || [];
      const newPicklistValues = newValues.map((v) => ({
        fullName: v.replace(/\s+/g, '_'),
        default: false,
        label: v,
      }));

      metadata.valueSet.valueSetDefinition.value = [...existingValues, ...newPicklistValues];

      // Update the field
      await this.toolingUpdate(userId, 'CustomField', record.Id, { Metadata: metadata });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'UPDATE_FAILED',
        suggestions: ['Check your permissions', 'Verify the field is editable'],
      };
    }
  }

  /**
   * Update field-level security (make field visible/editable for a profile)
   */
  async updateFieldLevelSecurity(
    userId: string,
    profileName: string,
    objectName: string,
    fieldName: string,
    permissions: { readable: boolean; editable: boolean }
  ): Promise<{ success: boolean; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      // Get the profile ID first
      const escapedProfileName = this.escapeSoql(profileName);
      const profileResult = await this.query(userId, `SELECT Id FROM Profile WHERE Name = '${escapedProfileName}'`);
      if (!profileResult.records || profileResult.records.length === 0) {
        return {
          success: false,
          error: `Profile '${profileName}' not found`,
          errorCode: 'PROFILE_NOT_FOUND',
          suggestions: [
            'Use sf_list_profiles to see available profiles',
            'Check the exact profile name (case-sensitive)',
          ],
        };
      }

      const profileId = profileResult.records[0].Id;
      const fieldApiName = fieldName.endsWith('__c') ? fieldName : (fieldName.includes('.') ? fieldName : `${objectName}.${fieldName}`);

      // Check if permission already exists
      const escapedProfileId = this.escapeSoqlId(profileId);
      const escapedFieldApiName = this.escapeSoql(fieldApiName);
      const existingPerm = await this.query(
        userId,
        `SELECT Id FROM FieldPermissions WHERE ParentId = '${escapedProfileId}' AND Field = '${escapedFieldApiName}'`
      );

      if (existingPerm.records && existingPerm.records.length > 0) {
        // Update existing permission
        await this.update(userId, 'FieldPermissions', existingPerm.records[0].Id, {
          PermissionsRead: permissions.readable,
          PermissionsEdit: permissions.editable,
        });
      } else {
        // Create new permission
        await this.create(userId, 'FieldPermissions', {
          ParentId: profileId,
          SobjectType: objectName,
          Field: fieldApiName,
          PermissionsRead: permissions.readable,
          PermissionsEdit: permissions.editable,
        });
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'FLS_UPDATE_FAILED',
        suggestions: [
          'Ensure you have Modify All Data or Customize Application permission',
          'Some standard fields cannot have FLS modified',
        ],
      };
    }
  }

  /**
   * Format metadata errors with intelligent suggestions
   */
  private formatMetadataError(
    errorCode: string,
    errorMessage: string,
    operation: string,
    context: Record<string, any>
  ): { success: false; error: string; errorCode: string; suggestions: string[] } {
    const suggestions: string[] = [];

    // Common error patterns and their suggestions
    const errorPatterns: Record<string, string[]> = {
      'INSUFFICIENT_ACCESS': [
        'You need "Customize Application" permission to modify metadata',
        'Ask your Salesforce admin to grant you the required permissions',
        'Consider using a sandbox for testing metadata changes',
      ],
      'DUPLICATE_VALUE': [
        `A field or object with this name already exists`,
        `Try a different API name`,
        `Use sf_list_custom_fields to see existing fields`,
      ],
      'INVALID_FIELD': [
        `The field API name is invalid. Use alphanumeric characters and underscores only`,
        `Field names cannot start with a number`,
        `Avoid reserved words like "Name", "Id", "Type"`,
      ],
      'INVALID_TYPE': [
        `The specified field type is not valid`,
        `Supported types: Text, Number, Checkbox, Picklist, Date, DateTime, Email, Phone, URL, TextArea, LongTextArea, Currency, Percent, Lookup, MasterDetail`,
      ],
      'REQUIRED_FIELD_MISSING': [
        `A required property is missing from the request`,
        `Check that all required fields are provided`,
      ],
      'INVALID_CROSS_REFERENCE_KEY': [
        `The referenced object or record does not exist`,
        `For Lookup/MasterDetail fields, verify the referenced object name is correct`,
        `Use sf_list_objects to see available objects`,
      ],
      'CANNOT_MODIFY_MANAGED_OBJECT': [
        `This object or field is part of a managed package and cannot be modified`,
        `Contact the package vendor for changes to managed components`,
      ],
      'FIELD_CUSTOM_VALIDATION_EXCEPTION': [
        `A validation rule prevented the change`,
        `Check your formula syntax for errors`,
        `Verify all field references in the formula are valid`,
      ],
      'INVALID_OPERATION': [
        `This operation is not allowed on this type of object`,
        `Some metadata types require specific API versions`,
      ],
      'LIMIT_EXCEEDED': [
        `You have reached the limit for this type of metadata`,
        `Check sf_get_org_limits to see current usage`,
        `Consider removing unused custom fields or objects`,
      ],
    };

    // Match error code or search message for patterns
    const matchedCode = Object.keys(errorPatterns).find(
      (code) => errorCode?.includes(code) || errorMessage?.toUpperCase().includes(code)
    );

    if (matchedCode) {
      suggestions.push(...errorPatterns[matchedCode]);
    } else {
      // Generic suggestions based on operation
      switch (operation) {
        case 'createCustomField':
          suggestions.push(
            `Verify the object '${context.objectName}' exists`,
            `Ensure the field name '${context.fieldName}' is unique`,
            `Check that you have the required permissions`,
          );
          break;
        case 'createCustomObject':
          suggestions.push(
            `Ensure the object name is unique`,
            `Check your custom object limits`,
            `Verify you have Customize Application permission`,
          );
          break;
        case 'createValidationRule':
          suggestions.push(
            `Check your formula syntax - it should return TRUE when the record is INVALID`,
            `Verify all field API names in the formula`,
            `Test the formula logic in Salesforce's Formula Editor first`,
          );
          break;
      }
    }

    return {
      success: false,
      error: errorMessage || 'Unknown error occurred',
      errorCode: errorCode || 'UNKNOWN',
      suggestions,
    };
  }

  /**
   * Get deployment status for async metadata operations
   */
  async getDeploymentStatus(userId: string, deploymentId: string): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/metadata/deployRequest/${deploymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get deployment status');
    }

    return response.json();
  }

  /**
   * Validate metadata before deployment (dry run)
   */
  async validateMetadataChange(
    userId: string,
    metadataType: string,
    metadata: any
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation based on metadata type
    switch (metadataType) {
      case 'CustomField':
        if (!metadata.label) errors.push('Field label is required');
        if (!metadata.type) errors.push('Field type is required');
        if (metadata.type === 'Lookup' && !metadata.referenceTo) {
          errors.push('Lookup fields require a reference object');
        }
        if (metadata.type === 'Text' && (!metadata.length || metadata.length > 255)) {
          warnings.push('Text field length should be between 1 and 255');
        }
        break;
      case 'CustomObject':
        if (!metadata.label) errors.push('Object label is required');
        if (!metadata.pluralLabel) errors.push('Plural label is required');
        break;
      case 'ValidationRule':
        if (!metadata.errorConditionFormula) errors.push('Error condition formula is required');
        if (!metadata.errorMessage) errors.push('Error message is required');
        if (metadata.errorConditionFormula && !metadata.errorConditionFormula.includes('(')) {
          warnings.push('Formula looks simple - ensure it returns TRUE when record is invalid');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // =============================================================================
  // EXTENDED METADATA OPERATIONS - Flows, Users, Record Types, Page Layouts, etc.
  // =============================================================================

  /**
   * Activate or deactivate a Flow
   */
  async toggleFlow(
    userId: string,
    flowId: string,
    activate: boolean
  ): Promise<{ success: boolean; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      if (activate) {
        // To activate, we need to get the latest version and set it as active
        const escapedFlowId = this.escapeSoqlId(flowId);
        const flowDef = await this.toolingQuery(userId,
          `SELECT Id, ActiveVersionId, LatestVersionId FROM FlowDefinition WHERE Id = '${escapedFlowId}'`
        );
        
        if (!flowDef.records || flowDef.records.length === 0) {
          return { success: false, error: 'Flow not found', errorCode: 'FLOW_NOT_FOUND', suggestions: ['Use sf_list_flows to see available flows'] };
        }
        
        const latestVersionId = flowDef.records[0].LatestVersionId;
        if (!latestVersionId) {
          return { success: false, error: 'No version available to activate', errorCode: 'NO_VERSION', suggestions: ['The flow has no versions to activate'] };
        }
        
        await this.toolingUpdate(userId, 'FlowDefinition', flowId, { 
          Metadata: { activeVersionNumber: null }, // Will activate latest
        });
      } else {
        // Deactivate by setting active version to null
        await this.toolingUpdate(userId, 'FlowDefinition', flowId, {
          Metadata: { activeVersionNumber: 0 },
        });
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'FLOW_TOGGLE_FAILED',
        suggestions: ['Check if the flow can be activated/deactivated', 'Verify you have the required permissions'],
      };
    }
  }

  /**
   * Create a new user
   */
  async createUser(
    userId: string,
    userData: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      alias: string;
      profileId: string;
      roleId?: string;
      timeZone?: string;
      locale?: string;
      emailEncoding?: string;
      languageLocale?: string;
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; userId?: string; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const result = await this.create(userId, 'User', {
        Username: userData.username,
        Email: userData.email,
        FirstName: userData.firstName,
        LastName: userData.lastName,
        Alias: userData.alias.substring(0, 8), // Max 8 chars
        ProfileId: userData.profileId,
        UserRoleId: userData.roleId,
        TimeZoneSidKey: userData.timeZone || 'America/Los_Angeles',
        LocaleSidKey: userData.locale || 'en_US',
        EmailEncodingKey: userData.emailEncoding || 'UTF-8',
        LanguageLocaleKey: userData.languageLocale || 'en_US',
        IsActive: userData.isActive !== false,
      });
      
      return { success: true, userId: result.id };
    } catch (error) {
      return this.formatMetadataError(error.errorCode || 'USER_CREATE_FAILED', error.message, 'createUser', userData);
    }
  }

  /**
   * Update user details
   */
  async updateUser(
    userId: string,
    targetUserId: string,
    updates: {
      email?: string;
      firstName?: string;
      lastName?: string;
      profileId?: string;
      roleId?: string;
      isActive?: boolean;
      managerId?: string;
      title?: string;
      department?: string;
      phone?: string;
    }
  ): Promise<{ success: boolean; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const updateData: any = {};
      if (updates.email !== undefined) updateData.Email = updates.email;
      if (updates.firstName !== undefined) updateData.FirstName = updates.firstName;
      if (updates.lastName !== undefined) updateData.LastName = updates.lastName;
      if (updates.profileId !== undefined) updateData.ProfileId = updates.profileId;
      if (updates.roleId !== undefined) updateData.UserRoleId = updates.roleId;
      if (updates.isActive !== undefined) updateData.IsActive = updates.isActive;
      if (updates.managerId !== undefined) updateData.ManagerId = updates.managerId;
      if (updates.title !== undefined) updateData.Title = updates.title;
      if (updates.department !== undefined) updateData.Department = updates.department;
      if (updates.phone !== undefined) updateData.Phone = updates.phone;
      
      await this.update(userId, 'User', targetUserId, updateData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'USER_UPDATE_FAILED',
        suggestions: ['Check user ID is valid', 'Verify you have user management permissions'],
      };
    }
  }

  /**
   * Freeze/Unfreeze a user (prevents login without deactivating)
   */
  async freezeUser(
    userId: string,
    targetUserId: string,
    freeze: boolean
  ): Promise<{ success: boolean; error?: string; suggestions?: string[] }> {
    try {
      // Check if UserLogin record exists
      const escapedTargetUserId = this.escapeSoqlId(targetUserId);
      const loginInfo = await this.query(userId, `SELECT Id, IsFrozen FROM UserLogin WHERE UserId = '${escapedTargetUserId}'`);
      
      if (loginInfo.records && loginInfo.records.length > 0) {
        await this.update(userId, 'UserLogin', loginInfo.records[0].Id, { IsFrozen: freeze });
      } else {
        return { success: false, error: 'User login record not found', suggestions: ['The user may not have logged in yet'] };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, suggestions: ['Verify you have user management permissions'] };
    }
  }

  /**
   * Reset user password (sends reset email)
   */
  async resetUserPassword(userId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/sobjects/User/${targetUserId}/password`,
        {
          method: 'DELETE', // DELETE resets and sends email
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      
      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Failed to reset password');
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a record type
   */
  async createRecordType(
    userId: string,
    objectName: string,
    recordTypeData: {
      name: string;
      developerName: string;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; recordTypeId?: string; error?: string; errorCode?: string; suggestions?: string[] }> {
    try {
      const result = await this.create(userId, 'RecordType', {
        SobjectType: objectName,
        Name: recordTypeData.name,
        DeveloperName: recordTypeData.developerName.replace(/\s+/g, '_'),
        Description: recordTypeData.description || '',
        IsActive: recordTypeData.isActive !== false,
      });
      
      return { success: true, recordTypeId: result.id };
    } catch (error) {
      return this.formatMetadataError(error.errorCode, error.message, 'createRecordType', { objectName, ...recordTypeData });
    }
  }

  /**
   * Update record type
   */
  async updateRecordType(
    userId: string,
    recordTypeId: string,
    updates: { name?: string; description?: string; isActive?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.Name = updates.name;
      if (updates.description !== undefined) updateData.Description = updates.description;
      if (updates.isActive !== undefined) updateData.IsActive = updates.isActive;
      
      await this.update(userId, 'RecordType', recordTypeId, updateData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a custom permission set
   */
  async createPermissionSet(
    userId: string,
    permSetData: {
      name: string;
      label: string;
      description?: string;
      license?: string;
    }
  ): Promise<{ success: boolean; permissionSetId?: string; error?: string; suggestions?: string[] }> {
    try {
      const result = await this.create(userId, 'PermissionSet', {
        Name: permSetData.name.replace(/\s+/g, '_'),
        Label: permSetData.label,
        Description: permSetData.description || '',
        LicenseId: permSetData.license,
      });
      
      return { success: true, permissionSetId: result.id };
    } catch (error) {
      return { success: false, error: error.message, suggestions: ['Permission set names must be unique', 'Check if license is required'] };
    }
  }

  /**
   * Add object permissions to a permission set
   */
  async addObjectPermissionToPermSet(
    userId: string,
    permissionSetId: string,
    objectName: string,
    permissions: {
      read?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
      viewAll?: boolean;
      modifyAll?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.create(userId, 'ObjectPermissions', {
        ParentId: permissionSetId,
        SobjectType: objectName,
        PermissionsRead: permissions.read || false,
        PermissionsCreate: permissions.create || false,
        PermissionsEdit: permissions.edit || false,
        PermissionsDelete: permissions.delete || false,
        PermissionsViewAllRecords: permissions.viewAll || false,
        PermissionsModifyAllRecords: permissions.modifyAll || false,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke permission set from user
   */
  async revokePermissionSet(
    userId: string,
    assigneeId: string,
    permissionSetId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the assignment
      const escapedAssigneeId = this.escapeSoqlId(assigneeId);
      const escapedPermissionSetId = this.escapeSoqlId(permissionSetId);
      const assignment = await this.query(userId,
        `SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '${escapedAssigneeId}' AND PermissionSetId = '${escapedPermissionSetId}'`
      );
      
      if (!assignment.records || assignment.records.length === 0) {
        return { success: false, error: 'Permission set assignment not found' };
      }
      
      await this.delete(userId, 'PermissionSetAssignment', assignment.records[0].Id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a custom field
   */
  async updateCustomField(
    userId: string,
    objectName: string,
    fieldName: string,
    updates: {
      label?: string;
      description?: string;
      helpText?: string;
      required?: boolean;
      defaultValue?: string | boolean | number;
    }
  ): Promise<{ success: boolean; error?: string; suggestions?: string[] }> {
    try {
      const fieldApiName = fieldName.endsWith('__c') ? fieldName : `${fieldName}__c`;

      // Get the field ID first
      const escapedFieldDevName = this.escapeSoql(fieldApiName.replace('__c', ''));
      const escapedObjectName = this.escapeSoql(objectName);
      const fieldResult = await this.toolingQuery(userId,
        `SELECT Id, Metadata FROM CustomField WHERE DeveloperName = '${escapedFieldDevName}' AND TableEnumOrId = '${escapedObjectName}'`
      );

      if (!fieldResult.records || fieldResult.records.length === 0) {
        return {
          success: false,
          error: `Field ${fieldApiName} not found on ${objectName}`,
          suggestions: ['Use sf_list_custom_fields to see available fields'],
        };
      }

      const record = fieldResult.records[0];
      const metadata = { ...record.Metadata };

      if (updates.label !== undefined) metadata.label = updates.label;
      if (updates.description !== undefined) metadata.description = updates.description;
      if (updates.helpText !== undefined) metadata.inlineHelpText = updates.helpText;
      if (updates.required !== undefined) metadata.required = updates.required;
      if (updates.defaultValue !== undefined) metadata.defaultValue = String(updates.defaultValue);

      await this.toolingUpdate(userId, 'CustomField', record.Id, { Metadata: metadata });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, suggestions: ['Check field API name', 'Verify permissions'] };
    }
  }

  /**
   * Delete a custom field
   */
  async deleteCustomField(
    userId: string,
    objectName: string,
    fieldName: string
  ): Promise<{ success: boolean; error?: string; suggestions?: string[] }> {
    try {
      const fieldApiName = fieldName.endsWith('__c') ? fieldName : `${fieldName}__c`;

      const escapedFieldDevName = this.escapeSoql(fieldApiName.replace('__c', ''));
      const escapedObjectName = this.escapeSoql(objectName);
      const fieldResult = await this.toolingQuery(userId,
        `SELECT Id FROM CustomField WHERE DeveloperName = '${escapedFieldDevName}' AND TableEnumOrId = '${escapedObjectName}'`
      );

      if (!fieldResult.records || fieldResult.records.length === 0) {
        return { success: false, error: `Field ${fieldApiName} not found` };
      }
      
      await this.toolingDelete(userId, 'CustomField', fieldResult.records[0].Id);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        suggestions: ['Custom fields with data may need to be deleted via Setup UI', 'Check if field is referenced in code or formulas'],
      };
    }
  }

  /**
   * Delete a custom object
   */
  async deleteCustomObject(
    userId: string,
    objectName: string
  ): Promise<{ success: boolean; error?: string; suggestions?: string[] }> {
    try {
      const objApiName = objectName.endsWith('__c') ? objectName : `${objectName}__c`;

      const escapedObjDevName = this.escapeSoql(objApiName.replace('__c', ''));
      const objResult = await this.toolingQuery(userId,
        `SELECT Id FROM CustomObject WHERE DeveloperName = '${escapedObjDevName}'`
      );
      
      if (!objResult.records || objResult.records.length === 0) {
        return { success: false, error: `Object ${objApiName} not found` };
      }
      
      await this.toolingDelete(userId, 'CustomObject', objResult.records[0].Id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: ['Objects with data cannot be deleted directly', 'Check for dependent objects and fields first'],
      };
    }
  }

  /**
   * Delete a validation rule
   */
  async deleteValidationRule(
    userId: string,
    validationRuleId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.toolingDelete(userId, 'ValidationRule', validationRuleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a validation rule
   */
  async updateValidationRule(
    userId: string,
    validationRuleId: string,
    updates: {
      description?: string;
      errorConditionFormula?: string;
      errorMessage?: string;
      errorDisplayField?: string;
      active?: boolean;
    }
  ): Promise<{ success: boolean; error?: string; suggestions?: string[] }> {
    try {
      const metadata: any = {};
      if (updates.description !== undefined) metadata.description = updates.description;
      if (updates.errorConditionFormula !== undefined) metadata.errorConditionFormula = updates.errorConditionFormula;
      if (updates.errorMessage !== undefined) metadata.errorMessage = updates.errorMessage;
      if (updates.errorDisplayField !== undefined) metadata.errorDisplayField = updates.errorDisplayField;
      if (updates.active !== undefined) metadata.active = updates.active;
      
      await this.toolingUpdate(userId, 'ValidationRule', validationRuleId, { Metadata: metadata });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        suggestions: ['Check formula syntax', 'Verify field API names'],
      };
    }
  }

  /**
   * Create a workflow field update
   */
  async createFieldUpdate(
    userId: string,
    objectName: string,
    updateData: {
      name: string;
      description?: string;
      field: string;
      formula?: string;
      literalValue?: string;
      lookupValue?: string;
      reevaluateOnChange?: boolean;
    }
  ): Promise<{ success: boolean; fieldUpdateId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const metadata: any = {
        fullName: `${objectName}.${updateData.name}`,
        field: updateData.field,
        name: updateData.name,
        description: updateData.description || '',
        reevaluateOnChange: updateData.reevaluateOnChange || false,
      };
      
      if (updateData.formula) {
        metadata.formula = updateData.formula;
      } else if (updateData.literalValue) {
        metadata.literalValue = updateData.literalValue;
      } else if (updateData.lookupValue) {
        metadata.lookupValue = updateData.lookupValue;
      }
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/WorkflowFieldUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ FullName: metadata.fullName, Metadata: metadata }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Failed to create field update');
      }
      
      const result = await response.json();
      return { success: true, fieldUpdateId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List roles in the org hierarchy
   */
  async listRoles(userId: string): Promise<any> {
    return this.query(userId, 'SELECT Id, Name, DeveloperName, ParentRoleId, RollupDescription FROM UserRole ORDER BY Name');
  }

  /**
   * Create a role
   */
  async createRole(
    userId: string,
    roleData: {
      name: string;
      developerName: string;
      parentRoleId?: string;
      caseAccessLevel?: 'None' | 'Read' | 'Edit';
      contactAccessLevel?: 'None' | 'Read' | 'Edit';
      opportunityAccessLevel?: 'None' | 'Read' | 'Edit';
    }
  ): Promise<{ success: boolean; roleId?: string; error?: string }> {
    try {
      const result = await this.create(userId, 'UserRole', {
        Name: roleData.name,
        DeveloperName: roleData.developerName.replace(/\s+/g, '_'),
        ParentRoleId: roleData.parentRoleId,
        CaseAccessForAccountOwner: roleData.caseAccessLevel || 'Edit',
        ContactAccessForAccountOwner: roleData.contactAccessLevel || 'Edit',
        OpportunityAccessForAccountOwner: roleData.opportunityAccessLevel || 'Edit',
      });
      
      return { success: true, roleId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create email template
   */
  async createEmailTemplate(
    userId: string,
    templateData: {
      name: string;
      developerName: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
      folderId?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    try {
      const result = await this.create(userId, 'EmailTemplate', {
        Name: templateData.name,
        DeveloperName: templateData.developerName.replace(/\s+/g, '_'),
        Subject: templateData.subject,
        HtmlValue: templateData.htmlBody,
        Body: templateData.textBody || templateData.htmlBody.replace(/<[^>]*>/g, ''),
        FolderId: templateData.folderId,
        Description: templateData.description,
        TemplateType: 'custom',
        IsActive: true,
      });
      
      return { success: true, templateId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List email templates
   */
  async listEmailTemplates(userId: string, folderId?: string): Promise<any> {
    let query = 'SELECT Id, Name, DeveloperName, Subject, Description, IsActive, TemplateType, FolderId FROM EmailTemplate';
    if (folderId) {
      const escapedFolderId = this.escapeSoqlId(folderId);
      query += ` WHERE FolderId = '${escapedFolderId}'`;
    }
    query += ' ORDER BY Name LIMIT 100';
    return this.query(userId, query);
  }

  /**
   * Create a public group
   */
  async createGroup(
    userId: string,
    groupData: {
      name: string;
      developerName: string;
      type?: 'Regular' | 'Queue';
      doesSendEmailToMembers?: boolean;
    }
  ): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      const result = await this.create(userId, 'Group', {
        Name: groupData.name,
        DeveloperName: groupData.developerName.replace(/\s+/g, '_'),
        Type: groupData.type || 'Regular',
        DoesIncludeBosses: true,
        DoesSendEmailToMembers: groupData.doesSendEmailToMembers || false,
      });
      
      return { success: true, groupId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add member to group
   */
  async addGroupMember(
    userId: string,
    groupId: string,
    memberId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.create(userId, 'GroupMember', {
        GroupId: groupId,
        UserOrGroupId: memberId,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List groups
   */
  async listGroups(userId: string): Promise<any> {
    return this.query(userId, "SELECT Id, Name, DeveloperName, Type FROM Group WHERE Type IN ('Regular', 'Queue') ORDER BY Name");
  }

  /**
   * Create a queue (for case/lead assignment)
   */
  async createQueue(
    userId: string,
    queueData: {
      name: string;
      developerName: string;
      supportedObjects: string[];
      email?: string;
    }
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      // Create the queue group
      const group = await this.create(userId, 'Group', {
        Name: queueData.name,
        DeveloperName: queueData.developerName.replace(/\s+/g, '_'),
        Type: 'Queue',
        Email: queueData.email,
      });
      
      // Add supported objects
      for (const objectName of queueData.supportedObjects) {
        await this.create(userId, 'QueueSobject', {
          QueueId: group.id,
          SobjectType: objectName,
        });
      }
      
      return { success: true, queueId: group.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute SOSL search with highlighted results
   */
  async searchWithHighlight(userId: string, searchTerm: string, objects: string[]): Promise<any> {
    const objectString = objects.map(obj => `${obj}(Id, Name)`).join(', ');
    const sosl = `FIND {${searchTerm}} IN ALL FIELDS RETURNING ${objectString}`;
    return this.search(userId, sosl);
  }

  /**
   * Get schema overview for an object (optimized for AI understanding)
   */
  async getSchemaOverview(userId: string, objectName: string): Promise<{
    objectName: string;
    label: string;
    isCustom: boolean;
    totalFields: number;
    requiredFields: { name: string; type: string }[];
    customFields: { name: string; label: string; type: string }[];
    relationships: { name: string; relatedTo: string; type: string }[];
    recordTypes: { id: string; name: string; active: boolean }[];
  }> {
    const [describe, recordTypes] = await Promise.all([
      this.describeSObject(userId, objectName),
      this.listRecordTypes(userId, objectName).catch(() => ({ records: [] })),
    ]);
    
    return {
      objectName: describe.name,
      label: describe.label,
      isCustom: describe.custom,
      totalFields: describe.fields?.length || 0,
      requiredFields: describe.fields
        ?.filter((f: any) => !f.nillable && f.createable && !f.defaultedOnCreate)
        ?.map((f: any) => ({ name: f.name, type: f.type })) || [],
      customFields: describe.fields
        ?.filter((f: any) => f.custom)
        ?.map((f: any) => ({ name: f.name, label: f.label, type: f.type })) || [],
      relationships: describe.fields
        ?.filter((f: any) => f.type === 'reference')
        ?.map((f: any) => ({ 
          name: f.name, 
          relatedTo: f.referenceTo?.[0] || 'Unknown', 
          type: f.relationshipOrder ? 'MasterDetail' : 'Lookup' 
        })) || [],
      recordTypes: recordTypes.records?.map((rt: any) => ({
        id: rt.Id,
        name: rt.Name,
        active: rt.IsActive,
      })) || [],
    };
  }

  /**
   * Bulk create records
   */
  async bulkCreate(
    userId: string,
    objectType: string,
    records: Record<string, any>[],
    allOrNone: boolean = false
  ): Promise<{ success: boolean; results: { id?: string; success: boolean; errors?: string[] }[]; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/composite/sobjects`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            allOrNone,
            records: records.map(r => ({ attributes: { type: objectType }, ...r })),
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Bulk create failed');
      }
      
      const results = await response.json();
      return {
        success: results.every((r: any) => r.success),
        results: results.map((r: any) => ({
          id: r.id,
          success: r.success,
          errors: r.errors?.map((e: any) => e.message),
        })),
      };
    } catch (error) {
      return { success: false, results: [], error: error.message };
    }
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(
    userId: string,
    objectType: string,
    records: { id: string; [key: string]: any }[],
    allOrNone: boolean = false
  ): Promise<{ success: boolean; results: { id: string; success: boolean; errors?: string[] }[]; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/composite/sobjects`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            allOrNone,
            records: records.map(r => ({ 
              attributes: { type: objectType }, 
              Id: r.id,
              ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'id')),
            })),
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Bulk update failed');
      }
      
      const results = await response.json();
      return {
        success: results.every((r: any) => r.success),
        results: results.map((r: any) => ({
          id: r.id,
          success: r.success,
          errors: r.errors?.map((e: any) => e.message),
        })),
      };
    } catch (error) {
      return { success: false, results: [], error: error.message };
    }
  }

  /**
   * Bulk delete records
   */
  async bulkDelete(
    userId: string,
    recordIds: string[],
    allOrNone: boolean = false
  ): Promise<{ success: boolean; results: { id: string; success: boolean; errors?: string[] }[]; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/composite/sobjects?ids=${recordIds.join(',')}&allOrNone=${allOrNone}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Bulk delete failed');
      }
      
      const results = await response.json();
      return {
        success: results.every((r: any) => r.success),
        results: results.map((r: any) => ({
          id: r.id,
          success: r.success,
          errors: r.errors?.map((e: any) => e.message),
        })),
      };
    } catch (error) {
      return { success: false, results: [], error: error.message };
    }
  }

  /**
   * Get record count for an object
   */
  async getRecordCount(userId: string, objectName: string, whereClause?: string): Promise<number> {
    let query = `SELECT COUNT() FROM ${objectName}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    const result = await this.query(userId, query);
    return result.totalSize;
  }

  /**
   * Clone a record with related records
   */
  async cloneRecord(
    userId: string,
    objectType: string,
    recordId: string,
    fieldOverrides?: Record<string, any>,
    excludeFields?: string[]
  ): Promise<{ success: boolean; newRecordId?: string; error?: string }> {
    try {
      // Get the original record
      const describe = await this.describeSObject(userId, objectType);
      const creatableFields = describe.fields
        ?.filter((f: any) => f.createable && !excludeFields?.includes(f.name))
        ?.map((f: any) => f.name) || [];

      const escapedRecordId = this.escapeSoqlId(recordId);
      const escapedObjectType = this.escapeSoql(objectType);
      const originalQuery = `SELECT ${creatableFields.join(', ')} FROM ${escapedObjectType} WHERE Id = '${escapedRecordId}'`;
      const original = await this.query(userId, originalQuery);
      
      if (!original.records || original.records.length === 0) {
        return { success: false, error: 'Original record not found' };
      }
      
      const recordData = { ...original.records[0] };
      delete recordData.Id;
      delete recordData.attributes;
      
      // Apply overrides
      if (fieldOverrides) {
        Object.assign(recordData, fieldOverrides);
      }
      
      const result = await this.create(userId, objectType, recordData);
      return { success: true, newRecordId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get picklist values for a field
   */
  async getPicklistValues(userId: string, objectName: string, fieldName: string): Promise<{
    values: { label: string; value: string; isDefault: boolean; isActive: boolean }[];
    controllingField?: string;
  }> {
    const describe = await this.describeSObject(userId, objectName);
    const field = describe.fields?.find((f: any) => f.name === fieldName);
    
    if (!field) {
      throw new Error(`Field ${fieldName} not found on ${objectName}`);
    }
    
    return {
      values: field.picklistValues?.map((p: any) => ({
        label: p.label,
        value: p.value,
        isDefault: p.defaultValue,
        isActive: p.active,
      })) || [],
      controllingField: field.controllerName,
    };
  }

  /**
   * Create sharing rule
   */
  async createSharingRule(
    userId: string,
    objectName: string,
    ruleData: {
      name: string;
      sharedTo: string; // Group or Role ID
      sharedFrom?: string; // For owner-based rules
      accessLevel: 'Read' | 'Edit';
      criteriaField?: string;
      criteriaValue?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Sharing rules are complex - using Tooling API
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);
      
      const metadata = {
        fullName: `${objectName}.${ruleData.name}`,
        accessLevel: ruleData.accessLevel,
        sharedTo: { group: ruleData.sharedTo },
        label: ruleData.name,
      };
      
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/SharingRules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ FullName: metadata.fullName, Metadata: metadata }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || 'Failed to create sharing rule');
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get valid converted lead statuses from Salesforce
   * Returns statuses where IsConverted = true
   */
  async getLeadConvertedStatuses(userId: string): Promise<{ statuses: string[] }> {
    try {
      const result = await this.query(
        userId,
        "SELECT MasterLabel FROM LeadStatus WHERE IsConverted = true ORDER BY SortOrder"
      );

      const statuses = result.records.map((r: any) => r.MasterLabel);
      return { statuses };
    } catch (error) {
      this.logger.error(`Failed to get lead converted statuses: ${error.message}`);
      // Return common default statuses as fallback
      return { statuses: ['Closed - Converted', 'Qualified', 'Converted'] };
    }
  }

  /**
   * Convert a Salesforce Lead to Account, Contact, and optionally Opportunity
   * Uses the Salesforce REST API actions/standard/LeadConvert endpoint
   */
  async convertLead(
    userId: string,
    leadId: string,
    options: {
      convertedStatus: string;
      doNotCreateOpportunity?: boolean;
      opportunityName?: string;
      accountId?: string;
      contactId?: string;
      ownerId?: string;
    },
  ): Promise<{
    success: boolean;
    leadId: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
    errors?: string[];
  }> {
    // Validate Salesforce ID format
    if (!IdValidator.isSalesforceId(leadId)) {
      const idType = IdValidator.getIdType(leadId);
      if (idType === 'local') {
        throw new BadRequestException(
          `Invalid Salesforce Lead ID: "${leadId}" appears to be a local database ID (CUID format). ` +
          `For local leads, use the regular lead conversion endpoint instead.`,
        );
      }
      throw new BadRequestException(
        `Invalid Salesforce Lead ID format: "${leadId}". Expected a 15 or 18-character Salesforce ID.`,
      );
    }

    const normalizedLeadId = IdValidator.normalizeSalesforceId(leadId);

    if (this.shouldThrottle()) {
      this.logger.warn('Salesforce API limit approaching - throttling request');
      throw new Error('Salesforce API limit approaching. Please try again later.');
    }
    this.trackApiCall();
    const startTime = Date.now();

    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    // Use Execute Anonymous Apex for lead conversion (the most reliable REST API approach)
    // This calls Database.convertLead() which is the native Salesforce lead conversion
    // Escape strings for Apex string literals (similar to SOQL escaping)
    const escapedConvertedStatus = this.escapeSoql(options.convertedStatus);
    const escapedOpportunityName = options.opportunityName ? this.escapeSoql(options.opportunityName) : '';
    const escapedAccountId = options.accountId ? this.escapeSoqlId(options.accountId) : '';
    const escapedContactId = options.contactId ? this.escapeSoqlId(options.contactId) : '';
    const escapedOwnerId = options.ownerId ? this.escapeSoqlId(options.ownerId) : '';

    const apexCode = `
      Database.LeadConvert lc = new Database.LeadConvert();
      lc.setLeadId('${normalizedLeadId}');
      lc.setConvertedStatus('${escapedConvertedStatus}');
      lc.setDoNotCreateOpportunity(${options.doNotCreateOpportunity ? 'true' : 'false'});
      ${options.opportunityName ? `lc.setOpportunityName('${escapedOpportunityName}');` : ''}
      ${options.accountId ? `lc.setAccountId('${escapedAccountId}');` : ''}
      ${options.contactId ? `lc.setContactId('${escapedContactId}');` : ''}
      ${options.ownerId ? `lc.setOwnerId('${escapedOwnerId}');` : ''}

      Database.LeadConvertResult lcr = Database.convertLead(lc);

      // Output results as debug log (will be captured in response)
      System.debug('CONVERT_RESULT:' + JSON.serialize(new Map<String, Object>{
        'success' => lcr.isSuccess(),
        'accountId' => lcr.getAccountId(),
        'contactId' => lcr.getContactId(),
        'opportunityId' => lcr.getOpportunityId(),
        'errors' => lcr.getErrors()
      }));
    `;

    this.logger.debug(`Converting Salesforce Lead: ${normalizedLeadId} via Execute Anonymous`);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/executeAnonymous?anonymousBody=${encodeURIComponent(apexCode)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const latencyMs = Date.now() - startTime;
    const responseOk = response.ok;

    this.usageTrackingService.logUsage({
      userId,
      serviceType: ApiServiceType.SALESFORCE,
      serviceName: 'salesforce-api',
      operation: 'convert_lead',
      apiCalls: 1,
      latencyMs,
      success: responseOk,
      metadata: { leadId: normalizedLeadId },
    }).catch(err => this.logger.error(`Failed to log SF usage: ${err.message}`));

    const result = await response.json().catch(() => ({}));

    // Log the full response for debugging
    this.logger.debug(`Execute Anonymous response: ${JSON.stringify(result)}`);

    if (!response.ok) {
      const errorMessage = result?.message || 'Failed to execute lead conversion';
      this.logger.error(`Salesforce lead conversion error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Check if execution was successful
    if (!result.success) {
      const errorMessage = result.compileProblem || result.exceptionMessage || 'Lead conversion failed';
      this.logger.error(`Lead conversion failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Parse the debug log to get conversion results
    const debugLog = result.debugLog || '';
    const resultMatch = debugLog.match(/CONVERT_RESULT:(\{.*\})/);

    let accountId: string | undefined;
    let contactId: string | undefined;
    let opportunityId: string | undefined;

    if (resultMatch) {
      try {
        const convertResult = JSON.parse(resultMatch[1]);
        if (!convertResult.success) {
          const errors = convertResult.errors?.map((e: any) => e.message || e.Message) || ['Unknown conversion error'];
          this.logger.error(`Lead conversion failed: ${errors.join(', ')}`);
          return {
            success: false,
            leadId: normalizedLeadId,
            errors,
          };
        }
        accountId = convertResult.accountId;
        contactId = convertResult.contactId;
        opportunityId = convertResult.opportunityId;
      } catch (e) {
        this.logger.warn(`Could not parse conversion result from debug log: ${e.message}`);
      }
    }

    // If we couldn't parse results from debug log, query the converted lead
    if (!accountId || !contactId) {
      const escapedLeadId = this.escapeSoqlId(normalizedLeadId);
      const leadQuery = await this.query(
        userId,
        `SELECT ConvertedAccountId, ConvertedContactId, ConvertedOpportunityId FROM Lead WHERE Id = '${escapedLeadId}'`
      );
      if (leadQuery.records[0]) {
        accountId = leadQuery.records[0].ConvertedAccountId;
        contactId = leadQuery.records[0].ConvertedContactId;
        opportunityId = leadQuery.records[0].ConvertedOpportunityId;
      }
    }

    this.logger.log(`Lead ${normalizedLeadId} converted successfully - Account: ${accountId}, Contact: ${contactId}, Opportunity: ${opportunityId || 'none'}`);

    return {
      success: true,
      leadId: normalizedLeadId,
      accountId,
      contactId,
      opportunityId,
    };
  }

  /**
   * Get org information
   */
  async getOrgInfo(userId: string): Promise<{
    id: string;
    name: string;
    instanceName: string;
    isSandbox: boolean;
    organizationType: string;
    defaultCurrency: string;
    languageLocale: string;
    features: string[];
  }> {
    const result = await this.query(userId,
      'SELECT Id, Name, InstanceName, IsSandbox, OrganizationType, DefaultCurrencyIsoCode, LanguageLocaleKey FROM Organization LIMIT 1'
    );

    const org = result.records[0];
    const limits = await this.getOrgLimits(userId);

    return {
      id: org.Id,
      name: org.Name,
      instanceName: org.InstanceName,
      isSandbox: org.IsSandbox,
      organizationType: org.OrganizationType,
      defaultCurrency: org.DefaultCurrencyIsoCode,
      languageLocale: org.LanguageLocaleKey,
      features: Object.keys(limits).filter(k => limits[k].Max > 0),
    };
  }

  /**
   * Get dashboard statistics from Salesforce CRM
   * Aggregates key metrics for the Sales Command Center dashboard
   */
  async getDashboardStats(userId: string): Promise<{
    leads: {
      total: number;
      new: number;
      working: number;
      qualified: number;
      converted: number;
      thisMonth: number;
      conversionRate: number;
    };
    opportunities: {
      total: number;
      open: number;
      won: number;
      lost: number;
      pipeline: number;
      closedWon: number;
      winRate: number;
      byStage: Record<string, { count: number; amount: number }>;
    };
    accounts: {
      total: number;
      thisMonth: number;
      withOpportunities: number;
    };
    contacts: {
      total: number;
      thisMonth: number;
    };
    tasks: {
      total: number;
      open: number;
      overdue: number;
      completedThisWeek: number;
    };
    activities: {
      callsThisWeek: number;
      meetingsThisWeek: number;
      emailsThisWeek: number;
    };
    quotes: {
      total: number;
      active: number;
    };
    contracts: {
      total: number;
      active: number;
    };
    forecast: {
      quarterRevenue: number;
      quarterBestCase: number;
      confidence: string;
      quarterName: string;
      opportunityCount: number;
    };
    recentLeads: Array<{
      id: string;
      firstName: string;
      lastName: string;
      company: string;
      email: string;
      status: string;
      rating: string;
    }>;
    recentOpportunities: Array<{
      id: string;
      name: string;
      accountName: string;
      amount: number;
      stageName: string;
      probability: number;
      closeDate: string;
    }>;
  }> {
    this.logger.log(`Fetching dashboard stats for user ${userId}`);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Run optimized parallel SOQL queries
    const [
      leadStats,
      leadsByStatus,
      leadsThisMonth,
      convertedLeads,
      oppStats,
      oppByStage,
      oppWonLost,
      accountStats,
      accountsWithOpps,
      contactStats,
      taskStats,
      overdueTaskCount,
      completedTasksThisWeek,
      activityStats,
      quoteStats,
      activeQuoteStats,
      contractStats,
      activeContractStats,
      recentLeadsData,
      recentOppsData,
      forecastStats,
    ] = await Promise.all([
      // Lead total
      this.query(userId, 'SELECT COUNT() FROM Lead').catch(() => ({ totalSize: 0 })),
      // Leads by status
      this.query(userId, 'SELECT Status, COUNT(Id) cnt FROM Lead GROUP BY Status').catch(() => ({ records: [] })),
      // Leads this month
      this.query(userId, `SELECT COUNT() FROM Lead WHERE CreatedDate >= ${startOfMonth}`).catch(() => ({ totalSize: 0 })),
      // Converted leads (for conversion rate)
      this.query(userId, 'SELECT COUNT() FROM Lead WHERE IsConverted = true').catch(() => ({ totalSize: 0 })),
      // Opportunity totals and pipeline
      this.query(userId, 'SELECT COUNT(Id) cnt, SUM(Amount) total FROM Opportunity WHERE IsClosed = false').catch(() => ({ records: [{ cnt: 0, total: 0 }] })),
      // Opportunities by stage
      this.query(userId, 'SELECT StageName, COUNT(Id) cnt, SUM(Amount) total FROM Opportunity GROUP BY StageName').catch(() => ({ records: [] })),
      // Won/Lost opportunities
      this.query(userId, 'SELECT IsWon, COUNT(Id) cnt, SUM(Amount) total FROM Opportunity WHERE IsClosed = true GROUP BY IsWon').catch(() => ({ records: [] })),
      // Account stats
      this.query(userId, `SELECT COUNT() FROM Account`).catch(() => ({ totalSize: 0 })),
      // Accounts with opportunities
      this.query(userId, 'SELECT COUNT_DISTINCT(AccountId) FROM Opportunity WHERE AccountId != null').catch(() => ({ records: [{ expr0: 0 }] })),
      // Contact stats
      this.query(userId, `SELECT COUNT() FROM Contact`).catch(() => ({ totalSize: 0 })),
      // Task stats
      this.query(userId, 'SELECT IsClosed, COUNT(Id) cnt FROM Task GROUP BY IsClosed').catch(() => ({ records: [] })),
      // Overdue tasks
      this.query(userId, `SELECT COUNT() FROM Task WHERE IsClosed = false AND ActivityDate < ${today}`).catch(() => ({ totalSize: 0 })),
      // Completed tasks this week
      this.query(userId, `SELECT COUNT() FROM Task WHERE IsClosed = true AND LastModifiedDate >= ${startOfWeek}`).catch(() => ({ totalSize: 0 })),
      // Activity stats this week (Events for meetings/calls) - use Subject instead of Type as Type may not exist
      this.query(userId, `SELECT Subject, COUNT(Id) cnt FROM Event WHERE StartDateTime >= ${startOfWeek}T00:00:00Z GROUP BY Subject`).catch(() => ({ records: [] })),
      // Quote stats (may not exist in all orgs)
      this.query(userId, 'SELECT COUNT() FROM Quote').catch(() => ({ totalSize: 0 })),
      // Active quotes
      this.query(userId, "SELECT COUNT() FROM Quote WHERE Status = 'Draft' OR Status = 'In Review' OR Status = 'Needs Review'").catch(() => ({ totalSize: 0 })),
      // Contract stats (may not exist in all orgs)
      this.query(userId, 'SELECT COUNT() FROM Contract').catch(() => ({ totalSize: 0 })),
      // Active contracts
      this.query(userId, "SELECT COUNT() FROM Contract WHERE Status = 'Draft' OR Status = 'In Approval Process' OR Status = 'Activated'").catch(() => ({ totalSize: 0 })),
      // Recent hot leads (top 10 by rating/status)
      this.query(userId, "SELECT Id, FirstName, LastName, Company, Email, Status, Rating FROM Lead WHERE IsConverted = false ORDER BY CreatedDate DESC LIMIT 10").catch(() => ({ records: [] })),
      // Recent opportunities (top 10 by amount)
      this.query(userId, "SELECT Id, Name, Account.Name, Amount, StageName, Probability, CloseDate FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC NULLS LAST LIMIT 10").catch(() => ({ records: [] })),
      // Forecast for this fiscal quarter (probability-weighted)
      this.query(userId, "SELECT SUM(ExpectedRevenue) Forecast, SUM(Amount) BestCase, COUNT(Id) Deals FROM Opportunity WHERE IsClosed = false AND CloseDate = THIS_FISCAL_QUARTER").catch(() => ({ records: [{ Forecast: 0, BestCase: 0, Deals: 0 }] })),
    ]);

    // Process lead stats
    const leadStatusMap: Record<string, number> = {};
    for (const rec of leadsByStatus.records || []) {
      leadStatusMap[rec.Status?.toLowerCase() || 'unknown'] = rec.cnt || 0;
    }

    const totalLeads = leadStats.totalSize || 0;
    const convertedLeadCount = convertedLeads.totalSize || 0;
    const conversionRate = totalLeads > 0 ? Math.round((convertedLeadCount / totalLeads) * 100) : 0;

    // Process opportunity stats
    const oppRecord = oppStats.records?.[0] || { cnt: 0, total: 0 };
    const openOpps = oppRecord.cnt || 0;
    const pipelineAmount = oppRecord.total || 0;

    const byStage: Record<string, { count: number; amount: number }> = {};
    let totalOpps = 0;
    for (const rec of oppByStage.records || []) {
      byStage[rec.StageName || 'Unknown'] = {
        count: rec.cnt || 0,
        amount: rec.total || 0,
      };
      totalOpps += rec.cnt || 0;
    }

    let wonCount = 0, lostCount = 0, closedWonAmount = 0;
    for (const rec of oppWonLost.records || []) {
      if (rec.IsWon) {
        wonCount = rec.cnt || 0;
        closedWonAmount = rec.total || 0;
      } else {
        lostCount = rec.cnt || 0;
      }
    }
    const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

    // Process task stats
    let openTasks = 0, closedTasks = 0;
    for (const rec of taskStats.records || []) {
      if (rec.IsClosed) {
        closedTasks = rec.cnt || 0;
      } else {
        openTasks = rec.cnt || 0;
      }
    }

    // Process activity stats (using Subject field since Type may not exist)
    let callsThisWeek = 0, meetingsThisWeek = 0, emailsThisWeek = 0;
    for (const rec of activityStats.records || []) {
      const subject = (rec.Subject || '').toLowerCase();
      const cnt = rec.cnt || 0;
      if (subject.includes('call')) callsThisWeek += cnt;
      else if (subject.includes('meeting') || subject.includes('event') || subject.includes('demo')) meetingsThisWeek += cnt;
      else if (subject.includes('email')) emailsThisWeek += cnt;
      else meetingsThisWeek += cnt; // Default events to meetings count
    }

    // Get accounts/contacts created this month
    const [accountsThisMonth, contactsThisMonth] = await Promise.all([
      this.query(userId, `SELECT COUNT() FROM Account WHERE CreatedDate >= ${startOfMonth}`).catch(() => ({ totalSize: 0 })),
      this.query(userId, `SELECT COUNT() FROM Contact WHERE CreatedDate >= ${startOfMonth}`).catch(() => ({ totalSize: 0 })),
    ]);

    return {
      leads: {
        total: totalLeads,
        new: leadStatusMap['new'] || leadStatusMap['open'] || 0,
        working: leadStatusMap['working'] || leadStatusMap['working - contacted'] || 0,
        qualified: leadStatusMap['qualified'] || 0,
        converted: convertedLeadCount,
        thisMonth: leadsThisMonth.totalSize || 0,
        conversionRate,
      },
      opportunities: {
        total: totalOpps,
        open: openOpps,
        won: wonCount,
        lost: lostCount,
        pipeline: pipelineAmount,
        closedWon: closedWonAmount,
        winRate,
        byStage,
      },
      accounts: {
        total: accountStats.totalSize || 0,
        thisMonth: accountsThisMonth.totalSize || 0,
        withOpportunities: accountsWithOpps.records?.[0]?.expr0 || 0,
      },
      contacts: {
        total: contactStats.totalSize || 0,
        thisMonth: contactsThisMonth.totalSize || 0,
      },
      tasks: {
        total: openTasks + closedTasks,
        open: openTasks,
        overdue: overdueTaskCount.totalSize || 0,
        completedThisWeek: completedTasksThisWeek.totalSize || 0,
      },
      activities: {
        callsThisWeek,
        meetingsThisWeek,
        emailsThisWeek,
      },
      quotes: {
        total: quoteStats.totalSize || 0,
        active: activeQuoteStats.totalSize || 0,
      },
      contracts: {
        total: contractStats.totalSize || 0,
        active: activeContractStats.totalSize || 0,
      },
      forecast: (() => {
        const fRec = forecastStats.records?.[0] || { Forecast: 0, BestCase: 0, Deals: 0 };
        const quarterRevenue = fRec.Forecast || 0;
        const quarterBestCase = fRec.BestCase || 0;
        const oppCount = fRec.Deals || 0;
        // Determine confidence based on ratio of expected to best case
        let confidence = 'Low';
        if (oppCount > 0 && quarterBestCase > 0) {
          const ratio = quarterRevenue / quarterBestCase;
          if (ratio >= 0.6) confidence = 'High';
          else if (ratio >= 0.35) confidence = 'Medium';
        }
        // Dynamic quarter name
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        const quarterName = `Q${quarter} ${now.getFullYear()}`;
        return {
          quarterRevenue,
          quarterBestCase,
          confidence,
          quarterName,
          opportunityCount: oppCount,
        };
      })(),
      recentLeads: (recentLeadsData.records || []).map((lead: any) => ({
        id: lead.Id,
        firstName: lead.FirstName || '',
        lastName: lead.LastName || '',
        company: lead.Company || '',
        email: lead.Email || '',
        status: lead.Status || '',
        rating: lead.Rating || '',
      })),
      recentOpportunities: (recentOppsData.records || []).map((opp: any) => ({
        id: opp.Id,
        name: opp.Name || '',
        accountName: opp.Account?.Name || '',
        amount: opp.Amount || 0,
        stageName: opp.StageName || '',
        probability: opp.Probability || 0,
        closeDate: opp.CloseDate || '',
      })),
    };
  }

  /**
   * List leads from Salesforce with pagination and smart sorting
   * Default sort: Hot leads first, then by creation date
   */
  async listSalesforceLeads(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      rating?: string;
      search?: string;
      sortBy?: 'rating' | 'created' | 'company';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce leads for user ${userId}`);

    // Build WHERE clause with proper SOQL escaping
    const conditions: string[] = ['IsConverted = false'];
    if (filters?.status) {
      conditions.push(`Status = '${this.escapeSoql(filters.status)}'`);
    }
    if (filters?.rating) {
      conditions.push(`Rating = '${this.escapeSoql(filters.rating)}'`);
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`(FirstName LIKE '%${searchTerm}%' OR LastName LIKE '%${searchTerm}%' OR Company LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%')`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Smart sorting: Hot leads first by default, then by creation date
    let orderBy = 'Rating DESC NULLS LAST, CreatedDate DESC';
    if (filters?.sortBy === 'created') {
      orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
    } else if (filters?.sortBy === 'company') {
      orderBy = filters.sortOrder === 'asc' ? 'Company ASC NULLS LAST' : 'Company DESC NULLS LAST';
    }

    // Get total count first
    const countResult = await this.query(userId, `SELECT COUNT() FROM Lead ${whereClause}`);
    const total = countResult.totalSize || 0;

    // Get paginated data
    const soql = `SELECT Id, FirstName, LastName, Company, Email, Phone, Status, Rating, LeadSource, Industry, Title, CreatedDate
                  FROM Lead ${whereClause}
                  ORDER BY ${orderBy}
                  LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.query(userId, soql);

    const data = (result.records || []).map((lead: any) => ({
      id: lead.Id,
      firstName: lead.FirstName || '',
      lastName: lead.LastName || '',
      company: lead.Company || '',
      email: lead.Email || '',
      phone: lead.Phone || '',
      status: lead.Status || 'NEW',
      rating: lead.Rating || '',
      leadSource: lead.LeadSource || '',
      industry: lead.Industry || '',
      title: lead.Title || '',
      leadScore: lead.Rating === 'Hot' ? 90 : lead.Rating === 'Warm' ? 60 : 30,
      createdAt: lead.CreatedDate,
    }));

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List opportunities from Salesforce with pagination and smart sorting
   * Default sort: Highest value opportunities with nearest close date first
   */
  async listSalesforceOpportunities(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      stage?: string;
      isClosed?: boolean;
      minAmount?: number;
      search?: string;
      sortBy?: 'amount' | 'closeDate' | 'probability' | 'created';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce opportunities for user ${userId}`);

    // Build WHERE clause with proper SOQL escaping
    const conditions: string[] = [];
    if (filters?.stage) {
      conditions.push(`StageName = '${this.escapeSoql(filters.stage)}'`);
    }
    if (filters?.isClosed !== undefined) {
      conditions.push(`IsClosed = ${filters.isClosed}`);
    }
    if (filters?.minAmount) {
      // Validate minAmount is a number to prevent injection
      const minAmountNum = Number(filters.minAmount);
      if (!isNaN(minAmountNum)) {
        conditions.push(`Amount >= ${minAmountNum}`);
      }
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`(Name LIKE '%${searchTerm}%' OR Account.Name LIKE '%${searchTerm}%')`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Smart sorting: High value deals with upcoming close dates by default
    let orderBy = 'Amount DESC NULLS LAST, CloseDate ASC NULLS LAST';
    if (filters?.sortBy === 'closeDate') {
      orderBy = filters.sortOrder === 'desc' ? 'CloseDate DESC NULLS LAST' : 'CloseDate ASC NULLS LAST';
    } else if (filters?.sortBy === 'probability') {
      orderBy = filters.sortOrder === 'asc' ? 'Probability ASC' : 'Probability DESC';
    } else if (filters?.sortBy === 'created') {
      orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
    } else if (filters?.sortBy === 'amount') {
      orderBy = filters.sortOrder === 'asc' ? 'Amount ASC NULLS LAST' : 'Amount DESC NULLS LAST';
    }

    // Get total count first
    const countResult = await this.query(userId, `SELECT COUNT() FROM Opportunity ${whereClause}`);
    const total = countResult.totalSize || 0;

    // Get paginated data
    const soql = `SELECT Id, Name, Account.Name, Account.Id, Amount, StageName, Probability, CloseDate, Type, LeadSource, CreatedDate, ExpectedRevenue, IsClosed, IsWon
                  FROM Opportunity ${whereClause}
                  ORDER BY ${orderBy}
                  LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.query(userId, soql);

    const data = (result.records || []).map((opp: any) => ({
      id: opp.Id,
      name: opp.Name || '',
      accountName: opp.Account?.Name || '',
      accountId: opp.Account?.Id || '',
      account: opp.Account ? { id: opp.Account.Id, name: opp.Account.Name } : null,
      amount: opp.Amount || 0,
      stage: opp.StageName || 'QUALIFIED',
      probability: opp.Probability || 0,
      expectedCloseDate: opp.CloseDate || '',
      closeDate: opp.CloseDate || '',
      type: opp.Type || '',
      leadSource: opp.LeadSource || '',
      createdAt: opp.CreatedDate,
      expectedRevenue: opp.ExpectedRevenue || 0,
      isClosed: opp.IsClosed || false,
      isWon: opp.IsWon || false,
    }));

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List accounts from Salesforce with pagination and smart sorting
   * Default sort: Highest revenue accounts first
   */
  async listSalesforceAccounts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      industry?: string;
      type?: string;
      search?: string;
      sortBy?: 'revenue' | 'name' | 'employees' | 'created';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce accounts for user ${userId}`);

    // Build WHERE clause with proper SOQL escaping
    const conditions: string[] = [];
    if (filters?.industry) {
      conditions.push(`Industry = '${this.escapeSoql(filters.industry)}'`);
    }
    if (filters?.type) {
      conditions.push(`Type = '${this.escapeSoql(filters.type)}'`);
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`(Name LIKE '%${searchTerm}%' OR Website LIKE '%${searchTerm}%')`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Smart sorting: Highest revenue accounts by default
    let orderBy = 'AnnualRevenue DESC NULLS LAST, Name ASC';
    if (filters?.sortBy === 'name') {
      orderBy = filters.sortOrder === 'desc' ? 'Name DESC' : 'Name ASC';
    } else if (filters?.sortBy === 'employees') {
      orderBy = filters.sortOrder === 'asc' ? 'NumberOfEmployees ASC NULLS LAST' : 'NumberOfEmployees DESC NULLS LAST';
    } else if (filters?.sortBy === 'created') {
      orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
    } else if (filters?.sortBy === 'revenue') {
      orderBy = filters.sortOrder === 'asc' ? 'AnnualRevenue ASC NULLS LAST' : 'AnnualRevenue DESC NULLS LAST';
    }

    // Get total count first
    const countResult = await this.query(userId, `SELECT COUNT() FROM Account ${whereClause}`);
    const total = countResult.totalSize || 0;

    // Get paginated data
    const soql = `SELECT Id, Name, Industry, Type, Phone, Website, AnnualRevenue, NumberOfEmployees, BillingCity, BillingState, BillingCountry, CreatedDate
                  FROM Account ${whereClause}
                  ORDER BY ${orderBy}
                  LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.query(userId, soql);

    const data = (result.records || []).map((account: any) => ({
      id: account.Id,
      name: account.Name || '',
      industry: account.Industry || '',
      accountType: account.Type || '',
      phone: account.Phone || '',
      website: account.Website || '',
      annualRevenue: account.AnnualRevenue || 0,
      numberOfEmployees: account.NumberOfEmployees || 0,
      billingCity: account.BillingCity || '',
      billingState: account.BillingState || '',
      billingCountry: account.BillingCountry || '',
      createdAt: account.CreatedDate,
    }));

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List contacts from Salesforce with pagination
   * Default sort: Most recent first
   */
  async listSalesforceContacts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      accountId?: string;
      search?: string;
      sortBy?: 'name' | 'account' | 'created';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce contacts for user ${userId}`);

    // Build WHERE clause with proper SOQL escaping
    const conditions: string[] = [];
    if (filters?.accountId) {
      const escapedAccountId = this.escapeSoqlId(filters.accountId);
      conditions.push(`AccountId = '${escapedAccountId}'`);
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`(FirstName LIKE '%${searchTerm}%' OR LastName LIKE '%${searchTerm}%' OR Email LIKE '%${searchTerm}%' OR Account.Name LIKE '%${searchTerm}%')`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    let orderBy = 'CreatedDate DESC';
    if (filters?.sortBy === 'name') {
      orderBy = filters.sortOrder === 'desc' ? 'LastName DESC, FirstName DESC' : 'LastName ASC, FirstName ASC';
    } else if (filters?.sortBy === 'account') {
      orderBy = filters.sortOrder === 'desc' ? 'Account.Name DESC NULLS LAST' : 'Account.Name ASC NULLS LAST';
    } else if (filters?.sortBy === 'created') {
      orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
    }

    // Get total count first
    const countResult = await this.query(userId, `SELECT COUNT() FROM Contact ${whereClause}`);
    const total = countResult.totalSize || 0;

    // Get paginated data
    const soql = `SELECT Id, FirstName, LastName, Title, Email, Phone, Account.Name, Account.Id, Department, MailingCity, MailingState, CreatedDate
                  FROM Contact ${whereClause}
                  ORDER BY ${orderBy}
                  LIMIT ${limit} OFFSET ${offset}`;

    const result = await this.query(userId, soql);

    const data = (result.records || []).map((contact: any) => ({
      id: contact.Id,
      firstName: contact.FirstName || '',
      lastName: contact.LastName || '',
      title: contact.Title || '',
      email: contact.Email || '',
      phone: contact.Phone || '',
      accountId: contact.Account?.Id || '',
      account: contact.Account ? { id: contact.Account.Id, name: contact.Account.Name } : null,
      department: contact.Department || '',
      mailingCity: contact.MailingCity || '',
      mailingState: contact.MailingState || '',
      createdAt: contact.CreatedDate,
    }));

    return {
      data,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List quotes from Salesforce with pagination
   * Default sort: Highest value quotes first
   */
  async listSalesforceQuotes(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      search?: string;
      sortBy?: 'amount' | 'expiration' | 'created';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce quotes for user ${userId}`);

    try {
      // Build WHERE clause with proper SOQL escaping
      const conditions: string[] = [];
      if (filters?.status) {
        conditions.push(`Status = '${this.escapeSoql(filters.status)}'`);
      }
      if (filters?.search) {
        const searchTerm = this.escapeSoqlLike(filters.search);
        conditions.push(`(Name LIKE '%${searchTerm}%' OR QuoteNumber LIKE '%${searchTerm}%')`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Smart sorting: Highest value quotes by default
      let orderBy = 'TotalPrice DESC NULLS LAST, CreatedDate DESC';
      if (filters?.sortBy === 'expiration') {
        orderBy = filters.sortOrder === 'desc' ? 'ExpirationDate DESC NULLS LAST' : 'ExpirationDate ASC NULLS LAST';
      } else if (filters?.sortBy === 'created') {
        orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
      } else if (filters?.sortBy === 'amount') {
        orderBy = filters.sortOrder === 'asc' ? 'TotalPrice ASC NULLS LAST' : 'TotalPrice DESC NULLS LAST';
      }

      // Get total count first
      const countResult = await this.query(userId, `SELECT COUNT() FROM Quote ${whereClause}`);
      const total = countResult.totalSize || 0;

      // Get paginated data
      const soql = `SELECT Id, QuoteNumber, Name, Opportunity.Name, Opportunity.Id, TotalPrice, Status, ExpirationDate, CreatedDate
                    FROM Quote ${whereClause}
                    ORDER BY ${orderBy}
                    LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(userId, soql);

      const data = (result.records || []).map((quote: any) => ({
        id: quote.Id,
        quoteNumber: quote.QuoteNumber || '',
        name: quote.Name || '',
        opportunityId: quote.Opportunity?.Id || '',
        opportunityName: quote.Opportunity?.Name || '',
        totalAmount: quote.TotalPrice || 0,
        status: quote.Status || 'DRAFT',
        expirationDate: quote.ExpirationDate || '',
        createdAt: quote.CreatedDate,
      }));

      return {
        data,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.warn('Quote object may not exist in this org');
      return { data: [], total: 0, page: 1, pageSize: limit, totalPages: 0 };
    }
  }

  /**
   * List contracts from Salesforce with pagination
   * Default sort: Active contracts first, then by end date (expiring soon first)
   */
  async listSalesforceContracts(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    filters?: {
      status?: string;
      search?: string;
      sortBy?: 'endDate' | 'account' | 'created';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    this.logger.log(`Listing Salesforce contracts for user ${userId}`);

    try {
      // Build WHERE clause with proper SOQL escaping
      const conditions: string[] = [];
      if (filters?.status) {
        conditions.push(`Status = '${this.escapeSoql(filters.status)}'`);
      }
      if (filters?.search) {
        const searchTerm = this.escapeSoqlLike(filters.search);
        conditions.push(`(ContractNumber LIKE '%${searchTerm}%' OR Account.Name LIKE '%${searchTerm}%')`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Smart sorting: Active contracts first, expiring soon
      let orderBy = 'Status ASC, EndDate ASC NULLS LAST';
      if (filters?.sortBy === 'endDate') {
        orderBy = filters.sortOrder === 'desc' ? 'EndDate DESC NULLS LAST' : 'EndDate ASC NULLS LAST';
      } else if (filters?.sortBy === 'account') {
        orderBy = filters.sortOrder === 'desc' ? 'Account.Name DESC NULLS LAST' : 'Account.Name ASC NULLS LAST';
      } else if (filters?.sortBy === 'created') {
        orderBy = filters.sortOrder === 'asc' ? 'CreatedDate ASC' : 'CreatedDate DESC';
      }

      // Get total count first
      const countResult = await this.query(userId, `SELECT COUNT() FROM Contract ${whereClause}`);
      const total = countResult.totalSize || 0;

      // Get paginated data
      const soql = `SELECT Id, ContractNumber, Account.Name, Account.Id, Status, StartDate, EndDate, ContractTerm, CreatedDate
                    FROM Contract ${whereClause}
                    ORDER BY ${orderBy}
                    LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(userId, soql);

      const data = (result.records || []).map((contract: any) => ({
        id: contract.Id,
        contractNumber: contract.ContractNumber || '',
        name: `Contract ${contract.ContractNumber || contract.Id}`,
        accountId: contract.Account?.Id || '',
        accountName: contract.Account?.Name || '',
        status: contract.Status || 'DRAFT',
        startDate: contract.StartDate || '',
        endDate: contract.EndDate || '',
        contractTerm: contract.ContractTerm || 0,
        createdAt: contract.CreatedDate,
      }));

      return {
        data,
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.warn('Contract object may not exist in this org');
      return { data: [], total: 0, page: 1, pageSize: limit, totalPages: 0 };
    }
  }

  // ============================================================================
  // PAGE LAYOUT MANAGEMENT
  // ============================================================================

  /**
   * List page layouts for an object
   */
  async listPageLayouts(userId: string, objectName: string): Promise<{
    layouts: { id: string; name: string; layoutType: string }[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    // Use Tooling API to query Layout metadata
    const escapedObjectName = this.escapeSoql(objectName);
    const query = `SELECT Id, Name, LayoutType, TableEnumOrId FROM Layout WHERE TableEnumOrId = '${escapedObjectName}'`;

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/query?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to list page layouts');
    }

    const result = await response.json();
    return {
      layouts: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        layoutType: r.LayoutType || 'Standard',
      })),
    };
  }

  /**
   * Get page layout details including sections and fields
   */
  async getPageLayoutDetails(userId: string, layoutId: string): Promise<{
    id: string;
    name: string;
    sections: { label: string; columns: number; fields: string[] }[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/Layout/${layoutId}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get page layout details');
    }

    const layout = await response.json();
    const metadata = layout.Metadata || {};

    return {
      id: layout.Id,
      name: layout.Name,
      sections: (metadata.layoutSections || []).map((section: any) => ({
        label: section.label || 'Untitled Section',
        columns: section.columns || 2,
        fields: (section.layoutColumns || []).flatMap((col: any) =>
          (col.layoutItems || []).map((item: any) => item.field).filter(Boolean)
        ),
      })),
    };
  }

  /**
   * Create a new page layout for an object
   */
  async createPageLayout(
    userId: string,
    objectName: string,
    layoutData: {
      name: string;
      sections: {
        label: string;
        columns?: number;
        style?: 'TwoColumnsTopToBottom' | 'TwoColumnsLeftToRight' | 'OneColumn';
        fields: string[];
      }[];
    }
  ): Promise<{ success: boolean; layoutId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Build layout sections
      const layoutSections = layoutData.sections.map((section, index) => {
        const columns = section.columns || 2;
        const style = section.style || 'TwoColumnsTopToBottom';

        // Distribute fields across columns
        const fieldsPerColumn = Math.ceil(section.fields.length / columns);
        const layoutColumns: { layoutItems: { behavior: string; field: string }[] }[] = [];

        for (let i = 0; i < columns; i++) {
          const columnFields = section.fields.slice(i * fieldsPerColumn, (i + 1) * fieldsPerColumn);
          layoutColumns.push({
            layoutItems: columnFields.map(field => ({
              behavior: 'Edit',
              field: field,
            })),
          });
        }

        return {
          customLabel: true,
          detailHeading: index === 0,
          editHeading: true,
          label: section.label,
          layoutColumns,
          style,
        };
      });

      const metadata = {
        fullName: `${objectName}-${layoutData.name.replace(/\s+/g, '_')}`,
        label: layoutData.name,
        layoutSections,
        showEmailCheckbox: false,
        showHighlightsPanel: true,
        showInteractionLogPanel: false,
        showRunAssignmentRulesCheckbox: false,
        showSubmitAndAttachButton: false,
      };

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/Layout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: metadata.fullName,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error[0]?.message || error.message || 'Failed to create page layout');
      }

      const result = await response.json();
      return { success: true, layoutId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing page layout
   */
  async updatePageLayout(
    userId: string,
    layoutId: string,
    updates: {
      sections?: {
        label: string;
        columns?: number;
        fields: string[];
      }[];
      addFields?: { sectionLabel: string; fields: string[] };
      removeFields?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Get current layout
      const currentLayout = await this.getPageLayoutDetails(userId, layoutId);

      let updatedSections = currentLayout.sections;

      if (updates.sections) {
        updatedSections = updates.sections.map(section => ({
          label: section.label,
          columns: section.columns || 2,
          fields: section.fields,
        }));
      }

      if (updates.addFields) {
        const addFields = updates.addFields;
        const targetSection = updatedSections.find(s => s.label === addFields.sectionLabel);
        if (targetSection) {
          targetSection.fields.push(...addFields.fields);
        }
      }

      if (updates.removeFields) {
        const removeFields = updates.removeFields;
        updatedSections = updatedSections.map(section => ({
          ...section,
          fields: section.fields.filter(f => !removeFields.includes(f)),
        }));
      }

      // Build metadata
      const layoutSections = updatedSections.map((section, index) => {
        const columns = section.columns || 2;
        const fieldsPerColumn = Math.ceil(section.fields.length / columns);
        const layoutColumns: { layoutItems: { behavior: string; field: string }[] }[] = [];

        for (let i = 0; i < columns; i++) {
          const columnFields = section.fields.slice(i * fieldsPerColumn, (i + 1) * fieldsPerColumn);
          layoutColumns.push({
            layoutItems: columnFields.map(field => ({
              behavior: 'Edit',
              field: field,
            })),
          });
        }

        return {
          customLabel: true,
          detailHeading: index === 0,
          editHeading: true,
          label: section.label,
          layoutColumns,
          style: 'TwoColumnsTopToBottom',
        };
      });

      await this.toolingUpdate(userId, 'Layout', layoutId, {
        Metadata: { layoutSections },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Assign a page layout to a profile
   */
  async assignPageLayoutToProfile(
    userId: string,
    objectName: string,
    layoutName: string,
    profileName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // This requires Metadata API deployment
      const metadata = {
        layoutAssignments: [{
          layout: `${objectName}-${layoutName}`,
          recordType: null, // Default record type
        }],
      };

      // Update profile using Tooling API
      const escapedProfileName = this.escapeSoql(profileName);
      const profileQuery = `SELECT Id FROM Profile WHERE Name = '${escapedProfileName}'`;
      const profileResult = await this.toolingQuery(userId, profileQuery);

      if (!profileResult.records || profileResult.records.length === 0) {
        throw new Error(`Profile '${profileName}' not found`);
      }

      // Note: Full profile layout assignment requires Metadata API deploy
      // For now, return instructions
      return {
        success: true,
        error: 'Layout assignment requires Metadata API deployment. Use sf_deploy_metadata for full deployment.'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // APEX CLASS DEPLOYMENT
  // ============================================================================

  /**
   * Deploy an Apex class to Salesforce
   */
  async deployApexClass(
    userId: string,
    classData: {
      name: string;
      body: string;
      apiVersion?: number;
      status?: 'Active' | 'Deleted';
    }
  ): Promise<{ success: boolean; classId?: string; errors?: string[]; warnings?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Check if class already exists
      const escapedClassName = this.escapeSoql(classData.name);
      const existingQuery = `SELECT Id FROM ApexClass WHERE Name = '${escapedClassName}'`;
      const existing = await this.toolingQuery(userId, existingQuery);

      if (existing.records && existing.records.length > 0) {
        // Update existing class
        const classId = existing.records[0].Id;

        // Create a MetadataContainer for the update
        const containerResponse = await fetch(
          `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/MetadataContainer`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ Name: `ApexContainer_${Date.now()}` }),
          }
        );

        if (!containerResponse.ok) {
          throw new Error('Failed to create MetadataContainer');
        }

        const container = await containerResponse.json();
        const containerId = container.id;

        // Create ApexClassMember
        const memberResponse = await fetch(
          `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApexClassMember`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              MetadataContainerId: containerId,
              ContentEntityId: classId,
              Body: classData.body,
            }),
          }
        );

        if (!memberResponse.ok) {
          const error = await memberResponse.json();
          throw new Error(error[0]?.message || 'Failed to create ApexClassMember');
        }

        // Deploy container
        const deployResponse = await fetch(
          `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ContainerAsyncRequest`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              MetadataContainerId: containerId,
              IsCheckOnly: false,
            }),
          }
        );

        if (!deployResponse.ok) {
          throw new Error('Failed to create deployment request');
        }

        const deployment = await deployResponse.json();

        // Poll for completion
        const result = await this.pollApexDeployment(userId, deployment.id);

        return {
          success: result.State === 'Completed',
          classId: classId,
          errors: result.DeployDetails?.componentFailures?.map((f: any) => f.problem) || [],
          warnings: result.DeployDetails?.componentSuccesses?.filter((s: any) => s.warning).map((s: any) => s.warning) || [],
        };
      } else {
        // Create new class
        const response = await fetch(
          `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApexClass`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              Name: classData.name,
              Body: classData.body,
              ApiVersion: classData.apiVersion || 59.0,
              Status: classData.status || 'Active',
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          const errors = Array.isArray(error) ? error : [error];
          return {
            success: false,
            errors: errors.map((e: any) => e.message || e.errorCode || 'Unknown error'),
          };
        }

        const result = await response.json();
        return { success: true, classId: result.id };
      }
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Poll for Apex deployment completion
   */
  private async pollApexDeployment(userId: string, requestId: string, maxAttempts: number = 30): Promise<any> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ContainerAsyncRequest/${requestId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const result = await response.json();

      if (result.State === 'Completed' || result.State === 'Failed' || result.State === 'Error') {
        return result;
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Deployment timed out');
  }

  /**
   * Deploy an Apex trigger
   */
  async deployApexTrigger(
    userId: string,
    triggerData: {
      name: string;
      body: string;
      objectName: string;
      apiVersion?: number;
    }
  ): Promise<{ success: boolean; triggerId?: string; errors?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApexTrigger`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Name: triggerData.name,
            Body: triggerData.body,
            TableEnumOrId: triggerData.objectName,
            ApiVersion: triggerData.apiVersion || 59.0,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        const errors = Array.isArray(error) ? error : [error];
        return {
          success: false,
          errors: errors.map((e: any) => e.message || e.errorCode || 'Unknown error'),
        };
      }

      const result = await response.json();
      return { success: true, triggerId: result.id };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Delete an Apex class
   */
  async deleteApexClass(userId: string, classId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApexClass/${classId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete Apex class');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // LIGHTNING WEB COMPONENT DEPLOYMENT
  // ============================================================================

  /**
   * Deploy a Lightning Web Component
   */
  async deployLwc(
    userId: string,
    componentData: {
      name: string;
      jsContent: string;
      htmlContent?: string;
      cssContent?: string;
      metaXml: string;
      apiVersion?: number;
    }
  ): Promise<{ success: boolean; bundleId?: string; errors?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Check if bundle already exists
      const escapedComponentName = this.escapeSoql(componentData.name);
      const existingQuery = `SELECT Id FROM LightningComponentBundle WHERE DeveloperName = '${escapedComponentName}'`;
      const existing = await this.toolingQuery(userId, existingQuery);

      const apiVersion = componentData.apiVersion || 59.0;

      if (existing.records && existing.records.length > 0) {
        // Update existing bundle - need to update individual resources
        const bundleId = existing.records[0].Id;

        // Get existing resources
        const escapedBundleId = this.escapeSoqlId(bundleId);
        const resourcesQuery = `SELECT Id, FilePath FROM LightningComponentResource WHERE LightningComponentBundleId = '${escapedBundleId}'`;
        const resources = await this.toolingQuery(userId, resourcesQuery);

        for (const resource of resources.records || []) {
          let newSource: string | undefined;

          if (resource.FilePath.endsWith('.js')) {
            newSource = componentData.jsContent;
          } else if (resource.FilePath.endsWith('.html') && componentData.htmlContent) {
            newSource = componentData.htmlContent;
          } else if (resource.FilePath.endsWith('.css') && componentData.cssContent) {
            newSource = componentData.cssContent;
          } else if (resource.FilePath.endsWith('.js-meta.xml')) {
            newSource = componentData.metaXml;
          }

          if (newSource) {
            await this.toolingUpdate(userId, 'LightningComponentResource', resource.Id, {
              Source: newSource,
            });
          }
        }

        return { success: true, bundleId };
      } else {
        // Create new bundle
        const bundleResponse = await fetch(
          `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/LightningComponentBundle`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              FullName: componentData.name,
              Metadata: {
                apiVersion: apiVersion,
                isExposed: true,
                targets: {
                  target: ['lightning__RecordPage', 'lightning__AppPage', 'lightning__HomePage'],
                },
              },
            }),
          }
        );

        if (!bundleResponse.ok) {
          const error = await bundleResponse.json();
          throw new Error(error[0]?.message || error.message || 'Failed to create LWC bundle');
        }

        const bundle = await bundleResponse.json();
        const bundleId = bundle.id;

        // Create JS resource
        await this.createLwcResource(userId, bundleId, `${componentData.name}.js`, componentData.jsContent);

        // Create HTML resource if provided
        if (componentData.htmlContent) {
          await this.createLwcResource(userId, bundleId, `${componentData.name}.html`, componentData.htmlContent);
        }

        // Create CSS resource if provided
        if (componentData.cssContent) {
          await this.createLwcResource(userId, bundleId, `${componentData.name}.css`, componentData.cssContent);
        }

        // Create meta XML resource
        await this.createLwcResource(userId, bundleId, `${componentData.name}.js-meta.xml`, componentData.metaXml);

        return { success: true, bundleId };
      }
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Create an LWC resource file
   */
  private async createLwcResource(
    userId: string,
    bundleId: string,
    filePath: string,
    source: string
  ): Promise<void> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/LightningComponentResource`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          LightningComponentBundleId: bundleId,
          FilePath: filePath,
          Source: source,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error[0]?.message || `Failed to create resource: ${filePath}`);
    }
  }

  /**
   * List Lightning Web Components
   */
  async listLwcComponents(userId: string): Promise<{
    components: { id: string; name: string; apiVersion: number; masterLabel: string }[];
  }> {
    const query = `SELECT Id, DeveloperName, ApiVersion, MasterLabel FROM LightningComponentBundle ORDER BY DeveloperName`;
    const result = await this.toolingQuery(userId, query);

    return {
      components: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.DeveloperName,
        apiVersion: r.ApiVersion,
        masterLabel: r.MasterLabel || r.DeveloperName,
      })),
    };
  }

  /**
   * Delete an LWC component
   */
  async deleteLwcComponent(userId: string, bundleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/LightningComponentBundle/${bundleId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete LWC component');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // WORKFLOW RULES (Legacy - Prefer Flows)
  // ============================================================================

  /**
   * List workflow rules for an object
   */
  async listWorkflowRules(userId: string, objectName?: string): Promise<{
    rules: { id: string; name: string; objectName: string; isActive: boolean; description: string }[];
  }> {
    let query = `SELECT Id, Name, TableEnumOrId, Description FROM WorkflowRule`;
    if (objectName) {
      const escapedObjectName = this.escapeSoql(objectName);
      query += ` WHERE TableEnumOrId = '${escapedObjectName}'`;
    }
    query += ` ORDER BY Name`;

    const result = await this.toolingQuery(userId, query);

    return {
      rules: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        objectName: r.TableEnumOrId,
        isActive: true, // Workflow rules don't have explicit active flag in Tooling API
        description: r.Description || '',
      })),
    };
  }

  /**
   * Create a workflow rule
   */
  async createWorkflowRule(
    userId: string,
    ruleData: {
      objectName: string;
      name: string;
      description?: string;
      triggerType: 'onAllChanges' | 'onCreateOnly' | 'onCreateOrTriggeringUpdate';
      formula?: string;
      booleanFilter?: string;
      criteriaItems?: { field: string; operation: string; value: string }[];
    }
  ): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Build criteria
      let criteria: any = {};
      if (ruleData.formula) {
        criteria = {
          formula: ruleData.formula,
        };
      } else if (ruleData.criteriaItems) {
        criteria = {
          criteriaItems: ruleData.criteriaItems.map(c => ({
            field: `${ruleData.objectName}.${c.field}`,
            operation: c.operation,
            value: c.value,
          })),
          booleanFilter: ruleData.booleanFilter,
        };
      }

      const metadata = {
        fullName: `${ruleData.objectName}.${ruleData.name.replace(/\s+/g, '_')}`,
        active: true,
        description: ruleData.description || '',
        triggerType: ruleData.triggerType === 'onAllChanges' ? 'onAllChanges' :
                     ruleData.triggerType === 'onCreateOnly' ? 'onCreateOnly' : 'onCreateOrTriggeringUpdate',
        ...criteria,
      };

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/WorkflowRule`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: metadata.fullName,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || error.message || 'Failed to create workflow rule');
      }

      const result = await response.json();
      return { success: true, ruleId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a workflow field update action
   */
  async createWorkflowFieldUpdate(
    userId: string,
    updateData: {
      objectName: string;
      name: string;
      description?: string;
      field: string;
      operation: 'Formula' | 'Literal' | 'Null' | 'PreviousValue' | 'LookupValue';
      formula?: string;
      literalValue?: string;
      lookupValue?: string;
      reevaluateWorkflow?: boolean;
    }
  ): Promise<{ success: boolean; actionId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const metadata: any = {
        fullName: `${updateData.objectName}.${updateData.name.replace(/\s+/g, '_')}`,
        description: updateData.description || '',
        field: updateData.field,
        operation: updateData.operation,
        reevaluateOnChange: updateData.reevaluateWorkflow || false,
      };

      if (updateData.operation === 'Formula' && updateData.formula) {
        metadata.formula = updateData.formula;
      } else if (updateData.operation === 'Literal' && updateData.literalValue) {
        metadata.literalValue = updateData.literalValue;
      } else if (updateData.operation === 'LookupValue' && updateData.lookupValue) {
        metadata.lookupValue = updateData.lookupValue;
      }

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/WorkflowFieldUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: metadata.fullName,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || error.message || 'Failed to create field update');
      }

      const result = await response.json();
      return { success: true, actionId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a workflow rule
   */
  async deleteWorkflowRule(userId: string, ruleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/WorkflowRule/${ruleId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete workflow rule');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // APPROVAL PROCESSES
  // ============================================================================

  /**
   * List approval processes
   */
  async listApprovalProcesses(userId: string, objectName?: string): Promise<{
    processes: {
      id: string;
      name: string;
      objectName: string;
      isActive: boolean;
      description: string;
    }[];
  }> {
    let query = `SELECT Id, Name, TableEnumOrId, Description, Active FROM ApprovalProcess`;
    if (objectName) {
      const escapedObjectName = this.escapeSoql(objectName);
      query += ` WHERE TableEnumOrId = '${escapedObjectName}'`;
    }
    query += ` ORDER BY Name`;

    const result = await this.toolingQuery(userId, query);

    return {
      processes: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        objectName: r.TableEnumOrId,
        isActive: r.Active,
        description: r.Description || '',
      })),
    };
  }

  /**
   * Create an approval process
   */
  async createApprovalProcess(
    userId: string,
    processData: {
      objectName: string;
      name: string;
      description?: string;
      entryCriteria?: string; // Formula
      criteriaItems?: { field: string; operation: string; value: string }[];
      allowRecall?: boolean;
      showApprovalHistory?: boolean;
      recordEditability?: 'AdminOnly' | 'AdminOrCurrentApprover';
      nextAutomatedApprover?: {
        useApproverFieldOfRecordOwner?: boolean;
        userHierarchyField?: string;
      };
      approvalSteps: {
        name: string;
        description?: string;
        assignedTo: {
          type: 'user' | 'queue' | 'relatedUser' | 'manager';
          assignee?: string; // User/Queue ID or field API name
        };
        entryCriteria?: string;
        rejectBehavior?: 'RejectRequest' | 'BackToPrevious';
      }[];
      finalApprovalActions?: {
        type: 'FieldUpdate' | 'EmailAlert' | 'Task' | 'OutboundMessage';
        name: string;
      }[];
      finalRejectionActions?: {
        type: 'FieldUpdate' | 'EmailAlert' | 'Task' | 'OutboundMessage';
        name: string;
      }[];
    }
  ): Promise<{ success: boolean; processId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Build approval steps
      const approvalSteps = processData.approvalSteps.map((step, index) => {
        const stepMeta: any = {
          name: step.name,
          description: step.description || '',
          label: step.name,
          stepNumber: index + 1,
          rejectBehavior: { type: step.rejectBehavior || 'RejectRequest' },
        };

        // Configure approver
        if (step.assignedTo.type === 'user' && step.assignedTo.assignee) {
          stepMeta.assignedApprover = {
            approver: { name: step.assignedTo.assignee, type: 'user' },
          };
        } else if (step.assignedTo.type === 'queue' && step.assignedTo.assignee) {
          stepMeta.assignedApprover = {
            approver: { name: step.assignedTo.assignee, type: 'queue' },
          };
        } else if (step.assignedTo.type === 'manager') {
          stepMeta.assignedApprover = {
            approver: { type: 'userHierarchyField', name: 'Manager' },
          };
        } else if (step.assignedTo.type === 'relatedUser' && step.assignedTo.assignee) {
          stepMeta.assignedApprover = {
            approver: { type: 'relatedUserField', name: step.assignedTo.assignee },
          };
        }

        if (step.entryCriteria) {
          stepMeta.entryCriteria = { formula: step.entryCriteria };
        }

        return stepMeta;
      });

      // Build metadata
      const metadata: any = {
        fullName: `${processData.objectName}.${processData.name.replace(/\s+/g, '_')}`,
        active: false, // Create as inactive, then activate
        label: processData.name,
        description: processData.description || '',
        allowRecall: processData.allowRecall !== false,
        showApprovalHistory: processData.showApprovalHistory !== false,
        recordEditability: processData.recordEditability || 'AdminOnly',
        approvalStep: approvalSteps,
      };

      // Entry criteria
      if (processData.entryCriteria) {
        metadata.entryCriteria = { formula: processData.entryCriteria };
      } else if (processData.criteriaItems) {
        metadata.entryCriteria = {
          criteriaItems: processData.criteriaItems.map(c => ({
            field: `${processData.objectName}.${c.field}`,
            operation: c.operation,
            value: c.value,
          })),
        };
      }

      // Final actions
      if (processData.finalApprovalActions) {
        metadata.finalApprovalActions = {
          action: processData.finalApprovalActions.map(a => ({
            name: `${processData.objectName}.${a.name}`,
            type: a.type,
          })),
        };
      }

      if (processData.finalRejectionActions) {
        metadata.finalRejectionActions = {
          action: processData.finalRejectionActions.map(a => ({
            name: `${processData.objectName}.${a.name}`,
            type: a.type,
          })),
        };
      }

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApprovalProcess`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            FullName: metadata.fullName,
            Metadata: metadata,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || error.message || 'Failed to create approval process');
      }

      const result = await response.json();
      return { success: true, processId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate or deactivate an approval process
   */
  async toggleApprovalProcess(
    userId: string,
    processId: string,
    active: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.toolingUpdate(userId, 'ApprovalProcess', processId, {
        Metadata: { active },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an approval process
   */
  async deleteApprovalProcess(userId: string, processId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/tooling/sobjects/ApprovalProcess/${processId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete approval process');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit a record for approval
   */
  async submitForApproval(
    userId: string,
    recordId: string,
    options?: {
      comments?: string;
      nextApproverIds?: string[];
      processDefinitionNameOrId?: string;
      skipEntryCriteria?: boolean;
    }
  ): Promise<{ success: boolean; instanceId?: string; errors?: string[] }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const request: any = {
        actionType: 'Submit',
        contextId: recordId,
        comments: options?.comments || '',
      };

      if (options?.nextApproverIds) {
        request.nextApproverIds = options.nextApproverIds;
      }

      if (options?.processDefinitionNameOrId) {
        request.processDefinitionNameOrId = options.processDefinitionNameOrId;
      }

      if (options?.skipEntryCriteria) {
        request.skipEntryCriteria = true;
      }

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/process/approvals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: [request] }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || 'Failed to submit for approval');
      }

      const result = await response.json();
      const processResult = result[0];

      return {
        success: processResult.success,
        instanceId: processResult.instanceId,
        errors: processResult.errors?.map((e: any) => e.message),
      };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Approve or reject an approval request
   */
  async processApprovalRequest(
    userId: string,
    workItemId: string,
    action: 'Approve' | 'Reject',
    comments?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const request = {
        actionType: action,
        contextId: workItemId,
        comments: comments || '',
      };

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/process/approvals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: [request] }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || `Failed to ${action.toLowerCase()} request`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================================
  // REPORTS & DASHBOARDS
  // ============================================================================

  /**
   * List reports with optional filtering
   */
  async listReports(
    userId: string,
    filters?: {
      folderId?: string;
      search?: string;
      reportType?: string;
    }
  ): Promise<{
    reports: {
      id: string;
      name: string;
      folderName: string;
      reportType: string;
      format: string;
      lastRunDate: string;
    }[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    let query = `SELECT Id, Name, FolderName, DeveloperName, Format, LastRunDate FROM Report`;
    const conditions: string[] = [];

    if (filters?.folderId) {
      const escapedFolderId = this.escapeSoqlId(filters.folderId);
      conditions.push(`OwnerId = '${escapedFolderId}'`);
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`Name LIKE '%${searchTerm}%'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY Name LIMIT 200`;

    const result = await this.query(userId, query);

    return {
      reports: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        folderName: r.FolderName || 'Private Reports',
        reportType: r.DeveloperName || '',
        format: r.Format || 'Tabular',
        lastRunDate: r.LastRunDate || '',
      })),
    };
  }

  /**
   * Get report metadata and columns
   */
  async getReportMetadata(userId: string, reportId: string): Promise<{
    id: string;
    name: string;
    reportType: string;
    format: string;
    columns: { name: string; label: string; type: string }[];
    filters: { field: string; operator: string; value: string }[];
    groupings: string[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports/${reportId}/describe`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get report metadata');
    }

    const metadata = await response.json();
    const reportMeta = metadata.reportMetadata;
    const extendedMeta = metadata.reportExtendedMetadata;

    return {
      id: reportMeta.id,
      name: reportMeta.name,
      reportType: reportMeta.reportType?.type || '',
      format: reportMeta.reportFormat,
      columns: (reportMeta.detailColumns || []).map((col: string) => ({
        name: col,
        label: extendedMeta?.detailColumnInfo?.[col]?.label || col,
        type: extendedMeta?.detailColumnInfo?.[col]?.dataType || 'string',
      })),
      filters: (reportMeta.reportFilters || []).map((f: any) => ({
        field: f.column,
        operator: f.operator,
        value: f.value,
      })),
      groupings: (reportMeta.groupingsDown || []).map((g: any) => g.name),
    };
  }

  /**
   * Create a report
   */
  async createReport(
    userId: string,
    reportData: {
      name: string;
      reportType: string; // e.g., 'Account', 'Opportunity', 'Lead'
      format: 'TABULAR' | 'SUMMARY' | 'MATRIX';
      columns: string[];
      filters?: { field: string; operator: string; value: string }[];
      groupings?: { field: string; sortOrder?: 'Asc' | 'Desc'; dateGranularity?: string }[];
      folderId?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; reportId?: string; reportUrl?: string; reportName?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // First, get available report types
      const reportTypeResponse = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reportTypes`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!reportTypeResponse.ok) {
        throw new Error('Failed to get report types');
      }

      const reportTypesResponse = await reportTypeResponse.json();

      // Handle both flat and nested report types structures
      // Flat: [{ type: "Opportunity", label: "Opportunities", ... }]
      // Nested: [{ label: "Category", reportTypes: [{ type: "TypeName", label: "Label" }] }]
      const flattenedTypes: { type: string; label: string; category: string }[] = [];

      for (const item of reportTypesResponse) {
        // Check if this is a flat structure (has type directly)
        if (item.type) {
          flattenedTypes.push({
            type: item.type,
            label: item.label || item.type,
            category: 'Standard',
          });
        }
        // Check if this is a nested structure (has reportTypes array)
        else if (item.reportTypes && Array.isArray(item.reportTypes)) {
          for (const rt of item.reportTypes) {
            if (rt.type) {
              flattenedTypes.push({
                type: rt.type,
                label: rt.label || rt.type,
                category: item.label || 'Standard',
              });
            }
          }
        }
      }

      this.logger.warn(`[CREATE_REPORT] Found ${flattenedTypes.length} report types`);

      // Find matching report type
      const searchTerm = reportData.reportType.toLowerCase();
      const matchingType = flattenedTypes.find((rt) =>
        rt.type.toLowerCase().includes(searchTerm) ||
        rt.label.toLowerCase().includes(searchTerm) ||
        rt.category.toLowerCase().includes(searchTerm)
      );

      if (!matchingType) {
        const availableTypes = flattenedTypes.slice(0, 15).map((rt) => `${rt.label} (${rt.type})`).join(', ');
        throw new Error(`Report type '${reportData.reportType}' not found. Available: ${availableTypes}`);
      }

      this.logger.warn(`[CREATE_REPORT] Matched: type=${matchingType.type}, label=${matchingType.label}`);

      // Map common field names to Salesforce Analytics API column names
      const columnNameMap: Record<string, string> = {
        // Opportunity fields
        'Name': 'OPPORTUNITY_NAME',
        'Amount': 'AMOUNT',
        'StageName': 'STAGE_NAME',
        'CloseDate': 'CLOSE_DATE',
        'Account.Name': 'ACCOUNT_NAME',
        'AccountId': 'ACCOUNT_NAME',
        'Type': 'TYPE',
        'Probability': 'PROBABILITY',
        'Owner.Name': 'FULL_NAME',
        'CreatedDate': 'CREATED_DATE',
        'LastModifiedDate': 'LAST_UPDATE',
        // Lead fields
        'FirstName': 'FIRST_NAME',
        'LastName': 'LAST_NAME',
        'Company': 'COMPANY',
        'Email': 'EMAIL',
        'Phone': 'PHONE',
        'Status': 'STATUS',
        'LeadSource': 'LEAD_SOURCE',
        // Account fields
        'Industry': 'INDUSTRY',
        'BillingCity': 'ADDRESS1_CITY',
        'BillingState': 'ADDRESS1_STATE',
        // Contact fields
        'Title': 'TITLE',
      };

      // Convert column names to Analytics API format
      const mappedColumns = reportData.columns.map(col => columnNameMap[col] || col.toUpperCase().replace(/\./g, '_'));
      this.logger.log(`[CREATE_REPORT] Original columns: ${JSON.stringify(reportData.columns)}`);
      this.logger.log(`[CREATE_REPORT] Mapped columns: ${JSON.stringify(mappedColumns)}`);
      this.logger.log(`[CREATE_REPORT] Report type: ${matchingType.type}`);

      // Salesforce Analytics API expects uppercase format: TABULAR, SUMMARY, MATRIX
      const reportFormat = reportData.format.toUpperCase();

      // First, describe the report type to get valid columns
      const describeResponse = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reportTypes/${matchingType.type}/describe`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      let validColumns: string[] = [];
      if (describeResponse.ok) {
        const describeData = await describeResponse.json();
        // Extract available column names from the report type description
        const columnsByName: Record<string, string> = {};
        if (describeData.reportTypeColumnInfos) {
          for (const col of describeData.reportTypeColumnInfos) {
            if (col.name) {
              columnsByName[col.name.toUpperCase()] = col.name;
              // Also map by label
              if (col.label) {
                columnsByName[col.label.toUpperCase().replace(/\s+/g, '_')] = col.name;
              }
            }
          }
        }
        this.logger.log(`[CREATE_REPORT] Available columns: ${Object.keys(columnsByName).slice(0, 20).join(', ')}`);

        // Match our requested columns to valid column names
        for (const col of mappedColumns) {
          const upperCol = col.toUpperCase();
          if (columnsByName[upperCol]) {
            validColumns.push(columnsByName[upperCol]);
          }
        }
        this.logger.log(`[CREATE_REPORT] Matched valid columns: ${validColumns.join(', ')}`);
      } else {
        this.logger.warn(`[CREATE_REPORT] Could not describe report type, using defaults`);
      }

      // Build report metadata
      const reportMetadata: any = {
        name: reportData.name,
        reportType: { type: matchingType.type },
        reportFormat: reportFormat,
      };

      // Add detail columns if we have valid ones
      if (validColumns.length > 0) {
        reportMetadata.detailColumns = validColumns;
      }

      this.logger.warn(`[CREATE_REPORT] Building report with format: ${reportFormat}`);

      // Only add description if provided
      if (reportData.description) {
        reportMetadata.description = reportData.description;
      }

      // Add filters - only if provided and non-empty
      if (reportData.filters && reportData.filters.length > 0) {
        reportMetadata.reportFilters = reportData.filters.map(f => ({
          column: f.field,
          filterType: 'fieldValue',
          isRunPageEditable: true,
          operator: f.operator,
          value: f.value,
        }));
      }

      // Add groupings for summary/matrix reports
      if (reportData.format !== 'TABULAR' && reportData.groupings && reportData.groupings.length > 0) {
        reportMetadata.groupingsDown = reportData.groupings.map(g => ({
          name: g.field,
          sortOrder: g.sortOrder || 'Asc',
          dateGranularity: g.dateGranularity || 'None',
        }));
      }

      // Add folder
      if (reportData.folderId) {
        reportMetadata.folderId = reportData.folderId;
      }

      // Build the full request body
      const requestBody = { reportMetadata };

      this.logger.warn(`[CREATE_REPORT] Full request body: ${JSON.stringify(requestBody, null, 2)}`);
      this.logger.warn(`[CREATE_REPORT] POST URL: ${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports`);

      // Create the report using Analytics API
      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`[CREATE_REPORT] API error response: ${errorText}`);
        try {
          const error = JSON.parse(errorText);
          throw new Error(error[0]?.message || error.message || 'Failed to create report');
        } catch (parseError) {
          throw new Error(`Failed to create report: ${errorText.substring(0, 200)}`);
        }
      }

      const result = await response.json();
      const reportId = result.reportMetadata?.id;

      // Build the Lightning URL for the report
      const reportUrl = reportId
        ? `${instanceUrl}/lightning/r/Report/${reportId}/view`
        : undefined;

      return {
        success: true,
        reportId,
        reportUrl,
        reportName: reportData.name,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Run a report and get results
   */
  async runReport(
    userId: string,
    reportId: string,
    options?: {
      includeDetails?: boolean;
      filters?: { column: string; operator: string; value: string }[];
    }
  ): Promise<{
    success: boolean;
    factMap?: any;
    groupingsDown?: any[];
    groupingsAcross?: any[];
    aggregates?: { label: string; value: any }[];
    error?: string;
  }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      let url = `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports/${reportId}`;

      const params: string[] = [];
      if (options?.includeDetails !== false) {
        params.push('includeDetails=true');
      }

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const body: any = {};
      if (options?.filters) {
        body.reportFilters = options.filters.map(f => ({
          column: f.column,
          operator: f.operator,
          value: f.value,
        }));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || 'Failed to run report');
      }

      const result = await response.json();

      return {
        success: true,
        factMap: result.factMap,
        groupingsDown: result.groupingsDown?.groupings,
        groupingsAcross: result.groupingsAcross?.groupings,
        aggregates: result.reportMetadata?.aggregates?.map((agg: any) => ({
          label: agg.label,
          value: result.factMap?.['T!T']?.aggregates?.[0]?.value,
        })),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a report
   */
  async updateReport(
    userId: string,
    reportId: string,
    updates: {
      name?: string;
      columns?: string[];
      filters?: { field: string; operator: string; value: string }[];
      groupings?: { field: string; sortOrder?: 'Asc' | 'Desc' }[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Get current metadata
      const currentMeta = await this.getReportMetadata(userId, reportId);

      // Build update payload
      const reportMetadata: any = {};

      if (updates.name) {
        reportMetadata.name = updates.name;
      }

      if (updates.columns) {
        reportMetadata.detailColumns = updates.columns;
      }

      if (updates.filters) {
        reportMetadata.reportFilters = updates.filters.map(f => ({
          column: f.field,
          filterType: 'fieldValue',
          operator: f.operator,
          value: f.value,
        }));
      }

      if (updates.groupings) {
        reportMetadata.groupingsDown = updates.groupings.map(g => ({
          name: g.field,
          sortOrder: g.sortOrder || 'Asc',
          dateGranularity: 'None',
        }));
      }

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports/${reportId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reportMetadata }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || 'Failed to update report');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(userId: string, reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reports/${reportId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete report');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List dashboards
   */
  async listDashboards(
    userId: string,
    filters?: { folderId?: string; search?: string }
  ): Promise<{
    dashboards: {
      id: string;
      name: string;
      folderName: string;
      runningUser: string;
      lastRefreshDate: string;
    }[];
  }> {
    let query = `SELECT Id, Title, FolderName, RunningUser.Name, LastRefreshDate FROM Dashboard`;
    const conditions: string[] = [];

    if (filters?.folderId) {
      const escapedFolderId = this.escapeSoqlId(filters.folderId);
      conditions.push(`FolderId = '${escapedFolderId}'`);
    }
    if (filters?.search) {
      const searchTerm = this.escapeSoqlLike(filters.search);
      conditions.push(`Title LIKE '%${searchTerm}%'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ` ORDER BY Title LIMIT 200`;

    const result = await this.query(userId, query);

    return {
      dashboards: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Title,
        folderName: r.FolderName || 'Private Dashboards',
        runningUser: r.RunningUser?.Name || '',
        lastRefreshDate: r.LastRefreshDate || '',
      })),
    };
  }

  /**
   * Get dashboard metadata and components
   */
  async getDashboardMetadata(userId: string, dashboardId: string): Promise<{
    id: string;
    name: string;
    description: string;
    components: {
      id: string;
      type: string;
      reportId: string;
      header: string;
      sortBy: string;
    }[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/dashboards/${dashboardId}/describe`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get dashboard metadata');
    }

    const metadata = await response.json();

    return {
      id: dashboardId,
      name: metadata.name,
      description: metadata.description || '',
      components: (metadata.components || []).map((c: any) => ({
        id: c.id,
        type: c.type,
        reportId: c.reportId,
        header: c.header || '',
        sortBy: c.sortBy || '',
      })),
    };
  }

  /**
   * Create a dashboard
   */
  async createDashboard(
    userId: string,
    dashboardData: {
      name: string;
      description?: string;
      folderId: string;
      components: {
        reportId: string;
        type: 'Chart' | 'Gauge' | 'Metric' | 'Table' | 'VisualforcePage';
        header?: string;
        position: { row: number; column: number; rowSpan?: number; columnSpan?: number };
        chartType?: 'Bar' | 'Column' | 'Line' | 'Pie' | 'Donut' | 'Funnel' | 'Scatter';
      }[];
      runningUser?: string; // User ID to run as
    }
  ): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      // Build components
      const components = dashboardData.components.map((comp, index) => ({
        componentType: comp.type,
        report: comp.reportId,
        header: comp.header || '',
        displayUnits: 'Auto',
        chartAxisRange: 'Auto',
        drillEnabled: true,
        drillToDetailEnabled: true,
        indicatorHighColor: '#54C254',
        indicatorLowColor: '#C25454',
        indicatorMiddleColor: '#C2C254',
        ...(comp.chartType && { chartSummary: { axisBinding: 'y', column: 'RowCount' } }),
      }));

      // Build layout
      const layout = {
        columns: dashboardData.components.map((comp, index) => ({
          components: [{
            componentIndex: index,
            rowIndex: comp.position.row,
            columnSpan: comp.position.columnSpan || 3,
            rowSpan: comp.position.rowSpan || 4,
          }],
        })),
      };

      const metadata = {
        name: dashboardData.name,
        description: dashboardData.description || '',
        folderId: dashboardData.folderId,
        components,
        layout,
        ...(dashboardData.runningUser && { runningUser: dashboardData.runningUser }),
      };

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/dashboards`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || error.message || 'Failed to create dashboard');
      }

      const result = await response.json();
      return { success: true, dashboardId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(userId: string, dashboardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/dashboards/${dashboardId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error[0]?.message || 'Failed to refresh dashboard');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(userId: string, dashboardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

      const response = await fetch(
        `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/dashboards/${dashboardId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete dashboard');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List report folders
   */
  async listReportFolders(userId: string): Promise<{
    folders: { id: string; name: string; developerName: string; accessType: string }[];
  }> {
    const query = `SELECT Id, Name, DeveloperName, AccessType FROM Folder WHERE Type = 'Report' ORDER BY Name`;
    const result = await this.query(userId, query);

    return {
      folders: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        developerName: r.DeveloperName,
        accessType: r.AccessType || 'Public',
      })),
    };
  }

  /**
   * List dashboard folders
   */
  async listDashboardFolders(userId: string): Promise<{
    folders: { id: string; name: string; developerName: string; accessType: string }[];
  }> {
    const query = `SELECT Id, Name, DeveloperName, AccessType FROM Folder WHERE Type = 'Dashboard' ORDER BY Name`;
    const result = await this.query(userId, query);

    return {
      folders: (result.records || []).map((r: any) => ({
        id: r.Id,
        name: r.Name,
        developerName: r.DeveloperName,
        accessType: r.AccessType || 'Public',
      })),
    };
  }

  /**
   * Get available report types
   */
  async getReportTypes(userId: string): Promise<{
    reportTypes: { type: string; label: string; description: string }[];
  }> {
    const { accessToken, instanceUrl } = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${instanceUrl}/services/data/${this.DEFAULT_API_VERSION}/analytics/reportTypes`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get report types');
    }

    const reportTypes = await response.json();

    return {
      reportTypes: reportTypes.map((rt: any) => ({
        type: rt.type,
        label: rt.label,
        description: rt.description || '',
      })),
    };
  }
}
