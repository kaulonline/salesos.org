#!/usr/bin/env ts-node
// AI Generated Code by Deloitte + Cursor (BEGIN)
/**
 * Sync Entitlements Migration Script
 * 
 * This script ensures all user licenses have entitlements for all features
 * in their license type. Run this after:
 * - Adding new features to existing license types
 * - Database restoration
 * - Fixing entitlement sync issues
 * 
 * Usage: npx ts-node prisma/sync-entitlements.ts
 */

import { PrismaClient, LicenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface SyncResult {
  licenseId: string;
  userEmail: string;
  licenseType: string;
  created: number;
  existing: number;
}

async function syncAllEntitlements() {
  console.log('🔄 Starting entitlement sync for all active licenses...\n');

  try {
    // Get all active and trial licenses
    const licenses = await prisma.userLicense.findMany({
      where: {
        status: { in: [LicenseStatus.ACTIVE, LicenseStatus.TRIAL] },
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
        licenseType: {
          include: { features: true },
        },
        entitlements: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${licenses.length} active/trial licenses\n`);

    const results: SyncResult[] = [];
    let totalCreated = 0;
    let totalExisting = 0;
    let licensesWithIssues = 0;

    for (const license of licenses) {
      // Get existing entitlement feature IDs
      const existingFeatureIds = new Set(
        license.entitlements.map(e => e.featureId),
      );

      // Find missing features
      const missingFeatures = license.licenseType.features.filter(
        feature => !existingFeatureIds.has(feature.id),
      );

      const result: SyncResult = {
        licenseId: license.id,
        userEmail: license.user.email,
        licenseType: license.licenseType.name,
        created: 0,
        existing: existingFeatureIds.size,
      };

      if (missingFeatures.length > 0) {
        licensesWithIssues++;
        
        console.log(`📝 ${license.user.email} (${license.licenseType.name})`);
        console.log(`   Missing ${missingFeatures.length} entitlements:`);
        
        // Create missing entitlements
        const getNextMonthlyReset = () => {
          const now = new Date();
          return new Date(now.getFullYear(), now.getMonth() + 1, 1);
        };

        await prisma.licenseEntitlement.createMany({
          data: missingFeatures.map(feature => ({
            userLicenseId: license.id,
            featureId: feature.id,
            isEnabled: true,
            usageLimit: feature.defaultLimit,
            currentUsage: 0,
            usagePeriod: 'monthly',
            periodResetAt: getNextMonthlyReset(),
          })),
        });

        result.created = missingFeatures.length;
        totalCreated += missingFeatures.length;

        missingFeatures.forEach(f => {
          console.log(`   ✅ ${f.featureKey} (${f.name})`);
        });
        console.log('');
      }

      totalExisting += result.existing;
      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Licenses:        ${licenses.length}`);
    console.log(`Licenses with Issues:  ${licensesWithIssues}`);
    console.log(`Entitlements Created:  ${totalCreated}`);
    console.log(`Existing Entitlements: ${totalExisting}`);
    console.log('='.repeat(60));

    if (licensesWithIssues === 0) {
      console.log('\n✅ All licenses are properly synced!');
    } else {
      console.log(`\n✅ Fixed ${licensesWithIssues} licenses with missing entitlements!`);
    }

    return {
      success: true,
      totalLicenses: licenses.length,
      licensesFixed: licensesWithIssues,
      entitlementsCreated: totalCreated,
      results,
    };
  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncAllEntitlements()
  .then(() => {
    console.log('\n🎉 Sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });
// AI Generated Code by Deloitte + Cursor (END)

