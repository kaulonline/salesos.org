import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/strategies/jwt-auth.guard';
import { StripeService } from './stripe.service';

@ApiTags('Integrations - Stripe')
@Controller('integrations/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe connection status' })
  async getStatus() {
    return this.stripeService.getStatus();
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test Stripe connection' })
  async testConnection() {
    return this.stripeService.testConnection();
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Stripe OAuth flow' })
  async connect() {
    const result = await this.stripeService.initiateOAuth();
    return { success: true, authUrl: result.authUrl };
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Stripe with API key' })
  async configure(@Body() body: { apiKey: string }) {
    await this.stripeService.saveApiKey(body.apiKey);
    return { success: true, message: 'Stripe API key configured' };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Stripe OAuth callback' })
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
      await this.stripeService.handleOAuthCallback(code);
      return res.redirect(`${frontendUrl}/dashboard/integrations?success=true&provider=stripe`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/dashboard/integrations?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Stripe' })
  async disconnect() {
    await this.stripeService.disconnect();
    return { success: true, message: 'Stripe disconnected' };
  }

  @Get('customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe customers' })
  async getCustomers(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.stripeService.getCustomers(limit, after);
    return { success: true, ...result };
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe invoices' })
  async getInvoices(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.stripeService.getInvoices(limit, after);
    return { success: true, ...result };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe subscriptions' })
  async getSubscriptions(@Query('limit') limit?: number, @Query('after') after?: string) {
    const result = await this.stripeService.getSubscriptions(limit, after);
    return { success: true, ...result };
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe revenue data' })
  async getRevenue(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.stripeService.getRevenueData(
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, ...result };
  }
}
