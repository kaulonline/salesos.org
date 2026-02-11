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
  // Helper Methods
  // ============================================

  // Helper to normalize state names/codes
  private normalizeState(state: string): string {
    const stateMap: Record<string, string> = {
      'california': 'CA', 'ca': 'CA',
      'oregon': 'OR', 'or': 'OR',
      'washington': 'WA', 'wa': 'WA',
      'texas': 'TX', 'tx': 'TX',
      'new york': 'NY', 'ny': 'NY',
      'florida': 'FL', 'fl': 'FL',
      'illinois': 'IL', 'il': 'IL',
      'massachusetts': 'MA', 'ma': 'MA',
    };
    return stateMap[state.toLowerCase()] || state.toUpperCase();
  }

  // Helper to check if account matches territory criteria
  private accountMatchesCriteria(account: any, criteria: Record<string, any>): boolean {
    // Handle both flat and nested criteria structures
    const states = criteria.states || criteria.geographic?.states;
    const countries = criteria.countries || criteria.geographic?.countries;
    const industries = criteria.industries || criteria.industry?.industries;

    // Check states
    if (states && Array.isArray(states) && states.length > 0) {
      if (!account.billingState) return false;
      const accountState = this.normalizeState(account.billingState);
      const matchesState = states.some((s: string) => this.normalizeState(s) === accountState);
      if (!matchesState) return false;
    }

    // Check countries
    if (countries && Array.isArray(countries) && countries.length > 0) {
      if (!account.billingCountry) return false;
      const matchesCountry = countries.some(
        (c: string) => c.toLowerCase() === account.billingCountry.toLowerCase()
      );
      if (!matchesCountry) return false;
    }

    // Check industries
    if (industries && Array.isArray(industries) && industries.length > 0) {
      if (!account.industry) return false;
      const matchesIndustry = industries.some(
        (i: string) => i.toLowerCase() === account.industry.toLowerCase()
      );
      if (!matchesIndustry) return false;
    }

    // Check employee count
    if (criteria.minEmployees && account.numberOfEmployees) {
      if (account.numberOfEmployees < criteria.minEmployees) return false;
    }
    if (criteria.maxEmployees && account.numberOfEmployees) {
      if (account.numberOfEmployees > criteria.maxEmployees) return false;
    }

    // Check revenue
    if (criteria.minRevenue && account.annualRevenue) {
      const revenue = typeof account.annualRevenue === 'object' && 'toNumber' in account.annualRevenue
        ? (account.annualRevenue as any).toNumber()
        : Number(account.annualRevenue);
      if (revenue < criteria.minRevenue) return false;
    }
    if (criteria.maxRevenue && account.annualRevenue) {
      const revenue = typeof account.annualRevenue === 'object' && 'toNumber' in account.annualRevenue
        ? (account.annualRevenue as any).toNumber()
        : Number(account.annualRevenue);
      if (revenue > criteria.maxRevenue) return false;
    }

    // Check account types
    if (criteria.accountTypes && Array.isArray(criteria.accountTypes) && criteria.accountTypes.length > 0) {
      if (!account.type || !criteria.accountTypes.includes(account.type)) return false;
    }

    return true;
  }

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
    const territory = await this.findOne(territoryId, userId, isAdmin, organizationId);

    // Validate accounts exist and get full account data
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: dto.accountIds } },
      select: {
        id: true,
        name: true,
        billingState: true,
        billingCountry: true,
        industry: true,
        numberOfEmployees: true,
        annualRevenue: true,
        type: true,
      },
    });

    if (accounts.length !== dto.accountIds.length) {
      throw new BadRequestException('One or more accounts not found');
    }

    // Validate accounts match territory criteria (if criteria exists)
    if (territory.criteria && Object.keys(territory.criteria as object).length > 0) {
      const criteria = territory.criteria as Record<string, any>;
      const invalidAccounts: string[] = [];

      for (const account of accounts) {
        if (!this.accountMatchesCriteria(account, criteria)) {
          invalidAccounts.push(account.name);
        }
      }

      if (invalidAccounts.length > 0) {
        throw new BadRequestException(
          `The following accounts do not match territory criteria: ${invalidAccounts.join(', ')}`
        );
      }
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

    // Helper to normalize state names (California -> CA, ca -> CA, etc.)
    const normalizeStates = (states: string[]): string[] => {
      const stateMap: Record<string, string> = {
        'california': 'CA', 'ca': 'CA',
        'oregon': 'OR', 'or': 'OR',
        'washington': 'WA', 'wa': 'WA',
        'texas': 'TX', 'tx': 'TX',
        'new york': 'NY', 'ny': 'NY',
        'florida': 'FL', 'fl': 'FL',
        'illinois': 'IL', 'il': 'IL',
        'massachusetts': 'MA', 'ma': 'MA',
      };
      return states.map(s => stateMap[s.toLowerCase()] || s.toUpperCase());
    };

    // Handle both flat and nested criteria structures
    // Flat: { states: [...], industries: [...] }
    // Nested: { geographic: { states: [...] }, industry: { industries: [...] } }
    const states = criteria.states || criteria.geographic?.states;
    const countries = criteria.countries || criteria.geographic?.countries;
    const industries = criteria.industries || criteria.industry?.industries;

    // Build query based on criteria
    if (states && Array.isArray(states) && states.length > 0) {
      const normalizedStates = normalizeStates(states);
      where.billingState = { in: normalizedStates, mode: 'insensitive' };
    }

    if (countries && Array.isArray(countries) && countries.length > 0) {
      where.billingCountry = { in: countries, mode: 'insensitive' };
    }

    if (industries && Array.isArray(industries) && industries.length > 0) {
      where.industry = { in: industries, mode: 'insensitive' };
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

    // Add organization filter
    where.organizationId = organizationId;

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

  async cleanupMismatchedAccounts(territoryId: string, userId: string, isAdmin: boolean, organizationId: string) {
    const territory = await this.findOne(territoryId, userId, isAdmin, organizationId);

    if (!territory.criteria || Object.keys(territory.criteria as object).length === 0) {
      return { success: true, removedCount: 0, message: 'Territory has no criteria to validate against' };
    }

    // Get all current account assignments
    const assignments = await this.prisma.territoryAccount.findMany({
      where: { territoryId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            billingState: true,
            billingCountry: true,
            industry: true,
            numberOfEmployees: true,
            annualRevenue: true,
            type: true,
          },
        },
      },
    });

    const criteria = territory.criteria as Record<string, any>;
    const accountsToRemove: string[] = [];

    // Check each account against criteria using helper
    for (const assignment of assignments) {
      const account = assignment.account;
      if (!this.accountMatchesCriteria(account, criteria)) {
        accountsToRemove.push(account.id);
      }
    }

    // Remove mismatched accounts
    if (accountsToRemove.length > 0) {
      await this.prisma.territoryAccount.deleteMany({
        where: {
          territoryId,
          accountId: { in: accountsToRemove },
        },
      });

      // Recalculate performance stats
      await this.recalculatePerformance(territoryId);
    }

    return {
      success: true,
      removedCount: accountsToRemove.length,
      message: accountsToRemove.length > 0
        ? `Removed ${accountsToRemove.length} account(s) that didn't match territory criteria`
        : 'All accounts match territory criteria',
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
