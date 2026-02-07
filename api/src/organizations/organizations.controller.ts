// Organization Controller - API endpoints for organization management
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
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

// Role-based access control (inline definition for organizations)
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
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  CreateOrganizationCodeDto,
  UpdateOrganizationCodeDto,
  AddOrganizationMemberDto,
  UpdateOrganizationMemberDto,
  CreateOrganizationLicenseDto,
  UpdateOrganizationLicenseDto,
  ValidateOrganizationCodeDto,
  OrganizationQueryDto,
  OrganizationCodeQueryDto,
} from './dto';
import { OrganizationStatus, OrganizationCodeStatus } from '@prisma/client';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ============================================
  // PUBLIC ENDPOINTS (for registration)
  // ============================================

  @Post('validate-code')
  @ApiOperation({ summary: 'Validate an organization registration code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateOrganizationCode(@Body() dto: ValidateOrganizationCodeDto) {
    return this.organizationsService.validateOrganizationCode(dto.code);
  }

  // ============================================
  // USER ENDPOINTS (authenticated)
  // ============================================

  @Get('my-organization')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s organization membership' })
  async getMyOrganization(@Request() req) {
    return this.organizationsService.getUserOrganization(req.user.userId);
  }

  // ============================================
  // ADMIN ENDPOINTS - Organizations
  // ============================================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all organizations (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrganizationStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllOrganizations(@Query() query: OrganizationQueryDto) {
    return this.organizationsService.getAllOrganizations(
      query.page,
      query.pageSize,
      query.status,
      query.search,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization by ID (Admin)' })
  async getOrganization(@Param('id') id: string) {
    return this.organizationsService.getOrganization(id);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization by slug (Admin)' })
  async getOrganizationBySlug(@Param('slug') slug: string) {
    return this.organizationsService.getOrganizationBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new organization (Admin)' })
  async createOrganization(@Body() dto: CreateOrganizationDto, @Request() req) {
    return this.organizationsService.createOrganization(dto, req.user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization (Admin)' })
  async updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateOrganization(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (Admin)' })
  async deleteOrganization(@Param('id') id: string) {
    return this.organizationsService.deleteOrganization(id);
  }

  // ============================================
  // ADMIN ENDPOINTS - Organization Codes
  // ============================================

  @Get('codes/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all organization codes (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: OrganizationCodeStatus })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getAllOrganizationCodes(@Query() query: OrganizationCodeQueryDto) {
    return this.organizationsService.getAllOrganizationCodes(
      query.page,
      query.pageSize,
      query.status,
      query.organizationId,
    );
  }

  @Get(':organizationId/codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization codes for a specific org (Admin)' })
  async getOrganizationCodes(@Param('organizationId') organizationId: string) {
    const result = await this.organizationsService.getAllOrganizationCodes(1, 100, undefined, organizationId);
    return result.codes;
  }

  @Post('codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create organization registration code (Admin)' })
  async createOrganizationCode(@Body() dto: CreateOrganizationCodeDto, @Request() req) {
    return this.organizationsService.createOrganizationCode(dto, req.user.userId);
  }

  @Get('codes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization code by ID (Admin)' })
  async getOrganizationCode(@Param('id') id: string) {
    return this.organizationsService.getOrganizationCode(id);
  }

  @Patch('codes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization code (Admin)' })
  async updateOrganizationCode(@Param('id') id: string, @Body() dto: UpdateOrganizationCodeDto) {
    return this.organizationsService.updateOrganizationCode(id, dto);
  }

  @Post('codes/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke organization code (Admin)' })
  async revokeOrganizationCode(@Param('id') id: string) {
    return this.organizationsService.revokeOrganizationCode(id);
  }

  @Post('codes/:id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a revoked organization code (Admin)' })
  async reactivateOrganizationCode(@Param('id') id: string) {
    return this.organizationsService.reactivateOrganizationCode(id);
  }

  // ============================================
  // ADMIN ENDPOINTS - Organization Members
  // ============================================

  @Get(':organizationId/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization members (Admin)' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async getOrganizationMembers(
    @Param('organizationId') organizationId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.organizationsService.getOrganizationMembers(
      organizationId,
      includeInactive === true,
    );
  }

  @Post(':organizationId/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add member to organization (Admin)' })
  async addOrganizationMember(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddOrganizationMemberDto,
    @Request() req,
  ) {
    return this.organizationsService.addOrganizationMember(
      organizationId,
      dto,
      req.user.userId,
    );
  }

  @Patch(':organizationId/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization member (Admin)' })
  async updateOrganizationMember(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationMemberDto,
  ) {
    return this.organizationsService.updateOrganizationMember(organizationId, userId, dto);
  }

  @Delete(':organizationId/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization (Admin)' })
  async removeOrganizationMember(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.organizationsService.removeOrganizationMember(organizationId, userId);
  }

  // ============================================
  // ADMIN ENDPOINTS - Organization Licenses
  // ============================================

  @Get(':organizationId/licenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization licenses (Admin)' })
  async getOrganizationLicenses(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getOrganizationLicenses(organizationId);
  }

  @Get(':organizationId/available-seats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available license seats (Admin)' })
  async getAvailableSeats(@Param('organizationId') organizationId: string) {
    return this.organizationsService.getAvailableSeats(organizationId);
  }

  @Post('licenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create organization license pool (Admin)' })
  async createOrganizationLicense(@Body() dto: CreateOrganizationLicenseDto, @Request() req) {
    return this.organizationsService.createOrganizationLicense(dto, req.user.userId);
  }

  @Patch('licenses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization license (Admin)' })
  async updateOrganizationLicense(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationLicenseDto,
  ) {
    return this.organizationsService.updateOrganizationLicense(id, dto);
  }

  @Post('licenses/:id/allocate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Allocate license seat to user (Admin)' })
  async allocateLicenseSeat(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req,
  ) {
    return this.organizationsService.allocateLicenseSeat(id, userId, req.user.userId);
  }

  @Post('user-licenses/:userLicenseId/deallocate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deallocate user license back to pool (Admin)' })
  async deallocateLicenseSeat(@Param('userLicenseId') userLicenseId: string) {
    return this.organizationsService.deallocateLicenseSeat(userLicenseId);
  }
}
