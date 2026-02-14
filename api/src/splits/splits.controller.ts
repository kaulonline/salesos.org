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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { SplitsService } from './splits.service';
import { SplitsAIService } from './splits-ai.service';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Splits')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class SplitsController {
  constructor(
    private readonly splitsService: SplitsService,
    private readonly aiService: SplitsAIService,
  ) {}

  // ============================================
  // Opportunity Split Endpoints
  // ============================================

  @Get('opportunities/:opportunityId/splits')
  async getOpportunitySplits(
    @Param('opportunityId') opportunityId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.getOpportunitySplits(opportunityId, userId, isAdmin, organizationId);
  }

  @Post('opportunities/:opportunityId/splits')
  async createSplit(
    @Param('opportunityId') opportunityId: string,
    @Body() dto: CreateSplitDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.createSplit(opportunityId, dto, userId, isAdmin, organizationId);
  }

  @Patch('opportunities/:opportunityId/splits/:splitId')
  async updateSplit(
    @Param('opportunityId') opportunityId: string,
    @Param('splitId') splitId: string,
    @Body() dto: UpdateSplitDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.updateSplit(splitId, dto, userId, isAdmin, organizationId);
  }

  @Delete('opportunities/:opportunityId/splits/:splitId')
  async deleteSplit(
    @Param('opportunityId') opportunityId: string,
    @Param('splitId') splitId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.deleteSplit(splitId, userId, isAdmin, organizationId);
  }

  @Post('opportunities/:opportunityId/splits/:splitId/approve')
  async approveSplit(
    @Param('opportunityId') opportunityId: string,
    @Param('splitId') splitId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.approveSplit(splitId, userId, isAdmin, organizationId);
  }

  @Post('opportunities/:opportunityId/splits/:splitId/reject')
  async rejectSplit(
    @Param('opportunityId') opportunityId: string,
    @Param('splitId') splitId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.rejectSplit(splitId, body.reason, userId, isAdmin, organizationId);
  }

  // ============================================
  // User Split Endpoints
  // ============================================

  @Get('splits/my-splits')
  async getMySplits(
    @Query('status') status: string,
    @Query('includeInForecast') includeInForecast: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.splitsService.getUserSplits(userId, {
      status,
      includeInForecast: includeInForecast === 'true',
    }, organizationId);
  }

  @Get('splits/team-splits')
  async getTeamSplits(
    @Query('status') status: string,
    @Query('userId') targetUserId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.getTeamSplits(userId, isAdmin, { status, userId: targetUserId }, organizationId);
  }

  @Get('splits/stats')
  async getSplitStats(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.getSplitStats(userId, isAdmin, organizationId);
  }

  @Post('opportunities/:opportunityId/splits/recalculate')
  async recalculateSplitAmounts(
    @Param('opportunityId') opportunityId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.splitsService.recalculateSplitAmounts(opportunityId, userId, isAdmin, organizationId);
  }

  // ============================================
  // AI Features
  // ============================================

  @Get('opportunities/:opportunityId/splits/ai/suggest')
  async suggestSplits(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.suggestSplits(opportunityId, organizationId);
  }

  @Get('opportunities/:opportunityId/splits/ai/quota-impact')
  async analyzeQuotaImpact(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.analyzeQuotaImpact(opportunityId, organizationId);
  }

  @Get('opportunities/:opportunityId/splits/ai/conflicts')
  async detectConflicts(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.detectConflicts(opportunityId, organizationId);
  }

  @Get('opportunities/:opportunityId/splits/ai/analytics')
  async getAnalytics(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.getAnalytics(opportunityId, organizationId);
  }

  @Get('opportunities/:opportunityId/splits/ai/recommendation')
  async getAIRecommendation(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.getAIRecommendation(opportunityId, organizationId);
  }
}
