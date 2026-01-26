import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  GitCompare,
  Eye,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useQuoteVersions, useCompareQuoteVersions } from '../../hooks/useQuoteVersions';
import { VersionCompare } from './VersionCompare';
import type { QuoteVersion } from '../../types';

interface QuoteVersionHistoryProps {
  quoteId: string;
  currentTotal?: number;
  onRestore?: (version: QuoteVersion) => void;
}

export function QuoteVersionHistory({ quoteId, currentTotal, onRestore }: QuoteVersionHistoryProps) {
  const {
    versions,
    loading,
    error,
    refetch,
    createVersion,
    restoreVersion,
    isCreating,
    isRestoring,
  } = useQuoteVersions(quoteId);
  const { compare, comparison, isComparing, reset: resetComparison } = useCompareQuoteVersions(quoteId);

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [restoreDialog, setRestoreDialog] = useState<QuoteVersion | null>(null);
  const [compareDialog, setCompareDialog] = useState(false);
  const [viewVersion, setViewVersion] = useState<QuoteVersion | null>(null);

  const handleToggleSelect = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  const handleCreateVersion = async () => {
    try {
      await createVersion({ description: 'Manual snapshot' });
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog) return;
    try {
      await restoreVersion({
        versionId: restoreDialog.id,
        createBackup: true,
      });
      setRestoreDialog(null);
      onRestore?.(restoreDialog);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;
    try {
      await compare(selectedVersions[0], selectedVersions[1]);
      setCompareDialog(true);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCloseCompare = () => {
    setCompareDialog(false);
    resetComparison();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
        <span className="text-red-700">{error}</span>
        <button
          onClick={() => refetch()}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
          <Badge variant="secondary">{versions.length}</Badge>
        </div>
        <div className="flex gap-2">
          {selectedVersions.length === 2 && (
            <button
              onClick={handleCompare}
              disabled={isComparing}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
              Compare Selected
            </button>
          )}
          <button
            onClick={handleCreateVersion}
            disabled={isCreating}
            className="px-3 py-1.5 text-sm bg-[#1C1C1C] text-white rounded-lg hover:bg-[#2C2C2C] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Snapshot
          </button>
        </div>
      </div>

      {versions.length === 0 ? (
        <Card className="border border-gray-200">
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700">No Versions Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create a snapshot to track changes over time</p>
            <button
              onClick={handleCreateVersion}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Snapshot
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {versions.map((version, index) => {
            const isSelected = selectedVersions.includes(version.id);
            const isLatest = index === 0;

            return (
              <Card
                key={version.id}
                className={`border cursor-pointer transition-colors ${
                  isSelected ? 'border-[#1C1C1C] bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleToggleSelect(version.id)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                      isLatest ? 'bg-[#1C1C1C] text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {version.versionNumber}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">Version {version.versionNumber}</span>
                      {isLatest && <Badge variant="default">Latest</Badge>}
                      {isSelected && <Badge variant="outline">Selected</Badge>}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {version.createdBy?.name || 'System'}
                      </span>
                      <span>{format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      <span>({formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })})</span>
                    </div>

                    {version.description && (
                      <p className="text-sm text-gray-500 mt-1">{version.description}</p>
                    )}

                    {version.snapshot && (
                      <div className="flex gap-4 mt-1 text-sm text-gray-500">
                        <span>Total: ${version.snapshot.total?.toLocaleString() || '0'}</span>
                        <span>Items: {version.snapshot.lineItems?.length || 0}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewVersion(version);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!isLatest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRestoreDialog(version);
                        }}
                        className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Restore This Version"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {restoreDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Restore Version {restoreDialog.versionNumber}?
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                This will replace the current quote data with this version's snapshot.
                A backup of the current state will be created automatically.
              </p>
            </div>

            {restoreDialog.snapshot && (
              <div className="space-y-2 mb-4">
                <h4 className="font-medium text-gray-700 text-sm">Version Details:</h4>
                <p className="text-sm text-gray-600">Total: ${restoreDialog.snapshot.total?.toLocaleString() || '0'}</p>
                <p className="text-sm text-gray-600">Line Items: {restoreDialog.snapshot.lineItems?.length || 0}</p>
                <p className="text-sm text-gray-600">Created: {format(new Date(restoreDialog.createdAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRestoreDialog(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isRestoring && <Loader2 className="w-4 h-4 animate-spin" />}
                <RotateCcw className="w-4 h-4" />
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Details Dialog */}
      {viewVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Version {viewVersion.versionNumber} Details
              </h3>
              <button
                onClick={() => setViewVersion(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <VersionDetails version={viewVersion} />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewVersion(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Dialog */}
      {compareDialog && comparison && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
              <button
                onClick={handleCloseCompare}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <VersionCompare comparison={comparison} />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseCompare}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VersionDetailsProps {
  version: QuoteVersion;
}

function VersionDetails({ version }: VersionDetailsProps) {
  const { snapshot } = version;

  if (!snapshot) {
    return <p className="text-gray-500">No snapshot data available.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Status</p>
          <Badge variant="secondary">{snapshot.status}</Badge>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Quote Number</p>
          <p className="text-gray-900">{snapshot.quoteNumber || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Subtotal</p>
          <p className="text-gray-900">${snapshot.subtotal?.toLocaleString() || '0'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Discount</p>
          <p className="text-gray-900">${snapshot.discount?.toLocaleString() || '0'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Tax</p>
          <p className="text-gray-900">${snapshot.tax?.toLocaleString() || '0'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="text-gray-900 font-semibold">${snapshot.total?.toLocaleString() || '0'}</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Line Items ({snapshot.lineItems?.length || 0})
        </h4>

        {snapshot.lineItems && snapshot.lineItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Discount</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.lineItems.map((item, index) => (
                  <tr key={item.id || index} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-900">{item.productName || item.productId}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-gray-600">${item.unitPrice?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-600">${item.discount?.toLocaleString() || '0'}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-medium">${item.totalPrice?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No line items in this version.</p>
        )}
      </div>
    </div>
  );
}

export default QuoteVersionHistory;
