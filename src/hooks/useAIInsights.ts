import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import client from '../api/client';

export type InsightType =
  | 'at_risk_deal'
  | 'hot_lead'
  | 'stale_opportunity'
  | 'meeting_prep'
  | 'follow_up'
  | 'momentum'
  | 'engagement_drop'
  | 'quota_alert';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  entityType?: 'lead' | 'contact' | 'deal' | 'meeting' | 'task';
  entityId?: string;
  entityName?: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
  dismissed?: boolean;
}

interface InsightsResponse {
  insights: AIInsight[];
  summary: {
    atRiskDeals: number;
    hotLeads: number;
    upcomingFollowUps: number;
    meetingsNeedingPrep: number;
  };
  lastUpdated: string;
}

// Fetch insights from AI backend
async function fetchInsights(): Promise<InsightsResponse> {
  // This would call the actual AI insights endpoint
  // For now, return mock data structure
  try {
    const response = await client.get<InsightsResponse>('/ai/insights');
    return response.data;
  } catch {
    // Return empty state if endpoint not available
    return {
      insights: [],
      summary: {
        atRiskDeals: 0,
        hotLeads: 0,
        upcomingFollowUps: 0,
        meetingsNeedingPrep: 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

async function fetchDealInsights(dealId: string): Promise<AIInsight[]> {
  try {
    const response = await client.get<AIInsight[]>(`/ai/insights/deals/${dealId}`);
    return response.data;
  } catch {
    return [];
  }
}

async function fetchLeadInsights(): Promise<AIInsight[]> {
  try {
    const response = await client.get<AIInsight[]>('/ai/insights/leads');
    return response.data;
  } catch {
    return [];
  }
}

// Main hook for dashboard insights
export function useAIInsights() {
  const query = useQuery({
    queryKey: queryKeys.aiInsights.dashboard(),
    queryFn: fetchInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes - insights are expensive to compute
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  const dismissInsight = async (insightId: string) => {
    try {
      await client.post(`/ai/insights/${insightId}/dismiss`);
    } catch {
      // Fail silently
    }
  };

  return {
    insights: query.data?.insights ?? [],
    summary: query.data?.summary ?? {
      atRiskDeals: 0,
      hotLeads: 0,
      upcomingFollowUps: 0,
      meetingsNeedingPrep: 0,
    },
    lastUpdated: query.data?.lastUpdated,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    dismissInsight,
  };
}

// Hook for deal-specific insights
export function useDealInsights(dealId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.aiInsights.deals(),
    queryFn: () => fetchDealInsights(dealId!),
    enabled: !!dealId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for lead insights
export function useLeadInsights() {
  return useQuery({
    queryKey: queryKeys.aiInsights.leads(),
    queryFn: fetchLeadInsights,
    staleTime: 5 * 60 * 1000,
  });
}

// Helper to get insight type icon and color
export function getInsightStyle(type: InsightType): {
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (type) {
    case 'at_risk_deal':
      return {
        icon: 'AlertTriangle',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
      };
    case 'hot_lead':
      return {
        icon: 'Flame',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
      };
    case 'stale_opportunity':
      return {
        icon: 'Clock',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
      };
    case 'meeting_prep':
      return {
        icon: 'Calendar',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
      };
    case 'follow_up':
      return {
        icon: 'MessageSquare',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
      };
    case 'momentum':
      return {
        icon: 'TrendingUp',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
      };
    case 'engagement_drop':
      return {
        icon: 'TrendingDown',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
      };
    case 'quota_alert':
      return {
        icon: 'Target',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-200',
      };
    default:
      return {
        icon: 'Lightbulb',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
      };
  }
}

// Get priority badge style
export function getPriorityStyle(priority: InsightPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-gray-100 text-gray-600';
  }
}
