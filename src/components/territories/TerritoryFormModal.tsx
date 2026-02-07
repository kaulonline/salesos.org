import React, { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import {
  typeLabels,
  US_STATES,
  INDUSTRIES,
  ACCOUNT_TYPES,
  CriteriaForm,
} from './types';
import type { TerritoryType, CreateTerritoryDto, UpdateTerritoryDto } from '../../types/territory';

interface TerritoryFormModalProps {
  title: string;
  formData: CreateTerritoryDto | UpdateTerritoryDto;
  setFormData: (data: any) => void;
  criteriaForm: CriteriaForm;
  setCriteriaForm: (data: CriteriaForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export const TerritoryFormModal: React.FC<TerritoryFormModalProps> = ({
  title,
  formData,
  setFormData,
  criteriaForm,
  setCriteriaForm,
  onSubmit,
  onClose,
  isSubmitting,
  submitLabel,
}) => {
  const [showCriteria, setShowCriteria] = useState(false);

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-8 pb-0 sticky top-0 bg-white">
          <h2 className="text-2xl font-medium text-[#1A1A1A]">{title}</h2>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-8 pt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              placeholder="e.g., West Coast Enterprise"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Type</label>
            <select
              value={formData.type || 'GEOGRAPHIC'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TerritoryType })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
              placeholder="Describe this territory..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Color</label>
            <div className="flex gap-2">
              {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#EF4444'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-[#1A1A1A] scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Criteria Section */}
          <div className="border-t border-black/5 pt-5">
            <button
              type="button"
              onClick={() => setShowCriteria(!showCriteria)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h3 className="text-sm font-medium text-[#1A1A1A]">Assignment Criteria</h3>
                <p className="text-xs text-[#666]">Define rules for auto-assigning accounts</p>
              </div>
              <ChevronDown size={20} className={`text-[#666] transition-transform ${showCriteria ? 'rotate-180' : ''}`} />
            </button>

            {showCriteria && (
              <div className="mt-4 space-y-4">
                {/* Geographic Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">States</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#F8F8F6] rounded-xl">
                    {US_STATES.map(state => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, states: toggleArrayItem(criteriaForm.states, state) })}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          criteriaForm.states.includes(state)
                            ? 'bg-[#EAD07D] text-[#1A1A1A] font-medium'
                            : 'bg-white text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                  {criteriaForm.states.length > 0 && (
                    <p className="text-xs text-[#999] mt-1">{criteriaForm.states.length} selected</p>
                  )}
                </div>

                {/* Industry Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">Industries</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#F8F8F6] rounded-xl">
                    {INDUSTRIES.map(industry => (
                      <button
                        key={industry}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, industries: toggleArrayItem(criteriaForm.industries, industry) })}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          criteriaForm.industries.includes(industry)
                            ? 'bg-[#10B981] text-white font-medium'
                            : 'bg-white text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Type Criteria */}
                <div>
                  <label className="block text-xs font-medium text-[#666] mb-2">Account Types</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCOUNT_TYPES.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCriteriaForm({ ...criteriaForm, accountTypes: toggleArrayItem(criteriaForm.accountTypes, type) })}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          criteriaForm.accountTypes.includes(type)
                            ? 'bg-[#8B5CF6] text-white font-medium'
                            : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Criteria */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Min Employees</label>
                    <input
                      type="number"
                      value={criteriaForm.minEmployees}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, minEmployees: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Max Employees</label>
                    <input
                      type="number"
                      value={criteriaForm.maxEmployees}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, maxEmployees: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="No limit"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Min Revenue ($)</label>
                    <input
                      type="number"
                      value={criteriaForm.minRevenue}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, minRevenue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-2">Max Revenue ($)</label>
                    <input
                      type="number"
                      value={criteriaForm.maxRevenue}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, maxRevenue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#F8F8F6] text-[#666] rounded-xl font-medium text-sm hover:bg-[#F0EBD8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
