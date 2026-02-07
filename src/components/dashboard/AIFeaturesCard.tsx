import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Brain,
  Target,
  PenLine,
  Layers,
  ArrowRight,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { useAIStatus, useEnrichmentStatus } from '../../hooks';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  path?: string;
  feature: 'ai' | 'enrichment';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'lead-scoring',
    label: 'AI Lead Scoring',
    description: 'Score leads by conversion potential',
    icon: <Target size={20} />,
    color: 'text-[#1A1A1A]',
    bgColor: 'bg-[#EAD07D]',
    path: '/dashboard/leads',
    feature: 'ai',
  },
  {
    id: 'deal-analysis',
    label: 'Deal Analysis',
    description: 'Get AI insights on deal health',
    icon: <TrendingUp size={20} />,
    color: 'text-white',
    bgColor: 'bg-[#1A1A1A]',
    path: '/dashboard/deals',
    feature: 'ai',
  },
  {
    id: 'email-drafts',
    label: 'AI Email Drafts',
    description: 'Generate personalized emails',
    icon: <PenLine size={20} />,
    color: 'text-[#1A1A1A]',
    bgColor: 'bg-[#F0EBD8]',
    path: '/dashboard/contacts',
    feature: 'ai',
  },
  {
    id: 'data-enrichment',
    label: 'Data Enrichment',
    description: 'Enrich leads & contacts',
    icon: <Layers size={20} />,
    color: 'text-[#93C01F]',
    bgColor: 'bg-[#93C01F]/20',
    path: '/dashboard/leads',
    feature: 'enrichment',
  },
];

export const AIFeaturesCard: React.FC = () => {
  const navigate = useNavigate();
  const { data: aiStatus, isLoading: aiLoading } = useAIStatus();
  const { data: enrichmentStatus, isLoading: enrichmentLoading } = useEnrichmentStatus();

  const aiConnected = aiStatus?.available || false;
  const enrichmentConnected = enrichmentStatus?.available || false;
  const isLoading = aiLoading || enrichmentLoading;

  const getFeatureStatus = (feature: 'ai' | 'enrichment') => {
    if (feature === 'ai') return aiConnected;
    return enrichmentConnected;
  };

  return (
    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-[32px] p-6 lg:p-8 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#93C01F]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#E5C56B] flex items-center justify-center">
              <Sparkles size={24} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI-Powered Features</h2>
              <p className="text-white/60 text-sm">Supercharge your sales workflow</p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                <Loader2 size={14} className="animate-spin text-white/60" />
                <span className="text-xs text-white/60">Checking...</span>
              </div>
            ) : (
              <>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${aiConnected ? 'bg-[#93C01F]/20' : 'bg-red-500/20'}`}>
                  {aiConnected ? (
                    <CheckCircle size={14} className="text-[#93C01F]" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${aiConnected ? 'text-[#93C01F]' : 'text-red-400'}`}>
                    AI {aiConnected ? 'Active' : 'Offline'}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${enrichmentConnected ? 'bg-[#93C01F]/20' : 'bg-[#EAD07D]/20'}`}>
                  {enrichmentConnected ? (
                    <CheckCircle size={14} className="text-[#93C01F]" />
                  ) : (
                    <XCircle size={14} className="text-[#EAD07D]" />
                  )}
                  <span className={`text-xs font-medium ${enrichmentConnected ? 'text-[#93C01F]' : 'text-[#EAD07D]'}`}>
                    Enrichment {enrichmentConnected ? 'Active' : 'Offline'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {QUICK_ACTIONS.map((action) => {
            const isAvailable = getFeatureStatus(action.feature);
            return (
              <button
                key={action.id}
                onClick={() => action.path && navigate(action.path)}
                disabled={!isAvailable}
                className={`group p-4 rounded-2xl text-left transition-all ${
                  isAvailable
                    ? 'bg-white/10 hover:bg-white/20 cursor-pointer'
                    : 'bg-white/5 cursor-not-allowed opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center mb-3 ${action.color}`}>
                  {action.icon}
                </div>
                <h3 className="font-medium text-white mb-1 text-sm">{action.label}</h3>
                <p className="text-white/50 text-xs">{action.description}</p>
                {isAvailable && (
                  <div className="mt-2 flex items-center gap-1 text-[#EAD07D] text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Try now <ArrowRight size={12} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={16} className="text-[#EAD07D]" />
              <span className="text-sm font-medium">Smart Insights</span>
            </div>
            <p className="text-xs text-white/50">
              AI analyzes your deals to predict outcomes and recommend next best actions
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-[#EAD07D]" />
              <span className="text-sm font-medium">Instant Enrichment</span>
            </div>
            <p className="text-xs text-white/50">
              Automatically enrich lead and contact data from ZoomInfo, Apollo & Clearbit
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-[#EAD07D]" />
              <span className="text-sm font-medium">Email Automation</span>
            </div>
            <p className="text-xs text-white/50">
              Generate personalized follow-up emails and meeting summaries instantly
            </p>
          </div>
        </div>

        {/* Configure Link */}
        {(!aiConnected || !enrichmentConnected) && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/dashboard/settings/integrations')}
              className="flex items-center gap-2 text-sm text-[#EAD07D] hover:text-[#f0dc9a] transition-colors"
            >
              <Sparkles size={14} />
              Configure AI & Enrichment integrations
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIFeaturesCard;
