import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Phone,
  Mail,
  Clock,
  Video,
  Target,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Briefcase,
  Award,
  BarChart3,
  PhoneCall,
  MessageSquare,
  UserPlus,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDashboard, useDeals, useMeetings, useActivities, useTasks } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';

// Accordion Item Component
const AccordionItem: React.FC<{
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-1 text-left hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#666]">{icon}</span>
          <span className="font-medium text-[#1A1A1A] text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-[#999]" /> : <ChevronDown size={18} className="text-[#999]" />}
      </button>
      {isOpen && children && (
        <div className="pb-4 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

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
  const { meetings } = useMeetings({ limit: 10 });
  const { activities } = useActivities({ limit: 10 });
  const { tasks } = useTasks({ limit: 8 });

  const userName = user?.firstName || user?.email?.split('@')[0] || 'there';

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate metrics
  const winRate = pipelineStats?.winRate || 0;
  const estimatedCommission = (pipelineStats?.closedWonValue || 0) * 0.03;

  // Top deals by value
  const topDeals = useMemo(() => {
    const openDeals = deals.filter(d => !d.isClosed);
    return openDeals.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 3);
  }, [deals]);

  // This week's meetings for calendar
  const thisWeekMeetings = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return meetings.filter(m => {
      const meetingDate = new Date(m.startTime);
      return meetingDate >= startOfWeek && meetingDate < endOfWeek;
    });
  }, [meetings]);

  // Get week dates
  const weekDates = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);

    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  }, []);

  // Daily activity breakdown (calls, emails, meetings per day) - LAST 30 DAYS
  const dailyActivities = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const counts = Array.from({ length: 7 }, () => ({ calls: 0, emails: 0, meetings: 0, total: 0 }));

    activities.forEach(activity => {
      const activityDate = new Date(activity.createdAt);
      // Count activities from last 30 days, grouped by day of week
      if (activityDate >= thirtyDaysAgo) {
        const day = activityDate.getDay();
        if (activity.type === 'CALL') counts[day].calls++;
        else if (activity.type === 'EMAIL') counts[day].emails++;
        else if (activity.type === 'MEETING') counts[day].meetings++;
        counts[day].total++;
      }
    });

    return counts;
  }, [activities]);

  const maxDailyActivity = Math.max(...dailyActivities.map(d => d.total), 1);
  const totalMonthlyActivities = dailyActivities.reduce((sum, d) => sum + d.total, 0);

  // Completed vs total tasks
  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'COMPLETED').length;
  }, [tasks]);

  // Sales tasks only (filter for relevant ones)
  const salesTasks = useMemo(() => {
    return tasks.slice(0, 5);
  }, [tasks]);

  // Current month name
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { month: 'long' });
  const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'long' });

  // Deal velocity - average days to close (calculated from real deal data)
  const dealVelocity = useMemo(() => {
    const closedWonDeals = deals.filter(d => d.isClosed && d.isWon && d.closedDate && d.createdAt);
    if (closedWonDeals.length === 0) return 0;

    const totalDays = closedWonDeals.reduce((sum, deal) => {
      const created = new Date(deal.createdAt);
      const closed = new Date(deal.closedDate!);
      const diffDays = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(diffDays, 0);
    }, 0);

    return Math.round(totalDays / closedWonDeals.length);
  }, [deals]);

  // Conversion rate through stages
  const conversionRate = useMemo(() => {
    const total = deals.length;
    if (total === 0) return 0;
    const qualified = deals.filter(d =>
      !['PROSPECTING', 'QUALIFICATION'].includes(d.stage)
    ).length;
    return Math.round((qualified / total) * 100);
  }, [deals]);

  // Loading state
  if (isLoading || dealsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FEFCF3] via-[#FDF8E8] to-[#F5F0DC] p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="flex gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
          </div>
          <div className="grid grid-cols-12 gap-6">
            <Skeleton className="col-span-3 h-[500px] rounded-3xl" />
            <Skeleton className="col-span-3 h-80 rounded-3xl" />
            <Skeleton className="col-span-3 h-80 rounded-3xl" />
            <Skeleton className="col-span-3 h-80 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFCF3] via-[#FDF8E8] to-[#F5F0DC] p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">
            Welcome back, <span className="font-normal">{userName}</span>
          </h1>

          {/* Large Stats - Right Side */}
          <div className="flex items-center gap-8 lg:gap-12">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Users size={20} className="text-[#999]" />
                <span className="text-4xl lg:text-5xl font-light text-[#1A1A1A]">{leadStats?.total || 0}</span>
              </div>
              <p className="text-xs font-medium text-[#999]">Leads</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Target size={20} className="text-[#999]" />
                <span className="text-4xl lg:text-5xl font-light text-[#1A1A1A]">{totalDeals}</span>
              </div>
              <p className="text-xs font-medium text-[#999]">Open Deals</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <DollarSign size={20} className="text-[#999]" />
                <span className="text-4xl lg:text-5xl font-light text-[#1A1A1A]">{formatCurrency(totalPipeline)}</span>
              </div>
              <p className="text-xs font-medium text-[#999]">Pipeline</p>
            </div>
          </div>
        </div>

        {/* Metric Pills Row */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="text-sm text-[#666] mr-2">Win Rate</span>
          <div className="px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A]">
            {Math.round(winRate)}%
          </div>
          <div className="px-4 py-2 bg-[#1A1A1A] rounded-full text-sm font-semibold text-white">
            {closedWonThisMonth} Closed Won
          </div>

          <span className="text-sm text-[#666] ml-4 mr-2">Quota</span>
          <div className="px-4 py-2 bg-white rounded-full text-sm font-medium text-[#1A1A1A] border border-black/5 flex items-center gap-3 shadow-sm">
            <div className="w-24 h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(quotaAttainment, 100)}%` }}
              />
            </div>
            {quotaAttainment}%
          </div>

          <span className="text-sm text-[#666] ml-4 mr-2">Conversion</span>
          <div className="px-4 py-2 bg-white rounded-full text-sm font-medium text-[#1A1A1A] border border-black/5 shadow-sm">
            {conversionRate}%
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Sales Rep Profile Card - Left Column */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-[#F5EED6] to-[#EDE4C5] rounded-[32px] p-6 shadow-sm">
              {/* Profile Image */}
              <div className="relative mb-4">
                <div className="w-full aspect-square rounded-[24px] overflow-hidden bg-[#E5DCC3]">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EAD07D] to-[#D4BC5E]">
                      <span className="text-6xl font-light text-white">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Commission Badge */}
                <div className="absolute bottom-4 right-4 px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] shadow-lg">
                  {formatCurrency(estimatedCommission)}
                </div>
              </div>

              {/* Name & Role */}
              <h2 className="text-xl font-semibold text-[#1A1A1A] mb-1">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-sm text-[#666] mb-6">{user?.role || 'Sales Representative'}</p>

              {/* Accordion Sections */}
              <div className="bg-white/60 rounded-2xl px-4">
                <AccordionItem
                  title="Pipeline Overview"
                  icon={<TrendingUp size={18} />}
                  defaultOpen={true}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666]">Open Opportunities</span>
                      <span className="font-medium">{pipelineStats?.totalOpportunities || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Total Value</span>
                      <span className="font-medium">{formatCurrency(totalPipeline)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Avg Deal Size</span>
                      <span className="font-medium">
                        {formatCurrency(totalPipeline / (pipelineStats?.totalOpportunities || 1))}
                      </span>
                    </div>
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Top Deals"
                  icon={<Award size={18} />}
                >
                  {topDeals.length > 0 ? (
                    <div className="space-y-3">
                      {topDeals.map((deal, i) => (
                        <Link
                          key={deal.id}
                          to={`/dashboard/deals/${deal.id}`}
                          className="block hover:bg-black/5 rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#EAD07D] text-xs font-semibold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="font-medium text-[#1A1A1A] text-sm truncate flex-1">{deal.name}</span>
                          </div>
                          <div className="flex justify-between mt-1 ml-7">
                            <span className="text-xs text-[#666]">{getStageLabel(deal.stage)}</span>
                            <span className="text-xs font-medium">{formatCurrency(deal.amount || 0)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#666]">No active deals</p>
                  )}
                </AccordionItem>

                <AccordionItem
                  title="Commission & Earnings"
                  icon={<DollarSign size={18} />}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666]">MTD Commission</span>
                      <span className="font-medium text-green-600">{formatCurrency(estimatedCommission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Closed Revenue</span>
                      <span className="font-medium">{formatCurrency(pipelineStats?.closedWonValue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Projected (Pipeline)</span>
                      <span className="font-medium text-[#666]">{formatCurrency(totalPipeline * 0.03)}</span>
                    </div>
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Performance Stats"
                  icon={<BarChart3 size={18} />}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666]">Win Rate</span>
                      <span className="font-medium">{Math.round(winRate)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Avg Deal Cycle</span>
                      <span className="font-medium">{dealVelocity} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Quota Attainment</span>
                      <span className="font-medium">{quotaAttainment}%</span>
                    </div>
                  </div>
                </AccordionItem>
              </div>
            </div>
          </div>

          {/* Middle Section */}
          <div className="lg:col-span-6 space-y-6">
            {/* Activity & Deal Velocity Row */}
            <div className="grid grid-cols-2 gap-6">
              {/* Sales Activity Card */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-[#1A1A1A]">Sales Activity</h3>
                  <Link to="/dashboard/analytics" className="text-[#999] hover:text-[#1A1A1A]">
                    <ArrowUpRight size={18} />
                  </Link>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-light text-[#1A1A1A]">{totalMonthlyActivities}</span>
                  <span className="text-sm text-[#999]">touchpoints</span>
                </div>
                <p className="text-xs text-[#999] mb-6">last 30 days</p>

                {/* Weekly Activity Bar Chart */}
                {totalMonthlyActivities > 0 ? (
                  <div className="flex items-end justify-between h-32 gap-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                      const height = maxDailyActivity > 0 ? (dailyActivities[i].total / maxDailyActivity) * 100 : 0;
                      const isHighest = dailyActivities[i].total === maxDailyActivity && maxDailyActivity > 0;
                      const today = new Date().getDay();
                      const isToday = i === today;

                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-2">
                          {isHighest && dailyActivities[i].total > 0 && (
                            <div className="text-xs font-medium text-[#1A1A1A] bg-[#EAD07D] px-2 py-0.5 rounded-full whitespace-nowrap">
                              {dailyActivities[i].total}
                            </div>
                          )}
                          <div
                            className={`w-full rounded-xl transition-all ${
                              isHighest && dailyActivities[i].total > 0 ? 'bg-[#EAD07D]' : isToday ? 'bg-[#1A1A1A]' : 'bg-[#F0EBD8]'
                            }`}
                            style={{ height: `${Math.max(height, 8)}%` }}
                          />
                          <span className={`text-xs font-medium ${isToday ? 'text-[#1A1A1A]' : 'text-[#999]'}`}>
                            {day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-center">
                    <div>
                      <Zap size={32} className="text-[#999] mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-[#666]">No recent activity</p>
                      <p className="text-xs text-[#999]">Start making calls or sending emails</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Deal Velocity Card */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1A1A1A]">Deal Velocity</h3>
                  <Link to="/dashboard/analytics" className="text-[#999] hover:text-[#1A1A1A]">
                    <ArrowUpRight size={18} />
                  </Link>
                </div>

                {/* Circular Progress */}
                <div className="flex flex-col items-center">
                  <div className="relative w-36 h-36 mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#F0EBD8"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#EAD07D"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - Math.min(winRate / 100, 1))}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-light text-[#1A1A1A]">{dealVelocity > 0 ? dealVelocity : 'N/A'}</span>
                      <span className="text-xs text-[#999]">{dealVelocity > 0 ? 'days avg' : 'no closed deals'}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-[#1A1A1A]">{Math.round(winRate)}%</p>
                      <p className="text-xs text-[#999]">Win Rate</p>
                    </div>
                    <div className="w-px h-8 bg-black/10"></div>
                    <div>
                      <p className="text-lg font-semibold text-[#1A1A1A]">{conversionRate}%</p>
                      <p className="text-xs text-[#999]">Conversion</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Section - Sales Meetings */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1A1A1A]">Upcoming Meetings</h3>
                <Link to="/dashboard/calendar" className="text-[#999] hover:text-[#1A1A1A]">
                  <ArrowUpRight size={18} />
                </Link>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-3 mb-6">
                <button className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#666] hover:bg-[#EAD07D] transition-all">
                  {prevMonth}
                </button>
                <button className="px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A]">
                  {currentMonth}
                </button>
                <button className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#666] hover:bg-[#EAD07D] transition-all">
                  {nextMonth}
                </button>
              </div>

              {/* Week Header */}
              <div className="grid grid-cols-7 gap-4 mb-4">
                <div className="col-span-1"></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                  <div key={day} className="text-center">
                    <p className="text-sm font-medium text-[#999]">{day}</p>
                    <p className="text-lg font-medium text-[#1A1A1A]">
                      {weekDates[i]?.getDate()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                {['9:00 am', '10:00 am', '11:00 am', '2:00 pm'].map((time, timeIndex) => {
                  const hours = [9, 10, 11, 14];
                  return (
                    <div key={time} className="grid grid-cols-7 gap-4 min-h-[60px]">
                      <div className="col-span-1 text-xs text-[#999] pt-2">{time}</div>
                      {weekDates.map((date, dayIndex) => {
                        const slotMeetings = thisWeekMeetings.filter(m => {
                          const meetingDate = new Date(m.startTime);
                          const meetingHour = meetingDate.getUTCHours();
                          return (
                            meetingDate.getUTCDate() === date.getDate() &&
                            meetingHour === hours[timeIndex]
                          );
                        });

                        return (
                          <div key={dayIndex} className="col-span-1">
                            {slotMeetings.map(meeting => (
                              <Link
                                key={meeting.id}
                                to="/dashboard/calendar"
                                className="block bg-[#EAD07D]/30 rounded-xl p-2 hover:bg-[#EAD07D]/50 transition-all"
                              >
                                <p className="text-xs font-medium text-[#1A1A1A] truncate">
                                  {meeting.title}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  {meeting.type === 'VIDEO' ? (
                                    <Video size={10} className="text-[#666]" />
                                  ) : (
                                    <Phone size={10} className="text-[#666]" />
                                  )}
                                  <span className="text-[10px] text-[#666]">
                                    {meeting.account?.name || 'Client Call'}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <Link
                to="/dashboard/calendar"
                className="mt-4 w-full py-3 text-center text-sm font-medium text-[#666] hover:text-[#1A1A1A] block"
              >
                View Full Calendar →
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Pipeline Health Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1A1A1A]">Pipeline Health</h3>
                <span className="text-3xl font-light text-[#1A1A1A]">{quotaAttainment}%</span>
              </div>

              {/* Mini Progress Bars */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#666]">Win Rate</span>
                    <span className="font-medium">{Math.round(winRate)}%</span>
                  </div>
                  <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#EAD07D] rounded-full transition-all" style={{ width: `${winRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#666]">Quota Progress</span>
                    <span className="font-medium">{quotaAttainment}%</span>
                  </div>
                  <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${Math.min(quotaAttainment, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#666]">Deal Conversion</span>
                    <span className="font-medium">{conversionRate}%</span>
                  </div>
                  <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Activity Type Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 bg-[#EAD07D] rounded-full text-xs font-semibold text-[#1A1A1A] flex items-center gap-1">
                  <PhoneCall size={12} /> Calls
                </span>
                <span className="px-3 py-1.5 bg-[#1A1A1A] rounded-full text-xs font-semibold text-white flex items-center gap-1">
                  <Mail size={12} /> Emails
                </span>
                <span className="px-3 py-1.5 bg-[#F0EBD8] rounded-full text-xs font-semibold text-[#666] flex items-center gap-1">
                  <Video size={12} /> Meetings
                </span>
              </div>
            </div>

            {/* Sales Tasks Card - Dark Theme */}
            <div className="bg-[#1A1A1A] rounded-[32px] p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white">Action Items</h3>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-light text-white">{completedTasks}</span>
                  <span className="text-lg text-white/50">/{tasks.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {salesTasks.map((task) => {
                  const getTaskIcon = () => {
                    const subject = task.subject.toLowerCase();
                    if (subject.includes('call') || subject.includes('phone')) return <PhoneCall size={14} />;
                    if (subject.includes('email') || subject.includes('send')) return <Mail size={14} />;
                    if (subject.includes('meeting') || subject.includes('demo')) return <Video size={14} />;
                    if (subject.includes('proposal') || subject.includes('quote')) return <FileText size={14} />;
                    if (subject.includes('follow')) return <MessageSquare size={14} />;
                    return <CheckCircle2 size={14} />;
                  };

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 group"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-500/20 text-green-500'
                          : task.priority === 'HIGH'
                            ? 'bg-[#EAD07D]/20 text-[#EAD07D]'
                            : 'bg-white/10 text-white/50'
                      }`}>
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          getTaskIcon()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          task.status === 'COMPLETED' ? 'text-white/40 line-through' : 'text-white'
                        }`}>
                          {task.subject}
                        </p>
                        {task.dueDate && (
                          <p className="text-xs text-white/40">
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {task.lead && ` • ${task.lead.firstName} ${task.lead.lastName}`}
                          </p>
                        )}
                      </div>
                      {task.status === 'COMPLETED' && (
                        <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                      )}
                      {task.priority === 'HIGH' && task.status !== 'COMPLETED' && (
                        <AlertCircle size={16} className="text-[#EAD07D] flex-shrink-0" />
                      )}
                    </div>
                  );
                })}

                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 size={32} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/50 text-sm">All caught up!</p>
                  </div>
                )}
              </div>

              <Link
                to="/dashboard/tasks"
                className="mt-6 w-full py-3 bg-white/10 text-white rounded-2xl font-medium text-sm hover:bg-white/20 flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                View All Tasks
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* AI Forecast Section */}
        <div className="mt-6 bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">Revenue Forecast</h3>
              <p className="text-sm text-[#666]">{forecast?.quarterName || 'Current Quarter'} Projection</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-[#1A1A1A]"></span>
                <span className="text-[#666]">Committed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-[#EAD07D]"></span>
                <span className="text-[#666]">Best Case</span>
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-light text-[#1A1A1A]">
              {formatCurrency(forecast?.quarterBestCase || 0)}
            </span>
            <span className="text-sm text-[#666]">projected revenue</span>
            {(forecast?.quarterCommit ?? 0) > 0 && (
              <span className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#1A1A1A]">
                {formatCurrency(forecast?.quarterCommit ?? 0)} committed
              </span>
            )}
          </div>

          {/* Forecast Chart */}
          {forecast?.monthly && forecast.monthly.length > 0 ? (
            <div className="flex items-end justify-between h-40 gap-6">
              {(() => {
                const maxValue = Math.max(
                  ...forecast.monthly.map(m => Math.max(m.mostLikely || 0, m.commit || 0, m.bestCase || 0))
                );
                return forecast.monthly.map((monthData, i) => {
                  const forecastHeight = maxValue > 0 ? ((monthData.mostLikely || 0) / maxValue) * 100 : 0;
                  const commitHeight = maxValue > 0 ? ((monthData.commit || 0) / maxValue) * 100 : 0;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                      <div className="w-full flex gap-2 items-end h-32">
                        <div className="flex-1 bg-[#F0EBD8] rounded-xl relative overflow-hidden h-full">
                          <div
                            style={{ height: `${commitHeight}%` }}
                            className="absolute bottom-0 w-full bg-[#1A1A1A] rounded-xl transition-all duration-700"
                          />
                        </div>
                        <div className="flex-1 bg-[#F0EBD8] rounded-xl relative overflow-hidden h-full">
                          <div
                            style={{ height: `${forecastHeight}%` }}
                            className="absolute bottom-0 w-full bg-[#EAD07D] rounded-xl transition-all duration-700"
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-[#666]">
                        {new Date(monthData.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-center">
              <div>
                <TrendingUp size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                <p className="text-[#666]">No forecast data available</p>
                <p className="text-sm text-[#999]">Close some deals to see projections</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
