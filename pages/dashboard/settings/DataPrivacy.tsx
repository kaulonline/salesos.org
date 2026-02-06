import React, { useState } from 'react';
import {
  Download,
  Trash2,
  Shield,
  FileJson,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Building2,
  Mail,
  UserCog
} from 'lucide-react';
import { useAuth } from '../../../src/context/AuthContext';

interface ExportStatus {
  status: 'idle' | 'processing' | 'ready' | 'error';
  downloadUrl?: string;
  error?: string;
  requestedAt?: string;
}

interface DeleteAccountStatus {
  status: 'idle' | 'confirming' | 'processing' | 'scheduled';
  scheduledDate?: string;
}

export default function DataPrivacy() {
  const { user } = useAuth();
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ status: 'idle' });
  const [deleteStatus, setDeleteStatus] = useState<DeleteAccountStatus>({ status: 'idle' });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleRequestExport = async () => {
    setExportStatus({ status: 'processing' });

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, this would call your API:
      // const response = await api.post('/api/gdpr/export-request');

      setExportStatus({
        status: 'ready',
        downloadUrl: '/api/gdpr/export/download',
        requestedAt: new Date().toISOString(),
      });
    } catch {
      setExportStatus({
        status: 'error',
        error: 'Failed to generate data export. Please try again later.',
      });
    }
  };

  const handleDownloadExport = () => {
    if (exportStatus.downloadUrl) {
      // In production, trigger actual download
      const link = document.createElement('a');
      link.href = exportStatus.downloadUrl;
      link.download = `salesos-data-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };

  const handleInitiateDelete = () => {
    setDeleteStatus({ status: 'confirming' });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      return;
    }

    setDeleteStatus({ status: 'processing' });

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production: await api.post('/api/gdpr/delete-request');

      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 30);

      setDeleteStatus({
        status: 'scheduled',
        scheduledDate: scheduledDate.toISOString(),
      });
    } catch {
      setDeleteStatus({ status: 'idle' });
    }
  };

  const handleCancelDelete = () => {
    setDeleteStatus({ status: 'idle' });
    setDeleteConfirmation('');
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#1A1A1A]" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-[#1A1A1A]">Data & Privacy</h1>
              <p className="text-[#666]">Manage your personal data and privacy settings</p>
            </div>
          </div>
        </div>

        {/* Your Data Summary */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Your Account Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl">
              <User className="w-5 h-5 text-[#999]" />
              <div>
                <p className="text-sm text-[#666]">Name</p>
                <p className="font-medium text-[#1A1A1A]">{user?.name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl">
              <Mail className="w-5 h-5 text-[#999]" />
              <div>
                <p className="text-sm text-[#666]">Email</p>
                <p className="font-medium text-[#1A1A1A]">{user?.email || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl">
              <Building2 className="w-5 h-5 text-[#999]" />
              <div>
                <p className="text-sm text-[#666]">Organization</p>
                <p className="font-medium text-[#1A1A1A]">{user?.organizationId || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[#F8F8F6] rounded-xl">
              <UserCog className="w-5 h-5 text-[#999]" />
              <div>
                <p className="text-sm text-[#666]">Role</p>
                <p className="font-medium text-[#1A1A1A]">{user?.role || 'Not set'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Your Data */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Download className="w-5 h-5 text-[#93C01F]" />
                Export Your Data
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Download a copy of all your personal data in JSON format
              </p>
            </div>
          </div>

          <div className="bg-[#F8F8F6] rounded-xl p-4 mb-4">
            <p className="text-sm text-[#666]">
              Your export will include:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[#666]">
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#999]" />
                Profile information and preferences
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#999]" />
                Contacts, leads, and deals you've created
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#999]" />
                Activities, notes, and communication logs
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[#999]" />
                Quotes and orders
              </li>
            </ul>
          </div>

          {exportStatus.status === 'idle' && (
            <button
              onClick={handleRequestExport}
              className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Request Data Export
            </button>
          )}

          {exportStatus.status === 'processing' && (
            <div className="flex items-center gap-3 text-[#666]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating your data export...</span>
            </div>
          )}

          {exportStatus.status === 'ready' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#93C01F]">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Your data export is ready!</span>
              </div>
              <button
                onClick={handleDownloadExport}
                className="px-5 py-2.5 bg-[#93C01F] text-white rounded-full text-sm font-medium hover:bg-[#7BA019] transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Export (JSON)
              </button>
            </div>
          )}

          {exportStatus.status === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>{exportStatus.error}</span>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-red-100 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Delete Account
              </h2>
              <p className="text-sm text-[#666] mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
          </div>

          {deleteStatus.status === 'idle' && (
            <>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">This action cannot be undone</p>
                    <p>
                      Deleting your account will permanently remove all your data, including contacts,
                      deals, quotes, and activity history. You will have 30 days to cancel the deletion
                      request.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleInitiateDelete}
                className="px-5 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </button>
            </>
          )}

          {deleteStatus.status === 'confirming' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium mb-2">
                  Type "DELETE MY ACCOUNT" to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-5 py-2.5 border border-gray-200 text-[#666] rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmation !== 'DELETE MY ACCOUNT'}
                  className="px-5 py-2.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirm Deletion
                </button>
              </div>
            </div>
          )}

          {deleteStatus.status === 'processing' && (
            <div className="flex items-center gap-3 text-[#666]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing deletion request...</span>
            </div>
          )}

          {deleteStatus.status === 'scheduled' && (
            <div className="bg-[#EAD07D]/10 border border-[#EAD07D]/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#1A1A1A] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Deletion Scheduled</p>
                  <p className="text-sm text-[#666]">
                    Your account will be permanently deleted on{' '}
                    <strong>
                      {deleteStatus.scheduledDate
                        ? new Date(deleteStatus.scheduledDate).toLocaleDateString()
                        : '30 days from now'}
                    </strong>
                    . You can cancel this request by contacting support before that date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Privacy Rights */}
        <div className="bg-[#F8F8F6] rounded-[24px] p-6">
          <h3 className="font-medium text-[#1A1A1A] mb-3">Your Privacy Rights</h3>
          <p className="text-sm text-[#666] mb-4">
            Under GDPR and other privacy regulations, you have the right to:
          </p>
          <ul className="space-y-2 text-sm text-[#666]">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#93C01F] flex-shrink-0 mt-0.5" />
              <span><strong>Access</strong> - Request a copy of your personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#93C01F] flex-shrink-0 mt-0.5" />
              <span><strong>Rectification</strong> - Correct inaccurate personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#93C01F] flex-shrink-0 mt-0.5" />
              <span><strong>Erasure</strong> - Request deletion of your personal data</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#93C01F] flex-shrink-0 mt-0.5" />
              <span><strong>Portability</strong> - Receive your data in a machine-readable format</span>
            </li>
          </ul>
          <p className="text-sm text-[#666] mt-4">
            For questions about your privacy rights, contact us at{' '}
            <a href="mailto:privacy@salesos.org" className="text-[#1A1A1A] hover:text-[#93C01F] font-medium">
              privacy@salesos.org
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
