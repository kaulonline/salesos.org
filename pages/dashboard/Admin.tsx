import React, { useState } from 'react';
import {
  Users,
  Settings,
  Shield,
  Activity,
  ToggleLeft,
  ToggleRight,
  Search,
  MoreHorizontal,
  UserPlus,
  Mail,
  Ban,
  CheckCircle,
  XCircle,
  Key,
  Trash2,
  RefreshCw,
  Database,
  Server,
  Zap,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import {
  useAdminDashboard,
  useAdminUsers,
  useFeatureFlags,
  useAuditLogs,
} from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';

type TabType = 'overview' | 'users' | 'features' | 'audit';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  // Hooks
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
  const { logs, loading: logsLoading } = useAuditLogs({ limit: 20 });

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
    { id: 'features', label: 'Feature Flags', icon: Zap },
    { id: 'audit', label: 'Audit Logs', icon: Clock },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'green' | 'yellow' | 'red' | 'outline'> = {
      ACTIVE: 'green',
      PENDING: 'yellow',
      SUSPENDED: 'red',
      INACTIVE: 'outline',
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

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#666] text-sm mb-2">
          <Shield size={16} />
          <span>Administration</span>
        </div>
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Admin Console</h1>
        <p className="text-[#666] mt-1">Manage users, features, and system settings</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-white/60 p-1 rounded-full w-fit border border-white/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/50'
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))
            ) : (
              <>
                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#999] uppercase tracking-wider">Total Users</p>
                      <p className="text-3xl font-light text-[#1A1A1A] mt-1">
                        {formatNumber(stats?.users.total || 0)}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-1">
                        +{stats?.users.newThisMonth || 0} this month
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Users size={20} className="text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#999] uppercase tracking-wider">Active Users</p>
                      <p className="text-3xl font-light text-[#1A1A1A] mt-1">
                        {formatNumber(stats?.users.active || 0)}
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        {stats?.users.total ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% of total
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#999] uppercase tracking-wider">Pipeline Value</p>
                      <p className="text-3xl font-light text-[#1A1A1A] mt-1">
                        {formatCurrency(stats?.crm.pipelineValue || 0)}
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        {stats?.crm.opportunities || 0} opportunities
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                      <Database size={20} className="text-[#1A1A1A]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#999] uppercase tracking-wider">AI Usage</p>
                      <p className="text-3xl font-light text-[#1A1A1A] mt-1">
                        {formatNumber(stats?.ai.totalTokensUsed || 0)}
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        {stats?.ai.successRate || 0}% success rate
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Zap size={20} className="text-purple-600" />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CRM Stats */}
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Database size={18} />
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
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm text-[#666]">{item.label}</span>
                    </div>
                    <span className="font-bold text-[#1A1A1A]">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* System Health */}
            <Card className="p-6">
              <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Server size={18} />
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
                  <span className="text-sm">
                    {stats?.system.lastBackup
                      ? new Date(stats.system.lastBackup).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <Activity size={18} />
                Recent Activity
              </h3>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-sm text-[#666] hover:text-[#1A1A1A] flex items-center gap-1"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))
              ) : logs.length === 0 ? (
                <p className="text-center text-[#666] py-4">No recent activity</p>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="USER">User</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] outline-none text-sm"
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <button
                  onClick={() => refetchUsers()}
                  className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-black transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F8F6]">
                  <tr>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[#999] uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[#999] uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[#999] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[#999] uppercase tracking-wider">Last Login</th>
                    <th className="text-left py-4 px-6 text-xs font-bold text-[#999] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="py-4 px-6">
                          <Skeleton className="h-12 rounded-xl" />
                        </td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#666]">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F8F8F6]/50">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={u.avatarUrl}
                              name={u.name || u.email}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-[#1A1A1A]">{u.name || 'No name'}</p>
                              <p className="text-xs text-[#666]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">{getRoleBadge(u.role)}</td>
                        <td className="py-4 px-6">{getStatusBadge(u.status)}</td>
                        <td className="py-4 px-6 text-sm text-[#666]">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => suspendUser(u.id)}
                                className="p-2 rounded-lg hover:bg-red-100 text-[#666] hover:text-red-600 transition-colors"
                                title="Suspend User"
                              >
                                <Ban size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => activateUser(u.id)}
                                className="p-2 rounded-lg hover:bg-green-100 text-[#666] hover:text-green-600 transition-colors"
                                title="Activate User"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => resetPassword(u.id)}
                              className="p-2 rounded-lg hover:bg-blue-100 text-[#666] hover:text-blue-600 transition-colors"
                              title="Reset Password"
                            >
                              <Key size={16} />
                            </button>
                            <button
                              className="p-2 rounded-lg hover:bg-gray-100 text-[#666] transition-colors"
                              title="More Options"
                            >
                              <MoreHorizontal size={16} />
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
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-[#666]">
                  Showing {users.length} of {totalUsers} users
                </p>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-[#F8F8F6] text-sm font-medium hover:bg-gray-200">
                    Previous
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-black">
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Feature Flags Tab */}
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
            ) : flags.length === 0 ? (
              <p className="text-center text-[#666] py-8">No feature flags configured</p>
            ) : (
              <div className="space-y-3">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        flag.enabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Zap size={20} className={flag.enabled ? 'text-green-600' : 'text-gray-400'} />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{flag.name}</p>
                        <p className="text-xs text-[#666]">{flag.description || flag.key}</p>
                        {flag.category && (
                          <Badge variant="outline" size="sm" className="mt-1">
                            {flag.category}
                          </Badge>
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

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Audit Logs</h3>
                <p className="text-sm text-[#666]">Track all administrative actions</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-[#F8F8F6] text-sm font-medium hover:bg-gray-200 flex items-center gap-2">
                  <Filter size={16} />
                  Filter
                </button>
              </div>
            </div>

            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-[#666] py-8">No audit logs found</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between p-4 bg-[#F8F8F6] rounded-xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mt-0.5">
                        <Clock size={18} className="text-[#666]" />
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
                    <div className="text-right">
                      <p className="text-xs text-[#999]">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-[#999]">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
