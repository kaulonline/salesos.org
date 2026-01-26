import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard, Calendar, FileText, Settings, ArrowUpRight, ArrowDownRight,
  Check, AlertTriangle, Clock, Download, ExternalLink, RefreshCw,
  Sparkles, Crown, Zap, Users, Shield, Info, X, Loader2, ChevronDown
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  useBillingCustomer,
  useSubscriptions,
  useInvoices,
  usePaymentMethods,
  useCheckout,
  useLicenseTypes,
} from '../../src/hooks';
import { useAuth } from '../../src/context/AuthContext';
import { paymentsApi } from '../../src/api/payments';
import { UpgradeModal } from '../../src/components/billing/UpgradeModal';
import type { LicenseType } from '../../src/api/licensing';

const formatCurrency = (cents?: number) => {
  if (!cents) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'green' | 'yellow' | 'red' | 'outline'> = {
    ACTIVE: 'green',
    TRIALING: 'yellow',
    PAST_DUE: 'red',
    CANCELED: 'outline',
    PAUSED: 'yellow',
    EXPIRED: 'outline',
  };
  return <Badge variant={variants[status] || 'outline'} size="sm">{status}</Badge>;
};

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'STARTER':
      return <Zap className="w-5 h-5" />;
    case 'PROFESSIONAL':
      return <Sparkles className="w-5 h-5" />;
    case 'ENTERPRISE':
      return <Crown className="w-5 h-5" />;
    default:
      return <Users className="w-5 h-5" />;
  }
};

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment'>('overview');
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<LicenseType | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const { customer, loading: customerLoading } = useBillingCustomer();
  const { subscriptions, loading: subscriptionsLoading, cancelSubscription, resumeSubscription, refetch: refetchSubscriptions } = useSubscriptions();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { paymentMethods, loading: paymentMethodsLoading, setDefaultPaymentMethod, removePaymentMethod } = usePaymentMethods();
  const { createPortalSession, loading: portalLoading } = useCheckout();
  const { types: licenseTypes, loading: licenseTypesLoading } = useLicenseTypes();

  const currentSubscription = subscriptions?.[0];
  const currentPlan = currentSubscription?.licenseType;
  const [billingError, setBillingError] = useState<string | null>(null);

  // Handle URL params for upgrade redirect from Pricing page
  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    const targetPlan = searchParams.get('targetPlan');
    const billingCycle = searchParams.get('billingCycle') as 'monthly' | 'yearly' | null;

    if (upgrade === 'true' && targetPlan && licenseTypes && currentSubscription) {
      const plan = licenseTypes.find(t => t.id === targetPlan);
      if (plan) {
        setSelectedUpgradePlan(plan);
        setSelectedBillingCycle(billingCycle || 'yearly');
        setShowUpgradeModal(true);
        // Clear URL params
        setSearchParams({});
      }
    }
  }, [searchParams, licenseTypes, currentSubscription]);

  // Get available plans for upgrade (excluding current plan tier and free/custom tiers)
  const availablePlans = licenseTypes?.filter(t =>
    t.isPublic &&
    t.isActive &&
    t.tier !== 'FREE' &&
    t.tier !== 'CUSTOM' &&
    t.id !== currentPlan?.id
  ).sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0)) || [];

  const handleUpgradeSuccess = () => {
    refetchSubscriptions();
    setShowUpgradeModal(false);
    setSelectedUpgradePlan(null);
  };

  const handleSelectPlanForUpgrade = (plan: LicenseType) => {
    setSelectedUpgradePlan(plan);
    setShowPlanSelector(false);
    setShowUpgradeModal(true);
  };

  const handleManageBilling = async () => {
    try {
      setBillingError(null);
      const session = await createPortalSession();
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error: any) {
      console.error('Failed to open billing portal:', error);
      // Check if it's a "no customer" error
      const errorMessage = error?.response?.data?.message || error?.message || '';
      if (errorMessage.toLowerCase().includes('customer not found') || errorMessage.toLowerCase().includes('checkout first')) {
        setBillingError('You need to subscribe to a plan first to access billing management.');
      } else {
        setBillingError('Unable to open billing portal. Please try again later.');
      }
    }
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      setDownloadingInvoice(invoiceId);
      await paymentsApi.downloadInvoicePdf(invoiceId, invoiceNumber);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleCancelSubscription = () => {
    if (!currentSubscription) return;
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    if (!currentSubscription) return;
    try {
      setCancelling(true);
      await cancelSubscription(currentSubscription.id);
      setShowCancelModal(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!currentSubscription) return;
    try {
      await resumeSubscription(currentSubscription.id);
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CreditCard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payment', label: 'Payment Methods', icon: Settings },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#666] text-sm mb-2">
          <CreditCard size={16} />
          <span>Subscription</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Billing & Subscription</h1>
            <p className="text-[#666] mt-1">Manage your subscription and billing details</p>
          </div>
          {currentSubscription && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {portalLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {billingError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">{billingError}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 font-medium underline"
            >
              View Plans →
            </button>
          </div>
          <button
            onClick={() => setBillingError(null)}
            className="ml-auto text-yellow-600 hover:text-yellow-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-6 bg-white/60 p-1.5 rounded-2xl w-fit border border-white/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#1A1A1A] text-white shadow-md'
                : 'text-[#666] hover:text-[#1A1A1A] hover:bg-white/70'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Shield size={18} className="text-[#EAD07D]" />
              Current Plan
            </h3>

            {subscriptionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : !currentSubscription ? (
              <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-[#888]" />
                </div>
                <h4 className="font-bold text-[#1A1A1A] mb-2">No Active Subscription</h4>
                <p className="text-sm text-[#666] mb-4">
                  You're currently on the free plan. Upgrade to unlock more features.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-6 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#E5C56B] transition-colors"
                >
                  View Plans
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#333] rounded-xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      {getTierIcon(currentPlan?.tier || '')}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{currentPlan?.name || 'Unknown Plan'}</h4>
                      <p className="text-white/60 text-sm">{currentPlan?.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(currentSubscription.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Billing</p>
                    <p className="font-medium">
                      {formatCurrency(currentSubscription.unitAmount)}/{currentSubscription.billingCycle === 'yearly' ? 'year' : 'month'}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Next Billing</p>
                    <p className="font-medium">{formatDate(currentSubscription.currentPeriodEnd)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Started</p>
                    <p className="font-medium">{formatDate(currentSubscription.currentPeriodStart)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Gateway</p>
                    <p className="font-medium">{currentSubscription.gateway}</p>
                  </div>
                </div>

                {currentSubscription.cancelAtPeriodEnd && (
                  <div className="bg-yellow-500/20 text-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span className="text-sm">
                      Your subscription will end on {formatDate(currentSubscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPlanSelector(!showPlanSelector)}
                    className="px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#E5C56B] transition-colors flex items-center gap-2"
                  >
                    <ArrowUpRight size={14} />
                    Change Plan
                    <ChevronDown size={14} className={`transition-transform ${showPlanSelector ? 'rotate-180' : ''}`} />
                  </button>
                  {currentSubscription.cancelAtPeriodEnd ? (
                    <button
                      onClick={handleResumeSubscription}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Resume Subscription
                    </button>
                  ) : (
                    <button
                      onClick={handleCancelSubscription}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Plan Features */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Clock size={18} className="text-[#EAD07D]" />
              Plan Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">AI Conversations</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">
                    {currentPlan?.maxConversations === -1 ? 'Unlimited' : currentPlan?.maxConversations || 100}
                  </span>
                  <span className="text-sm text-[#666] mb-1">/ month</span>
                </div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Team Members</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">
                    {currentPlan?.maxUsers === -1 ? 'Unlimited' : currentPlan?.maxUsers || 5}
                  </span>
                  <span className="text-sm text-[#666] mb-1">seats</span>
                </div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Documents</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">
                    {currentPlan?.maxDocuments === -1 ? 'Unlimited' : currentPlan?.maxDocuments || 100}
                  </span>
                  <span className="text-sm text-[#666] mb-1">storage</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#F2F1EA]">
            <h3 className="font-bold text-[#1A1A1A]">Billing History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F8F6] border-b border-[#F2F1EA]">
                <tr>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Invoice</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Date</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Amount</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-[10px] font-bold text-[#999] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F1EA]">
                {invoicesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-4 px-6">
                        <Skeleton className="h-10 rounded" />
                      </td>
                    </tr>
                  ))
                ) : !invoices || invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#666]">
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-[#666]">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="py-4 px-6 font-medium">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge
                          variant={invoice.status === 'PAID' ? 'green' : invoice.status === 'OPEN' ? 'yellow' : 'outline'}
                          size="sm"
                        >
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadInvoice(invoice.id, invoice.invoiceNumber)}
                            disabled={downloadingInvoice === invoice.id}
                            className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingInvoice === invoice.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>
                          {invoice.hostedInvoiceUrl && (
                            <a
                              href={invoice.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-[#F2F1EA] text-[#666] transition-colors"
                              title="View Online"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <CreditCard size={18} className="text-[#EAD07D]" />
                Payment Methods
              </h3>
              <button
                onClick={handleManageBilling}
                className="text-sm text-[#666] hover:text-[#1A1A1A] font-medium"
              >
                Add New
              </button>
            </div>

            {paymentMethodsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : !paymentMethods || paymentMethods.length === 0 ? (
              <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                <CreditCard size={32} className="text-[#888] mx-auto mb-3" />
                <p className="text-[#666] mb-4">No payment methods added yet</p>
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg font-medium hover:bg-[#333] transition-colors"
                >
                  Add Payment Method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 bg-[#F8F8F6] rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-white rounded flex items-center justify-center border border-[#E8E7DF]">
                        <span className="text-xs font-bold text-[#666] uppercase">
                          {method.cardBrand || 'Card'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">
                          •••• •••• •••• {method.cardLast4}
                        </p>
                        <p className="text-xs text-[#666]">
                          Expires {method.cardExpMonth}/{method.cardExpYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault ? (
                        <Badge variant="green" size="sm">Default</Badge>
                      ) : (
                        <button
                          onClick={() => setDefaultPaymentMethod(method.id)}
                          className="text-xs text-[#666] hover:text-[#1A1A1A] font-medium"
                        >
                          Set as default
                        </button>
                      )}
                      {!method.isDefault && (
                        <button
                          onClick={() => removePaymentMethod(method.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-[#666] hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Billing Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-2">
                <FileText size={18} className="text-[#EAD07D]" />
                Billing Information
              </h3>
              <button
                onClick={handleManageBilling}
                className="text-sm text-[#666] hover:text-[#1A1A1A] font-medium"
              >
                Edit
              </button>
            </div>

            {customerLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : customer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8F8F6] rounded-xl">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Name</p>
                  <p className="text-[#1A1A1A]">{customer.billingName || user?.name || 'Not set'}</p>
                </div>
                <div className="p-4 bg-[#F8F8F6] rounded-xl">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Email</p>
                  <p className="text-[#1A1A1A]">{customer.billingEmail || user?.email || 'Not set'}</p>
                </div>
                {customer.billingAddress && (
                  <div className="p-4 bg-[#F8F8F6] rounded-xl md:col-span-2">
                    <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Address</p>
                    <p className="text-[#1A1A1A]">
                      {customer.billingAddress.line1}
                      {customer.billingAddress.line2 && <>, {customer.billingAddress.line2}</>}
                      {customer.billingAddress.city && <>, {customer.billingAddress.city}</>}
                      {customer.billingAddress.state && <>, {customer.billingAddress.state}</>}
                      {customer.billingAddress.postalCode && <> {customer.billingAddress.postalCode}</>}
                      {customer.billingAddress.country && <>, {customer.billingAddress.country}</>}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#F8F8F6] rounded-xl p-6 text-center">
                <p className="text-[#666]">No billing information on file</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#F2F1EA] shrink-0">
              <h3 className="font-bold text-[#1A1A1A] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                Cancel Subscription
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#666]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-[#666] mb-4">
                Are you sure you want to cancel your subscription?
              </p>

              <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-[#EAD07D] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#1A1A1A] font-medium">
                      You will continue to have access until the end of your billing period
                    </p>
                    {currentSubscription?.currentPeriodEnd && (
                      <p className="text-sm text-[#666] mt-1">
                        Your access will end on {formatDate(currentSubscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#F2F1EA] transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={confirmCancelSubscription}
                  disabled={cancelling}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {selectedUpgradePlan && currentSubscription && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedUpgradePlan(null);
          }}
          subscriptionId={currentSubscription.id}
          currentPlan={{
            id: currentPlan?.id,
            name: currentPlan?.name,
            tier: currentPlan?.tier,
          }}
          targetPlan={selectedUpgradePlan}
          billingCycle={selectedBillingCycle}
          onSuccess={handleUpgradeSuccess}
        />
      )}

      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowPlanSelector(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-white rounded-xl shadow-2xl border border-[#F2F1EA] z-50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#F2F1EA] bg-[#F8F8F6] flex items-center justify-between">
              <p className="text-sm font-bold text-[#1A1A1A]">Select New Plan</p>
              <button
                onClick={() => setShowPlanSelector(false)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X size={16} className="text-[#666]" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(licenseTypesLoading || subscriptionsLoading) ? (
                <div className="p-6 text-center text-[#666] text-sm flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Loading plans...
                </div>
              ) : availablePlans.length === 0 ? (
                <div className="p-6 text-center text-[#666] text-sm">
                  No other plans available
                </div>
              ) : (
                availablePlans.map(plan => {
                  const isUpgrade = (plan.priceMonthly || 0) > (currentSubscription?.unitAmount || 0);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlanForUpgrade(plan)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#F8F8F6] transition-colors text-left border-b border-[#F2F1EA] last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUpgrade ? 'bg-[#EAD07D]/20' : 'bg-green-100'}`}>
                          {plan.tier === 'STARTER' && <Zap className={`w-5 h-5 ${isUpgrade ? 'text-[#1A1A1A]' : 'text-green-600'}`} />}
                          {plan.tier === 'PROFESSIONAL' && <Sparkles className={`w-5 h-5 ${isUpgrade ? 'text-[#1A1A1A]' : 'text-green-600'}`} />}
                          {plan.tier === 'ENTERPRISE' && <Crown className={`w-5 h-5 ${isUpgrade ? 'text-[#1A1A1A]' : 'text-green-600'}`} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#1A1A1A]">{plan.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${isUpgrade ? 'bg-[#EAD07D]/20 text-[#1A1A1A]' : 'bg-green-100 text-green-700'}`}>
                              {isUpgrade ? 'Upgrade' : 'Downgrade'}
                            </span>
                          </div>
                          <p className="text-xs text-[#666]">
                            {formatCurrency(plan.priceMonthly)}/mo or {formatCurrency(plan.priceYearly)}/yr
                          </p>
                        </div>
                      </div>
                      {isUpgrade ? <ArrowUpRight size={16} className="text-[#999]" /> : <ArrowDownRight size={16} className="text-green-600" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-[#F2F1EA] bg-[#F8F8F6]">
              <button
                onClick={() => {
                  setShowPlanSelector(false);
                  navigate('/pricing');
                }}
                className="w-full text-sm text-[#666] hover:text-[#1A1A1A] font-medium"
              >
                View all plans →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Subscription;
