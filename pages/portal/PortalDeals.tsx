import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Award,
  Target,
} from 'lucide-react';
import { usePortalDeals } from '../../src/hooks/usePortal';

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  QUALIFICATION: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DISCOVERY: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PROPOSAL: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]' },
  NEGOTIATION: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CLOSED_WON: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]' },
  CLOSED_LOST: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Deals' },
  { value: 'open', label: 'Open Deals' },
  { value: 'won', label: 'Won Deals' },
  { value: 'lost', label: 'Lost Deals' },
];

export function PortalDeals() {
  const [statusFilter, setStatusFilter] = useState<'open' | 'won' | 'lost' | ''>('');
  const [search, setSearch] = useState('');
  const { data: deals, isLoading } = usePortalDeals(statusFilter || undefined);

  const filteredDeals = deals?.filter((deal) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      deal.opportunity.name.toLowerCase().includes(searchLower) ||
      deal.opportunity.account?.name.toLowerCase().includes(searchLower) ||
      deal.registrationNumber.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Calculate stats
  const stats = {
    total: deals?.length || 0,
    open: deals?.filter(d => !d.opportunity.isClosed).length || 0,
    won: deals?.filter(d => d.opportunity.isClosed && d.opportunity.isWon).length || 0,
    lost: deals?.filter(d => d.opportunity.isClosed && !d.opportunity.isWon).length || 0,
    totalValue: deals?.reduce((sum, d) => sum + (d.opportunity.amount || 0), 0) || 0,
    wonValue: deals?.filter(d => d.opportunity.isWon).reduce((sum, d) => sum + (d.opportunity.amount || 0), 0) || 0,
  };

  const estimatedCommission = deals?.filter(d => d.opportunity.isWon)
    .reduce((sum, d) => sum + ((d.opportunity.amount || 0) * (d.commissionRate || 0) / 100), 0) || 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">My Deals</h1>
            <p className="text-[#666] mt-1">Track your converted deal registrations</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Target size={18} className="text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">{stats.open}</p>
            <p className="text-sm text-[#666]">Open Deals</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <Award size={18} className="text-[#93C01F]" />
              </div>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">{stats.won}</p>
            <p className="text-sm text-[#666]">Won Deals</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <DollarSign size={18} className="text-[#1A1A1A]" />
              </div>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">${stats.wonValue.toLocaleString()}</p>
            <p className="text-sm text-[#666]">Won Revenue</p>
          </div>

          <div className="bg-[#1A1A1A] rounded-[24px] p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <TrendingUp size={18} className="text-[#EAD07D]" />
              </div>
            </div>
            <p className="text-2xl font-light text-[#EAD07D]">${estimatedCommission.toLocaleString()}</p>
            <p className="text-sm text-white/60">Est. Commission</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
              <input
                type="text"
                placeholder="Search deals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[#666]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2.5 rounded-full bg-[#F8F8F6] border-transparent focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium text-[#1A1A1A]"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Deals List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center">
              <div>
                <TrendingUp size={48} className="text-[#999] mx-auto mb-4 opacity-40" />
                <p className="text-[#666] text-lg">No deals found</p>
                <p className="text-sm text-[#999] mt-1">
                  Deals appear here once your registrations are converted
                </p>
                <Link
                  to="/portal/registrations/new"
                  className="inline-block mt-4 text-[#1A1A1A] underline text-sm"
                >
                  Register a new deal
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredDeals.map((deal) => {
                const stageColor = STAGE_COLORS[deal.opportunity.stage] || STAGE_COLORS.QUALIFICATION;
                const StatusIcon = deal.opportunity.isClosed
                  ? deal.opportunity.isWon
                    ? CheckCircle
                    : XCircle
                  : Clock;
                const statusColor = deal.opportunity.isClosed
                  ? deal.opportunity.isWon
                    ? 'text-[#93C01F]'
                    : 'text-gray-400'
                  : 'text-blue-500';

                return (
                  <div
                    key={deal.registrationId}
                    className="flex items-center justify-between p-5 hover:bg-[#F8F8F6] transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl ${stageColor.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={20} className={statusColor} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-[#1A1A1A] truncate">{deal.opportunity.name}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${stageColor.bg} ${stageColor.text} flex-shrink-0`}>
                            {deal.opportunity.stage.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[#666]">
                          {deal.opportunity.account && (
                            <span className="flex items-center gap-1">
                              <Building2 size={14} />
                              {deal.opportunity.account.name}
                            </span>
                          )}
                          <span>{deal.registrationNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      {deal.opportunity.amount && (
                        <div className="text-right">
                          <p className="text-sm text-[#666]">Deal Value</p>
                          <p className="font-medium text-[#1A1A1A] flex items-center gap-1">
                            <DollarSign size={14} />
                            {deal.opportunity.amount.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {deal.commissionRate && (
                        <div className="text-right hidden md:block">
                          <p className="text-sm text-[#666]">Commission</p>
                          <p className="font-medium text-[#93C01F]">{deal.commissionRate}%</p>
                        </div>
                      )}
                      {deal.opportunity.closeDate && (
                        <div className="text-right hidden lg:block">
                          <p className="text-sm text-[#666]">Close Date</p>
                          <p className="font-medium text-[#1A1A1A] flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(deal.opportunity.closeDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight size={20} className="text-[#999]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortalDeals;
