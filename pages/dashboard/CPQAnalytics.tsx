import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Loader2,
  Target,
  Award,
  Activity,
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { CountUp } from '../../components/ui/CountUp';
import { BarChart } from '../../src/components/charts';
import {
  useCPQDashboard,
  useCPQTrends,
  useQuotePipeline,
  useTopProducts,
  useTopAccounts,
  useSalesRepPerformance,
  useCPQForecast,
  useConversionFunnel,
  useExportCPQAnalytics,
} from '../../src/hooks/useCPQAnalytics';
import type { CPQAnalyticsFilters } from '../../src/types/cpqAnalytics';

type DateRange = '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom';

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
];

export default function CPQAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const getDateFilters = (): CPQAnalyticsFilters => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'mtd':
        startDate = startOfMonth(now);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = subDays(now, 30);
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
    };
  };

  const filters = getDateFilters();
  const { metrics, loading, error, refetch } = useCPQDashboard(filters);
  const { trends, loading: trendsLoading } = useCPQTrends({ ...filters, groupBy: 'day' });
  const { pipeline, loading: pipelineLoading } = useQuotePipeline();
  const { products: topProducts, loading: productsLoading } = useTopProducts(5, 'revenue');
  const { accounts: topAccounts, loading: accountsLoading } = useTopAccounts(5);
  const { performance: salesReps, loading: performanceLoading } = useSalesRepPerformance(filters);
  const { funnel, loading: funnelLoading } = useConversionFunnel(filters);
  const { forecast, loading: forecastLoading } = useCPQForecast(3);
  const { exportData, isExporting } = useExportCPQAnalytics();

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
    if (absAmount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (absAmount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (absAmount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async (exportFormat: 'csv' | 'xlsx' | 'pdf') => {
    try {
      await exportData(exportFormat, filters);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Skeleton className="h-10 w-64 rounded-2xl mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-[24px]" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-[32px]" />
            <Skeleton className="h-80 rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={() => refetch()} className="text-red-600 hover:text-red-800 font-medium">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">CPQ Analytics</h1>
            <p className="text-[#666] mt-1">Configure, Price, Quote performance insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm font-medium text-[#1A1A1A]"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors border border-black/10"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50 font-medium text-sm"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.revenue?.totalRevenue || 0)}
              change={metrics.revenue?.monthOverMonthChange || 0}
              icon={<DollarSign className="w-5 h-5" />}
              accentColor="gold"
            />
            <MetricCard
              title="Quotes Created"
              value={(metrics.quotes?.total || 0).toString()}
              change={metrics.quotes?.monthOverMonthChange || 0}
              icon={<FileText className="w-5 h-5" />}
              accentColor="dark"
            />
            <MetricCard
              title="Orders"
              value={(metrics.orders?.total || 0).toString()}
              change={metrics.orders?.monthOverMonthChange || 0}
              icon={<ShoppingCart className="w-5 h-5" />}
              accentColor="gold"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${(metrics.conversion?.quoteToOrderRate || 0).toFixed(1)}%`}
              change={metrics.conversion?.rateChange || 0}
              icon={<Target className="w-5 h-5" />}
              accentColor="dark"
            />
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#999]" />
                Revenue Trend
              </h3>
            </div>
            {trendsLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : trends.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-center">
                <div>
                  <TrendingUp size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No trend data available</p>
                </div>
              </div>
            ) : (
              <BarChart
                data={trends.slice(-14).map((item) => ({ name: item.period, value: item.revenue || 0 }))}
                dataKey="value"
                xAxisKey="name"
                height={200}
                color="#EAD07D"
                showGrid={false}
                showXAxis={false}
                barRadius={8}
                tooltipFormatter={(value) => formatCurrency(value)}
              />
            )}
          </Card>

          {/* Quote Pipeline */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[#999]" />
                Quote Pipeline
              </h3>
            </div>
            {pipelineLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : pipeline.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[#666]">
                No pipeline data available
              </div>
            ) : (
              <div className="space-y-4">
                {pipeline.map((stage, index) => {
                  const maxValue = Math.max(...pipeline.map((s) => s.value || 0), 1);
                  const width = maxValue > 0 ? ((stage.value || 0) / maxValue) * 100 : 0;
                  return (
                    <div key={stage.stage || index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#1A1A1A] font-medium">{stage.stage}</span>
                        <span className="text-[#666]">{stage.count} quotes &bull; {formatCurrency(stage.value || 0)}</span>
                      </div>
                      <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Products */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#999]" />
                Top Products
              </h3>
            </div>
            {productsLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : topProducts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[#666]">
                No product data available
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id || index} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs font-semibold text-[#1A1A1A]">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{product.name}</p>
                      <p className="text-xs text-[#999]">{product.quantity} units</p>
                    </div>
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {formatCurrency(product.revenue || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top Accounts */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#999]" />
                Top Accounts
              </h3>
            </div>
            {accountsLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : topAccounts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[#666]">
                No account data available
              </div>
            ) : (
              <div className="space-y-4">
                {topAccounts.map((account, index) => (
                  <div key={account.accountId || index} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{account.accountName}</p>
                      <p className="text-xs text-[#999]">{account.quoteCount || account.orderCount || 0} orders</p>
                    </div>
                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      {formatCurrency(account.revenue || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Conversion Funnel */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#999]" />
                Conversion Funnel
              </h3>
            </div>
            {funnelLoading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : funnel.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[#666]">
                No funnel data available
              </div>
            ) : (
              <div className="space-y-3">
                {funnel.map((stage, index) => {
                  const width = 100 - index * 15;
                  return (
                    <div key={stage.stage || index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#1A1A1A] font-medium">{stage.stage}</span>
                        <span className="text-[#666]">{stage.count}</span>
                      </div>
                      <div
                        className="h-10 bg-gradient-to-r from-[#EAD07D] to-[#D4BC5E] rounded-xl flex items-center justify-center text-[#1A1A1A] text-sm font-semibold"
                        style={{ width: `${width}%` }}
                      >
                        {(stage.conversionRate ?? 0).toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sales Rep Performance */}
        <Card variant="dark" className="p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#EAD07D]" />
              Sales Rep Performance
            </h3>
          </div>
          {performanceLoading ? (
            <Skeleton className="h-48 rounded-2xl bg-white/10" />
          ) : salesReps.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-white/50">
              No performance data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left font-medium text-white/60">Rep</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Quotes</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Won</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Lost</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Win Rate</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Total Value</th>
                    <th className="px-4 py-3 text-right font-medium text-white/60">Avg Deal</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReps.map((rep) => (
                    <tr key={rep.userId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-4 font-medium text-white">{rep.userName}</td>
                      <td className="px-4 py-4 text-right text-white/80">{rep.quotesCreated}</td>
                      <td className="px-4 py-4 text-right text-[#93C01F]">{rep.quotesWon || 0}</td>
                      <td className="px-4 py-4 text-right text-red-400">{rep.quotesLost || 0}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          (rep.winRate || 0) >= 50
                            ? 'bg-[#93C01F]/20 text-[#93C01F]'
                            : 'bg-[#EAD07D]/20 text-[#EAD07D]'
                        }`}>
                          {(rep.winRate ?? 0).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-white">
                        {formatCurrency(rep.totalValue || 0)}
                      </td>
                      <td className="px-4 py-4 text-right text-white/60">
                        {formatCurrency(rep.avgDealSize || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Forecast */}
        {!forecastLoading && forecast.length > 0 && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-[#1A1A1A] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#999]" />
                Revenue Forecast
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {forecast.map((period) => (
                <div key={period.period} className="bg-[#F8F6EF] rounded-2xl p-5">
                  <p className="text-sm text-[#666] mb-1">{period.period}</p>
                  <CountUp end={period.projectedRevenue || 0} prefix="$" className="text-2xl font-light text-[#1A1A1A] mb-3 block tabular-nums" />
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-[#EAD07D]/30 rounded-full text-xs font-semibold text-[#1A1A1A]">
                      {period.confidence || 0}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-[#999]">
                    {period.projectedQuotes || 0} quotes &bull; {period.projectedOrders || 0} orders
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  accentColor: 'gold' | 'dark';
}

function MetricCard({ title, value, change, icon, accentColor }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <Card variant="small" className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          accentColor === 'gold'
            ? 'bg-[#EAD07D]/20 text-[#1A1A1A]'
            : 'bg-[#1A1A1A] text-white'
        }`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-[#93C01F]' : 'text-red-500'
        }`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <p className="text-2xl font-light text-[#1A1A1A] mb-1">{value}</p>
      <p className="text-sm text-[#666]">{title}</p>
    </Card>
  );
}
