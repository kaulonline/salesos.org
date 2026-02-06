import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Phone,
  Mail,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle,
  Globe,
  Users,
  DollarSign,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Calendar,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Save,
  MoreVertical,
  Heart,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCompany, useCompanies } from '../../src/hooks';
import type { Account, AccountType, AccountStatus, AccountRating, ChurnRisk, UpdateAccountDto } from '../../src/types';

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (value?: number) => {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: 0,
  }).format(value);
};

const getTypeLabel = (type?: AccountType): string => {
  if (!type) return 'Unknown';
  const labels: Record<AccountType, string> = {
    PROSPECT: 'Prospect',
    CUSTOMER: 'Customer',
    PARTNER: 'Partner',
    RESELLER: 'Reseller',
    COMPETITOR: 'Competitor',
    OTHER: 'Other',
  };
  return labels[type] || type;
};

const getTypeVariant = (type?: AccountType): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  if (!type) return 'default';
  const variants: Record<AccountType, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    PROSPECT: 'default',
    CUSTOMER: 'success',
    PARTNER: 'dark',
    RESELLER: 'yellow',
    COMPETITOR: 'warning',
    OTHER: 'default',
  };
  return variants[type] || 'default';
};

const getStatusLabel = (status?: AccountStatus): string => {
  if (!status) return 'Active';
  const labels: Record<AccountStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    CHURNED: 'Churned',
    AT_RISK: 'At Risk',
  };
  return labels[status] || status;
};

const getRatingLabel = (rating?: AccountRating): string => {
  if (!rating) return 'Not Rated';
  const labels: Record<AccountRating, string> = {
    HOT: 'Hot',
    WARM: 'Warm',
    COLD: 'Cold',
  };
  return labels[rating] || rating;
};

const getChurnRiskLabel = (risk?: ChurnRisk): string => {
  if (!risk) return 'Unknown';
  const labels: Record<ChurnRisk, string> = {
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
  };
  return labels[risk] || risk;
};

const getChurnRiskColor = (risk?: ChurnRisk): string => {
  if (!risk) return 'bg-gray-100 text-gray-600';
  const colors: Record<ChurnRisk, string> = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-red-100 text-red-700',
  };
  return colors[risk] || 'bg-gray-100 text-gray-600';
};

const getHealthColor = (score?: number) => {
  if (!score) return { bg: 'bg-gray-100', text: 'text-[#666]', fill: 'bg-gray-300' };
  if (score >= 80) return { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', fill: 'bg-[#93C01F]' };
  if (score >= 60) return { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', fill: 'bg-[#EAD07D]' };
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-600', fill: 'bg-orange-400' };
  return { bg: 'bg-red-100', text: 'text-red-600', fill: 'bg-red-400' };
};

export const AccountDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company, hierarchy, revenue, loading, error, refetch } = useCompany(id);
  const { companies: recentCompanies, loading: companiesLoading, update, remove, isUpdating, isDeleting } = useCompanies();

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateAccountDto>({});

  // Initialize edit form when company loads
  useEffect(() => {
    if (company) {
      setEditForm({
        name: company.name,
        website: company.website,
        phone: company.phone,
        industry: company.industry,
        type: company.type,
        numberOfEmployees: company.numberOfEmployees,
        annualRevenue: company.annualRevenue,
        description: company.description,
      });
    }
  }, [company]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(false);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleEdit = async () => {
    if (!id) return;
    try {
      await update(id, editForm);
      await refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update account:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/companies');
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-80 shrink-0 hidden xl:block space-y-4">
            <Skeleton className="h-6 w-32 mb-6" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-3xl" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
              <Skeleton className="lg:col-span-8 h-[340px] rounded-[2rem]" />
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-[160px] rounded-[2rem]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Account Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This account may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/companies')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  const healthColors = getHealthColor(company.healthScore);
  const daysSinceActivity = company.lastActivityDate
    ? Math.floor((Date.now() - new Date(company.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
          <button
            onClick={() => navigate('/dashboard/companies')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
            Accounts
          </button>

          {companiesLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
          ) : (
            recentCompanies.slice(0, 5).map((c) => (
              <Link to={`/dashboard/companies/${c.id}`} key={c.id} className="block group">
                <Card
                  padding="sm"
                  className={`rounded-3xl transition-all ${c.id === company.id ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        c.id === company.id ? 'bg-[#1A1A1A] text-white' : 'bg-[#F8F8F6] text-[#666]'
                      }`}
                    >
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate text-[#1A1A1A]">
                        {c.name}
                      </div>
                      <div
                        className={`text-xs truncate ${c.id === company.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                      >
                        {c.industry || getTypeLabel(c.type)}
                      </div>
                    </div>
                    {c.id === company.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                  </div>
                  {c.id === company.id && (
                    <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1A]"
                        style={{ width: `${c.healthScore || 50}%` }}
                      ></div>
                    </div>
                  )}
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Main Profile Area */}
        <div className="flex-1 min-w-0">
          {/* Top Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Profile Card */}
            <Card
              variant="ghost"
              padding="lg"
              className="lg:col-span-8 p-8 lg:p-10 relative flex flex-col md:flex-row gap-8 items-start"
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white rounded-full blur-[80px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

              <div className="shrink-0 relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg">
                  <Building2 size={48} className="text-[#1A1A1A]" />
                </div>
                {company.type === 'CUSTOMER' && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[#93C01F] flex items-center justify-center shadow-lg">
                    <Heart size={20} className="text-white" />
                  </div>
                )}
                {company.churnRisk === 'HIGH' && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{company.name}</h1>
                    <div className="text-[#666] text-lg mb-4">
                      {company.industry || 'No industry specified'}
                      {company.website && (
                        <>
                          {' '}&bull;{' '}
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#EAD07D] transition-colors inline-flex items-center gap-1"
                          >
                            {company.domain || company.website}
                            <ExternalLink size={14} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {company.phone && (
                      <a
                        href={`tel:${company.phone}`}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Globe size={18} />
                      </a>
                    )}
                    {/* Action Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuOpen(!actionMenuOpen);
                        }}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                        title="More Actions"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {actionMenuOpen && (
                        <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[160px] z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEditModal(true);
                              setActionMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F8F8F6] flex items-center gap-2"
                          >
                            <Edit3 size={16} /> Edit Account
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                              setActionMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant={getTypeVariant(company.type)} size="md" dot>
                    {getTypeLabel(company.type)}
                  </Badge>
                  {company.accountStatus && (
                    <Badge variant={company.accountStatus === 'AT_RISK' ? 'danger' : 'outline'} size="md">
                      {getStatusLabel(company.accountStatus)}
                    </Badge>
                  )}
                  {company.rating && (
                    <Badge variant={company.rating === 'HOT' ? 'yellow' : 'default'} size="md">
                      {getRatingLabel(company.rating)}
                    </Badge>
                  )}
                  {company.churnRisk && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getChurnRiskColor(company.churnRisk)}`}>
                      {getChurnRiskLabel(company.churnRisk)}
                    </span>
                  )}
                </div>

                {company.description && (
                  <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl line-clamp-3">
                    {company.description}
                  </p>
                )}

                <div className="border-t border-black/5 pt-6 grid grid-cols-2 gap-4">
                  {company.numberOfEmployees && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Employees</div>
                      <div className="text-sm font-bold text-[#1A1A1A]">
                        {company.numberOfEmployees.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {company.annualRevenue && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Annual Revenue</div>
                      <div className="text-sm font-bold text-[#1A1A1A]">
                        {formatCurrency(company.annualRevenue)}
                      </div>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                      <a
                        href={`tel:${company.phone}`}
                        className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
                      >
                        {company.phone}
                      </a>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Created</div>
                    <div className="text-sm font-bold text-[#1A1A1A]">{formatDate(company.createdAt)}</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Pills */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                variant="yellow"
                className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
              >
                <div>
                  <div className="flex items-baseline text-[#1A1A1A] mb-1">
                    <span className="text-3xl font-bold">{company.healthScore || 0}</span>
                    <span className="text-lg font-bold opacity-60">/100</span>
                  </div>
                  <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Health Score</div>
                </div>
              </Card>
              <Card
                variant="dark"
                className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
              >
                <div>
                  <div className="text-3xl font-medium text-white mb-1">
                    {formatCurrency(company.lifetimeValue)}
                  </div>
                  <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Lifetime Value</div>
                </div>
              </Card>
              <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
                <div>
                  <div className="text-3xl font-medium text-[#1A1A1A] mb-1">
                    {daysSinceActivity !== null ? daysSinceActivity : '-'}
                    {daysSinceActivity !== null && <span className="text-lg text-[#999]">d</span>}
                  </div>
                  <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Since Activity</div>
                </div>
              </Card>
              <Card className="bg-[#1A1A1A] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {(company._count?.opportunities || company.opportunityCount) || 0}
                  </div>
                  <div className="text-xs text-white/60 uppercase font-bold tracking-wider">Open Deals</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Middle Row: Content & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Accordions Column */}
            <div className="lg:col-span-4 space-y-4">
              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('basic')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Basic Information
                  {openSection === 'basic' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'basic' && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Account ID</span>
                      <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                        {company.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Type</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {getTypeLabel(company.type)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Status</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {getStatusLabel(company.accountStatus)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Industry</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{company.industry || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-[#666]">Last Activity</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(company.lastActivityDate)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('billing')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Billing Address
                  {openSection === 'billing' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'billing' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    {company.billingStreet || company.billingCity || company.billingState || company.billingCountry ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-[#999] mt-0.5" />
                        <div className="text-sm text-[#1A1A1A]">
                          {company.billingStreet && <div>{company.billingStreet}</div>}
                          <div>
                            {[company.billingCity, company.billingState, company.billingPostalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                          {company.billingCountry && <div>{company.billingCountry}</div>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No billing address</p>
                    )}
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('shipping')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Shipping Address
                  {openSection === 'shipping' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'shipping' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    {company.shippingStreet || company.shippingCity || company.shippingState || company.shippingCountry ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-[#999] mt-0.5" />
                        <div className="text-sm text-[#1A1A1A]">
                          {company.shippingStreet && <div>{company.shippingStreet}</div>}
                          <div>
                            {[company.shippingCity, company.shippingState, company.shippingPostalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                          {company.shippingCountry && <div>{company.shippingCountry}</div>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No shipping address</p>
                    )}
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('techstack')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Tech Stack
                  {openSection === 'techstack' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'techstack' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    {company.techStack && company.techStack.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {company.techStack.map((tech, i) => (
                          <Badge key={i} variant="outline" size="sm">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No tech stack recorded</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Hierarchy Section */}
              {hierarchy && (hierarchy.parent || (hierarchy.children && hierarchy.children.length > 0)) && (
                <Card padding="sm" className="px-6 py-4 border border-black/5">
                  <button
                    onClick={() => toggleSection('hierarchy')}
                    className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                  >
                    Account Hierarchy
                    {openSection === 'hierarchy' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {openSection === 'hierarchy' && (
                    <div className="mt-4 animate-in slide-in-from-top-2 space-y-3">
                      {hierarchy.parent && (
                        <div>
                          <div className="text-xs font-bold text-[#999] uppercase mb-2">Parent Account</div>
                          <Link
                            to={`/dashboard/companies/${hierarchy.parent.id}`}
                            className="flex items-center gap-2 p-2 bg-[#F8F8F6] rounded-lg hover:bg-[#EAD07D]/20 transition-colors"
                          >
                            <Layers size={16} className="text-[#666]" />
                            <span className="text-sm font-medium text-[#1A1A1A]">{hierarchy.parent.name}</span>
                          </Link>
                        </div>
                      )}
                      {hierarchy.children && hierarchy.children.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-[#999] uppercase mb-2">Child Accounts</div>
                          <div className="space-y-2">
                            {hierarchy.children.map((child) => (
                              <Link
                                key={child.id}
                                to={`/dashboard/companies/${child.id}`}
                                className="flex items-center gap-2 p-2 bg-[#F8F8F6] rounded-lg hover:bg-[#EAD07D]/20 transition-colors"
                              >
                                <Building2 size={16} className="text-[#666]" />
                                <span className="text-sm font-medium text-[#1A1A1A]">{child.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {/* Revenue Overview */}
              {revenue && (
                <Card className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-medium text-[#1A1A1A]">Revenue Overview</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
                      <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                        {formatCurrency(revenue.totalRevenue)}
                      </div>
                      <div className="text-xs text-[#666]">Total Revenue</div>
                    </div>
                    <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
                      <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                        {revenue.closedWonDeals}
                      </div>
                      <div className="text-xs text-[#666]">Closed Won</div>
                    </div>
                    <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
                      <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                        {revenue.openDeals}
                      </div>
                      <div className="text-xs text-[#666]">Open Deals</div>
                    </div>
                    <div className="bg-[#F8F8F6] rounded-xl p-4 text-center">
                      <div className="text-2xl font-light text-[#1A1A1A] mb-1">
                        {formatCurrency(revenue.avgDealSize)}
                      </div>
                      <div className="text-xs text-[#666]">Avg Deal Size</div>
                    </div>
                  </div>

                  {/* Revenue by Month Chart */}
                  {revenue.revenueByMonth && revenue.revenueByMonth.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-[#666] mb-3">Revenue Trend</div>
                      <div className="flex items-end gap-2 h-32">
                        {revenue.revenueByMonth.slice(-6).map((month, i) => {
                          const maxRevenue = Math.max(...revenue.revenueByMonth.map((m) => m.revenue));
                          const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-[#EAD07D] rounded-t-lg transition-all hover:bg-[#1A1A1A]"
                                style={{ height: `${Math.max(height, 4)}%` }}
                                title={`${month.month}: ${formatCurrency(month.revenue)}`}
                              />
                              <span className="text-[10px] text-[#999]">{month.month.slice(0, 3)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Link
                    to="/dashboard/deals"
                    className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                  >
                    <Briefcase size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">
                      New Deal
                    </span>
                  </Link>
                  <Link
                    to="/dashboard/contacts"
                    className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                  >
                    <Users size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">
                      Add Contact
                    </span>
                  </Link>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                  >
                    <Edit3 size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Edit</span>
                  </button>
                  <Link
                    to="/dashboard/calendar"
                    className="flex flex-col items-center gap-2 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#333] transition-colors group"
                  >
                    <Calendar size={20} className="text-white" />
                    <span className="text-xs font-medium text-white">Schedule</span>
                  </Link>
                </div>
              </Card>

              {/* Pain Points & Competitors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Pain Points</h3>
                  {company.painPoints && company.painPoints.length > 0 ? (
                    <div className="space-y-2">
                      {company.painPoints.map((point, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 bg-[#F8F8F6] rounded-lg"
                        >
                          <AlertTriangle size={16} className="text-[#EAD07D] mt-0.5 shrink-0" />
                          <span className="text-sm text-[#666]">{point}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#666]">No pain points recorded</p>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Competitors</h3>
                  {company.competitors && company.competitors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {company.competitors.map((competitor, i) => (
                        <Badge key={i} variant="outline" size="md">
                          {competitor}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#666]">No competitors recorded</p>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Account</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Account Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Type</label>
                  <select
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AccountType })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  >
                    <option value="PROSPECT">Prospect</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="PARTNER">Partner</option>
                    <option value="RESELLER">Reseller</option>
                    <option value="COMPETITOR">Competitor</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Industry</label>
                  <input
                    type="text"
                    value={editForm.industry || ''}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Website</label>
                <input
                  type="text"
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Employees</label>
                  <input
                    type="number"
                    value={editForm.numberOfEmployees || ''}
                    onChange={(e) => setEditForm({ ...editForm, numberOfEmployees: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Annual Revenue</label>
                  <input
                    type="number"
                    value={editForm.annualRevenue || ''}
                    onChange={(e) => setEditForm({ ...editForm, annualRevenue: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isUpdating}
                className="px-6 py-2 text-sm font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Account</h2>
              <p className="text-[#666] text-center mb-6">
                Are you sure you want to delete <strong>{company.name}</strong>? This will also remove all associated contacts and opportunities. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-[#666] bg-[#F8F8F6] rounded-full hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetail;
