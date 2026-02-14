/**
 * Oracle CX Conversations Service
 *
 * Lightweight service for handling Oracle CX Sales Cloud conversations.
 * Used by the new.iriseller.com portal via mode='oracle_portal'.
 *
 * This is a streamlined version of ConversationsService focused specifically
 * on Oracle CX operations with optimized tool sets and prompts.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { OracleCXService } from '../oracle-cx/oracle-cx.service';
import { SignalsService } from '../digital-workers/signals/signals.service';
import { MeetingsService } from '../meetings/meetings.service';
import { EmailTrackingService } from '../email-tracking/email-tracking.service';
import { SearchService } from '../search/search.service';
import { LocalSLMService } from '../ai-sdk/local-slm.service';
import { z } from 'zod';
import { tool } from 'ai';

// =====================================================================
// ORACLE CX SYSTEM PROMPTS
// =====================================================================

export const ORACLE_CX_PORTAL_SYSTEM_PROMPT = `You are IRIS, an AI-powered sales assistant connected to Oracle CX Sales Cloud.

**USER CONTEXT:**
- Name: {{USER_NAME}}
- Email: {{USER_EMAIL}}
- Title: {{USER_TITLE}}

**CRITICAL RULES:**

1. **ANTI-HALLUCINATION**: ONLY reference data returned by tool calls. NEVER invent record names, amounts, dates, or any data. If a tool returns 5 records, only mention those 5.

2. **ORACLE CX ID FIELDS**: Use correct ID fields:
   - Leads: \`LeadId\` (NOT LeadNumber)
   - Opportunities: \`OptyId\` (NOT OptyNumber)
   - Accounts/Contacts: \`PartyId\`

3. **SCIM FILTER SYNTAX**: Oracle CX uses SCIM filters:
   - Equal: \`Name eq 'Acme'\`
   - Contains: \`Name co 'tech'\`
   - Greater than: \`Revenue gt 50000\`
   - Multiple: \`Name co 'tech' and Status eq 'Open'\`

4. **SPEED**: Execute tools immediately. No preambles like "Let me search..."

5. **LOCAL TOOLS FOR INSIGHTS**: For coaching/performance questions, use local tools (get_my_ai_insights, get_sales_coaching) - they're faster than querying Oracle CX.

**TOOL SELECTION:**
- List/Search: Use \`ocx_query\` with appropriate resource and filters
- Single Record: Use \`ocx_get_record\` with resource and ID
- Create: Use \`ocx_create_*\` tools (require user-provided data)
- Update: First query to get ID, then use \`ocx_update_*\`
- Signals: Use \`get_account_signals\` for AI-detected events
- Coaching: Use \`get_sales_coaching\` for performance insights

**RESPONSE FORMAT:**
- Use **bold** for important labels
- Be concise and actionable
- Include follow-up suggestions when relevant`;

export const ORACLE_CX_PORTAL_MINIMAL_PROMPT = `You are IRIS, a sales AI assistant connected to Oracle CX Sales Cloud.

RULES:
- Use tools immediately, no preambles
- Use correct ID fields: LeadId, OptyId, PartyId
- SCIM filters: Name eq 'value', Name co 'partial', Revenue gt 50000
- Be concise and format responses clearly`;

// =====================================================================
// ORACLE CX TOOL DEFINITIONS (Anthropic Format)
// =====================================================================

export const ORACLE_CX_PORTAL_TOOLS = [
  // ==================== ORACLE CX QUERY TOOLS ====================
  {
    name: 'ocx_query',
    description: `Query Oracle CX Sales Cloud data. Use for listing records with optional filters.

RESOURCES: opportunities, accounts, contacts, leads, activities, tasks

SCIM FILTER EXAMPLES:
- Name eq 'Acme Corp' (exact match)
- Name co 'tech' (contains)
- Revenue gt 50000 (greater than)
- Name co 'tech' and StatusCode eq 'OPEN'

NOTE: Returns all available fields for the resource. Do not specify field projections.`,
    input_schema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          description: 'Oracle CX resource: opportunities, accounts, contacts, leads, activities, tasks',
        },
        filters: {
          type: 'object',
          description: 'Key-value filters (converted to SCIM)',
          additionalProperties: true,
        },
        limit: { type: 'number', description: 'Max records (default: 25)' },
        offset: { type: 'number', description: 'Skip records for pagination' },
        orderBy: { type: 'string', description: 'Sort field (e.g., LastUpdateDate:desc)' },
      },
      required: ['resource'],
    },
  },
  {
    name: 'ocx_get_record',
    description: 'Get a single record from Oracle CX by ID. Use correct ID field: LeadId, OptyId, or PartyId.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource type' },
        id: { type: 'string', description: 'Record ID (LeadId, OptyId, or PartyId)' },
        expand: { type: 'string', description: 'Comma-separated related resources to expand' },
      },
      required: ['resource', 'id'],
    },
  },
  {
    name: 'ocx_describe_resource',
    description: 'Get schema/metadata for an Oracle CX resource. Use to discover available fields before create/update.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource to describe' },
      },
      required: ['resource'],
    },
  },

  // ==================== ORACLE CX CRUD TOOLS ====================
  {
    name: 'ocx_create_lead',
    description: 'Create a Lead in Oracle CX. Ask user for required fields if not provided.',
    input_schema: {
      type: 'object',
      properties: {
        Name: { type: 'string', description: 'Lead name (required)' },
        PrimaryEmail: { type: 'string', description: 'Email address' },
        PrimaryPhone: { type: 'string', description: 'Phone number' },
        CompanyName: { type: 'string', description: 'Company name' },
        JobTitle: { type: 'string', description: 'Job title' },
        LeadSource: { type: 'string', description: 'Lead source' },
      },
      required: ['Name'],
    },
  },
  {
    name: 'ocx_update_lead',
    description: 'Update a Lead. CRITICAL: First use ocx_query to get LeadId, then update.',
    input_schema: {
      type: 'object',
      properties: {
        LeadId: { type: 'string', description: 'Lead ID (required - from previous query)' },
        Name: { type: 'string', description: 'Updated name' },
        StatusCode: { type: 'string', description: 'Status code' },
        PrimaryEmail: { type: 'string', description: 'Updated email' },
      },
      required: ['LeadId'],
    },
  },
  {
    name: 'ocx_create_opportunity',
    description: 'Create an Opportunity in Oracle CX. Ask user for Revenue and CloseDate if not provided.',
    input_schema: {
      type: 'object',
      properties: {
        Name: { type: 'string', description: 'Opportunity name (required)' },
        Revenue: { type: 'number', description: 'Deal value' },
        CloseDate: { type: 'string', description: 'Expected close date (YYYY-MM-DD)' },
        SalesStage: { type: 'string', description: 'Sales stage' },
        CustomerId: { type: 'string', description: 'Account PartyId' },
        Description: { type: 'string', description: 'Description' },
      },
      required: ['Name'],
    },
  },
  {
    name: 'ocx_update_opportunity',
    description: 'Update an Opportunity. CRITICAL: First use ocx_query to get OptyId, then update.',
    input_schema: {
      type: 'object',
      properties: {
        OptyId: { type: 'string', description: 'Opportunity ID (required - from previous query)' },
        Name: { type: 'string', description: 'Updated name' },
        Revenue: { type: 'number', description: 'Updated value' },
        SalesStage: { type: 'string', description: 'Updated stage' },
        CloseDate: { type: 'string', description: 'Updated close date' },
      },
      required: ['OptyId'],
    },
  },
  {
    name: 'ocx_create_contact',
    description: 'Create a Contact in Oracle CX.',
    input_schema: {
      type: 'object',
      properties: {
        FirstName: { type: 'string', description: 'First name' },
        LastName: { type: 'string', description: 'Last name (required)' },
        EmailAddress: { type: 'string', description: 'Email' },
        PhoneNumber: { type: 'string', description: 'Phone' },
        JobTitle: { type: 'string', description: 'Job title' },
        AccountPartyId: { type: 'string', description: 'Account to associate' },
      },
      required: ['LastName'],
    },
  },
  {
    name: 'ocx_update_contact',
    description: 'Update a Contact. First query to get PartyId.',
    input_schema: {
      type: 'object',
      properties: {
        PartyId: { type: 'string', description: 'Contact PartyId (required)' },
        FirstName: { type: 'string', description: 'Updated first name' },
        LastName: { type: 'string', description: 'Updated last name' },
        EmailAddress: { type: 'string', description: 'Updated email' },
        JobTitle: { type: 'string', description: 'Updated title' },
      },
      required: ['PartyId'],
    },
  },
  {
    name: 'ocx_create_account',
    description: 'Create an Account (Organization) in Oracle CX.',
    input_schema: {
      type: 'object',
      properties: {
        OrganizationName: { type: 'string', description: 'Company name (required)' },
        Industry: { type: 'string', description: 'Industry' },
        AnnualRevenue: { type: 'number', description: 'Annual revenue' },
        NumberOfEmployees: { type: 'number', description: 'Employee count' },
        Website: { type: 'string', description: 'Website URL' },
      },
      required: ['OrganizationName'],
    },
  },
  {
    name: 'ocx_create_task',
    description: 'Create a Task/Activity in Oracle CX.',
    input_schema: {
      type: 'object',
      properties: {
        Subject: { type: 'string', description: 'Task subject (required)' },
        Description: { type: 'string', description: 'Task details' },
        DueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
        Priority: { type: 'string', description: 'Priority level' },
        AccountId: { type: 'string', description: 'Related account PartyId' },
        OpportunityId: { type: 'string', description: 'Related opportunity OptyId' },
      },
      required: ['Subject'],
    },
  },
  {
    name: 'ocx_update_record',
    description: 'Generic update for any Oracle CX resource.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource type' },
        id: { type: 'string', description: 'Record ID' },
        data: { type: 'object', description: 'Fields to update', additionalProperties: true },
      },
      required: ['resource', 'id', 'data'],
    },
  },
  {
    name: 'ocx_create_record',
    description: 'Generic create for any Oracle CX resource.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', description: 'Resource type' },
        data: { type: 'object', description: 'Record data', additionalProperties: true },
      },
      required: ['resource', 'data'],
    },
  },

  // ==================== ACCOUNT SIGNALS ====================
  {
    name: 'get_account_signals',
    description: `Get AI-detected account signals from the Listening Agent. Use when user asks:
- "Show me my signals"
- "What signals do I have?"
- "Any account alerts?"
- "What's happening with my accounts?"

Returns executive changes, funding events, expansion signals, technology changes, news mentions.`,
    input_schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Filter by account ID' },
        status: {
          type: 'string',
          enum: ['PENDING', 'ACKNOWLEDGED', 'ACTIONED', 'DISMISSED'],
          description: 'Signal status filter',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Priority filter',
        },
        signalTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['EXEC_CHANGE', 'FUNDING', 'EXPANSION', 'TECH_CHANGE', 'NEWS', 'USAGE_SPIKE'],
          },
          description: 'Signal type filter',
        },
        timeframe: {
          type: 'string',
          enum: ['24h', '7d', '30d', '90d'],
          description: 'Time range',
        },
        limit: { type: 'number', description: 'Max signals to return' },
      },
    },
  },

  // ==================== AI INSIGHTS & COACHING ====================
  {
    name: 'get_my_ai_insights',
    description: `Get AI-generated insights and recommendations. Use when user asks:
- "What should I focus on?"
- "Give me coaching tips"
- "What deals need attention?"
- "Any recommendations?"

Returns prioritized alerts from AI agents.`,
    input_schema: {
      type: 'object',
      properties: {
        agentType: {
          type: 'string',
          enum: ['DEAL_HEALTH', 'COACHING', 'ACCOUNT_INTELLIGENCE', 'PIPELINE_ACCELERATION', 'NEXT_BEST_ACTION'],
          description: 'Filter by agent type',
        },
        priority: {
          type: 'string',
          enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
          description: 'Priority filter',
        },
        limit: { type: 'number', description: 'Max insights (default: 10)' },
      },
    },
  },
  {
    name: 'get_sales_coaching',
    description: `Get personalized AI sales coaching. Use when user asks:
- "How am I doing?"
- "Coach me on my deals"
- "Help me improve"
- "Analyze my performance"`,
    input_schema: {
      type: 'object',
      properties: {
        focusArea: {
          type: 'string',
          enum: ['discovery', 'negotiation', 'closing', 'prospecting', 'pipeline_management', 'general'],
          description: 'Coaching focus area',
        },
      },
    },
  },
  {
    name: 'get_account_intelligence',
    description: 'Get AI-generated intelligence and health score for a specific account.',
    input_schema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account ID' },
        accountName: { type: 'string', description: 'Account name (alternative to ID)' },
      },
    },
  },
  {
    name: 'get_deal_health',
    description: 'Get health assessment for opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Specific opportunity ID' },
        minAmount: { type: 'number', description: 'Min deal amount filter' },
        maxRiskScore: { type: 'number', description: 'Max risk score filter' },
        limit: { type: 'number', description: 'Max results' },
      },
    },
  },

  // ==================== COMMON ACTIONS ====================
  {
    name: 'research_company',
    description: 'Research a company via web search. Use for financial info, news, competitors - data NOT in Oracle CX.',
    input_schema: {
      type: 'object',
      properties: {
        companyUrlOrName: { type: 'string', description: 'Company name or URL' },
        includeNews: { type: 'boolean', description: 'Include recent news' },
        includeLeadership: { type: 'boolean', description: 'Include leadership info' },
        includeCompetitors: { type: 'boolean', description: 'Include competitors' },
      },
      required: ['companyUrlOrName'],
    },
  },
  {
    name: 'web_search',
    description: 'General web search for information not in Oracle CX.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email to a contact.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email (required)' },
        subject: { type: 'string', description: 'Email subject (required)' },
        body: { type: 'string', description: 'Email body (required)' },
        leadId: { type: 'string', description: 'Related lead ID' },
        accountId: { type: 'string', description: 'Related account ID' },
        opportunityId: { type: 'string', description: 'Related opportunity ID' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'schedule_meeting',
    description: 'Schedule a meeting on Zoom, Teams, or Google Meet.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meeting title (required)' },
        platform: { type: 'string', enum: ['ZOOM', 'TEAMS', 'GOOGLE_MEET'], description: 'Platform' },
        scheduledStart: { type: 'string', description: 'Start time (ISO 8601)' },
        duration: { type: 'number', description: 'Duration in minutes (default: 60)' },
        description: { type: 'string', description: 'Meeting description' },
        hostEmail: { type: 'string', description: 'Host email (required for Zoom)' },
        attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'Attendee emails' },
      },
      required: ['title', 'platform', 'scheduledStart'],
    },
  },
];

// =====================================================================
// SERVICE IMPLEMENTATION
// =====================================================================

@Injectable()
export class OracleCXConversationsService {
  private readonly logger = new Logger(OracleCXConversationsService.name);

  // Semantic field patterns for CRM entities - used for dynamic field extraction
  private readonly FIELD_PATTERNS = {
    id: [/^id$/i, /lead.*id$/i, /contact.*id$/i, /opty.*id$/i, /party.*id$/i],
    email: [/^email$/i, /email.*address/i, /primary.*email/i, /contact.*email/i],
    phone: [/^phone$/i, /phone.*number/i, /primary.*phone/i, /contact.*phone/i],
    firstName: [/^firstname$/i, /^first_name$/i, /person.*first.*name/i, /contact.*first.*name/i],
    lastName: [/^lastname$/i, /^last_name$/i, /person.*last.*name/i, /contact.*last.*name/i],
    name: [/^name$/i, /^full.*name$/i],
    company: [/^company$/i, /company.*name/i, /customer.*party.*name/i, /organization.*name/i],
    title: [/^title$/i, /^job.*title$/i],
    status: [/^status$/i, /status.*code/i],
    rating: [/^rating$/i, /^rank$/i, /rank.*code/i],
    amount: [/^amount$/i, /^revenue$/i],
    stage: [/^stage$/i, /stage.*name/i, /sales.*stage/i],
    closeDate: [/^close.*date$/i, /effective.*date/i],
    probability: [/^probability$/i, /win.*prob/i],
    accountName: [/^account.*name$/i, /customer.*name/i, /party.*name/i, /organization.*name/i],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly oracleCX: OracleCXService,
    private readonly signalsService: SignalsService,
    private readonly meetingsService: MeetingsService,
    private readonly emailService: EmailTrackingService,
    private readonly searchService: SearchService,
    private readonly localSLM: LocalSLMService,
  ) {
    this.logger.log('OracleCXConversationsService initialized');
  }

  /**
   * Dynamic field extractor - finds field values by pattern matching
   */
  private extractFieldByPattern(obj: any, patterns: RegExp[], fallback: any = ''): any {
    if (!obj || typeof obj !== 'object') return fallback;
    for (const pattern of patterns) {
      for (const key of Object.keys(obj)) {
        if (pattern.test(key) && obj[key] !== undefined && obj[key] !== null) {
          return obj[key];
        }
      }
    }
    return fallback;
  }

  /**
   * Auto-detect entity type from data structure using signature patterns
   * Returns: 'leads' | 'opportunities' | 'contacts' | 'accounts' | 'tasks' | 'signals' | 'meetings' | 'emails' | null
   */
  private detectEntityType(record: any, hint?: string): string | null {
    if (!record || typeof record !== 'object') return null;
    const keys = Object.keys(record).join(' ').toLowerCase();

    // Check hint first (from resource parameter or tool name)
    if (hint) {
      const h = hint.toLowerCase();
      if (h.includes('lead')) return 'leads';
      if (h.includes('opportunit') || h.includes('opty') || h.includes('deal')) return 'opportunities';
      if (h.includes('contact')) return 'contacts';
      if (h.includes('account') || h.includes('company') || h.includes('organization')) return 'accounts';
      if (h.includes('task') || h.includes('activity')) return 'tasks';
      if (h.includes('signal') || h.includes('alert')) return 'signals';
      if (h.includes('meeting') || h.includes('event') || h.includes('appointment')) return 'meetings';
      if (h.includes('email') || h.includes('draft')) return 'emails';
    }

    // Auto-detect from field signatures
    if (record.LeadId || (keys.includes('lead') && (keys.includes('status') || keys.includes('source')))) return 'leads';
    if (record.OptyId || keys.includes('optyid') || (keys.includes('revenue') && keys.includes('stage'))) return 'opportunities';
    if (record.OrganizationName || record.PartyType === 'ORGANIZATION' || (keys.includes('organization') && keys.includes('industry'))) return 'accounts';
    if ((record.FirstName || record.PersonFirstName) && !record.OrganizationName && !record.LeadId) return 'contacts';
    if (record.Subject && (record.DueDate || record.ActivityDate || keys.includes('priority'))) return 'tasks';
    if (record.signalType || record.recommendedAction || (keys.includes('signal') && keys.includes('priority'))) return 'signals';
    if (record.scheduledStart || record.platform || (keys.includes('meeting') && keys.includes('attendee'))) return 'meetings';
    if (record.to && record.subject && record.body) return 'emails';

    return null;
  }

  /**
   * Transform a single record into normalized widget-ready format
   */
  private normalizeRecord(record: any, entityType: string): any {
    const firstName = this.extractFieldByPattern(record, this.FIELD_PATTERNS.firstName);
    const lastName = this.extractFieldByPattern(record, this.FIELD_PATTERNS.lastName);
    const fullName = this.extractFieldByPattern(record, this.FIELD_PATTERNS.name) || `${firstName} ${lastName}`.trim();

    const base = {
      id: this.extractFieldByPattern(record, this.FIELD_PATTERNS.id),
      name: fullName,
    };

    switch (entityType) {
      case 'leads':
        return {
          ...base,
          firstName, lastName,
          company: this.extractFieldByPattern(record, this.FIELD_PATTERNS.company),
          title: this.extractFieldByPattern(record, this.FIELD_PATTERNS.title),
          email: this.extractFieldByPattern(record, this.FIELD_PATTERNS.email),
          phone: this.extractFieldByPattern(record, this.FIELD_PATTERNS.phone),
          status: this.extractFieldByPattern(record, this.FIELD_PATTERNS.status),
          rating: this.extractFieldByPattern(record, this.FIELD_PATTERNS.rating),
        };

      case 'opportunities':
        return {
          ...base,
          amount: this.extractFieldByPattern(record, this.FIELD_PATTERNS.amount, 0),
          stage: this.extractFieldByPattern(record, this.FIELD_PATTERNS.stage),
          probability: this.extractFieldByPattern(record, this.FIELD_PATTERNS.probability, 0),
          closeDate: this.extractFieldByPattern(record, this.FIELD_PATTERNS.closeDate),
          accountName: this.extractFieldByPattern(record, this.FIELD_PATTERNS.accountName),
        };

      case 'contacts':
        return {
          ...base,
          firstName, lastName,
          email: this.extractFieldByPattern(record, this.FIELD_PATTERNS.email),
          phone: this.extractFieldByPattern(record, this.FIELD_PATTERNS.phone),
          title: this.extractFieldByPattern(record, this.FIELD_PATTERNS.title),
          accountName: this.extractFieldByPattern(record, this.FIELD_PATTERNS.accountName),
        };

      case 'accounts':
        return {
          ...base,
          name: this.extractFieldByPattern(record, this.FIELD_PATTERNS.company) || fullName,
          industry: record.Industry,
          phone: this.extractFieldByPattern(record, this.FIELD_PATTERNS.phone),
          website: record.Website || record.URL,
          type: record.Type || record.PartyType,
        };

      case 'tasks':
        return {
          ...base,
          subject: record.Subject || record.subject || fullName,
          status: this.extractFieldByPattern(record, this.FIELD_PATTERNS.status),
          priority: record.Priority || record.priority,
          dueDate: record.DueDate || record.dueDate || record.ActivityDate,
          description: record.Description || record.description,
        };

      case 'signals':
        return {
          ...base,
          title: record.title || fullName,
          type: record.signalType || record.type,
          priority: record.priority,
          description: record.description,
          recommendedAction: record.recommendedAction,
          accountName: record.accountName,
        };

      case 'meetings':
        return {
          ...base,
          title: record.title || record.Subject || fullName,
          platform: record.platform,
          scheduledStart: record.scheduledStart,
          duration: record.duration,
          attendees: record.attendees || record.attendeeEmails,
          joinUrl: record.joinUrl,
        };

      case 'emails':
        return {
          ...base,
          to: record.to,
          subject: record.subject,
          body: record.body,
          status: record.status,
        };

      default:
        return base;
    }
  }

  /**
   * Analyze assistant response to determine if a widget should be shown
   * Handles cases like meeting scheduling where AI asks for details
   */
  private async analyzeResponseForWidget(userQuery: string, assistantResponse: string): Promise<any> {
    const lowerQuery = userQuery.toLowerCase();

    // Quick intent detection for common patterns
    const isSchedulingIntent = lowerQuery.includes('schedule') && (lowerQuery.includes('meeting') || lowerQuery.includes('call'));
    const isEmailIntent = (lowerQuery.includes('email') || lowerQuery.includes('draft')) && lowerQuery.includes('send');

    if (!isSchedulingIntent && !isEmailIntent) {
      return null; // No widget needed for this intent
    }

    try {
      const responseText = await this.anthropic.generateChatCompletion({
        messages: [
          {
            role: 'system',
            content: `You extract structured data from user queries for CRM widgets.
Given a user query about scheduling a meeting or sending an email, extract the relevant details.

For MEETINGS, extract:
- attendee: The person's name to meet with
- company: Their company name
- email: Their email if mentioned
- title: Suggested meeting title

For EMAILS, extract:
- recipientName: The person's name
- recipientEmail: Their email
- subject: Suggested subject line

Return JSON only. If the intent is scheduling, use type "meetings". If email, use type "email_draft".

Example output for meeting:
{"type":"meetings","attendee":"John Smith","company":"Acme Corp","email":"john@acme.com","title":"Meeting with John Smith"}

Example output for email:
{"type":"email_draft","recipientName":"John Smith","recipientEmail":"john@acme.com","subject":"Follow-up"}`
          },
          {
            role: 'user',
            content: `User Query: "${userQuery}"\n\nExtract the widget data:`
          }
        ],
        temperature: 0,
        maxTokens: 300,
      });

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);

        if (extracted.type === 'meetings') {
          return {
            type: 'meetings',
            title: extracted.title || `Meeting with ${extracted.attendee || 'Contact'}`,
            data: [{
              title: extracted.title || `Meeting with ${extracted.attendee || 'Contact'}`,
              attendee: extracted.attendee || 'Contact',
              company: extracted.company || '',
              email: extracted.email || '',
              platform: 'zoom', // Default
            }],
            attendee: extracted.attendee,
            metadata: { source: 'oracle_cx', generatedBy: 'llm_intent' },
          };
        } else if (extracted.type === 'email_draft') {
          return {
            type: 'email_draft',
            title: 'Draft Email',
            data: [{
              to: extracted.recipientEmail || '',
              recipientName: extracted.recipientName || '',
              subject: extracted.subject || 'Follow-up',
              body: '',
            }],
            metadata: { source: 'oracle_cx', generatedBy: 'llm_intent' },
          };
        }
      }
    } catch (error: any) {
      this.logger.warn(`[analyzeResponseForWidget] Failed: ${error.message}`);
    }

    return null;
  }

  /**
   * LLM-grounded widget generation prompt
   * Used to dynamically analyze data and generate appropriate widget specifications
   */
  private readonly WIDGET_GENERATION_PROMPT = `You are a widget generator for a CRM UI. Analyze the data and generate a widget specification.

WIDGET TYPES:
- leads: For lead/prospect records (has: name, company, email, phone, status, rating)
- opportunities: For deals/opportunities (has: name, account, amount, stage, closeDate, probability)
- accounts: For company/organization records (has: name, industry, phone, website)
- contacts: For contact persons (has: firstName, lastName, email, phone, title, accountName)
- tasks: For tasks/activities (has: subject, status, priority, dueDate)
- meetings: For meetings/appointments (has: title, attendee, platform, scheduledStart, duration)
- signals: For AI-detected signals (has: title, type, priority, description, recommendedAction)
- email_draft: For email drafts (has: to, subject, body)

RULES:
1. Identify the correct widget type based on the data structure
2. Extract ALL relevant fields from each record
3. For meetings: extract attendee name from the user query if not in data
4. Return valid JSON only

OUTPUT FORMAT:
{
  "type": "leads|opportunities|accounts|contacts|tasks|meetings|signals|email_draft",
  "title": "Brief descriptive title",
  "data": [
    { ...normalized record fields... }
  ],
  "attendee": "Person name (for meetings only, extracted from query)"
}`;

  /**
   * LLM-grounded widget data extraction
   * Uses Claude to dynamically analyze tool results and generate appropriate widget data
   */
  private async extractWidgetDataWithLLM(
    toolName: string,
    toolResult: any,
    toolInput: any,
    userQuery: string
  ): Promise<any> {
    if (!toolResult?.success || !toolResult?.data) {
      return null;
    }

    const dataPreview = JSON.stringify(toolResult.data).substring(0, 3000);

    try {
      const responseText = await this.anthropic.generateChatCompletion({
        messages: [
          { role: 'system', content: this.WIDGET_GENERATION_PROMPT },
          {
            role: 'user',
            content: `Tool: ${toolName}
User Query: "${userQuery}"
Tool Input: ${JSON.stringify(toolInput)}
Data: ${dataPreview}

Generate the widget specification JSON:`
          }
        ],
        temperature: 0,
        maxTokens: 1500,
      });

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const widget = JSON.parse(jsonMatch[0]);
        this.logger.log(`[LLM Widget] Generated: type=${widget.type}, records=${widget.data?.length || 0}`);
        return {
          ...widget,
          metadata: { source: 'oracle_cx', generatedBy: 'llm' },
        };
      }
    } catch (error: any) {
      this.logger.warn(`[LLM Widget] Generation failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Universal widget data extractor - uses fast pattern-based extraction
   * LLM is used only for specific enrichments (attendee names for meetings)
   * This preserves data integrity while adding intelligence where needed
   */
  private async extractWidgetData(toolName: string, toolResult: any, toolInput?: any, userQuery?: string): Promise<any> {
    // Handle unsuccessful results or empty data
    if (!toolResult?.success) {
      this.logger.debug(`[extractWidgetData] ${toolName}: no success or failed result`);
      return null;
    }

    const data = toolResult.data;
    if (!data) {
      this.logger.debug(`[extractWidgetData] ${toolName}: no data in result`);
      return null;
    }

    // Use fast pattern-based extraction (preserves all records)
    const resourceHint = toolInput?.resource || toolInput?.objectType || '';
    const toolHint = toolName.replace(/^(ocx_|sf_|get_|list_|search_|create_|update_)/, '');
    this.logger.debug(`[extractWidgetData] ${toolName}: pattern-based extraction. hints=${resourceHint || toolHint}`);

    // Handle array of records
    if (Array.isArray(data)) {
      if (data.length === 0) return null;

      const entityType = this.detectEntityType(data[0], resourceHint || toolHint);
      if (!entityType) return null;

      return {
        type: entityType,
        title: toolResult.message || `Found ${data.length} ${entityType}`,
        data: data.map(rec => this.normalizeRecord(rec, entityType)),
        metadata: { totalCount: toolResult.totalCount || data.length, source: 'oracle_cx' },
      };
    }

    // Handle single record
    if (typeof data === 'object' && !Array.isArray(data)) {
      const entityType = this.detectEntityType(data, resourceHint || toolHint);
      this.logger.debug(`[extractWidgetData] ${toolName}: detected entityType=${entityType}, dataKeys=${Object.keys(data).slice(0, 10).join(',')}`);
      if (!entityType) return null;

      const normalized = this.normalizeRecord(data, entityType);
      const displayName = normalized.name || normalized.subject || normalized.title || 'Record';

      // For meetings, use SLM to extract attendee from user's original query
      if (entityType === 'meetings' && userQuery && this.localSLM.available) {
        try {
          const attendeeName = await this.localSLM.extractMeetingAttendee(userQuery);
          if (attendeeName) {
            normalized.attendee = attendeeName;
            this.logger.log(`[extractWidgetData] SLM extracted attendee: "${attendeeName}"`);
          }
        } catch (error: any) {
          this.logger.warn(`[extractWidgetData] SLM attendee extraction failed: ${error.message}`);
        }
      }

      const widgetData = {
        type: entityType,
        title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1, -1)}: ${displayName}`,
        data: [normalized],
        metadata: { source: 'oracle_cx' },
      };
      this.logger.debug(`[extractWidgetData] ${toolName}: returning widget type=${entityType}, title=${widgetData.title}`);
      return widgetData;
    }

    return null;
  }

  /**
   * Send a message and get AI response using Oracle CX tools
   * Lightweight version of ConversationsService.sendMessage
   */
  async sendMessage(
    conversationId: string,
    content: string,
    userId: string,
    isAdmin = false,
  ): Promise<{
    conversation: any;
    userMessage: any;
    assistantMessage: any;
    widgetData?: any[];
  }> {
    const startTime = Date.now();
    this.logger.log(`[Oracle Portal] Processing message for conversation ${conversationId}`);

    // Get conversation with messages
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ...(isAdmin ? {} : { userId }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20, // Limit history for performance
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get user info for system prompt
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'USER',
        content,
      },
    });

    // Build conversation history for Anthropic
    const history = conversation.messages.map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));
    history.push({ role: 'user', content });

    // Get system prompt
    const systemPrompt = this.getSystemPrompt({
      name: user?.name || undefined,
      email: user?.email || undefined,
    });

    // Use Anthropic (Claude) as primary LLM for chat - fast and accurate
    // SLM is only used for lightweight extractions (attendee names)
    let assistantContent = '';
    const toolsUsed: string[] = [];
    const widgetDataList: any[] = [];
    const maxToolIterations = 5;
    let iteration = 0;

    try {
      // Build messages with system prompt as first message
      const currentMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ];

      while (iteration < maxToolIterations) {
        iteration++;

        const result = await this.anthropic.generateChatCompletionWithTools({
          messages: currentMessages as any,
          tools: ORACLE_CX_PORTAL_TOOLS,
        });

        // If it's a tool use, execute and continue
        if (result.type === 'tool_use' && result.toolName) {
          this.logger.log(`[Oracle Portal] Executing tool: ${result.toolName}`);
          toolsUsed.push(result.toolName);

          const toolResult = await this.executeTool(
            result.toolName,
            result.toolInput,
            userId,
          );

          // Extract widget data from tool result for frontend rendering
          // Pass user content for SLM-based attendee extraction when scheduling meetings
          const widgetData = await this.extractWidgetData(result.toolName, toolResult, result.toolInput, content);
          if (widgetData) {
            widgetDataList.push(widgetData);
          }

          // Add assistant message with tool call and tool result
          currentMessages.push({
            role: 'assistant',
            content: `[Calling tool: ${result.toolName}]`,
          });
          currentMessages.push({
            role: 'user',
            content: `Tool result for ${result.toolName}: ${JSON.stringify(toolResult)}`,
          });
        } else {
          // Got a text response, we're done
          assistantContent = result.content || 'I apologize, but I was unable to process your request.';
          break;
        }
      }

      if (!assistantContent) {
        assistantContent = 'I executed the requested tools but need more context to provide a response.';
      }

      // If no widgets generated but user intent suggests one should be shown,
      // use LLM to analyze the response and generate appropriate widget
      if (widgetDataList.length === 0 && assistantContent) {
        const intentWidget = await this.analyzeResponseForWidget(content, assistantContent);
        if (intentWidget) {
          widgetDataList.push(intentWidget);
        }
      }
    } catch (error: any) {
      this.logger.error(`[Oracle Portal] AI error: ${error.message}`);
      assistantContent = `I encountered an error processing your request: ${error.message}`;
    }

    // Save assistant message with widget data for frontend rendering
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: assistantContent,
        metadata: {
          toolsUsed,
          mode: 'oracle_portal',
          processingTime: Date.now() - startTime,
          // Include widget data for rich UI rendering
          widgetData: widgetDataList.length > 0 ? widgetDataList : undefined,
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.logger.log(`[Oracle Portal] Completed in ${Date.now() - startTime}ms, tools: ${toolsUsed.join(', ') || 'none'}, widgets: ${widgetDataList.length}`);

    // Return response
    const updatedConversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    // Return widgetData at top level (same format as main conversations service)
    return {
      conversation: updatedConversation,
      userMessage,
      assistantMessage,
      widgetData: widgetDataList.length > 0 ? widgetDataList : undefined,
    };
  }

  /**
   * Get the tools array (Anthropic format)
   */
  getTools(): any[] {
    return ORACLE_CX_PORTAL_TOOLS;
  }

  /**
   * Get system prompt with user context
   */
  getSystemPrompt(user: { name?: string; email?: string; title?: string }, minimal = false): string {
    const prompt = minimal ? ORACLE_CX_PORTAL_MINIMAL_PROMPT : ORACLE_CX_PORTAL_SYSTEM_PROMPT;
    return prompt
      .replace('{{USER_NAME}}', user.name || 'User')
      .replace('{{USER_EMAIL}}', user.email || '')
      .replace('{{USER_TITLE}}', user.title || 'Sales Professional');
  }

  /**
   * Create AI SDK tools (Zod format) for streaming
   */
  createAiSdkTools(userId: string) {
    const self = this;

    return {
      ocx_query: tool({
        description: ORACLE_CX_PORTAL_TOOLS.find(t => t.name === 'ocx_query')!.description,
        inputSchema: z.object({
          resource: z.string().describe('Oracle CX resource'),
          filters: z.record(z.string(), z.any()).optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          orderBy: z.string().optional(),
        }),
        execute: async (args) => self.executeTool('ocx_query', args, userId),
      }),

      ocx_get_record: tool({
        description: 'Get a single record by ID',
        inputSchema: z.object({
          resource: z.string(),
          id: z.string(),
          expand: z.string().optional(),
        }),
        execute: async (args) => self.executeTool('ocx_get_record', args, userId),
      }),

      ocx_describe_resource: tool({
        description: 'Get schema for a resource',
        inputSchema: z.object({
          resource: z.string(),
        }),
        execute: async (args) => self.executeTool('ocx_describe_resource', args, userId),
      }),

      ocx_create_lead: tool({
        description: 'Create a Lead',
        inputSchema: z.object({
          Name: z.string(),
          PrimaryEmail: z.string().optional(),
          PrimaryPhone: z.string().optional(),
          CompanyName: z.string().optional(),
          JobTitle: z.string().optional(),
          LeadSource: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_create_lead', args, userId),
      }),

      ocx_update_lead: tool({
        description: 'Update a Lead',
        inputSchema: z.object({
          LeadId: z.string(),
          Name: z.string().optional(),
          StatusCode: z.string().optional(),
          PrimaryEmail: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_update_lead', args, userId),
      }),

      ocx_create_opportunity: tool({
        description: 'Create an Opportunity',
        inputSchema: z.object({
          Name: z.string(),
          Revenue: z.number().optional(),
          CloseDate: z.string().optional(),
          SalesStage: z.string().optional(),
          CustomerId: z.string().optional(),
          Description: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_create_opportunity', args, userId),
      }),

      ocx_update_opportunity: tool({
        description: 'Update an Opportunity',
        inputSchema: z.object({
          OptyId: z.string(),
          Name: z.string().optional(),
          Revenue: z.number().optional(),
          SalesStage: z.string().optional(),
          CloseDate: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_update_opportunity', args, userId),
      }),

      ocx_create_contact: tool({
        description: 'Create a Contact',
        inputSchema: z.object({
          FirstName: z.string().optional(),
          LastName: z.string(),
          EmailAddress: z.string().optional(),
          PhoneNumber: z.string().optional(),
          JobTitle: z.string().optional(),
          AccountPartyId: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_create_contact', args, userId),
      }),

      ocx_create_account: tool({
        description: 'Create an Account',
        inputSchema: z.object({
          OrganizationName: z.string(),
          Industry: z.string().optional(),
          AnnualRevenue: z.number().optional(),
          NumberOfEmployees: z.number().optional(),
          Website: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_create_account', args, userId),
      }),

      ocx_create_task: tool({
        description: 'Create a Task',
        inputSchema: z.object({
          Subject: z.string(),
          Description: z.string().optional(),
          DueDate: z.string().optional(),
          Priority: z.string().optional(),
          AccountId: z.string().optional(),
          OpportunityId: z.string().optional(),
        }).passthrough(),
        execute: async (args) => self.executeTool('ocx_create_task', args, userId),
      }),

      get_account_signals: tool({
        description: 'Get AI-detected account signals',
        inputSchema: z.object({
          accountId: z.string().optional(),
          status: z.enum(['PENDING', 'ACKNOWLEDGED', 'ACTIONED', 'DISMISSED']).optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
          signalTypes: z.array(z.enum(['EXEC_CHANGE', 'FUNDING', 'EXPANSION', 'TECH_CHANGE', 'NEWS', 'USAGE_SPIKE'])).optional(),
          timeframe: z.enum(['24h', '7d', '30d', '90d']).optional(),
          limit: z.number().optional(),
        }),
        execute: async (args) => self.executeTool('get_account_signals', args, userId),
      }),

      get_my_ai_insights: tool({
        description: 'Get AI-generated insights',
        inputSchema: z.object({
          agentType: z.enum(['DEAL_HEALTH', 'COACHING', 'ACCOUNT_INTELLIGENCE', 'PIPELINE_ACCELERATION', 'NEXT_BEST_ACTION']).optional(),
          priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']).optional(),
          limit: z.number().optional(),
        }),
        execute: async (args) => self.executeTool('get_my_ai_insights', args, userId),
      }),

      get_sales_coaching: tool({
        description: 'Get personalized sales coaching',
        inputSchema: z.object({
          focusArea: z.enum(['discovery', 'negotiation', 'closing', 'prospecting', 'pipeline_management', 'general']).optional(),
        }),
        execute: async (args) => self.executeTool('get_sales_coaching', args, userId),
      }),

      research_company: tool({
        description: 'Research a company via web search',
        inputSchema: z.object({
          companyUrlOrName: z.string(),
          includeNews: z.boolean().optional(),
          includeLeadership: z.boolean().optional(),
          includeCompetitors: z.boolean().optional(),
        }),
        execute: async (args) => self.executeTool('research_company', args, userId),
      }),

      web_search: tool({
        description: 'General web search',
        inputSchema: z.object({
          query: z.string(),
        }),
        execute: async (args) => self.executeTool('web_search', args, userId),
      }),

      send_email: tool({
        description: 'Send an email',
        inputSchema: z.object({
          to: z.string(),
          subject: z.string(),
          body: z.string(),
          leadId: z.string().optional(),
          accountId: z.string().optional(),
          opportunityId: z.string().optional(),
        }),
        execute: async (args) => self.executeTool('send_email', args, userId),
      }),

      schedule_meeting: tool({
        description: 'Schedule a meeting',
        inputSchema: z.object({
          title: z.string(),
          platform: z.enum(['ZOOM', 'TEAMS', 'GOOGLE_MEET']),
          scheduledStart: z.string(),
          duration: z.number().optional(),
          description: z.string().optional(),
          hostEmail: z.string().optional(),
          attendeeEmails: z.array(z.string()).optional(),
        }),
        execute: async (args) => self.executeTool('schedule_meeting', args, userId),
      }),
    };
  }

  /**
   * Execute a tool and return the result
   */
  async executeTool(toolName: string, args: any, userId: string): Promise<any> {
    this.logger.log(`Executing tool: ${toolName} with args: ${JSON.stringify(args)}`);

    try {
      switch (toolName) {
        // ==================== ORACLE CX TOOLS ====================
        case 'ocx_query': {
          // Note: Don't pass 'fields' parameter - Oracle CX instances have varying schemas
          // Let the API return all available fields for the resource
          const result = await this.oracleCX.query(userId, args.resource, {
            filters: args.filters,
            limit: args.limit || 25,
            offset: args.offset,
            orderBy: args.orderBy,
            // Omit fields to avoid schema validation errors
          });
          const count = result.count || result.items?.length || 0;
          return {
            success: true,
            data: result.items || result,
            totalCount: count,
            message: `Found ${count} ${args.resource}`,
          };
        }

        case 'ocx_get_record': {
          const result = await this.oracleCX.getById(userId, args.resource, args.id);
          return { success: true, data: result };
        }

        case 'ocx_describe_resource': {
          const result = await this.oracleCX.describeResource(userId, args.resource);
          return { success: true, schema: result };
        }

        case 'ocx_create_lead': {
          const result = await this.oracleCX.create(userId, 'leads', args);
          return { success: true, data: result, message: 'Lead created successfully' };
        }

        case 'ocx_update_lead': {
          const { LeadId, ...updateData } = args;
          const result = await this.oracleCX.update(userId, 'leads', LeadId, updateData);
          return { success: true, data: result, message: 'Lead updated successfully' };
        }

        case 'ocx_create_opportunity': {
          const result = await this.oracleCX.create(userId, 'opportunities', args);
          return { success: true, data: result, message: 'Opportunity created successfully' };
        }

        case 'ocx_update_opportunity': {
          const { OptyId, ...updateData } = args;
          const result = await this.oracleCX.update(userId, 'opportunities', OptyId, updateData);
          return { success: true, data: result, message: 'Opportunity updated successfully' };
        }

        case 'ocx_create_contact': {
          const result = await this.oracleCX.create(userId, 'contacts', args);
          return { success: true, data: result, message: 'Contact created successfully' };
        }

        case 'ocx_create_account': {
          const result = await this.oracleCX.create(userId, 'accounts', args);
          return { success: true, data: result, message: 'Account created successfully' };
        }

        case 'ocx_create_task': {
          const result = await this.oracleCX.create(userId, 'tasks', args);
          return { success: true, data: result, message: 'Task created successfully' };
        }

        // ==================== SIGNALS ====================
        case 'get_account_signals': {
          const signals = await this.signalsService.getSignals(userId, {
            accountId: args.accountId,
            status: args.status,
            priority: args.priority,
            signalTypes: args.signalTypes,
            timeframe: args.timeframe || '30d',
            limit: args.limit || 20,
          });

          if (signals.length === 0) {
            return {
              success: true,
              message: 'No account signals found',
              data: [],
            };
          }

          const criticalSignals = signals.filter(s => s.priority === 'CRITICAL');
          const highSignals = signals.filter(s => s.priority === 'HIGH');

          return {
            success: true,
            message: `Found ${signals.length} signals (${criticalSignals.length} critical, ${highSignals.length} high)`,
            data: signals.map(s => ({
              id: s.id,
              accountName: s.accountName,
              type: s.type,
              title: s.title,
              description: s.description,
              priority: s.priority,
              status: s.status,
              recommendedAction: s.recommendedAction,
              createdAt: s.createdAt,
            })),
            summary: {
              total: signals.length,
              critical: criticalSignals.length,
              high: highSignals.length,
            },
          };
        }

        // ==================== AI INSIGHTS ====================
        case 'get_my_ai_insights': {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);

          const alerts = await this.prisma.agentAlert.findMany({
            where: {
              userId,
              status: { in: ['NEW', 'ACKNOWLEDGED'] },
              createdAt: { gte: cutoffDate },
              ...(args.agentType && { agentType: args.agentType }),
              ...(args.priority && { priority: args.priority }),
            },
            orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
            take: args.limit || 10,
          });

          if (alerts.length === 0) {
            return {
              success: true,
              message: 'No active AI insights',
              data: [],
            };
          }

          return {
            success: true,
            message: `Found ${alerts.length} AI insights`,
            data: alerts.map(a => ({
              id: a.id,
              type: a.agentType,
              priority: a.priority,
              title: a.title,
              description: a.description,
              recommendation: a.recommendation,
              status: a.status,
              createdAt: a.createdAt,
            })),
          };
        }

        case 'get_sales_coaching': {
          // Return coaching advice based on user's performance data
          const opportunities = await this.prisma.opportunity.findMany({
            where: { ownerId: userId },
            take: 50,
          });

          const wonDeals = opportunities.filter(o => o.stage === 'CLOSED_WON');
          const lostDeals = opportunities.filter(o => o.stage === 'CLOSED_LOST');
          const winRate = opportunities.length > 0
            ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100).toFixed(1)
            : 'N/A';

          return {
            success: true,
            message: 'Sales coaching insights generated',
            data: {
              metrics: {
                totalDeals: opportunities.length,
                wonDeals: wonDeals.length,
                lostDeals: lostDeals.length,
                winRate: `${winRate}%`,
                openDeals: opportunities.filter(o => !o.stage?.includes('CLOSED')).length,
              },
              focusArea: args.focusArea || 'general',
              tips: this.getCoachingTips(args.focusArea, Number(winRate)),
            },
          };
        }

        case 'research_company': {
          const result = await this.searchService.researchCompany(args.companyUrlOrName);
          return { success: true, data: result };
        }

        case 'web_search': {
          const result = await this.searchService.webSearch(args.query);
          return { success: true, data: result };
        }

        case 'send_email': {
          // Email sending would need to be implemented or use a different service
          return {
            success: false,
            message: 'Email sending not configured for Oracle CX portal mode',
          };
        }

        case 'schedule_meeting': {
          const result = await this.meetingsService.createMeeting({
            title: args.title,
            platform: args.platform,
            scheduledAt: args.scheduledStart, // ISO string
            description: args.description,
          }, userId);
          return { success: true, message: 'Meeting scheduled', data: result };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error: any) {
      this.logger.error(`Tool execution failed: ${toolName}`, error);
      return {
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }

  /**
   * Get coaching tips based on focus area and win rate
   */
  private getCoachingTips(focusArea: string | undefined, winRate: number): string[] {
    const tips: string[] = [];

    if (winRate < 30) {
      tips.push('Focus on qualifying leads better - spend more time on discovery calls');
      tips.push('Review your lost deals to identify common objections');
    } else if (winRate < 50) {
      tips.push('Your pipeline looks healthy - focus on moving deals through stages faster');
      tips.push('Consider increasing deal values through upselling');
    } else {
      tips.push('Excellent win rate! Share your strategies with the team');
      tips.push('Focus on increasing deal volume while maintaining quality');
    }

    switch (focusArea) {
      case 'discovery':
        tips.push('Ask open-ended questions to understand pain points');
        tips.push('Document key decision criteria in your notes');
        break;
      case 'negotiation':
        tips.push('Anchor with value before discussing price');
        tips.push('Prepare for common objections in advance');
        break;
      case 'closing':
        tips.push('Create urgency with time-limited offers');
        tips.push('Ensure all stakeholders are aligned before final pitch');
        break;
      case 'prospecting':
        tips.push('Personalize your outreach based on company research');
        tips.push('Follow up consistently - most deals close after 5+ touches');
        break;
    }

    return tips;
  }
}
