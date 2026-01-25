import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Calendar, FileText, Settings, ArrowUpRight,
  Check, AlertTriangle, Clock, Download, ExternalLink, RefreshCw,
  Sparkles, Crown, Zap, Users, Shield, Info
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment'>('overview');
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const { customer, loading: customerLoading } = useBillingCustomer();
  const { subscriptions, loading: subscriptionsLoading, cancelSubscription, resumeSubscription } = useSubscriptions();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { paymentMethods, loading: paymentMethodsLoading, setDefaultPaymentMethod, removePaymentMethod } = usePaymentMethods();
  const { createPortalSession, loading: portalLoading } = useCheckout();
  const { types: licenseTypes } = useLicenseTypes();

  const currentSubscription = subscriptions?.[0];
  const currentPlan = currentSubscription?.licenseType;
  const [billingError, setBillingError] = useState<string | null>(null);

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

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return;
    }
    try {
      await cancelSubscription(currentSubscription.id);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
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
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#E5C56B] transition-colors flex items-center gap-2"
                  >
                    <ArrowUpRight size={14} />
                    Upgrade Plan
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

          {/* Usage Stats */}
          <Card className="p-6">
            <h3 className="font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
              <Clock size={18} className="text-[#EAD07D]" />
              Usage This Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">AI Conversations</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">124</span>
                  <span className="text-sm text-[#666] mb-1">/ {currentPlan?.maxConversations === -1 ? '∞' : currentPlan?.maxConversations || 100}</span>
                </div>
                <div className="h-2 bg-[#E8E7DF] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#EAD07D] rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Team Members</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">3</span>
                  <span className="text-sm text-[#666] mb-1">/ {currentPlan?.maxUsers === -1 ? '∞' : currentPlan?.maxUsers || 5}</span>
                </div>
                <div className="h-2 bg-[#E8E7DF] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="bg-[#F8F8F6] rounded-xl p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-1">Documents</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-light text-[#1A1A1A]">47</span>
                  <span className="text-sm text-[#666] mb-1">/ {currentPlan?.maxDocuments === -1 ? '∞' : currentPlan?.maxDocuments || 100}</span>
                </div>
                <div className="h-2 bg-[#E8E7DF] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: '47%' }} />
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
    </div>
  );
};

export default Subscription;
