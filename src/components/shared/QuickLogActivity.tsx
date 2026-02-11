import React, { useState } from 'react';
import { Plus, X, Loader2, Phone, Mail, Users, FileText } from 'lucide-react';
import { useActivities } from '../../hooks';
import type { ActivityType } from '../../types';
import { useToast } from '../ui/Toast';

interface QuickLogActivityProps {
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityId: string;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: 'CALL', label: 'Call', icon: <Phone size={14} /> },
  { value: 'EMAIL', label: 'Email', icon: <Mail size={14} /> },
  { value: 'MEETING', label: 'Meeting', icon: <Users size={14} /> },
  { value: 'NOTE', label: 'Note', icon: <FileText size={14} /> },
];

export const QuickLogActivity: React.FC<QuickLogActivityProps> = ({ entityType, entityId }) => {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<ActivityType>('CALL');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const { create, isCreating } = useActivities();

  const handleSubmit = async () => {
    if (!subject.trim()) return;

    const data: Record<string, unknown> = {
      type,
      subject: subject.trim(),
      description: description.trim() || undefined,
    };

    if (entityType === 'lead') data.leadId = entityId;
    else if (entityType === 'contact') data.contactId = entityId;
    else if (entityType === 'account') data.accountId = entityId;
    else if (entityType === 'opportunity') data.opportunityId = entityId;

    try {
      await create(data as any);
      showToast({ type: 'success', title: 'Activity Logged' });
      setSubject('');
      setDescription('');
      setExpanded(false);
    } catch (err) {
      console.error('Failed to log activity:', err);
      showToast({ type: 'error', title: 'Failed to Log Activity', message: (err as Error).message || 'Please try again' });
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F8F8F6] hover:bg-[#EAD07D]/20 rounded-xl text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors border border-dashed border-black/10"
      >
        <Plus size={16} />
        Log Activity
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-black/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#1A1A1A]">Log Activity</span>
        <button
          onClick={() => setExpanded(false)}
          className="text-[#999] hover:text-[#1A1A1A] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Type Selector */}
      <div className="flex gap-1.5">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              type === t.value
                ? 'bg-[#1A1A1A] text-white'
                : 'bg-[#F8F8F6] text-[#666] hover:bg-[#EAD07D]/20'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (e.g., Discussed pricing)"
        className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
      />

      {/* Description (optional) */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
      />

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isCreating || !subject.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-white rounded-full text-xs font-medium hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {isCreating && <Loader2 size={12} className="animate-spin" />}
          Log Activity
        </button>
      </div>
    </div>
  );
};
