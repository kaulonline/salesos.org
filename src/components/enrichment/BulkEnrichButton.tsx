import React, { useState } from 'react';
import { Database, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { useBulkEnrich } from '../../hooks/useEnrichment';
import { BulkEnrichmentResult, EnrichmentProvider, EntityType } from '../../api/enrichment';
import { useToast } from '../ui/Toast';

interface BulkEnrichButtonProps {
  entityType: EntityType;
  selectedIds: string[];
  onComplete?: (result: BulkEnrichmentResult) => void;
  provider?: EnrichmentProvider;
  className?: string;
}

export const BulkEnrichButton: React.FC<BulkEnrichButtonProps> = ({
  entityType,
  selectedIds,
  onComplete,
  provider,
  className = '',
}) => {
  const { showToast } = useToast();
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<BulkEnrichmentResult | null>(null);

  const { mutate: bulkEnrich, isPending } = useBulkEnrich();

  const handleBulkEnrich = () => {
    if (selectedIds.length === 0) return;

    bulkEnrich(
      { entityType, entityIds: selectedIds, provider },
      {
        onSuccess: (data) => {
          setResult(data);
          setShowResultModal(true);
          if (onComplete) {
            onComplete(data);
          }
        },
        onError: (error) => {
          console.error('Failed to bulk enrich:', error);
          showToast({ type: 'error', title: 'Bulk Enrichment Failed', message: (error as Error).message || 'Please try again' });
        },
      }
    );
  };

  const entityLabel = entityType === 'lead' ? 'leads' : entityType === 'contact' ? 'contacts' : 'accounts';

  return (
    <>
      <button
        onClick={handleBulkEnrich}
        disabled={isPending || selectedIds.length === 0}
        className={`flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Database size={16} />
        )}
        {isPending ? 'Enriching...' : `Enrich ${selectedIds.length} ${entityLabel}`}
      </button>

      {/* Result Modal */}
      {showResultModal && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  result.success ? 'bg-[#93C01F]/20' : 'bg-red-100'
                }`}>
                  {result.success ? (
                    <Check size={20} className="text-[#93C01F]" />
                  ) : (
                    <AlertCircle size={20} className="text-red-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">
                    Bulk Enrichment {result.success ? 'Complete' : 'Partial'}
                  </h2>
                  <p className="text-sm text-[#666]">
                    {result.totalEnriched} of {result.totalRequested} records enriched
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResultModal(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#F8F8F6] rounded-xl text-center">
                  <p className="text-2xl font-light text-[#1A1A1A]">{result.totalRequested}</p>
                  <p className="text-xs text-[#666]">Requested</p>
                </div>
                <div className="p-3 bg-[#93C01F]/20 rounded-xl text-center">
                  <p className="text-2xl font-light text-[#93C01F]">{result.totalEnriched}</p>
                  <p className="text-xs text-[#666]">Enriched</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl text-center">
                  <p className="text-2xl font-light text-red-500">{result.totalFailed}</p>
                  <p className="text-xs text-[#666]">Failed</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#93C01F] rounded-full transition-all duration-500"
                  style={{ width: `${(result.totalEnriched / result.totalRequested) * 100}%` }}
                />
              </div>

              {/* Failed records */}
              {result.totalFailed > 0 && (
                <div className="max-h-32 overflow-auto">
                  <p className="text-sm font-medium text-[#1A1A1A] mb-2">Failed Records</p>
                  <ul className="space-y-1">
                    {result.results
                      .filter((r) => !r.success)
                      .map((r) => (
                        <li key={r.entityId} className="flex items-center gap-2 text-sm text-[#666]">
                          <AlertCircle size={12} className="text-red-500" />
                          {r.entityId}: {r.error || 'Unknown error'}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkEnrichButton;
