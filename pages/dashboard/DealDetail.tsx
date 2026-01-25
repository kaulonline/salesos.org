import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, Printer, ArrowLeft, ChevronDown, ChevronUp, MapPin, AlertCircle, Building2, TrendingUp, Sparkles, Check, X, ArrowRight, Loader2, Users, Plus, UserPlus, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ContactTimeline } from '../../components/dashboard';
import { useDeal, useDeals, useOpportunityContacts, useContacts } from '../../src/hooks';
import type { OpportunityStage, OpportunityAnalysis, OpportunityContactRole } from '../../src/types';

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

const formatCurrency = (amount?: number) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  const stages: OpportunityStage[] = [
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
  return stages.indexOf(stage);
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
    // Don't advance if already at closed stages
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

  // Handle add contact to buyer committee
  const handleAddToBuyerCommittee = async () => {
    if (!selectedContactId || !selectedRole) return;
    try {
      await addContact({
        contactId: selectedContactId,
        role: selectedRole,
        isPrimary: buyerCommittee.length === 0, // First contact is primary
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

  // Get velocity data based on deal stage
  const velocityData = [
    { label: 'Prospect', deal: deal?.stage === 'PROSPECTING' ? 100 : 10, avg: 15 },
    { label: 'Qualify', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 1 ? 25 : 0, avg: 30 },
    { label: 'Needs', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 2 ? 35 : 0, avg: 40 },
    { label: 'Value', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 3 ? 50 : 0, avg: 55 },
    { label: 'Proposal', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 6 ? 70 : 0, avg: 70 },
    { label: 'Nego.', deal: getStageIndex(deal?.stage || 'PROSPECTING') >= 7 ? 90 : 0, avg: 85 },
  ];

  // Logic for Step Chart
  const getStepPoints = (key: 'deal' | 'avg') => {
    let d = '';
    const w = 100 / (velocityData.length - 1);

    velocityData.forEach((item, i) => {
      const x = i * w;
      const y = 100 - item[key];

      if (i === 0) {
        d += `M ${x},${y}`;
      } else {
        const prevY = 100 - velocityData[i-1][key];
        d += ` L ${x},${prevY} L ${x},${y}`;
      }
    });
    return d;
  };

  // Create area fill
  const getAreaFill = (key: 'deal' | 'avg') => {
    const line = getStepPoints(key);
    return `${line} L 100,100 L 0,100 Z`;
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0 hidden xl:block space-y-4">
            <Skeleton className="h-6 w-32 mb-6" />
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              <Skeleton className="lg:col-span-8 h-[340px] rounded-[2rem]" />
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-[160px] rounded-[2rem]" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-4">
                <Skeleton className="h-24 w-full rounded-[2rem]" />
                <Skeleton className="h-24 w-full rounded-[2rem]" />
              </div>
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
                <Skeleton className="md:col-span-8 h-[320px] rounded-[2rem]" />
                <Skeleton className="md:col-span-4 h-[320px] rounded-[2rem]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Opportunity Not Found</h2>
          <p className="text-[#666] mb-6">{error || 'This opportunity may have been deleted or you may not have access to it.'}</p>
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
  const tags = [
    deal.type?.replace('_', ' ') || 'New Business',
    getStageLabel(deal.stage),
    ...(deal.competitors || []).slice(0, 1),
  ].filter(Boolean);

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
          <button
            onClick={() => navigate('/dashboard/deals')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Pipeline
          </button>

          {dealsLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
          ) : (
            recentDeals.slice(0, 5).map((d) => (
              <Link to={`/dashboard/deals/${d.id}`} key={d.id} className="block group">
                <Card padding="sm" className={`rounded-3xl transition-all ${d.id === deal.id ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${d.id === deal.id ? 'bg-[#1A1A1A] text-white' : 'bg-[#F2F1EA] text-[#666]'}`}>
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate text-[#1A1A1A]">{d.account?.name || 'Unknown Company'}</div>
                      <div className={`text-xs truncate ${d.id === deal.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}>{d.name}</div>
                    </div>
                    {d.id === deal.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                  </div>
                  {d.id === deal.id && (
                    <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A1A1A]" style={{ width: `${d.probability || 50}%` }}></div>
                    </div>
                  )}
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">

          {/* Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

            {/* Profile Card */}
            <Card variant="ghost" padding="lg" className="lg:col-span-8 p-8 lg:p-10 relative flex flex-col md:flex-row gap-8 items-start">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

              <div className="shrink-0 relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg">
                  <Building2 size={48} className="text-[#1A1A1A]" />
                </div>
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{deal.name}</h1>
                    <div className="text-[#666] text-lg mb-4">{deal.account?.name || 'Unknown Company'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm">
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzingDeal}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm disabled:opacity-50"
                      title="AI Analysis"
                    >
                      <Sparkles size={18} className={analyzingDeal ? 'animate-pulse' : ''} />
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
                        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                      >
                        {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        Advance Stage
                      </button>
                    )}
                    <button
                      onClick={() => setShowCloseWonModal(true)}
                      disabled={stageUpdating}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={14} />
                      Close Won
                    </button>
                    <button
                      onClick={() => setShowCloseLostModal(true)}
                      disabled={stageUpdating}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      Close Lost
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant={i === 0 ? 'yellow' : i === 1 ? 'dark' : 'outline'} size="md" dot={i === 0}>
                      {tag}
                    </Badge>
                  ))}
                </div>

                {deal.needsAnalysis && (
                  <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">
                    {deal.needsAnalysis}
                  </p>
                )}

                {deal.nextStep && (
                  <div className="bg-[#F8F8F6] rounded-xl p-3 mb-6">
                    <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Next Step</div>
                    <p className="text-sm text-[#1A1A1A]">{deal.nextStep}</p>
                  </div>
                )}

                <div className="border-t border-black/5 pt-6 space-y-4">
                  <div>
                    <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Account</div>
                    <div className="text-sm font-bold text-[#1A1A1A]">{deal.account?.name || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Source</div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      {deal.opportunitySource?.replace('_', ' ') || 'Direct'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Opportunity Value</div>
                    <div className="text-sm font-bold text-[#1A1A1A]">{formatCurrency(deal.amount)}</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Pills */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card variant="yellow" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="flex items-baseline text-[#1A1A1A] mb-1">
                    <span className="text-lg font-bold mr-1 opacity-80">$</span>
                    <span className="text-xl font-bold">
                      {deal.amount ? (deal.amount / 1000).toFixed(0) + 'K' : '0'}
                    </span>
                  </div>
                  <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Opportunity Value</div>
                </div>
              </Card>
              <Card variant="dark" className="flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="text-3xl font-medium text-white mb-1">{deal.probability || 50}%</div>
                  <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Probability</div>
                </div>
              </Card>
              <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
                <div>
                  <div className="text-3xl font-medium text-[#1A1A1A] mb-1">
                    {daysInStage}<span className="text-lg text-[#999]">d</span>
                  </div>
                  <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Time in Stage</div>
                </div>
              </Card>
              <Card className="bg-[#999] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="text-3xl font-medium text-white mb-1">{getStageIndex(deal.stage) + 1}</div>
                  <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Stage #{' '}/ 10</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Middle Row: Content & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

            {/* Accordions Column */}
            <div className="lg:col-span-4 space-y-4">
              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('basic')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Basic Information
                  {openSection === 'basic' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'basic' && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Opportunity ID</span>
                      <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                        {deal.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50 relative">
                      <span className="text-sm text-[#666]">Stage</span>
                      <div className="relative">
                        <button
                          onClick={() => setShowStageDropdown(!showStageDropdown)}
                          disabled={stageUpdating}
                          className="flex items-center gap-1 text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D] transition-colors disabled:opacity-50"
                        >
                          {stageUpdating ? (
                            <Loader2 size={12} className="animate-spin mr-1" />
                          ) : null}
                          {getStageLabel(deal.stage)}
                          <ChevronDown size={14} className={`transition-transform ${showStageDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showStageDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowStageDropdown(false)} />
                            <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-64 overflow-y-auto">
                              {STAGES.map((stage) => (
                                <button
                                  key={stage}
                                  onClick={() => handleStageChange(stage)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F8F8F6] transition-colors ${
                                    deal.stage === stage ? 'bg-[#EAD07D]/20 font-bold' : ''
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
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Close Date</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(deal.closeDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-[#666]">Created</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(deal.createdAt)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('analysis')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  AI Analysis
                  {openSection === 'analysis' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'analysis' && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                    {analysis ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#666]">Opportunity Health</span>
                          <Badge
                            variant={analysis.dealHealth === 'HEALTHY' ? 'success' : analysis.dealHealth === 'AT_RISK' ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {analysis.dealHealth}
                          </Badge>
                        </div>
                        {analysis.riskFactors.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">Risk Factors</div>
                            {analysis.riskFactors.slice(0, 2).map((risk, i) => (
                              <div key={i} className="text-xs text-[#666] mb-1">
                                {risk.severity === 'HIGH' ? '!' : ''} {risk.factor}
                              </div>
                            ))}
                          </div>
                        )}
                        {analysis.recommendedActions.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">Recommended Actions</div>
                            {analysis.recommendedActions.slice(0, 2).map((action, i) => (
                              <div key={i} className="text-xs text-[#666] mb-1">
                                {action.action}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <Sparkles size={24} className="mx-auto mb-2 text-[#999] opacity-40" />
                        <p className="text-sm text-[#666] mb-3">No analysis yet</p>
                        <button
                          onClick={handleAnalyze}
                          disabled={analyzingDeal}
                          className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors disabled:opacity-50"
                        >
                          {analyzingDeal ? 'Analyzing...' : 'Run AI Analysis'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Buyer Committee Section */}
              <Card padding="md" className="border border-black/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Users size={16} />
                    Buyer Committee
                  </h3>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="flex items-center gap-1 text-xs font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {buyerCommitteeLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : buyerCommittee.length === 0 ? (
                  <div className="text-center py-6">
                    <Users size={32} className="mx-auto mb-2 text-[#999] opacity-40" />
                    <p className="text-sm text-[#666] mb-3">No stakeholders added yet</p>
                    <button
                      onClick={() => setShowAddContactModal(true)}
                      className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors"
                    >
                      Add Stakeholder
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {buyerCommittee.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl group hover:bg-[#F2F1EA] transition-colors"
                      >
                        <Avatar
                          src={member.contact?.avatarUrl}
                          className="w-9 h-9"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/dashboard/contacts/${member.contactId}`}
                              className="text-sm font-medium text-[#1A1A1A] hover:underline truncate"
                            >
                              {member.contact?.firstName} {member.contact?.lastName}
                            </Link>
                            {member.isPrimary && (
                              <Badge variant="yellow" size="sm">Primary</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#666]">
                            <span>{getRoleLabel(member.role)}</span>
                            {member.contact?.title && (
                              <>
                                <span className="text-[#ccc]">|</span>
                                <span className="truncate">{member.contact.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!member.isPrimary && (
                            <button
                              onClick={() => setPrimary(member.contactId)}
                              className="p-1.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                              title="Set as primary"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFromBuyerCommittee(member.contactId)}
                            disabled={isRemovingContact}
                            className="p-1.5 text-[#666] hover:text-red-500 hover:bg-white rounded-lg transition-colors disabled:opacity-50"
                            title="Remove from committee"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Timeline Section */}
              <Card padding="md" className="border border-black/5">
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Activity Timeline</h3>
                <ContactTimeline opportunityId={deal.id} limit={5} />
              </Card>
            </div>

            {/* Charts Area */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Deal Velocity Chart */}
              <Card className="md:col-span-8 flex flex-col justify-between min-h-[320px] p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-medium text-[#1A1A1A]">Opportunity Velocity</h3>
                  <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EAD07D]"></div>
                      <span className="text-[#666]">This Opportunity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ccc]"></div>
                      <span className="text-[#666]">Avg. Benchmark</span>
                    </div>
                  </div>
                </div>

                {/* SVG Chart */}
                <div className="relative h-56 w-full group">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" onMouseLeave={() => setHoveredPoint(null)}>
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="dealFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Avg Line (Dashed Step) */}
                    <path
                      d={getStepPoints('avg')}
                      fill="none"
                      stroke="#ccc"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Deal Area */}
                    <path d={getAreaFill('deal')} fill="url(#dealFill)" />

                    {/* Deal Line (Solid Step) */}
                    <path
                      d={getStepPoints('deal')}
                      fill="none"
                      stroke="#EAD07D"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                    />

                    {/* Interactive Points */}
                    {velocityData.map((d, i) => {
                      const x = i * (100 / (velocityData.length - 1));
                      const y = 100 - d.deal;
                      const isHovered = hoveredPoint === i;

                      return (
                        <g key={i} onMouseEnter={() => setHoveredPoint(i)} className="transition-all duration-300">
                          {/* Invisible Hit Area */}
                          <rect x={x-5} y={0} width="10" height="100" fill="transparent" cursor="pointer" />

                          {/* Point */}
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 4}
                            fill="#1A1A1A"
                            stroke="#fff"
                            strokeWidth="2"
                            className="transition-all duration-200"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Tooltip Overlay */}
                  {hoveredPoint !== null && (
                    <div
                      className="absolute bg-[#1A1A1A] text-white p-3 rounded-xl shadow-xl text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 transition-all duration-200"
                      style={{
                        left: `${hoveredPoint * (100 / (velocityData.length - 1))}%`,
                        top: `${100 - velocityData[hoveredPoint].deal}%`,
                      }}
                    >
                      <div className="font-bold mb-1 text-[#EAD07D]">{velocityData[hoveredPoint].label}</div>
                      <div className="flex flex-col whitespace-nowrap gap-1">
                        <span>Progress: <span className="font-bold">{velocityData[hoveredPoint].deal}%</span></span>
                        <span className="opacity-60">Avg: {velocityData[hoveredPoint].avg}%</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#1A1A1A]"></div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-[#999] mt-6 px-1 absolute w-full bottom-0">
                    {velocityData.map((d) => (
                      <div key={d.label} className="w-8 text-center">{d.label}</div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Win Probability Card */}
              <Card variant="yellow" className="md:col-span-4 p-8 relative overflow-hidden flex flex-col min-h-[320px]">
                <div className="relative z-10 mt-2">
                  <h3 className="text-[#1A1A1A] font-medium mb-4 text-lg">Win Probability</h3>
                  <div className="text-7xl font-light text-[#1A1A1A] tracking-tighter mb-4">
                    {winProbability}%
                  </div>
                  <div className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">
                    {analysis ? 'AI Confidence' : 'Estimated'}
                  </div>
                </div>

                {/* Decorative Waves */}
                <div className="absolute bottom-0 left-0 right-0 h-32 w-full text-[#1A1A1A] pointer-events-none">
                  <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0,35 C30,25 60,45 100,30 V50 H0 Z" fill="#1A1A1A" fillOpacity="0.1" />
                    <path d="M-5,40 C30,45 60,25 105,40" fill="none" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M-5,45 C40,50 70,30 105,42" fill="none" stroke="#1A1A1A" strokeWidth="0.5" opacity="0.5" />
                  </svg>
                </div>
              </Card>

            </div>
          </div>

        </div>
      </div>

      {/* Close Won Modal */}
      {showCloseWonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCloseWonModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Mark as Won</h3>
            <p className="text-[#666] mb-6">
              Congratulations! Are you sure you want to mark "{deal?.name}" as closed won?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCloseWonModal(false)}
                className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWon}
                disabled={stageUpdating}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm Won
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Lost Modal */}
      {showCloseLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCloseLostModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Mark as Lost</h3>
            <p className="text-[#666] mb-4">
              Please provide a reason for losing "{deal?.name}":
            </p>
            <textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g., Went with competitor, Budget constraints, Project cancelled..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none mb-6"
              rows={3}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCloseLostModal(false);
                  setLostReason('');
                }}
                className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseLost}
                disabled={stageUpdating || !lostReason.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {stageUpdating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact to Buyer Committee Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddContactModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <UserPlus size={20} />
              Add to Buyer Committee
            </h3>

            {contactsLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#999]" />
              </div>
            ) : contactsNotInCommittee.length === 0 ? (
              <div className="text-center py-6">
                <Users size={32} className="mx-auto mb-2 text-[#999] opacity-40" />
                <p className="text-sm text-[#666] mb-3">
                  {availableContacts.length === 0
                    ? 'No contacts found for this account'
                    : 'All contacts are already in the buyer committee'}
                </p>
                <Link
                  to={`/dashboard/contacts?accountId=${deal?.accountId}`}
                  className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors inline-block"
                >
                  Add New Contact
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#666] mb-2">Select Contact</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white"
                  >
                    <option value="">Choose a contact...</option>
                    {contactsNotInCommittee.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                        {contact.title ? ` - ${contact.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#666] mb-2">Role in Deal</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as OpportunityContactRole)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white"
                  >
                    {OPPORTUNITY_CONTACT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowAddContactModal(false);
                      setSelectedContactId('');
                      setSelectedRole('INFLUENCER');
                    }}
                    className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddToBuyerCommittee}
                    disabled={isAddingContact || !selectedContactId}
                    className="flex items-center gap-2 px-6 py-2 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isAddingContact ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Add to Committee
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
