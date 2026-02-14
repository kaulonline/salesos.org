import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { EmailIntegrationsService } from './email-integrations.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { EmailProvider } from '@prisma/client';
import { InitiateOAuthDto, UpdateEmailConnectionDto, CompleteOAuthDto } from './dto/email-integration.dto';

@ApiTags('Email Integrations')
@ApiBearerAuth('JWT')
@Controller('email-integrations')
export class EmailIntegrationsController {
  private readonly logger = new Logger(EmailIntegrationsController.name);

  constructor(private readonly emailIntegrationsService: EmailIntegrationsService) {}

  /**
   * Get available email integrations
   */
  @Get('available')
  getAvailableIntegrations() {
    return {
      success: true,
      integrations: this.emailIntegrationsService.getAvailableIntegrations(),
    };
  }

  /**
   * Get user's connected email accounts
   */
  @Get('connections')
  @UseGuards(JwtAuthGuard)
  async getConnections(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const connections = await this.emailIntegrationsService.getConnections(userId);
    return {
      success: true,
      connections,
    };
  }

  /**
   * Get a specific connection
   */
  @Get('connections/:id')
  @UseGuards(JwtAuthGuard)
  async getConnection(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const connection = await this.emailIntegrationsService.getConnection(connectionId, userId);
    return {
      success: true,
      connection,
    };
  }

  /**
   * Initiate OAuth flow for a provider
   */
  @Post('connect')
  @UseGuards(JwtAuthGuard)
  async initiateOAuth(@Body() dto: InitiateOAuthDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`Initiating OAuth for user ${userId}, provider: ${dto.provider}`);

    const result = await this.emailIntegrationsService.initiateOAuth(userId, dto.provider);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * OAuth callback for Gmail
   */
  @Get('callback/gmail')
  async gmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      this.logger.error(`Gmail OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await this.emailIntegrationsService.handleOAuthCallback(
        EmailProvider.GMAIL,
        code,
        state,
      );

      if (result.success) {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?success=true&provider=gmail&email=${encodeURIComponent(result.email || '')}`,
        );
      } else {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(result.error || 'Unknown error')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Gmail OAuth callback error: ${err.message}`);
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  /**
   * OAuth callback for Outlook
   */
  @Get('callback/outlook')
  async outlookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      this.logger.error(`Outlook OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await this.emailIntegrationsService.handleOAuthCallback(
        EmailProvider.OUTLOOK,
        code,
        state,
      );

      if (result.success) {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?success=true&provider=outlook&email=${encodeURIComponent(result.email || '')}`,
        );
      } else {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(result.error || 'Unknown error')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Outlook OAuth callback error: ${err.message}`);
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  /**
   * Update connection settings
   */
  @Patch('connections/:id')
  @UseGuards(JwtAuthGuard)
  async updateConnection(
    @Param('id') connectionId: string,
    @Body() dto: UpdateEmailConnectionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const connection = await this.emailIntegrationsService.updateConnection(connectionId, userId, dto);
    return {
      success: true,
      connection,
    };
  }

  /**
   * Disconnect an email account
   */
  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  async deleteConnection(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.emailIntegrationsService.deleteConnection(connectionId, userId);
    return {
      success: true,
      message: 'Connection deleted successfully',
    };
  }

  /**
   * Trigger manual sync for a connection
   */
  @Post('connections/:id/sync')
  @UseGuards(JwtAuthGuard)
  async triggerSync(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const result = await this.emailIntegrationsService.triggerSync(connectionId, userId);
    return result;
  }

  /**
   * Refresh access token for a connection
   */
  @Post('connections/:id/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    // Verify ownership first
    await this.emailIntegrationsService.getConnection(connectionId, userId);

    await this.emailIntegrationsService.refreshAccessToken(connectionId);
    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  }
}
