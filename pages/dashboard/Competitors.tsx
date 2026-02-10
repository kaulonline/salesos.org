import React, { useState } from 'react';
import { Search, Plus, Swords, Shield, Target, MoreHorizontal, X, Loader2, Trash2, Edit2, TrendingUp, TrendingDown, AlertCircle, Check, ExternalLink, FileText, Sparkles, MessageSquare, BarChart3, Lightbulb, Copy, RefreshCw } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { useCompetitors, useCompetitor } from '../../src/hooks/useCompetitors';
import { competitorsApi } from '../../src/api/competitors';
import type {
  Competitor,
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CompetitorTier,
  CompetitorStatus,
} from '../../src/types/competitor';
import { TIER_LABELS, TIER_COLORS, STATUS_LABELS, STATUS_COLORS } from '../../src/types/competitor';

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export const Competitors: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [viewingCompetitor, setViewingCompetitor] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    competitors,
    stats,
    loading,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCompetitors({ search: searchQuery || undefined });

  const filteredCompetitors = competitors.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCompetitor = async (data: CreateCompetitorDto) => {
    try {
      await create(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create competitor:', error);
    }
  };

  const handleUpdateCompetitor = async (id: string, data: UpdateCompetitorDto) => {
    try {
      await update(id, data);
      setEditingCompetitor(null);
    } catch (error) {
      console.error('Failed to update competitor:', error);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await remove(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete competitor:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-64 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[280px] rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Competitor Intelligence</h1>
          <p className="text-[#666]">Track competitors, battlecards, and win/loss analysis.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search competitors..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm outline-none shadow-sm focus:ring-1 focus:ring-[#EAD07D]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-all"
          >
            <Plus size={16} /> Add Competitor
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Swords size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</div>
              <div className="text-xs text-[#666]">Total Competitors</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Target size={18} className="text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.primary}</div>
              <div className="text-xs text-[#666]">Primary Threats</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats.totalWins}</div>
              <div className="text-xs text-[#666]">Wins Against</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Shield size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{formatPercent(stats.overallWinRate)}</div>
              <div className="text-xs text-[#666]">Win Rate</div>
            </div>
          </Card>
        </div>
      )}

      {/* Competitors Grid */}
      {filteredCompetitors.length === 0 ? (
        <Card className="p-12 text-center">
          <Swords size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">
            {searchQuery ? 'No competitors found' : 'No competitors yet'}
          </h3>
          <p className="text-[#666] mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first competitor to start tracking win/loss data.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              <Plus size={18} />
              Add Competitor
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitors.map((competitor) => (
            <div
              key={competitor.id}
              className={`dash-card p-6 group hover:shadow-card transition-all duration-300 relative overflow-hidden ${
                competitor.status !== 'ACTIVE' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl ${TIER_COLORS[competitor.tier]} flex items-center justify-center shadow-sm`}>
                  <Swords size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={STATUS_COLORS[competitor.status]}>
                    {STATUS_LABELS[competitor.status]}
                  </Badge>
                  <button
                    onClick={() => setViewingCompetitor(competitor.id)}
                    className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    onClick={() => setEditingCompetitor(competitor)}
                    className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#999] hover:text-[#1A1A1A]"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(competitor.id)}
                    className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-[#999] hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{competitor.name}</h3>
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#999] hover:text-[#EAD07D] flex items-center gap-1 mb-3"
                >
                  {competitor.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={10} />
                </a>
              )}

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${TIER_COLORS[competitor.tier]} text-white`}>
                  {TIER_LABELS[competitor.tier]}
                </span>
              </div>

              {/* Strengths/Weaknesses Preview */}
              {competitor.strengths && competitor.strengths.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-[#999] mb-1">Strengths</div>
                  <div className="flex flex-wrap gap-1">
                    {competitor.strengths.slice(0, 2).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                        {s}
                      </span>
                    ))}
                    {competitor.strengths.length > 2 && (
                      <span className="px-2 py-0.5 bg-[#F8F8F6] text-[#666] rounded text-xs">
                        +{competitor.strengths.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Win/Loss Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{competitor.winsAgainst}</div>
                    <div className="text-xs text-[#666]">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{competitor.lossesAgainst}</div>
                    <div className="text-xs text-[#666]">Losses</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#1A1A1A]">
                    {formatPercent(competitor.winRateAgainst)}
                  </div>
                  <div className="text-xs text-[#666]">Win Rate</div>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Placeholder */}
          {!searchQuery && (
            <div
              onClick={() => setShowCreateModal(true)}
              className="border-2 border-dashed border-[#1A1A1A]/10 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-all cursor-pointer min-h-[280px] group"
            >
              <div className="w-16 h-16 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A] mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A]">Add Competitor</h3>
              <p className="text-sm text-[#666] mt-2">Track a new competitor with battlecards and win/loss data.</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCompetitor) && (
        <CompetitorModal
          competitor={editingCompetitor}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCompetitor(null);
          }}
          onSave={editingCompetitor
            ? (data) => handleUpdateCompetitor(editingCompetitor.id, data)
            : handleCreateCompetitor
          }
          saving={isCreating || isUpdating}
        />
      )}

      {/* Detail View Modal */}
      {viewingCompetitor && (
        <CompetitorDetailModal
          competitorId={viewingCompetitor}
          onClose={() => setViewingCompetitor(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Delete Competitor</h3>
                <p className="text-sm text-[#666]">This will also delete all associated battlecards.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCompetitor(deleteConfirm)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Competitor Modal Component
interface CompetitorModalProps {
  competitor: Competitor | null;
  onClose: () => void;
  onSave: (data: CreateCompetitorDto | UpdateCompetitorDto) => Promise<void>;
  saving: boolean;
}

const CompetitorModal: React.FC<CompetitorModalProps> = ({ competitor, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<CreateCompetitorDto>({
    name: competitor?.name || '',
    website: competitor?.website || '',
    tier: competitor?.tier || 'SECONDARY',
    status: competitor?.status || 'ACTIVE',
    strengths: competitor?.strengths || [],
    weaknesses: competitor?.weaknesses || [],
    differentiators: competitor?.differentiators || [],
  });
  const [error, setError] = useState('');
  const [strengthInput, setStrengthInput] = useState('');
  const [weaknessInput, setWeaknessInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Competitor name is required');
      return;
    }

    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save competitor');
    }
  };

  const addStrength = () => {
    if (strengthInput.trim()) {
      setFormData({ ...formData, strengths: [...(formData.strengths || []), strengthInput.trim()] });
      setStrengthInput('');
    }
  };

  const addWeakness = () => {
    if (weaknessInput.trim()) {
      setFormData({ ...formData, weaknesses: [...(formData.weaknesses || []), weaknessInput.trim()] });
      setWeaknessInput('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">
            {competitor ? 'Edit Competitor' : 'Add Competitor'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value as CompetitorTier })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CompetitorStatus })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Strengths */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#666] mb-1">Strengths</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={strengthInput}
                  onChange={(e) => setStrengthInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  placeholder="Add a strength..."
                />
                <button
                  type="button"
                  onClick={addStrength}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium hover:bg-green-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.strengths?.map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm flex items-center gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, strengths: formData.strengths?.filter((_, idx) => idx !== i) })}
                      className="hover:text-green-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#666] mb-1">Weaknesses</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={weaknessInput}
                  onChange={(e) => setWeaknessInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWeakness())}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  placeholder="Add a weakness..."
                />
                <button
                  type="button"
                  onClick={addWeakness}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.weaknesses?.map((w, i) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm flex items-center gap-1">
                    {w}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, weaknesses: formData.weaknesses?.filter((_, idx) => idx !== i) })}
                      className="hover:text-red-900"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {competitor ? 'Update Competitor' : 'Add Competitor'}
                </>
              )}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Competitor Detail Modal with Battlecards and AI Features
interface CompetitorDetailModalProps {
  competitorId: string;
  onClose: () => void;
}

const CompetitorDetailModal: React.FC<CompetitorDetailModalProps> = ({ competitorId, onClose }) => {
  const { competitor, loading, refetch } = useCompetitor(competitorId);
  const [activeTab, setActiveTab] = useState<'overview' | 'battlecards' | 'analysis' | 'objections'>('overview');
  const [generatingBattlecard, setGeneratingBattlecard] = useState(false);
  const [generatedBattlecard, setGeneratedBattlecard] = useState<any>(null);
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  const [winLossAnalysis, setWinLossAnalysis] = useState<any>(null);
  const [objectionInput, setObjectionInput] = useState('');
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [objectionResponse, setObjectionResponse] = useState<any>(null);

  // Load cached data on mount
  React.useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Load cached battlecard
        const battlecard = await competitorsApi.generateBattlecard(competitorId, false);
        if (battlecard.cached) {
          setGeneratedBattlecard(battlecard);
        }
        // Load cached win/loss analysis
        const analysis = await competitorsApi.analyzeWinLossPatterns(competitorId, false);
        if (analysis.cached) {
          setWinLossAnalysis(analysis);
        }
      } catch (error) {
        // Ignore errors - just means no cached data
      }
    };
    if (competitorId) {
      loadCachedData();
    }
  }, [competitorId]);

  const handleGenerateBattlecard = async (regenerate?: boolean | React.MouseEvent) => {
    // Handle case where event object is passed instead of boolean
    const shouldRegenerate = typeof regenerate === 'boolean' ? regenerate : false;
    setGeneratingBattlecard(true);
    try {
      const result = await competitorsApi.generateBattlecard(competitorId, shouldRegenerate);
      setGeneratedBattlecard(result);
      setActiveTab('battlecards');
    } catch (error) {
      console.error('Failed to generate battlecard:', error);
    } finally {
      setGeneratingBattlecard(false);
    }
  };

  const handleAnalyzePatterns = async (regenerate?: boolean | React.MouseEvent) => {
    // Handle case where event object is passed instead of boolean
    const shouldRegenerate = typeof regenerate === 'boolean' ? regenerate : false;
    setAnalyzingPatterns(true);
    try {
      const result = await competitorsApi.analyzeWinLossPatterns(competitorId, shouldRegenerate);
      setWinLossAnalysis(result);
      setActiveTab('analysis');
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
    } finally {
      setAnalyzingPatterns(false);
    }
  };

  const handleGenerateObjectionResponse = async () => {
    if (!objectionInput.trim()) return;
    setGeneratingResponse(true);
    try {
      const result = await competitorsApi.generateObjectionResponse(competitorId, objectionInput);
      setObjectionResponse(result);
    } catch (error) {
      console.error('Failed to generate response:', error);
    } finally {
      setGeneratingResponse(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading || !competitor) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl p-6">
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#EAD07D]" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${TIER_COLORS[competitor.tier]} flex items-center justify-center shadow-sm`}>
              <Swords size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[#1A1A1A]">{competitor.name}</h2>
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#666] hover:text-[#EAD07D] flex items-center gap-1"
                >
                  {competitor.website}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#F8F8F6] flex items-center justify-center text-[#666]"
          >
            <X size={20} />
          </button>
        </div>

        {/* AI Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleGenerateBattlecard(false)}
              disabled={generatingBattlecard}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EAD07D] to-[#D4B85C] text-[#1A1A1A] rounded-l-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
            >
              {generatingBattlecard ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generatedBattlecard?.cached ? 'View Battlecard' : 'Generate AI Battlecard'}
            </button>
            {generatedBattlecard && (
              <button
                onClick={() => handleGenerateBattlecard(true)}
                disabled={generatingBattlecard}
                className="flex items-center gap-1 px-3 py-2 bg-[#D4B85C] text-[#1A1A1A] rounded-r-xl text-sm font-medium hover:bg-[#C4A84C] transition-all disabled:opacity-50"
                title="Regenerate battlecard"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAnalyzePatterns(false)}
              disabled={analyzingPatterns}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-l-xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50"
            >
              {analyzingPatterns ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
              {winLossAnalysis?.cached ? 'View Analysis' : 'Analyze Win/Loss Patterns'}
            </button>
            {winLossAnalysis && (
              <button
                onClick={() => handleAnalyzePatterns(true)}
                disabled={analyzingPatterns}
                className="flex items-center gap-1 px-3 py-2 bg-[#333] text-white rounded-r-xl text-sm font-medium hover:bg-[#444] transition-all disabled:opacity-50"
                title="Regenerate analysis"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#F8F8F6] p-1 rounded-xl">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'battlecards', label: 'Battlecards', icon: Shield },
            { id: 'analysis', label: 'AI Analysis', icon: BarChart3 },
            { id: 'objections', label: 'Objection Handler', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Win/Loss Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{competitor.winsAgainst}</div>
                <div className="text-sm text-green-700">Wins</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{competitor.lossesAgainst}</div>
                <div className="text-sm text-red-700">Losses</div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#1A1A1A]">{formatPercent(competitor.winRateAgainst)}</div>
                <div className="text-sm text-[#666]">Win Rate</div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-600" /> Strengths
                </h3>
                <div className="space-y-1">
                  {competitor.strengths?.map((s, i) => (
                    <div key={i} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                      {s}
                    </div>
                  ))}
                  {(!competitor.strengths || competitor.strengths.length === 0) && (
                    <div className="text-sm text-[#999]">No strengths documented</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <TrendingDown size={14} className="text-red-600" /> Weaknesses
                </h3>
                <div className="space-y-1">
                  {competitor.weaknesses?.map((w, i) => (
                    <div key={i} className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                      {w}
                    </div>
                  ))}
                  {(!competitor.weaknesses || competitor.weaknesses.length === 0) && (
                    <div className="text-sm text-[#999]">No weaknesses documented</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'battlecards' && (
          <div className="space-y-4">
            {/* AI Generated Battlecard */}
            {generatedBattlecard && (
              <div className="bg-gradient-to-br from-[#EAD07D]/10 to-[#EAD07D]/5 rounded-xl p-5 border border-[#EAD07D]/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#EAD07D]" />
                    <span className="text-xs font-semibold text-[#EAD07D]">
                      {generatedBattlecard.cached ? 'CACHED' : 'AI GENERATED'}
                    </span>
                    {generatedBattlecard.generatedAt && (
                      <span className="text-xs text-[#999]">
                        • {new Date(generatedBattlecard.generatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(generatedBattlecard, null, 2))}
                    className="text-xs text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <h4 className="font-bold text-[#1A1A1A] text-lg mb-2">{generatedBattlecard.title}</h4>
                <p className="text-sm text-[#666] mb-4">{generatedBattlecard.overview}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs font-semibold text-[#999] mb-2">KEY TALKING POINTS</div>
                    <ul className="space-y-1">
                      {generatedBattlecard.keyTalkingPoints?.map((point: string, i: number) => (
                        <li key={i} className="text-sm text-[#1A1A1A] flex items-start gap-2">
                          <Check size={12} className="text-green-600 mt-1 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#999] mb-2">DIFFERENTIATORS</div>
                    <ul className="space-y-1">
                      {generatedBattlecard.differentiators?.map((diff: string, i: number) => (
                        <li key={i} className="text-sm text-[#1A1A1A] flex items-start gap-2">
                          <Target size={12} className="text-[#EAD07D] mt-1 flex-shrink-0" />
                          {diff}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {generatedBattlecard.objectionHandling && generatedBattlecard.objectionHandling.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-[#999] mb-2">OBJECTION HANDLING</div>
                    <div className="space-y-2">
                      {generatedBattlecard.objectionHandling.map((oh: any, i: number) => (
                        <div key={i} className="bg-white rounded-lg p-3">
                          <div className="text-sm font-medium text-red-600 mb-1">"{oh.objection}"</div>
                          <div className="text-sm text-[#666]">{oh.response}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedBattlecard.trapQuestions && generatedBattlecard.trapQuestions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[#999] mb-2">TRAP QUESTIONS</div>
                    <ul className="space-y-1">
                      {generatedBattlecard.trapQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-sm text-[#1A1A1A] flex items-start gap-2">
                          <Lightbulb size={12} className="text-purple-600 mt-1 flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Existing Battlecards */}
            {competitor.battlecards && competitor.battlecards.length > 0 ? (
              competitor.battlecards.map((bc) => (
                <div key={bc.id} className="bg-[#F8F8F6] rounded-xl p-4">
                  <h4 className="font-semibold text-[#1A1A1A] mb-2">{bc.title}</h4>
                  {bc.overview && <p className="text-sm text-[#666] mb-3">{bc.overview}</p>}
                  {bc.keyTalkingPoints && bc.keyTalkingPoints.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-[#999] mb-1">Key Talking Points:</div>
                      <ul className="list-disc list-inside text-sm text-[#666]">
                        {bc.keyTalkingPoints.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : !generatedBattlecard && (
              <div className="bg-[#F8F8F6] rounded-xl p-8 text-center">
                <Shield size={40} className="mx-auto text-[#999] mb-3" />
                <p className="text-[#666] mb-4">No battlecards created yet</p>
                <button
                  onClick={handleGenerateBattlecard}
                  disabled={generatingBattlecard}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-xl text-sm font-medium"
                >
                  <Sparkles size={14} />
                  Generate with AI
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
            {winLossAnalysis ? (
              <div className="space-y-4">
                <div className="bg-[#1A1A1A] rounded-xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-[#EAD07D]" />
                    <span className="text-xs font-semibold text-[#EAD07D]">
                      {winLossAnalysis.cached ? 'CACHED ANALYSIS' : 'AI ANALYSIS'}
                    </span>
                    {winLossAnalysis.generatedAt && (
                      <span className="text-xs text-white/50">
                        • {new Date(winLossAnalysis.generatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-white/90">{winLossAnalysis.summary}</p>
                </div>

                {winLossAnalysis.insights && winLossAnalysis.insights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Key Patterns Identified</h4>
                    <div className="space-y-2">
                      {winLossAnalysis.insights.map((insight: any, i: number) => (
                        <div key={i} className="bg-[#F8F8F6] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-[#1A1A1A]">{insight.pattern}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              insight.confidence >= 0.7 ? 'bg-green-100 text-green-700' :
                              insight.confidence >= 0.4 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {(insight.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          <p className="text-sm text-[#666]">{insight.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {winLossAnalysis.recommendations && winLossAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Recommendations</h4>
                    <div className="bg-green-50 rounded-xl p-4">
                      <ul className="space-y-2">
                        {winLossAnalysis.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                            <Lightbulb size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAnalyzePatterns}
                  disabled={analyzingPatterns}
                  className="flex items-center gap-2 text-sm text-[#666] hover:text-[#1A1A1A]"
                >
                  <RefreshCw size={14} />
                  Refresh Analysis
                </button>
              </div>
            ) : (
              <div className="bg-[#F8F8F6] rounded-xl p-8 text-center">
                <BarChart3 size={40} className="mx-auto text-[#999] mb-3" />
                <p className="text-[#666] mb-4">Analyze win/loss patterns to identify trends and get actionable insights</p>
                <button
                  onClick={handleAnalyzePatterns}
                  disabled={analyzingPatterns}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium"
                >
                  {analyzingPatterns ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                  Analyze Patterns
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'objections' && (
          <div className="space-y-4">
            <div className="bg-[#F8F8F6] rounded-xl p-4">
              <label className="block text-sm font-medium text-[#666] mb-2">
                Enter a competitive objection you're facing:
              </label>
              <textarea
                value={objectionInput}
                onChange={(e) => setObjectionInput(e.target.value)}
                placeholder="e.g., 'The prospect says your competitor has better pricing...'"
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                rows={3}
              />
              <button
                onClick={handleGenerateObjectionResponse}
                disabled={generatingResponse || !objectionInput.trim()}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
              >
                {generatingResponse ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate Response
              </button>
            </div>

            {objectionResponse && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-[#EAD07D]" />
                  <span className="text-xs font-semibold text-[#EAD07D]">AI SUGGESTED RESPONSE</span>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-semibold text-[#999] mb-2">PRIMARY RESPONSE</div>
                  <div className="bg-[#F8F8F6] rounded-lg p-3 text-sm text-[#1A1A1A]">
                    {objectionResponse.response}
                    <button
                      onClick={() => copyToClipboard(objectionResponse.response)}
                      className="mt-2 text-xs text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
                    >
                      <Copy size={10} /> Copy
                    </button>
                  </div>
                </div>

                {objectionResponse.alternativeResponses && objectionResponse.alternativeResponses.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-[#999] mb-2">ALTERNATIVE APPROACHES</div>
                    <div className="space-y-2">
                      {objectionResponse.alternativeResponses.map((alt: string, i: number) => (
                        <div key={i} className="bg-[#F8F8F6] rounded-lg p-3 text-sm text-[#666]">
                          {alt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {objectionResponse.proofPoints && objectionResponse.proofPoints.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-[#999] mb-2">PROOF POINTS TO MENTION</div>
                    <ul className="space-y-1">
                      {objectionResponse.proofPoints.map((point: string, i: number) => (
                        <li key={i} className="text-sm text-[#1A1A1A] flex items-start gap-2">
                          <Check size={12} className="text-green-600 mt-1 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {objectionResponse.followUpQuestions && objectionResponse.followUpQuestions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-[#999] mb-2">FOLLOW-UP QUESTIONS</div>
                    <ul className="space-y-1">
                      {objectionResponse.followUpQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-sm text-[#1A1A1A] flex items-start gap-2">
                          <MessageSquare size={12} className="text-blue-600 mt-1 flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
