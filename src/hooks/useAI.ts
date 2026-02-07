import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi, EmailDraftRequest, DealAnalysisRequest, LeadScoreRequest, MeetingSummaryRequest, FollowUpRequest } from '../api/ai';

// Query keys
export const aiQueryKeys = {
  status: ['ai', 'status'] as const,
};

/**
 * Hook to get AI service status
 */
export function useAIStatus() {
  return useQuery({
    queryKey: aiQueryKeys.status,
    queryFn: () => aiApi.getStatus(),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to generate email draft
 */
export function useGenerateEmailDraft() {
  return useMutation({
    mutationFn: ({ request, provider }: { request: EmailDraftRequest; provider?: 'openai' | 'anthropic' }) =>
      aiApi.generateEmailDraft(request, provider),
  });
}

/**
 * Hook to analyze deal
 */
export function useAnalyzeDeal() {
  return useMutation({
    mutationFn: ({ request, provider }: { request: DealAnalysisRequest; provider?: 'openai' | 'anthropic' }) =>
      aiApi.analyzeDeal(request, provider),
  });
}

/**
 * Hook to score lead
 */
export function useScoreLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, provider }: { request: LeadScoreRequest; provider?: 'openai' | 'anthropic' }) =>
      aiApi.scoreLead(request, provider),
    onSuccess: () => {
      // Invalidate leads query to refresh scores
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

/**
 * Hook to summarize meeting
 */
export function useSummarizeMeeting() {
  return useMutation({
    mutationFn: ({ request, provider }: { request: MeetingSummaryRequest; provider?: 'openai' | 'anthropic' }) =>
      aiApi.summarizeMeeting(request, provider),
  });
}

/**
 * Hook to get follow-up suggestions
 */
export function useSuggestFollowUp() {
  return useMutation({
    mutationFn: ({ request, provider }: { request: FollowUpRequest; provider?: 'openai' | 'anthropic' }) =>
      aiApi.suggestFollowUp(request, provider),
  });
}

/**
 * Hook for custom AI completion
 */
export function useAICompletion() {
  return useMutation({
    mutationFn: ({ prompt, systemPrompt, provider }: { prompt: string; systemPrompt?: string; provider?: 'openai' | 'anthropic' }) =>
      aiApi.complete(prompt, systemPrompt, provider),
  });
}

/**
 * Hook to test AI connection
 */
export function useTestAIConnection() {
  return useMutation({
    mutationFn: (provider?: 'openai' | 'anthropic') => aiApi.testConnection(provider),
  });
}

/**
 * Hook to test specific AI provider
 */
export function useTestAIProvider() {
  return useMutation({
    mutationFn: (provider: 'openai' | 'anthropic') => aiApi.testProvider(provider),
  });
}

export default {
  useAIStatus,
  useGenerateEmailDraft,
  useAnalyzeDeal,
  useScoreLead,
  useSummarizeMeeting,
  useSuggestFollowUp,
  useAICompletion,
  useTestAIConnection,
  useTestAIProvider,
};
