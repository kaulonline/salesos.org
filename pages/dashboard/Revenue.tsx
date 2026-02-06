import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpRight, CheckCircle2, Clock, FileCheck, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDeals } from '../../src/hooks';
import type { Opportunity } from '../../src/types';
import { AreaChart } from '../../src/components/charts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatShortCurrency = (amount: number) => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
  if (absAmount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (absAmount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (absAmount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  return `$${amount}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusInfo = (deal: Opportunity) => {
  if (deal.isWon) {
    return { status: 'Won', color: 'bg-green-100 text-green-700' };
  }
  if (deal.isClosed && !deal.isWon) {
    return { status: 'Lost', color: 'bg-red-100 text-red-600' };
  }
  if (deal.stage === 'PROPOSAL_PRICE_QUOTE' || deal.stage === 'NEGOTIATION_REVIEW') {
    return { status: 'Proposal', color: 'bg-[#EAD07D] text-[#1A1A1A]' };
  }
  return { status: 'Active', color: 'bg-[#1A1A1A] text-white' };
};

export const Revenue: React.FC = () => {
  const navigate = useNavigate();
  const { deals, pipelineStats, forecast, loading, error, fetchPipelineStats, fetchForecast } = useDeals();
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPipelineStats();
    fetchForecast();
  }, [fetchPipelineStats, fetchForecast]);

  // Calculate revenue metrics from deals
  const metrics = useMemo(() => {
    const closedWonDeals = deals.filter(d => d.isWon);
    const totalCollected = closedWonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    const openDeals = deals.filter(d => !d.isClosed);
    const outstandingAmount = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate growth (comparing to weighted pipeline)
    const collectedGrowth = pipelineStats ?
      Math.round(((totalCollected / (pipelineStats.totalValue || 1)) * 100) - 100) : 0;

    return {
      totalCollected,
      outstandingAmount,
      projectedMRR: pipelineStats?.weightedPipeline || 0,
      collectedGrowth: Math.max(0, collectedGrowth),
    };
  }, [deals, pipelineStats]);

  // Filter and sort deals for the "invoice" table view
  const filteredDeals = useMemo(() => {
    let filtered = deals;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        if (statusFilter === 'won') return d.isWon;
        if (statusFilter === 'lost') return d.isClosed && !d.isWon;
        if (statusFilter === 'proposal') return d.stage === 'PROPOSAL_PRICE_QUOTE' || d.stage === 'NEGOTIATION_REVIEW';
        if (statusFilter === 'active') return !d.isClosed;
        return true;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.account?.name?.toLowerCase().includes(query)
      );
    }

    // Sort by close date or last activity
    return filtered.sort((a, b) => {
      const dateA = new Date(a.closeDate || a.updatedAt);
      const dateB = new Date(b.closeDate || b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 10);
  }, [deals, searchQuery, statusFilter]);

  // Forecast chart data - only use real data, no fake data generation
  const forecastData = useMemo(() => {
    if (!forecast?.byMonth || forecast.byMonth.length === 0) {
      return [];
    }

    return forecast.byMonth.slice(0, 6).map(m => ({
      month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      value: m.forecast,
    }));
  }, [forecast]);

  // Normalize data for chart
  const maxValue = Math.max(...forecastData.map(d => d.value), 1);
  const normalizedData = forecastData.map(d => (d.value / maxValue) * 80 + 10);

  // Chart path calculation
  const getPath = (data: number[]) => {
    if (data.length === 0) return '';
    let d = `M 0,${100 - data[0]}`;
    const step = 100 / (data.length - 1);

    for (let i = 0; i < data.length - 1; i++) {
      const x1 = i * step;
      const y1 = 100 - data[i];
      const x2 = (i + 1) * step;
      const y2 = 100 - data[i+1];

      const cp1x = x1 + (x2 - x1) * 0.5;
      const cp1y = y1;
      const cp2x = x2 - (x2 - x1) * 0.5;
      const cp2y = y2;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    }
    return d;
  };

  const linePath = getPath(normalizedData);
  const areaPath = `${linePath} L 100,150 L 0,150 Z`;

  // Upcoming payouts from close dates
  const upcomingPayouts = useMemo(() => {
    const now = new Date();
    return deals
      .filter(d => !d.isClosed && d.closeDate && new Date(d.closeDate) > now)
      .sort((a, b) => new Date(a.closeDate!).getTime() - new Date(b.closeDate!).getTime())
      .slice(0, 2)
      .map(d => ({
        name: d.account?.name || d.name,
        amount: d.amount || 0,
        date: d.closeDate!,
      }));
  }, [deals]);

  const totalUpcoming = upcomingPayouts.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-[160px] rounded-[2rem]" />
            <Skeleton className="h-[160px] rounded-[2rem]" />
            <Skeleton className="h-[160px] rounded-[2rem] bg-[#1A1A1A]" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <Skeleton className="h-[500px] rounded-[2rem]" />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-[340px] rounded-[2rem] bg-[#1A1A1A]" />
            <Skeleton className="h-[200px] rounded-[2rem] bg-[#EAD07D]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Unable to Load Revenue Data</h2>
          <p className="text-[#666] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-[#1A1A1A] mb-8">Revenue & Cash</h1>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card padding="md" className="flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]">
                <CheckCircle2 size={20} />
              </div>
              {metrics.collectedGrowth > 0 && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                  +{metrics.collectedGrowth}%
                </span>
              )}
            </div>
            <div>
              <span className="text-3xl font-medium text-[#1A1A1A] block tabular-nums">{formatCurrency(metrics.totalCollected)}</span>
              <div className="text-sm text-[#666] mt-1">Closed Won Revenue</div>
            </div>
          </Card>

          <Card padding="md" className="flex flex-col justify-between min-h-[160px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
            </div>
            <div>
              <span className="text-3xl font-medium text-[#1A1A1A] block tabular-nums">{formatCurrency(metrics.outstandingAmount)}</span>
              <div className="text-sm text-[#666] mt-1">Open Pipeline</div>
            </div>
          </Card>

          <Card variant="dark" padding="md" className="flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-[#EAD07D] rounded-full blur-[40px] opacity-20"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-sm">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="relative z-10">
              <span className="text-3xl font-medium text-white block tabular-nums">{formatCurrency(metrics.projectedMRR)}</span>
              <div className="text-sm text-white/60 mt-1">Weighted Pipeline</div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Deals Table */}
        <Card padding="lg" className="lg:col-span-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-xl font-bold">Opportunities</h2>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" size={14} />
                <input
                  type="text"
                  placeholder="Search opportunities or accounts..."
                  className="w-full pl-9 pr-4 py-2 bg-[#F8F8F6] rounded-full text-sm outline-none focus:ring-1 focus:ring-[#EAD07D]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    statusFilter !== 'all' ? 'bg-[#EAD07D] text-[#1A1A1A]' : 'bg-[#F8F8F6] text-[#666] hover:bg-[#F0EBD8]'
                  }`}
                >
                  <Filter size={14} />
                </button>
                {showFilterMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                    <div className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-2 text-xs font-bold text-[#999] uppercase">Filter by Status</div>
                      {[
                        { value: 'all', label: 'All Deals' },
                        { value: 'won', label: 'Won' },
                        { value: 'lost', label: 'Lost' },
                        { value: 'proposal', label: 'Proposal' },
                        { value: 'active', label: 'Active' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setStatusFilter(opt.value); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            statusFilter === opt.value ? 'bg-[#EAD07D]/20 font-medium' : 'hover:bg-[#F8F8F6]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-black/5">
                  <th className="pb-4 pl-4 text-xs font-bold text-[#999] uppercase tracking-wider">Opportunity Name</th>
                  <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Account</th>
                  <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Close Date</th>
                  <th className="pb-4 text-xs font-bold text-[#999] uppercase tracking-wider">Amount</th>
                  <th className="pb-4 text-right pr-4 text-xs font-bold text-[#999] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredDeals.length > 0 ? (
                  filteredDeals.map((deal) => {
                    const statusInfo = getStatusInfo(deal);
                    return (
                      <tr key={deal.id} className="group hover:bg-[#F8F8F6] transition-colors border-b border-black/5 last:border-0">
                        <td className="py-4 pl-4 font-medium text-[#1A1A1A] rounded-l-xl max-w-[200px] truncate">
                          {deal.name}
                        </td>
                        <td className="py-4 text-[#666] flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#F0EBD8] flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]">
                            {(deal.account?.name || 'U')[0]}
                          </div>
                          <span className="truncate max-w-[120px]">{deal.account?.name || 'Unknown'}</span>
                        </td>
                        <td className="py-4 text-[#666]">{deal.closeDate ? formatDate(deal.closeDate) : '-'}</td>
                        <td className="py-4 font-bold text-[#1A1A1A]">{formatCurrency(deal.amount || 0)}</td>
                        <td className="py-4 pr-4 text-right rounded-r-xl">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
                            {statusInfo.status === 'Won' && <CheckCircle2 size={12} />}
                            {statusInfo.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#666]">
                      <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No opportunities found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Column: Forecast / Upcoming */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="dark" padding="lg" className="flex flex-col h-[340px]">
            <div className="flex justify-between items-start mb-6 z-10 relative">
              <div>
                <h3 className="font-bold text-white text-lg">Revenue Forecast</h3>
                <p className="text-white/60 text-xs">Projected pipeline value</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/forecast')}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm"
                title="View Forecast"
              >
                <ArrowUpRight size={14} className="text-white" />
              </button>
            </div>

            <div className="flex-1 w-full">
              {forecastData.length > 0 ? (
                <AreaChart
                  data={forecastData}
                  dataKey="value"
                  xAxisKey="month"
                  height={180}
                  color="#EAD07D"
                  gradientId="revenueForecastGradient"
                  showGrid={false}
                  tooltipFormatter={(value) => formatShortCurrency(value)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <TrendingUp size={32} className="text-white/30 mb-3" />
                  <p className="text-white/60 text-sm">No forecast data available</p>
                  <p className="text-white/40 text-xs mt-1">Close deals to generate projections</p>
                </div>
              )}
            </div>
          </Card>

          <Card variant="yellow" padding="lg" className="relative overflow-hidden">
            <h3 className="font-bold text-lg mb-2 text-[#1A1A1A]">Expected Close</h3>
            <span className="text-4xl font-medium mb-8 text-[#1A1A1A] block tabular-nums">{formatCurrency(totalUpcoming)}</span>

            <div className="space-y-3 relative z-10">
              {upcomingPayouts.length > 0 ? (
                upcomingPayouts.map((payout, i) => (
                  <div key={i} className="bg-white/30 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center justify-between shadow-sm transition-transform hover:scale-[1.02] cursor-pointer">
                    <span className="text-sm font-bold text-[#1A1A1A] truncate max-w-[120px]">{payout.name}</span>
                    <div className="text-right">
                      <span className="block text-sm text-[#1A1A1A] font-bold">{formatCurrency(payout.amount)}</span>
                      <span className="text-xs text-[#1A1A1A]/70">{formatDate(payout.date)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/30 backdrop-blur-md border border-white/20 p-4 rounded-xl text-center text-[#1A1A1A]/70">
                  <p className="text-sm">No upcoming close dates</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
