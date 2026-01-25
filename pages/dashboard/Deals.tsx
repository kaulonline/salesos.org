import React, { useState, useEffect, useMemo } from 'react';
import { Plus, MoreHorizontal, Filter, LayoutGrid, List as ListIcon, ChevronDown, AlertCircle, X, Trophy, XCircle, Trash2, Sparkles, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { PipelineSelector } from '../../components/pipeline';
import { useDeals } from '../../src/hooks/useDeals';
import { useCompanies } from '../../src/hooks/useCompanies';
import { usePipelines } from '../../src/hooks/usePipelines';
import { FeatureGate, Features } from '../../src/components/FeatureGate';
import type { OpportunityStage, CreateOpportunityDto, Pipeline, PipelineStage } from '../../src/types';

// Fallback stages for backwards compatibility when no pipeline is selected
const FALLBACK_STAGES: { id: OpportunityStage; title: string; color: string; badge: 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'neutral' }[] = [
  { id: 'PROSPECTING', title: 'Prospecting', color: 'bg-sky-500', badge: 'blue' },
  { id: 'QUALIFICATION', title: 'Qualification', color: 'bg-cyan-500', badge: 'blue' },
  { id: 'NEEDS_ANALYSIS', title: 'Needs Analysis', color: 'bg-teal-500', badge: 'blue' },
  { id: 'VALUE_PROPOSITION', title: 'Value Prop', color: 'bg-orange-500', badge: 'yellow' },
  { id: 'PROPOSAL_PRICE_QUOTE', title: 'Proposal', color: 'bg-amber-500', badge: 'yellow' },
  { id: 'NEGOTIATION_REVIEW', title: 'Negotiation', color: 'bg-violet-500', badge: 'purple' },
  { id: 'CLOSED_WON', title: 'Closed Won', color: 'bg-emerald-500', badge: 'green' },
  { id: 'CLOSED_LOST', title: 'Closed Lost', color: 'bg-gray-400', badge: 'neutral' },
];

// Convert hex color to Tailwind-style bg class
const hexToTailwindBg = (hex: string): string => {
  // Return inline style approach for custom colors
  return hex;
};

// Get badge variant based on stage properties
const getBadgeVariant = (stage: PipelineStage): 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'neutral' => {
  if (stage.isClosedWon) return 'green';
  if (stage.isClosedLost) return 'neutral';
  if (stage.probability >= 70) return 'purple';
  if (stage.probability >= 40) return 'yellow';
  return 'blue';
};

// Group stages into Kanban columns for display
const groupStagesForKanban = (stages: PipelineStage[]): {
  id: string;
  title: string;
  color: string;
  badge: 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'neutral';
  includeStages: string[];
  isClosedWon?: boolean;
  isClosedLost?: boolean;
}[] => {
  if (!stages || stages.length === 0) {
    return [
      { id: 'PROSPECTING', title: 'Discovery', color: '#0ea5e9', badge: 'blue', includeStages: ['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS'] },
      { id: 'PROPOSAL_PRICE_QUOTE', title: 'Proposal', color: '#f97316', badge: 'yellow', includeStages: ['VALUE_PROPOSITION', 'PROPOSAL_PRICE_QUOTE'] },
      { id: 'NEGOTIATION_REVIEW', title: 'Negotiation', color: '#8b5cf6', badge: 'purple', includeStages: ['NEGOTIATION_REVIEW', 'DECISION_MAKERS_IDENTIFIED', 'PERCEPTION_ANALYSIS'] },
      { id: 'CLOSED_WON', title: 'Closed Won', color: '#22c55e', badge: 'green', includeStages: ['CLOSED_WON'] },
    ];
  }

  const sortedStages = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const openStages = sortedStages.filter(s => !s.isClosedWon && !s.isClosedLost);
  const closedWonStage = sortedStages.find(s => s.isClosedWon);
  const closedLostStage = sortedStages.find(s => s.isClosedLost);

  // Group open stages into ~3 columns based on probability
  const columns: { id: string; title: string; color: string; badge: 'blue' | 'red' | 'purple' | 'green' | 'yellow' | 'neutral'; includeStages: string[]; isClosedWon?: boolean; isClosedLost?: boolean; }[] = [];

  if (openStages.length <= 3) {
    // If 3 or fewer open stages, each gets its own column
    openStages.forEach(stage => {
      columns.push({
        id: stage.id,
        title: stage.displayName,
        color: stage.color,
        badge: getBadgeVariant(stage),
        includeStages: [stage.name],
      });
    });
  } else {
    // Group into Discovery (low prob), Proposal (mid prob), Negotiation (high prob)
    const discovery = openStages.filter(s => s.probability < 40);
    const proposal = openStages.filter(s => s.probability >= 40 && s.probability < 70);
    const negotiation = openStages.filter(s => s.probability >= 70);

    if (discovery.length > 0) {
      columns.push({
        id: discovery[0].id,
        title: 'Discovery',
        color: discovery[0].color,
        badge: 'blue',
        includeStages: discovery.map(s => s.name),
      });
    }
    if (proposal.length > 0) {
      columns.push({
        id: proposal[0].id,
        title: 'Proposal',
        color: proposal[0].color,
        badge: 'yellow',
        includeStages: proposal.map(s => s.name),
      });
    }
    if (negotiation.length > 0) {
      columns.push({
        id: negotiation[0].id,
        title: 'Negotiation',
        color: negotiation[0].color,
        badge: 'purple',
        includeStages: negotiation.map(s => s.name),
      });
    }
  }

  // Always add Closed Won column if it exists
  if (closedWonStage) {
    columns.push({
      id: closedWonStage.id,
      title: closedWonStage.displayName,
      color: closedWonStage.color,
      badge: 'green',
      includeStages: [closedWonStage.name],
      isClosedWon: true,
    });
  }

  return columns;
};

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateOpportunityDto) => Promise<void>;
  accounts: { id: string; name: string }[];
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
}

const CreateDealModal: React.FC<CreateDealModalProps> = ({ isOpen, onClose, onCreate, accounts, pipelines, selectedPipelineId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePipelines = pipelines.filter(p => p.isActive);
  const defaultPipeline = activePipelines.find(p => p.id === selectedPipelineId) || activePipelines.find(p => p.isDefault) || activePipelines[0];

  const [formData, setFormData] = useState<CreateOpportunityDto & { pipelineId?: string; stageId?: string }>({
    accountId: '',
    name: '',
    amount: undefined,
    stage: 'PROSPECTING',
    pipelineId: defaultPipeline?.id,
    stageId: defaultPipeline?.stages[0]?.id,
  });

  // Update stage when pipeline changes
  const currentPipeline = activePipelines.find(p => p.id === formData.pipelineId);
  const availableStages = currentPipeline?.stages.filter(s => !s.isClosedWon && !s.isClosedLost).sort((a, b) => a.sortOrder - b.sortOrder) || [];

  useEffect(() => {
    if (currentPipeline && availableStages.length > 0 && !availableStages.find(s => s.id === formData.stageId)) {
      setFormData(prev => ({
        ...prev,
        stageId: availableStages[0].id,
        stage: availableStages[0].name as OpportunityStage,
      }));
    }
  }, [formData.pipelineId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.accountId) {
      setError('Opportunity name and account are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
      setFormData({
        accountId: '',
        name: '',
        amount: undefined,
        stage: 'PROSPECTING',
        pipelineId: defaultPipeline?.id,
        stageId: defaultPipeline?.stages[0]?.id,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Opportunity</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Opportunity Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="Q1 Enterprise Opportunity"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Account *</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
            >
              <option value="">Select an account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Pipeline Selection */}
          {activePipelines.length > 1 && (
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Pipeline</label>
              <select
                value={formData.pipelineId || ''}
                onChange={(e) => setFormData({ ...formData, pipelineId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              >
                {activePipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Amount</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Stage</label>
              <select
                value={formData.stageId || ''}
                onChange={(e) => {
                  const stage = availableStages.find(s => s.id === e.target.value);
                  setFormData({
                    ...formData,
                    stageId: e.target.value,
                    stage: (stage?.name || 'PROSPECTING') as OpportunityStage,
                  });
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              >
                {availableStages.length > 0 ? (
                  availableStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.displayName}</option>
                  ))
                ) : (
                  FALLBACK_STAGES.filter(s => !s.id.startsWith('CLOSED')).map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button
              variant="secondary"
              className="flex-1 py-3 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Opportunity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const formatCurrency = (amount?: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export const Deals: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { deals, pipelineStats, loading, error, refetch, fetchPipelineStats, create, update, remove, closeWon, closeLost, analyze, isDeleting, isAnalyzing } = useDeals();
  const { companies } = useCompanies();
  const { pipelines, loading: pipelinesLoading, defaultPipeline } = usePipelines();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [minProbability, setMinProbability] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [closeLostReason, setCloseLostReason] = useState('');
  const [showCloseLostModal, setShowCloseLostModal] = useState<string | null>(null);

  // Get selected pipeline from URL params or default
  const selectedPipelineId = searchParams.get('pipeline');
  const selectedPipeline = selectedPipelineId
    ? pipelines.find(p => p.id === selectedPipelineId)
    : null;

  // Handle pipeline selection
  const handlePipelineSelect = (pipelineId: string | null) => {
    if (pipelineId) {
      setSearchParams({ pipeline: pipelineId });
    } else {
      setSearchParams({});
    }
    setSelectedStageFilter('all');
  };

  // Get stages for current view
  const currentStages = useMemo(() => {
    if (selectedPipeline) {
      return selectedPipeline.stages.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return [];
  }, [selectedPipeline]);

  // Generate Kanban columns based on current pipeline
  const kanbanColumns = useMemo(() => {
    return groupStagesForKanban(currentStages);
  }, [currentStages]);

  // Get stage info for display
  const getStageInfo = (stageName: string) => {
    const pipelineStage = currentStages.find(s => s.name === stageName);
    if (pipelineStage) {
      return {
        title: pipelineStage.displayName,
        color: pipelineStage.color,
        badge: getBadgeVariant(pipelineStage),
      };
    }
    // Fallback for legacy stages
    const fallback = FALLBACK_STAGES.find(s => s.id === stageName);
    return fallback || { title: stageName, color: '#9ca3af', badge: 'neutral' as const };
  };

  useEffect(() => {
    fetchPipelineStats();
  }, [fetchPipelineStats]);

  // Filter deals based on selected pipeline and other filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = deal.name.toLowerCase().includes(query) ||
        (deal.account?.name || '').toLowerCase().includes(query);

      // Filter by pipeline if selected
      const matchesPipeline = !selectedPipelineId || deal.pipelineId === selectedPipelineId;

      // Filter by stage
      const matchesStage = selectedStageFilter === 'all' ||
        deal.stage === selectedStageFilter ||
        kanbanColumns.find(c => c.id === selectedStageFilter)?.includeStages.includes(deal.stage);

      const matchesProb = (deal.probability || 0) >= minProbability;

      return matchesSearch && matchesPipeline && matchesStage && matchesProb;
    });
  }, [deals, searchQuery, selectedPipelineId, selectedStageFilter, minProbability, kanbanColumns]);

  const handleCreateDeal = async (data: CreateOpportunityDto) => {
    await create(data);
    await fetchPipelineStats();
  };

  const handleCloseWon = async (dealId: string) => {
    try {
      await closeWon(dealId);
      await Promise.all([fetchPipelineStats(), refetch()]);
      setActionMenuOpen(null);
    } catch (err) {
      console.error('Failed to close deal as won:', err);
    }
  };

  const handleCloseLost = async (dealId: string) => {
    if (!closeLostReason.trim()) return;
    try {
      await closeLost(dealId, { lostReason: closeLostReason });
      await Promise.all([fetchPipelineStats(), refetch()]);
      setShowCloseLostModal(null);
      setCloseLostReason('');
    } catch (err) {
      console.error('Failed to close deal as lost:', err);
    }
  };

  const handleDelete = async (dealId: string) => {
    if (window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      try {
        await remove(dealId);
        await fetchPipelineStats();
        setActionMenuOpen(null);
      } catch (err) {
        console.error('Failed to delete deal:', err);
      }
    }
  };

  const handleAnalyze = async (dealId: string) => {
    try {
      await analyze(dealId);
      setActionMenuOpen(null);
      navigate(`/dashboard/deals/${dealId}`);
    } catch (err) {
      console.error('Failed to analyze deal:', err);
    }
  };

  if ((loading && deals.length === 0) || pipelinesLoading) {
      return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
            <div className="mb-8 flex flex-col xl:flex-row justify-between items-end gap-6 shrink-0">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-32 rounded-full" />
                    <Skeleton className="h-10 w-24 rounded-full" />
                    <Skeleton className="h-10 w-64 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </div>
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex gap-6 h-full min-w-[1000px]">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <div className="flex-1 bg-gray-100/50 rounded-[2rem] p-4 space-y-4">
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white" />
                                <Skeleton className="h-48 w-full rounded-[2rem] bg-white" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )
  }

  return (
    <FeatureGate feature={Features.OPPORTUNITIES_MANAGEMENT}>
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col xl:flex-row justify-between items-end gap-6 shrink-0">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Pipeline</h1>
            <p className="text-[#666]">
              {pipelineStats ? (
                <>
                  {formatCurrency(pipelineStats.totalValue)} total value across {pipelineStats.totalDeals} opportunities
                </>
              ) : (
                'Manage your opportunities and track revenue.'
              )}
            </p>
         </div>

         <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            {/* Pipeline Selector */}
            <PipelineSelector
              pipelines={pipelines}
              selectedPipelineId={selectedPipelineId}
              onSelect={handlePipelineSelect}
              loading={pipelinesLoading}
              showAllOption={true}
              showSettingsLink={true}
            />

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <div className="relative group">
                    <button className="px-4 py-2.5 bg-white rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] flex items-center gap-2 shadow-sm border border-transparent hover:border-gray-200">
                        {selectedStageFilter === 'all' ? 'All Stages' : kanbanColumns.find(s => s.id === selectedStageFilter)?.title || selectedStageFilter} <ChevronDown size={14} />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 hidden group-hover:block z-20">
                        <button onClick={() => setSelectedStageFilter('all')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedStageFilter === 'all' ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>All Stages</button>
                        {kanbanColumns.map(s => (
                            <button key={s.id} onClick={() => setSelectedStageFilter(s.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedStageFilter === s.id ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>{s.title}</button>
                        ))}
                    </div>
                </div>

                <div className="relative group">
                    <button className="px-4 py-2.5 bg-white rounded-full text-sm font-medium text-[#666] hover:text-[#1A1A1A] flex items-center gap-2 shadow-sm border border-transparent hover:border-gray-200">
                        {minProbability === 0 ? 'All Probabilities' : `> ${minProbability}%`} <ChevronDown size={14} />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 p-1 hidden group-hover:block z-20">
                        {[0, 25, 50, 75].map(p => (
                             <button key={p} onClick={() => setMinProbability(p)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${minProbability === p ? 'bg-[#F8F8F6] font-bold' : 'hover:bg-[#F8F8F6]'}`}>{p === 0 ? 'All Probabilities' : `> ${p}%`}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="bg-white p-1 rounded-full shadow-sm flex items-center border border-gray-100">
                <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'kanban' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-gray-100'}`}
                >
                    <LayoutGrid size={18} />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:bg-gray-100'}`}
                >
                    <ListIcon size={18} />
                </button>
            </div>

            {/* Search */}
            <div className="w-full md:w-64">
                <SearchInput
                    placeholder="Search opportunities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg shrink-0"
            >
                <Plus size={18} />
            </button>
         </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={refetch} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Content Area */}
      {viewMode === 'kanban' ? (
          /* Kanban Board */
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-6 h-full min-w-[1000px]">
              {kanbanColumns.map((column) => {
                const columnDeals = filteredDeals.filter(d => column.includeStages.includes(d.stage));
                const totalValue = columnDeals.reduce((acc, curr) => acc + (curr.amount || 0), 0);

                return (
                  <div key={column.id} className="flex-1 min-w-[300px] flex flex-col">
                     <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-2">
                           <div
                             className="w-2 h-2 rounded-full"
                             style={{ backgroundColor: column.color }}
                           />
                           <span className="font-bold text-[#1A1A1A]">{column.title}</span>
                           <span className="bg-[#E5E5E5] text-[#666] px-2 py-0.5 rounded-full text-xs font-medium">{columnDeals.length}</span>
                        </div>
                        <span className="text-xs font-medium text-[#666]">{formatCurrency(totalValue)}</span>
                     </div>

                     <div className="flex-1 bg-[#E5E5E5]/30 rounded-[2rem] p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {columnDeals.map((deal) => {
                          const stageInfo = getStageInfo(deal.stage);
                          return (
                          <div key={deal.id} className="relative">
                            <Link to={`/dashboard/deals/${deal.id}`} className="block group">
                              <Card padding="md" className="hover:border-[#EAD07D]/30 transition-all">
                                 <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-bold text-[#999] uppercase tracking-wider">
                                      {deal.account?.name || 'No account'}
                                    </span>
                                    <button
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActionMenuOpen(actionMenuOpen === deal.id ? null : deal.id); }}
                                      className="text-[#999] hover:text-[#1A1A1A] relative z-10"
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>
                                 </div>

                                 <h4 className="text-lg font-bold text-[#1A1A1A] mb-2 leading-tight group-hover:text-[#EAD07D] transition-colors">
                                   {deal.name}
                                 </h4>

                                 <div className="mb-4">
                                    <Badge variant={stageInfo.badge} size="sm">
                                       {stageInfo.title}
                                    </Badge>
                                 </div>

                                 <div className="flex items-end justify-between">
                                    <div>
                                       <div className="text-sm font-medium text-[#1A1A1A]">{formatCurrency(deal.amount)}</div>
                                       <div className="text-xs text-[#666] mt-1">{deal.probability || 0}% probability</div>
                                    </div>
                                    <Avatar
                                      src={`https://ui-avatars.com/api/?name=User&background=random`}
                                      size="sm"
                                      border
                                    />
                                 </div>

                                 {/* Progress Bar */}
                                 <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                                    <div
                                      className="h-full"
                                      style={{ backgroundColor: stageInfo.color, width: `${deal.probability || 0}%` }}
                                    />
                                 </div>
                              </Card>
                            </Link>

                            {/* Actions Dropdown */}
                            {actionMenuOpen === deal.id && (
                              <div className="absolute top-10 right-4 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-30">
                                <button
                                  onClick={() => navigate(`/dashboard/deals/${deal.id}`)}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#F8F8F6] flex items-center gap-2"
                                >
                                  <ChevronRight size={14} /> View Details
                                </button>
                                <button
                                  onClick={() => handleAnalyze(deal.id)}
                                  disabled={isAnalyzing}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[#F8F8F6] flex items-center gap-2 text-purple-600"
                                >
                                  <Sparkles size={14} /> AI Analysis
                                </button>
                                <hr className="my-1 border-gray-100" />
                                {deal.stage !== 'CLOSED_WON' && (
                                  <button
                                    onClick={() => handleCloseWon(deal.id)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-green-50 flex items-center gap-2 text-green-600"
                                  >
                                    <Trophy size={14} /> Mark Won
                                  </button>
                                )}
                                {deal.stage !== 'CLOSED_LOST' && (
                                  <button
                                    onClick={() => { setShowCloseLostModal(deal.id); setActionMenuOpen(null); }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-orange-50 flex items-center gap-2 text-orange-600"
                                  >
                                    <XCircle size={14} /> Mark Lost
                                  </button>
                                )}
                                <hr className="my-1 border-gray-100" />
                                <button
                                  onClick={() => handleDelete(deal.id)}
                                  disabled={isDeleting}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 size={14} /> Delete Opportunity
                                </button>
                              </div>
                            )}
                          </div>
                        )})}

                        {columnDeals.length === 0 && (
                          <div className="text-center py-8 text-[#999] text-sm">
                            No deals in this stage
                          </div>
                        )}

                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="w-full py-3 rounded-[1.5rem] border-2 border-dashed border-[#1A1A1A]/5 text-[#1A1A1A]/40 font-medium hover:border-[#1A1A1A]/20 hover:text-[#1A1A1A]/60 transition-all flex items-center justify-center gap-2"
                        >
                           <Plus size={16} /> Add Opportunity
                        </button>
                     </div>
                  </div>
                );
              })}
            </div>
          </div>
      ) : (
          /* List View */
          <Card padding="none" className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-gray-100 text-xs font-bold text-[#999] uppercase tracking-wider bg-[#F9F9F9]">
                  <div className="col-span-4">Opportunity Name</div>
                  <div className="col-span-2">Stage</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Probability</div>
                  <div className="col-span-2 text-right">Close Date</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                 {filteredDeals.length > 0 ? (
                     filteredDeals.map((deal) => {
                         const stageInfo = getStageInfo(deal.stage);
                         return (
                            <Link to={`/dashboard/deals/${deal.id}`} key={deal.id} className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-50 items-center hover:bg-[#F8F8F6] transition-colors group">
                                <div className="col-span-4">
                                    <div className="font-bold text-[#1A1A1A] text-sm group-hover:text-[#EAD07D] transition-colors">{deal.name}</div>
                                    <div className="text-xs text-[#666]">{deal.account?.name || 'No account'}</div>
                                </div>
                                <div className="col-span-2">
                                    <Badge variant={stageInfo.badge} size="sm">
                                        {stageInfo.title}
                                    </Badge>
                                </div>
                                <div className="col-span-2 text-sm font-medium text-[#1A1A1A]">
                                    {formatCurrency(deal.amount)}
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                              className="h-full"
                                              style={{ backgroundColor: stageInfo.color, width: `${deal.probability || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-[#666] w-8 text-right">{deal.probability || 0}%</span>
                                    </div>
                                </div>
                                <div className="col-span-2 text-right text-sm text-[#666]">
                                    {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : '-'}
                                </div>
                            </Link>
                         );
                     })
                 ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-[#666]">
                        <Filter size={24} className="mb-2 opacity-20" />
                        <p>{searchQuery ? `No deals match "${searchQuery}"` : 'No deals yet. Create your first deal!'}</p>
                    </div>
                 )}
              </div>
          </Card>
      )}

      <CreateDealModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateDeal}
        accounts={companies.map(c => ({ id: c.id, name: c.name }))}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
      />

      {/* Close Lost Modal */}
      {showCloseLostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">Mark Opportunity as Lost</h2>
              <button onClick={() => { setShowCloseLostModal(null); setCloseLostReason(''); }} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="mb-6">
              <label className="text-xs font-medium text-[#666] mb-1 block">Reason for Loss *</label>
              <textarea
                value={closeLostReason}
                onChange={(e) => setCloseLostReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none min-h-[100px]"
                placeholder="e.g., Lost to competitor, budget constraints, timing..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCloseLostModal(null); setCloseLostReason(''); }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCloseLost(showCloseLostModal)}
                disabled={!closeLostReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setActionMenuOpen(null)} />
      )}
    </div>
    </FeatureGate>
  );
};
