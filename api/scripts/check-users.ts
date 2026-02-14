#!/usr/bin/env ts-node
/**
 * Quick script to check organization users and roles
 * Run: npx ts-node scripts/check-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 SalesOS User & Organization Role Check\n');
  console.log('='.repeat(80));

  // Check specific users
  const targetEmails = [
    'admin@iriseller.com',
    'manager@iriseller.com',
    'jchen@iriseller.com',
  ];

  console.log('\n🔍 Checking specific users...\n');

  for (const email of targetEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizationMemberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: { id: true, name: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ ${email}: User not found`);
      continue;
    }

    console.log(`📧 ${email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   System Role: ${user.role} ${user.role === 'ADMIN' ? '⭐ (Super Admin)' : ''}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);

    if (user.organizationMemberships.length === 0) {
      console.log('   ⚠️  WARNING: No organization memberships!');
    } else {
      console.log(`   Organizations (${user.organizationMemberships.length}):`);
      for (const membership of user.organizationMemberships) {
        const roleEmoji =
          membership.role === 'OWNER'
            ? '👑'
            : membership.role === 'ADMIN'
            ? '🔑'
            : membership.role === 'MANAGER'
            ? '📊'
            : '👤';
        console.log(
          `      ${roleEmoji} ${membership.organization.name} - ${membership.role}`,
        );
        console.log(`         Org ID: ${membership.organizationId}`);
        console.log(`         Joined: ${membership.joinedAt.toISOString().split('T')[0]}`);
        if (membership.department) {
          console.log(`         Department: ${membership.department}`);
        }
      }
    }
    console.log();
  }

  // Find all super admins
  console.log('='.repeat(80));
  console.log('\n⭐ System Super Admins (User.role = ADMIN)\n');

  const superAdmins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    include: {
      organizationMemberships: {
        where: { isActive: true },
        include: {
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (superAdmins.length === 0) {
    console.log('   No super admins found');
  } else {
    for (const admin of superAdmins) {
      console.log(`   📧 ${admin.email}`);
      console.log(`      ID: ${admin.id}`);
      console.log(`      Name: ${admin.name || 'N/A'}`);
      console.log(
        `      Organizations: ${admin.organizationMemberships.map(m => m.organization.name).join(', ') || 'None'}`,
      );
    }
  }

  // Find IriSeller organization
  console.log('\n' + '='.repeat(80));
  console.log('\n🏢 IriSeller Organization Members\n');

  const irisellerOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: 'IriSeller', mode: 'insensitive' } },
        { name: { contains: 'Iris', mode: 'insensitive' } },
      ],
    },
    include: {
      members: {
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true, status: true },
          },
        },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      },
    },
  });

  if (!irisellerOrg) {
    console.log('   ⚠️  IriSeller organization not found');
    console.log('   Searching for all organizations...\n');

    const allOrgs = await prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (allOrgs.length === 0) {
      console.log('   No organizations found in database');
    } else {
      console.log('   Available organizations:');
      for (const org of allOrgs) {
        console.log(`      • ${org.name} (ID: ${org.id})`);
      }
    }
  } else {
    console.log(`   Organization: ${irisellerOrg.name}`);
    console.log(`   ID: ${irisellerOrg.id}`);
    console.log(`   Status: ${irisellerOrg.status}`);
    console.log(`   Total Members: ${irisellerOrg.members.length}\n`);

    // Count by role
    const roleCounts = {
      OWNER: 0,
      ADMIN: 0,
      MANAGER: 0,
      MEMBER: 0,
    };

    for (const member of irisellerOrg.members) {
      roleCounts[member.role]++;
    }

    console.log('   Role Distribution:');
    console.log(`      👑 Owners: ${roleCounts.OWNER}`);
    console.log(`      🔑 Admins: ${roleCounts.ADMIN}`);
    console.log(`      📊 Managers: ${roleCounts.MANAGER}`);
    console.log(`      👤 Members: ${roleCounts.MEMBER}\n`);

    console.log('   Member List:');
    for (const member of irisellerOrg.members) {
      const roleEmoji =
        member.role === 'OWNER'
          ? '👑'
          : member.role === 'ADMIN'
          ? '🔑'
          : member.role === 'MANAGER'
          ? '📊'
          : '👤';
      const systemRoleBadge = member.user.role === 'ADMIN' ? ' ⭐' : '';
      console.log(
        `      ${roleEmoji} ${member.user.email} - ${member.role}${systemRoleBadge}`,
      );
      console.log(`         Name: ${member.user.name || 'N/A'}`);
      console.log(`         System Role: ${member.user.role}`);
      console.log(`         Joined: ${member.joinedAt.toISOString().split('T')[0]}`);
      if (member.department) {
        console.log(`         Department: ${member.department}`);
      }
      if (member.title) {
        console.log(`         Title: ${member.title}`);
      }
      console.log();
    }
  }

  // Summary statistics
  console.log('='.repeat(80));
  console.log('\n📊 System Summary\n');

  const [totalUsers, activeUsers, totalOrgs, totalMembers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count({ where: { status: 'ACTIVE' } }),
    prisma.organizationMember.count({ where: { isActive: true } }),
  ]);

  console.log(`   Total Users: ${totalUsers}`);
  console.log(`   Active Users: ${activeUsers}`);
  console.log(`   Active Organizations: ${totalOrgs}`);
  console.log(`   Total Organization Memberships: ${totalMembers}`);
  console.log();

  console.log('='.repeat(80));
  console.log('\n✅ Check complete!\n');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
