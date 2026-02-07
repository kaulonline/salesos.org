import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TerritoryType, Prisma } from '@prisma/client';

export interface CreateTerritoryDto {
  name: string;
  description?: string;
  type: TerritoryType;
  criteria?: Record<string, any>;
  ownerId?: string;
  color?: string;
}

export interface UpdateTerritoryDto {
  name?: string;
  description?: string;
  type?: TerritoryType;
  criteria?: Record<string, any>;
  ownerId?: string;
  color?: string;
  isActive?: boolean;
}

export interface AssignAccountsDto {
  accountIds: string[];
}

@Injectable()
export class TerritoriesService {
  private readonly logger = new Logger(TerritoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CRUD Operations
  // ============================================

  async findAll(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.TerritoryWhereInput = isAdmin ? {} : { ownerId: userId };
    where.organizationId = organizationId;

    const territories = await this.prisma.territory.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        performanceStats: true,
        _count: { select: { accountMappings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return territories.map(t => ({
      ...t,
      accounts: t._count.accountMappings,
    }));
  }

  async findOne(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.TerritoryWhereInput = { id };
    where.organizationId = organizationId;

    const territory = await this.prisma.territory.findFirst({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        performanceStats: true,
        accountMappings: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                industry: true,
                annualRevenue: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!territory) {
      throw new NotFoundException('Territory not found');
    }

    if (!isAdmin && territory.ownerId !== userId) {
      throw new NotFoundException('Territory not found');
    }

    return territory;
  }

  async create(dto: CreateTerritoryDto, userId: string, organizationId: string) {
    this.logger.log(`Creating territory: ${dto.name}`);

    const territory = await this.prisma.territory.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        criteria: dto.criteria || {},
        ownerId: dto.ownerId || userId,
        color: dto.color || this.generateColor(),
        organizationId,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Create empty performance stats
    await this.prisma.territoryPerformance.create({
      data: { territoryId: territory.id },
    });

    return territory;
  }

  async update(id: string, dto: UpdateTerritoryDto, userId: string, isAdmin: boolean, organizationId: string) {
    const territory = await this.findOne(id, userId, isAdmin, organizationId);

    return this.prisma.territory.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        criteria: dto.criteria,
        ownerId: dto.ownerId,
        color: dto.color,
        isActive: dto.isActive,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        performanceStats: true,
      },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(id, userId, isAdmin, organizationId);

    await this.prisma.territory.delete({ where: { id } });

    return { success: true };
  }

  // ============================================
  // Account Assignment
  // ============================================

  async assignAccounts(territoryId: string, dto: AssignAccountsDto, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(territoryId, userId, isAdmin, organizationId);

    // Validate accounts exist
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: dto.accountIds } },
      select: { id: true },
    });

    if (accounts.length !== dto.accountIds.length) {
      throw new BadRequestException('One or more accounts not found');
    }

    // Create mappings (upsert to handle duplicates)
    const results = await Promise.all(
      dto.accountIds.map(accountId =>
        this.prisma.territoryAccount.upsert({
          where: {
            territoryId_accountId: { territoryId, accountId },
          },
          create: {
            territoryId,
            accountId,
            assignedBy: userId,
          },
          update: {
            assignedBy: userId,
            assignedAt: new Date(),
          },
        }),
      ),
    );

    // Recalculate performance stats
    await this.recalculatePerformance(territoryId);

    return {
      success: true,
      assigned: results.length,
    };
  }

  async removeAccount(territoryId: string, accountId: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(territoryId, userId, isAdmin, organizationId);

    await this.prisma.territoryAccount.deleteMany({
      where: { territoryId, accountId },
    });

    // Recalculate performance stats
    await this.recalculatePerformance(territoryId);

    return { success: true };
  }

  async getAccounts(territoryId: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(territoryId, userId, isAdmin, organizationId);

    const mappings = await this.prisma.territoryAccount.findMany({
      where: { territoryId },
      include: {
        account: {
          include: {
            opportunities: {
              where: { isClosed: false },
              select: { amount: true },
            },
            _count: { select: { contacts: true, opportunities: true } },
          },
        },
      },
    });

    return mappings.map(m => ({
      ...m.account,
      openPipeline: m.account.opportunities.reduce((sum, o) => sum + (o.amount || 0), 0),
      contacts: m.account._count.contacts,
      deals: m.account._count.opportunities,
      assignedAt: m.assignedAt,
    }));
  }

  // ============================================
  // Auto-Assignment
  // ============================================

  async autoAssignAccounts(territoryId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const territory = await this.findOne(territoryId, userId, isAdmin, organizationId);

    if (!territory.criteria || Object.keys(territory.criteria as object).length === 0) {
      throw new BadRequestException('Territory has no assignment criteria defined');
    }

    const criteria = territory.criteria as Record<string, any>;
    const where: Prisma.AccountWhereInput = {};

    // Build query based on criteria
    if (criteria.states && Array.isArray(criteria.states)) {
      where.billingState = { in: criteria.states, mode: 'insensitive' };
    }

    if (criteria.countries && Array.isArray(criteria.countries)) {
      where.billingCountry = { in: criteria.countries, mode: 'insensitive' };
    }

    if (criteria.industries && Array.isArray(criteria.industries)) {
      where.industry = { in: criteria.industries, mode: 'insensitive' };
    }

    if (criteria.minEmployees) {
      where.numberOfEmployees = { gte: criteria.minEmployees };
    }

    if (criteria.maxEmployees) {
      where.numberOfEmployees = { ...where.numberOfEmployees as any, lte: criteria.maxEmployees };
    }

    if (criteria.minRevenue) {
      where.annualRevenue = { gte: criteria.minRevenue };
    }

    if (criteria.maxRevenue) {
      where.annualRevenue = { ...where.annualRevenue as any, lte: criteria.maxRevenue };
    }

    if (criteria.accountTypes && Array.isArray(criteria.accountTypes)) {
      where.type = { in: criteria.accountTypes };
    }

    // Find matching accounts
    const accounts = await this.prisma.account.findMany({
      where,
      select: { id: true },
    });

    if (accounts.length === 0) {
      return { success: true, assigned: 0, message: 'No matching accounts found' };
    }

    // Assign accounts
    return this.assignAccounts(territoryId, { accountIds: accounts.map(a => a.id) }, userId, isAdmin, organizationId);
  }

  // ============================================
  // Performance Stats
  // ============================================

  async recalculatePerformance(territoryId: string) {
    // Get all accounts in this territory
    const accountIds = await this.prisma.territoryAccount
      .findMany({
        where: { territoryId },
        select: { accountId: true },
      })
      .then(mappings => mappings.map(m => m.accountId));

    if (accountIds.length === 0) {
      await this.prisma.territoryPerformance.upsert({
        where: { territoryId },
        create: { territoryId },
        update: {
          accountCount: 0,
          pipelineValue: 0,
          closedWonValue: 0,
          closedLostValue: 0,
          openDealsCount: 0,
          avgDealSize: 0,
          winRate: 0,
          lastCalculatedAt: new Date(),
        },
      });
      return;
    }

    // Get opportunity stats for these accounts
    const opportunities = await this.prisma.opportunity.findMany({
      where: { accountId: { in: accountIds } },
      select: {
        amount: true,
        isClosed: true,
        isWon: true,
      },
    });

    const openDeals = opportunities.filter(o => !o.isClosed);
    const closedWon = opportunities.filter(o => o.isClosed && o.isWon);
    const closedLost = opportunities.filter(o => o.isClosed && !o.isWon);

    const pipelineValue = openDeals.reduce((sum, o) => sum + (o.amount || 0), 0);
    const closedWonValue = closedWon.reduce((sum, o) => sum + (o.amount || 0), 0);
    const closedLostValue = closedLost.reduce((sum, o) => sum + (o.amount || 0), 0);

    const totalClosed = closedWon.length + closedLost.length;
    const winRate = totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : 0;
    const avgDealSize = closedWon.length > 0 ? closedWonValue / closedWon.length : 0;

    await this.prisma.territoryPerformance.upsert({
      where: { territoryId },
      create: {
        territoryId,
        accountCount: accountIds.length,
        pipelineValue,
        closedWonValue,
        closedLostValue,
        openDealsCount: openDeals.length,
        avgDealSize,
        winRate,
      },
      update: {
        accountCount: accountIds.length,
        pipelineValue,
        closedWonValue,
        closedLostValue,
        openDealsCount: openDeals.length,
        avgDealSize,
        winRate,
        lastCalculatedAt: new Date(),
      },
    });

    this.logger.log(`Recalculated performance for territory ${territoryId}`);
  }

  async getStats(organizationId: string) {
    const territoryWhere: Prisma.TerritoryWhereInput = {};
    territoryWhere.organizationId = organizationId;

    const [totalTerritories, activeTerritories] = await Promise.all([
      this.prisma.territory.count({ where: territoryWhere }),
      this.prisma.territory.count({ where: { ...territoryWhere, isActive: true } }),
    ]);

    // Get territory IDs for this organization to filter account mappings
    const territoryIds = await this.prisma.territory
      .findMany({ where: territoryWhere, select: { id: true } })
      .then(territories => territories.map(t => t.id));

    const totalAccounts = await this.prisma.territoryAccount.count({
      where: { territoryId: { in: territoryIds } },
    });

    const performanceStats = await this.prisma.territoryPerformance.aggregate({
      where: { territoryId: { in: territoryIds } },
      _sum: {
        pipelineValue: true,
        closedWonValue: true,
      },
    });

    return {
      totalTerritories,
      activeTerritories,
      totalAssignedAccounts: totalAccounts,
      totalPipeline: performanceStats._sum.pipelineValue?.toNumber() || 0,
      totalClosedWon: performanceStats._sum.closedWonValue?.toNumber() || 0,
    };
  }

  // ============================================
  // Helpers
  // ============================================

  private generateColor(): string {
    const colors = ['#EAD07D', '#93C01F', '#1A1A1A', '#666666', '#3B82F6', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
