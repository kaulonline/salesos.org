import React, { useState } from 'react';
import {
  CreditCard,
  Receipt,
  Settings,
  ExternalLink,
  AlertTriangle,
  Check,
  Clock,
  XCircle,
  RefreshCw,
  Trash2,
  Star,
} from 'lucide-react';
import {
  useBillingCustomer,
  useSubscriptions,
  useInvoices,
  usePaymentMethods,
} from '../../src/hooks';

export const BillingPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payment-methods'>('overview');

  const { customer, loading: customerLoading, openCustomerPortal, updateCustomer } = useBillingCustomer();
  const { subscriptions, loading: subsLoading, cancelSubscription, resumeSubscription } = useSubscriptions();
  const { invoices, loading: invoicesLoading } = useInvoices({ limit: 10 });
  const { paymentMethods, loading: pmLoading, removePaymentMethod, setDefaultPaymentMethod } = usePaymentMethods();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingBilling, setEditingBilling] = useState(false);
  const [billingForm, setBillingForm] = useState({
    billingName: customer?.billingName || '',
    billingEmail: customer?.billingEmail || '',
    billingPhone: customer?.billingPhone || '',
  });

  const activeSubscription = subscriptions.find(s => s.status === 'ACTIVE' || s.status === 'TRIALING');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (cents: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
      TRIALING: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      PAST_DUE: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
      CANCELED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
      PAUSED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      PAID: { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
      OPEN: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
    };

    const style = styles[status] || styles.ACTIVE;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleCancelSubscription = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel? You will retain access until the end of your billing period.')) {
      return;
    }
    setCancellingId(id);
    try {
      await cancelSubscription(id, false);
    } finally {
      setCancellingId(null);
    }
  };

  const handleSaveBilling = async () => {
    try {
      await updateCustomer(billingForm);
      setEditingBilling(false);
    } catch (error) {
      console.error('Failed to update billing info:', error);
    }
  };

  const loading = customerLoading || subsLoading || invoicesLoading || pmLoading;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#EAD07D] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Billing & Subscription</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-8 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Settings },
          { id: 'invoices', label: 'Invoices', icon: Receipt },
          { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
          {/* Current Subscription */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Current Subscription</h2>

            {activeSubscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">
                      {activeSubscription.licenseType?.name || 'Pro Plan'}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {activeSubscription.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} billing
                    </p>
                  </div>
                  {getStatusBadge(activeSubscription.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current period</span>
                    <p className="font-medium">
                      {formatDate(activeSubscription.currentPeriodStart)} - {formatDate(activeSubscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount</span>
                    <p className="font-medium">
                      {formatCurrency(activeSubscription.unitAmount, activeSubscription.currency)}
                      /{activeSubscription.billingCycle === 'yearly' ? 'year' : 'month'}
                    </p>
                  </div>
                </div>

                {activeSubscription.cancelAtPeriodEnd && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Subscription will cancel</p>
                      <p className="text-sm text-yellow-700">
                        Your subscription will end on {formatDate(activeSubscription.currentPeriodEnd)}
                      </p>
                      <button
                        onClick={() => resumeSubscription(activeSubscription.id)}
                        className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Resume Subscription
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => openCustomerPortal()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333]"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Subscription
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  {!activeSubscription.cancelAtPeriodEnd && (
                    <button
                      onClick={() => handleCancelSubscription(activeSubscription.id)}
                      disabled={cancellingId === activeSubscription.id}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      {cancellingId === activeSubscription.id ? 'Cancelling...' : 'Cancel Subscription'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have an active subscription</p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#EAD07D] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#d4bc6f]"
                >
                  View Plans
                </a>
              </div>
            )}
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Billing Information</h2>
              <button
                onClick={() => setEditingBilling(!editingBilling)}
                className="text-sm text-[#1A1A1A] hover:underline"
              >
                {editingBilling ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editingBilling ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={billingForm.billingName}
                    onChange={(e) => setBillingForm({ ...billingForm, billingName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={billingForm.billingEmail}
                    onChange={(e) => setBillingForm({ ...billingForm, billingEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={billingForm.billingPhone}
                    onChange={(e) => setBillingForm({ ...billingForm, billingPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
                  />
                </div>
                <button
                  onClick={handleSaveBilling}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333]"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {customer?.billingName || '-'}</p>
                <p><span className="text-gray-500">Email:</span> {customer?.billingEmail || '-'}</p>
                <p><span className="text-gray-500">Phone:</span> {customer?.billingPhone || '-'}</p>
                <p><span className="text-gray-500">Currency:</span> {customer?.currency || 'USD'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#1A1A1A]">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#1A1A1A] hover:underline"
                        >
                          Download PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment-methods' && (
        <div className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No payment methods saved</p>
              <button
                onClick={() => openCustomerPortal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333]"
              >
                Add Payment Method
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A]">
                      {pm.cardBrand} ending in {pm.cardLast4}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires {pm.cardExpMonth}/{pm.cardExpYear}
                    </p>
                  </div>
                  {pm.isDefault && (
                    <span className="flex items-center gap-1 text-xs text-[#EAD07D] font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!pm.isDefault && (
                    <button
                      onClick={() => setDefaultPaymentMethod(pm.id)}
                      className="text-sm text-gray-600 hover:text-[#1A1A1A]"
                    >
                      Set as default
                    </button>
                  )}
                  <button
                    onClick={() => removePaymentMethod(pm.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <button
            onClick={() => openCustomerPortal()}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            + Add Payment Method
          </button>
        </div>
      )}
    </div>
  );
};

export default BillingPortal;
