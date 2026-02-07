import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as snowflake from 'snowflake-sdk';
import {
  SnowflakeConfig,
  UsageMetric,
  StrategicAccountData,
  PipelineData,
} from './dto';

@Injectable()
export class SnowflakeService implements OnModuleDestroy {
  private readonly logger = new Logger(SnowflakeService.name);
  private connection: snowflake.Connection | null = null;
  private connecting: Promise<snowflake.Connection> | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Configure snowflake SDK to use insecure mode for self-signed certs in dev
    // In production, ensure proper SSL certificates
    snowflake.configure({ logLevel: 'WARN' });
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Get or create a Snowflake connection
   */
  private async getConnection(): Promise<snowflake.Connection> {
    // Return existing connection if available
    if (this.connection) {
      return this.connection;
    }

    // If a connection attempt is in progress, wait for it
    if (this.connecting) {
      return this.connecting;
    }

    const config = await this.getConfig();
    if (!config) {
      throw new BadRequestException('Snowflake not configured');
    }

    // Start connection attempt
    this.connecting = new Promise<snowflake.Connection>((resolve, reject) => {
      const connectionConfig: snowflake.ConnectionOptions = {
        account: config.account,
        username: config.username,
        database: config.database,
        schema: config.schema,
        warehouse: config.warehouse,
        role: config.role,
      };

      // Use password or private key authentication
      if (config.password) {
        connectionConfig.password = config.password;
      } else if (config.privateKey) {
        connectionConfig.authenticator = 'SNOWFLAKE_JWT';
        connectionConfig.privateKey = config.privateKey;
      }

      const connection = snowflake.createConnection(connectionConfig);

      connection.connect((err, conn) => {
        this.connecting = null;
        if (err) {
          this.logger.error('Failed to connect to Snowflake:', err.message);
          reject(err);
        } else {
          this.logger.log('Successfully connected to Snowflake');
          this.connection = conn;
          resolve(conn);
        }
      });
    });

    return this.connecting;
  }

  /**
   * Disconnect from Snowflake
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      return new Promise<void>((resolve) => {
        this.connection!.destroy((err) => {
          if (err) {
            this.logger.warn('Error disconnecting from Snowflake:', err.message);
          } else {
            this.logger.log('Disconnected from Snowflake');
          }
          this.connection = null;
          resolve();
        });
      });
    }
  }

  /**
   * Get Snowflake configuration from IntegrationConfig
   */
  async getConfig(organizationId?: string): Promise<SnowflakeConfig | null> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'snowflake' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'snowflake' },
        });

    if (!integration || !integration.credentials) {
      return null;
    }

    const creds = integration.credentials as any;
    return {
      account: creds.account,
      username: creds.username,
      password: creds.password,
      privateKey: creds.privateKey,
      database: creds.database,
      schema: creds.schema,
      warehouse: creds.warehouse,
      role: creds.role,
    };
  }

  /**
   * Test connection to Snowflake by executing a simple query
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const config = await this.getConfig();
    if (!config) {
      return { success: false, message: 'Snowflake not configured' };
    }

    // Validate required fields
    if (!config.account || !config.username || !config.database) {
      return { success: false, message: 'Invalid configuration: missing required fields (account, username, database)' };
    }

    const startTime = Date.now();

    try {
      // Disconnect existing connection to test fresh
      await this.disconnect();

      // Attempt to connect
      const connection = await this.getConnection();

      // Execute a simple test query
      await new Promise<void>((resolve, reject) => {
        connection.execute({
          sqlText: 'SELECT CURRENT_TIMESTAMP()',
          complete: (err, stmt, rows) => {
            if (err) {
              reject(err);
            } else {
              this.logger.log(`Snowflake test query returned: ${rows?.[0] ? JSON.stringify(rows[0]) : 'OK'}`);
              resolve();
            }
          },
        });
      });

      // Update integration status (use updateMany for multi-tenant compatibility)
      await this.prisma.integrationConfig.updateMany({
        where: { provider: 'snowflake' },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: 'Connection successful',
        latencyMs,
      };
    } catch (error: any) {
      this.logger.error('Snowflake connection test failed:', error?.message || error);

      // Update integration status to error (use updateMany for multi-tenant compatibility)
      try {
        await this.prisma.integrationConfig.updateMany({
          where: { provider: 'snowflake' },
          data: {
            status: 'error',
            syncError: error?.message || 'Connection failed',
          },
        });
      } catch (updateError) {
        this.logger.warn('Failed to update integration status:', updateError);
      }

      return { success: false, message: error?.message || 'Connection failed' };
    }
  }

  /**
   * Execute a SQL query against Snowflake
   */
  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    // Check if connected first
    const isConnected = await this.isConnected();
    if (!isConnected) {
      this.logger.warn('Snowflake not connected - returning empty results');
      return [];
    }

    this.logger.log(`Executing Snowflake query: ${query.substring(0, 100)}...`);

    try {
      const connection = await this.getConnection();

      return new Promise<any[]>((resolve, reject) => {
        connection.execute({
          sqlText: query,
          binds: params,
          complete: (err, stmt, rows) => {
            if (err) {
              this.logger.error('Snowflake query execution failed:', err.message);
              reject(new BadRequestException(`Query execution failed: ${err.message}`));
            } else {
              this.logger.log(`Snowflake query returned ${rows?.length || 0} rows`);
              resolve(rows || []);
            }
          },
        });
      });
    } catch (error: any) {
      this.logger.error('Snowflake query execution failed:', error?.message || error);
      throw new BadRequestException(`Query execution failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get usage metrics for an account from Snowflake data warehouse
   */
  async getUsageMetrics(accountId: string, timeframe: '7d' | '30d' | '90d' = '30d'): Promise<UsageMetric[]> {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

    const query = `
      SELECT
        account_id,
        date,
        active_users,
        api_calls,
        data_volume_gb,
        feature_usage
      FROM analytics.account_usage
      WHERE account_external_id = ?
        AND date >= DATEADD(day, -${days}, CURRENT_DATE())
      ORDER BY date DESC
    `;

    const results = await this.executeQuery(query, [accountId]);

    return results.map(row => ({
      accountId: row.account_id,
      date: new Date(row.date),
      activeUsers: row.active_users,
      apiCalls: row.api_calls,
      dataVolumeGb: row.data_volume_gb,
      featureUsage: row.feature_usage || {},
    }));
  }

  /**
   * Detect usage spikes or declines for signal generation
   */
  async detectUsageChanges(accountIds: string[]): Promise<Array<{
    accountId: string;
    changeType: 'spike' | 'decline';
    metric: string;
    percentChange: number;
    currentValue: number;
    previousValue: number;
  }>> {
    const changes: Array<{
      accountId: string;
      changeType: 'spike' | 'decline';
      metric: string;
      percentChange: number;
      currentValue: number;
      previousValue: number;
    }> = [];

    for (const accountId of accountIds) {
      const metrics = await this.getUsageMetrics(accountId, '30d');
      if (metrics.length < 14) continue; // Need at least 2 weeks of data

      // Compare recent week to previous week
      const recentWeek = metrics.slice(0, 7);
      const previousWeek = metrics.slice(7, 14);

      const recentAvgUsers = recentWeek.reduce((sum, m) => sum + m.activeUsers, 0) / 7;
      const previousAvgUsers = previousWeek.reduce((sum, m) => sum + m.activeUsers, 0) / 7;

      if (previousAvgUsers > 0) {
        const percentChange = ((recentAvgUsers - previousAvgUsers) / previousAvgUsers) * 100;

        if (percentChange >= 25) {
          changes.push({
            accountId,
            changeType: 'spike',
            metric: 'active_users',
            percentChange: Math.round(percentChange),
            currentValue: Math.round(recentAvgUsers),
            previousValue: Math.round(previousAvgUsers),
          });
        } else if (percentChange <= -25) {
          changes.push({
            accountId,
            changeType: 'decline',
            metric: 'active_users',
            percentChange: Math.round(percentChange),
            currentValue: Math.round(recentAvgUsers),
            previousValue: Math.round(previousAvgUsers),
          });
        }
      }
    }

    return changes;
  }

  /**
   * Get strategic account data from Snowflake
   */
  async getStrategicAccountData(accountIds: string[]): Promise<StrategicAccountData[]> {
    if (accountIds.length === 0) return [];

    const placeholders = accountIds.map(() => '?').join(',');
    const query = `
      SELECT
        a.account_id,
        a.external_id,
        a.mrr,
        a.arr,
        a.health_score,
        a.nps_score,
        a.last_activity_date,
        a.risk_factors,
        a.expansion_opportunities
      FROM analytics.strategic_accounts a
      WHERE a.external_id IN (${placeholders})
    `;

    const results = await this.executeQuery(query, accountIds);

    return results.map(row => ({
      accountId: row.account_id,
      externalId: row.external_id,
      mrr: row.mrr || 0,
      arr: row.arr || 0,
      healthScore: row.health_score || 0,
      nps: row.nps_score,
      lastActivityDate: new Date(row.last_activity_date),
      riskFactors: row.risk_factors || [],
      expansionOpportunities: row.expansion_opportunities || [],
    }));
  }

  /**
   * Get global pipeline data from Snowflake
   */
  async getPipelineData(region?: string, timeframe: '30d' | '90d' | '365d' = '90d'): Promise<PipelineData> {
    const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;

    let whereClause = `WHERE close_date >= DATEADD(day, -${days}, CURRENT_DATE())`;
    const params: any[] = [];

    if (region) {
      whereClause += ' AND region = ?';
      params.push(region);
    }

    const query = `
      SELECT
        SUM(amount) as total_value,
        COUNT(*) as deal_count,
        AVG(amount) as avg_deal_size,
        stage,
        region,
        SUM(CASE WHEN forecast_category = 'Commit' THEN amount ELSE 0 END) as commit_value,
        SUM(CASE WHEN forecast_category = 'Best Case' THEN amount ELSE 0 END) as best_case_value,
        SUM(CASE WHEN forecast_category = 'Pipeline' THEN amount ELSE 0 END) as pipeline_value
      FROM analytics.opportunities
      ${whereClause}
      GROUP BY stage, region
    `;

    const results = await this.executeQuery(query, params);

    // Aggregate results
    const byStage: Record<string, { value: number; count: number }> = {};
    const byRegion: Record<string, { value: number; count: number }> = {};
    let totalValue = 0;
    let dealCount = 0;
    let commit = 0;
    let best = 0;
    let pipeline = 0;

    for (const row of results) {
      totalValue += row.total_value || 0;
      dealCount += row.deal_count || 0;
      commit += row.commit_value || 0;
      best += row.best_case_value || 0;
      pipeline += row.pipeline_value || 0;

      if (row.stage) {
        if (!byStage[row.stage]) {
          byStage[row.stage] = { value: 0, count: 0 };
        }
        byStage[row.stage].value += row.total_value || 0;
        byStage[row.stage].count += row.deal_count || 0;
      }

      if (row.region) {
        if (!byRegion[row.region]) {
          byRegion[row.region] = { value: 0, count: 0 };
        }
        byRegion[row.region].value += row.total_value || 0;
        byRegion[row.region].count += row.deal_count || 0;
      }
    }

    return {
      totalValue,
      dealCount,
      avgDealSize: dealCount > 0 ? totalValue / dealCount : 0,
      byStage: Object.entries(byStage).map(([stage, data]) => ({
        stage,
        value: data.value,
        count: data.count,
      })),
      byRegion: Object.entries(byRegion).map(([region, data]) => ({
        region,
        value: data.value,
        count: data.count,
      })),
      forecast: { commit, best, pipeline },
    };
  }

  /**
   * Check if Snowflake integration is enabled and connected
   */
  async isConnected(organizationId?: string): Promise<boolean> {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider: 'snowflake' } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider: 'snowflake' },
        });

    return integration?.status === 'connected';
  }

  /**
   * Get Snowflake integration status
   */
  async getStatus(): Promise<{ connected: boolean; configured: boolean; message?: string }> {
    const config = await this.getConfig();
    const isConnected = await this.isConnected();

    return {
      connected: isConnected,
      configured: !!config?.account,
      message: isConnected ? 'Snowflake connected' : config ? 'Not connected' : 'Not configured',
    };
  }
}
