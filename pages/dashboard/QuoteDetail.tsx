import React, { useState } from 'react';
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
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  QuoteStatusBadge,
  QuoteSummary,
  QuoteLineItemsTable,
  AddLineItemModal,
  SendQuoteModal,
} from '../../src/components/quotes';
import { useQuote } from '../../src/hooks/useQuotes';
import { quotesApi } from '../../src/api/quotes';
import { printQuote } from '../../src/utils/quotePdfGenerator';
import type { CreateQuoteLineItemDto, UpdateQuoteLineItemDto } from '../../src/types/quote';

type TabType = 'line-items' | 'info' | 'activity' | 'documents';

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
    send,
    clone,
    isSending,
  } = useQuote(id);

  const [activeTab, setActiveTab] = useState<TabType>('line-items');
  const [showAddLineItemModal, setShowAddLineItemModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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
      navigate(`/dashboard/quotes/${clonedQuote.id}`);
    } catch (err) {
      console.error('Failed to clone quote:', err);
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
    } catch (err) {
      console.error('Failed to accept quote:', err);
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
    } catch (err) {
      console.error('Failed to reject quote:', err);
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
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isAccepting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Accept
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={isRejecting}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
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
                  {formatCurrency(quote.total, quote.currency)}
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
                <div className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                    <Clock size={24} className="text-[#999]" />
                  </div>
                  <h4 className="text-base font-semibold text-[#1A1A1A] mb-2">Activity Timeline</h4>
                  <p className="text-sm text-[#666]">Activity tracking coming soon</p>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="py-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
                    <FileText size={24} className="text-[#999]" />
                  </div>
                  <h4 className="text-base font-semibold text-[#1A1A1A] mb-2">Documents</h4>
                  <p className="text-sm text-[#666]">Document attachments coming soon</p>
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
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Sent</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.sentAt)}</div>
                  </div>
                </div>
              )}
              {quote.viewedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Viewed</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.viewedAt)}</div>
                  </div>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                  <div>
                    <div className="text-sm font-medium text-[#1A1A1A]">Accepted</div>
                    <div className="text-xs text-[#888]">{formatDateTime(quote.acceptedAt)}</div>
                  </div>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
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
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-red-500" />
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isRejecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteDetail;
