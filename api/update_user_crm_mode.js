const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCrmMode() {
  try {
    const email = process.argv[2] || 'jchen@iriseller.com';
    const newMode = process.argv[3] || 'iris';
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log(`Current settings for ${email}:`, JSON.stringify(user.settings, null, 2));
    const currentCrmMode = user.settings?.crmDataSource || 'not set';
    console.log(`Current CRM Data Source: ${currentCrmMode}`);
    
    const currentSettings = typeof user.settings === 'object' && user.settings !== null ? user.settings : {};
    const updatedSettings = {
      ...currentSettings,
      crmDataSource: newMode
    };
    
    const updated = await prisma.user.update({
      where: { email },
      data: { settings: updatedSettings }
    });
    
    console.log(`✅ Updated CRM Data Source to: ${updated.settings?.crmDataSource}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateCrmMode();
