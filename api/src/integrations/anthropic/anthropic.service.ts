import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class AnthropicIntegrationService extends BaseIntegrationService {
  protected readonly provider = 'anthropic';
  protected readonly displayName = 'Claude AI';
  protected readonly logger = new Logger(AnthropicIntegrationService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  async testConnection(organizationId?: string): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials(organizationId);
    if (!credentials?.apiKey) {
      return { success: false, message: 'No API key configured' };
    }

    try {
      // Test with a minimal API call
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        },
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        message: 'Connected to Claude AI',
        details: { model: response.data.model },
      };
    } catch (error: any) {
      // Log detailed error info
      if (error.response) {
        this.logger.error(`[Anthropic] Test Connection Error - Status: ${error.response.status}`);
        this.logger.error(`[Anthropic] Test Connection Error - Data: ${JSON.stringify(error.response.data)}`);
        const errorMessage = error.response.data?.error?.message || error.message;
        return { success: false, message: `Connection failed: ${errorMessage}` };
      }
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async saveApiKey(apiKey: string, organizationId?: string, configuredById?: string): Promise<void> {
    const credentials: IntegrationCredentials = { apiKey };
    await this.saveCredentials(credentials, organizationId, configuredById);
  }

  async generateCompletion(params: {
    prompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    this.logger.log(`[Anthropic] Credentials retrieved: ${credentials ? 'yes' : 'no'}`);

    if (!credentials?.apiKey) {
      this.logger.error('[Anthropic] No API key found in credentials');
      throw new Error('Claude AI not connected - no API key configured');
    }

    // Mask API key for logging (show first 10 and last 4 chars)
    const maskedKey = credentials.apiKey.length > 14
      ? `${credentials.apiKey.substring(0, 10)}...${credentials.apiKey.slice(-4)}`
      : '***';
    this.logger.log(`[Anthropic] Using API key: ${maskedKey} (length: ${credentials.apiKey.length})`);

    const messages: any[] = [{ role: 'user', content: params.prompt }];

    // Build request body - only include system if provided and non-empty
    const requestBody: any = {
      model: params.model || 'claude-sonnet-4-5-20250929',
      max_tokens: params.maxTokens || 1024,
      messages,
      temperature: params.temperature ?? 0.7,
    };

    // Only add system prompt if it's a non-empty string
    if (params.systemPrompt && params.systemPrompt.trim()) {
      requestBody.system = params.systemPrompt;
    }

    this.logger.log(`[Anthropic] Request model: ${requestBody.model}, max_tokens: ${requestBody.max_tokens}`);

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        requestBody,
        {
          headers: {
            'x-api-key': credentials.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`[Anthropic] Success - model used: ${response.data.model}`);
      return {
        content: response.data.content[0].text,
        usage: response.data.usage,
        model: response.data.model,
      };
    } catch (error: any) {
      // Log detailed error info from Anthropic API
      if (error.response) {
        this.logger.error(`[Anthropic] API Error - Status: ${error.response.status}`);
        this.logger.error(`[Anthropic] API Error - Data: ${JSON.stringify(error.response.data)}`);
        this.logger.error(`[Anthropic] API Error - Headers sent: x-api-key present: ${!!credentials.apiKey}`);
      } else {
        this.logger.error(`[Anthropic] Network Error: ${error.message}`);
      }
      throw error;
    }
  }

  async generateEmailDraft(params: {
    context: string;
    recipientInfo: string;
    purpose: string;
  }): Promise<any> {
    const systemPrompt = `You are a professional sales email writer. Write compelling, personalized emails that are concise and action-oriented. Always include a clear call-to-action.`;

    const prompt = `Write a professional sales email based on the following:

Context: ${params.context}
Recipient: ${params.recipientInfo}
Purpose: ${params.purpose}

Write a concise, professional email with:
- A compelling subject line
- Personalized opening
- Clear value proposition
- Specific call-to-action
- Professional closing`;

    return this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });
  }

  async analyzeDeal(deal: {
    name: string;
    value: number;
    stage: string;
    daysInStage: number;
    notes?: string;
    activities?: string[];
  }): Promise<any> {
    const systemPrompt = `You are a sales analytics expert. Analyze deals and provide actionable insights to help sales reps close more deals.`;

    const prompt = `Analyze this sales deal and provide insights:

Deal Name: ${deal.name}
Value: $${deal.value.toLocaleString()}
Current Stage: ${deal.stage}
Days in Stage: ${deal.daysInStage}
Notes: ${deal.notes || 'None'}
Recent Activities: ${deal.activities?.join(', ') || 'None'}

Provide:
1. Deal health assessment (0-100)
2. Key risks identified
3. Recommended next actions
4. Likelihood to close this quarter`;

    return this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.5,
    });
  }

  async summarizeConversation(transcript: string): Promise<any> {
    const systemPrompt = `You are a sales call analyst. Summarize sales conversations and extract key information.`;

    const prompt = `Summarize this sales conversation and extract key points:

${transcript}

Provide:
1. Executive summary (2-3 sentences)
2. Key discussion points
3. Customer pain points mentioned
4. Objections raised
5. Next steps agreed
6. Overall sentiment (positive/neutral/negative)`;

    return this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.3,
    });
  }

  async generateProposal(params: {
    companyName: string;
    contactName: string;
    products: { name: string; description: string; price: number }[];
    painPoints: string[];
    competitorInfo?: string;
  }): Promise<any> {
    const systemPrompt = `You are a professional proposal writer for sales. Create compelling, customized proposals that address customer needs and differentiate from competitors.`;

    const productList = params.products
      .map(p => `- ${p.name}: ${p.description} ($${p.price.toLocaleString()})`)
      .join('\n');

    const prompt = `Create a professional sales proposal for:

Company: ${params.companyName}
Contact: ${params.contactName}

Products/Services:
${productList}

Customer Pain Points:
${params.painPoints.map(p => `- ${p}`).join('\n')}

${params.competitorInfo ? `Competitor Info: ${params.competitorInfo}` : ''}

Create a proposal with:
1. Executive summary
2. Understanding of their challenges
3. Proposed solution
4. Key benefits
5. Investment overview
6. Next steps`;

    return this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.7,
    });
  }

  /**
   * Get API key from credentials or config
   */
  private async getApiKey(): Promise<string | null> {
    const credentials = await this.getCredentials();
    this.logger.log(`[Anthropic] Credentials from DB: ${credentials ? 'found' : 'not found'}`);
    if (credentials?.apiKey) {
      this.logger.log(`[Anthropic] Using API key from DB (length: ${credentials.apiKey.length})`);
    }
    return credentials?.apiKey || this.configService.get('ANTHROPIC_API_KEY') || null;
  }

  /**
   * Score a lead based on AI analysis
   * Returns a score from 0-100 with reasoning
   */
  async scoreLead(lead: {
    name: string;
    company?: string;
    title?: string;
    source?: string;
    email?: string;
    phone?: string;
    activities?: string[];
    notes?: string;
    website?: string;
    industry?: string;
    companySize?: string;
  }): Promise<{
    score: number;
    confidence: number;
    reasoning: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }> {
    const systemPrompt = `You are an expert sales lead scoring analyst. You analyze leads and provide accurate, data-driven scores with detailed reasoning. Always respond with valid JSON only.`;

    const prompt = `Analyze this lead and provide a comprehensive score.

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || 'Unknown'}
- Title: ${lead.title || 'Unknown'}
- Source: ${lead.source || 'Unknown'}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Website: ${lead.website || 'Not provided'}
- Industry: ${lead.industry || 'Unknown'}
- Company Size: ${lead.companySize || 'Unknown'}
- Recent Activities: ${lead.activities?.join(', ') || 'None'}
- Notes: ${lead.notes || 'None'}

Provide a JSON response with:
{
  "score": <number 0-100>,
  "confidence": <number 0-100 representing how confident you are in this score>,
  "reasoning": "<detailed explanation of the score>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "weaknesses": ["<weakness 1>", "<weakness 2>", ...],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}

Scoring Criteria:
- 80-100: Hot lead - high decision-maker, engaged, clear budget/timeline
- 60-79: Warm lead - good fit, some engagement, needs nurturing
- 40-59: Cool lead - potential fit, limited engagement
- 20-39: Cold lead - poor fit or minimal information
- 0-19: Unqualified - no fit or invalid data

Return ONLY valid JSON, no additional text or markdown.`;

    const result = await this.generateCompletion({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1000,
    });

    try {
      const parsed = JSON.parse(result.content);
      return {
        score: Math.min(100, Math.max(0, parsed.score)),
        confidence: Math.min(100, Math.max(0, parsed.confidence || 70)),
        reasoning: parsed.reasoning || 'Analysis complete',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
      };
    } catch {
      const scoreMatch = result.content.match(/score[:\s]*(\d+)/i);
      return {
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 50,
        confidence: 50,
        reasoning: result.content,
        strengths: [],
        weaknesses: [],
        recommendations: ['Review lead manually for accurate scoring'],
      };
    }
  }

  /**
   * Summarize a meeting transcript or notes
   */
  async summarizeMeeting(transcript: string): Promise<{
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    participants?: string[];
    nextSteps: string[];
    objections: string[];
    opportunities: string[];
  }> {
    const systemPrompt = `You are an expert sales meeting analyst. You analyze meeting transcripts and notes to extract actionable insights. Always respond with valid JSON only.`;

    const prompt = `Analyze this meeting transcript/notes and provide a comprehensive summary.

Meeting Transcript/Notes:
${transcript}

Provide a JSON response with:
{
  "summary": "<2-3 sentence executive summary>",
  "keyPoints": ["<key point 1>", "<key point 2>", ...],
  "actionItems": ["<action item 1>", "<action item 2>", ...],
  "sentiment": "<positive|neutral|negative>",
  "participants": ["<participant 1>", "<participant 2>", ...],
  "nextSteps": ["<next step 1>", "<next step 2>", ...],
  "objections": ["<objection raised 1>", "<objection raised 2>", ...],
  "opportunities": ["<opportunity identified 1>", "<opportunity identified 2>", ...]
}

Return ONLY valid JSON, no additional text or markdown.`;

    const result = await this.generateCompletion({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    try {
      const parsed = JSON.parse(result.content);
      return {
        summary: parsed.summary || 'Meeting summary unavailable',
        keyPoints: parsed.keyPoints || [],
        actionItems: parsed.actionItems || [],
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'neutral',
        participants: parsed.participants || [],
        nextSteps: parsed.nextSteps || [],
        objections: parsed.objections || [],
        opportunities: parsed.opportunities || [],
      };
    } catch {
      return {
        summary: result.content,
        keyPoints: [],
        actionItems: [],
        sentiment: 'neutral',
        participants: [],
        nextSteps: [],
        objections: [],
        opportunities: [],
      };
    }
  }

  /**
   * Generate follow-up suggestions based on context
   */
  async generateFollowUp(context: {
    lastInteraction?: string;
    lastInteractionDate?: string;
    dealStage?: string;
    objections?: string[];
    dealValue?: number;
    contactName?: string;
    companyName?: string;
    previousActions?: string[];
    dealNotes?: string;
  }): Promise<{
    suggestedActions: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      timing: string;
      template?: string;
    }>;
    emailDraft?: string;
    callScript?: string;
    talkingPoints: string[];
    objectionHandling: Array<{
      objection: string;
      response: string;
    }>;
  }> {
    const systemPrompt = `You are an expert sales coach. You help sales representatives craft effective follow-up strategies and communications. Always respond with valid JSON only.`;

    const prompt = `Based on the following context, suggest the best follow-up strategy.

Context:
- Contact: ${context.contactName || 'Unknown'} at ${context.companyName || 'Unknown Company'}
- Last Interaction: ${context.lastInteraction || 'Unknown'}
- Last Interaction Date: ${context.lastInteractionDate || 'Unknown'}
- Deal Stage: ${context.dealStage || 'Unknown'}
- Deal Value: ${context.dealValue ? '$' + context.dealValue.toLocaleString() : 'Unknown'}
- Objections Raised: ${context.objections?.join(', ') || 'None'}
- Previous Actions: ${context.previousActions?.join(', ') || 'None'}
- Deal Notes: ${context.dealNotes || 'None'}

Provide a JSON response with:
{
  "suggestedActions": [
    {
      "action": "<specific action>",
      "priority": "<high|medium|low>",
      "timing": "<when to take action>",
      "template": "<optional email/message template>"
    }
  ],
  "emailDraft": "<ready-to-send follow-up email>",
  "callScript": "<brief call script outline>",
  "talkingPoints": ["<point 1>", "<point 2>", ...],
  "objectionHandling": [
    {
      "objection": "<objection>",
      "response": "<suggested response>"
    }
  ]
}

Return ONLY valid JSON, no additional text or markdown.`;

    const result = await this.generateCompletion({
      prompt,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 2000,
    });

    try {
      const parsed = JSON.parse(result.content);
      return {
        suggestedActions: (parsed.suggestedActions || []).map((a: any) => ({
          action: a.action || '',
          priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
          timing: a.timing || 'As soon as possible',
          template: a.template,
        })),
        emailDraft: parsed.emailDraft,
        callScript: parsed.callScript,
        talkingPoints: parsed.talkingPoints || [],
        objectionHandling: (parsed.objectionHandling || []).map((o: any) => ({
          objection: o.objection || '',
          response: o.response || '',
        })),
      };
    } catch {
      return {
        suggestedActions: [
          {
            action: 'Review and plan follow-up manually',
            priority: 'medium',
            timing: 'Within 24 hours',
          },
        ],
        talkingPoints: [result.content],
        objectionHandling: [],
      };
    }
  }

  /**
   * Generate email draft with unified interface matching OpenAI service
   */
  async generateEmailDraftUnified(context: {
    recipientName: string;
    recipientCompany: string;
    purpose: string;
    tone?: string;
    additionalContext?: string;
    recipientTitle?: string;
    dealStage?: string;
    dealValue?: number;
    painPoints?: string[];
    lastInteraction?: string;
    competitors?: string[];
  }): Promise<{ subject: string; body: string }> {
    const systemPrompt = `You are a professional B2B sales email writer. Write compelling, personalized emails that are concise and action-oriented. Always include a clear call-to-action. Return your response as JSON with "subject" and "body" fields.`;

    const contextParts: string[] = [];
    if (context.recipientTitle) {
      contextParts.push(`- Recipient Title: ${context.recipientTitle}`);
    }
    if (context.dealStage) {
      contextParts.push(`- Deal Stage: ${context.dealStage}`);
    }
    if (context.dealValue) {
      contextParts.push(`- Deal Value: $${context.dealValue.toLocaleString()}`);
    }
    if (context.painPoints?.length) {
      contextParts.push(`- Known Pain Points: ${context.painPoints.join(', ')}`);
    }
    if (context.lastInteraction) {
      contextParts.push(`- Last Interaction: ${context.lastInteraction}`);
    }
    if (context.competitors?.length) {
      contextParts.push(`- Competitors in play: ${context.competitors.join(', ')}`);
    }
    if (context.additionalContext) {
      contextParts.push(`- Additional Context: ${context.additionalContext}`);
    }

    const prompt = `Write a professional sales email with the following details:

Recipient Information:
- Name: ${context.recipientName}
- Company: ${context.recipientCompany}
${contextParts.join('\n')}

Email Requirements:
- Purpose: ${context.purpose}
- Tone: ${context.tone || 'professional and friendly'}

Guidelines:
- Keep the email concise (under 200 words)
- Include a clear call-to-action
- Personalize based on the available context
- Reference pain points or recent interactions if available
- Be helpful, not pushy

Return your response as JSON:
{
  "subject": "<compelling subject line, under 60 characters>",
  "body": "<email body with proper greeting and signature placeholder>"
}

Return ONLY valid JSON, no additional text.`;

    const result = await this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    });

    try {
      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      let jsonContent = result.content.trim();
      if (jsonContent.startsWith('```')) {
        // Remove opening code block (```json or ```)
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing code block
        jsonContent = jsonContent.replace(/\n?```\s*$/, '');
      }

      const parsed = JSON.parse(jsonContent);
      return {
        subject: parsed.subject || 'Following up',
        body: parsed.body || result.content,
      };
    } catch (parseError) {
      this.logger.warn(`[Anthropic] Failed to parse email draft JSON: ${parseError}`);
      this.logger.warn(`[Anthropic] Raw content: ${result.content.substring(0, 200)}...`);

      // Try to extract subject and body from the raw text if JSON parsing failed
      const subjectMatch = result.content.match(/"subject":\s*"([^"]+)"/);
      const bodyMatch = result.content.match(/"body":\s*"([\s\S]*?)"\s*[,}]/);

      if (subjectMatch && bodyMatch) {
        return {
          subject: subjectMatch[1],
          body: bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        };
      }

      return {
        subject: `Following up - ${context.recipientCompany}`,
        body: result.content,
      };
    }
  }

  /**
   * Analyze deal with unified interface matching OpenAI service
   */
  async analyzeDealUnified(dealInfo: {
    dealName: string;
    amount: number;
    stage: string;
    daysInStage: number;
    activities: string[];
    notes: string;
  }): Promise<any> {
    const systemPrompt = `You are a sales analytics expert. Analyze deals and provide actionable insights. Always respond with valid JSON only.`;

    const prompt = `Analyze this sales deal and provide insights:

Deal: ${dealInfo.dealName}
Amount: $${dealInfo.amount.toLocaleString()}
Stage: ${dealInfo.stage}
Days in current stage: ${dealInfo.daysInStage}
Recent activities: ${dealInfo.activities.join(', ')}
Notes: ${dealInfo.notes}

Provide:
1. Risk assessment (1-10 score with explanation)
2. Recommended next actions (3 specific actions)
3. Potential blockers to close
4. Suggested talking points for next meeting

Format as JSON with keys: riskScore, riskExplanation, recommendedActions, potentialBlockers, talkingPoints`;

    const result = await this.generateCompletion({
      prompt,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.5,
    });

    try {
      return JSON.parse(result.content);
    } catch {
      return { raw: result.content };
    }
  }
}
