import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Configure connection pool and logging for production scalability
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
      // Connection pool is configured via DATABASE_URL query params:
      // ?connection_limit=20&pool_timeout=30
      // These are parsed automatically by Prisma
    });

    // Log slow queries (>1000ms) for performance monitoring
    // SECURITY: Sanitize query to avoid logging sensitive values
    (this as any).$on('query', (e: Prisma.QueryEvent) => {
      if (e.duration > 1000) {
        // Sanitize the query to remove potential sensitive values
        const sanitizedQuery = this.sanitizeQueryForLogging(e.query);
        this.logger.warn(
          `Slow query detected (${e.duration}ms): ${sanitizedQuery}`,
        );
      }
    });

    // Log all errors
    (this as any).$on('error', (e: any) => {
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
    
    // Log connection pool info
    const dbUrl = process.env.DATABASE_URL || '';
    const poolMatch = dbUrl.match(/connection_limit=(\d+)/);
    const poolSize = poolMatch ? poolMatch[1] : 'default (10)';
    this.logger.log(`Connection pool size: ${poolSize}`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Health check for database connectivity
   * Useful for load balancer health checks
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get connection pool statistics
   * Note: Prisma doesn't expose pool stats directly, but we can track query performance
   */
  async getStats(): Promise<{ healthy: boolean; timestamp: Date }> {
    const healthy = await this.healthCheck();
    return {
      healthy,
      timestamp: new Date(),
    };
  }

  /**
   * Sanitize SQL query for safe logging.
   * Removes sensitive values like passwords, tokens, and PII while preserving query structure.
   * @param query - The raw SQL query string
   * @returns Sanitized query safe for logging
   */
  private sanitizeQueryForLogging(query: string): string {
    // Limit query length
    let sanitized = query.substring(0, 500);

    // Replace string literals that might contain sensitive data
    // Matches single-quoted strings and replaces with placeholder
    sanitized = sanitized.replace(/'[^']*'/g, "'[REDACTED]'");

    // Replace email patterns
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    // Replace potential UUID values (common for tokens, user IDs)
    // Keep first 8 chars for debugging, redact the rest
    sanitized = sanitized.replace(
      /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '$1-****-****-****-************'
    );

    // Replace numeric parameters that might be sensitive (keep structure visible)
    sanitized = sanitized.replace(/\$(\d+)/g, '$$$1');

    // Truncate if still too long
    if (sanitized.length > 300) {
      sanitized = sanitized.substring(0, 300) + '... [truncated]';
    }

    return sanitized;
  }

  // ============ Row-Level Security (RLS) Context Methods ============

  /**
   * Set the RLS context for the current database session.
   * This sets PostgreSQL session variables that RLS policies can reference.
   *
   * IMPORTANT: This should be called before any database operations that need
   * tenant isolation at the database level.
   *
   * @param organizationId - The organization ID to scope queries to
   * @param isAdmin - Whether the current user is an admin (can bypass RLS)
   */
  async setRlsContext(organizationId: string, isAdmin: boolean = false): Promise<void> {
    try {
      await this.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;
      await this.$executeRaw`SELECT set_config('app.is_admin', ${isAdmin ? 'true' : 'false'}, true)`;
    } catch (error) {
      this.logger.error(`Failed to set RLS context: ${error}`);
      throw error;
    }
  }

  /**
   * Clear the RLS context for the current database session.
   * Call this after operations are complete to ensure clean state.
   */
  async clearRlsContext(): Promise<void> {
    try {
      await this.$executeRaw`SELECT set_config('app.current_organization_id', '', true)`;
      await this.$executeRaw`SELECT set_config('app.is_admin', 'false', true)`;
    } catch (error) {
      this.logger.error(`Failed to clear RLS context: ${error}`);
      // Don't throw - this is cleanup
    }
  }

  /**
   * Execute a database operation with RLS context automatically managed.
   * This ensures the organization context is set before the operation and cleaned up after.
   *
   * @param organizationId - The organization ID to scope queries to
   * @param isAdmin - Whether the current user is an admin
   * @param operation - The database operation to execute
   * @returns The result of the operation
   *
   * @example
   * ```typescript
   * const leads = await prisma.withOrganizationContext(
   *   orgId,
   *   false,
   *   async () => {
   *     return prisma.lead.findMany({ where: { status: 'NEW' } });
   *   }
   * );
   * ```
   */
  async withOrganizationContext<T>(
    organizationId: string,
    isAdmin: boolean,
    operation: () => Promise<T>
  ): Promise<T> {
    await this.setRlsContext(organizationId, isAdmin);
    try {
      return await operation();
    } finally {
      await this.clearRlsContext();
    }
  }

  /**
   * Execute a transaction with RLS context automatically managed.
   * Uses Prisma's interactive transactions with RLS context.
   *
   * @param organizationId - The organization ID to scope queries to
   * @param isAdmin - Whether the current user is an admin
   * @param operation - The transaction operation to execute
   * @returns The result of the transaction
   */
  async withOrganizationTransaction<T>(
    organizationId: string,
    isAdmin: boolean,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set RLS context within the transaction
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.is_admin', ${isAdmin ? 'true' : 'false'}, true)`;

      return operation(tx);
    });
  }

  /**
   * Get the current RLS context (for debugging/logging).
   */
  async getRlsContext(): Promise<{ organizationId: string | null; isAdmin: boolean }> {
    try {
      const result = await this.$queryRaw<Array<{ org_id: string; is_admin: string }>>`
        SELECT
          current_setting('app.current_organization_id', true) as org_id,
          current_setting('app.is_admin', true) as is_admin
      `;

      return {
        organizationId: result[0]?.org_id || null,
        isAdmin: result[0]?.is_admin === 'true',
      };
    } catch (error) {
      this.logger.error(`Failed to get RLS context: ${error}`);
      return { organizationId: null, isAdmin: false };
    }
  }
}
