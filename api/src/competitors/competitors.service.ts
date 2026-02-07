import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompetitorTier, CompetitorStatus, ThreatLevel, Prisma } from '@prisma/client';

export interface CreateCompetitorDto {
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  tier?: CompetitorTier;
  strengths?: string[];
  weaknesses?: string[];
  differentiators?: string[];
  targetMarket?: string;
  pricingModel?: string;
}

export interface UpdateCompetitorDto extends Partial<CreateCompetitorDto> {
  status?: CompetitorStatus;
}

export interface CreateCompetitorProductDto {
  name: string;
  comparableToProductId?: string;
  featureGaps?: string[];
  featureAdvantages?: string[];
  positioning?: string;
  pricingInfo?: string;
}

export interface LinkOpportunityCompetitorDto {
  competitorId: string;
  isPrimary?: boolean;
  threatLevel?: ThreatLevel;
  notes?: string;
}

interface CompetitorFilters {
  tier?: string;
  status?: string;
  search?: string;
}

interface WinLossFilters {
  competitorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class CompetitorsService {
  private readonly logger = new Logger(CompetitorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Competitor CRUD
  // ============================================

  async findAll(filters: CompetitorFilters, organizationId: string) {
    const where: Prisma.CompetitorWhereInput = { organizationId };

    if (filters.tier) {
      where.tier = filters.tier as CompetitorTier;
    }

    if (filters.status) {
      where.status = filters.status as CompetitorStatus;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const competitors = await this.prisma.competitor.findMany({
      where,
      include: {
        _count: {
          select: {
            battlecards: true,
            products: true,
            opportunityLinks: true,
          },
        },
      },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });

    return competitors.map(c => ({
      ...c,
      battlecardCount: c._count.battlecards,
      productCount: c._count.products,
      dealCount: c._count.opportunityLinks,
    }));
  }

  async findOne(id: string, organizationId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id, organizationId },
      include: {
        products: {
          include: {
            comparableToProduct: { select: { id: true, name: true, sku: true } },
          },
        },
        battlecards: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
        },
        _count: {
          select: { opportunityLinks: true },
        },
      },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return competitor;
  }

  async create(dto: CreateCompetitorDto, organizationId: string) {
    // Check for duplicate name
    const existing = await this.prisma.competitor.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });

    if (existing) {
      throw new BadRequestException('A competitor with this name already exists');
    }

    const competitor = await this.prisma.competitor.create({
      data: {
        organizationId,
        name: dto.name,
        website: dto.website,
        logoUrl: dto.logoUrl,
        description: dto.description,
        tier: dto.tier || CompetitorTier.SECONDARY,
        strengths: dto.strengths || [],
        weaknesses: dto.weaknesses || [],
        differentiators: dto.differentiators || [],
        targetMarket: dto.targetMarket,
        pricingModel: dto.pricingModel,
      },
    });

    this.logger.log(`Created competitor: ${competitor.name}`);
    return competitor;
  }

  async update(id: string, dto: UpdateCompetitorDto, organizationId: string) {
    await this.findOne(id, organizationId);

    const competitor = await this.prisma.competitor.update({
      where: { id },
      data: {
        name: dto.name,
        website: dto.website,
        logoUrl: dto.logoUrl,
        description: dto.description,
        tier: dto.tier,
        status: dto.status,
        strengths: dto.strengths,
        weaknesses: dto.weaknesses,
        differentiators: dto.differentiators,
        targetMarket: dto.targetMarket,
        pricingModel: dto.pricingModel,
      },
    });

    return competitor;
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    await this.prisma.competitor.delete({ where: { id } });
    return { success: true };
  }

  // ============================================
  // Competitor Products
  // ============================================

  async getProducts(competitorId: string, organizationId: string) {
    await this.findOne(competitorId, organizationId);

    return this.prisma.competitorProduct.findMany({
      where: { competitorId },
      include: {
        comparableToProduct: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  async addProduct(competitorId: string, dto: CreateCompetitorProductDto, organizationId: string) {
    await this.findOne(competitorId, organizationId);

    return this.prisma.competitorProduct.create({
      data: {
        competitorId,
        name: dto.name,
        comparableToProductId: dto.comparableToProductId,
        featureGaps: dto.featureGaps || [],
        featureAdvantages: dto.featureAdvantages || [],
        positioning: dto.positioning,
        pricingInfo: dto.pricingInfo,
      },
      include: {
        comparableToProduct: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  async updateProduct(productId: string, dto: Partial<CreateCompetitorProductDto>, organizationId: string) {
    const product = await this.prisma.competitorProduct.findUnique({
      where: { id: productId },
      include: { competitor: { select: { organizationId: true } } },
    });

    if (!product || product.competitor.organizationId !== organizationId) {
      throw new NotFoundException('Competitor product not found');
    }

    return this.prisma.competitorProduct.update({
      where: { id: productId },
      data: {
        name: dto.name,
        comparableToProductId: dto.comparableToProductId,
        featureGaps: dto.featureGaps,
        featureAdvantages: dto.featureAdvantages,
        positioning: dto.positioning,
        pricingInfo: dto.pricingInfo,
      },
    });
  }

  async deleteProduct(productId: string, organizationId: string) {
    const product = await this.prisma.competitorProduct.findUnique({
      where: { id: productId },
      include: { competitor: { select: { organizationId: true } } },
    });

    if (!product || product.competitor.organizationId !== organizationId) {
      throw new NotFoundException('Competitor product not found');
    }

    await this.prisma.competitorProduct.delete({ where: { id: productId } });
    return { success: true };
  }

  // ============================================
  // Opportunity Competitor Links
  // ============================================

  async getOpportunityCompetitors(
    opportunityId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);

    return this.prisma.opportunityCompetitor.findMany({
      where: { opportunityId },
      include: {
        competitor: {
          include: {
            battlecards: {
              where: { isActive: true },
              take: 1,
              orderBy: { version: 'desc' },
            },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { threatLevel: 'desc' }],
    });
  }

  async linkOpportunityCompetitor(
    opportunityId: string,
    dto: LinkOpportunityCompetitorDto,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);
    await this.findOne(dto.competitorId, organizationId);

    // Check if link already exists
    const existing = await this.prisma.opportunityCompetitor.findUnique({
      where: {
        opportunityId_competitorId: { opportunityId, competitorId: dto.competitorId },
      },
    });

    if (existing) {
      throw new BadRequestException('Competitor already linked to this opportunity');
    }

    // If setting as primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.opportunityCompetitor.updateMany({
        where: { opportunityId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.opportunityCompetitor.create({
      data: {
        opportunityId,
        competitorId: dto.competitorId,
        isPrimary: dto.isPrimary || false,
        threatLevel: dto.threatLevel || ThreatLevel.MEDIUM,
        notes: dto.notes,
      },
      include: {
        competitor: true,
      },
    });
  }

  async updateOpportunityCompetitor(
    opportunityId: string,
    competitorId: string,
    dto: Partial<LinkOpportunityCompetitorDto>,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);

    // If setting as primary, unset other primaries
    if (dto.isPrimary) {
      await this.prisma.opportunityCompetitor.updateMany({
        where: { opportunityId, isPrimary: true, competitorId: { not: competitorId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.opportunityCompetitor.update({
      where: {
        opportunityId_competitorId: { opportunityId, competitorId },
      },
      data: {
        isPrimary: dto.isPrimary,
        threatLevel: dto.threatLevel,
        notes: dto.notes,
      },
      include: {
        competitor: true,
      },
    });
  }

  async unlinkOpportunityCompetitor(
    opportunityId: string,
    competitorId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);

    await this.prisma.opportunityCompetitor.delete({
      where: {
        opportunityId_competitorId: { opportunityId, competitorId },
      },
    });

    return { success: true };
  }

  async markCompetitorAsWinner(
    opportunityId: string,
    competitorId: string,
    lossReasons: string[] | undefined,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);

    // Update the opportunity competitor link
    const link = await this.prisma.opportunityCompetitor.update({
      where: {
        opportunityId_competitorId: { opportunityId, competitorId },
      },
      data: {
        wasCompetitorWinner: true,
        lossReasons: lossReasons || [],
      },
    });

    // Update competitor win/loss stats
    await this.updateWinLossStats(competitorId, false);

    this.logger.log(`Marked competitor ${competitorId} as winner for opportunity ${opportunityId}`);
    return link;
  }

  async updateWinLossStats(competitorId: string, isWin: boolean) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
    });

    if (!competitor) return;

    const winsAgainst = isWin ? competitor.winsAgainst + 1 : competitor.winsAgainst;
    const lossesAgainst = isWin ? competitor.lossesAgainst : competitor.lossesAgainst + 1;
    const total = winsAgainst + lossesAgainst;
    const winRateAgainst = total > 0 ? (winsAgainst / total) * 100 : null;

    await this.prisma.competitor.update({
      where: { id: competitorId },
      data: { winsAgainst, lossesAgainst, winRateAgainst },
    });
  }

  // ============================================
  // Analytics
  // ============================================

  async getStats(organizationId: string) {
    const [total, byTier, byStatus, topCompetitors] = await Promise.all([
      this.prisma.competitor.count({ where: { organizationId } }),
      this.prisma.competitor.groupBy({
        by: ['tier'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.competitor.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.competitor.findMany({
        where: { organizationId },
        orderBy: { lossesAgainst: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          tier: true,
          winsAgainst: true,
          lossesAgainst: true,
          winRateAgainst: true,
        },
      }),
    ]);

    return {
      total,
      byTier: byTier.map(t => ({ tier: t.tier, count: t._count })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      topCompetitors,
    };
  }

  async getWinLossAnalytics(filters: WinLossFilters, organizationId: string) {
    const where: Prisma.OpportunityCompetitorWhereInput = {
      competitor: { organizationId },
      opportunity: { isClosed: true },
    };

    if (filters.competitorId) {
      where.competitorId = filters.competitorId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.opportunity = {
        ...where.opportunity as object,
        closedDate: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      };
    }

    const links = await this.prisma.opportunityCompetitor.findMany({
      where,
      include: {
        competitor: { select: { id: true, name: true } },
        opportunity: { select: { isWon: true, amount: true, closedDate: true } },
      },
    });

    // Calculate analytics
    const byCompetitor = new Map<string, {
      name: string;
      wins: number;
      losses: number;
      wonAmount: number;
      lostAmount: number;
      lossReasons: Record<string, number>;
    }>();

    for (const link of links) {
      const key = link.competitorId;
      if (!byCompetitor.has(key)) {
        byCompetitor.set(key, {
          name: link.competitor.name,
          wins: 0,
          losses: 0,
          wonAmount: 0,
          lostAmount: 0,
          lossReasons: {},
        });
      }

      const stats = byCompetitor.get(key)!;
      const amount = link.opportunity.amount || 0;

      if (link.wasCompetitorWinner) {
        stats.losses++;
        stats.lostAmount += amount;
        for (const reason of link.lossReasons) {
          stats.lossReasons[reason] = (stats.lossReasons[reason] || 0) + 1;
        }
      } else if (link.opportunity.isWon) {
        stats.wins++;
        stats.wonAmount += amount;
      }
    }

    return Array.from(byCompetitor.entries()).map(([id, stats]) => ({
      competitorId: id,
      ...stats,
      winRate: stats.wins + stats.losses > 0
        ? (stats.wins / (stats.wins + stats.losses)) * 100
        : null,
      topLossReasons: Object.entries(stats.lossReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count })),
    }));
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async verifyOpportunityAccess(
    opportunityId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.OpportunityWhereInput = {
      id: opportunityId,
      organizationId,
    };

    if (!isAdmin) {
      where.ownerId = userId;
    }

    const opportunity = await this.prisma.opportunity.findFirst({
      where,
      select: { id: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found or access denied');
    }

    return opportunity;
  }
}
