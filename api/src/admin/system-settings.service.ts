import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Default settings with their initial values
const DEFAULT_SETTINGS: Record<string, { value: any; description: string; category: string }> = {
  'email.loginNotificationsEnabled': {
    value: true,
    description: 'Send email notifications when users log in',
    category: 'email',
  },
  'email.welcomeEmailEnabled': {
    value: true,
    description: 'Send welcome email to new users',
    category: 'email',
  },
  'email.passwordResetNotificationEnabled': {
    value: true,
    description: 'Send email notification when password is reset',
    category: 'email',
  },
  'security.geoIpLookupEnabled': {
    value: true,
    description: 'Look up geographic location from IP address for login notifications',
    category: 'security',
  },
  // CRM Data Source visibility settings
  'crm.enabledModes': {
    value: {
      local: true,
      salesforce: true,
      oracle: true,
      oracle_portal: true,
    },
    description: 'Which CRM data sources are enabled and visible in the mode toggle',
    category: 'crm',
  },
  'system.maintenanceMode': {
    value: {
      enabled: false,
      message: "We're performing scheduled maintenance. We'll be back shortly.",
      estimatedEnd: null,
    },
    description: 'Show maintenance page to public visitors',
    category: 'system',
  },
};

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  // In-memory cache for frequently accessed settings
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache

  constructor(private prisma: PrismaService) {
    // Initialize default settings on startup
    this.initializeDefaults();
  }

  /**
   * Initialize default settings if they don't exist
   */
  private async initializeDefaults() {
    try {
      for (const [key, config] of Object.entries(DEFAULT_SETTINGS)) {
        const existing = await this.prisma.systemSettings.findUnique({
          where: { key },
        });

        if (!existing) {
          await this.prisma.systemSettings.create({
            data: {
              key,
              value: JSON.stringify(config.value),
              description: config.description,
              category: config.category,
            },
          });
          this.logger.log(`Initialized default setting: ${key}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to initialize default settings: ${error.message}`);
    }
  }

  /**
   * Get a setting value by key
   */
  async get<T>(key: string, defaultValue?: T): Promise<T> {
    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const setting = await this.prisma.systemSettings.findUnique({
        where: { key },
      });

      if (setting) {
        const value = JSON.parse(setting.value) as T;
        this.setCache(key, value);
        return value;
      }

      // Return default from DEFAULT_SETTINGS if available
      if (DEFAULT_SETTINGS[key]) {
        return DEFAULT_SETTINGS[key].value as T;
      }

      return defaultValue as T;
    } catch (error) {
      this.logger.warn(`Failed to get setting ${key}: ${error.message}`);
      return defaultValue as T;
    }
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: any, updatedBy?: string): Promise<void> {
    try {
      const description = DEFAULT_SETTINGS[key]?.description;
      const category = DEFAULT_SETTINGS[key]?.category || 'general';

      await this.prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: JSON.stringify(value),
          updatedBy,
        },
        create: {
          key,
          value: JSON.stringify(value),
          description,
          category,
          updatedBy,
        },
      });

      // Update cache
      this.setCache(key, value);
      this.logger.log(`Setting updated: ${key} = ${JSON.stringify(value)} by ${updatedBy || 'system'}`);
    } catch (error) {
      this.logger.error(`Failed to set setting ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all settings (for admin UI)
   */
  async getAll(): Promise<Array<{
    key: string;
    value: any;
    description: string | null;
    category: string;
    updatedAt: Date;
    updatedBy: string | null;
  }>> {
    const settings = await this.prisma.systemSettings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return settings.map(s => ({
      key: s.key,
      value: JSON.parse(s.value),
      description: s.description,
      category: s.category,
      updatedAt: s.updatedAt,
      updatedBy: s.updatedBy,
    }));
  }

  /**
   * Get settings by category
   */
  async getByCategory(category: string): Promise<Array<{
    key: string;
    value: any;
    description: string | null;
  }>> {
    const settings = await this.prisma.systemSettings.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    return settings.map(s => ({
      key: s.key,
      value: JSON.parse(s.value),
      description: s.description,
    }));
  }

  // ==================== Convenience Methods ====================

  /**
   * Check if login notifications are enabled
   */
  async isLoginNotificationsEnabled(): Promise<boolean> {
    return this.get<boolean>('email.loginNotificationsEnabled', true);
  }

  /**
   * Check if welcome emails are enabled
   */
  async isWelcomeEmailEnabled(): Promise<boolean> {
    return this.get<boolean>('email.welcomeEmailEnabled', true);
  }

  /**
   * Check if geo-IP lookup is enabled
   */
  async isGeoIpLookupEnabled(): Promise<boolean> {
    return this.get<boolean>('security.geoIpLookupEnabled', true);
  }

  /**
   * Get enabled CRM modes for the mode toggle
   */
  async getEnabledCrmModes(): Promise<{
    local: boolean;
    salesforce: boolean;
    oracle: boolean;
    oracle_portal: boolean;
  }> {
    return this.get('crm.enabledModes', {
      local: true,
      salesforce: true,
      oracle: true,
      oracle_portal: true,
    });
  }

  /**
   * Get maintenance mode configuration
   */
  async getMaintenanceMode(): Promise<{
    enabled: boolean;
    message: string;
    estimatedEnd: string | null;
  }> {
    return this.get('system.maintenanceMode', {
      enabled: false,
      message: "We're performing scheduled maintenance. We'll be back shortly.",
      estimatedEnd: null,
    });
  }

  /**
   * Set maintenance mode configuration
   */
  async setMaintenanceMode(
    config: { enabled?: boolean; message?: string; estimatedEnd?: string | null },
    updatedBy?: string,
  ): Promise<void> {
    const current = await this.getMaintenanceMode();
    const updated = { ...current, ...config };
    await this.set('system.maintenanceMode', updated, updatedBy);
  }

  /**
   * Update enabled CRM modes
   */
  async setEnabledCrmModes(
    modes: {
      local?: boolean;
      salesforce?: boolean;
      oracle?: boolean;
      oracle_portal?: boolean;
    },
    updatedBy?: string,
  ): Promise<void> {
    const current = await this.getEnabledCrmModes();
    const updated = { ...current, ...modes };
    await this.set('crm.enabledModes', updated, updatedBy);
  }

  // ==================== Cache Helpers ====================

  private getFromCache<T>(key: string): T | undefined {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.cache.get(key) as T;
    }
    // Clear expired cache
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    return undefined;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear the settings cache (useful after bulk updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}
