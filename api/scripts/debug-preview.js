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
  const stripe = new Stripe(key);

  // Get Professional plan price
  const professional = await prisma.licenseType.findFirst({ where: { tier: 'PROFESSIONAL' } });

  // Create or get price
  const prices = await stripe.prices.list({
    lookup_keys: [`professional_monthly_${professional.id}`],
    limit: 1,
  });

  let priceId;
  if (prices.data.length > 0) {
    priceId = prices.data[0].id;
  } else {
    const price = await stripe.prices.create({
      unit_amount: professional.priceMonthly,
      currency: 'usd',
      recurring: { interval: 'month' },
      lookup_key: `professional_monthly_${professional.id}`,
      product_data: {
        name: 'Professional Plan',
        metadata: { licenseTypeId: professional.id },
      },
    });
    priceId = price.id;
  }

  console.log('Price ID:', priceId);

  // Get current subscription
  const sub = await stripe.subscriptions.retrieve('sub_1Stk6JFso1qYrSp1L1MxkiQ0');
  const currentItemId = sub.items.data[0].id;

  console.log('\nCurrent subscription item:', currentItemId);
  console.log('Current price:', sub.items.data[0].price.unit_amount / 100, 'USD');

  // Preview the change
  const preview = await stripe.invoices.createPreview({
    subscription: 'sub_1Stk6JFso1qYrSp1L1MxkiQ0',
    subscription_details: {
      items: [{
        id: currentItemId,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    },
  });

  console.log('\n=== Invoice Preview ===');
  console.log('Amount Due:', preview.amount_due / 100, 'USD');
  console.log('Subtotal:', preview.subtotal / 100, 'USD');
  console.log('Total:', preview.total / 100, 'USD');

  console.log('\nLine Items:');
  for (const line of preview.lines.data) {
    console.log('  -', line.description || 'No description');
    console.log('    Amount:', line.amount / 100, 'USD');
    console.log('    Proration:', line.proration ? 'YES' : 'NO');
    console.log('    Type:', line.type);
    console.log('    Period:', new Date(line.period.start * 1000).toISOString().split('T')[0],
                'to', new Date(line.period.end * 1000).toISOString().split('T')[0]);
    console.log('');
  }

  // Filter to only proration items
  const prorationItems = preview.lines.data.filter(line => line.proration);
  console.log('\n=== Proration Items Only ===');
  let prorationTotal = 0;
  for (const line of prorationItems) {
    console.log('  -', line.description, ':', line.amount / 100, 'USD');
    prorationTotal += line.amount;
  }
  console.log('\nProration Total:', prorationTotal / 100, 'USD');

  await prisma.$disconnect();
}

main().catch(console.error);
