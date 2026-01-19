import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Mail, Phone, Calendar, FileText, CheckCircle2 } from 'lucide-react';

const ACTIVITIES = [
    { id: 1, user: "Alex Morgan", action: "sent an email to", target: "Acme Corp", time: "10 min ago", type: "email", icon: Mail, color: "bg-blue-100 text-blue-600" },
    { id: 2, user: "Valentina", action: "completed task", target: "Prepare Q3 Review", time: "25 min ago", type: "task", icon: CheckCircle2, color: "bg-green-100 text-green-600" },
    { id: 3, user: "Sarah Page", action: "scheduled meeting", target: "Intro Call with Vertex", time: "1 hour ago", type: "meeting", icon: Calendar, color: "bg-[#EAD07D]/20 text-[#1A1A1A]" },
    { id: 4, user: "Harry Bender", action: "updated deal", target: "GlobalBank Enterprise", time: "2 hours ago", type: "deal", icon: FileText, color: "bg-purple-100 text-purple-600" },
    { id: 5, user: "Valentina", action: "logged call with", target: "James Wilson", time: "3 hours ago", type: "call", icon: Phone, color: "bg-orange-100 text-orange-600" },
];

export const ActivityFeed: React.FC = () => {
  const [filter, setFilter] = useState('all');
  
  const filtered = filter === 'all' ? ACTIVITIES : ACTIVITIES.filter(a => a.type === filter);

  return (
    <Card className="h-full flex flex-col p-0">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <h3 className="text-lg font-bold text-[#1A1A1A]">Activity Feed</h3>
            <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={`text-xs font-bold px-2 py-1 rounded transition-colors ${filter === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'}`}>All</button>
                <button onClick={() => setFilter('email')} className={`text-xs font-bold px-2 py-1 rounded transition-colors ${filter === 'email' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'}`}>Emails</button>
                <button onClick={() => setFilter('call')} className={`text-xs font-bold px-2 py-1 rounded transition-colors ${filter === 'call' ? 'bg-[#1A1A1A] text-white' : 'text-[#999] hover:bg-gray-100'}`}>Calls</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {filtered.map((item, i) => (
                <div key={item.id} className="flex gap-4 group">
                    <div className="relative">
                       <Avatar src={`https://picsum.photos/40/40?random=${item.id+20}`} size="sm" />
                       <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${item.color} flex items-center justify-center border-2 border-white`}>
                           <item.icon size={10} strokeWidth={3} />
                       </div>
                       {i !== filtered.length - 1 && (
                           <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-100 -z-10"></div>
                       )}
                    </div>
                    <div className="flex-1 pb-4 border-b border-gray-50 group-last:border-0 group-last:pb-0">
                        <div className="text-sm">
                            <span className="font-bold text-[#1A1A1A]">{item.user}</span> <span className="text-[#666]">{item.action}</span> <span className="font-bold text-[#1A1A1A]">{item.target}</span>
                        </div>
                        <div className="text-xs text-[#999] mt-1 font-medium">{item.time}</div>
                    </div>
                </div>
            ))}
        </div>
    </Card>
  );
};