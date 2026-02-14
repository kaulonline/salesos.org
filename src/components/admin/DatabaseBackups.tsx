import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Download, Trash2, RefreshCw, Clock, HardDrive, CheckCircle2,
  XCircle, Loader2, Plus, Calendar, AlertTriangle, Archive, Settings2,
  Play, Pause, FileArchive
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useToast } from '../ui/Toast';
import adminApi, {
  DatabaseBackup,
  BackupSchedule,
  BackupStats,
  BackupStatus,
  BackupType
} from '../../api/admin';

// Format bytes to human readable
const formatBytes = (bytes: string | number): string => {
  const b = Number(bytes);
  if (b === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration
const formatDuration = (ms?: number): string => {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Format date/time
const formatDateTime = (date?: string): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Status badge component
const StatusBadge: React.FC<{ status: BackupStatus }> = ({ status }) => {
  const config: Record<BackupStatus, { variant: 'green' | 'yellow' | 'red' | 'outline' | 'dark'; icon: React.ReactNode }> = {
    PENDING: { variant: 'yellow', icon: <Clock size={12} /> },
    IN_PROGRESS: { variant: 'yellow', icon: <Loader2 size={12} className="animate-spin" /> },
    COMPLETED: { variant: 'green', icon: <CheckCircle2 size={12} /> },
    FAILED: { variant: 'red', icon: <XCircle size={12} /> },
    DELETED: { variant: 'outline', icon: <Trash2 size={12} /> },
  };
  const { variant, icon } = config[status] || { variant: 'outline', icon: null };
  return (
    <Badge variant={variant} size="sm" className="gap-1">
      {icon}
      {status}
    </Badge>
  );
};

// Type badge component
const TypeBadge: React.FC<{ type: BackupType }> = ({ type }) => {
  const variants: Record<BackupType, 'dark' | 'outline'> = {
    FULL: 'dark',
    INCREMENTAL: 'outline',
    SCHEMA_ONLY: 'outline',
    DATA_ONLY: 'outline',
  };
  return <Badge variant={variants[type] || 'outline'} size="sm">{type.replace('_', ' ')}</Badge>;
};

export const DatabaseBackups: React.FC = () => {
  const { showToast } = useToast();

  // State
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Create backup form state
  const [newBackup, setNewBackup] = useState({
    type: 'FULL' as BackupType,
    description: '',
    compressed: true,
    retentionDays: 30,
  });

  // Create schedule form state
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    cronExpression: '0 2 * * *',
    backupType: 'FULL' as BackupType,
    retentionDays: 30,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [backupsRes, statsRes, schedulesRes] = await Promise.all([
        adminApi.getBackups({ limit: 20 }),
        adminApi.getBackupStats(),
        adminApi.getBackupSchedules(),
      ]);
      setBackups(backupsRes.backups);
      setStats(statsRes);
      setSchedules(schedulesRes);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      showToast({ type: 'error', title: 'Failed to load backups' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create backup
  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await adminApi.createBackup(newBackup);
      showToast({ type: 'success', title: 'Backup initiated successfully' });
      setShowCreateModal(false);
      setNewBackup({ type: 'FULL', description: '', compressed: true, retentionDays: 30 });
      // Refresh after a short delay to show the new backup
      setTimeout(fetchData, 1000);
    } catch (error) {
      console.error('Failed to create backup:', error);
      showToast({ type: 'error', title: 'Failed to create backup' });
    } finally {
      setCreating(false);
    }
  };

  // Delete backup
  const handleDeleteBackup = async (id: string) => {
    try {
      await adminApi.deleteBackup(id);
      showToast({ type: 'success', title: 'Backup deleted successfully' });
      setShowDeleteModal(null);
      fetchData();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      showToast({ type: 'error', title: 'Failed to delete backup' });
    }
  };

  // Download backup
  const handleDownloadBackup = (backup: DatabaseBackup) => {
    if (backup.status !== 'COMPLETED') {
      showToast({ type: 'error', title: 'Backup is not available for download' });
      return;
    }
    const url = adminApi.downloadBackup(backup.id);
    window.open(url, '_blank');
  };

  // Cleanup expired backups
  const handleCleanup = async () => {
    try {
      const result = await adminApi.cleanupExpiredBackups();
      showToast({ type: 'success', title: `Cleaned up ${result.deleted} expired backup(s)` });
      fetchData();
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
      showToast({ type: 'error', title: 'Failed to cleanup backups' });
    }
  };

  // Create schedule
  const handleCreateSchedule = async () => {
    try {
      await adminApi.createBackupSchedule(newSchedule);
      showToast({ type: 'success', title: 'Schedule created successfully' });
      setShowScheduleModal(false);
      setNewSchedule({ name: '', cronExpression: '0 2 * * *', backupType: 'FULL', retentionDays: 30 });
      fetchData();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      showToast({ type: 'error', title: 'Failed to create schedule' });
    }
  };

  // Toggle schedule
  const handleToggleSchedule = async (schedule: BackupSchedule) => {
    try {
      await adminApi.updateBackupSchedule(schedule.id, { enabled: !schedule.enabled });
      showToast({ type: 'success', title: `Schedule ${schedule.enabled ? 'disabled' : 'enabled'}` });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      showToast({ type: 'error', title: 'Failed to update schedule' });
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (id: string) => {
    try {
      await adminApi.deleteBackupSchedule(id);
      showToast({ type: 'success', title: 'Schedule deleted' });
      fetchData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      showToast({ type: 'error', title: 'Failed to delete schedule' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Database size={20} className="text-[#1A1A1A]" />
            </div>
            <div>
              <p className="text-sm text-[#666]">Total Backups</p>
              <p className="text-2xl font-light text-[#1A1A1A]">{stats?.totalBackups || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#93C01F]" />
            </div>
            <div>
              <p className="text-sm text-[#666]">Completed</p>
              <p className="text-2xl font-light text-[#1A1A1A]">{stats?.completedBackups || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
              <HardDrive size={20} className="text-[#666]" />
            </div>
            <div>
              <p className="text-sm text-[#666]">Total Size</p>
              <p className="text-2xl font-light text-[#1A1A1A]">{formatBytes(stats?.totalSizeBytes || '0')}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-[#666]">Scheduled</p>
              <p className="text-2xl font-light text-[#1A1A1A]">{stats?.scheduledBackups || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-medium text-[#1A1A1A]">Database Backups</h2>
          <p className="text-sm text-[#666]">Manage database backups and schedules</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCleanup}
            className="px-4 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm flex items-center gap-2"
          >
            <Trash2 size={16} />
            Cleanup Expired
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm flex items-center gap-2"
          >
            <Clock size={16} />
            Add Schedule
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Create Backup
          </button>
        </div>
      </div>

      {/* Schedules */}
      {schedules.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
            <Settings2 size={18} />
            Backup Schedules
          </h3>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 rounded-xl bg-[#F8F8F6]"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    schedule.enabled ? 'bg-[#93C01F]/20' : 'bg-[#F0EBD8]'
                  }`}>
                    {schedule.enabled ? (
                      <Play size={18} className="text-[#93C01F]" />
                    ) : (
                      <Pause size={18} className="text-[#999]" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{schedule.name}</p>
                    <p className="text-sm text-[#666]">
                      {schedule.cronExpression} • {schedule.backupType} • {schedule.retentionDays} days retention
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSchedule(schedule)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      schedule.enabled
                        ? 'bg-[#93C01F]/20 text-[#93C01F]'
                        : 'bg-[#F0EBD8] text-[#666]'
                    }`}
                  >
                    {schedule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="p-2 text-[#999] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Backups List */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-black/5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Archive size={18} />
              Recent Backups
            </h3>
            <button
              onClick={fetchData}
              className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <FileArchive size={48} className="mx-auto mb-4 text-[#999] opacity-40" />
            <p className="text-[#666]">No backups yet</p>
            <p className="text-sm text-[#999]">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="p-4 hover:bg-[#F8F8F6] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                      <Database size={18} className="text-[#666]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1A1A1A]">{backup.filename}</p>
                        <StatusBadge status={backup.status} />
                        <TypeBadge type={backup.type} />
                        {backup.compressed && (
                          <Badge variant="outline" size="sm">Compressed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[#666]">
                        <span>{formatDateTime(backup.createdAt)}</span>
                        {backup.status === 'COMPLETED' && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(backup.size)}</span>
                            <span>•</span>
                            <span>{formatDuration(backup.duration)}</span>
                          </>
                        )}
                        {backup.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{backup.description}</span>
                          </>
                        )}
                      </div>
                      {backup.status === 'FAILED' && backup.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {backup.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {backup.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleDownloadBackup(backup)}
                        className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(backup.id)}
                      className="p-2 text-[#666] hover:text-red-500 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">Create Backup</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#666] hover:text-[#1A1A1A]"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-8 pt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Backup Type</label>
                <select
                  value={newBackup.type}
                  onChange={(e) => setNewBackup({ ...newBackup, type: e.target.value as BackupType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="FULL">Full Backup</option>
                  <option value="SCHEMA_ONLY">Schema Only</option>
                  <option value="DATA_ONLY">Data Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={newBackup.description}
                  onChange={(e) => setNewBackup({ ...newBackup, description: e.target.value })}
                  placeholder="e.g., Pre-deployment backup"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Retention (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={newBackup.retentionDays}
                  onChange={(e) => setNewBackup({ ...newBackup, retentionDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newBackup.compressed}
                  onChange={(e) => setNewBackup({ ...newBackup, compressed: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                />
                <span className="text-sm text-[#666]">Compress backup (recommended)</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-[#F8F8F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBackup}
                  disabled={creating}
                  className="flex-1 py-3 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      Create Backup
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">Create Schedule</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-[#666] hover:text-[#1A1A1A]"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-8 pt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Schedule Name</label>
                <input
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="e.g., Daily Backup"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Cron Expression</label>
                <input
                  type="text"
                  value={newSchedule.cronExpression}
                  onChange={(e) => setNewSchedule({ ...newSchedule, cronExpression: e.target.value })}
                  placeholder="0 2 * * *"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-mono"
                />
                <p className="text-xs text-[#999] mt-1">Default: 0 2 * * * (2 AM daily)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Backup Type</label>
                <select
                  value={newSchedule.backupType}
                  onChange={(e) => setNewSchedule({ ...newSchedule, backupType: e.target.value as BackupType })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="FULL">Full Backup</option>
                  <option value="SCHEMA_ONLY">Schema Only</option>
                  <option value="DATA_ONLY">Data Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Retention (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={newSchedule.retentionDays}
                  onChange={(e) => setNewSchedule({ ...newSchedule, retentionDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-[#F8F8F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  disabled={!newSchedule.name}
                  className="flex-1 py-3 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => { if (showDeleteModal) handleDeleteBackup(showDeleteModal); }}
        title="Delete Backup"
        message="Are you sure you want to delete this backup? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default DatabaseBackups;
