import React from 'react';
import { DollarSign, Percent, Truck, Calculator } from 'lucide-react';
import type { Quote } from '../../types/quote';

interface QuoteSummaryProps {
  quote: Quote;
  compact?: boolean;
}

const formatCurrency = (amount?: number, currency: string = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function QuoteSummary({ quote, compact = false }: QuoteSummaryProps) {
  const lineItemsCount = quote.lineItems?.length || 0;
  const hasDiscount = (quote.discount && quote.discount > 0) || (quote.discountPercent && quote.discountPercent > 0);
  const hasTax = (quote.tax && quote.tax > 0) || (quote.taxPercent && quote.taxPercent > 0);
  const hasShipping = quote.shippingCost && quote.shippingCost > 0;

  if (compact) {
    return (
      <div className="bg-[#F8F8F6] rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#666]">Total</span>
          <span className="text-lg font-semibold text-[#1A1A1A]">
            {formatCurrency(quote.total, quote.currency)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#F2F1EA] bg-[#FAFAFA]">
        <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Calculator size={16} className="text-[#888]" />
          Quote Summary
        </h3>
      </div>

      {/* Summary Items */}
      <div className="p-5 space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#666]">
            Subtotal ({lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'})
          </span>
          <span className="text-sm font-medium text-[#1A1A1A]">
            {formatCurrency(quote.subtotal, quote.currency)}
          </span>
        </div>

        {/* Discount */}
        {hasDiscount && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666] flex items-center gap-1.5">
              <Percent size={12} className="text-emerald-500" />
              Discount
              {quote.discountPercent ? ` (${quote.discountPercent}%)` : ''}
            </span>
            <span className="text-sm font-medium text-emerald-600">
              -{formatCurrency(quote.discount, quote.currency)}
            </span>
          </div>
        )}

        {/* Tax */}
        {hasTax && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666] flex items-center gap-1.5">
              <DollarSign size={12} className="text-[#888]" />
              Tax
              {quote.taxPercent ? ` (${quote.taxPercent}%)` : ''}
            </span>
            <span className="text-sm font-medium text-[#1A1A1A]">
              {formatCurrency(quote.tax, quote.currency)}
            </span>
          </div>
        )}

        {/* Shipping */}
        {hasShipping && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#666] flex items-center gap-1.5">
              <Truck size={12} className="text-[#888]" />
              Shipping
            </span>
            <span className="text-sm font-medium text-[#1A1A1A]">
              {formatCurrency(quote.shippingCost, quote.currency)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-dashed border-[#E5E5E5] my-2" />

        {/* Total */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-base font-semibold text-[#1A1A1A]">Total</span>
          <span className="text-xl font-bold text-[#1A1A1A]">
            {formatCurrency(quote.total, quote.currency)}
          </span>
        </div>

        {/* Currency Note */}
        {quote.currency !== 'USD' && (
          <p className="text-[10px] text-[#999] text-right">
            All amounts in {quote.currency}
          </p>
        )}
      </div>
    </div>
  );
}

export default QuoteSummary;
