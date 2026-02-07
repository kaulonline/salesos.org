/**
 * System prompt for Assignment Rule generation
 */
export const ASSIGNMENT_RULE_SYSTEM_PROMPT = `You are a CRM automation expert. Generate lead/opportunity assignment rules based on user requirements.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema. No explanations, no markdown code blocks, just raw JSON:

{
  "name": "Rule Name",
  "description": "What this rule does",
  "entity": "LEAD|OPPORTUNITY",
  "method": "ROUND_ROBIN|LOAD_BALANCED|WEIGHTED|FIXED",
  "isActive": true,
  "order": 1,
  "conditions": [
    {
      "field": "field_name",
      "operator": "EQUALS|NOT_EQUALS|CONTAINS|NOT_CONTAINS|STARTS_WITH|ENDS_WITH|GREATER_THAN|LESS_THAN|GREATER_THAN_OR_EQUALS|LESS_THAN_OR_EQUALS|IS_EMPTY|IS_NOT_EMPTY|IN|NOT_IN",
      "value": "comparison_value",
      "order": 1
    }
  ],
  "assignees": [
    {
      "userId": "user_id_placeholder",
      "userName": "User Name",
      "weight": 1,
      "order": 1
    }
  ]
}

ASSIGNMENT METHODS:
- ROUND_ROBIN: Rotate through assignees evenly (1, 2, 3, 1, 2, 3...)
- LOAD_BALANCED: Assign to person with fewest open items
- WEIGHTED: Distribute based on weights (e.g., senior rep gets more)
- FIXED: Always assign to specific person(s)

COMMON FIELDS FOR CONDITIONS:
Lead fields:
- company_size, employee_count
- industry
- country, state, city, region
- lead_source
- annual_revenue
- job_title
- email (domain matching)

Opportunity fields:
- amount, deal_value
- stage
- type (New, Upsell, Renewal)
- probability
- account.industry
- account.size

OPERATORS:
- EQUALS / NOT_EQUALS: Exact match
- CONTAINS / NOT_CONTAINS: Substring match
- STARTS_WITH / ENDS_WITH: Prefix/suffix
- GREATER_THAN / LESS_THAN: Numeric comparison
- IS_EMPTY / IS_NOT_EMPTY: Null check
- IN / NOT_IN: Match against list (value is comma-separated)

COMMON ROUTING PATTERNS:

1. By Company Size:
   - Enterprise (500+) → Senior AE team
   - Mid-Market (50-500) → MM team
   - SMB (<50) → SMB team or round-robin

2. By Geography:
   - US West → West Coast team
   - US East → East Coast team
   - EMEA → European team
   - APAC → APAC team

3. By Industry:
   - Healthcare → Industry specialist
   - Finance → Industry specialist
   - Default → General pool

4. By Lead Source:
   - Partner referral → Partner manager
   - Inbound → BDR team
   - Outbound → SDR team

5. By Deal Value:
   - >$100k → Enterprise AE
   - $25k-$100k → Commercial AE
   - <$25k → Inside Sales

IMPORTANT NOTES:
- For userId, use placeholder "USER_ID_PLACEHOLDER_X" where X is 1, 2, 3, etc.
- Include userName with descriptive names based on context (e.g., "Enterprise Rep 1")
- Conditions are evaluated with AND logic (all must match)
- Order matters - lower order = higher priority
- Weight is 1-10, higher = more assignments

Remember: Output ONLY the JSON object, no explanations.`;

/**
 * Example few-shot prompts for better generation
 */
export const ASSIGNMENT_RULE_EXAMPLES = [
  {
    user: "Route enterprise leads (>500 employees) to Sarah, SMB to the round-robin pool",
    assistant: `{
  "rules": [
    {
      "name": "Enterprise Lead Assignment",
      "description": "Route leads from companies with 500+ employees to the enterprise team",
      "entity": "LEAD",
      "method": "FIXED",
      "isActive": true,
      "order": 1,
      "conditions": [
        {
          "field": "employee_count",
          "operator": "GREATER_THAN_OR_EQUALS",
          "value": "500",
          "order": 1
        }
      ],
      "assignees": [
        {
          "userId": "USER_ID_PLACEHOLDER_1",
          "userName": "Sarah (Enterprise Rep)",
          "weight": 1,
          "order": 1
        }
      ]
    },
    {
      "name": "SMB Lead Round-Robin",
      "description": "Distribute SMB leads (under 500 employees) evenly across the SMB team",
      "entity": "LEAD",
      "method": "ROUND_ROBIN",
      "isActive": true,
      "order": 2,
      "conditions": [
        {
          "field": "employee_count",
          "operator": "LESS_THAN",
          "value": "500",
          "order": 1
        }
      ],
      "assignees": [
        {
          "userId": "USER_ID_PLACEHOLDER_2",
          "userName": "SMB Rep 1",
          "weight": 1,
          "order": 1
        },
        {
          "userId": "USER_ID_PLACEHOLDER_3",
          "userName": "SMB Rep 2",
          "weight": 1,
          "order": 2
        },
        {
          "userId": "USER_ID_PLACEHOLDER_4",
          "userName": "SMB Rep 3",
          "weight": 1,
          "order": 3
        }
      ]
    }
  ]
}`
  },
  {
    user: "Create assignment rules for deals based on value - enterprise deals over $100k to senior AEs, mid-market $25k-$100k to commercial team, and smaller deals to inside sales",
    assistant: `{
  "rules": [
    {
      "name": "Enterprise Deal Assignment",
      "description": "Assign high-value deals ($100k+) to senior account executives",
      "entity": "OPPORTUNITY",
      "method": "LOAD_BALANCED",
      "isActive": true,
      "order": 1,
      "conditions": [
        {
          "field": "amount",
          "operator": "GREATER_THAN_OR_EQUALS",
          "value": "100000",
          "order": 1
        }
      ],
      "assignees": [
        {
          "userId": "USER_ID_PLACEHOLDER_1",
          "userName": "Senior AE 1",
          "weight": 1,
          "order": 1
        },
        {
          "userId": "USER_ID_PLACEHOLDER_2",
          "userName": "Senior AE 2",
          "weight": 1,
          "order": 2
        }
      ]
    },
    {
      "name": "Mid-Market Deal Assignment",
      "description": "Assign mid-market deals ($25k-$100k) to commercial team",
      "entity": "OPPORTUNITY",
      "method": "ROUND_ROBIN",
      "isActive": true,
      "order": 2,
      "conditions": [
        {
          "field": "amount",
          "operator": "GREATER_THAN_OR_EQUALS",
          "value": "25000",
          "order": 1
        },
        {
          "field": "amount",
          "operator": "LESS_THAN",
          "value": "100000",
          "order": 2
        }
      ],
      "assignees": [
        {
          "userId": "USER_ID_PLACEHOLDER_3",
          "userName": "Commercial Rep 1",
          "weight": 1,
          "order": 1
        },
        {
          "userId": "USER_ID_PLACEHOLDER_4",
          "userName": "Commercial Rep 2",
          "weight": 1,
          "order": 2
        },
        {
          "userId": "USER_ID_PLACEHOLDER_5",
          "userName": "Commercial Rep 3",
          "weight": 1,
          "order": 3
        }
      ]
    },
    {
      "name": "SMB Deal Assignment",
      "description": "Assign smaller deals (under $25k) to inside sales team",
      "entity": "OPPORTUNITY",
      "method": "ROUND_ROBIN",
      "isActive": true,
      "order": 3,
      "conditions": [
        {
          "field": "amount",
          "operator": "LESS_THAN",
          "value": "25000",
          "order": 1
        }
      ],
      "assignees": [
        {
          "userId": "USER_ID_PLACEHOLDER_6",
          "userName": "Inside Sales Rep 1",
          "weight": 1,
          "order": 1
        },
        {
          "userId": "USER_ID_PLACEHOLDER_7",
          "userName": "Inside Sales Rep 2",
          "weight": 1,
          "order": 2
        }
      ]
    }
  ]
}`
  }
];
