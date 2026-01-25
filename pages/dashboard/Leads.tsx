import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, Plus, X, Sparkles, ArrowRightLeft, AlertCircle, ChevronRight, Camera, Upload } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { VirtualList } from '../../src/components/VirtualList';
import { useLeads } from '../../src/hooks/useLeads';
import { useCampaigns } from '../../src/hooks/useCampaigns';
import { AIInsightsBanner } from '../../src/components/AIInsightsBanner';
import { SmartCaptureModal } from '../../src/components/SmartCapture/SmartCaptureModal';
import { ImportModal } from '../../src/components/ImportExport/ImportModal';
import { ExportModal } from '../../src/components/ImportExport/ExportModal';
import { BulkActionsBar } from '../../src/components/BulkActions/BulkActionsBar';
import { FeatureGate, Features } from '../../src/components/FeatureGate';
import type { Lead, CreateLeadDto, LeadStatus, LeadRating } from '../../src/types';

const STATUS_COLORS: Record<LeadStatus, 'green' | 'yellow' | 'neutral' | 'outline'> = {
  NEW: 'yellow',
  CONTACTED: 'green',
  QUALIFIED: 'green',
  UNQUALIFIED: 'neutral',
  NURTURING: 'outline',
  CONVERTED: 'green',
  LOST: 'neutral',
};

const RATING_COLORS: Record<LeadRating, string> = {
  HOT: 'text-red-500',
  WARM: 'text-orange-500',
  COLD: 'text-blue-500',
};

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateLeadDto) => Promise<void>;
  campaigns: { id: string; name: string }[];
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onCreate, campaigns }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLeadDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    campaignId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', title: '' });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Lead</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="John"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="john@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="VP of Sales"
              />
            </div>
          </div>
          {campaigns.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Campaign (Optional)</label>
              <select
                value={formData.campaignId || ''}
                onChange={(e) => setFormData({ ...formData, campaignId: e.target.value || undefined })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              >
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
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
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Leads: React.FC = () => {
  const navigate = useNavigate();
  const { leads, stats, loading, error, refetch, fetchStats, create, score, convert, bulkDelete } = useLeads();
  const { campaigns } = useCampaigns({ isActive: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmartCapture, setShowSmartCapture] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [scoringLead, setScoringLead] = useState<string | null>(null);
  const [convertingLead, setConvertingLead] = useState<string | null>(null);

  // Selection handlers
  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  // Bulk delete handler
  const handleBulkDelete = async (ids: string[]) => {
    if (bulkDelete) {
      await bulkDelete(ids);
      clearSelection();
      await fetchStats();
    }
  };

  // Handle export of selected leads
  const handleExportSelected = () => {
    setShowExportModal(true);
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredLeads = leads.filter(lead =>
    `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (lead.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (lead.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleCreateLead = async (data: CreateLeadDto) => {
    await create(data);
    await fetchStats();
  };

  const handleScoreLead = async (id: string) => {
    setScoringLead(id);
    try {
      await score(id);
    } finally {
      setScoringLead(null);
    }
  };

  const handleConvertLead = async (id: string) => {
    setConvertingLead(id);
    try {
      await convert(id, {
        createAccount: true,
        createContact: true,
        createOpportunity: true,
      });
      await fetchStats();
    } finally {
      setConvertingLead(null);
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
           <div>
              <Skeleton className="h-10 w-32 mb-8" />
              <Skeleton className="h-12 w-96 rounded-full" />
           </div>
           <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
           </div>
        </div>
        <Card className="min-h-[600px] p-6">
           <div className="flex justify-between items-center mb-8 gap-4">
              <div className="flex gap-2">
                 <Skeleton className="h-9 w-24 rounded-full" />
                 <Skeleton className="h-9 w-24 rounded-full" />
                 <Skeleton className="h-9 w-24 rounded-full" />
              </div>
              <div className="flex gap-3">
                 <Skeleton className="h-10 w-64 rounded-full" />
                 <Skeleton className="h-10 w-10 rounded-full" />
              </div>
           </div>
           <div className="space-y-4">
              <Skeleton className="h-8 w-full rounded-lg bg-gray-100" />
              {[1,2,3,4,5,6].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
           </div>
        </Card>
      </div>
    );
  }

  return (
    <FeatureGate feature={Features.LEADS_MANAGEMENT}>
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
         <div>
            <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Leads</h1>

            {/* Stats Strip */}
            <div className="flex items-center gap-4 bg-white/40 p-2 pr-6 rounded-full backdrop-blur-xl border border-white/40 shadow-sm w-fit">
               <Badge variant="dark" className="px-6 py-2 shadow-lg">
                 {stats?.totalLeads || leads.length} Total
               </Badge>
               <Badge variant="yellow" className="px-6 py-2 shadow-sm">
                 {stats?.qualifiedLeads || 0} Qualified
               </Badge>
               <div className="w-32 h-2 bg-gray-200/50 rounded-full overflow-hidden relative">
                   <div
                     className="h-full bg-[#EAD07D] transition-all duration-500"
                     style={{ width: `${stats?.totalLeads ? Math.round((stats.qualifiedLeads || 0) / stats.totalLeads * 100) : 0}%` }}
                   />
               </div>
               <Badge variant="outline" className="px-4 py-1.5 border-black/10 bg-white/50">
                 {stats?.highIntentLeads || 0} Hot
               </Badge>
               <Badge variant="outline" className="px-4 py-1.5 border-black/10 bg-white/50">
                 Avg: {stats?.averageScore?.toFixed(0) || 0}
               </Badge>
            </div>
         </div>

         <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="bg-white/60 backdrop-blur-sm border border-white/50 px-4 py-2 rounded-full text-sm font-medium hover:bg-white flex items-center gap-2 transition-colors"
            >
               Refresh
            </button>
         </div>
      </div>

      {/* AI Insights for Leads */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <AIInsightsBanner maxInsights={2} showSummary={false} />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={refetch} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      <Card className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
         {/* Filters Bar */}
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
            <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
               {['All', 'New', 'Contacted', 'Qualified', 'Hot'].map(f => (
                  <button key={f} className="px-4 py-2 bg-[#F8F8F6] rounded-full text-sm font-medium text-[#666] whitespace-nowrap hover:bg-gray-200 transition-colors flex items-center gap-1">
                     {f}
                  </button>
               ))}
            </div>

            <div className="flex gap-3 w-full md:w-auto">
               <div className="w-full md:w-64">
                  <SearchInput
                    variant="filled"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <button
                 onClick={() => setShowSmartCapture(true)}
                 className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A] hover:bg-[#E5C973] transition-colors shrink-0"
                 title="Smart Capture"
               >
                  <Camera size={18} />
               </button>
               <button
                 onClick={() => setShowCreateModal(true)}
                 className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shrink-0"
                 title="Add Lead"
               >
                  <Plus size={18} />
               </button>
               <button className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:bg-gray-200 transition-colors shrink-0">
                  <Filter size={16} />
               </button>
               <button
                 onClick={() => setShowImportModal(true)}
                 className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2 text-sm font-medium hover:bg-gray-50 shrink-0"
               >
                  <Upload size={14} /> Import
               </button>
               <button
                 onClick={() => setShowExportModal(true)}
                 className="px-4 py-2 rounded-full border border-gray-200 flex items-center gap-2 text-sm font-medium hover:bg-gray-50 shrink-0"
               >
                  <Download size={14} /> Export
               </button>
            </div>
         </div>

         {/* Table Header */}
         <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 text-xs font-bold text-[#999] uppercase tracking-wider mb-2">
             <div className="col-span-1 flex items-center justify-center">
               <button
                 onClick={toggleSelectAll}
                 className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                   selectedLeads.size === filteredLeads.length && filteredLeads.length > 0
                     ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                     : selectedLeads.size > 0
                     ? 'border-[#1A1A1A] bg-[#1A1A1A]/20'
                     : 'border-gray-300 hover:border-gray-400'
                 }`}
               >
                 {selectedLeads.size === filteredLeads.length && filteredLeads.length > 0 && (
                   <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                     <polyline points="20 6 9 17 4 12" />
                   </svg>
                 )}
                 {selectedLeads.size > 0 && selectedLeads.size < filteredLeads.length && (
                   <div className="w-2 h-0.5 bg-[#1A1A1A]" />
                 )}
               </button>
             </div>
             <div className="col-span-3">Name</div>
             <div className="col-span-2">Company</div>
             <div className="col-span-2">Email</div>
             <div className="col-span-1">Score</div>
             <div className="col-span-1">Status</div>
             <div className="col-span-2 text-right">Actions</div>
         </div>

         {/* Table Rows - Virtualized for performance */}
         <VirtualList
            items={filteredLeads}
            itemHeight={72}
            keyExtractor={(lead) => lead.id}
            className="max-h-[calc(100vh-400px)]"
            gap={8}
            emptyMessage={searchQuery ? `No leads found matching "${searchQuery}"` : 'No leads yet. Create your first lead!'}
            renderItem={(lead) => (
               <div
                  className={`grid grid-cols-12 gap-4 px-4 py-4 rounded-2xl items-center transition-all cursor-pointer ${
                    selectedLeads.has(lead.id) ? 'bg-[#EAD07D]/30 shadow-sm' : 'hover:bg-[#F8F8F6]'
                  }`}
                  onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
               >
                  <div className="col-span-1 flex items-center justify-center">
                     <button
                       onClick={(e) => { e.stopPropagation(); toggleSelectLead(lead.id); }}
                       className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                         selectedLeads.has(lead.id) ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' : 'border-gray-300 hover:border-gray-400'
                       }`}
                     >
                        {selectedLeads.has(lead.id) && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                     </button>
                  </div>
                  <div className="col-span-3 flex items-center gap-3">
                     <Avatar
                       src={`https://ui-avatars.com/api/?name=${lead.firstName}+${lead.lastName}&background=random`}
                       alt={`${lead.firstName} ${lead.lastName}`}
                       size="md"
                     />
                     <div>
                       <span className="font-medium text-[#1A1A1A]">{lead.firstName} {lead.lastName}</span>
                       {lead.title && <div className="text-xs text-[#666]">{lead.title}</div>}
                     </div>
                  </div>
                  <div className="col-span-2 text-sm text-[#666]">{lead.company || '-'}</div>
                  <div className="col-span-2 text-sm text-[#666] truncate">{lead.email || '-'}</div>
                  <div className="col-span-1">
                    {lead.leadScore !== undefined ? (
                      <span className={`text-sm font-medium ${
                        lead.leadScore >= 70 ? 'text-green-600' :
                        lead.leadScore >= 40 ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {lead.leadScore}
                      </span>
                    ) : (
                      <span className="text-xs text-[#999]">-</span>
                    )}
                  </div>
                  <div className="col-span-1">
                     <Badge variant={STATUS_COLORS[lead.status] || 'neutral'} dot>
                        {lead.status.toLowerCase()}
                     </Badge>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                     <button
                       onClick={(e) => { e.stopPropagation(); handleScoreLead(lead.id); }}
                       disabled={scoringLead === lead.id}
                       className="p-2 rounded-lg hover:bg-white/50 text-[#666] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                       title="AI Score"
                     >
                       <Sparkles size={16} className={scoringLead === lead.id ? 'animate-spin' : ''} />
                     </button>
                     {lead.status === 'QUALIFIED' && (
                       <button
                         onClick={(e) => { e.stopPropagation(); handleConvertLead(lead.id); }}
                         disabled={convertingLead === lead.id}
                         className="p-2 rounded-lg hover:bg-white/50 text-[#666] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                         title="Convert to Account"
                       >
                         <ArrowRightLeft size={16} className={convertingLead === lead.id ? 'animate-pulse' : ''} />
                       </button>
                     )}
                     <button
                       onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/leads/${lead.id}`); }}
                       className="p-2 rounded-lg hover:bg-white/50 text-[#666] hover:text-[#1A1A1A] transition-colors"
                       title="View Details"
                     >
                       <ChevronRight size={16} />
                     </button>
                  </div>
               </div>
            )}
         />
      </Card>

      <CreateLeadModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateLead}
        campaigns={campaigns.map(c => ({ id: c.id, name: c.name }))}
      />

      <SmartCaptureModal
        isOpen={showSmartCapture}
        onClose={() => setShowSmartCapture(false)}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="LEAD"
        onSuccess={() => {
          refetch();
          fetchStats();
        }}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        entityType="LEAD"
        selectedIds={selectedLeads.size > 0 ? Array.from(selectedLeads) : undefined}
      />

      <BulkActionsBar
        selectedCount={selectedLeads.size}
        selectedIds={Array.from(selectedLeads)}
        onClearSelection={clearSelection}
        entityName="lead"
        onDelete={handleBulkDelete}
        onExport={handleExportSelected}
      />
    </div>
    </FeatureGate>
  );
};
