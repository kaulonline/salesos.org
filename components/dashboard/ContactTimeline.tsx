import React from 'react';
import { Mail, Phone, Calendar, FileText, ArrowRight } from 'lucide-react';

interface TimelineEvent {
    id: number;
    type: 'email' | 'call' | 'meeting' | 'note';
    title: string;
    description: string;
    date: string;
    time: string;
}

const MOCK_EVENTS: TimelineEvent[] = [
    { id: 1, type: 'meeting', title: 'Discovery Call', description: 'Discussed initial requirements and budget. Key focus on API integration.', date: 'Today', time: '10:00 AM' },
    { id: 2, type: 'email', title: 'Proposal Sent', description: 'Sent the Enterprise Annual proposal v2.PDF', date: 'Yesterday', time: '4:35 PM' },
    { id: 3, type: 'note', title: 'Internal Review', description: 'Legal team flagged section 4.2. Needs revision.', date: 'Sep 22', time: '11:00 AM' },
    { id: 4, type: 'call', title: 'Follow up', description: 'Left voicemail regarding contract status.', date: 'Sep 20', time: '2:15 PM' },
];

export const ContactTimeline: React.FC = () => {
  const getIcon = (type: string) => {
      switch(type) {
          case 'email': return <Mail size={14} />;
          case 'call': return <Phone size={14} />;
          case 'meeting': return <Calendar size={14} />;
          default: return <FileText size={14} />;
      }
  };

  const getColor = (type: string) => {
      switch(type) {
          case 'email': return 'bg-blue-100 text-blue-600';
          case 'call': return 'bg-orange-100 text-orange-600';
          case 'meeting': return 'bg-[#EAD07D] text-[#1A1A1A]';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  return (
    <div className="relative pl-4 space-y-8">
        {/* Continuous Line */}
        <div className="absolute top-2 bottom-0 left-[19px] w-0.5 bg-gray-100"></div>

        {MOCK_EVENTS.map((event) => (
            <div key={event.id} className="relative flex gap-4 group">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm ${getColor(event.type)}`}>
                    {getIcon(event.type)}
                </div>
                <div className="flex-1 bg-white p-4 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                             <span className="font-bold text-[#1A1A1A] text-sm">{event.title}</span>
                             <span className="text-[10px] font-bold uppercase tracking-wider text-[#999] bg-[#F8F8F6] px-1.5 py-0.5 rounded">{event.type}</span>
                        </div>
                        <span className="text-xs text-[#999] font-medium">{event.date} • {event.time}</span>
                    </div>
                    <p className="text-sm text-[#666] leading-relaxed">{event.description}</p>
                </div>
            </div>
        ))}
        
        <button className="relative z-10 flex items-center gap-2 ml-1 text-xs font-bold text-[#999] hover:text-[#1A1A1A] bg-[#F2F1EA] px-3 py-1 rounded-full w-fit transition-colors">
            Load older activity <ArrowRight size={12} />
        </button>
    </div>
  );
};