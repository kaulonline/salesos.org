import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ApplicationLogService,
  LogLevel,
  LogCategory,
} from '../admin/application-log.service';
import {
  ReportClientErrorDto,
  ClientErrorQueryDto,
  ClientErrorSeverity,
} from './dto';

// Re-export DTOs for external use
export { ReportClientErrorDto, ClientErrorQueryDto, ClientErrorSeverity };

/**
 * Client source types - identifies where the error originated
 */
export enum ClientSource {
  WEB = 'web',
  MOBILE_IOS = 'mobile_ios',
  MOBILE_ANDROID = 'mobile_android',
  TABLET_IOS = 'tablet_ios',
  TABLET_ANDROID = 'tablet_android',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

/**
 * Platform types
 */
export enum Platform {
  IOS = 'iOS',
  ANDROID = 'Android',
  WEB = 'Web',
  MACOS = 'macOS',
  WINDOWS = 'Windows',
  LINUX = 'Linux',
  UNKNOWN = 'unknown',
}

/**
 * Client error statistics
 */
export interface ClientErrorStats {
  totalErrors: number;
  fatalErrors: number;
  errorsBySource: Record<string, number>;
  errorsByPlatform: Record<string, number>;
  errorsByScreen: Record<string, number>;
  errorsByVersion: Record<string, number>;
  errorTrend: Array<{ date: string; count: number }>;
  topErrors: Array<{
    errorType: string;
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
}

/**
 * Service for handling client-side error reports from mobile and web applications.
 *
 * This service provides:
 * - Persistent storage of client errors in the database
 * - Error categorization by source (mobile/web), platform, screen
 * - Statistics and analytics for error monitoring
 * - Integration with the existing ApplicationLogService
 */
@Injectable()
export class ClientErrorService {
  private readonly logger = new Logger(ClientErrorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationLogService: ApplicationLogService,
  ) {}

  /**
   * Report a client error - persists to database and logs
   */
  async reportError(dto: ReportClientErrorDto, ipAddress?: string): Promise<{ id: string; received: boolean }> {
    const errorId = dto.id || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Determine client source from platform info
      const clientSource = this.determineClientSource(dto.deviceInfo?.platform);

      // Determine log category based on source
      const category = clientSource.includes('mobile') || clientSource.includes('tablet')
        ? LogCategory.CLIENT_MOBILE
        : clientSource === 'web'
          ? LogCategory.CLIENT_WEB
          : LogCategory.CLIENT;

      // Map severity to log level
      const level = this.mapSeverityToLogLevel(dto.severity);

      // Build tags for filtering
      const tags: string[] = [];
      if (dto.isFatal) tags.push('fatal');
      if (dto.severity) tags.push(`severity:${dto.severity}`);
      if (dto.context?.screenName) tags.push(`screen:${dto.context.screenName}`);
      if (dto.deviceInfo?.platform) tags.push(`platform:${dto.deviceInfo.platform}`);

      // Log through ApplicationLogService (handles buffered batch inserts)
      await this.applicationLogService.log({
        level,
        category,
        source: dto.context?.screenName || 'ClientApp',
        message: dto.message || dto.errorMessage,
        code: dto.errorType,
        userId: dto.userContext?.userId,
        ipAddress,
        errorType: dto.errorType,
        stackTrace: dto.stackTrace,
        metadata: {
          clientErrorId: errorId,
          context: dto.context,
          userContext: dto.userContext,
          breadcrumbs: dto.breadcrumbs?.slice(-10), // Keep last 10 breadcrumbs
          reportedAt: dto.timestamp,
        },
        tags,
        // Client-specific fields
        clientSource,
        screenName: dto.context?.screenName,
        platform: dto.deviceInfo?.platform,
        osVersion: dto.deviceInfo?.osVersion,
        appVersion: dto.deviceInfo?.appVersion,
        buildNumber: dto.deviceInfo?.buildNumber,
        deviceModel: dto.deviceInfo?.deviceModel,
        deviceId: dto.deviceInfo?.deviceId,
        isFatal: dto.isFatal || dto.severity === 'fatal',
      });

      // Log to console for immediate visibility
      this.logToConsole(dto, clientSource);

      return { id: errorId, received: true };
    } catch (error) {
      this.logger.error(`Failed to report client error: ${error.message}`, error.stack);
      // Still return success to client - we don't want client errors to fail silently
      return { id: errorId, received: true };
    }
  }

  /**
   * Get client errors with filtering
   */
  async getClientErrors(query: ClientErrorQueryDto) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 50, 100);

    const where: any = {
      category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
    };

    if (query.clientSource) {
      where.clientSource = query.clientSource;
    }

    if (query.platform) {
      where.platform = query.platform;
    }

    if (query.screenName) {
      where.screenName = { contains: query.screenName, mode: 'insensitive' };
    }

    if (query.appVersion) {
      where.appVersion = query.appVersion;
    }

    if (query.severity) {
      // Map severity to level for filtering
      const level = this.mapSeverityToLogLevel(query.severity);
      where.level = level;
    }

    if (query.isFatal !== undefined) {
      where.isFatal = query.isFatal;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.deviceId) {
      where.deviceId = query.deviceId;
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
        { errorType: { contains: query.search, mode: 'insensitive' } },
        { screenName: { contains: query.search, mode: 'insensitive' } },
        { stackTrace: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [errors, total] = await Promise.all([
      this.prisma.applicationLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          level: true,
          category: true,
          source: true,
          message: true,
          code: true,
          userId: true,
          errorType: true,
          stackTrace: true,
          metadata: true,
          tags: true,
          clientSource: true,
          screenName: true,
          platform: true,
          osVersion: true,
          appVersion: true,
          buildNumber: true,
          deviceModel: true,
          deviceId: true,
          isFatal: true,
          createdAt: true,
        },
      }),
      this.prisma.applicationLog.count({ where }),
    ]);

    return {
      items: errors,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single client error by ID
   */
  async getClientErrorById(id: string) {
    return this.prisma.applicationLog.findFirst({
      where: {
        id,
        category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
      },
    });
  }

  /**
   * Get client error statistics
   */
  async getClientErrorStats(days: number = 7): Promise<ClientErrorStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const baseWhere = {
      category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
      createdAt: { gte: startDate },
    };

    const [
      totalErrors,
      fatalErrors,
      errorsBySource,
      errorsByPlatform,
      errorsByScreen,
      errorsByVersion,
      dailyTrend,
      topErrorTypes,
    ] = await Promise.all([
      // Total errors
      this.prisma.applicationLog.count({ where: baseWhere }),

      // Fatal errors
      this.prisma.applicationLog.count({
        where: { ...baseWhere, isFatal: true },
      }),

      // Errors by source
      this.prisma.applicationLog.groupBy({
        by: ['clientSource'],
        where: baseWhere,
        _count: true,
      }),

      // Errors by platform
      this.prisma.applicationLog.groupBy({
        by: ['platform'],
        where: baseWhere,
        _count: true,
      }),

      // Errors by screen
      this.prisma.applicationLog.groupBy({
        by: ['screenName'],
        where: { ...baseWhere, screenName: { not: null } },
        _count: true,
        orderBy: { _count: { screenName: 'desc' } },
        take: 10,
      }),

      // Errors by app version
      this.prisma.applicationLog.groupBy({
        by: ['appVersion'],
        where: { ...baseWhere, appVersion: { not: null } },
        _count: true,
        orderBy: { _count: { appVersion: 'desc' } },
        take: 10,
      }),

      // Daily trend
      this.prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          COUNT(*)::int as count
        FROM application_logs
        WHERE category IN ('CLIENT', 'CLIENT_MOBILE', 'CLIENT_WEB')
          AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // Top error types
      this.prisma.$queryRaw`
        SELECT
          "errorType" as "errorType",
          message,
          COUNT(*)::int as count,
          MAX("createdAt") as "lastOccurred"
        FROM application_logs
        WHERE category IN ('CLIENT', 'CLIENT_MOBILE', 'CLIENT_WEB')
          AND "createdAt" >= ${startDate}
          AND "errorType" IS NOT NULL
        GROUP BY "errorType", message
        ORDER BY count DESC
        LIMIT 10
      `,
    ]);

    return {
      totalErrors,
      fatalErrors,
      errorsBySource: this.arrayToRecord(errorsBySource, 'clientSource'),
      errorsByPlatform: this.arrayToRecord(errorsByPlatform, 'platform'),
      errorsByScreen: this.arrayToRecord(errorsByScreen, 'screenName'),
      errorsByVersion: this.arrayToRecord(errorsByVersion, 'appVersion'),
      errorTrend: (dailyTrend as any[]).map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
        count: Number(row.count),
      })),
      topErrors: (topErrorTypes as any[]).map(row => ({
        errorType: row.errorType || 'Unknown',
        message: row.message || '',
        count: Number(row.count),
        lastOccurred: row.lastOccurred,
      })),
    };
  }

  /**
   * Get available filter options for client errors
   */
  async getFilterOptions() {
    const [sources, platforms, screens, versions] = await Promise.all([
      this.prisma.applicationLog.findMany({
        where: {
          category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
          clientSource: { not: null },
        },
        select: { clientSource: true },
        distinct: ['clientSource'],
      }),
      this.prisma.applicationLog.findMany({
        where: {
          category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
          platform: { not: null },
        },
        select: { platform: true },
        distinct: ['platform'],
      }),
      this.prisma.applicationLog.findMany({
        where: {
          category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
          screenName: { not: null },
        },
        select: { screenName: true },
        distinct: ['screenName'],
        take: 50,
      }),
      this.prisma.applicationLog.findMany({
        where: {
          category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
          appVersion: { not: null },
        },
        select: { appVersion: true },
        distinct: ['appVersion'],
        orderBy: { appVersion: 'desc' },
        take: 20,
      }),
    ]);

    return {
      sources: sources.map(s => s.clientSource).filter(Boolean),
      platforms: platforms.map(p => p.platform).filter(Boolean),
      screens: screens.map(s => s.screenName).filter(Boolean),
      versions: versions.map(v => v.appVersion).filter(Boolean),
      severities: Object.values(ClientErrorSeverity),
    };
  }

  /**
   * Get errors grouped by device for device-specific debugging
   */
  async getErrorsByDevice(deviceId: string, limit: number = 50) {
    return this.prisma.applicationLog.findMany({
      where: {
        category: { in: [LogCategory.CLIENT, LogCategory.CLIENT_MOBILE, LogCategory.CLIENT_WEB] },
        deviceId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Determine client source from platform string
   */
  private determineClientSource(platform?: string): string {
    if (!platform) return ClientSource.UNKNOWN;

    const p = platform.toLowerCase();

    if (p.includes('ios')) {
      // Check if it's a tablet or phone based on device model or user agent hints
      // For now, we'll use a simple heuristic - this can be improved
      return p.includes('ipad') ? ClientSource.TABLET_IOS : ClientSource.MOBILE_IOS;
    }

    if (p.includes('android')) {
      return p.includes('tablet') ? ClientSource.TABLET_ANDROID : ClientSource.MOBILE_ANDROID;
    }

    if (p === 'web' || p.includes('browser')) {
      return ClientSource.WEB;
    }

    if (p.includes('macos') || p.includes('windows') || p.includes('linux')) {
      return ClientSource.DESKTOP;
    }

    return ClientSource.UNKNOWN;
  }

  /**
   * Map client severity to log level
   */
  private mapSeverityToLogLevel(severity?: string): LogLevel {
    switch (severity?.toLowerCase()) {
      case 'fatal':
        return LogLevel.ERROR;
      case 'high':
        return LogLevel.ERROR;
      case 'medium':
        return LogLevel.WARN;
      case 'low':
        return LogLevel.INFO;
      default:
        return LogLevel.WARN;
    }
  }

  /**
   * Log to console for immediate visibility
   */
  private logToConsole(dto: ReportClientErrorDto, clientSource: string): void {
    const isWarning = dto.type === 'warning';
    const isFatal = dto.isFatal || dto.severity === 'fatal';
    const prefix = isFatal ? '[FATAL CLIENT ERROR]' : isWarning ? '[CLIENT WARNING]' : '[CLIENT ERROR]';

    const contextParts: string[] = [];
    if (dto.context?.screenName) contextParts.push(`screen=${dto.context.screenName}`);
    if (dto.deviceInfo?.platform) contextParts.push(`platform=${dto.deviceInfo.platform}`);
    if (dto.deviceInfo?.appVersion) contextParts.push(`version=${dto.deviceInfo.appVersion}`);
    contextParts.push(`source=${clientSource}`);

    const contextStr = contextParts.length > 0 ? ` (${contextParts.join(', ')})` : '';
    const message = dto.message || dto.errorMessage;
    const logMessage = `${prefix}${contextStr}: ${message}`;

    if (isFatal) {
      this.logger.error(logMessage);
      if (dto.stackTrace) {
        this.logger.error(`Stack trace: ${dto.stackTrace}`);
      }
    } else if (isWarning) {
      this.logger.warn(logMessage);
    } else {
      this.logger.warn(logMessage);
    }
  }

  /**
   * Convert Prisma groupBy result to Record
   */
  private arrayToRecord(arr: any[], key: string): Record<string, number> {
    return arr.reduce((acc, item) => {
      const k = item[key] || 'unknown';
      acc[k] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }
}
