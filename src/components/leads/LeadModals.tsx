import React from 'react';
import { X, Save, Trash2, TrendingUp } from 'lucide-react';
import { LEAD_STATUSES, LEAD_RATINGS, getStatusLabel, getRatingLabel } from './types';
import type { Lead, LeadStatus, LeadRating, UpdateLeadDto, ConvertLeadDto } from '../../types';

interface EditLeadModalProps {
  lead: Lead;
  editForm: UpdateLeadDto;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateLeadDto>>;
  onClose: () => void;
  onSave: () => void;
  isUpdating: boolean;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  lead,
  editForm,
  setEditForm,
  onClose,
  onSave,
  isUpdating,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Lead</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">First Name</label>
              <input
                type="text"
                value={editForm.firstName || ''}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Last Name</label>
              <input
                type="text"
                value={editForm.lastName || ''}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Email</label>
            <input
              type="email"
              value={editForm.email || ''}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Phone</label>
            <input
              type="tel"
              value={editForm.phone || ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Company</label>
              <input
                type="text"
                value={editForm.company || ''}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Title</label>
              <input
                type="text"
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Status</label>
              <select
                value={editForm.status || ''}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LeadStatus })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Rating</label>
              <select
                value={editForm.rating || ''}
                onChange={(e) => setEditForm({ ...editForm, rating: e.target.value as LeadRating })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              >
                <option value="">Unrated</option>
                {LEAD_RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {getRatingLabel(rating)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isUpdating}
            className="px-6 py-2 text-sm font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={16} />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  fullName: string;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  fullName,
  onClose,
  onDelete,
  isDeleting,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Lead</h2>
          <p className="text-[#666] text-center mb-6">
            Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-[#666] bg-[#F8F8F6] rounded-full hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConvertLeadModalProps {
  lead: Lead;
  fullName: string;
  convertForm: ConvertLeadDto;
  setConvertForm: React.Dispatch<React.SetStateAction<ConvertLeadDto>>;
  onClose: () => void;
  onConvert: () => void;
  isConverting: boolean;
}

export const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  lead,
  fullName,
  convertForm,
  setConvertForm,
  onClose,
  onConvert,
  isConverting,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-medium text-[#1A1A1A]">Convert Lead</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-[#666] mb-6">
            Convert <strong>{fullName}</strong> into CRM records. Select what to create:
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={convertForm.createAccount}
                onChange={(e) => setConvertForm({ ...convertForm, createAccount: e.target.checked })}
                className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <div>
                <div className="font-medium text-[#1A1A1A]">Create Account</div>
                <div className="text-sm text-[#666]">Create a company record from {lead.company || 'lead info'}</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={convertForm.createContact}
                onChange={(e) => setConvertForm({ ...convertForm, createContact: e.target.checked })}
                className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <div>
                <div className="font-medium text-[#1A1A1A]">Create Contact</div>
                <div className="text-sm text-[#666]">Create a contact record for {fullName}</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-[#F8F8F6] rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={convertForm.createOpportunity}
                onChange={(e) => setConvertForm({ ...convertForm, createOpportunity: e.target.checked })}
                className="w-5 h-5 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <div>
                <div className="font-medium text-[#1A1A1A]">Create Opportunity</div>
                <div className="text-sm text-[#666]">Create a new opportunity</div>
              </div>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConvert}
            disabled={isConverting || (!convertForm.createAccount && !convertForm.createContact && !convertForm.createOpportunity)}
            className="px-6 py-2 text-sm font-medium bg-[#1A1A1A] text-white rounded-full hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <TrendingUp size={16} />
            {isConverting ? 'Converting...' : 'Convert Lead'}
          </button>
        </div>
      </div>
    </div>
  );
};
