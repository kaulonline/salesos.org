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
import { HubSpotService } from './hubspot.service';

@ApiTags('Integrations - HubSpot')
@Controller('integrations/hubspot')
export class HubSpotController {
  constructor(private readonly hubspotService: HubSpotService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get HubSpot connection status' })
  async getStatus() {
    return this.hubspotService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test HubSpot connection' })
  async testConnection() {
    return this.hubspotService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate HubSpot OAuth flow' })
  async connect() {
    const result = await this.hubspotService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'HubSpot OAuth callback' })
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
      await this.hubspotService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=hubspot`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect HubSpot' })
  async disconnect() {
    await this.hubspotService.disconnect();
    return { success: true, message: 'HubSpot disconnected' };
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get HubSpot contacts' })
  async getContacts(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.hubspotService.getContacts(limit, after);
    return { success: true, ...result };
  }

  @Get('deals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get HubSpot deals' })
  async getDeals(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.hubspotService.getDeals(limit, after);
    return { success: true, ...result };
  }

  @Get('companies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get HubSpot companies' })
  async getCompanies(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.hubspotService.getCompanies(limit, after);
    return { success: true, ...result };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync data from HubSpot' })
  async sync() {
    const result = await this.hubspotService.syncContacts();
    return { success: true, ...result };
  }
}
