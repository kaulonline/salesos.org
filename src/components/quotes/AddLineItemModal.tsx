import React, { useState } from 'react';
import { X, Plus, Loader2, Package, DollarSign, Percent } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProductSelector } from './ProductSelector';
import type { Product } from '../../api/products';
import type { CreateQuoteLineItemDto } from '../../types/quote';

interface AddLineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: CreateQuoteLineItemDto) => Promise<void>;
  existingProductIds?: string[];
  currency?: string;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export function AddLineItemModal({
  isOpen,
  onClose,
  onAdd,
  existingProductIds = [],
  currency = 'USD',
}: AddLineItemModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percent'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate prices
  const effectiveUnitPrice = useCustomPrice && unitPrice !== null ? unitPrice : (selectedProduct?.listPrice || 0);
  const subtotal = effectiveUnitPrice * quantity;
  const discountAmount = discountType === 'fixed' ? discountValue : (discountType === 'percent' ? subtotal * (discountValue / 100) : 0);
  const total = subtotal - discountAmount;

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setUnitPrice(product.listPrice);
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    if (quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data: CreateQuoteLineItemDto = {
        productId: selectedProduct.id,
        quantity,
        unitPrice: effectiveUnitPrice,
        description: description || undefined,
      };

      if (discountType === 'fixed' && discountValue > 0) {
        data.discount = discountValue;
      } else if (discountType === 'percent' && discountValue > 0) {
        data.discountPercent = discountValue;
      }

      await onAdd(data);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add line item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setUnitPrice(null);
    setUseCustomPrice(false);
    setDiscountType('none');
    setDiscountValue(0);
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2F1EA] flex items-center justify-center">
              <Package size={18} className="text-[#666]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">Add Line Item</h2>
              <p className="text-xs text-[#888]">Add a product or service to this quote</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[#888] hover:text-[#1A1A1A] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Product Selection */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2">Product</label>
            <ProductSelector
              value={selectedProduct?.id}
              onSelect={handleProductSelect}
              excludeIds={existingProductIds}
              placeholder="Search for a product..."
            />
          </div>

          {/* Quantity and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
              />
            </div>

            {/* Unit Price */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#888]">Unit Price</label>
                {selectedProduct && (
                  <button
                    type="button"
                    onClick={() => setUseCustomPrice(!useCustomPrice)}
                    className="text-[10px] text-[#EAD07D] hover:underline"
                  >
                    {useCustomPrice ? 'Use list price' : 'Custom price'}
                  </button>
                )}
              </div>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="number"
                  value={useCustomPrice ? (unitPrice ?? '') : (selectedProduct?.listPrice ?? '')}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  disabled={!useCustomPrice}
                  step="0.01"
                  min="0"
                  className={cn(
                    'w-full pl-8 pr-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm',
                    !useCustomPrice && 'bg-gray-50 text-[#888]'
                  )}
                />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2">Discount (Optional)</label>
            <div className="flex gap-2">
              {/* Discount Type Toggle */}
              <div className="flex rounded-xl border border-[#E5E5E5] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDiscountType('none')}
                  className={cn(
                    'px-3 py-2 text-xs font-medium transition-colors',
                    discountType === 'none' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#666] hover:bg-gray-50'
                  )}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={cn(
                    'px-3 py-2 text-xs font-medium transition-colors border-l border-[#E5E5E5]',
                    discountType === 'fixed' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#666] hover:bg-gray-50'
                  )}
                >
                  <DollarSign size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={cn(
                    'px-3 py-2 text-xs font-medium transition-colors border-l border-[#E5E5E5]',
                    discountType === 'percent' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#666] hover:bg-gray-50'
                  )}
                >
                  <Percent size={12} />
                </button>
              </div>

              {/* Discount Value */}
              {discountType !== 'none' && (
                <div className="relative flex-1">
                  {discountType === 'fixed' && (
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  )}
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    step={discountType === 'percent' ? '1' : '0.01'}
                    min="0"
                    max={discountType === 'percent' ? '100' : undefined}
                    className={cn(
                      'w-full py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm',
                      discountType === 'fixed' ? 'pl-8 pr-4' : 'pl-4 pr-8'
                    )}
                  />
                  {discountType === 'percent' && (
                    <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this line item..."
              rows={2}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm resize-none"
            />
          </div>

          {/* Preview */}
          {selectedProduct && (
            <div className="bg-[#F8F8F6] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#666]">Subtotal</span>
                <span className="text-[#1A1A1A]">{formatCurrency(subtotal, currency)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Discount</span>
                  <span className="text-emerald-600">-{formatCurrency(discountAmount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[#E5E5E5]">
                <span className="text-[#1A1A1A]">Line Total</span>
                <span className="text-[#1A1A1A]">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProduct || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddLineItemModal;
