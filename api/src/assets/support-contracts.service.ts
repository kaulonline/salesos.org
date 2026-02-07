import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SupportContractType, ContractStatus, Prisma } from '@prisma/client';

export interface CreateSupportContractDto {
  accountId: string;
  contractNumber?: string;
  name: string;
  type?: SupportContractType;
  startDate: string;
  endDate: string;
  contractValue: number;
  annualValue?: number;
  slaLevel?: string;
  responseTime?: number;
  autoRenew?: boolean;
  renewalNotice?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSupportContractDto extends Partial<CreateSupportContractDto> {
  status?: ContractStatus;
}

interface ContractFilters {
  accountId?: string;
  status?: string;
  expiringDays?: number;
}

@Injectable()
export class SupportContractsService {
  private readonly logger = new Logger(SupportContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Support Contract CRUD
  // ============================================

  async findAll(
    filters: ContractFilters,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.SupportContractWhereInput = { organizationId };

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.status) {
      where.status = filters.status as ContractStatus;
    }

    if (filters.expiringDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringDays);
      where.endDate = { lte: futureDate, gte: new Date() };
      where.status = ContractStatus.ACTIVATED;
    }

    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    return this.prisma.supportContract.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { coveredAssets: true } },
      },
      orderBy: [{ endDate: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const contract = await this.prisma.supportContract.findFirst({
      where: { id, organizationId },
      include: {
        account: { select: { id: true, name: true, ownerId: true } },
        coveredAssets: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Support contract not found');
    }

    if (!isAdmin && contract.account.ownerId !== userId) {
      throw new NotFoundException('Support contract not found');
    }

    return contract;
  }

  async create(dto: CreateSupportContractDto, userId: string, isAdmin: boolean, organizationId: string) {
    // Verify account access
    await this.verifyAccountAccess(dto.accountId, userId, isAdmin, organizationId);

    // Generate contract number if not provided
    const contractNumber = dto.contractNumber || await this.generateContractNumber(organizationId);

    const contract = await this.prisma.supportContract.create({
      data: {
        accountId: dto.accountId,
        organizationId,
        contractNumber,
        name: dto.name,
        type: dto.type || SupportContractType.STANDARD,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        contractValue: dto.contractValue,
        annualValue: dto.annualValue,
        slaLevel: dto.slaLevel,
        responseTime: dto.responseTime,
        autoRenew: dto.autoRenew || false,
        renewalNotice: dto.renewalNotice,
        status: ContractStatus.ACTIVATED,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Created support contract: ${contract.contractNumber}`);
    return contract;
  }

  async update(id: string, dto: UpdateSupportContractDto, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(id, userId, isAdmin, organizationId);

    return this.prisma.supportContract.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        contractValue: dto.contractValue,
        annualValue: dto.annualValue,
        slaLevel: dto.slaLevel,
        responseTime: dto.responseTime,
        autoRenew: dto.autoRenew,
        renewalNotice: dto.renewalNotice,
        status: dto.status,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { coveredAssets: true } },
      },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const contract = await this.findOne(id, userId, isAdmin, organizationId);

    // Unlink covered assets first
    await this.prisma.asset.updateMany({
      where: { supportContractId: id },
      data: { supportContractId: null },
    });

    await this.prisma.supportContract.delete({ where: { id } });

    this.logger.log(`Deleted support contract: ${contract.contractNumber}`);
    return { success: true };
  }

  // ============================================
  // Asset Assignment
  // ============================================

  async assignAssets(
    contractId: string,
    assetIds: string[],
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const contract = await this.findOne(contractId, userId, isAdmin, organizationId);

    // Verify all assets belong to the same account
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, accountId: true },
    });

    const invalidAssets = assets.filter(a => a.accountId !== contract.accountId);
    if (invalidAssets.length > 0) {
      throw new BadRequestException('All assets must belong to the same account as the contract');
    }

    // Assign assets to contract
    await this.prisma.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { supportContractId: contractId },
    });

    this.logger.log(`Assigned ${assetIds.length} assets to contract ${contractId}`);
    return { success: true, assignedCount: assetIds.length };
  }

  // ============================================
  // Stats
  // ============================================

  async getStats(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.SupportContractWhereInput = { organizationId };

    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const [total, byStatus, byType, totalValue, expiringIn30, expiringIn90] = await Promise.all([
      this.prisma.supportContract.count({ where }),
      this.prisma.supportContract.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.supportContract.groupBy({
        by: ['type'],
        where: { ...where, status: ContractStatus.ACTIVATED },
        _count: true,
        _sum: { contractValue: true },
      }),
      this.prisma.supportContract.aggregate({
        where: { ...where, status: ContractStatus.ACTIVATED },
        _sum: { contractValue: true, annualValue: true },
      }),
      this.prisma.supportContract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVATED,
          endDate: { gte: now, lte: thirtyDays },
        },
      }),
      this.prisma.supportContract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVATED,
          endDate: { gte: now, lte: ninetyDays },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
        value: t._sum.contractValue || 0,
      })),
      totalContractValue: totalValue._sum.contractValue || 0,
      totalAnnualValue: totalValue._sum.annualValue || 0,
      expiringIn30Days: expiringIn30,
      expiringIn90Days: expiringIn90,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async verifyAccountAccess(
    accountId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.AccountWhereInput = {
      id: accountId,
      organizationId,
    };

    if (!isAdmin) {
      where.ownerId = userId;
    }

    const account = await this.prisma.account.findFirst({
      where,
      select: { id: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found or access denied');
    }

    return account;
  }

  private async generateContractNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.supportContract.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    return `SC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
