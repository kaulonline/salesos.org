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
      // Check if deal is closed - either by isClosed flag or by stage
      const isClosedDeal = d.isClosed || d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST';
      if (!isClosedDeal) return false;

      // Use closedDate if available, otherwise fall back to updatedAt or createdAt
      const closeDate = d.closedDate || d.updatedAt || d.createdAt;
      if (!closeDate) return false;

      return new Date(closeDate) >= cutoff;
    });
  }, [deals, dateRange]);

  // Determine won/lost by isWon flag or stage (for Salesforce-synced deals)
  const wonDeals = filteredDeals.filter(d => d.isWon === true || d.stage === 'CLOSED_WON');
  const lostDeals = filteredDeals.filter(d => d.stage === 'CLOSED_LOST' || (d.isClosed && d.isWon === false));

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

  // Aggregate loss reasons from closed deals
  const lossReasons = useMemo(() => {
    const reasonCounts: Record<string, { count: number; value: number }> = {};

    lostDeals.forEach(deal => {
      const reason = deal.lostReason || 'Not specified';
      if (!reasonCounts[reason]) {
        reasonCounts[reason] = { count: 0, value: 0 };
      }
      reasonCounts[reason].count++;
      reasonCounts[reason].value += deal.amount || 0;
    });

    return Object.entries(reasonCounts)
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        value: data.value,
        percentage: lostDeals.length > 0 ? (data.count / lostDeals.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [lostDeals]);

  // Aggregate win factors (based on deal source or type for won deals)
  const winFactors = useMemo(() => {
    const factorCounts: Record<string, { count: number; value: number }> = {};

    wonDeals.forEach(deal => {
      // Use opportunity source or type as a proxy for win factors
      const factor = deal.opportunitySource || deal.type || 'Not specified';
      const humanFactor = factor.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
      if (!factorCounts[humanFactor]) {
        factorCounts[humanFactor] = { count: 0, value: 0 };
      }
      factorCounts[humanFactor].count++;
      factorCounts[humanFactor].value += deal.amount || 0;
    });

    return Object.entries(factorCounts)
      .map(([factor, data]) => ({
        factor,
        count: data.count,
        value: data.value,
        percentage: wonDeals.length > 0 ? (data.count / wonDeals.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [wonDeals]);

  // Aggregate competitor win rates from deals with competitors
  const competitorAnalysis = useMemo(() => {
    const competitorStats: Record<string, { won: number; lost: number; value: number }> = {};

    filteredDeals.forEach(deal => {
      if (deal.competitors && deal.competitors.length > 0) {
        deal.competitors.forEach((competitor: string) => {
          if (!competitorStats[competitor]) {
            competitorStats[competitor] = { won: 0, lost: 0, value: 0 };
          }
          if (deal.isWon) {
            competitorStats[competitor].won++;
          } else {
            competitorStats[competitor].lost++;
          }
          competitorStats[competitor].value += deal.amount || 0;
        });
      }
    });

    return Object.entries(competitorStats)
      .map(([competitor, stats]) => ({
        competitor,
        won: stats.won,
        lost: stats.lost,
        total: stats.won + stats.lost,
        winRate: (stats.won + stats.lost) > 0 ? (stats.won / (stats.won + stats.lost)) * 100 : 0,
        totalValue: stats.value,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredDeals]);

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
            {/* Win Factors */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                  <Trophy size={18} className="text-[#93C01F]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Why We Win</h2>
              </div>
              {winFactors.length > 0 ? (
                <div className="space-y-4">
                  {winFactors.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#666]">{item.factor}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#999]">{item.count} deals</span>
                          <span className="text-sm font-semibold text-[#93C01F]">{Math.round(item.percentage)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#93C01F] rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-[#999] mt-4 pt-4 border-t border-black/5">
                    Based on deal source/type from {wonDeals.length} won deals
                  </p>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center">
                  <div>
                    <Trophy size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                    <p className="text-[#666]">No won deals in this period</p>
                    <p className="text-sm text-[#999]">Close some deals to see win factors</p>
                  </div>
                </div>
              )}
            </div>

            {/* Loss Reasons */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#F0EBD8] flex items-center justify-center">
                  <XCircle size={18} className="text-[#666]" />
                </div>
                <h2 className="text-lg font-semibold text-[#1A1A1A]">Why We Lose</h2>
              </div>
              {lossReasons.length > 0 ? (
                <div className="space-y-4">
                  {lossReasons.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[#666]">{item.reason}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#999]">{item.count} deals</span>
                          <span className="text-sm font-semibold text-[#1A1A1A]">{Math.round(item.percentage)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-[#999] mt-4 pt-4 border-t border-black/5">
                    Based on loss reasons from {lostDeals.length} lost deals
                  </p>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center">
                  <div>
                    <XCircle size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
                    <p className="text-[#666]">No lost deals with reasons in this period</p>
                    <p className="text-sm text-[#999]">Record loss reasons when marking deals as lost</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'competitors' && (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
            <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Competitive Win Rate</h2>
            {competitorAnalysis.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {competitorAnalysis.map((item, idx) => (
                    <div key={idx} className="bg-[#F8F8F6] rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white font-semibold text-sm">
                            {item.competitor.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A1A1A]">{item.competitor}</p>
                            <p className="text-xs text-[#999]">{item.total} competitive deals</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#666]">Win Rate vs {item.competitor}</span>
                          <span className={`text-sm font-bold ${item.winRate >= 50 ? 'text-[#93C01F]' : 'text-[#EAD07D]'}`}>
                            {Math.round(item.winRate)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#F0EBD8] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${item.winRate >= 50 ? 'bg-[#93C01F]' : 'bg-[#EAD07D]'}`}
                            style={{ width: `${item.winRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#93C01F] font-medium">{item.won}W</span>
                        <span className="text-[#666]">/</span>
                        <span className="text-[#999]">{item.lost}L</span>
                        <span className="text-[#666] ml-auto">{formatCurrency(item.totalValue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#999] pt-4 border-t border-black/5">
                  Based on competitor data from {filteredDeals.filter(d => d.competitors && d.competitors.length > 0).length} deals with competitors tracked
                </p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-center">
                <div>
                  <Users size={48} className="text-[#999] mx-auto mb-4 opacity-40" />
                  <p className="text-lg text-[#666]">No competitor data available</p>
                  <p className="text-sm text-[#999] mt-2 max-w-md mx-auto">
                    Track competitors on individual deals to see competitive win rate analysis.
                    Add competitors from the deal detail page.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WinLoss;
