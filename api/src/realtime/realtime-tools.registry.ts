/**
 * Shared Tool Registry for Realtime Voice API
 *
 * This registry defines all tools available to the realtime voice assistant.
 * Tools are defined once and can be exported in different formats:
 * - Azure OpenAI Realtime format (for WebRTC sessions)
 * - Engagement messages (for Flutter UI feedback)
 *
 * To add a new tool:
 * 1. Add the tool definition to REALTIME_TOOL_DEFINITIONS
 * 2. Add engagement message to TOOL_ENGAGEMENT_MESSAGES
 * 3. Ensure the tool has a handler in conversations.service.ts executeTool()
 */

/**
 * Tool categories for organization
 */
export type ToolCategory =
  | 'lead'
  | 'contact'
  | 'account'
  | 'opportunity'
  | 'task'
  | 'activity'
  | 'communication'
  | 'notes'
  | 'intelligence'
  | 'meeting';

/**
 * Tool definition interface
 */
export interface RealtimeToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
  engagementMessage: string;
}

/**
 * All realtime voice tool definitions
 * Single source of truth - add new tools here
 */
export const REALTIME_TOOL_DEFINITIONS: RealtimeToolDefinition[] = [
  // ============ LEAD TOOLS ============
  {
    name: 'get_top_leads',
    description: 'Get top leads from the CRM ranked by lead score and buying intent. Use this when user asks for "top leads", "best leads", or "hot leads".',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of leads to return (default 5)' },
      },
    },
    engagementMessage: 'Let me pull up your top leads...',
  },
  {
    name: 'search_leads',
    description: 'Search for leads by name, email, company, status, or rating. Use this for general lead queries.',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'], description: 'Filter by lead status' },
        rating: { type: 'string', enum: ['HOT', 'WARM', 'COLD'], description: 'Filter by lead rating' },
        minScore: { type: 'number', description: 'Minimum lead score to filter by' },
        limit: { type: 'number', description: 'Maximum number of leads to return (default 10)' },
      },
    },
    engagementMessage: 'Searching your leads now...',
  },
  {
    name: 'get_lead_details',
    description: 'Get detailed information about a specific lead by ID',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'The ID of the lead to get details for' },
      },
      required: ['leadId'],
    },
    engagementMessage: 'Getting those lead details...',
  },
  {
    name: 'create_lead',
    description: 'Create a new lead in the CRM. Use when user says "create a lead", "add a new lead", "log a prospect", etc.',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'Lead first name' },
        lastName: { type: 'string', description: 'Lead last name' },
        email: { type: 'string', description: 'Lead email address' },
        phone: { type: 'string', description: 'Lead phone number' },
        company: { type: 'string', description: 'Company name' },
        title: { type: 'string', description: 'Job title' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'], description: 'Lead status (default NEW)' },
        rating: { type: 'string', enum: ['HOT', 'WARM', 'COLD'], description: 'Lead rating/temperature' },
        source: { type: 'string', description: 'Lead source (e.g., Website, Referral, Event)' },
        notes: { type: 'string', description: 'Additional notes about the lead' },
      },
      required: ['firstName', 'lastName'],
    },
    engagementMessage: 'Creating that lead for you...',
  },
  {
    name: 'update_lead',
    description: 'Update a lead status, rating, or add notes. Use when user wants to qualify/disqualify a lead, change its status, or update its rating.',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'The ID of the lead to update' },
        status: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'], description: 'New status for the lead' },
        rating: { type: 'string', enum: ['HOT', 'WARM', 'COLD'], description: 'New rating for the lead' },
        notes: { type: 'string', description: 'Notes about this update' },
      },
      required: ['leadId'],
    },
    engagementMessage: 'Updating that lead for you...',
  },

  // ============ CONTACT TOOLS ============
  {
    name: 'search_contacts',
    description: 'Search for contacts by name, email, company, or account. Use for "who are my contacts at X", "find contact", etc.',
    category: 'contact',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for contact name or email' },
        accountId: { type: 'string', description: 'Filter by account ID' },
        accountName: { type: 'string', description: 'Filter by account name' },
        limit: { type: 'number', description: 'Maximum number of contacts to return (default 10)' },
      },
    },
    engagementMessage: 'Looking up contacts...',
  },
  {
    name: 'get_contact_details',
    description: 'Get detailed information about a specific contact by ID',
    category: 'contact',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'The ID of the contact to get details for' },
      },
      required: ['contactId'],
    },
    engagementMessage: 'Getting contact details...',
  },
  {
    name: 'create_contact',
    description: 'Create a new contact in the CRM. Use when user says "create a contact", "add a contact", etc.',
    category: 'contact',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'Contact first name' },
        lastName: { type: 'string', description: 'Contact last name' },
        email: { type: 'string', description: 'Contact email address' },
        phone: { type: 'string', description: 'Contact phone number' },
        title: { type: 'string', description: 'Job title' },
        accountId: { type: 'string', description: 'Associated account ID' },
        accountName: { type: 'string', description: 'Account name if accountId not known (will look up)' },
        department: { type: 'string', description: 'Department within the company' },
        notes: { type: 'string', description: 'Additional notes about the contact' },
      },
      required: ['firstName', 'lastName'],
    },
    engagementMessage: 'Adding that contact...',
  },
  {
    name: 'update_contact',
    description: "Update a contact's information. Use when user wants to change contact details like email, phone, title.",
    category: 'contact',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Contact ID to update' },
        firstName: { type: 'string', description: 'Updated first name' },
        lastName: { type: 'string', description: 'Updated last name' },
        email: { type: 'string', description: 'Updated email address' },
        phone: { type: 'string', description: 'Updated phone number' },
        title: { type: 'string', description: 'Updated job title' },
        notes: { type: 'string', description: 'Notes about this update' },
      },
      required: ['contactId'],
    },
    engagementMessage: 'Updating contact info...',
  },

  // ============ ACCOUNT TOOLS ============
  {
    name: 'search_accounts',
    description: 'Search for accounts/companies by name, industry, or type.',
    category: 'account',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for account name' },
        type: { type: 'string', enum: ['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR'], description: 'Filter by account type' },
        industry: { type: 'string', description: 'Filter by industry' },
        limit: { type: 'number', description: 'Maximum number of accounts to return (default 10)' },
      },
    },
    engagementMessage: 'Searching accounts...',
  },
  {
    name: 'get_account_details',
    description: 'Get detailed information about a specific account by ID',
    category: 'account',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'The ID of the account to get details for' },
      },
      required: ['accountId'],
    },
    engagementMessage: 'Getting account information...',
  },
  {
    name: 'create_account',
    description: 'Create a new account/company in the CRM. Use when user says "create an account", "add a company", etc.',
    category: 'account',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Company/account name' },
        industry: { type: 'string', description: 'Industry sector' },
        type: { type: 'string', enum: ['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR'], description: 'Account type' },
        website: { type: 'string', description: 'Company website URL' },
        phone: { type: 'string', description: 'Company phone number' },
        annualRevenue: { type: 'number', description: 'Annual revenue in dollars' },
        employees: { type: 'number', description: 'Number of employees' },
        description: { type: 'string', description: 'Description of the company' },
      },
      required: ['name'],
    },
    engagementMessage: 'Creating that account...',
  },
  {
    name: 'update_account',
    description: "Update an account's information. Use when user wants to change company details.",
    category: 'account',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account ID to update' },
        name: { type: 'string', description: 'Updated company name' },
        industry: { type: 'string', description: 'Updated industry' },
        type: { type: 'string', enum: ['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR'], description: 'Updated account type' },
        website: { type: 'string', description: 'Updated website' },
        phone: { type: 'string', description: 'Updated phone' },
        notes: { type: 'string', description: 'Notes about this update' },
      },
      required: ['accountId'],
    },
    engagementMessage: 'Updating account details...',
  },

  // ============ OPPORTUNITY TOOLS ============
  {
    name: 'search_opportunities',
    description: 'Search for opportunities/deals by stage, amount, or account. Use for "my opportunities", "deals", or pipeline queries.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'], description: 'Filter by opportunity stage' },
        minAmount: { type: 'number', description: 'Minimum deal amount to filter by' },
        closingWithinDays: { type: 'number', description: 'Filter for opportunities closing within N days' },
        limit: { type: 'number', description: 'Maximum number of opportunities to return (default 10)' },
      },
    },
    engagementMessage: 'Checking your pipeline...',
  },
  {
    name: 'get_opportunity_details',
    description: 'Get detailed information about a specific opportunity/deal by ID',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'The ID of the opportunity to get details for' },
      },
      required: ['opportunityId'],
    },
    engagementMessage: 'Pulling up that deal...',
  },
  {
    name: 'create_opportunity',
    description: 'Create a new opportunity/deal in the CRM. Use when user says "create an opportunity", "add a deal", "log a potential sale", etc.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Opportunity/deal name' },
        accountId: { type: 'string', description: 'Associated account ID' },
        accountName: { type: 'string', description: 'Account name if accountId not known (will look up)' },
        amount: { type: 'number', description: 'Deal amount in dollars' },
        stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'], description: 'Sales stage' },
        closeDate: { type: 'string', description: 'Expected close date (ISO format)' },
        probability: { type: 'number', description: 'Win probability (0-100)' },
        description: { type: 'string', description: 'Description of the opportunity' },
        nextStep: { type: 'string', description: 'Next action to take' },
      },
      required: ['name'],
    },
    engagementMessage: 'Setting up that deal...',
  },
  {
    name: 'update_opportunity',
    description: 'Update an opportunity stage, amount, close date, or next steps. Use when user wants to move a deal forward, update the forecast, or change deal details.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'The ID of the opportunity to update' },
        stage: { type: 'string', enum: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'], description: 'New stage for the opportunity' },
        amount: { type: 'number', description: 'Deal amount in dollars' },
        closeDate: { type: 'string', description: 'Expected close date (ISO format)' },
        nextStep: { type: 'string', description: 'Next step for the opportunity' },
        notes: { type: 'string', description: 'Notes about this update' },
      },
      required: ['opportunityId'],
    },
    engagementMessage: 'Updating that opportunity...',
  },
  {
    name: 'get_pipeline_stats',
    description: 'Get sales pipeline statistics with total value, opportunity count, and breakdown by stage. Use for "pipeline summary", "deal summary", or "forecast".',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {},
    },
    engagementMessage: 'Calculating your pipeline stats...',
  },
  {
    name: 'get_at_risk_opportunities',
    description: 'Get opportunities that are at risk of being lost - stale deals, past due close dates, or low activity.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number to return (default 5)' },
      },
    },
    engagementMessage: 'Looking for at-risk deals...',
  },

  // ============ TASK TOOLS ============
  {
    name: 'get_my_tasks',
    description: "Get the user's tasks, optionally filtered by status or due date. Use for 'my tasks', 'to-do list', or 'what do I need to do'.",
    category: 'task',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED'], description: 'Filter by task status' },
        priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'Filter by priority' },
        dueToday: { type: 'boolean', description: 'Only return tasks due today' },
        overdue: { type: 'boolean', description: 'Only return overdue tasks' },
        limit: { type: 'number', description: 'Maximum number of tasks to return' },
      },
    },
    engagementMessage: 'Checking your tasks...',
  },
  {
    name: 'create_task',
    description: 'Create a new task or reminder for follow-up',
    category: 'task',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Task subject/title' },
        dueDate: { type: 'string', description: 'Due date in ISO format (e.g., 2024-01-15)' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Task priority' },
        description: { type: 'string', description: 'Task description or notes' },
        relatedTo: { type: 'string', description: 'Related entity reference (e.g., "lead:abc123" or "account:xyz789")' },
      },
      required: ['subject'],
    },
    engagementMessage: 'Creating that task...',
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed. Use when user says they finished a task, completed a follow-up, or done with an action item.',
    category: 'task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to complete' },
        notes: { type: 'string', description: 'Optional completion notes' },
      },
      required: ['taskId'],
    },
    engagementMessage: 'Marking that task complete...',
  },
  {
    name: 'update_task',
    description: "Update a task's details. Use when user wants to change due date, priority, subject, or reschedule.",
    category: 'task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        subject: { type: 'string', description: 'Updated task subject' },
        dueDate: { type: 'string', description: 'Updated due date (ISO format)' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Updated priority' },
        status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED'], description: 'Updated status' },
        description: { type: 'string', description: 'Updated description' },
      },
      required: ['taskId'],
    },
    engagementMessage: 'Updating that task...',
  },
  {
    name: 'delete_task',
    description: 'Delete a task. Use when user says "delete that task", "remove the task", "cancel the task".',
    category: 'task',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to delete' },
      },
      required: ['taskId'],
    },
    engagementMessage: 'Removing that task...',
  },

  // ============ ACTIVITY TOOLS ============
  {
    name: 'log_call',
    description: 'Log a phone call activity in the CRM',
    category: 'activity',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Call subject/title' },
        notes: { type: 'string', description: 'Call notes or summary' },
        duration: { type: 'number', description: 'Call duration in minutes' },
        outcome: { type: 'string', enum: ['CONNECTED', 'LEFT_VOICEMAIL', 'NO_ANSWER', 'BUSY'], description: 'Call outcome' },
        relatedTo: { type: 'string', description: 'Related entity reference (e.g., "lead:abc123")' },
      },
      required: ['subject'],
    },
    engagementMessage: 'Logging that call...',
  },
  {
    name: 'log_email',
    description: 'Log an email activity in the CRM. Use when user mentions sending or receiving an email related to a lead, contact, or opportunity.',
    category: 'activity',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email content or summary' },
        direction: { type: 'string', enum: ['SENT', 'RECEIVED'], description: 'Whether the email was sent or received' },
        relatedTo: { type: 'string', description: 'Related entity reference (e.g., "lead:abc123" or "contact:xyz789")' },
      },
      required: ['subject'],
    },
    engagementMessage: 'Recording that email...',
  },
  {
    name: 'get_activity_timeline',
    description: 'Get recent activity timeline including calls, emails, meetings, and notes',
    category: 'activity',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of activities to return (default 10)' },
        entityType: { type: 'string', enum: ['lead', 'account', 'opportunity', 'contact'], description: 'Filter by related entity type' },
        entityId: { type: 'string', description: 'Filter by specific entity ID' },
      },
    },
    engagementMessage: 'Getting recent activities...',
  },

  // ============ COMMUNICATION TOOLS ============
  {
    name: 'send_email',
    description: 'Send an email to a lead, contact, or any email address. Use when user asks to send, compose, or draft an email. This will send the email and log it in the CRM.',
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body content (plain text or HTML)' },
        leadId: { type: 'string', description: 'Optional lead ID to associate with this email' },
        contactId: { type: 'string', description: 'Optional contact ID to associate with this email' },
        opportunityId: { type: 'string', description: 'Optional opportunity ID to associate with this email' },
      },
      required: ['to', 'subject', 'body'],
    },
    engagementMessage: 'Sending that email now...',
  },
  {
    name: 'schedule_meeting',
    description: 'Schedule a meeting or calendar event on Zoom, Teams, or Google Meet. Use when user wants to set up a call, demo, or meeting with a prospect.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Meeting title' },
        startTime: { type: 'string', description: 'Start time in ISO 8601 format (e.g., "2025-01-15T14:00:00Z")' },
        endTime: { type: 'string', description: 'End time in ISO 8601 format (optional, defaults to 1 hour after start)' },
        description: { type: 'string', description: 'Meeting description or agenda' },
        platform: { type: 'string', enum: ['ZOOM', 'TEAMS', 'GOOGLE_MEET'], description: 'Meeting platform (defaults to ZOOM)' },
        attendeeEmails: { type: 'array', items: { type: 'string' }, description: 'Email addresses of attendees to invite' },
        leadId: { type: 'string', description: 'ID of the lead this meeting is about (optional)' },
        accountId: { type: 'string', description: 'ID of the account this meeting is about (optional)' },
      },
      required: ['title', 'startTime'],
    },
    engagementMessage: 'Scheduling that meeting...',
  },
  {
    name: 'list_meetings',
    description: "Get the user's meetings/calendar events. Use for 'my meetings', 'schedule', or 'calendar'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        upcoming: { type: 'boolean', description: 'Only return upcoming meetings (default true)' },
        today: { type: 'boolean', description: 'Only return meetings today' },
        limit: { type: 'number', description: 'Maximum number of meetings to return' },
      },
    },
    engagementMessage: 'Checking your calendar...',
  },
  {
    name: 'cancel_meeting',
    description: "Cancel or delete a scheduled meeting. Use when user says 'cancel meeting', 'delete meeting', 'remove meeting', or 'cancel the call with [name]'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'The ID of the meeting to cancel' },
        reason: { type: 'string', description: 'Optional reason for cancellation' },
        notifyAttendees: { type: 'boolean', description: 'Whether to notify attendees of the cancellation (default true)' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Cancelling that meeting...',
  },
  {
    name: 'get_meeting_rsvp_status',
    description: "Get RSVP/response status for a meeting - who accepted, declined, or hasn't responded. Use for 'who is coming to the meeting', 'meeting responses', 'RSVP status'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'The ID of the meeting to check' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Checking meeting responses...',
  },
  {
    name: 'get_meeting_participants',
    description: "Get the list of participants/attendees for a meeting. Use for 'who is in the meeting', 'meeting attendees', 'who was invited'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'The ID of the meeting' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Getting meeting participants...',
  },
  {
    name: 'get_upcoming_meetings',
    description: "Get upcoming scheduled meetings. Use for 'upcoming meetings', 'what meetings do I have', 'my schedule'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to look ahead (default 7)' },
        limit: { type: 'number', description: 'Maximum number of meetings to return (default 10)' },
      },
    },
    engagementMessage: 'Checking your upcoming meetings...',
  },

  // ============ NOTES TOOLS ============
  {
    name: 'create_note',
    description: 'Create a note on a lead, contact, account, or opportunity. Use when user says "add a note", "make a note", "document that".',
    category: 'notes',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Note content/text' },
        leadId: { type: 'string', description: 'Lead ID to attach note to' },
        contactId: { type: 'string', description: 'Contact ID to attach note to' },
        accountId: { type: 'string', description: 'Account ID to attach note to' },
        opportunityId: { type: 'string', description: 'Opportunity ID to attach note to' },
      },
      required: ['content'],
    },
    engagementMessage: 'Adding that note...',
  },
  {
    name: 'get_notes',
    description: 'Get notes for a lead, contact, account, or opportunity. Use when user asks "what notes do I have", "show notes", etc.',
    category: 'notes',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead ID to get notes for' },
        contactId: { type: 'string', description: 'Contact ID to get notes for' },
        accountId: { type: 'string', description: 'Account ID to get notes for' },
        opportunityId: { type: 'string', description: 'Opportunity ID to get notes for' },
        limit: { type: 'number', description: 'Maximum number of notes to return' },
      },
    },
    engagementMessage: 'Getting notes...',
  },

  // ============ INTELLIGENCE TOOLS ============
  {
    name: 'get_daily_priorities',
    description: "Get today's priorities including tasks due, meetings scheduled, and follow-ups needed. Use for 'what should I focus on', 'daily summary', or 'priorities'.",
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {},
    },
    engagementMessage: 'Getting your priorities for today...',
  },
  {
    name: 'research_company',
    description: 'Research a company using web search to get overview, news, and leadership info. Use for "research [company]", "tell me about [company]", "look up [company]".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        companyUrlOrName: { type: 'string', description: 'Company name or website URL to research' },
      },
      required: ['companyUrlOrName'],
    },
    engagementMessage: 'Researching that company...',
  },
  {
    name: 'web_search',
    description: 'Search the web for information. Use for "search for", "look up", "find information about".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    engagementMessage: 'Searching the web...',
  },
  {
    name: 'get_forecast',
    description: 'Get sales forecast and projected revenue. Use for "show my forecast", "what\'s my projected revenue", "how am I tracking".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {},
    },
    engagementMessage: 'Pulling up your forecast...',
  },
  {
    name: 'get_recommended_actions',
    description: 'Get AI-recommended next actions based on pipeline and activity data. Use for "what should I do next", "any recommendations", "suggest actions".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {},
    },
    engagementMessage: 'Getting recommendations for you...',
  },
  {
    name: 'suggest_next_actions',
    description: 'Get AI suggestions for next best actions to take on a deal or lead.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['lead', 'opportunity', 'account'], description: 'Type of entity' },
        entityId: { type: 'string', description: 'ID of the entity' },
      },
    },
    engagementMessage: 'Analyzing next best actions...',
  },
  {
    name: 'prepare_meeting_brief',
    description: 'Get a briefing document for an upcoming meeting with a contact or account.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account ID for the meeting' },
        contactId: { type: 'string', description: 'Contact ID for the meeting' },
      },
    },
    engagementMessage: 'Preparing your meeting brief...',
  },
  {
    name: 'analyze_deal_risk',
    description: 'Analyze risk factors for a specific deal/opportunity.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Opportunity ID to analyze' },
      },
      required: ['opportunityId'],
    },
    engagementMessage: 'Analyzing deal risk...',
  },
  {
    name: 'generate_followup_email',
    description: 'Generate a follow-up email draft for a contact or after a meeting.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Contact ID to follow up with' },
        meetingId: { type: 'string', description: 'Meeting ID to follow up on' },
        context: { type: 'string', description: 'Additional context for the email' },
      },
    },
    engagementMessage: 'Drafting your follow-up email...',
  },

  // ============ EMAIL TRACKING TOOLS ============
  {
    name: 'get_email_threads',
    description: "Get email threads and conversations. Use for 'show my emails', 'email threads', 'email conversations'.",
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum threads to return (default 10)' },
      },
    },
    engagementMessage: 'Getting your email threads...',
  },
  {
    name: 'get_awaiting_responses',
    description: "Get emails waiting for a response. Use for 'emails awaiting response', 'pending emails', 'who haven't replied'.",
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum to return (default 10)' },
      },
    },
    engagementMessage: 'Checking for pending responses...',
  },
  {
    name: 'get_thread_messages',
    description: 'Get all messages in an email thread to read the full conversation.',
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        threadId: { type: 'string', description: 'Email thread ID' },
      },
      required: ['threadId'],
    },
    engagementMessage: 'Getting that email conversation...',
  },
  {
    name: 'get_email_drafts',
    description: "Get AI-drafted email responses ready for review. Use for 'show my drafts', 'email drafts', 'pending drafts'.",
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum drafts to return' },
      },
    },
    engagementMessage: 'Getting your email drafts...',
  },
  {
    name: 'send_email_draft',
    description: 'Send a previously drafted email. Use after reviewing a draft.',
    category: 'communication',
    parameters: {
      type: 'object',
      properties: {
        draftId: { type: 'string', description: 'Draft ID to send' },
      },
      required: ['draftId'],
    },
    engagementMessage: 'Sending that draft...',
  },

  // ============ DOCUMENT TOOLS ============
  {
    name: 'list_indexed_documents',
    description: "List all indexed/uploaded documents. Use for 'what documents do I have', 'my documents', 'uploaded files'.",
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum documents to return' },
      },
    },
    engagementMessage: 'Getting your documents...',
  },
  {
    name: 'search_document',
    description: 'Search within a document for specific information. Use for "find in document", "search the contract for", "what does the document say about".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Document ID to search' },
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    engagementMessage: 'Searching the document...',
  },
  {
    name: 'get_document_summary',
    description: 'Get a summary of an indexed document. Use for "summarize the document", "what is this document about".',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'Document ID to summarize' },
      },
      required: ['documentId'],
    },
    engagementMessage: 'Summarizing the document...',
  },

  // ============ QUOTE & CONTRACT TOOLS ============
  {
    name: 'search_quotes',
    description: "Search for quotes/proposals. Use for 'my quotes', 'find quote', 'proposals'.",
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'], description: 'Quote status filter' },
        opportunityId: { type: 'string', description: 'Filter by opportunity' },
        limit: { type: 'number', description: 'Maximum quotes to return' },
      },
    },
    engagementMessage: 'Finding your quotes...',
  },
  {
    name: 'create_quote',
    description: 'Create a new quote/proposal for an opportunity.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Opportunity ID for the quote' },
        name: { type: 'string', description: 'Quote name' },
        validUntil: { type: 'string', description: 'Expiration date (ISO format)' },
        description: { type: 'string', description: 'Quote description' },
      },
      required: ['opportunityId', 'name'],
    },
    engagementMessage: 'Creating that quote...',
  },
  {
    name: 'search_contracts',
    description: "Search for contracts. Use for 'my contracts', 'find contract', 'active contracts'.",
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'], description: 'Contract status filter' },
        accountId: { type: 'string', description: 'Filter by account' },
        limit: { type: 'number', description: 'Maximum contracts to return' },
      },
    },
    engagementMessage: 'Finding your contracts...',
  },
  {
    name: 'create_contract',
    description: 'Create a new contract from a quote or for an account.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'Quote ID to create contract from' },
        accountId: { type: 'string', description: 'Account ID for the contract' },
        name: { type: 'string', description: 'Contract name' },
        startDate: { type: 'string', description: 'Contract start date' },
        endDate: { type: 'string', description: 'Contract end date' },
      },
      required: ['name'],
    },
    engagementMessage: 'Creating that contract...',
  },

  // ============ ADDITIONAL MEETING TOOLS ============
  {
    name: 'update_meeting_rsvp',
    description: "Update RSVP status for a meeting participant. Use for 'mark as accepted', 'update RSVP', 'they declined'.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Meeting ID' },
        email: { type: 'string', description: 'Participant email' },
        status: { type: 'string', enum: ['ACCEPTED', 'DECLINED', 'TENTATIVE'], description: 'New RSVP status' },
      },
      required: ['meetingId', 'email', 'status'],
    },
    engagementMessage: 'Updating RSVP status...',
  },
  {
    name: 'get_meeting_response_history',
    description: 'Get history of RSVP changes for a meeting.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Meeting ID' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Getting response history...',
  },
  {
    name: 'resend_meeting_invite',
    description: "Resend meeting invites to participants who haven't responded.",
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Meeting ID' },
        emails: { type: 'array', items: { type: 'string' }, description: 'Specific emails to resend to (optional)' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Resending meeting invites...',
  },
  {
    name: 'check_meeting_availability',
    description: 'Check availability for scheduling a meeting.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        emails: { type: 'array', items: { type: 'string' }, description: 'Email addresses to check' },
        date: { type: 'string', description: 'Date to check (ISO format)' },
        duration: { type: 'number', description: 'Meeting duration in minutes' },
      },
      required: ['date'],
    },
    engagementMessage: 'Checking availability...',
  },
  {
    name: 'get_meeting_transcript',
    description: 'Get the transcript of a recorded meeting.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Meeting ID' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Getting meeting transcript...',
  },
  {
    name: 'get_meeting_analysis',
    description: 'Get AI analysis of a meeting including sentiment, key points, and action items.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'Meeting ID' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Analyzing the meeting...',
  },

  // ============ ADDITIONAL CRM TOOLS ============
  {
    name: 'qualify_lead',
    description: 'Qualify or disqualify a lead. Use for "qualify this lead", "mark as qualified", "disqualify lead".',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead ID' },
        qualified: { type: 'boolean', description: 'Whether the lead is qualified' },
        reason: { type: 'string', description: 'Reason for qualification decision' },
      },
      required: ['leadId', 'qualified'],
    },
    engagementMessage: 'Updating lead qualification...',
  },
  {
    name: 'convert_lead',
    description: 'Convert a qualified lead to an opportunity. Use for "convert this lead", "create opportunity from lead".',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead ID to convert' },
        opportunityName: { type: 'string', description: 'Name for the new opportunity' },
        amount: { type: 'number', description: 'Deal amount' },
      },
      required: ['leadId'],
    },
    engagementMessage: 'Converting that lead...',
  },
  {
    name: 'close_opportunity',
    description: 'Close an opportunity as won or lost. Use for "close this deal", "mark as won", "lost the deal".',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Opportunity ID' },
        won: { type: 'boolean', description: 'Whether the deal was won' },
        reason: { type: 'string', description: 'Close reason' },
        amount: { type: 'number', description: 'Final deal amount (if won)' },
      },
      required: ['opportunityId', 'won'],
    },
    engagementMessage: 'Closing that deal...',
  },
  {
    name: 'analyze_opportunity',
    description: 'Get AI analysis of an opportunity including win probability and risk factors.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Opportunity ID' },
      },
      required: ['opportunityId'],
    },
    engagementMessage: 'Analyzing that opportunity...',
  },
  {
    name: 'log_activity',
    description: 'Log any type of activity (call, email, meeting, note) in the CRM.',
    category: 'activity',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'OTHER'], description: 'Activity type' },
        subject: { type: 'string', description: 'Activity subject' },
        description: { type: 'string', description: 'Activity details' },
        relatedTo: { type: 'string', description: 'Related entity (e.g., "lead:abc123")' },
        duration: { type: 'number', description: 'Duration in minutes (for calls/meetings)' },
      },
      required: ['type', 'subject'],
    },
    engagementMessage: 'Logging that activity...',
  },

  // ============ DELETE OPERATIONS ============
  {
    name: 'delete_lead',
    description: 'Delete a lead from the CRM. Use when user says "delete that lead", "remove the lead", etc.',
    category: 'lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID of the lead to delete' },
      },
      required: ['leadId'],
    },
    engagementMessage: 'Deleting that lead...',
  },
  {
    name: 'delete_contact',
    description: 'Delete a contact from the CRM.',
    category: 'contact',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'ID of the contact to delete' },
      },
      required: ['contactId'],
    },
    engagementMessage: 'Deleting that contact...',
  },
  {
    name: 'delete_account',
    description: 'Delete an account from the CRM.',
    category: 'account',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ID of the account to delete' },
      },
      required: ['accountId'],
    },
    engagementMessage: 'Deleting that account...',
  },
  {
    name: 'delete_opportunity',
    description: 'Delete an opportunity from the CRM.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'ID of the opportunity to delete' },
      },
      required: ['opportunityId'],
    },
    engagementMessage: 'Deleting that opportunity...',
  },
  {
    name: 'delete_note',
    description: 'Delete a note from the CRM.',
    category: 'notes',
    parameters: {
      type: 'object',
      properties: {
        noteId: { type: 'string', description: 'ID of the note to delete' },
      },
      required: ['noteId'],
    },
    engagementMessage: 'Deleting that note...',
  },
  {
    name: 'delete_quote',
    description: 'Delete a quote from the CRM.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID of the quote to delete' },
      },
      required: ['quoteId'],
    },
    engagementMessage: 'Deleting that quote...',
  },
  {
    name: 'delete_contract',
    description: 'Delete a contract from the CRM. Use when user says "delete that contract", "remove the contract", etc.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        contractId: { type: 'string', description: 'ID of the contract to delete' },
      },
      required: ['contractId'],
    },
    engagementMessage: 'Deleting that contract...',
  },

  // ============ IRIS RANK & INTELLIGENCE TOOLS ============
  {
    name: 'iris_rank_entities',
    description: 'Use IRIS Rank AI to rank and score CRM entities (leads, opportunities) based on likelihood to convert/close.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['leads', 'opportunities'], description: 'Type of entities to rank' },
        limit: { type: 'number', description: 'Number of entities to rank (default 10)' },
        includeReasoning: { type: 'boolean', description: 'Include AI reasoning for each rank' },
      },
      required: ['entityType'],
    },
    engagementMessage: 'Running IRIS Rank analysis...',
  },
  {
    name: 'iris_explain_rank',
    description: 'Get detailed IRIS Rank explanation for why a specific entity was scored/ranked a certain way.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['lead', 'opportunity'], description: 'Entity type' },
        entityId: { type: 'string', description: 'ID of the entity to explain' },
      },
      required: ['entityType', 'entityId'],
    },
    engagementMessage: 'Explaining the IRIS Rank score...',
  },
  {
    name: 'iris_get_momentum',
    description: 'Get momentum scores showing which leads/opportunities are gaining or losing engagement.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['leads', 'opportunities'], description: 'Type of entities' },
        trend: { type: 'string', enum: ['rising', 'falling', 'all'], description: 'Filter by momentum trend' },
        limit: { type: 'number', description: 'Number of results' },
      },
      required: ['entityType'],
    },
    engagementMessage: 'Analyzing momentum trends...',
  },
  {
    name: 'iris_get_at_risk',
    description: 'Get entities that are at risk of being lost or going cold.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['leads', 'opportunities'], description: 'Type of entities' },
        riskLevel: { type: 'string', enum: ['high', 'medium', 'all'], description: 'Filter by risk level' },
        limit: { type: 'number', description: 'Number of results' },
      },
      required: ['entityType'],
    },
    engagementMessage: 'Finding at-risk items...',
  },

  // ============ QUOTE & CONTRACT DETAILS ============
  {
    name: 'get_quote_details',
    description: 'Get detailed information about a specific quote.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID of the quote' },
      },
      required: ['quoteId'],
    },
    engagementMessage: 'Getting quote details...',
  },
  {
    name: 'update_quote',
    description: 'Update an existing quote.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        quoteId: { type: 'string', description: 'ID of the quote to update' },
        status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'], description: 'Quote status' },
        expiryDate: { type: 'string', description: 'Quote expiry date (ISO format)' },
        discount: { type: 'number', description: 'Discount percentage' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['quoteId'],
    },
    engagementMessage: 'Updating that quote...',
  },
  {
    name: 'get_contract_details',
    description: 'Get detailed information about a specific contract.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        contractId: { type: 'string', description: 'ID of the contract' },
      },
      required: ['contractId'],
    },
    engagementMessage: 'Getting contract details...',
  },
  {
    name: 'update_contract',
    description: 'Update an existing contract.',
    category: 'opportunity',
    parameters: {
      type: 'object',
      properties: {
        contractId: { type: 'string', description: 'ID of the contract to update' },
        status: { type: 'string', enum: ['DRAFT', 'IN_APPROVAL', 'ACTIVATED', 'EXPIRED', 'TERMINATED'], description: 'Contract status' },
        endDate: { type: 'string', description: 'Contract end date (ISO format)' },
        notes: { type: 'string', description: 'Additional notes' },
      },
      required: ['contractId'],
    },
    engagementMessage: 'Updating that contract...',
  },

  // ============ MEETING TOOLS ============
  {
    name: 'get_meeting',
    description: 'Get details about a specific meeting by ID.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'ID of the meeting' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Getting meeting details...',
  },
  {
    name: 'get_meeting_insights',
    description: 'Get AI-generated insights from a meeting including key points, action items, and sentiment.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'ID of the meeting' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Analyzing meeting insights...',
  },
  {
    name: 'create_tasks_from_meeting',
    description: 'Automatically create follow-up tasks from meeting action items.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        meetingId: { type: 'string', description: 'ID of the meeting' },
        assignToOwner: { type: 'boolean', description: 'Assign tasks to meeting owner (default true)' },
      },
      required: ['meetingId'],
    },
    engagementMessage: 'Creating tasks from meeting...',
  },
  {
    name: 'search_meeting_transcripts',
    description: 'Search through meeting transcripts for specific topics or keywords.',
    category: 'meeting',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        dateFrom: { type: 'string', description: 'Start date filter (ISO format)' },
        dateTo: { type: 'string', description: 'End date filter (ISO format)' },
        limit: { type: 'number', description: 'Maximum results' },
      },
      required: ['query'],
    },
    engagementMessage: 'Searching meeting transcripts...',
  },

  // ============ CAMPAIGN TOOLS ============
  {
    name: 'get_campaign_details',
    description: 'Get details about a specific marketing campaign.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'ID of the campaign' },
      },
      required: ['campaignId'],
    },
    engagementMessage: 'Getting campaign details...',
  },
  {
    name: 'search_campaigns',
    description: 'Search for marketing campaigns.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'ABORTED'], description: 'Campaign status' },
        type: { type: 'string', enum: ['EMAIL', 'WEBINAR', 'CONFERENCE', 'ADVERTISEMENT', 'OTHER'], description: 'Campaign type' },
        limit: { type: 'number', description: 'Maximum results' },
      },
    },
    engagementMessage: 'Searching campaigns...',
  },
  {
    name: 'get_campaign_roi',
    description: 'Get ROI metrics and performance data for a campaign.',
    category: 'intelligence',
    parameters: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', description: 'ID of the campaign' },
      },
      required: ['campaignId'],
    },
    engagementMessage: 'Calculating campaign ROI...',
  },
];

/**
 * Convert tool definitions to Azure OpenAI Realtime format
 */
export function getAzureRealtimeTools(): any[] {
  return REALTIME_TOOL_DEFINITIONS.map(tool => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Get engagement message map for Flutter
 */
export function getEngagementMessages(): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const tool of REALTIME_TOOL_DEFINITIONS) {
    messages[tool.name] = tool.engagementMessage;
  }
  return messages;
}

/**
 * Get engagement message for a specific tool
 */
export function getEngagementMessage(toolName: string): string {
  const tool = REALTIME_TOOL_DEFINITIONS.find(t => t.name === toolName);
  return tool?.engagementMessage || 'One moment, let me check that...';
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: ToolCategory): RealtimeToolDefinition[] {
  return REALTIME_TOOL_DEFINITIONS.filter(t => t.category === category);
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return REALTIME_TOOL_DEFINITIONS.map(t => t.name);
}

/**
 * Check if a tool exists
 */
export function hasRealtimeTool(name: string): boolean {
  return REALTIME_TOOL_DEFINITIONS.some(t => t.name === name);
}
