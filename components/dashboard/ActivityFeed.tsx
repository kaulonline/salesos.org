import React, { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  DollarSign,
  UserPlus,
  FileText,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'deal_update' | 'new_lead' | 'document' | 'message' | 'milestone';
  title: string;
  description: string;
  user: {
    name: string;
    avatar: string;
  };
  timestamp: string;
  relatedTo?: string;
  metadata?: {
    value?: string;
    stage?: string;
    duration?: string;
  };
}

const ACTIVITY_DATA: ActivityItem[] = [
  {
    id: '1',
    type: 'deal_update',
    title: 'Deal moved to Negotiation',
    description: 'Acme Corp Enterprise License',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    timestamp: '2 min ago',
    relatedTo: 'Acme Corp',
    metadata: { value: '$125,000', stage: 'Negotiation' }
  },
  {
    id: '2',
    type: 'call',
    title: 'Completed discovery call',
    description: 'Discussed Q1 budget allocation and timeline',
    user: { name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    timestamp: '15 min ago',
    relatedTo: 'GlobalBank',
    metadata: { duration: '32 min' }
  },
  {
    id: '3',
    type: 'new_lead',
    title: 'New lead captured',
    description: 'Sarah Chen from Vertex Technologies',
    user: { name: 'System', avatar: '' },
    timestamp: '28 min ago',
    metadata: { value: '$45,000' }
  },
  {
    id: '4',
    type: 'email',
    title: 'Proposal email sent',
    description: 'Q4 Partnership Proposal - Final Draft',
    user: { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
    timestamp: '1 hour ago',
    relatedTo: 'Nebula Inc'
  },
  {
    id: '5',
    type: 'milestone',
    title: 'Monthly target achieved',
    description: 'Team reached 110% of Q4 quota',
    user: { name: 'Team', avatar: '' },
    timestamp: '2 hours ago',
    metadata: { value: '$1.2M' }
  },
  {
    id: '6',
    type: 'meeting',
    title: 'Meeting scheduled',
    description: 'Product demo with decision makers',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    timestamp: '3 hours ago',
    relatedTo: 'TechFlow'
  },
  {
    id: '7',
    type: 'document',
    title: 'Contract signed',
    description: 'MSA signed via DocuSign',
    user: { name: 'Client', avatar: '' },
    timestamp: '4 hours ago',
    relatedTo: 'Sisyphus Corp',
    metadata: { value: '$210,000' }
  },
  {
    id: '8',
    type: 'message',
    title: 'New message received',
    description: 'Quick question about pricing tiers...',
    user: { name: 'Elena Rigby', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    timestamp: '5 hours ago'
  }
];

const getActivityIcon = (type: ActivityItem['type']) => {
  const iconMap = {
    call: { icon: Phone, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    email: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
    meeting: { icon: Calendar, bg: 'bg-violet-100', color: 'text-violet-600' },
    deal_update: { icon: TrendingUp, bg: 'bg-[#EAD07D]/20', color: 'text-[#1A1A1A]' },
    new_lead: { icon: UserPlus, bg: 'bg-sky-100', color: 'text-sky-600' },
    document: { icon: FileText, bg: 'bg-orange-100', color: 'text-orange-600' },
    message: { icon: MessageSquare, bg: 'bg-pink-100', color: 'text-pink-600' },
    milestone: { icon: DollarSign, bg: 'bg-[#EAD07D]', color: 'text-[#1A1A1A]' }
  };
  return iconMap[type];
};

interface ActivityFeedProps {
  compact?: boolean;
  maxItems?: number;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  compact = false,
  maxItems = 8,
  className = ''
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivities(ACTIVITY_DATA);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredActivities = activities
    .filter(a => filter === 'all' || a.type === filter)
    .slice(0, maxItems);

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'deal_update', label: 'Deals' },
    { value: 'call', label: 'Calls' },
    { value: 'email', label: 'Emails' },
    { value: 'meeting', label: 'Meetings' }
  ];

  if (isLoading) {
    return (
      <Card className={`${className} ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${compact ? 'p-4' : 'p-6'} flex flex-col`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-medium text-[#1A1A1A]">Activity</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAD07D]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EAD07D] animate-pulse" />
            <span className="text-xs font-medium text-[#1A1A1A]">Live</span>
          </div>
        </div>

        {!compact && (
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1 rounded-full border border-white/40">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  filter === opt.value
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {filteredActivities.map((activity, index) => {
          const iconData = getActivityIcon(activity.type);
          const Icon = iconData.icon;

          return (
            <div
              key={activity.id}
              className="group flex gap-4 p-3 -mx-3 rounded-2xl hover:bg-[#F8F7F4] transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${iconData.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                <Icon size={18} className={iconData.color} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A1A1A] text-sm truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-[#666] truncate mt-0.5">
                      {activity.description}
                    </p>
                  </div>

                  {activity.metadata?.value && (
                    <Badge variant="yellow" size="sm" className="shrink-0">
                      {activity.metadata.value}
                    </Badge>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-2">
                  {activity.user.avatar ? (
                    <Avatar src={activity.user.avatar} size="sm" className="w-5 h-5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">
                        {activity.user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-[#999]">{activity.user.name}</span>

                  {activity.relatedTo && (
                    <>
                      <span className="text-[#ccc]">•</span>
                      <span className="text-xs text-[#666] font-medium">{activity.relatedTo}</span>
                    </>
                  )}

                  <span className="text-[#ccc]">•</span>
                  <span className="text-xs text-[#999] flex items-center gap-1">
                    <Clock size={10} />
                    {activity.timestamp}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight
                size={16}
                className="text-[#ccc] group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all duration-200 shrink-0 mt-1"
              />
            </div>
          );
        })}
      </div>

      {/* View All */}
      {!compact && (
        <button className="mt-4 w-full py-3 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] rounded-xl transition-colors flex items-center justify-center gap-2 group">
          View all activity
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </Card>
  );
};
