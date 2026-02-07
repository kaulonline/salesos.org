import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CrmAdminService } from './crm-admin.service';
import type { CreateCrmIntegrationDto, UpdateCrmIntegrationDto } from './crm-admin.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CrmProvider } from '@prisma/client';

// Roles decorator
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Roles guard
@Injectable()
class RolesGuard implements CanActivate {
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

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('admin/crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CrmAdminController {
  private readonly logger = new Logger(CrmAdminController.name);

  constructor(private readonly crmAdminService: CrmAdminService) {}

  /**
   * Get all CRM integrations
   */
  @Get('integrations')
  async getAllIntegrations() {
    return this.crmAdminService.getAllIntegrations();
  }

  /**
   * Get a specific CRM integration
   */
  @Get('integrations/:provider')
  async getIntegration(@Param('provider') provider: CrmProvider) {
    return this.crmAdminService.getIntegration(provider);
  }

  /**
   * Create or update a CRM integration
   */
  @Post('integrations')
  async upsertIntegration(
    @Body() dto: CreateCrmIntegrationDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.crmAdminService.upsertIntegration(dto, req.user.userId);
  }

  /**
   * Update integration settings
   */
  @Patch('integrations/:provider')
  async updateIntegration(
    @Param('provider') provider: CrmProvider,
    @Body() dto: UpdateCrmIntegrationDto
  ) {
    return this.crmAdminService.updateIntegration(provider, dto);
  }

  /**
   * Enable a CRM integration
   */
  @Post('integrations/:provider/enable')
  @HttpCode(HttpStatus.OK)
  async enableIntegration(@Param('provider') provider: CrmProvider) {
    return this.crmAdminService.toggleIntegration(provider, true);
  }

  /**
   * Disable a CRM integration
   */
  @Post('integrations/:provider/disable')
  @HttpCode(HttpStatus.OK)
  async disableIntegration(@Param('provider') provider: CrmProvider) {
    return this.crmAdminService.toggleIntegration(provider, false);
  }

  /**
   * Delete a CRM integration
   */
  @Delete('integrations/:provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(@Param('provider') provider: CrmProvider) {
    await this.crmAdminService.deleteIntegration(provider);
  }

  /**
   * Get all connections for an integration
   */
  @Get('integrations/:provider/connections')
  async getIntegrationConnections(@Param('provider') provider: CrmProvider) {
    return this.crmAdminService.getIntegrationConnections(provider);
  }

  /**
   * Get enabled integrations (for displaying to users)
   */
  @Get('enabled')
  async getEnabledIntegrations() {
    return this.crmAdminService.getEnabledIntegrations();
  }

  /**
   * Test connection to a CRM provider
   */
  @Post('integrations/:provider/test')
  @HttpCode(HttpStatus.OK)
  async testConnection(@Param('provider') provider: CrmProvider) {
    return this.crmAdminService.testConnection(provider);
  }
}
