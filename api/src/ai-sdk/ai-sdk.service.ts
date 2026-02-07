// Azure OpenAI Integration with streaming support
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import type { CoreMessage } from 'ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AzureOpenAIRetryService } from '../common/azure-openai-retry.service';
import { ERROR_MESSAGES, getUserFriendlyErrorMessage } from '../common/error-messages.constant';

export interface StreamingOptions {
  onChunk?: (chunk: string) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onFinish?: (result: { text: string; usage: any }) => void;
}

export interface ToolExecutor {
  (name: string, args: any): Promise<any>;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result';
  data: any;
}

/**
 * AI SDK Service using Azure OpenAI
 * Provides streaming chat with tool execution capabilities
 */
@Injectable()
export class AiSdkService {
  private readonly logger = new Logger(AiSdkService.name);
  private readonly client: AzureOpenAI;
  private readonly modelId: string;
  private readonly fastModelId: string; // PERFORMANCE: Fast model for auxiliary tasks
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: AzureOpenAIRetryService,
  ) {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT', '');
    const apiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY', '');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION', '2024-02-15-preview');
    
    this.modelId = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o');
    // PERFORMANCE: Use GPT-4o-mini for fast auxiliary tasks (metadata extraction, simple classification)
    this.fastModelId = this.configService.get<string>('AZURE_OPENAI_SMALL_MODEL', 'gpt-4o-mini');
    this.enabled = (this.configService.get<string>('USE_AZURE_OPENAI', 'true') ?? 'true').toLowerCase() === 'true';

    // Create Azure OpenAI client
    this.client = new AzureOpenAI({
      apiKey: apiKey,
      endpoint: endpoint,
      apiVersion: apiVersion,
    });

    this.logger.log(`AI SDK Service initialized - Main: ${this.modelId}, Fast: ${this.fastModelId}`);
  }

  /**
   * Format system prompt for OpenAI.
   * Note: OpenAI doesn't have the same cache_control mechanism as Anthropic.
   * This method returns the prompt as-is for OpenAI.
   */
  private formatSystemPrompt(systemPrompt: string): string {
    return systemPrompt;
  }

  /**
   * Convert tools to OpenAI function format
   */
  private convertToolsToOpenAI(tools?: Record<string, any>): any[] | undefined {
    if (!tools) return undefined;
    
    return Object.entries(tools).map(([name, tool]: [string, any]) => {
      let parameters: any = { type: 'object', properties: {} };
      
      // Convert Zod schema to JSON Schema if inputSchema is a Zod schema
      if (tool.inputSchema && typeof tool.inputSchema === 'object') {
        // Check if it's a Zod schema (has _def property)
        if (tool.inputSchema._def) {
          try {
            const jsonSchema = zodToJsonSchema(tool.inputSchema, { 
              $refStrategy: 'none', // Don't use $ref, inline everything
            });
            // Clean up the schema for OpenAI compatibility
            if (jsonSchema && typeof jsonSchema === 'object') {
              parameters = this.cleanSchemaForOpenAI(jsonSchema);
            }
          } catch (e) {
            this.logger.warn(`Failed to convert Zod schema for tool ${name}:`, e);
            parameters = { type: 'object', properties: {} };
          }
        } else {
          // Already a JSON Schema object
          parameters = this.cleanSchemaForOpenAI(tool.inputSchema);
        }
      } else if (tool.parameters) {
        parameters = this.cleanSchemaForOpenAI(tool.parameters);
      }
      
      // Ensure parameters has required 'type' and 'properties' fields for OpenAI
      if (!parameters.type) {
        parameters.type = 'object';
      }
      if (!parameters.properties) {
        parameters.properties = {};
      }
      
      return {
        type: 'function' as const,
        function: {
          name,
          description: tool.description || '',
          parameters,
        },
      };
    });
  }

  /**
   * Clean a JSON schema for OpenAI compatibility
   * Removes unsupported properties and ensures required fields exist
   */
  private cleanSchemaForOpenAI(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object', properties: {} };
    }
    
    // Remove properties that OpenAI doesn't support
    const { $schema, additionalProperties, ...rest } = schema;
    
    // Ensure type and properties exist
    const cleaned: any = { ...rest };
    if (!cleaned.type) {
      cleaned.type = 'object';
    }
    if (cleaned.type === 'object' && !cleaned.properties) {
      cleaned.properties = {};
    }
    
    // Recursively clean nested properties
    if (cleaned.properties) {
      for (const key of Object.keys(cleaned.properties)) {
        const prop = cleaned.properties[key];
        if (prop && typeof prop === 'object') {
          // Remove additionalProperties from nested objects
          const { additionalProperties: _, ...cleanProp } = prop;
          cleaned.properties[key] = cleanProp;
          
          // Handle nested items (for arrays)
          if (cleanProp.items && typeof cleanProp.items === 'object') {
            const { additionalProperties: __, ...cleanItems } = cleanProp.items;
            cleaned.properties[key].items = cleanItems;
          }
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Generate text with streaming support and agentic tool execution
   * Handles tool calls by executing them and continuing the conversation
   * Returns an async generator that yields stream events
   */
  async *streamChatWithTools(
    messages: CoreMessage[],
    systemPrompt: string,
    tools?: Record<string, any>,
    toolExecutor?: ToolExecutor,
    maxIterations: number = 10,
    useFastModel: boolean = false, // PERFORMANCE: Use GPT-4o-mini for simple queries
    toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }, // Force specific tool
  ): AsyncGenerator<StreamEvent> {
    if (!this.enabled) {
      this.logger.warn('AI SDK disabled, returning placeholder response');
      yield { type: 'text', data: 'AI is disabled. Enable USE_AZURE_OPENAI to receive live responses.' };
      return;
    }

    // Convert tools to OpenAI format if provided
    const openaiTools = this.convertToolsToOpenAI(tools);

    // Build initial conversation with system message
    let conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      })),
    ];

    let iteration = 0;

    // Agentic loop - continue until no more tool calls or max iterations
    while (iteration < maxIterations) {
      iteration++;

      try {
        // PERFORMANCE: Use fast model (GPT-4o-mini) for simple queries, full model (GPT-4o) for complex
        const modelToUse = useFastModel ? this.fastModelId : this.modelId;

        // Convert toolChoice to OpenAI format (only on first iteration when forcing a tool)
        let openaiToolChoice: any = undefined;
        if (iteration === 1 && toolChoice) {
          if (typeof toolChoice === 'string') {
            openaiToolChoice = toolChoice;
          } else if (toolChoice.type === 'function') {
            openaiToolChoice = {
              type: 'function',
              function: { name: toolChoice.function.name },
            };
            this.logger.warn(`[TOOL_FORCING] Forcing tool: ${toolChoice.function.name}`);
          }
        }

        const stream = await this.retryService.executeWithRetry(
          () => this.client.chat.completions.create({
            model: modelToUse,
            messages: conversationMessages,
            max_tokens: 4096,
            temperature: 0.7,
            stream: true,
            ...(openaiTools && { tools: openaiTools }),
            ...(openaiToolChoice && { tool_choice: openaiToolChoice }),
          } as any),
          'streamChatWithTools',
        ) as unknown as AsyncIterable<any>;

        let currentText = '';
        let toolCalls: any[] = [];
        let currentToolCallIndex = -1;

        // Stream the response
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            currentText += delta.content;
            yield { type: 'text', data: delta.content };
          }
          
          // Handle tool calls in streaming
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const idx = toolCallDelta.index;
              
              if (idx !== currentToolCallIndex) {
                // New tool call starting
                currentToolCallIndex = idx;
                toolCalls[idx] = {
                  id: toolCallDelta.id || `call_${idx}`,
                  name: toolCallDelta.function?.name || '',
                  arguments: '',
                };
              }
              
              // Accumulate arguments
              if (toolCallDelta.function?.arguments) {
                toolCalls[idx].arguments += toolCallDelta.function.arguments;
              }
              if (toolCallDelta.function?.name) {
                toolCalls[idx].name = toolCallDelta.function.name;
              }
              if (toolCallDelta.id) {
                toolCalls[idx].id = toolCallDelta.id;
              }
            }
          }
        }

        // Parse tool call arguments
        for (const toolCall of toolCalls) {
          if (toolCall.arguments) {
            try {
              toolCall.input = JSON.parse(toolCall.arguments);
            } catch (e) {
              this.logger.warn(`Failed to parse tool input JSON: ${toolCall.arguments}`);
              toolCall.input = {};
            }
          } else {
            toolCall.input = {};
          }
        }

        // Filter out incomplete tool calls
        toolCalls = toolCalls.filter(tc => tc && tc.name);

        // If no tool calls, we're done
        if (toolCalls.length === 0) {
          return;
        }

        // Build assistant message with tool calls
        const assistantMessage: any = {
          role: 'assistant',
          content: currentText || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments || JSON.stringify(tc.input || {}),
            },
          })),
        };

        // Add assistant message to conversation
        conversationMessages.push(assistantMessage);

        // PARALLEL EXECUTION: Execute independent tools concurrently
        const parallelStart = Date.now();

        // Emit tool_call events for all tools
        for (const toolCall of toolCalls) {
          yield { type: 'tool_call', data: { name: toolCall.name, input: toolCall.input } };
        }

        // Execute all tools in parallel
        const toolPromises = toolCalls.map(async (toolCall) => {
          let result: any;
          if (toolExecutor) {
            try {
              result = await toolExecutor(toolCall.name, toolCall.input);
            } catch (error) {
              this.logger.error(`Tool execution error for ${toolCall.name}: ${error.message}`);
              result = { error: error.message };
            }
          } else {
            result = { error: 'No tool executor provided' };
          }
          return { toolCall, result };
        });

        const parallelResults = await Promise.all(toolPromises);
        const parallelTime = Date.now() - parallelStart;

        if (toolCalls.length > 1) {
          this.logger.log(`[PARALLEL] Executed ${toolCalls.length} tools in ${parallelTime}ms (parallel)`);
        }

        // Add tool results as separate tool messages (OpenAI format)
        for (const { toolCall, result } of parallelResults) {
          yield { type: 'tool_result', data: { name: toolCall.name, result } };

          conversationMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }

      } catch (error) {
        this.logger.error(`Streaming error in iteration ${iteration}: ${error.message}`, error.stack);
        throw error;
      }
    }

    // Max iterations reached - force a final response WITHOUT tools
    this.logger.warn(`Max iterations (${maxIterations}) reached in agentic loop, forcing final response`);
    
    try {
      // Make one final call without tools to force the model to respond
      const finalStream = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: useFastModel ? this.fastModelId : this.modelId,
          messages: [
            ...conversationMessages,
            {
              role: 'user',
              content: 'Please provide your final response based on all the information gathered. Do not make any more tool calls - just summarize the results.',
            },
          ],
          max_tokens: 4096,
          temperature: 0.7,
          stream: true,
          // Explicitly no tools to force text response
        }),
        'streamChatWithTools_final',
      );

      for await (const chunk of finalStream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          yield { type: 'text', data: delta.content };
        }
      }
    } catch (error) {
      this.logger.error(`Error generating final response: ${error.message}`);
      yield { type: 'text', data: ERROR_MESSAGES.AI.GENERIC };
    }
  }

  /**
   * Simple streaming without tool execution (original method for backwards compatibility)
   */
  async streamChat(
    messages: CoreMessage[],
    systemPrompt: string,
    tools?: Record<string, any>,
    options?: StreamingOptions,
  ) {
    if (!this.enabled) {
      this.logger.warn('AI SDK disabled, returning placeholder response');
      return {
        textStream: (async function* () {
          yield 'AI is disabled. Enable USE_AZURE_OPENAI to receive live responses.';
        })(),
        text: Promise.resolve('AI is disabled. Enable USE_AZURE_OPENAI to receive live responses.'),
        toolCalls: [],
      };
    }

    const self = this;

    // Convert messages to OpenAI format with system message
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      })),
    ];

    // Convert tools to OpenAI format if provided
    const openaiTools = this.convertToolsToOpenAI(tools);

    try {
      const stream = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.modelId,
          messages: openaiMessages,
          max_tokens: 4096,
          temperature: 0.7,
          stream: true,
          ...(openaiTools && { tools: openaiTools }),
        }),
        'streamChat',
      );

      let fullText = '';
      let toolCalls: any[] = [];
      let currentToolCallIndex = -1;

      // Create an async generator for the text stream
      const textStream = (async function* () {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            if (delta?.content) {
              fullText += delta.content;
              options?.onChunk?.(delta.content);
              yield delta.content;
            }
            
            // Handle tool calls in streaming
            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const idx = toolCallDelta.index;
                
                if (idx !== currentToolCallIndex) {
                  currentToolCallIndex = idx;
                  toolCalls[idx] = {
                    id: toolCallDelta.id || `call_${idx}`,
                    name: toolCallDelta.function?.name || '',
                    arguments: '',
                  };
                }
                
                if (toolCallDelta.function?.arguments) {
                  toolCalls[idx].arguments += toolCallDelta.function.arguments;
                }
                if (toolCallDelta.function?.name) {
                  toolCalls[idx].name = toolCallDelta.function.name;
                }
                if (toolCallDelta.id) {
                  toolCalls[idx].id = toolCallDelta.id;
                }
              }
            }
          }

          // Parse and notify about tool calls
          for (const toolCall of toolCalls.filter(tc => tc && tc.name)) {
            try {
              toolCall.input = JSON.parse(toolCall.arguments || '{}');
            } catch (e) {
              toolCall.input = {};
            }
            options?.onToolCall?.(toolCall.name, toolCall.input);
          }

          options?.onFinish?.({ text: fullText, usage: {} });
        } catch (error) {
          self.logger.error(`Streaming error: ${error.message}`, error.stack);
          throw error;
        }
      })();

      return {
        textStream,
        text: (async () => {
          let text = '';
          for await (const chunk of textStream) {
            text += chunk;
          }
          return text;
        })(),
        toolCalls,
      };
    } catch (error) {
      this.logger.error(`AI SDK streaming error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate text without streaming (for backwards compatibility)
   */
  async generateChat(
    messages: CoreMessage[],
    systemPrompt: string,
    tools?: Record<string, any>,
  ) {
    if (!this.enabled) {
      this.logger.warn('AI SDK disabled, returning placeholder response');
      return {
        text: 'AI is disabled. Enable USE_AZURE_OPENAI to receive live responses.',
        toolCalls: [],
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }

    try {
      // Convert messages to OpenAI format with system message
      const openaiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        })),
      ];

      // Convert tools to OpenAI format if provided
      const openaiTools = this.convertToolsToOpenAI(tools);

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.modelId,
          messages: openaiMessages,
          max_tokens: 4096,
          temperature: 0.7,
          ...(openaiTools && { tools: openaiTools }),
        }),
        'generateChat',
      );

      const choice = response.choices[0];

      // Extract text content
      const text = choice.message.content || '';

      // Extract tool calls
      const toolCalls = (choice.message.tool_calls || []).map((tc: any) => ({
        toolName: tc.function.name,
        input: JSON.parse(tc.function.arguments || '{}'),
      }));

      return {
        text,
        toolCalls,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error(`AI SDK generation error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract structured metadata from user message using LLM
   * This is much more accurate than regex-based extraction
   */
  async extractMetadata(userMessage: string, aiResponse?: string): Promise<{
    companyName: string | null;
    artifactType: 'account-report' | 'action-plan' | 'email' | 'quote' | 'battle-card' | 'playbook' | 'call-script' | 'crm-action' | null;
    artifactTitle: string | null;
    intent: string;
    companyData?: {
      name: string;
      website: string;
      logoUrl: string;
      revenue: string;
      employees: string;
      headquarters: string;
      industry: string;
      founded: string;
      description: string;
      summary: string;
      highlights: string[];
      news: Array<{ title: string; summary: string; source: string; date: string; sentiment: string }>;
      executives: Array<{ name: string; role: string }>;
      products: Array<{ name: string; category: string; notes: string }>;
      competitors: string[];
      segments: string[];
      markets: string[];
      customerTypes: string[];
      salesIntel: { talkTracks: string[]; triggers: string[] };
      links: Array<{ label: string; url: string }>;
    };
  }> {
    if (!this.enabled) {
      return { companyName: null, artifactType: null, artifactTitle: null, intent: 'unknown' };
    }

    try {
      // First pass: Quick intent extraction from user message
      const intentPrompt = `Analyze this user message and determine the intent. Return ONLY valid JSON.

User Message: "${userMessage}"

Return JSON:
{
  "companyName": "Extract the company/organization name (e.g., 'Deloitte', 'Microsoft'). Return null if none.",
  "artifactType": "One of: 'account-report' (company research/news/overview), 'action-plan' (recommendations/priorities/tasks), 'email' (email drafts), 'quote' (pricing/proposals), 'battle-card' (competitive analysis), 'playbook' (sales strategies), 'call-script' (phone scripts), 'crm-action' (CRM operations like create lead), or null for simple Q&A/data queries",
  "artifactTitle": "Descriptive title (e.g., 'Deloitte — Account Report'). Null if no artifact.",
  "intent": "Brief intent description"
}

Rules:
- Extract EXACT company name without possessives ('s) or articles
- CRM data queries (show leads, list opportunities) should NOT create artifacts - return null
- Document search queries should NOT create artifacts - return null
- Short Q&A or simple questions should NOT create artifacts - return null`;

      // PERFORMANCE: Use fast model for metadata extraction - simple classification task
      const intentResponse = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.fastModelId,
          messages: [
            { role: 'system', content: 'You are a JSON extraction assistant. Return ONLY valid JSON.' },
            { role: 'user', content: intentPrompt },
          ],
          max_tokens: 300,
          temperature: 0,
        }),
        'extractConversationMetadata',
      );

      let intentJson = intentResponse.choices[0]?.message?.content?.trim() || '{}';
      if (intentJson.startsWith('```')) {
        intentJson = intentJson.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      const parsed = JSON.parse(intentJson);

      // If this is an account-report and we have AI response, do a second pass to extract company data
      if (parsed.artifactType === 'account-report' && aiResponse && aiResponse.length > 100) {
        const companyData = await this.extractCompanyData(aiResponse, parsed.companyName || 'Company');
        return {
          companyName: parsed.companyName || null,
          artifactType: parsed.artifactType,
          artifactTitle: parsed.artifactTitle || `${parsed.companyName || 'Company'} — Account Report`,
          intent: parsed.intent || 'research company',
          companyData,
        };
      }

      return {
        companyName: parsed.companyName || null,
        artifactType: parsed.artifactType || null,
        artifactTitle: parsed.artifactTitle || null,
        intent: parsed.intent || 'unknown',
      };
    } catch (error) {
      this.logger.error(`Metadata extraction error: ${error.message}`);
      return { companyName: null, artifactType: null, artifactTitle: null, intent: 'unknown' };
    }
  }

  /**
   * Extract structured company data from AI response using LLM
   */
  private async extractCompanyData(aiResponse: string, companyName: string): Promise<{
    name: string;
    website: string;
    logoUrl: string;
    revenue: string;
    employees: string;
    headquarters: string;
    industry: string;
    founded: string;
    description: string;
    summary: string;
    highlights: string[];
    news: Array<{ title: string; summary: string; source: string; date: string; sentiment: string }>;
    executives: Array<{ name: string; role: string }>;
    products: Array<{ name: string; category: string; notes: string }>;
    competitors: string[];
    segments: string[];
    markets: string[];
    customerTypes: string[];
    salesIntel: { talkTracks: string[]; triggers: string[] };
    links: Array<{ label: string; url: string }>;
  }> {
    try {
      const extractPrompt = `Extract ALL structured company information from this AI response about ${companyName}. Return ONLY valid JSON.

AI Response:
${aiResponse.substring(0, 8000)}

Return JSON with these EXACT fields:
{
  "name": "${companyName}",
  "website": "company domain (e.g., 'deloitte.com')",
  "revenue": "formatted revenue (e.g., '$64.9B')",
  "employees": "formatted count (e.g., '470K+')",
  "headquarters": "city, country",
  "industry": "primary industry",
  "founded": "year",
  "description": "2-3 sentence company overview",
  "summary": "Full detailed summary - the main body of the report content",
  "highlights": ["key highlight 1", "key highlight 2", "key highlight 3"],
  "news": [
    {"title": "News headline", "summary": "Brief summary", "source": "Source name", "date": "Date", "sentiment": "positive/neutral/negative"}
  ],
  "executives": [
    {"name": "Full Name", "role": "Title/Position"}
  ],
  "products": [
    {"name": "Product/Service Name", "category": "Category", "notes": "Brief description"}
  ],
  "competitors": ["Competitor 1", "Competitor 2"],
  "segments": ["Business segment 1", "Business segment 2"],
  "markets": ["Geographic market 1", "Geographic market 2"],
  "customerTypes": ["Customer type 1", "Customer type 2"],
  "salesIntel": {
    "talkTracks": ["Key talking point 1", "Key talking point 2"],
    "triggers": ["Sales trigger/opportunity 1", "Sales trigger/opportunity 2"]
  },
  "links": [
    {"label": "Link description", "url": "https://..."}
  ]
}

CRITICAL RULES:
1. Extract ALL executives/leadership mentioned with their exact names and titles
2. Extract ALL products, services, and offerings mentioned
3. Extract ALL competitors mentioned
4. Extract business segments/divisions if mentioned
5. Extract geographic markets/regions if mentioned
6. Extract customer types/target markets if mentioned
7. Generate sales talking points based on company strengths
8. Generate sales triggers based on news/challenges mentioned
9. Extract any source URLs mentioned
10. If a field is not found in the content, use empty string or empty array - DO NOT make up data
11. The "summary" should be the comprehensive overview text suitable for display`;

      const response = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.modelId,
          messages: [
            { role: 'system', content: 'You are a JSON extraction assistant. Extract data accurately from the provided text. Return ONLY valid JSON. Do not invent data - only extract what is actually present in the text.' },
            { role: 'user', content: extractPrompt },
          ],
          max_tokens: 4000,
          temperature: 0,
        }),
        'extractCompanyData',
      );

      let jsonText = response.choices[0]?.message?.content?.trim() || '{}';
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }
      const data = JSON.parse(jsonText);

      // Generate logo URL
      const logoDevToken = 'pk_W2MYKZXiSAS4WfncVJ8b1A';
      const website = data.website || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      const logoUrl = `https://img.logo.dev/${website}?token=${logoDevToken}&size=100&format=png`;

      return {
        name: data.name || companyName,
        website: website,
        logoUrl: logoUrl,
        revenue: data.revenue || '',
        employees: data.employees || '',
        headquarters: data.headquarters || '',
        industry: data.industry || '',
        founded: data.founded || '',
        description: data.description || '',
        summary: data.summary || data.description || '',
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        news: Array.isArray(data.news) ? data.news : [],
        executives: Array.isArray(data.executives) ? data.executives : [],
        products: Array.isArray(data.products) ? data.products : [],
        competitors: Array.isArray(data.competitors) ? data.competitors : [],
        segments: Array.isArray(data.segments) ? data.segments : [],
        markets: Array.isArray(data.markets) ? data.markets : [],
        customerTypes: Array.isArray(data.customerTypes) ? data.customerTypes : [],
        salesIntel: {
          talkTracks: Array.isArray(data.salesIntel?.talkTracks) ? data.salesIntel.talkTracks : [],
          triggers: Array.isArray(data.salesIntel?.triggers) ? data.salesIntel.triggers : [],
        },
        links: Array.isArray(data.links) ? data.links : [],
      };
    } catch (error) {
      this.logger.error(`Company data extraction error: ${error.message}`);
      // Return basic structure with company name
      const website = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
      return {
        name: companyName,
        website: website,
        logoUrl: `https://img.logo.dev/${website}?token=pk_W2MYKZXiSAS4WfncVJ8b1A&size=100&format=png`,
        revenue: '',
        employees: '',
        headquarters: '',
        industry: '',
        founded: '',
        description: '',
        summary: '',
        highlights: [],
        news: [],
        executives: [],
        products: [],
        competitors: [],
        segments: [],
        markets: [],
        customerTypes: [],
        salesIntel: { talkTracks: [], triggers: [] },
        links: [],
      };
    }
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Fast streaming for simple queries (greetings, simple Q&A) with minimal prompt.
   * Uses the same model but with a much shorter system prompt for faster response.
   */
  async *streamSimpleQuery(
    messages: CoreMessage[],
    queryType: 'greeting' | 'simple-qa' = 'greeting',
  ): AsyncGenerator<StreamEvent> {
    if (!this.enabled) {
      yield { type: 'text', data: 'AI is disabled.' };
      return;
    }

    // Minimal system prompts for fast responses
    const MINIMAL_PROMPTS = {
      greeting: `You are IRIS, a friendly AI sales assistant. Respond warmly to the user's greeting and briefly mention you can help with:
- Managing leads and opportunities
- Pipeline analytics and forecasting
- Email drafting and tracking
- Company research
- Meeting scheduling
Keep your response concise (2-3 sentences max).`,
      'simple-qa': `You are IRIS, an AI sales assistant. Answer the user's question concisely and helpfully. If it's about CRM capabilities, briefly explain what you can do.`,
    };

    const systemPrompt = MINIMAL_PROMPTS[queryType];
    
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      })),
    ];

    try {
      const stream = await this.retryService.executeWithRetry(
        () => this.client.chat.completions.create({
          model: this.modelId,
          messages: openaiMessages,
          max_tokens: 256, // Short response expected
          temperature: 0.7,
          stream: true,
        }),
        'streamSimpleQuery',
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { type: 'text', data: content };
        }
      }
    } catch (error) {
      this.logger.error(`Fast stream error: ${error.message}`);
      yield { type: 'text', data: getUserFriendlyErrorMessage(error) };
    }
  }
}
