// Simple script to create admin user with raw SQL
// This uses $executeRawUnsafe to avoid connection pool issues

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function createAdminUser() {
  const adminEmail = 'admin@iriseller.com';
  const adminPassword = 'Password123';

  console.log('🔐 Generating password hash...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);
  
  console.log('📝 Creating/updating admin user...');
  
  try {
    // Use raw SQL to minimize connections
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (id, email, "passwordHash", name, role, "createdAt", "updatedAt")
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'ADMIN'::"UserRole",
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET 
        role = 'ADMIN'::"UserRole",
        "passwordHash" = $3,
        "updatedAt" = NOW()
    `, 
      `admin_${Date.now()}`,
      adminEmail,
      passwordHash,
      'System Administrator'
    );
    
    console.log(`✅ Admin user created/updated: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
