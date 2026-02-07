import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfService } from '../../auth/csrf.service';

/**
 * Decorator to skip CSRF protection for specific routes
 * Use this for:
 * - Webhook endpoints (authenticated via signatures)
 * - API key authenticated endpoints
 * - Login/register endpoints (no session yet)
 */
export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => {
    // Using function to create decorator
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        if (propertyKey && descriptor) {
            // Method decorator
            Reflect.defineMetadata(SKIP_CSRF_KEY, true, descriptor.value);
        } else {
            // Class decorator
            Reflect.defineMetadata(SKIP_CSRF_KEY, true, target);
        }
        return descriptor || target;
    };
};

/**
 * CSRF Protection Guard
 *
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE).
 * This guard should be used globally or on controllers handling sensitive operations.
 *
 * Bypass conditions:
 * - GET, HEAD, OPTIONS requests (safe/idempotent methods)
 * - Routes decorated with @SkipCsrf()
 * - Requests authenticated via API key (X-API-Key header)
 * - Webhook endpoints (paths containing /webhook)
 *
 * Required headers for protected requests:
 * - Authorization: Bearer <JWT> (user must be authenticated)
 * - X-CSRF-Token: <token> (the CSRF token from login response)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
    private readonly logger = new Logger(CsrfGuard.name);

    // Methods that change state and require CSRF protection
    private readonly STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Paths that are exempt from CSRF (webhooks, public endpoints)
    private readonly EXEMPT_PATH_PATTERNS = [
        /\/webhook/i,           // Webhook endpoints
        /\/api\/v1\/webhooks/i, // API webhook endpoints
        /\/auth\/login$/i,      // Login endpoint (no session yet)
        /\/auth\/register$/i,   // Register endpoint (no session yet)
        /\/auth\/forgot-password$/i,  // Password reset request
        /\/auth\/magic-link$/i,       // Magic link request
        /\/auth\/verify-reset-code$/i, // Reset code verification
        /\/auth\/reset-password$/i,    // Password reset
        /\/auth\/oauth/i,       // OAuth callbacks
        /\/auth\/zoom/i,        // Zoom OAuth callback
        /\/health$/i,           // Health check endpoint
        /\/metrics$/i,          // Metrics endpoint
    ];

    constructor(
        private reflector: Reflector,
        private csrfService: CsrfService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const method = request.method?.toUpperCase();

        // Safe methods don't need CSRF protection
        if (!this.STATE_CHANGING_METHODS.includes(method)) {
            return true;
        }

        // Check for @SkipCsrf() decorator on handler or class
        const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipCsrf) {
            this.logger.debug('CSRF check skipped via decorator');
            return true;
        }

        // Check if path is exempt
        const path = request.path || request.url;
        if (this.isExemptPath(path)) {
            this.logger.debug(`CSRF check skipped for exempt path: ${path}`);
            return true;
        }

        // Check for API key authentication (machine-to-machine)
        // API key requests don't use browser sessions, so CSRF doesn't apply
        const apiKey = request.headers['x-api-key'];
        if (apiKey) {
            this.logger.debug('CSRF check skipped for API key authenticated request');
            return true;
        }

        // Get user from request (set by JwtAuthGuard)
        const user = request.user;
        if (!user) {
            // No authenticated user - let the auth guard handle this
            // CSRF only applies to authenticated sessions
            this.logger.debug('CSRF check skipped - no authenticated user');
            return true;
        }

        // Get session ID (jti) from user object (set by JWT strategy)
        const sessionId = user.jti;
        if (!sessionId) {
            // Old tokens without jti - accept them but log warning
            // This allows graceful migration
            this.logger.warn(`CSRF check: User ${user.userId} has token without jti`);
            return true;
        }

        // Get CSRF token from header
        const csrfToken = request.headers['x-csrf-token'];

        if (!csrfToken) {
            this.logger.warn(`CSRF token missing for ${method} ${path} by user ${user.userId}`);
            throw new ForbiddenException('CSRF token required');
        }

        // Validate CSRF token
        const isValid = this.csrfService.validateCsrfToken(csrfToken, sessionId);

        if (!isValid) {
            this.logger.warn(`Invalid CSRF token for ${method} ${path} by user ${user.userId}`);
            throw new ForbiddenException('Invalid CSRF token');
        }

        this.logger.debug(`CSRF validation successful for ${method} ${path}`);
        return true;
    }

    /**
     * Check if a path matches any exempt patterns
     */
    private isExemptPath(path: string): boolean {
        if (!path) return false;
        return this.EXEMPT_PATH_PATTERNS.some(pattern => pattern.test(path));
    }
}
