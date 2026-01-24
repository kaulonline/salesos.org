import React, { useState, useEffect } from 'react';
import { Bot, Power, Settings2, Activity, MessageSquare, Search, Phone, Mail, FileText, Zap } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

const AGENTS = [
    { 
        id: 'sdr-01', 
        name: 'Outbound Scout', 
        role: 'SDR Agent', 
        status: 'Active', 
        description: 'Identifies prospects, enriches data, and sends initial cold outreach sequences.',
        metrics: { emails: '1.2k', replies: '8.4%', qualified: 42 },
        icon: Mail,
        color: 'bg-blue-500',
        active: true
    },
    { 
        id: 'res-01', 
        name: 'Deep Research', 
        role: 'Research Agent', 
        status: 'Thinking', 
        description: 'Scans 10-K reports, news, and LinkedIn to build comprehensive account dossiers.',
        metrics: { reports: 156, insights: '2.4k', hours_saved: 310 },
        icon: Search,
        color: 'bg-purple-500',
        active: true
    },
    { 
        id: 'cls-01', 
        name: 'Deal Architect', 
        role: 'Closer Agent', 
        status: 'Paused', 
        description: 'Drafts proposals, handles objection handling, and suggests negotiation strategies.',
        metrics: { proposals: 12, closed: '$145k', win_rate: '22%' },
        icon: FileText,
        color: 'bg-[#EAD07D]',
        active: false
    },
    { 
        id: 'voice-01', 
        name: 'Ava Voice', 
        role: 'Concierge', 
        status: 'Active', 
        description: 'Handles inbound calls and schedules meetings directly onto the calendar.',
        metrics: { calls: 89, meetings: 14, csat: '4.9' },
        icon: Phone,
        color: 'bg-green-500',
        active: true
    }
];

export const Agents: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-10">
                <Skeleton className="h-10 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-[280px] rounded-[2rem]" />)}
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="mb-10 flex justify-between items-end">
            <div>
                <h1 className="text-4xl font-medium text-[#1A1A1A] mb-2">Agent Orchestration</h1>
                <p className="text-[#666] max-w-2xl">Manage your digital workforce. Configure autonomy levels, review performance, and assign specific playbooks.</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-bold shadow-lg hover:bg-black transition-transform hover:scale-105">
                <PlusIcon /> Hire New Agent
            </button>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <Card className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"><Zap size={20} /></div>
                <div>
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-xs text-[#666]">Uptime</div>
                </div>
            </Card>
            <Card className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><MessageSquare size={20} /></div>
                <div>
                    <div className="text-2xl font-bold">14.2k</div>
                    <div className="text-xs text-[#666]">Actions Taken</div>
                </div>
            </Card>
            <Card className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600"><Activity size={20} /></div>
                <div>
                    <div className="text-2xl font-bold">$124k</div>
                    <div className="text-xs text-[#666]">Agent Revenue</div>
                </div>
            </Card>
             <Card className="flex items-center gap-4 p-6 border-dashed border-2 border-gray-200 bg-transparent shadow-none hover:border-[#1A1A1A] cursor-pointer transition-colors">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><Settings2 size={20} /></div>
                <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">Global Config</div>
                    <div className="text-xs text-[#666]">Safety & Limits</div>
                </div>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AGENTS.map((agent) => (
                <div key={agent.id} className={`group relative bg-white rounded-[2.5rem] p-8 border transition-all duration-300 ${agent.active ? 'border-black/5 shadow-sm hover:shadow-card' : 'border-gray-100 opacity-80 grayscale-[0.5]'}`}>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                            <div className={`w-16 h-16 rounded-2xl ${agent.color} flex items-center justify-center text-white shadow-lg`}>
                                <agent.icon size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[#1A1A1A]">{agent.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={agent.active ? 'dark' : 'neutral'} size="sm">{agent.role}</Badge>
                                    {agent.active && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> {agent.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button className={`w-12 h-8 rounded-full flex items-center px-1 transition-colors ${agent.active ? 'bg-[#1A1A1A] justify-end' : 'bg-gray-200 justify-start'}`}>
                            <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                        </button>
                    </div>

                    {/* Description */}
                    <p className="text-[#666] mb-8 min-h-[48px] text-sm leading-relaxed">
                        {agent.description}
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8 bg-[#F8F8F6] p-4 rounded-2xl">
                        {Object.entries(agent.metrics).map(([key, val]) => (
                            <div key={key}>
                                <div className="text-lg font-bold text-[#1A1A1A]">{val}</div>
                                <div className="text-[10px] uppercase font-bold text-[#999] tracking-wider">{key.replace('_', ' ')}</div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-3">
                        <button className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-sm hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center gap-2">
                            <Settings2 size={16} /> Configure
                        </button>
                        <button className="flex-1 py-3 rounded-xl bg-[#F2F1EA] text-[#1A1A1A] font-bold text-sm hover:bg-[#EAD07D] transition-colors flex items-center justify-center gap-2">
                            <Activity size={16} /> View Logs
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14"/>
    </svg>
);