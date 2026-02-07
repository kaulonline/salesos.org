/**
 * System prompt for Sales Playbook generation
 */
export const PLAYBOOK_SYSTEM_PROMPT = `You are a sales operations expert specializing in sales playbooks and guided selling workflows. Generate playbook configurations that help sales teams follow consistent, effective processes.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact schema. No explanations, no markdown code blocks, just raw JSON:

{
  "name": "Playbook Name",
  "description": "What this playbook does and when to use it",
  "trigger": "MANUAL|DEAL_CREATED|DEAL_STAGE_CHANGE|LEAD_QUALIFIED|ACCOUNT_CREATED",
  "targetStage": "Optional stage name like QUALIFICATION, DISCOVERY, PROPOSAL, NEGOTIATION",
  "targetDealType": "Optional deal type like Enterprise, SMB, Renewal",
  "isActive": true,
  "steps": [
    {
      "type": "TASK|EMAIL|CALL|MEETING|WAIT",
      "title": "Step title - action oriented",
      "description": "Detailed guidance on what to do and why",
      "daysOffset": 0,
      "isRequired": true,
      "config": {}
    }
  ]
}

TRIGGER TYPES:
- MANUAL: User manually starts the playbook on a deal/lead
- DEAL_CREATED: Automatically starts when a new deal is created
- DEAL_STAGE_CHANGE: Starts when deal moves to the targetStage
- LEAD_QUALIFIED: Starts when a lead is marked qualified
- ACCOUNT_CREATED: Starts when a new account is created

STEP TYPES:
- TASK: Action item, research, preparation, or milestone to complete
- EMAIL: Send an email - follow-up, nurture, value delivery
- CALL: Phone call - discovery, qualification, objection handling
- MEETING: Video call or in-person - demos, reviews, negotiations
- WAIT: Pause between steps (daysOffset indicates wait duration)

STEP CONFIG BY TYPE:

1. TASK config:
   {
     "priority": "HIGH|MEDIUM|LOW",
     "checklist": ["subtask 1", "subtask 2"]
   }

2. EMAIL config:
   {
     "templateSuggestion": "Brief description of recommended email content",
     "keyPoints": ["point 1", "point 2"]
   }

3. CALL config:
   {
     "talkingPoints": ["topic 1", "topic 2"],
     "questions": ["question 1", "question 2"],
     "duration": 30
   }

4. MEETING config:
   {
     "agenda": ["topic 1", "topic 2"],
     "prepRequired": "What to prepare before the meeting",
     "duration": 60,
     "attendees": "Who should attend"
   }

5. WAIT config:
   {
     "reason": "Why we're waiting"
   }

SALES METHODOLOGIES (use when mentioned):

MEDDIC:
- Metrics: Quantifiable goals the customer wants to achieve
- Economic Buyer: Person with budget authority
- Decision Criteria: How they'll evaluate solutions
- Decision Process: Steps to reach a decision
- Identify Pain: Business problem driving the purchase
- Champion: Internal advocate for your solution

BANT:
- Budget: Do they have funds allocated?
- Authority: Is this the decision maker?
- Need: What's the business need?
- Timeline: When do they need to decide/implement?

SPIN:
- Situation: Current state questions
- Problem: Pain point questions
- Implication: Impact of not solving
- Need-Payoff: Value of solving

Challenger:
- Teach: Provide unique insights
- Tailor: Adapt to stakeholder priorities
- Take Control: Guide the sales process

BEST PRACTICES:
1. Start with preparation/research steps
2. Include discovery before demo/proposal
3. Space touchpoints appropriately (don't overwhelm)
4. Include follow-up after key meetings
5. Document insights at each stage
6. Build toward clear next steps
7. Typical timing:
   - Initial outreach: Day 0
   - Discovery call: Day 0-2
   - Follow-up: Day 1-3 after meetings
   - Demo: Day 3-7 after discovery
   - Proposal: Day 1-3 after demo
   - Negotiation steps: Day 1-5 after proposal

Remember: Output ONLY the JSON object, no explanations.`;

/**
 * Example few-shot prompts for better generation
 */
export const PLAYBOOK_EXAMPLES = [
  {
    user: "Create an enterprise discovery process using MEDDIC",
    assistant: `{
  "name": "Enterprise Discovery - MEDDIC",
  "description": "Structured discovery process for enterprise deals using the MEDDIC qualification framework to thoroughly understand the opportunity",
  "trigger": "DEAL_STAGE_CHANGE",
  "targetStage": "QUALIFICATION",
  "targetDealType": "Enterprise",
  "isActive": true,
  "steps": [
    {
      "type": "TASK",
      "title": "Research Account & Stakeholders",
      "description": "Review company financials, recent news, org structure. Identify potential Economic Buyer and Champion. Check LinkedIn for key contacts.",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Review company website and recent press releases",
          "Check LinkedIn for org chart and key stakeholders",
          "Research industry trends affecting them",
          "Note any existing relationships or referrals"
        ]
      }
    },
    {
      "type": "CALL",
      "title": "Discovery Call - Identify Pain",
      "description": "Uncover the Identified Pain: What business problem are they trying to solve? What's the impact? What happens if they don't solve it?",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "talkingPoints": [
          "Current state and challenges",
          "Impact on business metrics",
          "Previous attempts to solve"
        ],
        "questions": [
          "What triggered your interest in solving this now?",
          "What's the cost of not addressing this issue?",
          "How is this affecting your team/customers?"
        ],
        "duration": 45
      }
    },
    {
      "type": "TASK",
      "title": "Document Metrics & Map Economic Buyer",
      "description": "Quantify the Metrics they care about. Identify the Economic Buyer who controls budget and has final authority.",
      "daysOffset": 1,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Document specific metrics and KPIs mentioned",
          "Calculate potential ROI/impact",
          "Confirm Economic Buyer identity",
          "Map reporting structure to EB"
        ]
      }
    },
    {
      "type": "EMAIL",
      "title": "Send Discovery Summary",
      "description": "Recap discovery findings, confirmed pain points, and proposed next steps. Reinforce understanding and get buy-in.",
      "daysOffset": 1,
      "isRequired": false,
      "config": {
        "templateSuggestion": "Professional summary email that recaps pain points discussed, metrics identified, and suggests next steps",
        "keyPoints": [
          "Thank them for their time",
          "Summarize key pain points in their words",
          "Include relevant metrics/impact",
          "Propose clear next step"
        ]
      }
    },
    {
      "type": "MEETING",
      "title": "Champion Alignment Meeting",
      "description": "Meet with internal Champion to understand Decision Criteria and Decision Process. Build relationship and get insights.",
      "daysOffset": 3,
      "isRequired": true,
      "config": {
        "agenda": [
          "Review their evaluation criteria",
          "Understand approval process and timeline",
          "Identify other stakeholders to engage",
          "Discuss how to build internal consensus"
        ],
        "prepRequired": "Prepare competitive positioning and objection handling based on likely decision criteria",
        "duration": 45,
        "attendees": "Champion and any technical evaluators"
      }
    },
    {
      "type": "TASK",
      "title": "Document Paper Process",
      "description": "Map the Paper Process: procurement, legal, security reviews, budget approval steps. Identify timeline risks.",
      "daysOffset": 5,
      "isRequired": true,
      "config": {
        "priority": "MEDIUM",
        "checklist": [
          "Document procurement requirements",
          "Identify legal/security review needs",
          "Map budget approval process",
          "Note timeline for each step",
          "Identify potential blockers"
        ]
      }
    }
  ]
}`
  },
  {
    user: "Create a lead qualification playbook using BANT",
    assistant: `{
  "name": "Lead Qualification - BANT",
  "description": "Systematic lead qualification process using BANT framework to quickly assess fit and prioritize follow-up",
  "trigger": "LEAD_QUALIFIED",
  "targetStage": null,
  "targetDealType": null,
  "isActive": true,
  "steps": [
    {
      "type": "TASK",
      "title": "Quick Lead Research",
      "description": "5-minute research to prepare for qualification call. Understand their company and role before reaching out.",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Check company website - size, industry, products",
          "Review LinkedIn profile of lead",
          "Note any trigger events (funding, hiring, news)",
          "Check if we have other contacts at company"
        ]
      }
    },
    {
      "type": "CALL",
      "title": "BANT Qualification Call",
      "description": "15-20 minute call to assess Budget, Authority, Need, and Timeline. Goal is to qualify or disqualify quickly.",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "talkingPoints": [
          "Their specific interest/how they found us",
          "Current solution and pain points",
          "Decision-making process",
          "Timeline and urgency"
        ],
        "questions": [
          "BUDGET: Do you have budget allocated for this initiative?",
          "AUTHORITY: Who else is involved in this decision?",
          "NEED: What's driving your interest in solving this now?",
          "TIMELINE: When are you looking to have a solution in place?"
        ],
        "duration": 20
      }
    },
    {
      "type": "TASK",
      "title": "Score and Document Qualification",
      "description": "Score the lead on each BANT criteria. Document findings and determine next steps based on qualification.",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Rate Budget: 1-5 (confirmed budget = 5)",
          "Rate Authority: 1-5 (decision maker = 5)",
          "Rate Need: 1-5 (urgent pain = 5)",
          "Rate Timeline: 1-5 (< 30 days = 5)",
          "Calculate total score and priority"
        ]
      }
    },
    {
      "type": "EMAIL",
      "title": "Send Relevant Resources",
      "description": "Based on their stated needs, send relevant case studies, guides, or materials that address their specific situation.",
      "daysOffset": 1,
      "isRequired": false,
      "config": {
        "templateSuggestion": "Helpful follow-up with resources tailored to their industry or use case",
        "keyPoints": [
          "Reference specific pain points discussed",
          "Include relevant case study or success story",
          "Provide easy next step to continue conversation"
        ]
      }
    },
    {
      "type": "TASK",
      "title": "Convert to Opportunity or Nurture",
      "description": "Based on BANT score, either convert to opportunity and schedule demo, or add to nurture campaign for future follow-up.",
      "daysOffset": 2,
      "isRequired": true,
      "config": {
        "priority": "MEDIUM",
        "checklist": [
          "If score >= 15: Convert to opportunity",
          "If score 10-14: Schedule follow-up in 2 weeks",
          "If score < 10: Add to nurture campaign",
          "Update lead status appropriately"
        ]
      }
    }
  ]
}`
  },
  {
    user: "Build a deal closing sequence for negotiation stage",
    assistant: `{
  "name": "Deal Closing Sequence",
  "description": "Structured closing process to navigate negotiation, handle objections, and drive deals to close",
  "trigger": "DEAL_STAGE_CHANGE",
  "targetStage": "NEGOTIATION",
  "targetDealType": null,
  "isActive": true,
  "steps": [
    {
      "type": "TASK",
      "title": "Prepare Negotiation Strategy",
      "description": "Review deal history, identify key stakeholders and their concerns, prepare concession strategy and walk-away points.",
      "daysOffset": 0,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Review all stakeholder concerns documented",
          "Identify must-haves vs nice-to-haves for them",
          "Prepare 2-3 concession options with tradeoffs",
          "Define our walk-away point and BATNA",
          "Identify their alternatives/competition"
        ]
      }
    },
    {
      "type": "MEETING",
      "title": "Negotiation Meeting",
      "description": "Key negotiation session to align on terms. Focus on value, not just price. Aim to reach agreement or clear next steps.",
      "daysOffset": 1,
      "isRequired": true,
      "config": {
        "agenda": [
          "Confirm mutual interest in moving forward",
          "Review proposed terms and pricing",
          "Address concerns and objections",
          "Explore creative solutions",
          "Agree on path to close"
        ],
        "prepRequired": "Prepare ROI calculator, competitive comparison, and concession options",
        "duration": 60,
        "attendees": "Economic Buyer, Champion, and any blockers"
      }
    },
    {
      "type": "EMAIL",
      "title": "Send Updated Proposal",
      "description": "Document agreed terms and send updated proposal reflecting negotiation outcomes. Create urgency with clear deadline.",
      "daysOffset": 1,
      "isRequired": true,
      "config": {
        "templateSuggestion": "Professional proposal email with clear terms, pricing, and deadline for acceptance",
        "keyPoints": [
          "Summarize agreed terms",
          "Include any special pricing or concessions",
          "Set clear deadline for proposal validity",
          "Outline next steps after signature"
        ]
      }
    },
    {
      "type": "TASK",
      "title": "Coordinate Legal/Procurement",
      "description": "Work with their legal and procurement teams to address contract requirements. Remove friction from signing process.",
      "daysOffset": 2,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Send contract for legal review",
          "Prepare redlines response if needed",
          "Complete vendor registration forms",
          "Provide security/compliance documentation",
          "Track each requirement to completion"
        ]
      }
    },
    {
      "type": "CALL",
      "title": "Progress Check-In",
      "description": "Brief call with Champion to check on internal progress, surface any new concerns, and keep momentum.",
      "daysOffset": 3,
      "isRequired": false,
      "config": {
        "talkingPoints": [
          "Status of internal reviews",
          "Any new questions or concerns",
          "Timeline to signature",
          "How we can help accelerate"
        ],
        "questions": [
          "How is the legal review progressing?",
          "Has the Economic Buyer signed off?",
          "Is there anything slowing things down?"
        ],
        "duration": 15
      }
    },
    {
      "type": "TASK",
      "title": "Final Close Activities",
      "description": "Drive to signature. Resolve any remaining issues and get the deal signed.",
      "daysOffset": 5,
      "isRequired": true,
      "config": {
        "priority": "HIGH",
        "checklist": [
          "Confirm all legal/procurement issues resolved",
          "Get verbal confirmation of intent to sign",
          "Send final contract for signature",
          "Schedule kick-off call for after signing",
          "Update CRM when signed"
        ]
      }
    }
  ]
}`
  }
];
