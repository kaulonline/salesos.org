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
import { XeroService } from './xero.service';

@ApiTags('Integrations - Xero')
@Controller('integrations/xero')
export class XeroController {
  constructor(private readonly xeroService: XeroService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Xero connection status' })
  async getStatus() {
    return this.xeroService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Xero connection' })
  async testConnection() {
    return this.xeroService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Xero OAuth flow' })
  async connect() {
    const result = await this.xeroService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Xero OAuth callback' })
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
      await this.xeroService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=xero`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Xero' })
  async disconnect() {
    await this.xeroService.disconnect();
    return { success: true, message: 'Xero disconnected' };
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Xero contacts' })
  async getContacts() {
    const contacts = await this.xeroService.getContacts();
    return { success: true, data: contacts };
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Xero invoices' })
  async getInvoices() {
    const invoices = await this.xeroService.getInvoices();
    return { success: true, data: invoices };
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Xero payments' })
  async getPayments() {
    const payments = await this.xeroService.getPayments();
    return { success: true, data: payments };
  }
}
