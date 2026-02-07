/**
 * Grounded Tool Result Interface
 *
 * This interface ensures AI responses are grounded in actual tool execution results,
 * preventing hallucinations by providing:
 * 1. Explicit facts the AI can claim
 * 2. Pre-formatted verified responses
 * 3. Clear boundaries on what AI can add
 *
 * Based on Perplexity's citation-grounded architecture.
 */

// =============================================================================
// CORE INTERFACES
// =============================================================================

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface GroundedToolResult<TData = any, TFacts extends BaseFacts = BaseFacts> {
  /** Whether the tool execution succeeded */
  success: boolean;

  /** Error message if success is false */
  error?: string;

  /**
   * EXPLICIT FACTS - The only claims AI is allowed to make about this result.
   * AI must NOT make claims beyond what's in facts.
   */
  facts: TFacts;

  /** Raw data for reference (AI should minimize interpretation) */
  data?: TData;

  /**
   * Pre-formatted message AI MUST use verbatim for CRITICAL/HIGH risk tools.
   * This prevents AI from reinterpreting or embellishing results.
   */
  verified_response: string;

  /**
   * What additional content AI is allowed to add beyond verified_response.
   * Empty array = AI must use verified_response exactly as-is.
   */
  allowed_additions: AllowedAddition[];

  /** Risk level determines how strictly grounding is enforced */
  risk_level: RiskLevel;
}

export type AllowedAddition =
  | 'suggestions'      // AI can suggest next steps
  | 'context'          // AI can add relevant context
  | 'explanation'      // AI can explain what happened
  | 'follow_up_questions'; // AI can ask clarifying questions

// =============================================================================
// BASE FACT INTERFACES
// =============================================================================

export interface BaseFacts {
  /** Whether the primary action completed */
  action_completed: boolean;
}

// =============================================================================
// CRITICAL TOOL FACTS (External side effects)
// =============================================================================

/** Facts for email sending operations */
export interface EmailSendFacts extends BaseFacts {
  email_sent: boolean;
  recipients: string[];
  failed_recipients: string[];
  delivery_status: 'sent' | 'queued' | 'partial' | 'failed';
  message_id?: string;
  thread_id?: string;
  subject: string;
  failure_reason?: string;
}

/** Facts for meeting scheduling operations */
export interface MeetingScheduleFacts extends BaseFacts {
  meeting_created: boolean;
  meeting_id?: string;
  platform: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | string;
  meeting_url?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes?: number;
  invites_sent: boolean;
  invites_sent_to: string[];
  invites_failed_for: string[];
  calendar_event_created: boolean;
  salesforce_synced: boolean;
  salesforce_event_id?: string;
}

/** Facts for meeting cancellation */
export interface MeetingCancelFacts extends BaseFacts {
  meeting_cancelled: boolean;
  meeting_id: string;
  meeting_title: string;
  notifications_sent: boolean;
  notified_participants: string[];
  notification_failed_for: string[];
  calendar_event_removed: boolean;
  salesforce_event_removed: boolean;
}

/** Facts for meeting update operations */
export interface MeetingUpdateFacts extends BaseFacts {
  meeting_updated: boolean;
  meeting_id: string;
  meeting_title: string;
  fields_changed: string[];
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  reschedule_notifications_sent: boolean;
  notified_participants: string[];
  notification_failed_for: string[];
  calendar_event_updated: boolean;
  salesforce_event_updated: boolean;
}

/** Facts for meeting invite resend */
export interface MeetingResendFacts extends BaseFacts {
  invites_resent: boolean;
  resent_to: string[];
  failed_for: string[];
  meeting_id: string;
}

/** Facts for bulk operations */
export interface BulkOperationFacts extends BaseFacts {
  operation_type: 'create' | 'update' | 'delete';
  total_requested: number;
  successful_count: number;
  failed_count: number;
  successful_ids: string[];
  failed_ids: string[];
  error_details?: Record<string, string>;
}

/** Facts for user management */
export interface UserManagementFacts extends BaseFacts {
  user_id?: string;
  username?: string;
  operation: 'create' | 'freeze' | 'unfreeze' | 'reset_password' | 'update';
  email_sent: boolean;
  email_recipient?: string;
  previous_state?: string;
  new_state?: string;
}

/** Facts for code execution */
export interface CodeExecutionFacts extends BaseFacts {
  execution_completed: boolean;
  execution_result?: 'success' | 'failure' | 'compile_error' | 'runtime_error';
  output?: string;
  error_message?: string;
  logs?: string[];
}

/** Facts for test execution */
export interface TestExecutionFacts extends BaseFacts {
  tests_executed: boolean;
  total_tests: number;
  tests_passed: number;
  tests_failed: number;
  code_coverage?: number;
  failed_test_names: string[];
}

// =============================================================================
// HIGH RISK TOOL FACTS (Data mutations)
// =============================================================================

/** Facts for record creation */
export interface RecordCreateFacts extends BaseFacts {
  record_created: boolean;
  record_id?: string;
  record_type: string;
  record_name?: string;
  fields_set: string[];
  validation_errors?: string[];
  duplicate_detected?: boolean;
}

/** Facts for record update */
export interface RecordUpdateFacts extends BaseFacts {
  record_updated: boolean;
  record_id: string;
  record_type: string;
  record_name?: string;
  fields_changed: string[];
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  validation_errors?: string[];
}

/** Facts for record deletion */
export interface RecordDeleteFacts extends BaseFacts {
  record_deleted: boolean;
  record_id: string;
  record_type: string;
  record_name?: string;
  cascade_deleted: Array<{ type: string; id: string; name?: string }>;
  deletion_blocked?: boolean;
  block_reason?: string;
}

/** Facts for lead conversion */
export interface LeadConversionFacts extends BaseFacts {
  lead_converted: boolean;
  lead_id: string;
  lead_name: string;
  account_created: boolean;
  account_id?: string;
  account_name?: string;
  contact_created: boolean;
  contact_id?: string;
  contact_name?: string;
  opportunity_created: boolean;
  opportunity_id?: string;
  opportunity_name?: string;
}

/** Facts for status changes */
export interface StatusChangeFacts extends BaseFacts {
  status_changed: boolean;
  record_id: string;
  record_type: string;
  record_name?: string;
  previous_status: string;
  new_status: string;
  side_effects?: string[];
}

// =============================================================================
// MEDIUM RISK TOOL FACTS (AI interpretation)
// =============================================================================

/** Facts for analysis operations */
export interface AnalysisFacts extends BaseFacts {
  analysis_completed: boolean;
  data_sources_used: string[];
  records_analyzed: number;
  confidence_level: 'high' | 'medium' | 'low';
  data_freshness: string;
  caveats: string[];
  methodology?: string;
}

/** Facts for document search */
export interface DocumentSearchFacts extends BaseFacts {
  search_completed: boolean;
  document_id: string;
  document_name: string;
  query: string;
  sections_searched: number;
  matches_found: number;
  top_match_score?: number;
  sources: Array<{ section: string; page?: number; relevance: number }>;
}

/** Facts for web research */
export interface WebResearchFacts extends BaseFacts {
  research_completed: boolean;
  sources_searched: number;
  sources_found: number;
  source_urls: string[];
  search_queries_used: string[];
  data_retrieval_date: string;
}

// =============================================================================
// LOW RISK TOOL FACTS (Data retrieval)
// =============================================================================

/** Facts for search operations */
export interface SearchFacts extends BaseFacts {
  query_executed: boolean;
  search_criteria: Record<string, any>;
  total_matching: number;
  results_returned: number;
  page?: number;
  has_more: boolean;
}

/** Facts for get/retrieve operations */
export interface RetrieveFacts extends BaseFacts {
  record_found: boolean;
  record_id?: string;
  record_type: string;
  record_name?: string;
  fields_returned: string[];
  related_records_included: string[];
}

// =============================================================================
// RESPONSE TEMPLATES
// =============================================================================

export const RESPONSE_TEMPLATES = {
  // ===== CRITICAL: Email =====
  send_email: {
    success: (f: EmailSendFacts) =>
      `Email sent successfully.\n• To: ${f.recipients.join(', ')}\n• Subject: "${f.subject}"\n• Status: ${f.delivery_status}${f.message_id ? `\n• Message ID: ${f.message_id}` : ''}`,

    partial: (f: EmailSendFacts) =>
      `Email partially delivered.\n• Delivered to: ${f.recipients.filter(r => !f.failed_recipients.includes(r)).join(', ')}\n• Failed for: ${f.failed_recipients.join(', ')}\n• Reason: ${f.failure_reason || 'Unknown'}`,

    failure: (f: EmailSendFacts) =>
      `Failed to send email: ${f.failure_reason || 'Unknown error'}`,
  },

  // ===== CRITICAL: Meeting =====
  schedule_meeting: {
    success_with_invites: (f: MeetingScheduleFacts) =>
      `Meeting scheduled successfully.\n• Title: ${f.meeting_id}\n• Platform: ${f.platform}\n• Date/Time: ${f.scheduled_start}\n• Duration: ${f.duration_minutes} minutes\n• Meeting Link: ${f.meeting_url}\n• Calendar invites sent to: ${f.invites_sent_to.join(', ')}${f.salesforce_synced ? '\n• Synced to Salesforce' : ''}`,

    success_no_invites: (f: MeetingScheduleFacts) =>
      `Meeting scheduled successfully.\n• Platform: ${f.platform}\n• Date/Time: ${f.scheduled_start}\n• Duration: ${f.duration_minutes} minutes\n• Meeting Link: ${f.meeting_url}\n\n⚠️ No calendar invites were sent - no attendee email addresses were provided.\nPlease share the meeting link manually or provide attendee emails to send invites.${f.salesforce_synced ? '\n• Synced to Salesforce' : ''}`,

    failure: (error: string) =>
      `Failed to schedule meeting: ${error}`,
  },

  cancel_meeting: {
    success_with_notify: (f: MeetingCancelFacts) =>
      `Meeting "${f.meeting_title}" has been cancelled.\n• Cancellation notifications sent to: ${f.notified_participants.join(', ')}\n• Calendar event removed`,

    success_no_notify: (f: MeetingCancelFacts) =>
      `Meeting "${f.meeting_title}" has been cancelled.\n⚠️ No cancellation notifications were sent (no participant emails on file).\n• Calendar event removed`,

    failure: (error: string) =>
      `Failed to cancel meeting: ${error}`,
  },

  update_meeting: {
    success_with_notify: (f: MeetingUpdateFacts) =>
      `Meeting "${f.meeting_title}" updated successfully.\n• Changes: ${f.fields_changed.map(field => `${field}: ${f.previous_values[field]} → ${f.new_values[field]}`).join(', ')}\n• Update notifications sent to: ${f.notified_participants.join(', ')}${f.salesforce_event_updated ? '\n• Salesforce Event updated' : ''}`,

    success_no_notify: (f: MeetingUpdateFacts) =>
      `Meeting "${f.meeting_title}" updated successfully.\n• Changes: ${f.fields_changed.map(field => `${field}: ${f.previous_values[field]} → ${f.new_values[field]}`).join(', ')}\n⚠️ No update notifications were sent - no participant emails on file.\nPlease notify participants manually about the changes.${f.salesforce_event_updated ? '\n• Salesforce Event updated' : ''}`,

    no_changes: (f: MeetingUpdateFacts) =>
      `No changes made to meeting "${f.meeting_title}" - values were already set to the requested values.`,

    failure: (error: string) =>
      `Failed to update meeting: ${error}`,
  },

  // ===== HIGH: Create =====
  create_record: {
    success: (f: RecordCreateFacts) =>
      `${f.record_type} "${f.record_name || f.record_id}" created successfully.\n• ID: ${f.record_id}\n• Fields set: ${f.fields_set.join(', ')}`,

    duplicate: (f: RecordCreateFacts) =>
      `${f.record_type} created, but a potential duplicate was detected.\n• ID: ${f.record_id}\n• Please review for duplicates.`,

    failure: (f: RecordCreateFacts) =>
      `Failed to create ${f.record_type}: ${f.validation_errors?.join(', ') || 'Unknown error'}`,
  },

  // ===== HIGH: Update =====
  update_record: {
    success: (f: RecordUpdateFacts) =>
      `${f.record_type} "${f.record_name || f.record_id}" updated successfully.\n• Fields changed: ${f.fields_changed.map(field => `${field}: ${f.previous_values[field]} → ${f.new_values[field]}`).join(', ')}`,

    no_changes: (f: RecordUpdateFacts) =>
      `No changes made to ${f.record_type} "${f.record_name || f.record_id}" - values were already set to the requested values.`,

    failure: (f: RecordUpdateFacts) =>
      `Failed to update ${f.record_type}: ${f.validation_errors?.join(', ') || 'Unknown error'}`,
  },

  // ===== HIGH: Delete =====
  delete_record: {
    success: (f: RecordDeleteFacts) =>
      `${f.record_type} "${f.record_name || f.record_id}" deleted successfully.${f.cascade_deleted.length > 0 ? `\n• Also deleted: ${f.cascade_deleted.map(r => `${r.type} "${r.name || r.id}"`).join(', ')}` : ''}`,

    blocked: (f: RecordDeleteFacts) =>
      `Cannot delete ${f.record_type} "${f.record_name || f.record_id}": ${f.block_reason}`,

    failure: (error: string) =>
      `Failed to delete record: ${error}`,
  },

  // ===== MEDIUM: Analysis =====
  analysis: {
    success: (f: AnalysisFacts, summary: string) =>
      `Analysis completed (${f.confidence_level} confidence).\n• Data sources: ${f.data_sources_used.join(', ')}\n• Records analyzed: ${f.records_analyzed}\n• Data as of: ${f.data_freshness}${f.caveats.length > 0 ? `\n• Caveats: ${f.caveats.join('; ')}` : ''}\n\n${summary}`,

    low_confidence: (f: AnalysisFacts, summary: string) =>
      `⚠️ Analysis completed with LOW confidence - results should be verified.\n• Data sources: ${f.data_sources_used.join(', ')}\n• Caveats: ${f.caveats.join('; ')}\n\n${summary}`,

    failure: (error: string) =>
      `Analysis failed: ${error}`,
  },

  // ===== LOW: Search =====
  search: {
    success: (f: SearchFacts, results: string) =>
      `Found ${f.total_matching} result${f.total_matching !== 1 ? 's' : ''}${f.has_more ? ` (showing ${f.results_returned})` : ''}.\n\n${results}`,

    no_results: (f: SearchFacts) =>
      `No results found matching your criteria.`,

    failure: (error: string) =>
      `Search failed: ${error}`,
  },

  // ===== LOW: Retrieve =====
  retrieve: {
    success: (f: RetrieveFacts, details: string) =>
      details,

    not_found: (f: RetrieveFacts) =>
      `${f.record_type} with ID "${f.record_id}" not found.`,

    failure: (error: string) =>
      `Failed to retrieve record: ${error}`,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates a grounded tool result for CRITICAL operations
 */
export function createCriticalResult<TData, TFacts extends BaseFacts>(
  success: boolean,
  facts: TFacts,
  verifiedResponse: string,
  data?: TData,
  error?: string
): GroundedToolResult<TData, TFacts> {
  return {
    success,
    facts,
    data,
    error,
    verified_response: verifiedResponse,
    allowed_additions: success ? ['suggestions'] : [],
    risk_level: 'CRITICAL',
  };
}

/**
 * Creates a grounded tool result for HIGH risk operations
 */
export function createHighRiskResult<TData, TFacts extends BaseFacts>(
  success: boolean,
  facts: TFacts,
  verifiedResponse: string,
  data?: TData,
  error?: string
): GroundedToolResult<TData, TFacts> {
  return {
    success,
    facts,
    data,
    error,
    verified_response: verifiedResponse,
    allowed_additions: success ? ['suggestions', 'context'] : [],
    risk_level: 'HIGH',
  };
}

/**
 * Creates a grounded tool result for MEDIUM risk operations
 */
export function createMediumRiskResult<TData, TFacts extends BaseFacts>(
  success: boolean,
  facts: TFacts,
  verifiedResponse: string,
  data?: TData,
  error?: string
): GroundedToolResult<TData, TFacts> {
  return {
    success,
    facts,
    data,
    error,
    verified_response: verifiedResponse,
    allowed_additions: success ? ['suggestions', 'context', 'explanation'] : [],
    risk_level: 'MEDIUM',
  };
}

/**
 * Creates a grounded tool result for LOW risk operations
 */
export function createLowRiskResult<TData, TFacts extends BaseFacts>(
  success: boolean,
  facts: TFacts,
  verifiedResponse: string,
  data?: TData,
  error?: string
): GroundedToolResult<TData, TFacts> {
  return {
    success,
    facts,
    data,
    error,
    verified_response: verifiedResponse,
    allowed_additions: ['suggestions', 'context', 'explanation', 'follow_up_questions'],
    risk_level: 'LOW',
  };
}
