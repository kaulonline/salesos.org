/**
 * Unified LLM Service
 *
 * Provider-agnostic LLM service using Azure OpenAI.
 * All requests use OpenAI format for compatibility.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  StreamingCallbacks,
  Tool,
  ToolCall,
  TokenUsage,
  LLMError,
  AuthenticationError,
  RateLimitError,
  ContextLengthError,
  ContentFilterError,
  LLMProvider,
} from './llm.types';

// Model aliases for easy switching
export const MODEL_ALIASES = {
  'default': 'gpt-4o',
  'fast': 'gpt-4o-mini',
  'smart': 'gpt-4o',
  'reasoning': 'gpt-4o',
  'gpt4': 'gpt-4o',
  'gpt4-mini': 'gpt-4o-mini',
} as const;

export type ModelAlias = keyof typeof MODEL_ALIASES;

interface LLMServiceConfig {
  azureEndpoint: string;
  azureApiKey: string;
  azureApiVersion: string;
  defaultModel: string;
  fastModel: string;
  maxRetries: number;
  timeout: number;
}

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private client: OpenAI;
  private config: LLMServiceConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfig();
    this.initializeClient();
  }

  async onModuleInit() {
    this.logger.log(
      `LLM Service initialized - ` +
      `Azure OpenAI: ${this.config.azureEndpoint}, ` +
      `Default: ${this.config.defaultModel}, Fast: ${this.config.fastModel}`
    );
  }

  private loadConfig(): LLMServiceConfig {
    return {
      azureEndpoint: this.configService.get<string>('AZURE_OPENAI_ENDPOINT', ''),
      azureApiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY', ''),
      azureApiVersion: this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
      defaultModel: this.configService.get<string>('LLM_DEFAULT_MODEL', 'gpt-4o'),
      fastModel: this.configService.get<string>('LLM_FAST_MODEL', 'gpt-4o-mini'),
      maxRetries: this.configService.get<number>('LLM_MAX_RETRIES', 3),
      timeout: this.configService.get<number>('LLM_TIMEOUT', 120000),
    };
  }

  private initializeClient() {
    const { azureEndpoint, azureApiKey, azureApiVersion } = this.config;

    if (!azureEndpoint || !azureApiKey) {
      this.logger.error('Azure OpenAI credentials not configured! Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.');
      throw new Error('Azure OpenAI credentials not configured');
    }

    this.client = new OpenAI({
      apiKey: azureApiKey,
      baseURL: `${azureEndpoint}openai/deployments/${this.config.defaultModel}`,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      defaultQuery: { 'api-version': azureApiVersion },
      defaultHeaders: { 'api-key': azureApiKey },
    });

    this.logger.log(`Initialized Azure OpenAI client at ${azureEndpoint}`);
  }

  /**
   * Resolve model alias to actual model name
   */
  resolveModel(model: string | ModelAlias): string {
    if (model in MODEL_ALIASES) {
      return MODEL_ALIASES[model as ModelAlias];
    }
    return model;
  }

  /**
   * Get the default model for standard requests
   */
  getDefaultModel(): string {
    return this.config.defaultModel;
  }

  /**
   * Get the fast model for auxiliary tasks
   */
  getFastModel(): string {
    return this.config.fastModel;
  }

  // ============================================
  // Core Chat Completion Methods
  // ============================================

  /**
   * Generate a chat completion (non-streaming)
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = this.resolveModel(request.model || this.config.defaultModel);

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(request.messages),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        top_p: request.topP,
        stream: false,
        tools: request.tools as any,
        tool_choice: request.toolChoice as any,
        response_format: request.responseFormat,
        stop: request.stop,
        user: request.user,
      });

      return this.formatResponse(response);
    } catch (error) {
      throw this.handleError(error, model);
    }
  }

  /**
   * Generate a chat completion with streaming
   */
  async *chatStream(
    request: ChatCompletionRequest,
    callbacks?: StreamingCallbacks,
  ): AsyncGenerator<ChatCompletionChunk> {
    const model = this.resolveModel(request.model || this.config.defaultModel);

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: this.formatMessages(request.messages),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        top_p: request.topP,
        stream: true,
        tools: request.tools as any,
        tool_choice: request.toolChoice as any,
        stop: request.stop,
        user: request.user,
      });

      let fullContent = '';
      let usage: TokenUsage | undefined;

      for await (const chunk of stream) {
        const formattedChunk = this.formatStreamChunk(chunk);

        // Accumulate content
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          callbacks?.onChunk?.(delta.content);
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              callbacks?.onToolCall?.(
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments || '{}'),
              );
            }
          }
        }

        // Capture usage if available
        if ((chunk as any).usage) {
          usage = (chunk as any).usage;
        }

        yield formattedChunk;
      }

      callbacks?.onFinish?.({ text: fullContent, usage });
    } catch (error) {
      callbacks?.onError?.(error as Error);
      throw this.handleError(error, model);
    }
  }

  /**
   * Simple text generation (convenience method)
   */
  async generate(
    prompt: string,
    options?: {
      model?: string | ModelAlias;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.chat({
      messages,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }

    return '';
  }

  /**
   * Generate with streaming (convenience method)
   */
  async generateStream(
    prompt: string,
    options?: {
      model?: string | ModelAlias;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      onChunk?: (chunk: string) => void;
    },
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let fullContent = '';

    for await (const chunk of this.chatStream(
      {
        messages,
        model: options?.model,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      },
      { onChunk: options?.onChunk },
    )) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
      }
    }

    return fullContent;
  }

  // ============================================
  // Tool/Function Calling
  // ============================================

  /**
   * Execute a chat with tools and handle tool calls automatically
   */
  async chatWithTools(
    request: ChatCompletionRequest,
    toolExecutor: (name: string, args: any) => Promise<any>,
    maxIterations = 10,
  ): Promise<ChatCompletionResponse> {
    let messages = [...request.messages];
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      const response = await this.chat({
        ...request,
        messages,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // No tool calls - return the response
      if (choice.finish_reason !== 'tool_calls' || !assistantMessage.tool_calls?.length) {
        return response;
      }

      // Add assistant message with tool calls
      messages.push(assistantMessage);

      // Execute each tool call and add results
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await toolExecutor(toolCall.function.name, args);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        } catch (error) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: (error as Error).message }),
          });
        }
      }
    }

    throw new LLMError(
      `Max tool iterations (${maxIterations}) exceeded`,
      'MAX_ITERATIONS_EXCEEDED',
      'azure-openai',
    );
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Format messages for OpenAI API
   */
  private formatMessages(messages: ChatMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          tool_call_id: msg.tool_call_id!,
        };
      }

      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content as string,
        ...(msg.tool_calls && { tool_calls: msg.tool_calls as any }),
      };
    });
  }

  /**
   * Format response to our standard type
   */
  private formatResponse(response: OpenAI.ChatCompletion): ChatCompletionResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content || '',
          tool_calls: choice.message.tool_calls as ToolCall[] | undefined,
        },
        finish_reason: choice.finish_reason as any,
      })),
      usage: response.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Format streaming chunk
   */
  private formatStreamChunk(chunk: OpenAI.ChatCompletionChunk): ChatCompletionChunk {
    return {
      id: chunk.id,
      object: 'chat.completion.chunk',
      created: chunk.created,
      model: chunk.model,
      choices: chunk.choices.map((choice) => ({
        index: choice.index,
        delta: {
          role: choice.delta.role as any,
          content: choice.delta.content || undefined,
          tool_calls: choice.delta.tool_calls as any,
        },
        finish_reason: choice.finish_reason as any,
      })),
    };
  }

  /**
   * Handle and transform provider errors
   */
  private handleError(error: any, model: string): LLMError {
    const provider = 'azure-openai';

    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      const message = error.message;

      if (status === 401) {
        return new AuthenticationError(provider, message);
      }

      if (status === 429) {
        const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
        return new RateLimitError(provider, message, retryAfter);
      }

      if (status === 400 && message.includes('context_length')) {
        return new ContextLengthError(provider, message);
      }

      if (status === 400 && message.includes('content_filter')) {
        return new ContentFilterError(provider, message);
      }

      return new LLMError(message, 'API_ERROR', provider, status, status >= 500);
    }

    return new LLMError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      provider,
      undefined,
      true,
    );
  }

  // ============================================
  // Health & Status
  // ============================================

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    provider: string;
    endpoint: string;
    defaultModel: string;
    fastModel: string;
  }> {
    return {
      status: 'healthy',
      provider: 'azure-openai',
      endpoint: this.config.azureEndpoint,
      defaultModel: this.config.defaultModel,
      fastModel: this.config.fastModel,
    };
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    return Object.values(MODEL_ALIASES);
  }
}
