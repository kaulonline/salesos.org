// Organization Service - Core business logic for organization management
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  OrganizationStatus,
  OrganizationMemberRole,
  OrganizationCodeStatus,
  LicenseStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  CreateOrganizationCodeDto,
  UpdateOrganizationCodeDto,
  AddOrganizationMemberDto,
  UpdateOrganizationMemberDto,
  CreateOrganizationLicenseDto,
  UpdateOrganizationLicenseDto,
  OrganizationCodeValidationResult,
} from './dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // ORGANIZATION CRUD
  // ============================================

  /**
   * Create a new organization
   */
  async createOrganization(dto: CreateOrganizationDto, adminUserId: string) {
    // Check for duplicate slug or domain
    const existing = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { slug: dto.slug },
          ...(dto.domain ? [{ domain: dto.domain }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.slug === dto.slug) {
        throw new ConflictException('An organization with this slug already exists');
      }
      if (dto.domain && existing.domain === dto.domain) {
        throw new ConflictException('An organization with this domain already exists');
      }
    }

    const organization = await this.prisma.organization.create({
      data: {
        ...dto,
        createdBy: adminUserId,
      },
      include: {
        _count: {
          select: { members: true, licenses: true },
        },
      },
    });

    this.logger.log(`Created organization: ${organization.name} (${organization.slug})`);
    return organization;
  }

  /**
   * Get all organizations with pagination
   */
  async getAllOrganizations(
    page = 1,
    pageSize = 20,
    status?: OrganizationStatus,
    search?: string,
  ) {
    const where: Prisma.OrganizationWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      // By default, exclude deleted (INACTIVE) organizations
      where.status = { not: OrganizationStatus.INACTIVE };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              members: { where: { isActive: true } },
              licenses: { where: { status: LicenseStatus.ACTIVE } },
              codes: { where: { status: OrganizationCodeStatus.ACTIVE } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      organizations: organizations.map(org => ({
        ...org,
        memberCount: org._count.members,
        activeLicenseCount: org._count.licenses,
        activeCodeCount: org._count.codes,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        licenses: {
          include: {
            licenseType: {
              select: { id: true, name: true, tier: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        codes: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { members: true, licenses: true, codes: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }

    return organization;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { members: true, licenses: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with slug "${slug}" not found`);
    }

    return organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    await this.getOrganization(id); // Verify exists

    // Check domain uniqueness if being changed
    if (dto.domain) {
      const existingDomain = await this.prisma.organization.findFirst({
        where: { domain: dto.domain, id: { not: id } },
      });
      if (existingDomain) {
        throw new ConflictException('An organization with this domain already exists');
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: { members: true, licenses: true },
        },
      },
    });

    this.logger.log(`Updated organization: ${updated.name}`);
    return updated;
  }

  /**
   * Delete organization (hard delete with cascade)
   * @param force - If true, deletes all members and related data first
   */
  async deleteOrganization(id: string, force = false) {
    const organization = await this.getOrganization(id);

    // Check for active members
    const activeMembers = await this.prisma.organizationMember.count({
      where: { organizationId: id, isActive: true },
    });

    if (activeMembers > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete organization with ${activeMembers} active members. Use force delete to remove all members.`,
      );
    }

    // Delete all related data in order (cascade manually for safety)
    await this.prisma.$transaction(async (tx) => {
      // Delete organization codes
      await tx.organizationCode.deleteMany({
        where: { organizationId: id },
      });

      // Delete organization members
      await tx.organizationMember.deleteMany({
        where: { organizationId: id },
      });

      // Delete the organization
      await tx.organization.delete({
        where: { id },
      });
    });

    this.logger.log(`Permanently deleted organization: ${organization.name} (with ${activeMembers} members)`);
  }

  // ============================================
  // ORGANIZATION CODE MANAGEMENT
  // ============================================

  /**
   * Generate a unique organization code
   */
  private generateOrganizationCode(prefix?: string): string {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    const year = new Date().getFullYear();
    const base = prefix || 'ORG';
    return `${base}-${year}-${randomPart}`;
  }

  /**
   * Create organization registration code
   */
  async createOrganizationCode(dto: CreateOrganizationCodeDto, adminUserId: string) {
    // Verify organization exists
    const organization = await this.getOrganization(dto.organizationId);

    // Generate code if not provided
    const code = dto.code || this.generateOrganizationCode(organization.slug.toUpperCase().slice(0, 8));

    // Check for duplicate code
    const existingCode = await this.prisma.organizationCode.findUnique({
      where: { code },
    });

    if (existingCode) {
      throw new ConflictException('This organization code already exists');
    }

    // Validate license type if provided
    if (dto.autoAssignLicenseId) {
      const licenseType = await this.prisma.licenseType.findUnique({
        where: { id: dto.autoAssignLicenseId },
      });
      if (!licenseType) {
        throw new BadRequestException('Invalid license type ID for auto-assignment');
      }
    }

    const orgCode = await this.prisma.organizationCode.create({
      data: {
        code,
        organizationId: dto.organizationId,
        description: dto.description,
        maxUses: dto.maxUses,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        defaultRole: dto.defaultRole || OrganizationMemberRole.MEMBER,
        autoAssignLicenseId: dto.autoAssignLicenseId,
        notes: dto.notes,
        createdBy: adminUserId,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(`Created organization code: ${code} for ${organization.name}`);
    return orgCode;
  }

  /**
   * Get all organization codes
   */
  async getAllOrganizationCodes(
    page = 1,
    pageSize = 20,
    status?: OrganizationCodeStatus,
    organizationId?: string,
  ) {
    const where: Prisma.OrganizationCodeWhereInput = {};

    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;

    const [codes, total] = await Promise.all([
      this.prisma.organizationCode.findMany({
        where,
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.organizationCode.count({ where }),
    ]);

    return {
      codes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get organization code by ID
   */
  async getOrganizationCode(id: string) {
    const code = await this.prisma.organizationCode.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    if (!code) {
      throw new NotFoundException(`Organization code with ID "${id}" not found`);
    }

    return code;
  }

  /**
   * Update organization code
   */
  async updateOrganizationCode(id: string, dto: UpdateOrganizationCodeDto) {
    await this.getOrganizationCode(id); // Verify exists

    const updated = await this.prisma.organizationCode.update({
      where: { id },
      data: {
        ...dto,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return updated;
  }

  /**
   * Revoke organization code
   * This also suspends all user licenses for members who joined using this code
   * and returns their seats to the organization license pool
   */
  async revokeOrganizationCode(id: string) {
    const code = await this.getOrganizationCode(id);

    if (code.status === OrganizationCodeStatus.REVOKED) {
      throw new BadRequestException('Code is already revoked');
    }

    // Find all organization members who joined using this code
    const membersWithThisCode = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: code.organizationId,
        registrationCode: code.code,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        user: { select: { email: true } },
      },
    });

    this.logger.log(
      `Found ${membersWithThisCode.length} members who joined with code ${code.code}`,
    );

    // For each member, suspend their license and deactivate membership
    for (const member of membersWithThisCode) {
      // Find their user license linked to this organization
      const userLicense = await this.prisma.userLicense.findFirst({
        where: {
          userId: member.userId,
          organizationId: code.organizationId,
          status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
        },
      });

      if (userLicense) {
        // Suspend the license
        await this.prisma.userLicense.update({
          where: { id: userLicense.id },
          data: {
            status: LicenseStatus.SUSPENDED,
            notes: userLicense.notes
              ? `${userLicense.notes}\n\nSuspended: Registration code ${code.code} was revoked`
              : `Suspended: Registration code ${code.code} was revoked`,
          },
        });

        // Decrement the used seats in the org pool
        await this.prisma.organizationLicense.updateMany({
          where: {
            organizationId: code.organizationId,
            licenseTypeId: userLicense.licenseTypeId,
            usedSeats: { gt: 0 },
          },
          data: { usedSeats: { decrement: 1 } },
        });

        this.logger.log(
          `Suspended license for user ${member.user.email} (code revoked)`,
        );
      }

      // Deactivate the organization membership
      await this.prisma.organizationMember.update({
        where: { id: member.id },
        data: { isActive: false },
      });

      this.logger.log(
        `Deactivated membership for user ${member.user.email} (code revoked)`,
      );
    }

    // Update the code status to REVOKED
    await this.prisma.organizationCode.update({
      where: { id },
      data: { status: OrganizationCodeStatus.REVOKED },
    });

    this.logger.log(
      `Revoked organization code: ${code.code}. Suspended ${membersWithThisCode.length} user licenses.`,
    );

    return {
      code: code.code,
      affectedUsers: membersWithThisCode.length,
      message: `Code revoked. ${membersWithThisCode.length} user(s) suspended.`,
    };
  }

  /**
   * Reactivate a revoked organization code
   * This also resumes suspended user licenses for members who had joined using this code
   */
  async reactivateOrganizationCode(id: string) {
    const code = await this.getOrganizationCode(id);

    if (code.status !== OrganizationCodeStatus.REVOKED) {
      throw new BadRequestException('Only revoked codes can be reactivated');
    }

    // Find all organization members who joined using this code and are now inactive
    const membersWithThisCode = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: code.organizationId,
        registrationCode: code.code,
        isActive: false,
      },
      select: {
        id: true,
        userId: true,
        user: { select: { email: true } },
      },
    });

    this.logger.log(
      `Found ${membersWithThisCode.length} inactive members who joined with code ${code.code}`,
    );

    // For each member, resume their license and reactivate membership
    let resumedCount = 0;
    for (const member of membersWithThisCode) {
      // Find their suspended user license linked to this organization
      const userLicense = await this.prisma.userLicense.findFirst({
        where: {
          userId: member.userId,
          organizationId: code.organizationId,
          status: LicenseStatus.SUSPENDED,
        },
      });

      if (userLicense) {
        // Check if the license has expired
        const now = new Date();
        const newStatus = userLicense.endDate < now ? LicenseStatus.EXPIRED : LicenseStatus.ACTIVE;

        // Resume the license
        await this.prisma.userLicense.update({
          where: { id: userLicense.id },
          data: {
            status: newStatus,
            notes: userLicense.notes
              ? `${userLicense.notes}\n\nResumed: Registration code ${code.code} was reactivated`
              : `Resumed: Registration code ${code.code} was reactivated`,
          },
        });

        // Increment the used seats in the org pool (only if license is active)
        if (newStatus === LicenseStatus.ACTIVE) {
          await this.prisma.organizationLicense.updateMany({
            where: {
              organizationId: code.organizationId,
              licenseTypeId: userLicense.licenseTypeId,
            },
            data: { usedSeats: { increment: 1 } },
          });
        }

        this.logger.log(
          `Resumed license for user ${member.user.email} (code reactivated)`,
        );
        resumedCount++;
      }

      // Reactivate the organization membership
      await this.prisma.organizationMember.update({
        where: { id: member.id },
        data: { isActive: true },
      });

      this.logger.log(
        `Reactivated membership for user ${member.user.email} (code reactivated)`,
      );
    }

    // Update the code status to ACTIVE
    await this.prisma.organizationCode.update({
      where: { id },
      data: { status: OrganizationCodeStatus.ACTIVE },
    });

    this.logger.log(
      `Reactivated organization code: ${code.code}. Resumed ${resumedCount} user licenses.`,
    );

    return {
      code: code.code,
      affectedUsers: membersWithThisCode.length,
      resumedLicenses: resumedCount,
      message: `Code reactivated. ${membersWithThisCode.length} membership(s) restored, ${resumedCount} license(s) resumed.`,
    };
  }

  /**
   * Validate an organization code for registration
   * This is the core method called during user registration
   */
  async validateOrganizationCode(code: string): Promise<OrganizationCodeValidationResult> {
    const orgCode = await this.prisma.organizationCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    if (!orgCode) {
      return {
        valid: false,
        reason: 'Invalid organization code',
      };
    }

    // Check code status
    if (orgCode.status !== OrganizationCodeStatus.ACTIVE) {
      return {
        valid: false,
        reason: `Code is ${orgCode.status.toLowerCase()}`,
      };
    }

    // Check organization status
    if (orgCode.organization.status !== OrganizationStatus.ACTIVE) {
      return {
        valid: false,
        reason: 'Organization is not active',
      };
    }

    // Check validity period
    const now = new Date();
    if (orgCode.validFrom && now < orgCode.validFrom) {
      return {
        valid: false,
        reason: 'Code is not yet valid',
      };
    }

    if (orgCode.validUntil && now > orgCode.validUntil) {
      // Auto-update status to EXPIRED
      await this.prisma.organizationCode.update({
        where: { id: orgCode.id },
        data: { status: OrganizationCodeStatus.EXPIRED },
      });
      return {
        valid: false,
        reason: 'Code has expired',
      };
    }

    // Check usage limit
    if (orgCode.maxUses !== null && orgCode.currentUses >= orgCode.maxUses) {
      // Auto-update status to EXHAUSTED
      await this.prisma.organizationCode.update({
        where: { id: orgCode.id },
        data: { status: OrganizationCodeStatus.EXHAUSTED },
      });
      return {
        valid: false,
        reason: 'Code has reached maximum uses',
      };
    }

    return {
      valid: true,
      organization: {
        id: orgCode.organization.id,
        name: orgCode.organization.name,
        slug: orgCode.organization.slug,
      },
      defaultRole: orgCode.defaultRole,
      autoAssignLicenseId: orgCode.autoAssignLicenseId || undefined,
    };
  }

  /**
   * Use an organization code (increment usage count)
   * Called after successful registration
   */
  async useOrganizationCode(code: string): Promise<void> {
    const orgCode = await this.prisma.organizationCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!orgCode) {
      throw new NotFoundException('Organization code not found');
    }

    const newUseCount = orgCode.currentUses + 1;
    const newStatus =
      orgCode.maxUses !== null && newUseCount >= orgCode.maxUses
        ? OrganizationCodeStatus.EXHAUSTED
        : orgCode.status;

    await this.prisma.organizationCode.update({
      where: { id: orgCode.id },
      data: {
        currentUses: newUseCount,
        status: newStatus,
      },
    });
  }

  // ============================================
  // ORGANIZATION MEMBER MANAGEMENT
  // ============================================

  /**
   * Add member to organization
   */
  async addOrganizationMember(
    organizationId: string,
    dto: AddOrganizationMemberDto,
    invitedBy?: string,
    registrationCode?: string,
  ) {
    // Verify organization exists and is active
    const organization = await this.getOrganization(organizationId);
    if (organization.status !== OrganizationStatus.ACTIVE) {
      throw new BadRequestException('Organization is not active');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { userId: dto.userId, organizationId },
    });

    if (existingMember) {
      if (existingMember.isActive) {
        throw new ConflictException('User is already a member of this organization');
      }
      // Reactivate inactive member
      const reactivated = await this.prisma.organizationMember.update({
        where: { id: existingMember.id },
        data: {
          isActive: true,
          role: dto.role || existingMember.role,
          department: dto.department,
          title: dto.title,
          invitedBy,
          registrationCode,
        },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      });
      this.logger.log(`Reactivated member ${user.email} in organization ${organization.name}`);
      return reactivated;
    }

    // Check member limit
    if (organization.maxMembers) {
      const currentMemberCount = await this.prisma.organizationMember.count({
        where: { organizationId, isActive: true },
      });
      if (currentMemberCount >= organization.maxMembers) {
        throw new BadRequestException(
          `Organization has reached maximum member limit (${organization.maxMembers})`,
        );
      }
    }

    // Create new member
    const member = await this.prisma.organizationMember.create({
      data: {
        userId: dto.userId,
        organizationId,
        role: dto.role || OrganizationMemberRole.MEMBER,
        department: dto.department,
        title: dto.title,
        invitedBy,
        registrationCode,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    this.logger.log(`Added member ${user.email} to organization ${organization.name}`);
    return member;
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(
    organizationId: string,
    includeInactive = false,
  ) {
    const where: Prisma.OrganizationMemberWhereInput = { organizationId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const members = await this.prisma.organizationMember.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    // Get user licenses for all members in this organization
    const userIds = members.map((m) => m.userId);
    const userLicenses = await this.prisma.userLicense.findMany({
      where: {
        userId: { in: userIds },
        organizationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        userId: true,
        licenseTypeId: true,
        status: true,
        licenseType: {
          select: { id: true, name: true },
        },
      },
    });

    // Create a map of userId to their license info
    const licenseMap = new Map<
      string,
      { id: string; licenseTypeId: string; licenseTypeName: string; status: string }
    >();
    for (const lic of userLicenses) {
      licenseMap.set(lic.userId, {
        id: lic.id,
        licenseTypeId: lic.licenseTypeId,
        licenseTypeName: lic.licenseType.name,
        status: lic.status,
      });
    }

    // Add license info to each member
    return members.map((member) => ({
      ...member,
      license: licenseMap.get(member.userId) || null,
    }));
  }

  /**
   * Update organization member
   */
  async updateOrganizationMember(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationMemberDto,
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent removing the last owner
    if (dto.role && dto.role !== OrganizationMemberRole.OWNER && member.role === OrganizationMemberRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrganizationMemberRole.OWNER,
          isActive: true,
        },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner. Assign another owner first.');
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: dto,
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });

    return updated;
  }

  /**
   * Remove member from organization
   */
  async removeOrganizationMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId, isActive: true },
      include: {
        user: { select: { email: true } },
        organization: { select: { name: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Active member not found in this organization');
    }

    // Prevent removing the last owner
    if (member.role === OrganizationMemberRole.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          role: OrganizationMemberRole.OWNER,
          isActive: true,
        },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner. Assign another owner first.');
      }
    }

    // Soft delete (deactivate)
    await this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });

    this.logger.log(`Removed member ${member.user.email} from organization ${member.organization.name}`);
  }

  /**
   * Get user's organization membership
   */
  async getUserOrganization(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true },
      include: {
        organization: {
          include: {
            licenses: {
              where: { status: LicenseStatus.ACTIVE },
              include: {
                licenseType: {
                  select: { id: true, name: true, tier: true },
                },
              },
            },
          },
        },
      },
    });

    return membership;
  }

  // ============================================
  // ORGANIZATION LICENSE MANAGEMENT
  // ============================================

  /**
   * Create organization license (license pool)
   */
  async createOrganizationLicense(dto: CreateOrganizationLicenseDto, adminUserId: string) {
    // Verify organization
    const organization = await this.getOrganization(dto.organizationId);
    if (organization.status !== OrganizationStatus.ACTIVE) {
      throw new BadRequestException('Organization is not active');
    }

    // Verify license type
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id: dto.licenseTypeId },
    });
    if (!licenseType) {
      throw new NotFoundException(`License type with ID "${dto.licenseTypeId}" not found`);
    }

    // Check for existing active license of same type
    const existingLicense = await this.prisma.organizationLicense.findFirst({
      where: {
        organizationId: dto.organizationId,
        licenseTypeId: dto.licenseTypeId,
        status: LicenseStatus.ACTIVE,
      },
    });
    if (existingLicense) {
      throw new ConflictException(
        'Organization already has an active license of this type. Update the existing license instead.',
      );
    }

    // Generate license key
    const licenseKey = this.generateLicenseKey();

    const license = await this.prisma.organizationLicense.create({
      data: {
        organizationId: dto.organizationId,
        licenseTypeId: dto.licenseTypeId,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: new Date(dto.endDate),
        totalSeats: dto.totalSeats,
        usedSeats: 0,
        licenseKey,
        autoRenew: dto.autoRenew ?? true,
        customLimits: dto.customLimits,
        purchaseOrderId: dto.purchaseOrderId,
        contractId: dto.contractId,
        notes: dto.notes,
        assignedBy: adminUserId,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        licenseType: { select: { id: true, name: true, tier: true } },
      },
    });

    this.logger.log(
      `Created organization license: ${licenseType.name} for ${organization.name} (${dto.totalSeats} seats)`,
    );
    return license;
  }

  /**
   * Generate license key in format IRISORG-XXXX-XXXX-XXXX
   */
  private generateLicenseKey(): string {
    const randomHex = (length: number) =>
      crypto.randomBytes(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
    return `IRISORG-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}`;
  }

  /**
   * Get organization licenses
   */
  async getOrganizationLicenses(organizationId: string) {
    await this.getOrganization(organizationId); // Verify exists

    const licenses = await this.prisma.organizationLicense.findMany({
      where: { organizationId },
      include: {
        licenseType: {
          include: { features: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return licenses;
  }

  /**
   * Update organization license
   */
  async updateOrganizationLicense(id: string, dto: UpdateOrganizationLicenseDto) {
    const license = await this.prisma.organizationLicense.findUnique({
      where: { id },
    });

    if (!license) {
      throw new NotFoundException(`Organization license with ID "${id}" not found`);
    }

    // Validate seat change - can't reduce below current usage
    if (dto.totalSeats !== undefined && dto.totalSeats < license.usedSeats) {
      throw new BadRequestException(
        `Cannot reduce seats to ${dto.totalSeats}. Currently ${license.usedSeats} seats are in use.`,
      );
    }

    const updated = await this.prisma.organizationLicense.update({
      where: { id },
      data: {
        ...dto,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        licenseType: { select: { id: true, name: true, tier: true } },
      },
    });

    return updated;
  }

  /**
   * Allocate a seat from organization license pool to a user
   * Returns the created UserLicense
   */
  async allocateLicenseSeat(
    organizationLicenseId: string,
    userId: string,
    adminUserId?: string,
  ) {
    const orgLicense = await this.prisma.organizationLicense.findUnique({
      where: { id: organizationLicenseId },
      include: {
        organization: true,
        licenseType: { include: { features: true } },
      },
    });

    if (!orgLicense) {
      throw new NotFoundException('Organization license not found');
    }

    if (orgLicense.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException('Organization license is not active');
    }

    // Check seat availability
    if (orgLicense.usedSeats >= orgLicense.totalSeats) {
      throw new BadRequestException('No available seats in the license pool');
    }

    // Verify user is a member of the organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgLicense.organizationId, isActive: true },
    });

    if (!membership) {
      throw new BadRequestException('User is not an active member of this organization');
    }

    // Check if user already has this license type
    const existingLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        licenseTypeId: orgLicense.licenseTypeId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
    });

    if (existingLicense) {
      throw new ConflictException('User already has an active license of this type');
    }

    // Create user license from pool
    const userLicenseKey = this.generateUserLicenseKey();

    const [userLicense] = await this.prisma.$transaction([
      this.prisma.userLicense.create({
        data: {
          userId,
          licenseTypeId: orgLicense.licenseTypeId,
          organizationId: orgLicense.organizationId,
          licenseKey: userLicenseKey,
          startDate: new Date(),
          endDate: orgLicense.endDate,
          status: LicenseStatus.ACTIVE,
          autoRenew: false, // Organization controls renewal
          assignedBy: adminUserId,
          notes: `Allocated from organization license pool: ${orgLicense.licenseKey}`,
          entitlements: {
            create: orgLicense.licenseType.features.map(feature => ({
              featureId: feature.id,
              isEnabled: true,
              usageLimit: feature.defaultLimit,
              usagePeriod: 'monthly',
            })),
          },
        },
        include: {
          licenseType: { include: { features: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.organizationLicense.update({
        where: { id: organizationLicenseId },
        data: { usedSeats: { increment: 1 } },
      }),
    ]);

    this.logger.log(
      `Allocated license seat to user ${userId} from org license ${orgLicense.licenseKey}`,
    );

    return userLicense;
  }

  /**
   * Generate user license key
   */
  private generateUserLicenseKey(): string {
    const randomHex = (length: number) =>
      crypto.randomBytes(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
    return `IRIS${randomHex(3)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}`;
  }

  /**
   * Deallocate a seat (revoke user license, return to pool)
   */
  async deallocateLicenseSeat(userLicenseId: string) {
    const userLicense = await this.prisma.userLicense.findUnique({
      where: { id: userLicenseId },
      include: {
        user: { select: { email: true } },
      },
    });

    if (!userLicense) {
      throw new NotFoundException('User license not found');
    }

    if (!userLicense.organizationId) {
      throw new BadRequestException('This license was not allocated from an organization pool');
    }

    // Find the org license and decrement used seats
    const orgLicense = await this.prisma.organizationLicense.findFirst({
      where: {
        organizationId: userLicense.organizationId,
        licenseTypeId: userLicense.licenseTypeId,
        status: LicenseStatus.ACTIVE,
      },
    });

    await this.prisma.$transaction([
      // Delete entitlements first
      this.prisma.licenseEntitlement.deleteMany({
        where: { userLicenseId },
      }),
      // Delete user license
      this.prisma.userLicense.delete({
        where: { id: userLicenseId },
      }),
      // Decrement used seats if org license exists
      ...(orgLicense
        ? [
            this.prisma.organizationLicense.update({
              where: { id: orgLicense.id },
              data: { usedSeats: { decrement: 1 } },
            }),
          ]
        : []),
    ]);

    this.logger.log(`Deallocated license seat from user ${userLicense.user.email}`);
  }

  /**
   * Get available seats in organization's license pools
   */
  async getAvailableSeats(organizationId: string) {
    const licenses = await this.prisma.organizationLicense.findMany({
      where: {
        organizationId,
        status: LicenseStatus.ACTIVE,
      },
      include: {
        licenseType: { select: { id: true, name: true, tier: true } },
      },
    });

    return licenses.map(license => ({
      licenseId: license.id,
      licenseType: license.licenseType,
      totalSeats: license.totalSeats,
      usedSeats: license.usedSeats,
      availableSeats: license.totalSeats - license.usedSeats,
      expiresAt: license.endDate,
    }));
  }
}
