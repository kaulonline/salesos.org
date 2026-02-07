// Intelligent Tool Router - Fast intent classification and tool selection
// Reduces 70 tools to relevant clusters for faster LLM responses

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';

// Tool categories with their associated tools
export const TOOL_CLUSTERS = {
  // Simple read operations - fastest
  search: {
    tools: ['sf_query', 'sf_search', 'sf_get_record', 'sf_describe_object'],
    model: 'fast', // Haiku
    description: 'Search and retrieve CRM records',
  },

  // Create operations
  create: {
    tools: [
      'sf_create_lead', 'sf_create_contact', 'sf_create_account',
      'sf_create_opportunity', 'sf_create_task', 'sf_create_record',
    ],
    model: 'fast',
    description: 'Create new CRM records',
  },

  // Update operations
  update: {
    tools: [
      'sf_update_record', 'sf_update_lead', 'sf_update_contact',
      'sf_update_opportunity', 'sf_get_record', 'sf_describe_object',
    ],
    model: 'fast',
    description: 'Update existing CRM records',
  },

  // Delete operations
  delete: {
    tools: ['sf_delete_record', 'sf_get_record'],
    model: 'fast',
    description: 'Delete CRM records',
  },

  // Research - needs more capability
  research: {
    tools: [
      'research_company', 'web_search', 'sf_search', 'sf_query',
    ],
    model: 'full', // Sonnet for complex research synthesis
    description: 'Research companies with web and CRM data',
  },

  // Bulk operations
  bulk: {
    tools: [
      'sf_bulk_create', 'sf_bulk_update', 'sf_bulk_delete',
      'sf_get_record_count', 'sf_query',
    ],
    model: 'fast',
    description: 'Bulk CRM operations',
  },

  // Admin/Config operations
  admin: {
    tools: [
      'sf_list_objects', 'sf_describe_object', 'sf_list_users',
      'sf_list_profiles', 'sf_list_permission_sets', 'sf_tooling_query',
      'sf_list_custom_fields', 'sf_list_validation_rules', 'sf_list_flows',
      'sf_list_apex_classes', 'sf_list_triggers', 'sf_get_org_info',
      'sf_list_roles', 'sf_list_groups', 'sf_list_queues',
    ],
    model: 'fast',
    description: 'Salesforce admin and configuration',
  },

  // Schema/metadata operations
  schema: {
    tools: [
      'sf_describe_object', 'sf_list_objects', 'sf_list_custom_fields',
      'sf_create_custom_field', 'sf_create_custom_object',
      'sf_update_custom_field', 'sf_delete_custom_field',
    ],
    model: 'fast',
    description: 'Schema and metadata operations',
  },

  // Permission operations
  permissions: {
    tools: [
      'sf_list_permission_sets', 'sf_list_profiles', 'sf_assign_permission_set',
      'sf_create_permission_set', 'sf_revoke_permission_set',
      'sf_add_field_permission_to_permset', 'sf_add_object_permission_to_permset',
    ],
    model: 'fast',
    description: 'Permission and security operations',
  },

  // Analytics/reporting
  analytics: {
    tools: [
      'sf_query', 'sf_get_record_count', 'sf_list_reports',
      'sf_run_report', 'sf_list_dashboards',
    ],
    model: 'fast',
    description: 'Analytics and reporting',
  },

  // IRISRank prioritization - AI-powered entity ranking
  prioritize: {
    tools: [
      'iris_rank_entities', 'iris_get_at_risk', 'iris_get_momentum',
      'iris_explain_rank', 'get_hot_opportunities', 'sf_query',
    ],
    model: 'fast',
    description: 'Prioritize and rank entities by network importance, engagement, and pipeline value',
  },

  // AI Coaching & Insights (MVP #1 & #2)
  coaching: {
    tools: [
      'get_sales_coaching', 'get_my_ai_insights', 'get_deal_health',
      'get_account_intelligence', 'acknowledge_ai_insight', 'dismiss_ai_insight',
      // Video coaching tools (MVP #2 Enhancement)
      'list_coaching_sessions', 'get_coaching_session', 'get_coaching_progress', 'get_coaching_scenarios',
    ],
    model: 'fast',
    description: 'AI sales coaching, performance analysis, video practice, and insights',
  },

  // Email operations
  email: {
    tools: [
      'send_email', 'send_email_draft', 'get_email_threads',
      'get_awaiting_responses', 'get_thread_messages', 'get_email_drafts',
      'sf_query', 'sf_search', 'sf_get_record',
    ],
    model: 'fast',
    description: 'Email composition, drafts, and communication',
  },

  // Task operations - both Salesforce and local IRIS tasks
  task: {
    tools: [
      'get_iris_task', 'list_iris_tasks', 'sf_create_task',
      'complete_task', 'update_task',
      'sf_query', 'sf_search', 'sf_get_record', 'sf_update_record',
    ],
    model: 'fast',
    description: 'Task management - view, create, update, and complete tasks',
  },

  // Meeting operations (schedule, list, cancel, RSVP)
  meeting: {
    tools: [
      'schedule_meeting', 'list_meetings', 'cancel_meeting',
      'get_meeting_rsvp_status', 'get_meeting_participants',
      'get_meeting_details', 'get_meeting_response_history',
      'get_upcoming_meetings', 'update_meeting_rsvp', 'resend_meeting_invite',
      'sf_create_task', 'sf_query', 'sf_search',
    ],
    model: 'fast',
    description: 'Schedule, list, cancel, and manage video meetings',
  },

  // Full toolset fallback
  full: {
    tools: [], // Will use all tools
    model: 'full',
    description: 'Complex multi-step operations',
  },
};

// Intent patterns for fast regex-based classification (no LLM call needed)
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: string; priority: number }> = [
  // Highest priority - AI Coaching patterns (priority 13 to ensure they're checked first)
  { pattern: /\b(coach(ing)?|coaching\s+tips?|sales\s+tips?|how\s+am\s+i\s+doing|my\s+performance|analyze\s+my\s+performance|personalized\s+tips?)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(what\s+can\s+i\s+improve|help\s+me\s+close|improve\s+my\s+sales|sales\s+advice)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(ai\s+insights?|my\s+insights?|what\s+should\s+i\s+focus|recommendations?\s+for\s+me)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(deal\s+health|pipeline\s+health|stalled\s+deals?|deals?\s+at\s+risk|which\s+deals?\s+(need|require)\s+attention)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(account\s+intelligence|account\s+health|how\s+is\s+\w+\s+doing)\b/i, intent: 'coaching', priority: 12 },
  // Video coaching patterns
  { pattern: /\b(coaching\s+sessions?|practice\s+sessions?|my\s+recordings?|sales\s+practice|video\s+coaching)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(coaching\s+progress|am\s+i\s+(getting|improving)|practice\s+stats?|coaching\s+score)\b/i, intent: 'coaching', priority: 13 },
  { pattern: /\b(what\s+(should\s+i|can\s+i)\s+practice|coaching\s+scenarios?|types?\s+of\s+practice)\b/i, intent: 'coaching', priority: 13 },

  // Highest priority - IRISRank prioritization patterns
  { pattern: /\b(prioritize|rank|ranking|priority|important|importance|focus\s+on|at\s*risk|momentum|hot\s+leads?|hot\s+opport|hot\s+deals?|warm\s+leads?|engagement)\b/i, intent: 'prioritize', priority: 11 },
  { pattern: /\b(iris\s*rank|network\s+importance|activity\s+signals?|who\s+should\s+i\s+(contact|call|focus))\b/i, intent: 'prioritize', priority: 11 },
  { pattern: /\b(which\s+(leads?|contacts?|accounts?|opportunities?)\s+(should|to)\s+(i\s+)?(prioritize|focus|contact))\b/i, intent: 'prioritize', priority: 11 },
  { pattern: /\b(what\s+(deals?|accounts?|leads?)\s+(are\s+)?at\s*risk)\b/i, intent: 'prioritize', priority: 11 },
  { pattern: /\b(losing\s+touch|need\s+attention|declining|stalled)\b/i, intent: 'prioritize', priority: 10 },

  // High priority - Email patterns (priority 11 to ensure detection)
  { pattern: /\b(send|compose|write|draft|email|mail)\s+(a\s+)?(an\s+)?(email|message|note)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(email|e-mail|mail)\s+(to|about|regarding)\b/i, intent: 'email', priority: 11 },
  { pattern: /\bemail\s+(him|her|them|this|that|the)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(send|shoot|fire\s*off)\s+(an?\s+)?(email|message)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(get|show|list|check)\s+(my\s+)?(email|emails|inbox|drafts?|threads?)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(awaiting|waiting|pending)\s+(for\s+)?(a\s+)?(response|reply|responses|replies)\b/i, intent: 'email', priority: 11 },
  { pattern: /\bemails?\s+(waiting|awaiting|pending|overdue)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(overdue|follow.?up)\s+(emails?|messages?)\b/i, intent: 'email', priority: 11 },
  { pattern: /\b(follow\s*up|followup)\s+(email|message)?\b/i, intent: 'email', priority: 10 },
  { pattern: /\bsend.*email/i, intent: 'email', priority: 11 },
  { pattern: /\bemail.*send/i, intent: 'email', priority: 11 },

  // High priority - Task patterns (priority 11 to ensure detection)
  { pattern: /\btask\s+(with\s+)?id\s+\w+/i, intent: 'task', priority: 12 },
  { pattern: /\b(show|get|find)\s+(me\s+)?(details?\s+)?(about\s+)?(the\s+)?task/i, intent: 'task', priority: 11 },
  { pattern: /\b(overdue|pending|incomplete)\s+tasks?\b/i, intent: 'task', priority: 11 },
  { pattern: /\btasks?\s+(overdue|pending|due|incomplete)\b/i, intent: 'task', priority: 11 },
  { pattern: /\b(list|show|get)\s+(my\s+)?(all\s+)?(the\s+)?tasks\b/i, intent: 'task', priority: 11 },
  { pattern: /\bcomplete\s+(the\s+)?task\b/i, intent: 'task', priority: 11 },

  // High priority - Meeting scheduling patterns (priority 12 to ensure detection)
  { pattern: /\b(schedule|setup|set\s*up|book|create|arrange)\s+(a\s+)?(zoom|teams|meet|meeting|call|video\s*call)\b/i, intent: 'meeting', priority: 12 },
  { pattern: /\b(zoom|teams|google\s*meet)\s+(meeting|call)\b/i, intent: 'meeting', priority: 12 },
  { pattern: /\bmeeting\s+(with|for|at|on|tomorrow|next)\b/i, intent: 'meeting', priority: 11 },
  { pattern: /\b(book|schedule)\s+(a\s+)?(demo|call|meeting)\b/i, intent: 'meeting', priority: 11 },
  { pattern: /\bvideo\s*(call|conference|meeting)\b/i, intent: 'meeting', priority: 11 },
  // Meeting cancel/delete/list patterns (priority 12 to ensure detection)
  { pattern: /\b(cancel|delete|remove)\s+(the\s+)?(my\s+)?(all\s+)?(these\s+)?(meetings?|calls?|zoom|teams)\b/i, intent: 'meeting', priority: 12 },
  { pattern: /\b(cancel|delete)\s+.*meetings?\b/i, intent: 'meeting', priority: 12 },
  { pattern: /\bmeetings?.*\b(cancel|delete|remove)\b/i, intent: 'meeting', priority: 12 },
  { pattern: /\b(list|show|get)\s+(my\s+)?(all\s+)?(meetings?|scheduled\s+calls?)\b/i, intent: 'meeting', priority: 11 },
  { pattern: /\b(rsvp|response|attendee|participant)\s+(status|for|of)\s+(the\s+)?meetings?\b/i, intent: 'meeting', priority: 11 },
  { pattern: /\bwho\s+(is|are)\s+(invited|attending|coming)\s+(to\s+)?(the\s+)?meetings?\b/i, intent: 'meeting', priority: 11 },

  // High priority - specific actions
  { pattern: /^(show|list|get|display|find|search|what|who)\s+(my\s+)?(all\s+)?(leads?|contacts?|accounts?|opportunities?|tasks?)/i, intent: 'search', priority: 10 },
  { pattern: /^(search|find|look\s*up)\s+(for\s+)?/i, intent: 'search', priority: 9 },
  { pattern: /^(create|add|new|make)\s+(a\s+)?(new\s+)?(lead|contact|account|opportunity|task)/i, intent: 'create', priority: 10 },
  { pattern: /^(update|edit|change|modify|set)\s+/i, intent: 'update', priority: 10 },
  { pattern: /^(delete|remove)\s+/i, intent: 'delete', priority: 10 },
  { pattern: /^research\s+/i, intent: 'research', priority: 10 },
  { pattern: /^(bulk|mass|batch)\s+(create|update|delete|import)/i, intent: 'bulk', priority: 10 },

  // Admin patterns
  { pattern: /^(list|show|get)\s+(all\s+)?(users?|profiles?|permission\s*sets?|roles?|groups?)/i, intent: 'admin', priority: 9 },
  { pattern: /(permission|access|security|profile)/i, intent: 'permissions', priority: 7 },
  { pattern: /(custom\s*field|custom\s*object|schema|metadata|describe)/i, intent: 'schema', priority: 8 },
  { pattern: /(report|dashboard|analytics|metrics|forecast)/i, intent: 'analytics', priority: 7 },
  { pattern: /(flow|trigger|apex|validation\s*rule|workflow)/i, intent: 'admin', priority: 8 },
  { pattern: /(org\s*info|org\s*details|salesforce\s*org)/i, intent: 'admin', priority: 8 },

  // Lower priority - general patterns
  { pattern: /leads?/i, intent: 'search', priority: 3 },
  { pattern: /contacts?/i, intent: 'search', priority: 3 },
  { pattern: /accounts?/i, intent: 'search', priority: 3 },
  { pattern: /opportunities?/i, intent: 'search', priority: 3 },
];

export interface IntentClassification {
  intent: string;
  confidence: number;
  tools: string[];
  model: 'fast' | 'full';
  method: 'pattern' | 'llm' | 'cache';
  latencyMs: number;
}

@Injectable()
export class ToolRouterService {
  private readonly logger = new Logger(ToolRouterService.name);
  private readonly client: AzureOpenAI;
  private readonly fastModelId: string;

  // Intent cache for repeated queries
  private intentCache: Map<string, { classification: IntentClassification; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 500;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT', '');
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY', '');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2025-01-01-preview');
    this.fastModelId = 'gpt-4o-mini';

    this.client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });

    this.logger.log(`ToolRouter initialized with fast model: ${this.fastModelId}`);
  }

  /**
   * Classify user intent and return optimal tool cluster
   * Uses 3-tier approach: Cache → Pattern → LLM
   */
  async classifyIntent(query: string): Promise<IntentClassification> {
    const startTime = Date.now();
    const normalizedQuery = query.toLowerCase().trim();

    // Tier 1: Check cache first (0ms)
    const cacheKey = this.generateCacheKey(normalizedQuery);
    const cached = this.intentCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`[ROUTER] Cache hit for: "${query.substring(0, 50)}..."`);
      return {
        ...cached.classification,
        method: 'cache',
        latencyMs: Date.now() - startTime,
      };
    }

    // Tier 2: Pattern matching (0-1ms)
    const patternResult = this.classifyByPattern(normalizedQuery);
    if (patternResult.confidence >= 0.8) {
      const classification: IntentClassification = {
        ...patternResult,
        method: 'pattern',
        latencyMs: Date.now() - startTime,
      };
      this.cacheIntent(cacheKey, classification);
      this.logger.log(`[ROUTER] Pattern match: intent=${classification.intent}, tools=${classification.tools.length}, ${classification.latencyMs}ms`);
      return classification;
    }

    // Tier 3: LLM classification for ambiguous queries (~200-500ms)
    const llmResult = await this.classifyByLLM(query);
    const classification: IntentClassification = {
      ...llmResult,
      method: 'llm',
      latencyMs: Date.now() - startTime,
    };
    this.cacheIntent(cacheKey, classification);
    this.logger.log(`[ROUTER] LLM classify: intent=${classification.intent}, tools=${classification.tools.length}, ${classification.latencyMs}ms`);
    return classification;
  }

  /**
   * Fast pattern-based classification
   */
  private classifyByPattern(query: string): Omit<IntentClassification, 'method' | 'latencyMs'> {
    let bestMatch: { intent: string; priority: number } | null = null;

    for (const { pattern, intent, priority } of INTENT_PATTERNS) {
      if (pattern.test(query)) {
        if (!bestMatch || priority > bestMatch.priority) {
          bestMatch = { intent, priority };
        }
      }
    }

    if (bestMatch) {
      const cluster = TOOL_CLUSTERS[bestMatch.intent] || TOOL_CLUSTERS.full;
      return {
        intent: bestMatch.intent,
        confidence: bestMatch.priority >= 8 ? 0.95 : bestMatch.priority >= 5 ? 0.8 : 0.6,
        tools: cluster.tools,
        model: cluster.model as 'fast' | 'full',
      };
    }

    // Default to search for unrecognized queries
    return {
      intent: 'search',
      confidence: 0.5,
      tools: TOOL_CLUSTERS.search.tools,
      model: 'fast',
    };
  }

  /**
   * LLM-based classification for ambiguous queries
   */
  private async classifyByLLM(query: string): Promise<Omit<IntentClassification, 'method' | 'latencyMs'>> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.fastModelId,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: `Classify this CRM query into ONE category. Reply with ONLY the category name.

Categories:
- email: Email operations - send, draft, check inbox, awaiting response, follow-ups, overdue emails
- task: Task operations - view task details, list tasks, overdue tasks, pending tasks, complete tasks
- meeting: Meeting operations - schedule, list, cancel, RSVP, participants, video calls
- search: Find/list/show CRM records (leads, contacts, accounts, opportunities)
- create: Create new CRM records
- update: Update existing CRM records
- delete: Delete CRM records
- research: Research company with web/financial data
- prioritize: Rank/prioritize leads, hot leads, at-risk deals, engagement scores
- bulk: Bulk/batch operations
- admin: Users, profiles, permissions, org config
- schema: Custom fields, objects, metadata
- analytics: Reports, dashboards, metrics
- full: Complex multi-step operations

Query: "${query}"

Category:`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const intent = content.trim().toLowerCase().replace(/[^a-z]/g, '');
        const cluster = TOOL_CLUSTERS[intent] || TOOL_CLUSTERS.full;
        return {
          intent: intent || 'full',
          confidence: 0.85,
          tools: cluster.tools,
          model: cluster.model as 'fast' | 'full',
        };
      }
    } catch (error) {
      this.logger.warn(`LLM classification failed: ${error.message}`);
    }

    // Fallback to full toolset
    return {
      intent: 'full',
      confidence: 0.5,
      tools: [],
      model: 'full',
    };
  }

  /**
   * Generate cache key from normalized query
   */
  private generateCacheKey(query: string): string {
    // Normalize query for better cache hits
    return query
      .replace(/\s+/g, ' ')
      .replace(/['"]/g, '')
      .substring(0, 100);
  }

  /**
   * Cache intent classification
   */
  private cacheIntent(key: string, classification: IntentClassification): void {
    // Evict old entries if cache is full
    if (this.intentCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.intentCache.keys().next().value;
      if (oldestKey) this.intentCache.delete(oldestKey);
    }
    this.intentCache.set(key, { classification, timestamp: Date.now() });
  }

  /**
   * Get tools for a specific cluster
   */
  getClusterTools(intent: string): string[] {
    return TOOL_CLUSTERS[intent]?.tools || [];
  }

  /**
   * Check if intent should use fast model
   */
  shouldUseFastModel(intent: string): boolean {
    return TOOL_CLUSTERS[intent]?.model === 'fast';
  }

  /**
   * Clear intent cache
   */
  clearCache(): void {
    this.intentCache.clear();
    this.logger.log('Intent cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.intentCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMs: this.CACHE_TTL,
    };
  }
}
