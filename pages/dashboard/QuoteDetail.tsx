import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  ChevronDown,
  Download,
  Send,
  Check,
  X,
  Copy,
  Loader2,
  AlertCircle,
  DollarSign,
  Package,
  Clock,
  User,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Upload,
  Trash2,
  Sparkles,
  File,
  Table,
  Tag,
  Phone,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useToast } from '../../src/components/ui/Toast';
import {
  QuoteStatusBadge,
  QuoteSummary,
  QuoteLineItemsTable,
  AddLineItemModal,
  SendQuoteModal,
  ConvertToOrderModal,
} from '../../src/components/quotes';
import { useQuote, useQuoteDocuments } from '../../src/hooks/useQuotes';
import { useActivities } from '../../src/hooks/useActivities';
import { quotesApi, QuoteDocument } from '../../src/api/quotes';
import { printQuote } from '../../src/utils/quotePdfGenerator';
import type { CreateQuoteLineItemDto, UpdateQuoteLineItemDto, UpdateQuoteDto } from '../../src/types/quote';

type TabType = 'line-items' | 'info' | 'activity' | 'documents';

// Edit Quote Modal
interface EditQuoteModalProps {
  isOpen: boolean;
  quote: any;
  onClose: () => void;
  onUpdate: (data: UpdateQuoteDto) => Promise<void>;
  isUpdating: boolean;
}

const EditQuoteModal: React.FC<EditQuoteModalProps> = ({ isOpen, quote, onClose, onUpdate, isUpdating }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    expirationDate: '',
    paymentTerms: '',
    notes: '',
    discount: 0,
    tax: 0,
    shippingHandling: 0,
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (quote) {
      setFormData({
        name: quote.name || '',
        expirationDate: quote.expirationDate ? quote.expirationDate.split('T')[0] : '',
        paymentTerms: quote.paymentTerms || '',
        notes: quote.notes || '',
        discount: quote.discount || 0,
        tax: quote.tax || 0,
        shippingHandling: quote.shippingHandling || 0,
      });
    }
  }, [quote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onUpdate({
        name: formData.name,
        expirationDate: formData.expirationDate || undefined,
        paymentTerms: formData.paymentTerms || undefined,
        notes: formData.notes || undefined,
        discount: formData.discount ?? undefined, // Allow 0 as valid value
        tax: formData.tax ?? undefined, // Allow 0 as valid value
        shippingHandling: formData.shippingHandling ?? undefined, // Allow 0 as valid value
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to update quote');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 pb-0 shrink-0">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Edit Quote</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
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
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Expiration Date</label>
              <input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Payment Terms</label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
              >
                <option value="">Select payment terms</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="50% Upfront">50% Upfront</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Discount</label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Tax</label>
                <input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666] mb-1 block">Shipping</label>
                <input
                  type="number"
                  value={formData.shippingHandling}
                  onChange={(e) => setFormData({ ...formData, shippingHandling: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#666] mb-1 block">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
                placeholder="Additional notes for the quote..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 text-[#666] hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 px-4 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
  );
};

const formatCurrency = (amount?: number, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (date?: string) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    quote,
    loading,
    error,
    refetch,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    update,
    send,
    clone,
    isSending,
    isUpdating,
  } = useQuote(id);

  const {
    documents,
    loading: documentsLoading,
    upload: uploadDocument,
    deleteDocument,
    reprocess: reprocessDocument,
    isUploading,
    isDeleting,
    isReprocessing,
  } = useQuoteDocuments(id);

  // Fetch activities related to this quote's opportunity or account
  const { activities, loading: activitiesLoading } = useActivities(
    quote?.opportunityId ? { opportunityId: quote.opportunityId } :
    quote?.accountId ? { accountId: quote.accountId } : undefined
  );

  const [activeTab, setActiveTab] = useState<TabType>('line-items');
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConvertToOrderModal, setShowConvertToOrderModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Handlers
  const handleAddLineItem = async (data: CreateQuoteLineItemDto) => {
    await addLineItem(data);
    setShowAddLineItemModal(false);
  };

  const handleUpdateLineItem = async (lineItemId: string, data: UpdateQuoteLineItemDto) => {
    await updateLineItem(lineItemId, data);
  };

  const handleDeleteLineItem = async (lineItemId: string) => {
    await deleteLineItem(lineItemId);
  };

  const handleSendQuote = async (data: any) => {
    await send(data);
    setShowSendModal(false);
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const clonedQuote = await clone();
      showToast({ type: 'success', title: 'Quote Cloned', message: 'Successfully created a copy of the quote' });
      navigate(`/dashboard/quotes/${clonedQuote.id}`);
    } catch (err) {
      showToast({ type: 'error', title: 'Clone Failed', message: (err as Error).message || 'Could not clone quote' });
    } finally {
      setIsCloning(false);
      setShowActionsMenu(false);
    }
  };

  const handleAccept = async () => {
    if (!quote) return;
    setIsAccepting(true);
    try {
      await quotesApi.markAccepted(quote.id);
      await refetch();
      showToast({ type: 'success', title: 'Quote Accepted', message: 'The quote has been marked as accepted' });
    } catch (err) {
      showToast({ type: 'error', title: 'Accept Failed', message: (err as Error).message || 'Could not accept quote' });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!quote || !rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      await quotesApi.reject(quote.id, { reason: rejectReason.trim() });
      await refetch();
      setShowRejectModal(false);
      setRejectReason('');
      showToast({ type: 'success', title: 'Quote Rejected', message: 'The quote has been marked as rejected' });
    } catch (err) {
      showToast({ type: 'error', title: 'Reject Failed', message: (err as Error).message || 'Could not reject quote' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!quote) return;
    setIsDownloading(true);
    try {
      // Open print-friendly view in a new window
      printQuote(quote);
      showToast({ type: 'success', title: 'PDF Generated', message: 'The PDF is ready for download' });
    } catch (err) {
      showToast({ type: 'error', title: 'PDF Generation Failed', message: (err as Error).message || 'Could not generate PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;
    try {
      await deleteDocument(deleteDocumentId);
      showToast({ type: 'success', title: 'Document Deleted', message: 'The document has been removed' });
    } catch (err) {
      showToast({ type: 'error', title: 'Delete Failed', message: (err as Error).message || 'Could not delete document' });
    } finally {
      setDeleteDocumentId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">Quote Not Found</h2>
          <p className="text-[#666] mb-8 text-center max-w-md">
            {error || 'This quote may have been deleted or you may not have access to it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/quotes')}
            className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  const isEditable = quote.status === 'DRAFT' || quote.status === 'APPROVED';
  const canSend = quote.status === 'DRAFT' || quote.status === 'APPROVED';
  const canAccept = quote.status === 'SENT' || quote.status === 'VIEWED';
  const isClosed = quote.status === 'ACCEPTED' || quote.status === 'REJECTED' || quote.status === 'EXPIRED' || quote.status === 'CANCELLED';

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'line-items', label: 'Line Items', count: quote.lineItems?.length || 0 },
    { id: 'info', label: 'Quote Info' },
    { id: 'activity', label: 'Activity' },
    { id: 'documents', label: 'Documents' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 animate-in fade-in duration-500">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/quotes')}
        className="flex items-center gap-2 text-[#666] hover:text-[#1A1A1A] mb-6 transition-colors text-sm font-medium group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to Quotes
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#F2F1EA]">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              {/* Quote Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EAD07D] to-[#E5C56B] flex items-center justify-center shadow-lg shadow-[#EAD07D]/20">
                  <FileText size={24} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl font-semibold text-[#1A1A1A]">{quote.name}</h1>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#666]">
                    <span className="font-mono">{quote.quoteNumber}</span>
                    <span className="flex items-center gap-1">
                      <Building2 size={14} />
                      {quote.account?.name || 'Unknown Account'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Edit Button */}
                {isEditable && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#F2F1EA] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#E5E5E5] transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}

                {/* Download PDF */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F2F1EA] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#E5E5E5] transition-colors disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  PDF
                </button>

                {/* Send Button */}
                {canSend && (
                  <button
                    onClick={() => setShowSendModal(true)}
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
                  >
                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send
                  </button>
                )}

                {/* Accept/Reject Buttons */}
                {canAccept && (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={isAccepting}
                      className="flex items-center gap-2 px-4 py-2 bg-[#93C01F] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#85B01A] transition-colors disabled:opacity-50"
                    >
                      {isAccepting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Accept
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isRejecting}
                      className="flex items-center gap-2 px-4 py-2 bg-[#666] text-white rounded-xl text-sm font-medium hover:bg-[#555] transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </>
                )}

                {/* More Actions */}
                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="p-2 bg-[#F2F1EA] text-[#666] rounded-xl hover:bg-[#E5E5E5] transition-colors"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {showActionsMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                        {(quote.status === 'ACCEPTED' || quote.status === 'SENT') && (
                          <button
                            onClick={() => {
                              setShowConvertToOrderModal(true);
                              setShowActionsMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#93C01F] hover:bg-[#93C01F]/10 font-medium"
                          >
                            <Package size={14} />
                            Convert to Order
                          </button>
                        )}
                        <button
                          onClick={handleClone}
                          disabled={isCloning}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                        >
                          {isCloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                          Clone Quote
                        </button>
                        {quote.opportunityId && (
                          <Link
                            to={`/dashboard/deals/${quote.opportunityId}`}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                          >
                            <ExternalLink size={14} />
                            View Opportunity
                          </Link>
                        )}
                        <button
                          onClick={() => refetch()}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#666] hover:bg-[#F8F8F6] hover:text-[#1A1A1A]"
                        >
                          <RefreshCw size={14} />
                          Refresh
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total */}
              <div className="bg-[#EAD07D] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-[#1A1A1A]/60" />
                  <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Total</span>
                </div>
                <div className="text-xl font-semibold text-[#1A1A1A]">
                  {formatCurrency(quote.total ?? quote.totalPrice, quote.currency)}
                </div>
              </div>

              {/* Items */}
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} className="text-[#888]" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Items</span>
                </div>
                <div className="text-xl font-semibold text-[#1A1A1A]">
                  {quote.lineItems?.length || 0}
                </div>
              </div>

              {/* Expiration */}
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-[#888]" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Expires</span>
                </div>
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  {formatDate(quote.expirationDate)}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-[#888]" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Contact</span>
                </div>
                <div className="text-sm font-semibold text-[#1A1A1A] truncate">
                  {quote.contact ? `${quote.contact.firstName} ${quote.contact.lastName}` : 'Not set'}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-[#F2F1EA]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'text-[#1A1A1A] border-[#EAD07D]'
                      : 'text-[#666] border-transparent hover:text-[#1A1A1A] hover:bg-[#FAFAFA]'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activeTab === tab.id ? 'bg-[#EAD07D] text-[#1A1A1A]' : 'bg-[#F2F1EA] text-[#888]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {activeTab === 'line-items' && (
                <QuoteLineItemsTable
                  lineItems={quote.lineItems || []}
                  currency={quote.currency}
                  readOnly={!isEditable}
                  onAddClick={() => setShowAddLineItemModal(true)}
                  onUpdateLineItem={handleUpdateLineItem}
                  onDeleteLineItem={handleDeleteLineItem}
                />
              )}

              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Quote Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-[#1A1A1A]">Quote Details</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Quote Number</span>
                          <span className="text-sm font-medium text-[#1A1A1A] font-mono">{quote.quoteNumber}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Status</span>
                          <QuoteStatusBadge status={quote.status} size="sm" />
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Currency</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">{quote.currency}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Expiration Date</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(quote.expirationDate)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-[#666]">Created</span>
                          <span className="text-sm font-medium text-[#1A1A1A]">{formatDateTime(quote.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-[#1A1A1A]">Related Records</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Account</span>
                          {quote.account ? (
                            <Link to={`/dashboard/companies/${quote.accountId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                              {quote.account.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-[#999]">-</span>
                          )}
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
                          <span className="text-sm text-[#666]">Opportunity</span>
                          {quote.opportunity ? (
                            <Link to={`/dashboard/deals/${quote.opportunityId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                              {quote.opportunity.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-[#999]">-</span>
                          )}
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-sm text-[#666]">Contact</span>
                          {quote.contact ? (
                            <Link to={`/dashboard/contacts/${quote.contactId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                              {quote.contact.firstName} {quote.contact.lastName}
                            </Link>
                          ) : (
                            <span className="text-sm text-[#999]">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Notes */}
                  {(quote.terms || quote.notes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F2F1EA]">
                      {quote.terms && (
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Terms & Conditions</h4>
                          <p className="text-sm text-[#666] whitespace-pre-wrap">{quote.terms}</p>
                        </div>
                      )}
                      {quote.notes && (
                        <div>
                          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Notes</h4>
                          <p className="text-sm text-[#666] whitespace-pre-wrap">{quote.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {activitiesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4 p-4 bg-[#F8F8F6] rounded-xl animate-pulse">
                          <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[#E5E5E5] rounded w-1/3" />
                            <div className="h-3 bg-[#E5E5E5] rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                        <Clock size={24} className="text-[#999]" />
                      </div>
                      <h4 className="text-base font-semibold text-[#1A1A1A] mb-2">No Activity Yet</h4>
                      <p className="text-sm text-[#666]">Activities related to this quote will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.slice(0, 20).map((activity) => {
                        const getActivityIcon = () => {
                          switch (activity.type) {
                            case 'CALL': return <Phone size={16} className="text-[#93C01F]" />;
                            case 'EMAIL': return <Send size={16} className="text-blue-500" />;
                            case 'MEETING': return <Calendar size={16} className="text-purple-500" />;
                            case 'NOTE': return <FileText size={16} className="text-[#EAD07D]" />;
                            case 'STATUS_CHANGE': return <RefreshCw size={16} className="text-[#666]" />;
                            case 'STAGE_CHANGE': return <ArrowLeft size={16} className="text-[#1A1A1A] rotate-180" />;
                            default: return <Clock size={16} className="text-[#999]" />;
                          }
                        };

                        const getActivityBg = () => {
                          switch (activity.type) {
                            case 'CALL': return 'bg-[#93C01F]/20';
                            case 'EMAIL': return 'bg-blue-100';
                            case 'MEETING': return 'bg-purple-100';
                            case 'NOTE': return 'bg-[#EAD07D]/20';
                            default: return 'bg-[#F8F8F6]';
                          }
                        };

                        return (
                          <div key={activity.id} className="flex gap-4 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors">
                            <div className={`w-10 h-10 rounded-full ${getActivityBg()} flex items-center justify-center flex-shrink-0`}>
                              {getActivityIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-[#1A1A1A] text-sm">{activity.subject}</h4>
                                <span className="text-xs text-[#999] whitespace-nowrap">
                                  {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="text-sm text-[#666] mt-1 line-clamp-2">{activity.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-[#999] capitalize">{activity.type.toLowerCase().replace('_', ' ')}</span>
                                {activity.user && (
                                  <span className="text-xs text-[#999]">by {activity.user.name}</span>
                                )}
                                {activity.duration && (
                                  <span className="text-xs text-[#999]">{activity.duration} min</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="space-y-4">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-[#E5E5E5] rounded-xl p-6 text-center hover:border-[#EAD07D] transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadDocument(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-3">
                      {isUploading ? (
                        <Loader2 size={20} className="text-[#EAD07D] animate-spin" />
                      ) : (
                        <Upload size={20} className="text-[#666]" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-sm font-medium text-[#1A1A1A] hover:text-[#EAD07D] transition-colors disabled:opacity-50"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                    </button>
                    <p className="text-xs text-[#888] mt-1">
                      PDF documents will be processed with AI to extract summaries
                    </p>
                  </div>

                  {/* Documents List */}
                  {documentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                      ))}
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="py-8 text-center text-[#666] text-sm">
                      No documents attached yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc: QuoteDocument) => (
                        <div
                          key={doc.id}
                          className="bg-[#F8F8F6] rounded-xl p-4 hover:bg-[#F2F1EA] transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                              <File size={18} className="text-[#666]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[#1A1A1A] truncate">
                                  {doc.filename}
                                </span>
                                {doc.status === 'PROCESSING' && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-[#1A1A1A]/10 text-[#1A1A1A] rounded-full flex items-center gap-1">
                                    <Loader2 size={10} className="animate-spin" />
                                    Processing
                                  </span>
                                )}
                                {doc.status === 'COMPLETE' && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-[#93C01F]/20 text-[#1A1A1A] rounded-full flex items-center gap-1">
                                    <Sparkles size={10} />
                                    AI Ready
                                  </span>
                                )}
                                {doc.status === 'ERROR' && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-[#EAD07D]/30 text-[#1A1A1A] rounded-full">
                                    Error
                                  </span>
                                )}
                              </div>

                              {/* Document Stats */}
                              <div className="flex items-center gap-3 text-xs text-[#888]">
                                {doc.pageCount && (
                                  <span>{doc.pageCount} pages</span>
                                )}
                                {doc.tableCount && doc.tableCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Table size={10} />
                                    {doc.tableCount} tables
                                  </span>
                                )}
                                {doc.sizeBytes && (
                                  <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                                )}
                              </div>

                              {/* AI Summary */}
                              {doc.status === 'COMPLETE' && doc.summary && (
                                <div className="mt-3">
                                  <button
                                    onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                                    className="text-xs font-medium text-[#EAD07D] hover:text-[#D4BA6A] flex items-center gap-1"
                                  >
                                    <Sparkles size={12} />
                                    {expandedDocId === doc.id ? 'Hide AI Summary' : 'View AI Summary'}
                                  </button>
                                  {expandedDocId === doc.id && (
                                    <div className="mt-2 p-3 bg-white rounded-lg border border-[#EAD07D]/30">
                                      <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">
                                        {doc.summary}
                                      </p>
                                      {doc.keyTerms && doc.keyTerms.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-[#F2F1EA]">
                                          <div className="flex items-center gap-1 mb-1.5">
                                            <Tag size={10} className="text-[#888]" />
                                            <span className="text-[10px] font-medium text-[#888] uppercase">Key Terms</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {doc.keyTerms.map((term, i) => (
                                              <span
                                                key={i}
                                                className="px-2 py-0.5 text-xs bg-[#F8F8F6] text-[#666] rounded-full"
                                              >
                                                {term}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Error Message */}
                              {doc.status === 'ERROR' && doc.errorMessage && (
                                <p className="mt-2 text-xs text-red-500">{doc.errorMessage}</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {doc.status === 'ERROR' && (
                                <button
                                  onClick={() => reprocessDocument(doc.id)}
                                  disabled={isReprocessing}
                                  className="p-1.5 text-[#888] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                                  title="Retry processing"
                                >
                                  <RefreshCw size={14} className={isReprocessing ? 'animate-spin' : ''} />
                                </button>
                              )}
                              <button
                                onClick={() => setDeleteDocumentId(doc.id)}
                                disabled={isDeleting}
                                className="p-1.5 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete document"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Summary */}
          <QuoteSummary quote={quote} />

          {/* Status Timeline */}
          <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[#888]" />
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2" />
                <div>
                  <div className="text-sm font-medium text-[#1A1A1A]">Created</div>
                  <div className="text-xs text-[#888]">{formatDateTime(quote.createdAt)}</div>
                </div>
              </div>
              {quote.sentAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#EAD07D] mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Sent</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.sentAt)}</div>
                  </div>
                </div>
              )}
              {quote.viewedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Viewed</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.viewedAt)}</div>
                  </div>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#93C01F] mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Accepted</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.acceptedAt)}</div>
                  </div>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#666] mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Rejected</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.rejectedAt)}</div>
                    {quote.rejectionReason && (
                      <div className="text-xs text-[#666] mt-1 italic">"{quote.rejectionReason}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {!isClosed && (
            <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {isEditable && (
                  <button
                    onClick={() => setShowAddLineItemModal(true)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#F2F1EA] transition-colors"
                  >
                    <Package size={16} />
                    Add Line Item
                  </button>
                )}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#F2F1EA] transition-colors disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF
                </button>
                <button
                  onClick={handleClone}
                  disabled={isCloning}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#F2F1EA] transition-colors disabled:opacity-50"
                >
                  {isCloning ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                  Clone Quote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddLineItemModal
        isOpen={showAddLineItemModal}
        onClose={() => setShowAddLineItemModal(false)}
        onAdd={handleAddLineItem}
        existingProductIds={quote.lineItems?.map((li) => li.productId).filter(Boolean) as string[]}
        currency={quote.currency}
      />

      <SendQuoteModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendQuote}
        quote={quote}
      />

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-[#666]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A1A] text-center mb-2">Reject Quote</h3>
              <p className="text-sm text-[#666] text-center mb-4">
                Please provide a reason for rejection
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Price too high, Chose competitor..."
                className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none text-sm mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#666] text-white rounded-xl font-medium hover:bg-[#555] transition-colors disabled:opacity-50"
                >
                  {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quote Modal */}
      <EditQuoteModal
        isOpen={showEditModal}
        quote={quote}
        onClose={() => setShowEditModal(false)}
        onUpdate={update}
        isUpdating={isUpdating}
      />

      {/* Convert to Order Modal */}
      <ConvertToOrderModal
        quote={quote}
        isOpen={showConvertToOrderModal}
        onClose={() => setShowConvertToOrderModal(false)}
      />

      {/* Delete Document Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteDocumentId}
        onClose={() => setDeleteDocumentId(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}

export default QuoteDetail;
