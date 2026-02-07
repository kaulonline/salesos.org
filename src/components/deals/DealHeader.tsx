import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Sparkles, Pencil, ArrowRight, Check, X, Loader2,
  DollarSign, Target, Clock, TrendingUp, Briefcase
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { EnrichButton } from '../enrichment';
import { AIEmailDraftButton } from '../ai';
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
  onEnriched?: () => void;
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
  onEnriched,
  analyzingDeal,
  stageUpdating,
}) => {
  // Get primary contact for AI Draft
  const primaryContact = deal.contacts?.[0];
  const primaryContactName = primaryContact
    ? `${primaryContact.contact?.firstName || ''} ${primaryContact.contact?.lastName || ''}`.trim()
    : null;
  const isClosedStage = deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST';
  const canAdvance = !isClosedStage && getStageIndex(deal.stage) < 7;
  const daysInStage = calculateDaysInStage(deal.lastActivityDate);
  const stageIndex = getStageIndex(deal.stage);
  const winProbability = analysis?.winProbability || deal.winProbability || deal.probability || 50;

  return (
    <div className="mb-5">
      {/* Main Header Card */}
      <div className="bg-white rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Icon + Basic Info */}
          <div className="flex gap-5 flex-1 min-w-0">
            {/* Deal Icon */}
            <div className="shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-[#EAD07D] flex items-center justify-center shadow-md">
                <Briefcase size={32} className="text-[#1A1A1A]" />
              </div>
            </div>

            {/* Deal Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold text-[#1A1A1A] truncate">{deal.name}</h1>
                  <div className="flex items-center gap-2 text-[#666]">
                    <Building2 size={14} />
                    {deal.accountId ? (
                      <Link to={`/dashboard/companies/${deal.accountId}`} className="hover:text-[#EAD07D] transition-colors truncate">
                        {deal.account?.name || 'Unknown Company'}
                      </Link>
                    ) : (
                      <span className="truncate">{deal.account?.name || 'Unknown Company'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="yellow" size="sm" dot>
                  {deal.type?.replace('_', ' ') || 'New Business'}
                </Badge>
                <Badge variant="dark" size="sm">
                  {getStageLabel(deal.stage)}
                </Badge>
                {deal.competitors?.slice(0, 1).map((comp, i) => (
                  <Badge key={i} variant="outline" size="sm">{comp}</Badge>
                ))}
              </div>

              {/* Info Row */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <span className="text-[#1A1A1A] font-semibold">{formatCurrency(deal.amount)}</span>
                <span className="text-[#666]">
                  <span className="text-[#999]">Source:</span> {deal.opportunitySource?.replace('_', ' ') || 'Direct'}
                </span>
                {deal.closeDate && (
                  <span className="text-[#666]">
                    <span className="text-[#999]">Close:</span> {new Date(deal.closeDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Next Step */}
              {deal.nextStep && (
                <div className="mt-3 p-3 bg-[#F8F8F6] rounded-xl">
                  <span className="text-xs text-[#999] uppercase font-semibold">Next: </span>
                  <span className="text-sm text-[#1A1A1A]">{deal.nextStep}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions + Stats */}
          <div className="flex flex-col gap-4 lg:items-end">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onEdit}
                className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-all"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={onAnalyze}
                disabled={analyzingDeal}
                className="w-9 h-9 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-all disabled:opacity-50"
                title="AI Analysis"
              >
                <Sparkles size={16} className={analyzingDeal ? 'animate-pulse' : ''} />
              </button>
              {primaryContactName && primaryContact?.contact?.email && (
                <AIEmailDraftButton
                  recipientName={primaryContactName}
                  recipientCompany={deal.account?.name}
                  recipientTitle={primaryContact?.contact?.title}
                  purpose="follow_up"
                  dealStage={deal.stage}
                  dealValue={deal.amount}
                  competitors={deal.competitors}
                />
              )}
              {deal.accountId && (
                <EnrichButton
                  entityType="account"
                  entityId={deal.accountId}
                  entityName={deal.account?.name || deal.name}
                  onEnriched={onEnriched}
                />
              )}
              {!isClosedStage && (
                <>
                  {canAdvance && (
                    <button
                      onClick={onAdvanceStage}
                      disabled={stageUpdating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                      {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                      Advance
                    </button>
                  )}
                  <button
                    onClick={onCloseWon}
                    disabled={stageUpdating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#93C01F] text-white rounded-full text-sm font-medium hover:bg-[#7da319] transition-colors disabled:opacity-50"
                  >
                    <Check size={14} />
                    Won
                  </button>
                  <button
                    onClick={onCloseLost}
                    disabled={stageUpdating}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                    Lost
                  </button>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-3">
              <div className="bg-[#EAD07D] rounded-xl px-4 py-2 text-center min-w-[90px]">
                <div className="text-xl font-bold text-[#1A1A1A]">{formatCompactCurrency(deal.amount)}</div>
                <div className="text-[10px] text-[#1A1A1A]/60 uppercase font-semibold">Value</div>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl px-4 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-white">{deal.probability || 50}%</div>
                <div className="text-[10px] text-white/50 uppercase font-semibold">Prob</div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl px-4 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-[#1A1A1A]">{daysInStage}d</div>
                <div className="text-[10px] text-[#999] uppercase font-semibold">In Stage</div>
              </div>
              <div className="bg-[#666] rounded-xl px-4 py-2 text-center min-w-[70px]">
                <div className="text-xl font-bold text-white">{stageIndex + 1}/10</div>
                <div className="text-[10px] text-white/60 uppercase font-semibold">Stage</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
