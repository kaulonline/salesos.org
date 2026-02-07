import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { SearchService } from '../../search/search.service';
import { SalesforceService } from '../../salesforce/salesforce.service';

export interface MeetingPrepRequest {
  meetingId?: string;
  accountId?: string;
  leadId?: string;
  opportunityId?: string;
  contactId?: string;
}

export interface MeetingIntelligence {
  generatedAt: string;
  executiveSummary: string;
  accountOverview?: {
    name: string;
    industry?: string;
    website?: string;
    employees?: number;
    revenue?: string;
    description?: string;
  };
  leadOverview?: {
    name: string;
    company?: string;
    title?: string;
    email?: string;
    status?: string;
    painPoints?: string[];
    buyingIntent?: string;
  };
  keyContacts: Array<{
    name: string;
    title?: string;
    role?: string;
    email?: string;
    lastInteraction?: string;
  }>;
  activeOpportunities: Array<{
    name: string;
    amount?: number;
    stage?: string;
    closeDate?: string;
    probability?: number;
  }>;
  recentInteractions: Array<{
    type: string;
    subject: string;
    date: string;
    summary?: string;
  }>;
  pastMeetingInsights?: Array<{
    title: string;
    date: string;
    keyPoints?: string[];
    objections?: string[];
    actionItems?: string[];
  }>;
  companyNews?: Array<{
    title: string;
    snippet: string;
    date?: string;
    url?: string;
  }>;
  suggestedAgenda: string[];
  talkingPoints: string[];
  potentialObjections: string[];
  questionsToAsk: string[];
  dealRisks?: string[];
  relationshipStrength?: 'strong' | 'moderate' | 'weak' | 'new';
  recommendedApproach?: string;
}

@Injectable()
export class MeetingPrepService {
  private readonly logger = new Logger(MeetingPrepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly searchService: SearchService,
    private readonly salesforceService: SalesforceService,
  ) {}

  /**
   * Generate comprehensive meeting intelligence/prep
   */
  async generateMeetingPrep(
    request: MeetingPrepRequest,
    userId: string,
  ): Promise<MeetingIntelligence> {
    this.logger.log(`Generating meeting prep for user ${userId}`);

    // Step 1: Gather all CRM context
    const context = await this.gatherCrmContext(request, userId);

    // Step 2: Search for recent company news (if we have company name)
    let companyNews: any[] = [];
    const companyName = context.account?.name || context.lead?.company;
    if (companyName) {
      try {
        companyNews = await this.searchCompanyNews(companyName);
      } catch (error) {
        this.logger.warn(`Failed to fetch company news: ${error.message}`);
      }
    }

    // Step 3: Generate intelligent briefing using LLM
    const intelligence = await this.generateIntelligentBriefing(context, companyNews);

    return intelligence;
  }

  /**
   * Gather comprehensive CRM context for meeting prep
   */
  private async gatherCrmContext(
    request: MeetingPrepRequest,
    userId: string,
  ): Promise<{
    meeting?: any;
    account?: any;
    lead?: any;
    opportunity?: any;
    contact?: any;
    activities?: any[];
    notes?: any[];
    pastMeetings?: any[];
  }> {
    const context: any = {};

    // Fetch meeting if provided
    if (request.meetingId) {
      context.meeting = await this.prisma.meetingSession.findUnique({
        where: { id: request.meetingId },
        include: {
          account: {
            include: {
              contacts: { take: 10, orderBy: { createdAt: 'desc' } },
            },
          },
          lead: true,
          opportunity: true,
          participants: true,
          analysis: true,
        },
      });

      // Use linked entities from meeting
      if (context.meeting?.account) {
        request.accountId = context.meeting.accountId;
      }
      if (context.meeting?.lead) {
        request.leadId = context.meeting.leadId;
      }
      if (context.meeting?.opportunity) {
        request.opportunityId = context.meeting.opportunityId;
      }
    }

    // Fetch account with rich context
    if (request.accountId) {
      context.account = await this.prisma.account.findUnique({
        where: { id: request.accountId },
        include: {
          contacts: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          opportunities: {
            where: {
              stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
            },
            take: 5,
            orderBy: { amount: 'desc' },
          },
          activities: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Fetch past meetings for this account
      context.pastMeetings = await this.prisma.meetingSession.findMany({
        where: {
          accountId: request.accountId,
          status: 'COMPLETED',
        },
        include: {
          analysis: true,
        },
        orderBy: { scheduledStart: 'desc' },
        take: 5,
      });

      // Fetch notes for this account
      context.notes = await this.prisma.note.findMany({
        where: { accountId: request.accountId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    // Fetch lead if provided
    if (request.leadId) {
      // Check if this is a Salesforce Lead ID (starts with 00Q)
      if (request.leadId.startsWith('00Q')) {
        // Query Salesforce for lead data
        try {
          const sfResult = await this.salesforceService.query(
            userId,
            `SELECT Id, FirstName, LastName, Email, Phone, Company, Title, Status,
                    Industry, LeadSource, Website, Description,
                    Street, City, State, PostalCode, Country,
                    NumberOfEmployees, AnnualRevenue, Rating
             FROM Lead WHERE Id = '${request.leadId}' LIMIT 1`
          );

          if (sfResult.records?.length > 0) {
            const sfLead = sfResult.records[0];
            // Transform Salesforce lead to match expected format
            context.lead = {
              id: sfLead.Id,
              salesforceId: sfLead.Id,
              firstName: sfLead.FirstName || '',
              lastName: sfLead.LastName || '',
              email: sfLead.Email,
              phone: sfLead.Phone,
              company: sfLead.Company,
              title: sfLead.Title,
              status: sfLead.Status,
              industry: sfLead.Industry,
              leadSource: sfLead.LeadSource,
              website: sfLead.Website,
              description: sfLead.Description,
              street: sfLead.Street,
              city: sfLead.City,
              state: sfLead.State,
              postalCode: sfLead.PostalCode,
              country: sfLead.Country,
              numberOfEmployees: sfLead.NumberOfEmployees,
              annualRevenue: sfLead.AnnualRevenue,
              rating: sfLead.Rating,
              // Combine first and last name for display
              name: `${sfLead.FirstName || ''} ${sfLead.LastName || ''}`.trim(),
            };
            this.logger.log(`Fetched lead ${sfLead.Id} from Salesforce: ${context.lead.name}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch Salesforce lead ${request.leadId}: ${error.message}`);
        }
      } else {
        // Local IRIS database lead
        context.lead = await this.prisma.lead.findUnique({
          where: { id: request.leadId },
          include: {
            activities: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          },
        });
      }
    }

    // Fetch opportunity if provided
    if (request.opportunityId) {
      context.opportunity = await this.prisma.opportunity.findUnique({
        where: { id: request.opportunityId },
        include: {
          account: {
            include: {
              contacts: { take: 5 },
            },
          },
          activities: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // If we got account from opportunity, use it
      if (context.opportunity?.account && !context.account) {
        context.account = context.opportunity.account;
      }
    }

    // Fetch contact if provided
    if (request.contactId) {
      context.contact = await this.prisma.contact.findUnique({
        where: { id: request.contactId },
        include: {
          account: true,
          activities: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    return context;
  }

  /**
   * Search for recent company news
   */
  private async searchCompanyNews(companyName: string): Promise<any[]> {
    try {
      // Use search service if available
      const searchQuery = `${companyName} latest news announcements`;
      const result = await this.searchService.webSearch(searchQuery);

      return (result.searchResults || []).slice(0, 3).map((r: any) => ({
        title: r.title,
        snippet: r.snippet || r.description,
        date: r.publishedDate,
        url: r.url,
      }));
    } catch (error) {
      this.logger.warn(`Web search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate intelligent briefing using LLM
   */
  private async generateIntelligentBriefing(
    context: any,
    companyNews: any[],
  ): Promise<MeetingIntelligence> {
    const account = context.account;
    const lead = context.lead;
    const opportunity = context.opportunity;
    const pastMeetings = context.pastMeetings || [];
    const activities = context.activities || account?.activities || lead?.activities || [];
    const notes = context.notes || [];

    // Build context string for LLM
    const contextString = this.buildContextString(context, companyNews);

    // Build grounding facts for verification
    const groundingFacts = this.buildGroundingFacts(context);

    // Generate intelligent insights using LLM with strict grounding instructions
    const llmPrompt = `You are an AI sales assistant helping prepare for an upcoming meeting.

CRITICAL GROUNDING RULES:
1. You MUST ONLY use the information provided in the CRM DATA below
2. DO NOT invent or hallucinate any names, companies, titles, or details not in the data
3. The person's name is: ${groundingFacts.personName || 'Unknown'}
4. The company is: ${groundingFacts.companyName || 'Unknown'}
5. The title/role is: ${groundingFacts.personTitle || 'Not specified'}
6. Always use these EXACT names - do not substitute or invent others

CRM DATA:
${contextString}

Based ONLY on the above data, generate a JSON response with:
{
  "executiveSummary": "A 2-3 sentence overview mentioning ${groundingFacts.personName || 'the contact'} from ${groundingFacts.companyName || 'the company'}",
  "suggestedAgenda": ["Array of 3-5 recommended agenda items based on the relationship history"],
  "talkingPoints": ["Array of 5-7 specific talking points tailored to this prospect/customer"],
  "potentialObjections": ["Array of 2-4 objections they might raise based on past interactions"],
  "questionsToAsk": ["Array of 3-5 strategic questions to ask during the meeting"],
  "dealRisks": ["Array of 1-3 risks or concerns to be aware of"],
  "relationshipStrength": "strong|moderate|weak|new",
  "recommendedApproach": "A brief 2-3 sentence recommendation on how to approach this meeting"
}

IMPORTANT: If you don't have specific information for a section, provide general best-practice suggestions rather than inventing details.
Respond only with valid JSON, no markdown code blocks.`;

    let llmInsights: any = {};

    try {
      const responseText = await this.anthropic.generateChatCompletion({
        messages: [{ role: 'user', content: llmPrompt }],
        maxTokens: 1500,
        temperature: 0.7,
      });

      // Parse the LLM response (it returns a string directly)
      const jsonMatch = responseText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        llmInsights = JSON.parse(jsonMatch[0]);

        // Verify and correct any hallucinations in the response
        llmInsights = this.verifyAndGroundResponse(llmInsights, groundingFacts);

        if (llmInsights.wasRegroundedDueToHallucination) {
          this.logger.warn('LLM response was corrected due to hallucination detection');
        }
      }
    } catch (error) {
      this.logger.error(`Failed to generate LLM insights: ${error.message}`);
      // Provide default fallback insights
      llmInsights = this.getDefaultInsights(account, lead);
    }

    // Build the complete intelligence response
    const intelligence: MeetingIntelligence = {
      generatedAt: new Date().toISOString(),
      executiveSummary: llmInsights.executiveSummary || this.buildDefaultSummary(account, lead),
      keyContacts: [],
      activeOpportunities: [],
      recentInteractions: [],
      suggestedAgenda: llmInsights.suggestedAgenda || this.getDefaultAgenda(),
      talkingPoints: llmInsights.talkingPoints || this.getDefaultTalkingPoints(),
      potentialObjections: llmInsights.potentialObjections || [],
      questionsToAsk: llmInsights.questionsToAsk || this.getDefaultQuestions(),
      dealRisks: llmInsights.dealRisks,
      relationshipStrength: llmInsights.relationshipStrength || 'new',
      recommendedApproach: llmInsights.recommendedApproach,
    };

    // Add account overview
    if (account) {
      intelligence.accountOverview = {
        name: account.name,
        industry: account.industry,
        website: account.website,
        employees: account.numberOfEmployees,
        revenue: account.annualRevenue ? `$${account.annualRevenue.toLocaleString()}` : undefined,
        description: account.description,
      };

      // Add key contacts
      intelligence.keyContacts = (account.contacts || []).slice(0, 5).map((c: any) => ({
        name: `${c.firstName} ${c.lastName}`.trim(),
        title: c.title,
        role: c.role,
        email: c.email,
      }));

      // Add active opportunities
      intelligence.activeOpportunities = (account.opportunities || []).map((o: any) => ({
        name: o.name,
        amount: o.amount,
        stage: o.stage,
        closeDate: o.closeDate?.toISOString().split('T')[0],
        probability: o.probability,
      }));
    }

    // Add lead overview
    if (lead) {
      intelligence.leadOverview = {
        name: `${lead.firstName} ${lead.lastName}`.trim(),
        company: lead.company,
        title: lead.title,
        email: lead.email,
        status: lead.status,
        painPoints: lead.painPoints ? lead.painPoints.split(',').map((p: string) => p.trim()) : undefined,
        buyingIntent: lead.buyingIntent,
      };
    }

    // Add recent interactions
    intelligence.recentInteractions = activities.slice(0, 5).map((a: any) => ({
      type: a.type,
      subject: a.subject || a.description || 'Interaction',
      date: (a.activityDate || a.createdAt)?.toISOString().split('T')[0],
      summary: a.notes?.substring(0, 100),
    }));

    // Add past meeting insights
    if (pastMeetings.length > 0) {
      intelligence.pastMeetingInsights = pastMeetings
        .filter((m: any) => m.analysis)
        .slice(0, 3)
        .map((m: any) => ({
          title: m.title,
          date: m.scheduledStart?.toISOString().split('T')[0],
          keyPoints: m.analysis?.keyPoints?.slice(0, 3),
          objections: m.analysis?.objections?.slice(0, 2),
          actionItems: m.analysis?.actionItems?.slice(0, 3),
        }));
    }

    // Add company news
    if (companyNews.length > 0) {
      intelligence.companyNews = companyNews;
    }

    return intelligence;
  }

  /**
   * Build grounding facts for LLM verification
   * Extracts key entity names that the LLM must use exactly
   */
  private buildGroundingFacts(context: any): {
    personName: string | null;
    companyName: string | null;
    personTitle: string | null;
    personEmail: string | null;
  } {
    let personName: string | null = null;
    let companyName: string | null = null;
    let personTitle: string | null = null;
    let personEmail: string | null = null;

    // Priority: Lead > Contact > Account contacts
    if (context.lead) {
      const lead = context.lead;
      personName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || null;
      companyName = lead.company || null;
      personTitle = lead.title || null;
      personEmail = lead.email || null;
      this.logger.log(`Grounding facts from Lead: ${personName}, ${companyName}, ${personTitle}`);
    } else if (context.contact) {
      const contact = context.contact;
      personName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || null;
      companyName = context.account?.name || contact.account?.name || null;
      personTitle = contact.title || null;
      personEmail = contact.email || null;
      this.logger.log(`Grounding facts from Contact: ${personName}, ${companyName}, ${personTitle}`);
    } else if (context.account?.contacts?.length > 0) {
      // Use primary contact from account
      const contact = context.account.contacts[0];
      personName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || null;
      companyName = context.account.name;
      personTitle = contact.title || null;
      personEmail = contact.email || null;
      this.logger.log(`Grounding facts from Account contact: ${personName}, ${companyName}, ${personTitle}`);
    } else if (context.account) {
      // Only account available, no specific person
      companyName = context.account.name;
      this.logger.log(`Grounding facts from Account only: ${companyName}`);
    }

    return {
      personName,
      companyName,
      personTitle,
      personEmail,
    };
  }

  /**
   * Verify LLM response uses correct grounded facts
   * If hallucination detected, replace with grounded version
   */
  private verifyAndGroundResponse(
    llmInsights: any,
    groundingFacts: { personName: string | null; companyName: string | null; personTitle: string | null },
  ): any {
    // Check executive summary for hallucinated names
    if (llmInsights.executiveSummary && groundingFacts.personName) {
      const summary = llmInsights.executiveSummary;

      // List of common hallucinated names to check for
      const commonHallucinatedNames = [
        'Sarah Johnson', 'John Smith', 'Jane Doe', 'Michael Brown',
        'Emily Davis', 'Robert Wilson', 'Jennifer Lee', 'David Miller',
        'Jessica Taylor', 'Chris Anderson', 'Lisa Martin', 'James Thomas',
      ];

      // Check if summary contains a hallucinated name but not the actual name
      const containsHallucination = commonHallucinatedNames.some(
        name => summary.toLowerCase().includes(name.toLowerCase())
      );
      const containsActualName = summary.toLowerCase().includes(
        groundingFacts.personName.toLowerCase()
      );

      if (containsHallucination && !containsActualName) {
        this.logger.warn(
          `Detected hallucinated name in executive summary. Expected: ${groundingFacts.personName}`
        );

        // Replace the hallucinated summary with a grounded one
        llmInsights.executiveSummary = this.buildGroundedSummary(groundingFacts);
        llmInsights.wasRegroundedDueToHallucination = true;
      }
    }

    return llmInsights;
  }

  /**
   * Build a grounded summary using verified facts
   */
  private buildGroundedSummary(groundingFacts: {
    personName: string | null;
    companyName: string | null;
    personTitle: string | null;
  }): string {
    const parts: string[] = [];

    if (groundingFacts.personName) {
      parts.push(`Meeting with ${groundingFacts.personName}`);
      if (groundingFacts.personTitle) {
        parts.push(`, ${groundingFacts.personTitle}`);
      }
      if (groundingFacts.companyName) {
        parts.push(` at ${groundingFacts.companyName}`);
      }
      parts.push('.');
    } else if (groundingFacts.companyName) {
      parts.push(`Meeting with ${groundingFacts.companyName}.`);
    } else {
      parts.push('Upcoming meeting.');
    }

    parts.push(' Review the CRM context and prepare key discussion points based on relationship history.');

    return parts.join('');
  }

  /**
   * Build context string for LLM prompt
   */
  private buildContextString(context: any, companyNews: any[]): string {
    const parts: string[] = [];

    if (context.account) {
      parts.push(`ACCOUNT: ${context.account.name}`);
      if (context.account.industry) parts.push(`Industry: ${context.account.industry}`);
      if (context.account.description) parts.push(`Description: ${context.account.description}`);
      if (context.account.annualRevenue) parts.push(`Annual Revenue: $${context.account.annualRevenue.toLocaleString()}`);
    }

    if (context.lead) {
      parts.push(`\nLEAD: ${context.lead.firstName} ${context.lead.lastName}`);
      if (context.lead.company) parts.push(`Company: ${context.lead.company}`);
      if (context.lead.title) parts.push(`Title: ${context.lead.title}`);
      if (context.lead.status) parts.push(`Status: ${context.lead.status}`);
      if (context.lead.painPoints) parts.push(`Pain Points: ${context.lead.painPoints}`);
      if (context.lead.buyingIntent) parts.push(`Buying Intent: ${context.lead.buyingIntent}`);
    }

    if (context.opportunity) {
      parts.push(`\nOPPORTUNITY: ${context.opportunity.name}`);
      parts.push(`Stage: ${context.opportunity.stage}`);
      if (context.opportunity.amount) parts.push(`Amount: $${context.opportunity.amount.toLocaleString()}`);
      if (context.opportunity.closeDate) parts.push(`Close Date: ${context.opportunity.closeDate.toISOString().split('T')[0]}`);
    }

    // Add contact information
    const contacts = context.account?.contacts || [];
    if (contacts.length > 0) {
      parts.push('\nKEY CONTACTS:');
      contacts.slice(0, 3).forEach((c: any) => {
        parts.push(`- ${c.firstName} ${c.lastName}, ${c.title || 'N/A'}`);
      });
    }

    // Add recent activities
    const activities = context.account?.activities || context.lead?.activities || [];
    if (activities.length > 0) {
      parts.push('\nRECENT INTERACTIONS:');
      activities.slice(0, 5).forEach((a: any) => {
        const date = (a.activityDate || a.createdAt)?.toISOString().split('T')[0];
        parts.push(`- [${date}] ${a.type}: ${a.subject || a.description || 'No subject'}`);
      });
    }

    // Add past meeting insights
    const pastMeetings = context.pastMeetings || [];
    if (pastMeetings.length > 0) {
      parts.push('\nPAST MEETINGS:');
      pastMeetings.filter((m: any) => m.analysis).slice(0, 3).forEach((m: any) => {
        parts.push(`- ${m.title} (${m.scheduledStart?.toISOString().split('T')[0]})`);
        if (m.analysis?.keyPoints?.length > 0) {
          parts.push(`  Key Points: ${m.analysis.keyPoints.slice(0, 2).join(', ')}`);
        }
        if (m.analysis?.objections?.length > 0) {
          parts.push(`  Objections raised: ${m.analysis.objections.slice(0, 2).join(', ')}`);
        }
      });
    }

    // Add notes
    const notes = context.notes || [];
    if (notes.length > 0) {
      parts.push('\nRECENT NOTES:');
      notes.slice(0, 3).forEach((n: any) => {
        parts.push(`- ${n.title}: ${n.body?.substring(0, 100)}...`);
      });
    }

    // Add company news
    if (companyNews.length > 0) {
      parts.push('\nRECENT COMPANY NEWS:');
      companyNews.forEach((news: any) => {
        parts.push(`- ${news.title}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Build default summary when LLM fails
   */
  private buildDefaultSummary(account: any, lead: any): string {
    if (account) {
      return `Meeting with ${account.name}${account.industry ? ` (${account.industry})` : ''}. Review recent interactions and prepare key discussion points.`;
    }
    if (lead) {
      return `Meeting with ${lead.firstName} ${lead.lastName} from ${lead.company || 'unknown company'}. Focus on understanding their needs and qualifying the opportunity.`;
    }
    return 'Prepare for upcoming meeting by reviewing available context and preparing key talking points.';
  }

  /**
   * Get default insights when LLM fails
   */
  private getDefaultInsights(account: any, lead: any): any {
    return {
      executiveSummary: this.buildDefaultSummary(account, lead),
      suggestedAgenda: this.getDefaultAgenda(),
      talkingPoints: this.getDefaultTalkingPoints(),
      potentialObjections: [],
      questionsToAsk: this.getDefaultQuestions(),
      relationshipStrength: 'new',
      recommendedApproach: 'Focus on understanding their current challenges and how we can help address them.',
    };
  }

  /**
   * Default agenda items
   */
  private getDefaultAgenda(): string[] {
    return [
      'Brief introductions and rapport building',
      'Review current situation and challenges',
      'Discuss potential solutions and approach',
      'Address questions and concerns',
      'Agree on next steps and timeline',
    ];
  }

  /**
   * Default talking points
   */
  private getDefaultTalkingPoints(): string[] {
    return [
      'Open by acknowledging any recent company news or developments',
      'Ask about their current priorities and pain points',
      'Share relevant success stories from similar companies',
      'Discuss how our solution addresses their specific challenges',
      'Outline the implementation process and timeline',
    ];
  }

  /**
   * Default questions to ask
   */
  private getDefaultQuestions(): string[] {
    return [
      'What are your top priorities for this quarter?',
      'What challenges are you currently facing?',
      'What would success look like for you?',
      'Who else is involved in the decision-making process?',
      'What is your timeline for making a decision?',
    ];
  }
}
