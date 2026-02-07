// Licensing Controller - REST API endpoints for license management
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { LicensingService } from './licensing.service';
import { RevenueForecastService } from './revenue-forecast.service';
import {
  CreateLicenseTypeDto,
  UpdateLicenseTypeDto,
  CreateLicenseFeatureDto,
  UpdateLicenseFeatureDto,
  AssignLicenseDto,
  UpdateUserLicenseDto,
  RenewLicenseDto,
  RevokeLicenseDto,
  SuspendLicenseDto,
  ChangeLicenseTypeDto,
  CheckFeatureAccessDto,
  CheckMultipleFeaturesDto,
  RecordUsageDto,
  LicenseQueryDto,
  AuditLogQueryDto,
} from './dto';
import { LicenseStatus } from '@prisma/client';

// Role-based access control
import { SetMetadata } from '@nestjs/common';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return roles.includes(user?.role);
  }
}

// ============================================
// PUBLIC CONTROLLER (No Auth Required)
// ============================================
@ApiTags('Licensing')
@Controller('licensing/public')
export class PublicLicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get all public license types (no auth required)' })
  @ApiResponse({ status: 200, description: 'List of public license types' })
  async getPublicLicenseTypes() {
    const types = await this.licensingService.getAllLicenseTypes();
    // Only return public, active types
    return types.filter(t => t.isPublic && t.isActive);
  }
}

@ApiTags('Licensing')
@ApiBearerAuth()
@Controller('licensing')
@UseGuards(JwtAuthGuard)
export class LicensingController {
  constructor(
    private readonly licensingService: LicensingService,
    private readonly revenueForecastService: RevenueForecastService,
  ) {}

  // ============================================
  // DASHBOARD
  // ============================================

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get licensing dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboard() {
    return this.licensingService.getDashboardStats();
  }

  @Post('forecast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate AI-powered revenue forecast' })
  @ApiResponse({ status: 200, description: 'Revenue forecast with insights' })
  async generateForecast(@Body() body: { monthlyRevenue: number; userCount: number }) {
    return this.revenueForecastService.generateForecast(body.monthlyRevenue, body.userCount);
  }

  // ============================================
  // LICENSE TYPES (Admin only)
  // ============================================

  @Get('types')
  @ApiOperation({ summary: 'Get all license types' })
  @ApiResponse({ status: 200, description: 'List of license types with features' })
  async getAllLicenseTypes() {
    return this.licensingService.getAllLicenseTypes();
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Get a specific license type' })
  @ApiResponse({ status: 200, description: 'License type details' })
  async getLicenseType(@Param('id') id: string) {
    return this.licensingService.getLicenseType(id);
  }

  @Post('types')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new license type' })
  @ApiResponse({ status: 201, description: 'License type created' })
  async createLicenseType(@Body() dto: CreateLicenseTypeDto, @Request() req) {
    return this.licensingService.createLicenseType(dto, req.user.userId);
  }

  @Put('types/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a license type' })
  @ApiResponse({ status: 200, description: 'License type updated' })
  async updateLicenseType(
    @Param('id') id: string,
    @Body() dto: UpdateLicenseTypeDto,
    @Request() req,
  ) {
    return this.licensingService.updateLicenseType(id, dto, req.user.userId);
  }

  @Delete('types/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a license type' })
  @ApiResponse({ status: 204, description: 'License type deleted' })
  async deleteLicenseType(@Param('id') id: string, @Request() req) {
    return this.licensingService.deleteLicenseType(id, req.user.userId);
  }

  // ============================================
  // LICENSE FEATURES (Admin only)
  // ============================================

  @Get('features')
  @ApiOperation({ summary: 'Get all license features' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of license features' })
  async getAllFeatures(@Query('category') category?: string) {
    return this.licensingService.getAllFeatures(category);
  }

  @Get('features/:id')
  @ApiOperation({ summary: 'Get a specific feature' })
  @ApiResponse({ status: 200, description: 'Feature details' })
  async getFeature(@Param('id') id: string) {
    return this.licensingService.getFeature(id);
  }

  @Post('features')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created' })
  async createFeature(@Body() dto: CreateLicenseFeatureDto, @Request() req) {
    return this.licensingService.createFeature(dto, req.user.userId);
  }

  @Put('features/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a feature' })
  @ApiResponse({ status: 200, description: 'Feature updated' })
  async updateFeature(
    @Param('id') id: string,
    @Body() dto: UpdateLicenseFeatureDto,
    @Request() req,
  ) {
    return this.licensingService.updateFeature(id, dto, req.user.userId);
  }

  @Delete('features/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature' })
  @ApiResponse({ status: 204, description: 'Feature deleted' })
  async deleteFeature(@Param('id') id: string, @Request() req) {
    return this.licensingService.deleteFeature(id, req.user.userId);
  }

  // ============================================
  // USER LICENSES (Admin/Manager)
  // ============================================

  @Get('user-licenses')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all user license assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: LicenseStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of user licenses' })
  async getAllUserLicenses(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: LicenseStatus,
    @Query('search') search?: string,
  ) {
    return this.licensingService.getAllUserLicenses(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      status,
      search,
    );
  }

  @Get('user-licenses/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a specific user license' })
  @ApiResponse({ status: 200, description: 'User license details' })
  async getUserLicense(@Param('id') id: string) {
    return this.licensingService.getUserLicense(id);
  }

  @Post('user-licenses')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a license to a user' })
  @ApiResponse({ status: 201, description: 'License assigned' })
  async assignLicense(@Body() dto: AssignLicenseDto, @Request() req) {
    return this.licensingService.assignLicense(dto, req.user.userId);
  }

  @Put('user-licenses/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a user license' })
  @ApiResponse({ status: 200, description: 'User license updated' })
  async updateUserLicense(
    @Param('id') id: string,
    @Body() dto: UpdateUserLicenseDto,
    @Request() req,
  ) {
    return this.licensingService.updateUserLicense(id, dto, req.user.userId);
  }

  @Post('user-licenses/:id/renew')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Renew a user license' })
  @ApiResponse({ status: 200, description: 'License renewed' })
  async renewLicense(
    @Param('id') id: string,
    @Body() dto: RenewLicenseDto,
    @Request() req,
  ) {
    return this.licensingService.renewLicense(id, dto.durationDays, req.user.userId);
  }

  @Post('user-licenses/:id/revoke')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a user license' })
  @ApiResponse({ status: 204, description: 'License revoked' })
  async revokeLicense(
    @Param('id') id: string,
    @Body() dto: RevokeLicenseDto,
    @Request() req,
  ) {
    return this.licensingService.revokeLicense(id, dto.reason, req.user.userId);
  }

  @Post('user-licenses/:id/suspend')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspend a user license' })
  @ApiResponse({ status: 204, description: 'License suspended' })
  async suspendLicense(
    @Param('id') id: string,
    @Body() dto: SuspendLicenseDto,
    @Request() req,
  ) {
    return this.licensingService.suspendLicense(id, dto.reason, req.user.userId);
  }

  @Post('user-licenses/:id/resume')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resume a suspended user license' })
  @ApiResponse({ status: 204, description: 'License resumed' })
  async resumeLicense(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.licensingService.resumeLicense(id, req.user.userId);
  }

  @Delete('user-licenses/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign/delete a user license completely' })
  @ApiResponse({ status: 204, description: 'License unassigned and deleted' })
  async unassignLicense(
    @Param('id') id: string,
    @Body() dto: { reason?: string },
    @Request() req,
  ) {
    return this.licensingService.unassignLicense(id, dto.reason || 'Unassigned by admin', req.user.userId);
  }

  @Post('user-licenses/:id/change-type')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Change license type (upgrade/downgrade)' })
  @ApiResponse({ status: 200, description: 'License type changed successfully' })
  async changeLicenseType(
    @Param('id') id: string,
    @Body() dto: { newLicenseTypeId: string; reason?: string },
    @Request() req,
  ) {
    return this.licensingService.changeLicenseType(id, dto.newLicenseTypeId, dto.reason, req.user.userId);
  }

  // ============================================
  // CURRENT USER LICENSE & FEATURE ACCESS
  // ============================================

  @Get('my-license')
  @ApiOperation({ summary: 'Get current user\'s license' })
  @ApiResponse({ status: 200, description: 'Current user license details' })
  async getMyLicense(@Request() req) {
    return this.licensingService.getMyLicense(req.user.userId);
  }

  @Get('my-features')
  @ApiOperation({ summary: 'Get all features available to current user' })
  @ApiResponse({ status: 200, description: 'List of available features' })
  async getMyFeatures(@Request() req) {
    return this.licensingService.getMyFeatures(req.user.userId);
  }

  // AI Generated Code by Deloitte + Cursor (BEGIN)
  @Post('sync-entitlements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sync entitlements for all active licenses (Admin only)' })
  @ApiResponse({ status: 200, description: 'Entitlements synced successfully' })
  async syncAllEntitlements() {
    return this.licensingService.syncAllLicenseEntitlements();
  }

  @Post('sync-entitlements/:licenseId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sync entitlements for a specific license (Admin only)' })
  @ApiResponse({ status: 200, description: 'License entitlements synced' })
  async syncLicenseEntitlements(@Param('licenseId') licenseId: string) {
    return this.licensingService.syncLicenseEntitlements(licenseId);
  }

  @Get('health/entitlements')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check entitlement health for all licenses (Admin only)' })
  @ApiResponse({ status: 200, description: 'Entitlement health check results' })
  async checkEntitlementHealth() {
    const licenses = await this.licensingService.getAllUserLicenses(1, 1000);
    
    const healthIssues: Array<{
      licenseId: string;
      userId: string;
      userEmail: string;
      licenseType: string;
      expectedFeatures: number;
      actualEntitlements: number;
      missing: number;
    }> = [];
    
    for (const license of licenses.licenses) {
      const expectedFeatures = license.licenseType.features.length;
      const actualEntitlements = license.entitlements.length;
      
      if (actualEntitlements < expectedFeatures) {
        healthIssues.push({
          licenseId: license.id,
          userId: license.userId,
          userEmail: license.user.email,
          licenseType: license.licenseType.name,
          expectedFeatures,
          actualEntitlements,
          missing: expectedFeatures - actualEntitlements,
        });
      }
    }
    
    return {
      status: healthIssues.length === 0 ? 'healthy' : 'issues_found',
      totalLicenses: licenses.pagination.total,
      issuesFound: healthIssues.length,
      issues: healthIssues,
    };
  }
  // AI Generated Code by Deloitte + Cursor (END)

  @Post('apply-key')
  @ApiOperation({ summary: 'Apply/activate a license key for current user' })
  @ApiResponse({ status: 200, description: 'License activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid license key or already in use' })
  async applyLicenseKey(
    @Body() dto: { licenseKey: string },
    @Request() req,
  ) {
    return this.licensingService.applyLicenseKey(req.user.userId, dto.licenseKey);
  }

  @Post('generate-keys')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate pre-assigned license keys' })
  @ApiResponse({ status: 201, description: 'License keys generated' })
  async generateLicenseKeys(
    @Body() dto: {
      licenseTypeId: string;
      count: number;
      durationDays?: number;
      isTrial?: boolean;
      notes?: string;
    },
    @Request() req,
  ) {
    return this.licensingService.generateLicenseKeys(
      dto.licenseTypeId,
      dto.count,
      req.user.userId,
      {
        durationDays: dto.durationDays,
        isTrial: dto.isTrial,
        notes: dto.notes,
      },
    );
  }

  @Get('pre-generated-keys')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all pre-generated license keys' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: AVAILABLE, CLAIMED, EXPIRED, REVOKED' })
  @ApiQuery({ name: 'licenseTypeId', required: false })
  @ApiResponse({ status: 200, description: 'List of pre-generated license keys' })
  async getPreGeneratedKeys(
    @Query('status') status?: string,
    @Query('licenseTypeId') licenseTypeId?: string,
  ) {
    return this.licensingService.getPreGeneratedKeys(status, licenseTypeId);
  }

  @Post('assign-key-to-user')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a pre-generated license key to a user' })
  @ApiResponse({ status: 200, description: 'License key assigned to user' })
  async assignKeyToUser(
    @Body() dto: { licenseKey: string; userId: string },
    @Request() req,
  ) {
    return this.licensingService.assignKeyToUser(dto.licenseKey, dto.userId, req.user.userId);
  }

  @Put('pre-generated-keys/:id/assign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a pre-generated license key by ID to a user' })
  @ApiResponse({ status: 200, description: 'License key assigned to user' })
  async assignPreGeneratedKeyById(
    @Param('id') id: string,
    @Body() dto: { userId: string },
    @Request() req,
  ) {
    return this.licensingService.assignPreGeneratedKeyToUser(id, dto.userId, req.user.userId);
  }

  @Delete('pre-generated-keys/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Revoke a pre-generated license key' })
  @ApiResponse({ status: 200, description: 'License key revoked' })
  async revokePreGeneratedKey(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.licensingService.revokePreGeneratedKey(id, req.user.userId);
  }

  @Post('check-access')
  @ApiOperation({ summary: 'Check if current user has access to a feature' })
  @ApiResponse({ status: 200, description: 'Access check result' })
  async checkFeatureAccess(@Body() dto: CheckFeatureAccessDto, @Request() req) {
    return this.licensingService.checkFeatureAccess(req.user.userId, dto.featureKey);
  }

  @Post('check-multiple')
  @ApiOperation({ summary: 'Check access to multiple features' })
  @ApiResponse({ status: 200, description: 'Access check results for multiple features' })
  async checkMultipleFeatures(@Body() dto: CheckMultipleFeaturesDto, @Request() req) {
    return this.licensingService.checkMultipleFeatures(req.user.userId, dto.featureKeys);
  }

  @Post('record-usage')
  @ApiOperation({ summary: 'Record feature usage' })
  @ApiResponse({ status: 200, description: 'Usage recorded' })
  async recordUsage(@Body() dto: RecordUsageDto, @Request() req) {
    await this.licensingService.recordUsage(
      req.user.userId,
      dto.featureKey,
      dto.usageCount ?? 1,
      {
        action: dto.action,
        resourceId: dto.resourceId,
        resourceType: dto.resourceType,
        ...dto.metadata,
      },
    );
    return { success: true };
  }

  // ============================================
  // LICENSE VALIDATION
  // ============================================

  @Get('validate/:licenseKey')
  @ApiOperation({ summary: 'Validate a license key' })
  @ApiResponse({ status: 200, description: 'License validation result' })
  async validateLicenseKey(@Param('licenseKey') licenseKey: string) {
    return this.licensingService.validateLicenseKey(licenseKey);
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  @Get('audit-logs')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get license audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.licensingService.getLicenseAuditLogs(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
      entityType,
      action,
    );
  }
}
