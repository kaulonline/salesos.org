import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle,
  User,
  Building2,
  Sparkles,
  Globe,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  Clock,
  ExternalLink,
  Flame,
  Edit3,
  Trash2,
  X,
  Save,
  MoreVertical,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { ContactTimeline } from '../../components/dashboard';
import { useLead, useLeads } from '../../src/hooks';
import type { LeadStatus, LeadRating, LeadSource, UpdateLeadDto, ConvertLeadDto } from '../../src/types';

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount?: number) => {
  if (!amount) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusLabel = (status: LeadStatus): string => {
  const labels: Record<LeadStatus, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    QUALIFIED: 'Qualified',
    UNQUALIFIED: 'Unqualified',
    NURTURING: 'Nurturing',
    CONVERTED: 'Converted',
    LOST: 'Lost',
  };
  return labels[status] || status;
};

const getStatusVariant = (status: LeadStatus): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  const variants: Record<LeadStatus, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    NEW: 'yellow',
    CONTACTED: 'default',
    QUALIFIED: 'success',
    UNQUALIFIED: 'danger',
    NURTURING: 'warning',
    CONVERTED: 'success',
    LOST: 'danger',
  };
  return variants[status] || 'default';
};

const getRatingLabel = (rating?: LeadRating): string => {
  if (!rating) return 'Unrated';
  const labels: Record<LeadRating, string> = {
    HOT: 'Hot',
    WARM: 'Warm',
    COLD: 'Cold',
  };
  return labels[rating] || rating;
};

const getRatingColor = (rating?: LeadRating): string => {
  if (!rating) return 'bg-[#F8F8F6] text-[#666]';
  const colors: Record<LeadRating, string> = {
    HOT: 'bg-[#EAD07D] text-[#1A1A1A]',
    WARM: 'bg-[#EAD07D]/40 text-[#1A1A1A]',
    COLD: 'bg-[#1A1A1A]/10 text-[#1A1A1A]',
  };
  return colors[rating] || 'bg-[#F8F8F6] text-[#666]';
};

const getSourceLabel = (source?: LeadSource): string => {
  if (!source) return 'Unknown';
  const labels: Record<LeadSource, string> = {
    WEB: 'Website',
    PHONE_INQUIRY: 'Phone Inquiry',
    PARTNER_REFERRAL: 'Partner Referral',
    PURCHASED_LIST: 'Purchased List',
    EXTERNAL_REFERRAL: 'External Referral',
    EMPLOYEE_REFERRAL: 'Employee Referral',
    TRADE_SHOW: 'Trade Show',
    WEB_FORM: 'Web Form',
    SOCIAL_MEDIA: 'Social Media',
    EMAIL_CAMPAIGN: 'Email Campaign',
    WEBINAR: 'Webinar',
    COLD_CALL: 'Cold Call',
    OTHER: 'Other',
  };
  return labels[source] || source;
};

export const LeadDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lead, loading, error, refetch } = useLead(id);
  const { leads: recentLeads, loading: leadsLoading, update, remove, score, convert, isUpdating, isDeleting, isConverting } = useLeads();

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [scoringLead, setScoringLead] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateLeadDto>({});

  // Convert form state
  const [convertForm, setConvertForm] = useState<ConvertLeadDto>({
    createAccount: true,
    createContact: true,
    createOpportunity: false,
  });

  // Initialize edit form when lead loads
  useEffect(() => {
    if (lead) {
      setEditForm({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        title: lead.title,
        status: lead.status,
        rating: lead.rating,
        description: lead.description,
      });
    }
  }, [lead]);

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

  const handleScore = async () => {
    if (!id) return;
    setScoringLead(true);
    try {
      await score(id);
      await refetch();
    } catch (err) {
      console.error('Failed to score lead:', err);
    } finally {
      setScoringLead(false);
    }
  };

  const handleEdit = async () => {
    if (!id) return;
    try {
      await update(id, editForm);
      await refetch();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/leads');
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleConvert = async () => {
    if (!id) return;
    try {
      await convert(id, convertForm);
      navigate('/dashboard/contacts');
    } catch (err) {
      console.error('Failed to convert lead:', err);
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

  if (error || !lead) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Lead Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This lead may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/leads')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Leads
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${lead.firstName} ${lead.lastName}`;
  const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();
  const daysSinceContact = lead.lastContactedAt
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
          <button
            onClick={() => navigate('/dashboard/leads')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
            Leads
          </button>

          {leadsLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
          ) : (
            recentLeads.slice(0, 5).map((l) => (
              <Link to={`/dashboard/leads/${l.id}`} key={l.id} className="block group">
                <Card
                  padding="sm"
                  className={`rounded-3xl transition-all ${l.id === lead.id ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${l.firstName} ${l.lastName}`}
                      size="sm"
                      className={l.id === lead.id ? 'ring-2 ring-[#1A1A1A]' : ''}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate text-[#1A1A1A]">
                        {l.firstName} {l.lastName}
                      </div>
                      <div
                        className={`text-xs truncate ${l.id === lead.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                      >
                        {l.company || 'No company'}
                      </div>
                    </div>
                    {l.id === lead.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                  </div>
                  {l.id === lead.id && (
                    <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A1A1A]" style={{ width: `${l.leadScore || 50}%` }}></div>
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
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg text-3xl font-bold text-[#1A1A1A]">
                  {initials}
                </div>
                {lead.rating === 'HOT' && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                    <Flame size={20} className="text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{fullName}</h1>
                    <div className="text-[#666] text-lg mb-4">
                      {lead.title ? `${lead.title} at ` : ''}
                      {lead.company || 'No company'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Mail size={18} />
                      </a>
                    )}
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    <button
                      onClick={handleScore}
                      disabled={scoringLead}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm disabled:opacity-50"
                      title="AI Score"
                    >
                      <Sparkles size={18} className={scoringLead ? 'animate-pulse' : ''} />
                    </button>
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
                            <Edit3 size={16} /> Edit Lead
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                              setActionMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Lead
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant={getStatusVariant(lead.status)} size="md" dot>
                    {getStatusLabel(lead.status)}
                  </Badge>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(lead.rating)}`}>
                    {getRatingLabel(lead.rating)}
                  </span>
                  {lead.leadSource && (
                    <Badge variant="outline" size="md">
                      {getSourceLabel(lead.leadSource)}
                    </Badge>
                  )}
                </div>

                {lead.description && (
                  <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">{lead.description}</p>
                )}

                <div className="border-t border-black/5 pt-6 space-y-4">
                  {lead.email && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Email</div>
                      <a href={`mailto:${lead.email}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                      <a href={`tel:${lead.phone}`} className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]">
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.website && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Website</div>
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D] inline-flex items-center gap-1"
                      >
                        {lead.website.replace(/^https?:\/\//, '')}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
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
                    <span className="text-3xl font-bold">{lead.leadScore || 0}</span>
                    <span className="text-lg font-bold opacity-60">/100</span>
                  </div>
                  <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Lead Score</div>
                </div>
              </Card>
              <Card
                variant="dark"
                className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
              >
                <div>
                  <div className="flex items-baseline text-white mb-1">
                    <span className="text-3xl font-bold">{daysSinceContact !== null ? daysSinceContact : '-'}</span>
                    {daysSinceContact !== null && <span className="text-xl font-bold text-white/60 ml-0.5">d</span>}
                  </div>
                  <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Since Contact</div>
                </div>
              </Card>
              <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
                <div>
                  <div className="text-2xl font-medium text-[#1A1A1A] mb-1">
                    {formatCurrency(lead.budget)}
                  </div>
                  <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Budget</div>
                </div>
              </Card>
              <Card className="bg-[#999] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="text-xl font-medium text-white mb-1 capitalize">
                    {lead.buyingIntent?.toLowerCase() || 'Unknown'}
                  </div>
                  <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Buying Intent</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Middle Row: Content & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Accordions Column */}
            <div className="lg:col-span-5 space-y-4">
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
                      <span className="text-sm text-[#666]">Lead ID</span>
                      <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                        {lead.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Status</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{getStatusLabel(lead.status)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Industry</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{lead.industry || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Employees</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {lead.numberOfEmployees?.toLocaleString() || 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-[#666]">Created</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(lead.createdAt)}</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('address')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Address
                  {openSection === 'address' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'address' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    {lead.street || lead.city || lead.state || lead.country ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-[#999] mt-0.5" />
                        <div className="text-sm text-[#1A1A1A]">
                          {lead.street && <div>{lead.street}</div>}
                          <div>
                            {[lead.city, lead.state, lead.postalCode].filter(Boolean).join(', ')}
                          </div>
                          {lead.country && <div>{lead.country}</div>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No address information</p>
                    )}
                  </div>
                )}
              </Card>

              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('pain')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Pain Points & Timeline
                  {openSection === 'pain' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'pain' && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                    {lead.painPoints && lead.painPoints.length > 0 ? (
                      <div>
                        <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">
                          Pain Points
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {lead.painPoints.map((point, i) => (
                            <Badge key={i} variant="outline" size="sm">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No pain points recorded</p>
                    )}
                    {lead.timeline && (
                      <div className="pt-4 border-t border-gray-50">
                        <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-2">
                          Timeline
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                          <Clock size={14} className="text-[#999]" />
                          {lead.timeline}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Timeline Section */}
              <Card padding="sm" className="px-6 py-4 border border-black/5">
                <button
                  onClick={() => toggleSection('timeline')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Activity Timeline
                  {openSection === 'timeline' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'timeline' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <ContactTimeline leadId={lead.id} limit={5} />
                  </div>
                )}
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-7 space-y-6">
              {/* Score Breakdown */}
              <Card className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-medium text-[#1A1A1A]">Lead Score Breakdown</h3>
                  <button
                    onClick={handleScore}
                    disabled={scoringLead}
                    className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors disabled:opacity-50"
                  >
                    {scoringLead ? 'Scoring...' : 'Refresh Score'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#666]">Engagement</span>
                        <span className="font-bold text-[#1A1A1A]">
                          {Math.min((lead.leadScore || 0) * 0.4, 40).toFixed(0)}/40
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EAD07D] rounded-full"
                          style={{ width: `${Math.min((lead.leadScore || 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#666]">Fit Score</span>
                        <span className="font-bold text-[#1A1A1A]">
                          {Math.min((lead.leadScore || 0) * 0.35, 35).toFixed(0)}/35
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1A1A1A] rounded-full"
                          style={{ width: `${Math.min((lead.leadScore || 0) * 0.9, 90)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#666]">Intent</span>
                        <span className="font-bold text-[#1A1A1A]">
                          {Math.min((lead.leadScore || 0) * 0.25, 25).toFixed(0)}/25
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#999] rounded-full"
                          style={{ width: `${Math.min((lead.leadScore || 0) * 0.8, 80)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-center bg-[#F8F8F6] rounded-2xl p-6">
                    <div className="text-6xl font-light text-[#1A1A1A] mb-2">{lead.leadScore || 0}</div>
                    <div className="text-sm text-[#666]">Overall Lead Score</div>
                    <div className="mt-4 flex items-center gap-2">
                      {lead.leadScore && lead.leadScore >= 70 ? (
                        <>
                          <TrendingUp size={16} className="text-[#93C01F]" />
                          <span className="text-sm font-medium text-[#1A1A1A]">High Priority</span>
                        </>
                      ) : lead.leadScore && lead.leadScore >= 40 ? (
                        <>
                          <Target size={16} className="text-[#EAD07D]" />
                          <span className="text-sm font-medium text-[#1A1A1A]">Medium Priority</span>
                        </>
                      ) : (
                        <>
                          <Clock size={16} className="text-[#999]" />
                          <span className="text-sm font-medium text-[#666]">Nurture</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                    >
                      <Mail size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                      <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Send Email</span>
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                    >
                      <Phone size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                      <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Call</span>
                    </a>
                  )}
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                  >
                    <Edit3 size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                    <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Edit</span>
                  </button>
                  <button
                    onClick={() => setShowConvertModal(true)}
                    disabled={lead.status === 'CONVERTED'}
                    className="flex flex-col items-center gap-2 p-4 bg-[#1A1A1A] rounded-xl hover:bg-[#333] transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrendingUp size={20} className="text-white" />
                    <span className="text-xs font-medium text-white">Convert</span>
                  </button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Lead</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName || ''}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName || ''}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                  <label className="block text-sm font-medium text-[#666] mb-1">Company</label>
                  <input
                    type="text"
                    value={editForm.company || ''}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Status</label>
                  <select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="UNQUALIFIED">Unqualified</option>
                    <option value="NURTURING">Nurturing</option>
                    <option value="CONVERTED">Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Rating</label>
                  <select
                    value={editForm.rating || ''}
                    onChange={(e) => setEditForm({ ...editForm, rating: e.target.value as LeadRating })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  >
                    <option value="">Unrated</option>
                    <option value="HOT">Hot</option>
                    <option value="WARM">Warm</option>
                    <option value="COLD">Cold</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
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
              <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Lead</h2>
              <p className="text-[#666] text-center mb-6">
                Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
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

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Convert Lead</h2>
              <button
                onClick={() => setShowConvertModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-[#666] mb-6">
                Convert <strong>{fullName}</strong> into CRM records. Select what to create:
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={convertForm.createAccount}
                    onChange={(e) => setConvertForm({ ...convertForm, createAccount: e.target.checked })}
                    className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <div>
                    <div className="font-medium text-[#1A1A1A]">Create Account</div>
                    <div className="text-sm text-[#666]">Create a company record from {lead.company || 'lead info'}</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={convertForm.createContact}
                    onChange={(e) => setConvertForm({ ...convertForm, createContact: e.target.checked })}
                    className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <div>
                    <div className="font-medium text-[#1A1A1A]">Create Contact</div>
                    <div className="text-sm text-[#666]">Create a contact record for {fullName}</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={convertForm.createOpportunity}
                    onChange={(e) => setConvertForm({ ...convertForm, createOpportunity: e.target.checked })}
                    className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <div>
                    <div className="font-medium text-[#1A1A1A]">Create Opportunity</div>
                    <div className="text-sm text-[#666]">Create a new opportunity</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={isConverting || (!convertForm.createAccount && !convertForm.createContact && !convertForm.createOpportunity)}
                className="px-6 py-2 text-sm font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <TrendingUp size={16} />
                {isConverting ? 'Converting...' : 'Convert Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
