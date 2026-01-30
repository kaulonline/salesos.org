import React, { useState } from 'react';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  X,
  DollarSign,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

export interface Competitor {
  id: string;
  name: string;
  website?: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK' | 'UNKNOWN';
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  status: 'ACTIVE' | 'ELIMINATED' | 'NO_BID';
  notes?: string;
}

interface CompetitorTrackingProps {
  competitors: Competitor[];
  onAdd?: (competitor: Omit<Competitor, 'id'>) => void;
  onUpdate?: (id: string, competitor: Partial<Competitor>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

const strengthConfig = {
  STRONG: { label: 'Strong', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  MODERATE: { label: 'Moderate', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  WEAK: { label: 'Weak', color: 'text-[#666]', bg: 'bg-[#F8F8F6]' },
  UNKNOWN: { label: 'Unknown', color: 'text-[#999]', bg: 'bg-[#F8F8F6]' },
};

const threatConfig = {
  HIGH: { label: 'High Threat', color: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]', textColor: 'text-white' },
  MEDIUM: { label: 'Medium', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  LOW: { label: 'Low', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
};

const statusConfig = {
  ACTIVE: { label: 'Active', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20', icon: Target },
  ELIMINATED: { label: 'Eliminated', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20', icon: CheckCircle },
  NO_BID: { label: 'No Bid', color: 'text-[#666]', bg: 'bg-[#F8F8F6]', icon: Minus },
};

export const CompetitorTracking: React.FC<CompetitorTrackingProps> = ({
  competitors,
  onAdd,
  onUpdate,
  onDelete,
  readOnly = false,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCompetitor, setNewCompetitor] = useState<Partial<Competitor>>({
    strength: 'MODERATE',
    threatLevel: 'MEDIUM',
    status: 'ACTIVE',
    strengths: [],
    weaknesses: [],
  });
  const [newStrength, setNewStrength] = useState('');
  const [newWeakness, setNewWeakness] = useState('');

  const activeCompetitors = competitors.filter(c => c.status === 'ACTIVE');
  const eliminatedCompetitors = competitors.filter(c => c.status === 'ELIMINATED');

  const handleAddCompetitor = () => {
    if (onAdd && newCompetitor.name) {
      onAdd(newCompetitor as Omit<Competitor, 'id'>);
      setNewCompetitor({
        strength: 'MODERATE',
        threatLevel: 'MEDIUM',
        status: 'ACTIVE',
        strengths: [],
        weaknesses: [],
      });
      setShowAddModal(false);
    }
  };

  const handleAddStrength = () => {
    if (newStrength.trim()) {
      setNewCompetitor({
        ...newCompetitor,
        strengths: [...(newCompetitor.strengths || []), newStrength.trim()],
      });
      setNewStrength('');
    }
  };

  const handleAddWeakness = () => {
    if (newWeakness.trim()) {
      setNewCompetitor({
        ...newCompetitor,
        weaknesses: [...(newCompetitor.weaknesses || []), newWeakness.trim()],
      });
      setNewWeakness('');
    }
  };

  const CompetitorCard: React.FC<{ competitor: Competitor }> = ({ competitor }) => {
    const strength = strengthConfig[competitor.strength];
    const threat = threatConfig[competitor.threatLevel];
    const status = statusConfig[competitor.status];
    const StatusIcon = status.icon;
    const isExpanded = expandedId === competitor.id;

    return (
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div
          className="p-4 cursor-pointer hover:bg-[#F8F8F6] transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : competitor.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0EBD8] flex items-center justify-center">
                <Building2 size={18} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h4 className="font-medium text-[#1A1A1A]">{competitor.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${threat.bg} ${threat.color}`}>
                    {threat.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(competitor.id);
                  }}
                  className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(competitor.id);
                  }}
                  className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-black/5 pt-4 space-y-4">
            {competitor.pricing && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign size={14} className="text-[#999]" />
                <span className="text-[#666]">Pricing: {competitor.pricing}</span>
              </div>
            )}

            {competitor.strengths.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#666] mb-2 flex items-center gap-1">
                  <TrendingUp size={12} className="text-[#93C01F]" />
                  Their Strengths
                </p>
                <div className="flex flex-wrap gap-2">
                  {competitor.strengths.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-[#93C01F]/10 text-[#666] rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {competitor.weaknesses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[#666] mb-2 flex items-center gap-1">
                  <TrendingDown size={12} className="text-[#EAD07D]" />
                  Their Weaknesses
                </p>
                <div className="flex flex-wrap gap-2">
                  {competitor.weaknesses.map((w, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-[#EAD07D]/10 text-[#666] rounded-lg">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {competitor.notes && (
              <div className="text-sm text-[#666] bg-[#F8F8F6] rounded-lg p-3">
                {competitor.notes}
              </div>
            )}

            {!readOnly && competitor.status === 'ACTIVE' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate?.(competitor.id, { status: 'ELIMINATED' })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#93C01F]/20 text-[#93C01F] rounded-lg text-sm font-medium hover:bg-[#93C01F]/30 transition-colors"
                >
                  <CheckCircle size={14} />
                  Mark Eliminated
                </button>
                <button
                  onClick={() => onUpdate?.(competitor.id, { status: 'NO_BID' })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#F8F8F6] text-[#666] rounded-lg text-sm font-medium hover:bg-[#F0EBD8] transition-colors"
                >
                  <Minus size={14} />
                  No Bid
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
            <Target size={16} className="text-[#EAD07D]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">Competitive Landscape</h3>
            <p className="text-xs text-[#999]">{activeCompetitors.length} active competitors</p>
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      {competitors.length === 0 ? (
        <div className="py-8 text-center">
          <Shield size={32} className="mx-auto text-[#999] opacity-40 mb-2" />
          <p className="text-[#666]">No competitors tracked</p>
          <p className="text-sm text-[#999]">Add competitors to track your competitive position</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCompetitors.map(competitor => (
            <CompetitorCard key={competitor.id} competitor={competitor} />
          ))}

          {eliminatedCompetitors.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-black/5" />
                <span className="text-xs text-[#999]">Eliminated ({eliminatedCompetitors.length})</span>
                <div className="flex-1 h-px bg-black/5" />
              </div>
              {eliminatedCompetitors.map(competitor => (
                <CompetitorCard key={competitor.id} competitor={competitor} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 pb-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Add Competitor</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#666] hover:text-[#1A1A1A]"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  Competitor Name *
                </label>
                <input
                  type="text"
                  value={newCompetitor.name || ''}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  placeholder="e.g., Salesforce"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">
                    Threat Level
                  </label>
                  <select
                    value={newCompetitor.threatLevel}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, threatLevel: e.target.value as Competitor['threatLevel'] })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">
                    Their Strength
                  </label>
                  <select
                    value={newCompetitor.strength}
                    onChange={(e) => setNewCompetitor({ ...newCompetitor, strength: e.target.value as Competitor['strength'] })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  >
                    <option value="STRONG">Strong</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="WEAK">Weak</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  Pricing Info
                </label>
                <input
                  type="text"
                  value={newCompetitor.pricing || ''}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, pricing: e.target.value })}
                  placeholder="e.g., $150/user/month"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  Their Strengths
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddStrength()}
                    placeholder="Add a strength"
                    className="flex-1 px-4 py-2 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                  <button
                    onClick={handleAddStrength}
                    className="px-3 py-2 bg-[#F0EBD8] text-[#1A1A1A] rounded-xl hover:bg-[#EAD07D]/30 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {newCompetitor.strengths && newCompetitor.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newCompetitor.strengths.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-[#93C01F]/10 text-[#666] rounded-lg">
                        {s}
                        <button
                          onClick={() => setNewCompetitor({
                            ...newCompetitor,
                            strengths: newCompetitor.strengths?.filter((_, idx) => idx !== i),
                          })}
                          className="text-[#999] hover:text-[#666]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  Their Weaknesses
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWeakness}
                    onChange={(e) => setNewWeakness(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddWeakness()}
                    placeholder="Add a weakness"
                    className="flex-1 px-4 py-2 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                  <button
                    onClick={handleAddWeakness}
                    className="px-3 py-2 bg-[#F0EBD8] text-[#1A1A1A] rounded-xl hover:bg-[#EAD07D]/30 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {newCompetitor.weaknesses && newCompetitor.weaknesses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newCompetitor.weaknesses.map((w, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-[#EAD07D]/10 text-[#666] rounded-lg">
                        {w}
                        <button
                          onClick={() => setNewCompetitor({
                            ...newCompetitor,
                            weaknesses: newCompetitor.weaknesses?.filter((_, idx) => idx !== i),
                          })}
                          className="text-[#999] hover:text-[#666]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">
                  Notes
                </label>
                <textarea
                  value={newCompetitor.notes || ''}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, notes: e.target.value })}
                  placeholder="Additional notes about this competitor..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-[#F8F8F6] text-[#666] rounded-xl font-medium hover:bg-[#F0EBD8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitor.name}
                  className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Competitor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorTracking;
