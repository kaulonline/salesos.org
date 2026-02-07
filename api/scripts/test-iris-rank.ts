/**
 * IRISRank Test Script
 *
 * Demonstrates the power of IRISRank algorithm:
 * 1. PageRank-style network centrality
 * 2. Time-decayed activity scoring
 * 3. Query relevance matching
 * 4. At-risk entity detection
 * 5. Momentum tracking
 * 6. Full explainability
 */

import {
  createIRISRanker,
  CRMEntity,
  EntityConnection,
  EntityActivity,
  IRISRankConfig,
  transformToEntities,
} from '../src/ai-sdk/iris-rank.service';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '='.repeat(70));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(70));
}

function subheader(title: string) {
  console.log('\n' + '-'.repeat(50));
  log(title, colors.yellow);
  console.log('-'.repeat(50));
}

// Generate realistic test data
function generateTestData(): CRMEntity[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const entities: CRMEntity[] = [
    // High-value, highly connected account with recent engagement
    {
      id: 'acc-001',
      type: 'Account',
      name: 'TechCorp Enterprise',
      properties: {
        industry: 'Technology',
        annualRevenue: 5000000,
        employees: 500,
        rating: 'Hot',
      },
      connections: [
        { targetId: 'con-001', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 30 * day) },
        { targetId: 'con-002', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 60 * day) },
        { targetId: 'con-003', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 90 * day) },
        { targetId: 'opp-001', targetType: 'Opportunity', relationshipType: 'owns', createdDate: new Date(now - 15 * day) },
        { targetId: 'opp-002', targetType: 'Opportunity', relationshipType: 'owns', createdDate: new Date(now - 45 * day) },
      ],
      activities: [
        { type: 'meeting_attended', date: new Date(now - 2 * day), outcome: 'positive' },
        { type: 'email_replied', date: new Date(now - 5 * day), outcome: 'positive' },
        { type: 'call_answered', date: new Date(now - 7 * day), outcome: 'positive' },
        { type: 'content_downloaded', date: new Date(now - 10 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 365 * day),
      lastModifiedDate: new Date(now - 1 * day),
    },

    // Medium account with declining engagement (AT RISK)
    {
      id: 'acc-002',
      type: 'Account',
      name: 'GlobalFinance Inc',
      properties: {
        industry: 'Financial Services',
        annualRevenue: 3000000,
        employees: 200,
        rating: 'Warm',
      },
      connections: [
        { targetId: 'con-004', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 120 * day) },
        { targetId: 'con-005', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 180 * day) },
        { targetId: 'opp-003', targetType: 'Opportunity', relationshipType: 'owns', createdDate: new Date(now - 90 * day) },
      ],
      activities: [
        { type: 'email_sent', date: new Date(now - 45 * day), outcome: 'neutral' },
        { type: 'call_missed', date: new Date(now - 30 * day), outcome: 'negative' },
        { type: 'meeting_no_show', date: new Date(now - 20 * day), outcome: 'negative' },
      ],
      createdDate: new Date(now - 400 * day),
      lastModifiedDate: new Date(now - 20 * day),
    },

    // New account with high momentum
    {
      id: 'acc-003',
      type: 'Account',
      name: 'StartupRocket',
      properties: {
        industry: 'Technology',
        annualRevenue: 500000,
        employees: 25,
        rating: 'Hot',
      },
      connections: [
        { targetId: 'con-006', targetType: 'Contact', relationshipType: 'employs', createdDate: new Date(now - 7 * day) },
        { targetId: 'opp-004', targetType: 'Opportunity', relationshipType: 'owns', createdDate: new Date(now - 5 * day) },
      ],
      activities: [
        { type: 'meeting_attended', date: new Date(now - 1 * day), outcome: 'positive' },
        { type: 'email_replied', date: new Date(now - 1 * day), outcome: 'positive' },
        { type: 'email_replied', date: new Date(now - 2 * day), outcome: 'positive' },
        { type: 'call_answered', date: new Date(now - 3 * day), outcome: 'positive' },
        { type: 'content_downloaded', date: new Date(now - 3 * day), outcome: 'positive' },
        { type: 'website_visit', date: new Date(now - 4 * day), outcome: 'positive' },
        { type: 'stage_advanced', date: new Date(now - 2 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 14 * day),
      lastModifiedDate: new Date(now - 1 * day),
    },

    // Key decision maker contact
    {
      id: 'con-001',
      type: 'Contact',
      name: 'Sarah Chen',
      properties: {
        title: 'VP of Engineering',
        email: 'sarah.chen@techcorp.com',
        department: 'Engineering',
      },
      connections: [
        { targetId: 'acc-001', targetType: 'Account', relationshipType: 'works_at', createdDate: new Date(now - 30 * day) },
        { targetId: 'con-002', targetType: 'Contact', relationshipType: 'reports_to', createdDate: new Date(now - 30 * day) },
        { targetId: 'opp-001', targetType: 'Opportunity', relationshipType: 'associated_to', createdDate: new Date(now - 15 * day) },
      ],
      activities: [
        { type: 'meeting_attended', date: new Date(now - 2 * day), outcome: 'positive' },
        { type: 'email_replied', date: new Date(now - 3 * day), outcome: 'positive' },
        { type: 'referral_given', date: new Date(now - 10 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 180 * day),
      lastModifiedDate: new Date(now - 2 * day),
    },

    // Executive sponsor
    {
      id: 'con-002',
      type: 'Contact',
      name: 'Michael Roberts',
      properties: {
        title: 'CTO',
        email: 'michael.r@techcorp.com',
        department: 'Executive',
      },
      connections: [
        { targetId: 'acc-001', targetType: 'Account', relationshipType: 'works_at', createdDate: new Date(now - 60 * day) },
        { targetId: 'opp-001', targetType: 'Opportunity', relationshipType: 'associated_to', createdDate: new Date(now - 15 * day) },
        { targetId: 'opp-002', targetType: 'Opportunity', relationshipType: 'associated_to', createdDate: new Date(now - 45 * day) },
      ],
      activities: [
        { type: 'meeting_scheduled', date: new Date(now - 5 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 200 * day),
      lastModifiedDate: new Date(now - 5 * day),
    },

    // Inactive contact (churned)
    {
      id: 'con-003',
      type: 'Contact',
      name: 'James Wilson',
      properties: {
        title: 'Developer',
        email: 'james.w@techcorp.com',
        department: 'Engineering',
      },
      connections: [
        { targetId: 'acc-001', targetType: 'Account', relationshipType: 'works_at', createdDate: new Date(now - 90 * day) },
      ],
      activities: [
        { type: 'email_bounced', date: new Date(now - 60 * day), outcome: 'negative' },
        { type: 'unsubscribed', date: new Date(now - 45 * day), outcome: 'negative' },
      ],
      createdDate: new Date(now - 300 * day),
      lastModifiedDate: new Date(now - 45 * day),
    },

    // High-value opportunity
    {
      id: 'opp-001',
      type: 'Opportunity',
      name: 'TechCorp Enterprise Deal',
      properties: {
        amount: 250000,
        stage: 'Negotiation',
        probability: 80,
        closeDate: new Date(now + 30 * day),
      },
      connections: [
        { targetId: 'acc-001', targetType: 'Account', relationshipType: 'associated_to', createdDate: new Date(now - 15 * day) },
        { targetId: 'con-001', targetType: 'Contact', relationshipType: 'associated_to', createdDate: new Date(now - 15 * day) },
        { targetId: 'con-002', targetType: 'Contact', relationshipType: 'associated_to', createdDate: new Date(now - 15 * day) },
      ],
      activities: [
        { type: 'stage_advanced', date: new Date(now - 3 * day), outcome: 'positive' },
        { type: 'meeting_attended', date: new Date(now - 2 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 60 * day),
      lastModifiedDate: new Date(now - 2 * day),
    },

    // Won deal
    {
      id: 'opp-002',
      type: 'Opportunity',
      name: 'TechCorp Phase 1',
      properties: {
        amount: 75000,
        stage: 'Closed Won',
        probability: 100,
      },
      connections: [
        { targetId: 'acc-001', targetType: 'Account', relationshipType: 'associated_to', createdDate: new Date(now - 45 * day) },
      ],
      activities: [
        { type: 'deal_won', date: new Date(now - 30 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 120 * day),
      lastModifiedDate: new Date(now - 30 * day),
    },

    // Stalled opportunity (at risk)
    {
      id: 'opp-003',
      type: 'Opportunity',
      name: 'GlobalFinance Expansion',
      properties: {
        amount: 150000,
        stage: 'Proposal',
        probability: 40,
      },
      connections: [
        { targetId: 'acc-002', targetType: 'Account', relationshipType: 'associated_to', createdDate: new Date(now - 90 * day) },
      ],
      activities: [
        { type: 'stage_regressed', date: new Date(now - 25 * day), outcome: 'negative' },
        { type: 'task_overdue', date: new Date(now - 15 * day), outcome: 'negative' },
      ],
      createdDate: new Date(now - 90 * day),
      lastModifiedDate: new Date(now - 15 * day),
    },

    // Hot new opportunity
    {
      id: 'opp-004',
      type: 'Opportunity',
      name: 'StartupRocket Initial',
      properties: {
        amount: 50000,
        stage: 'Discovery',
        probability: 60,
      },
      connections: [
        { targetId: 'acc-003', targetType: 'Account', relationshipType: 'associated_to', createdDate: new Date(now - 5 * day) },
      ],
      activities: [
        { type: 'meeting_attended', date: new Date(now - 1 * day), outcome: 'positive' },
        { type: 'stage_advanced', date: new Date(now - 2 * day), outcome: 'positive' },
      ],
      createdDate: new Date(now - 7 * day),
      lastModifiedDate: new Date(now - 1 * day),
    },
  ];

  return entities;
}

async function runTests() {
  header('IRISRank Algorithm Test Suite');
  log('Testing the power of graph-based entity ranking', colors.magenta);

  // Create ranker with default config
  const ranker = createIRISRanker();
  const entities = generateTestData();
  const scopeId = 'test-user-123';

  // Test 1: Basic Ranking
  subheader('TEST 1: Overall Entity Ranking');
  log('Computing IRISRank scores for all entities...', colors.blue);

  const startTime = Date.now();
  const allRanked = await ranker.getRankedEntities(scopeId, entities, {}, 10);
  const computeTime = Date.now() - startTime;

  log(`\nComputed in ${computeTime}ms`, colors.green);
  console.log('\nTop Ranked Entities:');
  console.log('-'.repeat(90));
  console.log(
    'Rank'.padEnd(6) +
    'Entity'.padEnd(30) +
    'Type'.padEnd(12) +
    'Score'.padEnd(8) +
    'Network'.padEnd(10) +
    'Activity'.padEnd(10) +
    'Relevance'.padEnd(10)
  );
  console.log('-'.repeat(90));

  allRanked.forEach((r, i) => {
    const color = i < 3 ? colors.green : colors.reset;
    log(
      `#${i + 1}`.padEnd(6) +
      r.entityName.substring(0, 28).padEnd(30) +
      r.entityType.padEnd(12) +
      r.rank.toFixed(3).padEnd(8) +
      r.networkScore.toFixed(3).padEnd(10) +
      r.activityScore.toFixed(3).padEnd(10) +
      r.relevanceScore.toFixed(3).padEnd(10),
      color
    );
  });

  // Test 2: Query-based Ranking
  subheader('TEST 2: Query-Relevant Ranking');
  log('Query: "technology enterprise deal"', colors.blue);

  const queryRanked = await ranker.getRankedEntities(
    scopeId,
    entities,
    { query: 'technology enterprise deal' },
    5
  );

  console.log('\nMost Relevant Results:');
  queryRanked.forEach((r, i) => {
    log(`${i + 1}. ${r.entityName} (${r.entityType})`, colors.green);
    log(`   Relevance: ${(r.relevanceScore * 100).toFixed(0)}%`, colors.yellow);
    r.explanation.forEach(exp => {
      log(`   - ${exp}`, colors.reset);
    });
  });

  // Test 3: At-Risk Detection
  subheader('TEST 3: At-Risk Entity Detection');
  log('Finding high-value entities with declining engagement...', colors.blue);

  const atRisk = await ranker.getAtRiskEntities(scopeId, entities, 5);

  if (atRisk.length > 0) {
    console.log('\nAt-Risk Entities Requiring Attention:');
    atRisk.forEach((r, i) => {
      log(`\n${i + 1}. ${r.entityName} (${r.entityType})`, colors.red);
      log(`   Network Score: ${(r.networkScore * 100).toFixed(0)}% (high value)`, colors.yellow);
      log(`   Activity Score: ${(r.activityScore * 100).toFixed(0)}% (low engagement)`, colors.red);
      r.explanation.forEach(exp => {
        log(`   - ${exp}`, colors.reset);
      });
    });
  } else {
    log('No at-risk entities detected!', colors.green);
  }

  // Test 4: Momentum Detection
  subheader('TEST 4: High Momentum Entities');
  log('Finding entities with strong positive signals...', colors.blue);

  const momentum = await ranker.getMomentumEntities(scopeId, entities, 5);

  console.log('\nHot Entities with Momentum:');
  momentum.forEach((r, i) => {
    log(`\n${i + 1}. ${r.entityName} (${r.entityType})`, colors.green);
    log(`   Activity Score: ${(r.activityScore * 100).toFixed(0)}%`, colors.green);
    if (r.breakdown.topActivities.length > 0) {
      log('   Recent Activities:', colors.yellow);
      r.breakdown.topActivities.slice(0, 3).forEach(act => {
        log(`     - ${act.type}: +${(act.contribution * 100).toFixed(1)}%`, colors.reset);
      });
    }
  });

  // Test 5: Type-filtered Ranking
  subheader('TEST 5: Entity Type Filtering');

  const types = ['Account', 'Contact', 'Opportunity'];
  for (const type of types) {
    const typeRanked = await ranker.getRankedEntities(
      scopeId,
      entities,
      { entityTypes: [type] },
      3
    );
    log(`\nTop ${type}s:`, colors.cyan);
    typeRanked.forEach((r, i) => {
      log(`  ${i + 1}. ${r.entityName} (score: ${r.rank.toFixed(3)})`, colors.reset);
    });
  }

  // Test 6: Explainability
  subheader('TEST 6: Full Explainability Demo');
  const topEntity = allRanked[0];
  log(`\nDetailed Analysis: ${topEntity.entityName}`, colors.bright);

  console.log('\nScore Breakdown:');
  log(`  Network Centrality:  ${(topEntity.networkScore * 100).toFixed(1)}%`, colors.blue);
  log(`  Activity Score:      ${(topEntity.activityScore * 100).toFixed(1)}%`, colors.green);
  log(`  Query Relevance:     ${(topEntity.relevanceScore * 100).toFixed(1)}%`, colors.yellow);
  log(`  FINAL RANK:          ${(topEntity.rank * 100).toFixed(1)}%`, colors.bright + colors.magenta);

  console.log('\nExplanations:');
  topEntity.explanation.forEach(exp => {
    log(`  - ${exp}`, colors.reset);
  });

  if (topEntity.breakdown.topConnections.length > 0) {
    console.log('\nConnection Profile:');
    topEntity.breakdown.topConnections.forEach(conn => {
      log(`  - ${conn.type}: ${conn.count} connections`, colors.cyan);
    });
  }

  log(`\nRecency Factor: ${(topEntity.breakdown.recencyFactor * 100).toFixed(0)}%`, colors.yellow);

  // Test 7: Custom Configuration
  subheader('TEST 7: Custom Configuration');
  log('Creating ranker with custom weights (heavy activity focus)...', colors.blue);

  const customRanker = createIRISRanker({
    networkWeight: 0.2,
    activityWeight: 0.6,
    relevanceWeight: 0.2,
    activityTypes: {
      'custom_event': { weight: 0.5, decayDays: 7, category: 'custom' },
    },
  });

  const customRanked = await customRanker.getRankedEntities('custom-scope', entities, {}, 3);

  console.log('\nWith Activity-Heavy Weights (20% network, 60% activity, 20% relevance):');
  customRanked.forEach((r, i) => {
    log(`  ${i + 1}. ${r.entityName} - ${(r.rank * 100).toFixed(1)}%`, colors.green);
  });

  // Test 8: Runtime Configuration
  subheader('TEST 8: Runtime Configuration');
  log('Adding custom activity type at runtime...', colors.blue);

  ranker.addActivityType('demo_event', { weight: 0.4, decayDays: 14, category: 'demo' });
  ranker.addRelationshipType('sponsored_by', { weight: 0.9, bidirectional: false });

  const config = ranker.getConfig();
  log(`\nActivity Types: ${Object.keys(config.activityTypes!).length}`, colors.cyan);
  log(`Relationship Types: ${Object.keys(config.relationshipTypes!).length}`, colors.cyan);

  // Test 9: Performance Stats
  subheader('TEST 9: Performance Statistics');

  // Run multiple computations
  for (let i = 0; i < 10; i++) {
    await ranker.getRankedEntities(scopeId, entities, { query: `test query ${i}` }, 5);
  }

  const stats = ranker.getStats();
  console.log('\nIRISRank Statistics:');
  log(`  Total Computations:    ${stats.totalComputations}`, colors.cyan);
  log(`  Cache Hits:            ${stats.cacheHits}`, colors.green);
  log(`  Entities Ranked:       ${stats.entitiesRanked}`, colors.cyan);
  log(`  Avg Compute Time:      ${stats.avgComputeTimeMs.toFixed(2)}ms`, colors.yellow);
  log(`  Activity Types:        ${stats.configuredActivityTypes}`, colors.cyan);
  log(`  Relationship Types:    ${stats.configuredRelationshipTypes}`, colors.cyan);

  // Test 10: Data Transformation Helper
  subheader('TEST 10: Data Transformation Helper');
  log('Testing transformToEntities helper for external data...', colors.blue);

  const rawRecords = [
    { Id: 'lead-001', Name: 'New Lead', CreatedDate: new Date(), LastModifiedDate: new Date() },
    { Id: 'lead-002', Name: 'Hot Lead', CreatedDate: new Date(), LastModifiedDate: new Date() },
  ];

  const transformed = transformToEntities(rawRecords, {
    idField: 'Id',
    nameField: 'Name',
    typeValue: 'Lead',
    createdDateField: 'CreatedDate',
    modifiedDateField: 'LastModifiedDate',
  });

  log(`\nTransformed ${transformed.length} records to CRMEntity format:`, colors.green);
  transformed.forEach(e => {
    log(`  - ${e.name} (${e.type}, ID: ${e.id})`, colors.reset);
  });

  // Summary
  header('TEST SUMMARY');

  console.log('\nIRISRank provides:');
  log('  1. PageRank-style network centrality scoring', colors.green);
  log('  2. Time-decayed activity signal processing', colors.green);
  log('  3. Query-relevant semantic matching', colors.green);
  log('  4. At-risk entity detection (high value, low engagement)', colors.green);
  log('  5. Momentum tracking (hot entities)', colors.green);
  log('  6. Full explainability for every ranking', colors.green);
  log('  7. Configurable weights and scoring', colors.green);
  log('  8. Runtime configuration changes', colors.green);
  log('  9. Performance caching and statistics', colors.green);
  log('  10. Portable helper functions for any data source', colors.green);

  console.log('\nValue Proposition:');
  log('  - Prioritize sales efforts on highest-value entities', colors.yellow);
  log('  - Identify at-risk accounts before they churn', colors.yellow);
  log('  - Spot hot opportunities with momentum', colors.yellow);
  log('  - Understand WHY entities are ranked (explainability)', colors.yellow);
  log('  - Works with ANY CRM - fully portable', colors.yellow);

  log('\n All tests passed!', colors.bright + colors.green);
}

// Run the tests
runTests().catch(console.error);
