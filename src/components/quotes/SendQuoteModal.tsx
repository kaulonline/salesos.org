import React, { useState, useEffect } from 'react';
import { Send, Loader2, Mail, Plus, X, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import type { Quote, SendQuoteDto } from '../../types/quote';

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: SendQuoteDto) => Promise<void>;
  quote: Quote;
}

export function SendQuoteModal({
  isOpen,
  onClose,
  onSend,
  quote,
}: SendQuoteModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && quote) {
      const contactEmail = quote.contact?.email || '';
      setRecipientEmail(contactEmail);
      setSubject(`Quote ${quote.quoteNumber} - ${quote.name}`);
      setMessage(
        `Dear ${quote.contact?.firstName || 'Customer'},\n\nPlease find attached the quote for ${quote.name}.\n\nThe quote is valid until ${quote.expirationDate ? new Date(quote.expirationDate).toLocaleDateString() : 'further notice'}.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards`
      );
    }
  }, [isOpen, quote]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddCcEmail = () => {
    if (!newCcEmail.trim()) return;
    if (!validateEmail(newCcEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (ccEmails.includes(newCcEmail.trim())) {
      setError('This email is already in CC');
      return;
    }
    setCcEmails([...ccEmails, newCcEmail.trim()]);
    setNewCcEmail('');
    setError(null);
  };

  const handleRemoveCcEmail = (email: string) => {
    setCcEmails(ccEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!validateEmail(recipientEmail.trim())) {
      setError('Please enter a valid recipient email');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data: SendQuoteDto = {
        recipientEmail: recipientEmail.trim(),
        ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        subject: subject.trim() || undefined,
        message: message.trim() || undefined,
        attachPdf,
      };

      await onSend(data);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRecipientEmail('');
    setCcEmails([]);
    setNewCcEmail('');
    setSubject('');
    setMessage('');
    setAttachPdf(true);
    setError(null);
    onClose();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      showCloseButton={false}
      contentClassName="p-0 overflow-hidden flex flex-col max-h-[90vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Send size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Send Quote</h2>
            <p className="text-xs text-[#888]">
              {quote.quoteNumber} · {formatCurrency(quote.total, quote.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Recipient Email */}
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">
            To <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
              required
            />
          </div>
        </div>

        {/* CC Emails */}
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">CC (Optional)</label>
          <div className="space-y-2">
            {ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ccEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F2F1EA] rounded-lg text-xs"
                  >
                    <span className="text-[#1A1A1A]">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCcEmail(email)}
                      className="text-[#888] hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                value={newCcEmail}
                onChange={(e) => setNewCcEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCcEmail();
                  }
                }}
                placeholder="Add CC email..."
                className="flex-1 px-4 py-2 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
              />
              <button
                type="button"
                onClick={handleAddCcEmail}
                className="px-3 py-2 bg-[#F2F1EA] text-[#666] rounded-xl hover:bg-[#E5E5E5] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Quote subject..."
            className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message..."
            rows={5}
            className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm resize-none"
          />
        </div>

        {/* Attach PDF */}
        <label className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl cursor-pointer group">
          <input
            type="checkbox"
            checked={attachPdf}
            onChange={(e) => setAttachPdf(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              attachPdf
                ? 'bg-[#EAD07D] border-[#EAD07D]'
                : 'border-[#CCC] group-hover:border-[#999]'
            )}
          >
            {attachPdf && (
              <svg className="w-3 h-3 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <FileText size={16} className="text-[#888]" />
            <div>
              <span className="text-sm font-medium text-[#1A1A1A]">Attach PDF</span>
              <p className="text-[10px] text-[#888]">Include the quote document as an attachment</p>
            </div>
          </div>
        </label>

        {/* Quote Preview */}
        <div className="bg-[#FAFAFA] rounded-xl p-4 border border-[#F2F1EA]">
          <div className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-3">
            Quote Summary
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666]">Quote Number</span>
              <span className="font-medium text-[#1A1A1A]">{quote.quoteNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Total Amount</span>
              <span className="font-semibold text-[#1A1A1A]">
                {formatCurrency(quote.total, quote.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Line Items</span>
              <span className="text-[#1A1A1A]">{quote.lineItems?.length || 0}</span>
            </div>
            {quote.expirationDate && (
              <div className="flex justify-between">
                <span className="text-[#666]">Valid Until</span>
                <span className="text-[#1A1A1A]">
                  {new Date(quote.expirationDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!recipientEmail.trim() || isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          Send Quote
        </button>
      </div>
    </Modal>
  );
}

export default SendQuoteModal;
