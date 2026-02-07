import { Injectable, ForbiddenException, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import type { Request } from 'express';

/**
 * TenantContextService - Helper service for enforcing multi-tenant data isolation.
 *
 * This service provides utilities for:
 * - Extracting and validating organization context from requests
 * - Building tenant-scoped Prisma where clauses
 * - Ensuring all data operations are properly scoped
 *
 * SECURITY: This service is critical for preventing cross-tenant data leakage.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Get the organization ID from the current request context.
   * Returns null if no organization context is set.
   */
  getOrganizationId(): string | null {
    const req = this.request as any;
    return req.organizationId || null;
  }

  /**
   * Get the organization ID, throwing an error if not present.
   * Use this method for operations that REQUIRE tenant context.
   *
   * @throws ForbiddenException if no organization context is set
   */
  getRequiredOrganizationId(): string {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      throw new ForbiddenException(
        'Organization context required. Ensure X-Organization-ID header is set or user has an organization membership.'
      );
    }
    return organizationId;
  }

  /**
   * Get the current user from the request.
   */
  getUser(): any {
    return (this.request as any).user;
  }

  /**
   * Check if the current user is an admin.
   */
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  }

  /**
   * Get the organization role of the current user (e.g., 'OWNER', 'ADMIN', 'MEMBER').
   */
  getOrganizationRole(): string | null {
    return (this.request as any).organizationRole || null;
  }

  /**
   * Build a tenant-scoped where clause for Prisma queries.
   *
   * @param additionalWhere - Additional where conditions to merge
   * @returns Where clause with organizationId always included
   * @throws ForbiddenException if no organization context
   */
  buildTenantWhere<T extends Record<string, any>>(additionalWhere?: T): T & { organizationId: string } {
    const organizationId = this.getRequiredOrganizationId();
    return {
      ...(additionalWhere || {}),
      organizationId,
    } as T & { organizationId: string };
  }

  /**
   * Build a tenant-scoped where clause with optional owner restriction.
   * Admins see all records within the organization, regular users see only their own.
   *
   * @param userId - The current user's ID
   * @param additionalWhere - Additional where conditions to merge
   * @returns Where clause with organizationId and optional ownerId
   * @throws ForbiddenException if no organization context
   */
  buildOwnerScopedWhere<T extends Record<string, any>>(
    userId: string,
    additionalWhere?: T
  ): T & { organizationId: string; ownerId?: string } {
    const organizationId = this.getRequiredOrganizationId();
    const where: any = {
      ...(additionalWhere || {}),
      organizationId,
    };

    // Non-admins can only see their own records
    if (!this.isAdmin()) {
      where.ownerId = userId;
    }

    return where;
  }

  /**
   * Validate that a record belongs to the current organization.
   * Use this for verifying single record access before operations.
   *
   * @param recordOrgId - The organizationId of the record being accessed
   * @throws ForbiddenException if the record doesn't belong to the current organization
   */
  validateRecordAccess(recordOrgId: string | null): void {
    const currentOrgId = this.getRequiredOrganizationId();

    if (!recordOrgId) {
      throw new ForbiddenException(
        'Record has no organization context and cannot be accessed.'
      );
    }

    if (recordOrgId !== currentOrgId) {
      throw new ForbiddenException(
        'You do not have permission to access this record.'
      );
    }
  }

  /**
   * Create data object with organization context for new records.
   *
   * @param data - The data to create the record with
   * @returns Data object with organizationId included
   * @throws ForbiddenException if no organization context
   */
  withOrganizationData<T extends Record<string, any>>(data: T): T & { organizationId: string } {
    const organizationId = this.getRequiredOrganizationId();
    return {
      ...data,
      organizationId,
    };
  }
}

/**
 * Standalone function version for use outside of request context.
 * Validates that organizationId is present and throws if not.
 */
export function requireOrganizationId(organizationId: string | null | undefined): string {
  if (!organizationId) {
    throw new ForbiddenException(
      'Organization context required for this operation.'
    );
  }
  return organizationId;
}

/**
 * Build a simple tenant where clause (for use in services without DI).
 */
export function buildTenantWhereClause(
  organizationId: string,
  additionalWhere?: Record<string, any>
): Record<string, any> {
  return {
    ...(additionalWhere || {}),
    organizationId,
  };
}
