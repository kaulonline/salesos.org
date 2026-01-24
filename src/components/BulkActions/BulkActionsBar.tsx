import React, { useState } from 'react';
import {
  Trash2,
  UserPlus,
  Edit3,
  X,
  Download,
  CheckSquare,
  Loader2,
} from 'lucide-react';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'danger';
  onClick: (selectedIds: string[]) => void | Promise<void>;
}

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  entityName: string;
  actions?: BulkAction[];
  onDelete?: (ids: string[]) => Promise<void>;
  onAssign?: (ids: string[], newOwnerId: string) => Promise<void>;
  onExport?: (ids: string[]) => void;
  users?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  entityName,
  actions = [],
  onDelete,
  onAssign,
  onExport,
  users = [],
  isLoading = false,
}: BulkActionsBarProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (selectedCount === 0) {
    return null;
  }

  const handleDelete = async () => {
    if (!onDelete) return;
    setActionLoading('delete');
    try {
      await onDelete(selectedIds);
      onClearSelection();
    } finally {
      setActionLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!onAssign) return;
    setActionLoading('assign');
    try {
      await onAssign(selectedIds, userId);
      onClearSelection();
    } finally {
      setActionLoading(null);
      setShowAssignModal(false);
    }
  };

  const handleAction = async (action: BulkAction) => {
    setActionLoading(action.id);
    try {
      await action.onClick(selectedIds);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1A1A1A] text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4"
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="flex items-center gap-2 pr-4 border-r border-white/20">
          <CheckSquare className="w-5 h-5 text-[#EAD07D]" />
          <span className="text-sm font-medium">
            {selectedCount} {entityName}{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Actions */}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isLoading || actionLoading !== null}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                action.variant === 'danger'
                  ? 'hover:bg-red-500/20 text-red-400'
                  : 'hover:bg-white/10'
              } disabled:opacity-50`}
            >
              {actionLoading === action.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <action.icon className="w-4 h-4" />
              )}
              {action.label}
            </button>
          ))}

          {/* Export */}
          {onExport && (
            <button
              onClick={() => onExport(selectedIds)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          {/* Assign */}
          {onAssign && users.length > 0 && (
            <button
              onClick={() => setShowAssignModal(true)}
              disabled={isLoading || actionLoading !== null}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'assign' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Assign
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading || actionLoading !== null}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
            >
              {actionLoading === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          )}
        </div>

        <button
          onClick={onClearSelection}
          className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete {selectedCount} {entityName}{selectedCount !== 1 ? 's' : ''}?
            </h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All selected records will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading === 'delete' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowAssignModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign {selectedCount} {entityName}{selectedCount !== 1 ? 's' : ''} to
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAssign(user.id)}
                  disabled={actionLoading === 'assign'}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center text-sm font-medium text-[#1A1A1A]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-900">{user.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default BulkActionsBar;
