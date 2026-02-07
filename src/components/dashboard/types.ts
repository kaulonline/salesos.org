// Format currency with compact notation (K, M, B, T)
export const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

export const getStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    'PROSPECTING': 'Prospecting',
    'QUALIFICATION': 'Qualification',
    'NEEDS_ANALYSIS': 'Needs Analysis',
    'VALUE_PROPOSITION': 'Value Prop',
    'DECISION_MAKERS_IDENTIFIED': 'Decision Makers',
    'PERCEPTION_ANALYSIS': 'Perception',
    'PROPOSAL_PRICE_QUOTE': 'Proposal',
    'NEGOTIATION_REVIEW': 'Negotiation',
    'CLOSED_WON': 'Closed Won',
    'CLOSED_LOST': 'Closed Lost',
  };
  return labels[stage] || stage;
};

// Types for dashboard components
export interface DailyActivity {
  date: Date;
  label: string;
  calls: number;
  emails: number;
  meetings: number;
  total: number;
  isToday: boolean;
}

export interface DashboardStats {
  totalDeals: number;
  closedWonThisMonth: number;
  totalPipeline: number;
  winRate: number;
  quotaAttainment: number;
  conversionRate: number;
  dealVelocity: number | null;
  estimatedCommission: number;
}

export interface ForecastData {
  quarterName?: string;
  quarterBestCase?: number;
  quarterCommit?: number;
  monthly?: Array<{
    month: string;
    mostLikely?: number;
    commit?: number;
    bestCase?: number;
  }>;
}
