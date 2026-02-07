const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Same logic as salesforce.service.ts
const key = process.env.CRM_ENCRYPTION_KEY ||
  process.env.SALESFORCE_ENCRYPTION_KEY ||
  crypto.createHash('sha256').update(process.env.JWT_SECRET || 'default-secret').digest('hex').slice(0, 32);

function decrypt(text) {
  const parts = text.split(':');
  if (parts.length !== 2) return text;
  const iv = Buffer.from(parts[0], 'hex');
  const enc = Buffer.from(parts[1], 'hex');
  const d = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  return Buffer.concat([d.update(enc), d.final()]).toString();
}

async function main() {
  const i = await prisma.crmIntegration.findFirst({ where: { provider: 'SALESFORCE' } });
  if (i && i.clientId) {
    const dec = decrypt(i.clientId);
    console.log('Stored decrypts to (first 35):', dec.substring(0, 35));
    console.log('Your Consumer Key starts with:    ', '3MVG9dAEux2v1sLvUN4Bdp1eYOxTrRfNE');
    console.log('');
    console.log('MATCH:', dec.startsWith('3MVG9dAEux2v1sLvUN4Bdp1eYOxTrRfNE'));
  }
  await prisma.$disconnect();
}
main();
