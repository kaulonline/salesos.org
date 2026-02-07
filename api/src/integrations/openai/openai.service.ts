import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import OpenAI from 'openai';

@Injectable()
export class OpenAIIntegrationService extends BaseIntegrationService {
  protected readonly provider = 'openai';
  protected readonly displayName = 'OpenAI';
  protected readonly logger = new Logger(OpenAIIntegrationService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  private async getOpenAIClient(): Promise<OpenAI | null> {
    const credentials = await this.getCredentials();
    const apiKey = credentials?.apiKey || this.configService.get('OPENAI_API_KEY');
    if (!apiKey) return null;
    return new OpenAI({ apiKey });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const openai = await this.getOpenAIClient();
    if (!openai) {
      return { success: false, message: 'No API key configured' };
    }

    try {
      const models = await openai.models.list();
      const hasGPT4 = models.data.some(m => m.id.includes('gpt-4'));

      return {
        success: true,
        message: `Connected to OpenAI. ${models.data.length} models available.`,
        details: {
          modelsCount: models.data.length,
          hasGPT4,
          availableModels: models.data.slice(0, 5).map(m => m.id),
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    // Verify the API key works
    const openai = new OpenAI({ apiKey });
    await openai.models.list(); // Will throw if invalid

    await this.saveCredentials({ apiKey });
  }

  async generateCompletion(prompt: string, options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    const openai = await this.getOpenAIClient();
    if (!openai) throw new Error('OpenAI not connected');

    const response = await openai.chat.completions.create({
      model: options?.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateEmailDraft(context: {
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

    const prompt = `You are an expert B2B sales email writer. Write a professional sales email with the following details:

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

    const response = await this.generateCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        subject: parsed.subject || 'Following up',
        body: parsed.body || response,
      };
    } catch {
      // If JSON parsing fails, create a basic structure
      return {
        subject: `Following up - ${context.recipientCompany}`,
        body: response,
      };
    }
  }

  async summarizeConversation(messages: string[]): Promise<string> {
    const prompt = `Summarize the following sales conversation in 3-5 bullet points, highlighting key points, objections, and next steps:

${messages.join('\n\n')}`;

    return this.generateCompletion(prompt);
  }

  async analyzeDeal(dealInfo: {
    dealName: string;
    amount: number;
    stage: string;
    daysInStage: number;
    activities: string[];
    notes: string;
  }): Promise<any> {
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

Format as JSON.`;

    const response = await this.generateCompletion(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return { raw: response };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const openai = await this.getOpenAIClient();
    if (!openai) throw new Error('OpenAI not connected');

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
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
    const prompt = `You are an expert sales lead scoring analyst. Analyze this lead and provide a comprehensive score.

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

Return ONLY valid JSON, no additional text.`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        score: Math.min(100, Math.max(0, parsed.score)),
        confidence: Math.min(100, Math.max(0, parsed.confidence || 70)),
        reasoning: parsed.reasoning || 'Analysis complete',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
      };
    } catch {
      // If JSON parsing fails, extract score from text
      const scoreMatch = response.match(/score[:\s]*(\d+)/i);
      return {
        score: scoreMatch ? parseInt(scoreMatch[1], 10) : 50,
        confidence: 50,
        reasoning: response,
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
    const prompt = `You are an expert sales meeting analyst. Analyze this meeting transcript/notes and provide a comprehensive summary.

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

Return ONLY valid JSON, no additional text.`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
    });

    try {
      const parsed = JSON.parse(response);
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
        summary: response,
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
    const prompt = `You are an expert sales coach. Based on the following context, suggest the best follow-up strategy.

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

Return ONLY valid JSON, no additional text.`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.6,
      maxTokens: 2000,
    });

    try {
      const parsed = JSON.parse(response);
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
        talkingPoints: [response],
        objectionHandling: [],
      };
    }
  }
}
