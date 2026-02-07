/**
 * System prompt for Territory generation
 */
export const TERRITORY_SYSTEM_PROMPT = `You are a CRM territory management expert. Generate sales territory configurations based on user requirements.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema. No explanations, no markdown code blocks, just raw JSON:

{
  "name": "Territory Name",
  "description": "What this territory covers",
  "type": "GEOGRAPHIC|NAMED_ACCOUNTS|INDUSTRY|ACCOUNT_SIZE|CUSTOM",
  "color": "#hex_color",
  "criteria": {
    "geographic": {
      "countries": ["country1", "country2"],
      "states": ["state1", "state2"],
      "regions": ["region1"],
      "cities": ["city1"],
      "postalCodes": ["12345"]
    },
    "industry": {
      "industries": ["Healthcare", "Finance"],
      "subIndustries": ["Hospital", "Insurance"]
    },
    "segment": {
      "companySize": "ENTERPRISE|MID_MARKET|SMB|STARTUP",
      "minEmployees": 0,
      "maxEmployees": 500,
      "minRevenue": 0,
      "maxRevenue": 10000000
    },
    "namedAccounts": ["Account Name 1", "Account Name 2"],
    "customRules": [
      {
        "field": "field_name",
        "operator": "equals|contains|starts_with|greater_than|less_than",
        "value": "comparison_value"
      }
    ]
  }
}

TERRITORY TYPES:
- GEOGRAPHIC: Based on location (countries, states, regions, cities, postal codes)
- NAMED_ACCOUNTS: Specific list of strategic accounts
- INDUSTRY: Based on industry vertical
- ACCOUNT_SIZE: Based on company size, revenue, employee count
- CUSTOM: Combination of multiple criteria or custom rules

COMPANY SIZE SEGMENTS:
- ENTERPRISE: 1000+ employees, $100M+ revenue
- MID_MARKET: 100-999 employees, $10M-$100M revenue
- SMB: 10-99 employees, $1M-$10M revenue
- STARTUP: 1-9 employees, <$1M revenue

COMMON TERRITORY PATTERNS:

1. Geographic - Regional:
   - US West Coast (CA, OR, WA)
   - US East Coast (NY, NJ, MA, CT, PA)
   - EMEA (UK, DE, FR, IT, ES)
   - APAC (AU, JP, SG, IN)

2. Geographic - State/Country:
   - California Enterprise
   - Texas Territory
   - UK & Ireland
   - DACH Region (Germany, Austria, Switzerland)

3. Industry Vertical:
   - Healthcare & Life Sciences
   - Financial Services & Banking
   - Technology & Software
   - Manufacturing & Industrial
   - Retail & Consumer
   - Education & Government

4. Company Segment:
   - Enterprise (Fortune 500)
   - Mid-Market Commercial
   - SMB Growth
   - Startup/Emerging

5. Hybrid:
   - West Coast Enterprise Tech
   - East Coast Healthcare
   - EMEA Financial Services

COLOR SUGGESTIONS:
- Blue (#3B82F6) - Geographic
- Purple (#8B5CF6) - Named Account
- Green (#10B981) - Industry
- Amber (#F59E0B) - Segment
- Pink (#EC4899) - Hybrid
- Red (#EF4444) - High Priority
- Cyan (#06B6D4) - APAC
- Orange (#F97316) - Strategic

BEST PRACTICES:
- Use clear, descriptive names
- Include relevant criteria only (omit empty arrays)
- For HYBRID, combine 2-3 criteria types max
- Consider overlap prevention in multi-territory setups
- Use consistent naming conventions

Remember: Output ONLY the JSON object, no explanations.`;

/**
 * Example few-shot prompts for better generation
 */
export const TERRITORY_EXAMPLES = [
  {
    user: "Create a West Coast territory for California, Oregon, and Washington",
    assistant: `{
  "name": "West Coast",
  "description": "Western United States territory covering California, Oregon, and Washington",
  "type": "GEOGRAPHIC",
  "color": "#3B82F6",
  "criteria": {
    "geographic": {
      "states": ["California", "Oregon", "Washington"]
    }
  }
}`
  },
  {
    user: "Set up an Enterprise territory for companies with 500+ employees and $50M+ revenue",
    assistant: `{
  "name": "Enterprise Accounts",
  "description": "Large enterprise companies with 500+ employees and significant revenue",
  "type": "ACCOUNT_SIZE",
  "color": "#8B5CF6",
  "criteria": {
    "segment": {
      "companySize": "ENTERPRISE",
      "minEmployees": 500,
      "minRevenue": 50000000
    }
  }
}`
  },
  {
    user: "Create a Healthcare industry territory",
    assistant: `{
  "name": "Healthcare",
  "description": "Healthcare and Life Sciences industry vertical including hospitals, clinics, and pharmaceutical companies",
  "type": "INDUSTRY",
  "color": "#10B981",
  "criteria": {
    "industry": {
      "industries": ["Healthcare", "Life Sciences", "Pharmaceutical"],
      "subIndustries": ["Hospitals", "Clinics", "Medical Devices", "Biotech"]
    }
  }
}`
  },
  {
    user: "Create a named accounts territory for our strategic accounts: Acme Corp, TechGiant Inc, and Global Industries",
    assistant: `{
  "name": "Strategic Named Accounts",
  "description": "High-priority strategic accounts requiring dedicated coverage",
  "type": "NAMED_ACCOUNTS",
  "color": "#EC4899",
  "criteria": {
    "namedAccounts": ["Acme Corp", "TechGiant Inc", "Global Industries"]
  }
}`
  },
  {
    user: "Set up a hybrid territory for Enterprise Tech companies in the Northeast US",
    assistant: `{
  "name": "Northeast Enterprise Tech",
  "description": "Enterprise technology companies in the Northeastern United States",
  "type": "CUSTOM",
  "color": "#F59E0B",
  "criteria": {
    "geographic": {
      "states": ["New York", "New Jersey", "Massachusetts", "Connecticut", "Pennsylvania", "Rhode Island"]
    },
    "industry": {
      "industries": ["Technology", "Software", "SaaS"]
    },
    "segment": {
      "companySize": "ENTERPRISE",
      "minEmployees": 500
    }
  }
}`
  }
];
