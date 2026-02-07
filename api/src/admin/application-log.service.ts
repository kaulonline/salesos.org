// Application Log Service - Centralized logging for all application events, errors, and transactions
import { Injectable, Logger, Scope } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// Log levels in order of severity
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// Categories for organizing logs
export enum LogCategory {
  API = 'API',
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  INTEGRATION = 'INTEGRATION',
  AI = 'AI',
  MEETING = 'MEETING',
  EMAIL = 'EMAIL',
  SYSTEM = 'SYSTEM',
  TRANSACTION = 'TRANSACTION',
  CRM = 'CRM',
  SEARCH = 'SEARCH',
  FILE = 'FILE',
  WEBHOOK = 'WEBHOOK',
  CLIENT = 'CLIENT',           // Client-side errors from mobile/web apps
  CLIENT_MOBILE = 'CLIENT_MOBILE',   // Mobile app specific errors
  CLIENT_WEB = 'CLIENT_WEB',         // Web app specific errors
}

// Transaction status values
export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  PARTIAL = 'PARTIAL',
}

// Interface for log entry
export interface LogEntry {
  level: LogLevel;
  category: LogCategory | string;
  source: string;
  message: string;
  code?: string;
  
  // Context
  userId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  
  // HTTP request details
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  ipAddress?: string;
  userAgent?: string;
  
  // Error details
  errorType?: string;
  stackTrace?: string;
  error?: Error;
  
  // Transaction details
  transactionType?: string;
  transactionId?: string;
  transactionStatus?: TransactionStatus | string;
  
  // Entity details
  entityType?: string;
  entityId?: string;
  
  // Additional data
  metadata?: Record<string, any>;
  tags?: string[];

  // Client/Mobile specific fields
  clientSource?: string;    // web, mobile_ios, mobile_android, tablet_ios, tablet_android
  screenName?: string;      // Screen/page where error occurred
  platform?: string;        // iOS, Android, Web
  osVersion?: string;       // OS version
  appVersion?: string;      // App version
  buildNumber?: string;     // Build number
  deviceModel?: string;     // Device model
  deviceId?: string;        // Device identifier
  isFatal?: boolean;        // Whether this was a fatal/crash error
}

// Query interface for fetching logs
export interface LogQueryDto {
  level?: string;
  category?: string;
  source?: string;
  userId?: string;
  requestId?: string;
  correlationId?: string;
  transactionType?: string;
  transactionStatus?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// Stats interface
export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  categoryBreakdown: Record<string, number>;
  recentErrors: any[];
  transactionStats: {
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
}

@Injectable()
export class ApplicationLogService {
  private readonly logger = new Logger(ApplicationLogService.name);
  private readonly environment: string;
  private readonly serverInstance: string;
  
  // Buffer for batch inserts
  private logBuffer: LogEntry[] = [];
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.environment = this.configService.get('NODE_ENV') || 'development';
    this.serverInstance = process.env.HOSTNAME || process.env.SERVER_ID || 'local';
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch(err => {
        this.logger.error('Failed to flush log buffer:', err);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  // Generate a unique request ID
  generateRequestId(): string {
    return uuidv4();
  }

  // Generate a correlation ID for tracing related operations
  generateCorrelationId(): string {
    return `corr-${uuidv4()}`;
  }

  // Log an error
  async error(
    source: string,
    message: string,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category: options.category || LogCategory.SYSTEM,
      source,
      message,
      ...options,
    });
  }

  // Log a warning
  async warn(
    source: string,
    message: string,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: LogLevel.WARN,
      category: options.category || LogCategory.SYSTEM,
      source,
      message,
      ...options,
    });
  }

  // Log info
  async info(
    source: string,
    message: string,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: LogLevel.INFO,
      category: options.category || LogCategory.SYSTEM,
      source,
      message,
      ...options,
    });
  }

  // Log debug
  async debug(
    source: string,
    message: string,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: LogLevel.DEBUG,
      category: options.category || LogCategory.SYSTEM,
      source,
      message,
      ...options,
    });
  }

  // Log a transaction
  async logTransaction(
    source: string,
    transactionType: string,
    status: TransactionStatus | string,
    message: string,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: status === TransactionStatus.FAILED ? LogLevel.ERROR : LogLevel.INFO,
      category: LogCategory.TRANSACTION,
      source,
      message,
      transactionType,
      transactionStatus: status,
      ...options,
    });
  }

  // Log an API request
  async logApiRequest(
    source: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    const level = statusCode >= 500 ? LogLevel.ERROR :
                  statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    await this.log({
      level,
      category: LogCategory.API,
      source,
      message: `${method} ${path} - ${statusCode} (${duration}ms)`,
      method,
      path,
      statusCode,
      duration,
      ...options,
    });
  }

  // Log an error from an exception
  async logException(
    source: string,
    error: Error,
    options: Partial<LogEntry> = {}
  ): Promise<void> {
    await this.log({
      level: LogLevel.ERROR,
      category: options.category || LogCategory.SYSTEM,
      source,
      message: error.message,
      errorType: error.name,
      stackTrace: error.stack,
      ...options,
    });
  }

  // Core logging function
  async log(entry: LogEntry): Promise<void> {
    // Extract error details if an error object is provided
    if (entry.error) {
      entry.errorType = entry.error.name;
      entry.message = entry.message || entry.error.message;
      entry.stackTrace = entry.error.stack;
      delete entry.error; // Don't store the error object directly
    }

    // Add to buffer
    this.logBuffer.push(entry);

    // Also log to console for immediate visibility
    const consoleMessage = `[${entry.level}] [${entry.category}] ${entry.source}: ${entry.message}`;
    switch (entry.level) {
      case LogLevel.ERROR:
        this.logger.error(consoleMessage);
        break;
      case LogLevel.WARN:
        this.logger.warn(consoleMessage);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(consoleMessage);
        break;
      default:
        this.logger.log(consoleMessage);
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    }
  }

  // Flush the log buffer to the database
  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.prisma.applicationLog.createMany({
        data: entries.map(entry => ({
          level: entry.level,
          category: entry.category,
          source: entry.source,
          message: entry.message,
          code: entry.code,
          userId: entry.userId,
          sessionId: entry.sessionId,
          requestId: entry.requestId,
          correlationId: entry.correlationId,
          method: entry.method,
          path: entry.path,
          statusCode: entry.statusCode,
          duration: entry.duration,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          errorType: entry.errorType,
          stackTrace: entry.stackTrace,
          transactionType: entry.transactionType,
          transactionId: entry.transactionId,
          transactionStatus: entry.transactionStatus,
          entityType: entry.entityType,
          entityId: entry.entityId,
          metadata: entry.metadata || undefined,
          tags: entry.tags || [],
          environment: this.environment,
          serverInstance: this.serverInstance,
          // Client/Mobile specific fields
          clientSource: entry.clientSource,
          screenName: entry.screenName,
          platform: entry.platform,
          osVersion: entry.osVersion,
          appVersion: entry.appVersion,
          buildNumber: entry.buildNumber,
          deviceModel: entry.deviceModel,
          deviceId: entry.deviceId,
          isFatal: entry.isFatal ?? false,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to flush log buffer: ${error.message}`);
      // Put entries back in buffer for retry (limit to prevent memory issues)
      if (this.logBuffer.length < this.BUFFER_SIZE * 2) {
        this.logBuffer.unshift(...entries);
      }
    }
  }

  // Query logs with filters
  async getLogs(query: LogQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 50;

    const where: any = {};

    if (query.level) {
      where.level = query.level;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.source) {
      where.source = { contains: query.source, mode: 'insensitive' };
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.requestId) {
      where.requestId = query.requestId;
    }

    if (query.correlationId) {
      where.correlationId = query.correlationId;
    }

    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query.transactionStatus) {
      where.transactionStatus = query.transactionStatus;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      where.OR = [
        { message: { contains: query.search, mode: 'insensitive' } },
        { source: { contains: query.search, mode: 'insensitive' } },
        { errorType: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { path: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.applicationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.applicationLog.count({ where }),
    ]);

    return {
      items: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get a single log by ID
  async getLogById(id: string) {
    return this.prisma.applicationLog.findUnique({
      where: { id },
    });
  }

  // Get logs by correlation ID (for tracing)
  async getLogsByCorrelationId(correlationId: string) {
    return this.prisma.applicationLog.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Get statistics
  async getStats(startDate?: Date, endDate?: Date): Promise<LogStats> {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    const [
      totalLogs,
      errorCount,
      warnCount,
      infoCount,
      categoryBreakdown,
      recentErrors,
      transactionTotal,
      transactionSuccess,
      transactionFailed,
      transactionPending,
    ] = await Promise.all([
      this.prisma.applicationLog.count({ where: dateFilter }),
      this.prisma.applicationLog.count({ where: { ...dateFilter, level: 'ERROR' } }),
      this.prisma.applicationLog.count({ where: { ...dateFilter, level: 'WARN' } }),
      this.prisma.applicationLog.count({ where: { ...dateFilter, level: 'INFO' } }),
      this.prisma.applicationLog.groupBy({
        by: ['category'],
        where: dateFilter,
        _count: true,
      }),
      this.prisma.applicationLog.findMany({
        where: { ...dateFilter, level: 'ERROR' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.applicationLog.count({ 
        where: { ...dateFilter, transactionType: { not: null } } 
      }),
      this.prisma.applicationLog.count({ 
        where: { ...dateFilter, transactionStatus: 'SUCCESS' } 
      }),
      this.prisma.applicationLog.count({ 
        where: { ...dateFilter, transactionStatus: 'FAILED' } 
      }),
      this.prisma.applicationLog.count({ 
        where: { ...dateFilter, transactionStatus: 'PENDING' } 
      }),
    ]);

    return {
      totalLogs,
      errorCount,
      warnCount,
      infoCount,
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentErrors,
      transactionStats: {
        total: transactionTotal,
        success: transactionSuccess,
        failed: transactionFailed,
        pending: transactionPending,
      },
    };
  }

  // Get distinct values for filters
  async getFilterOptions() {
    const [levels, categories, sources, transactionTypes, entityTypes] = await Promise.all([
      this.prisma.applicationLog.findMany({
        select: { level: true },
        distinct: ['level'],
      }),
      this.prisma.applicationLog.findMany({
        select: { category: true },
        distinct: ['category'],
      }),
      this.prisma.applicationLog.findMany({
        select: { source: true },
        distinct: ['source'],
        take: 100,
      }),
      this.prisma.applicationLog.findMany({
        where: { transactionType: { not: null } },
        select: { transactionType: true },
        distinct: ['transactionType'],
      }),
      this.prisma.applicationLog.findMany({
        where: { entityType: { not: null } },
        select: { entityType: true },
        distinct: ['entityType'],
      }),
    ]);

    return {
      levels: levels.map(l => l.level),
      categories: categories.map(c => c.category),
      sources: sources.map(s => s.source),
      transactionTypes: transactionTypes.map(t => t.transactionType).filter(Boolean),
      entityTypes: entityTypes.map(e => e.entityType).filter(Boolean),
    };
  }

  // Delete old logs (for maintenance)
  async deleteOldLogs(daysOld: number = 90, includeAll: boolean = false): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const whereClause: any = {
      createdAt: { lt: cutoffDate },
    };

    // By default, only delete DEBUG, TRACE, INFO logs (keep errors/warnings longer)
    // If includeAll is true, delete ALL log levels
    if (!includeAll) {
      whereClause.level = { in: ['DEBUG', 'TRACE', 'INFO'] };
    }

    const result = await this.prisma.applicationLog.deleteMany({
      where: whereClause,
    });

    this.logger.log(`Deleted ${result.count} old log entries (includeAll: ${includeAll})`);
    return result.count;
  }

  // Clean up on module destroy
  async onModuleDestroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushBuffer();
  }
}
