/**
 * IRIS Agent Framework - REST API Controller
 * 
 * Standard REST API endpoints for managing agents.
 * Follows enterprise patterns with:
 * - JWT authentication
 * - Role-based access control
 * - Swagger documentation
 * - Standard error handling
 * 
 * IMPORTANT: Route order matters in NestJS!
 * Specific routes must come BEFORE parameterized routes.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { AgentOrchestratorService } from './orchestrator/agent-orchestrator.service';
import { PrismaService } from '../database/prisma.service';
import { AgentType, AgentTrigger, Priority } from './types';
import {
  TriggerAgentDto,
  UpdateAgentConfigDto,
  UpdateAlertDto,
  QueryAlertsDto,
  ApproveActionDto,
  QueryActionsDto,
  QueryExecutionsDto,
  AgentStatusResponse,
  QueueStatusResponse,
  TriggerResponse,
} from './dto';

@ApiTags('Agents')
@ApiBearerAuth()
@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(
    private readonly orchestrator: AgentOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  // ==================== AGENT LISTING (root route) ====================

  @Get()
  @ApiOperation({ summary: 'List all registered agents with their status' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async listAgents(@Request() req): Promise<AgentStatusResponse[]> {
    const agents = this.orchestrator.getAllAgents();
    
    return agents.map(agent => ({
      type: agent.type,
      name: agent.config.name,
      description: agent.config.description,
      version: agent.config.version,
      enabled: agent.config.enabled,
      requiresApproval: agent.config.requiresApproval,
      lastExecutedAt: agent.lastExecutedAt,
      executionCount: agent.executionCount,
      errorCount: agent.errorCount,
      schedule: agent.config.schedule ? {
        enabled: agent.config.schedule.enabled,
        cron: agent.config.schedule.cron,
      } : undefined,
      limits: {
        maxExecutionTimeMs: agent.config.limits.maxExecutionTimeMs,
        maxLLMCalls: agent.config.limits.maxLLMCalls,
        maxAlertsPerExecution: agent.config.limits.maxAlertsPerExecution,
        rateLimitPerHour: agent.config.limits.rateLimitPerHour,
        rateLimitPerDay: agent.config.limits.rateLimitPerDay,
      },
    }));
  }

  // ==================== TRIGGER EXECUTION ====================

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger an agent execution' })
  @ApiResponse({ status: 201, description: 'Agent triggered' })
  async triggerAgent(
    @Request() req,
    @Body() dto: TriggerAgentDto,
  ): Promise<TriggerResponse> {
    try {
      const executionId = await this.orchestrator.triggerAgent(
        dto.agentType,
        AgentTrigger.USER_REQUEST,
        {
          entityType: dto.entityType,
          entityId: dto.entityId,
          userId: req.user.userId,
          priority: dto.priority,
          metadata: dto.metadata,
        },
      );

      this.logger.log(`Agent ${dto.agentType} triggered by ${req.user.email}: ${executionId}`);

      return {
        executionId,
        agentType: dto.agentType,
        status: 'QUEUED',
        message: `Agent ${dto.agentType} queued for execution`,
      };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ==================== QUEUE STATUS ====================

  @Get('queue/status')
  @ApiOperation({ summary: 'Get current queue status' })
  @ApiResponse({ status: 200, description: 'Queue status' })
  async getQueueStatus(): Promise<QueueStatusResponse> {
    return this.orchestrator.getQueueStatus();
  }

  // ==================== ALERTS (specific routes before :param) ====================

  @Get('alerts/pending')
  @ApiOperation({ summary: 'Get pending alerts count by priority' })
  @ApiResponse({ status: 200, description: 'Pending alerts summary' })
  async getPendingAlertsSummary(@Request() req): Promise<any> {
    const alerts = await this.prisma.agentAlert.groupBy({
      by: ['priority'],
      where: {
        userId: req.user.userId,
        status: 'PENDING',
      },
      _count: true,
    });

    const summary = {
      total: 0,
      byPriority: {} as Record<string, number>,
    };

    for (const alert of alerts) {
      summary.byPriority[alert.priority] = alert._count;
      summary.total += alert._count;
    }

    return summary;
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts for the current user' })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  async getAlerts(
    @Request() req,
    @Query() query: QueryAlertsDto,
  ): Promise<any[]> {
    const where: any = {
      userId: req.user.userId,
    };

    // Only apply date filter for non-PENDING queries or when explicitly requested
    // PENDING alerts should always show all regardless of age (users expect to see them)
    if (query.status !== 'PENDING' || query.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (query.days || 7));
      where.createdAt = { gte: cutoffDate };
    }

    if (query.agentType) where.agentType = query.agentType;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    return this.prisma.agentAlert.findMany({
      where,
      take: query.limit || 50,
      orderBy: [
        { priority: 'asc' }, // URGENT first
        { createdAt: 'desc' },
      ],
    });
  }

  @Patch('alerts/:alertId')
  @ApiOperation({ summary: 'Update alert status (acknowledge, action, dismiss)' })
  @ApiResponse({ status: 200, description: 'Alert updated' })
  async updateAlert(
    @Request() req,
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<any> {
    const alert = await this.prisma.agentAlert.findFirst({
      where: { id: alertId, userId: req.user.userId },
    });

    if (!alert) {
      throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    }

    const updateData: any = { status: dto.status };
    const now = new Date();

    switch (dto.status) {
      case 'ACKNOWLEDGED':
        updateData.acknowledgedAt = now;
        updateData.acknowledgedBy = req.user.userId;
        break;
      case 'ACTIONED':
        updateData.actionedAt = now;
        updateData.actionedBy = req.user.userId;
        break;
      case 'DISMISSED':
        updateData.dismissedAt = now;
        updateData.dismissedBy = req.user.userId;
        break;
    }

    return this.prisma.agentAlert.update({
      where: { id: alertId },
      data: updateData,
    });
  }

  @Delete('alerts/:alertId')
  @ApiOperation({ summary: 'Delete an alert' })
  @ApiResponse({ status: 200, description: 'Alert deleted' })
  async deleteAlert(
    @Request() req,
    @Param('alertId') alertId: string,
  ): Promise<{ success: boolean }> {
    const alert = await this.prisma.agentAlert.findFirst({
      where: { id: alertId, userId: req.user.userId },
    });

    if (!alert) {
      throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.agentAlert.delete({ where: { id: alertId } });

    return { success: true };
  }

  // ==================== ACTIONS ====================

  @Get('actions')
  @ApiOperation({ summary: 'Get pending actions requiring approval' })
  @ApiResponse({ status: 200, description: 'List of actions' })
  async getActions(
    @Request() req,
    @Query() query: QueryActionsDto,
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (query.days || 7));

    const where: any = {
      userId: req.user.userId,
      createdAt: { gte: cutoffDate },
    };

    if (query.status) where.status = query.status;
    if (query.actionType) where.actionType = query.actionType;

    return this.prisma.agentAction.findMany({
      where,
      take: query.limit || 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('actions/:actionId/approve')
  @ApiOperation({ summary: 'Approve or reject a pending action' })
  @ApiResponse({ status: 200, description: 'Action updated' })
  async approveAction(
    @Request() req,
    @Param('actionId') actionId: string,
    @Body() dto: ApproveActionDto,
  ): Promise<any> {
    const action = await this.prisma.agentAction.findFirst({
      where: { id: actionId, userId: req.user.userId, status: 'PENDING_APPROVAL' },
    });

    if (!action) {
      throw new HttpException('Action not found or not pending approval', HttpStatus.NOT_FOUND);
    }

    const now = new Date();
    const updateData: any = dto.approved
      ? { status: 'APPROVED', approvedBy: req.user.userId, approvedAt: now }
      : { status: 'REJECTED', rejectedBy: req.user.userId, rejectedAt: now, rejectionReason: dto.rejectionReason };

    return this.prisma.agentAction.update({
      where: { id: actionId },
      data: updateData,
    });
  }

  // ==================== EXECUTION HISTORY ====================

  @Get('executions')
  @ApiOperation({ summary: 'Get agent execution history' })
  @ApiResponse({ status: 200, description: 'Execution history' })
  async getExecutions(
    @Request() req,
    @Query() query: QueryExecutionsDto,
  ): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (query.days || 7));

    const where: any = {
      createdAt: { gte: cutoffDate },
    };

    // Non-admin users only see their own executions
    if (req.user.role?.toUpperCase() !== 'ADMIN') {
      where.userId = req.user.userId;
    }

    if (query.agentType) where.agentType = query.agentType;
    if (query.status) where.status = query.status;

    return this.prisma.agentExecution.findMany({
      where,
      take: query.limit || 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get details of a specific execution' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  async getExecutionDetails(
    @Request() req,
    @Param('executionId') executionId: string,
  ): Promise<any> {
    const where: any = { id: executionId };

    // Non-admin users only see their own executions
    if (req.user.role?.toUpperCase() !== 'ADMIN') {
      where.userId = req.user.userId;
    }

    const execution = await this.prisma.agentExecution.findFirst({ where });

    if (!execution) {
      throw new HttpException('Execution not found', HttpStatus.NOT_FOUND);
    }

    return execution;
  }

  // ==================== ANALYTICS ====================

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get agent analytics summary (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics summary' })
  async getAnalyticsSummary(@Request() req): Promise<any> {
    if (req.user.role?.toUpperCase() !== 'ADMIN') {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [executions, alerts, actions] = await Promise.all([
      // Execution stats
      this.prisma.agentExecution.groupBy({
        by: ['agentType', 'status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // Alert stats
      this.prisma.agentAlert.groupBy({
        by: ['agentType', 'status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // Action stats
      this.prisma.agentAction.groupBy({
        by: ['actionType', 'status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
    ]);

    return {
      period: '30 days',
      executions: this.groupStats(executions),
      alerts: this.groupStats(alerts),
      actions: this.groupStats(actions),
    };
  }

  // ==================== SPECIFIC AGENT (parameterized - MUST BE LAST) ====================

  @Get(':agentType')
  @ApiOperation({ summary: 'Get status of a specific agent' })
  @ApiResponse({ status: 200, description: 'Agent status' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgentStatus(
    @Param('agentType') agentType: AgentType,
  ): Promise<AgentStatusResponse> {
    const agent = this.orchestrator.getAgentStatus(agentType);
    
    if (!agent) {
      throw new HttpException(`Agent ${agentType} not found`, HttpStatus.NOT_FOUND);
    }

    return {
      type: agent.type,
      name: agent.config.name,
      description: agent.config.description,
      version: agent.config.version,
      enabled: agent.config.enabled,
      requiresApproval: agent.config.requiresApproval,
      lastExecutedAt: agent.lastExecutedAt,
      executionCount: agent.executionCount,
      errorCount: agent.errorCount,
      schedule: agent.config.schedule ? {
        enabled: agent.config.schedule.enabled,
        cron: agent.config.schedule.cron,
      } : undefined,
      limits: {
        maxExecutionTimeMs: agent.config.limits.maxExecutionTimeMs,
        maxLLMCalls: agent.config.limits.maxLLMCalls,
        maxAlertsPerExecution: agent.config.limits.maxAlertsPerExecution,
        rateLimitPerHour: agent.config.limits.rateLimitPerHour,
        rateLimitPerDay: agent.config.limits.rateLimitPerDay,
      },
    };
  }

  @Patch(':agentType/config')
  @ApiOperation({ summary: 'Update agent configuration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateAgentConfig(
    @Request() req,
    @Param('agentType') agentType: AgentType,
    @Body() dto: UpdateAgentConfigDto,
  ): Promise<{ success: boolean; message: string }> {
    // Check admin role
    if (req.user.role?.toUpperCase() !== 'ADMIN') {
      throw new HttpException('Admin access required', HttpStatus.FORBIDDEN);
    }

    const agent = this.orchestrator.getAgentStatus(agentType);
    if (!agent) {
      throw new HttpException(`Agent ${agentType} not found`, HttpStatus.NOT_FOUND);
    }

    // Store config update in database
    await this.prisma.systemConfig.upsert({
      where: { key: `agent_config_${agentType}` },
      create: {
        key: `agent_config_${agentType}`,
        value: JSON.stringify(dto),
        category: 'agents',
        type: 'json',
        label: `${agentType} Configuration`,
      },
      update: {
        value: JSON.stringify(dto),
      },
    });

    this.logger.log(`Agent ${agentType} config updated by ${req.user.email}`);

    return {
      success: true,
      message: `Agent ${agentType} configuration updated. Restart required for some changes.`,
    };
  }

  // ==================== HELPER METHODS ====================

  private groupStats(data: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const item of data) {
      const key = item.agentType || item.actionType;
      if (!result[key]) result[key] = {};
      result[key][item.status] = item._count;
    }
    return result;
  }
}

