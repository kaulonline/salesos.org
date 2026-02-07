import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StripeService } from '../src/payments/gateways/stripe.service';
import { PrismaService } from '../src/database/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const stripeService = app.get(StripeService);
  const prisma = app.get(PrismaService);

  const stripe = await (stripeService as any).getStripe();

  // Get active subscriptions from Stripe
  const subscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 5,
  });

  console.log('Active Stripe subscriptions:', subscriptions.data.length);

  if (subscriptions.data.length === 0) {
    console.log('No active subscriptions in Stripe');
    await app.close();
    return;
  }

  const stripeSub = subscriptions.data[0];
  const item = stripeSub.items.data[0];
  const price = item?.price;

  console.log('\nStripe subscription:');
  console.log('  ID:', stripeSub.id);
  console.log('  Status:', stripeSub.status);
  console.log('  Amount:', (price?.unit_amount || 0) / 100, price?.currency?.toUpperCase());
  console.log('  Interval:', price?.recurring?.interval);
  console.log('  Customer:', stripeSub.customer);

  // Find matching billing customer
  const billingCustomer = await prisma.billingCustomer.findFirst({
    where: { stripeCustomerId: stripeSub.customer as string },
    include: { user: true },
  });

  if (!billingCustomer) {
    console.log('\nNo billing customer found for Stripe customer:', stripeSub.customer);
    await app.close();
    return;
  }

  console.log('\nFound billing customer:', billingCustomer.id);
  console.log('  User:', billingCustomer.user?.email);

  // Find matching license type by price
  const interval = price?.recurring?.interval;
  const amount = price?.unit_amount || 0;

  const licenseType = await prisma.licenseType.findFirst({
    where: interval === 'year'
      ? { priceYearly: amount }
      : { priceMonthly: amount },
  });

  if (!licenseType) {
    console.log('\nNo matching license type found for amount:', amount);
    // Try to find starter as fallback
    const starter = await prisma.licenseType.findFirst({ where: { tier: 'STARTER' } });
    if (starter) {
      console.log('Using Starter plan as fallback');
    }
  } else {
    console.log('\nMatched license type:', licenseType.name);
  }

  const licenseTypeId = licenseType?.id || (await prisma.licenseType.findFirst({ where: { tier: 'STARTER' } }))?.id;

  if (!licenseTypeId) {
    console.log('No license type found!');
    await app.close();
    return;
  }

  // Update or create subscription in database
  const dbSub = await prisma.subscription.upsert({
    where: { stripeSubscriptionId: stripeSub.id },
    create: {
      customerId: billingCustomer.id,
      licenseTypeId,
      stripeSubscriptionId: stripeSub.id,
      gateway: 'STRIPE',
      status: 'ACTIVE',
      billingCycle: interval === 'year' ? 'yearly' : 'monthly',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      unitAmount: amount,
      currency: price?.currency?.toUpperCase() || 'USD',
    },
    update: {
      status: 'ACTIVE',
      licenseTypeId,
      billingCycle: interval === 'year' ? 'yearly' : 'monthly',
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      unitAmount: amount,
    },
    include: { licenseType: true },
  });

  console.log('\nSynced subscription to database:');
  console.log('  DB ID:', dbSub.id);
  console.log('  Plan:', dbSub.licenseType?.name);
  console.log('  Status:', dbSub.status);
  console.log('  Period End:', dbSub.currentPeriodEnd);

  // Also update user license
  await prisma.userLicense.updateMany({
    where: { userId: billingCustomer.userId },
    data: { status: 'CANCELLED' },
  });

  await prisma.userLicense.upsert({
    where: {
      userId_licenseTypeId: {
        userId: billingCustomer.userId,
        licenseTypeId,
      },
    },
    create: {
      userId: billingCustomer.userId,
      licenseTypeId,
      status: 'ACTIVE',
      startDate: new Date(stripeSub.current_period_start * 1000),
      endDate: new Date(stripeSub.current_period_end * 1000),
    },
    update: {
      status: 'ACTIVE',
      endDate: new Date(stripeSub.current_period_end * 1000),
    },
  });

  console.log('\nUpdated user license');
  console.log('\nDone!');

  await app.close();
}

main().catch(console.error);
