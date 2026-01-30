import React, { useState, useMemo } from 'react';
import {
  Map,
  Plus,
  Edit2,
  Trash2,
  Users,
  Building2,
  DollarSign,
  Target,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  Globe,
  Factory,
  Layers,
  Check,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { useTerritories, useTerritory, useCompanies } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Territory, TerritoryType, CreateTerritoryDto, UpdateTerritoryDto } from '../../src/types/territory';
import { AIBuilderTrigger } from '../../src/components/AIBuilder/AIBuilderTrigger';
import { AIBuilderModal } from '../../src/components/AIBuilder/AIBuilderModal';
import { AIBuilderEntityType, TerritoryConfig } from '../../src/types/aiBuilder';

const typeLabels: Record<TerritoryType, string> = {
  GEOGRAPHIC: 'Geographic',
  NAMED_ACCOUNTS: 'Named Accounts',
  INDUSTRY: 'Industry',
  ACCOUNT_SIZE: 'Account Size',
  CUSTOM: 'Custom',
};

const typeColors: Record<TerritoryType, string> = {
  GEOGRAPHIC: '#3B82F6',
  NAMED_ACCOUNTS: '#8B5CF6',
  INDUSTRY: '#10B981',
  ACCOUNT_SIZE: '#F59E0B',
  CUSTOM: '#EC4899',
};

const typeIcons: Record<TerritoryType, React.ElementType> = {
  GEOGRAPHIC: Globe,
  NAMED_ACCOUNTS: Building2,
  INDUSTRY: Factory,
  ACCOUNT_SIZE: Layers,
  CUSTOM: Map,
};

// Common US states for geographic criteria
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// Common industries
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education',
  'Real Estate', 'Construction', 'Transportation', 'Energy', 'Media', 'Telecommunications',
  'Agriculture', 'Hospitality', 'Professional Services', 'Non-Profit', 'Government'
];

// Account types
const ACCOUNT_TYPES = ['Customer', 'Prospect', 'Partner', 'Competitor', 'Other'];

interface CriteriaForm {
  states: string[];
  countries: string[];
  industries: string[];
  accountTypes: string[];
  minEmployees: string;
  maxEmployees: string;
  minRevenue: string;
  maxRevenue: string;
}

const emptyCriteria: CriteriaForm = {
  states: [],
  countries: [],
  industries: [],
  accountTypes: [],
  minEmployees: '',
  maxEmployees: '',
  minRevenue: '',
  maxRevenue: '',
};

export const Territories: React.FC = () => {
  const { territories, stats, loading, create, update, remove, isCreating, isUpdating, isDeleting } = useTerritories();
  const { companies } = useCompanies();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Territory | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state for create
  const [formData, setFormData] = useState<CreateTerritoryDto>({
    name: '',
    description: '',
    type: 'GEOGRAPHIC',
    criteria: {},
    color: '#3B82F6',
  });
  const [criteriaForm, setCriteriaForm] = useState<CriteriaForm>(emptyCriteria);

  // Form state for edit
  const [editFormData, setEditFormData] = useState<UpdateTerritoryDto>({});
  const [editCriteriaForm, setEditCriteriaForm] = useState<CriteriaForm>(emptyCriteria);

  // Map AI config types to Prisma types
  const mapAITypeToPrisma = (aiType: string): TerritoryType => {
    const typeMap: Record<string, TerritoryType> = {
      'GEOGRAPHIC': 'GEOGRAPHIC',
      'NAMED_ACCOUNT': 'NAMED_ACCOUNTS',
      'NAMED_ACCOUNTS': 'NAMED_ACCOUNTS',
      'INDUSTRY': 'INDUSTRY',
      'SEGMENT': 'ACCOUNT_SIZE',
      'ACCOUNT_SIZE': 'ACCOUNT_SIZE',
      'HYBRID': 'CUSTOM',
      'CUSTOM': 'CUSTOM',
    };
    return typeMap[aiType] || 'CUSTOM';
  };

  const filteredTerritories = territories.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = territories.reduce((sum, t) => sum + (t.performanceStats?.pipelineValue || 0), 0);
  const totalClosed = territories.reduce((sum, t) => sum + (t.performanceStats?.closedWonValue || 0), 0);
  const totalAccounts = stats?.totalAccounts || territories.reduce((sum, t) => sum + (t.accountCount || 0), 0);

  const formatCurrency = (value: number | string | undefined | null) => {
    const num = Number(value) || 0;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  // Build criteria object from form
  const buildCriteria = (form: CriteriaForm) => {
    const criteria: Record<string, any> = {};
    if (form.states.length > 0) criteria.states = form.states;
    if (form.countries.length > 0) criteria.countries = form.countries;
    if (form.industries.length > 0) criteria.industries = form.industries;
    if (form.accountTypes.length > 0) criteria.accountTypes = form.accountTypes;
    if (form.minEmployees) criteria.minEmployees = parseInt(form.minEmployees);
    if (form.maxEmployees) criteria.maxEmployees = parseInt(form.maxEmployees);
    if (form.minRevenue) criteria.minRevenue = parseInt(form.minRevenue);
    if (form.maxRevenue) criteria.maxRevenue = parseInt(form.maxRevenue);
    return Object.keys(criteria).length > 0 ? criteria : undefined;
  };

  // Parse criteria object to form
  const parseCriteria = (criteria: Record<string, any> | null | undefined): CriteriaForm => {
    if (!criteria) return emptyCriteria;
    return {
      states: criteria.states || [],
      countries: criteria.countries || [],
      industries: criteria.industries || [],
      accountTypes: criteria.accountTypes || [],
      minEmployees: criteria.minEmployees?.toString() || '',
      maxEmployees: criteria.maxEmployees?.toString() || '',
      minRevenue: criteria.minRevenue?.toString() || '',
      maxRevenue: criteria.maxRevenue?.toString() || '',
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const criteria = buildCriteria(criteriaForm);
      await create({ ...formData, criteria });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', type: 'GEOGRAPHIC', criteria: {}, color: '#3B82F6' });
      setCriteriaForm(emptyCriteria);
    } catch (error) {
      console.error('Failed to create territory:', error);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      const criteria = buildCriteria(editCriteriaForm);
      await update(showEditModal.id, { ...editFormData, criteria });
      setShowEditModal(null);
      setEditFormData({});
      setEditCriteriaForm(emptyCriteria);
    } catch (error) {
      console.error('Failed to update territory:', error);
    }
  };

  const openEditModal = (territory: Territory) => {
    setEditFormData({
      name: territory.name,
      description: territory.description || '',
      type: territory.type,
      color: territory.color || typeColors[territory.type],
    });
    setEditCriteriaForm(parseCriteria(territory.criteria));
    setShowEditModal(territory);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete territory:', error);
    }
  };

  const handleAIApply = async (config: Record<string, any>) => {
    const territoryConfig = config as TerritoryConfig;
    try {
      await create({
        name: territoryConfig.name,
        description: territoryConfig.description,
        type: mapAITypeToPrisma(territoryConfig.type),
        color: territoryConfig.color,
        criteria: territoryConfig.criteria || {},
      });
    } catch (error) {
      console.error('Failed to create territory from AI:', error);
    }
  };

  const handleAIEditManually = (config: Record<string, any>) => {
    const territoryConfig = config as TerritoryConfig;
    setFormData({
      name: territoryConfig.name,
      description: territoryConfig.description || '',
      type: mapAITypeToPrisma(territoryConfig.type),
      color: territoryConfig.color || '#3B82F6',
      criteria: territoryConfig.criteria || {},
    });
    // Parse AI criteria to form
    if (territoryConfig.criteria) {
      const newCriteria: CriteriaForm = { ...emptyCriteria };
      if (territoryConfig.criteria.geographic?.states) {
        newCriteria.states = territoryConfig.criteria.geographic.states;
      }
      if (territoryConfig.criteria.geographic?.countries) {
        newCriteria.countries = territoryConfig.criteria.geographic.countries;
      }
      if (territoryConfig.criteria.industry?.industries) {
        newCriteria.industries = territoryConfig.criteria.industry.industries;
      }
      if (territoryConfig.criteria.segment?.minEmployees) {
        newCriteria.minEmployees = territoryConfig.criteria.segment.minEmployees.toString();
      }
      if (territoryConfig.criteria.segment?.maxEmployees) {
        newCriteria.maxEmployees = territoryConfig.criteria.segment.maxEmployees.toString();
      }
      if (territoryConfig.criteria.segment?.minRevenue) {
        newCriteria.minRevenue = territoryConfig.criteria.segment.minRevenue.toString();
      }
      if (territoryConfig.criteria.segment?.maxRevenue) {
        newCriteria.maxRevenue = territoryConfig.criteria.segment.maxRevenue.toString();
      }
      setCriteriaForm(newCriteria);
    }
    setShowAIModal(false);
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
              <Map size={28} className="text-[#EAD07D]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Territory Management</h1>
              <p className="text-[#666] mt-1">Organize and track performance by territory</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AIBuilderTrigger
              onClick={() => setShowAIModal(true)}
              label="Create with AI"
              variant="secondary"
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Create Territory
            </button>
          </div>
        </div>

        {/* Empty State */}
        {territories.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5">
            <div className="max-w-md mx-auto text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#F0EBD8] flex items-center justify-center mx-auto mb-6">
                <Map size={40} className="text-[#999]" />
              </div>
              <h2 className="text-2xl font-light text-[#1A1A1A] mb-3">No Territories Yet</h2>
              <p className="text-[#666] mb-8">
                Organize your accounts and sales team by geographic regions, industries, or custom segments.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#F8F8F6] rounded-2xl p-4 text-left">
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Geographic</h3>
                  <p className="text-sm text-[#666]">Segment by region, state, or country</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4 text-left">
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Industry</h3>
                  <p className="text-sm text-[#666]">Group accounts by vertical</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4 text-left">
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Named Accounts</h3>
                  <p className="text-sm text-[#666]">Strategic accounts list</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-2xl p-4 text-left">
                  <h3 className="font-medium text-[#1A1A1A] mb-1">Account Size</h3>
                  <p className="text-sm text-[#666]">By employee count or revenue</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
              >
                Create Your First Territory
              </button>
              <p className="text-sm text-[#999] mt-4">
                You have {companies.length} accounts ready to be organized into territories.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Map size={18} className="text-[#1A1A1A]" />
                  </div>
                  <span className="text-sm text-[#666]">Territories</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{territories.length}</p>
              </div>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                    <Building2 size={18} className="text-[#93C01F]" />
                  </div>
                  <span className="text-sm text-[#666]">Total Accounts</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{totalAccounts}</p>
              </div>
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Target size={18} className="text-blue-600" />
                  </div>
                  <span className="text-sm text-[#666]">Total Pipeline</span>
                </div>
                <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(totalPipeline)}</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-[24px] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <DollarSign size={18} className="text-[#EAD07D]" />
                  </div>
                  <span className="text-sm text-white/60">Closed Revenue</span>
                </div>
                <p className="text-3xl font-light text-white">{formatCurrency(totalClosed)}</p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                <input
                  type="text"
                  placeholder="Search territories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
            </div>

            {/* Territory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTerritories.map(territory => {
                const color = territory.color || typeColors[territory.type] || '#3B82F6';
                return (
                  <div
                    key={territory.id}
                    className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <Map size={20} style={{ color }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A]">{territory.name}</h3>
                          <span className="text-xs text-[#999] bg-[#F8F8F6] px-2 py-0.5 rounded-full">
                            {typeLabels[territory.type]}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(territory)}
                          className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                          title="Edit territory"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(territory.id)}
                          className="p-2 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete territory"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-[#666] mb-4 line-clamp-2">
                      {territory.description || 'No description'}
                    </p>

                    <div className="flex items-center gap-2 mb-4 text-sm">
                      <Users size={14} className="text-[#999]" />
                      <span className="text-[#666]">Owner:</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {territory.owner?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                        <p className="text-lg font-semibold text-[#1A1A1A]">{territory.accountCount}</p>
                        <p className="text-xs text-[#999]">Accounts</p>
                      </div>
                      <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                        <p className="text-lg font-semibold text-[#1A1A1A]">
                          {formatCurrency(territory.performanceStats?.pipelineValue || 0)}
                        </p>
                        <p className="text-xs text-[#999]">Pipeline</p>
                      </div>
                      <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                        <p className="text-lg font-semibold text-[#93C01F]">
                          {formatCurrency(territory.performanceStats?.closedWonValue || 0)}
                        </p>
                        <p className="text-xs text-[#999]">Closed</p>
                      </div>
                    </div>

                    {territory.performanceStats?.winRate !== undefined && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-[#666]">Win Rate</span>
                          <span className="font-medium text-[#1A1A1A]">
                            {(Number(territory.performanceStats.winRate) || 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#93C01F] rounded-full transition-all"
                            style={{ width: `${Number(territory.performanceStats.winRate) || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTerritoryId(territory.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors"
                      >
                        View Accounts
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add Territory Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#F8F8F6] rounded-[24px] p-6 border-2 border-dashed border-black/10 hover:border-[#EAD07D] hover:bg-[#EAD07D]/5 transition-colors flex flex-col items-center justify-center min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                  <Plus size={24} className="text-[#999]" />
                </div>
                <p className="text-[#666] font-medium">Create New Territory</p>
                <p className="text-sm text-[#999] mt-1">Define rules to segment accounts</p>
              </button>
            </div>

            {/* Territory Performance Comparison */}
            {territories.length > 0 && (
              <div className="mt-8 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Territory Performance</h2>
                <div className="space-y-4">
                  {territories.map(territory => {
                    const pipeline = territory.performanceStats?.pipelineValue || 0;
                    const closed = territory.performanceStats?.closedWonValue || 0;
                    const pipelinePercent = totalPipeline > 0 ? (pipeline / totalPipeline) * 100 : 0;
                    const closedPercent = totalClosed > 0 ? (closed / totalClosed) * 100 : 0;
                    const color = territory.color || typeColors[territory.type] || '#3B82F6';

                    return (
                      <div key={territory.id} className="flex items-center gap-4">
                        <div className="w-32 flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm font-medium text-[#1A1A1A] truncate">{territory.name}</span>
                        </div>
                        <div className="flex-1">
                          <div className="h-6 bg-[#F0EBD8] rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-[#93C01F] transition-all duration-500"
                              style={{ width: `${closedPercent}%` }}
                              title={`Closed: ${formatCurrency(closed)}`}
                            />
                            <div
                              className="h-full bg-[#EAD07D] transition-all duration-500"
                              style={{ width: `${Math.max(0, pipelinePercent - closedPercent)}%` }}
                              title={`Pipeline: ${formatCurrency(pipeline)}`}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(pipeline)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-6 mt-6 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#93C01F]" />
                    <span className="text-xs text-[#666]">Closed Won</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#EAD07D]" />
                    <span className="text-xs text-[#666]">Open Pipeline</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Territory Modal */}
        {showCreateModal && (
          <TerritoryFormModal
            title="Create Territory"
            formData={formData}
            setFormData={setFormData}
            criteriaForm={criteriaForm}
            setCriteriaForm={setCriteriaForm}
            onSubmit={handleCreate}
            onClose={() => {
              setShowCreateModal(false);
              setFormData({ name: '', description: '', type: 'GEOGRAPHIC', criteria: {}, color: '#3B82F6' });
              setCriteriaForm(emptyCriteria);
            }}
            isSubmitting={isCreating}
            submitLabel="Create Territory"
          />
        )}

        {/* Edit Territory Modal */}
        {showEditModal && (
          <TerritoryFormModal
            title="Edit Territory"
            formData={editFormData}
            setFormData={setEditFormData}
            criteriaForm={editCriteriaForm}
            setCriteriaForm={setEditCriteriaForm}
            onSubmit={handleEdit}
            onClose={() => {
              setShowEditModal(null);
              setEditFormData({});
              setEditCriteriaForm(emptyCriteria);
            }}
            isSubmitting={isUpdating}
            submitLabel="Save Changes"
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm animate-in fade-in zoom-in duration-200 p-8">
              <h2 className="text-xl font-medium text-[#1A1A1A] mb-3">Delete Territory</h2>
              <p className="text-[#666] mb-6">
                Are you sure you want to delete this territory? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Territory Detail Drawer */}
        {selectedTerritoryId && (
          <TerritoryDetailDrawer
            territoryId={selectedTerritoryId}
            onClose={() => setSelectedTerritoryId(null)}
            allCompanies={companies}
          />
        )}

        {/* AI Builder Modal */}
        <AIBuilderModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          entityType={AIBuilderEntityType.TERRITORY}
          entityLabel="Territory"
          onApply={handleAIApply}
          onEditManually={handleAIEditManually}
        />
      </div>
    </div>
  );
};

// Territory Form Modal Component (used for Create and Edit)
interface TerritoryFormModalProps {
  title: string;
  formData: CreateTerritoryDto | UpdateTerritoryDto;
  setFormData: (data: any) => void;
  criteriaForm: CriteriaForm;
  setCriteriaForm: (data: CriteriaForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

const TerritoryFormModal: React.FC<TerritoryFormModalProps> = ({
  title,
  formData,
  setFormData,
  criteriaForm,
  setCriteriaForm,
  onSubmit,
  onClose,
  isSubmitting,
  submitLabel,
}) => {
  const [showCriteria, setShowCriteria] = useState(false);

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-8 pb-0 sticky top-0 bg-white">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">{title}</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-8 pt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              placeholder="e.g., West Coast Enterprise"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Type</label>
            <select
              value={formData.type || 'GEOGRAPHIC'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TerritoryType })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
              placeholder="Describe this territory..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Color</label>
            <div className="flex gap-2">
              {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-[#1A1A1A] scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Criteria Section */}
          <div className="border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={() => setShowCriteria(!showCriteria)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h3 className="text-sm font-medium text-[#1A1A1A]">Assignment Criteria</h3>
                <p className="text-xs text-[#666]">Define rules for auto-assigning accounts</p>
              </div>
              <ChevronDown size={20} className={`text-[#666] transition-transform ${showCriteria ? 'rotate-180' : ''}`} />
            </button>

            {showCriteria && (
              <div className="mt-4 space-y-4">
                {/* Geographic Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">States</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#F8F8F6] rounded-xl">
                    {US_STATES.map(state => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, states: toggleArrayItem(criteriaForm.states, state) })}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          criteriaForm.states.includes(state)
                            ? 'bg-[#EAD07D] text-[#1A1A1A] font-medium'
                            : 'bg-white text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                  {criteriaForm.states.length > 0 && (
                    <p className="text-xs text-[#999] mt-1">{criteriaForm.states.length} selected</p>
                  )}
                </div>

                {/* Industry Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">Industries</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#F8F8F6] rounded-xl">
                    {INDUSTRIES.map(industry => (
                      <button
                        key={industry}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, industries: toggleArrayItem(criteriaForm.industries, industry) })}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          criteriaForm.industries.includes(industry)
                            ? 'bg-[#10B981] text-white font-medium'
                            : 'bg-white text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Type Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">Account Types</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, accountTypes: toggleArrayItem(criteriaForm.accountTypes, type) })}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          criteriaForm.accountTypes.includes(type)
                            ? 'bg-[#8B5CF6] text-white font-medium'
                            : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Criteria */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Min Employees</label>
                    <input
                      type="number"
                      value={criteriaForm.minEmployees}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, minEmployees: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Max Employees</label>
                    <input
                      type="number"
                      value={criteriaForm.maxEmployees}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, maxEmployees: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="No limit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Min Revenue ($)</label>
                    <input
                      type="number"
                      value={criteriaForm.minRevenue}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, minRevenue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Max Revenue ($)</label>
                    <input
                      type="number"
                      value={criteriaForm.maxRevenue}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, maxRevenue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Territory Detail Drawer Component
interface TerritoryDetailDrawerProps {
  territoryId: string;
  onClose: () => void;
  allCompanies: any[];
}

const TerritoryDetailDrawer: React.FC<TerritoryDetailDrawerProps> = ({ territoryId, onClose, allCompanies }) => {
  const {
    territory,
    accounts,
    loading,
    autoAssign,
    recalculate,
    assignAccounts,
    removeAccount,
    isAutoAssigning,
    isRecalculating,
    isAssigningAccounts,
    isRemovingAccount,
  } = useTerritory(territoryId);

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Get accounts not already in this territory
  const availableAccounts = useMemo(() => {
    const assignedIds = new Set(accounts.map(a => a.id));
    return allCompanies.filter(c => !assignedIds.has(c.id));
  }, [allCompanies, accounts]);

  const filteredAvailableAccounts = useMemo(() => {
    if (!accountSearch) return availableAccounts.slice(0, 50);
    const search = accountSearch.toLowerCase();
    return availableAccounts.filter(a =>
      a.name?.toLowerCase().includes(search) ||
      a.industry?.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [availableAccounts, accountSearch]);

  const formatCurrency = (value: number | string | undefined | null) => {
    const num = Number(value) || 0;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const handleAssignAccounts = async () => {
    if (selectedAccountIds.length === 0) return;
    try {
      await assignAccounts({ accountIds: selectedAccountIds });
      setSelectedAccountIds([]);
      setShowAccountPicker(false);
      setAccountSearch('');
    } catch (error) {
      console.error('Failed to assign accounts:', error);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await removeAccount(accountId);
    } catch (error) {
      console.error('Failed to remove account:', error);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  if (loading || !territory) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50">
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-32 mb-8" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50">
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-black/5 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-[#1A1A1A]">{territory.name}</h2>
            <span className="text-sm text-[#999]">{typeLabels[territory.type]}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Stats */}
          {territory.performanceStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Pipeline Value</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {formatCurrency(territory.performanceStats.pipelineValue)}
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Closed Won</p>
                <p className="text-2xl font-light text-[#93C01F]">
                  {formatCurrency(territory.performanceStats.closedWonValue)}
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Win Rate</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {(Number(territory.performanceStats.winRate) || 0).toFixed(0)}%
                </p>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-sm text-[#666]">Avg Deal Size</p>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {formatCurrency(territory.performanceStats.avgDealSize)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => autoAssign()}
              disabled={isAutoAssigning}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              <Users size={16} />
              {isAutoAssigning ? 'Assigning...' : 'Auto-Assign'}
            </button>
            <button
              onClick={() => setShowAccountPicker(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-medium text-sm hover:bg-[#d4bc6c] transition-colors"
            >
              <Plus size={16} />
              Add Accounts
            </button>
            <button
              onClick={() => recalculate()}
              disabled={isRecalculating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors disabled:opacity-50"
              title="Recalculate stats"
            >
              <RefreshCw size={16} className={isRecalculating ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Account Picker Modal */}
          {showAccountPicker && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-black/5 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1A1A1A]">Add Accounts to Territory</h3>
                  <button
                    onClick={() => {
                      setShowAccountPicker(false);
                      setSelectedAccountIds([]);
                      setAccountSearch('');
                    }}
                    className="p-1 text-[#666] hover:text-[#1A1A1A]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 border-b border-black/5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={16} />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                    />
                  </div>
                  {selectedAccountIds.length > 0 && (
                    <p className="text-xs text-[#666] mt-2">{selectedAccountIds.length} account(s) selected</p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {filteredAvailableAccounts.length === 0 ? (
                    <div className="text-center py-8 text-[#666]">
                      <Building2 size={32} className="mx-auto mb-2 text-[#999]" />
                      <p>No available accounts</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAvailableAccounts.map(account => (
                        <button
                          key={account.id}
                          onClick={() => toggleAccountSelection(account.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                            selectedAccountIds.includes(account.id)
                              ? 'bg-[#EAD07D]/20 border border-[#EAD07D]'
                              : 'hover:bg-[#F8F8F6]'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedAccountIds.includes(account.id)
                              ? 'bg-[#EAD07D] border-[#EAD07D]'
                              : 'border-[#ccc]'
                          }`}>
                            {selectedAccountIds.includes(account.id) && <Check size={12} className="text-[#1A1A1A]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1A1A1A] truncate">{account.name}</p>
                            <p className="text-xs text-[#999]">
                              {account.industry || 'Unknown'} • {account.billingState || 'Unknown'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-black/5 flex gap-3">
                  <button
                    onClick={() => {
                      setShowAccountPicker(false);
                      setSelectedAccountIds([]);
                      setAccountSearch('');
                    }}
                    className="flex-1 py-2.5 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignAccounts}
                    disabled={selectedAccountIds.length === 0 || isAssigningAccounts}
                    className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm disabled:opacity-50"
                  >
                    {isAssigningAccounts ? 'Adding...' : `Add ${selectedAccountIds.length || ''} Account${selectedAccountIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accounts List */}
          <div>
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">
              Accounts ({accounts.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  <Building2 size={32} className="mx-auto mb-2 text-[#999]" />
                  <p>No accounts assigned</p>
                  <p className="text-sm text-[#999]">Use auto-assign or manually add accounts</p>
                </div>
              ) : (
                accounts.map(account => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#1A1A1A] truncate">{account.name}</p>
                      <p className="text-xs text-[#999]">
                        {account.industry || 'Unknown'} • {account.billingState || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {formatCurrency(account.openPipeline)}
                        </p>
                        <p className="text-xs text-[#999]">{account.deals} deals</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        disabled={isRemovingAccount}
                        className="p-1.5 text-[#999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from territory"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Criteria Display */}
          {territory.criteria && Object.keys(territory.criteria).length > 0 && (
            <div className="border-t border-black/5 pt-6">
              <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Assignment Criteria</h3>
              <div className="space-y-2 text-sm">
                {territory.criteria.states?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Globe size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">States: </span>
                      <span className="text-[#1A1A1A]">{territory.criteria.states.join(', ')}</span>
                    </div>
                  </div>
                )}
                {territory.criteria.industries?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Factory size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Industries: </span>
                      <span className="text-[#1A1A1A]">{territory.criteria.industries.join(', ')}</span>
                    </div>
                  </div>
                )}
                {(territory.criteria.minEmployees || territory.criteria.maxEmployees) && (
                  <div className="flex items-start gap-2">
                    <Users size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Employees: </span>
                      <span className="text-[#1A1A1A]">
                        {territory.criteria.minEmployees || 0} - {territory.criteria.maxEmployees || '∞'}
                      </span>
                    </div>
                  </div>
                )}
                {(territory.criteria.minRevenue || territory.criteria.maxRevenue) && (
                  <div className="flex items-start gap-2">
                    <DollarSign size={14} className="text-[#999] mt-0.5" />
                    <div>
                      <span className="text-[#666]">Revenue: </span>
                      <span className="text-[#1A1A1A]">
                        {formatCurrency(territory.criteria.minRevenue || 0)} - {territory.criteria.maxRevenue ? formatCurrency(territory.criteria.maxRevenue) : '∞'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Territories;
