import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Filter,
  LayoutGrid,
  List,
  X,
  AlertCircle,
  Linkedin,
  MoreHorizontal,
  ChevronRight,
  Camera
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useContacts } from '../../src/hooks/useContacts';
import { useCompanies } from '../../src/hooks/useCompanies';
import { SmartCaptureModal } from '../../src/components/SmartCapture/SmartCaptureModal';
import { VirtualList } from '../../src/components/VirtualList';
import type { Contact, CreateContactDto, ContactRole, SeniorityLevel } from '../../src/types';

const getRoleColor = (role?: ContactRole) => {
  switch (role) {
    case 'CHAMPION': return 'bg-[#EAD07D]/20 text-[#1A1A1A]';
    case 'DECISION_MAKER': return 'bg-green-100 text-green-700';
    case 'ECONOMIC_BUYER': return 'bg-blue-100 text-blue-700';
    case 'INFLUENCER': return 'bg-purple-100 text-purple-700';
    case 'BLOCKER': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateContactDto) => Promise<void>;
  accounts: { id: string; name: string }[];
}

const CreateContactModal: React.FC<CreateContactModalProps> = ({ isOpen, onClose, onCreate, accounts }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateContactDto>({
    accountId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.accountId) {
      setError('First name, last name, and account are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
      setFormData({ accountId: '', firstName: '', lastName: '', email: '', phone: '', title: '' });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Contact</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="John"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Account *</label>
            <select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
            >
              <option value="">Select an account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[#666] mb-1 block">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              placeholder="john@company.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                placeholder="VP of Sales"
              />
            </div>
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
              {loading ? 'Creating...' : 'Create Contact'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const { contacts, stats, loading, error, refetch, fetchStats, create } = useContacts();
  const { companies } = useCompanies();
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmartCapture, setShowSmartCapture] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) ||
           (contact.email || '').toLowerCase().includes(query) ||
           (contact.title || '').toLowerCase().includes(query) ||
           (contact.account?.name || '').toLowerCase().includes(query);
  });

  const handleCreateContact = async (data: CreateContactDto) => {
    await create(data);
    await fetchStats();
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-96 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-medium text-[#1A1A1A] mb-1">Contacts</h1>
          <p className="text-[#666]">Manage your contacts and relationships</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSmartCapture(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#E5C973] transition-colors shadow-lg"
          >
            <Camera size={18} />
            Smart Capture
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors shadow-lg"
          >
            <Plus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={refetch} className="ml-auto text-sm underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <User size={18} className="text-[#1A1A1A]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats?.total || contacts.length}</div>
              <div className="text-xs text-[#666]">Total Contacts</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Mail size={18} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats?.withEmail || 0}</div>
              <div className="text-xs text-[#666]">With Email</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Phone size={18} className="text-[#EAD07D]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats?.withPhone || 0}</div>
              <div className="text-xs text-[#666]">With Phone</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#1A1A1A]">{stats?.byAccount?.length || 0}</div>
              <div className="text-xs text-[#666]">Accounts</div>
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
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all"
          />
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

      {/* Contacts Grid/List */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-20 text-[#666]">
          {searchQuery ? `No contacts found matching "${searchQuery}"` : 'No contacts yet. Add your first contact!'}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={contact.avatarUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName}&background=random`}
                    alt={`${contact.firstName} ${contact.lastName}`}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.title && <p className="text-xs text-[#666]">{contact.title}</p>}
                  </div>
                </div>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#999] hover:text-[#1A1A1A]"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              {contact.account && (
                <div className="flex items-center gap-2 mb-4 text-sm text-[#666]">
                  <Building2 size={14} />
                  {contact.account.name}
                </div>
              )}

              {contact.role && (
                <Badge className={getRoleColor(contact.role)} size="sm">
                  {contact.role.replace('_', ' ').toLowerCase()}
                </Badge>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-[#666]">
                    <Mail size={14} />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-[#666]">
                    <Phone size={14} />
                    {contact.phone}
                  </div>
                )}
                {contact.linkedinUrl && (
                  <div className="flex items-center gap-2 text-sm text-[#666]">
                    <Linkedin size={14} />
                    <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A1A]">
                      LinkedIn
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 bg-[#FAFAF8] border-b border-gray-100 px-6 py-4">
            <div className="col-span-3 text-xs font-bold text-[#999] uppercase tracking-wider">Contact</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Account</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Title</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Email</div>
            <div className="col-span-2 text-xs font-bold text-[#999] uppercase tracking-wider">Role</div>
            <div className="col-span-1"></div>
          </div>
          {/* Virtualized Table Body */}
          <VirtualList
            items={filteredContacts}
            itemHeight={64}
            keyExtractor={(contact) => contact.id}
            className="max-h-[calc(100vh-400px)]"
            emptyMessage={searchQuery ? `No contacts found matching "${searchQuery}"` : 'No contacts yet. Add your first contact!'}
            renderItem={(contact) => (
              <div
                className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors items-center"
                onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
              >
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar
                    src={contact.avatarUrl || `https://ui-avatars.com/api/?name=${contact.firstName}+${contact.lastName}&background=random`}
                    alt={`${contact.firstName} ${contact.lastName}`}
                    size="md"
                  />
                  <div className="font-medium text-[#1A1A1A]">
                    {contact.firstName} {contact.lastName}
                  </div>
                </div>
                <div className="col-span-2 text-sm text-[#666]">{contact.account?.name || '-'}</div>
                <div className="col-span-2 text-sm text-[#666]">{contact.title || '-'}</div>
                <div className="col-span-2 text-sm text-[#666] truncate">{contact.email || '-'}</div>
                <div className="col-span-2">
                  {contact.role ? (
                    <Badge className={getRoleColor(contact.role)} size="sm">
                      {contact.role.replace('_', ' ').toLowerCase()}
                    </Badge>
                  ) : '-'}
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MoreHorizontal size={16} className="text-[#666]" />
                  </button>
                  <ChevronRight size={16} className="text-[#999]" />
                </div>
              </div>
            )}
          />
        </Card>
      )}

      <CreateContactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateContact}
        accounts={companies.map(c => ({ id: c.id, name: c.name }))}
      />

      <SmartCaptureModal
        isOpen={showSmartCapture}
        onClose={() => setShowSmartCapture(false)}
      />
    </div>
  );
};
