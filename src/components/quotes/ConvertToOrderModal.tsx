import React, { useState } from 'react';
import {
  ShoppingCart,
  X,
  Loader2,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useConvertQuoteToOrder } from '../../hooks/useOrders';
import type { Quote } from '../../types/quote';

interface ConvertToOrderModalProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
}

export function ConvertToOrderModal({ quote, isOpen, onClose }: ConvertToOrderModalProps) {
  const navigate = useNavigate();
  const { convert, isConverting, error } = useConvertQuoteToOrder();
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleConvert = async () => {
    try {
      const order = await convert({
        quoteId: quote.id,
        orderDate: orderDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
      });
      onClose();
      navigate(`/dashboard/orders/${order.id}`);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (!isOpen) return null;

  const canConvert = quote.status === 'ACCEPTED' || quote.status === 'SENT';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Convert to Order</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {!canConvert && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Quote not ready for conversion</p>
                <p className="text-xs text-amber-700 mt-1">
                  Only quotes with status "Accepted" or "Sent" can be converted to orders.
                  Current status: {quote.status}
                </p>
              </div>
            </div>
          )}

          {/* Quote Summary */}
          <Card className="border border-gray-200 p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Quote Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Quote Number</span>
                <span className="text-gray-900">{quote.quoteNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900">{quote.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account</span>
                <span className="text-gray-900">{quote.account?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Line Items</span>
                <span className="text-gray-900">{quote.lineItems?.length || 0}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(quote.subtotal || 0, quote.currency)}</span>
              </div>
              {quote.discount && quote.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600">-{formatCurrency(quote.discount, quote.currency)}</span>
                </div>
              )}
              {quote.tax && quote.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900">{formatCurrency(quote.tax, quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(quote.total || 0, quote.currency)}</span>
              </div>
            </div>
          </Card>

          {/* Order Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date (optional)
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                min={orderDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notes visible to customer on order..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes (optional)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes (not visible to customer)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C] outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={!canConvert || isConverting}
            className="px-4 py-2 bg-[#1C1C1C] text-white rounded-lg hover:bg-[#2C2C2C] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isConverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConvertToOrderModal;
