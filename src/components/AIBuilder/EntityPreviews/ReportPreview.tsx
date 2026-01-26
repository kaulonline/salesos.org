/**
 * Report Preview
 * Visual preview of AI-generated report configuration
 */

import React from 'react';
import { ReportConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import {
  BarChart3,
  LineChart,
  PieChart,
  Filter,
  ArrowDownUp,
  Calendar,
  Target,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  Gauge
} from 'lucide-react';

interface ReportPreviewProps {
  config: ReportConfig;
  className?: string;
}

const typeLabels: Record<string, string> = {
  PIPELINE: 'Pipeline Report',
  WIN_RATE: 'Win Rate Analysis',
  ACTIVITY: 'Activity Report',
  REVENUE: 'Revenue Report',
  LEAD_CONVERSION: 'Lead Conversion',
  FORECAST: 'Sales Forecast',
  CUSTOM: 'Custom Report',
};

const typeIcons: Record<string, React.ReactNode> = {
  PIPELINE: <Target className="w-5 h-5" />,
  WIN_RATE: <TrendingUp className="w-5 h-5" />,
  ACTIVITY: <Activity className="w-5 h-5" />,
  REVENUE: <DollarSign className="w-5 h-5" />,
  LEAD_CONVERSION: <Users className="w-5 h-5" />,
  FORECAST: <Gauge className="w-5 h-5" />,
  CUSTOM: <BarChart3 className="w-5 h-5" />,
};

const chartIcons: Record<string, React.ReactNode> = {
  BAR: <BarChart3 className="w-12 h-12" />,
  LINE: <LineChart className="w-12 h-12" />,
  PIE: <PieChart className="w-12 h-12" />,
  FUNNEL: <Filter className="w-12 h-12" />,
  TABLE: <BarChart3 className="w-12 h-12" />,
  KPI: <Gauge className="w-12 h-12" />,
};

const metricLabels: Record<string, string> = {
  totalValue: 'Total Value',
  count: 'Count',
  avgValue: 'Average Value',
  weightedValue: 'Weighted Value',
  conversionRate: 'Conversion Rate',
  winRate: 'Win Rate',
  lossRate: 'Loss Rate',
  callCount: 'Calls',
  emailCount: 'Emails',
  meetingCount: 'Meetings',
  touchpoints: 'Touchpoints',
  avgDaysInStage: 'Avg Days in Stage',
  avgSalesCycle: 'Avg Sales Cycle',
  velocity: 'Velocity',
};

const dateRangeLabels: Record<string, string> = {
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This Week',
  LAST_WEEK: 'Last Week',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  THIS_QUARTER: 'This Quarter',
  LAST_QUARTER: 'Last Quarter',
  THIS_YEAR: 'This Year',
  LAST_YEAR: 'Last Year',
  CUSTOM: 'Custom Range',
};

export function ReportPreview({ config, className }: ReportPreviewProps) {
  const {
    name,
    description,
    type,
    chartType,
    groupBy,
    filters,
    metrics,
    sortBy,
    sortOrder,
    limit
  } = config;

  const hasFilters = filters && Object.values(filters).some(v =>
    v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            {typeIcons[type] || <BarChart3 className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {typeLabels[type] || type}
              </span>
            </div>
          </div>
        </div>
      </div>

      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {/* Chart Preview */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex flex-col items-center justify-center text-gray-400">
          {chartIcons[chartType] || <BarChart3 className="w-12 h-12" />}
          <span className="text-sm mt-2 font-medium">
            {chartType} Chart
          </span>
          {groupBy && (
            <span className="text-xs text-gray-400 mt-1">
              Grouped by {groupBy}
            </span>
          )}
        </div>
      </div>

      {/* Metrics */}
      {metrics && metrics.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Metrics
          </div>
          <div className="flex flex-wrap gap-2">
            {metrics.map((metric, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
              >
                {metricLabels[metric] || metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {hasFilters && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filters
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            {filters?.dateRange && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {dateRangeLabels[filters.dateRange] || filters.dateRange}
                </span>
              </div>
            )}
            {filters?.stages && filters.stages.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Stages: {filters.stages.join(', ')}
                </span>
              </div>
            )}
            {filters?.sources && filters.sources.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Sources: {filters.sources.join(', ')}
                </span>
              </div>
            )}
            {(filters?.minAmount || filters?.maxAmount) && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Amount: {filters.minAmount || 0} - {filters.maxAmount || '∞'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort & Limit */}
      {(sortBy || limit) && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {sortBy && (
            <div className="flex items-center gap-1">
              <ArrowDownUp className="w-4 h-4" />
              <span>
                Sort by {sortBy} ({sortOrder || 'DESC'})
              </span>
            </div>
          )}
          {limit && (
            <span>Top {limit} results</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>{chartType} visualization</span>
        <span>{metrics?.length || 0} metrics</span>
        {hasFilters && <span>Filtered</span>}
      </div>
    </div>
  );
}

export default ReportPreview;
