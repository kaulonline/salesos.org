import React, { useState, useEffect } from 'react';
import { X, GitMerge } from 'lucide-react';
import { useDuplicateSet, useDuplicateSets } from '../../hooks/useDuplicates';
import { leadsApi } from '../../api/leads';
import type { Lead } from '../../types';
import { useToast } from '../ui/Toast';

interface MergeModalProps {
  duplicateSetId: string;
  entityType: string;
  onClose: () => void;
}

const LEAD_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
];

export const MergeModal: React.FC<MergeModalProps> = ({ duplicateSetId, entityType, onClose }) => {
  const { showToast } = useToast();
  const { duplicateSet, loading } = useDuplicateSet(duplicateSetId);
  const { merge, isMerging } = useDuplicateSets(entityType, 'OPEN');
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [survivorId, setSurvivorId] = useState<string>('');
  const [fieldSelections, setFieldSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!duplicateSet) return;

    const memberIds = duplicateSet.members.map(m => m.entityId);
    if (entityType === 'lead') {
      Promise.all(memberIds.map(id => leadsApi.getById(id).catch(() => null)))
        .then(results => {
          const valid = results.filter(Boolean) as Lead[];
          setRecords(valid);
          if (valid.length > 0) {
            const primary = duplicateSet.members.find(m => m.isPrimary);
            const defaultSurvivor = primary ? primary.entityId : valid[0].id;
            setSurvivorId(defaultSurvivor);
            // Default all fields to survivor
            const defaults: Record<string, string> = {};
            for (const field of LEAD_FIELDS) {
              defaults[field.key] = defaultSurvivor;
            }
            setFieldSelections(defaults);
          }
        })
        .finally(() => setLoadingRecords(false));
    }
  }, [duplicateSet, entityType]);

  const handleMerge = async () => {
    if (!duplicateSet || !survivorId) return;

    const mergedIds = duplicateSet.members
      .map(m => m.entityId)
      .filter(id => id !== survivorId);

    const fieldResolutions: Record<string, { sourceId: string; value: any }> = {};
    for (const field of LEAD_FIELDS) {
      const selectedSourceId = fieldSelections[field.key];
      if (selectedSourceId) {
        const sourceRecord = records.find(r => r.id === selectedSourceId);
        if (sourceRecord) {
          fieldResolutions[field.key] = {
            sourceId: selectedSourceId,
            value: sourceRecord[field.key],
          };
        }
      }
    }

    try {
      await merge({
        id: duplicateSetId,
        body: {
          survivorId,
          mergedIds,
          entityType,
          fieldResolutions,
        },
      });
      showToast({ type: 'success', title: 'Records Merged Successfully' });
      onClose();
    } catch (err) {
      console.error('Merge failed:', err);
      showToast({ type: 'error', title: 'Merge Failed', message: (err as Error).message || 'Please try again' });
    }
  };

  const fields = entityType === 'lead' ? LEAD_FIELDS : LEAD_FIELDS;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-8 pb-0">
          <div className="flex items-center gap-2">
            <GitMerge size={20} className="text-[#EAD07D]" />
            <h2 className="text-2xl font-medium text-[#1A1A1A]">Merge Records</h2>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-[#1A1A1A]">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 pt-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {(loading || loadingRecords) ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-[#F8F8F6] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : records.length < 2 ? (
            <p className="text-[#666] text-sm">Could not load enough records to merge.</p>
          ) : (
            <>
              {/* Survivor selection */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#1A1A1A] mb-2 block">
                  Primary Record (survivor)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {records.map(record => (
                    <button
                      key={record.id}
                      onClick={() => {
                        setSurvivorId(record.id);
                        // Reset field selections to new survivor
                        const newSelections: Record<string, string> = {};
                        for (const field of fields) {
                          newSelections[field.key] = record.id;
                        }
                        setFieldSelections(newSelections);
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        survivorId === record.id
                          ? 'border-[#EAD07D] bg-[#EAD07D]/10'
                          : 'border-black/10 hover:border-black/20'
                      }`}
                    >
                      <div className="text-sm font-medium text-[#1A1A1A]">
                        {record.firstName} {record.lastName}
                      </div>
                      <div className="text-xs text-[#666]">
                        {record.email || 'No email'} &middot; {record.company || 'No company'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field-by-field selection */}
              <div className="mb-6">
                <label className="text-sm font-medium text-[#1A1A1A] mb-3 block">
                  Choose values to keep for each field
                </label>
                <div className="space-y-2">
                  {fields.map(field => {
                    const values = records.map(r => ({
                      id: r.id,
                      value: r[field.key],
                      label: `${r.firstName} ${r.lastName}`,
                    })).filter(v => v.value != null && v.value !== '');

                    if (values.length <= 1) return null;

                    // Skip if all values are the same
                    const uniqueVals = [...new Set(values.map(v => String(v.value)))];
                    if (uniqueVals.length <= 1) return null;

                    return (
                      <div key={field.key} className="p-3 bg-[#F8F8F6] rounded-xl">
                        <div className="text-xs font-medium text-[#666] mb-2">{field.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {values.map(v => (
                            <button
                              key={v.id}
                              onClick={() => setFieldSelections(prev => ({ ...prev, [field.key]: v.id }))}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                fieldSelections[field.key] === v.id
                                  ? 'bg-[#1A1A1A] text-white'
                                  : 'bg-white border border-black/10 text-[#666] hover:border-black/20'
                              }`}
                            >
                              {String(v.value)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={isMerging || !survivorId}
                  className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {isMerging ? 'Merging...' : 'Merge Records'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
