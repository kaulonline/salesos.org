import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  Calendar,
  Target,
  Zap,
  ChevronRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface Insight {
  id: string;
  type: 'risk' | 'opportunity' | 'action' | 'timing' | 'forecast';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
  actionIcon?: React.ElementType;
  relatedTo?: {
    name: string;
    avatar?: string;
    company?: string;
  };
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down';
  };
  confidence: number;
}

const INSIGHTS_DATA: Insight[] = [
  {
    id: '1',
    type: 'risk',
    priority: 'high',
    title: '3 deals at risk of slipping',
    description: 'These deals have been in the same stage for over 14 days with no recent activity.',
    action: 'Review deals',
    actionIcon: AlertTriangle,
    metric: { value: '$385k', label: 'at risk' },
    confidence: 92
  },
  {
    id: '2',
    type: 'timing',
    priority: 'high',
    title: 'Best time to call Sarah Chen',
    description: 'Based on her response patterns, she\'s most active between 2-4 PM EST.',
    action: 'Schedule call',
    actionIcon: Phone,
    relatedTo: {
      name: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100',
      company: 'Vertex Tech'
    },
    confidence: 87
  },
  {
    id: '3',
    type: 'opportunity',
    priority: 'medium',
    title: 'Upsell opportunity detected',
    description: 'Acme Corp usage increased 40% last month. They may need to upgrade their plan.',
    action: 'Send proposal',
    actionIcon: Mail,
    relatedTo: {
      name: 'Acme Corp',
      company: 'Enterprise'
    },
    metric: { value: '+40%', label: 'usage growth', trend: 'up' },
    confidence: 78
  },
  {
    id: '4',
    type: 'forecast',
    priority: 'medium',
    title: 'Q4 forecast looking strong',
    description: 'Based on current pipeline velocity, you\'re on track to exceed quota by 15%.',
    metric: { value: '115%', label: 'projected attainment', trend: 'up' },
    confidence: 85
  },
  {
    id: '5',
    type: 'action',
    priority: 'low',
    title: 'Follow up with GlobalBank',
    description: 'It\'s been 5 days since your last touchpoint. Engagement typically drops after 7 days.',
    action: 'Send follow-up',
    actionIcon: Mail,
    relatedTo: {
      name: 'GlobalBank',
      company: 'Financial Services'
    },
    confidence: 72
  }
];

const getInsightStyles = (type: Insight['type'], priority: Insight['priority']) => {
  const styles = {
    risk: {
      icon: AlertTriangle,
      bg: priority === 'high' ? 'bg-red-50' : 'bg-orange-50',
      iconBg: priority === 'high' ? 'bg-red-100' : 'bg-orange-100',
      iconColor: priority === 'high' ? 'text-red-600' : 'text-orange-600',
      border: priority === 'high' ? 'border-red-100' : 'border-orange-100'
    },
    opportunity: {
      icon: TrendingUp,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    timing: {
      icon: Clock,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      border: 'border-blue-100'
    },
    action: {
      icon: Target,
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      border: 'border-violet-100'
    },
    forecast: {
      icon: Zap,
      bg: 'bg-[#EAD07D]/10',
      iconBg: 'bg-[#EAD07D]/30',
      iconColor: 'text-[#1A1A1A]',
      border: 'border-[#EAD07D]/20'
    }
  };
  return styles[type];
};

interface AIInsightsPanelProps {
  className?: string;
  maxInsights?: number;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  className = '',
  maxInsights = 4
}) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setInsights(INSIGHTS_DATA);
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const visibleInsights = insights
    .filter(i => !dismissedIds.has(i.id))
    .slice(0, maxInsights);

  if (isLoading) {
    return (
      <Card className={`${className} p-6`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className} p-6 relative overflow-hidden`}>
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D]/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EAD07D] to-[#D4B85C] flex items-center justify-center shadow-lg shadow-[#EAD07D]/20">
            <Sparkles size={20} className="text-[#1A1A1A]" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-[#1A1A1A]">AI Insights</h3>
            <p className="text-xs text-[#999]">Powered by SalesOS Intelligence</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/40 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-white transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Insights List */}
      <div className="space-y-3 relative z-10">
        {visibleInsights.map((insight, index) => {
          const styles = getInsightStyles(insight.type, insight.priority);
          const Icon = styles.icon;
          const ActionIcon = insight.actionIcon;

          return (
            <div
              key={insight.id}
              className={`group p-4 rounded-2xl ${styles.bg} border ${styles.border} hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={styles.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-[#1A1A1A] text-sm">
                      {insight.title}
                    </h4>
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-black/5 transition-all"
                    >
                      <X size={14} className="text-[#999]" />
                    </button>
                  </div>

                  <p className="text-xs text-[#666] leading-relaxed mb-3">
                    {insight.description}
                  </p>

                  {/* Related Contact */}
                  {insight.relatedTo && (
                    <div className="flex items-center gap-2 mb-3">
                      {insight.relatedTo.avatar ? (
                        <Avatar src={insight.relatedTo.avatar} size="sm" className="w-5 h-5" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">
                            {insight.relatedTo.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-[#1A1A1A]">
                        {insight.relatedTo.name}
                      </span>
                      {insight.relatedTo.company && (
                        <span className="text-xs text-[#999]">
                          • {insight.relatedTo.company}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Metric */}
                      {insight.metric && (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${insight.metric.trend === 'up' ? 'text-emerald-600' : insight.metric.trend === 'down' ? 'text-red-600' : 'text-[#1A1A1A]'}`}>
                            {insight.metric.value}
                          </span>
                          <span className="text-xs text-[#999]">{insight.metric.label}</span>
                        </div>
                      )}

                      {/* Confidence */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/60">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                            style={{ width: `${insight.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[#666]">
                          {insight.confidence}%
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {insight.action && ActionIcon && (
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white text-xs font-medium hover:bg-black transition-colors group/btn">
                        <ActionIcon size={12} />
                        {insight.action}
                        <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-[#999]">Was this helpful?</span>
                <button className="p-1 rounded hover:bg-white/60 transition-colors">
                  <ThumbsUp size={12} className="text-[#999] hover:text-emerald-600" />
                </button>
                <button className="p-1 rounded hover:bg-white/60 transition-colors">
                  <ThumbsDown size={12} className="text-[#999] hover:text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All */}
      <button className="mt-4 w-full py-3 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] rounded-xl transition-colors flex items-center justify-center gap-2 group relative z-10">
        <Sparkles size={14} />
        View all {insights.length} insights
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </Card>
  );
};
