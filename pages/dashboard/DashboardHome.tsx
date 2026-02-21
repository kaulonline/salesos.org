import React, { useEffect, useMemo, useState } from 'react';
import { Users, Target, DollarSign, Link2 } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { useDashboard, useDeals, useMeetings, useActivities, useTasks } from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/components/ui/Toast';
import { thirdPartyIntegrationsApi, IntegrationType } from '../../src/api/integrations';
import type { Task } from '../../src/types/task';
import {
  SalesRepProfileCard,
  SalesActivityCard,
  DealVelocityCard,
  MeetingsCalendar,
  PipelineSummaryCard,
  ActionItemsCard,
  RevenueForecastCard,
  AIFeaturesCard,
  DailyActivity,
} from '../../src/components/dashboard';

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
    commissionRate,
  } = useDashboard();

  const { deals, loading: dealsLoading } = useDeals();
  const { meetings } = useMeetings({ limit: 20 });
  const { activities } = useActivities({ limit: 50 });
  const { tasks, complete: completeTask } = useTasks({ limit: 10 });
  const { showToast } = useToast();

  // State for task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Connected integrations
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationType[]>([]);
  useEffect(() => {
    thirdPartyIntegrationsApi.getAllStatuses().then((statuses) => {
      const connected = (Object.entries(statuses) as [IntegrationType, any][])
        .filter(([, s]) => s.connected)
        .map(([key]) => key);
      setConnectedIntegrations(connected);
    }).catch(() => {});
  }, []);

  // Extract name - backend returns 'name' field, may also have firstName/lastName
  const userName = user?.firstName || user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const userFullName = user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : userName);
  const userTitle = user?.jobTitle || (user?.role === 'ADMIN' ? 'Sales Manager' : 'Sales Representative');

  // Calculate metrics
  const winRate = pipelineStats?.winRate || 0;
  const estimatedCommission = (pipelineStats?.closedWonValue || 0) * commissionRate;

  // Top deals by value
  const topDeals = useMemo(() => {
    const openDeals = deals.filter(d => !d.isClosed);
    return openDeals.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 3);
  }, [deals]);

  // Daily activity breakdown - last 7 days
  const dailyActivities: DailyActivity[] = useMemo(() => {
    const days: DailyActivity[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayActivities = activities.filter(a => {
        const actDate = new Date(a.createdAt);
        return actDate >= date && actDate < nextDay;
      });

      days.push({
        date,
        label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()] ?? '',
        calls: dayActivities.filter(a => a.type === 'CALL').length,
        emails: dayActivities.filter(a => a.type === 'EMAIL').length,
        meetings: dayActivities.filter(a => a.type === 'MEETING').length,
        total: dayActivities.length,
        isToday: i === 0
      });
    }
    return days;
  }, [activities]);

  const totalMonthlyActivities = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return activities.filter(a => new Date(a.createdAt) >= thirtyDaysAgo).length;
  }, [activities]);

  // Sales tasks for display
  const salesTasks = useMemo(() => {
    return tasks.slice(0, 5);
  }, [tasks]);

  const completedTaskCount = tasks.filter(t => t.status === 'COMPLETED').length;

  // Deal velocity - average days to close
  const dealVelocity = useMemo(() => {
    const closedWonDeals = deals.filter(d => d.isClosed && d.isWon && d.closedDate && d.createdAt);
    if (closedWonDeals.length === 0) return null;

    const totalDays = closedWonDeals.reduce((sum, deal) => {
      const created = new Date(deal.createdAt);
      const closed = new Date(deal.closedDate!);
      const diffDays = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(diffDays, 1);
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
      <div className="min-h-screen p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="flex gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-6">
            <Skeleton className="md:col-span-3 h-[500px] rounded-3xl" />
            <Skeleton className="md:col-span-3 h-80 rounded-3xl" />
            <Skeleton className="md:col-span-3 h-80 rounded-3xl" />
            <Skeleton className="md:col-span-3 h-80 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">
            Welcome back, <span className="font-normal">{userName}</span>
          </h1>

          {/* Large Stats - Right Side */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-8">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Users size={20} className="text-[#999]" />
                <span className="text-3xl lg:text-5xl font-light text-[#1A1A1A] tabular-nums">{(leadStats?.total || 0).toLocaleString()}</span>
              </div>
              <p className="text-xs font-medium text-[#999]">Leads</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Target size={20} className="text-[#999]" />
                <span className="text-3xl lg:text-5xl font-light text-[#1A1A1A] tabular-nums">{totalDeals.toLocaleString()}</span>
              </div>
              <p className="text-xs font-medium text-[#999]">Open Deals</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <DollarSign size={20} className="text-[#999]" />
                <span className="text-3xl lg:text-5xl font-light text-[#1A1A1A] tabular-nums">${totalPipeline.toLocaleString()}</span>
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

          {connectedIntegrations.length > 0 && (
            <a
              href="/dashboard/integrations"
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-[#666] border border-black/5 shadow-sm hover:bg-[#F8F8F6] transition-colors"
            >
              <Link2 size={14} className="text-[#93C01F]" />
              <span>{connectedIntegrations.length} Connected</span>
            </a>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Sales Rep Profile Card - Left Column */}
          <div className="md:col-span-3">
            <SalesRepProfileCard
              userName={userName}
              userFullName={userFullName}
              userTitle={userTitle}
              avatarUrl={user?.avatarUrl}
              estimatedCommission={estimatedCommission}
              totalOpportunities={pipelineStats?.totalOpportunities || 0}
              totalPipeline={totalPipeline}
              closedWonValue={pipelineStats?.closedWonValue || 0}
              winRate={winRate}
              quotaAttainment={quotaAttainment}
              dealVelocity={dealVelocity}
              topDeals={topDeals}
            />
          </div>

          {/* Middle Section */}
          <div className="md:col-span-6 space-y-6">
            {/* Activity & Deal Velocity Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SalesActivityCard
                totalMonthlyActivities={totalMonthlyActivities}
                dailyActivities={dailyActivities}
              />
              <DealVelocityCard
                dealVelocity={dealVelocity}
                winRate={winRate}
                conversionRate={conversionRate}
              />
            </div>

            {/* Calendar Section */}
            <MeetingsCalendar meetings={meetings} />
          </div>

          {/* Right Column */}
          <div className="md:col-span-3 space-y-6">
            <PipelineSummaryCard
              totalDeals={totalDeals}
              closedWonThisMonth={closedWonThisMonth}
              avgDealSize={Math.round(totalPipeline / (pipelineStats?.totalOpportunities || 1))}
              dealVelocity={dealVelocity}
            />
            <ActionItemsCard
              tasks={salesTasks}
              completedCount={completedTaskCount}
              totalCount={tasks.length}
              onTaskClick={setSelectedTask}
            />
          </div>
        </div>

        {/* AI Features Section */}
        <div className="mt-6">
          <AIFeaturesCard />
        </div>

        {/* AI Forecast Section */}
        <RevenueForecastCard
          forecast={forecast}
          totalPipeline={totalPipeline}
        />
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onMarkComplete={async (taskId) => {
          if (completeTask) {
            try {
              await completeTask(taskId);
              showToast({ type: 'success', title: 'Task Completed', message: 'Great work!' });
              setSelectedTask(null);
            } catch (err) {
              showToast({ type: 'error', title: 'Failed to Complete Task', message: (err as Error).message || 'Please try again' });
            }
          }
        }}
      />
    </div>
  );
};

export default DashboardHome;
