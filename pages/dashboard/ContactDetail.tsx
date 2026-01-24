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
  Calendar,
  ExternalLink,
  Linkedin,
  Twitter,
  MessageSquare,
  Video,
  Shield,
  Star,
  Briefcase,
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
import { useContact, useContacts } from '../../src/hooks';
import type { ContactRole, SeniorityLevel, BuyingPower, InfluenceLevel, ContactStatus, UpdateContactDto } from '../../src/types';

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRoleLabel = (role?: ContactRole): string => {
  if (!role) return 'Unknown';
  const labels: Record<ContactRole, string> = {
    CHAMPION: 'Champion',
    ECONOMIC_BUYER: 'Economic Buyer',
    DECISION_MAKER: 'Decision Maker',
    INFLUENCER: 'Influencer',
    END_USER: 'End User',
    GATEKEEPER: 'Gatekeeper',
    BLOCKER: 'Blocker',
    TECHNICAL_BUYER: 'Technical Buyer',
  };
  return labels[role] || role;
};

const getRoleVariant = (role?: ContactRole): 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark' => {
  if (!role) return 'default';
  const variants: Record<ContactRole, 'success' | 'warning' | 'danger' | 'default' | 'yellow' | 'dark'> = {
    CHAMPION: 'success',
    ECONOMIC_BUYER: 'yellow',
    DECISION_MAKER: 'dark',
    INFLUENCER: 'default',
    END_USER: 'default',
    GATEKEEPER: 'warning',
    BLOCKER: 'danger',
    TECHNICAL_BUYER: 'default',
  };
  return variants[role] || 'default';
};

const getSeniorityLabel = (seniority?: SeniorityLevel): string => {
  if (!seniority) return 'Unknown';
  const labels: Record<SeniorityLevel, string> = {
    IC: 'Individual Contributor',
    MANAGER: 'Manager',
    SENIOR_MANAGER: 'Senior Manager',
    DIRECTOR: 'Director',
    SENIOR_DIRECTOR: 'Senior Director',
    VP: 'Vice President',
    SVP: 'Senior Vice President',
    C_LEVEL: 'C-Level',
    BOARD: 'Board Member',
    OWNER: 'Owner',
  };
  return labels[seniority] || seniority;
};

const getBuyingPowerLabel = (power?: BuyingPower): string => {
  if (!power) return 'Unknown';
  const labels: Record<BuyingPower, string> = {
    NONE: 'None',
    INFLUENCER: 'Influencer',
    RECOMMENDER: 'Recommender',
    DECISION_MAKER: 'Decision Maker',
    BUDGET_HOLDER: 'Budget Holder',
  };
  return labels[power] || power;
};

const getInfluenceColor = (level?: InfluenceLevel): string => {
  if (!level) return 'bg-gray-100 text-gray-600';
  const colors: Record<InfluenceLevel, string> = {
    HIGH: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-gray-100 text-gray-600',
  };
  return colors[level] || 'bg-gray-100 text-gray-600';
};

const getStatusLabel = (status?: ContactStatus): string => {
  if (!status) return 'Active';
  const labels: Record<ContactStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    BOUNCED: 'Bounced',
    UNSUBSCRIBED: 'Unsubscribed',
  };
  return labels[status] || status;
};

export const ContactDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contact, opportunities, loading, error, refetch } = useContact(id);
  const { contacts: recentContacts, loading: contactsLoading, update, remove, isUpdating, isDeleting } = useContacts();

  const [openSection, setOpenSection] = useState<string | null>('basic');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateContactDto>({});

  // Initialize edit form when contact loads
  useEffect(() => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        mobilePhone: contact.mobilePhone,
        title: contact.title,
        department: contact.department,
        role: contact.role,
        seniorityLevel: contact.seniorityLevel,
        doNotCall: contact.doNotCall,
        doNotEmail: contact.doNotEmail,
      });
    }
  }, [contact]);

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
      console.error('Failed to update contact:', err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await remove(id);
      navigate('/dashboard/contacts');
    } catch (err) {
      console.error('Failed to delete contact:', err);
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

  if (error || !contact) {
    return (
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Contact Not Found</h2>
          <p className="text-[#666] mb-6">
            {error || 'This contact may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/contacts')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase();
  const daysSinceContact = contact.lastContactedAt
    ? Math.floor((Date.now() - new Date(contact.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-[1600px] mx-auto p-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar */}
        <div className="lg:w-80 shrink-0 space-y-4 hidden xl:block">
          <button
            onClick={() => navigate('/dashboard/contacts')}
            className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-8 transition-colors font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to
            Contacts
          </button>

          {contactsLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
          ) : (
            recentContacts.slice(0, 5).map((c) => (
              <Link to={`/dashboard/contacts/${c.id}`} key={c.id} className="block group">
                <Card
                  padding="sm"
                  className={`rounded-3xl transition-all ${c.id === contact.id ? 'bg-[#EAD07D]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${c.firstName} ${c.lastName}`}
                      src={c.avatarUrl}
                      size="sm"
                      className={c.id === contact.id ? 'ring-2 ring-[#1A1A1A]' : ''}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate text-[#1A1A1A]">
                        {c.firstName} {c.lastName}
                      </div>
                      <div
                        className={`text-xs truncate ${c.id === contact.id ? 'text-[#1A1A1A]/70' : 'text-[#666]'}`}
                      >
                        {c.title || c.account?.name || 'No title'}
                      </div>
                    </div>
                    {c.id === contact.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#1A1A1A]"></div>}
                  </div>
                  {c.id === contact.id && (
                    <div className="mt-3 w-full bg-[#1A1A1A]/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1A]"
                        style={{ width: `${c.engagementScore || 50}%` }}
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
                {contact.avatarUrl ? (
                  <img
                    src={contact.avatarUrl}
                    alt={fullName}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-gradient-to-br from-[#EAD07D] to-[#E5C973] flex items-center justify-center shadow-lg text-3xl font-bold text-[#1A1A1A]">
                    {initials}
                  </div>
                )}
                {contact.role === 'CHAMPION' && (
                  <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <Star size={20} className="text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">{fullName}</h1>
                    <div className="text-[#666] text-lg mb-4">
                      {contact.title ? `${contact.title}` : ''}
                      {contact.title && contact.account?.name && ' at '}
                      {contact.account?.name && (
                        <Link
                          to={`/dashboard/companies/${contact.account.id}`}
                          className="hover:text-[#EAD07D] transition-colors"
                        >
                          {contact.account.name}
                        </Link>
                      )}
                      {!contact.title && !contact.account?.name && 'No title or company'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {contact.email && !contact.doNotEmail && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Mail size={18} />
                      </a>
                    )}
                    {contact.phone && !contact.doNotCall && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#EAD07D] transition-colors shadow-sm"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#0077B5] hover:text-white transition-colors shadow-sm"
                      >
                        <Linkedin size={18} />
                      </a>
                    )}
                    {contact.twitterHandle && (
                      <a
                        href={`https://twitter.com/${contact.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1A1A1A] hover:bg-[#1DA1F2] hover:text-white transition-colors shadow-sm"
                      >
                        <Twitter size={18} />
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
                            <Edit3 size={16} /> Edit Contact
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                              setActionMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Contact
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {contact.role && (
                    <Badge variant={getRoleVariant(contact.role)} size="md" dot>
                      {getRoleLabel(contact.role)}
                    </Badge>
                  )}
                  {contact.seniorityLevel && (
                    <Badge variant="outline" size="md">
                      {getSeniorityLabel(contact.seniorityLevel)}
                    </Badge>
                  )}
                  {contact.influenceLevel && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getInfluenceColor(contact.influenceLevel)}`}>
                      {contact.influenceLevel} Influence
                    </span>
                  )}
                  {(contact.doNotCall || contact.doNotEmail) && (
                    <Badge variant="danger" size="md">
                      <Shield size={12} className="mr-1" />
                      {contact.doNotCall && contact.doNotEmail ? 'Do Not Contact' : contact.doNotCall ? 'Do Not Call' : 'Do Not Email'}
                    </Badge>
                  )}
                </div>

                {contact.communicationStyle && (
                  <p className="text-[#666] leading-relaxed text-sm mb-6 max-w-xl">
                    <span className="font-medium">Communication Style:</span> {contact.communicationStyle}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-6 border-t border-black/5 pt-6">
                  {contact.email && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Email</div>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
                      >
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Phone</div>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.department && (
                    <div>
                      <div className="text-xs font-bold text-[#999] uppercase tracking-wide mb-1">Department</div>
                      <div className="text-sm font-bold text-[#1A1A1A]">{contact.department}</div>
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
                    <span className="text-3xl font-bold">{contact.engagementScore || 0}</span>
                    <span className="text-lg font-bold opacity-60">/100</span>
                  </div>
                  <div className="text-xs text-[#1A1A1A]/60 uppercase font-bold tracking-wider">Engagement</div>
                </div>
              </Card>
              <Card
                variant="dark"
                className="flex flex-col justify-between group hover:scale-[1.02] transition-transform"
              >
                <div>
                  <div className="text-3xl font-medium text-white mb-1">
                    {contact.responseRate ? `${Math.round(contact.responseRate * 100)}%` : '-'}
                  </div>
                  <div className="text-xs text-white/50 uppercase font-bold tracking-wider">Response Rate</div>
                </div>
              </Card>
              <Card className="flex flex-col justify-between group hover:scale-[1.02] transition-transform border border-black/5">
                <div>
                  <div className="text-3xl font-medium text-[#1A1A1A] mb-1">
                    {daysSinceContact !== null ? daysSinceContact : '-'}
                    {daysSinceContact !== null && <span className="text-lg text-[#999]">d</span>}
                  </div>
                  <div className="text-xs text-[#999] uppercase font-bold tracking-wider">Since Contact</div>
                </div>
              </Card>
              <Card className="bg-[#999] text-white flex flex-col justify-between group hover:scale-[1.02] transition-transform">
                <div>
                  <div className="text-xl font-medium text-white mb-1">
                    {getBuyingPowerLabel(contact.buyingPower)}
                  </div>
                  <div className="text-xs text-white/70 uppercase font-bold tracking-wider">Buying Power</div>
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
                      <span className="text-sm text-[#666]">Contact ID</span>
                      <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                        {contact.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Status</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {getStatusLabel(contact.contactStatus)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Mobile</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{contact.mobilePhone || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-[#666]">Last Email</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(contact.lastEmailDate)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-[#666]">Created</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(contact.createdAt)}</span>
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
                    {contact.mailingStreet || contact.mailingCity || contact.mailingState || contact.mailingCountry ? (
                      <div className="flex items-start gap-3">
                        <MapPin size={18} className="text-[#999] mt-0.5" />
                        <div className="text-sm text-[#1A1A1A]">
                          {contact.mailingStreet && <div>{contact.mailingStreet}</div>}
                          <div>
                            {[contact.mailingCity, contact.mailingState, contact.mailingPostalCode]
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                          {contact.mailingCountry && <div>{contact.mailingCountry}</div>}
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
                  onClick={() => toggleSection('interests')}
                  className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
                >
                  Interests
                  {openSection === 'interests' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {openSection === 'interests' && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    {contact.interests && contact.interests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {contact.interests.map((interest, i) => (
                          <Badge key={i} variant="outline" size="sm">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#666]">No interests recorded</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Timeline Section */}
              <Card padding="md" className="border border-black/5">
                <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Activity Timeline</h3>
                <ContactTimeline contactId={contact.id} limit={5} />
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {/* Related Opportunities */}
              <Card className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-medium text-[#1A1A1A]">Related Opportunities</h3>
                  <Link
                    to="/dashboard/deals"
                    className="text-xs font-bold text-[#1A1A1A] bg-[#EAD07D] px-4 py-2 rounded-full hover:bg-[#E5C973] transition-colors"
                  >
                    Add Opportunity
                  </Link>
                </div>

                {opportunities && opportunities.length > 0 ? (
                  <div className="space-y-3">
                    {opportunities.map((opp: any) => (
                      <Link
                        key={opp.id}
                        to={`/dashboard/deals/${opp.id}`}
                        className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D]/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <Briefcase size={18} className="text-[#666]" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#1A1A1A]">
                              {opp.name}
                            </div>
                            <div className="text-xs text-[#666]">{opp.stage}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#1A1A1A]">
                            ${(opp.amount || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-[#666]">{opp.probability || 0}% probability</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-[#F8F8F6] rounded-xl">
                    <Briefcase size={32} className="mx-auto mb-3 text-[#999] opacity-40" />
                    <p className="text-sm text-[#666] mb-3">No opportunities linked to this contact</p>
                    <Link
                      to="/dashboard/deals"
                      className="text-xs font-bold text-[#1A1A1A] hover:text-[#EAD07D]"
                    >
                      Create an opportunity
                    </Link>
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {contact.email && !contact.doNotEmail ? (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                    >
                      <Mail size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                      <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">
                        Send Email
                      </span>
                    </a>
                  ) : (
                    <button
                      className="flex flex-col items-center gap-2 p-4 bg-gray-100 rounded-xl cursor-not-allowed"
                      disabled
                    >
                      <Mail size={20} className="text-gray-300" />
                      <span className="text-xs font-medium text-gray-300">Send Email</span>
                    </button>
                  )}
                  {contact.phone && !contact.doNotCall ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex flex-col items-center gap-2 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D] transition-colors group"
                    >
                      <Phone size={20} className="text-[#666] group-hover:text-[#1A1A1A]" />
                      <span className="text-xs font-medium text-[#666] group-hover:text-[#1A1A1A]">Call</span>
                    </a>
                  ) : (
                    <button
                      className="flex flex-col items-center gap-2 p-4 bg-gray-100 rounded-xl cursor-not-allowed"
                      disabled
                    >
                      <Phone size={20} className="text-gray-300" />
                      <span className="text-xs font-medium text-gray-300">Call</span>
                    </button>
                  )}
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
                    <Video size={20} className="text-white" />
                    <span className="text-xs font-medium text-white">Schedule</span>
                  </Link>
                </div>
              </Card>

              {/* Engagement Chart */}
              <Card className="p-8">
                <h3 className="text-xl font-medium text-[#1A1A1A] mb-6">Engagement Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                    <div className="text-4xl font-light text-[#1A1A1A] mb-2">
                      {contact.engagementScore || 0}
                    </div>
                    <div className="text-sm text-[#666]">Engagement Score</div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EAD07D] rounded-full"
                        style={{ width: `${contact.engagementScore || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                    <div className="text-4xl font-light text-[#1A1A1A] mb-2">
                      {contact.responseRate ? `${Math.round(contact.responseRate * 100)}%` : '0%'}
                    </div>
                    <div className="text-sm text-[#666]">Response Rate</div>
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1A] rounded-full"
                        style={{ width: `${(contact.responseRate || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                    <div className="text-4xl font-light text-[#1A1A1A] mb-2">
                      {opportunities?.length || 0}
                    </div>
                    <div className="text-sm text-[#666]">Active Deals</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Contact</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={editForm.mobilePhone || ''}
                    onChange={(e) => setEditForm({ ...editForm, mobilePhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Department</label>
                  <input
                    type="text"
                    value={editForm.department || ''}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Role</label>
                  <select
                    value={editForm.role || ''}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as ContactRole })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  >
                    <option value="">Select Role</option>
                    <option value="CHAMPION">Champion</option>
                    <option value="ECONOMIC_BUYER">Economic Buyer</option>
                    <option value="DECISION_MAKER">Decision Maker</option>
                    <option value="INFLUENCER">Influencer</option>
                    <option value="END_USER">End User</option>
                    <option value="GATEKEEPER">Gatekeeper</option>
                    <option value="BLOCKER">Blocker</option>
                    <option value="TECHNICAL_BUYER">Technical Buyer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-1">Seniority</label>
                  <select
                    value={editForm.seniorityLevel || ''}
                    onChange={(e) => setEditForm({ ...editForm, seniorityLevel: e.target.value as SeniorityLevel })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  >
                    <option value="">Select Seniority</option>
                    <option value="IC">Individual Contributor</option>
                    <option value="MANAGER">Manager</option>
                    <option value="SENIOR_MANAGER">Senior Manager</option>
                    <option value="DIRECTOR">Director</option>
                    <option value="SENIOR_DIRECTOR">Senior Director</option>
                    <option value="VP">Vice President</option>
                    <option value="SVP">Senior Vice President</option>
                    <option value="C_LEVEL">C-Level</option>
                    <option value="BOARD">Board Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.doNotCall || false}
                    onChange={(e) => setEditForm({ ...editForm, doNotCall: e.target.checked })}
                    className="w-4 h-4 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Do Not Call</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.doNotEmail || false}
                    onChange={(e) => setEditForm({ ...editForm, doNotEmail: e.target.checked })}
                    className="w-4 h-4 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-[#666]">Do Not Email</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
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
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Contact</h2>
              <p className="text-[#666] text-center mb-6">
                Are you sure you want to delete <strong>{fullName}</strong>? This will also remove their association with any opportunities. This action cannot be undone.
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
