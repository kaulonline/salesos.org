import React from 'react';
import {
  Users, CheckCircle, DollarSign, Zap, Database, CreditCard, Server,
  Activity, ChevronRight, ArrowUpRight
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatNumber, formatCurrency, formatDate } from '../../utils/formatting';

interface AdminStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  crm: {
    leads: number;
    contacts: number;
    accounts: number;
    opportunities: number;
  };
  ai: {
    totalTokensUsed: number;
    successRate: number;
  };
  system: {
    version: string;
    uptime: number;
    lastBackup: string;
  };
}

interface LicensingDashboard {
  activeLicenses: number;
  trialLicenses: number;
  revenue: {
    monthly: number;
    yearly: number;
  };
}

interface PaymentsDashboard {
  totalRevenue: number;
  activeSubscriptions: number;
}

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  user?: {
    email: string;
  };
}

interface AdminOverviewTabProps {
  stats?: AdminStats | null;
  statsLoading: boolean;
  licensingDashboard?: LicensingDashboard | null;
  licensingLoading: boolean;
  paymentsDashboard?: PaymentsDashboard | null;
  calculatedRevenue: {
    monthly: number;
    yearly: number;
    projected: number;
  };
  logs?: AuditLog[] | null;
  logsLoading: boolean;
  onNavigateToTab: (tab: string) => void;
  onNavigateToAudit: () => void;
}

export function AdminOverviewTab({
  stats,
  statsLoading,
  licensingDashboard,
  licensingLoading,
  paymentsDashboard,
  calculatedRevenue,
  logs,
  logsLoading,
  onNavigateToTab,
  onNavigateToAudit,
}: AdminOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))
        ) : (
          <>
            <div className="bg-[#EAD07D] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A]/10 flex items-center justify-center mb-4">
                  <Users size={20} className="text-[#1A1A1A]" />
                </div>
                <p className="text-3xl font-light text-[#1A1A1A] mb-1">
                  {formatNumber(stats?.users.total)}
                </p>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-wider">Total Users</p>
                <p className="text-xs text-[#1A1A1A]/70 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  +{stats?.users.newThisMonth || 0} this month
                </p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <p className="text-3xl font-light text-white mb-1">
                  {formatNumber(stats?.users.active)}
                </p>
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Active Users</p>
                <p className="text-xs text-white/50 mt-2">
                  {stats?.users.total ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% of total
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('billing')}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform text-left w-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <DollarSign size={20} className="text-white" />
                </div>
                <p className="text-3xl font-light text-white mb-1">
                  {formatCurrency(paymentsDashboard?.totalRevenue || calculatedRevenue.monthly, true)}
                </p>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Subscription Revenue</p>
                <p className="text-xs text-white/80 mt-2 flex items-center gap-1">
                  <ArrowUpRight size={12} />
                  {paymentsDashboard?.activeSubscriptions || 0} active subscriptions
                </p>
              </div>
            </button>

            <div className="bg-[#888] rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Zap size={20} className="text-white" />
                </div>
                <p className="text-3xl font-light text-white mb-1">
                  {formatNumber(stats?.ai.totalTokensUsed)}
                </p>
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider">AI Tokens</p>
                <p className="text-xs text-white/60 mt-2">
                  {stats?.ai.successRate || 0}% success rate
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRM Stats */}
        <Card className="p-6">
          <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Database size={18} className="text-[#EAD07D]" />
            CRM Statistics
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Leads', value: stats?.crm.leads || 0, color: 'bg-blue-500' },
              { label: 'Contacts', value: stats?.crm.contacts || 0, color: 'bg-green-500' },
              { label: 'Accounts', value: stats?.crm.accounts || 0, color: 'bg-purple-500' },
              { label: 'Opportunities', value: stats?.crm.opportunities || 0, color: 'bg-[#EAD07D]' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-[#666]">{item.label}</span>
                </div>
                <span className="font-bold text-[#1A1A1A]">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Licensing Stats */}
        <Card className="p-6">
          <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-[#EAD07D]" />
            Licensing Overview
          </h3>
          {licensingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 rounded" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666]">Active Licenses</span>
                <span className="font-bold text-[#1A1A1A]">{licensingDashboard?.activeLicenses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666]">Trial Users</span>
                <span className="font-bold text-[#1A1A1A]">{licensingDashboard?.trialLicenses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666]">Monthly Revenue</span>
                <span className="font-bold text-green-600">{formatCurrency(licensingDashboard?.revenue?.monthly)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666]">Annual Revenue</span>
                <span className="font-bold text-[#1A1A1A]">{formatCurrency(licensingDashboard?.revenue?.yearly)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* System Health */}
        <Card className="p-6">
          <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Server size={18} className="text-[#EAD07D]" />
            System Health
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666]">System Status</span>
              <Badge variant="green" size="sm">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666]">Version</span>
              <span className="font-mono text-sm">{stats?.system.version || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666]">Uptime</span>
              <span className="text-sm font-medium">
                {stats?.system.uptime ? `${Math.floor(stats.system.uptime / 3600)}h` : '99.9%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666]">Last Backup</span>
              <span className="text-sm">{formatDate(stats?.system.lastBackup)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
            <Activity size={18} className="text-[#EAD07D]" />
            Recent Activity
          </h3>
          <button
            onClick={onNavigateToAudit}
            className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1 font-medium"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {logsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))
          ) : (logs || []).length === 0 ? (
            <p className="text-center text-[#666] py-8">No recent activity</p>
          ) : (
            (logs || []).slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Activity size={14} className="text-[#666]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{log.action}</p>
                    <p className="text-xs text-[#666]">{log.user?.email || 'System'}</p>
                  </div>
                </div>
                <span className="text-xs text-[#999]">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default AdminOverviewTab;
