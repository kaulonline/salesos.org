import React from 'react';
import { Mail, Phone, Calendar, FileText, ArrowRight, Activity, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { useActivities } from '../../src/hooks';
import { Skeleton } from '../ui/Skeleton';

interface ContactTimelineProps {
  opportunityId?: string;
  accountId?: string;
  contactId?: string;
  limit?: number;
}

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const ContactTimeline: React.FC<ContactTimelineProps> = ({
  opportunityId,
  accountId,
  contactId,
  limit = 10
}) => {
  const { activities, loading, error, refetch } = useActivities({
    opportunityId,
    accountId,
    contactId,
  });

  const displayActivities = activities.slice(0, limit);

  const getIcon = (type: string) => {
    switch (type) {
      case 'EMAIL': return <Mail size={14} />;
      case 'CALL': return <Phone size={14} />;
      case 'MEETING': return <Calendar size={14} />;
      case 'TASK': return <CheckCircle2 size={14} />;
      case 'NOTE': return <FileText size={14} />;
      case 'STAGE_CHANGE': return <RefreshCw size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'EMAIL': return 'bg-blue-100 text-blue-600';
      case 'CALL': return 'bg-orange-100 text-orange-600';
      case 'MEETING': return 'bg-[#EAD07D] text-[#1A1A1A]';
      case 'TASK': return 'bg-green-100 text-green-600';
      case 'NOTE': return 'bg-purple-100 text-purple-600';
      case 'STAGE_CHANGE': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.toLowerCase().replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="relative pl-4 space-y-6">
        <div className="absolute top-2 bottom-0 left-[19px] w-0.5 bg-gray-100"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-[#666] hover:text-[#1A1A1A] underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-6">
        <Activity size={24} className="mx-auto mb-2 text-[#999] opacity-40" />
        <p className="text-sm text-[#666]">No activities yet</p>
        <p className="text-xs text-[#999] mt-1">Activities will appear here as they happen</p>
      </div>
    );
  }

  return (
    <div className="relative pl-4 space-y-8">
      {/* Continuous Line */}
      <div className="absolute top-2 bottom-0 left-[19px] w-0.5 bg-gray-100"></div>

      {displayActivities.map((activity) => (
        <div key={activity.id} className="relative flex gap-4 group">
          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${getColor(activity.type)}`}>
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 bg-white p-4 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1A1A1A] text-sm">{activity.subject}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#999] bg-[#F8F8F6] px-1.5 py-0.5 rounded">
                  {getTypeLabel(activity.type)}
                </span>
              </div>
              <span className="text-xs text-[#999] font-medium whitespace-nowrap">
                {formatTimeAgo(activity.createdAt)} {' '} {formatTime(activity.createdAt)}
              </span>
            </div>
            {activity.description && (
              <p className="text-sm text-[#666] leading-relaxed">{activity.description}</p>
            )}
            {activity.user && (
              <p className="text-xs text-[#999] mt-2">
                by {activity.user.name || activity.user.email}
              </p>
            )}
          </div>
        </div>
      ))}

      {activities.length > limit && (
        <button className="relative z-10 flex items-center gap-2 ml-1 text-xs font-bold text-[#999] hover:text-[#1A1A1A] bg-[#F2F1EA] px-3 py-1 rounded-full w-fit transition-colors">
          Load older activity ({activities.length - limit} more) <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
};
