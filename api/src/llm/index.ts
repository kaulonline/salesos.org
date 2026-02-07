/**
 * LLM Module - Unified LLM API via LiteLLM
 * 
 * This module provides a provider-agnostic interface to 100+ LLM providers.
 * It uses LiteLLM Proxy Server as the gateway, falling back to direct
 * provider connections when the proxy is unavailable.
 */

export * from './llm.types';
export * from './llm.service';
export * from './llm.module';
