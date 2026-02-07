import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  async createCampaign(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Body()
    body: {
      name: string;
      campaignType?: string;
      status?: CampaignStatus;
      startDate?: Date;
      endDate?: Date;
      budgetedCost?: number;
      actualCost?: number;
      expectedRevenue?: number;
      description?: string;
    },
  ) {
    return this.campaignsService.createCampaign(body, req.user.userId, organizationId);
  }

  @Get()
  async listCampaigns(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Query('status') status?: CampaignStatus,
    @Query('campaignType') campaignType?: string,
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.campaignsService.listCampaigns({
      status,
      ownerId: req.user.userId,
      campaignType,
    }, organizationId, isAdmin);
  }

  @Get('stats')
  async getCampaignStats(@Request() req, @CurrentOrganization() organizationId: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.campaignsService.getCampaignStats(organizationId, req.user.userId, isAdmin);
  }

  @Get(':id')
  async getCampaign(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.campaignsService.getCampaign(id, req.user.userId, organizationId, isAdmin);
  }

  @Get(':id/roi')
  async getCampaignROI(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.campaignsService.getCampaignROI(id, req.user.userId, organizationId, isAdmin);
  }

  @Patch(':id')
  async updateCampaign(
    @Request() req,
    @CurrentOrganization() organizationId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      campaignType?: string;
      status?: CampaignStatus;
      startDate?: Date;
      endDate?: Date;
      budgetedCost?: number;
      actualCost?: number;
      expectedRevenue?: number;
      description?: string;
      numSent?: number;
      numResponses?: number;
      numConverted?: number;
    },
  ) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    return this.campaignsService.updateCampaign(id, req.user.userId, body, organizationId, isAdmin);
  }

  @Delete(':id')
  async deleteCampaign(@Request() req, @CurrentOrganization() organizationId: string, @Param('id') id: string) {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    await this.campaignsService.deleteCampaign(id, req.user.userId, organizationId, isAdmin);
    return { message: 'Campaign deleted successfully' };
  }
}
