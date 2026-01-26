import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronUp, AlertCircle, Building2,
  Sparkles, Check, X, ArrowRight, Loader2, Users, Plus,
  UserPlus, Trash2, Calendar, DollarSign, Target, Clock,
  TrendingUp, Briefcase, Pencil, Save
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ContactTimeline } from '../../components/dashboard';
import { useDeal, useDeals, useOpportunityContacts, useContacts } from '../../src/hooks';
import type { OpportunityStage, OpportunityContactRole } from '../../src/types';

// All available stages in order
const STAGES: OpportunityStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'NEEDS_ANALYSIS',
  'VALUE_PROPOSITION',
  'DECISION_MAKERS_IDENTIFIED',
  'PERCEPTION_ANALYSIS',
  'PROPOSAL_PRICE_QUOTE',
  'NEGOTIATION_REVIEW',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const OPPORTUNITY_TYPES = [
  'NEW_BUSINESS',
  'EXISTING_BUSINESS',
  'RENEWAL',
  'UPSELL',
  'CROSS_SELL',
];

const formatCurrency = (amount?: number) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (amount?: number) => {
  if (!amount) return '0';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
};

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateForInput = (date?: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const getStageLabel = (stage: OpportunityStage) => {
  const labels: Record<OpportunityStage, string> = {
    'PROSPECTING': 'Prospecting',
    'QUALIFICATION': 'Qualification',
    'NEEDS_ANALYSIS': 'Needs Analysis',
    'VALUE_PROPOSITION': 'Value Proposition',
    'DECISION_MAKERS_IDENTIFIED': 'Decision Makers',
    'PERCEPTION_ANALYSIS': 'Perception Analysis',
    'PROPOSAL_PRICE_QUOTE': 'Proposal',
    'NEGOTIATION_REVIEW': 'Negotiation',
    'CLOSED_WON': 'Closed Won',
    'CLOSED_LOST': 'Closed Lost',
  };
  return labels[stage] || stage;
};

const getStageIndex = (stage: OpportunityStage): number => {
  return STAGES.indexOf(stage);
};

const calculateDaysInStage = (lastActivityDate?: string) => {
  if (!lastActivityDate) return 0;
  const now = new Date();
  const lastActivity = new Date(lastActivityDate);
  const diffDays = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Buyer Committee role labels
const getRoleLabel = (role: OpportunityContactRole) => {
  const labels: Record<OpportunityContactRole, string> = {
    'DECISION_MAKER': 'Decision Maker',
    'ECONOMIC_BUYER': 'Economic Buyer',
    'CHAMPION': 'Champion',
    'INFLUENCER': 'Influencer',
    'TECHNICAL_BUYER': 'Technical Buyer',
    'END_USER': 'End User',
    'BLOCKER': 'Blocker',
    'EVALUATOR': 'Evaluator',
    'GATEKEEPER': 'Gatekeeper',
    'LEGAL': 'Legal',
    'PROCUREMENT': 'Procurement',
    'OTHER': 'Other',
  };
  return labels[role] || role;
};

const OPPORTUNITY_CONTACT_ROLES: OpportunityContactRole[] = [
  'DECISION_MAKER',
  'ECONOMIC_BUYER',
  'CHAMPION',
  'INFLUENCER',
  'TECHNICAL_BUYER',
  'END_USER',
  'EVALUATOR',
  'GATEKEEPER',
  'LEGAL',
  'PROCUREMENT',
  'BLOCKER',
  'OTHER',
];

interface EditFormData {
  name: string;
  amount: number;
  probability: number;
  closeDate: string;
  stage: OpportunityStage;
  type: string;
  nextStep: string;
  needsAnalysis: string;
}

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
    isUpdating,
  } = useDeals();

  // Buyer Committee (Opportunity Contacts)
  const {
    contacts: buyerCommittee,
    loading: buyerCommitteeLoading,
    addContact,
    removeContact,
    setPrimary,
    isAdding: isAddingContact,
    isRemoving: isRemovingContact,
  } = useOpportunityContacts(id);

  // Available contacts for adding to buyer committee
  const { contacts: availableContacts, loading: contactsLoading } = useContacts(
    deal?.accountId ? { accountId: deal.accountId } : undefined
  );

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [analyzingDeal, setAnalyzingDeal] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showCloseWonModal, setShowCloseWonModal] = useState(false);
  const [showCloseLostModal, setShowCloseLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [stageUpdating, setStageUpdating] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedRole, setSelectedRole] = useState<OpportunityContactRole>('INFLUENCER');

  // Edit mode state
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

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleAnalyze = async () => {
    setAnalyzingDeal(true);
    try {
      await fetchAnalysis();
    } finally {
      setAnalyzingDeal(false);
    }
  };

  // Handle stage change
  const handleStageChange = async (newStage: OpportunityStage) => {
    if (!deal || stageUpdating) return;
    setStageUpdating(true);
    setShowStageDropdown(false);
    try {
      await update(deal.id, { stage: newStage });
      await refetch();
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  // Handle advance to next stage
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

  // Handle close won
  const handleCloseWon = async () => {
    if (!deal || stageUpdating) return;
    setStageUpdating(true);
    try {
      await closeWon(deal.id, { actualCloseDate: new Date().toISOString() });
      setShowCloseWonModal(false);
      await refetch();
    } catch (err) {
      console.error('Failed to close won:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  // Handle close lost
  const handleCloseLost = async () => {
    if (!deal || stageUpdating || !lostReason.trim()) return;
    setStageUpdating(true);
    try {
      await closeLost(deal.id, { lossReason: lostReason.trim() });
      setShowCloseLostModal(false);
      setLostReason('');
      await refetch();
    } catch (err) {
      console.error('Failed to close lost:', err);
    } finally {
      setStageUpdating(false);
    }
  };

  // Handle edit form save
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

  // Handle add contact to buyer committee
  const handleAddToBuyerCommittee = async () => {
    if (!selectedContactId || !selectedRole) return;
    try {
      await addContact({
        contactId: selectedContactId,
        role: selectedRole,
        isPrimary: buyerCommittee.length === 0,
      });
      setShowAddContactModal(false);
      setSelectedContactId('');
      setSelectedRole('INFLUENCER');
    } catch (err) {
      console.error('Failed to add contact to buyer committee:', err);
    }
  };

  // Handle remove contact from buyer committee
  const handleRemoveFromBuyerCommittee = async (contactId: string) => {
    try {
      await removeContact(contactId);
    } catch (err) {
      console.error('Failed to remove contact from buyer committee:', err);
    }
  };

  // Get contacts not already in buyer committee
  const contactsNotInCommittee = availableContacts.filter(
    (c) => !buyerCommittee.some((bc) => bc.contactId === c.id)
  );

  const isClosedStage = deal?.stage === 'CLOSED_WON' || deal?.stage === 'CLOSED_LOST';
  const canAdvance = deal && !isClosedStage && STAGES.indexOf(deal.stage) < 7;

  // Velocity data based on deal stage
  const velocityData = [
    { label: 'Prospect', deal: deal?.stage === 'PROSPECTING' ? 100 : 15, avg: 20, days: 7 },
    { label: 'Qualify', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 1 ? 30 : 0, avg: 35, days: 14 },
    { label: 'Needs', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 2 ? 45 : 0, avg: 50, days: 21 },
    { label: 'Value', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 3 ? 60 : 0, avg: 65, days: 28 },
    { label: 'Proposal', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 6 ? 80 : 0, avg: 80, days: 45 },
    { label: 'Nego.', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 7 ? 95 : 0, avg: 90, days: 60 },
  ];

  // Step chart path generator
  const getStepPoints = (key: 'deal' | 'avg') => {
    let d = '';
    const w = 100 / (velocityData.length - 1);
    velocityData.forEach((item, i) => {
      const x = i * w;
      const y = 100 - item[key];
      if (i === 0) {
        d += `M ${x},${y}`;
      } else {
        const prevY = 100 - velocityData[i - 1][key];
        d += ` L ${x},${prevY} L ${x},${y}`;
      }
    });
    return d;
  };

  const getAreaFill = (key: 'deal' | 'avg') => {
    const line = getStepPoints(key);
    return `${line} L 100,100 L 0,100 Z`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Left sidebar skeleton */}
          <div className="xl:w-72 shrink-0 hidden xl:block space-y-3">
            <Skeleton className="h-5 w-28 mb-6" />
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
          </div>
          {/* Main content skeleton */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
              <Skeleton className="lg:col-span-8 h-[320px] rounded-[2rem]" />
              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[150px] rounded-2xl" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4 space-y-4">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-5">
                <Skeleton className="md:col-span-8 h-[300px] rounded-2xl" />
                <Skeleton className="md:col-span-4 h-[300px] rounded-2xl" />
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

  const daysInStage = calculateDaysInStage(deal.lastActivityDate);
  const winProbability = analysis?.winProbability || deal.winProbability || deal.probability || 50;
  const stageIndex = getStageIndex(deal.stage);

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-6">

        {/* Left Sidebar - Deal Navigation */}
        <div className="xl:w-72 shrink-0 space-y-3 hidden xl:block">
          <button
            onClick={() => navigate('/dashboard/deals')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors text-sm font-medium group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Pipeline
          </button>

          {dealsLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)
          ) : (
            recentDeals.slice(0, 6).map((d) => (
              <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
                <div className={`p-4 rounded-2xl transition-all duration-200 ${
                  d.id === deal.id
                    ? 'bg-[#EAD07D] shadow-md'
                    : 'bg-white hover:bg-[#F8F8F6] border border-transparent hover:border-[#E5E5E5]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      d.id === deal.id
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F2F1EA] text-[#666] group-hover:bg-[#E5E5E5]'
                    }`}>
                      <Briefcase size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${
                        d.id === deal.id ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]'
                      }`}>
                        {d.name}
                      </div>
                      <div className={`text-xs truncate ${
                        d.id === deal.id ? 'text-[#1A1A1A]/60' : 'text-[#888]'
                      }`}>
                        {d.account?.name || 'Unknown'}
                      </div>
                    </div>
                    <div className={`text-xs font-semibold ${
                      d.id === deal.id ? 'text-[#1A1A1A]' : 'text-[#666]'
                    }`}>
                      ${formatCompactCurrency(d.amount)}
                    </div>
                  </div>
                  {d.id === deal.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#1A1A1A]/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                          style={{ width: `${d.probability || 50}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[#1A1A1A]/70">
                        {d.probability || 50}%
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* Hero Section: Profile Card + Metric Cards */}
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
                        <span>{deal.account?.name || 'Unknown Company'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="w-9 h-9 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#666] hover:bg-[#EAD07D] hover:text-[#1A1A1A] transition-all"
                        title="Edit Opportunity"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={handleAnalyze}
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
                          onClick={handleAdvanceStage}
                          disabled={stageUpdating}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                          Advance
                        </button>
                      )}
                      <button
                        onClick={() => setShowCloseWonModal(true)}
                        disabled={stageUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Check size={14} />
                        Won
                      </button>
                      <button
                        onClick={() => setShowCloseLostModal(true)}
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
                        {deal.account?.name || 'Not specified'}
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

          {/* Bottom Section: Accordions + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Left Column: Accordions */}
            <div className="lg:col-span-4 space-y-4">
              {/* Basic Information Accordion */}
              <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
                <button
                  onClick={() => toggleSection('basic')}
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
                                  onClick={() => handleStageChange(stage)}
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
                      onClick={() => setShowEditModal(true)}
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
                  onClick={() => toggleSection('analysis')}
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
                                  <span>{risk.factor || risk}</span>
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
                                  <span>{action.action || action}</span>
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
                          onClick={handleAnalyze}
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

              {/* Buyer Committee Section */}
              <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                    <Users size={16} className="text-[#888]" />
                    Buyer Committee
                  </h3>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="flex items-center gap-1 text-xs font-medium text-[#888] hover:text-[#1A1A1A] transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {buyerCommitteeLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                  </div>
                ) : buyerCommittee.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
                      <Users size={20} className="text-[#999]" />
                    </div>
                    <p className="text-xs text-[#888] mb-4">No stakeholders added</p>
                    <button
                      onClick={() => setShowAddContactModal(true)}
                      className="text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C56B] transition-colors"
                    >
                      Add Stakeholder
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buyerCommittee.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-[#FAFAFA] rounded-xl group hover:bg-[#F2F1EA] transition-colors"
                      >
                        <Avatar src={member.contact?.avatarUrl} className="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/contacts/${member.contactId}`}
                              className="text-xs font-semibold text-[#1A1A1A] hover:underline truncate"
                            >
                              {member.contact?.firstName} {member.contact?.lastName}
                            </Link>
                            {member.isPrimary && (
                              <Badge variant="yellow" size="sm">Primary</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-[#888] truncate">
                            {getRoleLabel(member.role)}
                            {member.contact?.title && ` · ${member.contact.title}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!member.isPrimary && (
                            <button
                              onClick={() => setPrimary(member.contactId)}
                              className="p-1.5 text-[#888] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                              title="Set as primary"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFromBuyerCommittee(member.contactId)}
                            disabled={isRemovingContact}
                            className="p-1.5 text-[#888] hover:text-red-500 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                            title="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
                <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-[#888]" />
                  Activity Timeline
                </h3>
                <ContactTimeline opportunityId={deal.id} limit={4} />
              </div>
            </div>

            {/* Right Column: Charts */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-5">

              {/* Opportunity Velocity Chart */}
              <div className="md:col-span-8 bg-white rounded-2xl p-6 flex flex-col min-h-[280px]">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-base font-semibold text-[#1A1A1A]">Opportunity Velocity</h3>
                  <div className="flex gap-4 text-[10px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#EAD07D]" />
                      <span className="text-[#888]">This Opportunity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
                      <span className="text-[#888]">Benchmark</span>
                    </div>
                  </div>
                </div>

                {/* SVG Step Chart */}
                <div className="relative flex-1 min-h-[180px] group">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <linearGradient id="dealGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#EAD07D" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[25, 50, 75].map((y) => (
                      <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#F2F1EA" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}

                    {/* Benchmark line (dashed) */}
                    <path
                      d={getStepPoints('avg')}
                      fill="none"
                      stroke="#D1D1D1"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Deal area fill */}
                    <path d={getAreaFill('deal')} fill="url(#dealGradient)" />

                    {/* Deal line (solid) */}
                    <path
                      d={getStepPoints('deal')}
                      fill="none"
                      stroke="#EAD07D"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Interactive points */}
                    {velocityData.map((d, i) => {
                      const x = i * (100 / (velocityData.length - 1));
                      const y = 100 - d.deal;
                      const isHovered = hoveredPoint === i;

                      return (
                        <g key={i} onMouseEnter={() => setHoveredPoint(i)} className="cursor-pointer">
                          <rect x={x - 6} y={0} width="12" height="100" fill="transparent" />
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 5 : 3}
                            fill={isHovered ? "#1A1A1A" : "#EAD07D"}
                            stroke="#fff"
                            strokeWidth="2"
                            className="transition-all duration-200"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip */}
                  {hoveredPoint !== null && (
                    <div
                      className="absolute bg-[#1A1A1A] text-white px-3 py-2 rounded-lg shadow-lg text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2 transition-all duration-150"
                      style={{
                        left: `${hoveredPoint * (100 / (velocityData.length - 1))}%`,
                        top: `${100 - velocityData[hoveredPoint].deal}%`,
                      }}
                    >
                      <div className="font-semibold text-[#EAD07D] mb-0.5">{velocityData[hoveredPoint].label}</div>
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <span>Progress: <span className="font-semibold">{velocityData[hoveredPoint].deal}%</span></span>
                        <span className="text-white/60">Avg: {velocityData[hoveredPoint].avg}%</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
                    </div>
                  )}

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-[#999] font-medium translate-y-5">
                    {velocityData.map((d) => (
                      <div key={d.label} className="text-center">{d.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Win Probability Card */}
              <div className="md:col-span-4 bg-[#EAD07D] rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[280px]">
                <div className="relative z-10 flex-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-[#1A1A1A]/70 mb-auto">Win Probability</h3>
                  <div>
                    <div className="text-6xl font-light text-[#1A1A1A] tracking-tight mb-2">
                      {winProbability}%
                    </div>
                    <div className="text-[10px] font-bold text-[#1A1A1A]/40 uppercase tracking-wider">
                      {analysis ? 'AI Confidence' : 'Estimated'}
                    </div>
                  </div>
                </div>

                {/* Decorative waves */}
                <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                    <path
                      d="M0,25 Q25,15 50,25 T100,20 V40 H0 Z"
                      fill="#1A1A1A"
                      fillOpacity="0.08"
                    />
                    <path
                      d="M-5,30 Q20,35 50,25 T105,28"
                      fill="none"
                      stroke="#1A1A1A"
                      strokeWidth="1"
                      strokeLinecap="round"
                      opacity="0.3"
                    />
                    <path
                      d="M-5,35 Q30,40 60,30 T105,33"
                      fill="none"
                      stroke="#1A1A1A"
                      strokeWidth="0.5"
                      strokeLinecap="round"
                      opacity="0.15"
                    />
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Edit Opportunity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 pb-0 shrink-0">
              <h3 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Pencil size={18} className="text-[#EAD07D]" />
                Edit Opportunity
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-[#888] hover:text-[#1A1A1A] hover:bg-[#F2F1EA] rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Opportunity Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                  placeholder="Enter opportunity name"
                />
              </div>

              {/* Amount and Probability Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] mb-1.5">Amount ($)</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] mb-1.5">Probability (%)</label>
                  <input
                    type="number"
                    value={editForm.probability}
                    onChange={(e) => setEditForm({ ...editForm, probability: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                    placeholder="50"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Stage and Type Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] mb-1.5">Stage</label>
                  <select
                    value={editForm.stage}
                    onChange={(e) => setEditForm({ ...editForm, stage: e.target.value as OpportunityStage })}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] mb-1.5">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                  >
                    {OPPORTUNITY_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Close Date */}
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Close Date</label>
                <input
                  type="date"
                  value={editForm.closeDate}
                  onChange={(e) => setEditForm({ ...editForm, closeDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                />
              </div>

              {/* Next Step */}
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Next Step</label>
                <input
                  type="text"
                  value={editForm.nextStep}
                  onChange={(e) => setEditForm({ ...editForm, nextStep: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                  placeholder="What's the next action?"
                />
              </div>

              {/* Needs Analysis / Description */}
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Description / Needs Analysis</label>
                <textarea
                  value={editForm.needsAnalysis}
                  onChange={(e) => setEditForm({ ...editForm, needsAnalysis: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm resize-none"
                  placeholder="Describe the customer's needs and requirements..."
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-4 border-t border-[#F2F1EA] shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Won Modal */}
      {showCloseWonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCloseWonModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] text-center mb-2">Mark as Won</h3>
            <p className="text-sm text-[#666] text-center mb-6">
              Congratulations! Mark "{deal?.name}" as closed won?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseWonModal(false)}
                className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWon}
                disabled={stageUpdating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {stageUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirm
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Lost Modal */}
      {showCloseLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCloseLostModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <X size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#1A1A1A] text-center mb-2">Mark as Lost</h3>
            <p className="text-sm text-[#666] text-center mb-4">
              Why did we lose "{deal?.name}"?
            </p>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g., Went with competitor, budget constraints..."
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none text-sm mb-6"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCloseLostModal(false);
                  setLostReason('');
                }}
                className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseLost}
                disabled={stageUpdating || !lostReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {stageUpdating ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                Confirm
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact to Buyer Committee Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddContactModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 p-6 pb-0 shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#F2F1EA] flex items-center justify-center">
                <UserPlus size={18} className="text-[#666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A]">Add to Committee</h3>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {contactsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#999]" />
              </div>
            ) : contactsNotInCommittee.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
                  <Users size={20} className="text-[#999]" />
                </div>
                <p className="text-sm text-[#666] mb-4">
                  {availableContacts.length === 0
                    ? 'No contacts found for this account'
                    : 'All contacts are already added'}
                </p>
                <Link
                  to={`/dashboard/contacts?accountId=${deal?.accountId}`}
                  className="text-xs font-semibold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C56B] transition-colors inline-block"
                >
                  Add New Contact
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#888] mb-2">Contact</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                  >
                    <option value="">Select a contact...</option>
                    {contactsNotInCommittee.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                        {contact.title ? ` - ${contact.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium text-[#888] mb-2">Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as OpportunityContactRole)}
                    className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
                  >
                    {OPPORTUNITY_CONTACT_ROLES.map((role) => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddContactModal(false);
                      setSelectedContactId('');
                      setSelectedRole('INFLUENCER');
                    }}
                    className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToBuyerCommittee}
                    disabled={isAddingContact || !selectedContactId}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isAddingContact ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Add
                  </button>
                </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
