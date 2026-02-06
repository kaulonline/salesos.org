/**
 * AI Builder Hook
 * React Query hooks for AI-powered configuration generation
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { aiBuilderApi } from '../api/aiBuilder';
import {
  AIBuilderEntityType,
  GenerateConfigRequest,
  GenerateConfigResponse,
  RefineConfigRequest,
  GenerationContext,
} from '../types/aiBuilder';
import { logger } from '../lib/logger';

export const aiBuilderKeys = {
  all: ['ai-builder'] as const,
  entityTypes: () => [...aiBuilderKeys.all, 'entity-types'] as const,
};

/**
 * Hook to get supported entity types
 */
export function useEntityTypes() {
  return useQuery({
    queryKey: aiBuilderKeys.entityTypes(),
    queryFn: () => aiBuilderApi.getEntityTypes(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

/**
 * Hook to generate configuration from natural language
 */
export function useGenerateConfig() {
  return useMutation({
    mutationFn: (request: GenerateConfigRequest) => aiBuilderApi.generate(request),
    onError: (error: any) => {
      logger.error('Failed to generate configuration:', error.response?.data?.message || error.message);
    },
  });
}

/**
 * Hook to refine a previous configuration
 */
export function useRefineConfig() {
  return useMutation({
    mutationFn: (request: RefineConfigRequest) => aiBuilderApi.refine(request),
    onError: (error: any) => {
      logger.error('Failed to refine configuration:', error.response?.data?.message || error.message);
    },
  });
}

/**
 * Combined hook for AI Builder operations
 */
export function useAIBuilder(entityType: AIBuilderEntityType) {
  const generateMutation = useGenerateConfig();
  const refineMutation = useRefineConfig();

  const generate = async (prompt: string, context?: GenerationContext) => {
    return generateMutation.mutateAsync({
      entityType,
      prompt,
      context,
    });
  };

  const refine = async (
    prompt: string,
    previousConfig: Record<string, any>,
    conversationId?: string
  ) => {
    return refineMutation.mutateAsync({
      entityType,
      prompt,
      previousConfig,
      conversationId,
    });
  };

  return {
    generate,
    refine,
    isGenerating: generateMutation.isPending,
    isRefining: refineMutation.isPending,
    isLoading: generateMutation.isPending || refineMutation.isPending,
    error: generateMutation.error || refineMutation.error,
    reset: () => {
      generateMutation.reset();
      refineMutation.reset();
    },
  };
}
