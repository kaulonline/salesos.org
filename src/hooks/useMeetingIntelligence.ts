import { useQuery, useMutation } from '@tanstack/react-query';
import client from '../api/client';
import { queryKeys } from '../lib/queryKeys';

export interface MeetingBriefing {
  meetingId: string;
  attendees: AttendeeInfo[];
  companyInsights?: CompanyInsight;
  dealContext?: DealContext;
  suggestedTopics: string[];
  previousInteractions: PreviousInteraction[];
  recommendedQuestions: string[];
  potentialObjections: ObjectionWithResponse[];
  competitorMentions?: string[];
  generatedAt: string;
}

export interface AttendeeInfo {
  name: string;
  title?: string;
  company?: string;
  role?: 'champion' | 'decision_maker' | 'influencer' | 'user' | 'unknown';
  linkedInUrl?: string;
  recentNews?: string[];
  communicationStyle?: string;
  priorities?: string[];
}

export interface CompanyInsight {
  name: string;
  industry: string;
  size?: string;
  recentNews?: string[];
  challenges?: string[];
  initiatives?: string[];
  competitors?: string[];
}

export interface DealContext {
  dealId: string;
  dealName: string;
  stage: string;
  value: number;
  nextSteps?: string[];
  risks?: string[];
  stakeholders?: string[];
}

export interface PreviousInteraction {
  type: 'call' | 'email' | 'meeting' | 'note';
  date: string;
  summary: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ObjectionWithResponse {
  objection: string;
  suggestedResponse: string;
}

export interface PostMeetingAnalysis {
  meetingId: string;
  summary: string;
  keyTopics: string[];
  actionItems: ActionItem[];
  sentimentAnalysis: {
    overall: 'positive' | 'neutral' | 'negative';
    details: string;
  };
  nextSteps: string[];
  risks?: string[];
  opportunities?: string[];
  followUpDraft?: string;
  generatedAt: string;
}

export interface ActionItem {
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

// Fetch meeting briefing
async function fetchMeetingBriefing(meetingId: string): Promise<MeetingBriefing> {
  const response = await client.get<MeetingBriefing>(`/ai/meetings/${meetingId}/briefing`);
  return response.data;
}

// Fetch post-meeting analysis
async function fetchMeetingAnalysis(meetingId: string): Promise<PostMeetingAnalysis> {
  const response = await client.get<PostMeetingAnalysis>(`/ai/meetings/${meetingId}/analysis`);
  return response.data;
}

// Generate meeting briefing on-demand
async function generateBriefing(meetingId: string): Promise<MeetingBriefing> {
  const response = await client.post<MeetingBriefing>(`/ai/meetings/${meetingId}/briefing/generate`);
  return response.data;
}

// Submit meeting notes for analysis
async function submitMeetingNotes(meetingId: string, notes: string): Promise<PostMeetingAnalysis> {
  const response = await client.post<PostMeetingAnalysis>(`/ai/meetings/${meetingId}/analysis`, { notes });
  return response.data;
}

// Hook for meeting briefing (pre-meeting)
export function useMeetingBriefing(meetingId: string | undefined) {
  const briefingQuery = useQuery({
    queryKey: [...queryKeys.meetings.detail(meetingId!), 'briefing'],
    queryFn: () => fetchMeetingBriefing(meetingId!),
    enabled: !!meetingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const generateMutation = useMutation({
    mutationFn: () => generateBriefing(meetingId!),
    onSuccess: (data) => {
      // Update cache with new briefing
      briefingQuery.refetch();
    },
  });

  return {
    briefing: briefingQuery.data ?? null,
    isLoading: briefingQuery.isLoading,
    error: briefingQuery.error?.message ?? null,
    refetch: briefingQuery.refetch,
    generateBriefing: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}

// Hook for post-meeting analysis
export function useMeetingAnalysis(meetingId: string | undefined) {
  const analysisQuery = useQuery({
    queryKey: [...queryKeys.meetings.detail(meetingId!), 'postAnalysis'],
    queryFn: () => fetchMeetingAnalysis(meetingId!),
    enabled: !!meetingId,
    staleTime: 30 * 60 * 1000, // 30 minutes (analysis doesn't change often)
  });

  const submitNotesMutation = useMutation({
    mutationFn: (notes: string) => submitMeetingNotes(meetingId!, notes),
    onSuccess: () => {
      analysisQuery.refetch();
    },
  });

  return {
    analysis: analysisQuery.data ?? null,
    isLoading: analysisQuery.isLoading,
    error: analysisQuery.error?.message ?? null,
    refetch: analysisQuery.refetch,
    submitNotes: submitNotesMutation.mutate,
    isSubmitting: submitNotesMutation.isPending,
  };
}

// Hook for upcoming meetings that need prep
export function useUpcomingMeetingsForPrep() {
  return useQuery({
    queryKey: ['meetings', 'needsPrep'],
    queryFn: async () => {
      const response = await client.get<Array<{
        id: string;
        title: string;
        startTime: string;
        attendees: string[];
        hasBriefing: boolean;
      }>>('/meetings/upcoming?needsPrep=true');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
