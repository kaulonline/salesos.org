// Script to sync Stripe data to the database
// Run with: npx ts-node scripts/sync-stripe.ts

import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/database/prisma.module';
import { PaymentsService } from '../src/payments/payments.service';
import { GatewayConfigService } from '../src/payments/gateway-config.service';
import { StripeService } from '../src/payments/gateways/stripe.service';
import { RazorpayService } from '../src/payments/gateways/razorpay.service';

// Minimal module for sync - only loads what's needed for payments
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  providers: [
    PaymentsService,
    GatewayConfigService,
    StripeService,
    RazorpayService,
  ],
})
class SyncModule {}

async function bootstrap() {
  console.log('Starting Stripe sync...');
  console.log('Initializing minimal application context...');

  const app = await NestFactory.createApplicationContext(SyncModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    console.log('Application context ready. Starting sync...');
    const paymentsService = app.get(PaymentsService);
    const results = await paymentsService.syncStripeData();

    console.log('\n========== SYNC RESULTS ==========');
    console.log(`Customers Processed: ${results.customersProcessed}`);
    console.log(`Customers Created: ${results.customersCreated}`);
    console.log(`Customers Updated: ${results.customersUpdated}`);
    console.log(`Subscriptions Processed: ${results.subscriptionsProcessed}`);
    console.log(`Subscriptions Created: ${results.subscriptionsCreated}`);
    console.log(`Subscriptions Updated: ${results.subscriptionsUpdated}`);
    console.log(`Invoices Processed: ${results.invoicesProcessed}`);
    console.log(`Invoices Created: ${results.invoicesCreated}`);

    if (results.errors.length > 0) {
      console.log('\n========== ERRORS ==========');
      results.errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    console.log('\nSync completed successfully!');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
