import React, { useState } from 'react';
import { Trash2, GripVertical, Plus, Edit2, Check, X, Loader2, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { QuoteLineItem, UpdateQuoteLineItemDto } from '../../types/quote';

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

interface EditState {
  lineItemId: string;
  field: 'quantity' | 'unitPrice' | 'discount' | 'discountPercent';
  value: string;
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

  const handleStartEdit = (lineItemId: string, field: EditState['field'], currentValue: number | undefined) => {
    setEditState({
      lineItemId,
      field,
      value: currentValue?.toString() || '0',
    });
  };

  const handleCancelEdit = () => {
    setEditState(null);
  };

  const handleSaveEdit = async () => {
    if (!editState || !onUpdateLineItem) return;

    const numValue = parseFloat(editState.value) || 0;
    setSavingId(editState.lineItemId);

    try {
      await onUpdateLineItem(editState.lineItemId, {
        [editState.field]: numValue,
      });
      setEditState(null);
    } catch (err) {
      console.error('Failed to update line item:', err);
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
      console.error('Failed to delete line item:', err);
    } finally {
      setDeletingId(null);
    }
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

          return (
            <div
              key={item.id}
              className={cn(
                'grid grid-cols-12 gap-4 px-5 py-4 items-center group transition-colors',
                isBeingDeleted && 'opacity-50 bg-red-50',
                isConfirmingDelete && 'bg-red-50'
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
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#1A1A1A] truncate">
                    {item.product?.name || item.description || 'Unnamed Item'}
                  </div>
                  <div className="text-[10px] text-[#888]">
                    {item.product?.code || `Item ${index + 1}`}
                  </div>
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
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
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
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
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
                {item.discount || item.discountPercent ? (
                  <span className="text-sm text-emerald-600">
                    {item.discountPercent
                      ? `-${item.discountPercent}%`
                      : `-${formatCurrency(item.discount || 0, currency)}`}
                  </span>
                ) : (
                  <span className="text-sm text-[#CCC]">—</span>
                )}
              </div>

              {/* Total */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className="text-sm font-semibold text-[#1A1A1A]">
                  {formatCurrency(item.total, currency)}
                </span>

                {/* Actions */}
                {!readOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isConfirmingDelete ? (
                      <>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isBeingDeleted}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-medium"
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
                        className="p-1.5 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
