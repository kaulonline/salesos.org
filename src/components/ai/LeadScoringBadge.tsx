import React, { useState } from 'react';
import { Target, Loader2, Info, X } from 'lucide-react';
import { useScoreLead } from '../../hooks/useAI';
import { LeadScoreRequest, LeadScoreResponse } from '../../api/ai';

interface LeadScoringBadgeProps {
  lead: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    title?: string;
    source?: string;
    industry?: string;
    companySize?: string;
    engagementLevel?: string;
    activities?: Array<{ type: string; date: string }>;
  };
  existingScore?: number;
  onScoreUpdated?: (score: number, reasoning: string) => void;
  className?: string;
}

export const LeadScoringBadge: React.FC<LeadScoringBadgeProps> = ({
  lead,
  existingScore,
  onScoreUpdated,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [scoreData, setScoreData] = useState<LeadScoreResponse | null>(null);

  const { mutate: scoreLead, isPending } = useScoreLead();

  const handleScore = () => {
    const request: LeadScoreRequest = {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      title: lead.title,
      source: lead.source,
      industry: lead.industry,
      companySize: lead.companySize,
      activities: lead.activities,
      engagementLevel: lead.engagementLevel,
    };

    scoreLead(
      { request },
      {
        onSuccess: (response) => {
          setScoreData(response);
          if (onScoreUpdated) {
            onScoreUpdated(response.score, response.reasoning);
          }
        },
        onError: (error) => {
          console.error('Failed to score lead:', error);
        },
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-[#93C01F] text-white';
    if (score >= 60) return 'bg-[#EAD07D] text-[#1A1A1A]';
    if (score >= 40) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot';
    if (score >= 60) return 'Warm';
    if (score >= 40) return 'Cool';
    return 'Cold';
  };

  const displayScore = scoreData?.score ?? existingScore;

  if (displayScore === undefined) {
    return (
      <button
        onClick={handleScore}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-xs font-medium hover:bg-[#e5c86b] transition-all disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Target size={12} />
        )}
        {isPending ? 'Scoring...' : 'AI Score'}
      </button>
    );
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDetails(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${getScoreColor(displayScore)} transition-all hover:opacity-90`}
        >
          <Target size={14} />
          <span>{displayScore}</span>
          <span className="text-xs opacity-80">({getScoreLabel(displayScore)})</span>
          {scoreData && <Info size={12} className="opacity-60" />}
        </button>

        {/* Refresh button */}
        <button
          onClick={handleScore}
          disabled={isPending}
          className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm border border-black/10 flex items-center justify-center text-[#666] hover:text-[#1A1A1A] transition-colors"
          title="Refresh score"
        >
          {isPending ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Target size={10} />
          )}
        </button>
      </div>

      {/* Details Modal */}
      {showDetails && scoreData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getScoreColor(scoreData.score)}`}>
                  <span className="text-xl font-bold">{scoreData.score}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Lead Score Details</h2>
                  <p className="text-sm text-[#666]">
                    {getScoreLabel(scoreData.score)} Lead • {scoreData.confidence}% confidence
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Reasoning */}
              <div className="p-3 bg-[#F8F8F6] rounded-xl">
                <p className="text-sm text-[#666]">{scoreData.reasoning}</p>
              </div>

              {/* Strengths */}
              {scoreData.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {scoreData.strengths.map((strength, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-[#666]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#93C01F]" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {scoreData.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">Weaknesses</h4>
                  <ul className="space-y-1">
                    {scoreData.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-[#666]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {scoreData.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {scoreData.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-[#666]">
                        <span className="w-5 h-5 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs font-semibold text-[#1A1A1A]">
                          {index + 1}
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Provider Badge */}
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <span className="text-xs text-[#999]">
                  Powered by {scoreData.provider === 'anthropic' ? 'Claude' : 'OpenAI'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadScoringBadge;
