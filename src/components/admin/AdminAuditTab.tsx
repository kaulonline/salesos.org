import React, { useState, useMemo } from 'react';
import { Clock, Download, Filter, Activity, User, Settings, Database } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate, downloadCSV } from '../../utils/formatting';

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  createdAt: string;
}

interface AdminAuditTabProps {
  logs?: AuditLog[] | null;
  loading: boolean;
}

const ACTION_CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'user', label: 'User Actions' },
  { value: 'auth', label: 'Authentication' },
  { value: 'crm', label: 'CRM Changes' },
  { value: 'admin', label: 'Admin Actions' },
  { value: 'billing', label: 'Billing' },
];

const getActionIcon = (action: string) => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('user') || actionLower.includes('login')) {
    return <User size={14} className="text-blue-500" />;
  }
  if (actionLower.includes('setting') || actionLower.includes('config')) {
    return <Settings size={14} className="text-purple-500" />;
  }
  if (actionLower.includes('create') || actionLower.includes('update') || actionLower.includes('delete')) {
    return <Database size={14} className="text-green-500" />;
  }
  return <Activity size={14} className="text-[#666]" />;
};

const getActionBadgeVariant = (action: string): 'green' | 'yellow' | 'red' | 'outline' => {
  const actionLower = action.toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('success')) return 'green';
  if (actionLower.includes('update') || actionLower.includes('change')) return 'yellow';
  if (actionLower.includes('delete') || actionLower.includes('fail') || actionLower.includes('error')) return 'red';
  return 'outline';
};

export function AdminAuditTab({ logs, loading }: AdminAuditTabProps) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!logs || filterCategory === 'all') return logs;
    return logs.filter((log) => {
      const actionLower = log.action.toLowerCase();
      switch (filterCategory) {
        case 'user':
          return actionLower.includes('user') || log.resourceType === 'User';
        case 'auth':
          return actionLower.includes('login') || actionLower.includes('logout') || actionLower.includes('auth');
        case 'crm':
          return ['Lead', 'Contact', 'Account', 'Opportunity', 'Quote', 'Order'].includes(log.resourceType);
        case 'admin':
          return actionLower.includes('admin') || actionLower.includes('config') || actionLower.includes('setting');
        case 'billing':
          return actionLower.includes('billing') || actionLower.includes('payment') || actionLower.includes('subscription');
        default:
          return true;
      }
    });
  }, [logs, filterCategory]);

  const handleExport = () => {
    if (!logs || logs.length === 0) return;

    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details'];
    const rows = logs.map((l) => [
      formatDate(l.createdAt),
      l.user?.name || l.user?.email || 'System',
      l.action,
      l.resourceType,
      l.details || '',
    ]);

    downloadCSV(headers, rows, 'audit_logs');
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
            <Clock size={20} className="text-[#EAD07D]" />
            Audit Log
          </h2>
          <p className="text-sm text-[#666]">Track all system and user activities</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] hover:bg-[#F2F1EA] transition-colors flex items-center gap-2 text-sm font-medium text-[#666]"
            >
              <Filter size={14} />
              {ACTION_CATEGORIES.find((c) => c.value === filterCategory)?.label}
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#F2F1EA] z-10 py-1">
                {ACTION_CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => {
                      setFilterCategory(category.value);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F8F8F6] ${
                      filterCategory === category.value ? 'text-[#1A1A1A] font-medium' : 'text-[#666]'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={!logs || logs.length === 0}
            className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Timestamp</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Action</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Resource</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F1EA]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-4 px-6">
                      <Skeleton className="h-10 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : (filteredLogs || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666]">
                    <div className="flex flex-col items-center">
                      <Clock size={40} className="text-[#999] mb-3 opacity-40" />
                      <p>No audit logs found</p>
                      {filterCategory !== 'all' && (
                        <button
                          onClick={() => setFilterCategory('all')}
                          className="mt-2 text-sm text-[#EAD07D] hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                (filteredLogs || []).map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-4 px-6 text-sm text-[#666] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F8F8F6] flex items-center justify-center">
                          <User size={12} className="text-[#666]" />
                        </div>
                        <span className="text-sm text-[#1A1A1A] font-medium">
                          {log.user?.name || log.user?.email || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#F8F8F6] flex items-center justify-center">
                          {getActionIcon(log.action)}
                        </div>
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#666]">{log.resourceType}</span>
                      {log.resourceId && (
                        <span className="text-xs text-[#999] ml-1">#{log.resourceId.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-[#666] max-w-xs truncate block" title={log.details || ''}>
                        {log.details || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(filteredLogs || []).length > 0 && (
          <div className="p-4 border-t border-[#F2F1EA] text-center">
            <p className="text-sm text-[#666]">
              Showing {(filteredLogs || []).length} entries
              {filterCategory !== 'all' && ` (filtered by ${ACTION_CATEGORIES.find((c) => c.value === filterCategory)?.label})`}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminAuditTab;
