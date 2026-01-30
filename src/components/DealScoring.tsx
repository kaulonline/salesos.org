import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Target,
  Zap,
} from 'lucide-react';

interface ScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  icon: React.ElementType;
}

interface DealScoringProps {
  dealId: string;
  overallScore?: number;
  probability?: number;
  stage?: string;
  amount?: number;
  daysInStage?: number;
  lastActivityDays?: number;
  hasDecisionMaker?: boolean;
  hasCompetitor?: boolean;
  hasNextSteps?: boolean;
  engagementScore?: number;
}

export const DealScoring: React.FC<DealScoringProps> = ({
  dealId,
  overallScore = 0,
  probability = 0,
  stage = '',
  amount = 0,
  daysInStage = 0,
  lastActivityDays = 0,
  hasDecisionMaker = false,
  hasCompetitor = false,
  hasNextSteps = true,
  engagementScore = 0,
}) => {
  // Calculate score factors
  const calculateEngagementScore = (): ScoreFactor => {
    let score = 0;
    if (lastActivityDays < 3) score = 25;
    else if (lastActivityDays < 7) score = 20;
    else if (lastActivityDays < 14) score = 15;
    else if (lastActivityDays < 30) score = 10;
    else score = 5;

    return {
      name: 'Engagement',
      score,
      maxScore: 25,
      trend: lastActivityDays < 7 ? 'up' : lastActivityDays > 14 ? 'down' : 'stable',
      description: `Last activity ${lastActivityDays} days ago`,
      icon: MessageSquare,
    };
  };

  const calculateStageVelocity = (): ScoreFactor => {
    const avgDaysPerStage: Record<string, number> = {
      PROSPECTING: 14,
      QUALIFICATION: 10,
      NEEDS_ANALYSIS: 14,
      VALUE_PROPOSITION: 10,
      DECISION_MAKERS_IDENTIFIED: 7,
      PROPOSAL_PRICE_QUOTE: 14,
      NEGOTIATION_REVIEW: 10,
    };
    const expectedDays = avgDaysPerStage[stage] || 14;
    let score = 0;
    if (daysInStage <= expectedDays * 0.5) score = 25;
    else if (daysInStage <= expectedDays) score = 20;
    else if (daysInStage <= expectedDays * 1.5) score = 15;
    else if (daysInStage <= expectedDays * 2) score = 10;
    else score = 5;

    return {
      name: 'Stage Velocity',
      score,
      maxScore: 25,
      trend: daysInStage <= expectedDays ? 'up' : 'down',
      description: `${daysInStage} days in current stage`,
      icon: Clock,
    };
  };

  const calculateStakeholderScore = (): ScoreFactor => {
    let score = hasDecisionMaker ? 20 : 10;

    return {
      name: 'Stakeholders',
      score,
      maxScore: 20,
      trend: hasDecisionMaker ? 'up' : 'stable',
      description: hasDecisionMaker ? 'Decision maker identified' : 'No decision maker yet',
      icon: Users,
    };
  };

  const calculateCompetitiveScore = (): ScoreFactor => {
    // If no competitor or competitor identified with strategy
    let score = hasCompetitor ? 12 : 15;

    return {
      name: 'Competitive',
      score,
      maxScore: 15,
      trend: 'stable',
      description: hasCompetitor ? 'Competition identified' : 'No competition detected',
      icon: Target,
    };
  };

  const calculateNextStepsScore = (): ScoreFactor => {
    let score = hasNextSteps ? 15 : 5;

    return {
      name: 'Next Steps',
      score,
      maxScore: 15,
      trend: hasNextSteps ? 'up' : 'down',
      description: hasNextSteps ? 'Clear next steps defined' : 'No next steps scheduled',
      icon: Calendar,
    };
  };

  const factors: ScoreFactor[] = [
    calculateEngagementScore(),
    calculateStageVelocity(),
    calculateStakeholderScore(),
    calculateCompetitiveScore(),
    calculateNextStepsScore(),
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxTotalScore = factors.reduce((sum, f) => sum + f.maxScore, 0);
  const scorePercentage = Math.round((totalScore / maxTotalScore) * 100);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-[#93C01F]';
    if (percentage >= 60) return 'text-[#EAD07D]';
    if (percentage >= 40) return 'text-[#666]';
    return 'text-[#999]';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-[#93C01F]';
    if (percentage >= 60) return 'bg-[#EAD07D]';
    if (percentage >= 40) return 'bg-[#666]';
    return 'bg-[#999]';
  };

  const getScoreLabel = (percentage: number) => {
    if (percentage >= 80) return 'Strong';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={12} className="text-[#93C01F]" />;
    if (trend === 'down') return <TrendingDown size={12} className="text-[#999]" />;
    return <Minus size={12} className="text-[#666]" />;
  };

  return (
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center">
            <Zap size={16} className="text-[#1A1A1A]" />
          </div>
          <h3 className="font-semibold text-[#1A1A1A]">Deal Score</h3>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-light ${getScoreColor(scorePercentage)}`}>
            {scorePercentage}
          </div>
          <p className="text-xs text-[#999]">{getScoreLabel(scorePercentage)}</p>
        </div>
      </div>

      {/* Score Progress */}
      <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden mb-6">
        <div
          className={`h-full ${getScoreBg(scorePercentage)} rounded-full transition-all duration-500`}
          style={{ width: `${scorePercentage}%` }}
        />
      </div>

      {/* Score Factors */}
      <div className="space-y-3">
        {factors.map((factor) => {
          const Icon = factor.icon;
          const factorPercentage = (factor.score / factor.maxScore) * 100;

          return (
            <div key={factor.name} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#F8F8F6] flex items-center justify-center">
                <Icon size={14} className="text-[#666]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#1A1A1A]">{factor.name}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(factor.trend)}
                    <span className="text-xs text-[#666]">
                      {factor.score}/{factor.maxScore}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#F0EBD8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      factorPercentage >= 70 ? 'bg-[#93C01F]' : factorPercentage >= 50 ? 'bg-[#EAD07D]' : 'bg-[#999]'
                    }`}
                    style={{ width: `${factorPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-[#999] mt-0.5">{factor.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {scorePercentage < 70 && (
        <div className="mt-4 pt-4 border-t border-black/5">
          <p className="text-xs font-medium text-[#666] mb-2">Recommendations</p>
          <div className="space-y-2">
            {!hasDecisionMaker && (
              <div className="flex items-start gap-2 text-xs text-[#666]">
                <AlertTriangle size={12} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                <span>Identify and engage the decision maker</span>
              </div>
            )}
            {lastActivityDays > 7 && (
              <div className="flex items-start gap-2 text-xs text-[#666]">
                <AlertTriangle size={12} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                <span>Re-engage with the prospect - it's been {lastActivityDays} days</span>
              </div>
            )}
            {!hasNextSteps && (
              <div className="flex items-start gap-2 text-xs text-[#666]">
                <AlertTriangle size={12} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                <span>Schedule next steps to maintain momentum</span>
              </div>
            )}
            {daysInStage > 14 && (
              <div className="flex items-start gap-2 text-xs text-[#666]">
                <AlertTriangle size={12} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                <span>Deal is stalling - consider escalation or new approach</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DealScoring;
