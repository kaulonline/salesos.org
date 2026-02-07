import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Sparkles, Clock, Loader2, Pencil } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { ContactTimeline } from '../../../components/dashboard';
import { STAGES, formatDate, getStageLabel } from './types';
import type { Opportunity, OpportunityStage, OpportunityAnalysis } from '../../types';

interface DealAccordionsProps {
  deal: Opportunity;
  analysis: OpportunityAnalysis | null;
  openSection: string | null;
  onToggleSection: (section: string) => void;
  onEdit: () => void;
  onAnalyze: () => void;
  onStageChange: (stage: OpportunityStage) => void;
  analyzingDeal: boolean;
  stageUpdating: boolean;
}

export const DealAccordions: React.FC<DealAccordionsProps> = ({
  deal,
  analysis,
  openSection,
  onToggleSection,
  onEdit,
  onAnalyze,
  onStageChange,
  analyzingDeal,
  stageUpdating,
}) => {
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  const handleStageSelect = (stage: OpportunityStage) => {
    setShowStageDropdown(false);
    onStageChange(stage);
  };

  return (
    <div className="space-y-4">
      {/* Basic Information Accordion */}
      <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
        <button
          onClick={() => onToggleSection('basic')}
          className="w-full flex justify-between items-center px-5 py-4 text-[#1A1A1A] font-semibold text-sm hover:bg-[#FAFAFA] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} className="text-[#999]" />
            Basic Information
          </span>
          {openSection === 'basic' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'basic' && (
          <div className="px-5 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center py-2 border-b border-[#F2F1EA]">
              <span className="text-xs text-[#888]">Opportunity ID</span>
              <span className="text-xs font-mono font-medium text-[#1A1A1A] bg-[#F2F1EA] px-2 py-0.5 rounded">
                {deal.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F2F1EA] relative">
              <span className="text-xs text-[#888]">Stage</span>
              <div className="relative">
                <button
                  onClick={() => setShowStageDropdown(!showStageDropdown)}
                  disabled={stageUpdating}
                  className="flex items-center gap-1 text-xs font-semibold text-[#1A1A1A] hover:text-[#EAD07D] transition-colors disabled:opacity-50"
                >
                  {stageUpdating && <Loader2 size={10} className="animate-spin" />}
                  {getStageLabel(deal.stage)}
                  <ChevronDown size={12} className={`transition-transform ${showStageDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showStageDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStageDropdown(false)} />
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-[#F2F1EA] py-1 z-50 max-h-60 overflow-y-auto">
                      {STAGES.map((stage) => (
                        <button
                          key={stage}
                          onClick={() => handleStageSelect(stage)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-[#F8F8F6] transition-colors ${
                            deal.stage === stage ? 'bg-[#EAD07D]/20 font-semibold' : ''
                          }`}
                        >
                          {getStageLabel(stage)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F2F1EA]">
              <span className="text-xs text-[#888]">Close Date</span>
              <span className="text-xs font-semibold text-[#1A1A1A]">{formatDate(deal.closeDate)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F2F1EA]">
              <span className="text-xs text-[#888]">Probability</span>
              <span className="text-xs font-semibold text-[#1A1A1A]">{deal.probability || 50}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-[#888]">Created</span>
              <span className="text-xs font-semibold text-[#1A1A1A]">{formatDate(deal.createdAt)}</span>
            </div>
            <button
              onClick={onEdit}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F2F1EA] text-[#1A1A1A] rounded-xl text-xs font-semibold hover:bg-[#E5E5E5] transition-colors"
            >
              <Pencil size={14} />
              Edit Details
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis Accordion */}
      <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
        <button
          onClick={() => onToggleSection('analysis')}
          className="w-full flex justify-between items-center px-5 py-4 text-[#1A1A1A] font-semibold text-sm hover:bg-[#FAFAFA] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#EAD07D]" />
            AI Analysis
          </span>
          {openSection === 'analysis' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'analysis' && (
          <div className="px-5 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {analysis ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#888]">Deal Health</span>
                  <Badge
                    variant={
                      analysis.dealHealth === 'HEALTHY' ? 'success' :
                      analysis.dealHealth === 'AT_RISK' ? 'warning' : 'danger'
                    }
                    size="sm"
                  >
                    {analysis.dealHealth}
                  </Badge>
                </div>
                {analysis.riskFactors && analysis.riskFactors.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-2">
                      Risk Factors
                    </div>
                    <div className="space-y-1.5">
                      {analysis.riskFactors.slice(0, 3).map((risk, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#666]">
                          <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                            risk.severity === 'HIGH' ? 'bg-red-400' :
                            risk.severity === 'MEDIUM' ? 'bg-amber-400' : 'bg-gray-300'
                          }`} />
                          <span>{typeof risk === 'string' ? risk : risk.factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-[#999] uppercase tracking-wider mb-2">
                      Recommended Actions
                    </div>
                    <div className="space-y-1.5">
                      {analysis.recommendedActions.slice(0, 3).map((action, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-[#666]">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 bg-[#EAD07D]" />
                          <span>{typeof action === 'string' ? action : action.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} className="text-[#999]" />
                </div>
                <p className="text-xs text-[#888] mb-4">No analysis yet</p>
                <button
                  onClick={onAnalyze}
                  disabled={analyzingDeal}
                  className="text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C56B] transition-colors disabled:opacity-50"
                >
                  {analyzingDeal ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Timeline Accordion */}
      <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
        <button
          onClick={() => onToggleSection('timeline')}
          className="w-full flex justify-between items-center px-5 py-4 text-[#1A1A1A] font-semibold text-sm hover:bg-[#FAFAFA] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Clock size={16} className="text-[#888]" />
            Activity Timeline
          </span>
          {openSection === 'timeline' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {openSection === 'timeline' && (
          <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
            <ContactTimeline opportunityId={deal.id} limit={4} />
          </div>
        )}
      </div>
    </div>
  );
};
