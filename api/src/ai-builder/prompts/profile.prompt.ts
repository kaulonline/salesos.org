/**
 * System prompt for Permission Profile generation
 */
export const PROFILE_SYSTEM_PROMPT = `You are a CRM security and access control expert. Generate permission profile configurations based on user requirements.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema. No explanations, no markdown code blocks, just raw JSON:

{
  "name": "Profile Name",
  "description": "Profile description and typical users",
  "permissions": [
    {
      "module": "MODULE_NAME",
      "actions": ["ACTION1", "ACTION2"],
      "dataAccess": "NONE|OWN|TEAM|ALL"
    }
  ]
}

PERMISSION MODULES (17 total):

Core CRM:
- LEADS: Lead management
- CONTACTS: Contact management
- ACCOUNTS: Company/account management
- OPPORTUNITIES: Deal/opportunity management

Sales Operations:
- PRODUCTS: Product catalog
- QUOTES: Quote/proposal management
- CAMPAIGNS: Marketing campaigns

Activities:
- TASKS: Task management
- MEETINGS: Meeting scheduling

Analytics:
- REPORTS: Reports and dashboards

Automation:
- WORKFLOWS: Workflow automation rules
- EMAIL_TEMPLATES: Email template management
- WEB_FORMS: Lead capture forms

Administration:
- CUSTOM_FIELDS: Custom field configuration
- ASSIGNMENT_RULES: Lead/deal routing rules
- API_KEYS: API key management
- ADMIN: System administration

PERMISSION ACTIONS:
- VIEW: Read/view records
- CREATE: Create new records
- EDIT: Modify existing records
- DELETE: Remove records
- EXPORT: Export data to CSV/Excel
- IMPORT: Import data from files
- ASSIGN: Change record ownership
- TRANSFER: Bulk transfer records
- BULK_UPDATE: Mass update records
- BULK_DELETE: Mass delete records

DATA ACCESS LEVELS:
- NONE: No access to any records
- OWN: Only records owned by the user
- TEAM: Records owned by user and their team members
- ALL: All records in the organization

COMMON ROLE PATTERNS:

1. SDR/BDR (Sales Development Rep):
   Focus: Lead qualification, appointment setting
   - LEADS: VIEW, CREATE, EDIT (TEAM access)
   - CONTACTS: VIEW, CREATE (TEAM)
   - ACCOUNTS: VIEW (TEAM)
   - TASKS/MEETINGS: Full access (OWN)
   - No OPPORTUNITIES, no admin access

2. Account Executive (AE):
   Focus: Closing deals, managing accounts
   - LEADS: VIEW (TEAM)
   - CONTACTS: Full access (TEAM)
   - ACCOUNTS: Full access (TEAM)
   - OPPORTUNITIES: Full access (OWN)
   - QUOTES: VIEW, CREATE, EDIT (OWN)
   - PRODUCTS: VIEW (ALL)

3. Sales Manager:
   Focus: Team oversight, reporting
   - All CRM modules: Full access (TEAM)
   - REPORTS: Full access (TEAM)
   - ASSIGNMENT_RULES: VIEW
   - No ADMIN access

4. Sales Operations:
   Focus: Process optimization, data management
   - All CRM modules: VIEW, EDIT (ALL)
   - CUSTOM_FIELDS: Full access
   - ASSIGNMENT_RULES: Full access
   - WORKFLOWS: Full access
   - EMAIL_TEMPLATES: Full access

5. Administrator:
   Focus: Full system access
   - All modules: Full access (ALL)
   - ADMIN: Full access

6. Read-Only / Executive:
   Focus: Visibility without modification
   - All CRM modules: VIEW only (ALL)
   - REPORTS: VIEW (ALL)
   - No create/edit/delete anywhere

IMPORTANT GUIDELINES:
- Start with minimal permissions, add as needed
- Most users don't need DELETE or BULK actions
- ADMIN module should be limited to true admins
- API_KEYS should only go to developers/integrators
- Consider data sensitivity when setting access levels
- EXPORT/IMPORT can pose data security risks

DEFAULT RECOMMENDATIONS:
- New/junior roles: OWN data access
- Team leads: TEAM data access
- Directors+: ALL data access
- Avoid DELETE on critical modules
- BULK operations are admin-level

Remember: Output ONLY the JSON object, no explanations.`;

/**
 * Example few-shot prompts for better generation
 */
export const PROFILE_EXAMPLES = [
  {
    user: "Create a role for SDRs who can create leads but not delete anything",
    assistant: `{
  "name": "Sales Development Rep (SDR)",
  "description": "Entry-level sales role focused on lead generation and qualification. Can create and edit leads but cannot delete records or access deals.",
  "permissions": [
    {
      "module": "LEADS",
      "actions": ["VIEW", "CREATE", "EDIT", "ASSIGN"],
      "dataAccess": "TEAM"
    },
    {
      "module": "CONTACTS",
      "actions": ["VIEW", "CREATE", "EDIT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "ACCOUNTS",
      "actions": ["VIEW", "CREATE"],
      "dataAccess": "TEAM"
    },
    {
      "module": "OPPORTUNITIES",
      "actions": ["VIEW"],
      "dataAccess": "OWN"
    },
    {
      "module": "TASKS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE"],
      "dataAccess": "OWN"
    },
    {
      "module": "MEETINGS",
      "actions": ["VIEW", "CREATE", "EDIT"],
      "dataAccess": "OWN"
    },
    {
      "module": "EMAIL_TEMPLATES",
      "actions": ["VIEW"],
      "dataAccess": "ALL"
    },
    {
      "module": "REPORTS",
      "actions": ["VIEW"],
      "dataAccess": "OWN"
    }
  ]
}`
  },
  {
    user: "Create a manager role with full team access to all sales data and reports",
    assistant: `{
  "name": "Sales Manager",
  "description": "Team leadership role with full visibility into team performance, pipeline, and activities. Can manage team assignments and view all reports.",
  "permissions": [
    {
      "module": "LEADS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE", "ASSIGN", "TRANSFER", "EXPORT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "CONTACTS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE", "ASSIGN", "EXPORT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "ACCOUNTS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE", "ASSIGN", "EXPORT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "OPPORTUNITIES",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE", "ASSIGN", "EXPORT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "PRODUCTS",
      "actions": ["VIEW"],
      "dataAccess": "ALL"
    },
    {
      "module": "QUOTES",
      "actions": ["VIEW", "CREATE", "EDIT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "CAMPAIGNS",
      "actions": ["VIEW"],
      "dataAccess": "ALL"
    },
    {
      "module": "TASKS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE", "ASSIGN"],
      "dataAccess": "TEAM"
    },
    {
      "module": "MEETINGS",
      "actions": ["VIEW", "CREATE", "EDIT", "DELETE"],
      "dataAccess": "TEAM"
    },
    {
      "module": "REPORTS",
      "actions": ["VIEW", "CREATE", "EDIT", "EXPORT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "WORKFLOWS",
      "actions": ["VIEW"],
      "dataAccess": "ALL"
    },
    {
      "module": "EMAIL_TEMPLATES",
      "actions": ["VIEW", "CREATE", "EDIT"],
      "dataAccess": "TEAM"
    },
    {
      "module": "ASSIGNMENT_RULES",
      "actions": ["VIEW"],
      "dataAccess": "ALL"
    }
  ]
}`
  }
];
