import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { OracleCXService } from './oracle-cx.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { CrmProvider } from '@prisma/client';
import * as crypto from 'crypto';
import { RequireFeature, LicenseFeatures } from '../licensing/decorators/license.decorator';
import {
  OracleCXSyncSettingsDto,
} from './dto/oracle-cx-connection.dto';
import {
  OracleCXQueryDto,
} from './dto/oracle-cx-query.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('oracle-cx')
export class OracleCXController {
  private readonly logger = new Logger(OracleCXController.name);

  constructor(
    private readonly oracleCXService: OracleCXService,
    private readonly prisma: PrismaService,
  ) {
    // Clean up expired OAuth states every 5 minutes
    setInterval(async () => {
      try {
        await this.prisma.oAuthState.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
            provider: CrmProvider.ORACLE_CX,
          },
        });
      } catch (error) {
        this.logger.error('Failed to clean up Oracle CX OAuth states:', error);
      }
    }, 5 * 60 * 1000);
  }

  // ==================== CONNECTION MANAGEMENT ====================

  /**
   * Get Oracle CX connection status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: AuthenticatedRequest) {
    return this.oracleCXService.getConnectionStatus(req.user.userId);
  }

  /**
   * Get OAuth authorization URL
   */
  @Get('auth/url')
  @UseGuards(JwtAuthGuard)
  @RequireFeature(LicenseFeatures.CRM_ORACLE_CX)
  async getAuthUrl(
    @Req() req: AuthenticatedRequest,
    @Query('instanceUrl') instanceUrl?: string,
  ) {
    // Check if Oracle CX is enabled
    const isEnabled = await this.oracleCXService.isEnabled();
    if (!isEnabled) {
      return {
        error:
          'Oracle CX integration is not enabled. Please contact your administrator.',
      };
    }

    // Generate a random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store the state in database
    await this.prisma.oAuthState.create({
      data: {
        state,
        userId: req.user.userId,
        provider: CrmProvider.ORACLE_CX,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Store instanceUrl in a separate table or encode in state if needed
    // For now, we'll expect it in the callback or use a default

    const authUrl = await this.oracleCXService.getAuthorizationUrl(state);

    return { authUrl };
  }

  /**
   * OAuth callback handler
   */
  @Get('oauth/callback')
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const sendResponse = (success: boolean, message: string) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Oracle CX Connection</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              }
              .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                max-width: 400px;
              }
              .success { color: #10B981; }
              .error { color: #EF4444; }
              .icon { font-size: 48px; margin-bottom: 16px; }
              h1 { margin: 0 0 12px 0; font-size: 24px; }
              p { color: #6B7280; margin: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">${success ? '✓' : '✗'}</div>
              <h1 class="${success ? 'success' : 'error'}">
                ${success ? 'Connected!' : 'Connection Failed'}
              </h1>
              <p>${message}</p>
              <p style="margin-top: 16px; font-size: 14px;">This window will close automatically...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oracle-cx-oauth-callback',
                  success: ${success},
                  message: '${message.replace(/'/g, "\\'")}'
                }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    };

    // Handle errors from Oracle CX
    if (error) {
      this.logger.error(`Oracle CX OAuth error: ${error} - ${errorDescription}`);
      return sendResponse(false, errorDescription || 'Authorization denied');
    }

    // Validate state from database
    const stateData = await this.prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!stateData || stateData.expiresAt < new Date()) {
      this.logger.error('Invalid or expired Oracle CX OAuth state');
      if (stateData) {
        await this.prisma.oAuthState.delete({ where: { state } }).catch(() => {});
      }
      return sendResponse(false, 'Invalid or expired authorization request');
    }

    // Remove used state
    await this.prisma.oAuthState.delete({ where: { state } }).catch(() => {});

    try {
      // Exchange code for tokens
      const tokens = await this.oracleCXService.exchangeCodeForTokens(code);

      // Get instance URL from database config (set by admin) or environment variable
      const integration = await this.prisma.crmIntegration.findUnique({
        where: { provider: CrmProvider.ORACLE_CX },
      });

      const additionalConfig = (integration?.config as any) || {};
      const instanceUrl =
        additionalConfig.instanceUrl ||
        process.env.ORACLE_CX_INSTANCE_URL ||
        '';

      if (!instanceUrl) {
        this.logger.error('Oracle CX instance URL not configured');
        return sendResponse(
          false,
          'Oracle CX instance URL not configured. Please contact your administrator.',
        );
      }

      // Get user identity
      const identity = await this.oracleCXService.getUserIdentity(
        tokens.access_token,
        instanceUrl,
      );

      // Store the connection
      await this.oracleCXService.storeConnection(
        stateData.userId,
        tokens,
        identity,
        instanceUrl,
        false, // isSandbox
      );

      this.logger.log(`Oracle CX connected for user ${stateData.userId}`);
      return sendResponse(true, `Connected as ${identity.displayName}`);
    } catch (err: any) {
      this.logger.error('Oracle CX OAuth callback error:', err);
      return sendResponse(false, err.message || 'Failed to complete connection');
    }
  }

  /**
   * Disconnect from Oracle CX
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req: AuthenticatedRequest) {
    await this.oracleCXService.disconnect(req.user.userId);
    return { success: true, message: 'Oracle CX disconnected successfully' };
  }

  /**
   * Refresh the access token
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: AuthenticatedRequest) {
    try {
      const result = await this.oracleCXService.forceRefreshToken(req.user.userId);
      if (result.success) {
        return {
          success: true,
          expiresAt: result.expiresAt,
        };
      }
      return { success: false, message: result.error };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Test the connection
   */
  @Get('test')
  @UseGuards(JwtAuthGuard)
  async testConnection(@Req() req: AuthenticatedRequest) {
    return this.oracleCXService.testConnection(req.user.userId);
  }

  // ==================== SYNC SETTINGS ====================

  /**
   * Get sync settings
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSyncSettings(@Req() req: AuthenticatedRequest) {
    return this.oracleCXService.getSyncSettings(req.user.userId);
  }

  /**
   * Update sync settings
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSyncSettings(
    @Req() req: AuthenticatedRequest,
    @Body() settings: OracleCXSyncSettingsDto,
  ) {
    await this.oracleCXService.updateSyncSettings(req.user.userId, settings);
    return { success: true };
  }

  // ==================== RESOURCE QUERIES ====================

  /**
   * Execute a query against Oracle CX resources
   */
  @Post('query')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async query(
    @Req() req: AuthenticatedRequest,
    @Body() queryDto: OracleCXQueryDto,
  ) {
    return this.oracleCXService.query(
      req.user.userId,
      queryDto.resource,
      queryDto,
    );
  }

  /**
   * Describe a resource schema
   */
  @Get('describe/:resource')
  @UseGuards(JwtAuthGuard)
  async describeResource(
    @Req() req: AuthenticatedRequest,
    @Param('resource') resource: string,
  ) {
    return this.oracleCXService.describeResource(req.user.userId, resource);
  }

  /**
   * Get all available resources
   */
  @Get('describe')
  @UseGuards(JwtAuthGuard)
  async describeAll(@Req() req: AuthenticatedRequest) {
    return this.oracleCXService.describeAll(req.user.userId);
  }

  /**
   * Get dashboard statistics
   */
  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Req() req: AuthenticatedRequest) {
    return this.oracleCXService.getDashboardStats(req.user.userId);
  }

  // ==================== OPPORTUNITIES ====================

  /**
   * List opportunities
   */
  @Get('opportunities')
  @UseGuards(JwtAuthGuard)
  async listOpportunities(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('minAmount') minAmount?: string,
    @Query('search') search?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset
      ? parseInt(offset, 10)
      : (pageNum - 1) * pageSize;

    return this.oracleCXService.listOpportunities(
      req.user.userId,
      pageSize,
      calculatedOffset,
      {
        status,
        stage,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        search,
      },
    );
  }

  /**
   * Get opportunity by ID
   */
  @Get('opportunities/:id')
  @UseGuards(JwtAuthGuard)
  async getOpportunity(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.oracleCXService.getById(req.user.userId, 'opportunities', id);
  }

  // ==================== ACCOUNTS ====================

  /**
   * List accounts
   */
  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async listAccounts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('industry') industry?: string,
    @Query('search') search?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset
      ? parseInt(offset, 10)
      : (pageNum - 1) * pageSize;

    return this.oracleCXService.listAccounts(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { industry, search },
    );
  }

  /**
   * Get account by ID
   */
  @Get('accounts/:id')
  @UseGuards(JwtAuthGuard)
  async getAccount(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.oracleCXService.getById(req.user.userId, 'accounts', id);
  }

  // ==================== CONTACTS ====================

  /**
   * List contacts
   */
  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  async listContacts(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('accountId') accountId?: string,
    @Query('search') search?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset
      ? parseInt(offset, 10)
      : (pageNum - 1) * pageSize;

    return this.oracleCXService.listContacts(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { accountId, search },
    );
  }

  /**
   * Get contact by ID
   */
  @Get('contacts/:id')
  @UseGuards(JwtAuthGuard)
  async getContact(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.oracleCXService.getById(req.user.userId, 'contacts', id);
  }

  // ==================== LEADS ====================

  /**
   * List leads
   */
  @Get('leads')
  @UseGuards(JwtAuthGuard)
  async listLeads(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
    @Query('search') search?: string,
  ) {
    const pageSize = parseInt(limit || '50', 10);
    const pageNum = page ? parseInt(page, 10) : 1;
    const calculatedOffset = offset
      ? parseInt(offset, 10)
      : (pageNum - 1) * pageSize;

    return this.oracleCXService.listLeads(
      req.user.userId,
      pageSize,
      calculatedOffset,
      { status, rating, search },
    );
  }

  /**
   * Get lead by ID
   */
  @Get('leads/:id')
  @UseGuards(JwtAuthGuard)
  async getLead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.oracleCXService.getById(req.user.userId, 'leads', id);
  }

  // ==================== ACTIVITIES ====================

  /**
   * Get activities for an entity
   */
  @Get('activities')
  @UseGuards(JwtAuthGuard)
  async getActivities(
    @Req() req: AuthenticatedRequest,
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: 'opportunity' | 'account' | 'contact' | 'lead',
    @Query('limit') limit?: string,
  ) {
    if (!entityId || !entityType) {
      return { error: 'entityId and entityType are required' };
    }

    return this.oracleCXService.getActivities(
      req.user.userId,
      entityId,
      entityType,
      parseInt(limit || '50', 10),
    );
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Create a new resource record
   */
  @Post('resources/:type')
  @UseGuards(JwtAuthGuard)
  async createResource(
    @Req() req: AuthenticatedRequest,
    @Param('type') resourceType: string,
    @Body() data: any,
  ) {
    this.logger.debug(`Creating ${resourceType} with: ${JSON.stringify(data)}`);
    return this.oracleCXService.create(req.user.userId, resourceType, data);
  }

  /**
   * Update a resource record
   */
  @Patch('resources/:type/:id')
  @UseGuards(JwtAuthGuard)
  async updateResource(
    @Req() req: AuthenticatedRequest,
    @Param('type') resourceType: string,
    @Param('id') recordId: string,
    @Body() data: any,
  ) {
    this.logger.debug(
      `Updating ${resourceType}/${recordId} with: ${JSON.stringify(data)}`,
    );
    await this.oracleCXService.update(
      req.user.userId,
      resourceType,
      recordId,
      data,
    );
    return { success: true };
  }

  /**
   * Delete a resource record
   */
  @Delete('resources/:type/:id')
  @UseGuards(JwtAuthGuard)
  async deleteResource(
    @Req() req: AuthenticatedRequest,
    @Param('type') resourceType: string,
    @Param('id') recordId: string,
  ) {
    this.logger.debug(`Deleting ${resourceType}/${recordId}`);
    await this.oracleCXService.delete(req.user.userId, resourceType, recordId);
    return { success: true };
  }
}
