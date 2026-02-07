const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLeads() {
  try {
    const email = process.argv[2] || 'jchen@iriseller.com';
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    const leads = await prisma.lead.findMany({
      where: { ownerId: user.id },
      orderBy: { leadScore: 'desc' },
      take: 10
    });
    
    console.log(JSON.stringify({
      userId: user.id,
      userEmail: user.email,
      leadCount: leads.length,
      leads: leads.map(l => ({
        id: l.id,
        name: `${l.firstName || ''} ${l.lastName || ''}`.trim(),
        company: l.company,
        email: l.email,
        title: l.title,
        leadScore: l.leadScore || 0,
        status: l.status
      }))
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeads();
