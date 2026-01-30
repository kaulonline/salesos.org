import React, { useState, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompanies } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';

type HealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | 'UNKNOWN';
type HealthTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

interface AccountHealthData {
  id: string;
  name: string;
  industry: string;
  healthScore: number;
  status: HealthStatus;
  trend: HealthTrend;
  lastActivity: string;
  openDeals: number;
  totalRevenue: number;
  riskFactors: string[];
  opportunities: string[];
}

const healthConfig: Record<HealthStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  HEALTHY: { label: 'Healthy', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20', icon: <CheckCircle size={16} /> },
  AT_RISK: { label: 'At Risk', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20', icon: <AlertTriangle size={16} /> },
  CRITICAL: { label: 'Critical', color: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]/10', icon: <AlertTriangle size={16} /> },
  UNKNOWN: { label: 'Unknown', color: 'text-[#999]', bg: 'bg-[#F8F8F6]', icon: <Minus size={16} /> },
};

const trendConfig: Record<HealthTrend, { icon: React.ReactNode; color: string }> = {
  IMPROVING: { icon: <TrendingUp size={14} />, color: 'text-[#93C01F]' },
  STABLE: { icon: <Minus size={14} />, color: 'text-[#999]' },
  DECLINING: { icon: <TrendingDown size={14} />, color: 'text-[#1A1A1A]' },
};

export const AccountHealth: React.FC = () => {
  const { companies, loading } = useCompanies();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<HealthStatus | 'ALL'>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Calculate health scores for accounts based on real data
  const accountHealthData = useMemo(() => {
    return companies.map(company => {
      // Calculate health score based on available data
      const lastActivityDate = company.lastActivityDate ? new Date(company.lastActivityDate) : null;
      const daysSinceActivity = lastActivityDate
        ? Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const hasRecentActivity = daysSinceActivity < 30;
      const hasModerateActivity = daysSinceActivity < 60;
      const hasOpenDeals = (company.opportunityCount || 0) > 0;
      const hasContacts = (company.contactCount || 0) > 0;
      const hasRevenue = (company.annualRevenue || 0) > 0;

      // Calculate health score based on multiple factors
      let healthScore = 30; // Base score
      if (hasRecentActivity) healthScore += 25;
      else if (hasModerateActivity) healthScore += 10;
      if (hasOpenDeals) healthScore += 20;
      if (hasContacts) healthScore += 15;
      if (hasRevenue) healthScore += 10;

      // Cap at 100
      healthScore = Math.min(100, healthScore);

      let status: HealthStatus = 'UNKNOWN';
      if (healthScore >= 70) status = 'HEALTHY';
      else if (healthScore >= 45) status = 'AT_RISK';
      else if (healthScore > 0) status = 'CRITICAL';

      // Determine trend based on activity recency
      let trend: HealthTrend = 'STABLE';
      if (daysSinceActivity < 14 && hasOpenDeals) {
        trend = 'IMPROVING';
      } else if (daysSinceActivity > 45 || (!hasOpenDeals && !hasContacts)) {
        trend = 'DECLINING';
      }

      const riskFactors: string[] = [];
      const opportunities: string[] = [];

      if (daysSinceActivity > 60) riskFactors.push('No activity in 60+ days');
      else if (daysSinceActivity > 30) riskFactors.push('No activity in 30+ days');
      if (!hasOpenDeals) riskFactors.push('No active opportunities');
      if (!hasContacts) riskFactors.push('No contacts on file');

      if (hasRecentActivity && hasOpenDeals) opportunities.push('Active engagement with open deals');
      else if (hasRecentActivity) opportunities.push('Recent engagement - good time for outreach');
      if (hasRevenue && !hasOpenDeals) opportunities.push('Existing customer - potential upsell');

      return {
        id: company.id,
        name: company.name,
        industry: company.industry || 'Unknown',
        healthScore,
        status,
        trend,
        lastActivity: company.lastActivityDate || '',
        openDeals: company.opportunityCount || 0,
        totalRevenue: company.annualRevenue || 0,
        riskFactors,
        opportunities,
      } as AccountHealthData;
    });
  }, [companies]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accountHealthData
      .filter(account => {
        if (filterStatus !== 'ALL' && account.status !== filterStatus) return false;
        if (searchTerm && !account.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.healthScore - b.healthScore); // Show critical first
  }, [accountHealthData, filterStatus, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const healthy = accountHealthData.filter(a => a.status === 'HEALTHY').length;
    const atRisk = accountHealthData.filter(a => a.status === 'AT_RISK').length;
    const critical = accountHealthData.filter(a => a.status === 'CRITICAL').length;
    const avgScore = accountHealthData.reduce((sum, a) => sum + a.healthScore, 0) / accountHealthData.length || 0;

    return { healthy, atRisk, critical, avgScore };
  }, [accountHealthData]);

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[600px] rounded-3xl" />
        </div>
      </div>
    );
  }

  const selectedAccountData = selectedAccount
    ? accountHealthData.find(a => a.id === selectedAccount)
    : null;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Activity size={28} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Account Health</h1>
              <p className="text-[#666] mt-1">Monitor account health scores and engagement trends</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <CheckCircle size={18} className="text-[#93C01F]" />
              </div>
              <span className="text-sm text-[#666]">Healthy</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{stats.healthy}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#EAD07D]" />
              </div>
              <span className="text-sm text-[#666]">At Risk</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{stats.atRisk}</p>
          </div>
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                <AlertTriangle size={18} className="text-white" />
              </div>
              <span className="text-sm text-[#666]">Critical</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{stats.critical}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-[24px] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <Activity size={18} className="text-[#EAD07D]" />
              </div>
              <span className="text-sm text-white/60">Avg Score</span>
            </div>
            <p className="text-3xl font-light text-white">{Math.round(stats.avgScore)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account List */}
          <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as HealthStatus | 'ALL')}
                  className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="HEALTHY">Healthy</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            {/* Account List */}
            <div className="divide-y divide-black/5 max-h-[600px] overflow-y-auto">
              {filteredAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Building2 size={48} className="text-[#999] mb-4 opacity-40" />
                  <p className="text-[#666]">No accounts found</p>
                </div>
              ) : (
                filteredAccounts.map(account => {
                  const config = healthConfig[account.status];
                  const trendInfo = trendConfig[account.trend];

                  return (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account.id)}
                      className={`w-full p-4 text-left hover:bg-[#F8F8F6] transition-colors ${
                        selectedAccount === account.id ? 'bg-[#EAD07D]/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Health Score Circle */}
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="#F0EBD8"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke={account.status === 'HEALTHY' ? '#93C01F' : account.status === 'AT_RISK' ? '#EAD07D' : '#1A1A1A'}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${account.healthScore} 100`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-semibold text-[#1A1A1A]">{account.healthScore}</span>
                          </div>
                        </div>

                        {/* Account Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-[#1A1A1A] truncate">{account.name}</h3>
                            <span className={`flex items-center gap-1 text-xs ${trendInfo.color}`}>
                              {trendInfo.icon}
                            </span>
                          </div>
                          <p className="text-sm text-[#666]">{account.industry}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-[#999]">
                            <span>{account.openDeals} deals</span>
                            <span>Last active: {formatDate(account.lastActivity)}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${config.bg} ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>

                        <ChevronRight size={18} className="text-[#999]" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Account Detail Panel */}
          <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-6">
            {selectedAccountData ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${healthConfig[selectedAccountData.status].bg}`}>
                    <span className="text-2xl font-light text-[#1A1A1A]">{selectedAccountData.healthScore}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#1A1A1A]">{selectedAccountData.name}</h2>
                    <p className="text-sm text-[#666]">{selectedAccountData.industry}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                    <span className="text-sm text-[#666]">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${healthConfig[selectedAccountData.status].bg} ${healthConfig[selectedAccountData.status].color}`}>
                      {healthConfig[selectedAccountData.status].label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                    <span className="text-sm text-[#666]">Trend</span>
                    <span className={`flex items-center gap-1 text-sm font-medium ${trendConfig[selectedAccountData.trend].color}`}>
                      {trendConfig[selectedAccountData.trend].icon}
                      {selectedAccountData.trend}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                    <span className="text-sm text-[#666]">Open Deals</span>
                    <span className="text-sm font-medium text-[#1A1A1A]">{selectedAccountData.openDeals}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                    <span className="text-sm text-[#666]">Annual Revenue</span>
                    <span className="text-sm font-medium text-[#1A1A1A]">{formatCurrency(selectedAccountData.totalRevenue)}</span>
                  </div>
                </div>

                {selectedAccountData.riskFactors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Risk Factors</h3>
                    <ul className="space-y-2">
                      {selectedAccountData.riskFactors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[#666]">
                          <AlertTriangle size={14} className="text-[#EAD07D] mt-0.5 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAccountData.opportunities.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Opportunities</h3>
                    <ul className="space-y-2">
                      {selectedAccountData.opportunities.map((opp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[#93C01F]">
                          <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
                          {opp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  to={`/dashboard/companies`}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors"
                >
                  View Account
                  <ChevronRight size={16} />
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <Building2 size={48} className="text-[#999] mb-4 opacity-40" />
                <p className="text-[#666] text-center">Select an account to view health details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountHealth;
