import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Mail, Phone, Calendar, FileText, CheckCircle2, MessageSquare, Users, TrendingUp, Activity } from 'lucide-react';
import { useActivities } from '../../src/hooks';
import { Skeleton } from '../ui/Skeleton';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'EMAIL': return { icon: Mail, color: 'bg-blue-100 text-blue-600' };
    case 'CALL': return { icon: Phone, color: 'bg-orange-100 text-orange-600' };
    case 'MEETING': return { icon: Calendar, color: 'bg-[#EAD07D]/20 text-[#1A1A1A]' };
    case 'TASK': return { icon: CheckCircle2, color: 'bg-green-100 text-green-600' };
    case 'NOTE': return { icon: FileText, color: 'bg-purple-100 text-purple-600' };
    case 'CHAT': return { icon: MessageSquare, color: 'bg-indigo-100 text-indigo-600' };
    case 'DEAL_UPDATE': return { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' };
    case 'CONTACT': return { icon: Users, color: 'bg-pink-100 text-pink-600' };
    default: return { icon: Activity, color: 'bg-gray-100 text-gray-600' };
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

const getActionText = (activity: { type: string; subject?: string; description?: string }) => {
  switch (activity.type) {
    case 'EMAIL': return 'sent an email';
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
              filter === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('email')}
            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
              filter === 'email' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'
            }`}
          >
            Emails
          </button>
          <button
            onClick={() => setFilter('call')}
            className={`text-xs font-bold px-2 py-1 rounded transition-colors ${
              filter === 'call' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'
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
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-100 -z-10"></div>
                  )}
                </div>
                <div className="flex-1 pb-4 border-b border-gray-50 group-last:border-0 group-last:pb-0">
                  <div className="text-sm">
                    <span className="font-bold text-[#1A1A1A]">
                      {activity.user?.name || activity.user?.email || 'Someone'}
                    </span>{' '}
                    <span className="text-[#666]">{getActionText(activity)}</span>
                    {activity.subject && (
                      <>
                        {' '}
                        <span className="font-bold text-[#1A1A1A]">{activity.subject}</span>
                      </>
                    )}
                  </div>
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
