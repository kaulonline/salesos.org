/**
 * Local SLM Service - Self-hosted Small Language Model Integration
 *
 * Connects to a local/private SLM endpoint (Granite, Qwen, Mistral, etc.)
 * running via Ollama, vLLM, or llama.cpp with OpenAI-compatible API.
 *
 * Benefits:
 * - No rate limits (self-hosted)
 * - Lower latency (local network)
 * - No API costs
 * - Data privacy (no external calls)
 *
 * Current deployment: IBM Granite 3.1 3B (800M active params)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Compatible interface with AnthropicService
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

export interface SLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: SLMToolCall[];
  tool_call_id?: string;
}

export interface SLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface SLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface SLMCompletionRequest {
  messages: SLMMessage[];
  tools?: SLMTool[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface SLMCompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: SLMToolCall[];
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timings?: {
    prompt_ms: number;
    predicted_ms: number;
    predicted_per_second: number;
  };
}

@Injectable()
export class LocalSLMService implements OnModuleInit {
  private readonly logger = new Logger(LocalSLMService.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly modelName: string;
  private isAvailable = false;
  private lastHealthCheck = 0;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>(
      'LOCAL_SLM_ENDPOINT',
      'https://slm.iriseller.com/v1/chat/completions'
    );
    this.apiKey = this.configService.get<string>(
      'LOCAL_SLM_API_KEY',
      '72fe8ad16f4fb5953f0253b503c1b3750e1dc76199cdf2daade10f3b5af85fb5'
    );
    this.modelName = this.configService.get<string>(
      'LOCAL_SLM_MODEL',
      'granite-3.1-3b'
    );
  }

  async onModuleInit() {
    await this.checkHealth();
    if (this.isAvailable) {
      this.logger.log(`Local SLM connected: ${this.endpoint} (${this.modelName})`);
    } else {
      this.logger.warn(`Local SLM not available at ${this.endpoint}`);
    }
  }

  /**
   * Check if the local SLM is available
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL && this.isAvailable) {
      return true;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      this.isAvailable = response.ok;
      this.lastHealthCheck = now;
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Check if SLM is currently available
   */
  get available(): boolean {
    return this.isAvailable;
  }

  /**
   * Generate a chat completion using the local SLM
   */
  async chatCompletion(request: SLMCompletionRequest): Promise<SLMCompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: request.messages,
          tools: request.tools,
          max_tokens: request.max_tokens || 2048,
          temperature: request.temperature ?? 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SLM request failed (${response.status}): ${errorText}`);
      }

      const result: SLMCompletionResponse = await response.json();
      const latency = Date.now() - startTime;

      this.logger.debug(
        `SLM completion: ${result.usage?.total_tokens || 0} tokens in ${latency}ms ` +
        `(${result.timings?.predicted_per_second?.toFixed(1) || 'N/A'} tok/s)`
      );

      return result;
    } catch (error: any) {
      this.logger.error(`SLM completion failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate completion with function calling support
   */
  async completionWithTools(
    messages: SLMMessage[],
    tools: SLMTool[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{
    content: string | null;
    toolCalls: SLMToolCall[] | null;
    finishReason: string;
    usage: { promptTokens: number; completionTokens: number };
  }> {
    const response = await this.chatCompletion({
      messages,
      tools,
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.7,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || null,
      toolCalls: choice.message.tool_calls || null,
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Simple text completion (no tools)
   */
  async textCompletion(
    systemPrompt: string,
    userMessage: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const response = await this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Classify a query (for routing decisions)
   */
  async classifyQuery(
    query: string
  ): Promise<{ category: string; complexity: string; confidence: number }> {
    const systemPrompt = `You are a query classifier. Classify the user's query into one of these categories:
- greeting: Hi, hello, thanks
- crm-read: Show leads, list opportunities, get details
- crm-write: Create lead, update opportunity
- crm-analysis: Analyze pipeline, forecast
- research: Company research, web search
- email: Send email, drafts
- meeting: Schedule meeting
- general-qa: General questions

Respond with JSON only: {"category":"<category>","complexity":"simple|moderate|complex","confidence":0.0-1.0}`;

    const response = await this.textCompletion(systemPrompt, query, { maxTokens: 100, temperature: 0 });

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn(`Failed to parse classification response: ${response}`);
    }

    // Default fallback
    return { category: 'general-qa', complexity: 'moderate', confidence: 0.5 };
  }

  /**
   * Extract widget-ready data from a tool result using SLM
   * Intelligently identifies entity type, key fields, and formats for display
   */
  async extractWidgetDataFromResult(
    toolName: string,
    toolResult: any,
    userQuery: string
  ): Promise<{ type: string; title: string; data: any[]; attendee?: string } | null> {
    if (!toolResult?.success || !toolResult?.data) return null;

    const systemPrompt = `You extract structured data from CRM tool results for UI widgets.
Given a tool result, identify the entity type and extract key display fields.

Entity types: leads, opportunities, accounts, contacts, tasks, meetings, emails, signals

For each record, extract these fields (if available):
- id, name, title, status, email, phone, company, amount, stage, platform, scheduledStart

Also extract any person name mentioned in the user's query as "attendee" for meetings.

Respond with JSON only:
{
  "type": "leads|opportunities|meetings|etc",
  "title": "Brief title for the widget",
  "attendee": "Person name from query (for meetings only)",
  "records": [{"id": "...", "name": "...", ...}]
}`;

    const userMessage = `Tool: ${toolName}
User Query: ${userQuery}
Tool Result: ${JSON.stringify(toolResult.data).substring(0, 2000)}`;

    try {
      const response = await this.textCompletion(systemPrompt, userMessage, {
        maxTokens: 500,
        temperature: 0
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type,
          title: parsed.title,
          data: parsed.records || [],
          attendee: parsed.attendee || undefined,
        };
      }
    } catch (error: any) {
      this.logger.warn(`SLM widget extraction failed: ${error.message}`);
    }
    return null;
  }

  /**
   * Generate chat completion with tools - Compatible with AnthropicService interface
   * This is the main method used by conversations service
   */
  async generateChatCompletionWithTools(payload: ChatCompletionPayload): Promise<ToolUseResult> {
    const startTime = Date.now();

    // Convert tools to OpenAI format with simplified parameters for better SLM accuracy
    const openAITools = payload.tools?.map(tool => {
      const params = JSON.parse(JSON.stringify(tool.input_schema || {}));

      // Simplify ocx_query for SLM - only keep essential parameters
      if (tool.name === 'ocx_query') {
        return {
          type: 'function' as const,
          function: {
            name: 'ocx_query',
            description: 'Query CRM data. Examples: "top 3 leads" → resource=leads, limit=3. "show 5 opportunities" → resource=opportunities, limit=5.',
            parameters: {
              type: 'object',
              properties: {
                resource: {
                  type: 'string',
                  enum: ['leads', 'opportunities', 'accounts', 'contacts'],
                  description: 'Resource type to query',
                },
                limit: {
                  type: 'integer',
                  description: 'Number of records (e.g., "top 3" means limit=3)',
                },
              },
              required: ['resource'],
            },
          },
        };
      }

      // Add enum hints to resource parameters for other CRM tools
      if (params.properties?.resource && !params.properties.resource.enum) {
        params.properties.resource = {
          ...params.properties.resource,
          enum: ['leads', 'opportunities', 'accounts', 'contacts', 'activities', 'tasks'],
        };
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: params,
        },
      };
    });

    // Convert tool choice - force 'required' when tools are provided to prevent hallucination
    let toolChoice: any = openAITools && openAITools.length > 0 ? 'required' : 'auto';
    if (payload.toolChoice === 'none') {
      toolChoice = 'none';
    } else if (payload.toolChoice && typeof payload.toolChoice === 'object') {
      toolChoice = payload.toolChoice;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: payload.messages,
          tools: openAITools,
          tool_choice: toolChoice,
          max_tokens: payload.maxTokens || 2048,
          temperature: payload.temperature ?? 0.3,
          stream: false,
        }),
        signal: AbortSignal.timeout(90000), // 90s timeout for complex queries
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SLM request failed (${response.status}): ${errorText}`);
      }

      const result: SLMCompletionResponse = await response.json();
      const latency = Date.now() - startTime;
      const choice = result.choices[0];

      this.logger.log(
        `LocalSLM completion: ${result.usage?.total_tokens || 0} tokens in ${latency}ms ` +
        `(${result.timings?.predicted_per_second?.toFixed(1) || 'N/A'} tok/s)`
      );

      // Check for tool calls
      this.logger.log(`SLM response - tool_calls: ${choice.message.tool_calls?.length || 0}, content: "${(choice.message.content || '').substring(0, 50)}..."`);
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        let toolInput = {};
        try {
          toolInput = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          this.logger.warn(`Failed to parse tool arguments: ${toolCall.function.arguments}`);
        }

        return {
          type: 'tool_use',
          toolName: toolCall.function.name,
          toolInput,
          usage: {
            inputTokens: result.usage?.prompt_tokens || 0,
            outputTokens: result.usage?.completion_tokens || 0,
          },
        };
      }

      // Text response (no tool call)
      return {
        type: 'text',
        content: choice.message.content || '',
        usage: {
          inputTokens: result.usage?.prompt_tokens || 0,
          outputTokens: result.usage?.completion_tokens || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`LocalSLM generateChatCompletionWithTools failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract meeting attendee name from a user's scheduling request
   * Uses SLM for intelligent extraction
   */
  async extractMeetingAttendee(userQuery: string): Promise<string | null> {
    const systemPrompt = `You extract attendee names from meeting requests.
Given a meeting scheduling request, extract ONLY the person's name who the meeting is with.
If no attendee is mentioned, respond with "none".
Respond with ONLY the name, nothing else.

Examples:
- "Schedule a meeting with John Smith" → John Smith
- "Set up a call with Sarah at Acme Corp" → Sarah
- "Book meeting with Rock Petro at BrightGrid" → Rock Petro
- "Schedule a team meeting" → none`;

    try {
      const response = await this.textCompletion(systemPrompt, userQuery, {
        maxTokens: 30,
        temperature: 0
      });

      const name = response.trim();
      if (name.toLowerCase() === 'none' || name.length === 0) {
        return null;
      }
      return name;
    } catch (error: any) {
      this.logger.warn(`Failed to extract meeting attendee: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate simple chat completion (no tools) - Compatible with AnthropicService interface
   */
  async generateChatCompletion(payload: {
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages: payload.messages,
          max_tokens: payload.maxTokens || 2048,
          temperature: payload.temperature ?? 0.7,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SLM request failed (${response.status}): ${errorText}`);
      }

      const result: SLMCompletionResponse = await response.json();
      const latency = Date.now() - startTime;

      const tokPerSec = result.timings?.predicted_per_second?.toFixed(1) || 'N/A';
      this.logger.log(`LocalSLM response: ${result.usage?.total_tokens || 0} tokens in ${latency}ms (${tokPerSec} tok/s)`);

      return {
        content: result.choices[0]?.message?.content || '',
        usage: {
          inputTokens: result.usage?.prompt_tokens || 0,
          outputTokens: result.usage?.completion_tokens || 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`LocalSLM generateChatCompletion failed: ${error.message}`);
      throw error;
    }
  }
}
