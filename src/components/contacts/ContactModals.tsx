import React from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { CONTACT_ROLES, SENIORITY_LEVELS, getRoleLabel, getSeniorityLabel } from './types';
import type { Contact, ContactRole, SeniorityLevel, UpdateContactDto } from '../../types';

interface EditContactModalProps {
  contact: Contact;
  editForm: UpdateContactDto;
  setEditForm: React.Dispatch<React.SetStateAction<UpdateContactDto>>;
  onClose: () => void;
  onSave: () => void;
  isUpdating: boolean;
}

export const EditContactModal: React.FC<EditContactModalProps> = ({
  contact,
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
          <h2 className="text-xl font-medium text-[#1A1A1A]">Edit Contact</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Mobile</label>
              <input
                type="tel"
                value={editForm.mobilePhone || ''}
                onChange={(e) => setEditForm({ ...editForm, mobilePhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Title</label>
              <input
                type="text"
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Department</label>
              <input
                type="text"
                value={editForm.department || ''}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Role</label>
              <select
                value={editForm.role || ''}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as ContactRole })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              >
                <option value="">Select Role</option>
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-1">Seniority</label>
              <select
                value={editForm.seniorityLevel || ''}
                onChange={(e) => setEditForm({ ...editForm, seniorityLevel: e.target.value as SeniorityLevel })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              >
                <option value="">Select Seniority</option>
                {SENIORITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {getSeniorityLabel(level)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.doNotCall || false}
                onChange={(e) => setEditForm({ ...editForm, doNotCall: e.target.checked })}
                className="w-4 h-4 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <span className="text-sm text-[#666]">Do Not Call</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.doNotEmail || false}
                onChange={(e) => setEditForm({ ...editForm, doNotEmail: e.target.checked })}
                className="w-4 h-4 rounded text-[#EAD07D] focus:ring-[#EAD07D]"
              />
              <span className="text-sm text-[#666]">Do Not Email</span>
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
          <h2 className="text-xl font-medium text-[#1A1A1A] text-center mb-2">Delete Contact</h2>
          <p className="text-[#666] text-center mb-6">
            Are you sure you want to delete <strong>{fullName}</strong>? This will also remove their association with any opportunities. This action cannot be undone.
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
