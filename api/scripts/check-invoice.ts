const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const stripeService = app.get('StripeService');
  const stripe = await stripeService.getStripe();

  // List recent invoices
  const invoices = await stripe.invoices.list({
    limit: 5,
  });

  console.log('Recent Stripe Invoices:\n');

  for (const inv of invoices.data) {
    console.log('Invoice:', inv.id);
    console.log('  Number:', inv.number);
    console.log('  Status:', inv.status);
    console.log('  Amount Due:', inv.amount_due / 100, inv.currency.toUpperCase());
    console.log('  Amount Paid:', inv.amount_paid / 100, inv.currency.toUpperCase());
    console.log('  Created:', new Date(inv.created * 1000).toISOString());

    console.log('  Line Items:');
    for (const line of inv.lines.data) {
      console.log('    -', line.description || 'No description');
      console.log('      Amount:', line.amount / 100, inv.currency.toUpperCase());
      if (line.proration) {
        console.log('      (PRORATION)');
      }
    }
    console.log('---\n');
  }

  await app.close();
}

main().catch(console.error);
