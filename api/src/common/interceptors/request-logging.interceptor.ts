// Request Logging Interceptor - Logs all API requests and their responses
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationLogService, LogLevel, LogCategory } from '../../admin/application-log.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  // Paths to skip logging (health checks, static assets, etc.)
  private readonly skipPaths = [
    '/health',
    '/api/health',
    '/favicon.ico',
    '/robots.txt',
  ];

  // Paths that should always log regardless of status
  private readonly alwaysLogPaths = [
    '/api/auth',
    '/api/admin',
  ];

  // Query parameters that should never be logged (case-insensitive)
  private readonly sensitiveParams = new Set([
    'password',
    'passwd',
    'pwd',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'api-key',
    'secret',
    'key',
    'authorization',
    'auth',
    'credential',
    'credentials',
    'bearer',
    'session',
    'sessionid',
    'session_id',
    'private_key',
    'privatekey',
    'secret_key',
    'secretkey',
    'client_secret',
    'clientsecret',
    'ssn',
    'social_security',
    'credit_card',
    'creditcard',
    'card_number',
    'cvv',
    'cvc',
    'pin',
  ]);

  constructor(private readonly applicationLogService: ApplicationLogService) {}

  /**
   * Sanitize query parameters to remove sensitive data before logging.
   * @param query - The original query parameters object
   * @returns Sanitized query parameters safe for logging
   */
  private sanitizeQueryParams(query: Record<string, any>): Record<string, any> | undefined {
    if (!query || Object.keys(query).length === 0) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(query)) {
      const lowerKey = key.toLowerCase();

      // Check if this key matches any sensitive parameter
      if (this.sensitiveParams.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Check if value looks like a token, key, or contains sensitive patterns
        if (this.looksLikeSensitiveValue(value)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Check if a value looks like it might contain sensitive data.
   * @param value - The value to check
   * @returns True if the value appears to be sensitive
   */
  private looksLikeSensitiveValue(value: string): boolean {
    // JWT token pattern
    if (/^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*$/.test(value)) {
      return true;
    }

    // Long hex strings (potential API keys, tokens)
    if (/^[a-fA-F0-9]{32,}$/.test(value)) {
      return true;
    }

    // Base64 encoded strings that are suspiciously long (potential secrets)
    if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(value)) {
      return true;
    }

    // Stripe-style keys
    if (/^(sk|pk|rk)_(test|live)_[A-Za-z0-9]+$/.test(value)) {
      return true;
    }

    return false;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Skip logging for certain paths
    if (this.skipPaths.some(path => request.path.startsWith(path))) {
      return next.handle();
    }

    // Generate request ID if not present
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const correlationId = (request.headers['x-correlation-id'] as string) || `corr-${uuidv4()}`;
    
    // Attach to request for use in exception filter
    (request as any).requestId = requestId;
    (request as any).correlationId = correlationId;
    (request as any).startTime = Date.now();

    const userId = (request as any).user?.userId;
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const source = `${controllerName}.${handlerName}`;

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - (request as any).startTime;
        const statusCode = response.statusCode;

        // Determine log level based on status and duration
        let level = LogLevel.INFO;
        if (statusCode >= 400) {
          level = statusCode >= 500 ? LogLevel.ERROR : LogLevel.WARN;
        } else if (duration > 5000) {
          level = LogLevel.WARN; // Slow request warning
        }

        // Only log INFO for specific paths or non-200 responses
        const shouldLog = 
          level !== LogLevel.INFO ||
          this.alwaysLogPaths.some(path => request.path.startsWith(path)) ||
          duration > 1000; // Log slow requests

        if (shouldLog) {
          try {
            // SECURITY: Sanitize query parameters before logging
            const sanitizedQueryParams = this.sanitizeQueryParams(request.query as Record<string, any>);

            await this.applicationLogService.log({
              level,
              category: LogCategory.API,
              source,
              message: `${request.method} ${request.path} - ${statusCode} (${duration}ms)`,
              userId,
              requestId,
              correlationId,
              method: request.method,
              path: request.path,
              statusCode,
              duration,
              ipAddress: request.ip || request.socket?.remoteAddress,
              userAgent: request.headers['user-agent'],
              metadata: {
                queryParams: sanitizedQueryParams,
              },
              tags: duration > 3000 ? ['slow-request'] : [],
            });
          } catch (error) {
            this.logger.error('Failed to log request:', error);
          }
        }
      }),
    );
  }
}
