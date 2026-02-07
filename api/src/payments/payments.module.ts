// Payments Module - Comprehensive payment processing with Stripe and Razorpay
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';

// Services
import { PaymentsService } from './payments.service';
import { GatewayConfigService } from './gateway-config.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { StripeService } from './gateways/stripe.service';
import { RazorpayService } from './gateways/razorpay.service';
import { StripeWebhookService } from './webhooks/stripe-webhook.service';
import { RazorpayWebhookService } from './webhooks/razorpay-webhook.service';

// Controllers
import { PublicPaymentsController, PaymentsController, AdminPaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks/webhooks.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
  ],
  controllers: [
    PublicPaymentsController,
    PaymentsController,
    AdminPaymentsController,
    WebhooksController,
  ],
  providers: [
    PaymentsService,
    GatewayConfigService,
    InvoicePdfService,
    StripeService,
    RazorpayService,
    StripeWebhookService,
    RazorpayWebhookService,
  ],
  exports: [
    PaymentsService,
    GatewayConfigService,
    StripeService,
    RazorpayService,
  ],
})
export class PaymentsModule {}
