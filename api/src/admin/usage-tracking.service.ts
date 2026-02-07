import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApiServiceType, Prisma } from '@prisma/client';

export interface UsageLogInput {
  userId: string;
  userName?: string;
  userEmail?: string;
  serviceType: ApiServiceType;
  serviceName: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputCost?: number;
  outputCost?: number;
  totalCost?: number;
  apiCalls?: number;
  latencyMs?: number;
  requestId?: string;
  conversationId?: string;
  sessionId?: string;
  success?: boolean;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface UserUsageSummary {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  totalTokens: number;
  totalCost: number;
  totalApiCalls: number;
  llmTokens: number;
  llmCost: number;
  llmCalls: number;
  salesforceCalls: number;
  salesforceCost: number;
  otherCalls: number;
  otherCost: number;
  avgLatencyMs: number | null;
  successRate: number;
  lastActivityAt: Date | null;
}

export interface UserDetailedUsage {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  summary: {
    totalTokens: number;
    totalCost: number;
    totalApiCalls: number;
    successRate: number;
  };
  byService: {
    serviceType: string;
    serviceName: string;
    totalTokens: number;
    totalCost: number;
    apiCalls: number;
    avgLatencyMs: number | null;
  }[];
  recentActivity: {
    id: string;
    serviceType: string;
    operation: string;
    totalTokens: number;
    totalCost: number;
    latencyMs: number | null;
    success: boolean;
    createdAt: Date;
  }[];
  dailyTrend: {
    date: string;
    tokens: number;
    cost: number;
    calls: number;
  }[];
}

export interface UsageFilters {
  startDate?: Date;
  endDate?: Date;
  serviceType?: ApiServiceType;
  userId?: string;
}

export interface UsageDashboardStats {
  totalCost: number;
  totalTokens: number;
  totalApiCalls: number;
  activeUsers: number;
  llmStats: {
    tokens: number;
    cost: number;
    calls: number;
  };
  salesforceStats: {
    calls: number;
    cost: number;
  };
  costByService: {
    service: string;
    cost: number;
    percentage: number;
  }[];
  topUsers: {
    userId: string;
    userName: string | null;
    totalCost: number;
    totalTokens: number;
  }[];
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  // Cost per 1K tokens (in cents) - configurable
  private readonly LLM_COSTS = {
    'claude-3-opus': { input: 1.5, output: 7.5 },
    'claude-3-sonnet': { input: 0.3, output: 1.5 },
    'claude-3-haiku': { input: 0.025, output: 0.125 },
    'gpt-4': { input: 3.0, output: 6.0 },
    'gpt-4-turbo': { input: 1.0, output: 3.0 },
    'gpt-3.5-turbo': { input: 0.05, output: 0.15 },
    default: { input: 0.5, output: 1.5 },
  };

  private readonly SALESFORCE_COST_PER_CALL = 0.01; // cents per API call

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a single API usage event
   */
  async logUsage(input: UsageLogInput): Promise<void> {
    try {
      // Calculate costs if not provided
      const costs = this.calculateCosts(
        input.serviceType,
        input.serviceName,
        input.inputTokens || 0,
        input.outputTokens || 0,
        input.apiCalls || 1,
      );

      await this.prisma.apiUsageLog.create({
        data: {
          userId: input.userId,
          userName: input.userName,
          userEmail: input.userEmail,
          serviceType: input.serviceType,
          serviceName: input.serviceName,
          operation: input.operation,
          inputTokens: input.inputTokens || 0,
          outputTokens: input.outputTokens || 0,
          totalTokens: input.totalTokens || (input.inputTokens || 0) + (input.outputTokens || 0),
          inputCost: input.inputCost ?? costs.inputCost,
          outputCost: input.outputCost ?? costs.outputCost,
          totalCost: input.totalCost ?? costs.totalCost,
          apiCalls: input.apiCalls || 1,
          latencyMs: input.latencyMs,
          requestId: input.requestId,
          conversationId: input.conversationId,
          sessionId: input.sessionId,
          success: input.success ?? true,
          errorMessage: input.errorMessage,
          errorCode: input.errorCode,
          metadata: input.metadata,
        },
      });

      // Update daily summary asynchronously
      this.updateDailySummary(input).catch((err) =>
        this.logger.error(`Failed to update daily summary: ${err.message}`),
      );
    } catch (error) {
      this.logger.error(`Failed to log usage: ${error.message}`, error.stack);
    }
  }

  /**
   * Calculate costs based on service type and tokens
   */
  private calculateCosts(
    serviceType: ApiServiceType,
    serviceName: string,
    inputTokens: number,
    outputTokens: number,
    apiCalls: number,
  ): { inputCost: number; outputCost: number; totalCost: number } {
    if (serviceType === 'SALESFORCE') {
      const totalCost = apiCalls * this.SALESFORCE_COST_PER_CALL;
      return { inputCost: 0, outputCost: 0, totalCost };
    }

    if (serviceType.startsWith('LLM_')) {
      const costs = this.LLM_COSTS[serviceName] || this.LLM_COSTS.default;
      const inputCost = (inputTokens / 1000) * costs.input;
      const outputCost = (outputTokens / 1000) * costs.output;
      return { inputCost, outputCost, totalCost: inputCost + outputCost };
    }

    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  /**
   * Update daily summary for faster dashboard queries
   */
  private async updateDailySummary(input: UsageLogInput): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const costs = this.calculateCosts(
      input.serviceType,
      input.serviceName,
      input.inputTokens || 0,
      input.outputTokens || 0,
      input.apiCalls || 1,
    );

    await this.prisma.apiUsageSummary.upsert({
      where: {
        userId_serviceType_date: {
          userId: input.userId,
          serviceType: input.serviceType,
          date: today,
        },
      },
      update: {
        totalInputTokens: { increment: input.inputTokens || 0 },
        totalOutputTokens: { increment: input.outputTokens || 0 },
        totalTokens: { increment: (input.inputTokens || 0) + (input.outputTokens || 0) },
        totalCost: { increment: costs.totalCost },
        totalApiCalls: { increment: input.apiCalls || 1 },
        successCount: { increment: input.success !== false ? 1 : 0 },
        failureCount: { increment: input.success === false ? 1 : 0 },
        userName: input.userName,
        userEmail: input.userEmail,
      },
      create: {
        userId: input.userId,
        userName: input.userName,
        userEmail: input.userEmail,
        serviceType: input.serviceType,
        date: today,
        totalInputTokens: input.inputTokens || 0,
        totalOutputTokens: input.outputTokens || 0,
        totalTokens: (input.inputTokens || 0) + (input.outputTokens || 0),
        totalCost: costs.totalCost,
        totalApiCalls: input.apiCalls || 1,
        successCount: input.success !== false ? 1 : 0,
        failureCount: input.success === false ? 1 : 0,
      },
    });
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(filters: UsageFilters = {}): Promise<UsageDashboardStats> {
    const { startDate, endDate } = this.getDateRange(filters);

    const whereClause: Prisma.ApiUsageSummaryWhereInput = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.serviceType && { serviceType: filters.serviceType }),
      ...(filters.userId && { userId: filters.userId }),
    };

    // Get aggregated stats
    const aggregates = await this.prisma.apiUsageSummary.aggregate({
      where: whereClause,
      _sum: {
        totalTokens: true,
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get unique active users
    const activeUsers = await this.prisma.apiUsageSummary.groupBy({
      by: ['userId'],
      where: whereClause,
    });

    // Get LLM stats
    const llmStats = await this.prisma.apiUsageSummary.aggregate({
      where: {
        ...whereClause,
        serviceType: { in: ['LLM_CLAUDE', 'LLM_OPENAI', 'LLM_AZURE'] },
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get Salesforce stats
    const salesforceStats = await this.prisma.apiUsageSummary.aggregate({
      where: {
        ...whereClause,
        serviceType: 'SALESFORCE',
      },
      _sum: {
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get cost by service
    const costByService = await this.prisma.apiUsageSummary.groupBy({
      by: ['serviceType'],
      where: whereClause,
      _sum: {
        totalCost: true,
      },
    });

    const totalCost = aggregates._sum.totalCost || 0;
    const costByServiceFormatted = costByService.map((s) => ({
      service: s.serviceType,
      cost: s._sum.totalCost || 0,
      percentage: totalCost > 0 ? ((s._sum.totalCost || 0) / totalCost) * 100 : 0,
    }));

    // Get top users by cost
    const topUsers = await this.prisma.apiUsageSummary.groupBy({
      by: ['userId', 'userName'],
      where: whereClause,
      _sum: {
        totalCost: true,
        totalTokens: true,
      },
      orderBy: {
        _sum: {
          totalCost: 'desc',
        },
      },
      take: 10,
    });

    return {
      totalCost: aggregates._sum.totalCost || 0,
      totalTokens: aggregates._sum.totalTokens || 0,
      totalApiCalls: aggregates._sum.totalApiCalls || 0,
      activeUsers: activeUsers.length,
      llmStats: {
        tokens: llmStats._sum.totalTokens || 0,
        cost: llmStats._sum.totalCost || 0,
        calls: llmStats._sum.totalApiCalls || 0,
      },
      salesforceStats: {
        calls: salesforceStats._sum.totalApiCalls || 0,
        cost: salesforceStats._sum.totalCost || 0,
      },
      costByService: costByServiceFormatted,
      topUsers: topUsers.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        totalCost: u._sum.totalCost || 0,
        totalTokens: u._sum.totalTokens || 0,
      })),
    };
  }

  /**
   * Get all users' usage summary
   */
  async getAllUsersUsage(filters: UsageFilters = {}): Promise<UserUsageSummary[]> {
    const { startDate, endDate } = this.getDateRange(filters);

    const whereClause: Prisma.ApiUsageSummaryWhereInput = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(filters.serviceType && { serviceType: filters.serviceType }),
    };

    // Get all summaries grouped by user
    const userSummaries = await this.prisma.apiUsageSummary.groupBy({
      by: ['userId', 'userName', 'userEmail'],
      where: whereClause,
      _sum: {
        totalTokens: true,
        totalCost: true,
        totalApiCalls: true,
        successCount: true,
        failureCount: true,
      },
      _avg: {
        avgLatencyMs: true,
      },
    });

    // Get LLM-specific stats per user
    const llmStats = await this.prisma.apiUsageSummary.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        serviceType: { in: ['LLM_CLAUDE', 'LLM_OPENAI', 'LLM_AZURE'] },
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get Salesforce stats per user
    const sfStats = await this.prisma.apiUsageSummary.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        serviceType: 'SALESFORCE',
      },
      _sum: {
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get last activity per user
    const lastActivity = await this.prisma.apiUsageLog.groupBy({
      by: ['userId'],
      _max: {
        createdAt: true,
      },
    });

    const llmMap = new Map(llmStats.map((s) => [s.userId, s]));
    const sfMap = new Map(sfStats.map((s) => [s.userId, s]));
    const activityMap = new Map(lastActivity.map((a) => [a.userId, a._max.createdAt]));

    return userSummaries.map((u) => {
      const llm = llmMap.get(u.userId);
      const sf = sfMap.get(u.userId);
      const totalCalls = u._sum.totalApiCalls || 0;
      const successCount = u._sum.successCount || 0;
      const failureCount = u._sum.failureCount || 0;

      return {
        userId: u.userId,
        userName: u.userName,
        userEmail: u.userEmail,
        totalTokens: u._sum.totalTokens || 0,
        totalCost: u._sum.totalCost || 0,
        totalApiCalls: totalCalls,
        llmTokens: llm?._sum.totalTokens || 0,
        llmCost: llm?._sum.totalCost || 0,
        llmCalls: llm?._sum.totalApiCalls || 0,
        salesforceCalls: sf?._sum.totalApiCalls || 0,
        salesforceCost: sf?._sum.totalCost || 0,
        otherCalls: totalCalls - (llm?._sum.totalApiCalls || 0) - (sf?._sum.totalApiCalls || 0),
        otherCost:
          (u._sum.totalCost || 0) - (llm?._sum.totalCost || 0) - (sf?._sum.totalCost || 0),
        avgLatencyMs: u._avg.avgLatencyMs,
        successRate:
          successCount + failureCount > 0
            ? (successCount / (successCount + failureCount)) * 100
            : 100,
        lastActivityAt: activityMap.get(u.userId) || null,
      };
    });
  }

  /**
   * Get detailed usage for a specific user
   */
  async getUserDetailedUsage(userId: string, filters: UsageFilters = {}): Promise<UserDetailedUsage> {
    const { startDate, endDate } = this.getDateRange(filters);

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const whereClause: Prisma.ApiUsageLogWhereInput = {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Get summary
    const summary = await this.prisma.apiUsageLog.aggregate({
      where: whereClause,
      _sum: {
        totalTokens: true,
        totalCost: true,
        apiCalls: true,
      },
      _count: {
        id: true,
      },
    });

    const successCount = await this.prisma.apiUsageLog.count({
      where: { ...whereClause, success: true },
    });

    // Get breakdown by service
    const byService = await this.prisma.apiUsageLog.groupBy({
      by: ['serviceType', 'serviceName'],
      where: whereClause,
      _sum: {
        totalTokens: true,
        totalCost: true,
        apiCalls: true,
      },
      _avg: {
        latencyMs: true,
      },
    });

    // Get recent activity
    const recentActivity = await this.prisma.apiUsageLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        serviceType: true,
        operation: true,
        totalTokens: true,
        totalCost: true,
        latencyMs: true,
        success: true,
        createdAt: true,
      },
    });

    // Get daily trend
    const dailyTrend = await this.prisma.apiUsageSummary.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate daily trend by date
    const trendMap = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const day of dailyTrend) {
      const dateStr = day.date.toISOString().split('T')[0];
      const existing = trendMap.get(dateStr) || { tokens: 0, cost: 0, calls: 0 };
      trendMap.set(dateStr, {
        tokens: existing.tokens + day.totalTokens,
        cost: existing.cost + day.totalCost,
        calls: existing.calls + day.totalApiCalls,
      });
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      summary: {
        totalTokens: summary._sum.totalTokens || 0,
        totalCost: summary._sum.totalCost || 0,
        totalApiCalls: summary._sum.apiCalls || 0,
        successRate:
          summary._count.id > 0 ? (successCount / summary._count.id) * 100 : 100,
      },
      byService: byService.map((s) => ({
        serviceType: s.serviceType,
        serviceName: s.serviceName,
        totalTokens: s._sum.totalTokens || 0,
        totalCost: s._sum.totalCost || 0,
        apiCalls: s._sum.apiCalls || 0,
        avgLatencyMs: s._avg.latencyMs,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        serviceType: a.serviceType,
        operation: a.operation,
        totalTokens: a.totalTokens,
        totalCost: a.totalCost,
        latencyMs: a.latencyMs,
        success: a.success,
        createdAt: a.createdAt,
      })),
      dailyTrend: Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      })),
    };
  }

  /**
   * Get date range with defaults
   */
  private getDateRange(filters: UsageFilters): { startDate: Date; endDate: Date } {
    const endDate = filters.endDate || new Date();
    const startDate = filters.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { startDate, endDate };
  }
}











