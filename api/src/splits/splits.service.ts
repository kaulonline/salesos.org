import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SplitType, SplitStatus, Prisma } from '@prisma/client';

export interface CreateSplitDto {
  userId: string;
  splitType?: SplitType;
  splitPercent: number;
  includeInQuota?: boolean;
  includeInForecast?: boolean;
  notes?: string;
}

export interface UpdateSplitDto {
  splitType?: SplitType;
  splitPercent?: number;
  includeInQuota?: boolean;
  includeInForecast?: boolean;
  notes?: string;
}

interface SplitFilters {
  status?: string;
  includeInForecast?: boolean;
  userId?: string;
}

@Injectable()
export class SplitsService {
  private readonly logger = new Logger(SplitsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Opportunity Splits CRUD
  // ============================================

  async getOpportunitySplits(
    opportunityId: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    // Verify opportunity access
    await this.verifyOpportunityAccess(opportunityId, userId, isAdmin, organizationId);

    const splits = await this.prisma.opportunitySplit.findMany({
      where: { opportunityId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ splitType: 'asc' }, { splitPercent: 'desc' }],
    });

    // Calculate total percentage
    const totalPercent = splits.reduce((sum, s) => sum + s.splitPercent, 0);

    return {
      splits,
      summary: {
        totalPercent,
        splitCount: splits.length,
        isComplete: Math.abs(totalPercent - 100) < 0.01,
        pendingApproval: splits.filter(s => s.status === SplitStatus.PENDING).length,
      },
    };
  }

  async createSplit(
    opportunityId: string,
    dto: CreateSplitDto,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    // Verify opportunity access
    const opportunity = await this.verifyOpportunityAccess(opportunityId, currentUserId, isAdmin, organizationId);

    // Validate percentage
    if (dto.splitPercent <= 0 || dto.splitPercent > 100) {
      throw new BadRequestException('Split percentage must be between 0 and 100');
    }

    // Check if split already exists for this user/type combination
    const existingSplit = await this.prisma.opportunitySplit.findUnique({
      where: {
        opportunityId_userId_splitType: {
          opportunityId,
          userId: dto.userId,
          splitType: dto.splitType || SplitType.REVENUE,
        },
      },
    });

    if (existingSplit) {
      throw new BadRequestException('A split already exists for this user and split type');
    }

    // Calculate split amount
    const splitAmount = opportunity.amount
      ? (opportunity.amount * dto.splitPercent) / 100
      : null;

    const split = await this.prisma.opportunitySplit.create({
      data: {
        opportunityId,
        organizationId,
        userId: dto.userId,
        splitType: dto.splitType || SplitType.REVENUE,
        splitPercent: dto.splitPercent,
        splitAmount,
        includeInQuota: dto.includeInQuota ?? true,
        includeInForecast: dto.includeInForecast ?? true,
        notes: dto.notes,
        status: isAdmin ? SplitStatus.APPROVED : SplitStatus.PENDING,
        approvedById: isAdmin ? currentUserId : null,
        approvedAt: isAdmin ? new Date() : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Created split ${split.id} for opportunity ${opportunityId}`);
    return split;
  }

  async updateSplit(
    splitId: string,
    dto: UpdateSplitDto,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const split = await this.findSplitById(splitId, organizationId);

    // Only admins or the opportunity owner can update splits
    const opportunity = await this.verifyOpportunityAccess(
      split.opportunityId,
      currentUserId,
      isAdmin,
      organizationId,
    );

    if (split.status === SplitStatus.LOCKED) {
      throw new BadRequestException('Cannot update locked splits');
    }

    // Validate percentage if provided
    if (dto.splitPercent !== undefined && (dto.splitPercent <= 0 || dto.splitPercent > 100)) {
      throw new BadRequestException('Split percentage must be between 0 and 100');
    }

    // Calculate new split amount if percentage changed
    let splitAmount = split.splitAmount;
    if (dto.splitPercent !== undefined && opportunity.amount) {
      splitAmount = (opportunity.amount * dto.splitPercent) / 100;
    }

    const updated = await this.prisma.opportunitySplit.update({
      where: { id: splitId },
      data: {
        splitType: dto.splitType,
        splitPercent: dto.splitPercent,
        splitAmount,
        includeInQuota: dto.includeInQuota,
        includeInForecast: dto.includeInForecast,
        notes: dto.notes,
        // Reset approval if non-admin updates
        status: !isAdmin && split.status === SplitStatus.APPROVED ? SplitStatus.PENDING : undefined,
        approvedById: !isAdmin && split.status === SplitStatus.APPROVED ? null : undefined,
        approvedAt: !isAdmin && split.status === SplitStatus.APPROVED ? null : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return updated;
  }

  async deleteSplit(
    splitId: string,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const split = await this.findSplitById(splitId, organizationId);

    // Verify access to opportunity
    await this.verifyOpportunityAccess(split.opportunityId, currentUserId, isAdmin, organizationId);

    if (split.status === SplitStatus.LOCKED) {
      throw new BadRequestException('Cannot delete locked splits');
    }

    await this.prisma.opportunitySplit.delete({ where: { id: splitId } });

    return { success: true };
  }

  async approveSplit(
    splitId: string,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can approve splits');
    }

    const split = await this.findSplitById(splitId, organizationId);

    if (split.status === SplitStatus.LOCKED) {
      throw new BadRequestException('Cannot approve locked splits');
    }

    const updated = await this.prisma.opportunitySplit.update({
      where: { id: splitId },
      data: {
        status: SplitStatus.APPROVED,
        approvedById: currentUserId,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Approved split ${splitId}`);
    return updated;
  }

  async rejectSplit(
    splitId: string,
    reason: string | undefined,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reject splits');
    }

    const split = await this.findSplitById(splitId, organizationId);

    if (split.status === SplitStatus.LOCKED) {
      throw new BadRequestException('Cannot reject locked splits');
    }

    const updated = await this.prisma.opportunitySplit.update({
      where: { id: splitId },
      data: {
        status: SplitStatus.REJECTED,
        notes: reason ? `Rejected: ${reason}` : split.notes,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    this.logger.log(`Rejected split ${splitId}`);
    return updated;
  }

  // ============================================
  // User Splits
  // ============================================

  async getUserSplits(userId: string, filters: SplitFilters, organizationId: string) {
    const where: Prisma.OpportunitySplitWhereInput = {
      userId,
      organizationId,
    };

    if (filters.status) {
      where.status = filters.status as SplitStatus;
    }

    if (filters.includeInForecast !== undefined) {
      where.includeInForecast = filters.includeInForecast;
    }

    const splits = await this.prisma.opportunitySplit.findMany({
      where,
      include: {
        opportunity: {
          select: {
            id: true,
            name: true,
            amount: true,
            stage: true,
            closeDate: true,
            isClosed: true,
            isWon: true,
            account: { select: { id: true, name: true } },
          },
        },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totals = splits.reduce(
      (acc, split) => {
        if (split.splitAmount) {
          acc.totalAmount += split.splitAmount;
          if (split.includeInForecast && !split.opportunity.isClosed) {
            acc.forecastAmount += split.splitAmount;
          }
          if (split.opportunity.isWon) {
            acc.wonAmount += split.splitAmount;
          }
        }
        return acc;
      },
      { totalAmount: 0, forecastAmount: 0, wonAmount: 0 },
    );

    return { splits, totals };
  }

  async getTeamSplits(
    currentUserId: string,
    isAdmin: boolean,
    filters: SplitFilters,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view team splits');
    }

    const where: Prisma.OpportunitySplitWhereInput = {
      organizationId,
    };

    if (filters.status) {
      where.status = filters.status as SplitStatus;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    const splits = await this.prisma.opportunitySplit.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        opportunity: {
          select: {
            id: true,
            name: true,
            amount: true,
            stage: true,
            closeDate: true,
            isClosed: true,
            isWon: true,
            account: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true } },
          },
        },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return splits;
  }

  async getSplitStats(userId: string, isAdmin: boolean, organizationId: string) {
    const where: Prisma.OpportunitySplitWhereInput = {
      organizationId,
    };

    if (!isAdmin) {
      where.userId = userId;
    }

    const [total, pending, approved, byType] = await Promise.all([
      this.prisma.opportunitySplit.count({ where }),
      this.prisma.opportunitySplit.count({ where: { ...where, status: SplitStatus.PENDING } }),
      this.prisma.opportunitySplit.count({ where: { ...where, status: SplitStatus.APPROVED } }),
      this.prisma.opportunitySplit.groupBy({
        by: ['splitType'],
        where,
        _count: true,
        _sum: { splitAmount: true },
      }),
    ]);

    // Get total split amounts by status
    const amounts = await this.prisma.opportunitySplit.aggregate({
      where: { ...where, status: SplitStatus.APPROVED },
      _sum: { splitAmount: true },
    });

    return {
      total,
      pending,
      approved,
      rejected: total - pending - approved,
      totalApprovedAmount: amounts._sum.splitAmount || 0,
      byType: byType.map(t => ({
        type: t.splitType,
        count: t._count,
        amount: t._sum.splitAmount || 0,
      })),
    };
  }

  // ============================================
  // Recalculation
  // ============================================

  async recalculateSplitAmounts(
    opportunityId: string,
    currentUserId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    const opportunity = await this.verifyOpportunityAccess(opportunityId, currentUserId, isAdmin, organizationId);

    if (!opportunity.amount) {
      return { success: true, message: 'Opportunity has no amount to split' };
    }

    const splits = await this.prisma.opportunitySplit.findMany({
      where: { opportunityId },
    });

    // Update each split's amount
    await Promise.all(
      splits.map(split =>
        this.prisma.opportunitySplit.update({
          where: { id: split.id },
          data: {
            splitAmount: (opportunity.amount! * split.splitPercent) / 100,
          },
        }),
      ),
    );

    this.logger.log(`Recalculated split amounts for opportunity ${opportunityId}`);
    return { success: true, updatedCount: splits.length };
  }

  async lockSplitsForClosedDeal(opportunityId: string) {
    await this.prisma.opportunitySplit.updateMany({
      where: { opportunityId },
      data: { status: SplitStatus.LOCKED },
    });

    this.logger.log(`Locked splits for closed opportunity ${opportunityId}`);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async findSplitById(splitId: string, organizationId: string) {
    const split = await this.prisma.opportunitySplit.findFirst({
      where: { id: splitId, organizationId },
    });

    if (!split) {
      throw new NotFoundException('Split not found');
    }

    return split;
  }

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
      select: { id: true, amount: true, ownerId: true, isClosed: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found or access denied');
    }

    return opportunity;
  }
}
