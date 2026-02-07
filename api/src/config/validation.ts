import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  
  // Azure OpenAI Configuration (primary LLM provider)
  AZURE_OPENAI_API_KEY: z.string().min(1, 'Provide Azure OpenAI API key'),
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().min(1).default('gpt-4o'),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-15-preview'),
  USE_AZURE_OPENAI: z.string().default('true'),
  
  // Legacy Anthropic Configuration (optional - deprecated)
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_ENDPOINT: z.string().optional(),
  ANTHROPIC_DEPLOYMENT_NAME: z.string().optional(),
  USE_ANTHROPIC: z.string().optional().default('false'),
  
  // Google Custom Search API (optional - web research features)
  GOOGLE_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),

  // Alpha Vantage API (optional - financial data features)
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
