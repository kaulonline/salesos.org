import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Database, Loader2, Check, X, RefreshCw, Eye } from 'lucide-react';
import { useEnrichLead, useEnrichContact, useEnrichAccount, usePreviewEnrichment } from '../../hooks/useEnrichment';
import { EnrichmentResult, EnrichmentPreview, EnrichmentProvider, EntityType } from '../../api/enrichment';

interface EnrichButtonProps {
  entityType: 'lead' | 'contact' | 'account';
  entityId: string;
  entityName: string;
  onEnriched?: (result: EnrichmentResult) => void;
  provider?: EnrichmentProvider;
  showPreview?: boolean;
  className?: string;
}

export const EnrichButton: React.FC<EnrichButtonProps> = ({
  entityType,
  entityId,
  entityName,
  onEnriched,
  provider,
  showPreview = true,
  className = '',
}) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<EnrichmentPreview | null>(null);
  const [enrichResult, setEnrichResult] = useState<EnrichmentResult | null>(null);

  const { mutate: enrichLead, isPending: isEnrichingLead } = useEnrichLead();
  const { mutate: enrichContact, isPending: isEnrichingContact } = useEnrichContact();
  const { mutate: enrichAccount, isPending: isEnrichingAccount } = useEnrichAccount();
  const { mutate: preview, isPending: isPreviewing } = usePreviewEnrichment();

  const isPending = isEnrichingLead || isEnrichingContact || isEnrichingAccount || isPreviewing;

  const handlePreview = () => {
    preview(
      { entityType, entityId, provider },
      {
        onSuccess: (data) => {
          setPreviewData(data);
          setShowPreviewModal(true);
        },
        onError: (error) => {
          console.error('Failed to preview enrichment:', error);
        },
      }
    );
  };

  const handleEnrich = (force?: boolean) => {
    const callbacks = {
      onSuccess: (result: EnrichmentResult) => {
        setEnrichResult(result);
        setShowPreviewModal(false);
        if (onEnriched) {
          onEnriched(result);
        }
      },
      onError: (error: Error) => {
        console.error('Failed to enrich:', error);
      },
    };

    switch (entityType) {
      case 'lead':
        enrichLead({ leadId: entityId, provider, force }, callbacks);
        break;
      case 'contact':
        enrichContact({ contactId: entityId, provider, force }, callbacks);
        break;
      case 'account':
        enrichAccount({ accountId: entityId, provider, force }, callbacks);
        break;
    }
  };

  const handleClick = () => {
    if (showPreview) {
      handlePreview();
    } else {
      handleEnrich();
    }
  };

  // If already enriched, show success state
  if (enrichResult?.success) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#93C01F]/20 text-[#93C01F] rounded-lg text-sm font-medium">
          <Check size={14} />
          Enriched
        </span>
        <button
          onClick={() => {
            setEnrichResult(null);
            handleClick();
          }}
          className="p-1.5 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
          title="Re-enrich"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Database size={14} />
        )}
        {isPending ? (isPreviewing ? 'Loading...' : 'Enriching...') : 'Enrich Data'}
      </button>

      {/* Preview Modal - rendered via portal to ensure proper centering */}
      {showPreviewModal && previewData && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <Eye size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">Enrichment Preview</h2>
                  <p className="text-sm text-[#666]">{entityName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {!previewData.wouldUpdate || previewData.wouldUpdate.length === 0 ? (
                <div className="text-center py-8">
                  <Database size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No new data available</p>
                  <p className="text-sm text-[#999]">This record is already up to date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl">
                    <span className="text-sm text-[#666]">Fields to update</span>
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {previewData.wouldUpdate?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(previewData.wouldUpdate || []).map((field) => (
                      <div key={field} className="p-3 border border-black/5 rounded-xl">
                        <div className="text-xs font-medium text-[#999] uppercase tracking-wide mb-1">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-[#999]">Current</span>
                            <p className="text-sm text-[#666] line-through">
                              {previewData.currentValues[field] || '(empty)'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-[#93C01F]">New</span>
                            <p className="text-sm text-[#1A1A1A] font-medium">
                              {typeof previewData.newValues[field] === 'object'
                                ? JSON.stringify(previewData.newValues[field])
                                : previewData.newValues[field]}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <span className="text-xs text-[#999]">
                      Provider: {previewData.provider}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-100">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 border border-gray-200 text-[#666] rounded-xl font-medium hover:bg-[#F8F8F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEnrich()}
                disabled={isPending || !previewData.wouldUpdate?.length}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Database size={16} />
                )}
                {isPending ? 'Enriching...' : 'Apply Enrichment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EnrichButton;
