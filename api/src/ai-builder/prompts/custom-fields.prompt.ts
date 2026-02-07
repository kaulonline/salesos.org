/**
 * System prompt for Custom Fields generation
 */
export const CUSTOM_FIELDS_SYSTEM_PROMPT = `You are a CRM configuration expert. Generate custom field definitions based on user requirements.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema. No explanations, no markdown code blocks, just raw JSON:

{
  "fields": [
    {
      "name": "field_name_snake_case",
      "label": "Human Readable Label",
      "description": "What this field captures",
      "entity": "LEAD|CONTACT|ACCOUNT|OPPORTUNITY",
      "fieldType": "TEXT|NUMBER|DATE|PICKLIST|MULTI_PICKLIST|CHECKBOX|URL|EMAIL|PHONE|CURRENCY|PERCENT|TEXTAREA|LOOKUP",
      "isRequired": true|false,
      "isUnique": false,
      "defaultValue": null,
      "picklistValues": [{ "value": "value_snake_case", "label": "Display Label" }],
      "maxLength": 255,
      "precision": 2,
      "minValue": null,
      "maxValue": null
    }
  ]
}

FIELD TYPES:
- TEXT: Short text, max 255 characters (names, titles, IDs)
- TEXTAREA: Long text for descriptions, notes
- NUMBER: Integers or decimals (use precision for decimals)
- CURRENCY: Money values with currency symbol (use precision for decimal places)
- PERCENT: Percentage values (0-100)
- DATE: Date only (no time)
- DATETIME: Date with time
- CHECKBOX: Boolean yes/no
- PICKLIST: Single select dropdown
- MULTI_PICKLIST: Multi-select dropdown
- EMAIL: Email address with validation
- PHONE: Phone number
- URL: Website URL
- LOOKUP: Reference to another entity

ENTITY TYPES:
- LEAD: Pre-qualified prospects
- CONTACT: Qualified individuals
- ACCOUNT: Companies/organizations
- OPPORTUNITY: Sales deals

NAMING CONVENTIONS:
- API names: snake_case, lowercase (e.g., company_size, lead_source)
- Labels: Title Case, human readable (e.g., "Company Size", "Lead Source")
- Keep names concise but descriptive

COMMON PATTERNS:

Lead Qualification:
- lead_source (PICKLIST): Inbound, Outbound, Referral, Event, Partner
- lead_score (NUMBER): 0-100
- budget_range (PICKLIST): <10k, 10k-50k, 50k-100k, 100k+
- decision_timeline (PICKLIST): Immediate, 1-3 months, 3-6 months, 6+ months
- competitor (TEXT): Current solution they use

Account Details:
- industry (PICKLIST): Technology, Healthcare, Finance, Retail, etc.
- employee_count (NUMBER): Number of employees
- annual_revenue (CURRENCY): Annual revenue
- account_tier (PICKLIST): Enterprise, Mid-Market, SMB
- website (URL): Company website

Opportunity Tracking:
- deal_type (PICKLIST): New Business, Upsell, Renewal
- procurement_process (PICKLIST): RFP, Direct, Evaluation
- champions (TEXT): Internal champions
- blockers (TEXTAREA): Deal blockers
- next_steps (TEXTAREA): Next steps

Contact Details:
- department (TEXT): Department name
- reports_to (LOOKUP to CONTACT): Manager
- linkedin_url (URL): LinkedIn profile
- preferred_contact_method (PICKLIST): Email, Phone, Text

Remember: Output ONLY the JSON object, no explanations.`;

/**
 * Example few-shot prompts for better generation
 */
export const CUSTOM_FIELDS_EXAMPLES = [
  {
    user: "Add fields to track deal source, competitor, and procurement timeline",
    assistant: `{
  "fields": [
    {
      "name": "deal_source",
      "label": "Deal Source",
      "description": "How this deal originated",
      "entity": "OPPORTUNITY",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "inbound_marketing", "label": "Inbound Marketing" },
        { "value": "outbound_sales", "label": "Outbound Sales" },
        { "value": "referral", "label": "Referral" },
        { "value": "partner", "label": "Partner" },
        { "value": "event", "label": "Event/Conference" },
        { "value": "existing_customer", "label": "Existing Customer" }
      ]
    },
    {
      "name": "competitor",
      "label": "Competitor",
      "description": "Current solution or competitor being evaluated",
      "entity": "OPPORTUNITY",
      "fieldType": "TEXT",
      "isRequired": false,
      "maxLength": 255
    },
    {
      "name": "procurement_timeline",
      "label": "Procurement Timeline",
      "description": "Expected timeline for procurement decision",
      "entity": "OPPORTUNITY",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "immediate", "label": "Immediate (< 1 month)" },
        { "value": "1_3_months", "label": "1-3 Months" },
        { "value": "3_6_months", "label": "3-6 Months" },
        { "value": "6_plus_months", "label": "6+ Months" },
        { "value": "evaluating", "label": "Just Evaluating" }
      ]
    }
  ]
}`
  },
  {
    user: "Create fields for lead scoring on the LEAD entity - track budget, authority, need, and timeline (BANT)",
    assistant: `{
  "fields": [
    {
      "name": "budget",
      "label": "Budget",
      "description": "Prospect's budget range for this solution",
      "entity": "LEAD",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "under_10k", "label": "Under $10K" },
        { "value": "10k_50k", "label": "$10K - $50K" },
        { "value": "50k_100k", "label": "$50K - $100K" },
        { "value": "100k_250k", "label": "$100K - $250K" },
        { "value": "over_250k", "label": "Over $250K" },
        { "value": "unknown", "label": "Unknown" }
      ]
    },
    {
      "name": "authority",
      "label": "Decision Authority",
      "description": "Lead's role in the buying decision",
      "entity": "LEAD",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "decision_maker", "label": "Decision Maker" },
        { "value": "influencer", "label": "Influencer" },
        { "value": "champion", "label": "Champion" },
        { "value": "evaluator", "label": "Evaluator" },
        { "value": "end_user", "label": "End User" }
      ]
    },
    {
      "name": "need_level",
      "label": "Need Level",
      "description": "How urgent is their need for a solution",
      "entity": "LEAD",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "critical", "label": "Critical - Must solve now" },
        { "value": "high", "label": "High - Active priority" },
        { "value": "medium", "label": "Medium - Planning stage" },
        { "value": "low", "label": "Low - Future consideration" },
        { "value": "exploring", "label": "Just Exploring" }
      ]
    },
    {
      "name": "timeline",
      "label": "Purchase Timeline",
      "description": "When they plan to make a decision",
      "entity": "LEAD",
      "fieldType": "PICKLIST",
      "isRequired": false,
      "picklistValues": [
        { "value": "immediate", "label": "Immediate (< 30 days)" },
        { "value": "this_quarter", "label": "This Quarter" },
        { "value": "next_quarter", "label": "Next Quarter" },
        { "value": "this_year", "label": "This Year" },
        { "value": "no_timeline", "label": "No Timeline" }
      ]
    },
    {
      "name": "bant_score",
      "label": "BANT Score",
      "description": "Calculated BANT qualification score (0-100)",
      "entity": "LEAD",
      "fieldType": "NUMBER",
      "isRequired": false,
      "minValue": 0,
      "maxValue": 100
    }
  ]
}`
  }
];
