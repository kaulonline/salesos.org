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
  const invoices = await stripe.invoices.list({ limit: 5 });

  console.log('=== Recent Stripe Invoices ===\n');

  for (const inv of invoices.data) {
    console.log('Invoice:', inv.number || inv.id);
    console.log('  Status:', inv.status);
    console.log('  Total:', (inv.amount_due / 100).toFixed(2), 'USD');
    console.log('  Created:', new Date(inv.created * 1000).toISOString());
    console.log('  Line Items:');
    for (const line of inv.lines.data) {
      const desc = line.description || 'No description';
      console.log('    - ' + desc.substring(0, 80));
      console.log('      Amount: $' + (line.amount / 100).toFixed(2) + (line.proration ? ' (PRORATION)' : ''));
    }
    console.log('---\n');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
