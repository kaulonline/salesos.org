// Webhooks Controller - Handles incoming webhooks from Stripe and Razorpay
import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { StripeWebhookService } from './stripe-webhook.service';
import { RazorpayWebhookService } from './razorpay-webhook.service';

@ApiTags('Payment Webhooks')
@ApiBearerAuth('JWT')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripeWebhookService: StripeWebhookService,
    private readonly razorpayWebhookService: RazorpayWebhookService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('Received Stripe webhook');

    if (!req.rawBody) {
      this.logger.error('No raw body available for Stripe webhook');
      return { received: false };
    }

    try {
      await this.stripeWebhookService.handleWebhook(req.rawBody, signature);
      return { received: true };
    } catch (error) {
      this.logger.error('Stripe webhook error:', error);
      return { received: false, error: error.message };
    }
  }

  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async handleRazorpayWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.log('Received Razorpay webhook');

    try {
      await this.razorpayWebhookService.handleWebhook(JSON.stringify(body), signature);
      return { received: true };
    } catch (error) {
      this.logger.error('Razorpay webhook error:', error);
      return { received: false, error: error.message };
    }
  }
}
