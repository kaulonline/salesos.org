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
  const priceId = 'price_1Stk8kFso1qYrSp1asKyT3TM';

  // Get current subscription
  const sub = await stripe.subscriptions.retrieve('sub_1Stk6JFso1qYrSp1L1MxkiQ0');
  const currentItemId = sub.items.data[0].id;
  const currentPeriodEnd = sub.current_period_end;

  console.log('Current period end:', new Date(currentPeriodEnd * 1000).toISOString());

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

  console.log('\n=== All Line Items ===');
  for (const line of preview.lines.data) {
    const periodStart = line.period?.start || 0;
    const isProration = periodStart < currentPeriodEnd;
    console.log(isProration ? '[PRORATION]' : '[NEXT CYCLE]', line.description);
    console.log('  Amount:', line.amount / 100, 'USD');
    console.log('  Period start:', new Date(periodStart * 1000).toISOString().split('T')[0]);
    console.log('');
  }

  // Filter to only proration items
  const prorationLines = preview.lines.data.filter(line => {
    return (line.period?.start || 0) < currentPeriodEnd;
  });

  console.log('=== Proration Items Only (What should be charged now) ===');
  let credit = 0;
  let charge = 0;
  for (const line of prorationLines) {
    console.log(' ', line.description, ':', line.amount / 100, 'USD');
    if (line.amount < 0) {
      credit += Math.abs(line.amount);
    } else {
      charge += line.amount;
    }
  }
  console.log('\nCredit:', credit / 100, 'USD');
  console.log('Charge:', charge / 100, 'USD');
  console.log('Net Amount Due:', Math.max(0, charge - credit) / 100, 'USD');

  await prisma.$disconnect();
}

main().catch(console.error);
