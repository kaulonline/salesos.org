import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DeviceType, LicenseTier } from '@prisma/client';
import { CreateVisibilityRuleDto, UpdateVisibilityRuleDto } from './dto';

// License tier hierarchy for comparison
const TIER_HIERARCHY: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: 3,
  CUSTOM: 4,
};

export interface VisibleFeature {
  featureKey: string;
  name: string;
  category: string;
  isVisible: boolean;
  isEnabled: boolean;
  upgradeMessage?: string;
  uiPosition?: number;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  minTierRequired?: string;
}

@Injectable()
export class FeatureVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== VISIBILITY RULE MANAGEMENT ====================

  async createVisibilityRule(dto: CreateVisibilityRuleDto) {
    // Check if rule already exists for this feature
    const existing = await this.prisma.featureVisibilityRule.findUnique({
      where: { featureKey: dto.featureKey },
    });

    if (existing) {
      throw new ConflictException(`Visibility rule for feature '${dto.featureKey}' already exists`);
    }

    return this.prisma.featureVisibilityRule.create({
      data: {
        featureKey: dto.featureKey,
        showOnMobile: dto.showOnMobile ?? true,
        showOnTablet: dto.showOnTablet ?? true,
        showOnDesktop: dto.showOnDesktop ?? true,
        minLicenseTier: dto.minLicenseTier,
        uiPosition: dto.uiPosition,
        showWhenDisabled: dto.showWhenDisabled ?? false,
        upgradeMessage: dto.upgradeMessage,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateVisibilityRule(featureKey: string, dto: UpdateVisibilityRuleDto) {
    const rule = await this.prisma.featureVisibilityRule.findUnique({
      where: { featureKey },
    });

    if (!rule) {
      throw new NotFoundException(`Visibility rule for feature '${featureKey}' not found`);
    }

    return this.prisma.featureVisibilityRule.update({
      where: { featureKey },
      data: dto,
    });
  }

  async getVisibilityRules() {
    return this.prisma.featureVisibilityRule.findMany({
      orderBy: [{ uiPosition: 'asc' }, { featureKey: 'asc' }],
    });
  }

  async getVisibilityRuleByFeature(featureKey: string) {
    const rule = await this.prisma.featureVisibilityRule.findUnique({
      where: { featureKey },
    });

    if (!rule) {
      throw new NotFoundException(`Visibility rule for feature '${featureKey}' not found`);
    }

    return rule;
  }

  async deleteVisibilityRule(featureKey: string) {
    const rule = await this.prisma.featureVisibilityRule.findUnique({
      where: { featureKey },
    });

    if (!rule) {
      throw new NotFoundException(`Visibility rule for feature '${featureKey}' not found`);
    }

    return this.prisma.featureVisibilityRule.delete({ where: { featureKey } });
  }

  // ==================== FEATURE ACCESS CHECKS ====================

  async getVisibleFeatures(
    userId: string,
    deviceType: DeviceType = DeviceType.DESKTOP_WEB,
  ): Promise<VisibleFeature[]> {
    // Get user's license
    const userLicense = await this.prisma.userLicense.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        licenseType: {
          include: {
            features: true,
          },
        },
        entitlements: {
          include: {
            feature: true,
          },
        },
      },
    });

    const userTier = userLicense?.licenseType?.tier || 'FREE';
    const userTierLevel = TIER_HIERARCHY[userTier] ?? 0;

    // Get all features and visibility rules
    const [allFeatures, visibilityRules] = await Promise.all([
      this.prisma.licenseFeature.findMany({
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.featureVisibilityRule.findMany({
        where: { isActive: true },
      }),
    ]);

    // Create a map of visibility rules by feature key
    const rulesMap = new Map(visibilityRules.map((r) => [r.featureKey, r]));

    // Build visible features list
    const visibleFeatures: VisibleFeature[] = [];

    for (const feature of allFeatures) {
      const rule = rulesMap.get(feature.featureKey);

      // Check device visibility
      let isVisibleOnDevice = true;
      if (rule) {
        switch (deviceType) {
          case DeviceType.MOBILE_IOS:
          case DeviceType.MOBILE_ANDROID:
            isVisibleOnDevice = rule.showOnMobile;
            break;
          case DeviceType.TABLET_IPAD:
          case DeviceType.TABLET_ANDROID:
            isVisibleOnDevice = rule.showOnTablet;
            break;
          case DeviceType.DESKTOP_WEB:
          default:
            isVisibleOnDevice = rule.showOnDesktop;
            break;
        }
      }

      // Check license tier
      const minTierRequired = rule?.minLicenseTier || null;
      const minTierLevel = minTierRequired ? (TIER_HIERARCHY[minTierRequired] ?? 0) : 0;
      const hasLicenseAccess = userTierLevel >= minTierLevel;

      // Check if user has entitlement
      const entitlement = userLicense?.entitlements.find(
        (e) => e.feature.featureKey === feature.featureKey,
      );
      const hasEntitlement = entitlement?.isEnabled ?? !feature.requiresLicense;

      // Determine final visibility
      const isEnabled = hasLicenseAccess && hasEntitlement;
      const shouldShow = isVisibleOnDevice && (isEnabled || (rule?.showWhenDisabled ?? false));

      if (shouldShow || rule?.showWhenDisabled) {
        visibleFeatures.push({
          featureKey: feature.featureKey,
          name: feature.name,
          category: feature.category,
          isVisible: isVisibleOnDevice,
          isEnabled,
          upgradeMessage: !isEnabled ? (rule?.upgradeMessage || undefined) : undefined,
          uiPosition: rule?.uiPosition ?? feature.sortOrder,
        });
      }
    }

    // Sort by uiPosition
    visibleFeatures.sort((a, b) => (a.uiPosition ?? 999) - (b.uiPosition ?? 999));

    return visibleFeatures;
  }

  async checkFeatureVisibility(
    userId: string,
    featureKey: string,
    deviceType: DeviceType = DeviceType.DESKTOP_WEB,
  ): Promise<FeatureAccessResult> {
    // Get the feature
    const feature = await this.prisma.licenseFeature.findUnique({
      where: { featureKey },
    });

    if (!feature) {
      return { allowed: false, reason: 'Feature not found' };
    }

    if (!feature.isEnabled) {
      return { allowed: false, reason: 'Feature is disabled system-wide' };
    }

    // Get visibility rule
    const rule = await this.prisma.featureVisibilityRule.findUnique({
      where: { featureKey },
    });

    // Check device visibility
    if (rule && rule.isActive) {
      let isVisibleOnDevice = true;
      switch (deviceType) {
        case DeviceType.MOBILE_IOS:
        case DeviceType.MOBILE_ANDROID:
          isVisibleOnDevice = rule.showOnMobile;
          break;
        case DeviceType.TABLET_IPAD:
        case DeviceType.TABLET_ANDROID:
          isVisibleOnDevice = rule.showOnTablet;
          break;
        case DeviceType.DESKTOP_WEB:
        default:
          isVisibleOnDevice = rule.showOnDesktop;
          break;
      }

      if (!isVisibleOnDevice) {
        return { allowed: false, reason: 'Feature not available on this device type' };
      }
    }

    // Get user's license
    const userLicense = await this.prisma.userLicense.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        licenseType: true,
        entitlements: {
          where: { feature: { featureKey } },
        },
      },
    });

    // Check license tier
    if (rule?.minLicenseTier) {
      const userTier = userLicense?.licenseType?.tier || 'FREE';
      const userTierLevel = TIER_HIERARCHY[userTier] ?? 0;
      const minTierLevel = TIER_HIERARCHY[rule.minLicenseTier] ?? 0;

      if (userTierLevel < minTierLevel) {
        return {
          allowed: false,
          reason: rule.upgradeMessage || `This feature requires ${rule.minLicenseTier} tier or higher`,
          upgradeRequired: true,
          minTierRequired: rule.minLicenseTier,
        };
      }
    }

    // Check entitlement
    if (feature.requiresLicense) {
      const entitlement = userLicense?.entitlements[0];
      if (!entitlement || !entitlement.isEnabled) {
        return {
          allowed: false,
          reason: 'Feature not included in your license',
          upgradeRequired: true,
        };
      }
    }

    return { allowed: true };
  }

  async getFeatureConfigForDevice(
    userId: string,
    deviceType: DeviceType = DeviceType.DESKTOP_WEB,
  ) {
    const visibleFeatures = await this.getVisibleFeatures(userId, deviceType);

    // Get user's license info
    const userLicense = await this.prisma.userLicense.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        licenseType: {
          select: { name: true, tier: true },
        },
      },
    });

    return {
      features: visibleFeatures,
      license: userLicense
        ? {
            tier: userLicense.licenseType.tier,
            name: userLicense.licenseType.name,
            expiresAt: userLicense.endDate,
          }
        : null,
      deviceType,
    };
  }

  // ==================== ADMIN UTILITIES ====================

  async initializeDefaultRules() {
    // Get all features that don't have visibility rules
    const features = await this.prisma.licenseFeature.findMany();
    const existingRules = await this.prisma.featureVisibilityRule.findMany({
      select: { featureKey: true },
    });

    const existingKeys = new Set(existingRules.map((r) => r.featureKey));
    const featuresToAdd = features.filter((f) => !existingKeys.has(f.featureKey));

    // Create default rules for features without rules
    const createdRules = await Promise.all(
      featuresToAdd.map((feature) =>
        this.prisma.featureVisibilityRule.create({
          data: {
            featureKey: feature.featureKey,
            showOnMobile: true,
            showOnTablet: true,
            showOnDesktop: true,
            isActive: true,
          },
        }),
      ),
    );

    return {
      created: createdRules.length,
      rules: createdRules,
    };
  }

  async getFeatureUsageByLicenseTier() {
    // Get usage grouped by license tier
    const usageByTier = await this.prisma.$queryRaw<
      Array<{
        tier: string;
        featureKey: string;
        totalUsage: number;
        uniqueUsers: number;
      }>
    >`
      SELECT
        lt.tier,
        dfu."featureKey" as "featureKey",
        SUM(dfu."usageCount")::int as "totalUsage",
        COUNT(DISTINCT dfu."userId")::int as "uniqueUsers"
      FROM device_feature_usage dfu
      JOIN user_licenses ul ON dfu."userId" = ul."userId"
      JOIN license_types lt ON ul."licenseTypeId" = lt.id
      WHERE ul.status = 'ACTIVE'
        AND dfu.date >= NOW() - INTERVAL '30 days'
      GROUP BY lt.tier, dfu."featureKey"
      ORDER BY lt.tier, "totalUsage" DESC
    `;

    // Group by tier
    const result: Record<string, Array<{ featureKey: string; totalUsage: number; uniqueUsers: number }>> = {};

    for (const row of usageByTier) {
      if (!result[row.tier]) {
        result[row.tier] = [];
      }
      result[row.tier].push({
        featureKey: row.featureKey,
        totalUsage: Number(row.totalUsage),
        uniqueUsers: Number(row.uniqueUsers),
      });
    }

    return result;
  }
}
