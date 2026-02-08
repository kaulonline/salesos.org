import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SalesOSEmailService } from '../email/salesos-email.service';
import { AccessRequestAIService, AIEnrichmentResult } from './access-request-ai.service';
import {
  CreateAccessRequestDto,
  UpdateAccessRequestDto,
  AccessRequestStatus,
  AccessRequestType,
  SendOrgCodeDto,
  isBusinessEmail,
} from './dto';

@Injectable()
export class AccessRequestsService {
  private readonly logger = new Logger(AccessRequestsService.name);

  constructor(
    private prisma: PrismaService,
    private salesOSEmailService: SalesOSEmailService,
    private aiService: AccessRequestAIService,
  ) {}

  /**
   * Submit a new access request (public endpoint)
   */
  async create(
    dto: CreateAccessRequestDto,
    requestMeta?: { ip: string; userAgent: string },
  ) {
    // Validate business email
    if (!isBusinessEmail(dto.email)) {
      throw new BadRequestException('Please use your work email address');
    }

    // Check for existing request with same email
    const existing = await this.prisma.accessRequest.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        status: { notIn: ['REJECTED', 'CONVERTED'] },
      },
    });

    if (existing) {
      // Don't reveal that a request exists, just return success
      this.logger.log(
        `Duplicate access request attempt for ${dto.email} from IP: ${requestMeta?.ip}`,
      );
      return {
        success: true,
        message:
          "Thank you for your interest! We'll be in touch within 24 hours.",
      };
    }

    // Create the access request
    const accessRequest = await this.prisma.accessRequest.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        companyName: dto.companyName.trim(),
        jobTitle: dto.jobTitle?.trim(),
        companySize: dto.companySize,
        industry: dto.industry,
        website: dto.website?.trim(),
        requestType: dto.requestType || AccessRequestType.FREE_TRIAL,
        interests: dto.interests || [],
        message: dto.message?.trim(),
        howHeard: dto.howHeard,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        ipAddress: requestMeta?.ip,
        userAgent: requestMeta?.userAgent,
      },
    });

    this.logger.log(
      `New access request from ${accessRequest.email} (${accessRequest.companyName}) - IP: ${requestMeta?.ip}`,
    );

    // AI Enrichment - Run asynchronously for instant response
    this.aiService
      .enrichAccessRequest(accessRequest.id)
      .then((enrichment) => {
        this.logger.log(
          `AI enrichment complete for ${accessRequest.email}: Score=${enrichment.score}, Priority=${enrichment.priority}`,
        );
      })
      .catch((error) => {
        this.logger.warn(
          `AI enrichment failed for ${accessRequest.email}: ${error.message}`,
        );
      });

    // Send confirmation email to user
    this.salesOSEmailService
      .sendAccessRequestConfirmationEmail({
        to: accessRequest.email,
        userName: accessRequest.firstName,
        requestType: accessRequest.requestType,
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to send access request confirmation email to ${accessRequest.email}: ${error.message}`,
        );
      });

    // Send notification to admin/sales team
    this.salesOSEmailService
      .sendAccessRequestAdminNotification({
        requestId: accessRequest.id,
        firstName: accessRequest.firstName,
        lastName: accessRequest.lastName,
        email: accessRequest.email,
        companyName: accessRequest.companyName,
        companySize: accessRequest.companySize || undefined,
        requestType: accessRequest.requestType,
        interests: accessRequest.interests,
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to send access request admin notification: ${error.message}`,
        );
      });

    return {
      success: true,
      message:
        "Thank you for your interest! We'll be in touch within 24 hours.",
    };
  }

  /**
   * Re-enrich an access request with AI (admin)
   */
  async reEnrich(id: string): Promise<{ success: boolean; enrichment: AIEnrichmentResult }> {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    const enrichment = await this.aiService.enrichAccessRequest(id);
    return {
      success: true,
      enrichment,
    };
  }

  /**
   * Get AI-sorted access requests (admin)
   */
  async getAISorted(options?: {
    status?: string;
    minScore?: number;
    priority?: string;
    limit?: number;
  }) {
    return this.aiService.getSortedRequests(options);
  }

  /**
   * Get all access requests (admin)
   */
  async findAll(query?: {
    status?: AccessRequestStatus;
    requestType?: AccessRequestType;
    search?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      requestType,
      search,
      assignedToId,
      page = 1,
      limit = 50,
    } = query || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (requestType) {
      where.requestType = requestType;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [requests, total] = await Promise.all([
      this.prisma.accessRequest.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accessRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get access request stats (admin)
   */
  async getStats() {
    const [total, byStatus, byType, thisWeek, pending] = await Promise.all([
      this.prisma.accessRequest.count(),
      this.prisma.accessRequest.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.accessRequest.groupBy({
        by: ['requestType'],
        _count: true,
      }),
      this.prisma.accessRequest.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.accessRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);

    const converted = await this.prisma.accessRequest.count({
      where: { status: 'CONVERTED' },
    });

    const statusCounts = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const typeCounts = byType.reduce(
      (acc, item) => {
        acc[item.requestType] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return {
      total,
      pending,
      thisWeek,
      converted,
      conversionRate: conversionRate.toFixed(1),
      byStatus: statusCounts,
      byType: typeCounts,
    };
  }

  /**
   * Get single access request (admin)
   */
  async findOne(id: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        convertedLead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    return request;
  }

  /**
   * Update access request (admin)
   */
  async update(id: string, dto: UpdateAccessRequestDto) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    const updateData: any = { ...dto };

    // Track status transitions
    if (
      dto.status === 'CONTACTED' &&
      request.status === 'PENDING'
    ) {
      updateData.contactedAt = new Date();
    }
    if (
      dto.status === 'CONVERTED' &&
      request.status !== 'CONVERTED'
    ) {
      updateData.convertedAt = new Date();
    }

    return this.prisma.accessRequest.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Send organization code to user (admin)
   */
  async sendOrganizationCode(id: string, dto: SendOrgCodeDto) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    // Update the request with the org code sent
    await this.prisma.accessRequest.update({
      where: { id },
      data: {
        organizationCodeSent: dto.organizationCode,
        status: 'APPROVED',
      },
    });

    // Send email with org code
    await this.salesOSEmailService.sendOrganizationCodeEmail({
      to: request.email,
      userName: request.firstName,
      organizationCode: dto.organizationCode,
      personalMessage: dto.personalMessage,
    });

    this.logger.log(
      `Organization code ${dto.organizationCode} sent to ${request.email} for request ${id}`,
    );

    return {
      success: true,
      message: `Organization code sent to ${request.email}`,
    };
  }

  /**
   * Convert access request to lead (admin)
   */
  async convertToLead(id: string, ownerId: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.convertedLeadId) {
      throw new BadRequestException('Request already converted to a lead');
    }

    // Create a new lead from the access request
    const lead = await this.prisma.lead.create({
      data: {
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        company: request.companyName,
        title: request.jobTitle,
        industry: request.industry,
        website: request.website,
        leadSource: 'WEB',
        status: 'NEW',
        ownerId,
      },
    });

    // Update the access request
    await this.prisma.accessRequest.update({
      where: { id },
      data: {
        convertedLeadId: lead.id,
        status: 'CONVERTED',
        convertedAt: new Date(),
      },
    });

    this.logger.log(
      `Access request ${id} converted to lead ${lead.id}`,
    );

    return {
      success: true,
      leadId: lead.id,
      message: 'Access request converted to lead successfully',
    };
  }

  /**
   * Delete access request (admin)
   */
  async delete(id: string) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    await this.prisma.accessRequest.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Export access requests as CSV (admin)
   */
  async exportCsv(status?: AccessRequestStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const requests = await this.prisma.accessRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Job Title',
      'Company Size',
      'Industry',
      'Request Type',
      'Interests',
      'Status',
      'How Heard',
      'Created At',
      'Message',
    ];

    const rows = requests.map((r) => [
      r.firstName,
      r.lastName,
      r.email,
      r.phone || '',
      r.companyName,
      r.jobTitle || '',
      r.companySize || '',
      r.industry || '',
      r.requestType,
      (r.interests || []).join('; '),
      r.status,
      r.howHeard || '',
      r.createdAt.toISOString(),
      r.message || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    return csv;
  }
}
