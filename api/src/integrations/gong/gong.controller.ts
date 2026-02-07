import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { GongService } from './gong.service';

@ApiTags('Integrations - Gong')
@Controller('integrations/gong')
export class GongController {
  constructor(private readonly gongService: GongService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Gong connection status' })
  async getStatus() {
    return this.gongService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Gong connection' })
  async testConnection() {
    return this.gongService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Gong OAuth flow' })
  async connect() {
    const result = await this.gongService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Gong OAuth callback' })
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
      await this.gongService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=gong`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Gong' })
  async disconnect() {
    await this.gongService.disconnect();
    return { success: true, message: 'Gong disconnected' };
  }

  @Get('calls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Gong calls' })
  async getCalls(
    @Query('from') fromDateTime?: string,
    @Query('to') toDateTime?: string,
  ) {
    const calls = await this.gongService.getCalls(fromDateTime, toDateTime);
    return { success: true, data: calls };
  }

  @Get('calls/:callId/transcript')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get call transcript' })
  async getCallTranscript(@Param('callId') callId: string) {
    const transcript = await this.gongService.getCallTranscript(callId);
    return { success: true, data: transcript };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Gong users' })
  async getUsers() {
    const users = await this.gongService.getUsers();
    return { success: true, data: users };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity stats' })
  async getStats(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ) {
    const stats = await this.gongService.getStats(fromDate, toDate);
    return { success: true, data: stats };
  }
}
