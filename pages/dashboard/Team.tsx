import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminUsers } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
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
        <div className="flex gap-3">
          {isAdmin && (
            <>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-50 transition-colors">
                <Settings size={16} />
                Roles & Permissions
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
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
        <div className="flex gap-2">
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
          <table className="w-full">
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
    </div>
  );
};
