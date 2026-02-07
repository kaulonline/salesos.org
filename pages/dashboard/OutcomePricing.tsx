import React, { useState, useMemo } from 'react';
import {
  Target, DollarSign, TrendingUp, Building2, Users, Plus, Edit,
  Trash2, Eye, CheckCircle, Clock, XCircle, Flag, AlertTriangle,
  Search, Filter, ChevronLeft, ChevronRight, X, RefreshCw, FileText,
  Percent, Layers, Zap, MoreHorizontal, Check
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmationModal } from '../../src/components/ui/ConfirmationModal';
import { useToast } from '../../src/components/ui/Toast';
import {
  useAdminOutcomeDashboard,
  useAdminOutcomePlans,
  useAdminOutcomeEvents,
} from '../../src/hooks';
import type {
  OutcomePricingPlan,
  OutcomeEvent,
  OutcomePricingModel,
  OutcomeEventStatus,
  PricingTier,
  CreateOutcomePricingPlanDto,
} from '../../src/api/outcomeBilling';

type TabType = 'overview' | 'plans' | 'events';

const formatCurrency = (cents?: number, currency = 'USD') => {
  if (!cents && cents !== 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const formatDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getPricingModelLabel = (model: OutcomePricingModel) => {
  const labels: Record<OutcomePricingModel, string> = {
    REVENUE_SHARE: 'Revenue Share',
    TIERED_FLAT_FEE: 'Tiered Flat Fee',
    HYBRID: 'Hybrid',
    FLAT_PER_DEAL: 'Flat Per Deal',
  };
  return labels[model] || model;
};

const getPricingModelIcon = (model: OutcomePricingModel) => {
  const icons: Record<OutcomePricingModel, any> = {
    REVENUE_SHARE: Percent,
    TIERED_FLAT_FEE: Layers,
    HYBRID: Zap,
    FLAT_PER_DEAL: DollarSign,
  };
  return icons[model] || DollarSign;
};

const getEventStatusBadge = (status: OutcomeEventStatus) => {
  const config: Record<OutcomeEventStatus, { variant: 'green' | 'yellow' | 'red' | 'outline' | 'dark'; label: string }> = {
    PENDING: { variant: 'yellow', label: 'Pending' },
    INVOICED: { variant: 'dark', label: 'Invoiced' },
    PAID: { variant: 'green', label: 'Paid' },
    WAIVED: { variant: 'outline', label: 'Waived' },
    VOIDED: { variant: 'red', label: 'Voided' },
    FLAGGED_FOR_REVIEW: { variant: 'yellow', label: 'Flagged' },
  };
  const { variant, label } = config[status] || { variant: 'outline', label: status };
  return <Badge variant={variant} size="sm">{label}</Badge>;
};

export const OutcomePricing: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OutcomeEventStatus | ''>('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<OutcomePricingPlan | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OutcomeEvent | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'void' | 'waive'>('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Hooks
  const { dashboard, loading: dashboardLoading, refetch: refetchDashboard } = useAdminOutcomeDashboard();
  const { plans, total: totalPlans, page: plansPage, setPage: setPlansPage, loading: plansLoading, createPlan, updatePlan, deletePlan, refetch: refetchPlans } = useAdminOutcomePlans();
  const { events, total: totalEvents, page: eventsPage, setPage: setEventsPage, loading: eventsLoading, waiveEvent, voidEvent, resolveReview, generateInvoice, processBilling, refetch: refetchEvents } = useAdminOutcomeEvents({ status: statusFilter || undefined });

  // Plan form state
  const [planForm, setPlanForm] = useState<CreateOutcomePricingPlanDto>({
    organizationId: '',
    pricingModel: 'REVENUE_SHARE',
    revenueSharePercent: 2.5,
    billingDay: 1,
    currency: 'USD',
    isActive: true,
    // Profitability safeguards
    minFeePerDeal: 10000, // $100 default
    platformAccessFee: 4900, // $49 default
    grantsFullAccess: true,
  });

  const filteredPlans = useMemo(() => {
    if (!searchQuery) return plans;
    const query = searchQuery.toLowerCase();
    return plans.filter(p =>
      p.organization?.name?.toLowerCase().includes(query) ||
      p.organization?.slug?.toLowerCase().includes(query)
    );
  }, [plans, searchQuery]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(e =>
      e.opportunityName?.toLowerCase().includes(query) ||
      e.accountName?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const handleCreatePlan = async () => {
    try {
      setActionLoading(true);
      await createPlan(planForm);
      showToast({ type: 'success', title: 'Pricing plan created successfully' });
      setShowPlanModal(false);
      resetPlanForm();
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Failed to create plan' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    try {
      setActionLoading(true);
      await updatePlan(editingPlan.id, planForm);
      showToast({ type: 'success', title: 'Pricing plan updated successfully' });
      setShowPlanModal(false);
      setEditingPlan(null);
      resetPlanForm();
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Failed to update plan' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (plan: OutcomePricingPlan) => {
    try {
      await deletePlan(plan.id);
      showToast({ type: 'success', title: 'Pricing plan deleted' });
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Failed to delete plan' });
    }
  };

  const handleResolveEvent = async () => {
    if (!selectedEvent) return;
    try {
      setActionLoading(true);
      if (selectedEvent.status === 'FLAGGED_FOR_REVIEW') {
        await resolveReview(selectedEvent.id, reviewAction, reviewReason || undefined);
      } else if (reviewAction === 'waive') {
        await waiveEvent(selectedEvent.id, reviewReason);
      } else if (reviewAction === 'void') {
        await voidEvent(selectedEvent.id, reviewReason);
      }
      showToast({ type: 'success', title: `Event ${reviewAction}ed successfully` });
      setShowReviewModal(false);
      setSelectedEvent(null);
      setReviewReason('');
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Failed to process event' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessBilling = async () => {
    try {
      setActionLoading(true);
      await processBilling();
      showToast({ type: 'success', title: 'Billing processed successfully' });
      refetchEvents();
      refetchDashboard();
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Failed to process billing' });
    } finally {
      setActionLoading(false);
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      organizationId: '',
      pricingModel: 'REVENUE_SHARE',
      revenueSharePercent: 2.5,
      billingDay: 1,
      currency: 'USD',
      isActive: true,
      // Profitability safeguards
      minFeePerDeal: 10000, // $100 default
      platformAccessFee: 4900, // $49 default
      grantsFullAccess: true,
    });
  };

  const openEditPlan = (plan: OutcomePricingPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      organizationId: plan.organizationId,
      pricingModel: plan.pricingModel,
      revenueSharePercent: plan.revenueSharePercent ?? undefined,
      tierConfiguration: plan.tierConfiguration ?? undefined,
      flatFeePerDeal: plan.flatFeePerDeal ?? undefined,
      outcomePercent: plan.outcomePercent ?? undefined,
      monthlyCap: plan.monthlyCap ?? undefined,
      minDealValue: plan.minDealValue ?? undefined,
      billingDay: plan.billingDay,
      currency: plan.currency,
      isActive: plan.isActive,
      // Profitability safeguards
      minFeePerDeal: plan.minFeePerDeal ?? 10000,
      platformAccessFee: plan.platformAccessFee ?? 4900,
      grantsFullAccess: plan.grantsFullAccess ?? true,
    });
    setShowPlanModal(true);
  };

  const loading = dashboardLoading || plansLoading || eventsLoading;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Outcome Pricing</h1>
            <p className="text-[#666] mt-1">Manage outcome-based billing plans and events</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleProcessBilling}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              Process Billing
            </button>
            <button
              onClick={() => { resetPlanForm(); setEditingPlan(null); setShowPlanModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-8 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'plans', label: 'Pricing Plans', icon: Target },
            { id: 'events', label: 'Events', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#1A1A1A] shadow-sm'
                  : 'text-gray-600 hover:text-[#1A1A1A]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                  <span className="text-sm font-medium text-[#666]">Active Plans</span>
                </div>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {dashboardLoading ? <Skeleton className="h-8 w-16" /> : dashboard?.activePlans || 0}
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-[#93C01F]" />
                  </div>
                  <span className="text-sm font-medium text-[#666]">This Month</span>
                </div>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {dashboardLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(dashboard?.currentMonthFees)}
                </p>
                <p className="text-xs text-[#999] mt-1">
                  {dashboard?.currentMonthDeals || 0} deals closed
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#666]" />
                  </div>
                  <span className="text-sm font-medium text-[#666]">Pending</span>
                </div>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {dashboardLoading ? <Skeleton className="h-8 w-16" /> : dashboard?.pendingEvents || 0}
                </p>
                <p className="text-xs text-[#999] mt-1">Events to invoice</p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Flag className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium text-[#666]">Flagged</span>
                </div>
                <p className="text-2xl font-light text-[#1A1A1A]">
                  {dashboardLoading ? <Skeleton className="h-8 w-16" /> : dashboard?.flaggedForReview || 0}
                </p>
                <p className="text-xs text-[#999] mt-1">Needs review</p>
              </Card>
            </div>

            {/* Lifetime Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-[#1A1A1A]">
                <h3 className="text-lg font-medium text-white mb-4">Lifetime Revenue</h3>
                <p className="text-4xl font-light text-white mb-2">
                  {dashboardLoading ? <Skeleton className="h-12 w-32 bg-white/10" /> : formatCurrency(dashboard?.totalLifetimeRevenue)}
                </p>
                <p className="text-white/60 text-sm">Total outcome billing revenue</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-4">Deal Value This Month</h3>
                <p className="text-4xl font-light text-[#1A1A1A] mb-2">
                  {dashboardLoading ? <Skeleton className="h-12 w-32" /> : formatCurrency(dashboard?.currentMonthDealValue)}
                </p>
                <p className="text-[#666] text-sm">Total closed-won deal value</p>
              </Card>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
            </div>

            {/* Plans Table */}
            <Card className="overflow-hidden">
              {plansLoading ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="py-12 text-center">
                  <Target className="w-10 h-10 text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No pricing plans found</p>
                  <button
                    onClick={() => { resetPlanForm(); setShowPlanModal(true); }}
                    className="mt-4 text-sm text-[#EAD07D] hover:underline"
                  >
                    Create your first plan
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8F8F6]">
                      <th className="px-5 py-3 text-left font-medium text-[#666]">Organization</th>
                      <th className="px-5 py-3 text-left font-medium text-[#666]">Model</th>
                      <th className="px-5 py-3 text-right font-medium text-[#666]">Rate</th>
                      <th className="px-5 py-3 text-right font-medium text-[#666]">Monthly Cap</th>
                      <th className="px-5 py-3 text-center font-medium text-[#666]">Status</th>
                      <th className="px-5 py-3 text-right font-medium text-[#666]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan) => {
                      const ModelIcon = getPricingModelIcon(plan.pricingModel);
                      return (
                        <tr key={plan.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                          <td className="px-5 py-4">
                            <p className="font-medium text-[#1A1A1A]">{plan.organization?.name || 'Unknown'}</p>
                            <p className="text-xs text-[#999]">{plan.organization?.slug}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <ModelIcon className="w-4 h-4 text-[#666]" />
                              <span>{getPricingModelLabel(plan.pricingModel)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-medium">
                            {plan.pricingModel === 'REVENUE_SHARE' && `${plan.revenueSharePercent}%`}
                            {plan.pricingModel === 'FLAT_PER_DEAL' && formatCurrency(plan.flatFeePerDeal || 0)}
                            {plan.pricingModel === 'HYBRID' && `${plan.outcomePercent}%`}
                            {plan.pricingModel === 'TIERED_FLAT_FEE' && 'Tiered'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {plan.monthlyCap ? formatCurrency(plan.monthlyCap) : 'No cap'}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Badge variant={plan.isActive ? 'green' : 'outline'} size="sm">
                              {plan.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPlan(plan)}
                                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePlan(plan)}
                                className="p-2 text-[#666] hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OutcomeEventStatus | '')}
                className="px-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] outline-none text-sm font-medium text-[#1A1A1A]"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="INVOICED">Invoiced</option>
                <option value="PAID">Paid</option>
                <option value="FLAGGED_FOR_REVIEW">Flagged</option>
                <option value="WAIVED">Waived</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>

            {/* Events Table */}
            <Card className="overflow-hidden">
              {eventsLoading ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-[#999] mx-auto mb-3 opacity-40" />
                  <p className="text-[#666]">No outcome events found</p>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F8F8F6]">
                        <th className="px-5 py-3 text-left font-medium text-[#666]">Deal</th>
                        <th className="px-5 py-3 text-left font-medium text-[#666]">Account</th>
                        <th className="px-5 py-3 text-right font-medium text-[#666]">Deal Value</th>
                        <th className="px-5 py-3 text-right font-medium text-[#666]">Fee</th>
                        <th className="px-5 py-3 text-left font-medium text-[#666]">Closed</th>
                        <th className="px-5 py-3 text-center font-medium text-[#666]">Status</th>
                        <th className="px-5 py-3 text-right font-medium text-[#666]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="border-b border-black/5 hover:bg-[#F8F8F6]">
                          <td className="px-5 py-4">
                            <p className="font-medium text-[#1A1A1A]">{event.opportunityName}</p>
                            {event.ownerName && <p className="text-xs text-[#999]">{event.ownerName}</p>}
                          </td>
                          <td className="px-5 py-4 text-[#666]">{event.accountName}</td>
                          <td className="px-5 py-4 text-right font-medium">{formatCurrency(event.dealAmount)}</td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-[#EAD07D]">{formatCurrency(event.feeAmount)}</span>
                          </td>
                          <td className="px-5 py-4 text-[#666]">{formatDate(event.closedDate)}</td>
                          <td className="px-5 py-4 text-center">{getEventStatusBadge(event.status)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {(event.status === 'PENDING' || event.status === 'FLAGGED_FOR_REVIEW') && (
                                <>
                                  {event.status === 'FLAGGED_FOR_REVIEW' && (
                                    <button
                                      onClick={() => { setSelectedEvent(event); setReviewAction('approve'); setShowReviewModal(true); }}
                                      className="p-2 text-[#93C01F] hover:bg-green-50 rounded-lg"
                                      title="Approve"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setSelectedEvent(event); setReviewAction('waive'); setShowReviewModal(true); }}
                                    className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-lg"
                                    title="Waive"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedEvent(event); setReviewAction('void'); setShowReviewModal(true); }}
                                    className="p-2 text-[#666] hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Void"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {Math.ceil(totalEvents / 20) > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-black/5">
                      <p className="text-sm text-[#666]">
                        Showing {((eventsPage - 1) * 20) + 1} to {Math.min(eventsPage * 20, totalEvents)} of {totalEvents}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEventsPage(eventsPage - 1)}
                          disabled={eventsPage === 1}
                          className="p-2 rounded-lg hover:bg-[#F8F8F6] disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-[#666]">Page {eventsPage}</span>
                        <button
                          onClick={() => setEventsPage(eventsPage + 1)}
                          disabled={eventsPage >= Math.ceil(totalEvents / 20)}
                          className="p-2 rounded-lg hover:bg-[#F8F8F6] disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">
                {editingPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
              </h2>
              <button onClick={() => { setShowPlanModal(false); setEditingPlan(null); }} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 pt-6 space-y-4">
              {!editingPlan && (
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Organization ID</label>
                  <input
                    type="text"
                    value={planForm.organizationId}
                    onChange={(e) => setPlanForm({ ...planForm, organizationId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="Enter organization ID"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">Pricing Model</label>
                <select
                  value={planForm.pricingModel}
                  onChange={(e) => setPlanForm({ ...planForm, pricingModel: e.target.value as OutcomePricingModel })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                >
                  <option value="REVENUE_SHARE">Revenue Share</option>
                  <option value="FLAT_PER_DEAL">Flat Fee Per Deal</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="TIERED_FLAT_FEE">Tiered Flat Fee</option>
                </select>
              </div>

              {planForm.pricingModel === 'REVENUE_SHARE' && (
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Revenue Share %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={planForm.revenueSharePercent || ''}
                    onChange={(e) => setPlanForm({ ...planForm, revenueSharePercent: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="e.g., 2.5"
                  />
                </div>
              )}

              {planForm.pricingModel === 'FLAT_PER_DEAL' && (
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Flat Fee (cents)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.flatFeePerDeal || ''}
                    onChange={(e) => setPlanForm({ ...planForm, flatFeePerDeal: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="e.g., 50000 for $500"
                  />
                </div>
              )}

              {planForm.pricingModel === 'HYBRID' && (
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Outcome %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={planForm.outcomePercent || ''}
                    onChange={(e) => setPlanForm({ ...planForm, outcomePercent: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="e.g., 1.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Monthly Cap (cents)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.monthlyCap || ''}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyCap: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Min Deal Value (cents)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.minDealValue || ''}
                    onChange={(e) => setPlanForm({ ...planForm, minDealValue: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Profitability Safeguards */}
              <div className="pt-2 border-t border-black/5">
                <p className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-3">Profitability Safeguards</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-2">Min Fee Per Deal (cents)</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.minFeePerDeal || ''}
                      onChange={(e) => setPlanForm({ ...planForm, minFeePerDeal: parseInt(e.target.value) || undefined })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="e.g., 10000 for $100"
                    />
                    <p className="text-xs text-[#999] mt-1">Minimum charge per closed deal</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#666] mb-2">Platform Fee (cents/mo)</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.platformAccessFee || ''}
                      onChange={(e) => setPlanForm({ ...planForm, platformAccessFee: parseInt(e.target.value) || undefined })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                      placeholder="e.g., 4900 for $49"
                    />
                    <p className="text-xs text-[#999] mt-1">Monthly base platform fee</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Billing Day</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={planForm.billingDay || 1}
                    onChange={(e) => setPlanForm({ ...planForm, billingDay: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#666] mb-2">Currency</label>
                  <select
                    value={planForm.currency || 'USD'}
                    onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <label htmlFor="isActive" className="text-sm text-[#666]">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="grantsFullAccess"
                    checked={planForm.grantsFullAccess ?? true}
                    onChange={(e) => setPlanForm({ ...planForm, grantsFullAccess: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <label htmlFor="grantsFullAccess" className="text-sm text-[#666]">Grants Full Platform Access</label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}
                  className="flex-1 py-3 rounded-xl border border-black/10 text-[#666] font-medium hover:bg-[#F8F8F6]"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium hover:bg-[#333] disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-xl font-medium text-[#1A1A1A]">
                {reviewAction === 'approve' ? 'Approve Event' : reviewAction === 'waive' ? 'Waive Fee' : 'Void Event'}
              </h2>
              <button onClick={() => { setShowReviewModal(false); setSelectedEvent(null); }} className="text-[#666] hover:text-[#1A1A1A]">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 pt-6 space-y-4">
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="font-medium text-[#1A1A1A]">{selectedEvent.opportunityName}</p>
                <p className="text-sm text-[#666]">{selectedEvent.accountName}</p>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-[#666]">Deal Value</span>
                  <span className="font-medium">{formatCurrency(selectedEvent.dealAmount)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-[#666]">Fee Amount</span>
                  <span className="font-semibold text-[#EAD07D]">{formatCurrency(selectedEvent.feeAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-2">
                  Reason {reviewAction !== 'approve' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                  rows={3}
                  placeholder={reviewAction === 'approve' ? 'Optional notes...' : 'Enter reason...'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedEvent(null); }}
                  className="flex-1 py-3 rounded-xl border border-black/10 text-[#666] font-medium hover:bg-[#F8F8F6]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveEvent}
                  disabled={actionLoading || (reviewAction !== 'approve' && !reviewReason.trim())}
                  className={`flex-1 py-3 rounded-xl font-medium disabled:opacity-50 ${
                    reviewAction === 'void'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : reviewAction === 'approve'
                      ? 'bg-[#93C01F] text-white hover:bg-[#84ad1b]'
                      : 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                  }`}
                >
                  {actionLoading ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : reviewAction === 'waive' ? 'Waive Fee' : 'Void Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutcomePricing;
