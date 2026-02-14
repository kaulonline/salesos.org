import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { SalesforcePackageService } from './salesforce-package.service';
import { SalesforcePackageAuthService } from './salesforce-package-auth.service';
import { PackageAuthGuard, PackageUserAuthGuard } from './guards/package-auth.guard';
import { PackageUser, PackageInstallation } from './decorators/package-user.decorator';
import { RegisterInstallationDto } from './dto/register-installation.dto';
import { GetUserTokenDto, RefreshTokenDto } from './dto/package-auth.dto';
import { SendMessageDto, InitiateStreamDto, PollChunksDto, CreateConversationDto } from './dto/chat-message.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Salesforce Package')
@ApiBearerAuth('JWT')
@Controller('salesforce-package')
export class SalesforcePackageController {
  private readonly logger = new Logger(SalesforcePackageController.name);

  constructor(
    private readonly service: SalesforcePackageService,
    private readonly authService: SalesforcePackageAuthService,
  ) {}

  // ========================
  // Authentication Endpoints
  // ========================

  /**
   * Register a new Salesforce org installation
   * POST /api/salesforce-package/auth/register
   */
  @Post('auth/register')
  @HttpCode(HttpStatus.OK)
  async registerInstallation(@Body() dto: RegisterInstallationDto) {
    this.logger.log(`Registering installation for org: ${dto.orgId}`);
    return this.authService.registerInstallation(dto);
  }

  /**
   * Reconnect an existing Salesforce org installation (regenerate credentials)
   * POST /api/salesforce-package/auth/reconnect
   */
  @Post('auth/reconnect')
  @HttpCode(HttpStatus.OK)
  async reconnectInstallation(@Body() dto: RegisterInstallationDto) {
    this.logger.log(`Reconnecting installation for org: ${dto.orgId}`);
    return this.authService.reconnectInstallation(dto);
  }

  /**
   * Get user access token
   * POST /api/salesforce-package/auth/token
   */
  @Post('auth/token')
  @UseGuards(PackageAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserToken(
    @PackageInstallation() installation: any,
    @Body() dto: GetUserTokenDto,
  ) {
    this.logger.log(`Getting token for user: ${dto.salesforceUserId}`);
    return this.authService.getUserToken(installation, dto);
  }

  /**
   * Refresh expired access token
   * POST /api/salesforce-package/auth/refresh
   */
  @Post('auth/refresh')
  @UseGuards(PackageAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @PackageInstallation() installation: any,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refreshUserToken(installation, dto.refresh_token);
  }

  /**
   * Validate current access token
   * POST /api/salesforce-package/auth/validate
   */
  @Post('auth/validate')
  @UseGuards(PackageAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validateToken(
    @PackageInstallation() installation: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return { valid: false };
    }
    return this.authService.validateUserToken(token, installation);
  }

  // ========================
  // Configuration Endpoints
  // ========================

  /**
   * Get package configuration for org
   * GET /api/salesforce-package/config
   */
  @Get('config')
  @UseGuards(PackageAuthGuard)
  async getConfig(@PackageInstallation() installation: any) {
    return this.service.getConfig(installation);
  }

  /**
   * Update package configuration
   * PUT /api/salesforce-package/config
   */
  @Put('config')
  @UseGuards(PackageAuthGuard)
  async updateConfig(
    @PackageInstallation() installation: any,
    @Body() updates: any,
  ) {
    return this.service.updateConfig(installation, updates);
  }

  /**
   * Get usage analytics for org
   * GET /api/salesforce-package/analytics
   */
  @Get('analytics')
  @UseGuards(PackageAuthGuard)
  async getAnalytics(
    @PackageInstallation() installation: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.service.getAnalytics(installation, start, end);
  }

  // ========================
  // Conversation Endpoints
  // ========================

  /**
   * List user's conversations
   * GET /api/salesforce-package/conversations
   */
  @Get('conversations')
  @UseGuards(PackageUserAuthGuard)
  async getConversations(
    @PackageUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getConversations(
      user,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * Get conversation details with messages
   * GET /api/salesforce-package/conversations/:id
   */
  @Get('conversations/:id')
  @UseGuards(PackageUserAuthGuard)
  async getConversation(
    @PackageUser() user: any,
    @Param('id') conversationId: string,
  ) {
    return this.service.getConversation(user, conversationId);
  }

  /**
   * Create new conversation
   * POST /api/salesforce-package/conversations
   */
  @Post('conversations')
  @UseGuards(PackageUserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @PackageUser() user: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.service.createConversation(user, dto);
  }

  /**
   * Delete conversation
   * DELETE /api/salesforce-package/conversations/:id
   */
  @Delete('conversations/:id')
  @UseGuards(PackageUserAuthGuard)
  async deleteConversation(
    @PackageUser() user: any,
    @Param('id') conversationId: string,
  ) {
    return this.service.deleteConversation(user, conversationId);
  }

  // ========================
  // Chat Endpoints
  // ========================

  /**
   * Send message and get complete response (non-streaming)
   * POST /api/salesforce-package/chat/:conversationId/message
   */
  @Post('chat/:conversationId/message')
  @UseGuards(PackageUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @PackageUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    this.logger.log(`Message from user ${user.id} in conversation ${conversationId}`);
    return this.service.sendMessage(user, conversationId, dto);
  }

  /**
   * Stream AI response with Server-Sent Events
   * POST /api/salesforce-package/chat/:conversationId/stream
   */
  @Post('chat/:conversationId/stream')
  @UseGuards(PackageUserAuthGuard)
  @SkipThrottle()
  async streamMessage(
    @PackageUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    this.logger.log(`Streaming message from user ${user.id} in conversation ${conversationId}`);
    return this.service.streamResponse(user, conversationId, dto, res);
  }

  /**
   * Initiate streaming request and get request ID
   * POST /api/salesforce-package/chat/:conversationId/initiate
   */
  @Post('chat/:conversationId/initiate')
  @UseGuards(PackageUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiateStream(
    @PackageUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: InitiateStreamDto,
  ) {
    return this.service.initiateStream(user, conversationId, dto);
  }

  /**
   * Poll for message chunks (long-polling for Apex)
   * GET /api/salesforce-package/chat/poll
   */
  @Get('chat/poll')
  @UseGuards(PackageUserAuthGuard)
  async pollChunks(
    @Query('requestId') requestId: string,
    @Query('lastChunkIndex') lastChunkIndex: string,
  ) {
    return this.service.pollChunks(requestId, parseInt(lastChunkIndex, 10) || 0);
  }

  // ========================
  // Health Check
  // ========================

  /**
   * Health check endpoint
   * GET /api/salesforce-package/health
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'salesforce-package',
      timestamp: new Date().toISOString(),
    };
  }
}
