import React from 'react';
import { TrendingUp, Target, Clock, Brain, CheckCircle, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { Lead } from '../../types';

interface AIScoringData {
  score: number;
  confidence: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  provider: string;
  scoredAt: string;
}

interface LeadScoreSectionProps {
  lead: Lead;
  onScore: () => void;
  onEdit: () => void;
  onConvert: () => void;
  scoringLead: boolean;
}

export const LeadScoreSection: React.FC<LeadScoreSectionProps> = ({
  lead,
  onScore,
  onEdit,
  onConvert,
  scoringLead,
}) => {
  const aiScoring: AIScoringData | null = (lead as any).metadata?.aiScoring || null;
  const score = lead.leadScore || 0;

  return (
    <div className="space-y-6">
      {/* Lead Score */}
      <Card className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Lead Score</h3>
            {aiScoring && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-[#EAD07D]/20 rounded-full text-xs font-medium text-[#1A1A1A]">
                <Sparkles size={12} />
                AI Scored
              </span>
            )}
          </div>
          <button
            onClick={onScore}
            disabled={scoringLead}
            className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors disabled:opacity-50"
          >
            {scoringLead ? 'Scoring...' : 'Refresh Score'}
          </button>
        </div>

        <div className="flex flex-col items-center bg-[#F8F8F6] rounded-2xl p-8">
          <div className="text-7xl font-light text-[#1A1A1A] mb-2">{score}</div>
          <div className="text-sm text-[#666] mb-1">Overall Lead Score</div>
          {aiScoring && (
            <div className="text-xs text-[#999] mb-4">{aiScoring.confidence}% confidence</div>
          )}
          <div className="flex items-center gap-2">
            {score >= 70 ? (
              <>
                <div className="px-4 py-1.5 bg-[#93C01F]/20 rounded-full flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#93C01F]" />
                  <span className="text-sm font-semibold text-[#93C01F]">High Priority</span>
                </div>
              </>
            ) : score >= 40 ? (
              <>
                <div className="px-4 py-1.5 bg-[#EAD07D]/20 rounded-full flex items-center gap-2">
                  <Target size={16} className="text-[#1A1A1A]" />
                  <span className="text-sm font-semibold text-[#1A1A1A]">Medium Priority</span>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-1.5 bg-[#F8F8F6] border border-black/10 rounded-full flex items-center gap-2">
                  <Clock size={16} className="text-[#999]" />
                  <span className="text-sm font-semibold text-[#666]">Nurture</span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* AI Insights (shown when auto-scored) */}
      {aiScoring && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={18} className="text-[#EAD07D]" />
            <h3 className="text-lg font-medium text-[#1A1A1A]">AI Insights</h3>
            <span className="text-xs text-[#999] ml-auto">
              {aiScoring.provider === 'anthropic' ? 'Claude' : 'OpenAI'} &middot; {new Date(aiScoring.scoredAt).toLocaleDateString()}
            </span>
          </div>

          {/* Reasoning */}
          <p className="text-sm text-[#666] mb-4 p-3 bg-[#F8F8F6] rounded-xl">{aiScoring.reasoning}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strengths */}
            {aiScoring.strengths?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle size={14} className="text-[#93C01F]" />
                  <h4 className="text-sm font-medium text-[#1A1A1A]">Strengths</h4>
                </div>
                <ul className="space-y-1.5">
                  {aiScoring.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
                      <span className="w-1 h-1 rounded-full bg-[#93C01F] mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {aiScoring.weaknesses?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={14} className="text-orange-400" />
                  <h4 className="text-sm font-medium text-[#1A1A1A]">Risks</h4>
                </div>
                <ul className="space-y-1.5">
                  {aiScoring.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
                      <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {aiScoring.recommendations?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={14} className="text-[#EAD07D]" />
                  <h4 className="text-sm font-medium text-[#1A1A1A]">Next Steps</h4>
                </div>
                <ul className="space-y-1.5">
                  {aiScoring.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
                      <span className="w-4 h-4 rounded-full bg-[#EAD07D] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A] shrink-0">
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
