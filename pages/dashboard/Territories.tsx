import React, { useState } from 'react';
import {
  Map,
  Plus,
  Search,
  Building2,
  DollarSign,
  Target,
} from 'lucide-react';
import { useTerritories, useCompanies } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  typeLabels,
  typeColors,
  emptyCriteria,
  formatCurrency,
  buildCriteria,
  parseCriteria,
  CriteriaForm,
  TerritoryFormModal,
  TerritoryDetailDrawer,
  TerritoryCard,
} from '../../src/components/territories';
import { AIBuilderTrigger } from '../../src/components/AIBuilder/AIBuilderTrigger';
import { AIBuilderModal } from '../../src/components/AIBuilder/AIBuilderModal';
import { AIBuilderEntityType, TerritoryConfig } from '../../src/types/aiBuilder';
import { useToast } from '../../src/components/ui/Toast';
import type { Territory, TerritoryType, CreateTerritoryDto, UpdateTerritoryDto } from '../../src/types/territory';

export const Territories: React.FC = () => {
  const { showToast } = useToast();
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const criteria = buildCriteria(criteriaForm);
      await create({ ...formData, criteria });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', type: 'GEOGRAPHIC', criteria: {}, color: '#3B82F6' });
      setCriteriaForm(emptyCriteria);
      showToast({ type: 'success', title: 'Territory Created' });
    } catch (error) {
      console.error('Failed to create territory:', error);
      showToast({ type: 'error', title: 'Failed to Create Territory', message: (error as Error).message || 'Please try again' });
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
      showToast({ type: 'success', title: 'Territory Updated' });
    } catch (error) {
      console.error('Failed to update territory:', error);
      showToast({ type: 'error', title: 'Failed to Update Territory', message: (error as Error).message || 'Please try again' });
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
      showToast({ type: 'success', title: 'Territory Deleted' });
    } catch (error) {
      console.error('Failed to delete territory:', error);
      showToast({ type: 'error', title: 'Failed to Delete Territory', message: (error as Error).message || 'Please try again' });
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
      showToast({ type: 'success', title: 'Territory Created with AI' });
    } catch (error) {
      console.error('Failed to create territory from AI:', error);
      showToast({ type: 'error', title: 'Failed to Create Territory', message: (error as Error).message || 'Please try again' });
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              {filteredTerritories.map(territory => (
                <TerritoryCard
                  key={territory.id}
                  territory={territory}
                  onEdit={openEditModal}
                  onDelete={setShowDeleteConfirm}
                  onViewAccounts={setSelectedTerritoryId}
                />
              ))}

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

export default Territories;
