import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extended Request interface with organization context
 */
export interface OrganizationRequest extends Request {
  organizationId?: string | null;
  organizationRole?: string;
  user?: {
    id: string;
    userId: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

/**
 * Middleware to extract organization context from the request.
 *
 * Organization ID can come from:
 * 1. X-Organization-ID header (for explicit org selection)
 * 2. Query parameter ?organizationId=xxx (for API calls)
 * 3. JWT payload (user's default organization)
 *
 * This middleware runs after authentication and sets request.organizationId
 * for use by guards, decorators, and controllers.
 */
@Injectable()
export class OrganizationMiddleware implements NestMiddleware {
  use(req: OrganizationRequest, res: Response, next: NextFunction) {
    // Extract organizationId from various sources (priority order)
    const organizationId =
      // 1. Explicit header (highest priority - allows org switching)
      req.headers['x-organization-id'] as string ||
      // 2. Query parameter
      (req.query.organizationId as string) ||
      // 3. User's default organization from JWT (set after auth)
      req.user?.organizationId ||
      null;

    // Set on request for downstream use
    if (organizationId) {
      req.organizationId = organizationId;
    }

    next();
  }
}

/**
 * Helper function to get organizationId from request
 * Use this in services when not using the @CurrentOrganization decorator
 */
export function getOrganizationId(req: OrganizationRequest): string | null {
  return req.organizationId || req.user?.organizationId || null;
}

/**
 * Helper function to check if user has organization context
 */
export function hasOrganizationContext(req: OrganizationRequest): boolean {
  return !!getOrganizationId(req);
}
