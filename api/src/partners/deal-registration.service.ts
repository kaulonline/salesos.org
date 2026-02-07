import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DealRegistrationStatus, Prisma, OpportunityStage } from '@prisma/client';

export interface CreateDealRegistrationDto {
  accountName: string;
  accountId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactTitle?: string;
  estimatedValue?: number;
  estimatedCloseDate?: string;
  productInterest?: string[];
  useCase?: string;
  competitorInfo?: string;
  notes?: string;
}

export interface UpdateDealRegistrationDto extends Partial<CreateDealRegistrationDto> {}

interface RegistrationFilters {
  status?: string;
  partnerId?: string;
}

@Injectable()
export class DealRegistrationService {
  private readonly logger = new Logger(DealRegistrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Admin Methods
  // ============================================

  async findAll(
    filters: RegistrationFilters,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view all deal registrations');
    }

    const where: Prisma.DealRegistrationWhereInput = { organizationId };

    if (filters.status) {
      where.status = filters.status as DealRegistrationStatus;
    }

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    return this.prisma.dealRegistration.findMany({
      where,
      include: {
        partner: { select: { id: true, companyName: true, tier: true } },
        account: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByPartner(
    partnerId: string,
    status: string | undefined,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view partner registrations');
    }

    const where: Prisma.DealRegistrationWhereInput = { partnerId, organizationId };

    if (status) {
      where.status = status as DealRegistrationStatus;
    }

    return this.prisma.dealRegistration.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(
    id: string,
    options: { commissionRate?: number; protectionDays?: number },
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can approve deal registrations');
    }

    const registration = await this.prisma.dealRegistration.findFirst({
      where: { id, organizationId },
      include: { partner: { select: { commissionRate: true } } },
    });

    if (!registration) {
      throw new NotFoundException('Deal registration not found');
    }

    if (registration.status !== DealRegistrationStatus.PENDING &&
        registration.status !== DealRegistrationStatus.UNDER_REVIEW) {
      throw new BadRequestException('Can only approve pending or under-review registrations');
    }

    const protectionDays = options.protectionDays || 90;
    const approvedUntil = new Date();
    approvedUntil.setDate(approvedUntil.getDate() + protectionDays);

    const commissionRate = options.commissionRate || registration.partner.commissionRate || 10;

    const updated = await this.prisma.dealRegistration.update({
      where: { id },
      data: {
        status: DealRegistrationStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: userId,
        approvedUntil,
        commissionRate,
        estimatedCommission: registration.estimatedValue
          ? (registration.estimatedValue * commissionRate) / 100
          : null,
      },
      include: {
        partner: { select: { id: true, companyName: true } },
      },
    });

    this.logger.log(`Approved deal registration ${registration.registrationNumber}`);
    return updated;
  }

  async reject(
    id: string,
    reason: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reject deal registrations');
    }

    const registration = await this.prisma.dealRegistration.findFirst({
      where: { id, organizationId },
    });

    if (!registration) {
      throw new NotFoundException('Deal registration not found');
    }

    const updated = await this.prisma.dealRegistration.update({
      where: { id },
      data: {
        status: DealRegistrationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: reason,
      },
    });

    this.logger.log(`Rejected deal registration ${registration.registrationNumber}: ${reason}`);
    return updated;
  }

  async convertToOpportunity(
    id: string,
    userId: string,
    isAdmin: boolean,
    organizationId: string,
  ) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can convert deal registrations');
    }

    const registration = await this.prisma.dealRegistration.findFirst({
      where: { id, organizationId },
      include: {
        partner: { select: { id: true, companyName: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Deal registration not found');
    }

    if (registration.status !== DealRegistrationStatus.APPROVED) {
      throw new BadRequestException('Can only convert approved registrations');
    }

    if (registration.opportunityId) {
      throw new BadRequestException('Registration already converted to opportunity');
    }

    // Find or create account
    let accountId = registration.accountId;
    if (!accountId) {
      // Create new account from registration info
      const account = await this.prisma.account.create({
        data: {
          organizationId,
          ownerId: userId,
          name: registration.accountName,
        },
      });
      accountId = account.id;
    }

    // Create opportunity
    const opportunity = await this.prisma.opportunity.create({
      data: {
        organizationId,
        accountId,
        ownerId: userId,
        name: `${registration.accountName} - Partner Deal`,
        amount: registration.estimatedValue,
        closeDate: registration.estimatedCloseDate,
        stage: OpportunityStage.QUALIFICATION,
        metadata: {
          source: 'partner_registration',
          partnerId: registration.partnerId,
          partnerName: registration.partner.companyName,
          registrationNumber: registration.registrationNumber,
        },
      },
    });

    // Update registration with opportunity link
    const updated = await this.prisma.dealRegistration.update({
      where: { id },
      data: {
        status: DealRegistrationStatus.CONVERTED,
        opportunityId: opportunity.id,
        accountId,
        convertedAt: new Date(),
        convertedById: userId,
      },
      include: {
        opportunity: { select: { id: true, name: true, stage: true } },
      },
    });

    // Update partner stats
    await this.prisma.partner.update({
      where: { id: registration.partnerId },
      data: { totalRegistrations: { increment: 1 } },
    });

    this.logger.log(`Converted deal registration ${registration.registrationNumber} to opportunity ${opportunity.id}`);
    return updated;
  }

  // ============================================
  // Portal Methods
  // ============================================

  async getForPortalUser(userId: string, status: string | undefined, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    const where: Prisma.DealRegistrationWhereInput = {
      partnerId: partnerUser.partnerId,
    };

    if (status) {
      where.status = status as DealRegistrationStatus;
    }

    return this.prisma.dealRegistration.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForPortalUserById(id: string, userId: string, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    const registration = await this.prisma.dealRegistration.findFirst({
      where: { id, partnerId: partnerUser.partnerId },
      include: {
        account: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true, amount: true } },
      },
    });

    if (!registration) {
      throw new NotFoundException('Deal registration not found');
    }

    return registration;
  }

  async createFromPortal(dto: CreateDealRegistrationDto, userId: string, organizationId: string) {
    const partnerUser = await this.prisma.partnerUser.findFirst({
      where: { userId, isActive: true, partner: { organizationId } },
      include: { partner: { select: { id: true, commissionRate: true } } },
    });

    if (!partnerUser) {
      throw new ForbiddenException('Portal access denied');
    }

    // Check for duplicate (same account name and contact email within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existing = await this.prisma.dealRegistration.findFirst({
      where: {
        partnerId: partnerUser.partnerId,
        accountName: { equals: dto.accountName, mode: 'insensitive' },
        contactEmail: { equals: dto.contactEmail, mode: 'insensitive' },
        createdAt: { gte: thirtyDaysAgo },
        status: { notIn: [DealRegistrationStatus.REJECTED, DealRegistrationStatus.EXPIRED] },
      },
    });

    if (existing) {
      throw new BadRequestException('A similar deal registration already exists');
    }

    const registration = await this.prisma.dealRegistration.create({
      data: {
        partnerId: partnerUser.partnerId,
        organizationId,
        accountName: dto.accountName,
        accountId: dto.accountId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactTitle: dto.contactTitle,
        estimatedValue: dto.estimatedValue,
        estimatedCloseDate: dto.estimatedCloseDate ? new Date(dto.estimatedCloseDate) : undefined,
        productInterest: dto.productInterest || [],
        useCase: dto.useCase,
        competitorInfo: dto.competitorInfo,
        notes: dto.notes,
        status: DealRegistrationStatus.DRAFT,
      },
    });

    this.logger.log(`Created deal registration ${registration.registrationNumber} from portal`);
    return registration;
  }

  async updateFromPortal(id: string, dto: UpdateDealRegistrationDto, userId: string, organizationId: string) {
    const registration = await this.getForPortalUserById(id, userId, organizationId);

    if (registration.status !== DealRegistrationStatus.DRAFT) {
      throw new BadRequestException('Can only update draft registrations');
    }

    return this.prisma.dealRegistration.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        accountId: dto.accountId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        contactTitle: dto.contactTitle,
        estimatedValue: dto.estimatedValue,
        estimatedCloseDate: dto.estimatedCloseDate ? new Date(dto.estimatedCloseDate) : undefined,
        productInterest: dto.productInterest,
        useCase: dto.useCase,
        competitorInfo: dto.competitorInfo,
        notes: dto.notes,
      },
    });
  }

  async submitFromPortal(id: string, userId: string, organizationId: string) {
    const registration = await this.getForPortalUserById(id, userId, organizationId);

    if (registration.status !== DealRegistrationStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft registrations');
    }

    return this.prisma.dealRegistration.update({
      where: { id },
      data: {
        status: DealRegistrationStatus.PENDING,
      },
    });
  }

  // ============================================
  // Stats
  // ============================================

  async getStats(userId: string, isAdmin: boolean, organizationId: string) {
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can view registration stats');
    }

    const [total, byStatus, totalValue, avgApprovalTime] = await Promise.all([
      this.prisma.dealRegistration.count({ where: { organizationId } }),
      this.prisma.dealRegistration.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.dealRegistration.aggregate({
        where: {
          organizationId,
          status: { in: [DealRegistrationStatus.APPROVED, DealRegistrationStatus.CONVERTED, DealRegistrationStatus.WON] },
        },
        _sum: { estimatedValue: true, estimatedCommission: true },
      }),
      // Calculate average approval time
      this.prisma.dealRegistration.findMany({
        where: {
          organizationId,
          approvedAt: { not: null },
        },
        select: { createdAt: true, approvedAt: true },
        take: 100,
        orderBy: { approvedAt: 'desc' },
      }),
    ]);

    // Calculate average approval time in days
    let avgDays = 0;
    if (avgApprovalTime.length > 0) {
      const totalDays = avgApprovalTime.reduce((sum, r) => {
        if (r.approvedAt) {
          const diff = r.approvedAt.getTime() - r.createdAt.getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }
        return sum;
      }, 0);
      avgDays = Math.round(totalDays / avgApprovalTime.length * 10) / 10;
    }

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      totalEstimatedValue: totalValue._sum.estimatedValue || 0,
      totalEstimatedCommission: totalValue._sum.estimatedCommission || 0,
      avgApprovalDays: avgDays,
    };
  }
}
