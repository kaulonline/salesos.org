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
import { TeamsService } from './teams.service';

@ApiTags('Integrations - Microsoft Teams')
@Controller('integrations/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Teams connection status' })
  async getStatus() {
    return this.teamsService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Teams connection' })
  async testConnection() {
    return this.teamsService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Teams OAuth flow' })
  async connect() {
    const result = await this.teamsService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Teams OAuth callback' })
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
      await this.teamsService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=teams`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Teams' })
  async disconnect() {
    await this.teamsService.disconnect();
    return { success: true, message: 'Teams disconnected' };
  }

  @Get('teams')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get joined teams' })
  async getTeams() {
    const teams = await this.teamsService.getTeams();
    return { success: true, data: teams };
  }

  @Get('teams/:teamId/channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team channels' })
  async getChannels(@Param('teamId') teamId: string) {
    const channels = await this.teamsService.getChannels(teamId);
    return { success: true, data: channels };
  }

  @Post('teams/:teamId/channels/:channelId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send channel message' })
  async sendMessage(
    @Param('teamId') teamId: string,
    @Param('channelId') channelId: string,
    @Body() body: { message: string },
  ) {
    const result = await this.teamsService.sendChannelMessage(teamId, channelId, body.message);
    return { success: true, data: result };
  }
}
