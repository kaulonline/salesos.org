import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Mail, Phone, Calendar, FileText, CheckCircle2, MessageSquare, Users, TrendingUp, Activity, Send, Eye, MousePointer, AlertTriangle, XCircle } from 'lucide-react';
import { useActivities } from '../../src/hooks';
import { Skeleton } from '../ui/Skeleton';

// Email tracking status configuration - using SalesOS brand colors
const EMAIL_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  SENT: { label: 'Sent', icon: Send, className: 'bg-[#F0EBD8] text-[#666]' },
  DELIVERED: { label: 'Delivered', icon: CheckCircle2, className: 'bg-[#93C01F]/20 text-[#93C01F]' },
  OPENED: { label: 'Opened', icon: Eye, className: 'bg-[#EAD07D]/20 text-[#1A1A1A]' },
  CLICKED: { label: 'Clicked', icon: MousePointer, className: 'bg-[#1A1A1A] text-white' },
  BOUNCED: { label: 'Bounced', icon: AlertTriangle, className: 'bg-[#EAD07D]/30 text-[#1A1A1A]' },
  FAILED: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-600' },
};

// Extract email status from activity metadata or subject
const getEmailTrackingStatus = (activity: { type: string; subject?: string; metadata?: Record<string, unknown> }): string | null => {
  if (activity.type !== 'EMAIL') return null;

  // Check metadata first (from email tracking updates)
  const metadata = activity.metadata as Record<string, any> | undefined;
  if (metadata?.emailStatus) {
    return metadata.emailStatus;
  }

  // Check if subject contains status indicator (from webhook-created activities)
  const subject = activity.subject?.toLowerCase() || '';
  if (subject.includes('clicked')) return 'CLICKED';
  if (subject.includes('opened')) return 'OPENED';
  if (subject.includes('delivered')) return 'DELIVERED';
  if (subject.includes('bounced')) return 'BOUNCED';
  if (subject.includes('failed')) return 'FAILED';

  // Check trackingEvents in metadata for the latest status
  if (metadata?.trackingEvents && Array.isArray(metadata.trackingEvents)) {
    const events = metadata.trackingEvents as { type: string }[];
    // Get the highest priority status (clicked > opened > delivered)
    if (events.some(e => e.type === 'CLICKED')) return 'CLICKED';
    if (events.some(e => e.type === 'OPENED')) return 'OPENED';
    if (events.some(e => e.type === 'DELIVERED')) return 'DELIVERED';
    if (events.some(e => e.type === 'BOUNCED')) return 'BOUNCED';
    if (events.some(e => e.type === 'FAILED')) return 'FAILED';
  }

  return 'SENT'; // Default for email activities
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'EMAIL': return { icon: Mail, color: 'bg-[#F0EBD8] text-[#1A1A1A]' };
    case 'CALL': return { icon: Phone, color: 'bg-[#1A1A1A] text-[#EAD07D]' };
    case 'MEETING': return { icon: Calendar, color: 'bg-[#EAD07D] text-[#1A1A1A]' };
    case 'TASK': return { icon: CheckCircle2, color: 'bg-[#93C01F]/20 text-[#93C01F]' };
    case 'NOTE': return { icon: FileText, color: 'bg-[#F8F8F6] text-[#666]' };
    case 'CHAT': return { icon: MessageSquare, color: 'bg-[#EAD07D]/30 text-[#1A1A1A]' };
    case 'DEAL_UPDATE': return { icon: TrendingUp, color: 'bg-[#93C01F]/30 text-[#93C01F]' };
    case 'CONTACT': return { icon: Users, color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' };
    default: return { icon: Activity, color: 'bg-[#F2F1EA] text-[#666]' };
  }
};

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return activityDate.toLocaleDateString();
};

const getActionText = (activity: { type: string; subject?: string; description?: string; metadata?: Record<string, unknown> }) => {
  if (activity.type === 'EMAIL') {
    const status = getEmailTrackingStatus(activity);
    // For status update activities (from webhook), show specific action
    if (activity.subject?.toLowerCase().includes('email delivered')) return 'email was delivered';
    if (activity.subject?.toLowerCase().includes('email opened')) return 'email was opened';
    if (activity.subject?.toLowerCase().includes('email clicked')) return 'email link was clicked';
    if (activity.subject?.toLowerCase().includes('email bounced')) return 'email bounced';
    if (activity.subject?.toLowerCase().includes('email failed')) return 'email failed to deliver';
    return 'sent an email';
  }

  switch (activity.type) {
    case 'CALL': return 'logged a call';
    case 'MEETING': return 'scheduled a meeting';
    case 'TASK': return 'completed a task';
    case 'NOTE': return 'added a note';
    case 'CHAT': return 'started a conversation';
    case 'DEAL_UPDATE': return 'updated a deal';
    case 'CONTACT': return 'added a contact';
    default: return 'performed an action';
  }
};

// Email status badge component
const EmailStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = EMAIL_STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

export const ActivityFeed: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const { activities, loading } = useActivities({ limit: 20 });

  const filtered = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter.toUpperCase());

  if (loading) {
    return (
      <Card className="h-full flex flex-col p-0">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col p-0">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Activity Feed</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
              filter === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-[#F8F8F6]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('email')}
            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
              filter === 'email' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-[#F8F8F6]'
            }`}
          >
            Emails
          </button>
          <button
            onClick={() => setFilter('call')}
            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
              filter === 'call' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-[#F8F8F6]'
            }`}
          >
            Calls
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-[#666]">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activities to display</p>
          </div>
        ) : (
          filtered.map((activity, i) => {
            const { icon: Icon, color } = getActivityIcon(activity.type);
            const emailStatus = getEmailTrackingStatus(activity);
            // Clean up subject for display (remove status prefix if present)
            const displaySubject = activity.subject?.replace(/^Email (delivered|opened|clicked|bounced|failed):\s*/i, '') || activity.subject;

            return (
              <div key={activity.id} className="flex gap-4 group">
                <div className="relative">
                  <Avatar
                    src={activity.user?.avatarUrl}
                    name={activity.user?.name || activity.user?.email || 'User'}
                    size="sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${color} flex items-center justify-center border-2 border-white`}>
                    <Icon size={10} strokeWidth={3} />
                  </div>
                  {i !== filtered.length - 1 && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#F0EBD8] -z-10"></div>
                  )}
                </div>
                <div className="flex-1 pb-4 border-b border-gray-50 group-last:border-0 group-last:pb-0">
                  <div className="text-sm">
                    <span className="font-bold text-[#1A1A1A]">
                      {activity.user?.name || activity.user?.email || 'Someone'}
                    </span>{' '}
                    <span className="text-[#666]">{getActionText(activity)}</span>
                    {displaySubject && (
                      <>
                        {' '}
                        <span className="font-bold text-[#1A1A1A]">{displaySubject}</span>
                      </>
                    )}
                  </div>
                  {/* Email tracking status badge */}
                  {activity.type === 'EMAIL' && emailStatus && (
                    <div className="mt-1.5">
                      <EmailStatusBadge status={emailStatus} />
                    </div>
                  )}
                  {activity.description && (
                    <p className="text-xs text-[#666] mt-1 line-clamp-2">{activity.description}</p>
                  )}
                  <div className="text-xs text-[#999] mt-1 font-medium">
                    {formatTimeAgo(activity.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
