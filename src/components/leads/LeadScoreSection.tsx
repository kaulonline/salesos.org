import React from 'react';
import { Mail, Phone, Edit3, TrendingUp, Target, Clock, Brain, CheckCircle, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
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
  const fullName = `${lead.firstName} ${lead.lastName}`;
  const aiScoring: AIScoringData | null = (lead as any).metadata?.aiScoring || null;

  return (
    <div className="lg:col-span-7 space-y-6">
      {/* Score Breakdown */}
      <Card className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium text-[#1A1A1A]">Lead Score Breakdown</h3>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666]">Engagement</span>
                <span className="font-bold text-[#1A1A1A]">
                  {Math.min((lead.leadScore || 0) * 0.4, 40).toFixed(0)}/40
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EAD07D] rounded-full"
                  style={{ width: `${Math.min((lead.leadScore || 0), 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666]">Fit Score</span>
                <span className="font-bold text-[#1A1A1A]">
                  {Math.min((lead.leadScore || 0) * 0.35, 35).toFixed(0)}/35
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A1A1A] rounded-full"
                  style={{ width: `${Math.min((lead.leadScore || 0) * 0.9, 90)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666]">Intent</span>
                <span className="font-bold text-[#1A1A1A]">
                  {Math.min((lead.leadScore || 0) * 0.25, 25).toFixed(0)}/25
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#999] rounded-full"
                  style={{ width: `${Math.min((lead.leadScore || 0) * 0.8, 80)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center bg-[#F8F8F6] rounded-2xl p-6">
            <div className="text-6xl font-light text-[#1A1A1A] mb-2">{lead.leadScore || 0}</div>
            <div className="text-sm text-[#666]">Overall Lead Score</div>
            {aiScoring && (
              <div className="text-xs text-[#999] mt-1">{aiScoring.confidence}% confidence</div>
            )}
            <div className="mt-4 flex items-center gap-2">
              {lead.leadScore && lead.leadScore >= 70 ? (
                <>
                  <TrendingUp size={16} className="text-[#93C01F]" />
                  <span className="text-sm font-medium text-[#1A1A1A]">High Priority</span>
                </>
              ) : lead.leadScore && lead.leadScore >= 40 ? (
                <>
                  <Target size={16} className="text-[#EAD07D]" />
                  <span className="text-sm font-medium text-[#1A1A1A]">Medium Priority</span>
                </>
              ) : (
                <>
                  <Clock size={16} className="text-[#999]" />
                  <span className="text-sm font-medium text-[#666]">Nurture</span>
                </>
              )}
            </div>
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

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
            >
              <Mail size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
              <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Send Email</span>
            </a>
          )}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
            >
              <Phone size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
              <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Call</span>
            </a>
          )}
          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
          >
            <Edit3 size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
            <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Edit</span>
          </button>
          <button
            onClick={onConvert}
            disabled={lead.status === 'CONVERTED'}
            className="flex flex-col items-center gap-2 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#333] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp size={20} className="text-white" />
            <span className="text-xs font-medium text-white">Convert</span>
          </button>
        </div>
      </Card>
    </div>
  );
};
