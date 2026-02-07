#!/usr/bin/env ts-node
// AI Generated Code by Deloitte + Cursor (BEGIN)
/**
 * Master Seed Script - Seeds All Data
 * 
 * This script runs all seed scripts in the correct order to fully populate
 * the database after a fresh migration or data loss.
 * 
 * Run with: cd api && npx ts-node prisma/seed-all.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';

const SEED_SCRIPTS = [
  {
    name: 'Basic Users',
    script: 'seed.ts',
    description: 'Creates admin and manager users',
  },
  {
    name: 'Licensing System',
    script: 'seed-licensing.ts',
    description: 'Creates license types, features, and assigns licenses',
  },
  {
    name: 'Agent Templates',
    script: 'seed-agent-templates.ts',
    description: 'Creates agent templates for dynamic agent builder',
  },
  {
    name: 'Support AI Agents',
    script: 'seed-support-agents.ts',
    description: 'Creates autonomous support agents (ARIA, TechBot, etc.)',
  },
  {
    name: 'App Content',
    script: 'seed-app-content.ts',
    description: 'Creates app content (Terms, Privacy, etc.)',
  },
  {
    name: 'Landing Page Content',
    script: 'seed-content.ts',
    description: 'Creates marketing content for landing pages',
  },
];

async function runAllSeeds() {
  console.log('🌱 IRIS Sales CRM - Master Seed Script');
  console.log('═'.repeat(60));
  console.log('This will populate the database with all required seed data.\n');

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < SEED_SCRIPTS.length; i++) {
    const seed = SEED_SCRIPTS[i];
    const scriptPath = path.join(__dirname, seed.script);
    
    console.log(`\n[${ + 1}/${SEED_SCRIPTS.length}] ${seed.name}`);
    console.log(`Description: ${seed.description}`);
    console.log('─'.repeat(60));

    try {
      execSync(`npx ts-node "${scriptPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to run ${seed.script}`);
      failureCount++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Successful: ${successCount}/${SEED_SCRIPTS.length}`);
  console.log(`❌ Failed: ${failureCount}/${SEED_SCRIPTS.length}`);
  console.log('═'.repeat(60));

  if (failureCount === 0) {
    console.log('\n🎉 All seed scripts completed successfully!');
    console.log('\n📋 Database is now fully populated with:');
    console.log('   • Admin and manager user accounts');
    console.log('   • License types and features (with entitlements synced)');
    console.log('   • Agent templates for dynamic creation');
    console.log('   • 7 Support AI agents (ARIA, TechBot, BillingBot, etc.)');
    console.log('   • Email templates for notifications');
    console.log('   • App content for settings and landing pages');
    console.log('\n✨ Your IRIS Sales CRM is ready to use!');
  } else {
    console.log('\n⚠️  Some seed scripts failed. Please review the errors above.');
    process.exit(1);
  }
}

runAllSeeds()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Master seed script failed:', error);
    process.exit(1);
  });
// AI Generated Code by Deloitte + Cursor (END)

