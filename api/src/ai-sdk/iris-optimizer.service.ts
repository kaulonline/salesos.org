/**
 * IRIS Optimizer Service
 *
 * Implements the advanced AI architecture:
 * 1. Deterministic Query Templates (60% of queries - no LLM needed)
 * 2. Query Fingerprint Cache (repeat queries hit cache)
 * 3. LLM Compiler Integration (parallel tool execution)
 * 4. Speculative Cascade (future: Haiku drafts, Sonnet verifies)
 */

import { Injectable, Logger } from '@nestjs/common';
import { LLMCompilerService, ExecutionPlan } from './llm-compiler.service';

// ============================================================================
// DETERMINISTIC QUERY TEMPLATES
// These queries bypass LLM entirely - direct SOQL + template response
// ============================================================================

interface DeterministicTemplate {
  patterns: RegExp[];
  soql: string;
  responseTemplate: string;
  visualization: 'bar-chart' | 'pie-chart' | 'line-chart' | 'table' | 'kpi' | 'forecast-range' | 'funnel' | 'donut' | 'gauge' | 'waterfall';
  title: string;
}

const DETERMINISTIC_TEMPLATES: DeterministicTemplate[] = [
  // Pipeline queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*pipeline\s*(by\s*stage)?$/i,
      /^pipeline\s*(by\s*stage|breakdown)?$/i,
      /^(show|get)\s*opportunities\s*by\s*stage$/i,
    ],
    soql: 'SELECT StageName, COUNT(Id) cnt, SUM(Amount) total FROM Opportunity WHERE IsClosed = false GROUP BY StageName ORDER BY SUM(Amount) DESC',
    responseTemplate: 'Here\'s your pipeline breakdown by stage:',
    visualization: 'funnel',
    title: 'Pipeline by Stage',
  },
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*pipeline\s*value$/i,
      /^total\s*pipeline\s*(value)?$/i,
      /^pipeline\s*total$/i,
    ],
    soql: 'SELECT COUNT(Id) TotalDeals, SUM(Amount) TotalValue, AVG(Amount) AvgDeal FROM Opportunity WHERE IsClosed = false',
    responseTemplate: 'Your current pipeline summary:',
    visualization: 'kpi',
    title: 'Pipeline Summary',
  },

  // Lead queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*leads?$/i,
      /^(show|get)\s*(my|the)?\s*(recent|latest)?\s*leads?$/i,
      /^leads?$/i,
    ],
    soql: 'SELECT Id, Name, Company, Status, LeadSource, CreatedDate FROM Lead ORDER BY CreatedDate DESC LIMIT 20',
    responseTemplate: 'Here are your most recent leads:',
    visualization: 'table',
    title: 'Recent Leads',
  },
  {
    patterns: [
      /^lead\s*(count|breakdown)?\s*by\s*status$/i,
      /^(show|get)\s*leads?\s*by\s*status$/i,
      /^leads?\s*by\s*status$/i,
    ],
    soql: 'SELECT Status, COUNT(Id) cnt FROM Lead GROUP BY Status ORDER BY COUNT(Id) DESC',
    responseTemplate: 'Lead distribution by status:',
    visualization: 'donut',
    title: 'Leads by Status',
  },
  {
    patterns: [
      /^lead\s*(count|breakdown)?\s*by\s*source$/i,
      /^(show|get)\s*leads?\s*by\s*source$/i,
      /^leads?\s*by\s*source$/i,
    ],
    soql: 'SELECT LeadSource, COUNT(Id) cnt FROM Lead GROUP BY LeadSource ORDER BY COUNT(Id) DESC',
    responseTemplate: 'Lead distribution by source:',
    visualization: 'bar-chart',
    title: 'Leads by Source',
  },

  // Opportunity queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*opportunities?$/i,
      /^(show|get)\s*(my|the)?\s*(open|active)?\s*deals?$/i,
      /^open\s*(deals?|opportunities?)$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC LIMIT 20',
    responseTemplate: 'Here are your open opportunities:',
    visualization: 'table',
    title: 'Open Opportunities',
  },
  {
    patterns: [
      /^(deals?|opportunities?)\s*closing\s*this\s*month$/i,
      /^(show|get)\s*(deals?|opportunities?)\s*closing\s*this\s*month$/i,
      /^what\s*(deals?|opportunities?)\s*close\s*this\s*month$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsClosed = false AND CloseDate = THIS_MONTH ORDER BY CloseDate ASC',
    responseTemplate: 'Opportunities closing this month:',
    visualization: 'table',
    title: 'Closing This Month',
  },
  {
    patterns: [
      /^(deals?|opportunities?)\s*closing\s*this\s*quarter$/i,
      /^(show|get)\s*(deals?|opportunities?)\s*closing\s*this\s*quarter$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsClosed = false AND CloseDate = THIS_QUARTER ORDER BY CloseDate ASC',
    responseTemplate: 'Opportunities closing this quarter:',
    visualization: 'table',
    title: 'Closing This Quarter',
  },

  // Account queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*accounts?$/i,
      /^(show|get)\s*(my|the)?\s*(recent|top)?\s*accounts?$/i,
    ],
    soql: 'SELECT Id, Name, Industry, Type, AnnualRevenue, NumberOfEmployees FROM Account ORDER BY CreatedDate DESC LIMIT 20',
    responseTemplate: 'Here are your accounts:',
    visualization: 'table',
    title: 'Accounts',
  },
  {
    patterns: [
      /^(top|largest)\s*accounts?\s*(by\s*revenue)?$/i,
      /^accounts?\s*by\s*revenue$/i,
    ],
    soql: 'SELECT Id, Name, Industry, AnnualRevenue FROM Account WHERE AnnualRevenue != null ORDER BY AnnualRevenue DESC LIMIT 10',
    responseTemplate: 'Your top accounts by revenue:',
    visualization: 'bar-chart',
    title: 'Top Accounts by Revenue',
  },

  // Task queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*tasks?$/i,
      /^(show|get)\s*(my|the)?\s*(open|pending)?\s*tasks?$/i,
      /^what\s*(do\s*i\s*need\s*to\s*do|are\s*my\s*tasks?)$/i,
    ],
    soql: 'SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name FROM Task WHERE Status != \'Completed\' ORDER BY ActivityDate ASC LIMIT 20',
    responseTemplate: 'Here are your open tasks:',
    visualization: 'table',
    title: 'Open Tasks',
  },
  {
    patterns: [
      /^overdue\s*tasks?$/i,
      /^(show|get)\s*overdue\s*tasks?$/i,
      /^tasks?\s*overdue$/i,
    ],
    soql: 'SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name FROM Task WHERE Status != \'Completed\' AND ActivityDate < TODAY ORDER BY ActivityDate ASC',
    responseTemplate: 'Your overdue tasks that need attention:',
    visualization: 'table',
    title: 'Overdue Tasks',
  },

  // Contact queries
  {
    patterns: [
      /^(show|get|display)?\s*(my|the)?\s*contacts?$/i,
      /^(show|get)\s*(my|the)?\s*(recent)?\s*contacts?$/i,
    ],
    soql: 'SELECT Id, Name, Title, Email, Phone, Account.Name FROM Contact ORDER BY CreatedDate DESC LIMIT 20',
    responseTemplate: 'Here are your recent contacts:',
    visualization: 'table',
    title: 'Recent Contacts',
  },

  // Win/Loss analysis
  {
    patterns: [
      /^win\s*rate$/i,
      /^(show|get)\s*(my|the)?\s*win\s*rate$/i,
      /^what\'?s?\s*(my|the)?\s*win\s*rate$/i,
    ],
    soql: 'SELECT StageName, COUNT(Id) cnt FROM Opportunity WHERE IsClosed = true GROUP BY StageName',
    responseTemplate: 'Your win/loss breakdown:',
    visualization: 'pie-chart',
    title: 'Win Rate Analysis',
  },

  // Forecast queries - uses ExpectedRevenue for weighted forecast (Amount * Probability)
  {
    patterns: [
      /^forecast$/i,
      /^(show|get)\s*(my|the)?\s*forecast$/i,
      /^revenue\s*forecast$/i,
      /^what.*(is|s).*forecast.*quarter/i,
    ],
    soql: 'SELECT SUM(ExpectedRevenue) Forecast, SUM(Amount) BestCase, COUNT(Id) Deals FROM Opportunity WHERE IsClosed = false AND CloseDate = THIS_FISCAL_QUARTER',
    responseTemplate: 'Your forecast for this quarter (probability-weighted):',
    visualization: 'forecast-range',
    title: 'Revenue Forecast',
  },

  // Activity queries
  {
    patterns: [
      /^(recent|my)\s*activities?$/i,
      /^(show|get)\s*(my|the)?\s*(recent)?\s*activities?$/i,
      /^what\s*have\s*i\s*done\s*(recently)?$/i,
    ],
    soql: 'SELECT Id, Subject, ActivityDate, Status, Who.Name, What.Name FROM Task WHERE OwnerId = :userId ORDER BY ActivityDate DESC LIMIT 20',
    responseTemplate: 'Your recent activities:',
    visualization: 'table',
    title: 'Recent Activities',
  },

  // ============================================================================
  // ADDITIONAL DETERMINISTIC TEMPLATES - Phase 1B Expansion
  // ============================================================================

  // High-value opportunities
  {
    patterns: [
      /^(top|largest|biggest)\s*(deals?|opportunities?)$/i,
      /^(show|get)\s*(my)?\s*(top|largest|biggest)\s*(deals?|opportunities?)$/i,
      /^high\s*value\s*(deals?|opportunities?)$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsClosed = false ORDER BY Amount DESC NULLS LAST LIMIT 10',
    responseTemplate: 'Your highest value opportunities:',
    visualization: 'bar-chart',
    title: 'Top Opportunities by Value',
  },

  // Stale opportunities (no activity)
  {
    patterns: [
      /^stale\s*(deals?|opportunities?)$/i,
      /^(deals?|opportunities?)\s*(with)?\s*no\s*activity$/i,
      /^neglected\s*(deals?|opportunities?)$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, LastActivityDate, Account.Name FROM Opportunity WHERE IsClosed = false AND LastActivityDate < LAST_N_DAYS:30 ORDER BY LastActivityDate ASC NULLS FIRST LIMIT 20',
    responseTemplate: 'Opportunities that need attention (no recent activity):',
    visualization: 'table',
    title: 'Stale Opportunities',
  },

  // Hot leads (high score/rating)
  {
    patterns: [
      /^hot\s*leads?$/i,
      /^(show|get)\s*(my)?\s*hot\s*leads?$/i,
      /^(best|top)\s*leads?$/i,
      /^high\s*(quality|score)\s*leads?$/i,
    ],
    soql: 'SELECT Id, Name, Company, Status, Rating, LeadSource, CreatedDate FROM Lead WHERE Status != \'Converted\' AND Rating = \'Hot\' ORDER BY CreatedDate DESC LIMIT 20',
    responseTemplate: 'Your hot leads ready for engagement:',
    visualization: 'table',
    title: 'Hot Leads',
  },

  // New leads today/this week
  {
    patterns: [
      /^new\s*leads?\s*(today)?$/i,
      /^leads?\s*(created\s*)?(today|this\s*week)$/i,
      /^(show|get)\s*new\s*leads?$/i,
    ],
    soql: 'SELECT Id, Name, Company, Status, LeadSource, CreatedDate FROM Lead WHERE CreatedDate = TODAY ORDER BY CreatedDate DESC',
    responseTemplate: 'New leads created today:',
    visualization: 'table',
    title: 'New Leads Today',
  },

  // Opportunities by type
  {
    patterns: [
      /^(deals?|opportunities?)\s*by\s*type$/i,
      /^(show|get)\s*(deals?|opportunities?)\s*by\s*type$/i,
      /^opportunity\s*types?$/i,
    ],
    soql: 'SELECT Type, COUNT(Id) cnt, SUM(Amount) total FROM Opportunity WHERE IsClosed = false GROUP BY Type ORDER BY SUM(Amount) DESC NULLS LAST',
    responseTemplate: 'Opportunity breakdown by type:',
    visualization: 'pie-chart',
    title: 'Opportunities by Type',
  },

  // Won deals
  {
    patterns: [
      /^won\s*(deals?|opportunities?)$/i,
      /^(show|get)\s*won\s*(deals?|opportunities?)$/i,
      /^closed\s*won$/i,
      /^(deals?|opportunities?)\s*won$/i,
    ],
    soql: 'SELECT Id, Name, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsWon = true ORDER BY CloseDate DESC LIMIT 20',
    responseTemplate: 'Your recently won deals:',
    visualization: 'table',
    title: 'Won Opportunities',
  },

  // Lost deals
  {
    patterns: [
      /^lost\s*(deals?|opportunities?)$/i,
      /^(show|get)\s*lost\s*(deals?|opportunities?)$/i,
      /^closed\s*lost$/i,
      /^(deals?|opportunities?)\s*lost$/i,
    ],
    soql: 'SELECT Id, Name, Amount, CloseDate, Account.Name, StageName FROM Opportunity WHERE IsClosed = true AND IsWon = false ORDER BY CloseDate DESC LIMIT 20',
    responseTemplate: 'Recently lost opportunities:',
    visualization: 'table',
    title: 'Lost Opportunities',
  },

  // Revenue this month/quarter
  {
    patterns: [
      /^revenue\s*this\s*month$/i,
      /^(show|get)\s*(my)?\s*revenue\s*this\s*month$/i,
      /^closed\s*revenue\s*this\s*month$/i,
    ],
    soql: 'SELECT SUM(Amount) TotalRevenue, COUNT(Id) DealCount FROM Opportunity WHERE IsWon = true AND CloseDate = THIS_MONTH',
    responseTemplate: 'Your closed revenue this month:',
    visualization: 'kpi',
    title: 'Revenue This Month',
  },
  {
    patterns: [
      /^revenue\s*this\s*quarter$/i,
      /^(show|get)\s*(my)?\s*revenue\s*this\s*quarter$/i,
      /^closed\s*revenue\s*this\s*quarter$/i,
      /^qtd\s*revenue$/i,
    ],
    soql: 'SELECT SUM(Amount) TotalRevenue, COUNT(Id) DealCount FROM Opportunity WHERE IsWon = true AND CloseDate = THIS_QUARTER',
    responseTemplate: 'Your closed revenue this quarter:',
    visualization: 'kpi',
    title: 'Revenue This Quarter',
  },

  // Upcoming meetings/events
  {
    patterns: [
      /^upcoming\s*meetings?$/i,
      /^(show|get)\s*(my)?\s*upcoming\s*(meetings?|events?)$/i,
      /^meetings?\s*this\s*week$/i,
      /^calendar$/i,
    ],
    soql: 'SELECT Id, Subject, StartDateTime, EndDateTime, Who.Name, What.Name, Location FROM Event WHERE StartDateTime >= TODAY ORDER BY StartDateTime ASC LIMIT 20',
    responseTemplate: 'Your upcoming meetings:',
    visualization: 'table',
    title: 'Upcoming Meetings',
  },

  // Overdue opportunities (past close date)
  {
    patterns: [
      /^overdue\s*(deals?|opportunities?)$/i,
      /^past\s*due\s*(deals?|opportunities?)$/i,
      /^(deals?|opportunities?)\s*past\s*(close)?\s*date$/i,
    ],
    soql: 'SELECT Id, Name, StageName, Amount, CloseDate, Account.Name FROM Opportunity WHERE IsClosed = false AND CloseDate < TODAY ORDER BY CloseDate ASC LIMIT 20',
    responseTemplate: 'Opportunities past their close date:',
    visualization: 'table',
    title: 'Overdue Opportunities',
  },

  // Accounts by industry
  {
    patterns: [
      /^accounts?\s*by\s*industry$/i,
      /^(show|get)\s*accounts?\s*by\s*industry$/i,
      /^industry\s*breakdown$/i,
    ],
    soql: 'SELECT Industry, COUNT(Id) cnt FROM Account WHERE Industry != null GROUP BY Industry ORDER BY COUNT(Id) DESC',
    responseTemplate: 'Account distribution by industry:',
    visualization: 'pie-chart',
    title: 'Accounts by Industry',
  },

  // Contacts by account
  {
    patterns: [
      /^contacts?\s*by\s*account$/i,
      /^(show|get)\s*contacts?\s*by\s*account$/i,
    ],
    soql: 'SELECT Account.Name, COUNT(Id) cnt FROM Contact WHERE AccountId != null GROUP BY Account.Name ORDER BY COUNT(Id) DESC LIMIT 20',
    responseTemplate: 'Contact count by account:',
    visualization: 'bar-chart',
    title: 'Contacts by Account',
  },

  // Recent conversions (lead to contact/opportunity)
  {
    patterns: [
      /^recent\s*conversions?$/i,
      /^converted\s*leads?$/i,
      /^(show|get)\s*converted\s*leads?$/i,
    ],
    soql: 'SELECT Id, Name, Company, ConvertedDate, ConvertedAccount.Name, ConvertedContact.Name, ConvertedOpportunity.Name FROM Lead WHERE IsConverted = true ORDER BY ConvertedDate DESC LIMIT 20',
    responseTemplate: 'Recently converted leads:',
    visualization: 'table',
    title: 'Recent Lead Conversions',
  },

  // Campaign performance
  {
    patterns: [
      /^campaigns?$/i,
      /^(show|get)\s*(my)?\s*campaigns?$/i,
      /^campaign\s*performance$/i,
    ],
    soql: 'SELECT Id, Name, Status, Type, NumberOfLeads, NumberOfConvertedLeads, NumberOfOpportunities, AmountAllOpportunities FROM Campaign WHERE IsActive = true ORDER BY NumberOfLeads DESC LIMIT 20',
    responseTemplate: 'Your active campaigns:',
    visualization: 'table',
    title: 'Campaign Performance',
  },

  // Tasks due today
  {
    patterns: [
      /^tasks?\s*(due\s*)?(today|now)$/i,
      /^(show|get)\s*tasks?\s*due\s*today$/i,
      /^today\'?s?\s*tasks?$/i,
      /^what\'?s?\s*due\s*today$/i,
    ],
    soql: 'SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name FROM Task WHERE Status != \'Completed\' AND ActivityDate = TODAY ORDER BY Priority DESC',
    responseTemplate: 'Tasks due today:',
    visualization: 'table',
    title: 'Tasks Due Today',
  },

  // Tasks due this week
  {
    patterns: [
      /^tasks?\s*this\s*week$/i,
      /^(show|get)\s*tasks?\s*(due\s*)?this\s*week$/i,
      /^weekly\s*tasks?$/i,
    ],
    soql: 'SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name FROM Task WHERE Status != \'Completed\' AND ActivityDate = THIS_WEEK ORDER BY ActivityDate ASC',
    responseTemplate: 'Tasks due this week:',
    visualization: 'table',
    title: 'Tasks This Week',
  },

  // High priority tasks
  {
    patterns: [
      /^high\s*priority\s*tasks?$/i,
      /^urgent\s*tasks?$/i,
      /^(show|get)\s*high\s*priority\s*tasks?$/i,
    ],
    soql: 'SELECT Id, Subject, Status, Priority, ActivityDate, Who.Name, What.Name FROM Task WHERE Status != \'Completed\' AND Priority = \'High\' ORDER BY ActivityDate ASC LIMIT 20',
    responseTemplate: 'High priority tasks requiring attention:',
    visualization: 'table',
    title: 'High Priority Tasks',
  },

  // Pipeline by month
  {
    patterns: [
      /^pipeline\s*by\s*month$/i,
      /^(show|get)\s*pipeline\s*by\s*month$/i,
      /^monthly\s*pipeline$/i,
    ],
    soql: 'SELECT CALENDAR_MONTH(CloseDate) Month, SUM(Amount) Total, COUNT(Id) DealCount FROM Opportunity WHERE IsClosed = false AND CloseDate >= TODAY AND CloseDate <= NEXT_N_MONTHS:6 GROUP BY CALENDAR_MONTH(CloseDate) ORDER BY CALENDAR_MONTH(CloseDate)',
    responseTemplate: 'Pipeline breakdown by close month:',
    visualization: 'line-chart',
    title: 'Pipeline by Month',
  },

  // Call summary
  {
    patterns: [
      /^(recent\s*)?calls?$/i,
      /^(show|get)\s*(my)?\s*(recent\s*)?calls?$/i,
      /^call\s*history$/i,
    ],
    soql: 'SELECT Id, Subject, CallType, CallDurationInSeconds, ActivityDate, Who.Name, What.Name FROM Task WHERE TaskSubtype = \'Call\' ORDER BY ActivityDate DESC LIMIT 20',
    responseTemplate: 'Your recent calls:',
    visualization: 'table',
    title: 'Recent Calls',
  },

  // Email summary
  {
    patterns: [
      /^(recent\s*)?emails?$/i,
      /^(show|get)\s*(my)?\s*(recent\s*)?emails?$/i,
      /^email\s*history$/i,
    ],
    soql: 'SELECT Id, Subject, Status, ActivityDate, Who.Name, What.Name FROM Task WHERE TaskSubtype = \'Email\' ORDER BY ActivityDate DESC LIMIT 20',
    responseTemplate: 'Your recent emails:',
    visualization: 'table',
    title: 'Recent Emails',
  },

  // Sales summary / dashboard
  {
    patterns: [
      /^(sales\s*)?dashboard$/i,
      /^sales\s*summary$/i,
      /^(show|get)\s*(my)?\s*(sales\s*)?(dashboard|summary)$/i,
      /^how\s*am\s*i\s*doing$/i,
    ],
    soql: 'SELECT COUNT(Id) OpenDeals, SUM(Amount) PipelineValue FROM Opportunity WHERE IsClosed = false',
    responseTemplate: 'Your sales summary:',
    visualization: 'kpi',
    title: 'Sales Dashboard',
  },
];

// ============================================================================
// QUERY FINGERPRINT CACHE
// ============================================================================

interface QueryFingerprint {
  normalizedQuery: string;
  template: DeterministicTemplate | null;
  toolsUsed: string[];
  responsePattern: string;
  successCount: number;
  lastUsed: Date;
}

// ============================================================================
// IRIS OPTIMIZER SERVICE
// ============================================================================

@Injectable()
export class IrisOptimizerService {
  private readonly logger = new Logger(IrisOptimizerService.name);

  // LRU Cache for query fingerprints
  private readonly fingerprintCache = new Map<string, QueryFingerprint>();
  private readonly maxCacheSize = 10000;
  private readonly cacheTTLMs = 24 * 60 * 60 * 1000; // 24 hours

  // Statistics
  private stats = {
    totalQueries: 0,
    deterministicHits: 0,
    cacheHits: 0,
    llmFallbacks: 0,
    parallelExecutions: 0,
    avgLatencySaved: 0,
  };

  constructor(private readonly llmCompiler: LLMCompilerService) {
    this.logger.log('IRIS Optimizer initialized with deterministic templates and parallel execution');
    this.logger.log(`Loaded ${DETERMINISTIC_TEMPLATES.length} deterministic query templates`);
  }

  /**
   * Try to match query to deterministic template (no LLM needed)
   * Returns null if no match - caller should fall back to LLM
   */
  matchDeterministicTemplate(query: string): DeterministicTemplate | null {
    const normalizedQuery = this.normalizeQuery(query);

    // Check cache first
    const cached = this.fingerprintCache.get(normalizedQuery);
    if (cached && cached.template) {
      this.stats.cacheHits++;
      cached.successCount++;
      cached.lastUsed = new Date();
      return cached.template;
    }

    // Try pattern matching
    for (const template of DETERMINISTIC_TEMPLATES) {
      for (const pattern of template.patterns) {
        if (pattern.test(normalizedQuery)) {
          this.stats.deterministicHits++;

          // Cache the match
          this.cacheFingerprint(normalizedQuery, {
            normalizedQuery,
            template,
            toolsUsed: ['sf_query'],
            responsePattern: template.responseTemplate,
            successCount: 1,
            lastUsed: new Date(),
          });

          return template;
        }
      }
    }

    return null;
  }

  /**
   * Execute deterministic query directly (bypasses LLM entirely)
   */
  async executeDeterministicQuery(
    template: DeterministicTemplate,
    executeSOQL: (soql: string) => Promise<any>
  ): Promise<{
    success: boolean;
    response: string;
    data: any;
    visualization: string;
    title: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();

    try {
      const result = await executeSOQL(template.soql);
      const latencyMs = Date.now() - startTime;

      this.logger.log(`[DETERMINISTIC] Executed in ${latencyMs}ms: "${template.title}"`);

      return {
        success: true,
        response: template.responseTemplate,
        data: result,
        visualization: template.visualization,
        title: template.title,
        latencyMs,
      };
    } catch (error) {
      return {
        success: false,
        response: `Error executing query: ${error.message}`,
        data: null,
        visualization: 'table',
        title: template.title,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Plan parallel execution for multiple tool calls
   */
  planParallelExecution(toolCalls: Array<{ name: string; args: any }>): ExecutionPlan {
    this.stats.parallelExecutions++;
    return this.llmCompiler.planExecution(toolCalls);
  }

  /**
   * Execute tools in parallel according to DAG
   */
  async executeParallel(
    plan: ExecutionPlan,
    toolExecutor: (name: string, args: any) => Promise<any>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, any>> {
    const estimate = this.llmCompiler.estimateTimeSavings(plan);
    this.logger.log(`[PARALLEL] Executing ${plan.nodes.size} tools, estimated savings: ${estimate.savingsPercent.toFixed(0)}%`);

    const results = await this.llmCompiler.executePlan(plan, toolExecutor, onProgress);

    // Update stats
    this.stats.avgLatencySaved =
      (this.stats.avgLatencySaved * (this.stats.parallelExecutions - 1) + estimate.savings) /
      this.stats.parallelExecutions;

    return results;
  }

  /**
   * Normalize query for cache lookup
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ');     // Normalize whitespace
  }

  /**
   * Cache query fingerprint with LRU eviction
   */
  private cacheFingerprint(key: string, fingerprint: QueryFingerprint): void {
    // Evict oldest entries if cache is full
    if (this.fingerprintCache.size >= this.maxCacheSize) {
      const entries = Array.from(this.fingerprintCache.entries());
      entries.sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime());

      // Remove oldest 10%
      const toRemove = Math.floor(this.maxCacheSize * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.fingerprintCache.delete(entries[i][0]);
      }
    }

    this.fingerprintCache.set(key, fingerprint);
  }

  /**
   * Get optimization statistics
   */
  getStats(): typeof this.stats & {
    deterministicRate: number;
    cacheHitRate: number;
    templateCount: number;
    cacheSize: number;
  } {
    const total = this.stats.totalQueries || 1;
    return {
      ...this.stats,
      deterministicRate: (this.stats.deterministicHits / total) * 100,
      cacheHitRate: (this.stats.cacheHits / total) * 100,
      templateCount: DETERMINISTIC_TEMPLATES.length,
      cacheSize: this.fingerprintCache.size,
    };
  }

  /**
   * Record a query (for statistics)
   */
  recordQuery(usedDeterministic: boolean, usedCache: boolean): void {
    this.stats.totalQueries++;
    if (!usedDeterministic && !usedCache) {
      this.stats.llmFallbacks++;
    }
  }

  /**
   * Check if query is a simple greeting (super fast path)
   */
  isGreeting(query: string): boolean {
    const greetingPatterns = [
      /^(hi|hello|hey|greetings?|good\s*(morning|afternoon|evening))[\s!.]*$/i,
      /^(thanks?|thank\s*you|thx)[\s!.]*$/i,
      /^(bye|goodbye|see\s*you|later)[\s!.]*$/i,
    ];
    return greetingPatterns.some(p => p.test(query.trim()));
  }

  /**
   * Get quick response for greeting (no LLM needed)
   */
  getGreetingResponse(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('morning')) return 'Good morning! How can I help with your sales pipeline today?';
    if (q.includes('afternoon')) return 'Good afternoon! What would you like to know about your CRM?';
    if (q.includes('evening')) return 'Good evening! Ready to help with your sales data.';
    if (q.includes('thank')) return 'You\'re welcome! Let me know if you need anything else.';
    if (q.includes('bye') || q.includes('later')) return 'Goodbye! Have a great day.';
    return 'Hello! How can I help you today?';
  }
}
