import React, { useState } from 'react';
import {
  Clock,
  Mail,
  Phone,
  Calendar,
  FileText,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  User,
  Building2,
  DollarSign,
  Edit2,
  Trash2,
  Plus,
  Filter,
  ChevronDown,
  Send,
  Video,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type ActivityType =
  | 'EMAIL_SENT'
  | 'EMAIL_RECEIVED'
  | 'CALL_MADE'
  | 'CALL_RECEIVED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_COMPLETED'
  | 'NOTE_ADDED'
  | 'TASK_COMPLETED'
  | 'TASK_CREATED'
  | 'DEAL_STAGE_CHANGED'
  | 'DEAL_AMOUNT_CHANGED'
  | 'CONTACT_CREATED'
  | 'LEAD_CONVERTED'
  | 'QUOTE_SENT'
  | 'CONTRACT_SIGNED'
  | 'AI_INSIGHT';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    from?: string;
    to?: string;
    duration?: number;
    oldValue?: string;
    newValue?: string;
    amount?: number;
    link?: string;
  };
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
  onAddActivity?: () => void;
  entityType?: 'deal' | 'lead' | 'contact' | 'company';
  entityId?: string;
  showFilters?: boolean;
  maxItems?: number;
}

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string }> = {
  EMAIL_SENT: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-100' },
  EMAIL_RECEIVED: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  CALL_MADE: { icon: Phone, color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  CALL_RECEIVED: { icon: Phone, color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  MEETING_SCHEDULED: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  MEETING_COMPLETED: { icon: Video, color: 'text-purple-600', bg: 'bg-purple-100' },
  NOTE_ADDED: { icon: FileText, color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  TASK_COMPLETED: { icon: CheckCircle, color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  TASK_CREATED: { icon: Clock, color: 'text-[#666]', bg: 'bg-[#F8F8F6]' },
  DEAL_STAGE_CHANGED: { icon: DollarSign, color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  DEAL_AMOUNT_CHANGED: { icon: DollarSign, color: 'text-[#1A1A1A]', bg: 'bg-[#F0EBD8]' },
  CONTACT_CREATED: { icon: User, color: 'text-[#666]', bg: 'bg-[#F8F8F6]' },
  LEAD_CONVERTED: { icon: CheckCircle, color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  QUOTE_SENT: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
  CONTRACT_SIGNED: { icon: CheckCircle, color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  AI_INSIGHT: { icon: AlertCircle, color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
};

const filterOptions = [
  { value: 'all', label: 'All Activities' },
  { value: 'emails', label: 'Emails' },
  { value: 'calls', label: 'Calls' },
  { value: 'meetings', label: 'Meetings' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'notes', label: 'Notes' },
  { value: 'changes', label: 'Changes' },
];

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading = false,
  onAddActivity,
  showFilters = true,
  maxItems,
}) => {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'emails') return activity.type.includes('EMAIL');
    if (filter === 'calls') return activity.type.includes('CALL');
    if (filter === 'meetings') return activity.type.includes('MEETING');
    if (filter === 'tasks') return activity.type.includes('TASK');
    if (filter === 'notes') return activity.type === 'NOTE_ADDED';
    if (filter === 'changes') return activity.type.includes('CHANGED') || activity.type.includes('CONVERTED');
    return true;
  });

  const displayedActivities = maxItems ? filteredActivities.slice(0, maxItems) : filteredActivities;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#F8F8F6]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#F8F8F6] rounded w-1/3" />
              <div className="h-3 bg-[#F8F8F6] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#1A1A1A]">Activity Timeline</h3>
        <div className="flex items-center gap-2">
          {showFilters && (
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm bg-[#F8F8F6] border-transparent rounded-lg focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none cursor-pointer"
              >
                {filterOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none" />
            </div>
          )}
          {onAddActivity && (
            <button
              onClick={onAddActivity}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors"
            >
              <Plus size={14} />
              Log Activity
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {displayedActivities.length === 0 ? (
        <div className="py-8 text-center">
          <Clock size={32} className="mx-auto text-[#999] opacity-40 mb-2" />
          <p className="text-[#666]">No activities yet</p>
          <p className="text-sm text-[#999]">Activities will appear here as they happen</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-black/5" />

          <div className="space-y-4">
            {displayedActivities.map((activity, index) => {
              const config = activityConfig[activity.type] || activityConfig.NOTE_ADDED;
              const Icon = config.icon;
              const isExpanded = expanded === activity.id;

              return (
                <div
                  key={activity.id}
                  className="relative flex gap-4 group"
                >
                  {/* Icon */}
                  <div className={`relative z-10 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={config.color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div
                      className={`bg-white rounded-xl p-4 border border-black/5 hover:shadow-sm transition-shadow cursor-pointer ${isExpanded ? 'shadow-sm' : ''}`}
                      onClick={() => setExpanded(isExpanded ? null : activity.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1A1A1A] text-sm">{activity.title}</p>
                          {activity.description && (
                            <p className={`text-sm text-[#666] mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[#999] whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Metadata */}
                      {activity.metadata && isExpanded && (
                        <div className="mt-3 pt-3 border-t border-black/5 space-y-2">
                          {activity.metadata.from && (
                            <p className="text-xs text-[#666]">
                              <span className="text-[#999]">From:</span> {activity.metadata.from}
                            </p>
                          )}
                          {activity.metadata.to && (
                            <p className="text-xs text-[#666]">
                              <span className="text-[#999]">To:</span> {activity.metadata.to}
                            </p>
                          )}
                          {activity.metadata.duration && (
                            <p className="text-xs text-[#666]">
                              <span className="text-[#999]">Duration:</span> {activity.metadata.duration} minutes
                            </p>
                          )}
                          {activity.metadata.oldValue && activity.metadata.newValue && (
                            <p className="text-xs text-[#666]">
                              <span className="text-[#999]">Changed:</span>{' '}
                              <span className="line-through">{activity.metadata.oldValue}</span>
                              {' → '}
                              <span className="font-medium text-[#1A1A1A]">{activity.metadata.newValue}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* User */}
                      {activity.user && (
                        <div className="flex items-center gap-2 mt-3">
                          {activity.user.avatar ? (
                            <img
                              src={activity.user.avatar}
                              alt={activity.user.name}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#F0EBD8] flex items-center justify-center">
                              <User size={10} className="text-[#666]" />
                            </div>
                          )}
                          <span className="text-xs text-[#999]">{activity.user.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Show more */}
      {maxItems && filteredActivities.length > maxItems && (
        <button className="w-full py-2 text-sm text-[#666] hover:text-[#1A1A1A] transition-colors">
          Show {filteredActivities.length - maxItems} more activities
        </button>
      )}
    </div>
  );
};

export default ActivityTimeline;
