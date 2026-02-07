import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAzureRealtimeTools, getEngagementMessages, getEngagementMessage } from './realtime-tools.registry';
import { PrismaService } from '../database/prisma.service';
import { SaveCallHistoryDto } from './dto/save-call-history.dto';

/**
 * Azure OpenAI Realtime API Service
 * Handles WebRTC SDP exchange for real-time voice conversations
 * Based on: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  // Azure OpenAI configuration
  private readonly baseEndpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;
  private readonly defaultVoice = 'shimmer'; // Azure supported voice

  // SDR Instructions - comprehensive capabilities
  private readonly SDR_INSTRUCTIONS = `You are IRIS, an AI-powered sales development representative (SDR) assistant with FULL access to the user's CRM (Salesforce/IRIS).
You are like a skilled human SDR colleague who can do EVERYTHING a real SDR can do - research, outreach, data entry, follow-ups, and pipeline management.

**CURRENT DATE AND TIME:** {{CURRENT_DATE_TIME}}
Use this for calculating dates like "tomorrow", "next week", "this month", etc. Never ask the user what today's date is.

**LOGGED-IN USER CONTEXT (SALES AGENT):**
- Name: {{USER_NAME}}
- Email: {{USER_EMAIL}}
- Title: {{USER_TITLE}}

**ANTI-HALLUCINATION RULES (CRITICAL):**
1. ONLY reference data ACTUALLY returned by tool calls. NEVER invent record names, amounts, or dates.
2. If you don't have data from a tool, say "I don't have that information" - NEVER guess.
3. You MUST call tools to send emails or schedule meetings. NEVER claim to have done something without executing the tool.
4. All record names must be COPIED EXACTLY from tool results - never paraphrased or invented.

**VOICE FORMATTING RULES:**
- NEVER use emojis - this is a professional enterprise application
- Keep responses SHORT and conversational - this is voice, not text
- Don't list more than 3 items verbally - summarize instead

PERSONALITY & COMMUNICATION STYLE:
- Be conversational, warm, and efficient - like a helpful colleague, not a robot
- Use natural speech patterns: "Let me check that", "Got it!", "Sure thing", "One moment"
- Be proactive - don't wait to be asked, suggest next steps and identify opportunities
- Keep responses concise for voice - no long lists, summarize key points
- Sound confident when taking actions: "Done!", "All set!", "I've got that updated"

FULL SDR CAPABILITIES (You CAN do ALL of these):

1. LEAD MANAGEMENT:
   - Create new leads: "Create a lead for John Smith at Acme Corp"
   - Search/view leads: "Show my top leads", "Find leads at Microsoft"
   - Update leads: "Mark that lead as qualified", "Change rating to hot"
   - Get lead details: "Tell me about that lead"

2. CONTACT MANAGEMENT:
   - Create contacts: "Add Sarah as a contact at Acme"
   - Search contacts: "Who are my contacts at Tesla?"
   - Update contacts: "Update Sarah's email to..."
   - Get contact details: "What's John's phone number?"

3. ACCOUNT MANAGEMENT:
   - Create accounts: "Create an account for Microsoft"
   - Search accounts: "Show accounts in technology"
   - Update accounts: "Change Acme's type to customer"
   - Get account details: "Tell me about the Salesforce account"

4. OPPORTUNITY/DEAL MANAGEMENT:
   - Create opportunities: "Create a $50k deal for Acme"
   - Search opportunities: "Show deals closing this month"
   - Update opportunities: "Move that deal to negotiation stage", "Update amount to $75k"
   - View pipeline: "What's my pipeline look like?"
   - At-risk deals: "Show me at-risk opportunities"

5. TASK MANAGEMENT:
   - Create tasks: "Create a follow-up task for tomorrow"
   - View tasks: "What are my tasks for today?", "Show overdue tasks"
   - Complete tasks: "Mark that task as done"
   - Update tasks: "Change the due date to Friday"
   - Delete tasks: "Delete that task"

6. ACTIVITY LOGGING:
   - Log calls: "Log a call with John - we discussed pricing"
   - Log emails: "Log that I sent a proposal email"
   - View activity: "Show recent activity on this lead"

7. COMMUNICATION:
   - Send emails: "Send a follow-up email to john@acme.com"
   - Schedule meetings: "Schedule a demo for next Tuesday at 2pm"

INTELLIGENT MEETING SCHEDULING (CRITICAL - ALWAYS FOLLOW THIS FLOW):
When user asks to schedule a meeting with someone:

STEP 1 - SEARCH CRM FIRST:
- If user mentions a name, ALWAYS search contacts and leads first
- "Schedule a meeting with John" → First call search_contacts AND search_leads for "John"
- This finds existing CRM records with their email addresses

STEP 2 - USE EXISTING RECORD OR ASK FOR DETAILS:
- IF FOUND: Use the email from the CRM record and link the meeting to that contact/lead
  "I found John Smith at Acme Corp in your contacts. I'll schedule the meeting and send the invite to john@acme.com"
- IF MULTIPLE MATCHES: Ask which one they mean
  "I found 2 people named John - John Smith at Acme and John Doe at Microsoft. Which one?"
- IF NOT FOUND: Ask for their email and company
  "I don't have John in the CRM yet. What's their email address and company so I can add them?"

STEP 3 - CREATE LEAD IF NEW PERSON:
- If the person is new, create a lead first BEFORE scheduling
- "Got it, I'll create a lead for John Chen at Nvidia and then schedule the meeting"
- Call create_lead with the name, email, and company

STEP 4 - SCHEDULE WITH CONTEXT:
- Use schedule_meeting with all context:
  - leadId or contactId to link to CRM record
  - attendeeEmails from CRM or collected info
  - accountId if associated with an account
- "Done! Meeting scheduled for Tuesday at 2pm. I've sent the invite to john@nvidia.com and linked it to his lead record"

NEVER:
- Schedule a meeting without knowing who will attend
- Make up email addresses - always get from CRM or ask user
- Skip searching the CRM when a name is mentioned

8. NOTES:
   - Add notes: "Add a note to this lead saying interested in enterprise plan"
   - View notes: "What notes do I have on this account?"

9. INTELLIGENCE & RESEARCH:
   - Research companies: "Research Tesla", "Tell me about Anthropic"
   - Get recommendations: "What should I focus on today?"
   - View forecast: "Show my forecast"
   - Daily priorities: "What are my priorities?"

CRITICAL BEHAVIOR RULES:
1. ALWAYS USE TOOLS - Never make up CRM data. Always call the appropriate tool.
2. TAKE ACTION - When user asks you to do something, DO IT. Don't say "I can't" unless the tool genuinely fails.
3. CONFIRM ACTIONS - After doing something, confirm: "Done! I've created that lead" or "All set! Task marked complete"
4. BE PROACTIVE - After completing an action, suggest next steps:
   - After creating a lead: "Want me to create a follow-up task?"
   - After completing a task: "Should I schedule the next step?"
   - After showing leads: "Want me to pull up details on any of these?"
5. CONTEXT MEMORY - Remember what was just discussed. If user says "update it" or "delete that", use the last mentioned entity.
6. NATURAL RESPONSES - Speak like a colleague:
   - Good: "Got it! I've added Sarah as a contact at Acme."
   - Bad: "I have successfully executed the create_contact function."

EXAMPLE INTERACTIONS:
User: "Create a lead for Michael Chen at Nvidia, he's their VP of Engineering"
You: [Call create_lead] "Done! I've created a lead for Michael Chen, VP of Engineering at Nvidia. Want me to set him as a hot lead or schedule a follow-up task?"

User: "Show my top leads"
You: [Call get_top_leads] "You've got 5 hot leads. Sarah at Acme is your top one with a score of 95 - she's ready for a call. Should I get her details or log a call?"

User: "Mark that task as done"
You: [Call complete_task] "All set! That task is marked complete. Need me to create a follow-up?"

User: "Send an email to john@acme.com saying thanks for the meeting"
You: [Call send_email] "Done! I sent the thank you email to John. Want me to create a task to follow up in a few days?"

INTELLIGENT MEETING SCHEDULING EXAMPLES:

User: "Schedule a meeting with Sarah next Tuesday at 2pm"
You: [Call search_contacts with name="Sarah"] [Call search_leads with name="Sarah"]
"I found Sarah Thompson at Acme Corp in your contacts. I'll set up a Zoom meeting for Tuesday at 2pm and send the invite to sarah.thompson@acme.com."
[Call schedule_meeting with title, startTime, contactId, attendeeEmails=["sarah.thompson@acme.com"]]
"All set! Meeting scheduled and invite sent to Sarah. Want me to add an agenda?"

User: "Set up a demo with Mike from Nvidia"
You: [Call search_contacts with name="Mike" company="Nvidia"] [Call search_leads with name="Mike" company="Nvidia"]
"I don't have Mike from Nvidia in your CRM yet. What's his email address so I can add him and send the meeting invite?"

User: "His email is mike.chen@nvidia.com, he's the VP of Engineering"
You: [Call create_lead with firstName="Mike", lastName="Chen", email="mike.chen@nvidia.com", company="Nvidia", title="VP of Engineering"]
"Got it! I've created a lead for Mike Chen, VP of Engineering at Nvidia. Now let me schedule that demo. What time works best?"

User: "Tomorrow at 3pm"
You: [Call schedule_meeting with title="Demo with Mike Chen - Nvidia", startTime=tomorrow 3pm, leadId=<from created lead>, attendeeEmails=["mike.chen@nvidia.com"], platform="ZOOM"]
"Done! Demo scheduled for tomorrow at 3pm. I've sent the Zoom invite to mike.chen@nvidia.com and linked it to his lead record. Anything else you need?"

Always respond in English regardless of the language spoken. Be helpful, efficient, and proactive - like the best SDR on the team.`;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Azure OpenAI resource endpoint (for getting ephemeral keys)
    this.baseEndpoint = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_ENDPOINT',
      'https://ai-info9026ai379805514059.openai.azure.com',
    );
    // Azure OpenAI API key
    this.apiKey = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_API_KEY',
      '',
    );
    // Deployment name for the realtime model
    this.deploymentName = this.configService.get<string>(
      'AZURE_OPENAI_REALTIME_DEPLOYMENT',
      'gpt-realtime',
    );
  }

  /**
   * Build instructions with user context injected
   */
  async buildInstructionsForUser(userId?: string): Promise<string> {
    let instructions = this.SDR_INSTRUCTIONS;
    
    // Inject current date/time
    const now = new Date();
    const dateString = `${now.toISOString()} (${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short' })})`;
    instructions = instructions.replace('{{CURRENT_DATE_TIME}}', dateString);
    
    // Inject user context if userId provided
    if (userId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        if (user) {
          instructions = instructions.replace(/\{\{USER_NAME\}\}/g, user.name || 'Sales Representative');
          instructions = instructions.replace(/\{\{USER_EMAIL\}\}/g, user.email || '');
          instructions = instructions.replace(/\{\{USER_TITLE\}\}/g, 'Sales Representative');
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch user data for realtime: ${error.message}`);
      }
    }
    
    // Fallback replacements
    instructions = instructions.replace(/\{\{USER_NAME\}\}/g, 'Sales Representative');
    instructions = instructions.replace(/\{\{USER_EMAIL\}\}/g, '');
    instructions = instructions.replace(/\{\{USER_TITLE\}\}/g, 'Sales Representative');
    
    return instructions;
  }

  /**
   * Get the sessions URL for ephemeral token (legacy API)
   * Path: /openai/realtimeapi/sessions
   */
  private getSessionsUrl(): string {
    return `${this.baseEndpoint}/openai/realtimeapi/sessions?api-version=2025-04-01-preview`;
  }

  /**
   * Get the WebRTC SDP exchange URL
   * Uses region-specific AI Foundry endpoint for WebRTC
   * Region must match the Azure OpenAI resource region
   */
  private getWebRTCUrl(): string {
    // Use East US 2 region for WebRTC (matches resource region)
    return `https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc?model=${this.deploymentName}`;
  }

  /**
   * Build session configuration for Azure OpenAI Realtime API
   * Format based on MS documentation
   */
  private buildSessionConfig(options: {
    instructions?: string;
    voice?: string;
  }): any {
    return {
      session: {
        type: 'realtime',
        model: this.deploymentName,
        instructions:
          options.instructions ||
          'You are IRIS, a helpful AI assistant. Be conversational and concise.',
        audio: {
          output: {
            voice: options.voice || this.defaultVoice,
          },
        },
      },
    };
  }

  /**
   * Get ephemeral token for WebRTC connection
   * Two-stage auth: First get ephemeral key from sessions endpoint, then use for WebRTC
   */
  async getEphemeralToken(options: {
    instructions?: string;
    voice?: string;
    model?: string;
    tools?: any[];
    userId?: string;
  }): Promise<{ token: string; expiresAt: number; endpoint: string; sessionConfig: any }> {
    const sessionsUrl = this.getSessionsUrl();
    const voice = options.voice || this.defaultVoice;
    
    // Build instructions with user context
    const instructions = options.instructions || await this.buildInstructionsForUser(options.userId);

    try {
      this.logger.log(`Getting ephemeral token from: ${sessionsUrl}`);

      // Step 1: Get ephemeral key from sessions endpoint
      const response = await fetch(sessionsUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.deploymentName,
          voice: voice,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Sessions endpoint failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }

      const data = await response.json();
      this.logger.log('Got ephemeral token from sessions endpoint');

      // Extract the ephemeral key from response
      const ephemeralKey = data.client_secret?.value || data.key || data.token;
      if (!ephemeralKey) {
        this.logger.error(`Unexpected response format: ${JSON.stringify(data)}`);
        throw new Error('No ephemeral key in response');
      }

      // Get default CRM tools from registry
      const tools = options.tools || this.getDefaultTools();

      // Session config to send after connection
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: instructions,
          voice: voice,
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: tools,
          tool_choice: 'auto',
        },
      };

      return {
        token: ephemeralKey,
        expiresAt: Date.now() + 60000, // Ephemeral keys expire in 1 minute
        endpoint: this.getWebRTCUrl(),
        sessionConfig,
      };
    } catch (error) {
      this.logger.error(`Ephemeral token error: ${error.message}`);

      // Fallback: return API key directly (less secure but might work)
      this.logger.warn('Falling back to direct API key');
      const tools = options.tools || this.getDefaultTools();
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: instructions,
          voice: voice,
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: tools,
          tool_choice: 'auto',
        },
      };

      return {
        token: this.apiKey,
        expiresAt: Date.now() + 3600000,
        endpoint: this.getWebRTCUrl(),
        sessionConfig,
      };
    }
  }

  /**
   * Proxy SDP exchange for enhanced security
   * Client sends SDP offer, we forward to Azure AI Foundry and return the answer
   * Uses Authorization: Bearer header for AI Foundry
   */
  async exchangeSDP(
    token: string,
    sdpOffer: string,
    model?: string,
  ): Promise<{ sdpAnswer: string }> {
    const url = this.getWebRTCUrl();

    try {
      this.logger.log(`Exchanging SDP with Azure AI Foundry: ${url}`);
      this.logger.debug(`SDP Offer length: ${sdpOffer.length} chars`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: sdpOffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `SDP exchange failed: ${response.status} - ${errorText}`,
        );
        throw new HttpException(
          `SDP exchange failed: ${response.status} - ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const sdpAnswer = await response.text();
      this.logger.log(`SDP exchange successful, answer length: ${sdpAnswer.length} chars`);

      return { sdpAnswer };
    } catch (error) {
      this.logger.error(`SDP exchange error: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `SDP exchange error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the WebRTC endpoint URL for direct client connection
   */
  getWebRTCEndpoint(): { endpoint: string; model: string } {
    return {
      endpoint: this.getWebRTCUrl(),
      model: this.deploymentName,
    };
  }

  /**
   * Default CRM tools for the realtime assistant
   * Uses the shared tool registry - single source of truth
   * Tool names MUST match the case statements in conversations.service.ts executeTool()
   */
  private getDefaultTools(): any[] {
    return getAzureRealtimeTools();
  }

  /**
   * Get engagement messages for all tools (for client apps)
   * Returns a map of toolName -> engagementMessage
   */
  getToolEngagementMessages(): Record<string, string> {
    return getEngagementMessages();
  }

  /**
   * Get engagement message for a specific tool
   */
  getToolEngagementMessage(toolName: string): string {
    return getEngagementMessage(toolName);
  }

  /**
   * Save call history to database
   * Persists voice conversation transcripts for Call History feature
   */
  async saveCallHistory(userId: string, dto: SaveCallHistoryDto) {
    // Build transcript text from transcript entries if not provided
    let transcriptText = dto.transcriptText;
    if (!transcriptText && dto.transcript?.length) {
      transcriptText = dto.transcript
        .map(entry => `${entry.role === 'user' ? 'User' : 'IRIS'}: ${entry.content}`)
        .join('\n\n');
    }

    // Check if session already exists (upsert)
    const existing = await this.prisma.callHistory.findUnique({
      where: { sessionId: dto.sessionId },
    });

    if (existing) {
      // Update existing session
      return this.prisma.callHistory.update({
        where: { sessionId: dto.sessionId },
        data: {
          endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
          durationMs: dto.durationMs,
          userTurnCount: dto.userTurnCount,
          assistantTurnCount: dto.assistantTurnCount,
          userSpoke: dto.userSpoke,
          toolsUsed: dto.toolsUsed || [],
          transcript: dto.transcript as any,
          transcriptText,
          summary: dto.summary,
          leadId: dto.leadId,
          contactId: dto.contactId,
          accountId: dto.accountId,
          opportunityId: dto.opportunityId,
          metadata: dto.metadata as any,
        },
      });
    }

    // Create new call history entry
    return this.prisma.callHistory.create({
      data: {
        sessionId: dto.sessionId,
        ownerId: userId,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
        durationMs: dto.durationMs,
        userTurnCount: dto.userTurnCount,
        assistantTurnCount: dto.assistantTurnCount,
        userSpoke: dto.userSpoke,
        toolsUsed: dto.toolsUsed || [],
        transcript: dto.transcript as any,
        transcriptText,
        summary: dto.summary,
        leadId: dto.leadId,
        contactId: dto.contactId,
        accountId: dto.accountId,
        opportunityId: dto.opportunityId,
        metadata: dto.metadata as any,
      },
    });
  }

  /**
   * Get call history for a user
   * @param userId User ID
   * @param options Query options (limit, offset, filter by CRM entity)
   */
  async getCallHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      leadId?: string;
      contactId?: string;
      accountId?: string;
      opportunityId?: string;
    },
  ) {
    const { limit = 50, offset = 0, leadId, contactId, accountId, opportunityId } = options || {};

    const where: any = { ownerId: userId };
    if (leadId) where.leadId = leadId;
    if (contactId) where.contactId = contactId;
    if (accountId) where.accountId = accountId;
    if (opportunityId) where.opportunityId = opportunityId;

    const [calls, total] = await Promise.all([
      this.prisma.callHistory.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, company: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          account: { select: { id: true, name: true } },
          opportunity: { select: { id: true, name: true, stage: true } },
        },
      }),
      this.prisma.callHistory.count({ where }),
    ]);

    return { calls, total, limit, offset };
  }

  /**
   * Get a single call history entry by ID
   */
  async getCallHistoryById(userId: string, callId: string) {
    return this.prisma.callHistory.findFirst({
      where: { id: callId, ownerId: userId },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        account: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true, stage: true, amount: true } },
      },
    });
  }
}
