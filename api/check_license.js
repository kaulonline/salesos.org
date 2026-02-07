const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLicense() {
  try {
    const userId = 'cmj1nbf230002vd4mdqsaij4p';
    const license = await prisma.userLicense.findFirst({
      where: { 
        userId: userId,
        status: 'ACTIVE'
      },
      include: {
        licenseType: {
          include: {
            features: true
          }
        }
      }
    });
    if (license) {
      console.log('License found:');
      console.log(JSON.stringify(license, null, 2));
    } else {
      console.log('No active license found for user');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkLicense();
