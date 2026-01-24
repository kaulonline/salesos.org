import React from 'react';
import { Sparkles, TrendingUp, AlertCircle, Eye, MousePointerClick, Phone, Mail, Clock, Video, Flame, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ActivityFeed, QuickActions } from '../../components/dashboard';
import { useDashboard } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const {
    loading: isLoading,
    pipelineStats,
    leadStats,
    forecast,
    quotaAttainment,
    totalDeals,
    closedWonThisMonth,
    totalPipeline,
  } = useDashboard();

  // Time based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Get user's first name
  const userName = user?.firstName || user?.email?.split('@')[0] || 'there';

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate estimated commission (3% of closed-won value)
  const estimatedCommission = (pipelineStats?.closedWonValue || 0) * 0.03;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
           <Skeleton className="h-10 w-64 mb-4" />
           <Skeleton className="h-24 w-full rounded-3xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <Skeleton className="md:col-span-8 h-[420px] rounded-[2.5rem]" />
           <div className="md:col-span-4 flex flex-col gap-6">
              <Skeleton className="h-[200px] rounded-[2.5rem]" />
              <Skeleton className="h-[200px] rounded-[2.5rem]" />
           </div>
           <Skeleton className="md:col-span-8 h-[340px] rounded-[2.5rem]" />
           <Skeleton className="md:col-span-4 h-[340px] rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* 1. HEADER & METRICS */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-end gap-6">
          <div>
              <div className="flex items-center gap-2 mb-2 text-[#666] font-medium text-sm">
                  <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-orange-500">
                      <Flame size={14} fill="currentColor" /> 12 Day Streak
                  </div>
              </div>
              <h1 className="text-4xl font-medium text-[#1A1A1A] tracking-tight">
                {greeting}, <span className="font-bold">{userName}</span>
              </h1>
          </div>
          
          <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Quota Attainment</div>
                  <div className="flex items-center gap-2 justify-end">
                      <span className="text-2xl font-light text-[#1A1A1A]">{quotaAttainment}%</span>
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: `${quotaAttainment}%` }}></div>
                      </div>
                  </div>
              </div>
              <div className="bg-[#EAD07D]/10 px-6 py-3 rounded-2xl border border-[#EAD07D]/20">
                  <div className="text-xs font-bold text-[#EAD07D] uppercase tracking-wider mb-1">Est. Commission</div>
                  <div className="text-2xl font-bold text-[#1A1A1A]">{formatCurrency(estimatedCommission)}</div>
              </div>
          </div>
      </div>

      {/* 2. FROSTED GLASS STATS STRIP */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          {/* Pill-based Control Center */}
          <div className="flex items-center gap-3 bg-white/60 p-2 pr-6 rounded-full backdrop-blur-xl border border-white/40 shadow-sm">
              <Badge variant="dark" size="md" className="px-5 py-2 shadow-lg">Pipeline</Badge>
              <Badge variant="yellow" size="md" className="px-5 py-2 shadow-sm">Won</Badge>
              <Badge variant="outline" size="md" className="px-4 py-1.5 border-black/10 bg-white/50">Lost</Badge>
              <div className="w-32 h-2 bg-gray-200/50 rounded-full overflow-hidden relative ml-2">
                  <div className="h-full bg-[#1A1A1A] w-[65%] rounded-full"></div>
                  <div className="absolute top-0 left-[65%] h-full w-[20%] bg-[#EAD07D] rounded-full"></div>
              </div>
              <span className="text-xs font-bold text-[#666] ml-1">85%</span>
          </div>

          {/* Key Metrics */}
          <div className="flex gap-8 md:gap-12">
              {[
                  { label: 'Deals', val: String(totalDeals), trend: leadStats?.newThisWeek ? `+${leadStats.newThisWeek}` : '' },
                  { label: 'Closed', val: String(closedWonThisMonth), trend: pipelineStats?.winRate ? `${Math.round(pipelineStats.winRate)}%` : '' },
                  { label: 'Pipeline', val: formatCurrency(totalPipeline), trend: '' }
              ].map(stat => (
                  <div key={stat.label} className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-3xl font-light text-[#1A1A1A]">{stat.val}</span>
                          {stat.trend && <span className="text-xs font-bold text-green-500">{stat.trend}</span>}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[#999] tracking-wider mt-0.5">{stat.label}</div>
                  </div>
              ))}
          </div>
      </div>

      {/* 3. AI INTELLIGENCE TICKER */}
      <div className="mb-8 bg-white rounded-2xl p-1 shadow-sm border border-black/5 flex items-center gap-2 pr-4 relative overflow-hidden group">
          <div className="bg-[#1A1A1A] text-white px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 z-10">
              <Sparkles size={14} className="text-[#EAD07D]" />
              <span className="font-bold text-xs tracking-wide">AI BRIEF</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-6">
              <div className="absolute w-full animate-slide-up-fade">
                   <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      <span className="font-bold">GlobalBank</span> is showing high intent signals. Recommend sending "Security_Compliance_v2.pdf".
                   </p>
              </div>
          </div>
          <button className="text-xs font-bold text-[#666] hover:text-[#1A1A1A] underline decoration-dotted">View All</button>
      </div>

      {/* 4. MAIN COCKPIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* LEFT COLUMN: FOCUS DEAL (Hero) */}
        <div className="lg:col-span-8">
            <Card variant="dark" className="h-full min-h-[420px] p-0 relative group overflow-hidden flex flex-col">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1600" 
                        alt="Office" 
                        className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-1000 grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/95 to-[#1A1A1A]/60"></div>
                </div>

                {/* Header */}
                <div className="relative z-10 p-8 flex justify-between items-start border-b border-white/10">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="yellow" className="shadow-[0_0_15px_rgba(234,208,125,0.3)] animate-pulse">Focus Deal</Badge>
                            <span className="text-white/60 text-xs font-bold uppercase tracking-wider ml-2">Proposal Stage • 60% Prob</span>
                        </div>
                        <h2 className="text-3xl font-medium text-white tracking-tight">GlobalBank Enterprise</h2>
                    </div>
                    <div className="text-right">
                         <div className="text-3xl font-light text-white">$850k</div>
                         <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Deal Value</div>
                    </div>
                </div>

                {/* Body */}
                <div className="relative z-10 p-8 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Why it's in focus</h4>
                             <div className="space-y-4">
                                 <div className="flex gap-3">
                                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] shrink-0"><AlertCircle size={16} /></div>
                                     <div>
                                         <p className="text-white text-sm font-medium leading-snug">High Intent Detected</p>
                                         <p className="text-white/50 text-xs">Viewed pricing page 3x in last 24h.</p>
                                     </div>
                                 </div>
                                 <div className="flex gap-3">
                                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] shrink-0"><Clock size={16} /></div>
                                     <div>
                                         <p className="text-white text-sm font-medium leading-snug">Stalled Velocity</p>
                                         <p className="text-white/50 text-xs">No activity logged in 5 days.</p>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Buying Committee</h4>
                            <div className="flex items-center gap-3">
                                <div className="relative group/avatar cursor-pointer">
                                    <Avatar src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" size="md" border className="ring-2 ring-[#EAD07D]" />
                                    <div className="absolute -bottom-1 -right-1 bg-[#EAD07D] text-[#1A1A1A] text-[10px] font-bold px-1 rounded">DM</div>
                                </div>
                                <div className="relative group/avatar cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                                    <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" size="md" border />
                                    <div className="absolute -bottom-1 -right-1 bg-gray-500 text-white text-[10px] font-bold px-1 rounded">INF</div>
                                </div>
                                <button className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white transition-colors">
                                    <span className="text-lg">+</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="relative z-10 p-4 bg-white/5 backdrop-blur-md border-t border-white/10 flex gap-3">
                    <button className="flex-1 bg-[#EAD07D] text-[#1A1A1A] py-3 rounded-xl font-bold text-sm hover:bg-[#d4bd71] transition-colors shadow-lg flex items-center justify-center gap-2">
                         <Phone size={16} /> Call Champion
                    </button>
                    <button className="flex-1 bg-white/10 text-white border border-white/20 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                         <Mail size={16} /> Email Buying Group
                    </button>
                    <button className="px-4 bg-transparent text-white/60 hover:text-white border border-white/10 rounded-xl hover:bg-white/5">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </Card>
        </div>

        {/* RIGHT COLUMN: CONTEXT (Up Next + Quick Actions) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* UP NEXT CARD */}
            <Card variant="default" className="flex-1 p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px] border-[#EAD07D]/20">
                <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Up Next • 14m</span>
                     </div>
                     <button className="text-[#1A1A1A] hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><MoreHorizontal size={16} /></button>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A] leading-tight mb-1">Product Demo</h3>
                    <p className="text-sm text-[#666] mb-4">with Acme Corp Team</p>
                    
                    <div className="flex items-center gap-4 text-xs text-[#1A1A1A] font-medium bg-[#F8F8F6] p-3 rounded-xl mb-4">
                        <div className="flex items-center gap-1.5"><Clock size={14} className="text-[#EAD07D]" /> 10:00 - 11:00</div>
                        <div className="flex items-center gap-1.5"><Video size={14} className="text-[#EAD07D]" /> Zoom</div>
                    </div>
                </div>

                <button className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-black flex items-center justify-center gap-2 shadow-md">
                    <Video size={14} /> Join Meeting
                </button>
            </Card>

            {/* QUICK ACTIONS COMPONENT */}
            <div className="h-[200px]">
                 <QuickActions />
            </div>

        </div>
      </div>

      {/* 4. METRICS & SIGNALS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* REVENUE FORECAST (Enhanced) */}
          <Card padding="lg" className="lg:col-span-8 min-h-[340px] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-[#1A1A1A] text-lg">AI Forecast</h3>
                    <p className="text-xs text-[#666]">End of Quarter Projection</p>
                </div>
                <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 text-xs font-medium">
                         <span className="w-2 h-2 rounded-full bg-[#1A1A1A]"></span> Actual
                     </div>
                     <div className="flex items-center gap-2 text-xs font-medium">
                         <span className="w-2 h-2 rounded-full bg-[#EAD07D] opacity-50"></span> Projected
                     </div>
                     <Badge variant="green" size="sm">+14% vs Target</Badge>
                </div>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-light text-[#1A1A1A]">{formatCurrency(forecast?.bestCase || pipelineStats?.weightedPipeline || 0)}</span>
                <span className="text-sm text-[#666] font-medium">projected</span>
            </div>

            {/* Visual Bar Chart */}
            <div className="flex items-end justify-between h-32 gap-3">
                {[35, 45, 40, 60, 55, 75, 82, 90].map((h, i) => (
                    <div key={i} className="w-full bg-[#F8F8F6] rounded-t-lg relative group overflow-hidden">
                        <div 
                            style={{height: `${h}%`}} 
                            className={`absolute bottom-0 w-full transition-all duration-1000 ${i >= 5 ? 'bg-[url("https://www.transparenttextures.com/patterns/diagonal-stripes.png")] bg-[#EAD07D] opacity-60' : 'bg-[#1A1A1A]'}`}
                        >
                            {/* Hover Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1A1A1A] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                                ${h}0k
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-xs text-[#999] font-bold mt-4 px-1">
                <span>Aug W1</span><span>W2</span><span>W3</span><span>W4</span><span>Sep W1</span><span>W2</span><span>W3</span><span>W4</span>
            </div>
          </Card>

          {/* LIVE SIGNALS (Vertical Feed) */}
          <Card className="lg:col-span-4 p-0 overflow-hidden relative flex flex-col">
                <div className="p-6 pb-2 flex justify-between items-center bg-white z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h3 className="font-bold text-[#1A1A1A]">Live Signals</h3>
                    </div>
                    <Link to="/dashboard/analytics" className="text-xs font-bold text-[#666] hover:text-[#1A1A1A]">View All</Link>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 relative">
                    {/* Connection Line */}
                    <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gray-100"></div>

                    {[
                        { icon: Eye, color: 'bg-blue-100 text-blue-600', text: 'Acme Corp viewed pricing', time: '2m ago', score: '+5' },
                        { icon: MousePointerClick, color: 'bg-[#EAD07D]/20 text-[#1A1A1A]', text: 'Nebula clicked email link', time: '15m ago', score: '+2' },
                        { icon: TrendingUp, color: 'bg-green-100 text-green-600', text: 'Vertex score increased', time: '1h ago', score: '+10' },
                        { icon: Eye, color: 'bg-gray-100 text-gray-600', text: 'Sisyphus opened doc', time: '2h ago', score: '+1' },
                        { icon: Mail, color: 'bg-purple-100 text-purple-600', text: 'GlobalBank replied', time: '3h ago', score: '+8' }
                    ].map((signal, i) => (
                        <div key={i} className="flex gap-4 relative z-10 items-start group cursor-pointer hover:bg-gray-50/50 -mx-2 p-2 rounded-lg transition-colors">
                            <div className={`w-8 h-8 rounded-full ${signal.color} flex items-center justify-center border-4 border-white shadow-sm shrink-0 mt-0.5`}>
                                <signal.icon size={12} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#EAD07D] transition-colors leading-tight">{signal.text}</p>
                                <p className="text-xs text-[#999] mt-1">{signal.time}</p>
                            </div>
                            <div className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{signal.score}</div>
                        </div>
                    ))}
                </div>
          </Card>
      </div>

      {/* 5. ACTIVITY FEED (Full Width) */}
      <div className="h-[400px]">
           <ActivityFeed />
      </div>

    </div>
  );
};