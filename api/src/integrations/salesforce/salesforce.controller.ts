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
import { SalesforceService } from './salesforce.service';

@ApiTags('Integrations - Salesforce')
@Controller('integrations/salesforce')
export class SalesforceController {
  constructor(private readonly salesforceService: SalesforceService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Salesforce connection status' })
  async getStatus() {
    return this.salesforceService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Salesforce connection' })
  async testConnection() {
    return this.salesforceService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Salesforce OAuth flow' })
  async connect() {
    const result = await this.salesforceService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Salesforce OAuth callback' })
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
      await this.salesforceService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=salesforce`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Salesforce' })
  async disconnect() {
    await this.salesforceService.disconnect();
    return { success: true, message: 'Salesforce disconnected' };
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Salesforce contacts' })
  async getContacts(@Query('limit') limit?: number) {
    const contacts = await this.salesforceService.getContacts(limit);
    return { success: true, data: contacts };
  }

  @Get('opportunities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Salesforce opportunities' })
  async getOpportunities(@Query('limit') limit?: number) {
    const opportunities = await this.salesforceService.getOpportunities(limit);
    return { success: true, data: opportunities };
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Salesforce accounts' })
  async getAccounts(@Query('limit') limit?: number) {
    const accounts = await this.salesforceService.getAccounts(limit);
    return { success: true, data: accounts };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync Salesforce data' })
  async syncData() {
    const result = await this.salesforceService.syncContacts();
    return { success: true, ...result };
  }
}
