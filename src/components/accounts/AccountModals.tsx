import React from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { ACCOUNT_TYPES, getTypeLabel } from './types';
import type { Account, AccountType, UpdateAccountDto } from '../../types';

interface EditAccountModalProps {
  account: Account;
  editForm: UpdateAccountDto;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateAccountDto>>;
  onClose: () => void;
  onSave: () => void;
  isUpdating: boolean;
}

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  account,
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
          <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Account</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F8F8F6] flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Account Name</label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Type</label>
              <select
                value={editForm.type || ''}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as AccountType })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Industry</label>
              <input
                type="text"
                value={editForm.industry || ''}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Website</label>
            <input
              type="text"
              value={editForm.website || ''}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
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
              <label className="block text-sm font-medium text-[#666] mb-1">Employees</label>
              <input
                type="number"
                value={editForm.numberOfEmployees || ''}
                onChange={(e) => setEditForm({ ...editForm, numberOfEmployees: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Annual Revenue</label>
              <input
                type="number"
                value={editForm.annualRevenue || ''}
                onChange={(e) => setEditForm({ ...editForm, annualRevenue: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666] mb-1">Description</label>
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D] resize-none"
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
  accountName: string;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  accountName,
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
          <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Account</h2>
          <p className="text-[#666] text-center mb-6">
            Are you sure you want to delete <strong>{accountName}</strong>? This will also remove all associated contacts and opportunities. This action cannot be undone.
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
