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
import { AssetsService } from './assets.service';
import { SupportContractsService } from './support-contracts.service';
import { AssetsAIService } from './assets-ai.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateSupportContractDto } from './dto/create-support-contract.dto';
import { UpdateSupportContractDto } from './dto/update-support-contract.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly supportContractsService: SupportContractsService,
    private readonly aiService: AssetsAIService,
  ) {}

  // ============================================
  // Asset CRUD
  // ============================================

  @Get('assets')
  async findAll(
    @Query('accountId') accountId: string,
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('expiringDays') expiringDays: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.findAll(
      { accountId, status, search, expiringDays: expiringDays ? parseInt(expiringDays) : undefined },
      userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('assets/stats')
  async getStats(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.getStats(userId, isAdmin, organizationId);
  }

  @Get('assets/expiring')
  async getExpiring(
    @Query('days') days: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.getExpiringAssets(
      parseInt(days) || 90,
      userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('assets/renewal-pipeline')
  async getRenewalPipeline(
    @Query('period') period: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.getRenewalPipeline(period || 'quarter', userId, isAdmin, organizationId);
  }

  @Get('assets/:id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.findOne(id, userId, isAdmin, organizationId);
  }

  @Post('assets')
  async create(
    @Body() dto: CreateAssetDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.create(dto, userId, isAdmin, organizationId);
  }

  @Patch('assets/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.update(id, dto, userId, isAdmin, organizationId);
  }

  @Delete('assets/:id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.delete(id, userId, isAdmin, organizationId);
  }

  // ============================================
  // Account Assets
  // ============================================

  @Get('accounts/:accountId/assets')
  async getAccountAssets(
    @Param('accountId') accountId: string,
    @Query('status') status: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.getAccountAssets(accountId, status, userId, isAdmin, organizationId);
  }

  @Get('accounts/:accountId/assets/summary')
  async getAccountAssetSummary(
    @Param('accountId') accountId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.assetsService.getAccountAssetSummary(accountId, userId, isAdmin, organizationId);
  }

  // ============================================
  // Support Contracts
  // ============================================

  @Get('support-contracts')
  async findAllContracts(
    @Query('accountId') accountId: string,
    @Query('status') status: string,
    @Query('expiringDays') expiringDays: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.findAll(
      { accountId, status, expiringDays: expiringDays ? parseInt(expiringDays) : undefined },
      userId,
      isAdmin,
      organizationId,
    );
  }

  @Get('support-contracts/stats')
  async getContractStats(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.getStats(userId, isAdmin, organizationId);
  }

  @Get('support-contracts/:id')
  async findOneContract(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.findOne(id, userId, isAdmin, organizationId);
  }

  @Post('support-contracts')
  async createContract(
    @Body() dto: CreateSupportContractDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.create(dto, userId, isAdmin, organizationId);
  }

  @Patch('support-contracts/:id')
  async updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateSupportContractDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.update(id, dto, userId, isAdmin, organizationId);
  }

  @Delete('support-contracts/:id')
  async deleteContract(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.delete(id, userId, isAdmin, organizationId);
  }

  @Post('support-contracts/:id/assets')
  async assignAssetsToContract(
    @Param('id') id: string,
    @Body() body: { assetIds: string[] },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.supportContractsService.assignAssets(id, body.assetIds, userId, isAdmin, organizationId);
  }

  // ============================================
  // AI Features
  // ============================================

  @Get('assets/ai/renewal-risk')
  async getRenewalRisk(
    @Query('accountId') accountId: string,
    @Query('daysAhead') daysAhead: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.calculateRenewalRisk(organizationId, {
      accountId,
      daysAhead: daysAhead ? parseInt(daysAhead) : undefined,
    });
  }

  @Get('accounts/:accountId/ai/upsell-recommendations')
  async getUpsellRecommendations(
    @Param('accountId') accountId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.generateUpsellRecommendations(accountId, organizationId);
  }

  @Get('assets/:id/ai/health')
  async getAssetHealth(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.calculateAssetHealth(id, organizationId);
  }

  @Get('accounts/:accountId/ai/license-optimization')
  async getLicenseOptimization(
    @Param('accountId') accountId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.analyzeLicenseOptimization(accountId, organizationId);
  }

  @Post('assets/:id/ai/renewal-message')
  async generateRenewalMessage(
    @Param('id') id: string,
    @Body('style') style: 'formal' | 'friendly' | 'urgent',
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.generateRenewalMessage(id, organizationId, style);
  }
}
