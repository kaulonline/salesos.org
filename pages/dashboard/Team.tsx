import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  Crown,
  Star,
  TrendingUp,
  Target,
  MapPin,
  ChevronRight,
  Settings,
  UserPlus,
  LayoutGrid,
  List,
  Award,
  Ban,
  CheckCircle,
  Key,
  Download,
  X,
  Loader2,
  RefreshCw,
  LogIn,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminUsers } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { adminApi } from '../../src/api/admin';
import type { AdminUser } from '../../src/api/admin';

const getRoleStyle = (role: string) => {
  switch (role) {
    case 'ADMIN': return { bg: 'bg-[#1A1A1A]', text: 'text-white', icon: Crown, label: 'Admin' };
    case 'MANAGER': return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Shield, label: 'Manager' };
    case 'USER': return { bg: 'bg-[#F8F8F6]', text: 'text-[#666]', icon: Star, label: 'User' };
    case 'VIEWER': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Users, label: 'Viewer' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Users, label: role };
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-[#93C01F]';
    case 'PENDING': return 'bg-[#EAD07D]';
    case 'SUSPENDED': return 'bg-[#666]';
    case 'INACTIVE': return 'bg-[#999]';
    default: return 'bg-[#999]';
  }
};

export const Team: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'USER', message: '' });
  const [isInviting, setIsInviting] = useState(false);

  // SSO sync state
  const [ssoSyncing, setSSOSyncing] = useState<string | null>(null);
  const [ssoResult, setSSOResult] = useState<{ provider: string; imported: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [ssoConnected, setSSOConnected] = useState<{ okta: boolean; auth0: boolean }>({ okta: false, auth0: false });

  const {
    users,
    total,
    loading,
    suspendUser,
    activateUser,
    resetPassword,
    refetch,
  } = useAdminUsers({ search: searchQuery, role: roleFilter === 'all' ? undefined : roleFilter });

  const isAdmin = currentUser?.role === 'ADMIN';

  // Check SSO provider connectivity on mount
  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      adminApi.getSSOUsers('okta').then(r => r.connected).catch(() => false),
      adminApi.getSSOUsers('auth0').then(r => r.connected).catch(() => false),
    ]).then(([okta, auth0]) => setSSOConnected({ okta, auth0 }));
  }, [isAdmin]);

  const handleSSOSync = async (provider: 'okta' | 'auth0') => {
    setSSOSyncing(provider);
    setSSOResult(null);
    try {
      const result = await adminApi.syncUsersFromSSO(provider);
      setSSOResult({ provider, ...result });
      refetch();
    } catch (err) {
      console.error('SSO sync failed:', err);
      setSSOResult({ provider, imported: 0, updated: 0, skipped: 0, errors: ['Sync failed. Check integration settings.'] });
    } finally {
      setSSOSyncing(null);
    }
  };

  // Filter users based on search and role
  const filteredMembers = users.filter(member => {
    const matchesSearch = !searchQuery ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate stats
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const totalStats = users.reduce((acc, u) => ({
    leads: acc.leads + (u.stats?.leadsCount || 0),
    opportunities: acc.opportunities + (u.stats?.opportunitiesCount || 0),
    conversations: acc.conversations + (u.stats?.conversationsCount || 0),
  }), { leads: 0, opportunities: 0, conversations: 0 });

  const handleAction = async (action: string, userId: string) => {
    setShowActionMenu(null);
    try {
      switch (action) {
        case 'suspend':
          await suspendUser(userId);
          break;
        case 'activate':
          await activateUser(userId);
          break;
        case 'resetPassword':
          await resetPassword(userId);
          break;
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setIsInviting(true);
    try {
      // Simulate API call - in production, this would call an invite API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'USER', message: '' });
      refetch();
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleExportTeam = () => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Leads', 'Opportunities', 'Last Login'];
    const rows = users.map(user => [
      user.name || 'N/A',
      user.email,
      user.role,
      user.status,
      (user.stats?.leadsCount || 0).toString(),
      (user.stats?.opportunitiesCount || 0).toString(),
      user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `team_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[#EAD07D]">
              <Users size={20} />
            </div>
            <h1 className="text-3xl font-medium text-[#1A1A1A]">Team</h1>
          </div>
          <p className="text-[#666]">Manage your sales team and track performance</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportTeam}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
          {isAdmin && (
            <>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-50 transition-colors">
                <Settings size={16} />
                Roles & Permissions
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg"
              >
                <UserPlus size={18} />
                Invite Member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <Users size={18} className="text-[#666]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{total}</div>
            <div className="text-xs text-[#666]">Team Members</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Target size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{activeUsers}</div>
            <div className="text-xs text-[#666]">Active Users</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <TrendingUp size={18} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{totalStats.opportunities}</div>
            <div className="text-xs text-[#666]">Total Opportunities</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center">
            <Award size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{totalStats.leads}</div>
            <div className="text-xs text-[#666]">Total Leads</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'ADMIN', 'MANAGER', 'USER'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                roleFilter === role
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {role === 'all' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
          >
            <LayoutGrid size={18} className={view === 'grid' ? 'text-[#1A1A1A]' : 'text-[#666]'} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
          >
            <List size={18} className={view === 'list' ? 'text-[#1A1A1A]' : 'text-[#666]'} />
          </button>
        </div>
      </div>

      {/* Team Grid */}
      {filteredMembers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users size={48} className="mx-auto text-[#999] mb-4" />
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No team members found</h3>
          <p className="text-[#666]">
            {searchQuery ? 'Try adjusting your search criteria' : 'No users match the selected filter'}
          </p>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => {
            const roleStyle = getRoleStyle(member.role);
            const RoleIcon = roleStyle.icon;
            return (
              <Card
                key={member.id}
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar src={member.avatarUrl} name={member.name || member.email} size="lg" />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ${getStatusStyle(member.status)} border-2 border-white`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">
                        {member.name || 'No name'}
                      </h3>
                      <p className="text-sm text-[#666]">{member.jobTitle || 'Team Member'}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Badge className={`${roleStyle.bg} ${roleStyle.text}`} size="sm">
                      <RoleIcon size={10} className="mr-1" />
                      {roleStyle.label}
                    </Badge>
                    {isAdmin && member.id !== currentUser?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === member.id ? null : member.id);
                        }}
                        className="absolute -top-1 -right-1 p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal size={14} className="text-[#666]" />
                      </button>
                    )}
                    {showActionMenu === member.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowActionMenu(null)} />
                        <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                          {member.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleAction('suspend', member.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#666] hover:bg-[#F8F8F6]"
                            >
                              <Ban size={14} />
                              Suspend User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction('activate', member.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#93C01F] hover:bg-[#93C01F]/10"
                            >
                              <CheckCircle size={14} />
                              Activate User
                            </button>
                          )}
                          <button
                            onClick={() => handleAction('resetPassword', member.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#666] hover:bg-gray-50"
                          >
                            <Key size={14} />
                            Reset Password
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-[#666]">
                    <Mail size={14} />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.location && (
                    <div className="flex items-center gap-2 text-[#666]">
                      <MapPin size={14} />
                      {member.location}
                    </div>
                  )}
                </div>

                {/* Stats */}
                {member.stats && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-[#1A1A1A]">{member.stats.leadsCount}</div>
                        <div className="text-[10px] text-[#666]">Leads</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-[#1A1A1A]">{member.stats.opportunitiesCount}</div>
                        <div className="text-[10px] text-[#666]">Opportunities</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-[#1A1A1A]">{member.stats.conversationsCount}</div>
                        <div className="text-[10px] text-[#666]">Chats</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                <div className="mt-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusStyle(member.status)}`} />
                  <span className="text-xs text-[#666] capitalize">{member.status.toLowerCase()}</span>
                  {member.lastLoginAt && (
                    <span className="text-xs text-[#999] ml-auto">
                      Last seen {new Date(member.lastLoginAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#FAFAF8] border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Leads</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Opportunities</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const roleStyle = getRoleStyle(member.role);
                return (
                  <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar src={member.avatarUrl} name={member.name || member.email} size="md" />
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getStatusStyle(member.status)} border-2 border-white`} />
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{member.name || 'No name'}</div>
                          <div className="text-xs text-[#666]">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${roleStyle.bg} ${roleStyle.text}`} size="sm">{roleStyle.label}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">
                      {member.stats?.leadsCount || 0}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">
                      {member.stats?.opportunitiesCount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${
                        member.status === 'ACTIVE' ? 'text-[#1A1A1A]' :
                        member.status === 'PENDING' ? 'text-[#1A1A1A]' :
                        member.status === 'SUSPENDED' ? 'text-[#666]' : 'text-[#999]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(member.status)}`} />
                        {member.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && member.id !== currentUser?.id && (
                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                          <MoreHorizontal size={16} className="text-[#666]" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {/* SSO Sync Section */}
      {isAdmin && (ssoConnected.okta || ssoConnected.auth0) && (
        <Card className="mt-8 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <LogIn size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A]">SSO User Provisioning</h3>
              <p className="text-sm text-[#666]">Sync team members from your identity provider</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {ssoConnected.okta && (
              <button
                onClick={() => handleSSOSync('okta')}
                disabled={ssoSyncing !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#F8F8F6] rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#EAD07D]/20 transition-colors disabled:opacity-50"
              >
                {ssoSyncing === 'okta' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Sync from Okta
              </button>
            )}
            {ssoConnected.auth0 && (
              <button
                onClick={() => handleSSOSync('auth0')}
                disabled={ssoSyncing !== null}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#F8F8F6] rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#EAD07D]/20 transition-colors disabled:opacity-50"
              >
                {ssoSyncing === 'auth0' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Sync from Auth0
              </button>
            )}
          </div>
          {ssoResult && (
            <div className="mt-4 p-4 bg-[#F8F8F6] rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-[#93C01F]" />
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {ssoResult.provider === 'okta' ? 'Okta' : 'Auth0'} Sync Complete
                </span>
              </div>
              <div className="flex gap-4 text-sm text-[#666]">
                <span><strong className="text-[#1A1A1A]">{ssoResult.imported}</strong> imported</span>
                <span><strong className="text-[#1A1A1A]">{ssoResult.updated}</strong> updated</span>
                <span><strong className="text-[#1A1A1A]">{ssoResult.skipped}</strong> skipped</span>
              </div>
              {ssoResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  {ssoResult.errors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Top Performer Banner */}
      {users.length > 0 && (
        <Card className="mt-8 p-6 bg-gradient-to-r from-[#EAD07D]/10 to-[#EAD07D]/5 border-[#EAD07D]/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAD07D] flex items-center justify-center">
                <Award size={24} className="text-[#1A1A1A]" />
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A]">Team Performance</h3>
                <p className="text-sm text-[#666]">
                  Your team has {totalStats.leads} leads and {totalStats.opportunities} active opportunities
                </p>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center gap-2">
              View Analytics <ChevronRight size={16} />
            </button>
          </div>
        </Card>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <UserPlus size={18} className="text-[#1A1A1A]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1A1A1A]">Invite Team Member</h2>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Personal Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Add a personal message to the invitation..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium hover:bg-[#F0EBD8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteForm.email || isInviting}
                  className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
