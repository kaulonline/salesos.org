import React, { useState, useMemo } from 'react';
import { Search, Plus, FileText, CheckCircle2, Clock, FileCheck, ArrowUpRight, AlertCircle, File, FilePlus2 } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDeals } from '../../src/hooks';
import type { Opportunity } from '../../src/types';

// Map deal stages to document types/statuses
const getDocumentFromDeal = (deal: Opportunity) => {
  let type: 'Proposal' | 'Quote' | 'Contract' = 'Proposal';
  let status: 'Draft' | 'Sent' | 'Viewed' | 'Signed' = 'Draft';

  // Determine document type based on stage
  if (deal.stage === 'PROPOSAL_PRICE_QUOTE' || deal.stage === 'NEGOTIATION_REVIEW') {
    type = 'Proposal';
    status = 'Sent';
  } else if (deal.stage === 'CLOSED_WON') {
    type = 'Contract';
    status = 'Signed';
  } else if (deal.stage === 'VALUE_PROPOSITION' || deal.stage === 'NEEDS_ANALYSIS') {
    type = 'Quote';
    status = 'Draft';
  } else if (deal.isWon) {
    type = 'Contract';
    status = 'Signed';
  }

  return {
    id: deal.id,
    name: `${deal.account?.name || 'Company'} - ${type}`,
    client: deal.account?.name || 'Unknown',
    value: deal.amount ? `$${(deal.amount / 1000).toFixed(0)}k` : '-',
    type,
    status,
    date: deal.updatedAt,
    dealId: deal.id,
    dealName: deal.name,
  };
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }
  return `$${amount}`;
};

export const Documents: React.FC = () => {
  const { deals, pipelineStats, loading, error, fetchPipelineStats } = useDeals();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  React.useEffect(() => {
    fetchPipelineStats();
  }, [fetchPipelineStats]);

  // Transform deals into document-like items
  const documents = useMemo(() => {
    // Filter deals that would have documents (later stages)
    const dealsWithDocs = deals.filter(d =>
      d.stage === 'VALUE_PROPOSITION' ||
      d.stage === 'PROPOSAL_PRICE_QUOTE' ||
      d.stage === 'NEGOTIATION_REVIEW' ||
      d.stage === 'CLOSED_WON' ||
      d.isWon
    );

    return dealsWithDocs.map(getDocumentFromDeal);
  }, [deals]);

  // Calculate stats
  const stats = useMemo(() => {
    const proposals = documents.filter(d => d.type === 'Proposal');
    const signed = documents.filter(d => d.status === 'Signed');
    const winRate = proposals.length > 0 ? Math.round((signed.length / documents.length) * 100) : 0;

    return {
      proposalsSent: proposals.length,
      winRate,
      pipelineValue: pipelineStats?.totalValue || 0,
    };
  }, [documents, pipelineStats]);

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            doc.client.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'All' ||
                        (activeTab === 'Quotes' && doc.type === 'Quote') ||
                        (activeTab === 'Proposals' && doc.type === 'Proposal') ||
                        (activeTab === 'Contracts' && doc.type === 'Contract');
      return matchesSearch && matchesTab;
    });
  }, [documents, searchQuery, activeTab]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Skeleton className="h-[140px] rounded-[2rem]" />
            <Skeleton className="h-[140px] rounded-[2rem]" />
            <Skeleton className="h-[140px] rounded-[2rem]" />
            <Skeleton className="h-[140px] rounded-[2rem] bg-gray-800" />
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-black/5 min-h-[500px]">
          <div className="flex justify-between mb-8">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-48 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            {[1,2,3,4,5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Unable to Load Documents</h2>
          <p className="text-[#666] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Documents</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="dash-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                <FileText size={18} />
              </div>
              <span className="text-xs font-bold text-[#666] bg-[#F8F8F6] px-2 py-1 rounded">Active</span>
            </div>
            <div className="text-3xl font-medium text-[#1A1A1A]">{stats.proposalsSent}</div>
            <div className="text-xs text-[#666] mt-1">Proposals Sent</div>
          </div>

          <div className="dash-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <CheckCircle2 size={18} />
              </div>
              {stats.winRate > 0 && (
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                  +{stats.winRate}%
                </span>
              )}
            </div>
            <div className="text-3xl font-medium text-[#1A1A1A]">{stats.winRate}%</div>
            <div className="text-xs text-[#666] mt-1">Win Rate</div>
          </div>

          <div className="dash-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <File size={18} />
              </div>
            </div>
            <div className="text-3xl font-medium text-[#1A1A1A]">{documents.length}</div>
            <div className="text-xs text-[#666] mt-1">Total Documents</div>
          </div>

          <div className="dash-card-dark p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#EAD07D] blur-[40px] opacity-20 rounded-full"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <FileCheck size={18} />
              </div>
              <ArrowUpRight size={18} className="text-white/50" />
            </div>
            <div className="relative z-10">
              <div className="text-3xl font-medium text-white">{formatCurrency(stats.pipelineValue)}</div>
              <div className="text-xs text-white/60 mt-1">Pipeline Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="dash-card p-8 min-h-[500px]">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex gap-2">
            {['All', 'Quotes', 'Proposals', 'Contracts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-[#1A1A1A] text-white' : 'bg-[#F8F8F6] text-[#666] hover:bg-gray-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search docs..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F6] rounded-full text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-bold shadow-md hover:bg-[#e5c973] transition-all">
              <Plus size={16} /> New Doc
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-4 pl-4 text-xs font-bold text-[#999] uppercase tracking-wider">Document Name</th>
                <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Type</th>
                <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Value</th>
                <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Updated</th>
                <th className="pb-4 text-right pr-4 text-xs font-bold text-[#999] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-[#F8F8F6] transition-colors border-b border-gray-50 last:border-0 cursor-pointer">
                    <td className="py-4 pl-4 rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                          <FileText size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{doc.name}</div>
                          <div className="text-xs text-[#666]">{doc.dealName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-[#666]">{doc.type}</td>
                    <td className="py-4 font-medium text-[#1A1A1A]">{doc.value}</td>
                    <td className="py-4 text-[#666]">{formatDate(doc.date)}</td>
                    <td className="py-4 pr-4 text-right rounded-r-xl">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5
                        ${doc.status === 'Signed' ? 'bg-[#EAD07D] text-[#1A1A1A]' :
                          doc.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                          doc.status === 'Viewed' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-500'}`}>
                        {doc.status === 'Signed' && <CheckCircle2 size={12} />}
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <FilePlus2 size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
                    <p className="text-[#666] mb-2">No documents found</p>
                    <p className="text-xs text-[#999]">Documents are automatically created from your deals</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
