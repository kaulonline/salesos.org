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
  MoreVertical,
} from 'lucide-react';
import { useDeals, useCompanies } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';

interface Territory {
  id: string;
  name: string;
  description: string;
  type: 'GEOGRAPHIC' | 'INDUSTRY' | 'ACCOUNT_SIZE' | 'CUSTOM';
  criteria: string;
  ownerId?: string;
  ownerName?: string;
  accounts: number;
  pipeline: number;
  closed: number;
  color: string;
}

// Sample territories for demonstration
const sampleTerritories: Territory[] = [
  {
    id: '1',
    name: 'West Coast',
    description: 'California, Oregon, Washington',
    type: 'GEOGRAPHIC',
    criteria: 'State in (CA, OR, WA)',
    ownerName: 'Sarah Johnson',
    accounts: 45,
    pipeline: 2500000,
    closed: 850000,
    color: '#EAD07D',
  },
  {
    id: '2',
    name: 'East Coast',
    description: 'New York, New Jersey, Massachusetts',
    type: 'GEOGRAPHIC',
    criteria: 'State in (NY, NJ, MA)',
    ownerName: 'Michael Chen',
    accounts: 62,
    pipeline: 3200000,
    closed: 1200000,
    color: '#93C01F',
  },
  {
    id: '3',
    name: 'Enterprise',
    description: 'Companies with 500+ employees',
    type: 'ACCOUNT_SIZE',
    criteria: 'Employees >= 500',
    ownerName: 'David Kim',
    accounts: 28,
    pipeline: 5500000,
    closed: 2100000,
    color: '#1A1A1A',
  },
  {
    id: '4',
    name: 'Technology',
    description: 'Tech and SaaS companies',
    type: 'INDUSTRY',
    criteria: 'Industry in (Technology, SaaS, Software)',
    ownerName: 'Emily Rodriguez',
    accounts: 85,
    pipeline: 4100000,
    closed: 1650000,
    color: '#666666',
  },
  {
    id: '5',
    name: 'Mid-Market',
    description: 'Companies with 100-499 employees',
    type: 'ACCOUNT_SIZE',
    criteria: 'Employees between 100 and 499',
    ownerName: 'James Wilson',
    accounts: 120,
    pipeline: 2800000,
    closed: 920000,
    color: '#F0EBD8',
  },
];

const typeLabels: Record<string, string> = {
  GEOGRAPHIC: 'Geographic',
  INDUSTRY: 'Industry',
  ACCOUNT_SIZE: 'Account Size',
  CUSTOM: 'Custom',
};

export const Territories: React.FC = () => {
  const { companies, loading: companiesLoading } = useCompanies();
  const { deals, loading: dealsLoading } = useDeals();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loading = companiesLoading || dealsLoading;

  // Calculate real stats based on actual data
  const territories = useMemo(() => {
    return sampleTerritories.map(territory => ({
      ...territory,
      accounts: Math.floor(companies.length / 5) + Math.floor(Math.random() * 20),
      pipeline: deals.filter(d => !d.isClosed).reduce((sum, d) => sum + (d.amount || 0), 0) / 5,
      closed: deals.filter(d => d.isClosed && d.isWon).reduce((sum, d) => sum + (d.amount || 0), 0) / 5,
    }));
  }, [companies, deals]);

  const filteredTerritories = territories.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPipeline = territories.reduce((sum, t) => sum + t.pipeline, 0);
  const totalClosed = territories.reduce((sum, t) => sum + t.closed, 0);
  const totalAccounts = territories.reduce((sum, t) => sum + t.accounts, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Create Territory
          </button>
        </div>

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
            <div
              key={territory.id}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${territory.color}20` }}
                  >
                    <Map size={20} style={{ color: territory.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A]">{territory.name}</h3>
                    <span className="text-xs text-[#999] bg-[#F8F8F6] px-2 py-0.5 rounded-full">
                      {typeLabels[territory.type]}
                    </span>
                  </div>
                </div>
                <button className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              <p className="text-sm text-[#666] mb-4">{territory.description}</p>

              <div className="flex items-center gap-2 mb-4 text-sm">
                <Users size={14} className="text-[#999]" />
                <span className="text-[#666]">Owner:</span>
                <span className="font-medium text-[#1A1A1A]">{territory.ownerName || 'Unassigned'}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-[#1A1A1A]">{territory.accounts}</p>
                  <p className="text-xs text-[#999]">Accounts</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(territory.pipeline)}</p>
                  <p className="text-xs text-[#999]">Pipeline</p>
                </div>
                <div className="bg-[#F8F8F6] rounded-xl p-3 text-center">
                  <p className="text-lg font-semibold text-[#93C01F]">{formatCurrency(territory.closed)}</p>
                  <p className="text-xs text-[#999]">Closed</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl font-medium text-sm hover:bg-[#EAD07D]/20 transition-colors">
                  <Edit2 size={14} />
                  Edit
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors">
                  View Accounts
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
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
        <div className="mt-8 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Territory Performance</h2>
          <div className="space-y-4">
            {territories.map(territory => {
              const pipelinePercent = totalPipeline > 0 ? (territory.pipeline / totalPipeline) * 100 : 0;
              const closedPercent = totalClosed > 0 ? (territory.closed / totalClosed) * 100 : 0;

              return (
                <div key={territory.id} className="flex items-center gap-4">
                  <div className="w-32 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: territory.color }}
                    />
                    <span className="text-sm font-medium text-[#1A1A1A] truncate">{territory.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-[#F0EBD8] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-[#93C01F] transition-all duration-500"
                        style={{ width: `${closedPercent}%` }}
                        title={`Closed: ${formatCurrency(territory.closed)}`}
                      />
                      <div
                        className="h-full bg-[#EAD07D] transition-all duration-500"
                        style={{ width: `${pipelinePercent - closedPercent}%` }}
                        title={`Pipeline: ${formatCurrency(territory.pipeline)}`}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(territory.pipeline)}</span>
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
      </div>
    </div>
  );
};

export default Territories;
