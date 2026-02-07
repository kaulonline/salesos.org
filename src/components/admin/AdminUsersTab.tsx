import React, { useState } from 'react';
import {
  Search, RefreshCw, Ban, CheckCircle, Key, MoreHorizontal, Loader2
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Avatar } from '../../../components/ui/Avatar';
import { getStatusBadge, getRoleBadge } from '../../utils/adminBadges';

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  lastLoginAt?: string;
}

interface AdminUsersTabProps {
  users?: AdminUser[] | null;
  totalUsers: number;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onSuspendUser: (userId: string) => Promise<void>;
  onActivateUser: (userId: string) => Promise<void>;
  onResetPassword: (userId: string) => Promise<void>;
  showToast: (toast: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export function AdminUsersTab({
  users,
  totalUsers,
  loading,
  searchQuery,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  currentPage,
  onPageChange,
  onRefresh,
  onSuspendUser,
  onActivateUser,
  onResetPassword,
  showToast,
}: AdminUsersTabProps) {
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const pageSize = 20;
  const maxPages = Math.ceil(totalUsers / pageSize);

  const handleSuspendUser = async (user: AdminUser) => {
    setUserActionLoading(`suspend-${user.id}`);
    try {
      await onSuspendUser(user.id);
      showToast({
        type: 'success',
        title: 'User suspended',
        message: `${user.name || user.email} has been suspended`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to suspend user',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleActivateUser = async (user: AdminUser) => {
    setUserActionLoading(`activate-${user.id}`);
    try {
      await onActivateUser(user.id);
      showToast({
        type: 'success',
        title: 'User activated',
        message: `${user.name || user.email} has been activated`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to activate user',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    setUserActionLoading(`reset-${user.id}`);
    try {
      await onResetPassword(user.id);
      showToast({
        type: 'success',
        title: 'Password reset email sent',
        message: `Reset instructions sent to ${user.email}`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to reset password',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setUserActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedRole}
              onChange={(e) => onRoleChange(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="USER">User</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] outline-none text-sm"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <button
              onClick={onRefresh}
              className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Role</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Last Login</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1EA]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-4 px-6">
                      <Skeleton className="h-12 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : (users || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666]">
                    No users found
                  </td>
                </tr>
              ) : (
                (users || []).map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatarUrl} name={u.name || u.email} size="sm" />
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{u.name || 'No name'}</p>
                          <p className="text-xs text-[#666]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">{getRoleBadge(u.role)}</td>
                    <td className="py-4 px-6">{getStatusBadge(u.status)}</td>
                    <td className="py-4 px-6 text-sm text-[#666]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleSuspendUser(u)}
                            disabled={userActionLoading === `suspend-${u.id}`}
                            className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Suspend"
                          >
                            {userActionLoading === `suspend-${u.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Ban size={14} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateUser(u)}
                            disabled={userActionLoading === `activate-${u.id}`}
                            className="p-2 rounded-lg hover:bg-green-50 text-[#666] hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Activate"
                          >
                            {userActionLoading === `activate-${u.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={userActionLoading === `reset-${u.id}`}
                          className="p-2 rounded-lg hover:bg-blue-50 text-[#666] hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reset Password"
                        >
                          {userActionLoading === `reset-${u.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Key size={14} />
                          )}
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors"
                          title="More"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalUsers > pageSize && (
          <div className="p-4 border-t border-[#F2F1EA] flex items-center justify-between">
            <p className="text-sm text-[#666]">
              Page {currentPage} of {maxPages} • Showing {(users || []).length} of {totalUsers} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-[#F8F8F6] text-sm font-medium hover:bg-[#F2F1EA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= maxPages}
                className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminUsersTab;
