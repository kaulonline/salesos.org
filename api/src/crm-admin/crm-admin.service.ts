import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CrmProvider } from '@prisma/client';
import * as crypto from 'crypto';

// DTOs
export interface CreateCrmIntegrationDto {
  provider: CrmProvider;
  name: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  loginUrl?: string;
  apiVersion?: string;
  config?: Record<string, any>;
}

export interface UpdateCrmIntegrationDto {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  loginUrl?: string;
  apiVersion?: string;
  isEnabled?: boolean;
  config?: Record<string, any>;
}

export interface CrmIntegrationResponse {
  id: string;
  provider: CrmProvider;
  name: string;
  isEnabled: boolean;
  isConfigured: boolean;
  callbackUrl: string | null;
  loginUrl: string | null;
  apiVersion: string | null;
  config: Record<string, any> | null;
  connectionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CrmAdminService {
  private readonly logger = new Logger(CrmAdminService.name);
  private readonly encryptionKey: string;

  constructor(private readonly prisma: PrismaService) {
    // Get encryption key from environment (should be 32 bytes for AES-256)
    this.encryptionKey = process.env.CRM_ENCRYPTION_KEY || 
      process.env.SALESFORCE_ENCRYPTION_KEY ||
      crypto.createHash('sha256').update(process.env.JWT_SECRET || 'default-secret').digest('hex').slice(0, 32);
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
  decrypt(text: string): string {
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
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Get all CRM integrations (admin view)
   */
  async getAllIntegrations(): Promise<CrmIntegrationResponse[]> {
    const integrations = await this.prisma.crmIntegration.findMany({
      include: {
        _count: {
          select: { connections: true }
        }
      },
      orderBy: { provider: 'asc' }
    });

    return integrations.map(int => ({
      id: int.id,
      provider: int.provider,
      name: int.name,
      isEnabled: int.isEnabled,
      isConfigured: int.isConfigured,
      callbackUrl: int.callbackUrl,
      loginUrl: int.loginUrl,
      apiVersion: int.apiVersion,
      config: int.config as Record<string, any> | null,
      connectionCount: int._count.connections,
      createdAt: int.createdAt,
      updatedAt: int.updatedAt,
    }));
  }

  /**
   * Get a specific CRM integration
   */
  async getIntegration(provider: CrmProvider): Promise<CrmIntegrationResponse | null> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider },
      include: {
        _count: {
          select: { connections: true }
        }
      }
    });

    if (!integration) return null;

    return {
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      isEnabled: integration.isEnabled,
      isConfigured: integration.isConfigured,
      callbackUrl: integration.callbackUrl,
      loginUrl: integration.loginUrl,
      apiVersion: integration.apiVersion,
      config: integration.config as Record<string, any> | null,
      connectionCount: integration._count.connections,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * Get raw integration config (for internal use with OAuth)
   */
  async getIntegrationConfig(provider: CrmProvider): Promise<{
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    loginUrl: string;
    apiVersion: string;
  } | null> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider }
    });

    if (!integration || !integration.clientId || !integration.clientSecret) {
      return null;
    }

    return {
      clientId: this.decrypt(integration.clientId),
      clientSecret: this.decrypt(integration.clientSecret),
      callbackUrl: integration.callbackUrl || '',
      loginUrl: integration.loginUrl || this.getDefaultLoginUrl(provider),
      apiVersion: integration.apiVersion || this.getDefaultApiVersion(provider),
    };
  }

  /**
   * Create or update a CRM integration
   */
  async upsertIntegration(dto: CreateCrmIntegrationDto, adminUserId: string): Promise<CrmIntegrationResponse> {
    // Encrypt sensitive credentials
    const encryptedClientId = this.encrypt(dto.clientId);
    const encryptedClientSecret = this.encrypt(dto.clientSecret);

    const integration = await this.prisma.crmIntegration.upsert({
      where: { provider: dto.provider },
      update: {
        name: dto.name,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        callbackUrl: dto.callbackUrl,
        loginUrl: dto.loginUrl || this.getDefaultLoginUrl(dto.provider),
        apiVersion: dto.apiVersion || this.getDefaultApiVersion(dto.provider),
        config: dto.config || {},
        isConfigured: true,
        updatedAt: new Date(),
      },
      create: {
        provider: dto.provider,
        name: dto.name,
        clientId: encryptedClientId,
        clientSecret: encryptedClientSecret,
        callbackUrl: dto.callbackUrl,
        loginUrl: dto.loginUrl || this.getDefaultLoginUrl(dto.provider),
        apiVersion: dto.apiVersion || this.getDefaultApiVersion(dto.provider),
        config: dto.config || {},
        isConfigured: true,
        isEnabled: false, // Admin must explicitly enable
        createdBy: adminUserId,
      },
      include: {
        _count: {
          select: { connections: true }
        }
      }
    });

    this.logger.log(`CRM integration ${dto.provider} configured by admin ${adminUserId}`);

    return {
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      isEnabled: integration.isEnabled,
      isConfigured: integration.isConfigured,
      callbackUrl: integration.callbackUrl,
      loginUrl: integration.loginUrl,
      apiVersion: integration.apiVersion,
      config: integration.config as Record<string, any> | null,
      connectionCount: integration._count.connections,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * Update integration settings
   */
  async updateIntegration(provider: CrmProvider, dto: UpdateCrmIntegrationDto): Promise<CrmIntegrationResponse> {
    const existing = await this.prisma.crmIntegration.findUnique({
      where: { provider }
    });

    if (!existing) {
      throw new NotFoundException(`CRM integration ${provider} not found`);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.callbackUrl !== undefined) updateData.callbackUrl = dto.callbackUrl;
    if (dto.loginUrl !== undefined) updateData.loginUrl = dto.loginUrl;
    if (dto.apiVersion !== undefined) updateData.apiVersion = dto.apiVersion;
    if (dto.isEnabled !== undefined) updateData.isEnabled = dto.isEnabled;
    if (dto.config !== undefined) updateData.config = dto.config;

    // If updating credentials, encrypt them
    if (dto.clientId !== undefined) {
      updateData.clientId = this.encrypt(dto.clientId);
    }
    if (dto.clientSecret !== undefined) {
      updateData.clientSecret = this.encrypt(dto.clientSecret);
    }

    const integration = await this.prisma.crmIntegration.update({
      where: { provider },
      data: updateData,
      include: {
        _count: {
          select: { connections: true }
        }
      }
    });

    return {
      id: integration.id,
      provider: integration.provider,
      name: integration.name,
      isEnabled: integration.isEnabled,
      isConfigured: integration.isConfigured,
      callbackUrl: integration.callbackUrl,
      loginUrl: integration.loginUrl,
      apiVersion: integration.apiVersion,
      config: integration.config as Record<string, any> | null,
      connectionCount: integration._count.connections,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  /**
   * Enable or disable a CRM integration
   */
  async toggleIntegration(provider: CrmProvider, enabled: boolean): Promise<CrmIntegrationResponse> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider }
    });

    if (!integration) {
      throw new NotFoundException(`CRM integration ${provider} not found`);
    }

    if (enabled && !integration.isConfigured) {
      throw new BadRequestException(`CRM integration ${provider} must be configured before enabling`);
    }

    return this.updateIntegration(provider, { isEnabled: enabled });
  }

  /**
   * Delete a CRM integration (cascades to connections)
   */
  async deleteIntegration(provider: CrmProvider): Promise<void> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider },
      include: { _count: { select: { connections: true } } }
    });

    if (!integration) {
      throw new NotFoundException(`CRM integration ${provider} not found`);
    }

    if (integration._count.connections > 0) {
      throw new BadRequestException(
        `Cannot delete ${provider} integration with ${integration._count.connections} active connections. Disconnect users first.`
      );
    }

    await this.prisma.crmIntegration.delete({
      where: { provider }
    });

    this.logger.log(`CRM integration ${provider} deleted`);
  }

  /**
   * Get all user connections for an integration
   */
  async getIntegrationConnections(provider: CrmProvider) {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider }
    });

    if (!integration) {
      throw new NotFoundException(`CRM integration ${provider} not found`);
    }

    const connections = await this.prisma.crmConnection.findMany({
      where: { integrationId: integration.id },
      select: {
        id: true,
        userId: true,
        instanceUrl: true,
        externalOrgId: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        isSandbox: true,
        lastSyncAt: true,
        lastError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return connections;
  }

  /**
   * Get enabled integrations for users
   */
  async getEnabledIntegrations(): Promise<Array<{
    provider: CrmProvider;
    name: string;
    loginUrl: string | null;
  }>> {
    const integrations = await this.prisma.crmIntegration.findMany({
      where: { isEnabled: true, isConfigured: true },
      select: {
        provider: true,
        name: true,
        loginUrl: true,
      }
    });

    return integrations;
  }

  /**
   * Check if a provider is enabled
   */
  async isProviderEnabled(provider: CrmProvider): Promise<boolean> {
    const integration = await this.prisma.crmIntegration.findUnique({
      where: { provider },
      select: { isEnabled: true, isConfigured: true }
    });

    return integration?.isEnabled && integration?.isConfigured || false;
  }

  /**
   * Test connection to a CRM provider
   * Verifies that the configuration is valid and the OAuth endpoint is reachable
   */
  async testConnection(provider: CrmProvider): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      const integration = await this.prisma.crmIntegration.findUnique({
        where: { provider }
      });

      if (!integration) {
        return {
          success: false,
          message: `CRM integration ${provider} not found. Please configure it first.`
        };
      }

      if (!integration.isConfigured || !integration.clientId || !integration.clientSecret) {
        return {
          success: false,
          message: 'Integration is not fully configured. Please provide Client ID and Client Secret.'
        };
      }

      // Get the login URL to test
      const loginUrl = integration.loginUrl || this.getDefaultLoginUrl(provider);

      if (!loginUrl) {
        return {
          success: false,
          message: 'No login URL configured for this provider.'
        };
      }

      // Test connectivity to the OAuth endpoint
      const response = await fetch(loginUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const latencyMs = Date.now() - startTime;

      // For OAuth endpoints, we expect various responses (200, 302, 400, etc.) - they all indicate the endpoint is reachable
      if (response.status < 500) {
        // Verify we can decrypt the credentials (this tests encryption key validity)
        try {
          this.decrypt(integration.clientId);
          this.decrypt(integration.clientSecret);
        } catch (decryptError) {
          return {
            success: false,
            message: 'Failed to decrypt stored credentials. Encryption key may have changed.',
            latencyMs
          };
        }

        return {
          success: true,
          message: `Successfully connected to ${provider} OAuth endpoint.`,
          latencyMs,
          details: {
            endpoint: loginUrl,
            responseStatus: response.status,
            apiVersion: integration.apiVersion
          }
        };
      } else {
        return {
          success: false,
          message: `OAuth endpoint returned error status: ${response.status}`,
          latencyMs
        };
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`CRM connection test failed for ${provider}:`, error);

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        latencyMs
      };
    }
  }

  // Helper methods for default values
  private getDefaultLoginUrl(provider: CrmProvider): string {
    switch (provider) {
      case 'SALESFORCE':
        return 'https://login.salesforce.com';
      case 'HUBSPOT':
        return 'https://app.hubspot.com/oauth/authorize';
      case 'DYNAMICS365':
        return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
      case 'ZOHO':
        return 'https://accounts.zoho.com/oauth/v2/auth';
      case 'ORACLE_CX':
        return 'https://login.oracle.com/oauth2/v1/authorize';
      default:
        return '';
    }
  }

  private getDefaultApiVersion(provider: CrmProvider): string {
    switch (provider) {
      case 'SALESFORCE':
        return 'v59.0';
      case 'HUBSPOT':
        return 'v3';
      case 'DYNAMICS365':
        return 'v9.2';
      case 'ZOHO':
        return 'v2';
      case 'ORACLE_CX':
        return 'v1';
      default:
        return 'v1';
    }
  }
}
