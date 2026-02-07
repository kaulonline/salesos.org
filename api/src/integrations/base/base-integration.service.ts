import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface IntegrationCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  expiresAt?: string;
  [key: string]: any;
}

export interface IntegrationSettings {
  syncEnabled?: boolean;
  syncInterval?: number; // minutes
  webhookUrl?: string;
  [key: string]: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface OAuthResult {
  authUrl: string;
  state: string;
}

export interface IntegrationStatus {
  connected: boolean;
  configured: boolean;
  status: string;
  lastSyncAt?: Date | null;
  error?: string | null;
}

export abstract class BaseIntegrationService {
  protected abstract readonly provider: string;
  protected abstract readonly displayName: string;
  protected abstract readonly logger: Logger;

  // Organization context for multi-tenancy
  // This is set per-request by the controller
  protected currentOrganizationId: string | null = null;

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Set organization context for this request
   * Must be called before any organization-scoped operations
   */
  setOrganizationContext(organizationId: string): void {
    this.currentOrganizationId = organizationId;
  }

  /**
   * Clear organization context after request
   */
  clearOrganizationContext(): void {
    this.currentOrganizationId = null;
  }

  /**
   * Get current organization ID or throw error if not set
   */
  protected getOrganizationId(): string {
    if (!this.currentOrganizationId) {
      throw new Error('Organization context not set. Call setOrganizationContext() first.');
    }
    return this.currentOrganizationId;
  }

  /**
   * Check if the integration is connected/configured for the current organization
   */
  async isConnected(organizationId?: string): Promise<boolean> {
    const config = await this.getIntegrationConfig(organizationId);
    return config?.status === 'connected';
  }

  /**
   * Get full status of the integration for the current organization
   */
  async getStatus(organizationId?: string): Promise<IntegrationStatus> {
    const config = await this.getIntegrationConfig(organizationId);
    if (!config) {
      return { connected: false, configured: false, status: 'disconnected' };
    }
    return {
      connected: config.status === 'connected',
      configured: true,
      status: config.status,
      lastSyncAt: config.lastSyncAt,
      error: config.syncError,
    };
  }

  /**
   * Test the connection to the external service
   */
  abstract testConnection(organizationId?: string): Promise<ConnectionTestResult>;

  /**
   * Get stored credentials for this integration
   */
  protected async getCredentials(organizationId?: string): Promise<IntegrationCredentials | null> {
    const config = await this.getIntegrationConfig(organizationId);
    return config?.credentials as IntegrationCredentials | null;
  }

  /**
   * Get the integration config record for the current organization
   */
  protected async getIntegrationConfig(organizationId?: string) {
    const orgId = organizationId || this.currentOrganizationId;
    if (!orgId) {
      // Fallback: try to find any config for backward compatibility during migration
      this.logger.warn(`No organization context for ${this.provider}, using legacy query`);
      return this.prisma.integrationConfig.findFirst({
        where: { provider: this.provider },
      });
    }
    return this.prisma.integrationConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: this.provider,
        },
      },
    });
  }

  /**
   * Store credentials and mark as connected for the current organization
   */
  async saveCredentials(
    credentials: IntegrationCredentials,
    organizationId?: string,
    configuredById?: string,
  ): Promise<void> {
    const orgId = organizationId || this.getOrganizationId();
    await this.prisma.integrationConfig.upsert({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: this.provider,
        },
      },
      update: {
        credentials: credentials as any,
        status: 'connected',
        syncError: null,
        configuredById: configuredById || undefined,
        configuredAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        provider: this.provider,
        name: this.displayName,
        credentials: credentials as any,
        status: 'connected',
        settings: {},
        configuredById: configuredById || undefined,
        configuredAt: new Date(),
      },
    });
    this.logger.log(`Credentials saved for ${this.provider} in org ${orgId}`);
  }

  /**
   * Update settings for this integration
   */
  async updateSettings(settings: IntegrationSettings, organizationId?: string): Promise<void> {
    const orgId = organizationId || this.getOrganizationId();
    await this.prisma.integrationConfig.update({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: this.provider,
        },
      },
      data: {
        settings: settings as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get settings for this integration
   */
  async getSettings(organizationId?: string): Promise<IntegrationSettings | null> {
    const config = await this.getIntegrationConfig(organizationId);
    return config?.settings as IntegrationSettings | null;
  }

  /**
   * Delete/disconnect this integration for the current organization
   */
  async disconnect(organizationId?: string): Promise<void> {
    const orgId = organizationId || this.getOrganizationId();
    try {
      await this.prisma.integrationConfig.delete({
        where: {
          organizationId_provider: {
            organizationId: orgId,
            provider: this.provider,
          },
        },
      });
      this.logger.log(`Integration ${this.provider} disconnected for org ${orgId}`);
    } catch (error) {
      // If record doesn't exist, that's fine
      this.logger.debug(`Integration ${this.provider} was already disconnected for org ${orgId}`);
    }
  }

  /**
   * Update last sync timestamp
   */
  protected async updateLastSync(error?: string, organizationId?: string): Promise<void> {
    const orgId = organizationId || this.getOrganizationId();
    await this.prisma.integrationConfig.update({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: this.provider,
        },
      },
      data: {
        lastSyncAt: new Date(),
        syncError: error || null,
        status: error ? 'error' : 'connected',
      },
    });
  }

  /**
   * Mark integration as having an error
   */
  protected async setError(error: string, organizationId?: string): Promise<void> {
    const orgId = organizationId || this.getOrganizationId();
    await this.prisma.integrationConfig.update({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: this.provider,
        },
      },
      data: {
        status: 'error',
        syncError: error,
      },
    });
  }
}
