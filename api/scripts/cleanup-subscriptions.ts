import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StripeService } from '../src/payments/gateways/stripe.service';
import { PrismaService } from '../src/database/prisma.service';

async function main() {
  // Bootstrap NestJS app to get proper service instances with DI
  const app = await NestFactory.createApplicationContext(AppModule);
  const stripeService = app.get(StripeService);
  const prisma = app.get(PrismaService);

  // Use the internal method to get Stripe instance
  const stripe = await (stripeService as any).getStripe();

  // List all subscriptions
  const subscriptions = await stripe.subscriptions.list({
    limit: 20,
    status: 'all',
  });

  console.log('Found', subscriptions.data.length, 'subscriptions in Stripe\n');

  const activeSubscriptions = subscriptions.data.filter(
    (s: any) => s.status === 'active' || s.status === 'trialing'
  );
  console.log('Active/Trialing subscriptions:', activeSubscriptions.length);
  console.log('---\n');

  if (activeSubscriptions.length <= 1) {
    console.log('Only 0 or 1 active subscription found. Nothing to clean up.');
    await app.close();
    return;
  }

  // Sort by created date (newest first)
  activeSubscriptions.sort((a: any, b: any) => b.created - a.created);

  // Keep the newest one, cancel the rest
  const toKeep = activeSubscriptions[0];
  const toCancel = activeSubscriptions.slice(1);

  console.log('Will KEEP subscription:', toKeep?.id);
  if (toKeep) {
    const item = toKeep.items.data[0];
    console.log('  Amount:', (item?.price?.unit_amount || 0) / 100, item?.price?.currency?.toUpperCase());
    console.log('  Created:', new Date(toKeep.created * 1000).toISOString());
  }
  console.log('');

  console.log('Will CANCEL', toCancel.length, 'subscriptions:');
  for (const sub of toCancel) {
    const item = sub.items.data[0];
    console.log('  -', sub.id, '|', (item?.price?.unit_amount || 0) / 100, item?.price?.currency?.toUpperCase());
  }
  console.log('');

  // Cancel the duplicates
  for (const sub of toCancel) {
    try {
      await stripe.subscriptions.cancel(sub.id);
      console.log('Canceled:', sub.id);

      // Also update database if this subscription exists there
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          cancelReason: 'Duplicate subscription cleanup',
        },
      });
    } catch (error: any) {
      console.log('Failed to cancel', sub.id, ':', error.message);
    }
  }

  console.log('\nDone! Remaining active subscriptions: 1');
  await app.close();
}

main().catch(console.error);
