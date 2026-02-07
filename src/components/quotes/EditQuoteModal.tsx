import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { PAYMENT_TERMS } from './types';
import type { UpdateQuoteDto, Quote } from '../../types/quote';

interface EditQuoteModalProps {
  isOpen: boolean;
  quote: Quote;
  onClose: () => void;
  onUpdate: (data: UpdateQuoteDto) => Promise<unknown>;
  isUpdating: boolean;
}

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({
  isOpen,
  quote,
  onClose,
  onUpdate,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    expirationDate: '',
    paymentTerms: '',
    notes: '',
    discount: 0,
    tax: 0,
    shippingHandling: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
        notes: formData.notes || undefined,
        discount: formData.discount ?? undefined,
        taxPercent: formData.tax ?? undefined,
        shippingCost: formData.shippingHandling ?? undefined,
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
                {PAYMENT_TERMS.map((term) => (
                  <option key={term} value={term}>{term}</option>
                ))}
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
