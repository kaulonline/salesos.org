import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Eye, MousePointerClick, Phone, Mail, Clock, Video, Flame, MoreHorizontal, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ActivityFeed, QuickActions } from '../../components/dashboard';
import { useDashboard, useDeals, useMeetings, useActivities } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';

const getStageLabel = (stage: string) => {
  const labels: Record<string, string> = {
    'PROSPECTING': 'Prospecting',
    'QUALIFICATION': 'Qualification',
    'NEEDS_ANALYSIS': 'Needs Analysis',
    'VALUE_PROPOSITION': 'Value Prop',
    'DECISION_MAKERS_IDENTIFIED': 'Decision Makers',
    'PERCEPTION_ANALYSIS': 'Perception',
    'PROPOSAL_PRICE_QUOTE': 'Proposal',
    'NEGOTIATION_REVIEW': 'Negotiation',
    'CLOSED_WON': 'Closed Won',
    'CLOSED_LOST': 'Closed Lost',
  };
  return labels[stage] || stage;
};

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

  const { deals, loading: dealsLoading } = useDeals();
  const { meetings, loading: meetingsLoading } = useMeetings({ limit: 5 });
  const { activities, loading: activitiesLoading } = useActivities({ limit: 5 });

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

  // Focus deal - highest value open deal
  const focusDeal = useMemo(() => {
    const openDeals = deals.filter(d => !d.isClosed);
    if (openDeals.length === 0) return null;
    return openDeals.sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
  }, [deals]);

  // Next meeting
  const nextMeeting = useMemo(() => {
    const now = new Date();
    const upcoming = meetings.filter(m => new Date(m.startTime) > now && m.status === 'SCHEDULED');
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [meetings]);

  // Time until next meeting
  const timeUntilMeeting = useMemo(() => {
    if (!nextMeeting) return null;
    const now = new Date();
    const start = new Date(nextMeeting.startTime);
    const diffMs = start.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  }, [nextMeeting]);

  // Format meeting time
  const formatMeetingTime = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  // Recent signals from activities
  const recentSignals = useMemo(() => {
    return activities.slice(0, 5).map(activity => {
      let icon = Eye;
      let color = 'bg-gray-100 text-gray-600';
      let score = '+1';

      switch (activity.type) {
        case 'EMAIL':
          icon = Mail;
          color = 'bg-purple-100 text-purple-600';
          score = '+3';
          break;
        case 'CALL':
          icon = Phone;
          color = 'bg-blue-100 text-blue-600';
          score = '+5';
          break;
        case 'MEETING':
          icon = Video;
          color = 'bg-[#EAD07D]/20 text-[#1A1A1A]';
          score = '+8';
          break;
        case 'DEAL_UPDATE':
          icon = TrendingUp;
          color = 'bg-green-100 text-green-600';
          score = '+10';
          break;
        default:
          icon = Eye;
          color = 'bg-gray-100 text-gray-600';
          score = '+1';
      }

      const timeAgo = getTimeAgo(activity.createdAt);

      return {
        icon,
        color,
        text: activity.subject || `${activity.type.toLowerCase().replace('_', ' ')}`,
        time: timeAgo,
        score,
      };
    });
  }, [activities]);

  function getTimeAgo(date: string) {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  if (isLoading || dealsLoading) {
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
                  {closedWonThisMonth > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-orange-500">
                          <Flame size={14} fill="currentColor" /> {closedWonThisMonth} Won
                      </div>
                    </>
                  )}
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
                          <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: `${Math.min(quotaAttainment, 100)}%` }}></div>
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
                  <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: `${Math.min(pipelineStats?.winRate || 0, 100)}%` }}></div>
              </div>
              <span className="text-xs font-bold text-[#666] ml-1">{Math.round(pipelineStats?.winRate || 0)}%</span>
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
      {focusDeal && (
        <div className="mb-8 bg-white rounded-2xl p-1 shadow-sm border border-black/5 flex items-center gap-2 pr-4 relative overflow-hidden group">
            <div className="bg-[#1A1A1A] text-white px-4 py-2 rounded-xl flex items-center gap-2 shrink-0 z-10">
                <Sparkles size={14} className="text-[#EAD07D]" />
                <span className="font-bold text-xs tracking-wide">AI BRIEF</span>
            </div>
            <div className="flex-1 overflow-hidden relative h-6">
                <div className="absolute w-full animate-slide-up-fade">
                     <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        <span className="font-bold">{focusDeal.account?.name || focusDeal.name}</span> is at {focusDeal.probability || 50}% probability.
                        {focusDeal.nextStep && ` Next step: ${focusDeal.nextStep}`}
                     </p>
                </div>
            </div>
            <Link to={`/dashboard/deals/${focusDeal.id}`} className="text-xs font-bold text-[#666] hover:text-[#1A1A1A] underline decoration-dotted">View Deal</Link>
        </div>
      )}

      {/* 4. MAIN COCKPIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

        {/* LEFT COLUMN: FOCUS DEAL (Hero) */}
        <div className="lg:col-span-8">
            {focusDeal ? (
              <Card variant="dark" className="h-full min-h-[420px] p-0 relative group overflow-hidden flex flex-col">
                  {/* Background with Overlay */}
                  <div className="absolute inset-0 z-0">
                      <div className="w-full h-full bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A]"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/95 to-[#1A1A1A]/60"></div>
                  </div>

                  {/* Header */}
                  <div className="relative z-10 p-8 flex justify-between items-start border-b border-white/10">
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <Badge variant="yellow" className="shadow-[0_0_15px_rgba(234,208,125,0.3)]">Focus Deal</Badge>
                              <span className="text-white/60 text-xs font-bold uppercase tracking-wider ml-2">
                                {getStageLabel(focusDeal.stage)} • {focusDeal.probability || 50}% Prob
                              </span>
                          </div>
                          <h2 className="text-3xl font-medium text-white tracking-tight">
                            {focusDeal.account?.name || focusDeal.name}
                          </h2>
                      </div>
                      <div className="text-right">
                           <div className="text-3xl font-light text-white">{formatCurrency(focusDeal.amount || 0)}</div>
                           <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Deal Value</div>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="relative z-10 p-8 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                               <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Deal Details</h4>
                               <div className="space-y-4">
                                   <div className="flex gap-3">
                                       <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] shrink-0">
                                         <Building2 size={16} />
                                       </div>
                                       <div>
                                           <p className="text-white text-sm font-medium leading-snug">{focusDeal.name}</p>
                                           <p className="text-white/50 text-xs">
                                             {focusDeal.closeDate
                                               ? `Expected close: ${new Date(focusDeal.closeDate).toLocaleDateString()}`
                                               : 'No close date set'}
                                           </p>
                                       </div>
                                   </div>
                                   {focusDeal.nextStep && (
                                     <div className="flex gap-3">
                                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] shrink-0">
                                           <AlertCircle size={16} />
                                         </div>
                                         <div>
                                             <p className="text-white text-sm font-medium leading-snug">Next Step</p>
                                             <p className="text-white/50 text-xs">{focusDeal.nextStep}</p>
                                         </div>
                                     </div>
                                   )}
                                   {focusDeal.riskFactors && focusDeal.riskFactors.length > 0 && (
                                     <div className="flex gap-3">
                                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#EAD07D] shrink-0">
                                           <Clock size={16} />
                                         </div>
                                         <div>
                                             <p className="text-white text-sm font-medium leading-snug">Risk Factor</p>
                                             <p className="text-white/50 text-xs">{focusDeal.riskFactors[0]}</p>
                                         </div>
                                     </div>
                                   )}
                               </div>
                          </div>

                          <div>
                              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Deal Stage</h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-white/60 text-sm">Stage</span>
                                  <span className="text-white font-medium text-sm">{getStageLabel(focusDeal.stage)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/60 text-sm">Probability</span>
                                  <span className="text-white font-medium text-sm">{focusDeal.probability || 50}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/60 text-sm">Expected Revenue</span>
                                  <span className="text-white font-medium text-sm">
                                    {formatCurrency((focusDeal.amount || 0) * ((focusDeal.probability || 50) / 100))}
                                  </span>
                                </div>
                                <div className="w-full bg-white/10 h-2 rounded-full mt-2">
                                  <div
                                    className="h-full bg-[#EAD07D] rounded-full transition-all"
                                    style={{ width: `${focusDeal.probability || 50}%` }}
                                  ></div>
                                </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="relative z-10 p-4 bg-white/5 backdrop-blur-md border-t border-white/10 flex gap-3">
                      <Link
                        to={`/dashboard/deals/${focusDeal.id}`}
                        className="flex-1 bg-[#EAD07D] text-[#1A1A1A] py-3 rounded-xl font-bold text-sm hover:bg-[#d4bd71] transition-colors shadow-lg flex items-center justify-center gap-2"
                      >
                           <Eye size={16} /> View Deal
                      </Link>
                      <button className="flex-1 bg-white/10 text-white border border-white/20 py-3 rounded-xl font-bold text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                           <Mail size={16} /> Send Email
                      </button>
                      <button className="px-4 bg-transparent text-white/60 hover:text-white border border-white/10 rounded-xl hover:bg-white/5">
                          <MoreHorizontal size={20} />
                      </button>
                  </div>
              </Card>
            ) : (
              <Card variant="dark" className="h-full min-h-[420px] flex items-center justify-center">
                <div className="text-center">
                  <Building2 size={48} className="mx-auto mb-4 text-white/30" />
                  <h3 className="text-xl font-medium text-white mb-2">No Deals Yet</h3>
                  <p className="text-white/60 mb-6">Create your first deal to see it here</p>
                  <Link
                    to="/dashboard/deals"
                    className="px-6 py-3 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-bold text-sm hover:bg-[#d4bd71] transition-colors"
                  >
                    Go to Deals
                  </Link>
                </div>
              </Card>
            )}
        </div>

        {/* RIGHT COLUMN: CONTEXT (Up Next + Quick Actions) */}
        <div className="lg:col-span-4 flex flex-col gap-6">

            {/* UP NEXT CARD */}
            <Card variant="default" className="flex-1 p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px] border-[#EAD07D]/20">
                {nextMeeting ? (
                  <>
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#666]">Up Next • {timeUntilMeeting}</span>
                         </div>
                         <button className="text-[#1A1A1A] hover:bg-gray-100 p-1.5 rounded-lg transition-colors"><MoreHorizontal size={16} /></button>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-[#1A1A1A] leading-tight mb-1">{nextMeeting.title}</h3>
                        <p className="text-sm text-[#666] mb-4">
                          {nextMeeting.account?.name || (nextMeeting.participants?.length ? `with ${nextMeeting.participants[0].name}` : 'Meeting')}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-[#1A1A1A] font-medium bg-[#F8F8F6] p-3 rounded-xl mb-4">
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-[#EAD07D]" />
                              {formatMeetingTime(nextMeeting.startTime, nextMeeting.endTime)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Video size={14} className="text-[#EAD07D]" />
                              {nextMeeting.type === 'VIDEO' ? 'Video' : nextMeeting.type === 'CALL' ? 'Call' : nextMeeting.location || 'Meeting'}
                            </div>
                        </div>
                    </div>

                    {nextMeeting.meetingLink ? (
                      <a
                        href={nextMeeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-black flex items-center justify-center gap-2 shadow-md"
                      >
                          <Video size={14} /> Join Meeting
                      </a>
                    ) : (
                      <Link
                        to="/dashboard/calendar"
                        className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-black flex items-center justify-center gap-2 shadow-md"
                      >
                          <Video size={14} /> View Details
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Clock size={32} className="text-[#999] mb-3 opacity-40" />
                    <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">No Upcoming Meetings</h3>
                    <p className="text-xs text-[#666] mb-4">Your calendar is clear</p>
                    <Link
                      to="/dashboard/calendar"
                      className="text-xs font-bold text-[#EAD07D] hover:underline"
                    >
                      Schedule a Meeting
                    </Link>
                  </div>
                )}
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
                     {pipelineStats?.winRate && pipelineStats.winRate > 50 && (
                       <Badge variant="green" size="sm">+{Math.round(pipelineStats.winRate - 50)}% vs Target</Badge>
                     )}
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
                <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span><span>W8</span>
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

                    {recentSignals.length > 0 ? recentSignals.map((signal, i) => (
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
                    )) : (
                      <div className="text-center py-8">
                        <Eye size={32} className="mx-auto mb-2 text-[#999] opacity-40" />
                        <p className="text-sm text-[#666]">No recent signals</p>
                        <p className="text-xs text-[#999]">Activity will appear here</p>
                      </div>
                    )}
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
