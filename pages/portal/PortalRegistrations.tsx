import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  ChevronRight,
  Award,
} from 'lucide-react';
import { usePortalRegistrations } from '../../src/hooks/usePortal';
import type { DealRegistrationStatus } from '../../src/types/portal';

const STATUS_CONFIG: Record<DealRegistrationStatus, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText, label: 'Draft' },
  PENDING: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Clock, label: 'Pending' },
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Under Review' },
  APPROVED: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: CheckCircle, label: 'Approved' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle, label: 'Rejected' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock, label: 'Expired' },
  CONVERTED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: TrendingUp, label: 'Converted' },
  WON: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: Award, label: 'Won' },
  LOST: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle, label: 'Lost' },
};

const STATUS_FILTERS = [
  { value: '', label: 'All Registrations' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PENDING', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function PortalRegistrations() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data: registrations, isLoading } = usePortalRegistrations(statusFilter || undefined);

  const filteredRegistrations = registrations?.filter((reg) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      reg.accountName.toLowerCase().includes(searchLower) ||
      reg.contactName.toLowerCase().includes(searchLower) ||
      reg.registrationNumber.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Group by status for summary
  const statusSummary = registrations?.reduce((acc, reg) => {
    acc[reg.status] = (acc[reg.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Deal Registrations</h1>
            <p className="text-[#666] mt-1">Manage your deal registration pipeline</p>
          </div>
          <Link
            to="/portal/registrations/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            New Registration
          </Link>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {STATUS_FILTERS.slice(1).map((filter) => {
            const config = STATUS_CONFIG[filter.value as DealRegistrationStatus];
            const count = statusSummary[filter.value] || 0;
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(statusFilter === filter.value ? '' : filter.value)}
                className={`p-4 rounded-[20px] text-left transition-all ${
                  statusFilter === filter.value
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-black/5 hover:border-[#EAD07D]'
                }`}
              >
                <p className={`text-2xl font-light ${statusFilter === filter.value ? 'text-white' : 'text-[#1A1A1A]'}`}>
                  {count}
                </p>
                <p className={`text-xs mt-1 ${statusFilter === filter.value ? 'text-white/70' : 'text-[#666]'}`}>
                  {filter.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
              <input
                type="text"
                placeholder="Search by account, contact, or registration number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[#666]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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

        {/* Registrations List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
          {isLoading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center">
              <div>
                <FileText size={48} className="text-[#999] mx-auto mb-4 opacity-40" />
                <p className="text-[#666] text-lg">No registrations found</p>
                <p className="text-sm text-[#999] mt-1">
                  {statusFilter ? 'Try a different filter' : 'Register your first deal to get started'}
                </p>
                {!statusFilter && (
                  <Link
                    to="/portal/registrations/new"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
                  >
                    <Plus size={16} />
                    Register a Deal
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredRegistrations.map((reg) => {
                const statusConfig = STATUS_CONFIG[reg.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <Link
                    key={reg.id}
                    to={`/portal/registrations/${reg.id}`}
                    className="flex items-center justify-between p-5 hover:bg-[#F8F8F6] transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon size={20} className={statusConfig.text} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-[#1A1A1A] truncate">{reg.accountName}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} flex-shrink-0`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[#666]">
                          <span>{reg.registrationNumber}</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(reg.createdAt).toLocaleDateString()}
                          </span>
                          {reg.contactName && (
                            <span className="hidden md:inline">{reg.contactName}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      {reg.estimatedValue && (
                        <div className="text-right hidden sm:block">
                          <p className="text-sm text-[#666]">Est. Value</p>
                          <p className="font-medium text-[#1A1A1A] flex items-center gap-1">
                            <DollarSign size={14} />
                            {reg.estimatedValue.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {reg.status === 'APPROVED' && reg.approvedUntil && (
                        <div className="text-right hidden md:block">
                          <p className="text-sm text-[#666]">Protected Until</p>
                          <p className="font-medium text-[#93C01F]">
                            {new Date(reg.approvedUntil).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <ChevronRight size={20} className="text-[#999]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortalRegistrations;
