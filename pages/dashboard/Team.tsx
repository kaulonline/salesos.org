import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Mail,
  Phone,
  Shield,
  Crown,
  Star,
  TrendingUp,
  Target,
  Calendar,
  MapPin,
  ChevronRight,
  Settings,
  UserPlus,
  Filter,
  LayoutGrid,
  List,
  Award,
  Zap
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'viewer';
  title: string;
  department: string;
  location: string;
  phone: string;
  status: 'active' | 'away' | 'offline';
  performance: {
    quota: number;
    attainment: number;
    deals: number;
    pipeline: string;
  };
  joinedDate: string;
  lastActive: string;
  territories: string[];
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Valentina Rodriguez',
    email: 'valentina@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    role: 'admin',
    title: 'VP of Sales',
    department: 'Sales',
    location: 'San Francisco, CA',
    phone: '+1 (555) 123-4567',
    status: 'active',
    performance: { quota: 500000, attainment: 112, deals: 24, pipeline: '$1.2M' },
    joinedDate: 'Jan 2023',
    lastActive: 'Now',
    territories: ['West Coast', 'Enterprise']
  },
  {
    id: '2',
    name: 'Alex Chen',
    email: 'alex@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    role: 'manager',
    title: 'Sales Manager',
    department: 'Sales',
    location: 'New York, NY',
    phone: '+1 (555) 234-5678',
    status: 'active',
    performance: { quota: 400000, attainment: 98, deals: 18, pipeline: '$890K' },
    joinedDate: 'Mar 2023',
    lastActive: '5 min ago',
    territories: ['East Coast', 'Mid-Market']
  },
  {
    id: '3',
    name: 'Sarah Johnson',
    email: 'sarah@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    role: 'sales_rep',
    title: 'Senior Account Executive',
    department: 'Sales',
    location: 'Austin, TX',
    phone: '+1 (555) 345-6789',
    status: 'away',
    performance: { quota: 300000, attainment: 105, deals: 15, pipeline: '$650K' },
    joinedDate: 'Jun 2023',
    lastActive: '1 hour ago',
    territories: ['Central', 'SMB']
  },
  {
    id: '4',
    name: 'Marcus Williams',
    email: 'marcus@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    role: 'sales_rep',
    title: 'Account Executive',
    department: 'Sales',
    location: 'Chicago, IL',
    phone: '+1 (555) 456-7890',
    status: 'active',
    performance: { quota: 250000, attainment: 87, deals: 12, pipeline: '$420K' },
    joinedDate: 'Aug 2023',
    lastActive: '15 min ago',
    territories: ['Midwest']
  },
  {
    id: '5',
    name: 'Emma Davis',
    email: 'emma@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    role: 'sales_rep',
    title: 'SDR Team Lead',
    department: 'Sales Development',
    location: 'Seattle, WA',
    phone: '+1 (555) 567-8901',
    status: 'offline',
    performance: { quota: 200000, attainment: 124, deals: 28, pipeline: '$340K' },
    joinedDate: 'Sep 2023',
    lastActive: '2 hours ago',
    territories: ['Pacific Northwest', 'Inbound']
  },
  {
    id: '6',
    name: 'James Park',
    email: 'james@salesos.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    role: 'viewer',
    title: 'Sales Operations',
    department: 'RevOps',
    location: 'Denver, CO',
    phone: '+1 (555) 678-9012',
    status: 'active',
    performance: { quota: 0, attainment: 0, deals: 0, pipeline: '$0' },
    joinedDate: 'Oct 2023',
    lastActive: '30 min ago',
    territories: []
  }
];

const getRoleStyle = (role: TeamMember['role']) => {
  switch (role) {
    case 'admin': return { bg: 'bg-[#1A1A1A]', text: 'text-white', icon: Crown, label: 'Admin' };
    case 'manager': return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Shield, label: 'Manager' };
    case 'sales_rep': return { bg: 'bg-[#F8F8F6]', text: 'text-[#666]', icon: Star, label: 'Sales Rep' };
    case 'viewer': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Users, label: 'Viewer' };
  }
};

const getStatusStyle = (status: TeamMember['status']) => {
  switch (status) {
    case 'active': return 'bg-emerald-500';
    case 'away': return 'bg-amber-500';
    case 'offline': return 'bg-gray-400';
  }
};

export const Team: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredMembers = TEAM_MEMBERS.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPipeline = TEAM_MEMBERS.reduce((sum, m) => sum + parseInt(m.performance.pipeline.replace(/[$KM,]/g, '') || '0') * (m.performance.pipeline.includes('M') ? 1000 : 1), 0);
  const avgAttainment = Math.round(TEAM_MEMBERS.filter(m => m.performance.quota > 0).reduce((sum, m) => sum + m.performance.attainment, 0) / TEAM_MEMBERS.filter(m => m.performance.quota > 0).length);

  if (isLoading) {
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
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[#1A1A1A] rounded-xl font-medium hover:bg-gray-50 transition-colors">
            <Settings size={16} />
            Roles & Permissions
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
            <UserPlus size={18} />
            Invite Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
            <Users size={18} className="text-[#666]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{TEAM_MEMBERS.length}</div>
            <div className="text-xs text-[#666]">Team Members</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Target size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{avgAttainment}%</div>
            <div className="text-xs text-[#666]">Avg Attainment</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
            <TrendingUp size={18} className="text-[#EAD07D]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">${(totalPipeline / 1000).toFixed(1)}M</div>
            <div className="text-xs text-[#666]">Total Pipeline</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center">
            <Award size={18} className="text-[#1A1A1A]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#1A1A1A]">
              {TEAM_MEMBERS.filter(m => m.performance.attainment >= 100).length}
            </div>
            <div className="text-xs text-[#666]">At/Above Quota</div>
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
          {['all', 'admin', 'manager', 'sales_rep'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                roleFilter === role
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {role === 'all' ? 'All' : role === 'sales_rep' ? 'Sales Rep' : role}
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
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => {
            const roleStyle = getRoleStyle(member.role);
            const RoleIcon = roleStyle.icon;
            return (
              <Card
                key={member.id}
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar src={member.avatar} size="lg" />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ${getStatusStyle(member.status)} border-2 border-white`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">{member.name}</h3>
                      <p className="text-sm text-[#666]">{member.title}</p>
                    </div>
                  </div>
                  <Badge className={`${roleStyle.bg} ${roleStyle.text}`} size="sm">
                    <RoleIcon size={10} className="mr-1" />
                    {roleStyle.label}
                  </Badge>
                </div>

                {/* Contact */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-[#666]">
                    <Mail size={14} />
                    {member.email}
                  </div>
                  <div className="flex items-center gap-2 text-[#666]">
                    <MapPin size={14} />
                    {member.location}
                  </div>
                </div>

                {/* Performance */}
                {member.performance.quota > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#666]">Quota Attainment</span>
                      <span className={`text-sm font-bold ${member.performance.attainment >= 100 ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>
                        {member.performance.attainment}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${member.performance.attainment >= 100 ? 'bg-[#EAD07D]' : 'bg-[#1A1A1A]'}`}
                        style={{ width: `${Math.min(member.performance.attainment, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-[#666]">{member.performance.deals} deals</span>
                      <span className="font-bold text-[#1A1A1A]">{member.performance.pipeline} pipeline</span>
                    </div>
                  </div>
                )}

                {/* Territories */}
                {member.territories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {member.territories.map(territory => (
                      <span key={territory} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-[#666]">
                        {territory}
                      </span>
                    ))}
                  </div>
                )}
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
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Attainment</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Pipeline</th>
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
                          <Avatar src={member.avatar} size="md" />
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getStatusStyle(member.status)} border-2 border-white`} />
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{member.name}</div>
                          <div className="text-xs text-[#666]">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${roleStyle.bg} ${roleStyle.text}`} size="sm">{roleStyle.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      {member.performance.quota > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${member.performance.attainment >= 100 ? 'bg-[#EAD07D]' : 'bg-[#1A1A1A]'}`}
                              style={{ width: `${Math.min(member.performance.attainment, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${member.performance.attainment >= 100 ? 'text-[#1A1A1A]' : 'text-[#666]'}`}>
                            {member.performance.attainment}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#999]">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">{member.performance.pipeline}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${
                        member.status === 'active' ? 'text-[#1A1A1A]' : member.status === 'away' ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyle(member.status)}`} />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreHorizontal size={16} className="text-[#666]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Leaderboard Banner */}
      <Card className="mt-8 p-6 bg-gradient-to-r from-[#EAD07D]/10 to-[#EAD07D]/5 border-[#EAD07D]/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#EAD07D] flex items-center justify-center">
              <Award size={24} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1A1A1A]">This Month's Top Performer</h3>
              <p className="text-sm text-[#666]">Emma Davis is leading with 124% quota attainment!</p>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center gap-2">
            View Leaderboard <ChevronRight size={16} />
          </button>
        </div>
      </Card>
    </div>
  );
};
