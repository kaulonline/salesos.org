import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { useAnalyzeDeal } from '../../hooks/useAI';
import { DealAnalysisRequest, DealAnalysisResponse } from '../../api/ai';

interface DealAnalysisWidgetProps {
  deal: {
    id: string;
    name: string;
    value: number;
    stage: string;
    probability?: number;
    notes?: string;
    daysInStage?: number;
    activities?: Array<{ type: string; date: string; summary: string }>;
    contacts?: Array<{ name: string; title: string; engagement: string }>;
    competitors?: string[];
  };
  className?: string;
}

export const DealAnalysisWidget: React.FC<DealAnalysisWidgetProps> = ({
  deal,
  className = '',
}) => {
  const [analysis, setAnalysis] = useState<DealAnalysisResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { mutate: analyzeDeal, isPending } = useAnalyzeDeal();

  const handleAnalyze = () => {
    const request: DealAnalysisRequest = {
      name: deal.name,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      notes: deal.notes,
      activities: deal.activities,
      contacts: deal.contacts,
      competitors: deal.competitors,
      daysInStage: deal.daysInStage,
    };

    analyzeDeal(
      { request },
      {
        onSuccess: (response) => {
          setAnalysis(response);
          setExpanded(true);
        },
        onError: (error) => {
          console.error('Failed to analyze deal:', error);
        },
      }
    );
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-[#93C01F] bg-[#93C01F]/20';
      case 'medium':
        return 'text-[#EAD07D] bg-[#EAD07D]/20';
      case 'high':
        return 'text-red-500 bg-red-100';
      default:
        return 'text-[#666] bg-[#F8F8F6]';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-[#93C01F]';
    if (score >= 40) return 'text-[#EAD07D]';
    return 'text-red-500';
  };

  if (!analysis) {
    return (
      <button
        onClick={handleAnalyze}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Brain size={16} />
        )}
        {isPending ? 'Analyzing...' : 'AI Analysis'}
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#F8F8F6] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">AI Deal Analysis</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className={getHealthColor(analysis.healthScore)}>
                Health: {analysis.healthScore}%
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(analysis.riskLevel)}`}>
                {analysis.riskLevel.toUpperCase()} RISK
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAnalyze();
            }}
            className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F0EBD8] rounded-lg transition-colors"
            title="Refresh analysis"
          >
            <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />
          </button>
          {expanded ? <ChevronUp size={20} className="text-[#666]" /> : <ChevronDown size={20} className="text-[#666]" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-black/5 p-4 space-y-4">
          {/* Win Probability */}
          <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
            <span className="text-sm text-[#666]">Win Probability</span>
            <span className={`text-lg font-semibold ${getHealthColor(analysis.winProbability)}`}>
              {analysis.winProbability}%
            </span>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-[#93C01F]" />
                <h4 className="text-sm font-medium text-[#1A1A1A]">Strengths</h4>
              </div>
              <ul className="space-y-1">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#666]">
                    <CheckCircle size={14} className="text-[#93C01F] mt-0.5 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.weaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={16} className="text-red-500" />
                <h4 className="text-sm font-medium text-[#1A1A1A]">Weaknesses</h4>
              </div>
              <ul className="space-y-1">
                {analysis.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#666]">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#666]">
                    <span className="w-5 h-5 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs font-semibold text-[#1A1A1A] flex-shrink-0">
                      {index + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Best Actions */}
          {analysis.nextBestActions.length > 0 && (
            <div className="p-3 bg-[#1A1A1A] rounded-xl">
              <h4 className="text-sm font-medium text-white mb-2">Next Best Actions</h4>
              <ul className="space-y-1">
                {analysis.nextBestActions.map((action, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EAD07D]" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Provider Badge */}
          <div className="flex justify-end">
            <span className="text-xs text-[#999]">
              Powered by {analysis.provider === 'anthropic' ? 'Claude' : 'OpenAI'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealAnalysisWidget;
