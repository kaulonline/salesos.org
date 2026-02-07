const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConnection() {
  try {
    const userId = 'cmj1nbf230002vd4mdqsaij4p';
    
    // Check for Salesforce connection
    const sfConnection = await prisma.salesforceConnection.findFirst({
      where: { userId: userId }
    });
    
    console.log('Salesforce Connection:', sfConnection ? 'EXISTS' : 'NOT FOUND');
    if (sfConnection) {
      console.log(JSON.stringify({
        id: sfConnection.id,
        userId: sfConnection.userId,
        instanceUrl: sfConnection.instanceUrl,
        isActive: sfConnection.isActive,
        createdAt: sfConnection.createdAt
      }, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkConnection();
