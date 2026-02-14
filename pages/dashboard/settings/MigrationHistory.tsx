import { useState } from 'react';
import { FileText, Download, Trash2, X, CheckCircle2, AlertCircle, Loader2, Clock, Filter } from 'lucide-react';
import { useMigrationHistory, useMigrationStats, useDeleteMigration } from '../../../src/hooks/useMigrations';
import type { MigrationStatus } from '../../../src/api/migrations';

const STATUS_COLORS: Record<MigrationStatus, string> = {
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-[#93C01F]/20 text-[#93C01F]',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-[#F8F8F6] text-[#666]',
};

const STATUS_ICONS: Record<MigrationStatus, any> = {
  PENDING: Clock,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: AlertCircle,
  CANCELLED: X,
};

const CRM_NAMES: Record<string, string> = {
  salesforce: 'Salesforce',
  hubspot: 'HubSpot',
  pipedrive: 'Pipedrive',
  zoho: 'Zoho CRM',
  monday: 'Monday.com',
  unknown: 'Unknown',
};

const ENTITY_NAMES: Record<string, string> = {
  LEAD: 'Leads',
  CONTACT: 'Contacts',
  ACCOUNT: 'Accounts',
  OPPORTUNITY: 'Opportunities',
};

export default function MigrationHistory() {
  const [selectedCRM, setSelectedCRM] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: historyData, isLoading } = useMigrationHistory({
    sourceCRM: selectedCRM || undefined,
    entityType: selectedEntity || undefined,
    status: selectedStatus as MigrationStatus | undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: stats } = useMigrationStats();
  const deleteMutation = useDeleteMigration();

  const handleDelete = async (migrationId: string) => {
    if (!confirm('Are you sure you want to delete this migration record? This cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(migrationId);
    } catch (error) {
      alert('Failed to delete migration');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Migration History</h1>
            <p className="text-[#666] mt-1">View and manage your CRM data imports</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/settings/migration'}
            className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
          >
            New Migration
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#666]">Total Migrations</p>
                <FileText size={20} className="text-[#999]" />
              </div>
              <p className="text-3xl font-light text-[#1A1A1A]">{stats.totalMigrations}</p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#666]">Completed</p>
                <CheckCircle2 size={20} className="text-[#93C01F]" />
              </div>
              <p className="text-3xl font-light text-[#93C01F]">{stats.completed}</p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#666]">Records Imported</p>
                <Download size={20} className="text-[#999]" />
              </div>
              <p className="text-3xl font-light text-[#1A1A1A]">
                {stats.totalRecordsImported.toLocaleString()}
              </p>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#666]">In Progress</p>
                <Loader2 size={20} className="text-blue-600" />
              </div>
              <p className="text-3xl font-light text-blue-600">{stats.inProgress}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-4">
            <Filter size={18} className="text-[#666]" />
            <h3 className="font-medium text-[#1A1A1A]">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[#666] mb-2">Source CRM</label>
              <select
                value={selectedCRM}
                onChange={(e) => {
                  setSelectedCRM(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                <option value="">All CRMs</option>
                {Object.entries(CRM_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#666] mb-2">Entity Type</label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(ENTITY_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#666] mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(0);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Migration History Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Date</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Source CRM</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Entity Type</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Status</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Records</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Duration</th>
                  <th className="px-6 py-4 text-left font-medium text-[#666]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 size={32} className="text-[#EAD07D] animate-spin mx-auto mb-3" />
                      <p className="text-[#666]">Loading migration history...</p>
                    </td>
                  </tr>
                ) : historyData?.migrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                      <p className="text-[#666]">No migrations found</p>
                      <p className="text-sm text-[#999]">Start your first migration to see it here</p>
                    </td>
                  </tr>
                ) : (
                  historyData?.migrations.map((migration) => {
                    const StatusIcon = STATUS_ICONS[migration.status];
                    return (
                      <tr key={migration.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                        <td className="px-6 py-4 text-[#1A1A1A]">
                          <div>
                            <p className="font-medium">{formatDate(migration.createdAt)}</p>
                            <p className="text-xs text-[#999]">{migration.user?.name || 'Unknown'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[#1A1A1A]">
                              {CRM_NAMES[migration.sourceCRM] || migration.sourceCRM}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-[#F0EBD8] rounded-full text-xs font-medium text-[#666]">
                            {ENTITY_NAMES[migration.entityType] || migration.entityType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${STATUS_COLORS[migration.status]}`}
                          >
                            <StatusIcon
                              size={14}
                              className={migration.status === 'IN_PROGRESS' ? 'animate-spin' : ''}
                            />
                            {migration.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#1A1A1A]">
                          <div>
                            <p className="font-medium">
                              {migration.successCount.toLocaleString()} / {migration.totalRows.toLocaleString()}
                            </p>
                            {migration.failedCount > 0 && (
                              <p className="text-xs text-red-600">{migration.failedCount} failed</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[#666]">
                          {formatDuration(migration.startedAt, migration.completedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {migration.errors && (migration.errors as any[]).length > 0 && (
                              <button
                                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors"
                                title="Download error report"
                              >
                                <Download size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(migration.id)}
                              disabled={deleteMutation.isPending}
                              className="p-2 text-[#666] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete migration"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyData && historyData.total > pageSize && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-black/5">
              <p className="text-sm text-[#666]">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, historyData.total)} of{' '}
                {historyData.total} migrations
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-lg border border-black/10 text-sm font-medium text-[#666] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= historyData.total}
                  className="px-4 py-2 rounded-lg border border-black/10 text-sm font-medium text-[#666] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
