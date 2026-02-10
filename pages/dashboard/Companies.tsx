import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight,
  ExternalLink,
  Heart,
  AlertTriangle,
  LayoutGrid,
  List,
  DollarSign,
  X,
  AlertCircle,
  Edit2,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useCompanies } from '../../src/hooks/useCompanies';
import { VirtualList } from '../../src/components/VirtualList';
import type { Account, CreateAccountDto, UpdateAccountDto, AccountType } from '../../src/types';

const getHealthColor = (score?: number) => {
  if (!score) return { bg: 'bg-gray-100', text: 'text-[#666]', fill: 'bg-gray-300' };
  if (score >= 80) return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', fill: 'bg-[#EAD07D]' };
  if (score >= 60) return { bg: 'bg-[#EAD07D]/30', text: 'text-[#1A1A1A]', fill: 'bg-[#EAD07D]' };
  return { bg: 'bg-gray-200', text: 'text-[#666]', fill: 'bg-[#999]' };
};

const getTypeStyle = (type?: AccountType) => {
  switch (type) {
    case 'CUSTOMER': return 'bg-[#EAD07D]/20 text-[#1A1A1A]';
    case 'PROSPECT': return 'bg-[#F8F8F6] text-[#666]';
    case 'PARTNER': return 'bg-[#1A1A1A] text-white';
    case 'RESELLER': return 'bg-[#1A1A1A]/10 text-[#1A1A1A]';
    case 'COMPETITOR': return 'bg-[#666]/20 text-[#666]';
    default: return 'bg-gray-100 text-gray-700';
  }
};

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateAccountDto) => Promise<void>;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAccountDto>({
    name: '',
    type: 'PROSPECT',
    website: '',
    industry: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Account name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
      setFormData({ name: '', type: 'PROSPECT', website: '', industry: '', phone: '' });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Account</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Account Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="Acme Corporation"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              >
                <option value="PROSPECT">Prospect</option>
                <option value="CUSTOMER">Customer</option>
                <option value="PARTNER">Partner</option>
                <option value="RESELLER">Reseller</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Industry</label>
              <input
                type="text"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="Technology"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Website</label>
            <input
              type="text"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="www.acme.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Phone</label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button
              variant="secondary"
              className="flex-1 py-3 rounded-xl"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Company Modal
interface EditCompanyModalProps {
  isOpen: boolean;
  company: Account | null;
  onClose: () => void;
  onUpdate: (id: string, data: UpdateAccountDto) => Promise<Account | void>;
  isUpdating: boolean;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ isOpen, company, onClose, onUpdate, isUpdating }) => {
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateAccountDto>({
    name: '',
    type: 'PROSPECT',
    website: '',
    industry: '',
    phone: '',
    numberOfEmployees: undefined,
    annualRevenue: undefined,
    description: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        type: company.type || 'PROSPECT',
        website: company.website || '',
        industry: company.industry || '',
        phone: company.phone || '',
        numberOfEmployees: company.numberOfEmployees,
        annualRevenue: company.annualRevenue,
        description: company.description || '',
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !formData.name) {
      setError('Account name is required');
      return;
    }
    setError(null);
    try {
      await onUpdate(company.id, formData);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update account');
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">Edit Account</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Account Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="Acme Corporation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Type</label>
                <select
                  value={formData.type || 'PROSPECT'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                >
                  <option value="PROSPECT">Prospect</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="PARTNER">Partner</option>
                  <option value="RESELLER">Reseller</option>
                  <option value="COMPETITOR">Competitor</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Industry</label>
                <input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  placeholder="Technology"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Website</label>
              <input
                type="text"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="www.acme.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="+1 555 123 4567"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Employees</label>
                <input
                  type="number"
                  value={formData.numberOfEmployees || ''}
                  onChange={(e) => setFormData({ ...formData, numberOfEmployees: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Annual Revenue</label>
                <input
                  type="number"
                  value={formData.annualRevenue || ''}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: parseFloat(e.target.value) || undefined })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  placeholder="1000000"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
                placeholder="About the company..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-[#666] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-1 px-4 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (amount?: number, compact = true) => {
  if (!amount) return '$0';
  if (compact && Math.abs(amount) >= 1000) {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1e12) {
      return `$${(amount / 1e12).toFixed(1)}T`;
    } else if (absAmount >= 1e9) {
      return `$${(amount / 1e9).toFixed(1)}B`;
    } else if (absAmount >= 1e6) {
      return `$${(amount / 1e6).toFixed(1)}M`;
    } else if (absAmount >= 1e3) {
      return `$${(amount / 1e3).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export const Companies: React.FC = () => {
  const { companies, stats, loading, error, refetch, fetchStats, create, update, isUpdating } = useCompanies();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Account | null>(null);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (company.domain || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || company.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalCustomers = companies.filter(c => c.type === 'CUSTOMER').length;
  const totalRevenue = companies.reduce((sum, c) => sum + (c.annualRevenue || 0), 0);
  const avgHealth = companies.length > 0
    ? Math.round(companies.reduce((sum, c) => sum + (c.healthScore || 0), 0) / companies.length)
    : 0;
  const atRiskCount = companies.filter(c => (c.healthScore || 100) < 60).length;

  const handleCreateCompany = async (data: CreateAccountDto) => {
    await create(data);
    await fetchStats();
  };

  if (loading && companies.length === 0) {
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
          <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">Accounts</h1>
          <p className="text-[#666]">Manage accounts and track customer health</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg"
        >
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => refetch()} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

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
              <div className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(totalRevenue)}</div>
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
        <Card className="p-4 bg-[#EAD07D]/10 border-[#EAD07D]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/30 flex items-center justify-center">
              <AlertTriangle size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{atRiskCount}</div>
              <div className="text-xs text-[#666]">At Risk</div>
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
          {['all', 'CUSTOMER', 'PROSPECT', 'PARTNER'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                typeFilter === type
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-gray-200 text-[#666] hover:bg-gray-50'
              }`}
            >
              {type === 'all' ? 'All' : type.toLowerCase()}
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
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-20 text-[#666]">
          {searchQuery ? `No accounts found matching "${searchQuery}"` : 'No accounts yet. Add your first account!'}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => {
            const healthColors = getHealthColor(company.healthScore);
            return (
              <Link key={company.id} to={`/dashboard/companies/${company.id}`} className="block">
              <Card
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                      <Building2 size={20} className="text-[#666]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">{company.name}</h3>
                      {company.website && (
                        <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#666] hover:text-[#1A1A1A] flex items-center gap-1">
                          {company.domain || company.website} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingCompany(company);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#F8F8F6] text-[#666] hover:text-[#1A1A1A] transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit Account"
                    >
                      <Edit2 size={14} />
                    </button>
                    <Badge className={getTypeStyle(company.type)} size="sm">
                      {company.type?.toLowerCase() || 'prospect'}
                    </Badge>
                  </div>
                </div>

                {/* Health Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#666]">Health Score</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${healthColors.text}`}>{company.healthScore || 0}%</span>
                      {company.churnRisk === 'LOW' && <TrendingUp size={14} className="text-[#1A1A1A]" />}
                      {company.churnRisk === 'HIGH' && <TrendingDown size={14} className="text-[#999]" />}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${healthColors.fill} rounded-full transition-all`} style={{ width: `${company.healthScore || 0}%` }} />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-y border-gray-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{company.industry || '-'}</div>
                    <div className="text-[10px] text-[#999] uppercase">Industry</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{company.numberOfEmployees || '-'}</div>
                    <div className="text-[10px] text-[#999] uppercase">Employees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1A1A1A]">{formatCurrency(company.lifetimeValue)}</div>
                    <div className="text-[10px] text-[#999] uppercase">LTV</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={`https://ui-avatars.com/api/?name=${company.name}&background=random`}
                      size="sm"
                    />
                    <span className="text-xs text-[#666]">Owner</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#999]">
                    <Calendar size={12} />
                    {company.lastActivityDate
                      ? new Date(company.lastActivityDate).toLocaleDateString()
                      : 'No activity'}
                  </div>
                </div>
              </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 bg-[#FAFAF8] border-b border-gray-100 px-6 py-4 min-w-[800px]">
            <div className="col-span-3 text-xs font-bold text-[#999] uppercase tracking-wider">Account</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Type</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Health</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Revenue</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Industry</div>
            <div className="col-span-1"></div>
          </div>
          {/* Virtualized Table Body */}
          <VirtualList
            items={filteredCompanies}
            itemHeight={72}
            keyExtractor={(company) => company.id}
            className="max-h-[calc(100vh-400px)]"
            emptyMessage={searchQuery ? `No accounts found matching "${searchQuery}"` : 'No accounts yet. Add your first account!'}
            renderItem={(company) => {
              const healthColors = getHealthColor(company.healthScore);
              return (
                <Link to={`/dashboard/companies/${company.id}`} className="block">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors items-center min-w-[800px]">
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      <Building2 size={18} className="text-[#666]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#1A1A1A]">{company.name}</div>
                      <div className="text-xs text-[#666]">{company.domain || company.website || '-'}</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Badge className={getTypeStyle(company.type)} size="sm">
                      {company.type?.toLowerCase() || 'prospect'}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${healthColors.fill} rounded-full`} style={{ width: `${company.healthScore || 0}%` }} />
                    </div>
                    <span className={`text-sm font-medium ${healthColors.text}`}>{company.healthScore || 0}%</span>
                  </div>
                  <div className="col-span-2 font-medium text-[#1A1A1A]">{formatCurrency(company.annualRevenue)}</div>
                  <div className="col-span-2 text-sm text-[#666]">{company.industry || '-'}</div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingCompany(company);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit Account"
                    >
                      <Edit2 size={16} className="text-[#666]" />
                    </button>
                    <ChevronRight size={16} className="text-[#666]" />
                  </div>
                </div>
                </Link>
              );
            }}
          />
          </div>
        </Card>
      )}

      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCompany}
      />

      <EditCompanyModal
        isOpen={!!editingCompany}
        company={editingCompany}
        onClose={() => setEditingCompany(null)}
        onUpdate={update}
        isUpdating={isUpdating}
      />
    </div>
  );
};
