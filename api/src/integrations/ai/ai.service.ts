import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenAIIntegrationService } from '../openai/openai.service';
import { AnthropicIntegrationService } from '../anthropic/anthropic.service';

export type AIProvider = 'openai' | 'anthropic' | 'auto';

export interface EmailDraftContext {
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
}

export interface DealAnalysisInput {
  name: string;
  value: number;
  stage: string;
  notes?: string;
  activities?: string[];
  daysInStage?: number;
}

export interface DealAnalysisResult {
  riskScore?: number;
  riskExplanation?: string;
  healthScore?: number;
  recommendedActions?: string[];
  potentialBlockers?: string[];
  talkingPoints?: string[];
  likelihoodToClose?: string;
  raw?: string;
}

export interface LeadScoringInput {
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
}

export interface LeadScoringResult {
  score: number;
  confidence: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface MeetingSummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  participants?: string[];
  nextSteps: string[];
  objections: string[];
  opportunities: string[];
}

export interface FollowUpContext {
  lastInteraction?: string;
  lastInteractionDate?: string;
  dealStage?: string;
  objections?: string[];
  dealValue?: number;
  contactName?: string;
  companyName?: string;
  previousActions?: string[];
  dealNotes?: string;
}

export interface FollowUpResult {
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
}

export interface AIServiceStatus {
  available: boolean;
  primaryProvider: AIProvider | null;
  fallbackProvider: AIProvider | null;
  openaiStatus: {
    configured: boolean;
    connected: boolean;
  };
  anthropicStatus: {
    configured: boolean;
    connected: boolean;
  };
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenAIIntegrationService,
    private readonly anthropicService: AnthropicIntegrationService,
  ) {}

  /**
   * Get the status of all AI providers
   */
  async getStatus(): Promise<AIServiceStatus> {
    const [openaiStatus, anthropicStatus] = await Promise.all([
      this.openaiService.getStatus(),
      this.anthropicService.getStatus(),
    ]);

    const openaiConfigured = openaiStatus.configured;
    const openaiConnected = openaiStatus.connected;
    const anthropicConfigured = anthropicStatus.configured;
    const anthropicConnected = anthropicStatus.connected;

    // Determine primary and fallback providers
    let primaryProvider: AIProvider | null = null;
    let fallbackProvider: AIProvider | null = null;

    if (openaiConnected) {
      primaryProvider = 'openai';
      if (anthropicConnected) {
        fallbackProvider = 'anthropic';
      }
    } else if (anthropicConnected) {
      primaryProvider = 'anthropic';
      if (openaiConnected) {
        fallbackProvider = 'openai';
      }
    }

    return {
      available: primaryProvider !== null,
      primaryProvider,
      fallbackProvider,
      openaiStatus: {
        configured: openaiConfigured,
        connected: openaiConnected,
      },
      anthropicStatus: {
        configured: anthropicConfigured,
        connected: anthropicConnected,
      },
    };
  }

  /**
   * Determine which provider to use (with fallback support)
   */
  private async getAvailableProvider(
    preferredProvider?: AIProvider,
  ): Promise<'openai' | 'anthropic' | null> {
    const status = await this.getStatus();
    this.logger.log(`[AIService] Provider status - OpenAI: configured=${status.openaiStatus.configured}, connected=${status.openaiStatus.connected} | Anthropic: configured=${status.anthropicStatus.configured}, connected=${status.anthropicStatus.connected}`);
    this.logger.log(`[AIService] Preferred provider: ${preferredProvider || 'auto'}`);

    if (preferredProvider === 'openai' && status.openaiStatus.connected) {
      this.logger.log('[AIService] Using preferred provider: openai');
      return 'openai';
    }
    if (preferredProvider === 'anthropic' && status.anthropicStatus.connected) {
      this.logger.log('[AIService] Using preferred provider: anthropic');
      return 'anthropic';
    }

    // Auto-select: prefer OpenAI, fall back to Anthropic
    if (status.openaiStatus.connected) {
      this.logger.log('[AIService] Auto-selected provider: openai');
      return 'openai';
    }
    if (status.anthropicStatus.connected) {
      this.logger.log('[AIService] Auto-selected provider: anthropic');
      return 'anthropic';
    }

    this.logger.warn('[AIService] No AI provider available!');
    return null;
  }

  /**
   * Execute with fallback support
   */
  private async executeWithFallback<T>(
    openaiAction: () => Promise<T>,
    anthropicAction: () => Promise<T>,
    preferredProvider?: AIProvider,
  ): Promise<{ result: T; provider: 'openai' | 'anthropic' }> {
    const provider = await this.getAvailableProvider(preferredProvider);

    if (!provider) {
      throw new Error(
        'No AI provider available. Please configure OpenAI or Anthropic in integrations settings.',
      );
    }

    const primaryAction = provider === 'openai' ? openaiAction : anthropicAction;
    const fallbackAction = provider === 'openai' ? anthropicAction : openaiAction;
    const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';

    try {
      const result = await primaryAction();
      return { result, provider };
    } catch (primaryError: any) {
      this.logger.warn(
        `Primary AI provider (${provider}) failed: ${primaryError.message}. Attempting fallback...`,
      );

      // Check if fallback is available
      const status = await this.getStatus();
      const fallbackAvailable =
        provider === 'openai'
          ? status.anthropicStatus.connected
          : status.openaiStatus.connected;

      if (!fallbackAvailable) {
        throw new Error(
          `AI request failed: ${primaryError.message}. No fallback provider available.`,
        );
      }

      try {
        const result = await fallbackAction();
        this.logger.log(`Fallback to ${fallbackProvider} succeeded`);
        return { result, provider: fallbackProvider };
      } catch (fallbackError: any) {
        this.logger.error(
          `Both AI providers failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`,
        );
        throw new Error(
          `AI request failed on all providers. Primary error: ${primaryError.message}`,
        );
      }
    }
  }

  /**
   * Generate an email draft with subject and body
   */
  async generateEmailDraft(
    context: EmailDraftContext,
    preferredProvider?: AIProvider,
  ): Promise<{ subject: string; body: string; provider: string }> {
    const { result, provider } = await this.executeWithFallback(
      () => this.openaiService.generateEmailDraft(context),
      () => this.anthropicService.generateEmailDraftUnified(context),
      preferredProvider,
    );

    // Handle both new {subject, body} format and legacy string format
    if (typeof result === 'string') {
      return {
        subject: `Following up - ${context.recipientCompany}`,
        body: result,
        provider,
      };
    }

    return {
      subject: result.subject || `Following up - ${context.recipientCompany}`,
      body: result.body || '',
      provider,
    };
  }

  /**
   * Analyze a deal
   */
  async analyzeDeal(
    deal: DealAnalysisInput,
    preferredProvider?: AIProvider,
  ): Promise<{ analysis: DealAnalysisResult; provider: string }> {
    const dealInfo = {
      dealName: deal.name,
      amount: deal.value,
      stage: deal.stage,
      daysInStage: deal.daysInStage || 0,
      activities: deal.activities || [],
      notes: deal.notes || '',
    };

    const { result, provider } = await this.executeWithFallback(
      () => this.openaiService.analyzeDeal(dealInfo),
      () => this.anthropicService.analyzeDealUnified(dealInfo),
      preferredProvider,
    );

    return { analysis: result, provider };
  }

  /**
   * Score a lead
   */
  async scoreLead(
    lead: LeadScoringInput,
    preferredProvider?: AIProvider,
  ): Promise<{ scoring: LeadScoringResult; provider: string }> {
    const { result, provider } = await this.executeWithFallback(
      () => this.openaiService.scoreLead(lead),
      () => this.anthropicService.scoreLead(lead),
      preferredProvider,
    );

    return { scoring: result, provider };
  }

  /**
   * Summarize a meeting
   */
  async summarizeMeeting(
    transcript: string,
    preferredProvider?: AIProvider,
  ): Promise<{ summary: MeetingSummaryResult; provider: string }> {
    const { result, provider } = await this.executeWithFallback(
      () => this.openaiService.summarizeMeeting(transcript),
      () => this.anthropicService.summarizeMeeting(transcript),
      preferredProvider,
    );

    return { summary: result, provider };
  }

  /**
   * Generate follow-up suggestions
   */
  async generateFollowUp(
    context: FollowUpContext,
    preferredProvider?: AIProvider,
  ): Promise<{ followUp: FollowUpResult; provider: string }> {
    const { result, provider } = await this.executeWithFallback(
      () => this.openaiService.generateFollowUp(context),
      () => this.anthropicService.generateFollowUp(context),
      preferredProvider,
    );

    return { followUp: result, provider };
  }

  /**
   * Generic completion (for custom prompts)
   */
  async generateCompletion(
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    },
    preferredProvider?: AIProvider,
  ): Promise<{ content: string; provider: string }> {
    const { result, provider } = await this.executeWithFallback(
      () =>
        this.openaiService.generateCompletion(prompt, {
          maxTokens: options?.maxTokens,
          temperature: options?.temperature,
        }),
      async () => {
        const res = await this.anthropicService.generateCompletion({
          prompt,
          systemPrompt: options?.systemPrompt,
          maxTokens: options?.maxTokens,
          temperature: options?.temperature,
        });
        return res.content;
      },
      preferredProvider,
    );

    return { content: result, provider };
  }
}
