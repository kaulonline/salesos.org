import React, { useState } from 'react';
import { Trash2, GripVertical, Plus, Edit2, Check, X, Loader2, Package, Percent, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { QuoteLineItem, UpdateQuoteLineItemDto } from '../../types/quote';
import { logger } from '../../lib/logger';

interface QuoteLineItemsTableProps {
  lineItems: QuoteLineItem[];
  currency?: string;
  readOnly?: boolean;
  onAddClick?: () => void;
  onUpdateLineItem?: (lineItemId: string, data: UpdateQuoteLineItemDto) => Promise<void>;
  onDeleteLineItem?: (lineItemId: string) => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

type EditField = 'quantity' | 'unitPrice' | 'discount' | 'discountPercent' | 'productName' | 'description';

interface EditState {
  lineItemId: string;
  field: EditField;
  value: string;
  discountType?: 'percent' | 'fixed'; // For discount field
}

export function QuoteLineItemsTable({
  lineItems,
  currency = 'USD',
  readOnly = false,
  onAddClick,
  onUpdateLineItem,
  onDeleteLineItem,
  isUpdating = false,
  isDeleting = false,
}: QuoteLineItemsTableProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedItems = [...lineItems].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleStartEdit = (
    lineItemId: string,
    field: EditField,
    currentValue: number | string | undefined,
    discountType?: 'percent' | 'fixed'
  ) => {
    setEditState({
      lineItemId,
      field,
      value: currentValue?.toString() || (field === 'productName' || field === 'description' ? '' : '0'),
      discountType,
    });
  };

  const handleCancelEdit = () => {
    setEditState(null);
  };

  const handleSaveEdit = async () => {
    if (!editState || !onUpdateLineItem) return;

    setSavingId(editState.lineItemId);

    try {
      const updateData: UpdateQuoteLineItemDto = {};
      const currentItem = lineItems.find(item => item.id === editState.lineItemId);

      if (editState.field === 'productName') {
        updateData.productName = editState.value;
      } else if (editState.field === 'description') {
        updateData.description = editState.value;
      } else if (editState.field === 'discount') {
        const numValue = parseFloat(editState.value) || 0;
        if (editState.discountType === 'percent' && currentItem) {
          // Calculate fixed discount from percentage
          // Discount is applied to (unitPrice * quantity)
          const lineSubtotal = currentItem.unitPrice * currentItem.quantity;
          const fixedDiscount = (lineSubtotal * numValue) / 100;
          updateData.discount = Math.round(fixedDiscount * 100) / 100; // Round to 2 decimal places
        } else {
          updateData.discount = numValue;
        }
      } else {
        const numValue = parseFloat(editState.value) || 0;
        updateData[editState.field as 'quantity' | 'unitPrice'] = numValue;
      }

      await onUpdateLineItem(editState.lineItemId, updateData);
      setEditState(null);
    } catch (err) {
      logger.error('Failed to update line item:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (lineItemId: string) => {
    if (!onDeleteLineItem) return;

    setDeletingId(lineItemId);
    try {
      await onDeleteLineItem(lineItemId);
      setDeleteConfirm(null);
    } catch (err) {
      logger.error('Failed to delete line item:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartDiscountEdit = (item: QuoteLineItem) => {
    // Calculate percentage from fixed discount for display
    if (item.discount && item.discount > 0) {
      const lineSubtotal = item.unitPrice * item.quantity;
      const percentValue = lineSubtotal > 0 ? ((item.discount / lineSubtotal) * 100) : 0;
      // Show as percentage if it's a round number, otherwise show as fixed
      if (Math.abs(percentValue - Math.round(percentValue)) < 0.01) {
        handleStartEdit(item.id, 'discount', Math.round(percentValue), 'percent');
      } else {
        handleStartEdit(item.id, 'discount', item.discount, 'fixed');
      }
    } else {
      // Default to percent for new discounts
      handleStartEdit(item.id, 'discount', 0, 'percent');
    }
  };

  // Calculate discount percentage for display
  const getDiscountDisplay = (item: QuoteLineItem): string => {
    if (!item.discount || item.discount <= 0) return '—';
    const lineSubtotal = item.unitPrice * item.quantity;
    const percentValue = lineSubtotal > 0 ? ((item.discount / lineSubtotal) * 100) : 0;
    // Show as percentage if it's a round number
    if (Math.abs(percentValue - Math.round(percentValue)) < 0.01 && percentValue > 0) {
      return `-${Math.round(percentValue)}%`;
    }
    return `-${formatCurrency(item.discount, currency)}`;
  };

  if (lineItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#F2F1EA] p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
          <Package size={24} className="text-[#999]" />
        </div>
        <h4 className="text-base font-semibold text-[#1A1A1A] mb-2">No line items yet</h4>
        <p className="text-sm text-[#666] mb-4">Add products or services to this quote</p>
        {!readOnly && onAddClick && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <Plus size={16} />
            Add Line Item
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#F2F1EA] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#FAFAFA] border-b border-[#F2F1EA] text-[10px] font-bold text-[#888] uppercase tracking-wider">
        <div className="col-span-5">Product</div>
        <div className="col-span-2 text-right">Unit Price</div>
        <div className="col-span-1 text-center">Qty</div>
        <div className="col-span-2 text-right">Discount</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      {/* Line Items */}
      <div className="divide-y divide-[#F2F1EA]">
        {sortedItems.map((item, index) => {
          const isEditing = editState?.lineItemId === item.id;
          const isBeingDeleted = deletingId === item.id;
          const isConfirmingDelete = deleteConfirm === item.id;
          const productName = item.productName || item.product?.name || item.description || 'Unnamed Item';

          return (
            <div
              key={item.id}
              className={cn(
                'grid grid-cols-12 gap-4 px-5 py-4 items-center group transition-colors',
                isBeingDeleted && 'opacity-50 bg-[#EAD07D]/20',
                isConfirmingDelete && 'bg-[#EAD07D]/20'
              )}
            >
              {/* Product Info */}
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                {!readOnly && (
                  <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} className="text-[#CCC]" />
                  </div>
                )}
                <div className="w-9 h-9 rounded-lg bg-[#F2F1EA] flex items-center justify-center flex-shrink-0">
                  <Package size={14} className="text-[#666]" />
                </div>
                <div className="min-w-0 flex-1">
                  {isEditing && editState.field === 'productName' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editState.value}
                        onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                        className="flex-1 px-2 py-1 text-sm border border-[#EAD07D] rounded focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                        placeholder="Product name"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingId === item.id}
                        className="p-1 text-[#93C01F] hover:bg-[#93C01F]/10 rounded"
                      >
                        {savingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                      </button>
                      <button onClick={handleCancelEdit} className="p-1 text-[#888] hover:bg-gray-100 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : isEditing && editState.field === 'description' ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editState.value}
                        onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                        className="flex-1 px-2 py-1 text-xs border border-[#EAD07D] rounded focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                        placeholder="Description or SKU"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingId === item.id}
                        className="p-1 text-[#93C01F] hover:bg-[#93C01F]/10 rounded"
                      >
                        {savingId === item.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                      </button>
                      <button onClick={handleCancelEdit} className="p-1 text-[#888] hover:bg-gray-100 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => !readOnly && handleStartEdit(item.id, 'productName', productName)}
                        disabled={readOnly}
                        className={cn(
                          'text-sm font-medium text-[#1A1A1A] truncate block text-left w-full',
                          !readOnly && 'hover:text-[#EAD07D] cursor-pointer'
                        )}
                        title={readOnly ? productName : 'Click to edit product name'}
                      >
                        {productName}
                      </button>
                      <button
                        onClick={() => !readOnly && handleStartEdit(item.id, 'description', item.description || item.product?.code || '')}
                        disabled={readOnly}
                        className={cn(
                          'text-[10px] text-[#888] truncate block text-left w-full',
                          !readOnly && 'hover:text-[#666] cursor-pointer'
                        )}
                        title={readOnly ? undefined : 'Click to edit description'}
                      >
                        {item.description || item.product?.code || `Item ${index + 1}`}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Unit Price */}
              <div className="col-span-2 text-right">
                {isEditing && editState.field === 'unitPrice' ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      value={editState.value}
                      onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                      className="w-20 px-2 py-1 text-sm text-right border border-[#EAD07D] rounded focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                      min="0"
                      step="0.01"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingId === item.id}
                      className="p-1 text-[#93C01F] hover:bg-[#93C01F]/10 rounded"
                    >
                      {savingId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                    </button>
                    <button onClick={handleCancelEdit} className="p-1 text-[#888] hover:bg-gray-100 rounded">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => !readOnly && handleStartEdit(item.id, 'unitPrice', item.unitPrice)}
                    disabled={readOnly}
                    className={cn(
                      'text-sm font-medium text-[#1A1A1A]',
                      !readOnly && 'hover:text-[#EAD07D] cursor-pointer'
                    )}
                  >
                    {formatCurrency(item.unitPrice, currency)}
                  </button>
                )}
              </div>

              {/* Quantity */}
              <div className="col-span-1 text-center">
                {isEditing && editState.field === 'quantity' ? (
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={editState.value}
                      onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                      className="w-14 px-2 py-1 text-sm text-center border border-[#EAD07D] rounded focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                      min="1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingId === item.id}
                      className="p-1 text-[#93C01F] hover:bg-[#93C01F]/10 rounded"
                    >
                      {savingId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                    </button>
                    <button onClick={handleCancelEdit} className="p-1 text-[#888] hover:bg-gray-100 rounded">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => !readOnly && handleStartEdit(item.id, 'quantity', item.quantity)}
                    disabled={readOnly}
                    className={cn(
                      'text-sm font-medium text-[#1A1A1A] px-2 py-0.5 rounded',
                      !readOnly && 'hover:bg-[#F2F1EA] cursor-pointer'
                    )}
                  >
                    {item.quantity}
                  </button>
                )}
              </div>

              {/* Discount */}
              <div className="col-span-2 text-right">
                {isEditing && editState.field === 'discount' ? (
                  <div className="flex items-center justify-end gap-1">
                    {/* Discount Type Toggle */}
                    <div className="flex items-center border border-[#F2F1EA] rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setEditState({ ...editState, discountType: 'percent' })}
                        className={cn(
                          'p-1 transition-colors',
                          editState.discountType === 'percent'
                            ? 'bg-[#EAD07D] text-[#1A1A1A]'
                            : 'bg-white text-[#888] hover:bg-[#F8F8F6]'
                        )}
                        title="Percentage discount"
                      >
                        <Percent size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditState({ ...editState, discountType: 'fixed' })}
                        className={cn(
                          'p-1 transition-colors',
                          editState.discountType === 'fixed'
                            ? 'bg-[#EAD07D] text-[#1A1A1A]'
                            : 'bg-white text-[#888] hover:bg-[#F8F8F6]'
                        )}
                        title="Fixed amount discount"
                      >
                        <DollarSign size={12} />
                      </button>
                    </div>
                    <input
                      type="number"
                      value={editState.value}
                      onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                      className="w-16 px-2 py-1 text-sm text-right border border-[#EAD07D] rounded focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                      min="0"
                      step={editState.discountType === 'percent' ? '1' : '0.01'}
                      max={editState.discountType === 'percent' ? '100' : undefined}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingId === item.id}
                      className="p-1 text-[#93C01F] hover:bg-[#93C01F]/10 rounded"
                    >
                      {savingId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                    </button>
                    <button onClick={handleCancelEdit} className="p-1 text-[#888] hover:bg-gray-100 rounded">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => !readOnly && handleStartDiscountEdit(item)}
                    disabled={readOnly}
                    className={cn(
                      'text-sm',
                      item.discount && item.discount > 0 ? 'text-[#93C01F] font-medium' : 'text-[#CCC]',
                      !readOnly && 'hover:text-[#EAD07D] cursor-pointer'
                    )}
                    title={readOnly ? undefined : 'Click to edit discount'}
                  >
                    {getDiscountDisplay(item)}
                  </button>
                )}
              </div>

              {/* Total */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className="text-sm font-semibold text-[#1A1A1A]">
                  {formatCurrency(item.totalPrice ?? item.total ?? 0, currency)}
                </span>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isConfirmingDelete ? (
                      <>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isBeingDeleted}
                          className="p-1.5 text-[#666] hover:bg-[#EAD07D]/20 rounded-lg text-[10px] font-medium"
                        >
                          {isBeingDeleted ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            'Delete'
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 text-[#666] hover:bg-gray-100 rounded-lg text-[10px]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="p-1.5 text-[#888] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      {!readOnly && onAddClick && (
        <div className="px-5 py-3 border-t border-[#F2F1EA] bg-[#FAFAFA]">
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            <Plus size={16} />
            Add Line Item
          </button>
        </div>
      )}
    </div>
  );
}

export default QuoteLineItemsTable;
