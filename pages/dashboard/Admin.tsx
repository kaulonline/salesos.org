import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Shield, Activity, Search, MoreHorizontal, Ban, CheckCircle,
  XCircle, Key, RefreshCw, Database, Server, Zap, Clock, ChevronRight,
  CreditCard, Building2, Settings, TrendingUp, DollarSign, Package,
  Plus, Trash2, Edit, Eye, Copy, AlertTriangle, Crown, Star, Sparkles,
  ToggleLeft, ToggleRight, ChevronDown, X, Loader2, Check, Filter,
  Download, Upload, Calendar, Mail, UserPlus, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, FileText, Lock
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import {
  useAdminDashboard,
  useAdminUsers,
  useFeatureFlags,
  useSystemConfig,
  useAuditLogs,
  useLicensingDashboard,
  useLicenseTypes,
  useUserLicenses,
  usePreGeneratedKeys,
} from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import type { LicenseStatus, LicenseTier, PreGeneratedKeyStatus } from '../../src/api/licensing';

type TabType = 'overview' | 'users' | 'billing' | 'features' | 'settings' | 'audit';
type BillingSubTab = 'overview' | 'plans' | 'licenses' | 'keys';

const formatNumber = (num?: number) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatCurrency = (cents?: number, compact = false) => {
  if (!cents) return '$0';
  const value = cents / 100;
  if (compact) {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'green' | 'yellow' | 'red' | 'outline' | 'dark'> = {
    ACTIVE: 'green',
    PENDING: 'yellow',
    SUSPENDED: 'red',
    INACTIVE: 'outline',
    TRIAL: 'yellow',
    EXPIRED: 'red',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

const getRoleBadge = (role: string) => {
  const variants: Record<string, 'dark' | 'yellow' | 'outline'> = {
    ADMIN: 'dark',
    MANAGER: 'yellow',
    USER: 'outline',
    VIEWER: 'outline',
  };
  return <Badge variant={variants[role] || 'outline'} size="sm">{role}</Badge>;
};

const getTierBadge = (tier: LicenseTier) => {
  const config: Record<LicenseTier, { variant: 'outline' | 'yellow' | 'dark' | 'green'; icon?: React.ReactNode }> = {
    FREE: { variant: 'outline' },
    STARTER: { variant: 'yellow', icon: <Star size={10} /> },
    PROFESSIONAL: { variant: 'dark', icon: <Sparkles size={10} /> },
    ENTERPRISE: { variant: 'green', icon: <Crown size={10} /> },
    CUSTOM: { variant: 'dark' },
  };
  const { variant, icon } = config[tier] || { variant: 'outline' };
  return (
    <Badge variant={variant} size="sm" className="gap-1">
      {icon}
      {tier}
    </Badge>
  );
};

const getKeyStatusBadge = (status: PreGeneratedKeyStatus) => {
  const variants: Record<PreGeneratedKeyStatus, 'green' | 'yellow' | 'red' | 'outline'> = {
    AVAILABLE: 'green',
    CLAIMED: 'yellow',
    EXPIRED: 'outline',
    REVOKED: 'red',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const activeTab = useMemo<TabType>(() => {
    const path = location.pathname;
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/billing')) return 'billing';
    if (path.includes('/admin/features')) return 'features';
    if (path.includes('/admin/settings') || path.includes('/admin/system')) return 'settings';
    if (path.includes('/admin/audit')) return 'audit';
    // For /dashboard/admin, check query params
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['overview', 'users', 'billing', 'features', 'settings', 'audit'].includes(tab)) {
      return tab as TabType;
    }
    return 'overview';
  }, [location.pathname, location.search]);

  const [billingSubTab, setBillingSubTab] = useState<BillingSubTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showAssignLicenseModal, setShowAssignLicenseModal] = useState(false);
  const [showGenerateKeysModal, setShowGenerateKeysModal] = useState(false);

  // Check if user is admin (handle case sensitivity)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Helper to navigate to tab (works for both /admin/* and /dashboard/admin routes)
  const handleTabChange = (tab: TabType) => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (isAdminRoute) {
      if (tab === 'overview') navigate('/admin');
      else navigate(`/admin/${tab}`);
    } else {
      // For /dashboard/admin, use query params
      navigate(tab === 'overview' ? '/dashboard/admin' : `/dashboard/admin?tab=${tab}`);
    }
  };

  // Admin Hooks
  const { stats, loading: statsLoading } = useAdminDashboard();
  const {
    users,
    total: totalUsers,
    loading: usersLoading,
    suspendUser,
    activateUser,
    resetPassword,
    refetch: refetchUsers,
  } = useAdminUsers({ search: searchQuery, role: selectedRole, status: selectedStatus });
  const { flags, loading: flagsLoading, toggleFlag } = useFeatureFlags();
  const { configs, loading: configsLoading } = useSystemConfig();
  const { logs, loading: logsLoading } = useAuditLogs({ limit: 20 });

  // Licensing Hooks
  const { dashboard: licensingDashboard, loading: licensingLoading } = useLicensingDashboard();
  const { types: licenseTypes, loading: typesLoading, createType, updateType, deleteType } = useLicenseTypes();
  const {
    licenses: userLicenses,
    total: totalLicenses,
    loading: licensesLoading,
    assignLicense,
    revokeLicense,
    suspendLicense,
    resumeLicense,
    renewLicense,
    refetch: refetchLicenses,
  } = useUserLicenses();
  const {
    keys: licenseKeys,
    total: totalKeys,
    loading: keysLoading,
    generateKeys,
    revokeKey,
    refetch: refetchKeys,
  } = usePreGeneratedKeys();

  // Refetch users when search/filters change
  useEffect(() => {
    if (activeTab === 'users') {
      refetchUsers({ search: searchQuery, role: selectedRole, status: selectedStatus });
    }
  }, [searchQuery, selectedRole, selectedStatus]);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Access Denied</h2>
          <p className="text-[#666]">
            You don't have permission to access the admin panel. Please contact your administrator.
          </p>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'features', label: 'Features', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit', icon: Clock },
  ];

  const billingTabs = [
    { id: 'overview', label: 'Revenue', icon: BarChart3 },
    { id: 'plans', label: 'Plans', icon: Package },
    { id: 'licenses', label: 'Licenses', icon: FileText },
    { id: 'keys', label: 'Keys', icon: Key },
  ];

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#666] text-sm mb-2">
          <Shield size={16} />
          <span>Administration</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Admin Console</h1>
            <p className="text-[#666] mt-1">Manage users, billing, features, and system settings</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="green" size="sm" dot>System Operational</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 bg-white/60 p-1.5 rounded-2xl w-fit border border-white/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as TabType)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-white shadow-md'
                : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/70'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
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

                <div className="bg-white rounded-2xl p-6 border border-[#F2F1EA] relative overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2F1EA]/50 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center mb-4">
                      <DollarSign size={20} className="text-[#666]" />
                    </div>
                    <p className="text-3xl font-light text-[#1A1A1A] mb-1">
                      {formatCurrency((stats?.crm.pipelineValue || 0) * 100, true)}
                    </p>
                    <p className="text-xs font-bold text-[#999] uppercase tracking-wider">Pipeline Value</p>
                    <p className="text-xs text-[#666] mt-2">
                      {stats?.crm.opportunities || 0} opportunities
                    </p>
                  </div>
                </div>

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
                onClick={() => setActiveTab('audit')}
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
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="USER">User</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <button
                  onClick={() => refetchUsers()}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Last Login</th>
                    <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F1EA]">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-4 px-6">
                          <Skeleton className="h-12 rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : (users || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#666]">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    (users || []).map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar src={u.avatarUrl} name={u.name || u.email} size="sm" />
                            <div>
                              <p className="font-medium text-[#1A1A1A]">{u.name || 'No name'}</p>
                              <p className="text-xs text-[#666]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">{getRoleBadge(u.role)}</td>
                        <td className="py-4 px-6">{getStatusBadge(u.status)}</td>
                        <td className="py-4 px-6 text-sm text-[#666]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => suspendUser(u.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                title="Suspend"
                              >
                                <Ban size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => activateUser(u.id)}
                                className="p-2 rounded-lg hover:bg-green-50 text-[#666] hover:text-green-600 transition-colors"
                                title="Activate"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => resetPassword(u.id)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-[#666] hover:text-blue-600 transition-colors"
                              title="Reset Password"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors"
                              title="More"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalUsers > 20 && (
              <div className="p-4 border-t border-[#F2F1EA] flex items-center justify-between">
                <p className="text-sm text-[#666]">
                  Showing {(users || []).length} of {totalUsers} users
                </p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors">
                    Previous
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Billing Sub-tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {billingTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBillingSubTab(tab.id as BillingSubTab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                  billingSubTab === tab.id
                    ? 'bg-[#EAD07D] text-[#1A1A1A]'
                    : 'bg-white text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] border border-[#F2F1EA]'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Revenue Overview */}
          {billingSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Revenue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {licensingLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                  ))
                ) : (
                  <>
                    <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-green-600/70 uppercase tracking-wider">Monthly Revenue</p>
                          <p className="text-2xl font-light text-green-700 mt-1">
                            {formatCurrency(licensingDashboard?.revenue?.monthly)}
                          </p>
                          <p className="text-xs text-green-600/70 mt-2 flex items-center gap-1">
                            <ArrowUpRight size={12} />
                            +12% vs last month
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                          <TrendingUp size={18} className="text-green-600" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Annual Revenue</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {formatCurrency(licensingDashboard?.revenue?.yearly)}
                          </p>
                          <p className="text-xs text-[#666] mt-2">
                            Projected: {formatCurrency((licensingDashboard?.revenue?.monthly || 0) * 12)}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center">
                          <DollarSign size={18} className="text-[#666]" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Active Licenses</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {licensingDashboard?.activeLicenses || 0}
                          </p>
                          <p className="text-xs text-[#666] mt-2">
                            {licensingDashboard?.trialLicenses || 0} on trial
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center">
                          <FileText size={18} className="text-[#666]" />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Total Revenue</p>
                          <p className="text-2xl font-light text-[#1A1A1A] mt-1">
                            {formatCurrency(licensingDashboard?.revenue?.total)}
                          </p>
                          <p className="text-xs text-[#666] mt-2">All time</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                          <BarChart3 size={18} className="text-[#1A1A1A]" />
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </div>

              {/* Revenue by Tier */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <PieChart size={18} className="text-[#EAD07D]" />
                    Licenses by Tier
                  </h3>
                  <div className="space-y-3">
                    {(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as LicenseTier[]).map((tier) => {
                      const count = licensingDashboard?.byTier?.[tier] || 0;
                      const total = licensingDashboard?.totalLicenses || 1;
                      const percentage = Math.round((count / total) * 100) || 0;
                      return (
                        <div key={tier}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-[#666]">{tier}</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">{count}</span>
                          </div>
                          <div className="h-2 bg-[#F2F1EA] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                tier === 'ENTERPRISE' ? 'bg-green-500' :
                                tier === 'PROFESSIONAL' ? 'bg-[#1A1A1A]' :
                                tier === 'STARTER' ? 'bg-[#EAD07D]' : 'bg-[#888]'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-[#EAD07D]" />
                    Licenses by Status
                  </h3>
                  <div className="space-y-3">
                    {(['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED'] as LicenseStatus[]).map((status) => {
                      const count = licensingDashboard?.byStatus?.[status] || 0;
                      return (
                        <div key={status} className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'ACTIVE' ? 'bg-green-500' :
                              status === 'TRIAL' ? 'bg-[#EAD07D]' :
                              status === 'EXPIRED' ? 'bg-[#888]' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-[#666]">{status}</span>
                          </div>
                          <span className="font-bold text-[#1A1A1A]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Plans Management */}
          {billingSubTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Subscription Plans</h3>
                  <p className="text-sm text-[#666]">Manage your pricing tiers and features</p>
                </div>
                <button
                  onClick={() => setShowCreatePlanModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  New Plan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {typesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))
                ) : (licenseTypes || []).length === 0 ? (
                  <Card className="col-span-full p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                      <Package size={24} className="text-[#999]" />
                    </div>
                    <h4 className="font-bold text-[#1A1A1A] mb-2">No Plans Yet</h4>
                    <p className="text-sm text-[#666] mb-4">Create your first subscription plan</p>
                    <button
                      onClick={() => setShowCreatePlanModal(true)}
                      className="px-4 py-2 rounded-xl bg-[#EAD07D] text-[#1A1A1A] font-medium text-sm hover:bg-[#E5C56B] transition-colors"
                    >
                      Create Plan
                    </button>
                  </Card>
                ) : (
                  (licenseTypes || []).map((plan) => (
                    <Card key={plan.id} className={`p-5 relative overflow-hidden ${
                      plan.tier === 'ENTERPRISE' ? 'bg-gradient-to-br from-[#1A1A1A] to-[#333] text-white' :
                      plan.tier === 'PROFESSIONAL' ? 'bg-gradient-to-br from-[#EAD07D]/20 to-[#EAD07D]/5' : ''
                    }`}>
                      {plan.tier === 'ENTERPRISE' && (
                        <div className="absolute top-3 right-3">
                          <Crown size={16} className="text-[#EAD07D]" />
                        </div>
                      )}
                      <div className="mb-4">
                        {getTierBadge(plan.tier)}
                      </div>
                      <h4 className={`font-bold text-lg mb-1 ${plan.tier === 'ENTERPRISE' ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {plan.name}
                      </h4>
                      <p className={`text-xs mb-4 ${plan.tier === 'ENTERPRISE' ? 'text-white/60' : 'text-[#666]'}`}>
                        {plan.description || 'No description'}
                      </p>
                      <div className="mb-4">
                        <span className={`text-2xl font-light ${plan.tier === 'ENTERPRISE' ? 'text-white' : 'text-[#1A1A1A]'}`}>
                          {formatCurrency(plan.priceMonthly)}
                        </span>
                        <span className={`text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/50' : 'text-[#888]'}`}>/mo</span>
                      </div>
                      <div className={`space-y-2 text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/70' : 'text-[#666]'}`}>
                        {plan.maxUsers && (
                          <div className="flex items-center gap-2">
                            <Users size={12} />
                            <span>{plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} users</span>
                          </div>
                        )}
                        {plan.maxConversations && (
                          <div className="flex items-center gap-2">
                            <Zap size={12} />
                            <span>{plan.maxConversations === -1 ? 'Unlimited' : formatNumber(plan.maxConversations)} AI chats</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className={`text-xs ${plan.tier === 'ENTERPRISE' ? 'text-white/50' : 'text-[#888]'}`}>
                          {plan._count?.userLicenses || 0} active
                        </span>
                        <div className="flex gap-1">
                          <button className={`p-1.5 rounded-lg transition-colors ${
                            plan.tier === 'ENTERPRISE'
                              ? 'hover:bg-white/10 text-white/60'
                              : 'hover:bg-[#F2F1EA] text-[#888]'
                          }`}>
                            <Edit size={12} />
                          </button>
                          <button className={`p-1.5 rounded-lg transition-colors ${
                            plan.tier === 'ENTERPRISE'
                              ? 'hover:bg-white/10 text-white/60'
                              : 'hover:bg-[#F2F1EA] text-[#888]'
                          }`}>
                            <MoreHorizontal size={12} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Licenses */}
          {billingSubTab === 'licenses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">User Licenses</h3>
                  <p className="text-sm text-[#666]">Manage individual user subscriptions</p>
                </div>
                <button
                  onClick={() => setShowAssignLicenseModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <UserPlus size={14} />
                  Assign License
                </button>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Plan</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Expires</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {licensesLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (userLicenses || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#666]">
                            No licenses assigned yet
                          </td>
                        </tr>
                      ) : (
                        (userLicenses || []).map((license) => (
                          <tr key={license.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <Avatar src={license.user?.avatarUrl} name={license.user?.name || license.user?.email} size="sm" />
                                <div>
                                  <p className="font-medium text-[#1A1A1A]">
                                    {license.user?.firstName && license.user?.lastName
                                      ? `${license.user.firstName} ${license.user.lastName}`
                                      : license.user?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-[#666]">{license.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {license.licenseType ? getTierBadge(license.licenseType.tier) : <span className="text-[#666]">-</span>}
                            </td>
                            <td className="py-4 px-6">
                              {getStatusBadge(license.status)}
                              {license.isTrial && (
                                <Badge variant="outline" size="sm" className="ml-1">Trial</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[#666]">
                              {formatDate(license.endDate)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {license.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => suspendLicense(license.id)}
                                    className="p-2 rounded-lg hover:bg-yellow-50 text-[#666] hover:text-yellow-600 transition-colors"
                                    title="Suspend"
                                  >
                                    <Ban size={14} />
                                  </button>
                                )}
                                {license.status === 'SUSPENDED' && (
                                  <button
                                    onClick={() => resumeLicense(license.id)}
                                    className="p-2 rounded-lg hover:bg-green-50 text-[#666] hover:text-green-600 transition-colors"
                                    title="Resume"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => renewLicense(license.id)}
                                  className="p-2 rounded-lg hover:bg-blue-50 text-[#666] hover:text-blue-600 transition-colors"
                                  title="Renew"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button
                                  onClick={() => revokeLicense(license.id)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                  title="Revoke"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* License Keys */}
          {billingSubTab === 'keys' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">License Keys</h3>
                  <p className="text-sm text-[#666]">Pre-generated keys for distribution</p>
                </div>
                <button
                  onClick={() => setShowGenerateKeysModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={14} />
                  Generate Keys
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Available</p>
                  <p className="text-2xl font-light text-green-600">
                    {(licenseKeys || []).filter(k => k.status === 'AVAILABLE').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Claimed</p>
                  <p className="text-2xl font-light text-[#EAD07D]">
                    {(licenseKeys || []).filter(k => k.status === 'CLAIMED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Expired</p>
                  <p className="text-2xl font-light text-[#888]">
                    {(licenseKeys || []).filter(k => k.status === 'EXPIRED').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Revoked</p>
                  <p className="text-2xl font-light text-red-500">
                    {(licenseKeys || []).filter(k => k.status === 'REVOKED').length}
                  </p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                      <tr>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Key</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Plan</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Claimed By</th>
                        <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F1EA]">
                      {keysLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={5} className="py-4 px-6">
                              <Skeleton className="h-12 rounded-xl" />
                            </td>
                          </tr>
                        ))
                      ) : (licenseKeys || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#666]">
                            No license keys generated yet
                          </td>
                        </tr>
                      ) : (
                        (licenseKeys || []).map((key) => (
                          <tr key={key.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-[#F8F8F6] px-2 py-1 rounded">
                                  {key.licenseKey.slice(0, 8)}...{key.licenseKey.slice(-4)}
                                </code>
                                <button
                                  onClick={() => navigator.clipboard.writeText(key.licenseKey)}
                                  className="p-1 rounded hover:bg-[#F2F1EA] text-[#888] hover:text-[#1A1A1A] transition-colors"
                                  title="Copy"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {key.licenseType ? getTierBadge(key.licenseType.tier) : <span className="text-[#666]">-</span>}
                            </td>
                            <td className="py-4 px-6">
                              {getKeyStatusBadge(key.status)}
                              {key.isTrial && (
                                <Badge variant="outline" size="sm" className="ml-1">Trial</Badge>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-[#666]">
                              {key.claimedBy ? key.claimedBy.email : '-'}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-1">
                                {key.status === 'AVAILABLE' && (
                                  <button
                                    onClick={() => revokeKey(key.id)}
                                    className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                                    title="Revoke"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Feature Flags</h3>
                <p className="text-sm text-[#666]">Enable or disable features across the platform</p>
              </div>
            </div>

            {flagsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (flags || []).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                  <Zap size={24} className="text-[#999]" />
                </div>
                <p className="text-[#666]">No feature flags configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(flags || []).map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        flag.enabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Zap size={18} className={flag.enabled ? 'text-green-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{flag.name}</p>
                        <p className="text-xs text-[#666]">{flag.description || flag.key}</p>
                        {flag.category && (
                          <Badge variant="outline" size="sm" className="mt-1">{flag.category}</Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFlag(flag.key)}
                      className={`p-2 rounded-lg transition-colors ${
                        flag.enabled
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Settings size={18} className="text-[#EAD07D]" />
                General Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Application Name</p>
                    <p className="text-xs text-[#666]">The name displayed across the platform</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">SalesOS</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Support Email</p>
                    <p className="text-xs text-[#666]">Contact email for support inquiries</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">support@salesos.org</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Default Timezone</p>
                    <p className="text-xs text-[#666]">System default timezone</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">UTC</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Lock size={18} className="text-[#EAD07D]" />
                Security Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Session Timeout</p>
                    <p className="text-xs text-[#666]">Auto logout after inactivity</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">30 min</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Two-Factor Auth</p>
                    <p className="text-xs text-[#666]">Require 2FA for all users</p>
                  </div>
                  <Badge variant="green" size="sm">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Password Policy</p>
                    <p className="text-xs text-[#666]">Minimum password requirements</p>
                  </div>
                  <Badge variant="dark" size="sm">Strong</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Zap size={18} className="text-[#EAD07D]" />
                AI Configuration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Default Model</p>
                    <p className="text-xs text-[#666]">AI model for conversations</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">claude-sonnet</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Max Tokens</p>
                    <p className="text-xs text-[#666]">Maximum response length</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">4,096</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">Rate Limit</p>
                    <p className="text-xs text-[#666]">Requests per minute</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">60</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Mail size={18} className="text-[#EAD07D]" />
                Email Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">SMTP Provider</p>
                    <p className="text-xs text-[#666]">Email delivery service</p>
                  </div>
                  <Badge variant="green" size="sm">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm">From Address</p>
                    <p className="text-xs text-[#666]">Default sender email</p>
                  </div>
                  <span className="text-sm font-mono bg-white px-3 py-1.5 rounded-lg border border-[#F2F1EA]">noreply@salesos.org</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Audit Logs</h3>
                <p className="text-sm text-[#666]">Track all administrative actions</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors flex items-center gap-2">
                  <Filter size={14} />
                  Filter
                </button>
                <button className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors flex items-center gap-2">
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (logs || []).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-[#999]" />
                </div>
                <p className="text-[#666]">No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(logs || []).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F2F1EA] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mt-0.5">
                        <Clock size={16} className="text-[#666]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{log.action}</p>
                        <p className="text-xs text-[#666] mt-0.5">
                          {log.user?.name || log.user?.email || 'System'}
                          {log.entityType && ` • ${log.entityType}`}
                          {log.entityId && ` #${log.entityId.slice(0, 8)}`}
                        </p>
                        {log.ipAddress && (
                          <p className="text-xs text-[#999] mt-1">IP: {log.ipAddress}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#999]">{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-[#999]">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Create Plan Modal Placeholder */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreatePlanModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Create New Plan</h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <p className="text-sm text-[#666] mb-6">Plan creation form coming soon...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreatePlanModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign License Modal Placeholder */}
      {showAssignLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAssignLicenseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Assign License</h3>
              <button onClick={() => setShowAssignLicenseModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <p className="text-sm text-[#666] mb-6">License assignment form coming soon...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignLicenseModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAssignLicenseModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Keys Modal Placeholder */}
      {showGenerateKeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGenerateKeysModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Generate License Keys</h3>
              <button onClick={() => setShowGenerateKeysModal(false)} className="p-2 rounded-lg hover:bg-[#F8F8F6]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <p className="text-sm text-[#666] mb-6">Key generation form coming soon...</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateKeysModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#F2F1EA] text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowGenerateKeysModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
