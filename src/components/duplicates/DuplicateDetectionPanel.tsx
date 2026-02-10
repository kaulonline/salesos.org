import React, { useState } from 'react';
import { AlertTriangle, X, GitMerge, Search } from 'lucide-react';
import { useDuplicateSets } from '../../hooks/useDuplicates';
import { MergeModal } from './MergeModal';

interface DuplicateDetectionPanelProps {
  entityType: string;
  entityId: string;
}

export const DuplicateDetectionPanel: React.FC<DuplicateDetectionPanelProps> = ({ entityType, entityId }) => {
  const { duplicateSets, loading, dismiss, isDismissing, scan, isScanning } = useDuplicateSets(entityType, 'OPEN');
  const [mergeSetId, setMergeSetId] = useState<string | null>(null);

  // Filter to only sets that include this entity
  const relevantSets = duplicateSets.filter(set =>
    set.members.some(m => m.entityId === entityId)
  );

  if (loading || relevantSets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-[#EAD07D]/10 border border-[#EAD07D]/30 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-[#EAD07D]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Potential Duplicates Detected</h3>
          <span className="px-2 py-0.5 bg-[#EAD07D]/20 rounded-full text-xs font-semibold text-[#1A1A1A]">
            {relevantSets.length}
          </span>
          <button
            onClick={() => scan({ entityType, entityId })}
            disabled={isScanning}
            className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#666] hover:text-[#1A1A1A] border border-black/10 rounded-full hover:bg-white transition-colors"
          >
            <Search size={12} />
            {isScanning ? 'Scanning...' : 'Re-scan'}
          </button>
        </div>

        <div className="space-y-3">
          {relevantSets.map((set) => {
            const otherMembers = set.members.filter(m => m.entityId !== entityId);
            return (
              <div
                key={set.id}
                className="bg-white rounded-xl p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {otherMembers.length} matching record{otherMembers.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      set.confidence >= 0.9
                        ? 'bg-red-100 text-red-700'
                        : set.confidence >= 0.7
                        ? 'bg-[#EAD07D]/20 text-[#1A1A1A]'
                        : 'bg-[#F8F8F6] text-[#666]'
                    }`}>
                      {Math.round(set.confidence * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-[#666]">{set.matchReason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMergeSetId(set.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1A1A] text-white rounded-full text-xs font-medium hover:bg-[#333] transition-colors"
                  >
                    <GitMerge size={12} />
                    Merge
                  </button>
                  <button
                    onClick={() => dismiss(set.id)}
                    disabled={isDismissing}
                    className="p-1.5 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-full transition-colors"
                    title="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mergeSetId && (
        <MergeModal
          duplicateSetId={mergeSetId}
          entityType={entityType}
          onClose={() => setMergeSetId(null)}
        />
      )}
    </>
  );
};
