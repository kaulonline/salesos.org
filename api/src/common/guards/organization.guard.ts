import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import {
  REQUIRE_ORGANIZATION_KEY,
  ALLOW_CROSS_ORG_KEY,
  SKIP_ORGANIZATION_KEY,
} from '../decorators/organization.decorator';

// Routes that don't require organization context (public/auth routes)
const PUBLIC_ROUTE_PREFIXES = [
  '/auth',
  '/health',
  '/waitlist',
  '/support/tickets/public',
  '/web-forms/submit',
  '/api/auth',
  '/api/health',
  '/api/waitlist',
];

/**
 * Guard to validate organization access.
 * Ensures the user belongs to the organization they're trying to access.
 *
 * Usage with @RequireOrganization() decorator or globally.
 * Use @SkipOrganization() to bypass for specific routes.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.url || request.path || '';

    // Skip for public routes that don't need organization context
    if (PUBLIC_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix))) {
      return true;
    }

    // Check if organization check should be skipped via decorator
    const skipOrg = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipOrg) {
      return true;
    }

    // If no user, this is an unauthenticated route - let JwtAuthGuard handle it
    if (!user) {
      return true;
    }

    // Check if cross-org access is allowed (e.g., for admin endpoints)
    const allowCrossOrg = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CROSS_ORG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowCrossOrg && user.role === 'ADMIN') {
      return true;
    }

    // Check if organization is required
    const requireOrg = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ORGANIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get organizationId from various sources
    const organizationId =
      request.organizationId ||
      request.headers['x-organization-id'] ||
      user.organizationId;

    // If organization is required but not provided
    if (requireOrg && !organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // SECURITY: Reject requests without organizationId
    // Only admins with @AllowCrossOrganization decorator can bypass this check
    if (!organizationId) {
      // Log this security-relevant event for monitoring (no PII - only IDs)
      this.logger.warn(
        `Request without organization context - userId: ${user.userId || user.id}, ` +
        `path: ${request.url}, method: ${request.method}`
      );
      throw new ForbiddenException(
        'Organization context required. Please ensure you are accessing resources within your organization.'
      );
    }

    // Store organizationId in request for use by controllers/services
    request.organizationId = organizationId;

    // Validate user belongs to this organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: user.userId || user.id,
        organizationId: organizationId,
        isActive: true,
      },
    });

    if (!membership) {
      // Check if user has any organization membership
      const anyMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.userId || user.id,
          isActive: true,
        },
      });

      if (anyMembership) {
        throw new ForbiddenException(
          'You do not have access to this organization',
        );
      }

      // SECURITY: User has no organization membership - reject the request
      // Users must belong to at least one organization to access tenant-scoped resources
      this.logger.warn(
        `User without organization membership - userId: ${user.userId || user.id}, ` +
        `attemptedPath: ${request.url}`
      );
      throw new ForbiddenException(
        'You must belong to an organization to access this resource. Please contact your administrator.'
      );
    }

    // Add organization role to request for fine-grained access control
    request.organizationRole = membership.role;

    return true;
  }
}
