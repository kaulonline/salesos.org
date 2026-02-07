/**
 * Seed script for Agent Templates
 * 
 * Run with: npx ts-node prisma/seed-agent-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'Deal Risk Analyzer',
    slug: 'deal-risk-analyzer',
    description: 'Analyzes open opportunities to identify deals at risk of stalling or being lost',
    longDescription: 'This agent reviews your pipeline to identify deals showing warning signs like stalled progress, missing next steps, or decreased engagement. It provides actionable recommendations to get deals back on track.',
    category: 'sales',
    icon: 'Shield',
    color: '#ef4444',
    complexity: 'intermediate',
    estimatedSetupTime: '5 minutes',
    templateConfig: {
      systemPrompt: `You are a Deal Risk Analyst AI agent. Your job is to analyze sales opportunities and identify deals at risk.

For each opportunity, evaluate:
1. Deal velocity - Is it progressing at a healthy pace?
2. Engagement - Are there recent activities and communications?
3. Next steps - Are clear next steps defined?
4. Stakeholder access - Is there multi-threading happening?
5. Timeline alignment - Is the close date realistic?

Provide your analysis in JSON format:
{
  "summary": "Brief overview",
  "alerts": [
    { "title": "...", "description": "...", "priority": "HIGH/MEDIUM/LOW", "type": "RISK", "recommendation": "..." }
  ],
  "insights": ["..."],
  "recommendations": ["..."]
}`,
      analysisPrompt: 'Analyze the current open opportunities and identify any deals showing risk signals.',
      modelId: 'claude-sonnet',
      temperature: 0.3,
      maxTokens: 4000,
      enabledTools: ['search_opportunities', 'get_opportunity_details', 'search_activities'],
      triggerConfig: { schedule: { cron: '0 8 * * 1-5', enabled: true }, manual: true },
      targetEntityTypes: ['Opportunity'],
      alertTypes: ['RISK_DETECTED', 'STALL_WARNING', 'ATTENTION_NEEDED'],
      requiresApproval: false,
    },
    useCases: ['Pipeline review', 'Weekly deal health check', 'Forecast accuracy'],
    tags: ['sales', 'pipeline', 'risk', 'forecasting'],
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Follow-Up Reminder',
    slug: 'follow-up-reminder',
    description: 'Identifies leads and contacts that need follow-up based on activity history',
    longDescription: 'Never let a lead go cold again. This agent monitors your leads and contacts to identify those who haven\'t been contacted recently and suggests personalized follow-up actions.',
    category: 'engagement',
    icon: 'Bell',
    color: '#f59e0b',
    complexity: 'beginner',
    estimatedSetupTime: '3 minutes',
    templateConfig: {
      systemPrompt: `You are a Follow-Up Assistant AI agent. Your job is to identify leads and contacts that need attention.

Look for:
1. Leads not contacted in the last 7 days
2. High-value leads with no recent activity
3. Contacts with upcoming meetings that need prep
4. Stale conversations that should be revived

Provide your analysis in JSON format:
{
  "summary": "Brief overview of follow-ups needed",
  "alerts": [
    { "title": "...", "description": "...", "priority": "HIGH/MEDIUM/LOW", "type": "FOLLOW_UP", "recommendation": "..." }
  ],
  "insights": ["..."],
  "recommendations": ["..."]
}`,
      analysisPrompt: 'Review recent activity and identify leads/contacts that need follow-up.',
      modelId: 'claude-haiku',
      temperature: 0.2,
      maxTokens: 2000,
      enabledTools: ['search_leads', 'search_activities', 'get_lead_details'],
      triggerConfig: { schedule: { cron: '0 9 * * 1-5', enabled: true }, manual: true },
      targetEntityTypes: ['Lead', 'Contact'],
      alertTypes: ['FOLLOW_UP_NEEDED', 'ENGAGEMENT_DROP'],
      requiresApproval: false,
    },
    useCases: ['Daily task planning', 'Lead nurturing', 'Pipeline hygiene'],
    tags: ['engagement', 'follow-up', 'leads', 'productivity'],
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: 'Account Health Monitor',
    slug: 'account-health-monitor',
    description: 'Monitors key accounts for health signals and expansion opportunities',
    longDescription: 'Keep your strategic accounts healthy. This agent analyzes account activity, opportunity status, and engagement patterns to identify accounts needing attention or showing expansion potential.',
    category: 'sales',
    icon: 'Building2',
    color: '#3b82f6',
    complexity: 'advanced',
    estimatedSetupTime: '10 minutes',
    templateConfig: {
      systemPrompt: `You are an Account Health Monitor AI agent. Your job is to analyze strategic accounts.

Evaluate each account for:
1. Overall health score (engagement, revenue, satisfaction)
2. Expansion opportunities (upsell, cross-sell)
3. Risk signals (decreased engagement, complaints, competitor mentions)
4. Relationship depth (stakeholder coverage)
5. Revenue trends

Provide your analysis in JSON format:
{
  "summary": "Account health overview",
  "alerts": [
    { "title": "...", "description": "...", "priority": "HIGH/MEDIUM/LOW", "type": "ACCOUNT_HEALTH", "recommendation": "..." }
  ],
  "insights": ["..."],
  "recommendations": ["..."]
}`,
      analysisPrompt: 'Analyze strategic accounts and provide health assessments.',
      modelId: 'claude-sonnet',
      temperature: 0.3,
      maxTokens: 6000,
      enabledTools: ['search_accounts', 'get_account_details', 'search_opportunities', 'search_activities'],
      triggerConfig: { schedule: { cron: '0 7 * * 1', enabled: true }, manual: true },
      targetEntityTypes: ['Account'],
      alertTypes: ['EXPANSION_OPPORTUNITY', 'CHURN_SIGNAL', 'ATTENTION_NEEDED'],
      requiresApproval: false,
    },
    useCases: ['QBR preparation', 'Account planning', 'Churn prevention'],
    tags: ['accounts', 'health', 'expansion', 'retention'],
    isFeatured: true,
    sortOrder: 3,
  },
  {
    name: 'Pipeline Summary Generator',
    slug: 'pipeline-summary-generator',
    description: 'Generates executive summaries of your pipeline for meetings and reports',
    longDescription: 'Get ready for your pipeline review in seconds. This agent creates comprehensive summaries of your pipeline including key metrics, notable deals, and areas needing attention.',
    category: 'analytics',
    icon: 'BarChart3',
    color: '#10b981',
    complexity: 'beginner',
    estimatedSetupTime: '2 minutes',
    templateConfig: {
      systemPrompt: `You are a Pipeline Summary Generator AI agent. Your job is to create executive summaries.

Include in your summary:
1. Total pipeline value and deal count
2. Pipeline by stage breakdown
3. Deals closing this month
4. Top 5 deals by value
5. Deals at risk
6. Key wins and losses

Format as a professional summary suitable for executive review.

Provide your analysis in JSON format:
{
  "summary": "Executive summary text",
  "alerts": [],
  "insights": ["Key insight 1", "Key insight 2"],
  "recommendations": ["Action item 1", "Action item 2"],
  "metrics": { "totalValue": 0, "dealCount": 0, "avgDealSize": 0 }
}`,
      analysisPrompt: 'Generate an executive summary of the current pipeline.',
      modelId: 'claude-sonnet',
      temperature: 0.4,
      maxTokens: 3000,
      enabledTools: ['get_pipeline_summary', 'search_opportunities'],
      triggerConfig: { manual: true },
      targetEntityTypes: ['Opportunity'],
      alertTypes: ['INFORMATION'],
      requiresApproval: false,
    },
    useCases: ['Pipeline reviews', 'Weekly reports', 'Forecast meetings'],
    tags: ['analytics', 'reports', 'pipeline', 'executive'],
    isFeatured: false,
    sortOrder: 4,
  },
  {
    name: 'Competitor Mention Tracker',
    slug: 'competitor-mention-tracker',
    description: 'Scans activities and notes for competitor mentions and competitive intelligence',
    longDescription: 'Stay ahead of the competition. This agent monitors your CRM activities for mentions of competitors and provides intelligence about competitive situations.',
    category: 'sales',
    icon: 'Target',
    color: '#8b5cf6',
    complexity: 'intermediate',
    estimatedSetupTime: '5 minutes',
    templateConfig: {
      systemPrompt: `You are a Competitive Intelligence AI agent. Your job is to track competitor mentions.

When analyzing activities:
1. Identify any competitor mentions
2. Assess the competitive threat level
3. Note the context (evaluation, objection, etc.)
4. Suggest competitive responses

Provide your analysis in JSON format:
{
  "summary": "Competitive landscape overview",
  "alerts": [
    { "title": "...", "description": "...", "priority": "HIGH/MEDIUM/LOW", "type": "COMPETITOR", "recommendation": "..." }
  ],
  "insights": ["..."],
  "recommendations": ["..."]
}`,
      analysisPrompt: 'Scan recent activities for competitor mentions and competitive situations.',
      modelId: 'claude-sonnet',
      temperature: 0.3,
      maxTokens: 4000,
      enabledTools: ['search_activities', 'search_opportunities', 'get_opportunity_details'],
      triggerConfig: { schedule: { cron: '0 10 * * 1-5', enabled: true }, manual: true },
      targetEntityTypes: ['Opportunity', 'Activity'],
      alertTypes: ['COMPETITOR_MENTIONED', 'COMPETITIVE_THREAT'],
      requiresApproval: false,
    },
    useCases: ['Competitive analysis', 'Win/loss analysis', 'Battle card updates'],
    tags: ['competitive', 'intelligence', 'sales'],
    isFeatured: false,
    sortOrder: 5,
  },
];

async function main() {
  console.log('Seeding agent templates...');

  for (const template of templates) {
    const existing = await prisma.agentTemplate.findUnique({
      where: { slug: template.slug },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, updating...`);
      await prisma.agentTemplate.update({
        where: { slug: template.slug },
        data: template,
      });
    } else {
      console.log(`Creating template "${template.name}"...`);
      await prisma.agentTemplate.create({
        data: template,
      });
    }
  }

  console.log(`Seeded ${templates.length} agent templates`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });












