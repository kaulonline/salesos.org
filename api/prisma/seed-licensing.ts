import { PrismaClient, LicenseTier, LicenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Feature keys that match the system's capabilities
const FEATURE_KEYS = {
  AI_CHAT: 'ai_chat',
  CRM_SALESFORCE: 'crm_salesforce',
  CRM_HUBSPOT: 'crm_hubspot',
  TRANSACTIONAL_DATA: 'transactional_data',
  METADATA_MANAGEMENT: 'metadata_management',
  MEETINGS_INTELLIGENCE: 'meetings_intelligence',
  MEETINGS_RECORD: 'meetings_record',
  MEETINGS_TRANSCRIBE: 'meetings_transcribe',
  LEADS_MANAGEMENT: 'leads_management',
  CONTACTS_MANAGEMENT: 'contacts_management',
  ACCOUNTS_MANAGEMENT: 'accounts_management',
  OPPORTUNITIES_MANAGEMENT: 'opportunities_management',
  DOCUMENTS_MANAGEMENT: 'documents_management',
  CUSTOM_AGENTS: 'custom_agents',
  BASIC_ANALYTICS: 'basic_analytics',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
};

async function seedLicensingData() {
  console.log('🌱 Seeding licensing data...');

  // Create all available features
  console.log('Creating license features...');
  
  const featureDefinitions = [
    { key: FEATURE_KEYS.AI_CHAT, name: 'AI Chat', category: 'ai', description: 'Access to AI-powered chat assistant', icon: 'MessageSquare' },
    { key: FEATURE_KEYS.CRM_SALESFORCE, name: 'Salesforce CRM', category: 'crm', description: 'Connect and sync with Salesforce CRM', icon: 'Cloud' },
    { key: FEATURE_KEYS.CRM_HUBSPOT, name: 'HubSpot CRM', category: 'crm', description: 'Connect and sync with HubSpot CRM', icon: 'Cloud' },
    { key: FEATURE_KEYS.TRANSACTIONAL_DATA, name: 'Transactional Data', category: 'data', description: 'Ability to update transactional data', icon: 'Database' },
    { key: FEATURE_KEYS.METADATA_MANAGEMENT, name: 'Metadata Management', category: 'data', description: 'Manage metadata and configurations', icon: 'Settings' },
    { key: FEATURE_KEYS.MEETINGS_INTELLIGENCE, name: 'Meetings Intelligence', category: 'meetings', description: 'AI-powered meeting insights and analysis', icon: 'Brain' },
    { key: FEATURE_KEYS.MEETINGS_RECORD, name: 'Meeting Recording', category: 'meetings', description: 'Record meetings for later review', icon: 'Video' },
    { key: FEATURE_KEYS.MEETINGS_TRANSCRIBE, name: 'Meeting Transcription', category: 'meetings', description: 'Automatic meeting transcription', icon: 'FileText' },
    { key: FEATURE_KEYS.LEADS_MANAGEMENT, name: 'Leads Management', category: 'data', description: 'Create and manage sales leads', icon: 'Users' },
    { key: FEATURE_KEYS.CONTACTS_MANAGEMENT, name: 'Contacts Management', category: 'data', description: 'Manage contacts and relationships', icon: 'Contact' },
    { key: FEATURE_KEYS.ACCOUNTS_MANAGEMENT, name: 'Accounts Management', category: 'data', description: 'Manage company accounts', icon: 'Building' },
    { key: FEATURE_KEYS.OPPORTUNITIES_MANAGEMENT, name: 'Opportunities Management', category: 'data', description: 'Track and manage sales opportunities', icon: 'Target' },
    { key: FEATURE_KEYS.DOCUMENTS_MANAGEMENT, name: 'Documents Management', category: 'data', description: 'Upload and manage documents', icon: 'FolderOpen' },
    { key: FEATURE_KEYS.CUSTOM_AGENTS, name: 'Custom AI Agents', category: 'ai', description: 'Create and customize AI agents', icon: 'Bot' },
    { key: FEATURE_KEYS.BASIC_ANALYTICS, name: 'Basic Analytics', category: 'advanced', description: 'Access to basic analytics and reports', icon: 'BarChart' },
    { key: FEATURE_KEYS.ADVANCED_ANALYTICS, name: 'Advanced Analytics', category: 'advanced', description: 'Advanced analytics with custom dashboards', icon: 'LineChart' },
    { key: FEATURE_KEYS.API_ACCESS, name: 'API Access', category: 'integrations', description: 'Programmatic API access', icon: 'Code' },
    { key: FEATURE_KEYS.WEBHOOKS, name: 'Webhooks', category: 'integrations', description: 'Outbound webhook integrations', icon: 'Webhook' },
  ];

  const createdFeatures: Record<string, string> = {};

  for (const def of featureDefinitions) {
    const feature = await prisma.licenseFeature.upsert({
      where: { featureKey: def.key },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
      },
      create: {
        featureKey: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        isEnabled: true,
        requiresLicense: true,
        sortOrder: featureDefinitions.indexOf(def),
      },
    });
    createdFeatures[def.key] = feature.id;
    console.log(`  ✅ ${def.name}`);
  }
  console.log('✅ License features created');

  // Create license types (tiers)
  console.log('\nCreating license types...');

  // Calculate dates
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // Free Tier
  const freeTier = await prisma.licenseType.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Free Plan',
      slug: 'free',
      description: 'Free tier with basic features for individuals',
      tier: LicenseTier.FREE,
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'USD',
      defaultDurationDays: 365,
      trialDurationDays: 0,
      maxUsers: 1,
      maxConversations: 50,
      maxMeetings: 2,
      maxDocuments: 10,
      maxApiCalls: 100,
      isActive: true,
      isPublic: true,
      sortOrder: 0,
      features: {
        connect: [
          { id: createdFeatures[FEATURE_KEYS.AI_CHAT] },
        ],
      },
    },
  });
  console.log(`  ✅ ${freeTier.name}`);

  // Starter Tier
  const starterTier = await prisma.licenseType.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter Plan',
      slug: 'starter',
      description: 'Perfect for small teams getting started',
      tier: LicenseTier.STARTER,
      priceMonthly: 2999, // $29.99
      priceYearly: 29988, // $299.88 ($24.99/mo)
      currency: 'USD',
      defaultDurationDays: 365,
      trialDurationDays: 14,
      maxUsers: 5,
      maxConversations: 500,
      maxMeetings: 20,
      maxDocuments: 100,
      maxApiCalls: 1000,
      isActive: true,
      isPublic: true,
      sortOrder: 1,
      features: {
        connect: [
          { id: createdFeatures[FEATURE_KEYS.AI_CHAT] },
          { id: createdFeatures[FEATURE_KEYS.BASIC_ANALYTICS] },
          { id: createdFeatures[FEATURE_KEYS.LEADS_MANAGEMENT] },
          { id: createdFeatures[FEATURE_KEYS.CONTACTS_MANAGEMENT] },
        ],
      },
    },
  });
  console.log(`  ✅ ${starterTier.name}`);

  // Professional Tier
  const professionalTier = await prisma.licenseType.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      name: 'Professional Plan',
      slug: 'professional',
      description: 'For growing businesses with advanced needs',
      tier: LicenseTier.PROFESSIONAL,
      priceMonthly: 9999, // $99.99
      priceYearly: 95988, // $959.88 ($79.99/mo)
      currency: 'USD',
      defaultDurationDays: 365,
      trialDurationDays: 14,
      maxUsers: 25,
      maxConversations: 5000,
      maxMeetings: 100,
      maxDocuments: 1000,
      maxApiCalls: 10000,
      isActive: true,
      isPublic: true,
      sortOrder: 2,
      features: {
        connect: [
          { id: createdFeatures[FEATURE_KEYS.AI_CHAT] },
          { id: createdFeatures[FEATURE_KEYS.BASIC_ANALYTICS] },
          { id: createdFeatures[FEATURE_KEYS.ADVANCED_ANALYTICS] },
          { id: createdFeatures[FEATURE_KEYS.LEADS_MANAGEMENT] },
          { id: createdFeatures[FEATURE_KEYS.CONTACTS_MANAGEMENT] },
          { id: createdFeatures[FEATURE_KEYS.ACCOUNTS_MANAGEMENT] },
          { id: createdFeatures[FEATURE_KEYS.OPPORTUNITIES_MANAGEMENT] },
          { id: createdFeatures[FEATURE_KEYS.CRM_SALESFORCE] },
          { id: createdFeatures[FEATURE_KEYS.MEETINGS_INTELLIGENCE] },
          { id: createdFeatures[FEATURE_KEYS.MEETINGS_RECORD] },
          { id: createdFeatures[FEATURE_KEYS.MEETINGS_TRANSCRIBE] },
          { id: createdFeatures[FEATURE_KEYS.API_ACCESS] },
        ],
      },
    },
  });
  console.log(`  ✅ ${professionalTier.name}`);

  // Enterprise Tier
  const enterpriseTier = await prisma.licenseType.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise Plan',
      slug: 'enterprise',
      description: 'Full-featured plan with unlimited access for large organizations',
      tier: LicenseTier.ENTERPRISE,
      priceMonthly: 29999, // $299.99
      priceYearly: 299988, // $2,999.88 ($249.99/mo)
      currency: 'USD',
      defaultDurationDays: 365,
      trialDurationDays: 30,
      maxUsers: null, // Unlimited
      maxConversations: null, // Unlimited
      maxMeetings: null, // Unlimited
      maxDocuments: null, // Unlimited
      maxApiCalls: null, // Unlimited
      isActive: true,
      isPublic: true,
      sortOrder: 3,
      features: {
        connect: Object.values(createdFeatures).map(id => ({ id })),
      },
    },
  });
  console.log(`  ✅ ${enterpriseTier.name}`);

  console.log('✅ License types created');

  // Get admin user to assign enterprise license
  const adminUser = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (adminUser) {
    console.log(`\nAssigning Enterprise license to admin user: ${adminUser.email}`);
    
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now

    await prisma.userLicense.upsert({
      where: {
        userId_licenseTypeId: {
          userId: adminUser.id,
          licenseTypeId: enterpriseTier.id,
        },
      },
      update: {
        endDate,
        status: LicenseStatus.ACTIVE,
      },
      create: {
        userId: adminUser.id,
        licenseTypeId: enterpriseTier.id,
        startDate: new Date(),
        endDate,
        status: LicenseStatus.ACTIVE,
        isTrial: false,
        autoRenew: true,
        notes: 'Admin user - Enterprise license',
      },
    });
    console.log('✅ Admin user assigned Enterprise license');
  } else {
    console.log('\n⚠️ No admin user found to assign license');
  }

  console.log('\n🎉 Licensing seed completed successfully!');
  
  // AI Generated Code by Deloitte + Cursor (BEGIN)
  // Sync entitlements for all existing licenses to ensure they have all features
  console.log('\n🔄 Syncing entitlements for existing licenses...');
  await syncEntitlements();
  // AI Generated Code by Deloitte + Cursor (END)
}

// AI Generated Code by Deloitte + Cursor (BEGIN)
/**
 * Sync entitlements for all active licenses
 * This ensures existing licenses get newly added features
 */
async function syncEntitlements() {
  const licenses = await prisma.userLicense.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
    },
    include: {
      licenseType: {
        include: { features: true },
      },
      entitlements: true,
      user: {
        select: { email: true },
      },
    },
  });

  let totalSynced = 0;

  for (const license of licenses) {
    const existingFeatureIds = new Set(license.entitlements.map(e => e.featureId));
    const missingFeatures = license.licenseType.features.filter(
      f => !existingFeatureIds.has(f.id),
    );

    if (missingFeatures.length > 0) {
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

      totalSynced += missingFeatures.length;
      console.log(`  ✅ Synced ${license.user.email}: added ${missingFeatures.length} entitlements`);
    }
  }

  if (totalSynced > 0) {
    console.log(`✅ Created ${totalSynced} missing entitlements across ${licenses.length} licenses`);
  } else {
    console.log('✅ All licenses already have correct entitlements');
  }
}
// AI Generated Code by Deloitte + Cursor (END)

seedLicensingData()
  .catch((e) => {
    console.error('❌ Error seeding licensing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
