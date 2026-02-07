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
import { QuickBooksService } from './quickbooks.service';

@ApiTags('Integrations - QuickBooks')
@Controller('integrations/quickbooks')
export class QuickBooksController {
  constructor(private readonly quickbooksService: QuickBooksService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QuickBooks connection status' })
  async getStatus() {
    return this.quickbooksService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test QuickBooks connection' })
  async testConnection() {
    return this.quickbooksService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate QuickBooks OAuth flow' })
  async connect() {
    const result = await this.quickbooksService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'QuickBooks OAuth callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('realmId') realmId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${error}`);
    }

    try {
      await this.quickbooksService.handleOAuthCallback(code, realmId);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=quickbooks`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect QuickBooks' })
  async disconnect() {
    await this.quickbooksService.disconnect();
    return { success: true, message: 'QuickBooks disconnected' };
  }

  @Get('customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QuickBooks customers' })
  async getCustomers() {
    const customers = await this.quickbooksService.getCustomers();
    return { success: true, data: customers };
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QuickBooks invoices' })
  async getInvoices() {
    const invoices = await this.quickbooksService.getInvoices();
    return { success: true, data: invoices };
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QuickBooks payments' })
  async getPayments() {
    const payments = await this.quickbooksService.getPayments();
    return { success: true, data: payments };
  }
}
