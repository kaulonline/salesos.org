// Admin Service - Handles all admin configuration and management operations
import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApplicationLogService, LogCategory, TransactionStatus } from './application-log.service';
import { SalesOSEmailService } from '../email/salesos-email.service';
import { AgentType, AgentTrigger, Priority } from '../agents/types';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  BulkUpdateConfigDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  UpdateUserDto,
  InviteUserDto,
  AuditLogQueryDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  UpdateAIConfigDto,
  UpdateMeetingIntelligenceConfigDto,
} from './dto';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  private agentOrchestrator: any = null;
  private _zoominfoService: any = null;
  private _snowflakeService: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly applicationLogService: ApplicationLogService,
    private readonly moduleRef: ModuleRef,
    private readonly salesOSEmailService: SalesOSEmailService,
  ) {}

  /**
   * Lazily get the ZoominfoService
   */
  private getZoominfoService(): any {
    if (!this._zoominfoService) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ZoominfoService } = require('../integrations/zoominfo/zoominfo.service');
        this._zoominfoService = this.moduleRef.get(ZoominfoService, { strict: false });
      } catch (error) {
        this.logger.warn(`ZoominfoService not available: ${error}`);
        return null;
      }
    }
    return this._zoominfoService;
  }

  /**
   * Lazily get the SnowflakeService
   */
  private getSnowflakeService(): any {
    if (!this._snowflakeService) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SnowflakeService } = require('../integrations/snowflake/snowflake.service');
        this._snowflakeService = this.moduleRef.get(SnowflakeService, { strict: false });
      } catch (error) {
        this.logger.warn(`SnowflakeService not available: ${error}`);
        return null;
      }
    }
    return this._snowflakeService;
  }

  /**
   * Lazily get the AgentOrchestratorService to avoid circular dependency
   * Uses runtime require to defer the import
   */
  private getAgentOrchestrator(): any {
    if (!this.agentOrchestrator) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { AgentOrchestratorService } = require('../agents/orchestrator/agent-orchestrator.service');
        this.agentOrchestrator = this.moduleRef.get(AgentOrchestratorService, { strict: false });
      } catch (error) {
        this.logger.warn(`AgentOrchestratorService not available: ${error}`);
        return null;
      }
    }
    return this.agentOrchestrator;
  }

  /**
   * Get AI usage statistics from ApiUsageSummary
   */
  private async getAIStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query ApiUsageSummary for LLM service types
    const llmServiceTypes = ['LLM_CLAUDE', 'LLM_OPENAI', 'LLM_AZURE'];

    const stats = await this.prisma.apiUsageSummary.aggregate({
      where: {
        serviceType: { in: llmServiceTypes as any },
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
        totalApiCalls: true,
      },
    });

    // Get average latency from recent API logs
    const latencyStats = await this.prisma.apiUsageLog.aggregate({
      where: {
        serviceType: { in: llmServiceTypes as any },
        createdAt: { gte: thirtyDaysAgo },
        latencyMs: { not: null },
      },
      _avg: {
        latencyMs: true,
      },
    });

    return {
      totalTokensUsed: stats._sum.totalTokens || 0,
      totalCost: stats._sum.totalCost || 0,
      totalApiCalls: stats._sum.totalApiCalls || 0,
      avgResponseTime: Math.round(latencyStats._avg.latencyMs || 0),
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing admin service - checking default configurations...');
    try {
      await this.initializeDefaultConfigs();
      this.logger.log('Admin service initialization complete');
    } catch (error) {
      this.logger.error('Failed to initialize default configs:', error);
    }
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats() {
    const [
      userStats,
      conversationStats,
      meetingStats,
      crmStats,
      systemStats,
      aiStats,
      feedbackScore,
    ] = await Promise.all([
      this.getUserStats(),
      this.getConversationStats(),
      this.getMeetingStats(),
      this.getCrmStats(),
      this.getSystemStats(),
      this.getAIStats(),
      this.getAverageFeedbackScore(),
    ]);

    return {
      users: userStats,
      conversations: conversationStats,
      meetings: meetingStats,
      crm: crmStats,
      ai: {
        totalTokensUsed: aiStats.totalTokensUsed,
        avgResponseTime: aiStats.avgResponseTime,
        totalCost: aiStats.totalCost,
        totalApiCalls: aiStats.totalApiCalls,
        feedbackScore,
      },
      system: systemStats,
    };
  }

  private async getSystemStats() {
    // Get system health metrics
    const startTime = Date.now();
    
    // Simple DB ping to measure response time
    await this.prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;
    
    // Get config counts to determine system health
    const [configCount, featureFlagCount, integrationCount] = await Promise.all([
      this.prisma.systemConfig.count(),
      this.prisma.featureFlag.count(),
      this.prisma.integrationConfig.count(),
    ]);
    
    // Calculate health score based on available data
    const hasConfigs = configCount > 0;
    const hasFeatures = featureFlagCount > 0;
    const dbHealthy = dbResponseTime < 1000;
    
    const healthScore = Math.round(
      ((hasConfigs ? 33 : 0) + (hasFeatures ? 33 : 0) + (dbHealthy ? 34 : 0))
    );
    
    return {
      healthScore,
      apiResponseTime: dbResponseTime,
      dbConnections: {
        current: 1, // Prisma uses connection pooling
        max: 100,
      },
      aiUptime: 99.8, // This would come from external monitoring in production
      status: healthScore >= 90 ? 'operational' : healthScore >= 70 ? 'degraded' : 'down',
    };
  }

  private async getUserStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, newThisMonth] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    return { total, active, newThisMonth };
  }

  private async getConversationStats() {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, thisWeek, userCount] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count(),
    ]);

    return {
      total,
      thisWeek,
      avgPerUser: userCount > 0 ? Math.round(total / userCount) : 0,
    };
  }

  private async getMeetingStats() {
    const [total, scheduled, completed, insights] = await Promise.all([
      this.prisma.meetingSession.count(),
      this.prisma.meetingSession.count({ where: { status: 'SCHEDULED' } }),
      this.prisma.meetingSession.count({ where: { status: 'COMPLETED' } }),
      this.prisma.meetingInsight.count(),
    ]);

    return {
      total,
      scheduled,
      completed,
      avgInsightsPerMeeting: completed > 0 ? Math.round(insights / completed) : 0,
    };
  }

  private async getCrmStats() {
    const [leads, opportunities, pipelineValue] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.opportunity.count(),
      this.prisma.opportunity.aggregate({
        _sum: { amount: true },
        where: { isClosed: false },
      }),
    ]);

    return {
      leads,
      opportunities,
      totalPipelineValue: pipelineValue._sum.amount || 0,
    };
  }

  private async getAverageFeedbackScore() {
    const feedback = await this.prisma.feedbackEntry.groupBy({
      by: ['rating'],
      _count: true,
    });

    const positive = feedback.find(f => f.rating === 'POSITIVE')?._count || 0;
    const negative = feedback.find(f => f.rating === 'NEGATIVE')?._count || 0;
    const total = positive + negative;

    return total > 0 ? Math.round((positive / total) * 100) : 0;
  }

  // ============================================
  // SYSTEM CONFIGURATION
  // ============================================

  async getAllConfigs(category?: string) {
    const where = category ? { category } : {};
    const configs = await this.prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Mask secret values
    return configs.map(config => ({
      ...config,
      value: config.isSecret ? '••••••••' : config.value,
    }));
  }

  async getConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Configuration "${key}" not found`);
    }

    return {
      ...config,
      value: config.isSecret ? '••••••••' : config.value,
    };
  }

  async updateConfig(key: string, value: string, userId: string) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException(`Configuration "${key}" not found`);
    }

    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: { value, updatedBy: userId },
    });

    // Log the change
    await this.logAuditAction('CONFIG_CHANGE', 'SystemConfig', key, userId, {
      oldValue: existing.isSecret ? '••••••••' : existing.value,
      newValue: existing.isSecret ? '••••••••' : value,
    });

    return updated;
  }

  async bulkUpdateConfigs(updates: BulkUpdateConfigDto, userId: string) {
    const results: Array<{ key: string; success: boolean; config?: any; error?: string }> = [];

    for (const update of updates.configs) {
      try {
        const result = await this.updateConfig(update.key, update.value, userId);
        results.push({ key: update.key, success: true, config: result });
      } catch (error) {
        results.push({ key: update.key, success: false, error: error.message });
      }
    }

    return results;
  }

  async createConfig(dto: CreateSystemConfigDto, userId: string) {
    const config = await this.prisma.systemConfig.create({
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    await this.logAuditAction('CREATE', 'SystemConfig', config.id, userId, {
      newValue: dto,
    });

    return config;
  }

  async deleteConfig(key: string, userId: string) {
    const config = await this.prisma.systemConfig.delete({
      where: { key },
    });

    await this.logAuditAction('DELETE', 'SystemConfig', key, userId, {
      oldValue: config,
    });

    return { success: true };
  }

  // ============================================
  // AI CONFIGURATION
  // ============================================

  async getAIConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: { category: 'ai' },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.isSecret ? '••••••••' : JSON.parse(config.value);
      return acc;
    }, {} as Record<string, any>);

    return {
      anthropicApiKey: configMap.anthropic_api_key || '',
      anthropicEndpoint: configMap.anthropic_endpoint || '',
      anthropicDeployment: configMap.anthropic_deployment || '',
      useAnthropic: configMap.use_anthropic ?? true,
      defaultModel: configMap.default_model || 'claude-3-opus-20240229',
      temperature: configMap.temperature ?? 0.7,
      maxTokens: configMap.max_tokens ?? 4096,
      systemPrompt: configMap.system_prompt || '',
      maxRequestsPerMinute: configMap.max_requests_per_minute ?? 60,
      maxTokensPerDay: configMap.max_tokens_per_day ?? 1000000,
      enableStreaming: configMap.enable_streaming ?? true,
      enableTools: configMap.enable_tools ?? true,
      enableVision: configMap.enable_vision ?? false,
    };
  }

  async updateAIConfig(dto: UpdateAIConfigDto, userId: string) {
    const updates: { key: string; value: string; isSecret?: boolean }[] = [];

    if (dto.anthropicApiKey !== undefined) {
      updates.push({ key: 'anthropic_api_key', value: JSON.stringify(dto.anthropicApiKey), isSecret: true });
    }
    if (dto.anthropicEndpoint !== undefined) {
      updates.push({ key: 'anthropic_endpoint', value: JSON.stringify(dto.anthropicEndpoint) });
    }
    if (dto.anthropicDeployment !== undefined) {
      updates.push({ key: 'anthropic_deployment', value: JSON.stringify(dto.anthropicDeployment) });
    }
    if (dto.useAnthropic !== undefined) {
      updates.push({ key: 'use_anthropic', value: JSON.stringify(dto.useAnthropic) });
    }
    if (dto.defaultModel !== undefined) {
      updates.push({ key: 'default_model', value: JSON.stringify(dto.defaultModel) });
    }
    if (dto.temperature !== undefined) {
      updates.push({ key: 'temperature', value: JSON.stringify(dto.temperature) });
    }
    if (dto.maxTokens !== undefined) {
      updates.push({ key: 'max_tokens', value: JSON.stringify(dto.maxTokens) });
    }
    if (dto.systemPrompt !== undefined) {
      updates.push({ key: 'system_prompt', value: JSON.stringify(dto.systemPrompt) });
    }
    if (dto.maxRequestsPerMinute !== undefined) {
      updates.push({ key: 'max_requests_per_minute', value: JSON.stringify(dto.maxRequestsPerMinute) });
    }
    if (dto.maxTokensPerDay !== undefined) {
      updates.push({ key: 'max_tokens_per_day', value: JSON.stringify(dto.maxTokensPerDay) });
    }
    if (dto.enableStreaming !== undefined) {
      updates.push({ key: 'enable_streaming', value: JSON.stringify(dto.enableStreaming) });
    }
    if (dto.enableTools !== undefined) {
      updates.push({ key: 'enable_tools', value: JSON.stringify(dto.enableTools) });
    }
    if (dto.enableVision !== undefined) {
      updates.push({ key: 'enable_vision', value: JSON.stringify(dto.enableVision) });
    }

    for (const update of updates) {
      await this.prisma.systemConfig.upsert({
        where: { key: update.key },
        create: {
          key: update.key,
          value: update.value,
          category: 'ai',
          type: update.isSecret ? 'secret' : 'string',
          label: update.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          isSecret: update.isSecret || false,
          updatedBy: userId,
        },
        update: {
          value: update.value,
          updatedBy: userId,
        },
      });
    }

    await this.logAuditAction('CONFIG_CHANGE', 'AIConfig', 'ai_config', userId, {
      changes: Object.keys(dto),
    });

    return this.getAIConfig();
  }

  // ============================================
  // MEETING INTELLIGENCE CONFIGURATION
  // ============================================

  async getMeetingIntelligenceConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: { category: 'meeting_intelligence' },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = JSON.parse(config.value);
      return acc;
    }, {} as Record<string, any>);

    return {
      autoUpdateCrm: configMap.auto_update_crm ?? true,
      autoCreateTasks: configMap.auto_create_tasks ?? true,
      autoUpdateOpportunity: configMap.auto_update_opportunity ?? true,
      autoStoreInsights: configMap.auto_store_insights ?? true,
      minTranscriptLength: configMap.min_transcript_length ?? 100,
      minInsightConfidence: configMap.min_insight_confidence ?? 0.5,
      minBuyingSignalConfidence: configMap.min_buying_signal_confidence ?? 0.6,
      maxActionItemsPerMeeting: configMap.max_action_items ?? 20,
      maxInsightsPerMeeting: configMap.max_insights ?? 50,
      maxProbabilityChange: configMap.max_probability_change ?? 30,
      enableContentFiltering: configMap.enable_content_filtering ?? true,
      enableDuplicateDetection: configMap.enable_duplicate_detection ?? true,
      enableAuditLogging: configMap.enable_audit_logging ?? true,
    };
  }

  async updateMeetingIntelligenceConfig(dto: UpdateMeetingIntelligenceConfigDto, userId: string) {
    const keyMap: Record<string, string> = {
      autoUpdateCrm: 'auto_update_crm',
      autoCreateTasks: 'auto_create_tasks',
      autoUpdateOpportunity: 'auto_update_opportunity',
      autoStoreInsights: 'auto_store_insights',
      minTranscriptLength: 'min_transcript_length',
      minInsightConfidence: 'min_insight_confidence',
      minBuyingSignalConfidence: 'min_buying_signal_confidence',
      maxActionItemsPerMeeting: 'max_action_items',
      maxInsightsPerMeeting: 'max_insights',
      maxProbabilityChange: 'max_probability_change',
      enableContentFiltering: 'enable_content_filtering',
      enableDuplicateDetection: 'enable_duplicate_detection',
      enableAuditLogging: 'enable_audit_logging',
    };

    for (const [dtoKey, dbKey] of Object.entries(keyMap)) {
      if (dto[dtoKey] !== undefined) {
        await this.prisma.systemConfig.upsert({
          where: { key: dbKey },
          create: {
            key: dbKey,
            value: JSON.stringify(dto[dtoKey]),
            category: 'meeting_intelligence',
            type: typeof dto[dtoKey] === 'boolean' ? 'boolean' : 'number',
            label: dbKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            updatedBy: userId,
          },
          update: {
            value: JSON.stringify(dto[dtoKey]),
            updatedBy: userId,
          },
        });
      }
    }

    await this.logAuditAction('CONFIG_CHANGE', 'MeetingIntelligenceConfig', 'meeting_intelligence', userId, {
      changes: Object.keys(dto),
    });

    return this.getMeetingIntelligenceConfig();
  }

  // ============================================
  // FEATURE FLAGS
  // ============================================

  async getAllFeatureFlags(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.featureFlag.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getFeatureFlag(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    return flag;
  }

  async createFeatureFlag(dto: CreateFeatureFlagDto, userId: string) {
    const flag = await this.prisma.featureFlag.create({
      data: {
        ...dto,
        rolloutPercentage: dto.rolloutPercentage ?? 100,
        allowedRoles: dto.allowedRoles ?? [],
        allowedUsers: dto.allowedUsers ?? [],
      },
    });

    await this.logAuditAction('CREATE', 'FeatureFlag', flag.id, userId, {
      newValue: dto,
    });

    return flag;
  }

  async updateFeatureFlag(key: string, dto: UpdateFeatureFlagDto, userId: string) {
    const existing = await this.getFeatureFlag(key);

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'FeatureFlag', key, userId, {
      oldValue: { enabled: existing.enabled, ...dto },
      newValue: { enabled: updated.enabled, ...dto },
    });

    return updated;
  }

  async toggleFeatureFlag(key: string, enabled: boolean, userId: string) {
    const existing = await this.getFeatureFlag(key);

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: { enabled },
    });

    await this.logAuditAction('FEATURE_TOGGLE', 'FeatureFlag', key, userId, {
      oldValue: { enabled: existing.enabled },
      newValue: { enabled },
    });

    return updated;
  }

  async deleteFeatureFlag(key: string, userId: string) {
    const flag = await this.prisma.featureFlag.delete({
      where: { key },
    });

    await this.logAuditAction('DELETE', 'FeatureFlag', key, userId, {
      oldValue: flag,
    });

    return { success: true };
  }

  async isFeatureEnabled(key: string, userId?: string, userRole?: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check user-specific access
    if (userId && flag.allowedUsers.length > 0) {
      if (!flag.allowedUsers.includes(userId)) {
        return false;
      }
    }

    // Check role-based access
    if (userRole && flag.allowedRoles.length > 0) {
      if (!flag.allowedRoles.includes(userRole)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && userId) {
      const hash = this.hashString(`${key}:${userId}`);
      if (hash % 100 >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getAllUsers(page = 1, pageSize = 20, search?: string, role?: string, status?: string, organizationId?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Filter by organization if specified (for managers)
    if (organizationId) {
      where.organizationMemberships = {
        some: {
          organizationId,
          isActive: true,
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true,
              leads: true,
              opportunities: true,
            },
          },
          // Include organization membership info
          organizationMemberships: {
            where: { isActive: true },
            take: 1,
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(user => {
        const membership = user.organizationMemberships?.[0];
        return {
          ...user,
          conversationCount: user._count.conversations,
          leadCount: user._count.leads,
          opportunityCount: user._count.opportunities,
          organizationId: membership?.organization?.id,
          organizationName: membership?.organization?.name,
          organizationRole: membership?.role,
          organizationMemberships: undefined, // Remove raw data
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        settings: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true,
            leads: true,
            opportunities: true,
            activities: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, adminUserId: string) {
    const existing = await this.getUser(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'User', id, adminUserId, {
      oldValue: { role: existing.role, status: existing.status },
      newValue: dto,
    });

    return updated;
  }

  async suspendUser(id: string, adminUserId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await this.logAuditAction('USER_SUSPEND', 'User', id, adminUserId, {
      newValue: { status: 'SUSPENDED' },
    });

    return user;
  }

  async activateUser(id: string, adminUserId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await this.logAuditAction('UPDATE', 'User', id, adminUserId, {
      newValue: { status: 'ACTIVE' },
    });

    return user;
  }

  async deleteUser(id: string, adminUserId: string) {
    // Prevent self-deletion
    if (id === adminUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Delete the user (this will cascade delete related records based on schema)
    await this.prisma.user.delete({
      where: { id },
    });

    await this.logAuditAction('DELETE', 'User', id, adminUserId, {
      metadata: { deletedUser: { email: user.email, name: user.name } },
    });

    return { success: true, message: 'User deleted successfully' };
  }

  async resetUserPassword(id: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Generate 6-digit reset code and 32-character token
    const resetCode = this.salesOSEmailService.generateVerificationCode(6);
    const resetToken = this.salesOSEmailService.generateResetToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token in user settings
    const currentSettings = typeof user.settings === 'object' && user.settings !== null
      ? user.settings as Record<string, any>
      : {};

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        settings: {
          ...currentSettings,
          passwordReset: {
            code: resetCode,
            token: resetToken,
            expiresAt: expiresAt.toISOString(),
            attempts: 0,
            initiatedBy: 'admin',
          },
        },
      },
    });

    // Send password reset email
    const emailSent = await this.salesOSEmailService.sendForgotPasswordEmail({
      to: user.email,
      userName: user.name || undefined,
      resetCode,
      resetToken,
      expirationMinutes: 30,
    });

    if (!emailSent) {
      this.logger.error(`Failed to send password reset email to ${user.email}`);
      throw new BadRequestException('Failed to send password reset email. Please try again.');
    }

    await this.logAuditAction('UPDATE', 'User', id, adminUserId, {
      metadata: { action: 'PASSWORD_RESET_REQUESTED', targetEmail: user.email },
    });

    return { success: true, message: `Password reset email sent to ${user.email}` };
  }

  // ============================================
  // INTEGRATIONS
  // ============================================

  async getAllIntegrations() {
    return this.prisma.integrationConfig.findMany({
      orderBy: { provider: 'asc' },
    });
  }

  async getIntegration(provider: string, organizationId?: string) {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider },
        });

    if (!integration) {
      throw new NotFoundException(`Integration "${provider}" not found`);
    }

    // Mask credentials
    return {
      ...integration,
      credentials: integration.credentials ? { configured: true } : null,
    };
  }

  async createIntegration(dto: CreateIntegrationDto, userId: string, organizationId: string) {
    const integration = await this.prisma.integrationConfig.create({
      data: {
        ...dto,
        organizationId,
        configuredById: userId,
        configuredAt: new Date(),
      },
    });

    await this.logAuditAction('CREATE', 'IntegrationConfig', integration.id, userId, {
      newValue: { provider: dto.provider, name: dto.name, organizationId },
    });

    return integration;
  }

  async updateIntegration(provider: string, dto: UpdateIntegrationDto, userId: string, organizationId: string) {
    const integration = await this.prisma.integrationConfig.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'IntegrationConfig', provider, userId, {
      changes: Object.keys(dto),
      metadata: { organizationId },
    });

    return integration;
  }

  async deleteIntegration(provider: string, userId: string, organizationId: string) {
    await this.prisma.integrationConfig.delete({
      where: { organizationId_provider: { organizationId, provider } },
    });

    await this.logAuditAction('DELETE', 'IntegrationConfig', provider, userId, {
      metadata: { organizationId },
    });

    return { success: true };
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  async getAuditLogs(query: AuditLogQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const where: any = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async logAuditAction(
    action: string,
    entityType: string,
    entityId: string,
    userId: string,
    data?: { oldValue?: any; newValue?: any; changes?: string[]; metadata?: any },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Store in AdminAuditLog table
    await this.prisma.adminAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        userName: user?.name,
        userEmail: user?.email,
        oldValue: data?.oldValue,
        newValue: data?.newValue,
        metadata: data?.metadata || (data?.changes ? { changes: data.changes } : null),
      },
    });

    // Also log to the unified ApplicationLog for comprehensive tracking
    await this.applicationLogService.logTransaction(
      'AdminService.logAuditAction',
      `ADMIN_${action}`,
      TransactionStatus.SUCCESS,
      `Admin action: ${action} on ${entityType}/${entityId}`,
      {
        category: LogCategory.SYSTEM,
        userId,
        entityType,
        entityId,
        metadata: {
          action,
          userName: user?.name,
          userEmail: user?.email,
          changes: data?.changes,
          ...data?.metadata,
        },
        tags: ['admin-action', action.toLowerCase()],
      }
    );

    this.logger.log(`Audit: ${action} on ${entityType}/${entityId} by ${userId}`);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initializeDefaultConfigs() {
    // Helper to get env value with proper JSON formatting
    const getEnvValue = (envKey: string, defaultValue: string): string => {
      const envValue = process.env[envKey];
      if (envValue === undefined || envValue === '') {
        return defaultValue;
      }
      // For strings, wrap in quotes if not already a JSON value
      if (defaultValue.startsWith('"') && !envValue.startsWith('"')) {
        return JSON.stringify(envValue);
      }
      // For booleans and numbers, return as-is
      return envValue;
    };

    const defaultConfigs = [
      // ========================================
      // General Settings
      // ========================================
      { key: 'app_name', value: getEnvValue('APP_NAME', '"IRIS Engage"'), category: 'general', type: 'string', label: 'Application Name', description: 'The name of the application displayed in the UI' },
      { key: 'app_url', value: getEnvValue('APP_URL', '"https://engage.iriseller.com"'), category: 'general', type: 'string', label: 'Application URL', description: 'Base URL of the application' },
      { key: 'support_email', value: getEnvValue('SUPPORT_EMAIL', '"rosa@iriseller.com"'), category: 'general', type: 'string', label: 'Support Email', description: 'Email address for support inquiries' },
      { key: 'default_timezone', value: getEnvValue('DEFAULT_TIMEZONE', '"UTC"'), category: 'general', type: 'select', label: 'Default Timezone', description: 'Default timezone for the application' },
      { key: 'date_format', value: getEnvValue('DATE_FORMAT', '"YYYY-MM-DD"'), category: 'general', type: 'select', label: 'Date Format', description: 'Default date format' },
      { key: 'session_timeout', value: getEnvValue('SESSION_TIMEOUT', '30'), category: 'general', type: 'number', label: 'Session Timeout (minutes)', description: 'How long before inactive sessions expire' },
      { key: 'port', value: getEnvValue('PORT', '4000'), category: 'general', type: 'number', label: 'Server Port', description: 'Port the backend server runs on' },
      { key: 'node_env', value: getEnvValue('NODE_ENV', '"development"'), category: 'general', type: 'select', label: 'Environment', description: 'Current environment (development, production, test)' },
      
      // ========================================
      // AI Configuration
      // ========================================
      { key: 'anthropic_api_key', value: getEnvValue('ANTHROPIC_API_KEY', '""'), category: 'ai', type: 'secret', label: 'Anthropic API Key', description: 'API key for Anthropic Claude models', isSecret: true },
      { key: 'anthropic_endpoint', value: getEnvValue('ANTHROPIC_ENDPOINT', '""'), category: 'ai', type: 'string', label: 'Anthropic Endpoint', description: 'Custom endpoint for Anthropic API (optional)' },
      { key: 'anthropic_deployment', value: getEnvValue('ANTHROPIC_DEPLOYMENT_NAME', '""'), category: 'ai', type: 'string', label: 'Anthropic Deployment', description: 'Deployment name for Azure Anthropic' },
      { key: 'use_anthropic', value: getEnvValue('USE_ANTHROPIC', 'true'), category: 'ai', type: 'boolean', label: 'Use Anthropic', description: 'Use Anthropic as primary AI provider' },
      { key: 'openai_api_key', value: getEnvValue('OPENAI_API_KEY', '""'), category: 'ai', type: 'secret', label: 'OpenAI API Key', description: 'API key for OpenAI models (fallback)', isSecret: true },
      { key: 'default_model', value: getEnvValue('DEFAULT_MODEL', '"claude-sonnet-4-5-2"'), category: 'ai', type: 'select', label: 'Default Model', description: 'Default AI model for conversations' },
      { key: 'temperature', value: getEnvValue('AI_TEMPERATURE', '0.7'), category: 'ai', type: 'range', label: 'Temperature', description: 'Controls randomness in AI responses (0-1)' },
      { key: 'max_tokens', value: getEnvValue('AI_MAX_TOKENS', '4096'), category: 'ai', type: 'number', label: 'Max Tokens', description: 'Maximum tokens per AI response' },
      { key: 'max_requests_per_minute', value: getEnvValue('AI_RATE_LIMIT', '60'), category: 'ai', type: 'number', label: 'Rate Limit (req/min)', description: 'Maximum AI requests per minute per user' },
      { key: 'max_tokens_per_day', value: getEnvValue('AI_DAILY_TOKEN_LIMIT', '1000000'), category: 'ai', type: 'number', label: 'Daily Token Limit', description: 'Maximum tokens per day per organization' },
      { key: 'enable_streaming', value: getEnvValue('AI_ENABLE_STREAMING', 'true'), category: 'ai', type: 'boolean', label: 'Enable Streaming', description: 'Stream AI responses in real-time' },
      { key: 'enable_tools', value: getEnvValue('AI_ENABLE_TOOLS', 'true'), category: 'ai', type: 'boolean', label: 'Enable AI Tools', description: 'Allow AI to use tools (CRM, web search, etc.)' },
      { key: 'enable_vision', value: getEnvValue('AI_ENABLE_VISION', 'false'), category: 'ai', type: 'boolean', label: 'Enable Vision', description: 'Allow AI to analyze images' },
      
      // ========================================
      // Web Research
      // ========================================
      { key: 'google_search_api_key', value: getEnvValue('GOOGLE_SEARCH_API_KEY', '""'), category: 'web_research', type: 'secret', label: 'Google Search API Key', description: 'API key for Google Custom Search', isSecret: true },
      { key: 'google_search_engine_id', value: getEnvValue('GOOGLE_SEARCH_ENGINE_ID', '""'), category: 'web_research', type: 'string', label: 'Google Search Engine ID', description: 'Custom Search Engine ID' },
      { key: 'max_search_results', value: getEnvValue('MAX_SEARCH_RESULTS', '10'), category: 'web_research', type: 'number', label: 'Max Search Results', description: 'Maximum number of search results to return' },
      { key: 'enable_web_scraping', value: getEnvValue('ENABLE_WEB_SCRAPING', 'true'), category: 'web_research', type: 'boolean', label: 'Enable Web Scraping', description: 'Allow scraping of web pages for research' },
      
      // ========================================
      // Meeting Intelligence
      // ========================================
      { key: 'auto_update_crm', value: getEnvValue('MEETING_AUTO_UPDATE_CRM', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Auto Update CRM', description: 'Automatically update CRM after meeting analysis' },
      { key: 'auto_create_tasks', value: getEnvValue('MEETING_AUTO_CREATE_TASKS', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Auto Create Tasks', description: 'Create tasks from meeting action items' },
      { key: 'auto_update_opportunity', value: getEnvValue('MEETING_AUTO_UPDATE_OPPORTUNITY', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Auto Update Opportunity', description: 'Update opportunity based on meeting insights' },
      { key: 'auto_store_insights', value: getEnvValue('MEETING_AUTO_STORE_INSIGHTS', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Auto Store Insights', description: 'Store meeting insights in database' },
      { key: 'min_transcript_length', value: getEnvValue('MEETING_MIN_TRANSCRIPT_LENGTH', '100'), category: 'meeting_intelligence', type: 'number', label: 'Min Transcript Length', description: 'Minimum transcript length to process' },
      { key: 'min_insight_confidence', value: getEnvValue('MEETING_MIN_INSIGHT_CONFIDENCE', '0.5'), category: 'meeting_intelligence', type: 'range', label: 'Min Insight Confidence', description: 'Minimum confidence score for insights (0-1)' },
      { key: 'min_buying_signal_confidence', value: getEnvValue('MEETING_MIN_BUYING_SIGNAL_CONFIDENCE', '0.6'), category: 'meeting_intelligence', type: 'range', label: 'Min Buying Signal Confidence', description: 'Minimum confidence for buying signals (0-1)' },
      { key: 'max_action_items', value: getEnvValue('MEETING_MAX_ACTION_ITEMS', '20'), category: 'meeting_intelligence', type: 'number', label: 'Max Action Items', description: 'Maximum action items per meeting' },
      { key: 'max_insights', value: getEnvValue('MEETING_MAX_INSIGHTS', '50'), category: 'meeting_intelligence', type: 'number', label: 'Max Insights', description: 'Maximum insights per meeting' },
      { key: 'max_probability_change', value: getEnvValue('MEETING_MAX_PROBABILITY_CHANGE', '30'), category: 'meeting_intelligence', type: 'number', label: 'Max Probability Change', description: 'Maximum % probability change per meeting' },
      { key: 'enable_content_filtering', value: getEnvValue('MEETING_ENABLE_CONTENT_FILTERING', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Enable Content Filtering', description: 'Filter inappropriate content' },
      { key: 'enable_duplicate_detection', value: getEnvValue('MEETING_ENABLE_DUPLICATE_DETECTION', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Enable Duplicate Detection', description: 'Detect duplicate insights' },
      { key: 'enable_audit_logging', value: getEnvValue('MEETING_ENABLE_AUDIT_LOGGING', 'true'), category: 'meeting_intelligence', type: 'boolean', label: 'Enable Audit Logging', description: 'Log all meeting intelligence actions' },
      
      // ========================================
      // Zoom Integration
      // ========================================
      { key: 'zoom_account_id', value: getEnvValue('ZOOM_ACCOUNT_ID', '""'), category: 'zoom', type: 'string', label: 'Zoom Account ID', description: 'Zoom Server-to-Server OAuth Account ID' },
      { key: 'zoom_client_id', value: getEnvValue('ZOOM_CLIENT_ID', '""'), category: 'zoom', type: 'string', label: 'Zoom Client ID', description: 'Zoom OAuth App Client ID' },
      { key: 'zoom_client_secret', value: getEnvValue('ZOOM_CLIENT_SECRET', '""'), category: 'zoom', type: 'secret', label: 'Zoom Client Secret', description: 'Zoom OAuth App Client Secret', isSecret: true },
      { key: 'zoom_webhook_secret', value: getEnvValue('ZOOM_WEBHOOK_SECRET', '""'), category: 'zoom', type: 'secret', label: 'Zoom Webhook Secret', description: 'Secret for validating Zoom webhooks', isSecret: true },
      { key: 'zoom_sdk_key', value: getEnvValue('ZOOM_SDK_KEY', '""'), category: 'zoom', type: 'string', label: 'Zoom SDK Key', description: 'Zoom Meeting SDK Key for bot joining' },
      { key: 'zoom_sdk_secret', value: getEnvValue('ZOOM_SDK_SECRET', '""'), category: 'zoom', type: 'secret', label: 'Zoom SDK Secret', description: 'Zoom Meeting SDK Secret', isSecret: true },
      { key: 'zoom_enabled', value: getEnvValue('ZOOM_ENABLED', 'true'), category: 'zoom', type: 'boolean', label: 'Enable Zoom Integration', description: 'Enable Zoom meeting integration' },
      
      // ========================================
      // Microsoft Teams Integration
      // ========================================
      { key: 'teams_tenant_id', value: getEnvValue('TEAMS_TENANT_ID', '""'), category: 'teams', type: 'string', label: 'Teams Tenant ID', description: 'Microsoft 365 Tenant ID' },
      { key: 'teams_client_id', value: getEnvValue('TEAMS_CLIENT_ID', '""'), category: 'teams', type: 'string', label: 'Teams Client ID', description: 'Azure AD App Client ID' },
      { key: 'teams_client_secret', value: getEnvValue('TEAMS_CLIENT_SECRET', '""'), category: 'teams', type: 'secret', label: 'Teams Client Secret', description: 'Azure AD App Client Secret', isSecret: true },
      { key: 'teams_enabled', value: getEnvValue('TEAMS_ENABLED', 'false'), category: 'teams', type: 'boolean', label: 'Enable Teams Integration', description: 'Enable Microsoft Teams integration' },
      
      // ========================================
      // Google Meet Integration
      // ========================================
      { key: 'google_client_email', value: getEnvValue('GOOGLE_CLIENT_EMAIL', '""'), category: 'google', type: 'string', label: 'Google Service Account Email', description: 'Service account email for Google APIs' },
      { key: 'google_private_key', value: getEnvValue('GOOGLE_PRIVATE_KEY', '""'), category: 'google', type: 'secret', label: 'Google Private Key', description: 'Service account private key', isSecret: true },
      { key: 'google_meet_enabled', value: getEnvValue('GOOGLE_MEET_ENABLED', 'false'), category: 'google', type: 'boolean', label: 'Enable Google Meet Integration', description: 'Enable Google Meet integration' },
      
      // ========================================
      // Transcription (Whisper)
      // ========================================
      { key: 'azure_whisper_endpoint', value: getEnvValue('AZURE_WHISPER_ENDPOINT', '""'), category: 'transcription', type: 'string', label: 'Azure Whisper Endpoint', description: 'Azure OpenAI Whisper endpoint URL' },
      { key: 'azure_whisper_deployment', value: getEnvValue('AZURE_WHISPER_DEPLOYMENT', '""'), category: 'transcription', type: 'string', label: 'Azure Whisper Deployment', description: 'Whisper model deployment name' },
      { key: 'azure_whisper_api_key', value: getEnvValue('AZURE_WHISPER_API_KEY', '""'), category: 'transcription', type: 'secret', label: 'Azure Whisper API Key', description: 'API key for Azure Whisper', isSecret: true },
      { key: 'transcription_provider', value: getEnvValue('TRANSCRIPTION_PROVIDER', '"azure"'), category: 'transcription', type: 'select', label: 'Transcription Provider', description: 'Provider for audio transcription' },
      { key: 'transcription_language', value: getEnvValue('TRANSCRIPTION_LANGUAGE', '"en"'), category: 'transcription', type: 'select', label: 'Transcription Language', description: 'Default language for transcription' },
      
      // ========================================
      // Attendee Bot Service
      // ========================================
      { key: 'attendee_url', value: getEnvValue('ATTENDEE_URL', '"http://localhost:8000"'), category: 'attendee', type: 'string', label: 'Attendee Service URL', description: 'URL of the Attendee meeting bot service' },
      { key: 'attendee_api_key', value: getEnvValue('ATTENDEE_API_KEY', '""'), category: 'attendee', type: 'secret', label: 'Attendee API Key', description: 'API key for Attendee service', isSecret: true },
      { key: 'attendee_enabled', value: getEnvValue('ATTENDEE_ENABLED', 'true'), category: 'attendee', type: 'boolean', label: 'Enable Attendee Service', description: 'Use Attendee for meeting bot functionality' },
      { key: 'default_host_email', value: getEnvValue('DEFAULT_HOST_EMAIL', '""'), category: 'attendee', type: 'string', label: 'Default Host Email', description: 'Default email for bot host identification' },
      
      // ========================================
      // Email Configuration
      // ========================================
      { key: 'smtp_host', value: getEnvValue('SMTP_HOST', '"smtp.gmail.com"'), category: 'email', type: 'string', label: 'SMTP Host', description: 'SMTP server hostname' },
      { key: 'smtp_port', value: getEnvValue('SMTP_PORT', '587'), category: 'email', type: 'number', label: 'SMTP Port', description: 'SMTP server port' },
      { key: 'smtp_user', value: getEnvValue('GMAIL_USER', '""'), category: 'email', type: 'string', label: 'SMTP Username', description: 'SMTP authentication username' },
      { key: 'smtp_password', value: getEnvValue('GMAIL_APP_PASSWORD', '""'), category: 'email', type: 'secret', label: 'SMTP Password', description: 'SMTP authentication password', isSecret: true },
      { key: 'email_from_name', value: getEnvValue('EMAIL_FROM_NAME', '"IRIS Engage"'), category: 'email', type: 'string', label: 'From Name', description: 'Name shown in sent emails' },
      { key: 'email_from_address', value: getEnvValue('EMAIL_FROM_ADDRESS', '""'), category: 'email', type: 'string', label: 'From Address', description: 'Email address for sent emails' },
      
      // ========================================
      // OAuth / Social Login Configuration
      // ========================================
      { key: 'oauth_google_enabled', value: getEnvValue('OAUTH_GOOGLE_ENABLED', 'false'), category: 'oauth', type: 'boolean', label: 'Enable Google Sign-In', description: 'Allow users to sign in with Google' },
      { key: 'oauth_google_client_id', value: getEnvValue('GOOGLE_OAUTH_CLIENT_ID', '""'), category: 'oauth', type: 'string', label: 'Google Client ID', description: 'Google OAuth 2.0 Client ID from Google Cloud Console' },
      { key: 'oauth_google_client_secret', value: getEnvValue('GOOGLE_OAUTH_CLIENT_SECRET', '""'), category: 'oauth', type: 'secret', label: 'Google Client Secret', description: 'Google OAuth 2.0 Client Secret', isSecret: true },
      { key: 'oauth_apple_enabled', value: getEnvValue('OAUTH_APPLE_ENABLED', 'false'), category: 'oauth', type: 'boolean', label: 'Enable Apple Sign-In', description: 'Allow users to sign in with Apple' },
      { key: 'oauth_apple_client_id', value: getEnvValue('APPLE_CLIENT_ID', '""'), category: 'oauth', type: 'string', label: 'Apple Client ID (Services ID)', description: 'Apple Services ID for Sign in with Apple' },
      { key: 'oauth_apple_team_id', value: getEnvValue('APPLE_TEAM_ID', '""'), category: 'oauth', type: 'string', label: 'Apple Team ID', description: 'Your Apple Developer Team ID' },
      { key: 'oauth_apple_key_id', value: getEnvValue('APPLE_KEY_ID', '""'), category: 'oauth', type: 'string', label: 'Apple Key ID', description: 'Key ID from Apple Developer Portal' },
      { key: 'oauth_apple_private_key', value: getEnvValue('APPLE_PRIVATE_KEY', '""'), category: 'oauth', type: 'secret', label: 'Apple Private Key', description: 'Private key (.p8) content for Sign in with Apple', isSecret: true },

      // ========================================
      // Security Settings
      // ========================================
      { key: 'jwt_expires_in', value: getEnvValue('JWT_EXPIRES_IN', '"7d"'), category: 'security', type: 'select', label: 'JWT Expiration', description: 'How long before JWT tokens expire' },
      { key: 'password_min_length', value: getEnvValue('PASSWORD_MIN_LENGTH', '8'), category: 'security', type: 'number', label: 'Min Password Length', description: 'Minimum password length' },
      { key: 'require_2fa', value: getEnvValue('REQUIRE_2FA', 'false'), category: 'security', type: 'boolean', label: 'Require 2FA', description: 'Require two-factor authentication' },
      { key: 'allowed_domains', value: getEnvValue('ALLOWED_DOMAINS', '""'), category: 'security', type: 'string', label: 'Allowed Email Domains', description: 'Comma-separated list of allowed email domains for signup' },
      { key: 'max_login_attempts', value: getEnvValue('MAX_LOGIN_ATTEMPTS', '5'), category: 'security', type: 'number', label: 'Max Login Attempts', description: 'Maximum failed login attempts before lockout' },
      { key: 'lockout_duration', value: getEnvValue('LOCKOUT_DURATION', '15'), category: 'security', type: 'number', label: 'Lockout Duration (minutes)', description: 'How long account is locked after max attempts' },
      { key: 'cors_origin', value: getEnvValue('CORS_ORIGIN', '"*"'), category: 'security', type: 'string', label: 'CORS Origin', description: 'Allowed origins for CORS requests' },
      
      // ========================================
      // Data & Storage
      // ========================================
      { key: 'data_retention_days', value: getEnvValue('DATA_RETENTION_DAYS', '365'), category: 'data', type: 'number', label: 'Data Retention (days)', description: 'How long to retain conversation data' },
      { key: 'max_file_upload_mb', value: getEnvValue('MAX_FILE_UPLOAD_MB', '25'), category: 'data', type: 'number', label: 'Max File Upload (MB)', description: 'Maximum file upload size' },
      { key: 'enable_data_export', value: getEnvValue('ENABLE_DATA_EXPORT', 'true'), category: 'data', type: 'boolean', label: 'Enable Data Export', description: 'Allow users to export their data' },
      { key: 'auto_archive_days', value: getEnvValue('AUTO_ARCHIVE_DAYS', '90'), category: 'data', type: 'number', label: 'Auto Archive (days)', description: 'Days before conversations are archived' },
      { key: 'database_url', value: getEnvValue('DATABASE_URL', '""'), category: 'data', type: 'secret', label: 'Database URL', description: 'PostgreSQL connection string', isSecret: true },
      
      // ========================================
      // Notifications
      // ========================================
      { key: 'enable_email_notifications', value: getEnvValue('ENABLE_EMAIL_NOTIFICATIONS', 'true'), category: 'notifications', type: 'boolean', label: 'Email Notifications', description: 'Send email notifications' },
      { key: 'enable_meeting_reminders', value: getEnvValue('ENABLE_MEETING_REMINDERS', 'true'), category: 'notifications', type: 'boolean', label: 'Meeting Reminders', description: 'Send meeting reminder notifications' },
      { key: 'reminder_minutes_before', value: getEnvValue('REMINDER_MINUTES_BEFORE', '15'), category: 'notifications', type: 'number', label: 'Reminder Minutes Before', description: 'Minutes before meeting to send reminder' },
      { key: 'enable_insight_notifications', value: getEnvValue('ENABLE_INSIGHT_NOTIFICATIONS', 'true'), category: 'notifications', type: 'boolean', label: 'Insight Notifications', description: 'Notify when important insights are detected' },
      
      // ========================================
      // CRM Settings
      // ========================================
      { key: 'crm_sync_interval', value: getEnvValue('CRM_SYNC_INTERVAL', '15'), category: 'crm', type: 'number', label: 'CRM Sync Interval (minutes)', description: 'How often to sync with CRM' },
      { key: 'enable_lead_scoring', value: getEnvValue('ENABLE_LEAD_SCORING', 'true'), category: 'crm', type: 'boolean', label: 'Enable Lead Scoring', description: 'Automatically score leads based on engagement' },
      { key: 'enable_opportunity_tracking', value: getEnvValue('ENABLE_OPPORTUNITY_TRACKING', 'true'), category: 'crm', type: 'boolean', label: 'Enable Opportunity Tracking', description: 'Track opportunity progression' },
      { key: 'default_currency', value: getEnvValue('DEFAULT_CURRENCY', '"USD"'), category: 'crm', type: 'select', label: 'Default Currency', description: 'Default currency for deals' },
    ];

    for (const config of defaultConfigs) {
      // Check if config exists and if its value is empty/default
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: config.key },
      });
      
      // If config doesn't exist, create it with env value
      // If config exists but has empty value ("" or null), update with env value
      const shouldUpdateValue = !existing || 
        existing.value === '""' || 
        existing.value === '' || 
        existing.value === null;
      
      await this.prisma.systemConfig.upsert({
        where: { key: config.key },
        create: config,
        update: {
          description: config.description,
          label: config.label,
          category: config.category,
          type: config.type,
          isSecret: config.isSecret || false,
          // Only update value if it was empty/default
          ...(shouldUpdateValue && config.value !== '""' ? { value: config.value } : {}),
        },
      });
    }

    // Initialize default feature flags
    const defaultFlags = [
      { key: 'meeting_intelligence', name: 'Meeting Intelligence', description: 'Enable AI-powered meeting analysis and insights', category: 'meetings', enabled: true },
      { key: 'auto_crm_sync', name: 'Automatic CRM Sync', description: 'Automatically sync meeting insights to CRM records', category: 'crm', enabled: true },
      { key: 'web_research', name: 'Web Research', description: 'AI-powered web research for prospects and companies', category: 'ai', enabled: true },
      { key: 'document_search', name: 'Document Search', description: 'AI document indexing and semantic search', category: 'ai', enabled: true },
      { key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Advanced pipeline analytics and forecasting', category: 'analytics', enabled: false },
      { key: 'multi_language', name: 'Multi-Language Support', description: 'Support for multiple languages in AI responses', category: 'experimental', enabled: false },
      { key: 'zoom_bot', name: 'Zoom Bot Integration', description: 'Automatic meeting bot joining for Zoom', category: 'meetings', enabled: true },
      { key: 'teams_bot', name: 'Teams Bot Integration', description: 'Automatic meeting bot joining for Microsoft Teams', category: 'meetings', enabled: false },
      { key: 'google_meet_bot', name: 'Google Meet Bot Integration', description: 'Automatic meeting bot joining for Google Meet', category: 'meetings', enabled: false },
      { key: 'email_integration', name: 'Email Integration', description: 'Email sending and tracking capabilities', category: 'email', enabled: true },
      { key: 'calendar_sync', name: 'Calendar Sync', description: 'Sync with Google Calendar and Outlook', category: 'calendar', enabled: true },
      { key: 'real_time_transcription', name: 'Real-time Transcription', description: 'Live transcription during meetings', category: 'meetings', enabled: true },
    ];

    for (const flag of defaultFlags) {
      await this.prisma.featureFlag.upsert({
        where: { key: flag.key },
        create: { ...flag, rolloutPercentage: 100, allowedRoles: [], allowedUsers: [] },
        update: { description: flag.description, name: flag.name, category: flag.category },
      });
    }

    this.logger.log('Initialized default configurations and feature flags');
    return { success: true, message: 'Default configurations initialized' };
  }

  // ============================================
  // SIGNAL RULES
  // ============================================

  async getSignalRules(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.signalRule.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getSignalRule(id: string) {
    const rule = await this.prisma.signalRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException(`Signal rule with ID "${id}" not found`);
    }

    return rule;
  }

  async createSignalRule(dto: any, userId: string) {
    const rule = await this.prisma.signalRule.create({
      data: {
        ...dto,
        createdBy: userId,
      },
    });

    await this.logAuditAction('CREATE', 'SignalRule', rule.id, userId, {
      newValue: dto,
    });

    return rule;
  }

  async updateSignalRule(id: string, dto: any, userId: string) {
    const existing = await this.getSignalRule(id);

    const updated = await this.prisma.signalRule.update({
      where: { id },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'SignalRule', id, userId, {
      oldValue: existing,
      newValue: dto,
    });

    return updated;
  }

  async deleteSignalRule(id: string, userId: string) {
    const rule = await this.getSignalRule(id);

    await this.prisma.signalRule.delete({
      where: { id },
    });

    await this.logAuditAction('DELETE', 'SignalRule', id, userId, {
      oldValue: rule,
    });

    return { success: true };
  }

  async toggleSignalRule(id: string, isActive: boolean, userId: string) {
    const rule = await this.prisma.signalRule.update({
      where: { id },
      data: { isActive },
    });

    await this.logAuditAction('TOGGLE', 'SignalRule', id, userId, {
      newValue: { isActive },
    });

    return rule;
  }

  // ============================================
  // AGENT CONFIGURATION
  // ============================================

  async getAgentConfigs() {
    return this.prisma.agentConfig.findMany({
      orderBy: { agentType: 'asc' },
    });
  }

  async getAgentConfig(agentType: string) {
    const config = await this.prisma.agentConfig.findUnique({
      where: { agentType },
    });

    if (!config) {
      throw new NotFoundException(`Agent config for type "${agentType}" not found`);
    }

    return config;
  }

  async updateAgentConfig(agentType: string, dto: any, userId: string) {
    // Upsert to create if doesn't exist
    const existing = await this.prisma.agentConfig.findUnique({
      where: { agentType },
    });

    // Extract only valid Prisma fields
    const validFields = [
      'name', 'description', 'isEnabled', 'scheduleType', 'cronSchedule',
      'parameters', 'allowedIntegrations', 'maxExecutionsPerHour', 'maxTokensPerExecution'
    ];
    const updateData: any = {};
    for (const field of validFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    const config = await this.prisma.agentConfig.upsert({
      where: { agentType },
      create: {
        agentType,
        name: dto.name || agentType,
        ...updateData,
      },
      update: updateData,
    });

    await this.logAuditAction(existing ? 'UPDATE' : 'CREATE', 'AgentConfig', agentType, userId, {
      oldValue: existing,
      newValue: dto,
    });

    return config;
  }

  async getAgentStats(agentType: string) {
    const config = await this.getAgentConfig(agentType);

    return {
      agentType: config.agentType,
      name: config.name,
      isEnabled: config.isEnabled,
      totalExecutions: config.totalExecutions,
      successfulExecutions: config.successfulExecutions,
      failedExecutions: config.failedExecutions,
      successRate: config.totalExecutions > 0
        ? (config.successfulExecutions / config.totalExecutions * 100).toFixed(1)
        : '0',
      avgExecutionTime: config.avgExecutionTime,
      lastExecutedAt: config.lastExecutedAt,
      lastError: config.lastError,
    };
  }

  async testAgent(agentType: string, userId: string) {
    const startTime = Date.now();

    try {
      // Get the orchestrator lazily to avoid circular dependency
      const orchestrator = this.getAgentOrchestrator();

      if (!orchestrator) {
        // Fall back to simulation if orchestrator not available
        await new Promise(resolve => setTimeout(resolve, 500));

        await this.prisma.agentConfig.update({
          where: { agentType },
          data: {
            lastExecutedAt: new Date(),
            totalExecutions: { increment: 1 },
            successfulExecutions: { increment: 1 },
            avgExecutionTime: 500,
          },
        });

        return {
          success: true,
          executionTime: 500,
          message: `Agent ${agentType} test completed (simulated - orchestrator not available)`,
          simulated: true,
        };
      }

      // Trigger the actual agent via the orchestrator
      const executionId = await orchestrator.triggerAgent(
        agentType as AgentType,
        AgentTrigger.USER_REQUEST,
        {
          userId,
          priority: Priority.HIGH,
          metadata: { test: true, triggeredFrom: 'admin_panel' },
        },
      );

      // Wait for execution to complete (with timeout)
      const timeout = 30000; // 30 seconds max wait
      const pollInterval = 500; // Check every 500ms
      let execution: any = null;
      let elapsed = 0;

      while (elapsed < timeout) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;

        // Check execution status
        execution = await this.prisma.agentExecution.findUnique({
          where: { id: executionId },
        });

        if (execution && (execution.status === 'COMPLETED' || execution.status === 'FAILED')) {
          break;
        }
      }

      const executionTime = Date.now() - startTime;
      const success = execution?.status === 'COMPLETED';

      // Update agent config with execution metrics
      await this.prisma.agentConfig.update({
        where: { agentType },
        data: {
          lastExecutedAt: new Date(),
          totalExecutions: { increment: 1 },
          successfulExecutions: success ? { increment: 1 } : undefined,
          failedExecutions: !success ? { increment: 1 } : undefined,
          avgExecutionTime: executionTime,
          lastError: !success ? (execution?.metadata as any)?.error || 'Execution failed or timed out' : null,
        },
      });

      await this.logAuditAction('TEST', 'AgentConfig', agentType, userId, {
        metadata: {
          executionId,
          executionTime,
          success,
          status: execution?.status,
          alertsCreated: execution?.alertsCreated || 0,
          actionsGenerated: execution?.actionsGenerated || 0,
        },
      });

      return {
        success,
        executionId,
        executionTime,
        status: execution?.status || 'TIMEOUT',
        alertsCreated: execution?.alertsCreated || 0,
        actionsGenerated: execution?.actionsGenerated || 0,
        message: success
          ? `Agent ${agentType} test completed successfully`
          : `Agent ${agentType} test ${execution?.status === 'FAILED' ? 'failed' : 'timed out'}`,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Handle case where agent type is not registered
      if (error.message?.includes('not registered')) {
        // Fall back to simulation for unregistered agents
        await new Promise(resolve => setTimeout(resolve, 500));

        await this.prisma.agentConfig.update({
          where: { agentType },
          data: {
            lastExecutedAt: new Date(),
            totalExecutions: { increment: 1 },
            successfulExecutions: { increment: 1 },
            avgExecutionTime: 500,
          },
        });

        return {
          success: true,
          executionTime: 500,
          message: `Agent ${agentType} test completed (simulated - agent not yet registered with orchestrator)`,
          simulated: true,
        };
      }

      await this.prisma.agentConfig.update({
        where: { agentType },
        data: {
          lastExecutedAt: new Date(),
          totalExecutions: { increment: 1 },
          failedExecutions: { increment: 1 },
          lastError: error.message,
        },
      });

      return {
        success: false,
        executionTime,
        message: error.message,
      };
    }
  }

  // ============================================
  // PLAYBOOKS (Admin Management)
  // ============================================

  async getPlaybooks(targetDealType?: string) {
    const where: any = {};
    if (targetDealType) {
      where.targetDealType = targetDealType;
    }

    return this.prisma.playbook.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { steps: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPlaybook(id: string) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!playbook) {
      throw new NotFoundException(`Playbook with ID "${id}" not found`);
    }

    return playbook;
  }

  async createPlaybook(dto: any, userId: string) {
    // Extract only valid Prisma fields (exclude category which is DTO-only)
    const { category, ...prismaData } = dto;

    const playbook = await this.prisma.playbook.create({
      data: {
        ...prismaData,
        createdBy: userId,
      },
    });

    await this.logAuditAction('CREATE', 'Playbook', playbook.id, userId, {
      newValue: dto,
    });

    return playbook;
  }

  async updatePlaybook(id: string, dto: any, userId: string) {
    const existing = await this.getPlaybook(id);

    const playbook = await this.prisma.playbook.update({
      where: { id },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'Playbook', id, userId, {
      oldValue: { name: existing.name, targetDealType: existing.targetDealType },
      newValue: dto,
    });

    return playbook;
  }

  async deletePlaybook(id: string, userId: string) {
    const playbook = await this.getPlaybook(id);

    await this.prisma.playbook.delete({
      where: { id },
    });

    await this.logAuditAction('DELETE', 'Playbook', id, userId, {
      oldValue: { name: playbook.name },
    });

    return { success: true };
  }

  async addPlaybookStep(playbookId: string, dto: any, userId: string) {
    await this.getPlaybook(playbookId); // Verify exists

    const step = await this.prisma.playbookStep.create({
      data: {
        playbookId,
        ...dto,
      },
    });

    await this.logAuditAction('CREATE', 'PlaybookStep', step.id, userId, {
      metadata: { playbookId },
      newValue: dto,
    });

    return step;
  }

  async updatePlaybookStep(stepId: string, dto: any, userId: string) {
    const step = await this.prisma.playbookStep.update({
      where: { id: stepId },
      data: dto,
    });

    await this.logAuditAction('UPDATE', 'PlaybookStep', stepId, userId, {
      newValue: dto,
    });

    return step;
  }

  async deletePlaybookStep(stepId: string, userId: string) {
    await this.prisma.playbookStep.delete({
      where: { id: stepId },
    });

    await this.logAuditAction('DELETE', 'PlaybookStep', stepId, userId);

    return { success: true };
  }

  // ============================================
  // INTEGRATION HEALTH
  // ============================================

  async getIntegrationHealth() {
    const integrations = await this.prisma.integrationConfig.findMany();

    return integrations.map(integration => ({
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
      hasCredentials: !!integration.credentials,
    }));
  }

  async testIntegration(provider: string, userId: string, organizationId?: string) {
    // If organizationId provided, use compound key; otherwise search by provider
    const integration = organizationId
      ? await this.prisma.integrationConfig.findUnique({
          where: { organizationId_provider: { organizationId, provider } },
        })
      : await this.prisma.integrationConfig.findFirst({
          where: { provider },
        });

    if (!integration) {
      throw new NotFoundException(`Integration "${provider}" not found`);
    }

    const hasCredentials = !!integration.credentials;

    if (!hasCredentials) {
      return {
        success: false,
        message: 'No credentials configured',
        latencyMs: 0,
      };
    }

    await this.logAuditAction('TEST', 'IntegrationConfig', provider, userId);

    // Route to the appropriate integration service for real connection testing
    try {
      switch (provider) {
        case 'snowflake': {
          const snowflakeService = this.getSnowflakeService();
          if (!snowflakeService) {
            return { success: false, message: 'Snowflake service not available', latencyMs: 0 };
          }
          return await snowflakeService.testConnection();
        }

        case 'zoominfo': {
          const zoominfoService = this.getZoominfoService();
          if (!zoominfoService) {
            return { success: false, message: 'ZoomInfo service not available', latencyMs: 0 };
          }
          return await zoominfoService.testConnection();
        }

        case 'microsoft365':
        case 'teams':
        case 'sharepoint': {
          // Microsoft Graph services - these use OAuth which requires browser redirect
          // For now, validate credentials are present
          const creds = integration.credentials as any;
          if (!creds?.clientId || !creds?.clientSecret || !creds?.tenantId) {
            return { success: false, message: 'Missing required Microsoft 365 credentials (clientId, clientSecret, tenantId)', latencyMs: 0 };
          }
          // TODO: Implement actual Microsoft Graph connection test when OAuth flow is complete
          return { success: true, message: 'Credentials validated (OAuth connection required)', latencyMs: 50 };
        }

        case 'sixsense': {
          // 6sense integration - validate API key format
          const creds = integration.credentials as any;
          if (!creds?.sixSenseApiKey || !creds?.sixSenseAccountId) {
            return { success: false, message: 'Missing required 6sense credentials (API key, Account ID)', latencyMs: 0 };
          }
          // TODO: Implement actual 6sense API validation when available
          return { success: true, message: 'Credentials validated', latencyMs: 50 };
        }

        default:
          this.logger.warn(`No specific test implementation for provider: ${provider}`);
          return { success: true, message: 'Credentials present (no specific test available)', latencyMs: 50 };
      }
    } catch (error: any) {
      this.logger.error(`Integration test failed for ${provider}:`, error);
      return {
        success: false,
        message: error?.message || 'Connection test failed',
        latencyMs: 0,
      };
    }
  }

  // ============================================
  // COACHING CONFIGURATION
  // ============================================

  async getCoachingConfig() {
    // Try to get from SystemConfig first
    const configEntry = await this.prisma.systemConfig.findUnique({
      where: { key: 'coaching_config' },
    });

    if (configEntry && configEntry.value) {
      try {
        return JSON.parse(configEntry.value);
      } catch {
        this.logger.warn('Failed to parse coaching config, returning default');
      }
    }

    // Return default config if not found
    return this.getDefaultCoachingConfig();
  }

  async updateCoachingConfig(config: any, userId: string) {
    const existingConfig = await this.getCoachingConfig();

    // Merge with existing to preserve any fields not being updated
    const mergedConfig = {
      ...existingConfig,
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    // Upsert the config
    await this.prisma.systemConfig.upsert({
      where: { key: 'coaching_config' },
      create: {
        key: 'coaching_config',
        value: JSON.stringify(mergedConfig),
        category: 'coaching',
        type: 'json',
        label: 'Coaching Configuration',
        description: 'Manager-configurable coaching parameters including priorities, win patterns, metrics, and ramp settings',
        updatedBy: userId,
      },
      update: {
        value: JSON.stringify(mergedConfig),
        updatedBy: userId,
      },
    });

    await this.logAuditAction('UPDATE', 'CoachingConfig', 'coaching_config', userId, {
      metadata: { sections: Object.keys(config) },
    });

    return mergedConfig;
  }

  private getDefaultCoachingConfig() {
    return {
      leadershipPriorities: [
        { id: '1', text: 'Meet or exceed quarterly quota', order: 1 },
        { id: '2', text: 'Maintain 3x pipeline coverage', order: 2 },
        { id: '3', text: 'Complete 10+ customer meetings per week', order: 3 },
        { id: '4', text: 'Update opportunities weekly', order: 4 },
        { id: '5', text: 'Close deals within 90-day cycle', order: 5 },
      ],
      winPatterns: [
        { id: '1', name: 'Multi-threaded engagement', description: 'Engage 3+ stakeholders in the buying process', weight: 9 },
        { id: '2', name: 'Executive sponsor', description: 'Identify and engage executive sponsor early', weight: 10 },
        { id: '3', name: 'POC completed', description: 'Complete proof of concept or pilot', weight: 8 },
        { id: '4', name: 'Business case documented', description: 'Create formal business case with ROI', weight: 9 },
        { id: '5', name: 'Technical validation', description: 'Complete technical requirements validation', weight: 7 },
        { id: '6', name: 'Competitive positioning', description: 'Establish clear competitive differentiation', weight: 8 },
        { id: '7', name: 'Timeline alignment', description: 'Align with customer initiative timeline', weight: 7 },
      ],
      successMetrics: {
        winRateTarget: 30,
        pipelineCoverageTarget: 3,
        meetingsPerWeekTarget: 10,
        callsPerWeekTarget: 25,
        opportunityUpdatesPerWeek: 5,
        avgCycleTimeDays: 90,
      },
      coachingCadence: {
        oneOnOneFrequency: 'weekly',
        pipelineReviewFrequency: 'weekly',
        teamMeetingFrequency: 'weekly',
        forecastReviewFrequency: 'monthly',
      },
      alertThresholds: {
        daysWithoutActivity: 7,
        dealAgeWarningDays: 60,
        stuckInStageWarningDays: 14,
        lowActivityThreshold: 5,
        atRiskProbabilityThreshold: 30,
        decliningSentimentThreshold: 40,
      },
      rampSettings: {
        rampDurationWeeks: 12,
        milestones: [
          { id: '1', weekNumber: 2, name: 'Onboarding Complete', description: 'Complete all onboarding training', expectedMetrics: {} },
          { id: '2', weekNumber: 4, name: 'First Meetings', description: 'Complete first customer meetings', expectedMetrics: { meetingsTarget: 5 } },
          { id: '3', weekNumber: 8, name: 'Pipeline Building', description: 'Build initial pipeline', expectedMetrics: { pipelineTarget: 100000, dealsTarget: 3 } },
          { id: '4', weekNumber: 12, name: 'Full Productivity', description: 'Achieve full productivity metrics', expectedMetrics: { meetingsTarget: 40, callsTarget: 100, pipelineTarget: 500000 } },
        ],
      },
    };
  }

  // ============================================
  // MANAGER INSIGHTS (O3 Dashboard)
  // ============================================

  /**
   * Get recommendation metrics for the O3 dashboard
   * Returns stats about AI recommendations: total, by status, by action type
   */
  async getInsightsRecommendations(timeframeInDays = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeInDays);

    // Get all recommendations in the timeframe
    const recommendations = await this.prisma.signalRecommendation.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        action: true,
        status: true,
        priority: true,
        confidence: true,
        createdAt: true,
        executedAt: true,
        executedBy: true,
      },
    });

    // Calculate metrics
    const total = recommendations.length;
    const executed = recommendations.filter(r => r.status === 'EXECUTED').length;
    const pending = recommendations.filter(r => r.status === 'PENDING').length;
    const skipped = recommendations.filter(r => r.status === 'SKIPPED').length;
    const failed = recommendations.filter(r => r.status === 'FAILED').length;

    // Group by action type
    const byAction = recommendations.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const byPriority = recommendations.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average confidence
    const avgConfidence = total > 0
      ? recommendations.reduce((sum, r) => sum + (r.confidence || 0), 0) / total
      : 0;

    // Calculate adoption rate (executed / total)
    const adoptionRate = total > 0 ? (executed / total) * 100 : 0;

    // Calculate average time to action (for executed recommendations)
    const executedRecs = recommendations.filter(r => r.status === 'EXECUTED' && r.executedAt);
    const avgTimeToAction = executedRecs.length > 0
      ? executedRecs.reduce((sum, r) => {
          const diff = new Date(r.executedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + diff;
        }, 0) / executedRecs.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      summary: {
        total,
        executed,
        pending,
        skipped,
        failed,
        adoptionRate: Math.round(adoptionRate * 10) / 10,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgTimeToActionHours: Math.round(avgTimeToAction * 10) / 10,
      },
      byAction,
      byPriority,
      timeframeInDays,
    };
  }

  /**
   * Get rep AI adoption comparison for the O3 dashboard
   * Returns each rep's AI recommendation adoption metrics
   */
  async getInsightsRepComparison(timeframeInDays = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeInDays);

    // Get all users who are sales reps (USER role) or managers
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['USER', 'MANAGER'] },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Get recommendations executed by each user
    const executedByUser = await this.prisma.signalRecommendation.groupBy({
      by: ['executedBy'],
      where: {
        executedAt: { gte: startDate },
        status: 'EXECUTED',
        executedBy: { not: null },
      },
      _count: true,
    });

    // Get total recommendations per account owner
    // First, get account signals by account, then join with account owners
    const accountSignals = await this.prisma.accountSignal.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        accountId: true,
        recommendations: {
          select: {
            id: true,
            status: true,
            executedBy: true,
          },
        },
      },
    });

    // Get accounts with their owners
    const accountOwners = await this.prisma.account.findMany({
      select: {
        id: true,
        ownerId: true,
      },
    });
    const ownerMap = new Map(accountOwners.map(a => [a.id, a.ownerId]));

    // Calculate recommendations per rep
    const repStats: Record<string, { total: number; executed: number; skipped: number; pending: number }> = {};

    for (const signal of accountSignals) {
      const ownerId = ownerMap.get(signal.accountId);
      if (!ownerId) continue;

      if (!repStats[ownerId]) {
        repStats[ownerId] = { total: 0, executed: 0, skipped: 0, pending: 0 };
      }

      for (const rec of signal.recommendations) {
        repStats[ownerId].total++;
        if (rec.status === 'EXECUTED') repStats[ownerId].executed++;
        else if (rec.status === 'SKIPPED') repStats[ownerId].skipped++;
        else if (rec.status === 'PENDING') repStats[ownerId].pending++;
      }
    }

    // Build response with user details
    const repComparison = users.map(user => {
      const stats = repStats[user.id] || { total: 0, executed: 0, skipped: 0, pending: 0 };
      const executedCount = executedByUser.find(e => e.executedBy === user.id)?._count || 0;
      const adoptionRate = stats.total > 0 ? (stats.executed / stats.total) * 100 : 0;

      return {
        userId: user.id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        recommendationsReceived: stats.total,
        recommendationsActioned: stats.executed,
        recommendationsSkipped: stats.skipped,
        recommendationsPending: stats.pending,
        totalActionsExecuted: executedCount,
        adoptionRate: Math.round(adoptionRate * 10) / 10,
      };
    }).sort((a, b) => b.adoptionRate - a.adoptionRate);

    return {
      reps: repComparison,
      timeframeInDays,
      summary: {
        totalReps: repComparison.length,
        avgAdoptionRate: repComparison.length > 0
          ? Math.round(repComparison.reduce((sum, r) => sum + r.adoptionRate, 0) / repComparison.length * 10) / 10
          : 0,
        topPerformer: repComparison[0] || null,
      },
    };
  }

  /**
   * Get deal outcomes with AI attribution for the O3 dashboard
   * Compares win rates for deals with vs without AI assistance
   */
  async getInsightsDealOutcomes(timeframeInDays = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeInDays);

    // Get all closed opportunities in the timeframe
    const opportunities = await this.prisma.opportunity.findMany({
      where: {
        isClosed: true,
        closedDate: { gte: startDate },
      },
      select: {
        id: true,
        name: true,
        amount: true,
        isWon: true,
        closedDate: true,
        ownerId: true,
        accountId: true,
        stage: true,
        winProbability: true,
        recommendedActions: true,
        metadata: true,
      },
    });

    // Get recommendations related to these opportunities' accounts
    const accountIds = [...new Set(opportunities.map(o => o.accountId))];
    const accountRecommendations = await this.prisma.signalRecommendation.findMany({
      where: {
        accountId: { in: accountIds },
        status: 'EXECUTED',
      },
      select: {
        accountId: true,
        action: true,
        executedAt: true,
      },
    });

    // Map recommendations by account
    const recsByAccount = accountRecommendations.reduce((acc, r) => {
      if (!acc[r.accountId]) acc[r.accountId] = [];
      acc[r.accountId].push(r);
      return acc;
    }, {} as Record<string, typeof accountRecommendations>);

    // Categorize opportunities
    const aiAssistedDeals = opportunities.filter(o => {
      const recs = recsByAccount[o.accountId] || [];
      return recs.length > 0;
    });
    const nonAiDeals = opportunities.filter(o => {
      const recs = recsByAccount[o.accountId] || [];
      return recs.length === 0;
    });

    // Calculate metrics
    const aiWins = aiAssistedDeals.filter(o => o.isWon);
    const nonAiWins = nonAiDeals.filter(o => o.isWon);

    const aiWinRate = aiAssistedDeals.length > 0
      ? (aiWins.length / aiAssistedDeals.length) * 100
      : 0;
    const nonAiWinRate = nonAiDeals.length > 0
      ? (nonAiWins.length / nonAiDeals.length) * 100
      : 0;

    const aiTotalValue = aiWins.reduce((sum, o) => sum + (o.amount || 0), 0);
    const nonAiTotalValue = nonAiWins.reduce((sum, o) => sum + (o.amount || 0), 0);

    const aiAvgDealSize = aiWins.length > 0 ? aiTotalValue / aiWins.length : 0;
    const nonAiAvgDealSize = nonAiWins.length > 0 ? nonAiTotalValue / nonAiWins.length : 0;

    // Win rate lift from AI
    const winRateLift = nonAiWinRate > 0
      ? ((aiWinRate - nonAiWinRate) / nonAiWinRate) * 100
      : 0;

    return {
      summary: {
        totalDeals: opportunities.length,
        aiAssistedDeals: aiAssistedDeals.length,
        nonAiDeals: nonAiDeals.length,
        aiWinRate: Math.round(aiWinRate * 10) / 10,
        nonAiWinRate: Math.round(nonAiWinRate * 10) / 10,
        winRateLift: Math.round(winRateLift * 10) / 10,
        aiTotalValue,
        nonAiTotalValue,
        aiAvgDealSize: Math.round(aiAvgDealSize),
        nonAiAvgDealSize: Math.round(nonAiAvgDealSize),
      },
      aiAssisted: {
        total: aiAssistedDeals.length,
        won: aiWins.length,
        lost: aiAssistedDeals.length - aiWins.length,
        totalValue: aiTotalValue,
      },
      nonAiAssisted: {
        total: nonAiDeals.length,
        won: nonAiWins.length,
        lost: nonAiDeals.length - nonAiWins.length,
        totalValue: nonAiTotalValue,
      },
      timeframeInDays,
    };
  }

  /**
   * Get recommendation trends over time for the O3 dashboard
   * Returns daily/weekly recommendation metrics
   */
  async getInsightsTrends(timeframeInDays = 30, granularity: 'daily' | 'weekly' = 'daily') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeInDays);

    // Get all recommendations in the timeframe
    const recommendations = await this.prisma.signalRecommendation.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        executedAt: true,
        action: true,
        priority: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by time period
    const trends: Record<string, { created: number; executed: number; skipped: number; pending: number }> = {};

    for (const rec of recommendations) {
      const date = new Date(rec.createdAt);
      let periodKey: string;

      if (granularity === 'weekly') {
        // Get the Monday of the week
        const dayOfWeek = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        periodKey = monday.toISOString().split('T')[0];
      } else {
        periodKey = date.toISOString().split('T')[0];
      }

      if (!trends[periodKey]) {
        trends[periodKey] = { created: 0, executed: 0, skipped: 0, pending: 0 };
      }

      trends[periodKey].created++;
      if (rec.status === 'EXECUTED') trends[periodKey].executed++;
      else if (rec.status === 'SKIPPED') trends[periodKey].skipped++;
      else if (rec.status === 'PENDING') trends[periodKey].pending++;
    }

    // Convert to array and sort by date
    const trendData = Object.entries(trends)
      .map(([date, stats]) => ({
        date,
        ...stats,
        adoptionRate: stats.created > 0 ? Math.round((stats.executed / stats.created) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend direction
    const recentPeriods = trendData.slice(-7);
    const olderPeriods = trendData.slice(0, Math.min(7, trendData.length - 7));

    const recentAvgAdoption = recentPeriods.length > 0
      ? recentPeriods.reduce((sum, p) => sum + p.adoptionRate, 0) / recentPeriods.length
      : 0;
    const olderAvgAdoption = olderPeriods.length > 0
      ? olderPeriods.reduce((sum, p) => sum + p.adoptionRate, 0) / olderPeriods.length
      : 0;

    const trendDirection = recentAvgAdoption > olderAvgAdoption ? 'improving'
      : recentAvgAdoption < olderAvgAdoption ? 'declining'
      : 'stable';

    return {
      trends: trendData,
      summary: {
        totalPeriods: trendData.length,
        avgAdoptionRate: trendData.length > 0
          ? Math.round(trendData.reduce((sum, p) => sum + p.adoptionRate, 0) / trendData.length * 10) / 10
          : 0,
        trendDirection,
        recentAvgAdoption: Math.round(recentAvgAdoption * 10) / 10,
      },
      granularity,
      timeframeInDays,
    };
  }

  /**
   * Get agent performance metrics for the O3 dashboard
   * Returns execution stats for each AI agent type
   */
  async getInsightsAgentPerformance(timeframeInDays = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeInDays);

    // Get all agent alerts in the timeframe
    const alerts = await this.prisma.agentAlert.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        agentType: true,
        alertType: true,
        priority: true,
        status: true,
        createdAt: true,
        acknowledgedAt: true,
        actionedAt: true,
        dismissedAt: true,
      },
    });

    // Get agent configs for additional context
    const agentConfigs = await this.prisma.agentConfig.findMany({
      select: {
        agentType: true,
        name: true,
        isEnabled: true,
        totalExecutions: true,
        successfulExecutions: true,
        failedExecutions: true,
        avgExecutionTime: true,
        lastExecutedAt: true,
      },
    });

    // Group alerts by agent type
    const alertsByAgent: Record<string, typeof alerts> = {};
    for (const alert of alerts) {
      if (!alertsByAgent[alert.agentType]) {
        alertsByAgent[alert.agentType] = [];
      }
      alertsByAgent[alert.agentType].push(alert);
    }

    // Build agent performance data
    const agentPerformance = agentConfigs.map(config => {
      const agentAlerts = alertsByAgent[config.agentType] || [];
      const acknowledged = agentAlerts.filter(a => a.acknowledgedAt).length;
      const actioned = agentAlerts.filter(a => a.actionedAt).length;
      const dismissed = agentAlerts.filter(a => a.dismissedAt).length;
      const pending = agentAlerts.filter(a => a.status === 'PENDING').length;

      const alertResponseRate = agentAlerts.length > 0
        ? ((acknowledged + actioned) / agentAlerts.length) * 100
        : 0;

      // Calculate average response time for acknowledged/actioned alerts
      const respondedAlerts = agentAlerts.filter(a => a.acknowledgedAt || a.actionedAt);
      const avgResponseTime = respondedAlerts.length > 0
        ? respondedAlerts.reduce((sum, a) => {
            const responseDate = a.actionedAt || a.acknowledgedAt;
            const diff = new Date(responseDate!).getTime() - new Date(a.createdAt).getTime();
            return sum + diff;
          }, 0) / respondedAlerts.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      return {
        agentType: config.agentType,
        name: config.name,
        isEnabled: config.isEnabled,
        // Execution metrics (from config)
        totalExecutions: config.totalExecutions,
        successfulExecutions: config.successfulExecutions,
        failedExecutions: config.failedExecutions,
        successRate: config.totalExecutions > 0
          ? Math.round((config.successfulExecutions / config.totalExecutions) * 100 * 10) / 10
          : 0,
        avgExecutionTimeMs: config.avgExecutionTime || 0,
        lastExecutedAt: config.lastExecutedAt,
        // Alert metrics (from alerts)
        alertsGenerated: agentAlerts.length,
        alertsAcknowledged: acknowledged,
        alertsActioned: actioned,
        alertsDismissed: dismissed,
        alertsPending: pending,
        alertResponseRate: Math.round(alertResponseRate * 10) / 10,
        avgResponseTimeHours: Math.round(avgResponseTime * 10) / 10,
        // Priority breakdown
        highPriorityAlerts: agentAlerts.filter(a => a.priority === 'HIGH' || a.priority === 'URGENT').length,
      };
    });

    // Calculate summary stats
    const totalAlerts = alerts.length;
    const totalActioned = alerts.filter(a => a.actionedAt).length;
    const totalDismissed = alerts.filter(a => a.dismissedAt).length;

    return {
      agents: agentPerformance,
      summary: {
        totalAgents: agentConfigs.length,
        enabledAgents: agentConfigs.filter(c => c.isEnabled).length,
        totalAlerts,
        totalActioned,
        totalDismissed,
        overallResponseRate: totalAlerts > 0
          ? Math.round(((totalActioned + alerts.filter(a => a.acknowledgedAt).length) / totalAlerts) * 100 * 10) / 10
          : 0,
      },
      timeframeInDays,
    };
  }

  // ============================================
  // INITIALIZE DEFAULT AGENT CONFIGS
  // ============================================

  async initializeDefaultAgentConfigs() {
    const defaultAgents = [
      {
        agentType: 'LISTENING',
        name: 'Listening Agent',
        description: 'Monitors external data sources for account signals',
        isEnabled: true,
        scheduleType: 'HOURLY',
        allowedIntegrations: ['snowflake', 'zoominfo', 'news'],
        maxExecutionsPerHour: 60,
        maxTokensPerExecution: 4000,
      },
      {
        agentType: 'REASONING',
        name: 'Reasoning Agent',
        description: 'Analyzes signals and generates recommendations',
        isEnabled: true,
        scheduleType: 'REALTIME',
        allowedIntegrations: [],
        maxExecutionsPerHour: 120,
        maxTokensPerExecution: 8000,
      },
      {
        agentType: 'LEARN_MORE',
        name: 'Learn More Agent',
        description: 'Answers questions using multi-source context',
        isEnabled: true,
        scheduleType: 'MANUAL',
        allowedIntegrations: ['snowflake', 'documents'],
        maxExecutionsPerHour: 200,
        maxTokensPerExecution: 4000,
      },
      {
        agentType: 'EMAIL_ACTION',
        name: 'Email Action Agent',
        description: 'Drafts and sends emails based on signals',
        isEnabled: false,
        scheduleType: 'MANUAL',
        allowedIntegrations: ['microsoft365', 'gmail'],
        maxExecutionsPerHour: 30,
        maxTokensPerExecution: 2000,
      },
      {
        agentType: 'CRM_ACTION',
        name: 'CRM Action Agent',
        description: 'Creates/updates CRM records based on signals',
        isEnabled: true,
        scheduleType: 'REALTIME',
        allowedIntegrations: [],
        maxExecutionsPerHour: 100,
        maxTokensPerExecution: 1000,
      },
      {
        agentType: 'MEETING_ACTION',
        name: 'Meeting Action Agent',
        description: 'Schedules meetings based on signals',
        isEnabled: false,
        scheduleType: 'MANUAL',
        allowedIntegrations: ['microsoft365', 'google_calendar'],
        maxExecutionsPerHour: 20,
        maxTokensPerExecution: 1000,
      },
    ];

    for (const agent of defaultAgents) {
      await this.prisma.agentConfig.upsert({
        where: { agentType: agent.agentType },
        create: agent as any,
        update: {
          name: agent.name,
          description: agent.description,
        },
      });
    }

    this.logger.log('Initialized default agent configurations');
  }
}
