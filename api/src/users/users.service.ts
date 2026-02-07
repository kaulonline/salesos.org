import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UserPreferences, MulterFile } from './users.controller';
import {
  UpdatePrivacyPreferencesDto,
  PrivacyPreferencesResponse,
  DataRequestResponse,
  DataRetentionInfoResponse,
  StorageUsageResponse,
} from './dto/privacy.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Default data retention settings
const DEFAULT_RETENTION_DAYS = 365;
const DATA_CATEGORIES = [
  {
    category: 'conversations',
    description: 'Chat history and AI conversations',
    retentionDays: 90,
    canDelete: true,
  },
  {
    category: 'crm_data',
    description: 'Leads, contacts, accounts, opportunities',
    retentionDays: 365,
    canDelete: true,
  },
  {
    category: 'documents',
    description: 'Uploaded files and documents',
    retentionDays: 365,
    canDelete: true,
  },
  {
    category: 'activity_logs',
    description: 'Usage analytics and activity history',
    retentionDays: 90,
    canDelete: true,
  },
  {
    category: 'account_data',
    description: 'Profile information and settings',
    retentionDays: -1, // Kept until account deletion
    canDelete: false,
  },
];

// Avatar upload directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'avatars');

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        settings: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Extract profile fields from settings for frontend compatibility
    const settings = (user.settings as any) || {};

    // Parse name into firstName and lastName if available
    const nameParts = user.name?.split(' ') || [];
    const firstName = settings.firstName || nameParts[0] || '';
    const lastName = settings.lastName || nameParts.slice(1).join(' ') || '';

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName,
      lastName,
      avatarUrl: user.avatarUrl,
      jobTitle: settings.jobTitle || '',
      department: settings.department || '',
      phone: settings.phone || '',
      mobilePhone: settings.mobilePhone || '',
      location: settings.location || '',
      timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Return settings or empty object if null
    return (user.settings as UserPreferences) || {};
  }

  async updateUserPreferences(
    userId: string,
    preferences: UserPreferences,
  ): Promise<UserPreferences> {
    // Get current settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge with existing settings
    const currentSettings = (user.settings as UserPreferences) || {};
    const updatedSettings = {
      ...currentSettings,
      ...preferences,
      // Deep merge modelConfig if provided
      ...(preferences.modelConfig && {
        modelConfig: {
          ...(currentSettings.modelConfig || {}),
          ...preferences.modelConfig,
        },
      }),
    };

    // Update user settings
    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: updatedSettings as any },
    });

    return updatedSettings;
  }

  async updateLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateUserProfile(userId: string, updateData: any) {
    // Get current user to access existing settings
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const allowedFields: any = {};
    const currentSettings = (currentUser.settings as any) || {};
    const updatedSettings = { ...currentSettings };

    // Handle direct DB fields
    if (updateData.avatarUrl !== undefined) allowedFields.avatarUrl = updateData.avatarUrl;

    // Build name from firstName and lastName if provided
    if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
      const firstName = updateData.firstName ?? currentSettings.firstName ?? '';
      const lastName = updateData.lastName ?? currentSettings.lastName ?? '';
      allowedFields.name = `${firstName} ${lastName}`.trim();
      updatedSettings.firstName = firstName;
      updatedSettings.lastName = lastName;
    } else if (updateData.name !== undefined) {
      allowedFields.name = updateData.name;
    }

    // Handle profile fields stored in settings
    const settingsFields = ['jobTitle', 'department', 'phone', 'mobilePhone', 'location', 'timezone'];
    for (const field of settingsFields) {
      if (updateData[field] !== undefined) {
        updatedSettings[field] = updateData[field];
      }
    }

    // Only update settings if we have changes
    if (Object.keys(updatedSettings).length > Object.keys(currentSettings).length ||
        settingsFields.some(f => updateData[f] !== undefined) ||
        updateData.firstName !== undefined ||
        updateData.lastName !== undefined) {
      allowedFields.settings = updatedSettings;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: allowedFields,
    });

    // Return the profile in the same format as getUserById
    return this.getUserById(userId);
  }

  // ============================================
  // Avatar Upload Methods
  // ============================================

  async uploadAvatar(userId: string, file: MulterFile): Promise<{ avatarUrl: string }> {
    // Generate unique filename
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${userId}-${uuidv4()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Delete old avatar if exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl) {
      const oldFilename = path.basename(user.avatarUrl);
      const oldFilePath = path.join(UPLOADS_DIR, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Write new file
    fs.writeFileSync(filePath, file.buffer);

    // Generate URL (relative path for serving)
    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  async deleteAvatar(userId: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarUrl) {
      const filename = path.basename(user.avatarUrl);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return { success: true };
  }

  // ============================================
  // Quota Methods
  // ============================================

  // Get user quota and progress
  async getUserQuota(userId: string): Promise<{
    salesQuota: number;
    currentValue: number;
    quotaProgress: number;
    quotaPeriod: 'monthly' | 'quarterly' | 'yearly';
    periodStart: string;
    periodEnd: string;
  }> {
    // Get user settings for quota configuration
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = (user?.settings as any) || {};
    const salesQuota = settings.salesQuota ?? 100000; // Default $100k quota
    const quotaPeriod = settings.quotaPeriod ?? 'monthly';

    // Calculate period start/end based on quota period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (quotaPeriod) {
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'monthly':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    // Calculate current value from closed won opportunities in this period
    const closedWonOpportunities = await this.prisma.opportunity.findMany({
      where: {
        ownerId: userId,
        stage: 'CLOSED_WON',
        closeDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: { amount: true },
    });

    const currentValue = closedWonOpportunities.reduce(
      (sum, opp) => sum + (opp.amount ?? 0),
      0,
    );

    const quotaProgress = salesQuota > 0 ? Math.min(currentValue / salesQuota, 1) : 0;

    return {
      salesQuota,
      currentValue,
      quotaProgress,
      quotaPeriod,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    };
  }

  // Update user quota settings
  async updateUserQuota(
    userId: string,
    quotaData: { salesQuota?: number; quotaPeriod?: 'monthly' | 'quarterly' | 'yearly' },
  ): Promise<{ salesQuota: number; quotaPeriod: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const currentSettings = (user?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(quotaData.salesQuota !== undefined && { salesQuota: quotaData.salesQuota }),
      ...(quotaData.quotaPeriod !== undefined && { quotaPeriod: quotaData.quotaPeriod }),
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: updatedSettings },
    });

    return {
      salesQuota: updatedSettings.salesQuota ?? 100000,
      quotaPeriod: updatedSettings.quotaPeriod ?? 'monthly',
    };
  }

  // ============================================
  // Privacy Preferences Methods
  // ============================================

  async getPrivacyPreferences(
    userId: string,
  ): Promise<PrivacyPreferencesResponse> {
    let prefs = await this.prisma.privacyPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if not exists
    if (!prefs) {
      prefs = await this.prisma.privacyPreferences.create({
        data: { userId },
      });
    }

    return {
      analyticsEnabled: prefs.analyticsEnabled,
      personalizationEnabled: prefs.personalizationEnabled,
      crashReportingEnabled: prefs.crashReportingEnabled,
      aiTrainingConsent: prefs.aiTrainingConsent,
      contextRetentionEnabled: prefs.contextRetentionEnabled,
      marketingEmailsEnabled: prefs.marketingEmailsEnabled,
      productUpdatesEnabled: prefs.productUpdatesEnabled,
      retentionPeriodDays: prefs.retentionPeriodDays,
      lastConsentUpdate: prefs.lastConsentUpdate,
      consentVersion: prefs.consentVersion,
    };
  }

  async updatePrivacyPreferences(
    userId: string,
    dto: UpdatePrivacyPreferencesDto,
  ): Promise<PrivacyPreferencesResponse> {
    const prefs = await this.prisma.privacyPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
        lastConsentUpdate: new Date(),
      },
      update: {
        ...dto,
        lastConsentUpdate: new Date(),
      },
    });

    return {
      analyticsEnabled: prefs.analyticsEnabled,
      personalizationEnabled: prefs.personalizationEnabled,
      crashReportingEnabled: prefs.crashReportingEnabled,
      aiTrainingConsent: prefs.aiTrainingConsent,
      contextRetentionEnabled: prefs.contextRetentionEnabled,
      marketingEmailsEnabled: prefs.marketingEmailsEnabled,
      productUpdatesEnabled: prefs.productUpdatesEnabled,
      retentionPeriodDays: prefs.retentionPeriodDays,
      lastConsentUpdate: prefs.lastConsentUpdate,
      consentVersion: prefs.consentVersion,
    };
  }

  // ============================================
  // Data Request Methods
  // ============================================

  async createDataExportRequest(
    userId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DataRequestResponse> {
    // Check for pending export requests
    const pending = await this.prisma.dataRequest.findFirst({
      where: {
        userId,
        type: 'EXPORT',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pending) {
      throw new BadRequestException(
        'You already have a pending data export request',
      );
    }

    const request = await this.prisma.dataRequest.create({
      data: {
        userId,
        type: 'EXPORT',
        reason,
        ipAddress,
        userAgent,
      },
    });

    // In a real implementation, this would trigger an async job
    // to compile and export the user's data
    this.processDataExportAsync(request.id, userId);

    return this.mapDataRequest(request);
  }

  async createDataDeletionRequest(
    userId: string,
    confirmationPhrase: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DataRequestResponse> {
    if (confirmationPhrase !== 'DELETE MY DATA') {
      throw new BadRequestException('Invalid confirmation phrase');
    }

    // Check for pending deletion requests
    const pending = await this.prisma.dataRequest.findFirst({
      where: {
        userId,
        type: 'DELETION',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pending) {
      throw new BadRequestException(
        'You already have a pending data deletion request',
      );
    }

    const request = await this.prisma.dataRequest.create({
      data: {
        userId,
        type: 'DELETION',
        reason,
        ipAddress,
        userAgent,
      },
    });

    return this.mapDataRequest(request);
  }

  async createAccountDeletionRequest(
    userId: string,
    password: string,
    confirmationPhrase: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DataRequestResponse> {
    if (confirmationPhrase !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException('Invalid confirmation phrase');
    }

    // Verify password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check for pending account deletion requests
    const pending = await this.prisma.dataRequest.findFirst({
      where: {
        userId,
        type: 'DELETION',
        status: { in: ['PENDING', 'PROCESSING'] },
        metadata: { path: ['accountDeletion'], equals: true },
      },
    });

    if (pending) {
      throw new BadRequestException(
        'You already have a pending account deletion request',
      );
    }

    const request = await this.prisma.dataRequest.create({
      data: {
        userId,
        type: 'DELETION',
        reason,
        ipAddress,
        userAgent,
        metadata: { accountDeletion: true },
      },
    });

    return this.mapDataRequest(request);
  }

  async getDataRequests(userId: string): Promise<DataRequestResponse[]> {
    const requests = await this.prisma.dataRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return requests.map(this.mapDataRequest);
  }

  async cancelDataRequest(
    userId: string,
    requestId: string,
  ): Promise<DataRequestResponse> {
    const request = await this.prisma.dataRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Request not found or cannot be cancelled',
      );
    }

    const updated = await this.prisma.dataRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return this.mapDataRequest(updated);
  }

  // ============================================
  // Data Retention & Storage Info
  // ============================================

  async getDataRetentionInfo(userId: string): Promise<DataRetentionInfoResponse> {
    const prefs = await this.prisma.privacyPreferences.findUnique({
      where: { userId },
      select: { retentionPeriodDays: true },
    });

    return {
      defaultRetentionDays: DEFAULT_RETENTION_DAYS,
      userRetentionDays: prefs?.retentionPeriodDays || null,
      dataCategories: DATA_CATEGORIES,
    };
  }

  async getStorageUsage(userId: string): Promise<StorageUsageResponse> {
    // Get conversation count/size estimate
    const conversationCount = await this.prisma.conversation.count({
      where: { userId },
    });

    // Get file count/size estimate
    const files = await this.prisma.uploadedFile.findMany({
      where: { userId },
      select: { sizeBytes: true },
    });

    const documentsSize = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

    // Estimate message storage (rough estimate: 2KB per conversation average)
    const messagesEstimate = conversationCount * 2048;

    // Cache estimate (rough estimate based on activity)
    const cacheEstimate = Math.floor(documentsSize * 0.3);

    return {
      chatMessages: messagesEstimate,
      cachedFiles: cacheEstimate,
      documents: documentsSize,
      totalBytes: messagesEstimate + cacheEstimate + documentsSize,
    };
  }

  async clearConversationHistory(userId: string): Promise<{ deleted: number }> {
    const result = await this.prisma.conversation.deleteMany({
      where: { userId },
    });

    return { deleted: result.count };
  }

  async clearCache(userId: string): Promise<{ success: boolean }> {
    // In a real implementation, this would clear cached files
    // For now, we just return success
    return { success: true };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private mapDataRequest(request: any): DataRequestResponse {
    return {
      id: request.id,
      type: request.type,
      status: request.status,
      reason: request.reason,
      downloadUrl: request.downloadUrl,
      downloadExpiresAt: request.downloadExpiresAt,
      createdAt: request.createdAt,
      processedAt: request.processedAt,
    };
  }

  private async processDataExportAsync(
    requestId: string,
    userId: string,
  ): Promise<void> {
    // This would normally be handled by a background job queue
    // For now, we simulate async processing
    setTimeout(async () => {
      try {
        // Update status to processing
        await this.prisma.dataRequest.update({
          where: { id: requestId },
          data: { status: 'PROCESSING' },
        });

        // Collect user data
        const userData = await this.collectUserData(userId);

        // In production, you would:
        // 1. Generate a secure JSON/ZIP file
        // 2. Upload to secure storage (S3, etc.)
        // 3. Generate a signed download URL
        // 4. Send notification email

        // For now, mark as completed (download URL would be set in production)
        await this.prisma.dataRequest.update({
          where: { id: requestId },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            metadata: { dataCollected: Object.keys(userData) },
          },
        });
      } catch (error) {
        await this.prisma.dataRequest.update({
          where: { id: requestId },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
          },
        });
      }
    }, 5000); // Simulate 5 second processing time
  }

  private async collectUserData(userId: string): Promise<any> {
    // Collect all user data for export
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        conversations: {
          include: {
            messages: true,
          },
        },
        leads: true,
        contacts: true,
        accounts: true,
        opportunities: true,
        activities: true,
        notes: true,
        files: true,
      },
    });

    // Remove sensitive fields
    if (user) {
      delete (user as any).passwordHash;
    }

    return user;
  }

  // ============================================
  // Email Notification Preferences
  // ============================================

  async getEmailNotificationPreferences(userId: string) {
    let preferences = await this.prisma.emailNotificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = await this.prisma.emailNotificationPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updateEmailNotificationPreferences(
    userId: string,
    preferences: {
      emailsEnabled?: boolean;
      newLeadAssigned?: boolean;
      leadStatusChange?: boolean;
      dealStageChange?: boolean;
      dealWonLost?: boolean;
      taskAssigned?: boolean;
      taskDueReminder?: boolean;
      meetingReminder?: boolean;
      dailyDigest?: boolean;
      weeklyReport?: boolean;
      marketingEmails?: boolean;
    },
  ) {
    // Ensure the preferences record exists
    const existing = await this.prisma.emailNotificationPreferences.findUnique({
      where: { userId },
    });

    if (!existing) {
      return this.prisma.emailNotificationPreferences.create({
        data: {
          userId,
          ...preferences,
        },
      });
    }

    return this.prisma.emailNotificationPreferences.update({
      where: { userId },
      data: preferences,
    });
  }
}
