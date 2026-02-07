import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Decorator to extract the current organization ID from the request.
 * The organizationId is set by the OrganizationMiddleware or included in the JWT payload.
 *
 * SECURITY: The OrganizationGuard ensures that organizationId is always present
 * before the controller is reached. This decorator returns a non-null string
 * because requests without organization context are rejected by the guard.
 *
 * Usage:
 * @Get()
 * findAll(@CurrentOrganization() organizationId: string) {
 *   return this.service.findAll(organizationId);
 * }
 */
export const CurrentOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority: 1. Request organizationId (set by middleware/guard)
    //           2. User's organizationId from JWT
    //           3. Header X-Organization-ID
    const organizationId =
      request.organizationId ||
      request.user?.organizationId ||
      request.headers['x-organization-id'];

    // This should never happen if OrganizationGuard is properly applied
    // The guard rejects requests without organizationId before reaching here
    if (!organizationId) {
      throw new Error(
        'Organization context missing. Ensure OrganizationGuard is applied to this route.'
      );
    }

    return organizationId;
  },
);

/**
 * Decorator to mark a route as requiring organization context.
 * Used with OrganizationGuard to enforce tenant isolation.
 *
 * Usage:
 * @RequireOrganization()
 * @Get()
 * findAll() { ... }
 */
export const REQUIRE_ORGANIZATION_KEY = 'requireOrganization';
export const RequireOrganization = () => SetMetadata(REQUIRE_ORGANIZATION_KEY, true);

/**
 * Decorator to mark a route as allowing cross-organization access.
 * Used for admin endpoints that need to access data across tenants.
 *
 * Usage:
 * @AllowCrossOrganization()
 * @Get('admin/all')
 * findAllAcrossOrgs() { ... }
 */
export const ALLOW_CROSS_ORG_KEY = 'allowCrossOrganization';
export const AllowCrossOrganization = () => SetMetadata(ALLOW_CROSS_ORG_KEY, true);

/**
 * Decorator to skip organization validation entirely.
 * Use for routes that genuinely don't need organization context
 * (e.g., user profile, user settings, organization list).
 *
 * SECURITY: Use sparingly - most routes should require org context.
 *
 * Usage:
 * @SkipOrganization()
 * @Get('me')
 * getMyProfile() { ... }
 */
export const SKIP_ORGANIZATION_KEY = 'skipOrganization';
export const SkipOrganization = () => SetMetadata(SKIP_ORGANIZATION_KEY, true);
