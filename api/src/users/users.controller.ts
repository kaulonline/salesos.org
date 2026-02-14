import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Ip,
  Headers,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { UsersService } from './users.service';
import {
  CreateDataExportRequestDto,
  CreateDataDeletionRequestDto,
  CreateAccountDeletionRequestDto,
  UpdatePrivacyPreferencesDto,
} from './dto/privacy.dto';

/**
 * Interface for uploaded files (compatible with multer)
 */
export interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  fieldname?: string;
  encoding?: string;
}

export interface UserPreferences {
  // General Settings
  theme?: 'light' | 'dark';
  fontSize?: 'small' | 'medium' | 'large';
  language?: string;
  timezone?: string;

  // Model Configuration
  modelConfig?: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };

  // Privacy Settings
  chatHistoryTraining?: boolean;
  contextRetention?: boolean;
  usageAnalytics?: boolean;

  // UI Preferences
  artifactWidth?: number;
  sidebarCollapsed?: boolean;

  // CRM Data Source - synced across all devices
  // 'local' = IRIS internal database, 'salesforce' = External Salesforce CRM
  crmDataSource?: 'local' | 'salesforce';

  // Dashboard Configuration
  dashboardConfig?: {
    widgets?: {
      pipelineSummary?: boolean;
      morningBrief?: boolean;
      irisRank?: boolean;
      todaysFocus?: boolean;
      aiInsights?: boolean;
      recentActivity?: boolean;
      crmModeIndicator?: boolean;
    };
    widgetOrder?: string[];
    collapsedSections?: {
      morningBrief?: boolean;
      irisRank?: boolean;
    };
    layout?: {
      phone?: {
        statsLayout?: 'row' | 'grid';
        insightsStyle?: 'carousel' | 'list';
        activityLimit?: number;
      };
      tablet?: {
        statsColumns?: 2 | 3 | 4;
        showDualColumn?: boolean;
        panelRatio?: number;
      };
    };
    quickStats?: string[];
    dashboardTheme?: 'default' | 'minimal' | 'detailed';
  };
}

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // User Profile Endpoints
  // ============================================

  @Get('me')
  async getCurrentUser(@Request() req) {
    return this.usersService.getUserById(req.user.userId);
  }

  @Put('me')
  async updateCurrentUser(@Request() req, @Body() updateData: any) {
    return this.usersService.updateUserProfile(req.user.userId, updateData);
  }

  @Get('me/preferences')
  async getPreferences(@Request() req) {
    return this.usersService.getUserPreferences(req.user.userId);
  }

  @Put('me/preferences')
  async updatePreferences(
    @Request() req,
    @Body() preferences: UserPreferences,
  ) {
    return this.usersService.updateUserPreferences(
      req.user.userId,
      preferences,
    );
  }

  @Patch('me/preferences')
  async patchPreferences(
    @Request() req,
    @Body() preferences: UserPreferences,
  ) {
    return this.usersService.updateUserPreferences(
      req.user.userId,
      preferences,
    );
  }

  // ============================================
  // Avatar Upload Endpoint
  // ============================================

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 5MB.');
    }

    return this.usersService.uploadAvatar(req.user.userId, file);
  }

  @Delete('me/avatar')
  async deleteAvatar(@Request() req) {
    return this.usersService.deleteAvatar(req.user.userId);
  }

  // ============================================
  // Quota Endpoints
  // ============================================

  @Get('me/quota')
  async getQuota(@Request() req) {
    return this.usersService.getUserQuota(req.user.userId);
  }

  @Put('me/quota')
  async updateQuota(
    @Request() req,
    @Body() quotaData: { salesQuota?: number; quotaPeriod?: 'monthly' | 'quarterly' | 'yearly' },
  ) {
    return this.usersService.updateUserQuota(req.user.userId, quotaData);
  }

  // ============================================
  // Privacy Preferences Endpoints
  // ============================================

  @Get('me/privacy')
  async getPrivacyPreferences(@Request() req) {
    return this.usersService.getPrivacyPreferences(req.user.userId);
  }

  @Put('me/privacy')
  async updatePrivacyPreferences(
    @Request() req,
    @Body() dto: UpdatePrivacyPreferencesDto,
  ) {
    return this.usersService.updatePrivacyPreferences(req.user.userId, dto);
  }

  // ============================================
  // Data Request Endpoints
  // ============================================

  @Get('me/data-requests')
  async getDataRequests(@Request() req) {
    return this.usersService.getDataRequests(req.user.userId);
  }

  @Post('me/data-requests/export')
  async createDataExportRequest(
    @Request() req,
    @Body() dto: CreateDataExportRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.usersService.createDataExportRequest(
      req.user.userId,
      dto.reason,
      ip,
      userAgent,
    );
  }

  @Post('me/data-requests/deletion')
  async createDataDeletionRequest(
    @Request() req,
    @Body() dto: CreateDataDeletionRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.usersService.createDataDeletionRequest(
      req.user.userId,
      dto.confirmationPhrase,
      dto.reason,
      ip,
      userAgent,
    );
  }

  @Post('me/data-requests/account-deletion')
  async createAccountDeletionRequest(
    @Request() req,
    @Body() dto: CreateAccountDeletionRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.usersService.createAccountDeletionRequest(
      req.user.userId,
      dto.password,
      dto.confirmationPhrase,
      dto.reason,
      ip,
      userAgent,
    );
  }

  @Delete('me/data-requests/:id')
  async cancelDataRequest(@Request() req, @Param('id') requestId: string) {
    return this.usersService.cancelDataRequest(req.user.userId, requestId);
  }

  // ============================================
  // Data Retention & Storage Endpoints
  // ============================================

  @Get('me/data-retention')
  async getDataRetentionInfo(@Request() req) {
    return this.usersService.getDataRetentionInfo(req.user.userId);
  }

  @Get('me/storage')
  async getStorageUsage(@Request() req) {
    return this.usersService.getStorageUsage(req.user.userId);
  }

  @Delete('me/conversations')
  async clearConversationHistory(@Request() req) {
    return this.usersService.clearConversationHistory(req.user.userId);
  }

  @Delete('me/cache')
  async clearCache(@Request() req) {
    return this.usersService.clearCache(req.user.userId);
  }

  // ============================================
  // Email Notification Preferences Endpoints
  // ============================================

  @Get('me/email-preferences')
  async getEmailNotificationPreferences(@Request() req) {
    return this.usersService.getEmailNotificationPreferences(req.user.userId);
  }

  @Put('me/email-preferences')
  async updateEmailNotificationPreferences(
    @Request() req,
    @Body() preferences: {
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
    return this.usersService.updateEmailNotificationPreferences(
      req.user.userId,
      preferences,
    );
  }

  @Patch('me/email-preferences')
  async patchEmailNotificationPreferences(
    @Request() req,
    @Body() preferences: {
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
    return this.usersService.updateEmailNotificationPreferences(
      req.user.userId,
      preferences,
    );
  }
}
