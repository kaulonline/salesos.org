import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PartnerStatus, PartnerTier, PartnerType, PartnerUserRole, Prisma } from '@prisma/client';

export interface CreatePartnerDto {
  companyName: string;
  website?: string;
  logoUrl?: string;
  type?: PartnerType;
  tier?: PartnerTier;
  commissionRate?: number;
  discountRate?: number;
  portalEnabled?: boolean;
  partnerManagerId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  territory?: string;
  industry?: string[];
  certifications?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePartnerDto extends Partial<CreatePartnerDto> {
  status?: PartnerStatus;
}

export interface AddPartnerUserDto {
  userId: string;
  role?: PartnerUserRole;
  isPrimary?: boolean;
}

export interface AssignAccountDto {
  accountId: string;
  isExclusive?: boolean;
  expiresAt?: string;
  notes?: string;
}

interface PartnerFilters {
  status?: string;
  tier?: string;
  type?: string;
  search?: string;
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Partner CRUD
  // ============================================

  async findAll(
    filters: PartnerFilters,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view all partners');
    }

    const where: Prisma.PartnerWhereInput = { organizationId };

    if (filters.status) {
      where.status = filters.status as PartnerStatus;
    }

    if (filters.tier) {
      where.tier = filters.tier as PartnerTier;
    }

    if (filters.type) {
      where.type = filters.type as PartnerType;
    }

    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.partner.findMany({
      where,
      include: {
        partnerManager: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            users: true,
            accounts: true,
            dealRegistrations: true,
          },
        },
      },
      orderBy: [{ tier: 'desc' }, { companyName: 'asc' }],
    });
  }

  async findOne(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { id, organizationId },
      include: {
        partnerManager: { select: { id: true, name: true, email: true } },
        users: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            accounts: true,
            dealRegistrations: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Check access: admin or member of this partner
    if (!isAdmin) {
      const isMember = partner.users.some(u => u.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }
    }

    return partner;
  }

  async create(dto: CreatePartnerDto, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can create partners');
    }

    // Check for duplicate name
    const existing = await this.prisma.partner.findUnique({
      where: { organizationId_companyName: { organizationId, companyName: dto.companyName } },
    });

    if (existing) {
      throw new BadRequestException('A partner with this name already exists');
    }

    const partner = await this.prisma.partner.create({
      data: {
        organizationId,
        companyName: dto.companyName,
        website: dto.website,
        logoUrl: dto.logoUrl,
        type: dto.type || PartnerType.RESELLER,
        tier: dto.tier || PartnerTier.REGISTERED,
        status: PartnerStatus.PENDING,
        commissionRate: dto.commissionRate,
        discountRate: dto.discountRate,
        portalEnabled: dto.portalEnabled || false,
        partnerManagerId: dto.partnerManagerId,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        territory: dto.territory,
        industry: dto.industry || [],
        certifications: dto.certifications || [],
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        partnerManager: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Created partner: ${partner.companyName}`);
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update partners');
    }

    await this.findOne(id, userId, isAdmin, organizationId);

    return this.prisma.partner.update({
      where: { id },
      data: {
        companyName: dto.companyName,
        website: dto.website,
        logoUrl: dto.logoUrl,
        type: dto.type,
        tier: dto.tier,
        status: dto.status,
        commissionRate: dto.commissionRate,
        discountRate: dto.discountRate,
        portalEnabled: dto.portalEnabled,
        partnerManagerId: dto.partnerManagerId,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        territory: dto.territory,
        industry: dto.industry,
        certifications: dto.certifications,
        notes: dto.notes,
        metadata: dto.metadata,
      },
      include: {
        partnerManager: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can delete partners');
    }

    await this.findOne(id, userId, isAdmin, organizationId);
    await this.prisma.partner.delete({ where: { id } });

    this.logger.log(`Deleted partner: ${id}`);
    return { success: true };
  }

  // ============================================
  // Partner Users
  // ============================================

  async getPartnerUsers(id: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(id, userId, isAdmin, organizationId);

    return this.prisma.partnerUser.findMany({
      where: { partnerId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { role: 'asc' }],
    });
  }

  async addPartnerUser(partnerId: string, dto: AddPartnerUserDto, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can add partner users');
    }

    await this.findOne(partnerId, userId, isAdmin, organizationId);

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already a partner user
    const existing = await this.prisma.partnerUser.findUnique({
      where: { partnerId_userId: { partnerId, userId: dto.userId } },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this partner');
    }

    // If setting as primary, unset others
    if (dto.isPrimary) {
      await this.prisma.partnerUser.updateMany({
        where: { partnerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.partnerUser.create({
      data: {
        partnerId,
        userId: dto.userId,
        role: dto.role || PartnerUserRole.MEMBER,
        isPrimary: dto.isPrimary || false,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async updatePartnerUser(partnerUserId: string, dto: Partial<AddPartnerUserDto>, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update partner users');
    }

    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      include: { partner: { select: { organizationId: true } } },
    });

    if (!partnerUser || partnerUser.partner.organizationId !== organizationId) {
      throw new NotFoundException('Partner user not found');
    }

    // If setting as primary, unset others
    if (dto.isPrimary) {
      await this.prisma.partnerUser.updateMany({
        where: { partnerId: partnerUser.partnerId, isPrimary: true, id: { not: partnerUserId } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.partnerUser.update({
      where: { id: partnerUserId },
      data: {
        role: dto.role,
        isPrimary: dto.isPrimary,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async removePartnerUser(partnerUserId: string, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can remove partner users');
    }

    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      include: { partner: { select: { organizationId: true } } },
    });

    if (!partnerUser || partnerUser.partner.organizationId !== organizationId) {
      throw new NotFoundException('Partner user not found');
    }

    await this.prisma.partnerUser.delete({ where: { id: partnerUserId } });
    return { success: true };
  }

  // ============================================
  // Partner Accounts
  // ============================================

  async getPartnerAccounts(partnerId: string, userId: string, isAdmin: boolean, organizationId: string) {
    await this.findOne(partnerId, userId, isAdmin, organizationId);

    return this.prisma.partnerAccount.findMany({
      where: { partnerId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            industry: true,
            type: true,
            annualRevenue: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async assignAccount(partnerId: string, dto: AssignAccountDto, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can assign accounts to partners');
    }

    await this.findOne(partnerId, userId, isAdmin, organizationId);

    // Verify account exists
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, organizationId },
    });

    if (!account) {
      throw new BadRequestException('Account not found');
    }

    // Check if already assigned
    const existing = await this.prisma.partnerAccount.findUnique({
      where: { partnerId_accountId: { partnerId, accountId: dto.accountId } },
    });

    if (existing) {
      throw new BadRequestException('Account already assigned to this partner');
    }

    // If exclusive, check no other exclusive assignments
    if (dto.isExclusive) {
      const otherExclusive = await this.prisma.partnerAccount.findFirst({
        where: { accountId: dto.accountId, isExclusive: true },
      });
      if (otherExclusive) {
        throw new BadRequestException('Account already has an exclusive partner assignment');
      }
    }

    return this.prisma.partnerAccount.create({
      data: {
        partnerId,
        accountId: dto.accountId,
        isExclusive: dto.isExclusive || false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });
  }

  async unassignAccount(partnerId: string, accountId: string, userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can unassign accounts from partners');
    }

    await this.prisma.partnerAccount.delete({
      where: { partnerId_accountId: { partnerId, accountId } },
    });

    return { success: true };
  }

  // ============================================
  // Portal Methods
  // ============================================

  async getPartnerForUser(userId: string, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
      include: {
        partner: {
          include: {
            partnerManager: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!partnerUser) {
      throw new NotFoundException('You are not associated with any partner');
    }

    return {
      partner: partnerUser.partner,
      role: partnerUser.role,
      isPrimary: partnerUser.isPrimary,
    };
  }

  async getPortalDashboard(userId: string, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    const [partner, registrations, accounts] = await Promise.all([
      this.prisma.partner.findUnique({
        where: { id: partnerUser.partnerId },
      }),
      this.prisma.dealRegistration.groupBy({
        by: ['status'],
        where: { partnerId: partnerUser.partnerId },
        _count: true,
      }),
      this.prisma.partnerAccount.count({
        where: { partnerId: partnerUser.partnerId },
      }),
    ]);

    return {
      partner: {
        id: partner?.id,
        companyName: partner?.companyName,
        tier: partner?.tier,
        totalRevenue: partner?.totalRevenue,
        totalDeals: partner?.totalDeals,
      },
      registrations: {
        total: registrations.reduce((s, r) => s + r._count, 0),
        byStatus: registrations.map(r => ({ status: r.status, count: r._count })),
      },
      assignedAccounts: accounts,
    };
  }

  async getPortalAccounts(userId: string, search: string | undefined, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    const where: Prisma.PartnerAccountWhereInput = {
      partnerId: partnerUser.partnerId,
    };

    if (search) {
      where.account = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    return this.prisma.partnerAccount.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            website: true,
            industry: true,
            type: true,
          },
        },
      },
    });
  }

  async getPortalDeals(userId: string, status: string | undefined, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    // Get opportunities linked via deal registrations
    const where: Prisma.DealRegistrationWhereInput = {
      partnerId: partnerUser.partnerId,
      opportunityId: { not: null },
    };

    if (status === 'open') {
      where.opportunity = { isClosed: false };
    } else if (status === 'won') {
      where.opportunity = { isClosed: true, isWon: true };
    } else if (status === 'lost') {
      where.opportunity = { isClosed: true, isWon: false };
    }

    const registrations = await this.prisma.dealRegistration.findMany({
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
      },
    });

    return registrations.map(r => ({
      registrationId: r.id,
      registrationNumber: r.registrationNumber,
      commissionRate: r.commissionRate,
      opportunity: r.opportunity,
    }));
  }

  // ============================================
  // Stats
  // ============================================

  async getStats(userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view partner stats');
    }

    const [total, byStatus, byTier, byType, totalRevenue] = await Promise.all([
      this.prisma.partner.count({ where: { organizationId } }),
      this.prisma.partner.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.partner.groupBy({
        by: ['tier'],
        where: { organizationId, status: PartnerStatus.APPROVED },
        _count: true,
      }),
      this.prisma.partner.groupBy({
        by: ['type'],
        where: { organizationId, status: PartnerStatus.APPROVED },
        _count: true,
      }),
      this.prisma.partner.aggregate({
        where: { organizationId, status: PartnerStatus.APPROVED },
        _sum: { totalRevenue: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byTier: byTier.map(t => ({ tier: t.tier, count: t._count })),
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      totalPartnerRevenue: totalRevenue._sum.totalRevenue || 0,
    };
  }
}
