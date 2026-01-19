import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Filter,
  MoreHorizontal,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface TimelineEvent {
  id: string;
  type: 'email_sent' | 'email_received' | 'call_outbound' | 'call_inbound' | 'meeting' | 'note' | 'document' | 'stage_change' | 'task';
  title: string;
  description?: string;
  timestamp: string;
  date: string;
  user: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    duration?: string;
    outcome?: 'positive' | 'neutral' | 'negative';
    attachments?: number;
    attendees?: string[];
    fromStage?: string;
    toStage?: string;
    emailSubject?: string;
    snippet?: string;
  };
  isExpanded?: boolean;
}

const TIMELINE_DATA: TimelineEvent[] = [
  {
    id: '1',
    type: 'email_sent',
    title: 'Sent follow-up email',
    description: 'Proposal revision with updated pricing',
    timestamp: '10:30 AM',
    date: 'Today',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    metadata: {
      emailSubject: 'Re: Q4 Partnership Proposal - Updated Pricing',
      snippet: 'Hi Amélie, Following our call yesterday, I\'ve attached the revised proposal with the volume discount we discussed...',
      attachments: 2
    }
  },
  {
    id: '2',
    type: 'call_outbound',
    title: 'Discovery call completed',
    description: 'Discussed implementation timeline and technical requirements',
    timestamp: '2:15 PM',
    date: 'Yesterday',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    metadata: {
      duration: '32 min',
      outcome: 'positive'
    }
  },
  {
    id: '3',
    type: 'stage_change',
    title: 'Deal moved to Proposal',
    description: 'Automatically updated based on sent proposal',
    timestamp: '2:45 PM',
    date: 'Yesterday',
    user: { name: 'System', avatar: '' },
    metadata: {
      fromStage: 'Discovery',
      toStage: 'Proposal'
    }
  },
  {
    id: '4',
    type: 'meeting',
    title: 'Product demo scheduled',
    description: 'Virtual demo with technical team',
    timestamp: '11:00 AM',
    date: 'Jan 15, 2026',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    metadata: {
      duration: '45 min',
      attendees: ['Amélie Laurent', 'James Wilson', 'Sarah Chen']
    }
  },
  {
    id: '5',
    type: 'email_received',
    title: 'Email received',
    description: 'Response to initial outreach',
    timestamp: '9:22 AM',
    date: 'Jan 14, 2026',
    user: { name: 'Amélie Laurent', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100' },
    metadata: {
      emailSubject: 'Re: SalesOS for Acme Corp',
      snippet: 'Thanks for reaching out! We\'ve been looking for a solution like this. Can we schedule a call to discuss further?',
      outcome: 'positive'
    }
  },
  {
    id: '6',
    type: 'note',
    title: 'Added internal note',
    description: 'Champion identified: Amélie has budget authority and is actively pushing for this solution internally.',
    timestamp: '4:30 PM',
    date: 'Jan 13, 2026',
    user: { name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }
  },
  {
    id: '7',
    type: 'document',
    title: 'Proposal document created',
    description: 'Q4 Enterprise Partnership Proposal',
    timestamp: '3:00 PM',
    date: 'Jan 13, 2026',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    metadata: {
      attachments: 1
    }
  },
  {
    id: '8',
    type: 'email_sent',
    title: 'Initial outreach sent',
    description: 'Personalized introduction email',
    timestamp: '10:00 AM',
    date: 'Jan 12, 2026',
    user: { name: 'Valentina', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    metadata: {
      emailSubject: 'SalesOS for Acme Corp - Streamline Your Revenue Operations',
      snippet: 'Hi Amélie, I noticed Acme Corp has been expanding rapidly. Many companies at your stage struggle with...'
    }
  },
  {
    id: '9',
    type: 'task',
    title: 'Lead assigned',
    description: 'New lead from marketing campaign',
    timestamp: '9:00 AM',
    date: 'Jan 12, 2026',
    user: { name: 'System', avatar: '' }
  }
];

const getEventIcon = (type: TimelineEvent['type']) => {
  const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    email_sent: { icon: Mail, bg: 'bg-blue-100', color: 'text-blue-600' },
    email_received: { icon: ArrowDownLeft, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    call_outbound: { icon: Phone, bg: 'bg-violet-100', color: 'text-violet-600' },
    call_inbound: { icon: ArrowDownLeft, bg: 'bg-violet-100', color: 'text-violet-600' },
    meeting: { icon: Video, bg: 'bg-orange-100', color: 'text-orange-600' },
    note: { icon: MessageSquare, bg: 'bg-gray-100', color: 'text-gray-600' },
    document: { icon: FileText, bg: 'bg-[#EAD07D]/30', color: 'text-[#1A1A1A]' },
    stage_change: { icon: ArrowUpRight, bg: 'bg-[#EAD07D]', color: 'text-[#1A1A1A]' },
    task: { icon: CheckCircle2, bg: 'bg-sky-100', color: 'text-sky-600' }
  };
  return iconMap[type] || iconMap.note;
};

interface ContactTimelineProps {
  className?: string;
  contactName?: string;
  maxEvents?: number;
}

export const ContactTimeline: React.FC<ContactTimelineProps> = ({
  className = '',
  contactName = 'Amélie Laurent',
  maxEvents
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set(['1', '2']));
  const [showAll, setShowAll] = useState(false);

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'emails', label: 'Emails' },
    { value: 'calls', label: 'Calls' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'notes', label: 'Notes' }
  ];

  const filteredEvents = TIMELINE_DATA.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'emails') return event.type.includes('email');
    if (filter === 'calls') return event.type.includes('call');
    if (filter === 'meetings') return event.type === 'meeting';
    if (filter === 'notes') return event.type === 'note';
    return true;
  });

  const displayEvents = maxEvents && !showAll
    ? filteredEvents.slice(0, maxEvents)
    : filteredEvents;

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group events by date
  const groupedEvents = displayEvents.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-medium text-[#1A1A1A]">Activity Timeline</h3>
          <p className="text-sm text-[#999] mt-1">
            {filteredEvents.length} interactions with {contactName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F8F7F4] p-1 rounded-full">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  filter === opt.value
                    ? 'bg-white text-[#1A1A1A] shadow-sm'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Add Activity Button */}
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] text-white text-sm font-medium hover:bg-black transition-colors">
            <Plus size={14} />
            Log Activity
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />

        {/* Events by Date */}
        {Object.entries(groupedEvents).map(([date, events], dateIndex) => (
          <div key={date} className="mb-6 last:mb-0">
            {/* Date Header */}
            <div className="flex items-center gap-3 mb-4 relative">
              <div className="w-10 h-6 bg-[#F2F1EA] rounded-full flex items-center justify-center z-10">
                <Clock size={12} className="text-[#666]" />
              </div>
              <span className="text-xs font-bold text-[#999] uppercase tracking-wider">
                {date}
              </span>
            </div>

            {/* Events */}
            <div className="space-y-3 ml-0">
              {events.map((event, eventIndex) => {
                const iconData = getEventIcon(event.type);
                const Icon = iconData.icon;
                const isExpanded = expandedEvents.has(event.id);

                return (
                  <div
                    key={event.id}
                    className="relative pl-14 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${(dateIndex * events.length + eventIndex) * 50}ms` }}
                  >
                    {/* Event Icon */}
                    <div className={`absolute left-0 w-10 h-10 rounded-xl ${iconData.bg} flex items-center justify-center z-10 shadow-sm`}>
                      <Icon size={18} className={iconData.color} />
                    </div>

                    {/* Event Card */}
                    <div
                      className={`group bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer ${
                        isExpanded ? 'shadow-md border-gray-200' : ''
                      }`}
                      onClick={() => toggleExpand(event.id)}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-[#1A1A1A] text-sm">
                              {event.title}
                            </h4>
                            {event.metadata?.outcome && (
                              <Badge
                                variant={event.metadata.outcome === 'positive' ? 'green' : event.metadata.outcome === 'negative' ? 'red' : 'neutral'}
                                size="sm"
                              >
                                {event.metadata.outcome === 'positive' ? 'Positive' : event.metadata.outcome === 'negative' ? 'Negative' : 'Neutral'}
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-[#666]">{event.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-[#999]">{event.timestamp}</span>
                          {(event.metadata?.snippet || event.metadata?.attendees) && (
                            <button className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                              {isExpanded ? (
                                <ChevronUp size={14} className="text-[#999]" />
                              ) : (
                                <ChevronDown size={14} className="text-[#999]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                          {/* Email Preview */}
                          {event.metadata?.emailSubject && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-[#1A1A1A] mb-1">
                                Subject: {event.metadata.emailSubject}
                              </p>
                              {event.metadata.snippet && (
                                <p className="text-xs text-[#666] bg-[#F8F7F4] p-3 rounded-xl leading-relaxed">
                                  "{event.metadata.snippet}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Stage Change */}
                          {event.metadata?.fromStage && event.metadata?.toStage && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" size="sm">{event.metadata.fromStage}</Badge>
                              <ArrowUpRight size={14} className="text-[#EAD07D]" />
                              <Badge variant="yellow" size="sm">{event.metadata.toStage}</Badge>
                            </div>
                          )}

                          {/* Meeting Attendees */}
                          {event.metadata?.attendees && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#999]">Attendees:</span>
                              <div className="flex -space-x-2">
                                {event.metadata.attendees.slice(0, 3).map((name, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-[#1A1A1A] flex items-center justify-center border-2 border-white"
                                  >
                                    <span className="text-[8px] font-bold text-white">
                                      {name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-[#666]">
                                {event.metadata.attendees.join(', ')}
                              </span>
                            </div>
                          )}

                          {/* Duration & Attachments */}
                          <div className="flex items-center gap-4 mt-3">
                            {event.metadata?.duration && (
                              <div className="flex items-center gap-1.5 text-xs text-[#666]">
                                <Clock size={12} />
                                {event.metadata.duration}
                              </div>
                            )}
                            {event.metadata?.attachments && (
                              <div className="flex items-center gap-1.5 text-xs text-[#666]">
                                <Paperclip size={12} />
                                {event.metadata.attachments} attachment{event.metadata.attachments > 1 ? 's' : ''}
                              </div>
                            )}
                            <button className="flex items-center gap-1 text-xs text-[#666] hover:text-[#1A1A1A] ml-auto">
                              View details
                              <ExternalLink size={10} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* User Avatar */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                        {event.user.avatar ? (
                          <Avatar src={event.user.avatar} size="sm" className="w-5 h-5" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white">
                              {event.user.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-[#999]">{event.user.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Show More Button */}
        {maxEvents && filteredEvents.length > maxEvents && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-4 py-3 text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F7F4] rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Show {filteredEvents.length - maxEvents} more activities
            <ChevronDown size={14} />
          </button>
        )}
      </div>
    </Card>
  );
};
