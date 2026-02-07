import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') || '';
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 1000, model = 'gpt-4' } = options;

    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured, returning fallback response');
      return this.getFallbackResponse();
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('OpenAI completion error:', error);
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): string {
    return JSON.stringify({
      forecast: [],
      insights: ['AI service unavailable - using fallback projections'],
      growthRate: 0.05,
      trend: 'stable',
    });
  }
}
