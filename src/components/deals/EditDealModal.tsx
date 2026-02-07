import React from 'react';
import { Pencil, X, Save, Loader2 } from 'lucide-react';
import { STAGES, OPPORTUNITY_TYPES, getStageLabel, EditFormData } from './types';
import type { OpportunityStage, OpportunityType } from '../../types';

interface EditDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  form: EditFormData;
  onChange: (updates: Partial<EditFormData>) => void;
  isSaving: boolean;
}

export const EditDealModal: React.FC<EditDealModalProps> = ({
  isOpen,
  onClose,
  onSave,
  form,
  onChange,
  isSaving,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 pb-0 shrink-0">
          <h3 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
            <Pencil size={18} className="text-[#EAD07D]" />
            Edit Opportunity
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-[#888] hover:text-[#1A1A1A] hover:bg-[#F2F1EA] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Opportunity Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
              placeholder="Enter opportunity name"
            />
          </div>

          {/* Amount and Probability Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Amount ($)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Probability (%)</label>
              <input
                type="number"
                value={form.probability}
                onChange={(e) => onChange({ probability: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Stage and Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => onChange({ stage: e.target.value as OpportunityStage })}
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value as OpportunityType })}
                className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] bg-white text-sm"
              >
                {OPPORTUNITY_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Close Date */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Close Date</label>
            <input
              type="date"
              value={form.closeDate}
              onChange={(e) => onChange({ closeDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
            />
          </div>

          {/* Next Step */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Next Step</label>
            <input
              type="text"
              value={form.nextStep}
              onChange={(e) => onChange({ nextStep: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm"
              placeholder="What's the next action?"
            />
          </div>

          {/* Needs Analysis / Description */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Description / Needs Analysis</label>
            <textarea
              value={form.needsAnalysis}
              onChange={(e) => onChange({ needsAnalysis: e.target.value })}
              className="w-full px-4 py-3 border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EAD07D] text-sm resize-none"
              placeholder="Describe the customer's needs and requirements..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t border-[#F2F1EA] shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors rounded-xl hover:bg-[#F8F8F6]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
