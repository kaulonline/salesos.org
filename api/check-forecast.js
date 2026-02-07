const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getForecast() {
  // Replicate the backend logic
  const opportunities = await prisma.opportunity.findMany({
    where: {
      isClosed: false,
      closeDate: { not: null },
    },
    select: {
      name: true,
      closeDate: true,
      amount: true,
      expectedRevenue: true,
      probability: true,
      stage: true,
    },
  });

  console.log('Open opportunities with close dates:', opportunities.length);
  opportunities.forEach(o => {
    console.log('  -', o.name, '| Amount:', o.amount, '| CloseDate:', o.closeDate, '| Prob:', o.probability);
  });

  // Group by month
  const forecast = {};
  opportunities.forEach((opp) => {
    if (!opp.closeDate) return;
    const month = opp.closeDate.toISOString().slice(0, 7);
    if (!forecast[month]) {
      forecast[month] = { month, bestCase: 0, mostLikely: 0, commit: 0, closed: 0 };
    }
    const amount = opp.amount || 0;
    const expectedRev = opp.expectedRevenue || (amount * (opp.probability || 0) / 100);
    forecast[month].bestCase += amount;
    forecast[month].mostLikely += expectedRev;
    if (opp.probability && opp.probability >= 75) {
      forecast[month].commit += expectedRev;
    }
  });

  const monthly = Object.values(forecast).sort((a, b) => a.month.localeCompare(b.month));
  console.log('\nMonthly forecast data:');
  console.log(JSON.stringify(monthly, null, 2));

  if (monthly.length === 0) {
    console.log('\nNo monthly data - the graph will be empty!');
  }
}

getForecast()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
