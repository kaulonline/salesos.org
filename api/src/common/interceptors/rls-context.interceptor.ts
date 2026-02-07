import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

/**
 * RLS Context Interceptor
 *
 * This interceptor automatically sets PostgreSQL Row-Level Security (RLS) context
 * for every request, providing a database-level safety net for tenant isolation.
 *
 * How it works:
 * 1. Before the request handler runs, it sets the RLS context in PostgreSQL
 * 2. PostgreSQL RLS policies can then enforce tenant isolation at the DB level
 * 3. After the request completes (success or error), the context is cleared
 *
 * SECURITY: This is a defense-in-depth measure. Even if application-level
 * filtering is bypassed, the database will enforce tenant boundaries.
 *
 * Prerequisites:
 * - RLS must be enabled on tenant-scoped tables
 * - RLS policies must reference app.current_organization_id
 * - Tables must have organizationId column
 */
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RlsContextInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.organizationId;
    const user = request.user;
    const isAdmin = user?.role === 'ADMIN';

    // If no organization context, skip RLS setup (guard should have rejected)
    if (!organizationId) {
      return next.handle();
    }

    // Set RLS context before handler executes
    try {
      await this.prisma.setRlsContext(organizationId, isAdmin);
    } catch (error) {
      this.logger.error(
        `Failed to set RLS context for org ${organizationId}: ${error.message}`
      );
      // Continue without RLS - application-level filtering is primary defense
    }

    // Execute handler and clear context after
    return next.handle().pipe(
      tap(async () => {
        // Clear context on success
        try {
          await this.prisma.clearRlsContext();
        } catch (error) {
          this.logger.warn(`Failed to clear RLS context: ${error.message}`);
        }
      }),
      catchError(async (error) => {
        // Clear context on error
        try {
          await this.prisma.clearRlsContext();
        } catch (clearError) {
          this.logger.warn(`Failed to clear RLS context after error: ${clearError.message}`);
        }
        throw error;
      })
    );
  }
}

/**
 * Utility function to check if RLS is enabled on a table.
 * Useful for health checks and debugging.
 */
export async function checkRlsStatus(
  prisma: PrismaService,
  tableName: string
): Promise<{ enabled: boolean; policies: string[] }> {
  try {
    const result = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = ${tableName}
    `;

    const enabled = result[0]?.relrowsecurity ?? false;

    // Get policy names if RLS is enabled
    let policies: string[] = [];
    if (enabled) {
      const policyResult = await prisma.$queryRaw<Array<{ polname: string }>>`
        SELECT polname
        FROM pg_policy
        WHERE polrelid = ${tableName}::regclass
      `;
      policies = policyResult.map((p) => p.polname);
    }

    return { enabled, policies };
  } catch (error) {
    return { enabled: false, policies: [] };
  }
}

/**
 * Get RLS status for all multi-tenant tables.
 */
export async function getAllRlsStatus(prisma: PrismaService): Promise<
  Array<{ table: string; enabled: boolean; policies: string[] }>
> {
  const multiTenantTables = [
    'Lead',
    'Account',
    'Contact',
    'Opportunity',
    'Quote',
    'Order',
    'Product',
    'Contract',
    'Campaign',
    'Task',
    'Activity',
    'Note',
    'Pipeline',
    'Territory',
    'Playbook',
  ];

  const results = await Promise.all(
    multiTenantTables.map(async (table) => {
      const status = await checkRlsStatus(prisma, table);
      return { table, ...status };
    })
  );

  return results;
}
