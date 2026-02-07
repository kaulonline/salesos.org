import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Campaign, CampaignStatus, Prisma } from '@prisma/client';

interface CreateCampaignDto {
  name: string;
  campaignType?: string;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  budgetedCost?: number;
  actualCost?: number;
  expectedRevenue?: number;
  description?: string;
}

interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  numSent?: number;
  numResponses?: number;
  numConverted?: number;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create campaign
  async createCampaign(data: CreateCampaignDto, ownerId: string, organizationId: string): Promise<Campaign> {
    this.logger.log(`Creating campaign: ${data.name}`);

    return this.prisma.campaign.create({
      data: {
        ...data,
        status: data.status || CampaignStatus.PLANNED,
        ownerId,
        organizationId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Get campaign by ID (with ownership verification)
  async getCampaign(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const campaign = await this.prisma.campaign.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        opportunities: {
          select: {
            id: true,
            name: true,
            stage: true,
            amount: true,
            isWon: true,
            isClosed: true,
          },
          take: 20,
        },
        _count: {
          select: {
            opportunities: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(campaign);

    return {
      ...campaign,
      metrics,
    };
  }

  // List campaigns
  async listCampaigns(filters: {
    status?: CampaignStatus;
    ownerId?: string;
    campaignType?: string;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Campaign[]> {
    const where: Prisma.CampaignWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.campaignType) {
      where.campaignType = filters.campaignType;
    }

    where.organizationId = organizationId;

    return this.prisma.campaign.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            opportunities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update campaign (with ownership verification)
  async updateCampaign(id: string, userId: string, data: UpdateCampaignDto, organizationId: string, isAdmin?: boolean): Promise<Campaign> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const campaign = await this.prisma.campaign.findFirst({ where });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return this.prisma.campaign.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Delete campaign (with ownership verification)
  async deleteCampaign(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const campaign = await this.prisma.campaign.findFirst({ where });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    await this.prisma.campaign.delete({ where: { id } });
    this.logger.log(`Deleted campaign ${id}`);
  }

  // Calculate campaign metrics
  private calculateMetrics(campaign: any): any {
    const responseRate = campaign.numSent > 0 ? (campaign.numResponses / campaign.numSent) * 100 : 0;
    const conversionRate = campaign.numSent > 0 ? (campaign.numConverted / campaign.numSent) * 100 : 0;

    // Calculate ROI
    const actualCost = campaign.actualCost || 0;
    const budgetedCost = campaign.budgetedCost || 0;

    // Calculate actual revenue from won opportunities
    const wonRevenue = campaign.opportunities
      ? campaign.opportunities
          .filter((o: any) => o.isWon)
          .reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
      : 0;

    let roi = 0;
    if (actualCost > 0) {
      roi = ((wonRevenue - actualCost) / actualCost) * 100;
    }

    return {
      responseRate: Math.round(responseRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      budgetUsed: budgetedCost > 0 ? Math.round((actualCost / budgetedCost) * 100) : 0,
      wonRevenue,
      totalOpportunities: campaign.opportunities?.length || 0,
      wonOpportunities: campaign.opportunities?.filter((o: any) => o.isWon).length || 0,
    };
  }

  // Get campaign statistics
  async getCampaignStats(organizationId: string, ownerId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.CampaignWhereInput = (ownerId && !isAdmin) ? { ownerId } : {};
    where.organizationId = organizationId;

    const [total, byStatus, byType, totalBudget, totalActual, totalSent, totalResponses] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.campaign.groupBy({
        by: ['campaignType'],
        where: {
          ...where,
          campaignType: { not: null },
        },
        _count: true,
      }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { budgetedCost: true },
      }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { actualCost: true },
      }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { numSent: true },
      }),
      this.prisma.campaign.aggregate({
        where,
        _sum: { numResponses: true },
      }),
    ]);

    const overallResponseRate =
      totalSent._sum.numSent && totalSent._sum.numSent > 0
        ? Math.round(((totalResponses._sum.numResponses || 0) / totalSent._sum.numSent) * 10000) / 100
        : 0;

    return {
      total,
      byStatus,
      byType,
      totalBudget: totalBudget._sum.budgetedCost || 0,
      totalActual: totalActual._sum.actualCost || 0,
      totalSent: totalSent._sum.numSent || 0,
      totalResponses: totalResponses._sum.numResponses || 0,
      overallResponseRate,
    };
  }

  // Get campaign ROI analysis (with ownership verification)
  async getCampaignROI(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const campaign = await this.getCampaign(id, userId, organizationId, isAdmin);

    const metrics = this.calculateMetrics(campaign);

    return {
      campaignId: id,
      campaignName: campaign.name,
      budgetedCost: campaign.budgetedCost || 0,
      actualCost: campaign.actualCost || 0,
      expectedRevenue: campaign.expectedRevenue || 0,
      actualRevenue: metrics.wonRevenue,
      roi: metrics.roi,
      responseRate: metrics.responseRate,
      conversionRate: metrics.conversionRate,
      totalOpportunities: metrics.totalOpportunities,
      wonOpportunities: metrics.wonOpportunities,
    };
  }
}
