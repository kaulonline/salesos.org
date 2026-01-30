import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals } from '../../src/hooks';
import { Skeleton } from '../../components/ui/Skeleton';

type ForecastCategory = 'COMMIT' | 'BEST_CASE' | 'PIPELINE' | 'OMITTED';

interface ForecastDeal {
  id: string;
  name: string;
  amount: number;
  probability: number;
  closeDate: string;
  stage: string;
  accountName: string;
  ownerName: string;
  category: ForecastCategory;
}

const categoryConfig: Record<ForecastCategory, { label: string; color: string; bg: string }> = {
  COMMIT: { label: 'Commit', color: 'text-[#93C01F]', bg: 'bg-[#93C01F]/20' },
  BEST_CASE: { label: 'Best Case', color: 'text-[#EAD07D]', bg: 'bg-[#EAD07D]/20' },
  PIPELINE: { label: 'Pipeline', color: 'text-blue-600', bg: 'bg-blue-100' },
  OMITTED: { label: 'Omitted', color: 'text-[#999]', bg: 'bg-[#F8F8F6]' },
};

export const Forecast: React.FC = () => {
  const { deals, loading } = useDeals();
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1 2026');
  const [expandedCategory, setExpandedCategory] = useState<ForecastCategory | null>('COMMIT');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  // Get current quarter info
  const quarters = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

  // Categorize deals based on probability and stage
  const categorizedDeals = useMemo(() => {
    const openDeals = deals.filter(d => !d.isClosed);

    return openDeals.map(deal => {
      let category: ForecastCategory = 'PIPELINE';
      const prob = deal.probability || 0;

      if (prob >= 90 || deal.stage === 'NEGOTIATION_REVIEW') {
        category = 'COMMIT';
      } else if (prob >= 70 || deal.stage === 'PROPOSAL_PRICE_QUOTE') {
        category = 'BEST_CASE';
      } else if (prob >= 30) {
        category = 'PIPELINE';
      } else {
        category = 'OMITTED';
      }

      return {
        id: deal.id,
        name: deal.name,
        amount: deal.amount || 0,
        probability: prob,
        closeDate: deal.closeDate || '',
        stage: deal.stage,
        accountName: deal.account?.name || 'Unknown',
        ownerName: deal.owner?.name || 'Unassigned',
        category,
      } as ForecastDeal;
    });
  }, [deals]);

  // Calculate totals by category
  const totals = useMemo(() => {
    const result: Record<ForecastCategory, { count: number; total: number; weighted: number }> = {
      COMMIT: { count: 0, total: 0, weighted: 0 },
      BEST_CASE: { count: 0, total: 0, weighted: 0 },
      PIPELINE: { count: 0, total: 0, weighted: 0 },
      OMITTED: { count: 0, total: 0, weighted: 0 },
    };

    categorizedDeals.forEach(deal => {
      result[deal.category].count++;
      result[deal.category].total += deal.amount;
      result[deal.category].weighted += deal.amount * (deal.probability / 100);
    });

    return result;
  }, [categorizedDeals]);

  const totalForecast = totals.COMMIT.total + totals.BEST_CASE.weighted + totals.PIPELINE.weighted * 0.5;
  const commitTotal = totals.COMMIT.total;
  const bestCaseTotal = totals.COMMIT.total + totals.BEST_CASE.total;
  const pipelineTotal = totals.COMMIT.total + totals.BEST_CASE.total + totals.PIPELINE.total;

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'PROSPECTING': 'Prospecting',
      'QUALIFICATION': 'Qualification',
      'NEEDS_ANALYSIS': 'Needs Analysis',
      'VALUE_PROPOSITION': 'Value Prop',
      'DECISION_MAKERS_IDENTIFIED': 'Decision Makers',
      'PROPOSAL_PRICE_QUOTE': 'Proposal',
      'NEGOTIATION_REVIEW': 'Negotiation',
    };
    return labels[stage] || stage;
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
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Revenue Forecast</h1>
            <p className="text-[#666] mt-1">Track and manage your sales forecast by category</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-4 py-2.5 rounded-full bg-white border border-black/10 text-sm font-medium text-[#1A1A1A] focus:border-[#EAD07D] outline-none"
            >
              {quarters.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Forecast Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1A1A1A] rounded-[24px] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} className="text-[#EAD07D]" />
              <span className="text-sm text-white/60">Weighted Forecast</span>
            </div>
            <p className="text-3xl font-light text-white">{formatCurrency(totalForecast)}</p>
            <p className="text-xs text-white/40 mt-1">Probability-weighted total</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={20} className="text-[#93C01F]" />
              <span className="text-sm text-[#666]">Commit</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(commitTotal)}</p>
            <p className="text-xs text-[#999] mt-1">{totals.COMMIT.count} deals • 90%+ probability</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#EAD07D]" />
              <span className="text-sm text-[#666]">Best Case</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(bestCaseTotal)}</p>
            <p className="text-xs text-[#999] mt-1">{totals.COMMIT.count + totals.BEST_CASE.count} deals total</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-blue-600" />
              <span className="text-sm text-[#666]">Total Pipeline</span>
            </div>
            <p className="text-3xl font-light text-[#1A1A1A]">{formatCurrency(pipelineTotal)}</p>
            <p className="text-xs text-[#999] mt-1">{categorizedDeals.length} open deals</p>
          </div>
        </div>

        {/* Forecast Funnel Visualization */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 mb-8">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Forecast Breakdown</h2>
          <div className="space-y-4">
            {(['COMMIT', 'BEST_CASE', 'PIPELINE', 'OMITTED'] as ForecastCategory[]).map((category) => {
              const config = categoryConfig[category];
              const data = totals[category];
              const deals = categorizedDeals.filter(d => d.category === category);
              const isExpanded = expandedCategory === category;
              const widthPercent = pipelineTotal > 0 ? (data.total / pipelineTotal) * 100 : 0;

              return (
                <div key={category}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-32 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="h-10 bg-[#F0EBD8] rounded-xl overflow-hidden">
                          <div
                            className={`h-full ${config.bg} rounded-xl transition-all duration-500 flex items-center px-4`}
                            style={{ width: `${Math.max(widthPercent, 5)}%` }}
                          >
                            <span className={`text-sm font-semibold ${config.color}`}>
                              {formatCurrency(data.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <span className="text-sm font-medium text-[#1A1A1A]">{data.count} deals</span>
                      </div>
                      <ChevronDown size={18} className={`text-[#999] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isExpanded && deals.length > 0 && (
                    <div className="mt-4 ml-36 space-y-2">
                      {deals.slice(0, 10).map(deal => (
                        <Link
                          key={deal.id}
                          to={`/dashboard/deals/${deal.id}`}
                          className="flex items-center justify-between p-3 bg-[#F8F8F6] rounded-xl hover:bg-[#F0EBD8] transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">{deal.name}</p>
                            <p className="text-xs text-[#666]">{deal.accountName} • {getStageLabel(deal.stage)}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(deal.amount)}</p>
                            <p className="text-xs text-[#999]">{deal.probability}% prob</p>
                          </div>
                          <ChevronRight size={16} className="text-[#999] ml-2" />
                        </Link>
                      ))}
                      {deals.length > 10 && (
                        <p className="text-xs text-[#999] text-center py-2">
                          +{deals.length - 10} more deals
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5">
          <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Monthly Close Timeline</h2>
          <div className="grid grid-cols-3 gap-6">
            {['Jan', 'Feb', 'Mar'].map((month, idx) => {
              const monthDeals = categorizedDeals.slice(idx * 3, (idx + 1) * 3);
              const monthTotal = monthDeals.reduce((sum, d) => sum + d.amount, 0);

              return (
                <div key={month} className="bg-[#F8F8F6] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#999]" />
                      <span className="text-sm font-medium text-[#1A1A1A]">{month} 2026</span>
                    </div>
                    <span className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(monthTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {monthDeals.slice(0, 3).map(deal => (
                      <div key={deal.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#666] truncate flex-1">{deal.name}</span>
                        <span className="text-[#1A1A1A] font-medium ml-2">{formatCurrency(deal.amount)}</span>
                      </div>
                    ))}
                    {monthDeals.length === 0 && (
                      <p className="text-sm text-[#999] text-center py-4">No deals closing</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;
