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
import type { Response } from 'express';
import { CalendarIntegrationsService } from './calendar-integrations.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { CalendarProvider } from '@prisma/client';
import { InitiateCalendarOAuthDto, UpdateCalendarConnectionDto } from './dto/calendar-integration.dto';

@Controller('calendar-integrations')
export class CalendarIntegrationsController {
  private readonly logger = new Logger(CalendarIntegrationsController.name);

  constructor(private readonly calendarIntegrationsService: CalendarIntegrationsService) {}

  /**
   * Get available calendar integrations
   */
  @Get('available')
  getAvailableIntegrations() {
    return {
      success: true,
      integrations: this.calendarIntegrationsService.getAvailableIntegrations(),
    };
  }

  /**
   * Get user's connected calendar accounts
   */
  @Get('connections')
  @UseGuards(JwtAuthGuard)
  async getConnections(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const connections = await this.calendarIntegrationsService.getConnections(userId);
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
    const connection = await this.calendarIntegrationsService.getConnection(connectionId, userId);
    return {
      success: true,
      connection,
    };
  }

  /**
   * Get available calendars for a connection
   */
  @Get('connections/:id/calendars')
  @UseGuards(JwtAuthGuard)
  async getAvailableCalendars(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const calendars = await this.calendarIntegrationsService.getAvailableCalendars(connectionId, userId);
    return {
      success: true,
      calendars,
    };
  }

  /**
   * Initiate OAuth flow for a provider
   */
  @Post('connect')
  @UseGuards(JwtAuthGuard)
  async initiateOAuth(@Body() dto: InitiateCalendarOAuthDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    this.logger.log(`Initiating Calendar OAuth for user ${userId}, provider: ${dto.provider}`);

    const result = await this.calendarIntegrationsService.initiateOAuth(userId, dto.provider);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * OAuth callback for Google Calendar
   */
  @Get('callback/google')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      this.logger.error(`Google Calendar OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await this.calendarIntegrationsService.handleOAuthCallback(
        CalendarProvider.GOOGLE,
        code,
        state,
      );

      if (result.success) {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?success=true&provider=google-calendar&email=${encodeURIComponent(result.email || '')}`,
        );
      } else {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(result.error || 'Unknown error')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Google Calendar OAuth callback error: ${err.message}`);
      return res.redirect(
        `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`,
      );
    }
  }

  /**
   * OAuth callback for Outlook Calendar
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
      this.logger.error(`Outlook Calendar OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(error)}`);
    }

    try {
      const result = await this.calendarIntegrationsService.handleOAuthCallback(
        CalendarProvider.OUTLOOK,
        code,
        state,
      );

      if (result.success) {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?success=true&provider=outlook-calendar&email=${encodeURIComponent(result.email || '')}`,
        );
      } else {
        return res.redirect(
          `${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(result.error || 'Unknown error')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Outlook Calendar OAuth callback error: ${err.message}`);
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
    @Body() dto: UpdateCalendarConnectionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    const connection = await this.calendarIntegrationsService.updateConnection(connectionId, userId, dto);
    return {
      success: true,
      connection,
    };
  }

  /**
   * Disconnect a calendar account
   */
  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  async deleteConnection(@Param('id') connectionId: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    await this.calendarIntegrationsService.deleteConnection(connectionId, userId);
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
    const result = await this.calendarIntegrationsService.triggerSync(connectionId, userId);
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
    await this.calendarIntegrationsService.getConnection(connectionId, userId);

    await this.calendarIntegrationsService.refreshAccessToken(connectionId);
    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  }
}
