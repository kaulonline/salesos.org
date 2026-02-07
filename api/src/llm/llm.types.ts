/**
 * Unified LLM Types
 * Provider-agnostic types for LLM operations
 * Compatible with LiteLLM OpenAI-format API
 */

// ============================================
// Core Message Types
// ============================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentBlock[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ContentBlock {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

// ============================================
// Tool/Function Types
// ============================================

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

// ============================================
// LLM Provider Configuration
// ============================================

export type LLMProvider = 
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'azure_ai'
  | 'bedrock'
  | 'vertex_ai'
  | 'groq'
  | 'together_ai'
  | 'ollama'
  | 'deepseek'
  | 'mistral'
  | 'gemini'
  | 'litellm'; // Use LiteLLM proxy

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
  fastModel?: string;
  // Provider-specific settings
  azureDeployment?: string;
  azureApiVersion?: string;
  region?: string;
}

export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-5-2') */
  model: string;
  /** LiteLLM format: provider/model (e.g., 'azure/gpt-4o', 'anthropic/claude-3-opus') */
  litellmModel?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature (0-2) */
  temperature?: number;
  /** Top P sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
}

// ============================================
// Request/Response Types
// ============================================

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' };
  stop?: string[];
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: TokenUsage;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// ============================================
// Streaming Types
// ============================================

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: {
    role?: MessageRole;
    content?: string;
    tool_calls?: ToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data: any;
}

// ============================================
// Callback Types
// ============================================

export interface StreamingCallbacks {
  onChunk?: (chunk: string) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onFinish?: (result: { text: string; usage?: TokenUsage }) => void;
  onError?: (error: Error) => void;
}

// ============================================
// Error Types
// ============================================

export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public statusCode?: number,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class AuthenticationError extends LLMError {
  constructor(provider: string, message: string) {
    super(message, 'AUTHENTICATION_ERROR', provider, 401, false);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends LLMError {
  constructor(provider: string, message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', provider, 429, true);
    this.name = 'RateLimitError';
  }
}

export class ContextLengthError extends LLMError {
  constructor(provider: string, message: string) {
    super(message, 'CONTEXT_LENGTH_ERROR', provider, 400, false);
    this.name = 'ContextLengthError';
  }
}

export class ContentFilterError extends LLMError {
  constructor(provider: string, message: string) {
    super(message, 'CONTENT_FILTER_ERROR', provider, 400, false);
    this.name = 'ContentFilterError';
  }
}
