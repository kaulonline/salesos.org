import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssetStatus, Prisma } from '@prisma/client';

export interface CreateAssetDto {
  accountId: string;
  productId?: string;
  name: string;
  serialNumber?: string;
  status?: AssetStatus;
  quantity?: number;
  purchaseDate?: string;
  installDate?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  renewalDate?: string;
  renewalValue?: number;
  licenseKey?: string;
  seatCount?: number;
  seatsUsed?: number;
  version?: string;
  configuration?: Record<string, any>;
  supportContractId?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

interface AssetFilters {
  accountId?: string;
  status?: string;
  search?: string;
  expiringDays?: number;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Asset CRUD
  // ============================================

  async findAll(
    filters: AssetFilters,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const where: Prisma.AssetWhereInput = { organizationId };

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.status) {
      where.status = filters.status as AssetStatus;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { licenseKey: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.expiringDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringDays);
      where.OR = [
        { renewalDate: { lte: futureDate, gte: new Date() } },
        { warrantyEndDate: { lte: futureDate, gte: new Date() } },
      ];
    }

    // Non-admins can only see assets from accounts they own
    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, ownerId: true } },
        product: { select: { id: true, name: true, sku: true } },
        supportContract: { select: { id: true, name: true, type: true, endDate: true } },
      },
      orderBy: [{ renewalDate: 'asc' }, { name: 'asc' }],
    });

    return assets;
  }

  async findOne(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
      include: {
        account: { select: { id: true, name: true, ownerId: true } },
        product: { select: { id: true, name: true, sku: true, description: true } },
        supportContract: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (!isAdmin && asset.account.ownerId !== userId) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async create(dto: CreateAssetDto, userId: string, isAdmin: boolean, organizationId: string) {
    // Verify account access
    await this.verifyAccountAccess(dto.accountId, userId, isAdmin, organizationId);

    // Check for duplicate serial number
    if (dto.serialNumber) {
      const existing = await this.prisma.asset.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) {
        throw new BadRequestException('An asset with this serial number already exists');
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        accountId: dto.accountId,
        organizationId,
        productId: dto.productId,
        name: dto.name,
        serialNumber: dto.serialNumber,
        status: dto.status || AssetStatus.ACTIVE,
        quantity: dto.quantity || 1,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        renewalValue: dto.renewalValue,
        licenseKey: dto.licenseKey,
        seatCount: dto.seatCount,
        seatsUsed: dto.seatsUsed,
        version: dto.version,
        configuration: dto.configuration,
        supportContractId: dto.supportContractId,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        account: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    this.logger.log(`Created asset: ${asset.name}`);
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(id, userId, isAdmin, organizationId);

    return this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        quantity: dto.quantity,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        renewalValue: dto.renewalValue,
        licenseKey: dto.licenseKey,
        seatCount: dto.seatCount,
        seatsUsed: dto.seatsUsed,
        version: dto.version,
        configuration: dto.configuration,
        supportContractId: dto.supportContractId,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        account: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(id, userId, isAdmin, organizationId);
    await this.prisma.asset.delete({ where: { id } });
    return { success: true };
  }

  // ============================================
  // Account Assets
  // ============================================

  async getAccountAssets(
    accountId: string,
    status: string | undefined,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyAccountAccess(accountId, userId, isAdmin, organizationId);

    const where: Prisma.AssetWhereInput = { accountId };
    if (status) {
      where.status = status as AssetStatus;
    }

    return this.prisma.asset.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        supportContract: { select: { id: true, name: true, type: true, endDate: true } },
      },
      orderBy: [{ status: 'asc' }, { renewalDate: 'asc' }],
    });
  }

  async getAccountAssetSummary(
    accountId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    await this.verifyAccountAccess(accountId, userId, isAdmin, organizationId);

    const [assets, contracts] = await Promise.all([
      this.prisma.asset.findMany({
        where: { accountId },
        select: {
          status: true,
          renewalValue: true,
          renewalDate: true,
          warrantyEndDate: true,
          seatCount: true,
          seatsUsed: true,
        },
      }),
      this.prisma.supportContract.findMany({
        where: { accountId },
        select: {
          status: true,
          contractValue: true,
          endDate: true,
        },
      }),
    ]);

    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const totalAssets = assets.length;
    const activeAssets = assets.filter(a => a.status === 'ACTIVE').length;
    const totalRenewalValue = assets.reduce((sum, a) => sum + (a.renewalValue || 0), 0);
    const renewalsNext30Days = assets.filter(
      a => a.renewalDate && a.renewalDate >= now && a.renewalDate <= thirtyDays,
    );
    const renewalsNext90Days = assets.filter(
      a => a.renewalDate && a.renewalDate >= now && a.renewalDate <= ninetyDays,
    );
    const expiredWarranties = assets.filter(
      a => a.warrantyEndDate && a.warrantyEndDate < now,
    ).length;
    const totalSeats = assets.reduce((sum, a) => sum + (a.seatCount || 0), 0);
    const usedSeats = assets.reduce((sum, a) => sum + (a.seatsUsed || 0), 0);

    const activeContracts = contracts.filter(c => c.status === 'ACTIVATED').length;
    const totalContractValue = contracts
      .filter(c => c.status === 'ACTIVATED')
      .reduce((sum, c) => sum + (c.contractValue || 0), 0);

    return {
      totalAssets,
      activeAssets,
      totalRenewalValue,
      renewalsNext30Days: {
        count: renewalsNext30Days.length,
        value: renewalsNext30Days.reduce((sum, a) => sum + (a.renewalValue || 0), 0),
      },
      renewalsNext90Days: {
        count: renewalsNext90Days.length,
        value: renewalsNext90Days.reduce((sum, a) => sum + (a.renewalValue || 0), 0),
      },
      expiredWarranties,
      seatUtilization: {
        total: totalSeats,
        used: usedSeats,
        percentage: totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0,
      },
      supportContracts: {
        active: activeContracts,
        totalValue: totalContractValue,
      },
    };
  }

  // ============================================
  // Expiring Assets & Renewal Pipeline
  // ============================================

  async getExpiringAssets(
    days: number,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const now = new Date();

    const where: Prisma.AssetWhereInput = {
      organizationId,
      status: AssetStatus.ACTIVE,
      OR: [
        { renewalDate: { lte: futureDate, gte: now } },
        { warrantyEndDate: { lte: futureDate, gte: now } },
      ],
    };

    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, ownerId: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { renewalDate: 'asc' },
    });

    // Group by urgency
    const urgent = assets.filter(a => {
      const date = a.renewalDate || a.warrantyEndDate;
      if (!date) return false;
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 30;
    });

    const upcoming = assets.filter(a => {
      const date = a.renewalDate || a.warrantyEndDate;
      if (!date) return false;
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 30 && daysUntil <= 60;
    });

    const later = assets.filter(a => {
      const date = a.renewalDate || a.warrantyEndDate;
      if (!date) return false;
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil > 60;
    });

    return {
      urgent: { assets: urgent, totalValue: urgent.reduce((s, a) => s + (a.renewalValue || 0), 0) },
      upcoming: { assets: upcoming, totalValue: upcoming.reduce((s, a) => s + (a.renewalValue || 0), 0) },
      later: { assets: later, totalValue: later.reduce((s, a) => s + (a.renewalValue || 0), 0) },
      totalAssets: assets.length,
      totalValue: assets.reduce((s, a) => s + (a.renewalValue || 0), 0),
    };
  }

  async getRenewalPipeline(
    period: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const now = new Date();
    const endDate = new Date();

    switch (period) {
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarter':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 3);
    }

    const where: Prisma.AssetWhereInput = {
      organizationId,
      status: AssetStatus.ACTIVE,
      renewalDate: { gte: now, lte: endDate },
    };

    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { renewalDate: 'asc' },
    });

    // Group by month
    const byMonth = new Map<string, { assets: typeof assets; value: number }>();
    for (const asset of assets) {
      if (!asset.renewalDate) continue;
      const monthKey = `${asset.renewalDate.getFullYear()}-${String(asset.renewalDate.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { assets: [], value: 0 });
      }
      const bucket = byMonth.get(monthKey)!;
      bucket.assets.push(asset);
      bucket.value += asset.renewalValue || 0;
    }

    return {
      period,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      totalAssets: assets.length,
      totalValue: assets.reduce((s, a) => s + (a.renewalValue || 0), 0),
      byMonth: Array.from(byMonth.entries()).map(([month, data]) => ({
        month,
        assetCount: data.assets.length,
        value: data.value,
        assets: data.assets,
      })),
    };
  }

  // ============================================
  // Stats
  // ============================================

  async getStats(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.AssetWhereInput = { organizationId };

    if (!isAdmin) {
      where.account = { ownerId: userId };
    }

    const [total, byStatus, totalValue, expiringCount] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.asset.aggregate({
        where: { ...where, status: AssetStatus.ACTIVE },
        _sum: { renewalValue: true },
      }),
      this.prisma.asset.count({
        where: {
          ...where,
          status: AssetStatus.ACTIVE,
          renewalDate: {
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      totalRenewalValue: totalValue._sum.renewalValue || 0,
      expiringIn90Days: expiringCount,
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
}
