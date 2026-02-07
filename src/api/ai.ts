import apiClient from './client';

// AI API for email drafts, deal analysis, lead scoring, and more

export interface EmailDraftRequest {
  recipientName: string;
  recipientCompany?: string;
  recipientTitle?: string;
  purpose: 'introduction' | 'follow_up' | 'proposal' | 'meeting_request' | 'thank_you' | 'cold_outreach';
  tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  additionalContext?: string;
  dealStage?: string;
  dealValue?: number;
  painPoints?: string[];
  lastInteraction?: string;
  competitors?: string[];
}

export interface EmailDraftResponse {
  subject: string;
  body: string;
  provider: 'openai' | 'anthropic';
}

export interface DealAnalysisRequest {
  name: string;
  value: number;
  stage: string;
  probability?: number;
  notes?: string;
  activities?: Array<{ type: string; date: string; summary: string }>;
  contacts?: Array<{ name: string; title: string; engagement: string }>;
  competitors?: string[];
  daysInStage?: number;
}

export interface DealAnalysisResponse {
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextBestActions: string[];
  winProbability: number;
  provider: 'openai' | 'anthropic';
}

export interface LeadScoreRequest {
  name: string;
  email?: string;
  company?: string;
  title?: string;
  source?: string;
  industry?: string;
  companySize?: string;
  activities?: Array<{ type: string; date: string }>;
  engagementLevel?: string;
}

export interface LeadScoreResponse {
  score: number;
  confidence: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  provider: 'openai' | 'anthropic';
}

export interface MeetingSummaryRequest {
  transcript: string;
  meetingType?: 'discovery' | 'demo' | 'negotiation' | 'closing' | 'check_in';
  attendees?: string[];
}

export interface MeetingSummaryResponse {
  summary: string;
  keyPoints: string[];
  actionItems: Array<{ task: string; owner?: string; dueDate?: string }>;
  sentiment: 'positive' | 'neutral' | 'negative';
  nextSteps: string[];
  objections?: string[];
  opportunities?: string[];
  provider: 'openai' | 'anthropic';
}

export interface FollowUpRequest {
  lastInteraction: string;
  dealStage?: string;
  objections?: string[];
  buyerPersonality?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface FollowUpResponse {
  suggestedActions: string[];
  emailDraft?: { subject: string; body: string };
  callScript?: string;
  talkingPoints: string[];
  objectionHandling?: Array<{ objection: string; response: string }>;
  provider: 'openai' | 'anthropic';
}

export interface AIStatusResponse {
  available: boolean;
  providers: {
    openai: { configured: boolean; model?: string };
    anthropic: { configured: boolean; model?: string };
  };
  primaryProvider?: 'openai' | 'anthropic';
}

export const aiApi = {
  /**
   * Get AI service status
   */
  getStatus: async (): Promise<AIStatusResponse> => {
    const response = await apiClient.get('/ai/status');
    return response.data;
  },

  /**
   * Generate email draft with subject and body
   */
  generateEmailDraft: async (request: EmailDraftRequest, provider?: 'openai' | 'anthropic'): Promise<EmailDraftResponse> => {
    const response = await apiClient.post('/ai/email/draft', { ...request, provider });
    // Response structure: { success, subject, body, provider }
    return {
      subject: response.data.subject,
      body: response.data.body,
      provider: response.data.provider,
    };
  },

  /**
   * Analyze deal health and get recommendations
   */
  analyzeDeal: async (request: DealAnalysisRequest, provider?: 'openai' | 'anthropic'): Promise<DealAnalysisResponse> => {
    const response = await apiClient.post('/ai/deal/analyze', { ...request, provider });
    return response.data;
  },

  /**
   * Score a lead using AI
   */
  scoreLead: async (request: LeadScoreRequest, provider?: 'openai' | 'anthropic'): Promise<LeadScoreResponse> => {
    const response = await apiClient.post('/ai/lead/score', { ...request, provider });
    return response.data;
  },

  /**
   * Summarize meeting transcript
   */
  summarizeMeeting: async (request: MeetingSummaryRequest, provider?: 'openai' | 'anthropic'): Promise<MeetingSummaryResponse> => {
    const response = await apiClient.post('/ai/meeting/summarize', { ...request, provider });
    return response.data;
  },

  /**
   * Get follow-up suggestions
   */
  suggestFollowUp: async (request: FollowUpRequest, provider?: 'openai' | 'anthropic'): Promise<FollowUpResponse> => {
    const response = await apiClient.post('/ai/followup/suggest', { ...request, provider });
    return response.data;
  },

  /**
   * Custom AI completion
   */
  complete: async (prompt: string, systemPrompt?: string, provider?: 'openai' | 'anthropic'): Promise<{ content: string; provider: string }> => {
    const response = await apiClient.post('/ai/completion', { prompt, systemPrompt, provider });
    return response.data;
  },

  /**
   * Test AI provider connection
   */
  testConnection: async (provider?: 'openai' | 'anthropic'): Promise<{
    success: boolean;
    provider: string;
    latencyMs: number;
    response?: string;
    message: string;
    error?: string;
  }> => {
    const response = await apiClient.post('/ai/test', { provider });
    return response.data;
  },

  /**
   * Test specific AI provider connection
   */
  testProvider: async (provider: 'openai' | 'anthropic'): Promise<{
    success: boolean;
    provider: string;
    latencyMs: number;
    response?: string;
    message: string;
    error?: string;
  }> => {
    const response = await apiClient.post(`/ai/test/${provider}`);
    return response.data;
  },
};

export default aiApi;
