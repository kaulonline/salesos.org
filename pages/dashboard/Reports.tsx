import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Activity,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  reportsApi,
  ReportType,
  DateRange,
  GroupBy,
  type ReportResult,
  type PipelineReport,
  type WinRateReport,
  type ActivityReport,
  type RevenueReport,
  type LeadConversionReport,
  type ForecastReport,
} from '../../src/api/reports';

const REPORT_TABS = [
  { type: ReportType.PIPELINE, label: 'Pipeline', icon: BarChart3 },
  { type: ReportType.WIN_RATE, label: 'Win Rate', icon: Target },
  { type: ReportType.ACTIVITY, label: 'Activity', icon: Activity },
  { type: ReportType.REVENUE, label: 'Revenue', icon: DollarSign },
  { type: ReportType.LEAD_CONVERSION, label: 'Lead Conversion', icon: Users },
  { type: ReportType.FORECAST, label: 'Forecast', icon: TrendingUp },
];

const DATE_RANGES = [
  { value: DateRange.THIS_WEEK, label: 'This Week' },
  { value: DateRange.LAST_WEEK, label: 'Last Week' },
  { value: DateRange.THIS_MONTH, label: 'This Month' },
  { value: DateRange.LAST_MONTH, label: 'Last Month' },
  { value: DateRange.THIS_QUARTER, label: 'This Quarter' },
  { value: DateRange.LAST_QUARTER, label: 'Last Quarter' },
  { value: DateRange.THIS_YEAR, label: 'This Year' },
  { value: DateRange.LAST_YEAR, label: 'Last Year' },
];

const GROUP_BY_OPTIONS = [
  { value: GroupBy.DAY, label: 'Day' },
  { value: GroupBy.WEEK, label: 'Week' },
  { value: GroupBy.MONTH, label: 'Month' },
  { value: GroupBy.QUARTER, label: 'Quarter' },
  { value: GroupBy.OWNER, label: 'Owner' },
  { value: GroupBy.STAGE, label: 'Stage' },
  { value: GroupBy.SOURCE, label: 'Source' },
];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon: Icon, loading }) => {
  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-10 w-10 rounded-full mb-4" />
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-32" />
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-full bg-[#F2F1EA] flex items-center justify-center">
          <Icon size={20} className="text-[#1A1A1A]" />
        </div>
        {change !== undefined && change !== null && !isNaN(change) && (
          <div className={`flex items-center text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-semibold text-[#1A1A1A] mb-1">{value}</div>
      <div className="text-sm text-[#666]">{title}</div>
    </Card>
  );
};

interface BarChartProps {
  data: { label: string; value: number; percentage?: number }[];
  maxValue?: number;
  showPercentage?: boolean;
  color?: string;
}

const SimpleBarChart: React.FC<BarChartProps> = ({ data, maxValue, showPercentage, color = '#1A1A1A' }) => {
  const values = data.map((d) => d.value).filter((v) => v !== undefined && v !== null && !isNaN(v));
  const max = maxValue || Math.max(...values, 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-24 text-sm text-[#666] truncate" title={item.label}>
            {item.label}
          </div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((item.value || 0) / max) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="w-20 text-sm text-right font-medium">
            {showPercentage && item.percentage !== undefined && item.percentage !== null
              ? `${(item.percentage || 0).toFixed(1)}%`
              : typeof item.value === 'number' && item.value >= 1000
              ? `$${((item.value || 0) / 1000).toFixed(0)}k`
              : item.value ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
};

interface LineChartData {
  labels: string[];
  datasets: { name: string; data: number[]; color: string }[];
}

const SimpleLineChart: React.FC<{ data: LineChartData }> = ({ data }) => {
  const allValues = data.datasets.flatMap((d) => d.data).filter((v) => v !== undefined && v !== null && !isNaN(v));
  if (allValues.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[#666]">No data available</div>;
  }
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  const getPath = (values: number[]) => {
    const cleanValues = values.filter((v) => v !== undefined && v !== null && !isNaN(v));
    if (cleanValues.length === 0) return '';
    const points = cleanValues.map((val, i) => {
      const x = (i / Math.max(cleanValues.length - 1, 1)) * 100;
      const y = 100 - (((val || 0) - minValue) / range) * 80 - 10;
      return [x, y];
    });

    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const ctrl1X = curr[0] + (next[0] - curr[0]) * 0.4;
      const ctrl2X = next[0] - (next[0] - curr[0]) * 0.4;
      d += ` C ${ctrl1X},${curr[1]} ${ctrl2X},${next[1]} ${next[0]},${next[1]}`;
    }
    return d;
  };

  return (
    <div className="relative h-64">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {data.datasets.map((dataset, idx) => (
          <path
            key={idx}
            d={getPath(dataset.data)}
            fill="none"
            stroke={dataset.color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-[#999] mt-2">
        {data.labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      {data.datasets.length > 1 && (
        <div className="flex gap-4 mt-4">
          {data.datasets.map((dataset, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dataset.color }} />
              <span className="text-xs text-[#666]">{dataset.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '$0';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>(ReportType.PIPELINE);
  const [dateRange, setDateRange] = useState<DateRange>(DateRange.THIS_MONTH);
  const [groupBy, setGroupBy] = useState<GroupBy>(GroupBy.MONTH);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showGroupByDropdown, setShowGroupByDropdown] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: ReportResult;
      const params = { dateRange };

      switch (activeReport) {
        case ReportType.PIPELINE:
          result = await reportsApi.getPipelineReport(params);
          break;
        case ReportType.WIN_RATE:
          result = await reportsApi.getWinRateReport({ ...params, groupBy });
          break;
        case ReportType.ACTIVITY:
          result = await reportsApi.getActivityReport({ ...params, groupBy });
          break;
        case ReportType.REVENUE:
          result = await reportsApi.getRevenueReport(params);
          break;
        case ReportType.LEAD_CONVERSION:
          result = await reportsApi.getLeadConversionReport(params);
          break;
        case ReportType.FORECAST:
          result = await reportsApi.getForecastReport();
          break;
        default:
          throw new Error('Unknown report type');
      }

      setReportData(result);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError('Failed to load report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, dateRange, groupBy]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const renderPipelineReport = () => {
    const data = reportData?.data as unknown as PipelineReport;
    if (!data) return null;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Total Pipeline" value={formatCurrency(data.totalValue)} icon={DollarSign} />
          <KPICard title="Open Deals" value={data.totalCount || 0} icon={BarChart3} />
          <KPICard title="Avg Deal Size" value={formatCurrency(data.avgDealSize)} icon={Target} />
          <KPICard title="Expected Revenue" value={formatCurrency(data.expectedRevenue)} icon={TrendingUp} />
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Pipeline by Stage</h3>
          <SimpleBarChart
            data={(data.byStage || []).map((s) => ({ label: s.stage, value: s.amount, percentage: s.percentage }))}
            showPercentage
            color="#EAD07D"
          />
        </Card>
      </>
    );
  };

  const renderWinRateReport = () => {
    const data = reportData?.data as unknown as WinRateReport;
    if (!data) return null;

    const byPeriod = data.byPeriod || [];
    const byOwner = data.byOwner || [];

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Overall Win Rate" value={formatPercent(data.overall)} icon={Target} />
          <KPICard
            title="Deals Won"
            value={byPeriod.reduce((sum, p) => sum + (p.won || 0), 0)}
            icon={TrendingUp}
          />
          <KPICard
            title="Deals Lost"
            value={byPeriod.reduce((sum, p) => sum + (p.lost || 0), 0)}
            icon={TrendingDown}
          />
          <KPICard title="Avg Cycle Time" value={`${data.avgCycleTime || 0} days`} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Win Rate by Period</h3>
            <SimpleLineChart
              data={{
                labels: byPeriod.map((p) => p.period),
                datasets: [{ name: 'Win Rate', data: byPeriod.map((p) => p.winRate), color: '#10B981' }],
              }}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Win Rate by Owner</h3>
            <SimpleBarChart
              data={byOwner.map((o) => ({ label: o.name, value: o.winRate, percentage: o.winRate }))}
              showPercentage
              maxValue={100}
              color="#10B981"
            />
          </Card>
        </div>
      </>
    );
  };

  const renderActivityReport = () => {
    const data = reportData?.data as unknown as ActivityReport;
    if (!data) return null;

    const byType = data.byType || [];
    const byOwner = data.byOwner || [];
    const byDay = data.byDay || [];

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Total Activities" value={data.totalActivities || 0} icon={Activity} />
          <KPICard
            title="Calls"
            value={byType.find((t) => t.type === 'CALL')?.count || 0}
            icon={Activity}
          />
          <KPICard
            title="Emails"
            value={byType.find((t) => t.type === 'EMAIL')?.count || 0}
            icon={Activity}
          />
          <KPICard
            title="Meetings"
            value={byType.find((t) => t.type === 'MEETING')?.count || 0}
            icon={Activity}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Activity by Type</h3>
            <SimpleBarChart
              data={byType.map((t) => ({ label: t.type, value: t.count }))}
              color="#6366F1"
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Activity by Owner</h3>
            <SimpleBarChart
              data={byOwner.map((o) => ({ label: o.name, value: o.total }))}
              color="#6366F1"
            />
          </Card>
        </div>

        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-6">Activity Over Time</h3>
          <SimpleLineChart
            data={{
              labels: byDay.map((d) => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
              datasets: [{ name: 'Activities', data: byDay.map((d) => d.count), color: '#6366F1' }],
            }}
          />
        </Card>
      </>
    );
  };

  const renderRevenueReport = () => {
    const data = reportData?.data as unknown as RevenueReport;
    if (!data) return null;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Closed Won" value={formatCurrency(data.closedWon)} change={data.growthRate} icon={DollarSign} />
          <KPICard title="Deals Closed" value={data.closedWonCount} icon={Target} />
          <KPICard title="Pipeline Value" value={formatCurrency(data.pipeline)} icon={BarChart3} />
          <KPICard title="Forecast" value={formatCurrency(data.forecast)} icon={TrendingUp} />
        </div>

        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-6">Revenue vs Forecast</h3>
          <SimpleLineChart
            data={{
              labels: data.byMonth.map((m) => m.month),
              datasets: [
                { name: 'Actual', data: data.byMonth.map((m) => m.actual), color: '#10B981' },
                { name: 'Forecast', data: data.byMonth.map((m) => m.forecast), color: '#EAD07D' },
              ],
            }}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Revenue by Owner</h3>
          <SimpleBarChart
            data={data.byOwner.map((o) => ({ label: o.name, value: o.closed }))}
            color="#10B981"
          />
        </Card>
      </>
    );
  };

  const renderLeadConversionReport = () => {
    const data = reportData?.data as unknown as LeadConversionReport;
    if (!data) return null;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <KPICard title="Conversion Rate" value={formatPercent(data.conversionRate)} icon={Target} />
          <KPICard title="Avg Time to Convert" value={`${data.avgTimeToConvert} days`} icon={Calendar} />
          <KPICard
            title="Total Converted"
            value={data.bySource.reduce((sum, s) => sum + s.converted, 0)}
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Conversion by Source</h3>
            <SimpleBarChart
              data={data.bySource.map((s) => ({ label: s.source, value: s.rate, percentage: s.rate }))}
              showPercentage
              maxValue={100}
              color="#8B5CF6"
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Conversion by Owner</h3>
            <SimpleBarChart
              data={data.byOwner.map((o) => ({ label: o.name, value: o.rate, percentage: o.rate }))}
              showPercentage
              maxValue={100}
              color="#8B5CF6"
            />
          </Card>
        </div>
      </>
    );
  };

  const renderForecastReport = () => {
    const data = reportData?.data as unknown as ForecastReport;
    if (!data) return null;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard title="Committed" value={formatCurrency(data.committed)} icon={Target} />
          <KPICard title="Best Case" value={formatCurrency(data.bestCase)} icon={TrendingUp} />
          <KPICard title="Closed" value={formatCurrency(data.closed)} icon={DollarSign} />
          <KPICard title="Quota Attainment" value={formatPercent(data.attainment)} icon={BarChart3} />
        </div>

        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-6">Forecast vs Actual by Month</h3>
          <SimpleLineChart
            data={{
              labels: data.byMonth.map((m) => m.month),
              datasets: [
                { name: 'Closed', data: data.byMonth.map((m) => m.closed), color: '#10B981' },
                { name: 'Committed', data: data.byMonth.map((m) => m.committed), color: '#3B82F6' },
                { name: 'Best Case', data: data.byMonth.map((m) => m.bestCase), color: '#EAD07D' },
              ],
            }}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Forecast by Owner</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666] border-b">
                  <th className="pb-3 font-medium">Owner</th>
                  <th className="pb-3 font-medium text-right">Quota</th>
                  <th className="pb-3 font-medium text-right">Committed</th>
                  <th className="pb-3 font-medium text-right">Best Case</th>
                  <th className="pb-3 font-medium text-right">Closed</th>
                </tr>
              </thead>
              <tbody>
                {data.byOwner.map((owner, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-3 font-medium">{owner.name}</td>
                    <td className="py-3 text-right">{formatCurrency(owner.quota)}</td>
                    <td className="py-3 text-right">{formatCurrency(owner.committed)}</td>
                    <td className="py-3 text-right">{formatCurrency(owner.bestCase)}</td>
                    <td className="py-3 text-right text-green-600">{formatCurrency(owner.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    );
  };

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <KPICard key={i} title="" value="" icon={Activity} loading />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </>
      );
    }

    if (error) {
      return (
        <Card className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchReport}>Try Again</Button>
        </Card>
      );
    }

    switch (activeReport) {
      case ReportType.PIPELINE:
        return renderPipelineReport();
      case ReportType.WIN_RATE:
        return renderWinRateReport();
      case ReportType.ACTIVITY:
        return renderActivityReport();
      case ReportType.REVENUE:
        return renderRevenueReport();
      case ReportType.LEAD_CONVERSION:
        return renderLeadConversionReport();
      case ReportType.FORECAST:
        return renderForecastReport();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-medium text-[#1A1A1A]">Reports</h1>
          <p className="text-[#666] mt-2">Analyze your sales performance and trends.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2"
            >
              <Calendar size={16} />
              {DATE_RANGES.find((d) => d.value === dateRange)?.label}
              <ChevronDown size={16} />
            </Button>
            {showDateDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border z-10">
                {DATE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    className={`w-full text-left px-4 py-2 hover:bg-[#F8F8F6] first:rounded-t-xl last:rounded-b-xl ${
                      dateRange === range.value ? 'bg-[#F2F1EA]' : ''
                    }`}
                    onClick={() => {
                      setDateRange(range.value);
                      setShowDateDropdown(false);
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(activeReport === ReportType.WIN_RATE || activeReport === ReportType.ACTIVITY) && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowGroupByDropdown(!showGroupByDropdown)}
                className="flex items-center gap-2"
              >
                <Filter size={16} />
                Group: {GROUP_BY_OPTIONS.find((g) => g.value === groupBy)?.label}
                <ChevronDown size={16} />
              </Button>
              {showGroupByDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border z-10">
                  {GROUP_BY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-4 py-2 hover:bg-[#F8F8F6] first:rounded-t-xl last:rounded-b-xl ${
                        groupBy === option.value ? 'bg-[#F2F1EA]' : ''
                      }`}
                      onClick={() => {
                        setGroupBy(option.value);
                        setShowGroupByDropdown(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button variant="outline" onClick={fetchReport} className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </Button>

          <Button variant="outline" className="flex items-center gap-2">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveReport(tab.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F2F1EA]'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
};

export default Reports;
