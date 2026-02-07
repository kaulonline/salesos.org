/**
 * Query Router Service - SLM + LLM Cascade Architecture
 * 
 * This service implements a "Small Language Model" (SLM) routing pattern inspired by
 * Google's approach to fast AI responses. It uses a lightweight model to classify
 * incoming queries and route them appropriately:
 * 
 * - Simple queries (greetings, CRM reads, simple lookups) → Fast small model
 * - Complex queries (research, analysis, multi-step reasoning) → Full large model
 * 
 * Benefits:
 * - 2-4x faster responses for 60-70% of queries
 * - Lower cost (small model is cheaper)
 * - Better user experience with instant responses for simple tasks
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { LocalSLMService } from './local-slm.service';

export type QueryComplexity = 'simple' | 'moderate' | 'complex';

export type QueryCategory =
  | 'greeting'           // Hello, Hi, How are you
  | 'crm-read'           // Show leads, list opportunities, get details
  | 'crm-write'          // Create lead, update opportunity, delete
  | 'crm-analysis'       // Analyze pipeline, forecast, at-risk deals
  | 'research'           // Company research, web search, news
  | 'document'           // Document search, PDF queries
  | 'email'              // Send email, draft email, email tracking
  | 'meeting'            // Schedule meeting, calendar
  | 'sf-admin'           // Salesforce admin: validation rules, workflows, page layouts, apex, lwc
  | 'general-qa'         // General questions, explanations
  | 'multi-step';        // Complex multi-tool queries

export interface QueryClassification {
  complexity: QueryComplexity;
  category: QueryCategory;
  confidence: number;
  requiresTools: boolean;
  suggestedTools: string[];
  reasoning: string;
}

export interface RoutingDecision {
  useSmallModel: boolean;
  modelId: string;
  toolSubset: string[] | null;  // null = use all tools
  systemPromptKey: 'full' | 'minimal' | 'crm-only' | 'research-only';
  skipMetadataExtraction: boolean;
}

// Tool groups for selective loading
export const TOOL_GROUPS = {
  'crm-read': [
    'search_leads', 'get_lead_details', 'get_top_leads',
    'search_opportunities', 'get_opportunity_details', 'get_pipeline_stats',
    'search_accounts', 'get_account_details',
    'search_contacts', 'get_contact_details',
    'search_quotes', 'get_quote_details',
    'search_contracts', 'get_contract_details',
    'get_my_tasks', 'get_activity_timeline',
    'get_forecast', 'get_at_risk_opportunities', 'get_recommended_actions',
    'get_account_signals', 'get_my_ai_insights',
  ],
  'crm-write': [
    'create_lead', 'update_lead', 'delete_lead', 'qualify_lead', 'convert_lead',
    'create_opportunity', 'update_opportunity', 'delete_opportunity', 'close_opportunity', 'analyze_opportunity',
    'create_account', 'update_account', 'delete_account',
    'create_contact', 'update_contact', 'delete_contact',
    'create_task', 'update_task', 'complete_task', 'delete_task',
    'log_activity', 'create_note', 'get_notes', 'delete_note',
  ],
  'quotes-contracts': [
    'search_quotes', 'get_quote_details', 'create_quote', 'update_quote', 'delete_quote',
    'search_contracts', 'get_contract_details', 'create_contract', 'update_contract',
    'search_campaigns', 'get_campaign_details', 'get_campaign_roi',
  ],
  'research': [
    'web_search', 'research_company', 'search_company_news',
    'search_leadership', 'search_competitors',
  ],
  'document': [
    'list_indexed_documents', 'search_document', 'get_document_summary',
  ],
  'email': [
    'send_email', 'get_email_threads', 'get_awaiting_responses',
    'get_thread_messages', 'get_email_drafts', 'send_email_draft',
  ],
  'meeting': [
    'schedule_meeting', 'get_upcoming_meetings', 'list_meetings', 'get_meeting_details',
    'get_meeting_rsvp_status', 'get_meeting_participants', 'update_meeting_rsvp',
    'cancel_meeting', 'get_meeting_response_history', 'resend_meeting_invite',
    'check_meeting_availability',
  ],
  'sf-admin': [
    // Validation Rules
    'sf_list_validation_rules', 'sf_create_validation_rule', 'sf_update_validation_rule',
    'sf_delete_validation_rule', 'sf_toggle_validation_rule',
    // Page Layouts
    'sf_list_page_layouts', 'sf_create_page_layout', 'sf_update_page_layout', 'sf_assign_page_layout',
    // Workflow Rules
    'sf_list_workflow_rules', 'sf_create_workflow_rule', 'sf_delete_workflow_rule',
    // Apex Deployment
    'sf_deploy_apex_class', 'sf_deploy_apex_trigger', 'sf_get_apex_class',
    'sf_run_apex_tests', 'sf_delete_apex_class',
    // Lightning Web Components
    'sf_deploy_lwc', 'sf_list_lwc_components', 'sf_delete_lwc',
    // Approval Processes
    'sf_list_approval_processes', 'sf_create_approval_process', 'sf_toggle_approval_process',
    'sf_submit_for_approval', 'sf_process_approval',
    // Reports & Dashboards
    'sf_list_reports', 'sf_create_report', 'sf_run_report', 'sf_update_report', 'sf_delete_report',
    'sf_list_report_folders', 'sf_get_report_types',
    'sf_list_dashboards', 'sf_get_dashboard_metadata', 'sf_refresh_dashboard', 'sf_delete_dashboard',
    // Fields & Objects
    'sf_list_fields', 'sf_describe_field', 'sf_create_field', 'sf_update_field', 'sf_delete_field',
    'sf_list_objects', 'sf_describe_object',
  ],
};

// Keywords for fast classification (no LLM needed)
// PERFORMANCE: Expanded patterns to avoid LLM classification calls for common queries
const SIMPLE_PATTERNS = {
  // Greetings - instant response, no tools needed
  greeting: /^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|greetings|thanks|thank\s*you|bye|goodbye)\b/i,

  // CRM Read Operations - fast path with read-only tools
  showLeads: /^(show|list|get|display|find|view)\s*(me\s*)?(my\s*)?(all\s*)?(top\s*)?(recent\s*)?(leads?|prospects?)/i,
  showOpportunities: /^(show|list|get|display|find|view)\s*(me\s*)?(my\s*)?(all\s*)?(open\s*)?(deals?|opportunities?|pipeline)/i,
  showTasks: /^(show|list|get|what\s*are|view)\s*(me\s*)?(my\s*)?(open\s*)?(overdue\s*)?(tasks?|to-?dos?|action\s*items?)/i,
  showAccounts: /^(show|list|get|display|find|view)\s*(me\s*)?(my\s*)?(all\s*)?(accounts?|customers?|clients?|companies?)/i,
  showContacts: /^(show|list|get|display|find|view)\s*(me\s*)?(my\s*)?(all\s*)?(contacts?|people)/i,
  showActivities: /^(show|list|get|display|view)\s*(me\s*)?(my\s*)?(recent\s*)?(activities?|timeline|history)/i,
  showSignals: /^(show|list|get|display|view|what)\s*(me\s*)?(my\s*)?(all\s*)?(account\s*)?(signals?|alerts?|insights?|activity|notifications?)/i,

  // Pipeline/Stats queries - fast path
  pipelineStats: /^(how|what|show).*\s*(pipeline|deals?|opportunities?)\s*(look|doing|status|stats|health|summary)/i,
  forecast: /^(what|show|get)\s*(is|me)?\s*(the\s*)?(forecast|revenue|projection)/i,

  // Simple lookups by entity
  getDetails: /^(get|show|what\s*(is|are)|tell\s*me\s*about)\s*(the\s*)?(details?|info|information)\s*(for|about|on)/i,

  // CRM Write Operations - need write tools but still simple intent
  createLead: /^(create|add|new|make)\s*(a\s*)?(new\s*)?(lead|prospect)\s+(for|named|called|at)?/i,
  createTask: /^(create|add|new|make|schedule)\s*(a\s*)?(new\s*)?(task|reminder|to-?do)\s*(for|to|about)?/i,
  createOpportunity: /^(create|add|new|make)\s*(a\s*)?(new\s*)?(opportunity|deal)\s*(for|with|at)?/i,
  updateRecord: /^(update|change|modify|edit|set)\s+(the\s*)?(lead|opportunity|account|contact|task)/i,

  // Email operations
  sendEmail: /^(send|compose|draft|write)\s*(a\s*)?(an?\s*)?(email|message|mail)\s*(to)?/i,
  checkEmails: /^(show|check|get|what)\s*(me\s*)?(all\s*)?(my\s*)?(the\s*)?(emails?|inbox|messages?|awaiting|pending|waiting|overdue|follow.?up)/i,

  // Meeting operations
  scheduleMeeting: /^(schedule|book|create|set\s*up)\s*(a\s*)?(meeting|call|zoom|teams)/i,
  meetingRsvp: /^(show|get|check|what)\s*(is|are)?\s*(the\s*)?(rsvp|response|participant|attendee)/i,
  meetingParticipants: /^(who|list|show|get)\s*(is|are)?\s*(the\s*)?(invited|attending|participants?|attendees?)/i,
  cancelMeeting: /\b(cancel|delete|remove)\s*(the\s*)?(my\s*)?(all\s*)?(these\s*)?(meetings?|calls?|events?)/i,
  listMeetings: /\b(list|show|get)\s*(my\s*)?(all\s*)?(the\s*)?(meetings?|scheduled\s+calls?)/i,

  // Salesforce Admin operations - validation rules, workflows, page layouts, etc.
  sfValidationRule: /\b(create|add|make|update|delete|remove|list|show|toggle|activate|deactivate)\s*(a\s*)?(new\s*)?(salesforce\s*)?(validation\s+rule)/i,
  sfWorkflowRule: /\b(create|add|make|update|delete|remove|list|show)\s*(a\s*)?(new\s*)?(salesforce\s*)?(workflow\s+rule|workflow)/i,
  sfApprovalProcess: /\b(create|add|make|update|delete|remove|list|show|submit|approve|reject)\s*(a\s*)?(new\s*)?(salesforce\s*)?(approval\s+process|approval)/i,
  sfPageLayout: /\b(create|add|make|update|delete|remove|list|show|assign)\s*(a\s*)?(new\s*)?(salesforce\s*)?(page\s+layout|layout)/i,
  sfApexClass: /\b(create|deploy|delete|remove|list|show|test)\s*(a\s*)?(new\s*)?(salesforce\s*)?(apex\s+class|apex\s+trigger|apex\s+code|apex)/i,
  sfLwc: /\b(create|deploy|delete|remove|list|show)\s*(a\s*)?(new\s*)?(salesforce\s*)?(lwc|lightning\s+web\s+component|lightning\s+component)/i,
  sfReport: /\b(create|run|delete|remove|list|show|update)\s*(a\s*)?(new\s*)?(salesforce\s*)?(report|dashboard)/i,
  sfField: /\b(create|add|delete|remove|list|show|describe)\s*(a\s*)?(new\s*)?(salesforce\s*)?(custom\s+field|field|picklist)/i,
  // Generic Salesforce metadata operations
  sfMetadata: /\b(prevent|require|enforce|validate)\s+.*(on|for)\s+(opportunity|lead|account|contact|case|task)/i,

  // Simple questions that can be answered quickly
  simpleQuestion: /^(what|who|when|where|how\s+many|how\s+much|is\s+there|are\s+there|do\s+i\s+have)\s+/i,
  whatToDo: /^(what\s+should\s+i|what\s+do\s+i\s+need\s+to|what's\s+next|what\s+are\s+my\s+priorities)/i,
};

const COMPLEX_PATTERNS = {
  // Match "research" followed by any content (company name, domain, etc.)
  research: /^research\s+.+/i,
  multiStep: /(and\s+then|after\s+that|also|additionally|furthermore|create.*and.*send|find.*and.*update)/i,
  // Company financial/business analysis - should route to research, NOT crm-analysis
  // Matches: "Analyze Amex's financial performance", "Analyze Amex's recent financial performance", "analyze Apple stock", "analyze Tesla revenue"
  companyFinancialAnalysis: /(analyze|analysis|assess)\s+.{0,50}?(financial|stock|revenue|earnings|market\s+(cap|share|position)|business\s+performance|financials|quarterly|annual|q[1-4]|fy\d{2,4})/i,
  // CRM-specific analysis - deals, pipeline, opportunities in your CRM
  crmAnalysis: /(analyze|compare|evaluate|assess|forecast|predict|recommend|suggest\s+strategy).*(pipeline|deal|opportunity|lead|account|contact|my\s|our\s)/i,
  // Generic analysis fallback (only if not company financial)
  analysis: /(analyze|compare|evaluate|assess|forecast|predict|recommend|suggest\s+strategy)/i,
  longForm: /(write|draft|compose|create)\s*(a|an|the)?\s*(detailed|comprehensive|full|complete)/i,
  // Also match these keywords anywhere in the message
  researchKeywords: /(investigate|deep\s*dive|comprehensive\s+report|detailed\s+report)\s+(on|about|for)\s+/i,
};

@Injectable()
export class QueryRouterService {
  private readonly logger = new Logger(QueryRouterService.name);
  private readonly client: AzureOpenAI;
  private readonly smallModelId: string;
  private readonly largeModelId: string;
  private readonly routerEnabled: boolean;
  private readonly useLocalSLM: boolean;

  // Cache for recent classifications to avoid repeated LLM calls
  private classificationCache = new Map<string, { result: QueryClassification; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly localSLM?: LocalSLMService,
  ) {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT', '');
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY', '');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2025-01-01-preview');

    // Small model for routing (GPT-4o-mini is fast and cheaper)
    this.smallModelId = 'gpt-4o-mini';
    // Large model for complex queries
    this.largeModelId = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o');
    // Feature flag to enable/disable routing
    this.routerEnabled = this.configService.get<string>('ENABLE_QUERY_ROUTER', 'true') === 'true';
    // Use local SLM for classification if available
    this.useLocalSLM = this.configService.get<string>('USE_LOCAL_SLM_ROUTER', 'true') === 'true';

    this.client = new AzureOpenAI({
      apiKey,
      endpoint,
      apiVersion,
    });

    this.logger.log(`Query Router initialized - Small: ${this.smallModelId}, Large: ${this.largeModelId}, Enabled: ${this.routerEnabled}, LocalSLM: ${this.useLocalSLM}`);
  }

  /**
   * Fast pattern-based classification (no LLM call needed)
   * Returns null if patterns don't match and LLM classification is needed
   * PERFORMANCE: Expanded to handle ~80% of common queries without LLM call
   */
  private fastClassify(message: string): QueryClassification | null {
    const trimmedMessage = message.trim();

    // Check for simple patterns first - greetings (no tools needed)
    if (SIMPLE_PATTERNS.greeting.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'greeting',
        confidence: 0.95,
        requiresTools: false,
        suggestedTools: [],
        reasoning: 'Matched greeting pattern',
      };
    }

    // CRM Read Operations - fast path with read-only tools
    if (SIMPLE_PATTERNS.showLeads.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['search_leads', 'get_top_leads'],
        reasoning: 'Matched show leads pattern',
      };
    }

    if (SIMPLE_PATTERNS.showOpportunities.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['search_opportunities', 'get_pipeline_stats'],
        reasoning: 'Matched show opportunities pattern',
      };
    }

    if (SIMPLE_PATTERNS.showTasks.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['get_my_tasks'],
        reasoning: 'Matched show tasks pattern',
      };
    }

    if (SIMPLE_PATTERNS.showAccounts.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['search_accounts', 'get_account_details'],
        reasoning: 'Matched show accounts pattern',
      };
    }

    if (SIMPLE_PATTERNS.showContacts.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['search_contacts', 'get_contact_details'],
        reasoning: 'Matched show contacts pattern',
      };
    }

    if (SIMPLE_PATTERNS.showActivities.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['get_activity_timeline'],
        reasoning: 'Matched show activities pattern',
      };
    }

    if (SIMPLE_PATTERNS.showSignals.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.95,
        requiresTools: true,
        suggestedTools: ['get_account_signals'],
        reasoning: 'Matched show signals pattern',
      };
    }

    if (SIMPLE_PATTERNS.pipelineStats.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['get_pipeline_stats', 'get_forecast'],
        reasoning: 'Matched pipeline stats pattern',
      };
    }

    if (SIMPLE_PATTERNS.forecast.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['get_forecast', 'get_pipeline_stats'],
        reasoning: 'Matched forecast pattern',
      };
    }

    if (SIMPLE_PATTERNS.getDetails.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['get_lead_details', 'get_opportunity_details', 'get_account_details'],
        reasoning: 'Matched get details pattern',
      };
    }

    if (SIMPLE_PATTERNS.whatToDo.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'crm-read',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['get_recommended_actions', 'get_my_tasks', 'get_at_risk_opportunities'],
        reasoning: 'Matched what to do pattern',
      };
    }

    // CRM Write Operations - moderate complexity, need write tools
    if (SIMPLE_PATTERNS.createLead.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'crm-write',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['create_lead'],
        reasoning: 'Matched create lead pattern',
      };
    }

    if (SIMPLE_PATTERNS.createTask.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'crm-write',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['create_task'],
        reasoning: 'Matched create task pattern',
      };
    }

    if (SIMPLE_PATTERNS.createOpportunity.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'crm-write',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['create_opportunity'],
        reasoning: 'Matched create opportunity pattern',
      };
    }

    if (SIMPLE_PATTERNS.updateRecord.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'crm-write',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['update_lead', 'update_opportunity', 'update_account', 'update_contact'],
        reasoning: 'Matched update record pattern',
      };
    }

    // Email operations
    if (SIMPLE_PATTERNS.sendEmail.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'email',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['send_email'],
        reasoning: 'Matched send email pattern',
      };
    }

    if (SIMPLE_PATTERNS.checkEmails.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'email',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['get_email_threads', 'get_awaiting_responses'],
        reasoning: 'Matched check emails pattern',
      };
    }

    // Meeting operations
    if (SIMPLE_PATTERNS.scheduleMeeting.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'meeting',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['schedule_meeting'],
        reasoning: 'Matched schedule meeting pattern',
      };
    }

    // Meeting RSVP status - get response status for meetings
    if (SIMPLE_PATTERNS.meetingRsvp.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'meeting',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['get_meeting_rsvp_status', 'list_meetings', 'get_meeting_participants'],
        reasoning: 'Matched meeting RSVP pattern',
      };
    }

    // Meeting participants - list who is attending
    if (SIMPLE_PATTERNS.meetingParticipants.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'meeting',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['get_meeting_participants', 'list_meetings', 'get_meeting_rsvp_status'],
        reasoning: 'Matched meeting participants pattern',
      };
    }

    // Cancel meeting - moderate complexity since it's a write operation
    if (SIMPLE_PATTERNS.cancelMeeting.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'meeting',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['cancel_meeting', 'list_meetings'],
        reasoning: 'Matched cancel meeting pattern',
      };
    }

    // List meetings - simple read operation
    if (SIMPLE_PATTERNS.listMeetings.test(trimmedMessage)) {
      return {
        complexity: 'simple',
        category: 'meeting',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['list_meetings', 'get_upcoming_meetings'],
        reasoning: 'Matched list meetings pattern',
      };
    }

    // Salesforce Admin operations - validation rules, workflows, page layouts, etc.
    if (SIMPLE_PATTERNS.sfValidationRule.test(trimmedMessage) || SIMPLE_PATTERNS.sfMetadata.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_validation_rule', 'sf_list_validation_rules', 'sf_update_validation_rule'],
        reasoning: 'Matched validation rule pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfWorkflowRule.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_workflow_rule', 'sf_list_workflow_rules'],
        reasoning: 'Matched workflow rule pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfApprovalProcess.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_approval_process', 'sf_list_approval_processes', 'sf_submit_for_approval'],
        reasoning: 'Matched approval process pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfPageLayout.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_page_layout', 'sf_list_page_layouts', 'sf_assign_page_layout'],
        reasoning: 'Matched page layout pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfApexClass.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_deploy_apex_class', 'sf_deploy_apex_trigger', 'sf_run_apex_tests'],
        reasoning: 'Matched Apex class pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfLwc.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_deploy_lwc', 'sf_list_lwc_components'],
        reasoning: 'Matched LWC pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfReport.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_report', 'sf_run_report', 'sf_list_reports', 'sf_list_dashboards'],
        reasoning: 'Matched report/dashboard pattern',
      };
    }

    if (SIMPLE_PATTERNS.sfField.test(trimmedMessage)) {
      return {
        complexity: 'moderate',
        category: 'sf-admin',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['sf_create_field', 'sf_list_fields', 'sf_describe_field'],
        reasoning: 'Matched field/object pattern',
      };
    }

    // Check for complex patterns - these need full model
    if (COMPLEX_PATTERNS.research.test(trimmedMessage) || COMPLEX_PATTERNS.researchKeywords.test(trimmedMessage)) {
      return {
        complexity: 'complex',
        category: 'research',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['research_company', 'web_search', 'search_company_news'],
        reasoning: 'Matched research pattern',
      };
    }

    // IMPORTANT: Check company financial analysis BEFORE generic analysis
    // "Analyze Amex's financial performance" → research (web search needed)
    // "Analyze my pipeline" → crm-analysis (CRM data)
    if (COMPLEX_PATTERNS.companyFinancialAnalysis.test(trimmedMessage)) {
      return {
        complexity: 'complex',
        category: 'research',
        confidence: 0.9,
        requiresTools: true,
        suggestedTools: ['research_company', 'web_search', 'search_company_news'],
        reasoning: 'Matched company financial analysis pattern - requires web research',
      };
    }

    if (COMPLEX_PATTERNS.multiStep.test(trimmedMessage)) {
      return {
        complexity: 'complex',
        category: 'multi-step',
        confidence: 0.8,
        requiresTools: true,
        suggestedTools: [],
        reasoning: 'Matched multi-step pattern',
      };
    }

    // CRM-specific analysis (pipeline, deals, my data)
    if (COMPLEX_PATTERNS.crmAnalysis.test(trimmedMessage)) {
      return {
        complexity: 'complex',
        category: 'crm-analysis',
        confidence: 0.85,
        requiresTools: true,
        suggestedTools: ['analyze_opportunity', 'get_at_risk_opportunities', 'get_recommended_actions', 'get_pipeline_stats'],
        reasoning: 'Matched CRM analysis pattern',
      };
    }

    // Generic analysis fallback - route to crm-analysis by default
    if (COMPLEX_PATTERNS.analysis.test(trimmedMessage)) {
      return {
        complexity: 'complex',
        category: 'crm-analysis',
        confidence: 0.7,
        requiresTools: true,
        suggestedTools: ['analyze_opportunity', 'get_at_risk_opportunities', 'get_recommended_actions'],
        reasoning: 'Matched generic analysis pattern',
      };
    }

    // No pattern match - need LLM classification
    return null;
  }

  /**
   * LLM-based classification for queries that don't match simple patterns
   * Uses local SLM first (if available), falls back to Azure OpenAI
   */
  private async llmClassify(message: string): Promise<QueryClassification> {
    const cacheKey = message.toLowerCase().trim().substring(0, 100);
    const cached = this.classificationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.debug(`Classification cache hit for: ${cacheKey.substring(0, 30)}...`);
      return cached.result;
    }

    const systemPrompt = `You classify user queries for a Sales CRM AI assistant. Return ONLY valid JSON.
Categories: greeting, crm-read, crm-write, crm-analysis, research, document, email, meeting, sf-admin, general-qa, multi-step
sf-admin: Salesforce admin tasks like validation rules, workflow rules, page layouts, approval processes, Apex code, LWC, reports
Complexity: simple (single tool, basic query), moderate (2-3 tools), complex (research, analysis, multi-step)`;

    const userPrompt = `Classify: "${message}"
Return JSON: {"complexity":"simple|moderate|complex","category":"category","confidence":0.0-1.0,"requiresTools":bool,"reasoning":"brief"}`;

    // Try local SLM first (faster, no rate limits)
    if (this.useLocalSLM && this.localSLM?.available) {
      try {
        const startTime = Date.now();
        const response = await this.localSLM.textCompletion(systemPrompt, userPrompt, {
          maxTokens: 150,
          temperature: 0,
        });

        let jsonText = response.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }

        // Extract JSON from response
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const result: QueryClassification = {
            complexity: parsed.complexity || 'moderate',
            category: parsed.category || 'general-qa',
            confidence: parsed.confidence || 0.7,
            requiresTools: parsed.requiresTools ?? true,
            suggestedTools: parsed.suggestedTools || [],
            reasoning: `LocalSLM: ${parsed.reasoning || 'classified'}`,
          };

          this.classificationCache.set(cacheKey, { result, timestamp: Date.now() });
          this.logger.debug(`LocalSLM classification in ${Date.now() - startTime}ms: ${result.category}`);
          return result;
        }
      } catch (error) {
        this.logger.warn(`LocalSLM classification failed: ${error.message}, falling back to Azure`);
      }
    }

    // Fallback to Azure OpenAI
    try {
      const response = await this.client.chat.completions.create({
        model: this.smallModelId,
        max_tokens: 150,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      let jsonText = response.choices[0]?.message?.content?.trim() || '{}';

      // Clean up JSON
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(jsonText);

      const result: QueryClassification = {
        complexity: parsed.complexity || 'moderate',
        category: parsed.category || 'general-qa',
        confidence: parsed.confidence || 0.7,
        requiresTools: parsed.requiresTools ?? true,
        suggestedTools: parsed.suggestedTools || [],
        reasoning: parsed.reasoning || 'LLM classification',
      };

      // Cache the result
      this.classificationCache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      this.logger.warn(`LLM classification failed: ${error.message}, defaulting to moderate complexity`);
      return {
        complexity: 'moderate',
        category: 'general-qa',
        confidence: 0.5,
        requiresTools: true,
        suggestedTools: [],
        reasoning: 'Classification failed, using defaults',
      };
    }
  }

  /**
   * Main routing method - classifies the query and returns routing decision
   */
  async routeQuery(message: string, conversationContext?: { messageCount: number; hasToolCalls: boolean }): Promise<RoutingDecision> {
    if (!this.routerEnabled) {
      return {
        useSmallModel: false,
        modelId: this.largeModelId,
        toolSubset: null,
        systemPromptKey: 'full',
        skipMetadataExtraction: false,
      };
    }

    const startTime = Date.now();
    
    // Try fast pattern matching first
    let classification = this.fastClassify(message);
    
    if (!classification) {
      // Fall back to LLM classification
      classification = await this.llmClassify(message);
    }

    this.logger.debug(`Query classified in ${Date.now() - startTime}ms: ${JSON.stringify(classification)}`);

    // Make routing decision based on classification
    return this.makeRoutingDecision(classification, conversationContext);
  }

  /**
   * Determine routing based on classification
   */
  private makeRoutingDecision(
    classification: QueryClassification,
    context?: { messageCount: number; hasToolCalls: boolean }
  ): RoutingDecision {
    const { complexity, category, requiresTools } = classification;

    // Simple queries with high confidence → Small model
    if (complexity === 'simple' && classification.confidence >= 0.8) {
      // Greetings don't need tools
      if (category === 'greeting') {
        return {
          useSmallModel: true,
          modelId: this.smallModelId,
          toolSubset: [],
          systemPromptKey: 'minimal',
          skipMetadataExtraction: true,
        };
      }

      // Simple CRM reads → Small model with limited tools
      if (category === 'crm-read') {
        return {
          useSmallModel: true,
          modelId: this.smallModelId,
          toolSubset: TOOL_GROUPS['crm-read'],
          systemPromptKey: 'crm-only',
          skipMetadataExtraction: true,
        };
      }
    }

    // Moderate complexity → Large model but with tool filtering
    if (complexity === 'moderate') {
      let toolSubset: string[] | null = null;

      switch (category) {
        case 'crm-read':
          toolSubset = TOOL_GROUPS['crm-read'];
          break;
        case 'crm-write':
          toolSubset = [...TOOL_GROUPS['crm-read'], ...TOOL_GROUPS['crm-write']];
          break;
        case 'email':
          toolSubset = [...TOOL_GROUPS['email'], ...TOOL_GROUPS['crm-read']];
          break;
        case 'meeting':
          toolSubset = [...TOOL_GROUPS['meeting'], ...TOOL_GROUPS['crm-read']];
          break;
        case 'sf-admin':
          // Salesforce admin operations need sf-admin tools + CRM read for context
          toolSubset = [...TOOL_GROUPS['sf-admin'], ...TOOL_GROUPS['crm-read']];
          break;
        default:
          toolSubset = null; // Use all tools
      }

      return {
        useSmallModel: false,
        modelId: this.largeModelId,
        toolSubset,
        systemPromptKey: 'full',
        skipMetadataExtraction: category === 'crm-read' || category === 'crm-write',
      };
    }

    // Complex queries → Full large model with selective tools based on category
    // Research queries get research-focused tools to ensure web search is prioritized
    if (category === 'research') {
      return {
        useSmallModel: false,
        modelId: this.largeModelId,
        // Research tools + CRM read (to check existing records)
        toolSubset: [...TOOL_GROUPS['research'], ...TOOL_GROUPS['crm-read']],
        systemPromptKey: 'research-only',
        skipMetadataExtraction: false,
      };
    }

    // CRM analysis gets CRM tools
    if (category === 'crm-analysis') {
      return {
        useSmallModel: false,
        modelId: this.largeModelId,
        toolSubset: [...TOOL_GROUPS['crm-read'], ...TOOL_GROUPS['crm-write'], ...TOOL_GROUPS['quotes-contracts']],
        systemPromptKey: 'full',
        skipMetadataExtraction: false,
      };
    }

    // Multi-step and other complex queries → Full model with all tools
    return {
      useSmallModel: false,
      modelId: this.largeModelId,
      toolSubset: null, // All tools
      systemPromptKey: 'full',
      skipMetadataExtraction: false,
    };
  }

  /**
   * Get tools filtered by the routing decision
   */
  getFilteredTools(allTools: any[], decision: RoutingDecision): any[] {
    if (!decision.toolSubset) {
      return allTools; // Return all tools
    }

    if (decision.toolSubset.length === 0) {
      return []; // No tools needed
    }

    return allTools.filter(tool => decision.toolSubset!.includes(tool.name));
  }

  /**
   * Check if router is enabled
   */
  isEnabled(): boolean {
    return this.routerEnabled;
  }

  /**
   * Get model IDs for external use
   */
  getModelIds(): { small: string; large: string } {
    return {
      small: this.smallModelId,
      large: this.largeModelId,
    };
  }

  /**
   * Clear classification cache
   */
  clearCache(): void {
    this.classificationCache.clear();
    this.logger.log('Classification cache cleared');
  }
}
