#!/usr/bin/env ts-node
/**
 * CRM Seed Data Script
 *
 * Creates realistic CRM data (Accounts, Contacts, Leads, Opportunities, Quotes, Contracts)
 * for the user jchen@iriseller.com
 *
 * Run with: cd api && npx ts-node prisma/seed-crm-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CRM data seed for jchen@iriseller.com...');

  // Find jchen user
  const user = await prisma.user.findUnique({
    where: { email: 'jchen@iriseller.com' },
  });

  if (!user) {
    console.error('❌ User jchen@iriseller.com not found. Please create the user first.');
    process.exit(1);
  }

  const ownerId = user.id;
  console.log(`✅ Found user: ${user.name || user.email} (${ownerId})`);

  // ==================== CLEANUP EXISTING DATA ====================
  console.log('\n🧹 Cleaning up existing CRM data...');

  // Delete in order of dependencies (quotes/contracts depend on opportunities/accounts)
  await prisma.quoteLineItem.deleteMany({
    where: { quote: { ownerId } },
  });
  await prisma.quote.deleteMany({ where: { ownerId } });
  await prisma.contract.deleteMany({ where: { ownerId } });
  await prisma.opportunity.deleteMany({ where: { ownerId } });
  console.log('✅ Cleaned up quotes, contracts, and opportunities');

  // ==================== ACCOUNTS ====================
  console.log('\n📁 Creating Accounts...');

  const accounts = await Promise.all([
    prisma.account.upsert({
      where: { domain: 'acmecorp.com' },
      update: {},
      create: {
        ownerId,
        name: 'Acme Corporation',
        website: 'https://acmecorp.com',
        domain: 'acmecorp.com',
        phone: '+1 (555) 123-4567',
        industry: 'Manufacturing',
        type: 'CUSTOMER',
        numberOfEmployees: 5000,
        annualRevenue: 850000000,
        description: 'Leading manufacturer of industrial equipment and solutions. Long-term strategic partner.',
        billingStreet: '100 Innovation Drive',
        billingCity: 'Chicago',
        billingState: 'IL',
        billingPostalCode: '60601',
        billingCountry: 'USA',
        accountStatus: 'ACTIVE',
        rating: 'HOT',
        healthScore: 85,
        lifetimeValue: 2500000,
        churnRisk: 'LOW',
        techStack: ['Salesforce', 'SAP', 'Oracle ERP'],
        lastActivityDate: new Date('2025-01-08'),
      },
    }),
    prisma.account.upsert({
      where: { domain: 'techfusion.io' },
      update: {},
      create: {
        ownerId,
        name: 'TechFusion Inc',
        website: 'https://techfusion.io',
        domain: 'techfusion.io',
        phone: '+1 (555) 234-5678',
        industry: 'Technology',
        type: 'PROSPECT',
        numberOfEmployees: 250,
        annualRevenue: 45000000,
        description: 'Fast-growing SaaS company specializing in AI-powered analytics platforms.',
        billingStreet: '500 Tech Park Blvd',
        billingCity: 'San Francisco',
        billingState: 'CA',
        billingPostalCode: '94105',
        billingCountry: 'USA',
        accountStatus: 'ACTIVE',
        rating: 'HOT',
        healthScore: 78,
        churnRisk: 'LOW',
        techStack: ['AWS', 'Snowflake', 'Tableau'],
        lastActivityDate: new Date('2025-01-09'),
      },
    }),
    prisma.account.upsert({
      where: { domain: 'globalretail.com' },
      update: {},
      create: {
        ownerId,
        name: 'Global Retail Group',
        website: 'https://globalretail.com',
        domain: 'globalretail.com',
        phone: '+1 (555) 345-6789',
        industry: 'Retail',
        type: 'CUSTOMER',
        numberOfEmployees: 15000,
        annualRevenue: 3200000000,
        description: 'Multi-national retail chain with stores across North America and Europe.',
        billingStreet: '1 Commerce Plaza',
        billingCity: 'New York',
        billingState: 'NY',
        billingPostalCode: '10001',
        billingCountry: 'USA',
        accountStatus: 'ACTIVE',
        rating: 'WARM',
        healthScore: 72,
        lifetimeValue: 1800000,
        churnRisk: 'MEDIUM',
        techStack: ['Microsoft Dynamics', 'Azure', 'Power BI'],
        lastActivityDate: new Date('2025-01-05'),
      },
    }),
    prisma.account.upsert({
      where: { domain: 'medisolutions.health' },
      update: {},
      create: {
        ownerId,
        name: 'MediSolutions Healthcare',
        website: 'https://medisolutions.health',
        domain: 'medisolutions.health',
        phone: '+1 (555) 456-7890',
        industry: 'Healthcare',
        type: 'PROSPECT',
        numberOfEmployees: 800,
        annualRevenue: 120000000,
        description: 'Healthcare technology company providing EMR and patient management systems.',
        billingStreet: '200 Medical Center Dr',
        billingCity: 'Boston',
        billingState: 'MA',
        billingPostalCode: '02115',
        billingCountry: 'USA',
        accountStatus: 'ACTIVE',
        rating: 'WARM',
        healthScore: 65,
        churnRisk: 'MEDIUM',
        techStack: ['Epic', 'AWS', 'MongoDB'],
        lastActivityDate: new Date('2025-01-07'),
      },
    }),
    prisma.account.upsert({
      where: { domain: 'greenergy.eco' },
      update: {},
      create: {
        ownerId,
        name: 'GreenErgy Solutions',
        website: 'https://greenergy.eco',
        domain: 'greenergy.eco',
        phone: '+1 (555) 567-8901',
        industry: 'Energy',
        type: 'PROSPECT',
        numberOfEmployees: 400,
        annualRevenue: 75000000,
        description: 'Renewable energy company focused on solar and wind power solutions for enterprises.',
        billingStreet: '50 Sustainable Way',
        billingCity: 'Austin',
        billingState: 'TX',
        billingPostalCode: '78701',
        billingCountry: 'USA',
        accountStatus: 'ACTIVE',
        rating: 'WARM',
        healthScore: 70,
        churnRisk: 'LOW',
        techStack: ['GCP', 'IoT sensors', 'Python'],
        lastActivityDate: new Date('2025-01-06'),
      },
    }),
  ]);

  console.log(`✅ Created ${accounts.length} accounts`);

  // ==================== CONTACTS ====================
  console.log('\n👤 Creating Contacts...');

  const contacts = await Promise.all([
    // Acme Corporation contacts
    prisma.contact.upsert({
      where: { email: 'john.smith@acmecorp.com' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[0].id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@acmecorp.com',
        phone: '+1 (555) 123-4501',
        title: 'Chief Technology Officer',
        department: 'Technology',
        role: 'DECISION_MAKER',
        seniorityLevel: 'C_LEVEL',
        buyingPower: 'BUDGET_HOLDER',
        linkedinUrl: 'https://linkedin.com/in/johnsmith',
        engagementScore: 92,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-08'),
      },
    }),
    prisma.contact.upsert({
      where: { email: 'sarah.johnson@acmecorp.com' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[0].id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@acmecorp.com',
        phone: '+1 (555) 123-4502',
        title: 'VP of Operations',
        department: 'Operations',
        role: 'CHAMPION',
        seniorityLevel: 'VP',
        buyingPower: 'RECOMMENDER',
        linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
        engagementScore: 88,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-07'),
      },
    }),
    // TechFusion contacts
    prisma.contact.upsert({
      where: { email: 'mike.chen@techfusion.io' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[1].id,
        firstName: 'Mike',
        lastName: 'Chen',
        email: 'mike.chen@techfusion.io',
        phone: '+1 (555) 234-5601',
        title: 'CEO & Founder',
        department: 'Executive',
        role: 'ECONOMIC_BUYER',
        seniorityLevel: 'C_LEVEL',
        buyingPower: 'BUDGET_HOLDER',
        linkedinUrl: 'https://linkedin.com/in/mikechen',
        engagementScore: 85,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-09'),
      },
    }),
    prisma.contact.upsert({
      where: { email: 'lisa.wong@techfusion.io' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[1].id,
        firstName: 'Lisa',
        lastName: 'Wong',
        email: 'lisa.wong@techfusion.io',
        phone: '+1 (555) 234-5602',
        title: 'Director of Engineering',
        department: 'Engineering',
        role: 'TECHNICAL_BUYER',
        seniorityLevel: 'DIRECTOR',
        buyingPower: 'RECOMMENDER',
        linkedinUrl: 'https://linkedin.com/in/lisawong',
        engagementScore: 78,
        influenceLevel: 'MEDIUM',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-08'),
      },
    }),
    // Global Retail contacts
    prisma.contact.upsert({
      where: { email: 'david.brown@globalretail.com' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[2].id,
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@globalretail.com',
        phone: '+1 (555) 345-6701',
        title: 'Chief Information Officer',
        department: 'IT',
        role: 'DECISION_MAKER',
        seniorityLevel: 'C_LEVEL',
        buyingPower: 'BUDGET_HOLDER',
        linkedinUrl: 'https://linkedin.com/in/davidbrown',
        engagementScore: 70,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-05'),
      },
    }),
    // MediSolutions contacts
    prisma.contact.upsert({
      where: { email: 'emily.davis@medisolutions.health' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[3].id,
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@medisolutions.health',
        phone: '+1 (555) 456-7801',
        title: 'VP of Product',
        department: 'Product',
        role: 'CHAMPION',
        seniorityLevel: 'VP',
        buyingPower: 'RECOMMENDER',
        linkedinUrl: 'https://linkedin.com/in/emilydavis',
        engagementScore: 82,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-07'),
      },
    }),
    // GreenErgy contacts
    prisma.contact.upsert({
      where: { email: 'alex.green@greenergy.eco' },
      update: {},
      create: {
        ownerId,
        accountId: accounts[4].id,
        firstName: 'Alex',
        lastName: 'Green',
        email: 'alex.green@greenergy.eco',
        phone: '+1 (555) 567-8901',
        title: 'COO',
        department: 'Operations',
        role: 'ECONOMIC_BUYER',
        seniorityLevel: 'C_LEVEL',
        buyingPower: 'BUDGET_HOLDER',
        linkedinUrl: 'https://linkedin.com/in/alexgreen',
        engagementScore: 75,
        influenceLevel: 'HIGH',
        contactStatus: 'ACTIVE',
        lastContactedAt: new Date('2025-01-06'),
      },
    }),
  ]);

  console.log(`✅ Created ${contacts.length} contacts`);

  // ==================== LEADS ====================
  console.log('\n🎯 Creating Leads...');

  const leads = await Promise.all([
    prisma.lead.upsert({
      where: { email: 'robert.miller@startup.io' },
      update: {},
      create: {
        ownerId,
        firstName: 'Robert',
        lastName: 'Miller',
        company: 'NextGen Startup',
        title: 'Founder & CEO',
        email: 'robert.miller@startup.io',
        phone: '+1 (555) 678-9012',
        website: 'https://nextgenstartup.io',
        leadSource: 'WEB_FORM',
        status: 'NEW',
        rating: 'HOT',
        industry: 'Technology',
        numberOfEmployees: 25,
        annualRevenue: 2000000,
        city: 'San Jose',
        state: 'CA',
        country: 'USA',
        leadScore: 85,
        buyingIntent: 'HIGH',
        painPoints: ['Manual data entry', 'Lack of CRM visibility', 'Poor sales forecasting'],
        budget: 50000,
        timeline: 'Q1 2025',
        lastContactedAt: new Date('2025-01-09'),
      },
    }),
    prisma.lead.upsert({
      where: { email: 'jennifer.wilson@enterprise.co' },
      update: {},
      create: {
        ownerId,
        firstName: 'Jennifer',
        lastName: 'Wilson',
        company: 'Enterprise Solutions Co',
        title: 'VP of Sales',
        email: 'jennifer.wilson@enterprise.co',
        phone: '+1 (555) 789-0123',
        website: 'https://enterprise.co',
        leadSource: 'TRADE_SHOW',
        status: 'CONTACTED',
        rating: 'WARM',
        industry: 'Professional Services',
        numberOfEmployees: 500,
        annualRevenue: 80000000,
        city: 'Denver',
        state: 'CO',
        country: 'USA',
        leadScore: 72,
        buyingIntent: 'MEDIUM',
        painPoints: ['Disconnected sales tools', 'Long sales cycles'],
        budget: 100000,
        timeline: 'Q2 2025',
        lastContactedAt: new Date('2025-01-08'),
      },
    }),
    prisma.lead.upsert({
      where: { email: 'thomas.anderson@matrix.tech' },
      update: {},
      create: {
        ownerId,
        firstName: 'Thomas',
        lastName: 'Anderson',
        company: 'Matrix Technologies',
        title: 'Director of IT',
        email: 'thomas.anderson@matrix.tech',
        phone: '+1 (555) 890-1234',
        website: 'https://matrix.tech',
        leadSource: 'WEBINAR',
        status: 'QUALIFIED',
        rating: 'HOT',
        industry: 'Technology',
        numberOfEmployees: 150,
        annualRevenue: 25000000,
        city: 'Seattle',
        state: 'WA',
        country: 'USA',
        isQualified: true,
        qualifiedDate: new Date('2025-01-05'),
        leadScore: 90,
        buyingIntent: 'HIGH',
        painPoints: ['No AI capabilities', 'Manual reporting', 'Data silos'],
        budget: 75000,
        timeline: 'Immediate',
        lastContactedAt: new Date('2025-01-09'),
      },
    }),
    prisma.lead.upsert({
      where: { email: 'amanda.lee@finservices.com' },
      update: {},
      create: {
        ownerId,
        firstName: 'Amanda',
        lastName: 'Lee',
        company: 'FinServices Inc',
        title: 'Sales Operations Manager',
        email: 'amanda.lee@finservices.com',
        phone: '+1 (555) 901-2345',
        website: 'https://finservices.com',
        leadSource: 'EMAIL_CAMPAIGN',
        status: 'NURTURING',
        rating: 'WARM',
        industry: 'Financial Services',
        numberOfEmployees: 300,
        annualRevenue: 50000000,
        city: 'Charlotte',
        state: 'NC',
        country: 'USA',
        leadScore: 65,
        buyingIntent: 'MEDIUM',
        painPoints: ['Compliance tracking', 'Customer data management'],
        budget: 60000,
        timeline: 'Q3 2025',
        lastContactedAt: new Date('2025-01-06'),
      },
    }),
    prisma.lead.upsert({
      where: { email: 'kevin.martinez@logistics.net' },
      update: {},
      create: {
        ownerId,
        firstName: 'Kevin',
        lastName: 'Martinez',
        company: 'Swift Logistics',
        title: 'Operations Director',
        email: 'kevin.martinez@logistics.net',
        phone: '+1 (555) 012-3456',
        website: 'https://swiftlogistics.net',
        leadSource: 'PARTNER_REFERRAL',
        status: 'NEW',
        rating: 'COLD',
        industry: 'Transportation',
        numberOfEmployees: 1000,
        annualRevenue: 200000000,
        city: 'Dallas',
        state: 'TX',
        country: 'USA',
        leadScore: 45,
        buyingIntent: 'LOW',
        painPoints: ['Route optimization', 'Customer communication'],
        budget: 150000,
        timeline: 'Evaluating',
        lastContactedAt: new Date('2025-01-04'),
      },
    }),
  ]);

  console.log(`✅ Created ${leads.length} leads`);

  // ==================== OPPORTUNITIES ====================
  console.log('\n💰 Creating Opportunities...');

  const opportunities = await Promise.all([
    // Acme - Active deal in late stage
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[0].id,
        name: 'Acme Corp - Enterprise Platform Upgrade',
        type: 'UPSELL',
        stage: 'NEGOTIATION_REVIEW',
        amount: 450000,
        probability: 80,
        expectedRevenue: 360000,
        closeDate: new Date('2025-02-15'),
        needsAnalysis: 'Current system reaching capacity limits. Need AI-powered analytics and automation.',
        proposedSolution: 'Enterprise AI Platform with custom integrations',
        competitors: ['Salesforce', 'HubSpot'],
        nextStep: 'Final contract review with legal',
        winProbability: 0.82,
        riskFactors: ['Budget approval pending', 'Competitor pricing pressure'],
        recommendedActions: ['Schedule legal review call', 'Prepare implementation timeline'],
        lastActivityDate: new Date('2025-01-08'),
      },
    }),
    // TechFusion - New business, mid-stage
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[1].id,
        name: 'TechFusion - AI CRM Implementation',
        type: 'NEW_BUSINESS',
        stage: 'VALUE_PROPOSITION',
        amount: 125000,
        probability: 50,
        expectedRevenue: 62500,
        closeDate: new Date('2025-03-30'),
        needsAnalysis: 'Looking to modernize sales operations with AI-first approach.',
        proposedSolution: 'Full IRIS platform with AI conversation intelligence',
        competitors: ['Gong', 'Chorus'],
        nextStep: 'Demo with engineering team',
        winProbability: 0.55,
        riskFactors: ['Long decision cycle', 'Technical evaluation required'],
        recommendedActions: ['Prepare technical deep-dive', 'Connect with reference customer'],
        lastActivityDate: new Date('2025-01-09'),
      },
    }),
    // Global Retail - Renewal
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[2].id,
        name: 'Global Retail - Annual Renewal + Expansion',
        type: 'RENEWAL',
        stage: 'PROPOSAL_PRICE_QUOTE',
        amount: 280000,
        probability: 70,
        expectedRevenue: 196000,
        closeDate: new Date('2025-02-28'),
        needsAnalysis: 'Expanding to 3 new regions, need additional licenses.',
        proposedSolution: 'Multi-region deployment with enhanced analytics',
        competitors: ['Microsoft Dynamics'],
        nextStep: 'Review proposal with procurement',
        winProbability: 0.75,
        riskFactors: ['Budget constraints', 'Competing internal priorities'],
        recommendedActions: ['Highlight ROI from current deployment', 'Offer volume discount'],
        lastActivityDate: new Date('2025-01-05'),
      },
    }),
    // MediSolutions - Early stage
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[3].id,
        name: 'MediSolutions - Healthcare CRM Pilot',
        type: 'NEW_BUSINESS',
        stage: 'NEEDS_ANALYSIS',
        amount: 95000,
        probability: 30,
        expectedRevenue: 28500,
        closeDate: new Date('2025-04-30'),
        needsAnalysis: 'Evaluating options to improve patient engagement tracking.',
        proposedSolution: 'HIPAA-compliant CRM with patient management features',
        competitors: ['Salesforce Health Cloud', 'Veeva'],
        nextStep: 'Discovery call with compliance team',
        winProbability: 0.35,
        riskFactors: ['HIPAA compliance requirements', 'Long procurement process'],
        recommendedActions: ['Prepare compliance documentation', 'Schedule demo with IT security'],
        lastActivityDate: new Date('2025-01-07'),
      },
    }),
    // GreenErgy - Early stage prospect
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[4].id,
        name: 'GreenErgy - Sales Automation Platform',
        type: 'NEW_BUSINESS',
        stage: 'QUALIFICATION',
        amount: 75000,
        probability: 20,
        expectedRevenue: 15000,
        closeDate: new Date('2025-05-31'),
        needsAnalysis: 'Growing sales team needs better tools for pipeline management.',
        proposedSolution: 'AI-powered sales automation with sustainability reporting',
        competitors: ['Pipedrive', 'Freshsales'],
        nextStep: 'Initial needs assessment meeting',
        winProbability: 0.25,
        riskFactors: ['Early stage', 'Budget uncertainty'],
        recommendedActions: ['Build relationship with COO', 'Understand growth plans'],
        lastActivityDate: new Date('2025-01-06'),
      },
    }),
    // Closed Won - for historical data
    prisma.opportunity.create({
      data: {
        ownerId,
        accountId: accounts[0].id,
        name: 'Acme Corp - Initial Implementation',
        type: 'NEW_BUSINESS',
        stage: 'CLOSED_WON',
        amount: 320000,
        probability: 100,
        expectedRevenue: 320000,
        closeDate: new Date('2024-06-15'),
        isClosed: true,
        isWon: true,
        closedDate: new Date('2024-06-15'),
        needsAnalysis: 'Modernize sales stack with AI capabilities.',
        proposedSolution: 'Full platform implementation with training',
        lastActivityDate: new Date('2024-06-15'),
      },
    }),
  ]);

  console.log(`✅ Created ${opportunities.length} opportunities`);

  // ==================== QUOTES ====================
  console.log('\n📋 Creating Quotes...');

  const quotes = await Promise.all([
    // Quote for Acme upgrade
    prisma.quote.create({
      data: {
        ownerId,
        opportunityId: opportunities[0].id,
        accountId: accounts[0].id,
        quoteNumber: 'Q-2025-001',
        name: 'Acme Enterprise Upgrade Quote',
        status: 'SENT',
        subtotal: 420000,
        discount: 20000,
        discountPercent: 4.76,
        tax: 33600,
        totalPrice: 433600,
        validUntil: new Date('2025-02-28'),
        paymentTerms: 'Net 30',
        description: 'Enterprise platform upgrade with AI analytics module',
        sentDate: new Date('2025-01-07'),
        billingStreet: '100 Innovation Drive',
        billingCity: 'Chicago',
        billingState: 'IL',
        billingPostalCode: '60601',
        billingCountry: 'USA',
        lineItems: {
          create: [
            {
              productName: 'IRIS Enterprise Platform',
              productCode: 'IRIS-ENT-001',
              description: 'Enterprise AI CRM platform - Annual subscription',
              quantity: 1,
              listPrice: 300000,
              unitPrice: 285000,
              discount: 15000,
              totalPrice: 285000,
              sortOrder: 1,
            },
            {
              productName: 'AI Analytics Module',
              productCode: 'IRIS-AI-001',
              description: 'Advanced AI analytics and forecasting',
              quantity: 1,
              listPrice: 80000,
              unitPrice: 75000,
              discount: 5000,
              totalPrice: 75000,
              sortOrder: 2,
            },
            {
              productName: 'Implementation Services',
              productCode: 'IRIS-SVC-001',
              description: 'Professional services for platform integration',
              quantity: 1,
              listPrice: 60000,
              unitPrice: 60000,
              discount: 0,
              totalPrice: 60000,
              sortOrder: 3,
            },
          ],
        },
      },
    }),
    // Quote for Global Retail renewal
    prisma.quote.create({
      data: {
        ownerId,
        opportunityId: opportunities[2].id,
        accountId: accounts[2].id,
        quoteNumber: 'Q-2025-002',
        name: 'Global Retail Renewal Quote',
        status: 'DRAFT',
        subtotal: 280000,
        discount: 14000,
        discountPercent: 5,
        tax: 21280,
        totalPrice: 287280,
        validUntil: new Date('2025-03-15'),
        paymentTerms: 'Net 45',
        description: 'Annual renewal with regional expansion licenses',
        billingStreet: '1 Commerce Plaza',
        billingCity: 'New York',
        billingState: 'NY',
        billingPostalCode: '10001',
        billingCountry: 'USA',
        lineItems: {
          create: [
            {
              productName: 'IRIS Platform - Annual Renewal',
              productCode: 'IRIS-RNW-001',
              description: 'Platform renewal for existing deployment',
              quantity: 1,
              listPrice: 180000,
              unitPrice: 171000,
              discount: 9000,
              totalPrice: 171000,
              sortOrder: 1,
            },
            {
              productName: 'Regional Expansion License',
              productCode: 'IRIS-REG-001',
              description: 'Additional regional deployment licenses',
              quantity: 3,
              listPrice: 35000,
              unitPrice: 33250,
              discount: 5250,
              totalPrice: 99750,
              sortOrder: 2,
            },
          ],
        },
      },
    }),
    // Quote for TechFusion
    prisma.quote.create({
      data: {
        ownerId,
        opportunityId: opportunities[1].id,
        accountId: accounts[1].id,
        quoteNumber: 'Q-2025-003',
        name: 'TechFusion AI CRM Quote',
        status: 'DRAFT',
        subtotal: 125000,
        discount: 0,
        tax: 10000,
        totalPrice: 135000,
        validUntil: new Date('2025-04-15'),
        paymentTerms: 'Net 30',
        description: 'New business proposal for AI CRM implementation',
        billingStreet: '500 Tech Park Blvd',
        billingCity: 'San Francisco',
        billingState: 'CA',
        billingPostalCode: '94105',
        billingCountry: 'USA',
        lineItems: {
          create: [
            {
              productName: 'IRIS Professional Platform',
              productCode: 'IRIS-PRO-001',
              description: 'Professional AI CRM platform - Annual subscription',
              quantity: 1,
              listPrice: 95000,
              unitPrice: 95000,
              discount: 0,
              totalPrice: 95000,
              sortOrder: 1,
            },
            {
              productName: 'Conversation Intelligence',
              productCode: 'IRIS-CI-001',
              description: 'AI-powered conversation analysis',
              quantity: 1,
              listPrice: 30000,
              unitPrice: 30000,
              discount: 0,
              totalPrice: 30000,
              sortOrder: 2,
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${quotes.length} quotes with line items`);

  // ==================== CONTRACTS ====================
  console.log('\n📜 Creating Contracts...');

  const contracts = await Promise.all([
    // Active contract with Acme
    prisma.contract.create({
      data: {
        ownerId,
        accountId: accounts[0].id,
        contractNumber: 'CTR-2024-001',
        contractName: 'Acme Corp - Master Service Agreement',
        status: 'ACTIVATED',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-06-30'),
        contractTerm: 12,
        contractValue: 320000,
        billingFrequency: 'Annually',
        autoRenew: true,
        renewalDate: new Date('2025-06-30'),
        renewalNoticeDate: new Date('2025-05-01'),
        renewalReminder: true,
        signedDate: new Date('2024-06-15'),
        activatedDate: new Date('2024-07-01'),
        description: 'Enterprise platform implementation and support agreement',
        specialTerms: '24/7 premium support included. SLA: 99.9% uptime guarantee.',
      },
    }),
    // Active contract with Global Retail
    prisma.contract.create({
      data: {
        ownerId,
        accountId: accounts[2].id,
        contractNumber: 'CTR-2024-002',
        contractName: 'Global Retail - Platform License Agreement',
        status: 'ACTIVATED',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-02-28'),
        contractTerm: 12,
        contractValue: 180000,
        billingFrequency: 'Quarterly',
        autoRenew: false,
        renewalDate: new Date('2025-02-28'),
        renewalNoticeDate: new Date('2025-01-15'),
        renewalReminder: true,
        signedDate: new Date('2024-02-20'),
        activatedDate: new Date('2024-03-01'),
        description: 'Multi-regional CRM platform license and support',
        specialTerms: 'Includes up to 500 user licenses. Additional users at $50/month each.',
      },
    }),
    // Draft contract for TechFusion (pending)
    prisma.contract.create({
      data: {
        ownerId,
        accountId: accounts[1].id,
        contractNumber: 'CTR-2025-001',
        contractName: 'TechFusion - SaaS Subscription Agreement',
        status: 'DRAFT',
        startDate: new Date('2025-04-01'),
        endDate: new Date('2026-03-31'),
        contractTerm: 12,
        contractValue: 125000,
        billingFrequency: 'Monthly',
        autoRenew: true,
        description: 'Pending contract for AI CRM implementation',
        specialTerms: 'Includes onboarding and training for up to 50 users.',
      },
    }),
    // Expired contract (historical)
    prisma.contract.create({
      data: {
        ownerId,
        accountId: accounts[0].id,
        contractNumber: 'CTR-2023-001',
        contractName: 'Acme Corp - Initial Pilot Agreement',
        status: 'EXPIRED',
        startDate: new Date('2023-07-01'),
        endDate: new Date('2024-06-30'),
        contractTerm: 12,
        contractValue: 85000,
        billingFrequency: 'Annually',
        autoRenew: false,
        signedDate: new Date('2023-06-15'),
        activatedDate: new Date('2023-07-01'),
        description: 'Initial pilot program for CRM evaluation',
        specialTerms: 'Pilot program with option to upgrade to enterprise.',
      },
    }),
  ]);

  console.log(`✅ Created ${contracts.length} contracts`);

  // ==================== SUMMARY ====================
  console.log('\n' + '═'.repeat(60));
  console.log('📊 CRM SEED DATA SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Accounts: ${accounts.length}`);
  console.log(`✅ Contacts: ${contacts.length}`);
  console.log(`✅ Leads: ${leads.length}`);
  console.log(`✅ Opportunities: ${opportunities.length}`);
  console.log(`✅ Quotes: ${quotes.length}`);
  console.log(`✅ Contracts: ${contracts.length}`);
  console.log('═'.repeat(60));
  console.log('🎉 CRM data seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
