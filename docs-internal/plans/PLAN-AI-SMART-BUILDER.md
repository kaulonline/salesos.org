# AI Smart Builder - Feature Plan

## Executive Summary

Enable users to describe what they need in natural language, and have AI automatically generate the corresponding configuration (forms, fields, rules, templates, etc.). This is a significant differentiator that transforms complex CRM configuration into conversational interactions.

**Example:** Instead of manually adding 10 fields to a form, user says:
> "Create a contact form for enterprise software leads that captures their name, work email, company, job title, company size, and what challenges they're facing with their current solution"

AI generates the complete form with appropriate field types, validation, placeholders, and styling.

---

## Feature Scope

### Phase 1 - Core Entities (High Impact)

| Entity | AI Can Generate | Example Prompt |
|--------|-----------------|----------------|
| **Web Forms** | Fields, validation, styling, success message | "Create a demo request form for our AI platform" |
| **Custom Fields** | Field definitions, types, picklist values | "Add fields to track deal source, competitor, and procurement timeline" |
| **Email Templates** | Subject, body, merge fields, tone | "Write a follow-up email for prospects who attended our webinar" |
| **Assignment Rules** | Conditions, assignees, priority | "Route enterprise leads (>500 employees) to Sarah, SMB to the round-robin pool" |

### Phase 2 - Advanced Entities

| Entity | AI Can Generate | Example Prompt |
|--------|-----------------|----------------|
| **Workflows** | Triggers, conditions, actions | "When a deal moves to Negotiation, create a task for legal review" |
| **Products & Pricing** | SKUs, descriptions, price tiers | "Add our Pro plan: $49/user/month, $470/user/year with volume discounts" |
| **Profiles/Permissions** | Role permissions matrix | "Create a role for SDRs who can create leads but not delete anything" |
| **Reports** | Filters, groupings, metrics | "Show me conversion rates by lead source for last quarter" |

### Phase 3 - Cross-Entity Intelligence

- "Set up our complete lead qualification workflow" → Creates form + fields + rules + templates
- "Configure our sales process for enterprise deals" → Creates pipeline stages + workflows + templates

---

## Architecture

### 1. AI Builder Service (Backend)

```
/api/ai-builder/generate
POST {
  entityType: 'web-form' | 'custom-fields' | 'email-template' | 'assignment-rule' | ...,
  prompt: string,
  context?: {
    existingFields?: string[],
    industry?: string,
    companyType?: string
  }
}

Response {
  success: boolean,
  preview: {
    summary: string,
    entities: GeneratedEntity[],
    warnings?: string[]
  },
  rawConfig: object // The actual DTO to create
}
```

### 2. Entity-Specific Prompts

Each entity type has a specialized system prompt that:
- Understands the entity's schema
- Knows best practices (e.g., email field should validate format)
- Follows the design system
- Outputs valid JSON matching our DTOs

### 3. Component Architecture

```
src/components/AIBuilder/
├── AIBuilderModal.tsx        # Main modal with chat interface
├── AIBuilderTrigger.tsx      # "✨ Create with AI" button
├── AIBuilderPreview.tsx      # Preview generated config
├── AIBuilderChat.tsx         # Conversational refinement
├── EntityPreviews/
│   ├── WebFormPreview.tsx    # Visual preview of form
│   ├── FieldsPreview.tsx     # Preview custom fields
│   ├── TemplatePreview.tsx   # Preview email template
│   └── RulePreview.tsx       # Preview assignment rule
└── hooks/
    └── useAIBuilder.ts       # API integration hook
```

### 4. User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "✨ Create with AI"                         │
├─────────────────────────────────────────────────────────────┤
│  2. Modal opens with prompt: "Describe what you need..."    │
├─────────────────────────────────────────────────────────────┤
│  3. User types natural language request                     │
├─────────────────────────────────────────────────────────────┤
│  4. AI generates preview (shown visually)                   │
│     - For forms: actual form preview                        │
│     - For templates: rendered email preview                 │
│     - For rules: flowchart-style visualization              │
├─────────────────────────────────────────────────────────────┤
│  5. User can:                                               │
│     a) Approve → Creates entity                             │
│     b) Refine → "Add a phone field" / "Make it shorter"     │
│     c) Edit manually → Opens in standard editor             │
│     d) Cancel                                               │
├─────────────────────────────────────────────────────────────┤
│  6. On approve: Creates entity via existing API             │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Entity Specifications

### Web Forms

**Input Understanding:**
- Form purpose (lead capture, contact, feedback, registration)
- Required information types
- Industry/use case context
- Tone/branding preferences

**Output Generation:**
```typescript
{
  name: string,
  description: string,
  fields: [
    {
      name: string,        // e.g., "company_size"
      label: string,       // e.g., "Company Size"
      type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'number',
      required: boolean,
      placeholder: string,
      options?: string[],  // For select fields
      validation?: object
    }
  ],
  styling: {
    primaryColor: string,
    buttonText: string
  },
  settings: {
    showTitle: boolean,
    showDescription: boolean
  },
  successMessage: string,
  redirectUrl?: string
}
```

**AI Prompt Engineering:**
```
You are a form designer for a B2B sales CRM. Generate form configurations that:
- Use appropriate field types (email for emails, phone for phones, textarea for long text)
- Include helpful placeholders
- Mark critical fields as required
- Order fields logically (name before company, company before details)
- Use professional, clear labels
- Generate a friendly success message

Output valid JSON matching the schema. No explanations, just JSON.
```

### Custom Fields

**Input Understanding:**
- What data to track
- Which entities (Lead, Contact, Account, Opportunity)
- Data types needed
- Picklist values if applicable

**Output Generation:**
```typescript
{
  fields: [
    {
      name: string,           // API name: snake_case
      label: string,          // Display name
      entity: 'LEAD' | 'CONTACT' | 'ACCOUNT' | 'OPPORTUNITY',
      fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'PICKLIST' | 'MULTI_PICKLIST' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE' | 'CURRENCY' | 'PERCENT',
      description?: string,
      required: boolean,
      picklistValues?: { value: string, label: string }[],
      defaultValue?: string
    }
  ]
}
```

### Email Templates

**Input Understanding:**
- Purpose (follow-up, introduction, nurture, announcement)
- Tone (formal, friendly, urgent)
- Key points to include
- Target audience

**Output Generation:**
```typescript
{
  name: string,
  subject: string,           // With merge fields: "Hi {{firstName}}, ..."
  body: string,              // HTML with merge fields
  category: 'SALES' | 'FOLLOW_UP' | 'QUOTE' | 'MEETING' | 'NURTURING' | 'ANNOUNCEMENT',
  mergeFieldsUsed: string[]  // For validation
}
```

### Assignment Rules

**Input Understanding:**
- Routing logic (geographic, size-based, source-based)
- Team members to assign to
- Priority/fallback logic
- Load balancing preferences

**Output Generation:**
```typescript
{
  name: string,
  description: string,
  entity: 'LEAD' | 'OPPORTUNITY',
  method: 'ROUND_ROBIN' | 'LOAD_BALANCED' | 'FIXED',
  conditions: [
    {
      field: string,
      operator: 'EQUALS' | 'CONTAINS' | 'GREATER_THAN' | ...,
      value: string
    }
  ],
  assignees: [
    { userId: string, weight?: number }
  ]
}
```

---

## Implementation Plan

### Week 1: Foundation

1. **Backend AI Builder Service**
   - `/api/ai-builder/generate` endpoint
   - Entity-specific prompt templates
   - Response validation against DTOs
   - Rate limiting (prevent abuse)

2. **Frontend Base Components**
   - `AIBuilderModal` - Main interface
   - `AIBuilderTrigger` - Button component
   - `useAIBuilder` hook

### Week 2: Web Forms + Custom Fields

3. **Web Form AI Builder**
   - Form-specific prompts
   - Visual form preview
   - Integration with WebForms page

4. **Custom Fields AI Builder**
   - Multi-field generation
   - Entity-aware suggestions
   - Picklist value generation

### Week 3: Email Templates + Assignment Rules

5. **Email Template AI Builder**
   - Tone control
   - Merge field insertion
   - Live preview with sample data

6. **Assignment Rules AI Builder**
   - Team member lookup
   - Condition builder
   - Visual rule preview

### Week 4: Polish + Advanced Features

7. **Conversational Refinement**
   - "Make it shorter"
   - "Add a field for..."
   - "Change the tone to..."

8. **Cross-Entity Generation**
   - "Set up lead capture" → Form + Fields + Rule

---

## UX Design Principles

### 1. Progressive Disclosure
- Start simple: just a text input
- Show complexity only when needed
- Advanced options collapsed by default

### 2. Confidence Through Preview
- Always show what will be created
- Visual previews, not just JSON
- Easy comparison to manual creation

### 3. Escape Hatches
- "Edit manually" always available
- Don't lock user into AI workflow
- Generated config is starting point, not final

### 4. Contextual Intelligence
- Know what fields already exist
- Suggest based on industry
- Learn from previous creations (future)

---

## Technical Considerations

### LLM Selection
- Use existing LLM infrastructure (`/api/llm/`)
- GPT-4 for complex generation
- GPT-3.5 for simple tasks (cost optimization)
- Fallback handling for API failures

### Cost Management
- Cache common patterns
- Limit prompt size
- Track usage per user
- Consider rate limits

### Validation
- Validate JSON against TypeScript schemas
- Sanitize generated content
- Check for XSS in HTML templates
- Verify field names are unique

### Error Handling
- Graceful degradation if AI fails
- Clear error messages
- Manual fallback always available

---

## Success Metrics

1. **Adoption Rate** - % of entities created with AI vs manual
2. **Time Savings** - Average time to create entity (AI vs manual)
3. **Refinement Rate** - How often users modify AI output
4. **Completion Rate** - % of AI sessions that result in creation
5. **User Satisfaction** - Post-creation feedback

---

## Competitive Advantage

This feature positions SalesOS as:
- **Modern** - AI-native, not AI-bolted-on
- **Accessible** - Non-technical users can configure complex workflows
- **Efficient** - What takes 10 minutes manually takes 30 seconds
- **Intelligent** - CRM that understands your business

No major CRM competitor (Salesforce, HubSpot, Pipedrive) offers conversational configuration at this depth.

---

## Next Steps

1. Review and approve this plan
2. Prioritize which entities to implement first
3. Design AI prompts for each entity type
4. Build backend service
5. Implement frontend components
6. Integrate into existing pages
7. Test and iterate

---

## Questions to Resolve

1. **Scope for MVP**: Start with Web Forms only, or include Custom Fields?
2. **User Access**: Available to all users or admin/manager only?
3. **Branding**: "AI Builder", "Smart Builder", "Magic Builder"?
4. **Conversation History**: Save generation sessions for reference?
