import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { reportsApi, type RevenueReport, type ForecastReport, DateRange } from '../../src/api/reports';
import { useDashboard } from '../../src/hooks';
import { FeatureGate, Features, useCanAccess } from '../../src/components/FeatureGate';

export const Analytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [forecastReport, setForecastReport] = useState<ForecastReport | null>(null);
  const [dateRange, setDateRange] = useState<'monthly' | 'quarterly'>('monthly');

  const { leadStats, loading: dashboardLoading } = useDashboard();

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [revenueRes, forecastRes] = await Promise.all([
        reportsApi.getRevenueReport({ dateRange: DateRange.THIS_YEAR }),
        reportsApi.getForecastReport(),
      ]);

      setRevenueReport(revenueRes.data);
      setForecastReport(forecastRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Format currency with compact notation (K, M, B, T)
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (absValue >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Get chart data from revenue report
  const getChartData = () => {
    if (!revenueReport?.byMonth || revenueReport.byMonth.length === 0) {
      return { data: [], labels: [], rawData: [] };
    }

    // Normalize data for chart (0-100 scale)
    const values = revenueReport.byMonth.map(m => m.actual);
    const maxValue = Math.max(...values, 1);
    const normalizedData = values.map(v => (v / maxValue) * 100);
    const labels = revenueReport.byMonth.map(m => m.month);

    return { data: normalizedData, labels, rawData: values };
  };

  const { data: chartData, labels: chartLabels, rawData } = getChartData();

  const getChartPath = (data: number[]) => {
    if (data.length === 0) return '';
    const points = data.map((val, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - val;
      return [x, y];
    });

    let d = `M ${points[0][0]},${points[0][1]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const ctrl1X = curr[0] + (next[0] - curr[0]) * 0.4;
      const ctrl1Y = curr[1];
      const ctrl2X = next[0] - (next[0] - curr[0]) * 0.4;
      const ctrl2Y = next[1];
      d += ` C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${next[0]},${next[1]}`;
    }
    return d;
  };

  const linePath = getChartPath(chartData);
  const areaPath = chartData.length > 0 ? `${linePath} L 100,100 L 0,100 Z` : '';

  // Get top performers from revenue report
  const topPerformers = revenueReport?.byOwner
    ?.sort((a, b) => b.closed - a.closed)
    .slice(0, 5) || [];

  // Loading state
  if (isLoading || dashboardLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem]" />
          <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem]" />
          <Skeleton className="md:col-span-4 h-[240px] rounded-[2rem] bg-gray-800" />
          <Skeleton className="md:col-span-8 h-[400px] rounded-[2rem]" />
          <Skeleton className="md:col-span-4 h-[400px] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-medium text-[#1A1A1A]">Analytics</h1>
          <p className="text-[#666] mt-2">Team performance and revenue insights.</p>
        </div>
        <Card className="p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-medium text-[#1A1A1A] mb-2">Unable to load analytics</h3>
          <p className="text-[#666] mb-6">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </Card>
      </div>
    );
  }

  const growthRate = revenueReport?.growthRate || 0;
  const isPositiveGrowth = growthRate >= 0;
  const quotaAttainment = forecastReport?.attainment || 0;
  const totalLeads = leadStats?.total || 0;

  return (
    <FeatureGate feature={Features.BASIC_ANALYTICS}>
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A]">Analytics</h1>
        <p className="text-[#666] mt-2">Team performance and revenue insights.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Total Revenue KPI Card */}
        <Card className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
              <TrendingUp size={24} />
            </div>
            <Badge
              variant={isPositiveGrowth ? 'green' : 'red'}
              size="sm"
            >
              {isPositiveGrowth ? '+' : ''}{growthRate.toFixed(0)}%
            </Badge>
          </div>
          <div>
            <div className="text-5xl font-light text-[#1A1A1A] mb-2">
              {formatCurrency(revenueReport?.closedWon || 0)}
            </div>
            <div className="text-sm text-[#666]">Total Revenue (YTD)</div>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] transition-all duration-500"
              style={{ width: `${Math.min(quotaAttainment, 100)}%` }}
            />
          </div>
        </Card>

        {/* New Leads KPI Card */}
        <Card className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-full bg-[#F2F1EA] flex items-center justify-center text-[#1A1A1A]">
              <Users size={24} />
            </div>
          </div>
          <div>
            <div className="text-5xl font-light text-[#1A1A1A] mb-2">
              {totalLeads.toLocaleString()}
            </div>
            <div className="text-sm text-[#666]">Total Leads</div>
          </div>
          <div className="flex gap-1 items-end h-8">
            {revenueReport?.byMonth?.slice(-9).map((m, i) => {
              const maxVal = Math.max(...(revenueReport.byMonth?.map(x => x.actual) || [1]));
              const height = (m.actual / maxVal) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-[#1A1A1A] rounded-t-sm opacity-20 hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
              );
            })}
          </div>
        </Card>

        {/* Quota Attainment KPI Card */}
        <Card variant="dark" className="md:col-span-4 p-8 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D] rounded-full blur-[80px] opacity-10 pointer-events-none" />
          <div className="flex justify-between items-start relative z-10">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Target size={24} />
            </div>
            {quotaAttainment >= 100 && (
              <Badge variant="green" size="sm">On Track</Badge>
            )}
          </div>
          <div className="relative z-10">
            <div className="text-5xl font-light text-white mb-2">
              {quotaAttainment.toFixed(0)}%
            </div>
            <div className="text-sm text-white/60">Quota Attainment</div>
          </div>
        </Card>

        {/* Revenue Chart */}
        <Card className="md:col-span-8 p-8 min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-medium">Revenue Growth</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDateRange('monthly')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                  dateRange === 'monthly'
                    ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                    : 'bg-white text-[#666] hover:bg-[#F8F8F6]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setDateRange('quarterly')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                  dateRange === 'quarterly'
                    ? 'bg-[#F8F8F6] text-[#1A1A1A]'
                    : 'bg-white text-[#666] hover:bg-[#F8F8F6]'
                }`}
              >
                Quarterly
              </button>
            </div>
          </div>

          {chartData.length > 0 ? (
            <>
              <div className="h-64 w-full relative group">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EAD07D" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#EAD07D" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <path d={areaPath} fill="url(#chartGradient)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#EAD07D"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />

                  {chartData.map((val, i) => {
                    const x = (i / Math.max(chartData.length - 1, 1)) * 100;
                    const y = 100 - val;
                    const isHovered = hoveredIndex === i;

                    return (
                      <g key={i} onMouseEnter={() => setHoveredIndex(i)}>
                        <circle cx={x} cy={y} r="5" fill="transparent" cursor="pointer" />
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 0}
                          fill="#1A1A1A"
                          stroke="#fff"
                          strokeWidth="2"
                          className="transition-all duration-200"
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </svg>

                {hoveredIndex !== null && rawData && rawData[hoveredIndex] !== undefined && (
                  <div
                    className="absolute bg-[#1A1A1A] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transform -translate-x-1/2 -translate-y-full mb-3 transition-all pointer-events-none z-10 whitespace-nowrap"
                    style={{
                      left: `${(hoveredIndex / Math.max(chartData.length - 1, 1)) * 100}%`,
                      top: `${100 - chartData[hoveredIndex]}%`
                    }}
                  >
                    {formatCurrency(rawData[hoveredIndex])}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
                  </div>
                )}
              </div>

              <div className="flex justify-between text-xs text-[#999] mt-6 pt-4 border-t border-gray-100">
                {chartLabels.map((label, i) => (
                  <span key={i} className="truncate">{label}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-[#666]">
              <div className="text-center">
                <TrendingUp size={40} className="mx-auto mb-3 opacity-40" />
                <p>No revenue data available</p>
              </div>
            </div>
          )}
        </Card>

        {/* Top Performers */}
        <Card className="md:col-span-4 p-8">
          <h3 className="text-xl font-medium mb-6">Top Performers</h3>
          {topPerformers.length > 0 ? (
            <div className="space-y-6">
              {topPerformers.map((performer, i) => (
                <div key={performer.name} className="flex items-center gap-4 group cursor-pointer">
                  <div className={`font-bold w-4 text-center ${i === 0 ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
                    {i + 1}
                  </div>
                  <Avatar
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(performer.name)}&background=EAD07D&color=1A1A1A`}
                    size="md"
                    border
                    className="group-hover:scale-110 transition-transform"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#1A1A1A]">{performer.name}</div>
                    <div className="text-xs text-[#666]">{formatCurrency(performer.closed)} closed</div>
                  </div>
                  {i === 0 && <div className="text-[#EAD07D]"><Activity size={16} /></div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#666]">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>No performer data available</p>
            </div>
          )}
          <button className="w-full mt-8 py-3 rounded-xl border border-gray-200 text-sm font-bold text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors">
            View Full Leaderboard
          </button>
        </Card>

      </div>
    </div>
    </FeatureGate>
  );
};
