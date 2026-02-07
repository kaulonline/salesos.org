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
import { CompetitorsService } from './competitors.service';
import { BattlecardsService } from './battlecards.service';
import { CompetitorsAIService } from './competitors-ai.service';
import {
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CreateCompetitorProductDto,
  LinkOpportunityCompetitorDto,
  CreateBattlecardDto,
  UpdateBattlecardDto,
} from './dto/competitor.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class CompetitorsController {
  constructor(
    private readonly competitorsService: CompetitorsService,
    private readonly battlecardsService: BattlecardsService,
    private readonly aiService: CompetitorsAIService,
  ) {}

  // ============================================
  // Competitor CRUD
  // ============================================

  @Get('competitors')
  async findAll(
    @Query('tier') tier: string,
    @Query('status') status: string,
    @Query('search') search: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.findAll({ tier, status, search }, organizationId);
  }

  @Get('competitors/stats')
  async getStats(@CurrentOrganization() organizationId: string) {
    return this.competitorsService.getStats(organizationId);
  }

  @Get('competitors/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.findOne(id, organizationId);
  }

  @Post('competitors')
  async create(
    @Body() dto: CreateCompetitorDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.create(dto, organizationId);
  }

  @Patch('competitors/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompetitorDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.update(id, dto, organizationId);
  }

  @Delete('competitors/:id')
  async delete(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.delete(id, organizationId);
  }

  // ============================================
  // Competitor Products
  // ============================================

  @Get('competitors/:id/products')
  async getProducts(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.getProducts(id, organizationId);
  }

  @Post('competitors/:id/products')
  async addProduct(
    @Param('id') id: string,
    @Body() dto: CreateCompetitorProductDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.addProduct(id, dto, organizationId);
  }

  @Patch('competitors/:competitorId/products/:productId')
  async updateProduct(
    @Param('competitorId') competitorId: string,
    @Param('productId') productId: string,
    @Body() dto: Partial<CreateCompetitorProductDto>,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.updateProduct(productId, dto, organizationId);
  }

  @Delete('competitors/:competitorId/products/:productId')
  async deleteProduct(
    @Param('competitorId') competitorId: string,
    @Param('productId') productId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.deleteProduct(productId, organizationId);
  }

  // ============================================
  // Battlecards
  // ============================================

  @Get('competitors/:id/battlecards')
  async getBattlecards(
    @Param('id') id: string,
    @Query('activeOnly') activeOnly: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.battlecardsService.findByCompetitor(id, activeOnly === 'true', organizationId);
  }

  @Post('competitors/:id/battlecards')
  async createBattlecard(
    @Param('id') id: string,
    @Body() dto: CreateBattlecardDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.battlecardsService.create(id, dto, organizationId);
  }

  @Patch('battlecards/:id')
  async updateBattlecard(
    @Param('id') id: string,
    @Body() dto: UpdateBattlecardDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.battlecardsService.update(id, dto, organizationId);
  }

  @Delete('battlecards/:id')
  async deleteBattlecard(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.battlecardsService.delete(id, organizationId);
  }

  // ============================================
  // Opportunity Competitor Links
  // ============================================

  @Get('opportunities/:opportunityId/competitors')
  async getOpportunityCompetitors(
    @Param('opportunityId') opportunityId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.competitorsService.getOpportunityCompetitors(opportunityId, userId, isAdmin, organizationId);
  }

  @Post('opportunities/:opportunityId/competitors')
  async linkCompetitor(
    @Param('opportunityId') opportunityId: string,
    @Body() dto: LinkOpportunityCompetitorDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.competitorsService.linkOpportunityCompetitor(opportunityId, dto, userId, isAdmin, organizationId);
  }

  @Patch('opportunities/:opportunityId/competitors/:competitorId')
  async updateOpportunityCompetitor(
    @Param('opportunityId') opportunityId: string,
    @Param('competitorId') competitorId: string,
    @Body() dto: Partial<LinkOpportunityCompetitorDto>,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.competitorsService.updateOpportunityCompetitor(
      opportunityId,
      competitorId,
      dto,
      userId,
      isAdmin,
      organizationId,
    );
  }

  @Delete('opportunities/:opportunityId/competitors/:competitorId')
  async unlinkCompetitor(
    @Param('opportunityId') opportunityId: string,
    @Param('competitorId') competitorId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.competitorsService.unlinkOpportunityCompetitor(
      opportunityId,
      competitorId,
      userId,
      isAdmin,
      organizationId,
    );
  }

  @Post('opportunities/:opportunityId/competitors/:competitorId/mark-winner')
  async markCompetitorAsWinner(
    @Param('opportunityId') opportunityId: string,
    @Param('competitorId') competitorId: string,
    @Body() body: { lossReasons?: string[] },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.competitorsService.markCompetitorAsWinner(
      opportunityId,
      competitorId,
      body.lossReasons,
      userId,
      isAdmin,
      organizationId,
    );
  }

  // ============================================
  // Analytics
  // ============================================

  @Get('competitors/analytics/win-loss')
  async getWinLossAnalytics(
    @Query('competitorId') competitorId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.competitorsService.getWinLossAnalytics({ competitorId, dateFrom, dateTo }, organizationId);
  }

  // ============================================
  // AI Features
  // ============================================

  @Post('competitors/:id/ai/generate-battlecard')
  async generateBattlecard(
    @Param('id') id: string,
    @Body('regenerate') regenerate: boolean,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.generateBattlecard(id, organizationId, regenerate === true);
  }

  @Get('competitors/:id/ai/win-loss-patterns')
  async analyzeWinLossPatterns(
    @Param('id') id: string,
    @Query('regenerate') regenerate: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.analyzeWinLossPatterns(id, organizationId, regenerate === 'true');
  }

  @Post('competitors/:id/ai/objection-response')
  async generateObjectionResponse(
    @Param('id') id: string,
    @Body('objection') objection: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.generateObjectionResponse(id, objection, organizationId);
  }

  @Get('opportunities/:opportunityId/ai/competitive-positioning')
  async getPositioningRecommendations(
    @Param('opportunityId') opportunityId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.getPositioningRecommendations(opportunityId, organizationId);
  }

  @Post('competitors/ai/analyze-call')
  async analyzeCompetitiveCall(
    @Body('transcript') transcript: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.analyzeCompetitiveCall(transcript, organizationId);
  }
}
