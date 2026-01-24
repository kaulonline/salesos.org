import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  Clock,
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  ChevronRight,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAIInsights, AIInsight, InsightType, getInsightStyle, getPriorityStyle } from '../hooks/useAIInsights';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle,
  Flame,
  Clock,
  Calendar,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
};

interface AIInsightsBannerProps {
  maxInsights?: number;
  showSummary?: boolean;
  className?: string;
}

export function AIInsightsBanner({
  maxInsights = 3,
  showSummary = true,
  className = '',
}: AIInsightsBannerProps) {
  const navigate = useNavigate();
  const { insights, summary, isLoading, refetch, dismissInsight } = useAIInsights();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleInsights = insights
    .filter((i) => !dismissedIds.has(i.id) && !i.dismissed)
    .slice(0, maxInsights);

  const handleDismiss = (insightId: string) => {
    setDismissedIds((prev) => new Set([...prev, insightId]));
    dismissInsight(insightId);
  };

  const handleAction = (insight: AIInsight) => {
    if (insight.actionUrl) {
      navigate(insight.actionUrl);
    } else if (insight.entityType && insight.entityId) {
      // Navigate to entity detail page
      const entityRoutes: Record<string, string> = {
        lead: '/dashboard/leads',
        contact: '/dashboard/contacts',
        deal: `/dashboard/deals/${insight.entityId}`,
        meeting: '/dashboard/calendar',
        task: '/dashboard',
      };
      navigate(entityRoutes[insight.entityType] || '/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`} role="status" aria-live="polite" aria-label="Loading AI insights">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" aria-hidden="true" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" aria-hidden="true" />
            <div className="h-3 bg-gray-100 rounded w-2/3" aria-hidden="true" />
          </div>
        </div>
        <span className="sr-only">Loading AI insights...</span>
      </div>
    );
  }

  if (visibleInsights.length === 0 && !showSummary) {
    return null;
  }

  return (
    <section
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}
      aria-labelledby="iris-insights-heading"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-[#EAD07D]" />
          </div>
          <div>
            <h3 id="iris-insights-heading" className="text-sm font-medium text-white">IRIS Insights</h3>
            <p className="text-xs text-gray-400">AI-powered recommendations</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Refresh AI insights"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>

      {/* Summary Stats */}
      {showSummary && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
          <SummaryStat
            label="At-Risk Deals"
            value={summary.atRiskDeals}
            icon={AlertTriangle}
            color="text-red-500"
          />
          <SummaryStat
            label="Hot Leads"
            value={summary.hotLeads}
            icon={Flame}
            color="text-orange-500"
          />
          <SummaryStat
            label="Follow-ups"
            value={summary.upcomingFollowUps}
            icon={MessageSquare}
            color="text-blue-500"
          />
          <SummaryStat
            label="Meeting Prep"
            value={summary.meetingsNeedingPrep}
            icon={Calendar}
            color="text-purple-500"
          />
        </div>
      )}

      {/* Insights List */}
      {visibleInsights.length > 0 ? (
        <div className="divide-y divide-gray-100" role="feed" aria-label="AI insights feed">
          {visibleInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onAction={() => handleAction(insight)}
              onDismiss={() => handleDismiss(insight.id)}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-gray-500" role="status">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
          <p className="text-sm">No urgent insights right now</p>
          <p className="text-xs text-gray-400 mt-1">Check back later for AI recommendations</p>
        </div>
      )}

      {/* Footer - View All */}
      {insights.length > maxInsights && (
        <button
          onClick={() => navigate('/dashboard/ai')}
          className="w-full px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-gray-50 flex items-center justify-center gap-1 border-t border-gray-100 transition-colors"
          aria-label={`View all ${insights.length} AI insights`}
        >
          View all {insights.length} insights
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

// Summary stat component
function SummaryStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="px-3 py-2 text-center" role="status" aria-label={`${label}: ${value}`}>
      <div className="flex items-center justify-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
        <span className="text-lg font-semibold text-gray-900" aria-hidden="true">{value}</span>
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5" aria-hidden="true">{label}</p>
    </div>
  );
}

// Individual insight card
function InsightCard({
  insight,
  onAction,
  onDismiss,
}: {
  insight: AIInsight;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const style = getInsightStyle(insight.type);
  const Icon = iconMap[style.icon] || Lightbulb;

  return (
    <article className={`px-4 py-3 flex items-start gap-3 ${style.bgColor} bg-opacity-30`} aria-labelledby={`insight-${insight.id}`}>
      <div className={`p-2 rounded-lg ${style.bgColor}`} aria-hidden="true">
        <Icon className={`w-4 h-4 ${style.textColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 id={`insight-${insight.id}`} className="text-sm font-medium text-gray-900 truncate">
            {insight.title}
          </h4>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getPriorityStyle(insight.priority)}`} aria-label={`Priority: ${insight.priority}`}>
            {insight.priority}
          </span>
        </div>
        <p className="text-xs text-gray-600 line-clamp-2">{insight.description}</p>

        {insight.entityName && (
          <p className="text-xs text-gray-500 mt-1">
            Related to: <span className="font-medium">{insight.entityName}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-1" role="group" aria-label="Insight actions">
        {insight.actionLabel && (
          <button
            onClick={onAction}
            className="px-2.5 py-1 text-xs font-medium text-white bg-[#1A1A1A] rounded hover:bg-[#2A2A2A] transition-colors"
          >
            {insight.actionLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Dismiss insight: ${insight.title}`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

// Compact version for sidebars
export function AIInsightsCompact({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const { insights, isLoading } = useAIInsights();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleInsights = insights
    .filter((i) => !dismissed.has(i.id))
    .slice(0, 2);

  if (isLoading || visibleInsights.length === 0) {
    return null;
  }

  return (
    <div className={`bg-[#EAD07D]/10 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[#B8A355]" />
        <span className="text-xs font-medium text-[#1A1A1A]">AI Insights</span>
      </div>
      <div className="space-y-2">
        {visibleInsights.map((insight) => (
          <div
            key={insight.id}
            className="text-xs text-gray-700 cursor-pointer hover:text-[#1A1A1A]"
            onClick={() => navigate(insight.actionUrl || '/dashboard/ai')}
          >
            {insight.title}
          </div>
        ))}
      </div>
    </div>
  );
}
