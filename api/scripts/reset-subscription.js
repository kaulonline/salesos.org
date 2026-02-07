const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-me!';

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

async function main() {
  const prisma = new PrismaClient();
  const config = await prisma.paymentGatewayConfig.findFirst({ where: { provider: 'STRIPE' } });
  const key = decrypt(config.secretKey);

  if (!key || !key.startsWith('sk_')) {
    console.log('Could not decrypt Stripe key');
    await prisma.$disconnect();
    return;
  }

  const stripe = new Stripe(key);

  // Get Starter plan
  const starter = await prisma.licenseType.findFirst({ where: { tier: 'STARTER' } });

  // Get customer
  const customer = await prisma.billingCustomer.findFirst({
    where: { stripeCustomerId: { not: null } },
    include: { user: true },
  });

  console.log('Customer:', customer.stripeCustomerId);

  // Get payment methods for this customer
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customer.stripeCustomerId,
    type: 'card',
  });

  if (paymentMethods.data.length === 0) {
    console.log('No payment methods found. Creating test payment method...');

    // Create a test payment method
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: 'tok_visa', // Test token
      },
    });

    // Attach to customer
    await stripe.paymentMethods.attach(pm.id, {
      customer: customer.stripeCustomerId,
    });

    // Set as default
    await stripe.customers.update(customer.stripeCustomerId, {
      invoice_settings: { default_payment_method: pm.id },
    });

    console.log('Created and attached payment method:', pm.id);
  } else {
    // Set the first payment method as default
    const pm = paymentMethods.data[0];
    await stripe.customers.update(customer.stripeCustomerId, {
      invoice_settings: { default_payment_method: pm.id },
    });
    console.log('Set default payment method:', pm.id);
  }

  console.log('\nCreating new clean subscription...');
  console.log('  Plan: Starter ($29.99/mo)');

  // Create a new price for Starter
  const price = await stripe.prices.create({
    unit_amount: starter.priceMonthly,
    currency: 'usd',
    recurring: { interval: 'month' },
    product_data: {
      name: 'Starter Plan',
      metadata: { licenseTypeId: starter.id },
    },
  });

  // Create new subscription
  const newSub = await stripe.subscriptions.create({
    customer: customer.stripeCustomerId,
    items: [{ price: price.id }],
    metadata: {
      licenseTypeId: starter.id,
      customerId: customer.id,
    },
  });

  console.log('Created new subscription:', newSub.id);

  // Update database - set all existing as canceled
  await prisma.subscription.updateMany({
    where: { customerId: customer.id },
    data: { status: 'CANCELED' },
  });

  const dbSub = await prisma.subscription.create({
    data: {
      customerId: customer.id,
      licenseTypeId: starter.id,
      stripeSubscriptionId: newSub.id,
      gateway: 'STRIPE',
      status: 'ACTIVE',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(newSub.current_period_start * 1000),
      currentPeriodEnd: new Date(newSub.current_period_end * 1000),
      unitAmount: starter.priceMonthly,
      currency: 'USD',
    },
    include: { licenseType: true },
  });

  console.log('\nDatabase updated:');
  console.log('  Subscription ID:', dbSub.id);
  console.log('  Stripe ID:', dbSub.stripeSubscriptionId);
  console.log('  Plan:', dbSub.licenseType.name);
  console.log('  Period End:', dbSub.currentPeriodEnd);

  // Update user license
  await prisma.userLicense.updateMany({
    where: { userId: customer.userId },
    data: { status: 'CANCELLED' },
  });

  await prisma.userLicense.create({
    data: {
      userId: customer.userId,
      licenseTypeId: starter.id,
      status: 'ACTIVE',
      startDate: new Date(newSub.current_period_start * 1000),
      endDate: new Date(newSub.current_period_end * 1000),
    },
  });

  console.log('\nDone! Fresh Starter subscription created.');
  console.log('You can now test upgrades with clean proration.');

  await prisma.$disconnect();
}

main().catch(console.error);
