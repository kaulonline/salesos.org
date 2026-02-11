import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { TerritoriesService } from './territories.service';
import { TerritoryType } from '@prisma/client';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.findAll(userId, isAdmin, organizationId);
  }

  @Get('stats')
  async getStats(@CurrentOrganization() organizationId: string) {
    return this.territoriesService.getStats(organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.findOne(id, userId, isAdmin, organizationId);
  }

  @Post()
  async create(
    @Body() body: {
      name: string;
      description?: string;
      type: TerritoryType;
      criteria?: Record<string, any>;
      ownerId?: string;
      color?: string;
    },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.territoriesService.create(body, userId, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      type?: TerritoryType;
      criteria?: Record<string, any>;
      ownerId?: string;
      color?: string;
      isActive?: boolean;
    },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.update(id, body, userId, isAdmin, organizationId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.delete(id, userId, isAdmin, organizationId);
  }

  // Account assignment endpoints
  @Get(':id/accounts')
  async getAccounts(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.getAccounts(id, userId, isAdmin, organizationId);
  }

  @Post(':id/accounts')
  async assignAccounts(
    @Param('id') id: string,
    @Body() body: { accountIds: string[] },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.assignAccounts(id, body, userId, isAdmin, organizationId);
  }

  @Delete(':id/accounts/:accountId')
  async removeAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.removeAccount(id, accountId, userId, isAdmin, organizationId);
  }

  @Post(':id/auto-assign')
  async autoAssignAccounts(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.autoAssignAccounts(id, userId, isAdmin, organizationId);
  }

  @Post(':id/recalculate')
  async recalculatePerformance(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    // Verify access
    await this.territoriesService.findOne(id, userId, isAdmin, organizationId);
    await this.territoriesService.recalculatePerformance(id);
    return { success: true };
  }

  @Post(':id/cleanup-mismatched')
  async cleanupMismatchedAccounts(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.territoriesService.cleanupMismatchedAccounts(id, userId, isAdmin, organizationId);
  }
}
