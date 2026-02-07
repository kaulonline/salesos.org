import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminEmail = 'admin@iriseller.com';
  const adminPassword = 'Password123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    // Update existing user to admin role if not already
    if (existingAdmin.role !== UserRole.ADMIN) {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: UserRole.ADMIN },
      });
      console.log(`✅ Updated existing user ${adminEmail} to ADMIN role`);
    } else {
      console.log(`ℹ️ Admin user ${adminEmail} already exists with ADMIN role`);
    }
  } else {
    // Create new admin user
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'System Administrator',
        role: UserRole.ADMIN,
      },
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
  }

  // Create a default manager user for testing (optional)
  const managerEmail = 'manager@iriseller.com';
  const managerPassword = 'Password123';

  const existingManager = await prisma.user.findUnique({
    where: { email: managerEmail },
  });

  if (!existingManager) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(managerPassword, salt);

    await prisma.user.create({
      data: {
        email: managerEmail,
        passwordHash,
        name: 'Sales Manager',
        role: UserRole.MANAGER,
      },
    });
    console.log(`✅ Created manager user: ${managerEmail}`);
  }

  console.log('🌱 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
