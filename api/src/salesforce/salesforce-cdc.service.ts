import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { SalesforceService } from './salesforce.service';
import * as jsforce from 'jsforce';

interface CdcChangeEventHeader {
  entityName: string;
  recordIds: string[];
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'UNDELETE' | 'GAP_CREATE' | 'GAP_UPDATE' | 'GAP_DELETE' | 'GAP_UNDELETE' | 'GAP_OVERFLOW';
  changeOrigin: string;
  transactionKey: string;
  sequenceNumber: number;
  commitTimestamp: number;
  commitUser: string;
  commitNumber: number;
  changedFields: string[];
}

interface CdcChangeEvent {
  ChangeEventHeader: CdcChangeEventHeader;
  [key: string]: any;
}

interface UserCdcConnection {
  userId: string;
  connection: jsforce.Connection;
  subscriptions: any[];
  instanceUrl: string;
}

@Injectable()
export class SalesforceCdcService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SalesforceCdcService.name);
  private userConnections: Map<string, UserCdcConnection> = new Map();

  // Deduplication: track processed transaction keys to avoid duplicate notifications
  // from multiple PM2 cluster instances
  private processedTransactions: Set<string> = new Set();
  private readonly MAX_PROCESSED_CACHE = 1000;

  // CDC channels for enabled entities
  private readonly CDC_CHANNELS = [
    '/data/OpportunityChangeEvent',
    '/data/LeadChangeEvent',
    '/data/AccountChangeEvent',
    '/data/ContactChangeEvent',
    '/data/CampaignChangeEvent',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesforceService: SalesforceService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  async onModuleInit() {
    // In PM2 cluster mode, only run CDC on the primary instance (instance 0)
    // to avoid duplicate notifications from multiple workers
    const instanceId = process.env.NODE_APP_INSTANCE || '0';
    if (instanceId !== '0') {
      this.logger.log(`CDC Service skipped on worker ${instanceId} (only runs on primary)`);
      return;
    }

    this.logger.warn('Salesforce CDC Service initializing on primary worker...');
    // Start CDC listeners for all connected users after a delay to let app fully start
    setTimeout(() => this.initializeAllUserConnections(), 5000);
  }

  async onModuleDestroy() {
    this.logger.log('Salesforce CDC Service shutting down...');
    // Disconnect all connections
    for (const [userId] of this.userConnections) {
      await this.disconnectUser(userId);
    }
  }

  /**
   * Initialize CDC connections for all users with active Salesforce connections
   */
  private async initializeAllUserConnections() {
    try {
      const connections = await this.prisma.salesforceConnection.findMany({
        where: {
          expiresAt: { gt: new Date() },
        },
        select: {
          userId: true,
          instanceUrl: true,
        },
      });

      this.logger.warn(`Found ${connections.length} active Salesforce connections for CDC`);

      for (const conn of connections) {
        // Initialize in background to not block startup
        this.connectUser(conn.userId).catch((err) => {
          this.logger.error(`Failed to initialize CDC for user ${conn.userId}: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize CDC connections:', error);
    }
  }

  /**
   * Connect a user to Salesforce CDC streaming
   */
  async connectUser(userId: string): Promise<boolean> {
    try {
      // Check if already connected
      if (this.userConnections.has(userId)) {
        this.logger.debug(`User ${userId} already connected to CDC`);
        return true;
      }

      // Get valid access token
      const { accessToken, instanceUrl } = await this.salesforceService.getValidAccessToken(userId);

      // Create jsforce connection
      const conn = new jsforce.Connection({
        instanceUrl,
        accessToken,
        version: '59.0',
      });

      // Test connection
      const identity = await conn.identity();
      this.logger.warn(`CDC: Connected to Salesforce as ${identity.username} for user ${userId}`);

      const subscriptions: any[] = [];

      // Subscribe to each CDC channel
      for (const channel of this.CDC_CHANNELS) {
        try {
          const streaming = conn.streaming.topic(channel);

          streaming.subscribe((message: any) => {
            this.handleChangeEvent(userId, channel, message as CdcChangeEvent);
          });

          subscriptions.push(streaming);
          this.logger.warn(`CDC: Subscribed to ${channel} for user ${userId}`);
        } catch (subError: any) {
          this.logger.warn(`CDC: Failed to subscribe to ${channel}: ${subError.message}`);
        }
      }

      // Store connection
      this.userConnections.set(userId, {
        userId,
        connection: conn,
        subscriptions,
        instanceUrl,
      });

      this.logger.warn(`CDC streaming started for user ${userId} (${subscriptions.length} channels)`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to connect user ${userId} to CDC: ${error.message}`);
      return false;
    }
  }

  /**
   * Disconnect a user from CDC streaming
   */
  async disconnectUser(userId: string): Promise<void> {
    const userConn = this.userConnections.get(userId);
    if (!userConn) return;

    try {
      // Unsubscribe from all channels
      for (const sub of userConn.subscriptions) {
        try {
          sub.unsubscribe();
        } catch (e) {
          // Ignore unsubscribe errors
        }
      }

      this.userConnections.delete(userId);
      this.logger.log(`CDC disconnected for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error disconnecting user ${userId} from CDC:`, error);
    }
  }

  /**
   * Handle incoming change events
   */
  private async handleChangeEvent(userId: string, channel: string, event: any) {
    try {
      // jsforce wraps the payload - extract it
      const payload = event.payload || event;
      const header = payload.ChangeEventHeader;

      if (!header) {
        this.logger.warn(`CDC: No ChangeEventHeader in event, skipping`);
        return;
      }

      const entityName = header.entityName;
      const changeType = header.changeType;
      const recordIds = header.recordIds || [];
      const transactionKey = header.transactionKey;

      // Deduplication: skip if we've already processed this transaction for this user
      const dedupeKey = `${transactionKey}:${userId}`;
      if (this.processedTransactions.has(dedupeKey)) {
        return; // Already processed by another cluster instance
      }

      // Mark as processed
      this.processedTransactions.add(dedupeKey);

      // Cleanup old entries to prevent memory leak
      if (this.processedTransactions.size > this.MAX_PROCESSED_CACHE) {
        const toDelete = Array.from(this.processedTransactions).slice(0, 200);
        toDelete.forEach((key) => this.processedTransactions.delete(key));
      }

      this.logger.warn(`CDC Event: ${entityName} ${changeType} for user ${userId}, records: ${recordIds.join(', ')}`);

      // Route to appropriate handler (pass payload, not wrapper)
      switch (entityName) {
        case 'Opportunity':
          await this.handleOpportunityChange(userId, changeType, payload, recordIds);
          break;
        case 'Lead':
          await this.handleLeadChange(userId, changeType, payload, recordIds);
          break;
        case 'Account':
          await this.handleAccountChange(userId, changeType, payload, recordIds);
          break;
        case 'Contact':
          await this.handleContactChange(userId, changeType, payload, recordIds);
          break;
        case 'Campaign':
          await this.handleCampaignChange(userId, changeType, payload, recordIds);
          break;
        default:
          this.logger.warn(`CDC: Unhandled entity type: ${entityName}`);
      }
    } catch (error) {
      this.logger.error(`Error handling CDC event for user ${userId}:`, error);
    }
  }

  /**
   * Handle Opportunity changes - most important for Deal Won/Lost notifications
   */
  private async handleOpportunityChange(
    userId: string,
    changeType: string,
    event: CdcChangeEvent,
    recordIds: string[],
  ) {
    const changedFields = event.ChangeEventHeader.changedFields || [];

    // Check if stage changed
    if (changeType === 'UPDATE' && changedFields.includes('StageName')) {
      const stageName = event.StageName;
      const name = event.Name;
      const amount = event.Amount;

      // Deal Won
      if (stageName === 'Closed Won') {
        const amountStr = amount ? `$${Number(amount).toLocaleString()}` : 'N/A';
        await this.notificationScheduler.sendSystemNotification(
          userId,
          '🎉 Deal Won in Salesforce!',
          `"${name || 'Opportunity'}" closed for ${amountStr}`,
          {
            type: 'DEAL_UPDATE',
            priority: 'HIGH',
            action: 'VIEW_SALESFORCE_OPPORTUNITY',
            actionData: {
              salesforceRecordId: recordIds[0],
              source: 'salesforce_cdc',
              stageName,
              amount,
            },
          },
        );
        this.logger.log(`Sent Deal Won notification for SF opportunity ${recordIds[0]}`);
      }

      // Deal Lost
      if (stageName === 'Closed Lost') {
        const amountStr = amount ? `$${Number(amount).toLocaleString()}` : 'N/A';
        await this.notificationScheduler.sendSystemNotification(
          userId,
          'Deal Lost in Salesforce',
          `"${name || 'Opportunity'}" (${amountStr}) was closed lost`,
          {
            type: 'DEAL_UPDATE',
            priority: 'NORMAL',
            action: 'VIEW_SALESFORCE_OPPORTUNITY',
            actionData: {
              salesforceRecordId: recordIds[0],
              source: 'salesforce_cdc',
              stageName,
              amount,
            },
          },
        );
        this.logger.log(`Sent Deal Lost notification for SF opportunity ${recordIds[0]}`);
      }

      // Stage progression (not closed stages)
      if (stageName && !stageName.startsWith('Closed')) {
        await this.notificationScheduler.sendSystemNotification(
          userId,
          '📈 Opportunity Stage Changed',
          `"${name || 'Opportunity'}" moved to ${stageName}`,
          {
            type: 'DEAL_UPDATE',
            priority: 'NORMAL',
            action: 'VIEW_SALESFORCE_OPPORTUNITY',
            actionData: {
              salesforceRecordId: recordIds[0],
              source: 'salesforce_cdc',
              stageName,
            },
          },
        );
      }
    }

    // New opportunity created
    if (changeType === 'CREATE') {
      const name = event.Name;
      const amount = event.Amount;
      const amountStr = amount ? `$${Number(amount).toLocaleString()}` : '';

      await this.notificationScheduler.sendSystemNotification(
        userId,
        '🆕 New Opportunity in Salesforce',
        `"${name || 'New Opportunity'}"${amountStr ? ` - ${amountStr}` : ''}`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_OPPORTUNITY',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
          },
        },
      );
    }
  }

  /**
   * Handle Lead changes
   */
  private async handleLeadChange(
    userId: string,
    changeType: string,
    event: CdcChangeEvent,
    recordIds: string[],
  ) {
    const changedFields = event.ChangeEventHeader.changedFields || [];

    // Lead converted
    if (changeType === 'UPDATE' && changedFields.includes('Status')) {
      const status = event.Status;
      const name = `${event.FirstName || ''} ${event.LastName || ''}`.trim();
      const company = event.Company;

      if (status === 'Converted' || status === 'Closed - Converted') {
        await this.notificationScheduler.sendSystemNotification(
          userId,
          '🎯 Lead Converted in Salesforce',
          `${name || 'Lead'}${company ? ` from ${company}` : ''} was converted`,
          {
            type: 'DEAL_UPDATE',
            priority: 'HIGH',
            action: 'VIEW_SALESFORCE_LEAD',
            actionData: {
              salesforceRecordId: recordIds[0],
              source: 'salesforce_cdc',
              entityType: 'Lead',
              status,
            },
          },
        );
      }
    }

    // New lead created
    if (changeType === 'CREATE') {
      const name = `${event.FirstName || ''} ${event.LastName || ''}`.trim();
      const company = event.Company;

      await this.notificationScheduler.sendSystemNotification(
        userId,
        '🆕 New Lead in Salesforce',
        `${name || 'New Lead'}${company ? ` from ${company}` : ''}`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_LEAD',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Lead',
          },
        },
      );
    }

    // Lead owner changed (assigned to this user)
    if (changeType === 'UPDATE' && changedFields.includes('OwnerId')) {
      const name = `${event.FirstName || ''} ${event.LastName || ''}`.trim();
      const company = event.Company;

      await this.notificationScheduler.sendSystemNotification(
        userId,
        '📋 Lead Assigned in Salesforce',
        `${name || 'Lead'}${company ? ` from ${company}` : ''} assigned to you`,
        {
          type: 'DEAL_UPDATE',
          priority: 'HIGH',
          action: 'VIEW_SALESFORCE_LEAD',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Lead',
          },
        },
      );
    }
  }

  /**
   * Handle Account changes
   */
  private async handleAccountChange(
    userId: string,
    changeType: string,
    event: CdcChangeEvent,
    recordIds: string[],
  ) {
    const changedFields = event.ChangeEventHeader.changedFields || [];
    const name = event.Name;

    // Account type changed (e.g., Prospect -> Customer)
    if (changeType === 'UPDATE' && changedFields.includes('Type')) {
      const type = event.Type;

      if (type === 'Customer') {
        await this.notificationScheduler.sendSystemNotification(
          userId,
          '🏢 Account Upgraded in Salesforce',
          `"${name || 'Account'}" is now a Customer`,
          {
            type: 'DEAL_UPDATE',
            priority: 'HIGH',
            action: 'VIEW_SALESFORCE_ACCOUNT',
            actionData: {
              salesforceRecordId: recordIds[0],
              source: 'salesforce_cdc',
              entityType: 'Account',
              type,
            },
          },
        );
      }
    }

    // New account created
    if (changeType === 'CREATE') {
      await this.notificationScheduler.sendSystemNotification(
        userId,
        '🆕 New Account in Salesforce',
        `"${name || 'New Account'}" was created`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_ACCOUNT',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Account',
          },
        },
      );
    }
  }

  /**
   * Handle Contact changes
   */
  private async handleContactChange(
    userId: string,
    changeType: string,
    event: CdcChangeEvent,
    recordIds: string[],
  ) {
    const name = `${event.FirstName || ''} ${event.LastName || ''}`.trim();
    const title = event.Title;

    // New contact created
    if (changeType === 'CREATE') {
      await this.notificationScheduler.sendSystemNotification(
        userId,
        '🆕 New Contact in Salesforce',
        `${name || 'New Contact'}${title ? ` (${title})` : ''}`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_CONTACT',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Contact',
          },
        },
      );
    }
  }

  /**
   * Handle Campaign changes
   */
  private async handleCampaignChange(
    userId: string,
    changeType: string,
    event: CdcChangeEvent,
    recordIds: string[],
  ) {
    const changedFields = event.ChangeEventHeader.changedFields || [];
    const name = event.Name;

    // Campaign status changed
    if (changeType === 'UPDATE' && changedFields.includes('Status')) {
      const status = event.Status;

      await this.notificationScheduler.sendSystemNotification(
        userId,
        '📢 Campaign Updated in Salesforce',
        `"${name || 'Campaign'}" status: ${status}`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_CAMPAIGN',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Campaign',
            status,
          },
        },
      );
    }

    // New campaign created
    if (changeType === 'CREATE') {
      await this.notificationScheduler.sendSystemNotification(
        userId,
        '🆕 New Campaign in Salesforce',
        `"${name || 'New Campaign'}" was created`,
        {
          type: 'DEAL_UPDATE',
          priority: 'NORMAL',
          action: 'VIEW_SALESFORCE_CAMPAIGN',
          actionData: {
            salesforceRecordId: recordIds[0],
            source: 'salesforce_cdc',
            entityType: 'Campaign',
          },
        },
      );
    }
  }

  /**
   * Reconnect a user (e.g., after token refresh)
   */
  async reconnectUser(userId: string): Promise<boolean> {
    await this.disconnectUser(userId);
    return this.connectUser(userId);
  }

  /**
   * Check if a user is connected to CDC
   */
  isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * Get CDC connection status for a user
   */
  getConnectionStatus(userId: string): { connected: boolean; channels: string[] } {
    const connection = this.userConnections.get(userId);
    return {
      connected: !!connection,
      channels: connection ? this.CDC_CHANNELS : [],
    };
  }
}
