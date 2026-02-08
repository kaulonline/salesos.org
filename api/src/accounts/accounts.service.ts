import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Account, AccountType, Prisma } from '@prisma/client';
import { validateForeignKeyId } from '../common/validators/foreign-key.validator';
import { EnrichmentService } from '../integrations/enrichment/enrichment.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { WorkflowTriggerType, WorkflowEntityType } from '../workflows/dto/workflow.dto';

interface CreateAccountDto {
  name: string;
  type: AccountType;
  industry?: string;
  phone?: string;
  website?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  description?: string;
  parentAccountId?: string;
}

interface UpdateAccountDto extends Partial<CreateAccountDto> {}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowsService: WorkflowsService,
    @Optional() @Inject(forwardRef(() => EnrichmentService))
    private enrichmentService?: EnrichmentService,
  ) {}

  // Create account
  async createAccount(data: CreateAccountDto, ownerId: string, organizationId: string): Promise<Account> {
    this.logger.log(`Creating account: ${data.name}`);

    // Validate parent account ID format before Prisma query
    validateForeignKeyId(data.parentAccountId, 'parentAccountId', 'Account');

    // If parent account specified, verify it exists and avoid circular references
    if (data.parentAccountId) {
      const parentAccount = await this.prisma.account.findUnique({
        where: { id: data.parentAccountId },
      });

      if (!parentAccount) {
        throw new NotFoundException(`Parent account ${data.parentAccountId} not found`);
      }
    }

    const account = await this.prisma.account.create({
      data: {
        ...data,
        ownerId,
        organizationId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        parentAccount: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-enrich the account if enrichment service is available
    if (this.enrichmentService && (account.domain || account.website)) {
      this.enrichmentService.autoEnrichAccount(account.id).catch((error) => {
        this.logger.error(`Failed to auto-enrich account ${account.id}:`, error);
      });
    }

    // Trigger workflows for account creation
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_CREATED,
      WorkflowEntityType.ACCOUNT,
      account.id,
      { account, ownerId, organizationId }
    ).catch((error) => {
      this.logger.error(`Failed to process workflows for account ${account.id}:`, error);
    });

    return account;
  }

  // Get account by ID (with ownership verification)
  async getAccount(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const account = await this.prisma.account.findFirst({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        parentAccount: {
          select: { id: true, name: true },
        },
        childAccounts: {
          select: { id: true, name: true, type: true },
        },
        contacts: {
          select: { id: true, firstName: true, lastName: true, email: true, title: true },
          take: 10,
        },
        opportunities: {
          select: { id: true, name: true, stage: true, amount: true, closeDate: true },
          where: {
            isClosed: false,
          },
          take: 10,
        },
        _count: {
          select: {
            contacts: true,
            opportunities: true,
            tasks: true,
            activities: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    return account;
  }

  // List accounts
  async listAccounts(filters: {
    type?: AccountType;
    industry?: string;
    ownerId?: string;
    parentAccountId?: string;
    search?: string;
  } | undefined, organizationId: string, isAdmin?: boolean): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.industry) {
      where.industry = filters.industry;
    }

    // Admin sees all unless explicitly filtering by owner
    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    } else if (filters?.ownerId && isAdmin) {
      // Admin can optionally filter by owner
      where.ownerId = filters.ownerId;
    }

    if (filters?.parentAccountId) {
      where.parentAccountId = filters.parentAccountId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.account.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        parentAccount: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            contacts: true,
            opportunities: true,
            childAccounts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update account (with ownership verification)
  async updateAccount(id: string, userId: string, data: UpdateAccountDto, organizationId: string, isAdmin?: boolean): Promise<Account> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const account = await this.prisma.account.findFirst({ where });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    // Prevent setting parent to self or creating circular references
    if (data.parentAccountId) {
      if (data.parentAccountId === id) {
        throw new BadRequestException('Account cannot be its own parent');
      }

      // Check if the new parent is a descendant
      const isDescendant = await this.isDescendant(id, data.parentAccountId);
      if (isDescendant) {
        throw new BadRequestException('Cannot create circular account hierarchy');
      }
    }

    const updated = await this.prisma.account.update({
      where: { id },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        parentAccount: {
          select: { id: true, name: true },
        },
      },
    });

    // Trigger workflows for account update
    this.workflowsService.processTrigger(
      WorkflowTriggerType.RECORD_UPDATED,
      WorkflowEntityType.ACCOUNT,
      id,
      { account: updated, previousData: account, userId, organizationId }
    ).catch((error) => {
      this.logger.error(`Failed to process update workflows for account ${id}:`, error);
    });

    return updated;
  }

  // Delete account (with ownership verification)
  async deleteAccount(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<void> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const account = await this.prisma.account.findFirst({
      where,
      include: {
        _count: {
          select: {
            opportunities: true,
            contacts: true,
            childAccounts: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    // Prevent deletion if account has child accounts
    if (account._count.childAccounts > 0) {
      throw new BadRequestException('Cannot delete account with child accounts');
    }

    // Prevent deletion if account has open opportunities
    const openOpportunities = await this.prisma.opportunity.count({
      where: {
        accountId: id,
        isClosed: false,
      },
    });

    if (openOpportunities > 0) {
      throw new BadRequestException('Cannot delete account with open opportunities');
    }

    await this.prisma.account.delete({ where: { id } });
    this.logger.log(`Deleted account ${id}`);
  }

  // Get account hierarchy (all descendants) (with ownership verification)
  async getAccountHierarchy(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const account = await this.getAccount(id, userId, organizationId, isAdmin);

    const descendants = await this.getDescendants(id);

    return {
      ...account,
      descendants,
    };
  }

  // Helper: Get all descendant accounts recursively
  private async getDescendants(parentId: string): Promise<any[]> {
    const children = await this.prisma.account.findMany({
      where: { parentAccountId: parentId },
      include: {
        _count: {
          select: {
            contacts: true,
            opportunities: true,
            childAccounts: true,
          },
        },
      },
    });

    const childrenWithDescendants = await Promise.all(
      children.map(async (child) => ({
        ...child,
        children: await this.getDescendants(child.id),
      })),
    );

    return childrenWithDescendants;
  }

  // Helper: Check if an account is a descendant of another
  private async isDescendant(ancestorId: string, potentialDescendantId: string): Promise<boolean> {
    const descendants = await this.getDescendants(ancestorId);

    const checkDescendants = (nodes: any[]): boolean => {
      for (const node of nodes) {
        if (node.id === potentialDescendantId) {
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (checkDescendants(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkDescendants(descendants);
  }

  // Get account statistics
  async getAccountStats(organizationId: string, ownerId?: string, isAdmin?: boolean): Promise<any> {
    const where: Prisma.AccountWhereInput = (ownerId && !isAdmin) ? { ownerId } : {};

    where.organizationId = organizationId;

    const [total, byType, byIndustry, totalRevenue, topAccounts] = await Promise.all([
      this.prisma.account.count({ where }),
      this.prisma.account.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
      this.prisma.account.groupBy({
        by: ['industry'],
        where: {
          ...where,
          industry: { not: null },
        },
        _count: true,
      }),
      this.prisma.account.aggregate({
        where,
        _sum: { annualRevenue: true },
      }),
      this.prisma.account.findMany({
        where,
        orderBy: { annualRevenue: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          type: true,
          annualRevenue: true,
          _count: {
            select: {
              opportunities: true,
              contacts: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      byType,
      byIndustry,
      totalRevenue: totalRevenue._sum.annualRevenue || 0,
      topAccounts,
    };
  }

  // Get account revenue and pipeline (with ownership verification)
  async getAccountRevenue(id: string, userId: string, organizationId: string, isAdmin?: boolean): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const account = await this.prisma.account.findFirst({ where });

    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }

    const [closedWonRevenue, pipelineValue, opportunities] = await Promise.all([
      this.prisma.opportunity.aggregate({
        where: {
          accountId: id,
          isWon: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.opportunity.aggregate({
        where: {
          accountId: id,
          isClosed: false,
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.opportunity.findMany({
        where: { accountId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          stage: true,
          amount: true,
          probability: true,
          closeDate: true,
          isWon: true,
          isClosed: true,
        },
      }),
    ]);

    // Calculate average deal size
    const totalClosedWon = closedWonRevenue._sum.amount || 0;
    const closedWonCount = closedWonRevenue._count || 0;
    const avgDealSize = closedWonCount > 0 ? totalClosedWon / closedWonCount : 0;

    // Calculate revenue by month from opportunities
    const monthlyRevenue = new Map<string, number>();
    opportunities.forEach(opp => {
      if (opp.isWon && opp.amount) {
        const month = opp.closeDate
          ? new Date(opp.closeDate).toLocaleString('en-US', { month: 'short', year: '2-digit' })
          : 'Unknown';
        monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + opp.amount);
      }
    });

    const revenueByMonth = Array.from(monthlyRevenue.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .slice(-12); // Last 12 months

    return {
      accountId: id,
      accountName: account.name,
      // Frontend-expected fields
      totalRevenue: totalClosedWon,
      closedWonDeals: closedWonCount,
      openDeals: pipelineValue._count || 0,
      avgDealSize,
      revenueByMonth,
      // Legacy fields for backward compatibility
      closedWonRevenue: totalClosedWon,
      closedWonCount,
      pipelineValue: pipelineValue._sum.amount || 0,
      pipelineCount: pipelineValue._count,
      opportunities,
    };
  }

  // ============ Bulk Operations ============

  async bulkUpdate(ids: string[], userId: string, updates: any, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.account.updateMany({
      where,
      data: updates,
    });

    return {
      message: `Successfully updated ${result.count} accounts`,
      count: result.count,
    };
  }

  async bulkDelete(ids: string[], userId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.account.deleteMany({ where });

    return {
      message: `Successfully deleted ${result.count} accounts`,
      count: result.count,
    };
  }

  async bulkAssign(ids: string[], userId: string, newOwnerId: string, organizationId: string, isAdmin?: boolean) {
    const where: any = { id: { in: ids } };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;

    const result = await this.prisma.account.updateMany({
      where,
      data: { ownerId: newOwnerId },
    });

    return {
      message: `Successfully assigned ${result.count} accounts to new owner`,
      count: result.count,
    };
  }
}
