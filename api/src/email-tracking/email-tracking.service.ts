import { Injectable, Inject, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { AnthropicService } from '../anthropic/anthropic.service';
import { EmailService } from '../email/email.service';
import { EmailTrackingUtils } from './email-tracking.utils';
import { ZoomService } from '../meetings/services/zoom.service';
import {
  EmailThread,
  EmailMessage,
  EmailDraft,
  EmailDirection,
  EmailMessageStatus,
  EmailThreadStatus,
  EmailIntent,
  EmailUrgency,
  Sentiment,
  EngagementLevel,
  ActivityType,
  LeadStatus,
  TaskPriority,
  TaskStatus,
  DraftStatus,
  MeetingPlatform,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ==================== INTERFACES ====================

export interface SendTrackedEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  leadId?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  cc?: string[];
  bcc?: string[];
}

export interface InboundEmailParams {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  receivedAt?: Date;
}

export interface EmailAnalysis {
  sentiment: Sentiment;
  intent: EmailIntent;
  urgency: EmailUrgency;
  keyPoints: string[];
  actionItems: string[];
  requiresResponse: boolean;
  suggestedResponse?: string;
  suggestedCrmActions: CrmAction[];
  // For unsolicited emails: extracted entity details for auto-CRM creation
  extractedEntity?: ExtractedEntityDetails;
}

export interface ExtractedEntityDetails {
  firstName?: string;
  lastName?: string;
  email: string;            // From email header (always available)
  company?: string;         // Extracted from content/signature
  title?: string;           // Job title if found
  phone?: string;           // Phone number if in signature
  industry?: string;        // Inferred from context
  painPoints?: string[];    // What they're asking about
  intent?: string;          // What they want/need
  confidence: number;       // 0-100 confidence in extraction accuracy
  suggestedLeadScore?: number;  // 0-100 AI-suggested lead score
}

export interface CrmAction {
  type: 'UPDATE_LEAD_STATUS' | 'CREATE_TASK' | 'UPDATE_OPPORTUNITY' | 'LOG_ACTIVITY' | 'UPDATE_CONTACT' | 'SCHEDULE_FOLLOW_UP' | 'SCHEDULE_MEETING' | 'CREATE_LEAD';
  params: Record<string, any>;
  reason: string;
}


// ==================== SERVICE ====================

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly emailService: EmailService,
    private readonly trackingUtils: EmailTrackingUtils,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ZoomService))
    private readonly zoomService: ZoomService,
  ) { }


  // ==================== CRM AUTO-LINKING ====================

  /**
   * Auto-lookup Lead or Contact by email address for CRM linking
   * Returns the first matching lead or contact found
   */
  private async findCrmEntityByEmail(email: string): Promise<{
    leadId?: string;
    contactId?: string;
    accountId?: string;
  }> {
    if (!email) return {};

    const normalizedEmail = email.toLowerCase().trim();

    // Try to find a lead with this email
    const lead = await this.prisma.lead.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });

    if (lead) {
      this.logger.log(`Found lead ${lead.id} for email ${email}`);
      return { leadId: lead.id };
    }

    // Try to find a contact with this email
    const contact = await this.prisma.contact.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true, accountId: true },
    });

    if (contact) {
      this.logger.log(`Found contact ${contact.id} for email ${email}`);
      return { contactId: contact.id, accountId: contact.accountId || undefined };
    }

    this.logger.debug(`No CRM entity found for email ${email}`);
    return {};
  }

  // ==================== SEND TRACKED EMAIL ====================

  /**
   * Send an email and create a tracking thread
   */
  async sendTrackedEmail(params: SendTrackedEmailParams, userId: string): Promise<{
    thread: EmailThread;
    message: EmailMessage;
    sent: boolean;
    trackingId: string;
  }> {
    this.logger.log(`Sending tracked email to: ${params.to}, subject: ${params.subject}`);
    this.logger.debug(`Params: ${JSON.stringify(params)}`);

    // Validate required fields
    if (!params.subject) {
      throw new Error('Subject is required');
    }

    const toEmails = Array.isArray(params.to) ? params.to : [params.to];

    // Auto-link CRM records if not provided
    let crmLinks = {
      leadId: params.leadId,
      contactId: params.contactId,
      accountId: params.accountId,
    };

    if (!params.leadId && !params.contactId) {
      // Try to find a matching lead or contact by recipient email
      const autoLinked = await this.findCrmEntityByEmail(toEmails[0]);
      if (autoLinked.leadId || autoLinked.contactId) {
        crmLinks = { ...crmLinks, ...autoLinked };
        this.logger.log(`Auto-linked email thread to CRM: ${JSON.stringify(autoLinked)}`);
      }
    }

    // Create or find thread
    let thread = await this.findExistingThread(toEmails[0], params.subject, userId);

    if (!thread) {
      thread = await this.prisma.emailThread.create({
        data: {
          userId,
          subject: params.subject,
          status: EmailThreadStatus.AWAITING_RESPONSE,
          leadId: crmLinks.leadId,
          accountId: crmLinks.accountId,
          contactId: crmLinks.contactId,
          opportunityId: params.opportunityId,
          totalEmails: 1,
          lastEmailAt: new Date(),
          suggestedActions: [],
        },
      });

    } else {
      // Update existing thread
      thread = await this.prisma.emailThread.update({
        where: { id: thread.id },
        data: {
          totalEmails: { increment: 1 },
          lastEmailAt: new Date(),
          status: EmailThreadStatus.AWAITING_RESPONSE,
        },
      });
    }

    // Generate tracking ID and custom message ID
    const trackingId = this.trackingUtils.generateTrackingId(thread.id, uuidv4());
    const messageId = this.trackingUtils.generateMessageIdHeader(trackingId, thread.id);

    // Inject tracking elements into email body
    const trackedBody = this.trackingUtils.injectTrackingElements(
      params.body,
      trackingId,
      thread.id,
      { wrapLinks: true, addPixel: true },
    );

    // Create the email message record
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        userId,
        messageId,
        fromEmail: process.env.GMAIL_USER!, // GMAIL_USER is validated by email service
        fromName: 'IRIS Sales CRM',
        toEmails,
        ccEmails: params.cc || [],
        bccEmails: params.bcc || [],
        subject: params.subject,
        bodyHtml: trackedBody,
        bodyText: this.stripHtml(params.body),
        direction: EmailDirection.OUTBOUND,
        status: EmailMessageStatus.QUEUED,
        keyPoints: [],
        actionItemsExtracted: [],
        metadata: {
          trackingId,
          originalBody: params.body,
        },
      },
    });

    // Send the email with tracking
    try {
      const result = await this.emailService.sendGeneralEmail({
        to: toEmails,
        subject: params.subject,
        body: trackedBody,
      });

      if (result.success) {
        await this.prisma.emailMessage.update({
          where: { id: emailMessage.id },
          data: {
            status: EmailMessageStatus.SENT,
            sentAt: new Date(),
          },
        });

        // Log activity
        await this.logEmailActivity(thread, emailMessage, userId, 'SENT');

        this.logger.log(`Tracked email sent with ID: ${trackingId}`);
        return { thread, message: emailMessage, sent: true, trackingId };
      } else {
        await this.prisma.emailMessage.update({
          where: { id: emailMessage.id },
          data: { status: EmailMessageStatus.FAILED },
        });
        return { thread, message: emailMessage, sent: false, trackingId };
      }
    } catch (error) {
      this.logger.error(`Failed to send tracked email: ${error.message}`);
      await this.prisma.emailMessage.update({
        where: { id: emailMessage.id },
        data: { status: EmailMessageStatus.FAILED },
      });
      return { thread, message: emailMessage, sent: false, trackingId };
    }
  }

  // ==================== PROCESS INBOUND EMAIL ====================

  /**
   * Process an inbound email response and perform CRM actions
   */
  async processInboundEmail(params: InboundEmailParams, userId?: string): Promise<{
    thread: EmailThread;
    message: EmailMessage;
    analysis: EmailAnalysis;
    crmActionsPerformed: CrmAction[];
  }> {
    this.logger.log(`Processing inbound email params: ${JSON.stringify(params)}`);

    // Find the related thread using In-Reply-To or References
    let thread = await this.findThreadByReferences(params.inReplyTo, params.references);
    let isUnsolicited = false;

    if (!thread) {
      // Try to find by sender email and subject
      thread = await this.findThreadByEmailAndSubject(params.fromEmail, params.subject);
    }

    if (!thread) {
      // This is an unsolicited email - mark it for entity extraction
      isUnsolicited = true;
      this.logger.log(`Unsolicited email detected from ${params.fromEmail} - will extract entity for auto-CRM`);

      // Ensure we have a valid user ID for the thread
      if (!userId) {
        const defaultUser = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
        if (defaultUser) {
          userId = defaultUser.id;
        } else {
          this.logger.warn('No users found in database - assigning to "system" (may cause FK errors)');
          userId = 'system';
        }
      }

      // Auto-link to CRM by sender email
      const crmLinks = await this.findCrmEntityByEmail(params.fromEmail);
      if (crmLinks.leadId || crmLinks.contactId) {
        this.logger.log(`Auto-linked new inbound thread to CRM: ${JSON.stringify(crmLinks)}`);
      }

      // Build thread data, only including defined CRM links
      const threadData: any = {
        userId: userId,
        subject: params.subject || 'No Subject',
        status: EmailThreadStatus.ACTIVE,
        totalEmails: 1,
        totalResponses: 1,
        lastEmailAt: new Date(),
        lastResponseAt: new Date(),
        suggestedActions: [],
      };

      // Only add CRM links if they're defined
      if (crmLinks.leadId) threadData.leadId = crmLinks.leadId;
      if (crmLinks.contactId) threadData.contactId = crmLinks.contactId;
      if (crmLinks.accountId) threadData.accountId = crmLinks.accountId;

      thread = await this.prisma.emailThread.create({ data: threadData });

    } else {
      // Update thread with response
      thread = await this.prisma.emailThread.update({
        where: { id: thread.id },
        data: {
          totalEmails: { increment: 1 },
          totalResponses: { increment: 1 },
          lastEmailAt: new Date(),
          lastResponseAt: new Date(),
          status: EmailThreadStatus.RESPONDED,
        },
      });
    }

    // Analyze the email content with AI (with entity extraction for unsolicited emails)
    const analysis = await this.analyzeEmailContent(
      params.subject,
      params.bodyText || params.bodyHtml || '',
      thread,
      params.fromEmail,
      params.fromName,
      isUnsolicited,
    );


    // Create the email message record
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        messageId: params.messageId,
        inReplyTo: params.inReplyTo,
        references: params.references || [],
        fromEmail: params.fromEmail,
        fromName: params.fromName,
        toEmails: params.toEmails,
        ccEmails: params.ccEmails || [],
        bccEmails: [],
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        bodyText: params.bodyText,
        direction: EmailDirection.INBOUND,
        status: EmailMessageStatus.RECEIVED,
        receivedAt: params.receivedAt || new Date(),
        processedAt: new Date(),
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        keyPoints: analysis.keyPoints,
        actionItemsExtracted: analysis.actionItems,
        urgency: analysis.urgency,
        requiresResponse: analysis.requiresResponse,
        suggestedResponse: analysis.suggestedResponse,
      },
    });

    // Perform CRM actions based on analysis
    const crmActionsPerformed = await this.performCrmActions(
      thread,
      emailMessage,
      analysis,
      thread.userId,
    );

    // Update email message with performed actions
    await this.prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: {
        crmActionsPerformed: crmActionsPerformed as any,
      },
    });

    // Update thread with AI insights
    await this.prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        sentiment: analysis.sentiment,
        engagementLevel: this.calculateEngagementLevel(thread),
        suggestedActions: analysis.suggestedCrmActions.map(a => a.reason),
      },
    });

    // Auto-create draft response if AI suggested one
    let draftResponse: EmailDraft | null = null;
    if (analysis.requiresResponse && analysis.suggestedResponse) {
      draftResponse = await this.createDraftResponse(
        thread,
        emailMessage,
        analysis,
      );
    }

    // Log activity
    await this.logEmailActivity(thread, emailMessage, thread.userId, 'RECEIVED', analysis);

    this.logger.log(`Inbound email processed: ${emailMessage.id}, ${crmActionsPerformed.length} CRM actions performed${draftResponse ? ', draft response created' : ''}`);

    return {
      thread,
      message: emailMessage,
      analysis,
      crmActionsPerformed,
    };
  }

  // ==================== AI ANALYSIS ====================

  /**
   * Analyze email content using AI
   * For unsolicited emails (new threads), also extracts entity details for auto-CRM creation
   */
  private async analyzeEmailContent(
    subject: string,
    body: string,
    thread: EmailThread,
    fromEmail?: string,
    fromName?: string,
    isUnsolicited: boolean = false,
  ): Promise<EmailAnalysis> {
    try {
      // Build prompt based on whether this is unsolicited or a reply
      const contextInfo = isUnsolicited
        ? '- This is a NEW unsolicited email (not a reply to our emails)\n- We need to extract sender details for CRM'
        : `- This is a response in an ongoing email thread\n- Thread subject: ${thread.subject}\n- Total emails in thread: ${thread.totalEmails}`;

      const entityExtractionPrompt = isUnsolicited
        ? `,
  "extractedEntity": {
    "firstName": "<extract from email name or signature, if 'John Smith' then 'John'>",
    "lastName": "<extract from email name or signature, if 'John Smith' then 'Smith'>",
    "company": "<company name from signature, domain, or content>",
    "title": "<job title if found in signature>",
    "phone": "<phone number if found in signature>",
    "industry": "<industry inferred from email content/domain>",
    "painPoints": ["<problem/need mentioned>"],
    "intent": "<what they want - product info, demo, pricing, support, etc>",
    "confidence": <0-100 confidence in accuracy of extraction>,
    "suggestedLeadScore": <0-100 score based on: urgency, intent, company size hints, decision-maker signals>
  }`
        : '';

      const prompt = `Analyze this email and provide a detailed assessment.

EMAIL FROM: ${fromName || 'Unknown'} <${fromEmail || 'unknown'}>
EMAIL SUBJECT: ${subject}

EMAIL BODY:
${body}

CONTEXT:
${contextInfo}

Analyze the email and provide a JSON response with:
{
  "sentiment": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>",
  "intent": "<POSITIVE_REPLY|NEGATIVE_REPLY|QUESTION|MEETING_REQUEST|REFERRAL|OUT_OF_OFFICE|UNSUBSCRIBE|NEUTRAL|FOLLOW_UP|INQUIRY|SUPPORT_REQUEST>",
  "urgency": "<HIGH|MEDIUM|LOW>",
  "keyPoints": ["<key point 1>", "<key point 2>"],
  "actionItems": ["<action item 1>", "<action item 2>"],
  "requiresResponse": <true|false>,
  "suggestedResponse": "<brief suggested response if required>",
  "suggestedCrmActions": [
    {
      "type": "<UPDATE_LEAD_STATUS|CREATE_TASK|UPDATE_OPPORTUNITY|LOG_ACTIVITY|UPDATE_CONTACT|SCHEDULE_FOLLOW_UP|SCHEDULE_MEETING|CREATE_LEAD>",
      "params": {<relevant params>},
      "reason": "<why this action should be taken>"
    }
  ]${entityExtractionPrompt}
}

CRM ACTION GUIDANCE:
- For NEW unsolicited emails: ADD "CREATE_LEAD" action with extracted entity details
- If positive reply → UPDATE_LEAD_STATUS to QUALIFIED
- If meeting request → SCHEDULE_MEETING or CREATE_TASK
- If questions/inquiry → CREATE_TASK to answer
- Always LOG_ACTIVITY for any interaction

ENTITY EXTRACTION TIPS (for unsolicited emails):
- Look for name in "From" header first, then email signature
- Company can be domain (e.g., john@acme.com → "Acme")
- Title often appears after name in signature (e.g., "John Smith, VP Sales")
- Phone numbers are often in signatures with formats like +1-555-1234
- Industry can be inferred from what they're asking about
- suggestedLeadScore: 80-100 for urgent buyers, 50-79 for interested parties, 20-49 for info seekers, 0-19 for spam/marketing`;

      const response = await this.anthropic.generateChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 2000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('Failed to extract JSON from AI analysis');
        return this.getDefaultAnalysis(fromEmail);
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Build the extracted entity if present
      let extractedEntity: ExtractedEntityDetails | undefined;
      if (isUnsolicited && analysis.extractedEntity && fromEmail) {
        extractedEntity = {
          email: fromEmail,
          firstName: analysis.extractedEntity.firstName,
          lastName: analysis.extractedEntity.lastName,
          company: analysis.extractedEntity.company,
          title: analysis.extractedEntity.title,
          phone: analysis.extractedEntity.phone,
          industry: analysis.extractedEntity.industry,
          painPoints: analysis.extractedEntity.painPoints,
          intent: analysis.extractedEntity.intent,
          confidence: analysis.extractedEntity.confidence || 50,
          suggestedLeadScore: analysis.extractedEntity.suggestedLeadScore,
        };
        this.logger.log(`Extracted entity from email: ${JSON.stringify(extractedEntity)}`);
      }

      return {
        sentiment: analysis.sentiment as Sentiment,
        intent: analysis.intent as EmailIntent,
        urgency: analysis.urgency as EmailUrgency,
        keyPoints: analysis.keyPoints || [],
        actionItems: analysis.actionItems || [],
        requiresResponse: analysis.requiresResponse || false,
        suggestedResponse: analysis.suggestedResponse,
        suggestedCrmActions: analysis.suggestedCrmActions || [],
        extractedEntity,
      };
    } catch (error) {
      this.logger.error(`Email analysis failed: ${error.message}`);
      return this.getDefaultAnalysis(fromEmail);
    }
  }


  private getDefaultAnalysis(fromEmail?: string): EmailAnalysis {
    return {
      sentiment: Sentiment.NEUTRAL,
      intent: EmailIntent.NEUTRAL,
      urgency: EmailUrgency.MEDIUM,
      keyPoints: [],
      actionItems: [],
      requiresResponse: true,
      suggestedCrmActions: [],
      // Include basic entity data if email is available
      extractedEntity: fromEmail ? {
        email: fromEmail,
        confidence: 0,
      } : undefined,
    };
  }


  // ==================== CRM ACTIONS ====================

  /**
   * Perform CRM actions based on email analysis
   */
  private async performCrmActions(
    thread: EmailThread,
    email: EmailMessage,
    analysis: EmailAnalysis,
    userId: string,
  ): Promise<CrmAction[]> {
    const performedActions: CrmAction[] = [];

    // Check if auto-CRM creation is enabled and we have extracted entity data
    const autoCreateEnabled = this.configService?.get<string>('AUTO_CREATE_CRM_FROM_EMAIL', 'true') === 'true';
    const minConfidence = parseInt(this.configService?.get<string>('AUTO_CREATE_CRM_MIN_CONFIDENCE', '50') || '50', 10);

    for (const action of analysis.suggestedCrmActions) {
      try {
        switch (action.type) {
          case 'UPDATE_LEAD_STATUS':
            if (thread.leadId) {
              await this.updateLeadStatus(thread.leadId, action.params, userId);
              performedActions.push(action);
            }
            break;

          case 'CREATE_TASK':
            await this.createFollowUpTask(thread, email, action.params, userId);
            performedActions.push(action);
            break;

          case 'UPDATE_OPPORTUNITY':
            if (thread.opportunityId) {
              await this.updateOpportunity(thread.opportunityId, action.params, userId);
              performedActions.push(action);
            }
            break;

          case 'UPDATE_CONTACT':
            if (thread.contactId) {
              await this.updateContactEngagement(thread.contactId, email, analysis);
              performedActions.push(action);
            }
            break;

          case 'SCHEDULE_FOLLOW_UP':
            await this.scheduleFollowUp(thread, action.params, userId);
            performedActions.push(action);
            break;

          case 'SCHEDULE_MEETING':
            await this.scheduleMeeting(thread, email, action.params, userId);
            performedActions.push(action);
            break;

          case 'CREATE_LEAD':
            // Auto-create lead from extracted entity if enabled and confidence is high enough
            if (autoCreateEnabled && !thread.leadId && !thread.contactId && analysis.extractedEntity) {
              const entity = analysis.extractedEntity;
              if (entity.confidence >= minConfidence) {
                const createdLead = await this.createLeadFromEmail(email, entity, analysis, userId);
                if (createdLead) {
                  // Update the thread to link to the new lead
                  await this.prisma.emailThread.update({
                    where: { id: thread.id },
                    data: { leadId: createdLead.id },
                  });
                  // Update thread object for further actions
                  thread = { ...thread, leadId: createdLead.id };
                  performedActions.push({
                    ...action,
                    params: { ...action.params, leadId: createdLead.id, leadEmail: entity.email },
                  });
                  this.logger.log(`Auto-created lead ${createdLead.id} from email and linked to thread ${thread.id}`);
                }
              } else {
                this.logger.log(`Skipping auto-lead creation: confidence ${entity.confidence}% < threshold ${minConfidence}%`);
              }
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to perform CRM action ${action.type}: ${error.message}`);
      }
    }

    // If no CREATE_LEAD action was suggested but we have extracted entity and no existing CRM link
    // Auto-suggest creating a lead for unsolicited emails
    if (
      autoCreateEnabled &&
      !thread.leadId &&
      !thread.contactId &&
      analysis.extractedEntity &&
      analysis.extractedEntity.confidence >= minConfidence &&
      !performedActions.some(a => a.type === 'CREATE_LEAD')
    ) {
      try {
        const entity = analysis.extractedEntity;
        const createdLead = await this.createLeadFromEmail(email, entity, analysis, userId);
        if (createdLead) {
          await this.prisma.emailThread.update({
            where: { id: thread.id },
            data: { leadId: createdLead.id },
          });
          performedActions.push({
            type: 'CREATE_LEAD',
            params: { leadId: createdLead.id, leadEmail: entity.email },
            reason: 'Auto-created lead from unsolicited email',
          });
          this.logger.log(`Auto-created lead ${createdLead.id} (implicit) from unsolicited email`);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-create lead: ${error.message}`);
      }
    }

    return performedActions;
  }

  /**
   * Create a lead from extracted email entity details
   */
  private async createLeadFromEmail(
    email: EmailMessage,
    entity: ExtractedEntityDetails,
    analysis: EmailAnalysis,
    userId: string,
  ): Promise<{ id: string } | null> {
    // Check if lead with this email already exists
    const existingLead = await this.prisma.lead.findFirst({
      where: { email: { equals: entity.email, mode: 'insensitive' } },
    });

    if (existingLead) {
      this.logger.log(`Lead already exists for ${entity.email}: ${existingLead.id}`);
      return existingLead;
    }

    // Parse name from entity or email
    let firstName = entity.firstName || '';
    let lastName = entity.lastName || '';

    if (!firstName && !lastName && email.fromName) {
      const nameParts = email.fromName.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || email.fromName;
    }

    if (!firstName && !lastName) {
      // Extract from email address (e.g., john.smith@company.com -> John Smith)
      const emailLocal = entity.email.split('@')[0];
      const nameParts = emailLocal.replace(/[._-]/g, ' ').split(/\s+/);
      firstName = this.capitalize(nameParts[0] || 'Unknown');
      lastName = this.capitalize(nameParts.slice(1).join(' ') || 'Lead');
    }

    // Infer company from email domain if not extracted
    let company = entity.company;
    if (!company) {
      const domain = entity.email.split('@')[1];
      if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain.toLowerCase())) {
        company = this.capitalize(domain.split('.')[0]);
      }
    }

    // Create the lead
    const lead = await this.prisma.lead.create({
      data: {
        ownerId: userId,
        firstName: firstName || 'Unknown',
        lastName: lastName || 'Lead',
        email: entity.email,
        company,
        title: entity.title,
        phone: entity.phone,
        industry: entity.industry,
        leadSource: 'OTHER' as any, // "INBOUND_EMAIL" not in enum, using OTHER
        status: 'NEW' as any,
        leadScore: entity.suggestedLeadScore,
        painPoints: entity.painPoints || [],
      },
    });


    // Log the activity
    await this.prisma.activity.create({
      data: {
        type: 'LEAD_CREATED' as any,
        subject: `Lead auto-created from email`,
        description: `Lead created automatically from unsolicited email: "${email.subject}"`,
        userId: userId,
        leadId: lead.id,
      },
    });


    this.logger.log(`Created new lead: ${lead.id} (${entity.email}) with score ${entity.suggestedLeadScore}`);
    return lead;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }


  /**
   * Update lead status based on email response
   */
  private async updateLeadStatus(
    leadId: string,
    params: Record<string, any>,
    userId: string,
  ): Promise<void> {
    const updateData: any = {};

    if (params.status) {
      updateData.status = params.status as LeadStatus;
    }

    if (params.isQualified !== undefined) {
      updateData.isQualified = params.isQualified;
      if (params.isQualified) {
        updateData.qualifiedDate = new Date();
      }
    }

    if (params.rating) {
      updateData.rating = params.rating;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: updateData,
      });

      this.logger.log(`Lead ${leadId} updated: ${JSON.stringify(updateData)}`);
    }
  }

  /**
   * Create a follow-up task based on email
   */
  private async createFollowUpTask(
    thread: EmailThread,
    email: EmailMessage,
    params: Record<string, any>,
    userId: string,
  ): Promise<void> {
    const defaultDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 24 hours from now
    let dueDate = defaultDueDate;

    if (params.dueDate) {
      const parsedDate = new Date(params.dueDate);
      // Check if the parsed date is valid
      if (!isNaN(parsedDate.getTime())) {
        dueDate = parsedDate;
      } else {
        this.logger.warn(`Invalid dueDate provided: "${params.dueDate}", using default`);
      }
    }

    await this.prisma.task.create({
      data: {
        ownerId: userId,
        leadId: thread.leadId,
        accountId: thread.accountId,
        contactId: thread.contactId,
        opportunityId: thread.opportunityId,
        subject: params.subject || `Follow up on email: ${email.subject}`,
        description: params.description || `Email from ${email.fromEmail}: ${email.keyPoints.join(', ')}`,
        status: TaskStatus.NOT_STARTED,
        priority: this.mapUrgencyToPriority(email.urgency ?? undefined),
        dueDate,
      },
    });

    this.logger.log(`Follow-up task created for thread ${thread.id}`);
  }

  /**
   * Update opportunity based on email response
   */
  private async updateOpportunity(
    opportunityId: string,
    params: Record<string, any>,
    userId: string,
  ): Promise<void> {
    const updateData: any = {
      lastActivityDate: new Date(),
    };

    if (params.stage) {
      updateData.stage = params.stage;
    }

    if (params.nextStep) {
      updateData.nextStep = params.nextStep;
    }

    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: updateData,
    });

    this.logger.log(`Opportunity ${opportunityId} updated`);
  }

  /**
   * Update contact engagement metrics
   */
  private async updateContactEngagement(
    contactId: string,
    email: EmailMessage,
    analysis: EmailAnalysis,
  ): Promise<void> {
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        lastContactedAt: new Date(),
        lastEmailDate: new Date(),
        // Increment engagement based on positive responses
        engagementScore: analysis.sentiment === Sentiment.POSITIVE ||
          analysis.sentiment === Sentiment.VERY_POSITIVE
          ? { increment: 5 }
          : analysis.sentiment === Sentiment.NEGATIVE ||
            analysis.sentiment === Sentiment.VERY_NEGATIVE
            ? { decrement: 5 }
            : undefined,
      },
    });

    this.logger.log(`Contact ${contactId} engagement updated`);
  }

  /**
   * Schedule a follow-up reminder
   */
  private async scheduleFollowUp(
    thread: EmailThread,
    params: Record<string, any>,
    userId: string,
  ): Promise<void> {
    const defaultFollowUpDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Default: 3 days
    let followUpDate = defaultFollowUpDate;

    if (params.followUpDate) {
      const parsedDate = new Date(params.followUpDate);
      // Check if the parsed date is valid
      if (!isNaN(parsedDate.getTime())) {
        followUpDate = parsedDate;
      } else {
        this.logger.warn(`Invalid followUpDate provided: "${params.followUpDate}", using default`);
      }
    }

    await this.prisma.task.create({
      data: {
        ownerId: userId,
        leadId: thread.leadId,
        accountId: thread.accountId,
        contactId: thread.contactId,
        opportunityId: thread.opportunityId,
        subject: `Follow up: ${thread.subject}`,
        description: params.reason || 'Scheduled follow-up based on email conversation',
        status: TaskStatus.NOT_STARTED,
        priority: TaskPriority.NORMAL,
        dueDate: followUpDate,
        reminderDate: new Date(followUpDate.getTime() - 60 * 60 * 1000), // 1 hour before
      },
    });

    this.logger.log(`Follow-up scheduled for thread ${thread.id}`);
  }

  /**
   * Schedule an actual meeting and send calendar invite
   */
  private async scheduleMeeting(
    thread: EmailThread,
    email: EmailMessage,
    params: Record<string, any>,
    userId: string,
  ): Promise<void> {
    // Parse meeting date/time from params
    let meetingDate: Date;

    if (params.meetingDate) {
      meetingDate = new Date(params.meetingDate);
      // Validate parsed date
      if (isNaN(meetingDate.getTime())) {
        this.logger.warn(`Invalid meetingDate provided: "${params.meetingDate}", using default (3 days from now)`);
        meetingDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      }
    } else {
      // Default: 3 business days from now at 2pm
      meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 3);
      meetingDate.setHours(14, 0, 0, 0);
    }

    const duration = params.duration || 30; // Default 30 minutes
    const meetingTitle = params.title || `Meeting: ${thread.subject}`;
    const recipientEmail = email.fromEmail;
    const recipientName = email.fromName || recipientEmail.split('@')[0];
    const hostEmail = process.env.GMAIL_USER;

    if (!hostEmail) {
      this.logger.error('GMAIL_USER environment variable not set - cannot schedule meeting');
      throw new Error('Email configuration missing');
    }

    let joinUrl: string;

    // Try to create a real Zoom meeting
    try {
      const zoomMeeting = await this.zoomService.createMeeting({
        topic: meetingTitle,
        startTime: meetingDate,
        duration,
        hostEmail,
        agenda: `Scheduled meeting regarding: ${thread.subject}`,
        enableTranscription: true,
        invitees: [recipientEmail],
      });
      joinUrl = zoomMeeting.join_url;
      this.logger.log(`Created Zoom meeting: ${zoomMeeting.id} with URL: ${joinUrl}`);
    } catch (zoomError) {
      this.logger.warn(`Zoom meeting creation failed: ${zoomError.message} - sending invite without Zoom link`);
      // Fallback: Use a placeholder message (no fake URLs)
      joinUrl = 'Zoom link will be shared separately';
    }

    // Send calendar invite via email service
    try {
      const result = await this.emailService.sendMeetingInvite({
        to: [recipientEmail],
        subject: `Meeting Invitation: ${meetingTitle}`,
        meetingTitle,
        meetingDate,
        duration,
        joinUrl,
        platform: 'ZOOM',
        description: params.description || `Scheduled meeting regarding: ${thread.subject}`,
        organizerName: 'IRIS Sales Team',
        organizerEmail: hostEmail,
      });

      if (result.success) {
        this.logger.log(`Calendar invite sent to ${recipientEmail} for ${meetingDate.toISOString()}`);

        // Create a MeetingSession so it appears in Meeting Intelligence
        const meetingSession = await this.prisma.meetingSession.create({
          data: {
            title: meetingTitle,
            platform: MeetingPlatform.ZOOM,
            meetingUrl: joinUrl,
            scheduledStart: meetingDate,
            scheduledEnd: new Date(meetingDate.getTime() + duration * 60 * 1000),
            description: params.description || `Scheduled meeting regarding: ${thread.subject}`,
            ownerId: userId,
            leadId: thread.leadId,
            accountId: thread.accountId,
            opportunityId: thread.opportunityId,
            status: 'SCHEDULED',
            recordingStatus: 'NOT_STARTED',
            metadata: {
              scheduledViaEmail: true,
              emailThreadId: thread.id,
              recipientEmail: recipientEmail,
              recipientName: recipientName,
              contactId: thread.contactId, // Store contact reference in metadata
            },
          },
        });
        this.logger.log(`MeetingSession created: ${meetingSession.id} for Meeting Intelligence`);

        // Create a task to track the meeting
        await this.prisma.task.create({
          data: {
            ownerId: userId,
            leadId: thread.leadId,
            accountId: thread.accountId,
            contactId: thread.contactId,
            opportunityId: thread.opportunityId,
            subject: `Meeting with ${recipientName}: ${meetingTitle}`,
            description: `Scheduled via email thread. Join URL: ${joinUrl}`,
            status: TaskStatus.NOT_STARTED,
            priority: TaskPriority.HIGH,
            dueDate: meetingDate,
            reminderDate: new Date(meetingDate.getTime() - 30 * 60 * 1000), // 30 min before
          },
        });
      } else {
        this.logger.warn(`Failed to send calendar invite: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error sending meeting invite: ${error.message}`);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Log email activity to the activity table
   */
  private async logEmailActivity(
    thread: EmailThread,
    email: EmailMessage,
    userId: string,
    action: 'SENT' | 'RECEIVED',
    analysis?: EmailAnalysis,
  ): Promise<void> {
    await this.prisma.activity.create({
      data: {
        userId,
        leadId: thread.leadId,
        accountId: thread.accountId,
        contactId: thread.contactId,
        opportunityId: thread.opportunityId,
        emailThreadId: thread.id,
        type: ActivityType.EMAIL,
        subject: `Email ${action.toLowerCase()}: ${email.subject}`,
        description: action === 'RECEIVED'
          ? `Received email from ${email.fromEmail}`
          : `Sent email to ${email.toEmails.join(', ')}`,
        outcome: analysis?.intent ? `Intent: ${analysis.intent}` : undefined,
        sentiment: analysis?.sentiment,
        keyPoints: analysis?.keyPoints || [],
        actionItems: analysis?.actionItems || [],
        concerns: [],
        nextSteps: analysis?.suggestedCrmActions.map(a => a.reason) || [],
      },
    });
  }

  // ==================== DRAFT RESPONSE ====================

  /**
   * Create an auto-generated draft response for an inbound email
   */
  private async createDraftResponse(
    thread: EmailThread,
    inboundEmail: EmailMessage,
    analysis: EmailAnalysis,
  ): Promise<EmailDraft> {
    this.logger.log(`Creating draft response for email ${inboundEmail.id}`);

    // Determine tone based on sentiment and intent
    let tone = 'professional';
    if (analysis.sentiment === Sentiment.VERY_POSITIVE || analysis.sentiment === Sentiment.POSITIVE) {
      tone = 'friendly and enthusiastic';
    } else if (analysis.sentiment === Sentiment.NEGATIVE || analysis.sentiment === Sentiment.VERY_NEGATIVE) {
      tone = 'empathetic and solution-focused';
    }
    if (analysis.urgency === EmailUrgency.HIGH) {
      tone += ', urgent';
    }

    // Generate HTML version of the suggested response
    const htmlBody = this.formatResponseAsHtml(analysis.suggestedResponse || '', inboundEmail);

    // Determine subject (Re: original subject if not already)
    const subject = inboundEmail.subject.startsWith('Re:')
      ? inboundEmail.subject
      : `Re: ${inboundEmail.subject}`;

    // Create the draft
    const draft = await this.prisma.emailDraft.create({
      data: {
        threadId: thread.id,
        inReplyToMessageId: inboundEmail.id,
        subject,
        bodyHtml: htmlBody,
        bodyText: analysis.suggestedResponse || '',
        toEmails: [inboundEmail.fromEmail],
        ccEmails: [],
        status: DraftStatus.PENDING_REVIEW,
        generatedAt: new Date(),
        generationPrompt: `Inbound email analysis: Sentiment=${analysis.sentiment}, Intent=${analysis.intent}, Urgency=${analysis.urgency}`,
        confidence: this.calculateResponseConfidence(analysis),
        tone,
        metadata: {
          keyPointsAddressed: analysis.keyPoints,
          actionItemsIncluded: analysis.actionItems,
          originalFromEmail: inboundEmail.fromEmail,
          originalFromName: inboundEmail.fromName,
        },
      },
    });

    this.logger.log(`Draft response created: ${draft.id} for thread ${thread.id}`);
    return draft;
  }

  /**
   * Format the suggested response as branded HTML
   */
  private formatResponseAsHtml(textResponse: string, originalEmail: EmailMessage): string {
    const recipientName = originalEmail.fromName || originalEmail.fromEmail.split('@')[0];
    const greeting = `Hi ${recipientName},`;

    // Convert line breaks to HTML
    const formattedBody = textResponse
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${line}</p>`)
      .join('\n');

    return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a202c; line-height: 1.6;">
  <p style="margin: 0 0 16px 0;">${greeting}</p>
  
  ${formattedBody}
  
  <p style="margin: 24px 0 0 0;">Best regards,<br>
  <strong style="color: #c9a882;">IRIS Sales Team</strong></p>
</div>`;
  }

  /**
   * Calculate confidence score for the generated response
   */
  private calculateResponseConfidence(analysis: EmailAnalysis): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for clear intent
    if (analysis.intent === EmailIntent.POSITIVE_REPLY || analysis.intent === EmailIntent.MEETING_REQUEST) {
      confidence += 0.2;
    } else if (analysis.intent === EmailIntent.QUESTION) {
      confidence += 0.15;
    }

    // Higher confidence for clear sentiment
    if (analysis.sentiment === Sentiment.VERY_POSITIVE || analysis.sentiment === Sentiment.POSITIVE) {
      confidence += 0.15;
    }

    // Lower confidence for negative or unclear situations
    if (analysis.sentiment === Sentiment.NEGATIVE || analysis.sentiment === Sentiment.VERY_NEGATIVE) {
      confidence -= 0.1;
    }

    // Higher confidence if we have clear action items
    if (analysis.actionItems.length > 0) {
      confidence += 0.1;
    }

    return Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 0.1 and 0.95
  }

  /**
   * Get pending draft responses for a user, optionally filtered by thread
   */
  async getPendingDrafts(userId: string, threadId?: string): Promise<EmailDraft[]> {
    const where: any = {
      thread: { userId },
      status: DraftStatus.PENDING_REVIEW,
    };

    if (threadId) {
      where.threadId = threadId;
    }

    return this.prisma.emailDraft.findMany({
      where,
      include: {
        thread: {
          select: { id: true, subject: true, leadId: true, contactId: true },
        },
        inReplyToMessage: {
          select: { id: true, fromEmail: true, fromName: true, subject: true, receivedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific draft by ID
   */
  async getDraft(draftId: string, userId: string): Promise<EmailDraft | null> {
    return this.prisma.emailDraft.findFirst({
      where: {
        id: draftId,
        thread: { userId },
      },
      include: {
        thread: true,
        inReplyToMessage: true,
      },
    });
  }

  /**
   * Update a draft (user edits)
   */
  async updateDraft(
    draftId: string,
    userId: string,
    updates: { bodyHtml?: string; bodyText?: string; subject?: string; toEmails?: string[]; ccEmails?: string[] },
  ): Promise<EmailDraft> {
    const draft = await this.getDraft(draftId, userId);
    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    return this.prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        ...updates,
        editedContent: updates.bodyHtml || updates.bodyText,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });
  }

  /**
   * Send a draft response
   */
  async sendDraft(draftId: string, userId: string): Promise<{ success: boolean; message: EmailMessage; trackingId: string }> {
    const draft = await this.getDraft(draftId, userId);
    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    // Send using the tracked email system
    const result = await this.sendTrackedEmail(
      {
        to: draft.toEmails,
        cc: draft.ccEmails,
        subject: draft.subject,
        body: draft.editedContent || draft.bodyHtml,
      },
      userId,
    );

    // Update draft status
    await this.prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.SENT,
        sentAt: new Date(),
        sentMessageId: result.message.id,
      },
    });

    this.logger.log(`Draft ${draftId} sent successfully as message ${result.message.id}`);

    return {
      success: result.sent,
      message: result.message,
      trackingId: result.trackingId,
    };
  }

  /**
   * Send a draft email by ID (public wrapper that fetches user from draft)
   */
  async sendDraftEmail(draftId: string): Promise<{ success: boolean; message: EmailMessage; trackingId: string }> {
    const draft = await this.prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { thread: true },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    if (draft.status === 'SENT') {
      throw new Error('Draft has already been sent');
    }

    if (draft.status === 'REJECTED' || draft.status === 'EXPIRED') {
      throw new Error('Draft is no longer available');
    }

    // Use the userId from the thread (drafts don't have userId)
    const userId = draft.thread.userId;

    return this.sendDraft(draftId, userId);
  }
  /**
   * Reject a draft
   */
  async rejectDraft(draftId: string, userId: string, reason?: string): Promise<EmailDraft> {
    const draft = await this.getDraft(draftId, userId);
    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    return this.prisma.emailDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });
  }

  /**
   * Find existing thread for the email
   */
  private async findExistingThread(
    toEmail: string,
    subject: string,
    userId: string,
  ): Promise<EmailThread | null> {
    // Look for a recent thread with similar subject to the same recipient
    const normalizedSubject = this.normalizeSubject(subject);

    // If subject is empty, don't try to find an existing thread
    if (!normalizedSubject || !toEmail) {
      return null;
    }

    try {
      return await this.prisma.emailThread.findFirst({
        where: {
          userId,
          subject: { contains: normalizedSubject, mode: 'insensitive' },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Within 30 days
        },
        orderBy: { lastEmailAt: 'desc' },
      });
    } catch (error) {
      this.logger.warn(`Error finding existing thread: ${error.message}`);
      return null;
    }
  }

  /**
   * Find thread by In-Reply-To or References headers
   */
  private async findThreadByReferences(
    inReplyTo?: string,
    references?: string[],
  ): Promise<EmailThread | null> {
    if (inReplyTo) {
      const email = await this.prisma.emailMessage.findUnique({
        where: { messageId: inReplyTo },
        include: { thread: true },
      });
      if (email) return email.thread;
    }

    if (references && references.length > 0) {
      for (const ref of references) {
        const email = await this.prisma.emailMessage.findUnique({
          where: { messageId: ref },
          include: { thread: true },
        });
        if (email) return email.thread;
      }
    }

    return null;
  }

  /**
   * Find thread by sender email and subject
   */
  private async findThreadByEmailAndSubject(
    fromEmail: string,
    subject: string,
  ): Promise<EmailThread | null> {
    // Guard against undefined email
    if (!fromEmail) {
      this.logger.debug('findThreadByEmailAndSubject: fromEmail is null/undefined');
      return null;
    }

    const normalizedSubject = this.normalizeSubject(subject);

    return this.prisma.emailThread.findFirst({
      where: {
        subject: { contains: normalizedSubject, mode: 'insensitive' },
        emails: {
          some: {
            toEmails: { has: fromEmail },
            direction: EmailDirection.OUTBOUND,
          },
        },
      },
      orderBy: { lastEmailAt: 'desc' },
    });
  }


  /**
   * Normalize subject line (remove Re:, Fwd:, etc.)
   */
  private normalizeSubject(subject: string | null | undefined): string {
    if (!subject) return '';
    return subject
      .replace(/^(Re|RE|Fwd|FWD|Fw|FW):\s*/gi, '')
      .replace(/^\[.*?\]\s*/g, '')
      .trim();
  }

  /**
   * Calculate engagement level based on thread metrics
   */
  private calculateEngagementLevel(thread: EmailThread): EngagementLevel {
    const responseRate = thread.totalResponses / thread.totalEmails;
    const lastResponse = thread.lastResponseAt;
    const daysSinceLastResponse = lastResponse
      ? (Date.now() - lastResponse.getTime()) / (24 * 60 * 60 * 1000)
      : Infinity;

    if (responseRate > 0.7 && daysSinceLastResponse < 2) {
      return EngagementLevel.VERY_HIGH;
    } else if (responseRate > 0.4 && daysSinceLastResponse < 7) {
      return EngagementLevel.HIGH;
    } else if (responseRate > 0.1 && daysSinceLastResponse < 14) {
      return EngagementLevel.MEDIUM;
    } else if (thread.totalResponses === 0) {
      return EngagementLevel.VERY_LOW;
    } else {
      return EngagementLevel.LOW;
    }
  }

  /**
   * Map email urgency to task priority
   */
  private mapUrgencyToPriority(urgency?: EmailUrgency): TaskPriority {
    switch (urgency) {
      case EmailUrgency.HIGH:
        return TaskPriority.URGENT;
      case EmailUrgency.MEDIUM:
        return TaskPriority.HIGH;
      default:
        return TaskPriority.NORMAL;
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==================== EMAIL STATUS UPDATES ====================

  /**
   * Update email status based on webhook event (delivered, opened, clicked, bounced, failed)
   */
  async updateEmailStatus(
    messageId: string,
    event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
    timestamp?: Date,
  ): Promise<{ success: boolean; message: string }> {
    const eventTime = timestamp || new Date();

    // Find the email by messageId
    const email = await this.prisma.emailMessage.findFirst({
      where: {
        OR: [
          { messageId: messageId },
          { messageId: { contains: messageId } },
          { metadata: { path: ['trackingId'], equals: messageId } },
        ],
      },
      include: {
        thread: true,
      },
    });

    if (!email) {
      this.logger.warn(`Email not found for messageId: ${messageId}`);
      return { success: false, message: 'Email not found' };
    }

    // Map event to status
    const statusMap: Record<string, EmailMessageStatus> = {
      delivered: EmailMessageStatus.DELIVERED,
      opened: EmailMessageStatus.OPENED,
      clicked: EmailMessageStatus.CLICKED,
      bounced: EmailMessageStatus.BOUNCED,
      failed: EmailMessageStatus.FAILED,
    };

    const newStatus = statusMap[event];
    if (!newStatus) {
      this.logger.warn(`Unknown email event: ${event}`);
      return { success: false, message: `Unknown event: ${event}` };
    }

    // Check if we should skip this update (avoid downgrading status)
    // Status progression: QUEUED -> SENT -> DELIVERED -> OPENED -> CLICKED
    const statusOrder = ['QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED'];
    const currentIndex = statusOrder.indexOf(email.status);
    const newIndex = statusOrder.indexOf(newStatus);

    // Skip update if new status is "lower" than current (except for BOUNCED/FAILED which always apply)
    if (newIndex >= 0 && currentIndex >= 0 && newIndex < currentIndex && event !== 'bounced' && event !== 'failed') {
      this.logger.debug(`Skipping status update: ${email.status} -> ${newStatus} (would be downgrade)`);
      return { success: true, message: 'Status update skipped (would be downgrade)' };
    }

    // Build update data
    const updateData: any = {
      status: newStatus,
    };

    // Set timestamp fields based on event
    if (event === 'delivered' && !email.deliveredAt) {
      updateData.deliveredAt = eventTime;
    } else if (event === 'opened' && !email.openedAt) {
      updateData.openedAt = eventTime;
    } else if (event === 'clicked' && !email.clickedAt) {
      updateData.clickedAt = eventTime;
    }

    // Append event to metadata.trackingEvents array
    const existingMetadata = (email.metadata as any) || {};
    const trackingEvents = existingMetadata.trackingEvents || [];
    trackingEvents.push({
      type: event.toUpperCase(),
      timestamp: eventTime.toISOString(),
      messageId,
    });

    updateData.metadata = {
      ...existingMetadata,
      trackingEvents,
      lastEventAt: eventTime.toISOString(),
    };

    // Update the email message
    await this.prisma.emailMessage.update({
      where: { id: email.id },
      data: updateData,
    });

    // Log activity for CRM tracking
    await this.prisma.activity.create({
      data: {
        userId: email.thread.userId,
        leadId: email.thread.leadId,
        accountId: email.thread.accountId,
        contactId: email.thread.contactId,
        opportunityId: email.thread.opportunityId,
        emailThreadId: email.thread.id,
        type: ActivityType.EMAIL,
        subject: `Email ${event}: ${email.subject}`,
        description: `Email to ${email.toEmails.join(', ')} was ${event}`,
        keyPoints: [],
        concerns: [],
        actionItems: [],
        nextSteps: [],
      },
    });

    this.logger.log(`Email ${email.id} status updated: ${email.status} -> ${newStatus} (${event})`);

    return { success: true, message: `Email status updated to ${newStatus}` };
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get all email threads for a user
   */
  async getThreads(userId: string, filters?: {
    leadId?: string;
    accountId?: string;
    contactId?: string;
    opportunityId?: string;
    status?: EmailThreadStatus;
  }): Promise<EmailThread[]> {
    return this.prisma.emailThread.findMany({
      where: {
        userId,
        ...filters,
      },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        lead: { select: { id: true, firstName: true, lastName: true, company: true } },
        contact: { select: { id: true, firstName: true, lastName: true, title: true } },
        account: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true } },
      },
      orderBy: { lastEmailAt: 'desc' },
    });
  }

  /**
   * Get a specific thread with all emails
   */
  async getThread(threadId: string, userId: string): Promise<EmailThread & { emails: EmailMessage[] }> {
    const thread = await this.prisma.emailThread.findFirst({
      where: { id: threadId, userId },
      include: {
        emails: { orderBy: { createdAt: 'asc' } },
        lead: true,
        contact: true,
        account: true,
        opportunity: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!thread) {
      throw new NotFoundException('Email thread not found');
    }

    return thread as EmailThread & { emails: EmailMessage[] };
  }

  /**
   * Get threads awaiting response
   */
  async getThreadsAwaitingResponse(userId: string): Promise<EmailThread[]> {
    return this.prisma.emailThread.findMany({
      where: {
        userId,
        status: EmailThreadStatus.AWAITING_RESPONSE,
      },
      include: {
        emails: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastEmailAt: 'asc' },
    });
  }
}
