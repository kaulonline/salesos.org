import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  X,
  Filter,
  Search,
  Megaphone,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
  ChevronRight,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Mail,
  Globe,
  Presentation,
  Share2,
  FileText,
  Loader2,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useCampaigns, useCampaign } from '../../src/hooks/useCampaigns';
import type { Campaign, CreateCampaignDto, CampaignStatus, CampaignType } from '../../src/types';

// Campaign type icons
const TYPE_ICONS: Record<CampaignType, React.ReactNode> = {
  EMAIL: <Mail size={16} />,
  WEBINAR: <Presentation size={16} />,
  CONFERENCE: <Users size={16} />,
  TRADE_SHOW: <Target size={16} />,
  ADVERTISEMENT: <Megaphone size={16} />,
  DIRECT_MAIL: <FileText size={16} />,
  REFERRAL_PROGRAM: <Share2 size={16} />,
  SOCIAL_MEDIA: <Globe size={16} />,
  CONTENT_MARKETING: <FileText size={16} />,
  SEO: <Search size={16} />,
  PPC: <Target size={16} />,
  PARTNER: <Users size={16} />,
  OTHER: <Zap size={16} />,
};

// Status badge variants
const STATUS_CONFIG: Record<CampaignStatus, { variant: 'green' | 'yellow' | 'neutral' | 'blue' | 'red'; icon: React.ReactNode }> = {
  PLANNED: { variant: 'blue', icon: <Calendar size={12} /> },
  IN_PROGRESS: { variant: 'green', icon: <Play size={12} /> },
  COMPLETED: { variant: 'neutral', icon: <CheckCircle2 size={12} /> },
  ABORTED: { variant: 'red', icon: <XCircle size={12} /> },
  PAUSED: { variant: 'yellow', icon: <Pause size={12} /> },
};

const CAMPAIGN_TYPES: { id: CampaignType; label: string }[] = [
  { id: 'EMAIL', label: 'Email' },
  { id: 'WEBINAR', label: 'Webinar' },
  { id: 'SOCIAL_MEDIA', label: 'Social Media' },
  { id: 'CONTENT_MARKETING', label: 'Content' },
  { id: 'PPC', label: 'PPC' },
  { id: 'SEO', label: 'SEO' },
  { id: 'TRADE_SHOW', label: 'Trade Show' },
  { id: 'CONFERENCE', label: 'Conference' },
  { id: 'ADVERTISEMENT', label: 'Advertisement' },
  { id: 'DIRECT_MAIL', label: 'Direct Mail' },
  { id: 'REFERRAL_PROGRAM', label: 'Referral' },
  { id: 'PARTNER', label: 'Partner' },
  { id: 'OTHER', label: 'Other' },
];

const CAMPAIGN_STATUSES: { id: CampaignStatus; label: string }[] = [
  { id: 'PLANNED', label: 'Planned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'PAUSED', label: 'Paused' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'ABORTED', label: 'Aborted' },
];

// Format currency
const formatCurrency = (value?: number) => {
  if (!value) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

// Format date
const formatDate = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Get type label
const getTypeLabel = (type: CampaignType) => {
  return CAMPAIGN_TYPES.find(t => t.id === type)?.label || type;
};

// Get status label
const getStatusLabel = (status: CampaignStatus) => {
  return CAMPAIGN_STATUSES.find(s => s.id === status)?.label || status;
};

// Create Campaign Modal
interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCampaignDto) => Promise<void>;
}

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCampaignDto>({
    name: '',
    type: 'EMAIL',
    status: 'PLANNED',
    description: '',
    startDate: '',
    endDate: '',
    budgetedCost: undefined,
    expectedRevenue: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Campaign name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
      setFormData({
        name: '',
        type: 'EMAIL',
        status: 'PLANNED',
        description: '',
        startDate: '',
        endDate: '',
        budgetedCost: undefined,
        expectedRevenue: undefined,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-lg animate-in fade-in zoom-in duration-200 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-8 pb-0 shrink-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Campaign</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:text-[#1A1A1A] hover:bg-[#F2F1EA] transition-colors">
            <X size={20} />
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
            <label className="text-xs font-medium text-[#666] mb-1 block">Campaign Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
              placeholder="Q1 Product Launch"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CampaignStatus })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all resize-none"
              rows={3}
              placeholder="Campaign objectives and details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Start Date</label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">End Date</label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Budget</label>
              <input
                type="number"
                value={formData.budgetedCost || ''}
                onChange={(e) => setFormData({ ...formData, budgetedCost: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Expected Revenue</label>
              <input
                type="number"
                value={formData.expectedRevenue || ''}
                onChange={(e) => setFormData({ ...formData, expectedRevenue: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-2 border-transparent focus:border-[#EAD07D] focus:bg-white outline-none transition-all"
                placeholder="50000"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-black/10 text-[#666] font-medium hover:bg-[#F8F8F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white font-medium hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Campaign
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Campaign Detail Panel
interface CampaignDetailPanelProps {
  campaign: Campaign;
  onClose: () => void;
}

const CampaignDetailPanel: React.FC<CampaignDetailPanelProps> = ({ campaign, onClose }) => {
  const { performance, performanceLoading } = useCampaign(campaign.id);

  const roi = campaign.actualCost && campaign.amountWonOpportunities
    ? ((campaign.amountWonOpportunities - campaign.actualCost) / campaign.actualCost * 100)
    : campaign.roi;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
        {/* Header with frost effect */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-black/5 p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center text-[#1A1A1A]">
                  {TYPE_ICONS[campaign.type]}
                </div>
                <Badge variant={STATUS_CONFIG[campaign.status].variant} size="sm">
                  {getStatusLabel(campaign.status)}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold text-[#1A1A1A]">{campaign.name}</h2>
              <p className="text-sm text-[#666]">{getTypeLabel(campaign.type)} Campaign</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F8F8F6] flex items-center justify-center text-[#666] hover:text-[#1A1A1A] hover:bg-[#F2F1EA] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="yellow" padding="md" className="text-center">
              <div className="text-3xl font-light text-[#1A1A1A] mb-1">
                {campaign.numberOfLeads || 0}
              </div>
              <div className="text-xs font-medium text-[#1A1A1A]/60 uppercase tracking-wide">Leads</div>
            </Card>
            <Card variant="dark" padding="md" className="text-center">
              <div className="text-3xl font-light text-white mb-1">
                {campaign.numberOfOpportunities || 0}
              </div>
              <div className="text-xs font-medium text-white/60 uppercase tracking-wide">Opportunities</div>
            </Card>
            <Card padding="md" className="text-center border border-black/5">
              <div className="text-3xl font-light text-[#1A1A1A] mb-1">
                {formatCurrency(campaign.amountWonOpportunities)}
              </div>
              <div className="text-xs font-medium text-[#666] uppercase tracking-wide">Revenue</div>
            </Card>
            <Card padding="md" className="text-center border border-black/5">
              <div className={`text-3xl font-light mb-1 ${roi && roi > 0 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>
                {roi ? `${roi.toFixed(0)}%` : '-'}
              </div>
              <div className="text-xs font-medium text-[#666] uppercase tracking-wide">ROI</div>
            </Card>
          </div>

          {/* Budget Progress */}
          <Card padding="md" className="border border-black/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-[#1A1A1A]">Budget Utilization</span>
              <span className="text-sm text-[#666]">
                {formatCurrency(campaign.actualCost)} / {formatCurrency(campaign.budgetedCost)}
              </span>
            </div>
            <div className="h-3 bg-[#F2F1EA] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#EAD07D] to-[#D4BC5E] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((campaign.actualCost || 0) / (campaign.budgetedCost || 1)) * 100, 100)}%`
                }}
              />
            </div>
          </Card>

          {/* Campaign Details */}
          <Card padding="md" className="border border-black/5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Campaign Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-black/5">
                <span className="text-sm text-[#666]">Start Date</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(campaign.startDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-black/5">
                <span className="text-sm text-[#666]">End Date</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(campaign.endDate)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-black/5">
                <span className="text-sm text-[#666]">Expected Revenue</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{formatCurrency(campaign.expectedRevenue)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-[#666]">Converted Leads</span>
                <span className="text-sm font-medium text-[#1A1A1A]">{campaign.numberOfConvertedLeads || 0}</span>
              </div>
            </div>
          </Card>

          {/* Description */}
          {campaign.description && (
            <Card padding="md" className="border border-black/5">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">Description</h3>
              <p className="text-sm text-[#666] leading-relaxed">{campaign.description}</p>
            </Card>
          )}

          {/* Performance Metrics */}
          {performance && (
            <Card variant="ghost" padding="md">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-xl">
                  <div className="text-2xl font-light text-[#1A1A1A]">{performance.responseRate.toFixed(1)}%</div>
                  <div className="text-xs text-[#666]">Response Rate</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl">
                  <div className="text-2xl font-light text-[#1A1A1A]">{performance.conversionRate.toFixed(1)}%</div>
                  <div className="text-xs text-[#666]">Conversion Rate</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Campaign Card Component
interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onClick }) => {
  const statusConfig = STATUS_CONFIG[campaign.status];

  return (
    <Card
      padding="md"
      className="cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-300 border border-black/5 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E] flex items-center justify-center text-[#1A1A1A] shadow-sm">
            {TYPE_ICONS[campaign.type]}
          </div>
          <div>
            <h3 className="font-semibold text-[#1A1A1A] group-hover:text-[#1A1A1A] transition-colors">{campaign.name}</h3>
            <p className="text-xs text-[#666]">{getTypeLabel(campaign.type)}</p>
          </div>
        </div>
        <Badge variant={statusConfig.variant} size="sm" className="flex items-center gap-1">
          {statusConfig.icon}
          {getStatusLabel(campaign.status)}
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Users size={14} className="text-[#999]" />
          <span className="font-medium text-[#1A1A1A]">{campaign.numberOfLeads || 0}</span>
          <span className="text-[#999]">leads</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Target size={14} className="text-[#999]" />
          <span className="font-medium text-[#1A1A1A]">{campaign.numberOfOpportunities || 0}</span>
          <span className="text-[#999]">opps</span>
        </div>
      </div>

      {/* Budget Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#666]">Budget</span>
          <span className="text-[#1A1A1A] font-medium">{formatCurrency(campaign.budgetedCost)}</span>
        </div>
        <div className="h-2 bg-[#F2F1EA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A1A] rounded-full transition-all"
            style={{
              width: `${Math.min(((campaign.actualCost || 0) / (campaign.budgetedCost || 1)) * 100, 100)}%`
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-black/5">
        <div className="text-xs text-[#666]">
          {campaign.startDate ? formatDate(campaign.startDate) : 'No start date'}
          {campaign.endDate ? ` - ${formatDate(campaign.endDate)}` : ''}
        </div>
        <ChevronRight size={16} className="text-[#999] group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all" />
      </div>
    </Card>
  );
};

// Main Campaigns Page
export const Campaigns: React.FC = () => {
  const { campaigns, stats, loading, statsLoading, create, isCreating } = useCampaigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || campaign.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [campaigns, searchQuery, selectedType, selectedStatus]);

  // Active campaigns count
  const activeCampaigns = campaigns.filter(c => c.status === 'IN_PROGRESS').length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budgetedCost || 0), 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.actualCost || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.numberOfLeads || 0), 0);

  const handleCreate = async (data: CreateCampaignDto) => {
    await create(data);
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-[2rem]" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A] mb-2">Campaigns</h1>
            <p className="text-[#666]">Manage your marketing campaigns and track performance</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors shadow-lg shadow-black/10"
          >
            <Plus size={18} />
            New Campaign
          </button>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="px-5 py-2.5 bg-[#EAD07D] rounded-full flex items-center gap-2 shadow-sm">
            <Megaphone size={16} className="text-[#1A1A1A]" />
            <span className="font-semibold text-[#1A1A1A]">{campaigns.length}</span>
            <span className="text-[#1A1A1A]/70 text-sm">Total</span>
          </div>
          <div className="px-5 py-2.5 bg-[#1A1A1A] rounded-full flex items-center gap-2 shadow-sm">
            <Play size={14} className="text-white" />
            <span className="font-semibold text-white">{activeCampaigns}</span>
            <span className="text-white/70 text-sm">Active</span>
          </div>
          <div className="px-5 py-2.5 bg-white rounded-full flex items-center gap-2 border border-black/10 shadow-sm">
            <Users size={14} className="text-[#666]" />
            <span className="font-semibold text-[#1A1A1A]">{totalLeads}</span>
            <span className="text-[#666] text-sm">Leads</span>
          </div>
          <div className="px-5 py-2.5 bg-white rounded-full flex items-center gap-2 border border-black/10 shadow-sm">
            <DollarSign size={14} className="text-[#666]" />
            <span className="font-semibold text-[#1A1A1A]">{formatCurrency(totalBudget)}</span>
            <span className="text-[#666] text-sm">Budget</span>
          </div>
          <div className="px-5 py-2.5 bg-white/80 backdrop-blur-sm rounded-full flex items-center gap-3 border border-black/10 shadow-sm">
            <div className="w-20 h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalSpent / (totalBudget || 1)) * 100, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[#1A1A1A]">
              {((totalSpent / (totalBudget || 1)) * 100).toFixed(0)}% spent
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {CAMPAIGN_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {CAMPAIGN_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaign Grid */}
        {filteredCampaigns.length === 0 ? (
          <Card variant="ghost" padding="lg" className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
              <Megaphone size={32} className="text-[#EAD07D]" />
            </div>
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">No campaigns found</h3>
            <p className="text-[#666] mb-6">
              {searchQuery || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first campaign to get started'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
            >
              <Plus size={18} />
              Create Campaign
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => setSelectedCampaign(campaign)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {/* Detail Panel */}
      {selectedCampaign && (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
};
