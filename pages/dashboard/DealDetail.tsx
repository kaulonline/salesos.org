import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
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
  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [analyzingDeal, setAnalyzingDeal] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [showCloseWonModal, setShowCloseWonModal] = useState(false);
  const [showCloseLostModal, setShowCloseLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');

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
              <Skeleton className="lg:col-span-8 h-[320px] rounded-[2rem]" />
              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
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
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Sidebar */}
        <DealSidebar
          currentDealId={deal.id}
          deals={recentDeals}
          loading={dealsLoading}
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
            analyzingDeal={analyzingDeal}
            stageUpdating={stageUpdating}
          />

          {/* Bottom Section: Accordions + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Accordions + Buyer Committee */}
            <div className="lg:col-span-4 space-y-4">
              <DealAccordions
                deal={deal}
                analysis={analysis}
                openSection={openSection}
                onToggleSection={(section) => setOpenSection(openSection === section ? null : section)}
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
            </div>

            {/* Right: Charts */}
            <DealCharts deal={deal} analysis={analysis} />
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
