import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Brain, AlertTriangle, Lightbulb, Shield, Sparkles, ExternalLink, FileText, Link2 } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDeal, useDeals, useOpportunityContacts, useContacts } from '../../src/hooks';
import {
  formatDateForInput,
  STAGES,
  EditFormData,
  DealSidebar,
  DealHeader,
  BuyerCommittee,
  DealAccordions,
  DealCharts,
  EditDealModal,
  CloseWonModal,
  CloseLostModal,
} from '../../src/components/deals';
import { DealAnalysisWidget, AIEmailDraftButton } from '../../src/components/ai';
import { SplitManager } from '../../components/splits';
import { adminApi, IntegrationEntityMapping, IntegrationAttachment } from '../../src/api/admin';
import { FieldChangeHistory } from '../../src/components/audit/FieldChangeHistory';
import { DetailBreadcrumb } from '../../src/components/shared/DetailBreadcrumb';
import { QuickLogActivity } from '../../src/components/shared/QuickLogActivity';
import type { OpportunityStage } from '../../src/types';

export const DealDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deal, analysis, loading, error, fetchAnalysis, refetch } = useDeal(id);
  const {
    deals: recentDeals,
    loading: dealsLoading,
    update,
    advanceStage,
    closeWon,
    closeLost,
  } = useDeals();

  // Buyer Committee
  const {
    contacts: buyerCommittee,
    loading: buyerCommitteeLoading,
    addContact,
    removeContact,
    setPrimary,
    isAdding: isAddingContact,
    isRemoving: isRemovingContact,
  } = useOpportunityContacts(id);

  // Available contacts for buyer committee
  const { contacts: availableContacts, loading: contactsLoading } = useContacts(
    deal?.accountId ? { accountId: deal.accountId } : undefined
  );

  // UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basic']));
  const [analyzingDeal, setAnalyzingDeal] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [showCloseWonModal, setShowCloseWonModal] = useState(false);
  const [showCloseLostModal, setShowCloseLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');

  // Integration external links & attachments
  const [externalMappings, setExternalMappings] = useState<IntegrationEntityMapping[]>([]);
  const [externalAttachments, setExternalAttachments] = useState<IntegrationAttachment[]>([]);

  useEffect(() => {
    if (!id) return;
    adminApi.getIntegrationMappings('opportunity', id).then(setExternalMappings).catch(() => {});
    adminApi.getIntegrationAttachments('opportunity', id).then(setExternalAttachments).catch(() => {});
  }, [id]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    amount: 0,
    probability: 50,
    closeDate: '',
    stage: 'PROSPECTING',
    type: 'NEW_BUSINESS',
    nextStep: '',
    needsAnalysis: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize edit form when deal loads
  useEffect(() => {
    if (deal) {
      setEditForm({
        name: deal.name || '',
        amount: deal.amount || 0,
        probability: deal.probability || 50,
        closeDate: formatDateForInput(deal.closeDate),
        stage: deal.stage || 'PROSPECTING',
        type: deal.type || 'NEW_BUSINESS',
        nextStep: deal.nextStep || '',
        needsAnalysis: deal.needsAnalysis || '',
      });
    }
  }, [deal]);

  const handleAnalyze = async () => {
    setAnalyzingDeal(true);
    try {
      await fetchAnalysis();
    } finally {
      setAnalyzingDeal(false);
    }
  };

  const handleStageChange = async (newStage: OpportunityStage) => {
    if (!deal || stageUpdating) return;
    setStageUpdating(true);
    try {
      await update(deal.id, { stage: newStage });
      await refetch();
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!deal || stageUpdating) return;
    const currentIndex = STAGES.indexOf(deal.stage);
    if (currentIndex >= 7) return;
    setStageUpdating(true);
    try {
      await advanceStage(deal.id);
      await refetch();
    } catch (err) {
      console.error('Failed to advance stage:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleCloseWon = async () => {
    if (!deal || stageUpdating) return;
    setStageUpdating(true);
    try {
      await closeWon(deal.id, { finalAmount: deal.amount });
      setShowCloseWonModal(false);
      await refetch();
    } catch (err) {
      console.error('Failed to close won:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleCloseLost = async () => {
    if (!deal || stageUpdating || !lostReason.trim()) return;
    setStageUpdating(true);
    try {
      await closeLost(deal.id, { lostReason: lostReason.trim() });
      setShowCloseLostModal(false);
      setLostReason('');
      await refetch();
    } catch (err) {
      console.error('Failed to close lost:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!deal || isSaving) return;
    setIsSaving(true);
    try {
      await update(deal.id, {
        name: editForm.name,
        amount: editForm.amount,
        probability: editForm.probability,
        closeDate: editForm.closeDate ? new Date(editForm.closeDate).toISOString() : undefined,
        stage: editForm.stage,
        type: editForm.type,
        nextStep: editForm.nextStep || undefined,
        needsAnalysis: editForm.needsAnalysis || undefined,
      });
      setShowEditModal(false);
      await refetch();
    } catch (err) {
      console.error('Failed to update opportunity:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="xl:w-72 shrink-0 hidden xl:block space-y-3">
            <Skeleton className="h-5 w-28 mb-6" />
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
              <Skeleton className="lg:col-span-5 h-[320px] rounded-[2rem]" />
              <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[150px] rounded-2xl" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !deal) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Opportunity Not Found</h2>
          <p className="text-[#666] mb-8 text-center max-w-md">
            {error || 'This opportunity may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/deals')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <DetailBreadcrumb items={[
        { label: 'Deals', path: '/dashboard/deals' },
        { label: deal.name },
      ]} />
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Sidebar */}
        <DealSidebar
          currentDealId={deal.id}
          deal={deal}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header with metrics */}
          <DealHeader
            deal={deal}
            analysis={analysis}
            onEdit={() => setShowEditModal(true)}
            onAnalyze={handleAnalyze}
            onAdvanceStage={handleAdvanceStage}
            onCloseWon={() => setShowCloseWonModal(true)}
            onCloseLost={() => setShowCloseLostModal(true)}
            onEnriched={() => refetch()}
            analyzingDeal={analyzingDeal}
            stageUpdating={stageUpdating}
          />

          {/* AI Auto-Analysis Insights (shown when backend auto-analyzed) */}
          {(() => {
            const aiAnalysis = (deal as any).metadata?.aiAnalysis;
            const riskFactors = (deal as any).riskFactors || [];
            const recActions = (deal as any).recommendedActions || [];
            const aiWinProb = (deal as any).winProbability;
            if (!aiAnalysis && riskFactors.length === 0 && recActions.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={18} className="text-[#EAD07D]" />
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">AI Deal Intelligence</h3>
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-[#EAD07D]/20 rounded-full text-[10px] font-medium text-[#1A1A1A]">
                    <Sparkles size={10} />
                    Auto-Analyzed
                  </span>
                  {aiAnalysis?.provider && (
                    <span className="text-[10px] text-[#999] ml-auto">
                      {aiAnalysis.provider === 'anthropic' ? 'Claude' : 'OpenAI'} &middot; {aiAnalysis.analyzedAt ? new Date(aiAnalysis.analyzedAt).toLocaleDateString() : ''}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Win Probability */}
                  {aiWinProb != null && (
                    <div className="bg-[#F8F8F6] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield size={14} className={aiWinProb >= 0.6 ? 'text-[#93C01F]' : aiWinProb >= 0.3 ? 'text-[#EAD07D]' : 'text-red-400'} />
                        <span className="text-xs font-medium text-[#1A1A1A]">Win Probability</span>
                      </div>
                      <div className="text-3xl font-light text-[#1A1A1A]">{Math.round(aiWinProb * 100)}%</div>
                      <div className="h-1.5 bg-[#F0EBD8] rounded-full mt-2 overflow-hidden">
                        <div className={`h-full rounded-full ${aiWinProb >= 0.6 ? 'bg-[#93C01F]' : aiWinProb >= 0.3 ? 'bg-[#EAD07D]' : 'bg-red-400'}`} style={{ width: `${aiWinProb * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {/* Risk Factors */}
                  {riskFactors.length > 0 && (
                    <div className="bg-[#F8F8F6] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={14} className="text-orange-400" />
                        <span className="text-xs font-medium text-[#1A1A1A]">Risk Factors</span>
                      </div>
                      <ul className="space-y-1.5">
                        {riskFactors.slice(0, 4).map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
                            <span className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Recommended Actions */}
                  {recActions.length > 0 && (
                    <div className="bg-[#F8F8F6] rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb size={14} className="text-[#EAD07D]" />
                        <span className="text-xs font-medium text-[#1A1A1A]">Recommended Actions</span>
                      </div>
                      <ul className="space-y-1.5">
                        {recActions.slice(0, 4).map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[#666]">
                            <span className="w-4 h-4 rounded-full bg-[#EAD07D] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A] shrink-0">{i + 1}</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* External Integration Links & Attachments */}
          {(externalMappings.length > 0 || externalAttachments.length > 0) && (
            <div className="bg-white rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 size={18} className="text-[#EAD07D]" />
                <h3 className="text-sm font-semibold text-[#1A1A1A]">External Integrations</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {externalMappings.map(mapping => (
                  <a
                    key={mapping.id}
                    href={mapping.externalUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <ExternalLink size={14} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1A1A1A] capitalize">{mapping.provider}</div>
                      <div className="text-xs text-[#999] truncate">ID: {mapping.externalId}</div>
                    </div>
                    <span className="text-xs text-[#999]">{new Date(mapping.lastSyncedAt).toLocaleDateString()}</span>
                  </a>
                ))}
                {externalAttachments.map(att => (
                  <a
                    key={att.id}
                    href={att.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      <FileText size={14} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1A1A1A]">{att.fileName}</div>
                      <div className="text-xs text-[#999] capitalize">{att.provider} &middot; {att.fileType || 'file'}</div>
                    </div>
                    <span className="text-xs text-[#999]">{new Date(att.createdAt).toLocaleDateString()}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Section: Accordions + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Accordions + Buyer Committee + AI Analysis */}
            <div className="lg:col-span-5 space-y-4">
              <DealAccordions
                deal={deal}
                analysis={analysis}
                openSections={openSections}
                onToggleSection={(section) => {
                  setOpenSections((prev) => {
                    const next = new Set(prev);
                    if (next.has(section)) next.delete(section);
                    else next.add(section);
                    return next;
                  });
                }}
                onEdit={() => setShowEditModal(true)}
                onAnalyze={handleAnalyze}
                onStageChange={handleStageChange}
                analyzingDeal={analyzingDeal}
                stageUpdating={stageUpdating}
              />
              <BuyerCommittee
                members={buyerCommittee}
                loading={buyerCommitteeLoading}
                availableContacts={availableContacts}
                contactsLoading={contactsLoading}
                accountId={deal.accountId}
                onAddContact={addContact}
                onRemoveContact={removeContact}
                onSetPrimary={setPrimary}
                isAdding={isAddingContact}
                isRemoving={isRemovingContact}
              />

              {/* AI Deal Analysis Widget */}
              <DealAnalysisWidget
                deal={{
                  id: deal.id,
                  name: deal.name,
                  value: deal.amount || 0,
                  stage: deal.stage,
                  probability: deal.probability,
                  notes: deal.needsAnalysis,
                  daysInStage: deal.lastActivityDate
                    ? Math.floor((Date.now() - new Date(deal.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
                    : undefined,
                  contacts: buyerCommittee?.map((c) => ({
                    name: `${c.firstName} ${c.lastName}`,
                    title: c.title || '',
                    engagement: c.role || 'stakeholder',
                  })),
                  competitors: deal.competitors,
                }}
              />
            </div>

            {/* Right: Charts + Activity + History + Splits */}
            <div className="lg:col-span-7 space-y-4">
              <DealCharts deal={deal} analysis={analysis} />

              {/* Quick Log Activity */}
              <QuickLogActivity entityType="opportunity" entityId={deal.id} />

              {/* Field Change History */}
              <FieldChangeHistory entityType="opportunity" entityId={deal.id} />

              {/* Revenue Splits */}
              <SplitManager
                opportunityId={deal.id}
                dealAmount={deal.amount || 0}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditDealModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        form={editForm}
        onChange={(updates) => setEditForm({ ...editForm, ...updates })}
        isSaving={isSaving}
      />

      <CloseWonModal
        isOpen={showCloseWonModal}
        onClose={() => setShowCloseWonModal(false)}
        onConfirm={handleCloseWon}
        deal={deal}
        isUpdating={stageUpdating}
      />

      <CloseLostModal
        isOpen={showCloseLostModal}
        onClose={() => setShowCloseLostModal(false)}
        onConfirm={handleCloseLost}
        deal={deal}
        reason={lostReason}
        onReasonChange={setLostReason}
        isUpdating={stageUpdating}
      />
    </div>
  );
};
