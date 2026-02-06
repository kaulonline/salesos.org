import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  X,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowRight,
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
  defaultExpanded?: boolean;
}

export function AIInsightsBanner({
  maxInsights = 3,
  showSummary = true,
  className = '',
  defaultExpanded = true,
}: AIInsightsBannerProps) {
  const navigate = useNavigate();
  const { insights, summary, isLoading, refetch, dismissInsight } = useAIInsights();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
      <div className={`relative overflow-hidden rounded-[24px] ${className}`} role="status" aria-live="polite" aria-label="Loading AI insights">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative p-5">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-12 h-12 bg-white/10 rounded-2xl" />
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded-lg w-32 mb-2" />
              <div className="h-3 bg-white/5 rounded-lg w-48" />
            </div>
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
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-[24px] ${className}`}
      aria-labelledby="iris-insights-heading"
      aria-live="polite"
    >
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#252525] to-[#1A1A1A]" />

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      {/* Gold accent glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#EAD07D] rounded-full blur-[100px] opacity-15 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#EAD07D] rounded-full blur-[80px] opacity-10 pointer-events-none" />

      <div className="relative">
        {/* Header - Clickable to toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
          aria-expanded={isExpanded}
          aria-controls="iris-insights-content"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#D4B85A] flex items-center justify-center shadow-lg shadow-[#EAD07D]/20"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
              aria-hidden="true"
            >
              <Sparkles className="w-5 h-5 text-[#1A1A1A]" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            </motion.div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 id="iris-insights-heading" className="text-base font-semibold text-white tracking-tight">IRIS Insights</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EAD07D]/20 text-[#EAD07D] rounded-full uppercase tracking-wider">AI</span>
                {!isExpanded && visibleInsights.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/10 text-white/70 rounded-full">
                    {visibleInsights.length} new
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {isExpanded ? 'Real-time recommendations for your leads' : 'Click to expand insights'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              onClick={(e) => { e.stopPropagation(); refetch(); }}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Refresh AI insights"
            >
              <RefreshCw className="w-4 h-4 text-white/40" aria-hidden="true" />
            </motion.div>
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              className="p-1"
            >
              <ChevronDown className="w-5 h-5 text-white/40" aria-hidden="true" />
            </motion.div>
          </div>
        </button>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id="iris-insights-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              {/* Summary Stats */}
              {showSummary && (
                <div className="grid grid-cols-4 gap-px mx-5 mb-4 bg-white/5 rounded-2xl overflow-hidden">
                  <SummaryStat
                    label="At-Risk"
                    value={summary.atRiskDeals}
                    icon={AlertTriangle}
                    color="text-red-400"
                    bgColor="bg-red-500/10"
                  />
                  <SummaryStat
                    label="Hot Leads"
                    value={summary.hotLeads}
                    icon={Flame}
                    color="text-orange-400"
                    bgColor="bg-orange-500/10"
                  />
                  <SummaryStat
                    label="Follow-ups"
                    value={summary.upcomingFollowUps}
                    icon={MessageSquare}
                    color="text-blue-400"
                    bgColor="bg-blue-500/10"
                  />
                  <SummaryStat
                    label="Prep Needed"
                    value={summary.meetingsNeedingPrep}
                    icon={Calendar}
                    color="text-purple-400"
                    bgColor="bg-purple-500/10"
                  />
                </div>
              )}

              {/* Insights List */}
              {visibleInsights.length > 0 ? (
                <div className="px-5 pb-4 space-y-2" role="feed" aria-label="AI insights feed">
                  <AnimatePresence mode="popLayout">
                    {visibleInsights.map((insight, index) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        index={index}
                        onAction={() => handleAction(insight)}
                        onDismiss={() => handleDismiss(insight.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="px-5 pb-6 pt-2 text-center" role="status">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-white/20" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-white/70">All caught up!</p>
                  <p className="text-xs text-white/40 mt-1">No urgent insights for your leads right now</p>
                </div>
              )}

              {/* Footer - View All */}
              {insights.length > maxInsights && (
                <motion.button
                  onClick={() => navigate('/dashboard/ai')}
                  className="w-full px-5 py-3 text-sm font-medium text-[#EAD07D] hover:text-white flex items-center justify-center gap-2 border-t border-white/5 transition-colors group"
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  aria-label={`View all ${insights.length} AI insights`}
                >
                  <span>View all {insights.length} insights</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// Summary stat component
function SummaryStat({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor?: string;
}) {
  return (
    <motion.div
      className="px-4 py-3 text-center bg-white/5 hover:bg-white/10 transition-colors cursor-default"
      whileHover={{ scale: 1.02 }}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${bgColor || 'bg-white/10'}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} aria-hidden="true" />
        </div>
        <span className="text-xl font-bold text-white tabular-nums" aria-hidden="true">{value}</span>
      </div>
      <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider" aria-hidden="true">{label}</p>
    </motion.div>
  );
}

// Individual insight card
function InsightCard({
  insight,
  index,
  onAction,
  onDismiss,
}: {
  insight: AIInsight;
  index: number;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const style = getInsightStyle(insight.type);
  const Icon = iconMap[style.icon] || Lightbulb;

  const priorityColors: Record<string, string> = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
    MEDIUM: 'bg-[#EAD07D]/20 text-[#EAD07D] border-[#EAD07D]/30',
    LOW: 'bg-white/10 text-white/60 border-white/10',
  };

  return (
    <motion.article
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="relative group"
      aria-labelledby={`insight-${insight.id}`}
    >
      <motion.div
        className="relative flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all cursor-pointer overflow-hidden"
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
        onClick={onAction}
      >
        {/* Subtle gradient accent based on priority */}
        {insight.priority === 'HIGH' && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent pointer-events-none" />
        )}

        {/* Icon */}
        <div className={`relative shrink-0 w-10 h-10 rounded-xl ${style.bgColor} bg-opacity-20 flex items-center justify-center`} aria-hidden="true">
          <Icon className={`w-5 h-5 ${style.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center gap-2 mb-1">
            <h4 id={`insight-${insight.id}`} className="text-sm font-semibold text-white truncate">
              {insight.title}
            </h4>
            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${priorityColors[insight.priority] || priorityColors.LOW}`} aria-label={`Priority: ${insight.priority}`}>
              {insight.priority}
            </span>
          </div>
          <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{insight.description}</p>

          {insight.entityName && (
            <p className="text-[11px] text-white/40 mt-2 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#EAD07D]" />
              <span className="font-medium text-white/50">{insight.entityName}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Insight actions">
          {insight.actionLabel && (
            <motion.button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] rounded-lg hover:bg-[#F5E3A0] transition-colors shadow-lg shadow-[#EAD07D]/20"
            >
              {insight.actionLabel}
            </motion.button>
          )}
          <motion.button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 text-white/30 hover:text-white/60 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            aria-label={`Dismiss insight: ${insight.title}`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </motion.button>
        </div>
      </motion.div>
    </motion.article>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-4 ${className}`}
    >
      {/* Glow accent */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#EAD07D] rounded-full blur-[60px] opacity-20" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EAD07D] to-[#D4B85A] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#1A1A1A]" />
          </div>
          <span className="text-xs font-semibold text-white">IRIS Insights</span>
        </div>
        <div className="space-y-2">
          {visibleInsights.map((insight) => (
            <motion.div
              key={insight.id}
              whileHover={{ x: 4 }}
              className="flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition-colors"
              onClick={() => navigate(insight.actionUrl || '/dashboard/ai')}
            >
              <ChevronRight className="w-3 h-3 text-[#EAD07D]" />
              <span className="truncate">{insight.title}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
