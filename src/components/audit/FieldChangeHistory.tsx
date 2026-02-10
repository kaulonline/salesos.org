import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, User } from 'lucide-react';
import { adminApi, EntityFieldChange } from '../../api/admin';

interface FieldChangeHistoryProps {
  entityType: string;
  entityId: string;
}

function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function formatValue(val: string | null): string {
  if (val == null) return '(empty)';
  try {
    const parsed = JSON.parse(val);
    if (parsed === null || parsed === undefined) return '(empty)';
    if (typeof parsed === 'boolean') return parsed ? 'Yes' : 'No';
    if (typeof parsed === 'string') return parsed;
    if (parsed instanceof Object) return JSON.stringify(parsed);
    return String(parsed);
  } catch {
    return val;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const FieldChangeHistory: React.FC<FieldChangeHistoryProps> = ({ entityType, entityId }) => {
  const [changes, setChanges] = useState<EntityFieldChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    adminApi.getEntityFieldChanges(entityType, entityId)
      .then(setChanges)
      .catch(() => setChanges([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <History size={18} className="text-[#EAD07D]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Change History</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#F8F8F6] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <History size={18} className="text-[#EAD07D]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Change History</h3>
        </div>
        <div className="h-24 flex items-center justify-center text-center">
          <div>
            <History size={28} className="text-[#999] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[#666]">No changes recorded yet</p>
          </div>
        </div>
      </div>
    );
  }

  const displayChanges = expanded ? changes : changes.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#EAD07D]" />
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Change History</h3>
          <span className="px-2 py-0.5 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666]">
            {changes.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {displayChanges.map((change) => (
          <div
            key={change.id}
            className="flex items-start gap-3 p-3 bg-[#F8F8F6] rounded-xl"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EAD07D]/20 flex items-center justify-center shrink-0 mt-0.5">
              <User size={14} className="text-[#1A1A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {change.user?.name || 'System'}
                </span>
                <span className="text-xs text-[#999]">changed</span>
                <span className="px-2 py-0.5 bg-[#EAD07D]/20 rounded-full text-xs font-semibold text-[#1A1A1A]">
                  {formatFieldName(change.fieldName)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="text-[#999] line-through truncate max-w-[120px]">
                  {formatValue(change.oldValue)}
                </span>
                <span className="text-[#999]">&rarr;</span>
                <span className="text-[#1A1A1A] font-medium truncate max-w-[120px]">
                  {formatValue(change.newValue)}
                </span>
              </div>
            </div>
            <span className="text-xs text-[#999] whitespace-nowrap shrink-0">
              {timeAgo(change.createdAt)}
            </span>
          </div>
        ))}
      </div>

      {changes.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-3 px-4 py-2 text-xs font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
        >
          {expanded ? (
            <>Show less <ChevronUp size={14} /></>
          ) : (
            <>Show all {changes.length} changes <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
};
