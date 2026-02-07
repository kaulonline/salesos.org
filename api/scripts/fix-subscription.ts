const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get Starter plan
  const starter = await prisma.licenseType.findFirst({ where: { tier: 'STARTER' } });
  console.log('Starter plan:', starter?.name, 'Price:', starter?.priceMonthly);

  // Update the first subscription to be active and linked to Stripe
  const updated = await prisma.subscription.update({
    where: { id: 'cmkuoew4o0001sss9jhbywtqo' },
    data: {
      stripeSubscriptionId: 'sub_1Sti8bFso1qYrSp1dBvCxpHG',
      status: 'ACTIVE',
      licenseTypeId: starter.id,
      unitAmount: starter.priceMonthly,
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    include: { licenseType: true, customer: true },
  });

  console.log('\nUpdated subscription:');
  console.log('  ID:', updated.id);
  console.log('  Stripe ID:', updated.stripeSubscriptionId);
  console.log('  Plan:', updated.licenseType?.name);
  console.log('  Status:', updated.status);
  console.log('  Period End:', updated.currentPeriodEnd);

  // Update user license
  await prisma.userLicense.updateMany({
    where: { userId: updated.customer.userId },
    data: { status: 'CANCELLED' },
  });

  await prisma.userLicense.upsert({
    where: {
      userId_licenseTypeId: {
        userId: updated.customer.userId,
        licenseTypeId: starter.id,
      },
    },
    create: {
      userId: updated.customer.userId,
      licenseTypeId: starter.id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Updated user license to Starter');
  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
