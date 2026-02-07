import React from 'react';
import { Clock, Phone, Send, Calendar, FileText, RefreshCw, ArrowLeft } from 'lucide-react';
import type { Activity } from '../../types';

interface QuoteActivityTabProps {
  activities: Activity[];
  loading: boolean;
}

export const QuoteActivityTab: React.FC<QuoteActivityTabProps> = ({ activities, loading }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'CALL': return <Phone size={16} className="text-[#93C01F]" />;
      case 'EMAIL': return <Send size={16} className="text-blue-500" />;
      case 'MEETING': return <Calendar size={16} className="text-purple-500" />;
      case 'NOTE': return <FileText size={16} className="text-[#EAD07D]" />;
      case 'STATUS_CHANGE': return <RefreshCw size={16} className="text-[#666]" />;
      case 'STAGE_CHANGE': return <ArrowLeft size={16} className="text-[#1A1A1A] rotate-180" />;
      default: return <Clock size={16} className="text-[#999]" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'CALL': return 'bg-[#93C01F]/20';
      case 'EMAIL': return 'bg-blue-100';
      case 'MEETING': return 'bg-purple-100';
      case 'NOTE': return 'bg-[#EAD07D]/20';
      default: return 'bg-[#F8F8F6]';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4 p-4 bg-[#F8F8F6] rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#E5E5E5] rounded w-1/3" />
              <div className="h-3 bg-[#E5E5E5] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F8F8F6] flex items-center justify-center mx-auto mb-4">
          <Clock size={24} className="text-[#999]" />
        </div>
        <h4 className="text-base font-semibold text-[#1A1A1A] mb-2">No Activity Yet</h4>
        <p className="text-sm text-[#666]">Activities related to this quote will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.slice(0, 20).map((activity) => (
        <div key={activity.id} className="flex gap-4 p-4 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors">
          <div className={`w-10 h-10 rounded-full ${getActivityBg(activity.type)} flex items-center justify-center flex-shrink-0`}>
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-[#1A1A1A] text-sm">{activity.subject}</h4>
              <span className="text-xs text-[#999] whitespace-nowrap">
                {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {activity.description && (
              <p className="text-sm text-[#666] mt-1 line-clamp-2">{activity.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[#999] capitalize">{activity.type.toLowerCase().replace('_', ' ')}</span>
              {activity.user && (
                <span className="text-xs text-[#999]">by {activity.user.name}</span>
              )}
              {activity.duration && (
                <span className="text-xs text-[#999]">{activity.duration} min</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
