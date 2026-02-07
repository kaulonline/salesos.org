import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import type { Opportunity } from '../../types';

interface CloseWonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deal: Opportunity | null;
  isUpdating: boolean;
}

export const CloseWonModal: React.FC<CloseWonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deal,
  isUpdating,
}) => {
  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1A1A] text-center mb-2">Mark as Won</h3>
          <p className="text-sm text-[#666] text-center mb-6">
            Congratulations! Mark "{deal.name}" as closed won?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isUpdating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CloseLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deal: Opportunity | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  isUpdating: boolean;
}

export const CloseLostModal: React.FC<CloseLostModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deal,
  reason,
  onReasonChange,
  isUpdating,
}) => {
  if (!isOpen || !deal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#1A1A1A] text-center mb-2">Mark as Lost</h3>
          <p className="text-sm text-[#666] text-center mb-4">
            Why did we lose "{deal.name}"?
          </p>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g., Went with competitor, budget constraints..."
            className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none text-sm mb-6"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose();
                onReasonChange('');
              }}
              className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isUpdating || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
