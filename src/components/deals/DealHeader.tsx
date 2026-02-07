import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Sparkles, Pencil, ArrowRight, Check, X, Loader2,
  DollarSign, Target, Clock, TrendingUp, Briefcase
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import {
  formatCurrency,
  formatCompactCurrency,
  getStageLabel,
  getStageIndex,
  calculateDaysInStage,
} from './types';
import type { Opportunity, OpportunityAnalysis } from '../../types';

interface DealHeaderProps {
  deal: Opportunity;
  analysis: OpportunityAnalysis | null;
  onEdit: () => void;
  onAnalyze: () => void;
  onAdvanceStage: () => void;
  onCloseWon: () => void;
  onCloseLost: () => void;
  analyzingDeal: boolean;
  stageUpdating: boolean;
}

export const DealHeader: React.FC<DealHeaderProps> = ({
  deal,
  analysis,
  onEdit,
  onAnalyze,
  onAdvanceStage,
  onCloseWon,
  onCloseLost,
  analyzingDeal,
  stageUpdating,
}) => {
  const isClosedStage = deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST';
  const canAdvance = !isClosedStage && getStageIndex(deal.stage) < 7;
  const daysInStage = calculateDaysInStage(deal.lastActivityDate);
  const stageIndex = getStageIndex(deal.stage);
  const winProbability = analysis?.winProbability || deal.winProbability || deal.probability || 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
      {/* Hero Profile Card */}
      <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#EAD07D]/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-6">
          {/* Deal Icon */}
          <div className="shrink-0">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-[#EAD07D] to-[#E5C56B] flex items-center justify-center shadow-lg shadow-[#EAD07D]/30">
              <Briefcase size={40} className="text-[#1A1A1A]" />
            </div>
          </div>

          {/* Deal Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-[#1A1A1A] mb-1 leading-tight">
                  {deal.name}
                </h1>
                <div className="flex items-center gap-2 text-[#666]">
                  <Building2 size={14} />
                  {deal.accountId ? (
                    <Link to={`/dashboard/companies/${deal.accountId}`} className="hover:text-[#EAD07D] transition-colors">
                      {deal.account?.name || 'Unknown Company'}
                    </Link>
                  ) : (
                    <span>{deal.account?.name || 'Unknown Company'}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="w-9 h-9 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-all"
                  title="Edit Opportunity"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={onAnalyze}
                  disabled={analyzingDeal}
                  className="w-9 h-9 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-all disabled:opacity-50"
                  title="AI Analysis"
                >
                  <Sparkles size={16} className={analyzingDeal ? 'animate-pulse' : ''} />
                </button>
              </div>
            </div>

            {/* Stage Action Buttons */}
            {!isClosedStage && (
              <div className="flex flex-wrap gap-2 mb-4">
                {canAdvance && (
                  <button
                    onClick={onAdvanceStage}
                    disabled={stageUpdating}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    Advance
                  </button>
                )}
                <button
                  onClick={onCloseWon}
                  disabled={stageUpdating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  Won
                </button>
                <button
                  onClick={onCloseLost}
                  disabled={stageUpdating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                  Lost
                </button>
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Badge variant="yellow" size="md" dot>
                {deal.type?.replace('_', ' ') || 'New Business'}
              </Badge>
              <Badge variant="dark" size="md">
                {getStageLabel(deal.stage)}
              </Badge>
              {deal.competitors?.slice(0, 1).map((comp, i) => (
                <Badge key={i} variant="outline" size="md">{comp}</Badge>
              ))}
            </div>

            {/* Description */}
            {deal.needsAnalysis && (
              <p className="text-[#666] text-sm leading-relaxed mb-5 max-w-xl">
                {deal.needsAnalysis}
              </p>
            )}

            {/* Next Step */}
            {deal.nextStep && (
              <div className="bg-[#F8F8F6] rounded-xl p-4 mb-5">
                <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-1">
                  Next Step
                </div>
                <p className="text-sm text-[#1A1A1A] font-medium">{deal.nextStep}</p>
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[#F2F1EA]">
              <div>
                <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-1">Account</div>
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  {deal.accountId ? (
                    <Link to={`/dashboard/companies/${deal.accountId}`} className="hover:text-[#EAD07D] transition-colors">
                      {deal.account?.name || 'Not specified'}
                    </Link>
                  ) : (
                    deal.account?.name || 'Not specified'
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-1">Source</div>
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  {deal.opportunitySource?.replace('_', ' ') || 'Direct'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-1">Value</div>
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  {formatCurrency(deal.amount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="lg:col-span-4 grid grid-cols-2 gap-4">
        {/* Value Card */}
        <div className="bg-[#EAD07D] rounded-2xl p-5 flex flex-col justify-between min-h-[140px] group hover:scale-[1.02] transition-transform">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A]/10 flex items-center justify-center mb-auto">
            <DollarSign size={16} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="flex items-baseline gap-0.5 text-[#1A1A1A] mb-1">
              <span className="text-sm font-medium opacity-70">$</span>
              <span className="text-2xl font-semibold">
                {formatCompactCurrency(deal.amount)}
              </span>
            </div>
            <div className="text-[10px] font-bold text-[#1A1A1A]/50 uppercase tracking-wider">
              Value
            </div>
          </div>
        </div>

        {/* Probability Card */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5 flex flex-col justify-between min-h-[140px] group hover:scale-[1.02] transition-transform">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-auto">
            <Target size={16} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-white mb-1">
              {deal.probability || 50}%
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              Probability
            </div>
          </div>
        </div>

        {/* Time in Stage Card */}
        <div className="bg-white rounded-2xl p-5 flex flex-col justify-between min-h-[140px] border border-[#F2F1EA] group hover:scale-[1.02] transition-transform">
          <div className="w-8 h-8 rounded-lg bg-[#F2F1EA] flex items-center justify-center mb-auto">
            <Clock size={16} className="text-[#666]" />
          </div>
          <div>
            <div className="flex items-baseline gap-0.5 text-[#1A1A1A] mb-1">
              <span className="text-2xl font-semibold">{daysInStage}</span>
              <span className="text-sm font-medium text-[#999]">d</span>
            </div>
            <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider">
              Time in Stage
            </div>
          </div>
        </div>

        {/* Stage # Card */}
        <div className="bg-[#888] rounded-2xl p-5 flex flex-col justify-between min-h-[140px] group hover:scale-[1.02] transition-transform">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-auto">
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1 text-white mb-1">
              <span className="text-2xl font-semibold">{stageIndex + 1}</span>
              <span className="text-sm font-medium text-white/50">/ 10</span>
            </div>
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
              Stage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
