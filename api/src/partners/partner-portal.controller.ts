import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CreateDealRegistrationDto, UpdateDealRegistrationDto } from './dto/deal-registration.dto';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@ApiTags('Partner Portal')
@ApiBearerAuth('JWT')
@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PartnerPortalController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly dealRegistrationService: DealRegistrationService,
  ) {}

  // ============================================
  // Portal Profile
  // ============================================

  @Get('me')
  async getMyPartnerProfile(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.partnersService.getPartnerForUser(userId, organizationId);
  }

  @Get('dashboard')
  async getPortalDashboard(
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.partnersService.getPortalDashboard(userId, organizationId);
  }

  // ============================================
  // Portal Accounts (Assigned to Partner)
  // ============================================

  @Get('accounts')
  async getPortalAccounts(
    @Query('search') search: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.partnersService.getPortalAccounts(userId, search, organizationId);
  }

  // ============================================
  // Portal Deal Registrations
  // ============================================

  @Get('registrations')
  async getPortalRegistrations(
    @Query('status') status: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.dealRegistrationService.getForPortalUser(userId, status, organizationId);
  }

  @Get('registrations/:id')
  async getPortalRegistration(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.dealRegistrationService.getForPortalUserById(id, userId, organizationId);
  }

  @Post('registrations')
  async createRegistration(
    @Body() dto: CreateDealRegistrationDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.dealRegistrationService.createFromPortal(dto, userId, organizationId);
  }

  @Patch('registrations/:id')
  async updateRegistration(
    @Param('id') id: string,
    @Body() dto: UpdateDealRegistrationDto,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.dealRegistrationService.updateFromPortal(id, dto, userId, organizationId);
  }

  @Post('registrations/:id/submit')
  async submitRegistration(
    @Param('id') id: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.dealRegistrationService.submitFromPortal(id, userId, organizationId);
  }

  // ============================================
  // Portal Opportunities (Partner's Deals)
  // ============================================

  @Get('deals')
  async getPortalDeals(
    @Query('status') status: string,
    @Req() req: any,
    @CurrentOrganization() organizationId: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.partnersService.getPortalDeals(userId, status, organizationId);
  }
}
