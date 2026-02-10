// Admin Controller - REST API endpoints for admin management
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
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';
import { AdminService } from './admin.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  BulkUpdateConfigDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  ToggleFeatureFlagDto,
  UpdateUserDto,
  InviteUserDto,
  AuditLogQueryDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  UpdateAIConfigDto,
  UpdateMeetingIntelligenceConfigDto,
  ApplicationLogQueryDto,
  CreateSignalRuleDto,
  UpdateSignalRuleDto,
  UpdateAgentConfigDto,
  CreatePlaybookDto,
  UpdatePlaybookDto,
  CreatePlaybookStepDto,
  // Backup DTOs
  CreateBackupDto,
  BackupQueryDto,
  CreateBackupScheduleDto,
  UpdateBackupScheduleDto,
} from './dto';
import { ApplicationLogService } from './application-log.service';
import { SystemSettingsService } from './system-settings.service';
import { DatabaseBackupService } from './database-backup.service';

// Admin role guard
import { SetMetadata } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip roles check for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user?.role);
  }
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly applicationLogService: ApplicationLogService,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly databaseBackupService: DatabaseBackupService,
  ) {}

  // ============================================
  // MAINTENANCE MODE (Public + Admin endpoints)
  // ============================================

  @Public()
  @Get('maintenance-status')
  @ApiOperation({ summary: 'Get maintenance mode status (public, no auth required)' })
  @ApiResponse({ status: 200, description: 'Maintenance mode status' })
  async getMaintenanceStatus() {
    return this.systemSettingsService.getMaintenanceMode();
  }

  @Put('maintenance')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update maintenance mode configuration' })
  @ApiResponse({ status: 200, description: 'Maintenance mode updated' })
  async updateMaintenanceMode(
    @Body() body: { enabled?: boolean; message?: string; estimatedEnd?: string | null },
    @Request() req,
  ) {
    await this.systemSettingsService.setMaintenanceMode(body, req.user.userId);
    const updated = await this.systemSettingsService.getMaintenanceMode();
    return { success: true, ...updated };
  }

  // ============================================
  // DASHBOARD
  // ============================================

  @Get('dashboard')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ============================================
  // SYSTEM CONFIGURATION
  // ============================================

  @Get('config')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all system configurations' })
  async getAllConfigs(@Query('category') category?: string) {
    return this.adminService.getAllConfigs(category);
  }

  // AI CONFIGURATION - must come before config/:key
  @Get('config/ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get AI configuration' })
  async getAIConfig() {
    return this.adminService.getAIConfig();
  }

  @Put('config/ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update AI configuration' })
  async updateAIConfig(@Body() dto: UpdateAIConfigDto, @Request() req) {
    return this.adminService.updateAIConfig(dto, req.user.userId);
  }

  // MEETING INTELLIGENCE CONFIGURATION - must come before config/:key
  @Get('config/meeting-intelligence')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get Meeting Intelligence configuration' })
  async getMeetingIntelligenceConfig() {
    return this.adminService.getMeetingIntelligenceConfig();
  }

  @Put('config/meeting-intelligence')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update Meeting Intelligence configuration' })
  async updateMeetingIntelligenceConfig(
    @Body() dto: UpdateMeetingIntelligenceConfigDto,
    @Request() req,
  ) {
    return this.adminService.updateMeetingIntelligenceConfig(dto, req.user.userId);
  }

  @Post('config/bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Bulk update configurations' })
  async bulkUpdateConfigs(@Body() dto: BulkUpdateConfigDto, @Request() req) {
    return this.adminService.bulkUpdateConfigs(dto, req.user.userId);
  }

  @Post('config')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new configuration' })
  async createConfig(@Body() dto: CreateSystemConfigDto, @Request() req) {
    return this.adminService.createConfig(dto, req.user.userId);
  }

  // Parameterized route - must come AFTER specific routes like config/ai
  @Get('config/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific configuration' })
  async getConfig(@Param('key') key: string) {
    return this.adminService.getConfig(key);
  }

  @Put('config/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a configuration' })
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @Request() req,
  ) {
    return this.adminService.updateConfig(key, dto.value, req.user.userId);
  }

  @Delete('config/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a configuration' })
  async deleteConfig(@Param('key') key: string, @Request() req) {
    return this.adminService.deleteConfig(key, req.user.userId);
  }

  // ============================================
  // FEATURE FLAGS
  // ============================================

  @Get('features')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAllFeatureFlags(@Query('category') category?: string) {
    return this.adminService.getAllFeatureFlags(category);
  }

  @Get('features/:key')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a specific feature flag' })
  async getFeatureFlag(@Param('key') key: string) {
    return this.adminService.getFeatureFlag(key);
  }

  @Post('features')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new feature flag' })
  async createFeatureFlag(@Body() dto: CreateFeatureFlagDto, @Request() req) {
    return this.adminService.createFeatureFlag(dto, req.user.userId);
  }

  @Put('features/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a feature flag' })
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Request() req,
  ) {
    return this.adminService.updateFeatureFlag(key, dto, req.user.userId);
  }

  @Patch('features/:key/toggle')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle a feature flag' })
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body() dto: ToggleFeatureFlagDto,
    @Request() req,
  ) {
    return this.adminService.toggleFeatureFlag(key, dto.enabled, req.user.userId);
  }

  @Delete('features/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a feature flag' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFeatureFlag(@Param('key') key: string, @Request() req) {
    return this.adminService.deleteFeatureFlag(key, req.user.userId);
  }

  @Get('features/:key/check')
  @ApiOperation({ summary: 'Check if a feature is enabled for current user' })
  async checkFeatureEnabled(@Param('key') key: string, @Request() req) {
    const enabled = await this.adminService.isFeatureEnabled(
      key,
      req.user?.userId,
      req.user?.role,
    );
    return { key, enabled };
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  @Get('users')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all users (managers see only their org)' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Request() req?,
  ) {
    // Managers can only see users in their organization
    const userRole = req?.user?.role;
    const userOrgId = req?.user?.organizationId;

    // If user is MANAGER (not ADMIN), restrict to their organization
    let effectiveOrgId = organizationId;
    if (userRole === 'MANAGER' && !['ADMIN'].includes(userRole)) {
      effectiveOrgId = userOrgId; // Force filter to their org
    }

    return this.adminService.getAllUsers(page, pageSize, search, role, status, effectiveOrgId);
  }

  @Get('users/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a specific user' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a user' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req,
  ) {
    return this.adminService.updateUser(id, dto, req.user.userId);
  }

  @Post('users/:id/suspend')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Suspend a user' })
  async suspendUser(@Param('id') id: string, @Request() req) {
    return this.adminService.suspendUser(id, req.user.userId);
  }

  @Post('users/:id/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate a user' })
  async activateUser(@Param('id') id: string, @Request() req) {
    return this.adminService.activateUser(id, req.user.userId);
  }

  @Delete('users/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteUser(id, req.user.userId);
  }

  @Post('users/:id/reset-password')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Send password reset email to user' })
  async resetUserPassword(@Param('id') id: string, @Request() req) {
    return this.adminService.resetUserPassword(id, req.user.userId);
  }

  // ============================================
  // INTEGRATIONS
  // ============================================

  @Get('integrations')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all integrations' })
  async getAllIntegrations() {
    return this.adminService.getAllIntegrations();
  }

  @Get('integrations/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific integration' })
  async getIntegration(@Param('provider') provider: string) {
    return this.adminService.getIntegration(provider);
  }

  @Post('integrations')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new integration' })
  async createIntegration(
    @Body() dto: CreateIntegrationDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.adminService.createIntegration(dto, req.user.userId, organizationId);
  }

  @Put('integrations/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an integration' })
  async updateIntegration(
    @Param('provider') provider: string,
    @Body() dto: UpdateIntegrationDto,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.adminService.updateIntegration(provider, dto, req.user.userId, organizationId);
  }

  @Delete('integrations/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an integration' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(
    @Param('provider') provider: string,
    @Request() req,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.adminService.deleteIntegration(provider, req.user.userId, organizationId);
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  @Get('audit-logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  // ============================================
  // APPLICATION LOGS (Errors, Transactions, System Logs)
  // ============================================

  @Get('application-logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get application logs with filters' })
  @ApiResponse({ status: 200, description: 'Application logs retrieved successfully' })
  async getApplicationLogs(@Query() query: ApplicationLogQueryDto) {
    return this.applicationLogService.getLogs(query);
  }

  @Get('application-logs/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get application log statistics' })
  @ApiResponse({ status: 200, description: 'Log statistics retrieved successfully' })
  async getApplicationLogStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.applicationLogService.getStats(start, end);
  }

  @Get('application-logs/filters')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get available filter options for logs' })
  @ApiResponse({ status: 200, description: 'Filter options retrieved successfully' })
  async getApplicationLogFilters() {
    return this.applicationLogService.getFilterOptions();
  }

  @Get('application-logs/trace/:correlationId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all logs for a correlation ID (trace)' })
  @ApiResponse({ status: 200, description: 'Trace logs retrieved successfully' })
  async getLogTrace(@Param('correlationId') correlationId: string) {
    return this.applicationLogService.getLogsByCorrelationId(correlationId);
  }

  @Get('application-logs/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a single application log by ID' })
  @ApiResponse({ status: 200, description: 'Log retrieved successfully' })
  async getApplicationLog(@Param('id') id: string) {
    return this.applicationLogService.getLogById(id);
  }

  @Delete('application-logs/cleanup')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete old logs (maintenance). Use includeAll=true to also delete ERROR/WARN logs.' })
  @ApiResponse({ status: 200, description: 'Old logs deleted successfully' })
  async cleanupOldLogs(
    @Query('daysOld') daysOld?: number,
    @Query('includeAll') includeAll?: string,
  ) {
    // includeAll=true will also delete ERROR and WARN logs (by default they're preserved)
    const shouldIncludeAll = includeAll === 'true';
    const deleted = await this.applicationLogService.deleteOldLogs(daysOld || 90, shouldIncludeAll);
    return { success: true, deletedCount: deleted, daysOld: daysOld || 90, includeAll: shouldIncludeAll };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  @Post('initialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Initialize default configurations' })
  async initialize() {
    await this.adminService.initializeDefaultConfigs();
    return { success: true, message: 'Default configurations initialized' };
  }

  // ============================================
  // SYSTEM SETTINGS (Email, Security, etc.)
  // ============================================

  @Get('settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'All system settings retrieved' })
  async getAllSettings() {
    return this.systemSettingsService.getAll();
  }

  @Get('settings/category/:category')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get settings by category' })
  @ApiResponse({ status: 200, description: 'Settings for category retrieved' })
  async getSettingsByCategory(@Param('category') category: string) {
    return this.systemSettingsService.getByCategory(category);
  }

  @Get('settings/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific setting value' })
  @ApiResponse({ status: 200, description: 'Setting value retrieved' })
  async getSetting(@Param('key') key: string) {
    const value = await this.systemSettingsService.get(key);
    return { key, value };
  }

  @Put('settings/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: any },
    @Request() req,
  ) {
    await this.systemSettingsService.set(key, body.value, req.user.userId);
    return { success: true, key, value: body.value };
  }

  @Post('settings/toggle/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle a boolean setting' })
  @ApiResponse({ status: 200, description: 'Setting toggled successfully' })
  async toggleSetting(@Param('key') key: string, @Request() req) {
    const currentValue = await this.systemSettingsService.get<boolean>(key, true);
    const newValue = !currentValue;
    await this.systemSettingsService.set(key, newValue, req.user.userId);
    return { success: true, key, value: newValue, previousValue: currentValue };
  }

  // ============================================
  // CRM MODE SETTINGS (Public endpoint for UI)
  // ============================================

  @Get('crm-modes')
  @ApiOperation({ summary: 'Get enabled CRM modes for the mode toggle (public)' })
  @ApiResponse({ status: 200, description: 'Enabled CRM modes retrieved' })
  async getEnabledCrmModes() {
    // This endpoint is accessible to all authenticated users (not just admins)
    // so the frontend can know which modes to display
    return this.systemSettingsService.getEnabledCrmModes();
  }

  @Patch('crm-modes')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update enabled CRM modes' })
  @ApiResponse({ status: 200, description: 'CRM modes updated successfully' })
  async updateCrmModes(
    @Body() body: { local?: boolean; salesforce?: boolean; oracle?: boolean; oracle_portal?: boolean },
    @Request() req,
  ) {
    await this.systemSettingsService.setEnabledCrmModes(body, req.user.userId);
    const updated = await this.systemSettingsService.getEnabledCrmModes();
    return { success: true, modes: updated };
  }

  // ============================================
  // SIGNAL RULES
  // ============================================

  @Get('signal-rules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all signal rules' })
  @ApiResponse({ status: 200, description: 'Signal rules retrieved' })
  async getSignalRules(@Query('isActive') isActive?: string) {
    return this.adminService.getSignalRules(isActive === 'true' ? true : isActive === 'false' ? false : undefined);
  }

  @Get('signal-rules/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific signal rule' })
  @ApiResponse({ status: 200, description: 'Signal rule retrieved' })
  async getSignalRule(@Param('id') id: string) {
    return this.adminService.getSignalRule(id);
  }

  @Post('signal-rules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new signal rule' })
  @ApiResponse({ status: 201, description: 'Signal rule created' })
  async createSignalRule(@Body() dto: CreateSignalRuleDto, @Request() req) {
    return this.adminService.createSignalRule(dto, req.user.userId);
  }

  @Put('signal-rules/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a signal rule' })
  @ApiResponse({ status: 200, description: 'Signal rule updated' })
  async updateSignalRule(
    @Param('id') id: string,
    @Body() dto: UpdateSignalRuleDto,
    @Request() req,
  ) {
    return this.adminService.updateSignalRule(id, dto, req.user.userId);
  }

  @Delete('signal-rules/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a signal rule' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSignalRule(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteSignalRule(id, req.user.userId);
  }

  @Patch('signal-rules/:id/toggle')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle a signal rule active status' })
  @ApiResponse({ status: 200, description: 'Signal rule toggled' })
  async toggleSignalRule(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Request() req,
  ) {
    return this.adminService.toggleSignalRule(id, body.isActive, req.user.userId);
  }

  // ============================================
  // AGENT CONFIGURATION
  // ============================================

  @Get('agents')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all agent configurations' })
  @ApiResponse({ status: 200, description: 'Agent configurations retrieved' })
  async getAgentConfigs() {
    return this.adminService.getAgentConfigs();
  }

  @Get('agents/:type')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific agent configuration' })
  @ApiResponse({ status: 200, description: 'Agent configuration retrieved' })
  async getAgentConfig(@Param('type') agentType: string) {
    return this.adminService.getAgentConfig(agentType);
  }

  @Put('agents/:type')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an agent configuration' })
  @ApiResponse({ status: 200, description: 'Agent configuration updated' })
  async updateAgentConfig(
    @Param('type') agentType: string,
    @Body() dto: UpdateAgentConfigDto,
    @Request() req,
  ) {
    return this.adminService.updateAgentConfig(agentType, dto, req.user.userId);
  }

  @Post('agents/:type/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test an agent' })
  @ApiResponse({ status: 200, description: 'Agent test results' })
  async testAgent(@Param('type') agentType: string, @Request() req) {
    return this.adminService.testAgent(agentType, req.user.userId);
  }

  @Get('agents/:type/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get agent execution statistics' })
  @ApiResponse({ status: 200, description: 'Agent statistics retrieved' })
  async getAgentStats(@Param('type') agentType: string) {
    return this.adminService.getAgentStats(agentType);
  }

  @Post('agents/initialize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Initialize default agent configurations' })
  @ApiResponse({ status: 200, description: 'Default agent configurations initialized' })
  async initializeAgentConfigs() {
    await this.adminService.initializeDefaultAgentConfigs();
    return { success: true, message: 'Default agent configurations initialized' };
  }

  // ============================================
  // PLAYBOOKS
  // ============================================

  @Get('playbooks')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all playbooks' })
  @ApiResponse({ status: 200, description: 'Playbooks retrieved' })
  async getPlaybooks(@Query('targetDealType') targetDealType?: string) {
    return this.adminService.getPlaybooks(targetDealType);
  }

  @Get('playbooks/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a specific playbook' })
  @ApiResponse({ status: 200, description: 'Playbook retrieved' })
  async getPlaybook(@Param('id') id: string) {
    return this.adminService.getPlaybook(id);
  }

  @Post('playbooks')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new playbook' })
  @ApiResponse({ status: 201, description: 'Playbook created' })
  async createPlaybook(@Body() dto: CreatePlaybookDto, @Request() req) {
    return this.adminService.createPlaybook(dto, req.user.userId);
  }

  @Put('playbooks/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a playbook' })
  @ApiResponse({ status: 200, description: 'Playbook updated' })
  async updatePlaybook(
    @Param('id') id: string,
    @Body() dto: UpdatePlaybookDto,
    @Request() req,
  ) {
    return this.adminService.updatePlaybook(id, dto, req.user.userId);
  }

  @Delete('playbooks/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a playbook' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlaybook(@Param('id') id: string, @Request() req) {
    return this.adminService.deletePlaybook(id, req.user.userId);
  }

  @Post('playbooks/:id/steps')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Add a step to a playbook' })
  @ApiResponse({ status: 201, description: 'Playbook step added' })
  async addPlaybookStep(
    @Param('id') playbookId: string,
    @Body() dto: CreatePlaybookStepDto,
    @Request() req,
  ) {
    return this.adminService.addPlaybookStep(playbookId, dto, req.user.userId);
  }

  @Put('playbooks/:id/steps/:stepId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a playbook step' })
  @ApiResponse({ status: 200, description: 'Playbook step updated' })
  async updatePlaybookStep(
    @Param('stepId') stepId: string,
    @Body() dto: CreatePlaybookStepDto,
    @Request() req,
  ) {
    return this.adminService.updatePlaybookStep(stepId, dto, req.user.userId);
  }

  @Delete('playbooks/:id/steps/:stepId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a playbook step' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlaybookStep(@Param('stepId') stepId: string, @Request() req) {
    return this.adminService.deletePlaybookStep(stepId, req.user.userId);
  }

  // ============================================
  // COACHING CONFIGURATION
  // ============================================

  @Get('coaching-config')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get coaching configuration for sales team' })
  @ApiResponse({ status: 200, description: 'Coaching configuration retrieved' })
  async getCoachingConfig() {
    return this.adminService.getCoachingConfig();
  }

  @Put('coaching-config')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update coaching configuration' })
  @ApiResponse({ status: 200, description: 'Coaching configuration updated' })
  async updateCoachingConfig(@Body() config: any, @Request() req) {
    return this.adminService.updateCoachingConfig(config, req.user.userId);
  }

  // ============================================
  // INTEGRATION HEALTH
  // ============================================

  @Get('dashboard/health')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get overall system and integration health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getSystemHealth() {
    return this.adminService.getIntegrationHealth();
  }

  @Post('integrations/:provider/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test a specific integration connection' })
  @ApiResponse({ status: 200, description: 'Integration test results' })
  async testIntegration(@Param('provider') provider: string, @Request() req) {
    return this.adminService.testIntegration(provider, req.user.userId);
  }

  // ============================================
  // MANAGER INSIGHTS (O3 Dashboard)
  // ============================================

  @Get('insights/recommendations')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get recommendation metrics for O3 dashboard' })
  @ApiResponse({ status: 200, description: 'Recommendation metrics retrieved' })
  async getInsightsRecommendations(
    @Query('timeframe') timeframe?: number,
  ) {
    return this.adminService.getInsightsRecommendations(timeframe || 30);
  }

  @Get('insights/rep-comparison')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get rep AI adoption comparison for O3 dashboard' })
  @ApiResponse({ status: 200, description: 'Rep comparison data retrieved' })
  async getInsightsRepComparison(
    @Query('timeframe') timeframe?: number,
  ) {
    return this.adminService.getInsightsRepComparison(timeframe || 30);
  }

  @Get('insights/deal-outcomes')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get deal outcomes with AI attribution for O3 dashboard' })
  @ApiResponse({ status: 200, description: 'Deal outcomes data retrieved' })
  async getInsightsDealOutcomes(
    @Query('timeframe') timeframe?: number,
  ) {
    return this.adminService.getInsightsDealOutcomes(timeframe || 90);
  }

  @Get('insights/trends')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get recommendation trends over time for O3 dashboard' })
  @ApiResponse({ status: 200, description: 'Trend data retrieved' })
  async getInsightsTrends(
    @Query('timeframe') timeframe?: number,
    @Query('granularity') granularity?: 'daily' | 'weekly',
  ) {
    return this.adminService.getInsightsTrends(
      timeframe || 30,
      granularity || 'daily',
    );
  }

  @Get('insights/agent-performance')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get agent performance metrics for O3 dashboard' })
  @ApiResponse({ status: 200, description: 'Agent performance data retrieved' })
  async getInsightsAgentPerformance(
    @Query('timeframe') timeframe?: number,
  ) {
    return this.adminService.getInsightsAgentPerformance(timeframe || 30);
  }

  // ============================================
  // DATABASE BACKUPS
  // ============================================

  @Get('backups')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get list of database backups' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async getBackups(@Query() query: BackupQueryDto) {
    return this.databaseBackupService.getBackups(query);
  }

  @Get('backups/stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({ status: 200, description: 'Backup statistics' })
  async getBackupStats() {
    const stats = await this.databaseBackupService.getBackupStats();
    // Convert BigInt to string for JSON serialization
    return {
      ...stats,
      totalSizeBytes: stats.totalSizeBytes.toString(),
    };
  }

  // Backup Schedules - MUST be defined BEFORE :id routes to avoid route conflicts
  @Get('backups/schedules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get backup schedules' })
  @ApiResponse({ status: 200, description: 'List of backup schedules' })
  async getBackupSchedules() {
    return this.databaseBackupService.getSchedules();
  }

  @Post('backups/schedules')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a backup schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createBackupSchedule(@Body() dto: CreateBackupScheduleDto, @Request() req) {
    return this.databaseBackupService.createSchedule(dto, req.user.userId);
  }

  @Patch('backups/schedules/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a backup schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateBackupSchedule(@Param('id') id: string, @Body() dto: UpdateBackupScheduleDto) {
    return this.databaseBackupService.updateSchedule(id, dto);
  }

  @Delete('backups/schedules/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a backup schedule' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBackupSchedule(@Param('id') id: string) {
    return this.databaseBackupService.deleteSchedule(id);
  }

  @Get('backups/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get a specific backup' })
  @ApiResponse({ status: 200, description: 'Backup details' })
  async getBackup(@Param('id') id: string) {
    return this.databaseBackupService.getBackup(id);
  }

  @Post('backups')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new database backup' })
  @ApiResponse({ status: 201, description: 'Backup initiated' })
  async createBackup(@Body() dto: CreateBackupDto, @Request() req) {
    return this.databaseBackupService.createBackup(dto, req.user.userId);
  }

  @Delete('backups/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  async deleteBackup(@Param('id') id: string, @Request() req) {
    return this.databaseBackupService.deleteBackup(id, req.user.userId);
  }

  @Get('backups/:id/download')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Download a backup file' })
  @ApiResponse({ status: 200, description: 'Backup file stream' })
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.databaseBackupService.getBackupFilePath(id);
    const filename = filePath.split('/').pop();
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/gzip');
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Post('backups/cleanup')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Clean up expired backups' })
  @ApiResponse({ status: 200, description: 'Cleanup result' })
  async cleanupExpiredBackups() {
    return this.databaseBackupService.cleanupExpiredBackups();
  }

  // ============================================
  // LOOKER BI DASHBOARDS
  // ============================================

  @Get('looker/dashboards')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get Looker BI dashboards and looks' })
  @ApiResponse({ status: 200, description: 'Looker dashboards' })
  async getLookerDashboards(@CurrentOrganization() orgId: string) {
    return this.adminService.getLookerDashboards(orgId);
  }

  // ============================================
  // INTEGRATION SYNC LOGS & MAPPINGS
  // ============================================

  @Get('integration-sync-logs')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get integration sync logs with filters' })
  @ApiResponse({ status: 200, description: 'Integration sync logs retrieved' })
  async getIntegrationSyncLogs(
    @Query('provider') provider?: string,
    @Query('eventType') eventType?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.adminService.getIntegrationSyncLogs({
      organizationId,
      provider,
      eventType,
      status,
      entityType,
      entityId,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('integration-mappings/:entityType/:entityId')
  @Roles('ADMIN', 'MANAGER', 'USER')
  @ApiOperation({ summary: 'Get external ID mappings for a CRM entity' })
  @ApiResponse({ status: 200, description: 'Entity mappings retrieved' })
  async getIntegrationMappings(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.adminService.getIntegrationEntityMappings(entityType, entityId, organizationId);
  }

  @Get('integration-attachments/:entityType/:entityId')
  @Roles('ADMIN', 'MANAGER', 'USER')
  @ApiOperation({ summary: 'Get integration file attachments for a CRM entity' })
  @ApiResponse({ status: 200, description: 'Integration attachments retrieved' })
  async getIntegrationAttachments(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.adminService.getIntegrationAttachments(entityType, entityId, organizationId);
  }

  // ============================================
  // SSO USER DIRECTORY SYNC
  // ============================================

  @Get('sso/users/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get users from SSO provider (okta or auth0)' })
  @ApiResponse({ status: 200, description: 'SSO users list' })
  async getSSOUsers(
    @Param('provider') provider: string,
    @CurrentOrganization() orgId: string,
  ) {
    if (provider !== 'okta' && provider !== 'auth0') {
      return { error: 'Invalid provider. Use okta or auth0.' };
    }
    return this.adminService.getSSOUsers(orgId, provider);
  }

  @Post('sso/sync/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sync users from SSO provider into team' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncUsersFromSSO(
    @Param('provider') provider: string,
    @CurrentOrganization() orgId: string,
  ) {
    if (provider !== 'okta' && provider !== 'auth0') {
      return { error: 'Invalid provider. Use okta or auth0.' };
    }
    return this.adminService.syncUsersFromSSO(orgId, provider);
  }
}
