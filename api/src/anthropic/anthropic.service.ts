import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { AzureOpenAIRetryService } from '../common/azure-openai-retry.service';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

interface ChatCompletionPayload {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

export interface ToolUseResult {
  type: 'text' | 'tool_use';
  content?: string;
  toolName?: string;
  toolInput?: any;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * SCHEMA CLEANING: OpenAI requires arrays to have "items" definition
 * Recursively ensures all array types have proper items schema
 */
function cleanSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  
  const cleaned: any = { ...schema };
  
  // If this is an array type without items, add default items
  if (cleaned.type === 'array' && !cleaned.items) {
    cleaned.items = { type: 'object' };
  }
  
  // Recursively clean properties
  if (cleaned.properties) {
    cleaned.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      cleaned.properties[key] = cleanSchema(value);
    }
  }
  
  // Recursively clean items
  if (cleaned.items) {
    cleaned.items = cleanSchema(cleaned.items);
  }
  
  // Recursively clean additionalProperties
  if (cleaned.additionalProperties && typeof cleaned.additionalProperties === 'object') {
    cleaned.additionalProperties = cleanSchema(cleaned.additionalProperties);
  }
  
  return cleaned;
}

/**
 * LLM Service using Azure OpenAI
 * Note: Class name kept as AnthropicService for backward compatibility with 15+ importing services
 * Internally uses Azure OpenAI GPT models instead of Anthropic Claude
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: AzureOpenAI;
  private readonly deploymentName: string;
  private readonly fastModelName: string; // PERFORMANCE: Fast model for auxiliary tasks
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: AzureOpenAIRetryService,
  ) {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT', '');
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY', '');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2024-02-15-preview');
    
    this.deploymentName = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o');
    // PERFORMANCE: Use GPT-4o-mini for fast auxiliary tasks (follow-ups, simple classifications)
    this.fastModelName = this.configService.get<string>('AZURE_OPENAI_SMALL_MODEL', 'gpt-4o-mini');
    this.enabled = (this.configService.get<string>('USE_AZURE_OPENAI', 'true') ?? 'true').toLowerCase() === 'true';

    this.client = new AzureOpenAI({
      apiKey: apiKey,
      endpoint: endpoint,
      apiVersion: apiVersion,
    });

    this.logger.log(`Azure OpenAI service initialized - Main: ${this.deploymentName}, Fast: ${this.fastModelName}`);
  }

  async generateChatCompletion(payload: ChatCompletionPayload): Promise<string> {
    if (!this.enabled) {
      this.logger.warn('Azure OpenAI disabled, returning placeholder response');
      return 'Azure OpenAI is disabled. Enable USE_AZURE_OPENAI to receive live responses.';
    }

    try {
      // Convert messages to OpenAI format (system message included in messages array)
      const openaiMessages = payload.messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

      // Convert tools to OpenAI format if provided
      // Use cleanSchema to ensure all arrays have proper items definition
      const openaiTools = payload.tools && payload.tools.length > 0
        ? payload.tools.map((tool: any) => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: cleanSchema(tool.input_schema || tool.parameters || { type: 'object', properties: {} }),
            },
          }))
        : undefined;

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.deploymentName,
          messages: openaiMessages,
          max_tokens: payload.maxTokens ?? 1024,
          temperature: payload.temperature ?? 0.7,
          ...(openaiTools && { tools: openaiTools }),
        }),
        'generateChatCompletion',
      );

      const choice = response.choices[0];
      
      if (choice.message.content) {
        return choice.message.content.trim();
      }

      throw new HttpException('Azure OpenAI returned a non-text response', HttpStatus.BAD_GATEWAY);
    } catch (error) {
      this.logger.error(`Azure OpenAI error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to generate response from Azure OpenAI: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * PERFORMANCE: Fast model completion for auxiliary tasks like follow-up generation.
   * Uses GPT-4o-mini (or configured fast model) which is faster and cheaper.
   * Ideal for simple classification, extraction, and generation tasks.
   */
  async generateFastCompletion(payload: ChatCompletionPayload): Promise<string> {
    if (!this.enabled) {
      this.logger.warn('Azure OpenAI disabled, returning placeholder response');
      return '';
    }

    try {
      const openaiMessages = payload.messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.fastModelName, // Use fast model (GPT-4o-mini)
          messages: openaiMessages,
          max_tokens: payload.maxTokens ?? 256, // Smaller max tokens for fast responses
          temperature: payload.temperature ?? 0.7,
        }),
        'generateFastCompletion',
      );

      const choice = response.choices[0];
      if (choice.message.content) {
        return choice.message.content.trim();
      }

      return '';
    } catch (error) {
      this.logger.warn(`Fast model error (non-critical): ${error.message}`);
      return ''; // Return empty on error - caller should have fallback
    }
  }

  async generateChatCompletionWithTools(payload: ChatCompletionPayload): Promise<ToolUseResult> {
    if (!this.enabled) {
      this.logger.warn('Azure OpenAI disabled, returning placeholder response');
      return {
        type: 'text',
        content: 'Azure OpenAI is disabled. Enable USE_AZURE_OPENAI to receive live responses.',
      };
    }

    try {
      const openaiMessages = payload.messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));

      // Convert tools to OpenAI format
      // Use cleanSchema to ensure all arrays have proper items definition
      const openaiTools = payload.tools && payload.tools.length > 0
        ? payload.tools.map((tool: any) => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: cleanSchema(tool.input_schema || tool.parameters || { type: 'object', properties: {} }),
            },
          }))
        : undefined;

      // Convert tool_choice to OpenAI format
      let openaiToolChoice: any = undefined;
      if (payload.toolChoice) {
        if (typeof payload.toolChoice === 'string') {
          openaiToolChoice = payload.toolChoice;
        } else if (payload.toolChoice.type === 'function') {
          openaiToolChoice = {
            type: 'function',
            function: { name: payload.toolChoice.function.name },
          };
        }
      }

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.deploymentName,
          messages: openaiMessages,
          max_tokens: payload.maxTokens ?? 2048,
          temperature: payload.temperature ?? 0.7,
          ...(openaiTools && { tools: openaiTools }),
          ...(openaiToolChoice && { tool_choice: openaiToolChoice }),
        }),
        'generateChatCompletionWithTools',
      );

      const choice = response.choices[0];

      // Extract usage data from the response
      const usage = {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      };

      // Check if AI wants to use a tool
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        const toolCall = choice.message.tool_calls[0] as { id: string; type: string; function: { name: string; arguments: string } };
        const toolInput = toolCall.function.arguments 
          ? JSON.parse(toolCall.function.arguments) 
          : {};
        
        this.logger.log(`AI requested tool: ${toolCall.function.name} with input:`, toolInput);
        return {
          type: 'tool_use',
          toolName: toolCall.function.name,
          toolInput: toolInput,
          usage,
        };
      }

      // Regular text response
      if (choice.message.content) {
        return {
          type: 'text',
          content: choice.message.content.trim(),
          usage,
        };
      }

      throw new HttpException('Azure OpenAI returned unexpected response format', HttpStatus.BAD_GATEWAY);
    } catch (error) {
      this.logger.error(`Azure OpenAI error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to generate response from Azure OpenAI: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Create a message with tools and return the raw response for multi-turn conversations.
   * Used by agents that need to handle tool calls in a loop.
   * Note: Returns response in Anthropic-compatible format for backward compatibility with agent code.
   */
  async createMessageWithTools(params: {
    messages: Array<{role: string; content: any}>;
    system?: string;
    tools?: any[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    content: any[];
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    if (!this.enabled) {
      this.logger.warn('Azure OpenAI disabled, returning placeholder response');
      return {
        content: [{ type: 'text', text: 'Azure OpenAI is disabled.' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 0, output_tokens: 0 },
      };
    }

    try {
      // Build messages array with system message at the start
      const openaiMessages: Array<{role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: any[]; tool_call_id?: string}> = [];
      
      if (params.system) {
        openaiMessages.push({ role: 'system', content: params.system });
      }
      
      // Convert messages - handle both string content and structured content (tool results)
      for (const m of params.messages) {
        if (m.role === 'user') {
          // Check if this is a tool result message (array of tool_result objects)
          if (Array.isArray(m.content) && m.content[0]?.type === 'tool_result') {
            // Convert Anthropic tool_result format to OpenAI tool message
            for (const toolResult of m.content) {
              openaiMessages.push({
                role: 'tool' as any,
                tool_call_id: toolResult.tool_use_id,
                content: typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content),
              } as any);
            }
          } else {
            openaiMessages.push({
              role: 'user',
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            });
          }
        } else if (m.role === 'assistant') {
          // Check if assistant message contains tool_use blocks
          if (Array.isArray(m.content)) {
            const textParts = m.content.filter((c: any) => c.type === 'text');
            const toolUseParts = m.content.filter((c: any) => c.type === 'tool_use');
            
            const assistantMessage: any = {
              role: 'assistant',
              content: textParts.map((t: any) => t.text).join('') || null,
            };
            
            if (toolUseParts.length > 0) {
              assistantMessage.tool_calls = toolUseParts.map((t: any) => ({
                id: t.id,
                type: 'function',
                function: {
                  name: t.name,
                  arguments: JSON.stringify(t.input || {}),
                },
              }));
            }
            
            openaiMessages.push(assistantMessage);
          } else {
            openaiMessages.push({
              role: 'assistant',
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            });
          }
        }
      }

      // Convert tools to OpenAI format
      // Use cleanSchema to ensure all arrays have proper items definition
      const openaiTools = params.tools && params.tools.length > 0
        ? params.tools.map((tool: any) => ({
            type: 'function' as const,
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: cleanSchema(tool.input_schema || tool.parameters || { type: 'object', properties: {} }),
            },
          }))
        : undefined;

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.deploymentName,
          messages: openaiMessages,
          max_tokens: params.maxTokens ?? 2048,
          temperature: params.temperature ?? 0.3,
          ...(openaiTools && { tools: openaiTools }),
        }),
        'createMessageWithTools',
      );

      const choice = response.choices[0];

      // Convert OpenAI response to Anthropic-compatible format for backward compatibility
      const content: any[] = [];
      
      if (choice.message.content) {
        content.push({ type: 'text', text: choice.message.content });
      }
      
      if (choice.message.tool_calls?.length) {
        for (const tc of choice.message.tool_calls) {
          const toolCall = tc as { id: string; type: string; function: { name: string; arguments: string } };
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments || '{}'),
          });
        }
      }

      // Map OpenAI finish_reason to Anthropic stop_reason
      let stopReason = 'end_turn';
      if (choice.finish_reason === 'tool_calls') {
        stopReason = 'tool_use';
      } else if (choice.finish_reason === 'length') {
        stopReason = 'max_tokens';
      } else if (choice.finish_reason === 'stop') {
        stopReason = 'end_turn';
      }

      return {
        content,
        stop_reason: stopReason,
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Azure OpenAI createMessageWithTools error: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to create message with tools: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
