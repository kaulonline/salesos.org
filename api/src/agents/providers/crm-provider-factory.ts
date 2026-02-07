import { Injectable, Logger } from '@nestjs/common';
import { CRMDataProvider, CRMProviderType } from './crm-data-provider.interface';
import { OracleCXProvider } from './oracle-cx-provider';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import { PrismaService } from '../../database/prisma.service';

/**
 * CRM Provider Factory
 *
 * Manages CRM data providers and determines the appropriate provider
 * for each user based on their connections.
 */
@Injectable()
export class CRMProviderFactory {
  private readonly logger = new Logger(CRMProviderFactory.name);
  private readonly oracleCXProvider: OracleCXProvider;
  // Note: SalesforceProvider would be implemented similarly
  // private readonly salesforceProvider: SalesforceProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly oracleCXService: OracleCXService,
    private readonly salesforceService: SalesforceService,
  ) {
    this.oracleCXProvider = new OracleCXProvider(oracleCXService);
    // this.salesforceProvider = new SalesforceProvider(salesforceService);
  }

  /**
   * Get the appropriate CRM provider for a user
   *
   * Priority order:
   * 1. Oracle CX (if connected)
   * 2. Salesforce (if connected)
   * 3. Local (always available as fallback)
   */
  async getProviderForUser(userId: string): Promise<{
    provider: CRMDataProvider | null;
    providerType: CRMProviderType;
    providerLabel: string;
  }> {
    // Check Oracle CX first (priority for Vertiv)
    const oracleCXStatus = await this.oracleCXService.getConnectionStatus(userId);
    if (oracleCXStatus.connected) {
      return {
        provider: this.oracleCXProvider,
        providerType: 'oracle_cx',
        providerLabel: `Oracle CX (${oracleCXStatus.connection?.displayName || oracleCXStatus.connection?.instanceUrl || 'Connected'})`,
      };
    }

    // Check Salesforce
    const salesforceStatus = await this.salesforceService.getConnectionStatus(userId);
    if (salesforceStatus.connected) {
      // For now, return null provider but indicate Salesforce
      // TODO: Implement SalesforceProvider
      return {
        provider: null, // Would be this.salesforceProvider once implemented
        providerType: 'salesforce',
        providerLabel: `Salesforce (${salesforceStatus.connection?.displayName || salesforceStatus.connection?.instanceUrl || 'Connected'})`,
      };
    }

    // Fallback to local
    return {
      provider: null, // Would be this.localProvider once implemented
      providerType: 'local',
      providerLabel: 'Local IRIS Database',
    };
  }

  /**
   * Get a specific provider by type
   */
  getProvider(providerType: CRMProviderType): CRMDataProvider | null {
    switch (providerType) {
      case 'oracle_cx':
        return this.oracleCXProvider;
      // case 'salesforce':
      //   return this.salesforceProvider;
      // case 'local':
      //   return this.localProvider;
      default:
        return null;
    }
  }

  /**
   * Check which CRM connections are available for a user
   */
  async getAvailableConnections(userId: string): Promise<{
    oracleCX: {
      connected: boolean;
      displayName?: string;
      instanceUrl?: string;
    };
    salesforce: {
      connected: boolean;
      displayName?: string;
      instanceUrl?: string;
    };
    local: {
      connected: boolean;
    };
  }> {
    const [oracleCXStatus, salesforceStatus] = await Promise.all([
      this.oracleCXService.getConnectionStatus(userId),
      this.salesforceService.getConnectionStatus(userId),
    ]);

    return {
      oracleCX: {
        connected: oracleCXStatus.connected,
        displayName: oracleCXStatus.connection?.displayName,
        instanceUrl: oracleCXStatus.connection?.instanceUrl,
      },
      salesforce: {
        connected: salesforceStatus.connected,
        displayName: salesforceStatus.connection?.displayName,
        instanceUrl: salesforceStatus.connection?.instanceUrl,
      },
      local: {
        connected: true, // Local is always available
      },
    };
  }

  /**
   * Get the primary connected CRM for a user
   */
  async getPrimaryConnection(userId: string): Promise<{
    type: CRMProviderType;
    connected: boolean;
    label: string;
  }> {
    const connections = await this.getAvailableConnections(userId);

    if (connections.oracleCX.connected) {
      return {
        type: 'oracle_cx',
        connected: true,
        label: `Oracle CX${connections.oracleCX.displayName ? ` (${connections.oracleCX.displayName})` : ''}`,
      };
    }

    if (connections.salesforce.connected) {
      return {
        type: 'salesforce',
        connected: true,
        label: `Salesforce${connections.salesforce.displayName ? ` (${connections.salesforce.displayName})` : ''}`,
      };
    }

    return {
      type: 'local',
      connected: true,
      label: 'Local IRIS Database',
    };
  }
}
