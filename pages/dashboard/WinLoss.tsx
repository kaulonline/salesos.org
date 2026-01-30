import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  XCircle,
  Users,
  Target,
  Calendar,
  Filter,
  ChevronRight,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';

type WinLossReason = {
  reason: string;
  count: number;
  percentage: number;
};

type CompetitorData = {
  name: string;
  wins: number;
  losses: number;
  winRate: number;
  deals: number;
};

export const WinLoss: React.FC = () => {
  const { deals, loading } = useDeals();
  const [dateRange, setDateRange] = useState<'30' | '90' | '365'>('90');
  const [viewMode, setViewMode] = useState<'overview' | 'reasons' | 'competitors'>('overview');

  // Filter deals by date range and closed status
  const filteredDeals = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange));

    return deals.filter(d => {
      if (!d.isClosed || !d.closedDate) return false;
      return new Date(d.closedDate) >= cutoff;
    });
  }, [deals, dateRange]);

  const wonDeals = filteredDeals.filter(d => d.isWon);
  const lostDeals = filteredDeals.filter(d => !d.isWon);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalClosed = filteredDeals.length;
    const winCount = wonDeals.length;
    const lossCount = lostDeals.length;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;

    const totalWonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalLostValue = lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const avgDealSize = winCount > 0 ? totalWonValue / winCount : 0;

    // Calculate average sales cycle
    const salesCycles = wonDeals
      .filter(d => d.createdAt && d.closedDate)
      .map(d => {
        const created = new Date(d.createdAt);
        const closed = new Date(d.closedDate!);
        return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
    const avgSalesCycle = salesCycles.length > 0
      ? Math.round(salesCycles.reduce((a, b) => a + b, 0) / salesCycles.length)
      : 0;

    return {
      totalClosed,
      winCount,
      lossCount,
      winRate,
      totalWonValue,
      totalLostValue,
      avgDealSize,
      avgSalesCycle,
    };
  }, [filteredDeals, wonDeals, lostDeals]);

  // Sample win/loss reasons (in real app, these would come from deal close reasons)
  const winReasons: WinLossReason[] = [
    { reason: 'Product fit', count: 28, percentage: 35 },
    { reason: 'Competitive pricing', count: 22, percentage: 27 },
    { reason: 'Strong relationships', count: 15, percentage: 19 },
    { reason: 'Implementation support', count: 10, percentage: 12 },
    { reason: 'Brand reputation', count: 6, percentage: 7 },
  ];

  const lossReasons: WinLossReason[] = [
    { reason: 'Price too high', count: 18, percentage: 32 },
    { reason: 'Lost to competitor', count: 15, percentage: 27 },
    { reason: 'No decision / Stalled', count: 12, percentage: 21 },
    { reason: 'Missing features', count: 8, percentage: 14 },
    { reason: 'Timing not right', count: 3, percentage: 6 },
  ];

  // Sample competitor data
  const competitors: CompetitorData[] = [
    { name: 'Competitor A', wins: 12, losses: 8, winRate: 60, deals: 20 },
    { name: 'Competitor B', wins: 8, losses: 12, winRate: 40, deals: 20 },
    { name: 'Competitor C', wins: 15, losses: 5, winRate: 75, deals: 20 },
    { name: 'No Competitor', wins: 25, losses: 10, winRate: 71, deals: 35 },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <Skeleton className="h-12 w-64 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
              <BarChart3 size={28} className="text-[#EAD07D]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Win/Loss Analysis</h1>
              <p className="text-[#666] mt-1">Understand why deals are won and lost</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '30' | '90' | '365')}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A1A1A] rounded-[24px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} className="text-[#EAD07D]" />
              <span className="text-sm text-white/60">Win Rate</span>
            </div>
            <p className="text-4xl font-light text-white">{Math.round(metrics.winRate)}%</p>
            <p className="text-xs text-white/40 mt-1">{metrics.winCount}W / {metrics.lossCount}L</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={20} className="text-[#93C01F]" />
              <span className="text-sm text-[#666]">Won Revenue</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(metrics.totalWonValue)}</p>
            <p className="text-xs text-[#999] mt-1">{metrics.winCount} deals closed won</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <XCircle size={20} className="text-[#666]" />
              <span className="text-sm text-[#666]">Lost Revenue</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(metrics.totalLostValue)}</p>
            <p className="text-xs text-[#999] mt-1">{metrics.lossCount} deals closed lost</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={20} className="text-[#EAD07D]" />
              <span className="text-sm text-[#666]">Avg Sales Cycle</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{metrics.avgSalesCycle}</p>
            <p className="text-xs text-[#999] mt-1">days to close</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: PieChart },
            { id: 'reasons', label: 'Win/Loss Reasons', icon: BarChart3 },
            { id: 'competitors', label: 'Competitors', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === tab.id
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white border border-black/10 text-[#666] hover:bg-[#F8F8F6]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Rate Trend */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Win Rate by Stage</h2>
              <div className="space-y-4">
                {[
                  { stage: 'Qualification → Needs Analysis', rate: 85 },
                  { stage: 'Needs Analysis → Proposal', rate: 65 },
                  { stage: 'Proposal → Negotiation', rate: 55 },
                  { stage: 'Negotiation → Closed', rate: 75 },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#666]">{item.stage}</span>
                      <span className="text-sm font-semibold text-[#1A1A1A]">{item.rate}%</span>
                    </div>
                    <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Closed Deals */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Recent Closed Deals</h2>
              <div className="space-y-3">
                {filteredDeals.slice(0, 6).map(deal => (
                  <Link
                    key={deal.id}
                    to={`/dashboard/deals/${deal.id}`}
                    className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#EAD07D]/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        deal.isWon ? 'bg-[#93C01F]/20' : 'bg-[#F0EBD8]'
                      }`}>
                        {deal.isWon ? (
                          <Trophy size={14} className="text-[#93C01F]" />
                        ) : (
                          <XCircle size={14} className="text-[#999]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{deal.name}</p>
                        <p className="text-xs text-[#999]">{deal.account?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(deal.amount || 0)}</p>
                      <p className={`text-xs ${deal.isWon ? 'text-[#93C01F]' : 'text-[#999]'}`}>
                        {deal.isWon ? 'Won' : 'Lost'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'reasons' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Win Reasons */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                  <Trophy size={18} className="text-[#93C01F]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Why We Win</h2>
              </div>
              <div className="space-y-4">
                {winReasons.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#1A1A1A]">{item.reason}</span>
                      <span className="text-sm font-semibold text-[#93C01F]">{item.percentage}%</span>
                    </div>
                    <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#93C01F] rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#999] mt-1">{item.count} deals</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Loss Reasons */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F0EBD8] flex items-center justify-center">
                  <XCircle size={18} className="text-[#666]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Why We Lose</h2>
              </div>
              <div className="space-y-4">
                {lossReasons.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#1A1A1A]">{item.reason}</span>
                      <span className="text-sm font-semibold text-[#666]">{item.percentage}%</span>
                    </div>
                    <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1A1A1A] rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#999] mt-1">{item.count} deals</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'competitors' && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Competitive Win Rate</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#666]">Competitor</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#666]">Deals</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#666]">Wins</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#666]">Losses</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[#666]">Win Rate</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#666]">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((comp, idx) => (
                    <tr key={idx} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                      <td className="px-4 py-4">
                        <span className="font-medium text-[#1A1A1A]">{comp.name}</span>
                      </td>
                      <td className="px-4 py-4 text-center text-[#666]">{comp.deals}</td>
                      <td className="px-4 py-4 text-center text-[#93C01F] font-medium">{comp.wins}</td>
                      <td className="px-4 py-4 text-center text-[#666]">{comp.losses}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          comp.winRate >= 60 ? 'bg-[#93C01F]/20 text-[#93C01F]' :
                          comp.winRate >= 40 ? 'bg-[#EAD07D]/20 text-[#1A1A1A]' :
                          'bg-[#F0EBD8] text-[#666]'
                        }`}>
                          {comp.winRate}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-32 h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              comp.winRate >= 60 ? 'bg-[#93C01F]' :
                              comp.winRate >= 40 ? 'bg-[#EAD07D]' :
                              'bg-[#999]'
                            }`}
                            style={{ width: `${comp.winRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WinLoss;
