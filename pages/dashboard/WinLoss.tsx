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
  FileQuestion,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals, useWinRateReport } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';


export const WinLoss: React.FC = () => {
  const { deals, loading } = useDeals();
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [viewMode, setViewMode] = useState<'overview' | 'reasons' | 'competitors'>('overview');

  // Use the reporting API for win/loss data
  const { data: winRateReport, isLoading: reportLoading } = useWinRateReport({
    dateRange: dateRange,
    groupBy: 'stage',
  });

  // Filter deals by date range and closed status
  const filteredDeals = useMemo(() => {
    const cutoff = new Date();
    if (dateRange === 'month') cutoff.setDate(cutoff.getDate() - 30);
    else if (dateRange === 'quarter') cutoff.setDate(cutoff.getDate() - 90);
    else cutoff.setDate(cutoff.getDate() - 365);

    return deals.filter(d => {
      if (!d.isClosed || !d.closedDate) return false;
      return new Date(d.closedDate) >= cutoff;
    });
  }, [deals, dateRange]);

  const wonDeals = filteredDeals.filter(d => d.isWon);
  const lostDeals = filteredDeals.filter(d => !d.isWon);

  // Calculate metrics - always use deal data for consistency
  const metrics = useMemo(() => {
    const totalClosed = filteredDeals.length;
    const winCount = wonDeals.length;
    const lossCount = lostDeals.length;
    const winRate = totalClosed > 0 ? (winCount / totalClosed) * 100 : 0;

    const totalWonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalLostValue = lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const avgDealSize = winCount > 0 ? totalWonValue / winCount : 0;

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

  // Get stage-by-stage win rates from API
  const stageWinRates = useMemo(() => {
    if (winRateReport?.byStage) {
      return winRateReport.byStage.map(s => ({
        stage: s.stage,
        rate: s.winRate,
        won: s.won,
        lost: s.lost,
      }));
    }
    return [];
  }, [winRateReport]);

  const formatCurrency = (value: number | undefined | null) => {
    const num = value ?? 0;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
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
              onChange={(e) => setDateRange(e.target.value as 'month' | 'quarter' | 'year')}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
            >
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
              <option value="year">Last 12 months</option>
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
            {/* Win Rate by Stage */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Win Rate by Stage</h2>
              {stageWinRates.length > 0 ? (
                <div className="space-y-4">
                  {stageWinRates.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#666]">{item.stage}</span>
                        <span className="text-sm font-semibold text-[#1A1A1A]">{Math.round(item.rate)}%</span>
                      </div>
                      <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#999] mt-1">{item.won}W / {item.lost}L</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center">
                  <div>
                    <BarChart3 size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                    <p className="text-[#666]">No stage data available</p>
                    <p className="text-sm text-[#999]">Close more deals to see stage-by-stage win rates</p>
                  </div>
                </div>
              )}
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
              <div className="h-48 flex items-center justify-center text-center">
                <div>
                  <FileQuestion size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">Win reason tracking not configured</p>
                  <p className="text-sm text-[#999]">Record close reasons when marking deals as won</p>
                </div>
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
              <div className="h-48 flex items-center justify-center text-center">
                <div>
                  <FileQuestion size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">Loss reason tracking not configured</p>
                  <p className="text-sm text-[#999]">Record close reasons when marking deals as lost</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'competitors' && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Competitive Win Rate</h2>
            <div className="h-64 flex items-center justify-center text-center">
              <div>
                <Users size={48} className="text-[#999] mx-auto mb-4 opacity-40" />
                <p className="text-lg text-[#666]">Competitor tracking not configured</p>
                <p className="text-sm text-[#999] mt-2 max-w-md mx-auto">
                  Track competitors on individual deals to see competitive win rate analysis.
                  Add competitors from the deal detail page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WinLoss;
