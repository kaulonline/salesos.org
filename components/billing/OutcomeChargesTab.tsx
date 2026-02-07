import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Flag,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useMyOutcomePlan,
  useMyOutcomeEvents,
  useMyOutcomeBillingStats,
} from '../../src/hooks';
import type { OutcomeEvent, OutcomeEventStatus, OutcomePricingModel } from '../../src/api/outcomeBilling';

export const OutcomeChargesTab: React.FC = () => {
  const { plan, loading: planLoading } = useMyOutcomePlan();
  const { events, total, page, setPage, loading: eventsLoading } = useMyOutcomeEvents({ limit: 10 });
  const { stats, loading: statsLoading } = useMyOutcomeBillingStats();

  const [statusFilter, setStatusFilter] = useState<OutcomeEventStatus | 'all'>('all');

  const formatCurrency = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  const getPricingModelLabel = (model: OutcomePricingModel) => {
    const labels: Record<OutcomePricingModel, string> = {
      REVENUE_SHARE: 'Revenue Share',
      TIERED_FLAT_FEE: 'Tiered Flat Fee',
      HYBRID: 'Hybrid',
      FLAT_PER_DEAL: 'Flat Fee Per Deal',
    };
    return labels[model] || model;
  };

  const getStatusBadge = (status: OutcomeEventStatus) => {
    const styles: Record<OutcomeEventStatus, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-[#EAD07D]/20', text: 'text-[#1A1A1A]', icon: Clock },
      INVOICED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: DollarSign },
      PAID: { bg: 'bg-[#93C01F]/20', text: 'text-[#93C01F]', icon: CheckCircle },
      WAIVED: { bg: 'bg-gray-100', text: 'text-gray-600', icon: XCircle },
      VOIDED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      FLAGGED_FOR_REVIEW: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Flag },
    };

    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const loading = planLoading || eventsLoading || statsLoading;

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#EAD07D] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-[#F8F8F6] rounded-xl p-8 text-center">
        <Info className="w-12 h-12 text-[#999] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No Outcome Billing Plan</h3>
        <p className="text-[#666] max-w-md mx-auto">
          Your organization is not currently enrolled in outcome-based billing.
          Contact your account manager to learn more about our success-based pricing.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 10);
  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium mb-1">Your Pricing Plan</h3>
            <p className="text-white/60 text-sm">
              {getPricingModelLabel(plan.pricingModel)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-[#EAD07D]" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pricing Rate */}
          <div>
            <p className="text-white/60 text-xs mb-1">Rate</p>
            <p className="text-xl font-light">
              {plan.pricingModel === 'REVENUE_SHARE' && plan.revenueSharePercent
                ? `${plan.revenueSharePercent}%`
                : plan.pricingModel === 'FLAT_PER_DEAL' && plan.flatFeePerDeal
                ? formatCurrency(plan.flatFeePerDeal, plan.currency)
                : plan.pricingModel === 'HYBRID' && plan.outcomePercent
                ? `${plan.outcomePercent}%`
                : 'Tiered'}
            </p>
          </div>

          {/* Monthly Cap */}
          <div>
            <p className="text-white/60 text-xs mb-1">Monthly Cap</p>
            <p className="text-xl font-light">
              {plan.monthlyCap
                ? formatCurrency(plan.monthlyCap, plan.currency)
                : 'No cap'}
            </p>
          </div>

          {/* Minimum Deal */}
          <div>
            <p className="text-white/60 text-xs mb-1">Min Deal Value</p>
            <p className="text-xl font-light">
              {plan.minDealValue
                ? formatCurrency(plan.minDealValue, plan.currency)
                : 'None'}
            </p>
          </div>

          {/* Billing Day */}
          <div>
            <p className="text-white/60 text-xs mb-1">Billing Day</p>
            <p className="text-xl font-light">{plan.billingDay}th</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Period Fees */}
          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <span className="text-sm font-medium text-[#666]">This Month</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">
              {formatCurrency(stats.currentPeriodFees)}
            </p>
            <p className="text-xs text-[#999] mt-1">
              {stats.currentPeriodDeals} deal{stats.currentPeriodDeals !== 1 ? 's' : ''} closed
            </p>
          </div>

          {/* Deal Value */}
          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#93C01F]" />
              </div>
              <span className="text-sm font-medium text-[#666]">Deal Value</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">
              {formatCurrency(stats.currentPeriodDealValue)}
            </p>
            <p className="text-xs text-[#999] mt-1">
              Total closed this month
            </p>
          </div>

          {/* Last Period */}
          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#666]" />
              </div>
              <span className="text-sm font-medium text-[#666]">Last Month</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">
              {formatCurrency(stats.lastPeriodFees)}
            </p>
            <p className="text-xs text-[#999] mt-1">
              {stats.lastPeriodDeals} deal{stats.lastPeriodDeals !== 1 ? 's' : ''} closed
            </p>
          </div>

          {/* Lifetime */}
          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-[#666]">Lifetime</span>
            </div>
            <p className="text-2xl font-light text-[#1A1A1A]">
              {formatCurrency(stats.totalLifetimeFees)}
            </p>
            <p className="text-xs text-[#999] mt-1">
              {stats.totalLifetimeDeals} total deal{stats.totalLifetimeDeals !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Cap Progress */}
      {stats && stats.monthlyCap && (
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#666]">Monthly Cap Usage</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">
              {formatCurrency(stats.currentPeriodFees)} / {formatCurrency(stats.monthlyCap)}
            </span>
          </div>
          <div className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.capUtilizationPercent || 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#999]">
            <span>{formatPercent(stats.capUtilizationPercent || 0)} used</span>
            <span>{formatCurrency(stats.capRemaining || 0)} remaining</span>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1A1A1A]">Outcome Events</h3>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OutcomeEventStatus | 'all')}
              className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] border-0 text-sm font-medium text-[#1A1A1A] focus:ring-1 focus:ring-[#EAD07D]"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="INVOICED">Invoiced</option>
              <option value="PAID">Paid</option>
              <option value="WAIVED">Waived</option>
              <option value="VOIDED">Voided</option>
              <option value="FLAGGED_FOR_REVIEW">Flagged</option>
            </select>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-10 h-10 text-[#999] mx-auto mb-3 opacity-40" />
            <p className="text-[#666]">No outcome events found</p>
            <p className="text-sm text-[#999] mt-1">
              Events will appear here when deals are closed
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F8F6]">
                    <th className="px-5 py-3 text-left font-medium text-[#666]">Deal</th>
                    <th className="px-5 py-3 text-left font-medium text-[#666]">Account</th>
                    <th className="px-5 py-3 text-right font-medium text-[#666]">Deal Value</th>
                    <th className="px-5 py-3 text-right font-medium text-[#666]">Fee</th>
                    <th className="px-5 py-3 text-left font-medium text-[#666]">Closed</th>
                    <th className="px-5 py-3 text-left font-medium text-[#666]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-black/5 hover:bg-[#F8F8F6] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#1A1A1A]">
                          {event.opportunityName}
                        </span>
                        {event.ownerName && (
                          <p className="text-xs text-[#999] mt-0.5">{event.ownerName}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[#666]">{event.accountName}</td>
                      <td className="px-5 py-4 text-right font-medium text-[#1A1A1A]">
                        {formatCurrency(event.dealAmount)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-[#EAD07D]">
                          {formatCurrency(event.feeAmount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#666]">
                        {formatDate(event.closedDate)}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(event.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-black/5">
                <p className="text-sm text-[#666]">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-[#F8F8F6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-[#666]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-[#F8F8F6] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-[#EAD07D]/10 rounded-xl p-5 flex gap-4">
        <Info className="w-5 h-5 text-[#1A1A1A] flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-[#1A1A1A] mb-1">How Outcome Billing Works</h4>
          <p className="text-sm text-[#666]">
            With outcome-based billing, you only pay when deals close successfully.
            {plan.pricingModel === 'REVENUE_SHARE' && plan.revenueSharePercent
              ? ` A ${plan.revenueSharePercent}% fee is applied to each closed deal.`
              : plan.pricingModel === 'FLAT_PER_DEAL' && plan.flatFeePerDeal
              ? ` A flat fee of ${formatCurrency(plan.flatFeePerDeal)} is charged per closed deal.`
              : ' Fees are calculated based on your pricing tier.'}
            {plan.monthlyCap && ` Your monthly fees are capped at ${formatCurrency(plan.monthlyCap)}.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OutcomeChargesTab;
