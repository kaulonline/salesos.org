import React from 'react';
import { Zap, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { BarChart } from '../charts';
import type { DailyActivity } from './types';

interface SalesActivityCardProps {
  totalMonthlyActivities: number;
  dailyActivities: DailyActivity[];
}

export const SalesActivityCard: React.FC<SalesActivityCardProps> = ({
  totalMonthlyActivities,
  dailyActivities,
}) => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-[#1A1A1A]">Sales Activity</h3>
        <Link to="/dashboard/analytics" className="text-[#999] hover:text-[#1A1A1A]">
          <ArrowUpRight size={18} />
        </Link>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-4xl font-light text-[#1A1A1A] tabular-nums min-w-[60px]">{totalMonthlyActivities.toLocaleString()}</span>
        <span className="text-sm text-[#999]">touchpoints</span>
      </div>
      <p className="text-xs text-[#999] mb-6">last 30 days</p>

      {/* Weekly Activity Bar Chart */}
      {totalMonthlyActivities > 0 ? (
        <BarChart
          data={dailyActivities.map((day) => ({
            name: day.label,
            value: day.total,
            isToday: day.isToday,
          }))}
          dataKey="value"
          xAxisKey="name"
          height={140}
          color="#F0EBD8"
          activeColor="#1A1A1A"
          activeIndex={dailyActivities.findIndex(d => d.isToday)}
          showGrid={false}
          showYAxis={false}
          barRadius={8}
          tooltipFormatter={(value) => `${value} activities`}
        />
      ) : (
        <div className="flex items-center justify-center h-32 text-center">
          <div>
            <Zap size={32} className="text-[#999] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[#666]">No recent activity</p>
            <p className="text-xs text-[#999]">Start making calls or sending emails</p>
          </div>
        </div>
      )}
    </Card>
  );
};
