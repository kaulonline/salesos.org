import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Sparkles, TrendingUp, AlertCircle, Eye, MousePointerClick, ChevronRight, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ActivityFeed, QuickActions } from '../../components/dashboard';

export const DashboardHome: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
           <Skeleton className="h-10 w-64 mb-4" />
           <Skeleton className="h-24 w-full rounded-3xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <Skeleton className="md:col-span-8 h-[380px] rounded-[2.5rem]" />
           <Skeleton className="md:col-span-4 h-[380px] rounded-[2.5rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2.5rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2.5rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* Header & AI Briefing */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-4xl font-medium text-[#1A1A1A] tracking-tight">
                Good morning, <span className="font-bold">Valentina</span>
                </h1>
                <p className="text-[#666] mt-1">Here is your daily revenue intelligence briefing.</p>
            </div>
            <div className="hidden md:block text-right">
                <div className="text-sm font-bold text-[#1A1A1A]">Quota Attainment</div>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#EAD07D] w-[72%]"></div>
                    </div>
                    <span className="text-xl font-light">72%</span>
                </div>
            </div>
        </div>

        {/* AI Insight Pill */}
        <div className="relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/50 p-1 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start md:items-center gap-2 animate-in slide-in-from-bottom-2 duration-500">
            <div className="bg-[#1A1A1A] text-white px-5 py-3 rounded-[1.7rem] flex items-center gap-2 shrink-0 shadow-lg">
                <Sparkles size={16} className="text-[#EAD07D]" />
                <span className="font-bold text-sm tracking-wide">AI INSIGHT</span>
            </div>
            <div className="px-4 py-2 flex-1 md:flex items-center justify-between w-full">
                <p className="text-[#1A1A1A] text-sm font-medium leading-relaxed">
                    Pipeline velocity has increased by <span className="text-green-600 font-bold">+12%</span>. 
                    However, <span className="font-bold border-b border-[#EAD07D]">GlobalBank</span> is showing risk signals due to lack of recent activity.
                </p>
                <Link to="/dashboard/deals" className="hidden md:flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#666] hover:text-[#1A1A1A] ml-4 transition-colors">
                    View Pipeline <ArrowUpRight size={14} />
                </Link>
            </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. FOCUS DEAL (Hero Card) - Replaces generic profile */}
        <Card variant="dark" className="md:col-span-8 p-0 relative group overflow-hidden min-h-[380px] flex flex-col md:flex-row">
           {/* Background Image with Overlay */}
           <div className="absolute inset-0 z-0">
               <img 
                 src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1200" 
                 alt="Contact" 
                 className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0"
               />
               <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/90 to-transparent"></div>
           </div>

           {/* Content */}
           <div className="relative z-10 p-8 md:p-10 flex-1 flex flex-col justify-between">
               <div>
                   <div className="flex items-center gap-2 mb-4">
                       <Badge variant="yellow" className="shadow-lg shadow-[#EAD07D]/20 animate-pulse">Highest Priority</Badge>
                       <span className="text-white/60 text-xs font-bold uppercase tracking-wider">• Deal Value: $850k</span>
                   </div>
                   <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">James Wilson</h2>
                   <p className="text-xl text-white/80 font-light">CTO at GlobalBank</p>
               </div>

               <div className="mt-8">
                   <div className="flex items-start gap-3 mb-6 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 max-w-lg">
                       <AlertCircle className="text-[#EAD07D] shrink-0 mt-0.5" size={18} />
                       <div>
                           <p className="text-white text-sm font-medium leading-relaxed">
                               AI detected high intent: James viewed the "Enterprise Security" doc 3 times in the last hour.
                           </p>
                       </div>
                   </div>
                   <div className="flex gap-4">
                       <button className="bg-[#EAD07D] text-[#1A1A1A] px-6 py-3 rounded-full font-bold text-sm hover:bg-[#d4bd71] transition-colors shadow-lg flex items-center gap-2">
                           <Phone size={16} /> Call Now
                       </button>
                       <button className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-full font-bold text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                           <Mail size={16} /> Email Draft Ready
                       </button>
                   </div>
               </div>
           </div>

           {/* Right Side Stats (on Desktop) */}
           <div className="relative z-10 w-full md:w-64 bg-black/20 backdrop-blur-md border-l border-white/10 p-8 flex flex-col justify-center gap-8">
               <div>
                   <div className="text-3xl font-light text-white mb-1">60%</div>
                   <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Probability</div>
               </div>
               <div>
                   <div className="text-3xl font-light text-white mb-1">12d</div>
                   <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Time in Stage</div>
               </div>
               <div>
                   <div className="text-3xl font-light text-[#EAD07D] mb-1">9.2</div>
                   <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Engagement Score</div>
               </div>
           </div>
        </Card>

        {/* 2. LIVE SIGNALS - Real-time intent tracking */}
        <div className="md:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 p-6 overflow-hidden relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h3 className="font-bold text-[#1A1A1A]">Live Signals</h3>
                    </div>
                    <Link to="/dashboard/analytics" className="text-xs font-bold text-[#666] hover:text-[#1A1A1A]">View All</Link>
                </div>

                <div className="space-y-6 relative">
                    {/* Connection Line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

                    {[
                        { icon: Eye, color: 'bg-blue-100 text-blue-600', text: 'Acme Corp viewed pricing', time: '2m ago' },
                        { icon: MousePointerClick, color: 'bg-[#EAD07D]/20 text-[#1A1A1A]', text: 'Nebula clicked email link', time: '15m ago' },
                        { icon: TrendingUp, color: 'bg-green-100 text-green-600', text: 'Vertex score increased', time: '1h ago' },
                        { icon: Eye, color: 'bg-gray-100 text-gray-600', text: 'Sisyphus opened doc', time: '2h ago' }
                    ].map((signal, i) => (
                        <div key={i} className="flex gap-4 relative z-10 items-center group cursor-pointer">
                            <div className={`w-10 h-10 rounded-full ${signal.color} flex items-center justify-center border-4 border-white shadow-sm shrink-0`}>
                                <signal.icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1A1A1A] truncate group-hover:text-[#EAD07D] transition-colors">{signal.text}</p>
                                <p className="text-xs text-[#999]">{signal.time}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>

        {/* 3. REVENUE FORECAST (AI) */}
        <Card padding="lg" className="md:col-span-4 min-h-[340px] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-[#1A1A1A] text-lg">AI Forecast</h3>
                    <p className="text-xs text-[#666]">End of Quarter Projection</p>
                </div>
                <Badge variant="green" size="sm">+14% vs Target</Badge>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-light text-[#1A1A1A]">$1.42M</span>
                <span className="text-sm text-[#666] font-medium">projected</span>
            </div>

            {/* Visual Bar Chart */}
            <div className="flex items-end justify-between h-32 gap-2">
                {[35, 45, 40, 60, 55, 75].map((h, i) => (
                    <div key={i} className="w-full bg-[#F2F1EA] rounded-t-xl relative group overflow-hidden">
                        <div 
                            style={{height: `${h}%`}} 
                            className={`absolute bottom-0 w-full transition-all duration-1000 ${i >= 4 ? 'bg-[url("https://www.transparenttextures.com/patterns/diagonal-stripes.png")] bg-[#EAD07D] opacity-80' : 'bg-[#1A1A1A]'}`}
                        ></div>
                        {i === 5 && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-xs text-[#999] font-bold mt-4">
                <span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span>
            </div>
        </Card>

        {/* 4. ACTIVITY FEED */}
        <div className="md:col-span-4 h-[340px]">
           <ActivityFeed />
        </div>

        {/* 5. QUICK ACTIONS */}
        <div className="md:col-span-4 h-[340px]">
            <QuickActions />
        </div>

      </div>
    </div>
  );
};