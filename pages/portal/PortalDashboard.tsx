import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  Award,
} from 'lucide-react';
import { usePortalDashboard, usePortalProfile, usePortalRegistrations } from '../../src/hooks/usePortal';

const TIER_BENEFITS = {
  REGISTERED: ['Basic deal registration', 'Partner portal access', 'Standard commission rates'],
  SILVER: ['Priority deal registration', 'Marketing materials access', 'Increased commission rates'],
  GOLD: ['Fast-track approvals', 'Co-marketing opportunities', 'Premium commission rates', 'Dedicated support'],
  PLATINUM: ['Instant approvals', 'Joint go-to-market', 'Highest commission rates', 'Executive sponsorship'],
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FileText },
  PENDING: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Clock },
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  APPROVED: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
  CONVERTED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: TrendingUp },
  WON: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: Award },
  LOST: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
};

export function PortalDashboard() {
  const { data: dashboard, isLoading: dashboardLoading } = usePortalDashboard();
  const { data: profile } = usePortalProfile();
  const { data: recentRegistrations } = usePortalRegistrations();

  if (dashboardLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded-lg w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-[24px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = dashboard?.registrations.byStatus.reduce((acc, item) => {
    acc[item.status] = item.count;
    return acc;
  }, {} as Record<string, number>) || {};

  const recent = recentRegistrations?.slice(0, 5) || [];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">
              Welcome back, {profile?.partner.companyName}
            </h1>
            <p className="text-[#666] mt-1">
              Track your deal registrations and performance
            </p>
          </div>
          <Link
            to="/portal/registrations/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            Register New Deal
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <FileText size={20} className="text-[#1A1A1A]" />
              </div>
              <span className="text-xs text-[#999]">Total</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">{dashboard?.registrations.total || 0}</p>
            <p className="text-sm text-[#666] mt-1">Deal Registrations</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-[#93C01F]" />
              </div>
              <span className="text-xs text-[#999]">Approved</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">{statusCounts.APPROVED || 0}</p>
            <p className="text-sm text-[#666] mt-1">Active Deals</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
              <span className="text-xs text-[#999]">Revenue</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">
              ${(dashboard?.partner.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-sm text-[#666] mt-1">Total Earned</p>
          </div>

          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 size={20} className="text-purple-600" />
              </div>
              <span className="text-xs text-[#999]">Accounts</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">{dashboard?.assignedAccounts || 0}</p>
            <p className="text-sm text-[#666] mt-1">Assigned Accounts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Registrations */}
          <div className="lg:col-span-8 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Recent Registrations</h2>
              <Link
                to="/portal/registrations"
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-center">
                <div>
                  <FileText size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No registrations yet</p>
                  <Link
                    to="/portal/registrations/new"
                    className="text-sm text-[#1A1A1A] underline mt-2 inline-block"
                  >
                    Register your first deal
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((reg) => {
                  const statusConfig = STATUS_COLORS[reg.status] || STATUS_COLORS.DRAFT;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link
                      key={reg.id}
                      to={`/portal/registrations/${reg.id}`}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-[#F8F8F6] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                          <StatusIcon size={18} className={statusConfig.text} />
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{reg.accountName}</p>
                          <p className="text-sm text-[#666]">{reg.registrationNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          {reg.status.replace('_', ' ')}
                        </span>
                        {reg.estimatedValue && (
                          <p className="text-sm text-[#666] mt-1">
                            ${reg.estimatedValue.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Partner Tier Benefits */}
          <div className="lg:col-span-4 bg-[#1A1A1A] rounded-[32px] p-6 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Award size={24} className="text-[#EAD07D]" />
              <div>
                <h2 className="text-lg font-medium">{profile?.partner.tier || 'REGISTERED'} Partner</h2>
                <p className="text-sm text-white/60">Your current tier benefits</p>
              </div>
            </div>

            <div className="space-y-3">
              {TIER_BENEFITS[profile?.partner.tier || 'REGISTERED'].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EAD07D]/20 flex items-center justify-center">
                    <CheckCircle size={12} className="text-[#EAD07D]" />
                  </div>
                  <span className="text-sm text-white/80">{benefit}</span>
                </div>
              ))}
            </div>

            {profile?.partner.commissionRate && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-white/60">Commission Rate</p>
                <p className="text-2xl font-light text-[#EAD07D]">{profile.partner.commissionRate}%</p>
              </div>
            )}

            {profile?.partner.partnerManager && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-white/60 mb-2">Your Partner Manager</p>
                <p className="font-medium">{profile.partner.partnerManager.name}</p>
                <p className="text-sm text-white/60">{profile.partner.partnerManager.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/portal/registrations/new"
            className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5 hover:border-[#EAD07D] transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center group-hover:bg-[#EAD07D]/30 transition-colors">
                <Plus size={24} className="text-[#1A1A1A]" />
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A]">Register a Deal</p>
                <p className="text-sm text-[#666]">Submit a new opportunity</p>
              </div>
            </div>
          </Link>

          <Link
            to="/portal/deals"
            className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5 hover:border-[#EAD07D] transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#93C01F]/20 flex items-center justify-center group-hover:bg-[#93C01F]/30 transition-colors">
                <TrendingUp size={24} className="text-[#93C01F]" />
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A]">View My Deals</p>
                <p className="text-sm text-[#666]">Track active opportunities</p>
              </div>
            </div>
          </Link>

          <Link
            to="/portal/accounts"
            className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5 hover:border-[#EAD07D] transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Building2 size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-[#1A1A1A]">Assigned Accounts</p>
                <p className="text-sm text-[#666]">View your territories</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PortalDashboard;
