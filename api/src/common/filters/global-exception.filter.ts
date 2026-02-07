// Global Exception Filter - Catches all exceptions and logs them to ApplicationLog
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationLogService, LogLevel, LogCategory } from '../../admin/application-log.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly applicationLogService: ApplicationLogService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    let message = 'Internal server error';
    let errorType = 'UnknownError';
    let stackTrace: string | undefined;
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        errorDetails = exceptionResponse;
        message = (exceptionResponse as any).message || exception.message;
      }
      errorType = exception.name;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorType = exception.name;
      stackTrace = exception.stack;
    }

    // Get request details
    const requestId = (request as any).requestId || request.headers['x-request-id'] as string;
    const correlationId = (request as any).correlationId || request.headers['x-correlation-id'] as string;
    const userId = (request as any).user?.userId;
    const startTime = (request as any).startTime;
    const duration = startTime ? Date.now() - startTime : undefined;

    // Determine log level based on status
    let level = LogLevel.ERROR;
    if (status >= 400 && status < 500) {
      level = LogLevel.WARN;
    }

    // Log to application log service
    try {
      await this.applicationLogService.log({
        level,
        category: LogCategory.API,
        source: 'GlobalExceptionFilter',
        message: `${request.method} ${request.path} - ${status}: ${message}`,
        code: `HTTP_${status}`,
        userId,
        requestId,
        correlationId,
        method: request.method,
        path: request.path,
        statusCode: status,
        duration,
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers['user-agent'],
        errorType,
        stackTrace: status >= 500 ? stackTrace : undefined,
        metadata: {
          query: request.query,
          params: request.params,
          errorDetails: status >= 500 ? errorDetails : undefined,
        },
        tags: [
          status >= 500 ? 'server-error' : 'client-error',
          `status-${status}`,
        ],
      });
    } catch (logError) {
      this.logger.error('Failed to log exception:', logError);
    }

    // Also log to console for immediate visibility
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.path} - ${status}: ${message}`,
        stackTrace,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.path} - ${status}: ${message}`);
    }

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId,
      ...(status >= 500 && process.env.NODE_ENV !== 'production' ? { stack: stackTrace } : {}),
    });
  }
}
