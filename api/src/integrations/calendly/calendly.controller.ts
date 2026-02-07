import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { CalendlyService } from './calendly.service';

@ApiTags('Integrations - Calendly')
@Controller('integrations/calendly')
export class CalendlyController {
  constructor(private readonly calendlyService: CalendlyService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Calendly connection status' })
  async getStatus() {
    return this.calendlyService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Calendly connection' })
  async testConnection() {
    return this.calendlyService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Calendly OAuth flow' })
  async connect() {
    const result = await this.calendlyService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Calendly OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${error}`);
    }

    try {
      await this.calendlyService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=calendly`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Calendly' })
  async disconnect() {
    await this.calendlyService.disconnect();
    return { success: true, message: 'Calendly disconnected' };
  }

  @Get('event-types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Calendly event types' })
  async getEventTypes() {
    const eventTypes = await this.calendlyService.getEventTypes();
    return { success: true, data: eventTypes };
  }

  @Get('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scheduled events' })
  async getScheduledEvents(
    @Query('start') startTime?: string,
    @Query('end') endTime?: string,
  ) {
    const events = await this.calendlyService.getScheduledEvents(startTime, endTime);
    return { success: true, data: events };
  }
}
