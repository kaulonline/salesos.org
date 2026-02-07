const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'jchen@iriseller.com' } 
    });
    if (user) {
      console.log(JSON.stringify({ 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      }, null, 2));
    } else {
      console.log('User not found');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
