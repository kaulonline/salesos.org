import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Download,
  Copy,
  Trash2,
  Filter,
  X,
  AlertCircle,
  Building2,
  User,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useQuotes, useCreateQuoteFromOpportunity } from '../../src/hooks/useQuotes';
import type { Quote, QuoteStatus, CreateQuoteDto } from '../../src/types';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'neutral', icon: <FileText size={14} /> },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'yellow', icon: <Clock size={14} /> },
  APPROVED: { label: 'Approved', color: 'blue', icon: <CheckCircle size={14} /> },
  SENT: { label: 'Sent', color: 'blue', icon: <Send size={14} /> },
  VIEWED: { label: 'Viewed', color: 'purple', icon: <Eye size={14} /> },
  ACCEPTED: { label: 'Accepted', color: 'green', icon: <CheckCircle size={14} /> },
  REJECTED: { label: 'Rejected', color: 'red', icon: <XCircle size={14} /> },
  EXPIRED: { label: 'Expired', color: 'neutral', icon: <Clock size={14} /> },
  CANCELLED: { label: 'Cancelled', color: 'neutral', icon: <XCircle size={14} /> },
};

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateQuoteDto) => Promise<Quote | void>;
}

const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreateQuoteDto>>({
    name: '',
    opportunityId: '',
    accountId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.opportunityId || !formData.accountId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate(formData as CreateQuoteDto);
      onClose();
      setFormData({ name: '', opportunityId: '', accountId: '' });
    } catch (err) {
      setError((err as Error).message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">New Quote</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Quote Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Q-2024-001 - Enterprise License"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Opportunity ID *</label>
              <input
                type="text"
                value={formData.opportunityId}
                onChange={(e) => setFormData({ ...formData, opportunityId: e.target.value })}
                placeholder="Enter opportunity ID"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Account ID *</label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                placeholder="Enter account ID"
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Expiration Date</label>
              <input
                type="date"
                value={formData.expirationDate || ''}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const { quotes, stats, loading, error, create, remove } = useQuotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; quoteId: string | null }>({
    isOpen: false,
    quoteId: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      const matchesSearch =
        quote.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.account?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, quoteId: id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.quoteId) return;
    setDeleteLoading(true);
    try {
      await remove(deleteModal.quoteId);
    } catch (err) {
      console.error('Failed to delete quote:', err);
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ isOpen: false, quoteId: null });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Quotes</h1>
        <p className="text-[#666] mt-1">Create and manage quotes for your opportunities</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">{stats.total}</p>
            <p className="text-sm text-[#666]">Total Quotes</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-blue-600">{stats.sent}</p>
            <p className="text-sm text-[#666]">Sent</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-green-600">{stats.accepted}</p>
            <p className="text-sm text-[#666]">Accepted</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#1A1A1A]">
              {formatCurrency(stats.totalValue)}
            </p>
            <p className="text-sm text-[#666]">Total Value</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-semibold text-[#EAD07D]">
              {(stats.conversionRate * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-[#666]">Conversion Rate</p>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
            <input
              type="text"
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'all')}
            className="px-4 py-2.5 rounded-full bg-white border border-gray-200 focus:border-[#EAD07D] outline-none text-sm"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
        >
          <Plus size={18} />
          New Quote
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Quotes List */}
      {!loading && (
        <div className="space-y-3">
          {filteredQuotes.map(quote => (
            <Card
              key={quote.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/dashboard/quotes/${quote.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <FileText size={24} className="text-[#1A1A1A]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#1A1A1A]">{quote.name}</p>
                      <Badge
                        variant={STATUS_CONFIG[quote.status].color as any}
                        size="sm"
                      >
                        {STATUS_CONFIG[quote.status].icon}
                        <span className="ml-1">{STATUS_CONFIG[quote.status].label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#666] mt-1">
                      <span>{quote.quoteNumber}</span>
                      {quote.account && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Building2 size={14} />
                            {quote.account.name}
                          </span>
                        </>
                      )}
                      {quote.expirationDate && (
                        <>
                          <span>·</span>
                          <span>Expires {new Date(quote.expirationDate).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-semibold text-[#1A1A1A]">
                      {formatCurrency(quote.total, quote.currency)}
                    </p>
                    <p className="text-sm text-[#666]">{quote.lineItems.length} items</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(quote.id);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#666] hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredQuotes.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-[#888] mx-auto mb-4" />
          <p className="text-[#666]">No quotes found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-[#1A1A1A] hover:underline"
          >
            Create your first quote
          </button>
        </Card>
      )}

      <CreateQuoteModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={create}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, quoteId: null })}
        onConfirm={confirmDelete}
        title="Delete Quote"
        message="Are you sure you want to delete this quote? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
