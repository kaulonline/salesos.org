/**
 * Agent Builder Controller
 * 
 * REST API for creating, managing, and executing user-defined agents.
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
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { AgentBuilderService } from './agent-builder.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  RunAgentDto,
  QueryAgentsDto,
  QueryExecutionLogsDto,
} from './dto/agent-builder.dto';

@ApiTags('Agent Builder')
@Controller('agents/builder')
export class AgentBuilderController {
  private readonly logger = new Logger(AgentBuilderController.name);

  constructor(private readonly builderService: AgentBuilderService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('tools')
  @ApiOperation({ summary: 'Get available tools for agents' })
  @ApiResponse({ status: 200, description: 'List of available tools' })
  getAvailableTools(@Query('includeExternalCrm') includeExternalCrm?: string) {
    const includeExternal = includeExternalCrm === 'true';
    return this.builderService.getAvailableTools(includeExternal);
  }

  // ==================== AI GENERATION ENDPOINTS ====================

  @Post('generate-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate agent configuration from natural language description' })
  @ApiResponse({ status: 200, description: 'Generated agent configuration' })
  async generateAgentConfig(
    @Request() req,
    @Body() body: { description: string },
  ) {
    if (!body.description || body.description.trim().length < 10) {
      throw new HttpException(
        'Please provide a description of at least 10 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.builderService.generateAgentConfig(req.user.userId, body.description);
  }

  @Post('create-from-description')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an agent directly from natural language description' })
  @ApiResponse({ status: 201, description: 'Agent created from description' })
  async createFromDescription(
    @Request() req,
    @Body() body: { description: string },
  ) {
    if (!body.description || body.description.trim().length < 10) {
      throw new HttpException(
        'Please provide a description of at least 10 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.builderService.createAgentFromDescription(req.user.userId, body.description);
  }

  @Get('salesforce-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check Salesforce connection status for current user' })
  @ApiResponse({ status: 200, description: 'Salesforce connection status' })
  async checkSalesforceConnection(@Request() req) {
    return this.builderService.checkSalesforceConnection(req.user.userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List agent templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async listTemplates(@Query('category') category?: string) {
    return this.builderService.listTemplates(category);
  }

  // ==================== EXECUTION (must be before :agentId routes) ====================

  @Get('executions/:executionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get execution details with logs' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  async getExecution(@Param('executionId') executionId: string) {
    return this.builderService.getExecution(executionId);
  }

  @Get('executions/:executionId/logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get execution logs' })
  @ApiResponse({ status: 200, description: 'Execution logs' })
  async getExecutionLogs(
    @Param('executionId') executionId: string,
    @Query() query: QueryExecutionLogsDto,
  ) {
    return this.builderService.getExecutionLogs(executionId, query);
  }

  // ==================== AGENT CRUD (authenticated) ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new custom agent' })
  @ApiResponse({ status: 201, description: 'Agent created' })
  async createAgent(@Request() req, @Body() dto: CreateAgentDto) {
    try {
      return await this.builderService.createAgent(req.user.userId, dto);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all agents (user-created and templates)' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async listAgents(@Request() req, @Query() query: QueryAgentsDto) {
    return this.builderService.listAgents(req.user.userId, query);
  }

  @Post('templates/:templateId/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create agent from template' })
  @ApiResponse({ status: 201, description: 'Agent created from template' })
  async createFromTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() body: { name?: string },
  ) {
    return this.builderService.createFromTemplate(templateId, req.user.userId, body.name || '');
  }

  // ==================== ALERTS & SUGGESTED ACTIONS (before parameterized routes) ====================

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all alerts for current user' })
  @ApiResponse({ status: 200, description: 'List of alerts with suggested actions' })
  async getAlerts(
    @Request() req,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: number,
  ) {
    return this.builderService.getAlerts(req.user.userId, { status, priority, limit });
  }

  @Get('alerts/:alertId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get alert details with suggested actions' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  async getAlertById(@Request() req, @Param('alertId') alertId: string) {
    return this.builderService.getAlert(alertId, req.user.userId);
  }

  @Post('alerts/:alertId/execute-action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute a suggested action from an alert' })
  @ApiResponse({ status: 200, description: 'Action executed' })
  async executeAlertAction(
    @Request() req,
    @Param('alertId') alertId: string,
    @Body() body: { actionId: string; modifications?: any },
  ) {
    return this.builderService.executeAlertAction(
      alertId,
      body.actionId,
      req.user.userId,
      body.modifications,
    );
  }

  @Patch('alerts/:alertId/dismiss')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dismiss an alert' })
  @ApiResponse({ status: 200, description: 'Alert dismissed' })
  async dismissAlert(@Request() req, @Param('alertId') alertId: string) {
    return this.builderService.dismissAlert(alertId, req.user.userId);
  }

  @Patch('alerts/:alertId/acknowledge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(@Request() req, @Param('alertId') alertId: string) {
    return this.builderService.acknowledgeAlert(alertId, req.user.userId);
  }

  // ==================== AGENT CRUD (parameterized routes last) ====================

  @Get(':agentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get agent details' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  async getAgent(@Param('agentId') agentId: string) {
    return this.builderService.getAgent(agentId);
  }

  @Put(':agentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent configuration' })
  @ApiResponse({ status: 200, description: 'Agent updated' })
  async updateAgent(
    @Request() req,
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.builderService.updateAgent(agentId, req.user.userId, dto);
  }

  @Delete(':agentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiResponse({ status: 200, description: 'Agent deleted' })
  async deleteAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.builderService.deleteAgent(agentId, req.user.userId);
  }

  @Post(':agentId/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish agent (make it active)' })
  @ApiResponse({ status: 200, description: 'Agent published' })
  async publishAgent(@Request() req, @Param('agentId') agentId: string) {
    return this.builderService.publishAgent(agentId, req.user.userId);
  }

  @Patch(':agentId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable agent' })
  @ApiResponse({ status: 200, description: 'Agent toggled' })
  async toggleAgent(
    @Request() req,
    @Param('agentId') agentId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.builderService.toggleAgent(agentId, req.user.userId, body.enabled);
  }

  @Post(':agentId/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run an agent' })
  @ApiResponse({ status: 201, description: 'Agent execution started' })
  async runAgent(
    @Request() req,
    @Param('agentId') agentId: string,
    @Body() dto: RunAgentDto,
  ) {
    return this.builderService.runAgent(agentId, req.user.userId, dto);
  }

  @Get(':agentId/executions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get agent execution history' })
  @ApiResponse({ status: 200, description: 'Execution history' })
  async listExecutions(
    @Param('agentId') agentId: string,
    @Query('limit') limit?: number,
  ) {
    return this.builderService.listExecutions(agentId, limit);
  }
}

