// Licensing Service - Core business logic for license management
import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  OnModuleInit 
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LicenseStatus, LicenseTier, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import {
  CreateLicenseTypeDto,
  UpdateLicenseTypeDto,
  CreateLicenseFeatureDto,
  UpdateLicenseFeatureDto,
  AssignLicenseDto,
  UpdateUserLicenseDto,
  LicenseCheckResult,
  UserLicenseDetails,
  LicenseTypeWithFeatures,
  LicenseDashboardStats,
} from './dto';

@Injectable()
export class LicensingService implements OnModuleInit {
  private readonly logger = new Logger(LicensingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a license key in the format IRISXXX-XXXX-XXXX-XXXX
   * Uses cryptographically secure random bytes
   */
  private generateLicenseKey(): string {
    const randomHex = (length: number) => 
      crypto.randomBytes(Math.ceil(length / 2)).toString('hex').toUpperCase().slice(0, length);
    
    // First segment: IRIS + 3 random chars (7 total)
    const segment1 = 'IRIS' + randomHex(3);
    // Remaining segments: 4 random hex chars each
    const segment2 = randomHex(4);
    const segment3 = randomHex(4);
    const segment4 = randomHex(4);
    
    return `${segment1}-${segment2}-${segment3}-${segment4}`;
  }

  /**
   * Verify a license key format is valid
   */
  private isValidLicenseKeyFormat(key: string): boolean {
    const pattern = /^IRIS[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(key);
  }

  async onModuleInit() {
    this.logger.log('Initializing licensing service...');
    try {
      await this.initializeDefaultLicenses();
      await this.checkAndExpireLicenses();
      // AI Generated Code by Deloitte + Cursor (BEGIN)
      await this.syncAllLicenseEntitlements();
      // AI Generated Code by Deloitte + Cursor (END)
      this.logger.log('Licensing service initialization complete');
    } catch (error) {
      this.logger.error('Failed to initialize licensing service:', error);
    }
  }

  // AI Generated Code by Deloitte + Cursor (BEGIN)
  /**
   * Sync entitlements for all active user licenses
   * This ensures that when features are added to a license type,
   * all existing users get those entitlements automatically
   */
  async syncAllLicenseEntitlements(): Promise<{ 
    syncedLicenses: number; 
    createdEntitlements: number;
    errors: number;
  }> {
    this.logger.log('Syncing license entitlements for all active licenses...');
    
    let syncedLicenses = 0;
    let createdEntitlements = 0;
    let errors = 0;

    try {
      // Get all active user licenses
      const userLicenses = await this.prisma.userLicense.findMany({
        where: {
          status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
        },
        include: {
          licenseType: {
            include: { features: true },
          },
          entitlements: true,
        },
      });

      for (const license of userLicenses) {
        try {
          const result = await this.syncLicenseEntitlements(license.id);
          if (result.created > 0) {
            syncedLicenses++;
            createdEntitlements += result.created;
            this.logger.log(
              `Synced license ${license.id}: created ${result.created} entitlements`,
            );
          }
        } catch (error) {
          errors++;
          this.logger.error(
            `Failed to sync license ${license.id}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `Entitlement sync complete: ${syncedLicenses} licenses synced, ${createdEntitlements} entitlements created, ${errors} errors`,
      );

      return { syncedLicenses, createdEntitlements, errors };
    } catch (error) {
      this.logger.error('Failed to sync all license entitlements:', error);
      throw error;
    }
  }

  /**
   * Sync entitlements for a single user license
   * Creates missing entitlements based on the license type's features
   */
  async syncLicenseEntitlements(userLicenseId: string): Promise<{ 
    created: number; 
    existing: number;
  }> {
    // Get the license with its type and features
    const license = await this.prisma.userLicense.findUnique({
      where: { id: userLicenseId },
      include: {
        licenseType: {
          include: { features: true },
        },
        entitlements: true,
      },
    });

    if (!license) {
      throw new NotFoundException(`License ${userLicenseId} not found`);
    }

    // Get existing entitlement feature IDs
    const existingFeatureIds = new Set(
      license.entitlements.map(e => e.featureId),
    );

    // Find missing features
    const missingFeatures = license.licenseType.features.filter(
      feature => !existingFeatureIds.has(feature.id),
    );

    if (missingFeatures.length === 0) {
      return { created: 0, existing: license.entitlements.length };
    }

    // Create missing entitlements
    await this.prisma.licenseEntitlement.createMany({
      data: missingFeatures.map(feature => ({
        userLicenseId: license.id,
        featureId: feature.id,
        isEnabled: true,
        usageLimit: feature.defaultLimit,
        currentUsage: 0,
        usagePeriod: 'monthly',
        periodResetAt: this.getNextPeriodReset('monthly'),
      })),
    });

    this.logger.log(
      `Created ${missingFeatures.length} missing entitlements for license ${userLicenseId}`,
    );

    return {
      created: missingFeatures.length,
      existing: existingFeatureIds.size,
    };
  }
  // AI Generated Code by Deloitte + Cursor (END)

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize default license types and features if they don't exist
   */
  private async initializeDefaultLicenses() {
    const existingTypes = await this.prisma.licenseType.count();
    if (existingTypes > 0) {
      this.logger.log('License types already exist, skipping initialization');
      return;
    }

    this.logger.log('Creating default license types and features...');

    // Create default features
    const defaultFeatures = [
      // AI Features
      { featureKey: 'ai_chat', name: 'AI Chat', category: 'ai', description: 'AI-powered chat conversations', sortOrder: 1 },
      { featureKey: 'ai_document_search', name: 'Document Search', category: 'ai', description: 'AI document indexing and search', sortOrder: 2 },
      { featureKey: 'ai_web_research', name: 'Web Research', category: 'ai', description: 'AI-powered web research', sortOrder: 3 },
      { featureKey: 'ai_agents', name: 'AI Agents', category: 'ai', description: 'Autonomous AI sales agents', sortOrder: 4 },
      
      // CRM Features
      { featureKey: 'crm_salesforce', name: 'Salesforce Integration', category: 'crm', description: 'Connect to Salesforce CRM', sortOrder: 10 },
      { featureKey: 'crm_hubspot', name: 'HubSpot Integration', category: 'crm', description: 'Connect to HubSpot CRM', sortOrder: 11 },
      { featureKey: 'crm_sync', name: 'CRM Sync', category: 'crm', description: 'Automatic CRM data synchronization', sortOrder: 12 },
      { featureKey: 'crm_write', name: 'CRM Write Access', category: 'crm', description: 'Create and update CRM records', sortOrder: 13 },
      
      // Meeting Features
      { featureKey: 'meetings_record', name: 'Meeting Recording', category: 'meetings', description: 'Record and transcribe meetings', sortOrder: 20 },
      { featureKey: 'meetings_insights', name: 'Meeting Insights', category: 'meetings', description: 'AI-generated meeting insights', sortOrder: 21 },
      { featureKey: 'meetings_action_items', name: 'Action Item Extraction', category: 'meetings', description: 'Automatic action item extraction', sortOrder: 22 },
      
      // Data Features
      { featureKey: 'data_export', name: 'Data Export', category: 'data', description: 'Export data to CSV/Excel', sortOrder: 30 },
      { featureKey: 'data_import', name: 'Data Import', category: 'data', description: 'Bulk import data', sortOrder: 31 },
      { featureKey: 'data_api_access', name: 'API Access', category: 'data', description: 'REST API access', sortOrder: 32 },
      
      // Advanced Features
      { featureKey: 'advanced_analytics', name: 'Advanced Analytics', category: 'advanced', description: 'Advanced reporting and analytics', sortOrder: 40 },
      { featureKey: 'advanced_automation', name: 'Workflow Automation', category: 'advanced', description: 'Automated workflows and triggers', sortOrder: 41 },
      { featureKey: 'advanced_custom_agents', name: 'Custom AI Agents', category: 'advanced', description: 'Build custom AI agents', sortOrder: 42 },
      
      // Email Features
      { featureKey: 'email_tracking', name: 'Email Tracking', category: 'email', description: 'Track email opens and clicks', sortOrder: 50 },
      { featureKey: 'email_automation', name: 'Email Automation', category: 'email', description: 'Automated email sequences', sortOrder: 51 },
    ];

    const createdFeatures = await Promise.all(
      defaultFeatures.map(feature =>
        this.prisma.licenseFeature.create({ data: feature })
      )
    );

    this.logger.log(`Created ${createdFeatures.length} default license features`);

    // Create default license types
    const freeFeatures = createdFeatures.filter(f => 
      ['ai_chat', 'crm_sync'].includes(f.featureKey)
    );
    
    const starterFeatures = createdFeatures.filter(f =>
      ['ai_chat', 'ai_document_search', 'crm_salesforce', 'crm_sync', 'meetings_record', 'data_export'].includes(f.featureKey)
    );
    
    const proFeatures = createdFeatures.filter(f =>
      !['advanced_custom_agents', 'email_automation'].includes(f.featureKey)
    );
    
    const enterpriseFeatures = createdFeatures; // All features

    const licenseTypes = [
      {
        name: 'Free Plan',
        slug: 'free',
        description: 'Basic features for individual users',
        tier: LicenseTier.FREE,
        priceMonthly: 0,
        priceYearly: 0,
        defaultDurationDays: 365,
        maxConversations: 50,
        maxMeetings: 5,
        maxDocuments: 10,
        maxApiCalls: 100,
        sortOrder: 1,
        features: { connect: freeFeatures.map(f => ({ id: f.id })) },
      },
      {
        name: 'Starter Plan',
        slug: 'starter',
        description: 'Essential features for small teams',
        tier: LicenseTier.STARTER,
        priceMonthly: 2900, // $29/month
        priceYearly: 29000, // $290/year
        defaultDurationDays: 30,
        trialDurationDays: 14,
        maxConversations: 500,
        maxMeetings: 50,
        maxDocuments: 100,
        maxApiCalls: 1000,
        sortOrder: 2,
        features: { connect: starterFeatures.map(f => ({ id: f.id })) },
      },
      {
        name: 'Professional Plan',
        slug: 'professional',
        description: 'Advanced features for growing businesses',
        tier: LicenseTier.PROFESSIONAL,
        priceMonthly: 9900, // $99/month
        priceYearly: 99000, // $990/year
        defaultDurationDays: 30,
        trialDurationDays: 14,
        maxConversations: 5000,
        maxMeetings: 500,
        maxDocuments: 1000,
        maxApiCalls: 10000,
        sortOrder: 3,
        features: { connect: proFeatures.map(f => ({ id: f.id })) },
      },
      {
        name: 'Enterprise Plan',
        slug: 'enterprise',
        description: 'Full access with unlimited usage and priority support',
        tier: LicenseTier.ENTERPRISE,
        priceMonthly: 29900, // $299/month
        priceYearly: 299000, // $2990/year
        defaultDurationDays: 365,
        trialDurationDays: 30,
        sortOrder: 4,
        features: { connect: enterpriseFeatures.map(f => ({ id: f.id })) },
      },
    ];

    for (const licenseType of licenseTypes) {
      await this.prisma.licenseType.create({ data: licenseType });
    }

    this.logger.log(`Created ${licenseTypes.length} default license types`);
  }

  /**
   * Check and expire licenses that have passed their end date
   */
  private async checkAndExpireLicenses() {
    const now = new Date();
    
    const expiredLicenses = await this.prisma.userLicense.updateMany({
      where: {
        status: LicenseStatus.ACTIVE,
        endDate: { lt: now },
      },
      data: {
        status: LicenseStatus.EXPIRED,
      },
    });

    if (expiredLicenses.count > 0) {
      this.logger.log(`Expired ${expiredLicenses.count} licenses`);
    }

    // Also check trial expirations
    const expiredTrials = await this.prisma.userLicense.updateMany({
      where: {
        status: LicenseStatus.TRIAL,
        trialEndDate: { lt: now },
      },
      data: {
        status: LicenseStatus.EXPIRED,
        isTrial: false,
      },
    });

    if (expiredTrials.count > 0) {
      this.logger.log(`Expired ${expiredTrials.count} trial licenses`);
    }
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getDashboardStats(): Promise<LicenseDashboardStats> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLicenses,
      activeLicenses,
      trialLicenses,
      expiredLicenses,
      expiringLicenses,
      licensesByTier,
      licensesByStatus,
      recentAssignments,
      featureUsage,
    ] = await Promise.all([
      // Total license assignments
      this.prisma.userLicense.count(),
      
      // Active licenses
      this.prisma.userLicense.count({
        where: { status: LicenseStatus.ACTIVE },
      }),
      
      // Trial licenses
      this.prisma.userLicense.count({
        where: { status: LicenseStatus.TRIAL },
      }),
      
      // Expired licenses
      this.prisma.userLicense.count({
        where: { status: LicenseStatus.EXPIRED },
      }),
      
      // Licenses expiring in next 30 days
      this.prisma.userLicense.count({
        where: {
          status: LicenseStatus.ACTIVE,
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      
      // Licenses by tier
      this.prisma.userLicense.groupBy({
        by: ['licenseTypeId'],
        _count: true,
        where: { status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] } },
      }),
      
      // Licenses by status
      this.prisma.userLicense.groupBy({
        by: ['status'],
        _count: true,
      }),
      
      // Recent license assignments (last 30 days)
      this.prisma.userLicense.count({
        where: { createdAt: { gte: lastMonth } },
      }),
      
      // Top feature usage
      this.prisma.licenseUsage.groupBy({
        by: ['featureKey'],
        _sum: { usageCount: true },
        orderBy: { _sum: { usageCount: 'desc' } },
        take: 10,
      }),
    ]);

    // Get license types for tier breakdown
    const licenseTypes = await this.prisma.licenseType.findMany({
      select: { id: true, name: true, tier: true },
    });
    const licenseTypeMap = new Map(licenseTypes.map(lt => [lt.id, lt]));

    const tierBreakdown = licensesByTier.map(item => ({
      licenseTypeId: item.licenseTypeId,
      name: licenseTypeMap.get(item.licenseTypeId)?.name || 'Unknown',
      tier: licenseTypeMap.get(item.licenseTypeId)?.tier || 'UNKNOWN',
      count: item._count,
    }));

    const statusBreakdown = licensesByStatus.map(item => ({
      status: item.status,
      count: item._count,
    }));

    return {
      totalLicenses,
      activeLicenses,
      trialLicenses,
      expiredLicenses,
      expiringLicenses,
      recentAssignments,
      tierBreakdown,
      statusBreakdown,
      topFeatureUsage: featureUsage.map(item => ({
        featureKey: item.featureKey,
        usageCount: item._sum.usageCount || 0,
      })),
    };
  }

  // ============================================
  // LICENSE TYPES MANAGEMENT
  // ============================================

  async getAllLicenseTypes(): Promise<LicenseTypeWithFeatures[]> {
    const types = await this.prisma.licenseType.findMany({
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { userLicenses: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return types.map(t => ({
      ...t,
      userCount: t._count.userLicenses,
    }));
  }

  async getLicenseType(id: string): Promise<LicenseTypeWithFeatures> {
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id },
      include: {
        features: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { userLicenses: true },
        },
      },
    });

    if (!licenseType) {
      throw new NotFoundException(`License type with ID "${id}" not found`);
    }

    return {
      ...licenseType,
      userCount: licenseType._count.userLicenses,
    };
  }

  async createLicenseType(dto: CreateLicenseTypeDto, adminUserId: string): Promise<LicenseTypeWithFeatures> {
    const existing = await this.prisma.licenseType.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });

    if (existing) {
      throw new BadRequestException('A license type with this name or slug already exists');
    }

    const licenseType = await this.prisma.licenseType.create({
      data: {
        ...dto,
        features: dto.featureIds ? { connect: dto.featureIds.map(id => ({ id })) } : undefined,
      },
      include: {
        features: true,
        _count: { select: { userLicenses: true } },
      },
    });

    await this.logLicenseAction('CREATE', 'LicenseType', licenseType.id, adminUserId, null, dto);

    return { ...licenseType, userCount: 0 };
  }

  async updateLicenseType(id: string, dto: UpdateLicenseTypeDto, adminUserId: string): Promise<LicenseTypeWithFeatures> {
    const existing = await this.getLicenseType(id);

    const updateData: Prisma.LicenseTypeUpdateInput = { ...dto };
    
    if (dto.featureIds) {
      updateData.features = {
        set: dto.featureIds.map(fid => ({ id: fid })),
      };
    }

    const updated = await this.prisma.licenseType.update({
      where: { id },
      data: updateData,
      include: {
        features: true,
        _count: { select: { userLicenses: true } },
      },
    });

    await this.logLicenseAction('UPDATE', 'LicenseType', id, adminUserId, existing, dto);

    return { ...updated, userCount: updated._count.userLicenses };
  }

  async deleteLicenseType(id: string, adminUserId: string): Promise<void> {
    const existing = await this.getLicenseType(id);

    if (existing.userCount > 0) {
      throw new BadRequestException('Cannot delete a license type that has active user assignments');
    }

    await this.prisma.licenseType.delete({ where: { id } });
    await this.logLicenseAction('DELETE', 'LicenseType', id, adminUserId, existing, null);
  }

  // ============================================
  // LICENSE FEATURES MANAGEMENT
  // ============================================

  async getAllFeatures(category?: string) {
    return this.prisma.licenseFeature.findMany({
      where: category ? { category } : undefined,
      include: {
        _count: { select: { licenseTypes: true } },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async getFeature(id: string) {
    const feature = await this.prisma.licenseFeature.findUnique({
      where: { id },
      include: {
        licenseTypes: {
          select: { id: true, name: true, tier: true },
        },
      },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID "${id}" not found`);
    }

    return feature;
  }

  async createFeature(dto: CreateLicenseFeatureDto, adminUserId: string) {
    const existing = await this.prisma.licenseFeature.findUnique({
      where: { featureKey: dto.featureKey },
    });

    if (existing) {
      throw new BadRequestException(`A feature with key "${dto.featureKey}" already exists`);
    }

    const feature = await this.prisma.licenseFeature.create({
      data: dto,
    });

    await this.logLicenseAction('CREATE', 'LicenseFeature', feature.id, adminUserId, null, dto);

    return feature;
  }

  async updateFeature(id: string, dto: UpdateLicenseFeatureDto, adminUserId: string) {
    const existing = await this.getFeature(id);

    const updated = await this.prisma.licenseFeature.update({
      where: { id },
      data: dto,
    });

    await this.logLicenseAction('UPDATE', 'LicenseFeature', id, adminUserId, existing, dto);

    return updated;
  }

  async deleteFeature(id: string, adminUserId: string): Promise<void> {
    const existing = await this.getFeature(id);

    await this.prisma.licenseFeature.delete({ where: { id } });
    await this.logLicenseAction('DELETE', 'LicenseFeature', id, adminUserId, existing, null);
  }

  // ============================================
  // USER LICENSE MANAGEMENT
  // ============================================

  async getAllUserLicenses(
    page = 1,
    pageSize = 20,
    status?: LicenseStatus,
    search?: string,
  ) {
    const where: Prisma.UserLicenseWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [licenses, total] = await Promise.all([
      this.prisma.userLicense.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true, role: true },
          },
          licenseType: {
            select: { 
              id: true, 
              name: true, 
              tier: true, 
              slug: true,
              priceMonthly: true,
              currency: true,
              features: {
                select: { id: true, name: true, featureKey: true, category: true },
              },
            },
          },
          entitlements: {
            where: { isEnabled: true },
            select: { 
              id: true, 
              featureId: true, 
              isEnabled: true,
              feature: {
                select: { id: true, name: true, featureKey: true, defaultLimit: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.userLicense.count({ where }),
    ]);

    return {
      licenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserLicense(id: string): Promise<UserLicenseDetails> {
    const license = await this.prisma.userLicense.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          include: { feature: true },
        },
      },
    });

    if (!license) {
      throw new NotFoundException(`User license with ID "${id}" not found`);
    }

    return license;
  }

  async getUserLicenseByUserId(userId: string): Promise<UserLicenseDetails | null> {
    // First check if user is active (not disabled/suspended)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      // User is disabled, suspended, or doesn't exist - no license access
      return null;
    }

    const license = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          include: { feature: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return license;
  }

  async assignLicense(dto: AssignLicenseDto, adminUserId: string): Promise<UserLicenseDetails> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${dto.userId}" not found`);
    }

    // Verify license type exists
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id: dto.licenseTypeId },
      include: { features: true },
    });

    if (!licenseType) {
      throw new NotFoundException(`License type with ID "${dto.licenseTypeId}" not found`);
    }

    // Check if user already has an active license of this type
    const existingLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId: dto.userId,
        licenseTypeId: dto.licenseTypeId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
    });

    if (existingLicense) {
      throw new BadRequestException('User already has an active license of this type');
    }

    // If organizationId is provided, validate pool has available seats
    let orgLicense: { id: string; totalSeats: number; usedSeats: number; startDate: Date; endDate: Date } | null = null;
    if (dto.organizationId) {
      orgLicense = await this.prisma.organizationLicense.findFirst({
        where: {
          organizationId: dto.organizationId,
          licenseTypeId: dto.licenseTypeId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          totalSeats: true,
          usedSeats: true,
          startDate: true,
          endDate: true,
        },
      });

      if (!orgLicense) {
        throw new BadRequestException('Organization does not have an active license pool for this license type');
      }

      if (orgLicense.usedSeats >= orgLicense.totalSeats) {
        throw new BadRequestException(`No available seats in organization license pool (${orgLicense.usedSeats}/${orgLicense.totalSeats} used)`);
      }

      // Verify user is a member of the organization
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: dto.organizationId,
          userId: dto.userId,
        },
      });

      if (!membership) {
        throw new BadRequestException('User is not a member of this organization');
      }
    }

    // Calculate dates
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : new Date(startDate.getTime() + licenseType.defaultDurationDays * 24 * 60 * 60 * 1000);

    const trialEndDate = dto.isTrial
      ? new Date(startDate.getTime() + licenseType.trialDurationDays * 24 * 60 * 60 * 1000)
      : null;

    // Generate unique license key
    const licenseKey = this.generateLicenseKey();

    // Use org license dates if available, otherwise use calculated dates
    const effectiveEndDate = orgLicense?.endDate || endDate;

    // Create license
    const license = await this.prisma.userLicense.create({
      data: {
        userId: dto.userId,
        licenseTypeId: dto.licenseTypeId,
        licenseKey,
        startDate,
        endDate: effectiveEndDate,
        status: dto.isTrial ? LicenseStatus.TRIAL : LicenseStatus.ACTIVE,
        isTrial: dto.isTrial || false,
        trialEndDate,
        autoRenew: dto.autoRenew ?? true,
        customLimits: dto.customLimits,
        notes: dto.notes,
        assignedBy: adminUserId,
        organizationId: dto.organizationId,
        lastVerifiedAt: new Date(),
        // Create entitlements for each feature
        entitlements: {
          create: licenseType.features.map(feature => ({
            featureId: feature.id,
            isEnabled: true,
            usageLimit: feature.defaultLimit,
            usagePeriod: 'monthly',
            periodResetAt: this.getNextPeriodReset('monthly'),
          })),
        },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          include: { feature: true },
        },
      },
    });

    // Increment used seats if this is an org pool license
    if (dto.organizationId && orgLicense) {
      await this.prisma.organizationLicense.update({
        where: { id: orgLicense.id },
        data: { usedSeats: { increment: 1 } },
      });
      this.logger.log(`Incremented seat count for org license ${orgLicense.id}`);
    }

    this.logger.log(`Assigned license ${licenseKey} to user ${dto.userId}${dto.organizationId ? ` (org: ${dto.organizationId})` : ''}`);

    await this.logLicenseAction('ASSIGN', 'UserLicense', license.id, adminUserId, null, {
      userId: dto.userId,
      licenseTypeId: dto.licenseTypeId,
      licenseKey,
      startDate,
      endDate,
    });

    return license;
  }

  async updateUserLicense(id: string, dto: UpdateUserLicenseDto, adminUserId: string): Promise<UserLicenseDetails> {
    const existing = await this.getUserLicense(id);

    const updated = await this.prisma.userLicense.update({
      where: { id },
      data: {
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        autoRenew: dto.autoRenew,
        customLimits: dto.customLimits,
        notes: dto.notes,
        lastVerifiedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          include: { feature: true },
        },
      },
    });

    await this.logLicenseAction('UPDATE', 'UserLicense', id, adminUserId, existing, dto);

    return updated;
  }

  async renewLicense(id: string, durationDays: number, adminUserId: string): Promise<UserLicenseDetails> {
    const existing = await this.getUserLicense(id);

    const newEndDate = new Date(existing.endDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.userLicense.update({
      where: { id },
      data: {
        status: LicenseStatus.ACTIVE,
        endDate: newEndDate,
        isTrial: false,
        trialEndDate: null,
        lastVerifiedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          include: { feature: true },
        },
      },
    });

    // Reset usage counters
    await this.prisma.licenseEntitlement.updateMany({
      where: { userLicenseId: id },
      data: {
        currentUsage: 0,
        periodResetAt: this.getNextPeriodReset('monthly'),
      },
    });

    await this.logLicenseAction('RENEW', 'UserLicense', id, adminUserId, existing, {
      newEndDate,
      durationDays,
    });

    return updated;
  }

  async revokeLicense(id: string, reason: string, adminUserId: string): Promise<void> {
    const existing = await this.getUserLicense(id);

    await this.prisma.userLicense.update({
      where: { id },
      data: {
        status: LicenseStatus.CANCELLED,
        notes: existing.notes ? `${existing.notes}\n\nRevoked: ${reason}` : `Revoked: ${reason}`,
      },
    });

    await this.logLicenseAction('REVOKE', 'UserLicense', id, adminUserId, existing, { reason });
  }

  async suspendLicense(id: string, reason: string, adminUserId: string): Promise<void> {
    const existing = await this.getUserLicense(id);

    await this.prisma.userLicense.update({
      where: { id },
      data: {
        status: LicenseStatus.SUSPENDED,
        notes: existing.notes ? `${existing.notes}\n\nSuspended: ${reason}` : `Suspended: ${reason}`,
      },
    });

    await this.logLicenseAction('SUSPEND', 'UserLicense', id, adminUserId, existing, { reason });
  }

  async resumeLicense(id: string, adminUserId: string): Promise<void> {
    const existing = await this.getUserLicense(id);

    if (existing.status !== LicenseStatus.SUSPENDED) {
      throw new BadRequestException('Only suspended licenses can be resumed');
    }

    // Check if license has expired
    const now = new Date();
    const status = existing.endDate < now ? LicenseStatus.EXPIRED : LicenseStatus.ACTIVE;

    await this.prisma.userLicense.update({
      where: { id },
      data: {
        status,
        notes: existing.notes ? `${existing.notes}\n\nResumed by admin` : 'Resumed by admin',
      },
    });

    await this.logLicenseAction('RESUME', 'UserLicense', id, adminUserId, existing, { newStatus: status });
  }

  /**
   * Unassign/delete a license from a user completely
   * This removes the license record entirely, not just changes the status
   */
  async unassignLicense(id: string, reason: string, adminUserId: string): Promise<void> {
    const existing = await this.getUserLicense(id);

    // Delete all entitlements first (due to foreign key constraints)
    await this.prisma.licenseEntitlement.deleteMany({
      where: { userLicenseId: id },
    });

    // Update any pre-generated keys that were linked to this license
    await this.prisma.preGeneratedLicenseKey.updateMany({
      where: { userLicenseId: id },
      data: {
        status: 'AVAILABLE',
        claimedByUserId: null,
        claimedAt: null,
        userLicenseId: null,
      },
    });

    // If this license was from an org pool, decrement the used seats
    if (existing.organizationId) {
      await this.prisma.organizationLicense.updateMany({
        where: {
          organizationId: existing.organizationId,
          licenseTypeId: existing.licenseTypeId,
          usedSeats: { gt: 0 }, // Only decrement if > 0
        },
        data: { usedSeats: { decrement: 1 } },
      });
      this.logger.log(`Decremented seat count for org ${existing.organizationId} license pool`);
    }

    // Delete the license record
    await this.prisma.userLicense.delete({
      where: { id },
    });

    await this.logLicenseAction('UNASSIGN', 'UserLicense', id, adminUserId, existing, {
      reason,
      userId: existing.userId,
      licenseTypeId: existing.licenseTypeId,
      licenseKey: existing.licenseKey,
      organizationId: existing.organizationId,
    });

    this.logger.log(`Unassigned license ${id} from user ${existing.userId}. Reason: ${reason}`);
  }

  /**
   * Change license type (upgrade/downgrade)
   */
  async changeLicenseType(
    id: string,
    newLicenseTypeId: string,
    reason: string | undefined,
    adminUserId: string
  ): Promise<any> {
    const existing = await this.getUserLicense(id);

    // Validate new license type exists
    const newLicenseType = await this.prisma.licenseType.findUnique({
      where: { id: newLicenseTypeId },
      include: { features: true },
    });

    if (!newLicenseType) {
      throw new NotFoundException(`License type with ID ${newLicenseTypeId} not found`);
    }

    // Check if a license with the target type already exists for this user
    // If so, delete it to avoid unique constraint violation
    const existingTargetLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId: existing.userId,
        licenseTypeId: newLicenseTypeId,
        id: { not: id }, // Exclude current license
      },
    });

    if (existingTargetLicense) {
      // Delete the existing target license's entitlements and the license itself
      await this.prisma.licenseEntitlement.deleteMany({
        where: { userLicenseId: existingTargetLicense.id },
      });
      await this.prisma.userLicense.delete({
        where: { id: existingTargetLicense.id },
      });
    }

    // Delete existing entitlements for the current license
    await this.prisma.licenseEntitlement.deleteMany({
      where: { userLicenseId: id },
    });

    // Update the user license and create new entitlements
    const updated = await this.prisma.userLicense.update({
      where: { id },
      data: {
        licenseTypeId: newLicenseTypeId,
        notes: existing.notes 
          ? `${existing.notes}\n\nLicense type changed from ${existing.licenseType.name} to ${newLicenseType.name}${reason ? `: ${reason}` : ''}`
          : `License type changed to ${newLicenseType.name}${reason ? `: ${reason}` : ''}`,
        // Create new entitlements for the new license type features
        entitlements: {
          create: newLicenseType.features.map(feature => ({
            featureId: feature.id,
            isEnabled: true,
            usageLimit: feature.defaultLimit,
            usagePeriod: 'monthly',
            periodResetAt: this.getNextPeriodReset('monthly'),
          })),
        },
      },
      include: {
        licenseType: { include: { features: true } },
        user: { select: { id: true, name: true, email: true } },
        entitlements: { include: { feature: true } },
      },
    });

    // Also update the PreGeneratedLicenseKey if this license came from a pre-generated key
    await this.prisma.preGeneratedLicenseKey.updateMany({
      where: { userLicenseId: id },
      data: { licenseTypeId: newLicenseTypeId },
    });

    await this.logLicenseAction('CHANGE_TYPE', 'UserLicense', id, adminUserId, existing, {
      oldLicenseTypeId: existing.licenseTypeId,
      oldLicenseTypeName: existing.licenseType.name,
      newLicenseTypeId,
      newLicenseTypeName: newLicenseType.name,
      reason,
    });

    return updated;
  }

  // ============================================
  // LICENSE VALIDATION & FEATURE ACCESS
  // ============================================

  /**
   * Check if a user has access to a specific feature
   */
  async checkFeatureAccess(userId: string, featureKey: string): Promise<LicenseCheckResult> {
    // First check if the feature exists and requires a license
    const feature = await this.prisma.licenseFeature.findUnique({
      where: { featureKey },
    });

    if (!feature) {
      return {
        allowed: false,
        reason: 'Feature not found',
        featureKey,
      };
    }

    if (!feature.requiresLicense) {
      return {
        allowed: true,
        featureKey,
        reason: 'Feature does not require a license',
      };
    }

    if (!feature.isEnabled) {
      return {
        allowed: false,
        reason: 'Feature is disabled system-wide',
        featureKey,
      };
    }

    // Get user's active license
    const userLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
      include: {
        licenseType: {
          include: { features: true },
        },
        entitlements: {
          where: { featureId: feature.id },
          include: { feature: true },
        },
      },
    });

    if (!userLicense) {
      return {
        allowed: false,
        reason: 'No active license found',
        featureKey,
      };
    }

    // Check if license has expired
    const now = new Date();
    if (userLicense.endDate < now) {
      return {
        allowed: false,
        reason: 'License has expired',
        featureKey,
        licenseId: userLicense.id,
        expiresAt: userLicense.endDate,
      };
    }

    // Check if license includes this feature
    const hasFeature = userLicense.licenseType.features.some(f => f.featureKey === featureKey);
    if (!hasFeature) {
      return {
        allowed: false,
        reason: 'Feature not included in license plan',
        featureKey,
        licenseId: userLicense.id,
        licenseTier: userLicense.licenseType.tier,
      };
    }

    // Check entitlement for usage limits
    const entitlement = userLicense.entitlements[0];
    if (entitlement) {
      if (!entitlement.isEnabled) {
        return {
          allowed: false,
          reason: 'Feature has been disabled for this license',
          featureKey,
          licenseId: userLicense.id,
        };
      }

      if (entitlement.usageLimit !== null && entitlement.currentUsage >= entitlement.usageLimit) {
        return {
          allowed: false,
          reason: 'Usage limit reached',
          featureKey,
          licenseId: userLicense.id,
          usageLimit: entitlement.usageLimit,
          currentUsage: entitlement.currentUsage,
        };
      }
    }

    return {
      allowed: true,
      featureKey,
      licenseId: userLicense.id,
      licenseTier: userLicense.licenseType.tier,
      expiresAt: userLicense.endDate,
      usageLimit: entitlement?.usageLimit ?? null,
      currentUsage: entitlement?.currentUsage ?? 0,
    };
  }

  /**
   * Check multiple features at once
   */
  async checkMultipleFeatures(userId: string, featureKeys: string[]): Promise<Record<string, LicenseCheckResult>> {
    const results: Record<string, LicenseCheckResult> = {};
    
    for (const featureKey of featureKeys) {
      results[featureKey] = await this.checkFeatureAccess(userId, featureKey);
    }
    
    return results;
  }

  /**
   * Get all features available to a user
   */
  async getUserFeatures(userId: string): Promise<{
    features: Array<{
      featureKey: string;
      name: string;
      category: string;
      allowed: boolean;
      usageLimit: number | null;
      currentUsage: number;
    }>;
    license: UserLicenseDetails | null;
  }> {
    const license = await this.getUserLicenseByUserId(userId);
    
    if (!license) {
      // Return only features that don't require a license
      const freeFeatures = await this.prisma.licenseFeature.findMany({
        where: { requiresLicense: false, isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      });

      return {
        features: freeFeatures.map(f => ({
          featureKey: f.featureKey,
          name: f.name,
          category: f.category,
          allowed: true,
          usageLimit: null,
          currentUsage: 0,
        })),
        license: null,
      };
    }

    const features = license.licenseType.features.map(feature => {
      const entitlement = license.entitlements.find(e => e.featureId === feature.id);
      return {
        featureKey: feature.featureKey,
        name: feature.name,
        category: feature.category,
        allowed: entitlement?.isEnabled ?? true,
        usageLimit: entitlement?.usageLimit ?? feature.defaultLimit,
        currentUsage: entitlement?.currentUsage ?? 0,
      };
    });

    return { features, license };
  }

  /**
   * Record feature usage
   */
  async recordUsage(
    userId: string,
    featureKey: string,
    usageCount = 1,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const userLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
      include: {
        entitlements: {
          where: { feature: { featureKey } },
        },
      },
    });

    if (!userLicense) return;

    // Update entitlement usage
    const entitlement = userLicense.entitlements[0];
    if (entitlement) {
      // Check if we need to reset the period
      const now = new Date();
      if (entitlement.periodResetAt && entitlement.periodResetAt < now) {
        await this.prisma.licenseEntitlement.update({
          where: { id: entitlement.id },
          data: {
            currentUsage: usageCount,
            periodResetAt: this.getNextPeriodReset(entitlement.usagePeriod),
          },
        });
      } else {
        await this.prisma.licenseEntitlement.update({
          where: { id: entitlement.id },
          data: {
            currentUsage: { increment: usageCount },
          },
        });
      }
    }

    // Record in usage log
    await this.prisma.licenseUsage.create({
      data: {
        userLicenseId: userLicense.id,
        featureKey,
        usageCount,
        metadata,
      },
    });
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  async getLicenseAuditLogs(
    page = 1,
    pageSize = 50,
    entityType?: string,
    action?: string,
  ) {
    const where: Prisma.LicenseAuditLogWhereInput = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.licenseAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.licenseAuditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private async logLicenseAction(
    action: string,
    entityType: string,
    entityId: string,
    performedBy: string,
    oldValue: any,
    newValue: any,
    reason?: string,
  ) {
    // Get admin user info
    const admin = await this.prisma.user.findUnique({
      where: { id: performedBy },
      select: { name: true, email: true },
    });

    await this.prisma.licenseAuditLog.create({
      data: {
        action,
        entityType,
        entityId,
        performedBy,
        performedByName: admin?.name,
        performedByEmail: admin?.email,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        reason,
      },
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private getNextPeriodReset(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMonday);
      case 'yearly':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      case 'monthly':
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  /**
   * Validate a license key
   */
  async validateLicenseKey(licenseKey: string): Promise<LicenseCheckResult> {
    const license = await this.prisma.userLicense.findUnique({
      where: { licenseKey },
      include: {
        user: { select: { id: true, email: true, name: true } },
        licenseType: true,
      },
    });

    if (!license) {
      return {
        allowed: false,
        reason: 'Invalid license key',
        featureKey: '*',
      };
    }

    const now = new Date();
    if (license.status !== LicenseStatus.ACTIVE && license.status !== LicenseStatus.TRIAL) {
      return {
        allowed: false,
        reason: `License is ${license.status.toLowerCase()}`,
        featureKey: '*',
        licenseId: license.id,
      };
    }

    if (license.endDate < now) {
      return {
        allowed: false,
        reason: 'License has expired',
        featureKey: '*',
        licenseId: license.id,
        expiresAt: license.endDate,
      };
    }

    // Update last verified time
    await this.prisma.userLicense.update({
      where: { id: license.id },
      data: { lastVerifiedAt: now },
    });

    return {
      allowed: true,
      featureKey: '*',
      licenseId: license.id,
      licenseTier: license.licenseType.tier,
      expiresAt: license.endDate,
    };
  }

  /**
   * Get the current user's license with all features
   * Returns null if user is disabled or has no valid license
   */
  async getMyLicense(userId: string): Promise<UserLicenseDetails | null> {
    // First check if user is active (not disabled/suspended)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      // User is disabled, suspended, or doesn't exist - no license access
      return null;
    }

    const license = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true, role: true },
        },
        licenseType: { include: { features: true } },
        entitlements: { include: { feature: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return license;
  }

  /**
   * Get current user's enabled features
   */
  async getMyFeatures(userId: string): Promise<{
    features: Array<{
      featureKey: string;
      name: string;
      description: string;
      category: string;
      allowed: boolean;
      usageLimit: number | null;
      currentUsage: number;
    }>;
    license: UserLicenseDetails | null;
    tier: string | null;
    expiresAt: Date | null;
    licenseKey: string | null;
  }> {
    // Get user's active license
    const license = await this.getMyLicense(userId);

    if (!license) {
      // Return empty features list for unlicensed users
      return {
        features: [],
        license: null,
        tier: null,
        expiresAt: null,
        licenseKey: null,
      };
    }

    // Get all features with their entitlements
    const features = license.entitlements.map(entitlement => ({
      featureKey: entitlement.feature.featureKey,
      name: entitlement.feature.name,
      description: entitlement.feature.description || '',
      category: entitlement.feature.category,
      allowed: entitlement.isEnabled,
      usageLimit: entitlement.usageLimit,
      currentUsage: entitlement.currentUsage,
    }));

    return {
      features,
      license,
      tier: license.licenseType.tier,
      expiresAt: license.endDate,
      licenseKey: license.licenseKey,
    };
  }

  /**
   * Generate license keys without assigning to a user (for pre-generation)
   */
  async generateLicenseKeys(
    licenseTypeId: string,
    count: number,
    adminUserId: string,
    options?: {
      durationDays?: number;
      isTrial?: boolean;
      notes?: string;
    }
  ): Promise<Array<{ licenseKey: string; id: string }>> {
    const licenseType = await this.prisma.licenseType.findUnique({
      where: { id: licenseTypeId },
      include: { features: true },
    });

    if (!licenseType) {
      throw new NotFoundException(`License type with ID "${licenseTypeId}" not found`);
    }

    const durationDays = options?.durationDays || licenseType.defaultDurationDays;

    const licenses: Array<{ licenseKey: string; id: string }> = [];

    for (let i = 0; i < count; i++) {
      const licenseKey = this.generateLicenseKey();
      
      // Create pre-generated license key (not yet claimed)
      const preGenKey = await this.prisma.preGeneratedLicenseKey.create({
        data: {
          licenseKey,
          licenseTypeId,
          durationDays,
          isTrial: options?.isTrial || false,
          generatedBy: adminUserId,
          notes: options?.notes || `Pre-generated license key`,
          status: 'AVAILABLE',
        },
      });

      licenses.push({ licenseKey, id: preGenKey.id });
    }

    await this.logLicenseAction('GENERATE_KEYS', 'LicenseType', licenseTypeId, adminUserId, null, {
      count,
      licenseKeys: licenses.map(l => l.licenseKey),
    });

    return licenses;
  }

  /**
   * Apply/claim a pre-generated license key
   */
  async applyLicenseKey(userId: string, licenseKey: string): Promise<UserLicenseDetails> {
    // Find the pre-generated key
    const preGenKey = await this.prisma.preGeneratedLicenseKey.findUnique({
      where: { licenseKey },
      include: { licenseType: { include: { features: true } } },
    });

    if (!preGenKey) {
      throw new NotFoundException('Invalid license key');
    }

    if (preGenKey.status !== 'AVAILABLE') {
      throw new BadRequestException(`License key is not available (status: ${preGenKey.status})`);
    }

    if (preGenKey.expiresAt && new Date() > preGenKey.expiresAt) {
      // Mark as expired
      await this.prisma.preGeneratedLicenseKey.update({
        where: { id: preGenKey.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('License key has expired');
    }

    // Check if user already has a license of this type
    const existingLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        licenseTypeId: preGenKey.licenseTypeId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.PENDING] },
      },
    });

    if (existingLicense) {
      throw new BadRequestException('You already have an active license of this type');
    }

    // Create the user license
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + preGenKey.durationDays * 24 * 60 * 60 * 1000);
    const userLicenseKey = this.generateLicenseKey();

    const userLicense = await this.prisma.userLicense.create({
      data: {
        userId,
        licenseTypeId: preGenKey.licenseTypeId,
        licenseKey: userLicenseKey,
        startDate,
        endDate,
        status: LicenseStatus.ACTIVE,
        isTrial: preGenKey.isTrial,
        autoRenew: false,
        notes: `Activated from pre-generated key: ${licenseKey}`,
      },
      include: {
        licenseType: { include: { features: true } },
      },
    });

    // Create entitlements from license type features
    for (const feature of preGenKey.licenseType.features) {
      await this.prisma.licenseEntitlement.create({
        data: {
          userLicenseId: userLicense.id,
          featureId: feature.id,
          isEnabled: true,
          usageLimit: feature.defaultLimit,
        },
      });
    }

    // Mark the pre-generated key as claimed
    await this.prisma.preGeneratedLicenseKey.update({
      where: { id: preGenKey.id },
      data: {
        status: 'CLAIMED',
        claimedByUserId: userId,
        claimedAt: new Date(),
        userLicenseId: userLicense.id,
      },
    });

    await this.logLicenseAction('APPLY_KEY', 'UserLicense', userLicense.id, userId, null, {
      originalKey: licenseKey,
      licenseTypeId: preGenKey.licenseTypeId,
    });

    return this.getUserLicense(userLicense.id);
  }

  /**
   * Get all pre-generated license keys
   */
  async getPreGeneratedKeys(status?: string, licenseTypeId?: string) {
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    if (licenseTypeId) {
      where.licenseTypeId = licenseTypeId;
    }

    const keys = await this.prisma.preGeneratedLicenseKey.findMany({
      where,
      include: {
        licenseType: true,
        claimedBy: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  /**
   * Assign a pre-generated key to a specific user (admin action)
   */
  async assignKeyToUser(licenseKey: string, userId: string, adminUserId: string): Promise<UserLicenseDetails> {
    // Find the pre-generated key
    const preGenKey = await this.prisma.preGeneratedLicenseKey.findUnique({
      where: { licenseKey },
      include: { licenseType: { include: { features: true } } },
    });

    if (!preGenKey) {
      throw new NotFoundException('License key not found');
    }

    if (preGenKey.status !== 'AVAILABLE') {
      throw new BadRequestException(`License key is not available (status: ${preGenKey.status})`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has an ACTIVE license of this type
    const existingActiveLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        licenseTypeId: preGenKey.licenseTypeId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.PENDING, LicenseStatus.TRIAL] },
      },
    });

    if (existingActiveLicense) {
      throw new BadRequestException('User already has an active license of this type');
    }

    // Check if there's a cancelled/expired license record with same type - delete it to avoid unique constraint
    const existingInactiveLicense = await this.prisma.userLicense.findFirst({
      where: {
        userId,
        licenseTypeId: preGenKey.licenseTypeId,
        status: { in: [LicenseStatus.CANCELLED, LicenseStatus.EXPIRED, LicenseStatus.SUSPENDED] },
      },
    });

    if (existingInactiveLicense) {
      // Delete entitlements first, then the license
      await this.prisma.licenseEntitlement.deleteMany({
        where: { userLicenseId: existingInactiveLicense.id },
      });
      await this.prisma.userLicense.delete({
        where: { id: existingInactiveLicense.id },
      });
    }

    // Deactivate any OTHER active licenses for this user (user should only have one active license)
    await this.prisma.userLicense.updateMany({
      where: {
        userId,
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.PENDING, LicenseStatus.TRIAL] },
      },
      data: {
        status: LicenseStatus.CANCELLED,
      },
    });

    // Create the user license
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + preGenKey.durationDays * 24 * 60 * 60 * 1000);
    const userLicenseKey = this.generateLicenseKey();

    const userLicense = await this.prisma.userLicense.create({
      data: {
        userId,
        licenseTypeId: preGenKey.licenseTypeId,
        licenseKey: userLicenseKey,
        startDate,
        endDate,
        status: preGenKey.isTrial ? LicenseStatus.TRIAL : LicenseStatus.ACTIVE,
        isTrial: preGenKey.isTrial,
        autoRenew: false,
        notes: `Assigned by admin from pre-generated key: ${licenseKey}`,
        assignedBy: adminUserId,
      },
      include: {
        licenseType: { include: { features: true } },
      },
    });

    // Create entitlements from license type features
    for (const feature of preGenKey.licenseType.features) {
      await this.prisma.licenseEntitlement.create({
        data: {
          userLicenseId: userLicense.id,
          featureId: feature.id,
          isEnabled: true,
          usageLimit: feature.defaultLimit,
        },
      });
    }

    // Mark the pre-generated key as claimed
    await this.prisma.preGeneratedLicenseKey.update({
      where: { id: preGenKey.id },
      data: {
        status: 'CLAIMED',
        claimedByUserId: userId,
        claimedAt: new Date(),
        userLicenseId: userLicense.id,
      },
    });

    await this.logLicenseAction('ASSIGN_KEY', 'UserLicense', userLicense.id, adminUserId, null, {
      originalKey: licenseKey,
      assignedTo: userId,
      licenseTypeId: preGenKey.licenseTypeId,
    });

    return this.getUserLicense(userLicense.id);
  }

  /**
   * Assign a pre-generated key by ID to a specific user (admin action)
   */
  async assignPreGeneratedKeyToUser(keyId: string, userId: string, adminUserId: string): Promise<UserLicenseDetails> {
    // Find the pre-generated key by ID
    const preGenKey = await this.prisma.preGeneratedLicenseKey.findUnique({
      where: { id: keyId },
    });

    if (!preGenKey) {
      throw new NotFoundException('License key not found');
    }

    // Use the existing assignKeyToUser method with the license key string
    return this.assignKeyToUser(preGenKey.licenseKey, userId, adminUserId);
  }

  /**
   * Revoke a pre-generated license key
   */
  async revokePreGeneratedKey(keyId: string, adminUserId: string): Promise<void> {
    const key = await this.prisma.preGeneratedLicenseKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new NotFoundException('License key not found');
    }

    if (key.status === 'CLAIMED') {
      throw new BadRequestException('Cannot revoke a claimed license key');
    }

    await this.prisma.preGeneratedLicenseKey.update({
      where: { id: keyId },
      data: { status: 'REVOKED' },
    });

    await this.logLicenseAction('REVOKE_KEY', 'PreGeneratedLicenseKey', keyId, adminUserId, null, {
      licenseKey: key.licenseKey,
    });
  }
}
