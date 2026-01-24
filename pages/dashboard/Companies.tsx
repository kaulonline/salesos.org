import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  Calendar,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Target,
  Heart,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  LayoutGrid,
  List
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';

interface Company {
  id: string;
  name: string;
  logo?: string;
  domain: string;
  industry: string;
  size: string;
  revenue: string;
  location: string;
  healthScore: number;
  healthTrend: 'up' | 'down' | 'stable';
  stage: 'prospect' | 'customer' | 'churned' | 'partner';
  openDeals: number;
  totalRevenue: string;
  contacts: number;
  lastActivity: string;
  owner: { name: string; avatar: string };
  tags: string[];
}

const COMPANIES: Company[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    logo: 'https://logo.clearbit.com/acme.com',
    domain: 'acme.com',
    industry: 'Technology',
    size: '1,000-5,000',
    revenue: '$50M-100M',
    location: 'San Francisco, CA',
    healthScore: 92,
    healthTrend: 'up',
    stage: 'customer',
    openDeals: 2,
    totalRevenue: '$245,000',
    contacts: 8,
    lastActivity: '2 hours ago',
    owner: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    tags: ['Enterprise', 'Tech', 'Expansion']
  },
  {
    id: '2',
    name: 'GlobalBank International',
    logo: 'https://logo.clearbit.com/globalbank.com',
    domain: 'globalbank.com',
    industry: 'Financial Services',
    size: '10,000+',
    revenue: '$1B+',
    location: 'London, UK',
    healthScore: 78,
    healthTrend: 'stable',
    stage: 'prospect',
    openDeals: 1,
    totalRevenue: '$0',
    contacts: 4,
    lastActivity: '1 day ago',
    owner: { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    tags: ['Enterprise', 'Banking', 'High Value']
  },
  {
    id: '3',
    name: 'Vertex Technologies',
    logo: 'https://logo.clearbit.com/vertex.com',
    domain: 'vertex.com',
    industry: 'SaaS',
    size: '500-1,000',
    revenue: '$25M-50M',
    location: 'Austin, TX',
    healthScore: 85,
    healthTrend: 'up',
    stage: 'customer',
    openDeals: 1,
    totalRevenue: '$89,000',
    contacts: 5,
    lastActivity: '4 hours ago',
    owner: { name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    tags: ['Mid-Market', 'SaaS', 'Upsell']
  },
  {
    id: '4',
    name: 'Nebula Industries',
    logo: 'https://logo.clearbit.com/nebula.io',
    domain: 'nebula.io',
    industry: 'Manufacturing',
    size: '5,000-10,000',
    revenue: '$100M-500M',
    location: 'Detroit, MI',
    healthScore: 45,
    healthTrend: 'down',
    stage: 'customer',
    openDeals: 0,
    totalRevenue: '$156,000',
    contacts: 3,
    lastActivity: '2 weeks ago',
    owner: { name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
    tags: ['Enterprise', 'At Risk']
  },
  {
    id: '5',
    name: 'TechFlow Solutions',
    logo: 'https://logo.clearbit.com/techflow.com',
    domain: 'techflow.com',
    industry: 'Technology',
    size: '100-500',
    revenue: '$10M-25M',
    location: 'Seattle, WA',
    healthScore: 88,
    healthTrend: 'up',
    stage: 'prospect',
    openDeals: 1,
    totalRevenue: '$0',
    contacts: 2,
    lastActivity: '6 hours ago',
    owner: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    tags: ['SMB', 'Hot Lead']
  },
  {
    id: '6',
    name: 'Sisyphus Corp',
    logo: 'https://logo.clearbit.com/sisyphus.com',
    domain: 'sisyphus.com',
    industry: 'Logistics',
    size: '1,000-5,000',
    revenue: '$50M-100M',
    location: 'Chicago, IL',
    healthScore: 72,
    healthTrend: 'stable',
    stage: 'partner',
    openDeals: 0,
    totalRevenue: '$320,000',
    contacts: 6,
    lastActivity: '3 days ago',
    owner: { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    tags: ['Partner', 'Referral']
  }
];

const getHealthColor = (score: number) => {
  if (score >= 80) return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', fill: 'bg-[#EAD07D]' };
  if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-600', fill: 'bg-amber-500' };
  return { bg: 'bg-gray-200', text: 'text-[#666]', fill: 'bg-[#999]' };
};

const getStageStyle = (stage: Company['stage']) => {
  switch (stage) {
    case 'customer': return 'bg-[#EAD07D]/20 text-[#1A1A1A]';
    case 'prospect': return 'bg-[#F8F8F6] text-[#666]';
    case 'churned': return 'bg-gray-200 text-[#666]';
    case 'partner': return 'bg-[#1A1A1A] text-white';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const Companies: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredCompanies = COMPANIES.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || company.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const totalCustomers = COMPANIES.filter(c => c.stage === 'customer').length;
  const totalRevenue = COMPANIES.reduce((sum, c) => sum + parseInt(c.totalRevenue.replace(/[$,]/g, '') || '0'), 0);
  const avgHealth = Math.round(COMPANIES.reduce((sum, c) => sum + c.healthScore, 0) / COMPANIES.length);
  const atRiskCount = COMPANIES.filter(c => c.healthScore < 60).length;

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
          <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">Companies</h1>
          <p className="text-[#666]">Manage accounts and track customer health</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg">
          <Plus size={18} />
          Add Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Building2 size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{totalCustomers}</div>
              <div className="text-xs text-[#666]">Active Customers</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <DollarSign size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">${(totalRevenue / 1000).toFixed(0)}K</div>
              <div className="text-xs text-[#666]">Total Revenue</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <Heart size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{avgHealth}%</div>
              <div className="text-xs text-[#666]">Avg Health Score</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-50/50 border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{atRiskCount}</div>
              <div className="text-xs text-amber-600/70">At Risk</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'customer', 'prospect', 'partner'].map(stage => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                stageFilter === stage
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {stage === 'all' ? 'All' : stage}
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

      {/* Companies Grid/List */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => {
            const healthColors = getHealthColor(company.healthScore);
            return (
              <Card
                key={company.id}
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                      {company.logo ? (
                        <img src={company.logo} alt={company.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <Building2 size={20} className="text-[#666]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">{company.name}</h3>
                      <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#666] hover:text-[#1A1A1A] flex items-center gap-1">
                        {company.domain} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <Badge className={getStageStyle(company.stage)} size="sm">
                    {company.stage}
                  </Badge>
                </div>

                {/* Health Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#666]">Health Score</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${healthColors.text}`}>{company.healthScore}%</span>
                      {company.healthTrend === 'up' && <TrendingUp size={14} className="text-[#1A1A1A]" />}
                      {company.healthTrend === 'down' && <TrendingDown size={14} className="text-[#999]" />}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${healthColors.fill} rounded-full transition-all`} style={{ width: `${company.healthScore}%` }} />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-y border-gray-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{company.openDeals}</div>
                    <div className="text-[10px] text-[#999] uppercase">Open Deals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{company.contacts}</div>
                    <div className="text-[10px] text-[#999] uppercase">Contacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{company.totalRevenue}</div>
                    <div className="text-[10px] text-[#999] uppercase">Revenue</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={company.owner.avatar} size="sm" />
                    <span className="text-xs text-[#666]">{company.owner.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#999]">
                    <Calendar size={12} />
                    {company.lastActivity}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-4">
                  {company.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-[#666]">
                      {tag}
                    </span>
                  ))}
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
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Stage</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Health</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Revenue</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Owner</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-[#999] uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company, index) => {
                const healthColors = getHealthColor(company.healthScore);
                return (
                  <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          <Building2 size={18} className="text-[#666]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{company.name}</div>
                          <div className="text-xs text-[#666]">{company.industry}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStageStyle(company.stage)} size="sm">{company.stage}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${healthColors.fill} rounded-full`} style={{ width: `${company.healthScore}%` }} />
                        </div>
                        <span className={`text-sm font-medium ${healthColors.text}`}>{company.healthScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">{company.totalRevenue}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar src={company.owner.avatar} size="sm" />
                        <span className="text-sm text-[#666]">{company.owner.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#666]">{company.lastActivity}</td>
                    <td className="px-6 py-4">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <ChevronRight size={16} className="text-[#666]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
