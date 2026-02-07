import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { ZoomService } from './zoom.service';

@ApiTags('Integrations - Zoom')
@Controller('integrations/zoom')
export class ZoomController {
  constructor(private readonly zoomService: ZoomService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Zoom connection status' })
  async getStatus() {
    return this.zoomService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Zoom connection' })
  async testConnection() {
    return this.zoomService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Zoom OAuth flow' })
  async connect() {
    const result = await this.zoomService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Zoom OAuth callback' })
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
      await this.zoomService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=zoom`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Zoom' })
  async disconnect() {
    await this.zoomService.disconnect();
    return { success: true, message: 'Zoom disconnected' };
  }

  @Get('meetings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Zoom meetings' })
  async getMeetings(@Query('type') type?: 'scheduled' | 'live' | 'upcoming') {
    const result = await this.zoomService.getMeetings(type);
    return { success: true, ...result };
  }

  @Get('meetings/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get meeting details' })
  async getMeetingDetails(@Param('id') id: string) {
    const result = await this.zoomService.getMeetingDetails(id);
    return { success: true, ...result };
  }

  @Post('meetings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Zoom meeting' })
  async createMeeting(@Body() body: {
    topic: string;
    startTime: string;
    duration: number;
    agenda?: string;
    timezone?: string;
  }) {
    const result = await this.zoomService.createMeeting(body);
    return { success: true, ...result };
  }

  @Get('recordings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Zoom recordings' })
  async getRecordings(@Query('from') from?: string, @Query('to') to?: string) {
    const result = await this.zoomService.getRecordings(from, to);
    return { success: true, ...result };
  }
}
