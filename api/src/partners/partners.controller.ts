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
import { PartnersService } from './partners.service';
import { DealRegistrationService } from './deal-registration.service';
import { PartnersAIService } from './partners-ai.service';
import { CreatePartnerDto, UpdatePartnerDto, AddPartnerUserDto, InvitePartnerUserDto, AssignAccountDto } from './dto/create-partner.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Partners')
@ApiBearerAuth('JWT')
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly dealRegistrationService: DealRegistrationService,
    private readonly aiService: PartnersAIService,
  ) {}

  // ============================================
  // Partner CRUD (Admin)
  // ============================================

  @Get()
  async findAll(
    @Query('status') status: string,
    @Query('tier') tier: string,
    @Query('type') type: string,
    @Query('search') search: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    return this.partnersService.findAll({ status, tier, type, search }, userId, isAdmin, organizationId, userRole);
  }

  @Get('stats')
  async getStats(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    return this.partnersService.getStats(userId, isAdmin, organizationId, userRole);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.findOne(id, userId, isAdmin, organizationId);
  }

  @Post()
  async create(
    @Body() dto: CreatePartnerDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.create(dto, userId, isAdmin, organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.update(id, dto, userId, isAdmin, organizationId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.delete(id, userId, isAdmin, organizationId);
  }

  // ============================================
  // Partner Users
  // ============================================

  @Get(':id/users')
  async getPartnerUsers(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.getPartnerUsers(id, userId, isAdmin, organizationId);
  }

  @Post(':id/users')
  async addPartnerUser(
    @Param('id') id: string,
    @Body() dto: AddPartnerUserDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.addPartnerUser(id, dto, userId, isAdmin, organizationId);
  }

  @Post(':id/users/invite')
  async invitePartnerUser(
    @Param('id') id: string,
    @Body() dto: InvitePartnerUserDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.invitePartnerUser(id, dto, userId, isAdmin, organizationId);
  }

  @Patch(':partnerId/users/:partnerUserId')
  async updatePartnerUser(
    @Param('partnerId') partnerId: string,
    @Param('partnerUserId') partnerUserId: string,
    @Body() dto: Partial<AddPartnerUserDto>,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.updatePartnerUser(partnerUserId, dto, userId, isAdmin, organizationId);
  }

  @Delete(':partnerId/users/:partnerUserId')
  async removePartnerUser(
    @Param('partnerId') partnerId: string,
    @Param('partnerUserId') partnerUserId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.removePartnerUser(partnerUserId, userId, isAdmin, organizationId);
  }

  // ============================================
  // Partner Accounts
  // ============================================

  @Get(':id/accounts')
  async getPartnerAccounts(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.getPartnerAccounts(id, userId, isAdmin, organizationId);
  }

  @Post(':id/accounts')
  async assignAccount(
    @Param('id') id: string,
    @Body() dto: AssignAccountDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.assignAccount(id, dto, userId, isAdmin, organizationId);
  }

  @Delete(':partnerId/accounts/:accountId')
  async unassignAccount(
    @Param('partnerId') partnerId: string,
    @Param('accountId') accountId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.partnersService.unassignAccount(partnerId, accountId, userId, isAdmin, organizationId);
  }

  // ============================================
  // Deal Registrations (Admin View)
  // ============================================

  @Get(':id/registrations')
  async getPartnerRegistrations(
    @Param('id') id: string,
    @Query('status') status: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.dealRegistrationService.getByPartner(id, status, userId, isAdmin, organizationId);
  }

  @Post(':partnerId/registrations/:registrationId/approve')
  async approveRegistration(
    @Param('partnerId') partnerId: string,
    @Param('registrationId') registrationId: string,
    @Body() body: { commissionRate?: number; protectionDays?: number },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.dealRegistrationService.approve(registrationId, body, userId, isAdmin, organizationId);
  }

  @Post(':partnerId/registrations/:registrationId/reject')
  async rejectRegistration(
    @Param('partnerId') partnerId: string,
    @Param('registrationId') registrationId: string,
    @Body() body: { reason: string },
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.dealRegistrationService.reject(registrationId, body.reason, userId, isAdmin, organizationId);
  }

  @Post(':partnerId/registrations/:registrationId/convert')
  async convertRegistration(
    @Param('partnerId') partnerId: string,
    @Param('registrationId') registrationId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
    return this.dealRegistrationService.convertToOpportunity(registrationId, userId, isAdmin, organizationId);
  }

  // ============================================
  // All Deal Registrations
  // ============================================

  @Get('/admin/deal-registrations')
  async getAllRegistrations(
    @Query('status') status: string,
    @Query('partnerId') partnerId: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    return this.dealRegistrationService.findAll({ status, partnerId }, userId, isAdmin, organizationId, userRole);
  }

  @Get('/admin/deal-registrations/stats')
  async getRegistrationStats(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    return this.dealRegistrationService.getStats(userId, isAdmin, organizationId, userRole);
  }

  // ============================================
  // AI Features
  // ============================================

  @Get(':partnerId/registrations/:registrationId/ai/score')
  async scoreRegistration(
    @Param('registrationId') registrationId: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.scoreDealRegistration(registrationId, organizationId);
  }

  @Get('/ai/match-partners/:opportunityId')
  async matchPartners(
    @Param('opportunityId') opportunityId: string,
    @Query('limit') limit: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.findPartnerMatches(
      opportunityId,
      organizationId,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get(':id/ai/insights')
  async getPartnerInsights(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.generatePartnerInsights(id, organizationId);
  }

  @Get('/ai/co-selling')
  async getCoSellingRecommendations(
    @Query('minDealSize') minDealSize: string,
    @Query('limit') limit: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.getCoSellingRecommendations(organizationId, {
      minDealSize: minDealSize ? parseInt(minDealSize) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('/ai/auto-approve')
  async processAutoApprovals(
    @CurrentOrganization() organizationId: string,
  ) {
    return this.aiService.processAutoApprovals(organizationId);
  }
}
