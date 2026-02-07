/**
 * IRIS Agent Framework - Account Intelligence Agent
 * 
 * This agent provides deep account insights:
 * - Monitors account health and engagement
 * - Identifies expansion opportunities
 * - Detects churn risk signals
 * - Tracks stakeholder changes
 * - Aggregates account activity patterns
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AiSdkService } from '../../ai-sdk/ai-sdk.service';
import { CacheService } from '../../cache/cache.service';
import { SalesforceService } from '../../salesforce/salesforce.service';
import { OracleCXService } from '../../oracle-cx/oracle-cx.service';
import { BaseAgentService, DEFAULT_AGENT_LIMITS } from '../base/base-agent.service';
import { createCRMTools } from '../tools/crm-tools';
import {
  AgentType,
  AgentContext,
  AgentConfig,
  AgentTool,
  InsightType,
  AlertType,
  Priority,
  CRMEntityType,
  ActionType,
} from '../types';

/**
 * Account Intelligence Analysis from LLM
 */
interface AccountIntelligence {
  accountHealth: 'THRIVING' | 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  healthScore: number; // 0-100
  engagementLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'DORMANT';
  expansionPotential: {
    score: number;
    opportunities: string[];
    products: string[];
  };
  churnRisk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    signals: string[];
  };
  stakeholderInsights: {
    championStatus: 'STRONG' | 'WEAK' | 'UNKNOWN' | 'AT_RISK';
    keyContacts: string[];
    missingRoles: string[];
  };
  recommendations: string[];
  reasoning: string;
}

@Injectable()
export class AccountIntelligenceAgentService extends BaseAgentService {
  protected readonly agentType = AgentType.ACCOUNT_INTELLIGENCE;
  protected readonly logger = new Logger(AccountIntelligenceAgentService.name);
  
  protected readonly config: AgentConfig = {
    type: AgentType.ACCOUNT_INTELLIGENCE,
    name: 'Account Intelligence',
    description: 'Provides deep account insights, expansion opportunities, and churn risk detection',
    version: '1.0.0',
    
    // Run daily at 6 AM for account intelligence
    schedule: {
      cron: '0 6 * * *', // 6 AM daily
      enabled: true, // ENABLED - daily account health monitoring
    },
    
    // Trigger on account events
    eventTriggers: [
      { eventName: 'crm.account.updated' },
      { eventName: 'crm.contract.expiring' },
      { eventName: 'crm.contact.churned' },
    ],
    
    limits: {
      ...DEFAULT_AGENT_LIMITS,
      maxLLMCalls: 30,
      maxAlertsPerExecution: 20,
    },
    
    enabled: true,
    requiresApproval: false,
  };

  constructor(
    prisma: PrismaService,
    aiSdk: AiSdkService,
    eventEmitter: EventEmitter2,
    cacheService: CacheService,
    private readonly sfService: SalesforceService,
    private readonly ocxService: OracleCXService,
  ) {
    super();
    this.initializeBase(prisma, aiSdk, eventEmitter, cacheService, sfService, ocxService);
  }

  protected getTools(): AgentTool[] {
    return createCRMTools(this.prisma);
  }

  protected async executeAgent(context: AgentContext): Promise<void> {
    this.logger.log('Starting Account Intelligence analysis...');

    // Determine data source priority: Oracle CX > Salesforce > Local
    let dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local';
    let dataSourceLabel = 'local IRIS database';

    if (context.userId) {
      const sourceInfo = await this.determineDataSource(context.userId);
      dataSource = sourceInfo.dataSource;
      dataSourceLabel = sourceInfo.dataSourceLabel;
      this.logger.log(`Using ${dataSource} data source for user ${context.userId}`);
    }

    // If triggered for a specific account
    if (context.entityType === CRMEntityType.ACCOUNT && context.entityId) {
      await this.analyzeAccount(context.entityId, context, dataSource);
      return;
    }

    // Get strategic accounts to analyze
    const accounts = await this.getStrategicAccounts(context, dataSource);
    this.logger.log(`Analyzing ${accounts.length} strategic accounts from ${dataSourceLabel}`);

    let analyzed = 0;
    for (const account of accounts) {
      if (this.getElapsedTimeMs() > 55000) {
        this.logger.warn('Approaching time limit, stopping analysis');
        break;
      }

      await this.analyzeAccount(account.id, context, dataSource);
      analyzed++;
    }

    this.addInsight({
      type: InsightType.INFORMATION,
      priority: Priority.LOW,
      confidence: 1,
      title: 'Account Intelligence Scan Complete',
      description: `Analyzed ${analyzed} strategic accounts from ${dataSourceLabel}`,
    });
  }

  private async analyzeAccount(
    accountId: string,
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local',
  ): Promise<void> {
    let account: any = null;

    if (dataSource === 'oracle_cx' && context.userId) {
      account = await this.fetchAccountFromOracleCX(accountId, context.userId);
    } else if (dataSource === 'salesforce' && context.userId) {
      account = await this.fetchAccountFromSalesforce(accountId, context.userId);
    }

    if (!account) {
      // Fallback to local database
      account = await this.prisma.account.findUnique({
        where: { id: accountId },
        include: {
          contacts: {
            include: {
              activities: { take: 5, orderBy: { activityDate: 'desc' } },
            },
          },
          opportunities: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          activities: { orderBy: { activityDate: 'desc' }, take: 20 },
          contracts: { orderBy: { endDate: 'asc' } },
          notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });
    }

    if (!account) {
      this.logger.warn(`Account ${accountId} not found`);
      return;
    }

    const cacheKey = `account-intel:${accountId}`;
    const analysis = await this.getCached<AccountIntelligence>(
      cacheKey,
      async () => this.performAccountAnalysis(account),
      3600, // 1 hour cache
    );

    await this.processAccountAnalysis(account, analysis, context);
  }

  private async performAccountAnalysis(account: any): Promise<AccountIntelligence> {
    // Calculate engagement metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentActivities = account.activities?.filter((a: any) => 
      a.activityDate && new Date(a.activityDate) > thirtyDaysAgo
    ).length || 0;

    const totalActivities90d = account.activities?.filter((a: any) => 
      a.activityDate && new Date(a.activityDate) > ninetyDaysAgo
    ).length || 0;

    // Opportunity metrics
    const openOpps = account.opportunities?.filter((o: any) => 
      !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)
    ) || [];
    const wonOpps = account.opportunities?.filter((o: any) => o.stage === 'CLOSED_WON') || [];
    const totalRevenue = wonOpps.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
    const openPipeline = openOpps.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

    // Contract status
    const activeContracts = account.contracts?.filter((c: any) => c.status === 'ACTIVATED') || [];
    const expiringContracts = activeContracts.filter((c: any) => {
      if (!c.endDate) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
    });

    const prompt = `Analyze this account for intelligence insights:

ACCOUNT:
- Name: ${account.name}
- Industry: ${account.industry || 'Unknown'}
- Type: ${account.type || 'Unknown'}
- Annual Revenue: $${account.annualRevenue?.toLocaleString() || 'Unknown'}
- Employees: ${account.employees || 'Unknown'}
- Rating: ${account.rating || 'Not rated'}

ENGAGEMENT METRICS:
- Activities (Last 30 days): ${recentActivities}
- Activities (Last 90 days): ${totalActivities90d}
- Total Contacts: ${account.contacts?.length || 0}
- Active Contacts (with recent activity): ${account.contacts?.filter((c: any) => c.activities?.length > 0).length || 0}

REVENUE METRICS:
- Total Won Revenue: $${totalRevenue.toLocaleString()}
- Open Pipeline: $${openPipeline.toLocaleString()}
- Open Opportunities: ${openOpps.length}
- Won Opportunities: ${wonOpps.length}

CONTRACT STATUS:
- Active Contracts: ${activeContracts.length}
- Expiring (next 90 days): ${expiringContracts.length}
${expiringContracts.map((c: any) => `  - ${c.name}: Expires ${new Date(c.endDate).toLocaleDateString()}`).join('\n')}

KEY CONTACTS:
${account.contacts?.slice(0, 8).map((c: any) => 
  `- ${c.firstName} ${c.lastName}: ${c.title || 'Unknown title'} (${c.activities?.length || 0} activities)`
).join('\n') || 'No contacts'}

RECENT NOTES:
${account.notes?.slice(0, 3).map((n: any) => 
  `- ${n.content?.substring(0, 100)}...`
).join('\n') || 'No notes'}

Provide a JSON analysis:
{
  "accountHealth": "THRIVING|HEALTHY|AT_RISK|CRITICAL",
  "healthScore": <0-100>,
  "engagementLevel": "HIGH|MEDIUM|LOW|DORMANT",
  "expansionPotential": {
    "score": <0-100>,
    "opportunities": ["<expansion opp 1>", "<expansion opp 2>"],
    "products": ["<product 1>", "<product 2>"]
  },
  "churnRisk": {
    "level": "LOW|MEDIUM|HIGH",
    "signals": ["<signal 1>", "<signal 2>"]
  },
  "stakeholderInsights": {
    "championStatus": "STRONG|WEAK|UNKNOWN|AT_RISK",
    "keyContacts": ["<contact role 1>", "<contact role 2>"],
    "missingRoles": ["<missing role 1>"]
  },
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "reasoning": "<brief explanation>"
}

Consider:
- Low engagement + expiring contracts = churn risk
- High revenue + expansion opportunities = growth potential
- Missing executive contacts = stakeholder risk
- Recent wins + active engagement = thriving account`;

    const systemPrompt = `You are an AI account strategist. Analyze accounts for health, expansion, and risk.
Return ONLY valid JSON. Be specific about opportunities and risks.`;

    return this.callLLMForJSON<AccountIntelligence>(prompt, systemPrompt);
  }

  private async processAccountAnalysis(
    account: any,
    analysis: AccountIntelligence,
    context: AgentContext,
  ): Promise<void> {
    // Add comprehensive insight
    this.addInsight({
      type: analysis.accountHealth === 'CRITICAL' ? InsightType.CHURN_SIGNAL :
            analysis.accountHealth === 'AT_RISK' ? InsightType.RISK_DETECTED :
            analysis.expansionPotential.score > 70 ? InsightType.EXPANSION_OPPORTUNITY :
            InsightType.INFORMATION,
      priority: analysis.accountHealth === 'CRITICAL' ? Priority.URGENT :
               analysis.accountHealth === 'AT_RISK' ? Priority.HIGH :
               analysis.expansionPotential.score > 70 ? Priority.HIGH :
               Priority.MEDIUM,
      confidence: analysis.healthScore / 100,
      title: `${account.name}: ${analysis.accountHealth}`,
      description: analysis.reasoning,
      recommendation: analysis.recommendations[0],
      entityType: CRMEntityType.ACCOUNT,
      entityId: account.id,
      evidence: [
        ...analysis.churnRisk.signals.map(s => ({ source: 'Churn Signal', excerpt: s })),
        ...analysis.expansionPotential.opportunities.map(o => ({ source: 'Expansion', excerpt: o })),
      ],
    });

    // Alert for at-risk or critical accounts
    if (['AT_RISK', 'CRITICAL'].includes(analysis.accountHealth) && context.userId) {
      await this.createAlert({
        alertType: AlertType.DEAL_AT_RISK,
        priority: analysis.accountHealth === 'CRITICAL' ? Priority.URGENT : Priority.HIGH,
        title: `⚠️ ${account.name} needs attention`,
        description: `Health: ${analysis.accountHealth} (${analysis.healthScore}/100). Churn Risk: ${analysis.churnRisk.level}. ${analysis.reasoning}`,
        recommendation: analysis.recommendations.join('; '),
        userId: context.userId,
        entityType: CRMEntityType.ACCOUNT,
        entityId: account.id,
        suggestedActions: analysis.recommendations.slice(0, 3).map(rec => ({
          label: rec,
          actionType: ActionType.CREATE_TASK,
          params: { subject: rec, accountId: account.id },
        })),
        metadata: {
          healthScore: analysis.healthScore,
          churnRisk: analysis.churnRisk,
          stakeholderInsights: analysis.stakeholderInsights,
        },
      });
    }

    // Alert for expansion opportunities
    if (analysis.expansionPotential.score > 60 && context.userId) {
      await this.createAlert({
        alertType: AlertType.OPPORTUNITY_DETECTED,
        priority: analysis.expansionPotential.score > 80 ? Priority.HIGH : Priority.MEDIUM,
        title: `💰 Expansion opportunity at ${account.name}`,
        description: `Expansion Score: ${analysis.expansionPotential.score}/100. ${analysis.expansionPotential.opportunities.join('. ')}`,
        recommendation: `Consider: ${analysis.expansionPotential.products.join(', ')}`,
        userId: context.userId,
        entityType: CRMEntityType.ACCOUNT,
        entityId: account.id,
        suggestedActions: [
          {
            label: 'Schedule expansion discussion',
            actionType: ActionType.SCHEDULE_MEETING,
            params: { accountId: account.id, subject: 'Expansion Discussion' },
          },
          ...analysis.expansionPotential.opportunities.slice(0, 2).map(opp => ({
            label: opp,
            actionType: ActionType.CREATE_TASK,
            params: { subject: opp, accountId: account.id },
          })),
        ],
        metadata: {
          expansionScore: analysis.expansionPotential.score,
          products: analysis.expansionPotential.products,
        },
      });
    }

    // Update account with analysis
    await this.prisma.account.update({
      where: { id: account.id },
      data: {
        rating: this.mapHealthToRating(analysis.accountHealth) as any,
        metadata: {
          ...(account.metadata as object || {}),
          lastIntelligenceAnalysis: new Date().toISOString(),
          healthScore: analysis.healthScore,
          engagementLevel: analysis.engagementLevel,
          churnRiskLevel: analysis.churnRisk.level,
          expansionScore: analysis.expansionPotential.score,
        },
      },
    });
  }

  private mapHealthToRating(health: string): string {
    switch (health) {
      case 'THRIVING': return 'HOT';
      case 'HEALTHY': return 'WARM';
      case 'AT_RISK': return 'COLD';
      case 'CRITICAL': return 'COLD';
      default: return 'WARM';
    }
  }

  private async getStrategicAccounts(
    context: AgentContext,
    dataSource: 'local' | 'salesforce' | 'oracle_cx' = 'local',
  ): Promise<any[]> {
    // Try Oracle CX first if selected
    if (dataSource === 'oracle_cx' && context.userId) {
      const ocxAccounts = await this.getStrategicAccountsFromOracleCX(context);
      if (ocxAccounts && ocxAccounts.length > 0) {
        return ocxAccounts;
      }
    }

    // Try Salesforce if selected
    if (dataSource === 'salesforce' && context.userId) {
      const sfAccounts = await this.getStrategicAccountsFromSalesforce(context);
      if (sfAccounts && sfAccounts.length > 0) {
        return sfAccounts;
      }
    }

    // Fallback to local database
    const where: any = {};

    if (context.userId) {
      where.ownerId = context.userId;
    }

    if (context.scope?.accountIds) {
      where.id = { in: context.scope.accountIds };
    }

    // Prioritize accounts with:
    // 1. Active contracts
    // 2. High revenue
    // 3. Recent activity
    return this.prisma.account.findMany({
      where,
      take: context.scope?.maxEntities || 25,
      orderBy: [
        { annualRevenue: 'desc' },
      ],
      select: { id: true },
    });
  }

  /**
   * Get strategic accounts from Salesforce
   */
  private async getStrategicAccountsFromSalesforce(context: AgentContext): Promise<{ id: string }[] | null> {
    if (!context.userId) return null;

    try {
      const limit = context.scope?.maxEntities || 25;
      const soql = `
        SELECT Id FROM Account
        ORDER BY AnnualRevenue DESC NULLS LAST
        LIMIT ${limit}
      `;
      const result = await this.querySalesforce<{ Id: string }>(context.userId, soql);
      if (!result?.records) return null;

      return result.records.map(r => ({ id: r.Id }));
    } catch (error) {
      this.logger.warn(`Failed to fetch accounts from Salesforce: ${error}`);
      return null;
    }
  }

  /**
   * Get strategic accounts from Oracle CX
   */
  private async getStrategicAccountsFromOracleCX(context: AgentContext): Promise<{ id: string }[] | null> {
    if (!context.userId) return null;

    try {
      const limit = context.scope?.maxEntities || 25;
      const result = await this.queryOracleCX<{ PartyId: number }>(
        context.userId,
        'accounts',
        {
          limit,
          orderBy: 'AnnualRevenue:desc',
        },
      );

      if (!result?.items) return null;

      return result.items.map(r => ({ id: r.PartyId?.toString() }));
    } catch (error) {
      this.logger.warn(`Failed to fetch accounts from Oracle CX: ${error}`);
      return null;
    }
  }

  /**
   * Fetch account data from Salesforce with related records
   */
  private async fetchAccountFromSalesforce(accountId: string, userId: string): Promise<any | null> {
    try {
      const soql = `
        SELECT Id, Name, Industry, Type, AnnualRevenue, NumberOfEmployees, Rating,
               Website, Phone, BillingCity, BillingState, BillingCountry
        FROM Account
        WHERE Id = '${accountId}'
      `;
      const result = await this.querySalesforce<any>(userId, soql);
      if (!result?.records?.length) return null;

      const acc = result.records[0];

      // Get related contacts
      const contactsSoql = `
        SELECT Id, FirstName, LastName, Title, Email, Phone
        FROM Contact
        WHERE AccountId = '${accountId}'
        ORDER BY LastModifiedDate DESC LIMIT 20
      `;
      const contactsResult = await this.querySalesforce<any>(userId, contactsSoql);

      // Get related opportunities
      const oppsSoql = `
        SELECT Id, Name, StageName, Amount, Probability, CloseDate
        FROM Opportunity
        WHERE AccountId = '${accountId}'
        ORDER BY CloseDate DESC LIMIT 10
      `;
      const oppsResult = await this.querySalesforce<any>(userId, oppsSoql);

      return {
        id: acc.Id,
        name: acc.Name,
        industry: acc.Industry,
        type: acc.Type,
        annualRevenue: acc.AnnualRevenue,
        employees: acc.NumberOfEmployees,
        rating: acc.Rating,
        website: acc.Website,
        phone: acc.Phone,
        contacts: (contactsResult?.records || []).map((c: any) => ({
          id: c.Id,
          firstName: c.FirstName,
          lastName: c.LastName,
          title: c.Title,
          email: c.Email,
          phone: c.Phone,
          activities: [],
        })),
        opportunities: (oppsResult?.records || []).map((o: any) => ({
          id: o.Id,
          name: o.Name,
          stage: o.StageName,
          amount: o.Amount,
          probability: o.Probability,
          closeDate: o.CloseDate,
        })),
        activities: [],
        contracts: [],
        notes: [],
        _source: 'salesforce',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch account ${accountId} from Salesforce: ${error}`);
      return null;
    }
  }

  /**
   * Fetch account data from Oracle CX with related records
   */
  private async fetchAccountFromOracleCX(accountId: string, userId: string): Promise<any | null> {
    try {
      const acc = await this.getOracleCXById<any>(userId, 'accounts', accountId);
      if (!acc) return null;

      // Get related contacts
      const contactsResult = await this.queryOracleCX<any>(userId, 'contacts', {
        limit: 20,
        filters: { AccountId: accountId },
      });

      // Get related opportunities
      const oppsResult = await this.queryOracleCX<any>(userId, 'opportunities', {
        limit: 10,
        filters: { AccountId: accountId },
        orderBy: 'EstimatedCloseDate:desc',
      });

      return {
        id: acc.PartyId?.toString() || accountId,
        name: acc.PartyName || acc.OrganizationName,
        industry: acc.Industry,
        type: acc.PartyType,
        annualRevenue: acc.AnnualRevenue,
        employees: acc.EmployeeCount,
        rating: null,
        website: null,
        phone: acc.PhoneNumber,
        contacts: (contactsResult?.items || []).map((c: any) => ({
          id: c.PartyId?.toString(),
          firstName: c.FirstName,
          lastName: c.LastName,
          title: c.JobTitle,
          email: c.EmailAddress,
          phone: c.PhoneNumber,
          activities: [],
        })),
        opportunities: (oppsResult?.items || []).map((o: any) => ({
          id: o.OptyId?.toString(),
          name: o.Name,
          stage: o.SalesStage,
          amount: o.Revenue,
          probability: o.WinProb,
          closeDate: o.EstimatedCloseDate,
        })),
        activities: [],
        contracts: [],
        notes: [],
        _source: 'oracle_cx',
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch account ${accountId} from Oracle CX: ${error}`);
      return null;
    }
  }
}


