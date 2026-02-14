import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * RolesGuard - Validates user has required organization-level role
 *
 * IMPORTANT: This checks organizationRole (OWNER, ADMIN, MANAGER, MEMBER)
 * set by OrganizationGuard, NOT the global user.role field.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
 * @Roles('ADMIN', 'OWNER')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles specified, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Use organizationRole set by OrganizationGuard for organization-level RBAC
    const userRole = request.organizationRole || user?.role;

    if (!userRole) {
      this.logger.warn(
        `No role found for user ${user?.userId || user?.id} - ` +
        `ensure OrganizationGuard runs before RolesGuard`
      );
      return false;
    }

    const hasAccess = requiredRoles.includes(userRole);

    if (!hasAccess) {
      this.logger.debug(
        `Access denied: user role '${userRole}' not in required roles [${requiredRoles.join(', ')}]`
      );
    }

    return hasAccess;
  }
}
