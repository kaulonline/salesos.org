import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Organization Context Interceptor
 *
 * This interceptor runs AFTER guards (including JwtAuthGuard) and ensures
 * that request.organizationId is set from the authenticated user's JWT payload.
 *
 * The timing issue this solves:
 * 1. OrganizationMiddleware runs before auth - can't access user.organizationId
 * 2. OrganizationGuard runs before JwtAuthGuard (global vs class-level) - same issue
 * 3. This interceptor runs after all guards, so user is already set
 *
 * This allows @CurrentOrganization decorator to find organizationId even when
 * middleware/guard couldn't set it.
 */
@Injectable()
export class OrganizationContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OrganizationContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Debug: log the state before setting
    const hasReqOrgId = !!request.organizationId;
    const hasUser = !!request.user;
    const hasUserOrgId = !!request.user?.organizationId;

    // If organizationId is not already set but user has one, set it
    if (!request.organizationId && request.user?.organizationId) {
      request.organizationId = request.user.organizationId;
      this.logger.debug(
        `Set organizationId from user: ${request.organizationId} for ${request.url}`
      );
    } else if (!request.organizationId && !request.user?.organizationId) {
      // Log warning when we can't set organizationId
      this.logger.warn(
        `Cannot set organizationId - hasReqOrgId: ${hasReqOrgId}, hasUser: ${hasUser}, hasUserOrgId: ${hasUserOrgId}, path: ${request.url}`
      );
    }

    return next.handle();
  }
}
