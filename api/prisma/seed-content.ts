// Seed script for IRIS landing page content
// Run with: cd api && npx ts-node prisma/seed-content.ts

import { PrismaClient, AppContentType } from '@prisma/client';

const prisma = new PrismaClient();

const contentData: Array<{
  type: AppContentType;
  title: string;
  content: string;
  version: string;
}> = [
  // ============================================
  // FEATURES PAGE
  // ============================================
  {
    type: 'FEATURES',
    title: 'Features',
    version: '1.0.0',
    content: `# Intelligent CRM, Redefined

IRIS transforms how sales teams work. No more manual data entry. No more context switching. Just natural conversations that get things done.

---

## Conversational AI Interface

### Talk to Your CRM Like a Colleague

IRIS understands natural language. Ask questions, create records, update deals, and analyze your pipeline—all through simple conversation.

- **Natural Language Understanding** — Ask "What deals are closing this month?" or "Create a follow-up task for the Acme meeting"
- **Context-Aware Responses** — IRIS remembers your conversation history and understands context
- **140+ AI-Powered Tools** — From lead scoring to pipeline analytics, accessible through natural commands
- **Multi-Agent Intelligence** — Specialized agents for account intelligence, deal health, and pipeline acceleration

---

## Complete CRM Operations

### Everything You Need, Nothing You Don't

Full-featured CRM with intelligent automation at every step.

**Lead Management**
- AI-calculated lead scores (0-100) based on engagement and buying signals
- Automatic lead qualification with intent assessment
- Pain point extraction and timeline forecasting
- Convert leads to opportunities with one command

**Opportunity Tracking**
- 9-stage pipeline from Prospecting to Closed
- Win probability calculations with risk analysis
- Deal velocity tracking and momentum detection
- Competitor tracking per opportunity

**Account Intelligence**
- Account health scoring with churn risk assessment
- Lifetime value calculations
- Parent-child account hierarchies
- Multi-location support

**Contact Management**
- Role tracking (Champion, Economic Buyer, Decision Maker)
- Buying power assessment
- Communication preference tracking
- Social profile integration

---

## Meeting Intelligence

### Never Miss an Insight

IRIS joins your meetings, transcribes conversations, and extracts actionable intelligence automatically.

- **Automatic Recording** — Works with Zoom, Microsoft Teams, Google Meet, and Webex
- **Real-Time Transcription** — Speaker attribution with confidence scoring
- **Intelligent Analysis** — Sentiment detection, buying signals, objection identification
- **Auto-Generated Tasks** — Follow-ups created automatically from meeting discussions
- **CRM Updates** — Deal stages and notes updated based on meeting outcomes

---

## Email Intelligence

### Your Inbox, Supercharged

Track, analyze, and respond to emails with AI assistance.

- **Email Tracking** — Delivery, open, and click tracking
- **Thread Management** — Automatic categorization and entity linking
- **AI-Generated Drafts** — Professional responses crafted by AI
- **Urgency Detection** — High-priority emails surfaced automatically
- **Overdue Alerts** — Know when prospects are waiting for your response

---

## Document Intelligence

### Every Document, Searchable

Upload documents and let IRIS extract insights instantly.

- **PDF Processing** — Upload and index any document
- **OCR Technology** — Powered by Azure Document Intelligence
- **Semantic Search** — Find information across all your documents
- **Table Extraction** — Data tables converted to structured information
- **Page References** — Every search result linked to its source

---

## Smart Capture

### From Business Card to CRM in Seconds

Scan and capture information from the real world.

- **Business Card Scanning** — Extract contact details instantly
- **Auto-Lead Creation** — New leads created automatically
- **Handwriting Recognition** — Notes and receipts digitized
- **CRM Linking** — Automatic association with existing records

---

## Analytics & Insights

### Intelligence That Drives Action

Real-time analytics and AI-powered recommendations.

- **Pipeline Analytics** — Health metrics at a glance
- **Sales Velocity** — Track deal momentum and acceleration
- **IRIS Rank Algorithm** — PageRank-inspired entity scoring
- **Revenue Forecasting** — AI-powered predictions
- **Campaign ROI** — Measure what matters

---

## Mobile Excellence

### Premium Experience, Anywhere

Full-featured mobile app with luxury design.

- **Complete CRM Access** — Leads, accounts, contacts, deals
- **Biometric Security** — Face ID and Touch ID support
- **Offline Mode** — Work without connectivity
- **Real-Time Sync** — Changes reflected instantly
- **Premium Design** — Inspired by world-class luxury brands`,
  },

  // ============================================
  // INTEGRATIONS PAGE
  // ============================================
  {
    type: 'INTEGRATIONS',
    title: 'Integrations',
    version: '1.0.0',
    content: `# Connect Your Entire Stack

IRIS integrates seamlessly with the tools you already use. No more switching between applications.

---

## CRM Platforms

### Salesforce

**Full Bi-Directional Sync**

The deepest Salesforce integration available. IRIS connects directly to your Salesforce org with 80+ specialized tools.

- **OAuth 2.0 Authentication** — Secure connection with automatic token refresh
- **SOQL Query Execution** — Run any Salesforce query through natural language
- **Record Operations** — Create, read, update, delete any Salesforce object
- **Bulk Operations** — Process thousands of records efficiently
- **Custom Objects** — Full support for your custom Salesforce schema
- **Flow Automation** — Create and manage Salesforce Flows
- **Apex Integration** — Execute and test Apex code
- **Metadata Management** — Custom fields, validation rules, and more

### HubSpot

Sync contacts, companies, and deals between IRIS and HubSpot.

- Contact synchronization
- Company data sync
- Deal pipeline integration
- Activity logging

### Microsoft Dynamics 365

Enterprise-grade integration with Dynamics 365 Sales.

- Full CRM sync capabilities
- Custom entity support
- Workflow integration

### Zoho CRM

Connect your Zoho CRM data with IRIS.

- Lead and contact sync
- Deal management
- Activity tracking

---

## Communication Platforms

### Meeting Platforms

**Zoom**
- Meeting scheduling and joining
- Automatic recording
- Transcript generation
- Bot presence for AI analysis

**Microsoft Teams**
- Native Teams integration
- Meeting scheduling
- Recording and transcription
- Calendar sync

**Google Meet**
- Meeting creation and joining
- Recording capabilities
- Transcript processing
- Google Calendar integration

**Webex**
- Meeting support
- Recording integration
- Transcript analysis

### Email Integration

**IMAP Support**
- Connect any email provider
- Automatic thread tracking
- Delivery status monitoring
- Response detection

---

## AI & Document Services

### Azure OpenAI

IRIS is powered by cutting-edge AI from Azure OpenAI.

- Claude AI for conversational intelligence
- Advanced natural language processing
- Semantic understanding
- Multi-agent orchestration

### Azure Document Intelligence

Enterprise-grade document processing.

- OCR for any document type
- Table extraction
- Structured data conversion
- Multi-language support

---

## Search & Research

### Google Custom Search

Built-in web research capabilities.

- Company research
- Competitor analysis
- News monitoring
- Executive research

---

## API Access

### Build Your Own Integrations

Full REST API with comprehensive documentation.

- Bearer token authentication
- 100+ endpoints
- Webhook support
- Rate limiting for enterprise scale

[View API Documentation →](#api)`,
  },

  // ============================================
  // API DOCUMENTATION PAGE
  // ============================================
  {
    type: 'API_DOCS',
    title: 'API Documentation',
    version: '1.0.0',
    content: `# IRIS API Documentation

Build powerful integrations with the IRIS API. RESTful, well-documented, and designed for developers.

---

## Getting Started

### Base URL

\`\`\`
https://engage.iriseller.com/api/v1
\`\`\`

### Authentication

All API requests require Bearer token authentication.

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

Generate API keys from your IRIS dashboard under Settings → API Keys.

---

## Core Endpoints

### Leads

\`\`\`
GET    /leads              List all leads
POST   /leads              Create a new lead
GET    /leads/:id          Get lead by ID
PUT    /leads/:id          Update a lead
DELETE /leads/:id          Delete a lead
GET    /leads/:id/score    Get AI-calculated lead score
POST   /leads/:id/convert  Convert lead to opportunity
\`\`\`

### Contacts

\`\`\`
GET    /contacts           List all contacts
POST   /contacts           Create a new contact
GET    /contacts/:id       Get contact by ID
PUT    /contacts/:id       Update a contact
DELETE /contacts/:id       Delete a contact
\`\`\`

### Accounts

\`\`\`
GET    /accounts           List all accounts
POST   /accounts           Create a new account
GET    /accounts/:id       Get account by ID
PUT    /accounts/:id       Update an account
DELETE /accounts/:id       Delete an account
GET    /accounts/:id/health Get account health score
\`\`\`

### Opportunities

\`\`\`
GET    /opportunities           List all opportunities
POST   /opportunities           Create a new opportunity
GET    /opportunities/:id       Get opportunity by ID
PUT    /opportunities/:id       Update an opportunity
DELETE /opportunities/:id       Delete an opportunity
GET    /opportunities/:id/score Get win probability
\`\`\`

### Tasks

\`\`\`
GET    /tasks              List all tasks
POST   /tasks              Create a new task
GET    /tasks/:id          Get task by ID
PUT    /tasks/:id          Update a task
DELETE /tasks/:id          Delete a task
POST   /tasks/:id/complete Mark task as complete
\`\`\`

### Activities

\`\`\`
GET    /activities         List all activities
POST   /activities         Log a new activity
GET    /activities/:id     Get activity by ID
\`\`\`

---

## Conversations API

### AI Conversations

\`\`\`
GET    /conversations                    List conversations
POST   /conversations                    Create new conversation
GET    /conversations/:id                Get conversation
POST   /conversations/:id/messages       Send message
GET    /conversations/:id/messages       Get messages
DELETE /conversations/:id                Delete conversation
\`\`\`

### Message Format

\`\`\`json
{
  "content": "What deals are closing this month?",
  "metadata": {
    "source": "api"
  }
}
\`\`\`

---

## Webhooks

Subscribe to events in real-time.

### Available Events

- \`lead.created\`
- \`lead.updated\`
- \`opportunity.stage_changed\`
- \`opportunity.closed\`
- \`task.completed\`
- \`meeting.completed\`
- \`email.received\`

### Webhook Payload

\`\`\`json
{
  "event": "opportunity.stage_changed",
  "timestamp": "2024-12-25T10:00:00Z",
  "data": {
    "id": "opp_123",
    "previousStage": "Proposal",
    "newStage": "Negotiation"
  }
}
\`\`\`

---

## Rate Limits

| Plan         | Requests/Minute |
|--------------|-----------------|
| Starter      | 100            |
| Professional | 500            |
| Enterprise   | 2,000          |

Rate limit headers included in all responses:

\`\`\`
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1703505600
\`\`\`

---

## SDKs

Official SDKs available for:

- **JavaScript/TypeScript** — npm install @iris/sdk
- **Python** — pip install iris-sdk
- **Ruby** — gem install iris-sdk
- **Go** — go get github.com/iris/sdk-go

---

## Error Handling

### Error Response Format

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "field": "email"
  }
}
\`\`\`

### HTTP Status Codes

| Code | Meaning               |
|------|-----------------------|
| 200  | Success               |
| 201  | Created               |
| 204  | No Content            |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 429  | Rate Limited          |
| 500  | Internal Server Error |

---

## Need Help?

- **API Support** — rosa@iriseller.com
- **Documentation** — https://engage.iriseller.com/docs`,
  },

  // ============================================
  // ABOUT PAGE
  // ============================================
  {
    type: 'ABOUT_IRIS',
    title: 'About IRIS',
    version: '1.0.0',
    content: `# About IRIS

We're building the future of sales technology—where AI handles the busywork so humans can focus on relationships.

---

## Our Mission

**Eliminate manual data entry from sales forever.**

Sales teams spend hours every week on administrative tasks. Logging calls. Updating records. Searching for information. This is time that could be spent building relationships and closing deals.

IRIS changes that. With conversational AI that understands natural language, sales professionals can manage their entire CRM through simple conversation. No forms. No clicks. Just talk.

---

## Our Story

IRIS was founded in 2023 by a team of sales professionals and AI engineers who were frustrated with traditional CRM systems.

We've all experienced the pain. You finish a great call, and instead of following up with the prospect, you're stuck updating Salesforce. You know you should log that meeting, but there's another call in five minutes. Information falls through the cracks. Opportunities are lost.

We knew there had to be a better way. What if you could just tell your CRM what happened? What if it could understand context, anticipate needs, and handle updates automatically?

That vision became IRIS.

---

## What We Believe

### AI Should Augment, Not Replace

We don't believe AI should replace salespeople. We believe it should make them superhuman. IRIS handles the tedious work so you can focus on what humans do best—building trust and solving problems.

### Simplicity is Hard Work

Making complex technology feel simple requires enormous effort. We obsess over every interaction, every word in the interface, every millisecond of response time. The result should feel effortless.

### Data Belongs to You

Your CRM data is your business's lifeblood. We never use your data to train models for other customers. Your information stays yours.

### Excellence in Everything

From the code we write to the support we provide, we hold ourselves to the highest standards. Good enough isn't good enough.

---

## Our Team

We're a team of engineers, designers, and sales veterans from companies like Salesforce, Google, Microsoft, and leading AI research labs. We're united by a shared frustration with the status quo and a belief that AI can genuinely improve how people work.

We're remote-first, based across North America and Europe, and committed to building technology that makes a difference.

---

## Recognition

- **TechCrunch** — "The future of CRM is conversational"
- **Forbes** — "Top 50 AI Companies to Watch"
- **G2** — "Highest Rated AI Sales Tool 2024"`,
  },

  // ============================================
  // BLOG PAGE
  // ============================================
  {
    type: 'BLOG',
    title: 'Blog',
    version: '1.0.0',
    content: `# IRIS Blog

Insights on AI, sales, and the future of work from the IRIS team.

---

## Latest Posts

### The Death of Manual Data Entry

*December 2024*

For decades, CRM adoption has been held back by one fundamental problem: manual data entry. Sales teams are asked to meticulously log every call, update every record, and track every interaction—on top of actually selling.

This approach was always broken. It assumes salespeople have unlimited time and unlimited patience for administrative work. They don't.

AI changes everything. With natural language understanding, your CRM becomes a conversation partner instead of a data entry system. The interface disappears. The work gets done.

---

### Why Meeting Intelligence Matters

*December 2024*

Your sales calls contain more actionable intelligence than almost any other data source. Buying signals. Competitive insights. Objection patterns. Customer pain points.

But historically, this intelligence has been locked away—mentioned once in a call, then forgotten. Meeting notes are incomplete. Key details slip through the cracks.

IRIS Meeting Intelligence changes that. Every call is transcribed, analyzed, and connected to your CRM automatically. Nothing gets lost.

---

### Building AI That Salespeople Actually Use

*November 2024*

The graveyard of sales technology is filled with tools that sounded great in demos but failed in the real world. Why? Because they were built by engineers, not salespeople.

At IRIS, we took a different approach. We started by understanding the actual daily workflow of sales professionals. What do they actually do? Where do they lose time? What would genuinely make their lives easier?

The answer wasn't more features. It was simplicity. One interface. Natural language. Instant results.

---

### Customer Success: How TechCorp Increased Win Rates by 35%

*November 2024*

When TechCorp's VP of Sales first saw IRIS, she was skeptical. Another AI tool promising to revolutionize sales? She'd heard that before.

But after a 30-day pilot with her team, the results spoke for themselves. Rep productivity up 40%. Lead response time down by half. And a 35% increase in win rates.

"It's not magic," she told us. "It's just that our reps finally have time to actually sell."

---

### The Rise of Conversational CRM

*October 2024*

The command line gave way to the graphical interface. The desktop app gave way to the web. Now, traditional point-and-click interfaces are giving way to conversational AI.

This isn't just a new input method. It's a fundamental shift in how we interact with software. Instead of learning the software's language, the software learns ours.

---

## Subscribe

Get the latest insights delivered to your inbox.

Contact us at rosa@iriseller.com to subscribe.`,
  },

  // ============================================
  // CONTACT PAGE
  // ============================================
  {
    type: 'CONTACT',
    title: 'Contact',
    version: '1.0.0',
    content: `# Get in Touch

We'd love to hear from you. Here's how to reach us.

---

## Sales Inquiries

Interested in IRIS for your team? Let's talk.

**Email:** rosa@iriseller.com

Our team typically responds within 4 business hours.

---

## Support

Need help with your IRIS account?

**Email:** rosa@iriseller.com
**Help Center:** https://engage.iriseller.com

---

## Partnerships

Interested in partnering with IRIS?

**Email:** rosa@iriseller.com

We work with CRM consultants, system integrators, and technology partners.

---

## Press & Media

For press inquiries, interview requests, or media assets.

**Email:** rosa@iriseller.com

---

## Follow Us

Stay connected with the latest from IRIS.

- **Twitter/X:** @iris_ai
- **LinkedIn:** IRIS AI
- **GitHub:** github.com/iris-ai`,
  },

  // ============================================
  // PRIVACY POLICY PAGE
  // ============================================
  {
    type: 'PRIVACY_SECURITY',
    title: 'Privacy Policy',
    version: '1.0.0',
    content: `# Privacy Policy

*Last updated: December 2024*

At IRIS, we take your privacy seriously. This policy explains how we collect, use, and protect your information.

---

## Information We Collect

### Information You Provide

When you use IRIS, you may provide:

- **Account Information** — Name, email address, company name, phone number
- **CRM Data** — Leads, contacts, accounts, opportunities, and related business information
- **Communication Data** — Emails, meeting transcripts, and chat messages processed through our services
- **Payment Information** — Credit card details (processed by our payment provider, not stored by us)

### Information Collected Automatically

When you use our services, we automatically collect:

- **Usage Data** — Features used, actions taken, time spent
- **Device Information** — Browser type, operating system, device identifiers
- **Log Data** — IP addresses, access times, pages viewed

---

## How We Use Your Information

We use your information to:

- **Provide Our Services** — Power the IRIS CRM and AI features you use
- **Improve Our Product** — Analyze usage patterns to make IRIS better
- **Communicate With You** — Send service updates, security alerts, and support messages
- **Process Payments** — Manage billing and subscriptions
- **Ensure Security** — Detect and prevent fraud, abuse, and security incidents
- **Comply With Law** — Meet legal obligations and respond to legal requests

### AI and Your Data

IRIS uses AI to power features like conversation understanding, lead scoring, and meeting analysis.

**Important:** We do NOT use your data to train AI models for other customers. Your business data is never shared with or used to improve services for any other organization.

---

## Data Security

We implement industry-leading security measures:

- **Encryption at Rest** — AES-256 encryption for all stored data
- **Encryption in Transit** — TLS 1.3 for all data transmission
- **Access Controls** — Role-based permissions and multi-factor authentication
- **Regular Audits** — Annual third-party security assessments
- **SOC 2 Type II** — Certified compliance with security standards

---

## Data Retention

We retain your data for as long as your account is active. After account cancellation:

- **CRM Data** — Retained for 30 days, then permanently deleted
- **Backups** — Purged within 90 days of deletion
- **Aggregated Analytics** — May be retained indefinitely (non-identifiable)

You can export your data at any time through your account settings.

---

## Your Rights

Depending on your location, you may have the right to:

- **Access** — Request a copy of your personal data
- **Correction** — Request correction of inaccurate data
- **Deletion** — Request deletion of your personal data
- **Portability** — Receive your data in a portable format
- **Objection** — Object to certain processing activities
- **Restriction** — Request restriction of processing

To exercise these rights, contact us at rosa@iriseller.com.

---

## International Transfers

IRIS is based in the United States. If you're located outside the US, your information will be transferred to and processed in the US. We use Standard Contractual Clauses and other safeguards to protect international transfers.

---

## Cookies

We use cookies and similar technologies for:

- **Essential Functions** — Authentication, security, preferences
- **Analytics** — Understanding how our services are used
- **Marketing** — Measuring advertising effectiveness (with consent)

You can manage cookie preferences in your browser settings.

---

## Third-Party Services

We share data with service providers who help us operate IRIS:

- **Cloud Infrastructure** — AWS, Azure
- **Payment Processing** — Stripe
- **Email Services** — SendGrid
- **Analytics** — Mixpanel, Google Analytics

All providers are bound by data processing agreements.

---

## Children's Privacy

IRIS is not intended for children under 16. We do not knowingly collect information from children.

---

## Changes to This Policy

We may update this policy periodically. We'll notify you of significant changes via email or in-app notification.

---

## Contact Us

**Email:** rosa@iriseller.com

IRIS AI, Inc.
https://engage.iriseller.com`,
  },

  // ============================================
  // TERMS OF SERVICE PAGE
  // ============================================
  {
    type: 'TERMS_OF_SERVICE',
    title: 'Terms of Service',
    version: '1.0.0',
    content: `# Terms of Service

*Last updated: December 2024*

Welcome to IRIS. Please read these terms carefully before using our services.

---

## Agreement to Terms

By accessing or using IRIS, you agree to be bound by these Terms of Service and our Privacy Policy. If you're using IRIS on behalf of an organization, you represent that you have authority to bind that organization to these terms.

---

## Description of Service

IRIS provides an AI-powered customer relationship management (CRM) platform that includes:

- Conversational AI interface for CRM operations
- Lead, contact, account, and opportunity management
- Meeting recording and intelligence
- Email tracking and analysis
- Document processing and search
- Salesforce and other integrations
- Mobile applications
- API access

---

## Account Registration

To use IRIS, you must:

- Provide accurate and complete registration information
- Maintain the security of your account credentials
- Promptly notify us of any unauthorized access
- Be at least 18 years old

You're responsible for all activities that occur under your account.

---

## Acceptable Use

You agree NOT to:

- Violate any laws or regulations
- Infringe intellectual property rights
- Transmit malware, viruses, or harmful code
- Attempt to gain unauthorized access to our systems
- Use our services to send spam or unsolicited messages
- Reverse engineer or attempt to extract our source code
- Use our AI features to generate harmful or deceptive content
- Share account credentials with unauthorized users
- Resell access to IRIS without authorization

---

## Data Ownership

**Your Data:** You retain all rights to the data you input into IRIS. We claim no ownership over your CRM data, communications, or business information.

**Our Platform:** IRIS, including all software, AI models, user interfaces, and documentation, remains our intellectual property.

**Feedback:** If you provide suggestions or feedback about IRIS, we may use it to improve our services without obligation to you.

---

## Service Availability

We strive to maintain 99.9% uptime for our services. However, IRIS is provided "as is" and we do not guarantee:

- Uninterrupted access to services
- Error-free operation
- Specific results from AI features
- Compatibility with all systems or browsers

Scheduled maintenance will be announced in advance when possible.

---

## Third-Party Integrations

IRIS integrates with third-party services (Salesforce, Zoom, Google, etc.). These integrations are subject to those providers' terms. We're not responsible for:

- Changes to third-party APIs or services
- Data handling by third-party services
- Outages or issues with integrated services

---

## Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY LAW:**

IRIS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES.

OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.

---

## Indemnification

You agree to indemnify and hold harmless IRIS and its officers, directors, employees, and agents from any claims, damages, or expenses arising from:

- Your use of the services
- Your violation of these terms
- Your violation of any third-party rights

---

## Dispute Resolution

### Informal Resolution

Before filing any legal claim, you agree to attempt informal resolution by contacting rosa@iriseller.com.

### Governing Law

These terms are governed by California law.

---

## Modifications to Terms

We may modify these terms at any time. Material changes will be communicated via email or in-app notification at least 30 days in advance. Continued use after changes take effect constitutes acceptance.

---

## Termination

We may suspend or terminate your access if you:

- Violate these terms
- Engage in fraudulent or illegal activity
- Fail to pay fees when due
- Become subject to bankruptcy proceedings

Upon termination, your right to use IRIS ceases immediately.

---

## General Provisions

- **Entire Agreement:** These terms constitute the entire agreement between you and IRIS
- **Severability:** If any provision is unenforceable, other provisions remain in effect
- **Waiver:** Our failure to enforce a right doesn't waive that right
- **Assignment:** You may not assign these terms without our consent

---

## Contact

**Email:** rosa@iriseller.com

IRIS AI, Inc.
https://engage.iriseller.com`,
  },

  // ============================================
  // SECURITY PAGE
  // ============================================
  {
    type: 'SECURITY',
    title: 'Security',
    version: '1.0.0',
    content: `# Security at IRIS

Your data security is our highest priority. We implement enterprise-grade security measures to protect your business information.

---

## Security Architecture

### Encryption

**Data at Rest**
- AES-256 encryption for all stored data
- Encrypted database backups
- Encrypted file storage for documents

**Data in Transit**
- TLS 1.3 for all connections
- Certificate pinning on mobile apps
- HSTS enforcement

**Credential Security**
- Salesforce tokens encrypted at rest
- API keys hashed and salted
- No plaintext password storage

---

### Access Control

**Authentication**
- JWT-based authentication
- Multi-factor authentication (MFA) available
- SSO/SAML for Enterprise customers
- Biometric authentication on mobile

**Authorization**
- Role-based access control (RBAC)
- User roles: Admin, Manager, User, Viewer
- Granular permission settings
- IP allowlisting for Enterprise

---

### Infrastructure Security

**Cloud Infrastructure**
- Hosted on AWS and Azure
- SOC 2 certified data centers
- Geographic redundancy
- 99.99% infrastructure uptime SLA

**Network Security**
- Web Application Firewall (WAF)
- DDoS protection
- Intrusion detection systems
- Network segmentation

---

## Compliance & Certifications

### SOC 2 Type II

IRIS maintains SOC 2 Type II certification, demonstrating our commitment to security, availability, and confidentiality. Annual audits by independent third parties.

### GDPR

Full compliance with the General Data Protection Regulation:
- Data processing agreements
- Right to access, correction, and deletion
- Data portability support
- Privacy by design

### CCPA

Compliant with the California Consumer Privacy Act:
- Transparency about data collection
- Right to know and delete
- Opt-out of data sales (we don't sell data)

### HIPAA

HIPAA-ready for healthcare customers (Enterprise plan):
- Business Associate Agreement available
- PHI safeguards
- Access logging and audit trails

### ISO 27001

Security management aligned with ISO 27001 standards:
- Information security policies
- Risk management processes
- Continuous improvement

---

## Security Practices

### Development Security

- Secure development lifecycle (SDLC)
- Code reviews for all changes
- Automated security scanning
- Dependency vulnerability monitoring
- Regular penetration testing

### Operational Security

- 24/7 security monitoring
- Incident response team
- Security information and event management (SIEM)
- Regular security training for employees
- Background checks for all employees

### Data Protection

- Daily encrypted backups
- Point-in-time recovery
- Geographic backup replication
- 30-day backup retention
- Regular recovery testing

---

## Incident Response

We maintain documented incident response procedures:

1. **Detection** — Automated monitoring and alerting
2. **Containment** — Immediate threat isolation
3. **Investigation** — Root cause analysis
4. **Remediation** — Fix and prevent recurrence
5. **Notification** — Customer notification within 72 hours

---

## Penetration Testing

We conduct regular security assessments:

- **Quarterly** — Automated vulnerability scans
- **Annually** — Third-party penetration testing
- **Continuous** — Bug bounty program

---

## Bug Bounty Program

Security researchers can responsibly disclose vulnerabilities:

**Scope:**
- IRIS web application
- IRIS mobile applications
- IRIS API

**Rewards:**
- Critical vulnerabilities: Up to $5,000
- High severity: Up to $2,000
- Medium severity: Up to $500

Report vulnerabilities to: rosa@iriseller.com

---

## Contact Security Team

**Email:** rosa@iriseller.com

We respond to all security reports within 24 hours.`,
  },
];

async function seedContent() {
  console.log('Seeding app content...\n');

  for (const data of contentData) {
    try {
      // Check if content already exists
      const existing = await prisma.appContent.findFirst({
        where: { type: data.type },
      });

      if (existing) {
        // Update existing content
        await prisma.appContent.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            content: data.content,
            version: data.version,
            isActive: true,
            updatedAt: new Date(),
          },
        });
        console.log(`Updated: ${data.type}`);
      } else {
        // Create new content
        await prisma.appContent.create({
          data: {
            type: data.type,
            title: data.title,
            content: data.content,
            version: data.version,
            isActive: true,
          },
        });
        console.log(`Created: ${data.type}`);
      }
    } catch (error) {
      console.error(`Error with ${data.type}:`, error);
    }
  }

  console.log('\nContent seeding complete!');
}

seedContent()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
