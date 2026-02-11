import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  Download,
  Send,
  Check,
  X,
  Copy,
  Loader2,
  AlertCircle,
  DollarSign,
  Package,
  User,
  RefreshCw,
  MoreHorizontal,
  ExternalLink,
  Pencil,
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
  EditQuoteModal,
  QuoteInfoTab,
  QuoteActivityTab,
  QuoteDocumentsTab,
  QuoteTimeline,
  formatCurrency,
  formatDate,
  TabType,
} from '../../src/components/quotes';
import { useQuote, useQuoteDocuments } from '../../src/hooks/useQuotes';
import { useActivities } from '../../src/hooks/useActivities';
import { quotesApi } from '../../src/api/quotes';
import { printQuote } from '../../src/utils/quotePdfGenerator';
import type { CreateQuoteLineItemDto, UpdateQuoteLineItemDto } from '../../src/types/quote';

export function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

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
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);

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
              <div className="flex flex-wrap items-center gap-2">
                {isEditable && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#F2F1EA] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#E5E5E5] transition-colors"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}

                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F2F1EA] text-[#1A1A1A] rounded-xl text-sm font-medium hover:bg-[#E5E5E5] transition-colors disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  PDF
                </button>

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

                {/* More Actions Menu */}
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
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-black/5 py-1 z-50">
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
              <div className="bg-[#EAD07D] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={14} className="text-[#1A1A1A]/60" />
                  <span className="text-[10px] font-bold text-[#1A1A1A]/60 uppercase tracking-wider">Total</span>
                </div>
                <div className="text-xl font-semibold text-[#1A1A1A]">
                  {formatCurrency(quote.total ?? quote.totalPrice, quote.currency)}
                </div>
              </div>

              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} className="text-[#888]" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Items</span>
                </div>
                <div className="text-xl font-semibold text-[#1A1A1A]">
                  {quote.lineItems?.length || 0}
                </div>
              </div>

              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-[#888]" />
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Expires</span>
                </div>
                <div className="text-sm font-semibold text-[#1A1A1A]">
                  {formatDate(quote.expirationDate)}
                </div>
              </div>

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
            <div className="flex overflow-x-auto border-b border-[#F2F1EA] no-scrollbar">
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
              {activeTab === 'info' && <QuoteInfoTab quote={quote} />}
              {activeTab === 'activity' && <QuoteActivityTab activities={activities} loading={activitiesLoading} />}
              {activeTab === 'documents' && (
                <QuoteDocumentsTab
                  documents={documents}
                  loading={documentsLoading}
                  isUploading={isUploading}
                  isReprocessing={isReprocessing}
                  isDeleting={isDeleting}
                  onUpload={uploadDocument}
                  onReprocess={reprocessDocument}
                  onDeleteRequest={setDeleteDocumentId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <QuoteSummary quote={quote} />
          <QuoteTimeline quote={quote} />

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

      <EditQuoteModal
        isOpen={showEditModal}
        quote={quote}
        onClose={() => setShowEditModal(false)}
        onUpdate={update}
        isUpdating={isUpdating}
      />

      <ConvertToOrderModal
        quote={quote}
        isOpen={showConvertToOrderModal}
        onClose={() => setShowConvertToOrderModal(false)}
      />

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
