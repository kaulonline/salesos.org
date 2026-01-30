import React from 'react';
import { Mail, Phone, Calendar, FileText, ArrowRight, Activity, CheckCircle2, RefreshCw, Loader2, Send, Eye, MousePointer, AlertTriangle, XCircle } from 'lucide-react';
import { useActivities } from '../../src/hooks';
import { Skeleton } from '../ui/Skeleton';

interface ContactTimelineProps {
  opportunityId?: string;
  accountId?: string;
  contactId?: string;
  leadId?: string;
  limit?: number;
}

// Email tracking status configuration - using SalesOS brand colors
const EMAIL_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  SENT: { label: 'Sent', icon: Send, className: 'bg-[#F0EBD8] text-[#666]' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle2, className: 'bg-[#93C01F]/20 text-[#93C01F]' },
  OPENED: { label: 'Opened', icon: Eye, className: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  CLICKED: { label: 'Clicked', icon: MousePointer, className: 'bg-[#1A1A1A] text-white' },
  BOUNCED: { label: 'Bounced', icon: AlertTriangle, className: 'bg-[#EAD07D]/30 text-[#1A1A1A]' },
  FAILED: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-600' },
};

// Extract email status from activity
const getEmailTrackingStatus = (activity: { type: string; subject?: string; metadata?: Record<string, unknown> }): string | null => {
  if (activity.type !== 'EMAIL') return null;

  const metadata = activity.metadata as Record<string, any> | undefined;
  if (metadata?.emailStatus) return metadata.emailStatus;

  const subject = activity.subject?.toLowerCase() || '';
  if (subject.includes('clicked')) return 'CLICKED';
  if (subject.includes('opened')) return 'OPENED';
  if (subject.includes('delivered')) return 'DELIVERED';
  if (subject.includes('bounced')) return 'BOUNCED';
  if (subject.includes('failed')) return 'FAILED';

  if (metadata?.trackingEvents && Array.isArray(metadata.trackingEvents)) {
    const events = metadata.trackingEvents as { type: string }[];
    if (events.some(e => e.type === 'CLICKED')) return 'CLICKED';
    if (events.some(e => e.type === 'OPENED')) return 'OPENED';
    if (events.some(e => e.type === 'DELIVERED')) return 'DELIVERED';
    if (events.some(e => e.type === 'BOUNCED')) return 'BOUNCED';
    if (events.some(e => e.type === 'FAILED')) return 'FAILED';
  }

  return 'SENT';
};

// Email status badge component
const EmailStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = EMAIL_STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${config.className}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

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
  leadId,
  limit = 10
}) => {
  const { activities, loading, error, refetch } = useActivities({
    opportunityId,
    accountId,
    contactId,
    leadId,
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
      case 'EMAIL': return 'bg-[#F0EBD8] text-[#1A1A1A]';
      case 'CALL': return 'bg-[#1A1A1A] text-[#EAD07D]';
      case 'MEETING': return 'bg-[#EAD07D] text-[#1A1A1A]';
      case 'TASK': return 'bg-[#93C01F]/20 text-[#93C01F]';
      case 'NOTE': return 'bg-[#F8F8F6] text-[#666]';
      case 'STAGE_CHANGE': return 'bg-[#EAD07D]/30 text-[#1A1A1A]';
      default: return 'bg-[#F2F1EA] text-[#666]';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.toLowerCase().replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="relative pl-2 space-y-4">
        <div className="absolute top-2 bottom-0 left-[13px] w-0.5 bg-[#F0EBD8] z-0"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative flex gap-3">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-full" />
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
    <div className="relative pl-2 space-y-4">
      {/* Continuous Line */}
      <div className="absolute top-2 bottom-0 left-[13px] w-0.5 bg-[#F0EBD8] z-0"></div>

      {displayActivities.map((activity) => {
        const emailStatus = getEmailTrackingStatus(activity);
        const displaySubject = activity.subject?.replace(/^Email (delivered|opened|clicked|bounced|failed):\s*/i, '') || activity.subject;

        return (
          <div key={activity.id} className="relative flex gap-3 group">
            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${getColor(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0 bg-white p-3 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-1 mb-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#1A1A1A] text-sm truncate">{displaySubject}</span>
                  <span className="text-[10px] text-[#999] font-medium whitespace-nowrap shrink-0">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#999]">
                    {getTypeLabel(activity.type)}
                  </span>
                  {activity.type === 'EMAIL' && emailStatus && (
                    <EmailStatusBadge status={emailStatus} />
                  )}
                </div>
              </div>
              {activity.description && (
                <p className="text-xs text-[#666] leading-relaxed line-clamp-2">{activity.description}</p>
              )}
              {activity.user && (
                <p className="text-[10px] text-[#999] mt-1.5">
                  by {activity.user.name || activity.user.email}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {activities.length > limit && (
        <button className="relative z-10 flex items-center gap-2 ml-1 text-xs font-bold text-[#999] hover:text-[#1A1A1A] bg-[#F2F1EA] px-3 py-1.5 rounded-full w-fit transition-colors">
          Load older activity ({activities.length - limit} more) <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
};
