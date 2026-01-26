import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowDown, Loader2, AlertCircle, Check, Sparkles, Zap, Crown, CheckCircle2, FileText, ExternalLink, Download } from 'lucide-react';
import { paymentsApi, UpgradePreview, InvoiceStatus } from '../../api/payments';
import type { LicenseType } from '../../api/licensing';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  currentPlan?: {
    id?: string;
    name?: string;
    tier?: string;
  };
  targetPlan: LicenseType;
  billingCycle: 'monthly' | 'yearly';
  onSuccess: () => void;
}

interface InvoiceResult {
  id: string;
  invoiceNumber: string;
  amountDue: number;
  amountPaid: number;
  status: InvoiceStatus;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const getTierIcon = (tier?: string) => {
  switch (tier) {
    case 'STARTER':
      return <Zap className="w-5 h-5" />;
    case 'PROFESSIONAL':
      return <Sparkles className="w-5 h-5" />;
    case 'ENTERPRISE':
      return <Crown className="w-5 h-5" />;
    default:
      return <Zap className="w-5 h-5" />;
  }
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  subscriptionId,
  currentPlan,
  targetPlan,
  billingCycle: initialBillingCycle,
  onSuccess,
}) => {
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>(initialBillingCycle);

  // Success state
  const [success, setSuccess] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceResult | null>(null);

  // Calculate savings for yearly
  const monthlyPrice = targetPlan.priceMonthly || 0;
  const yearlyPrice = targetPlan.priceYearly || 0;
  const yearlySavings = monthlyPrice > 0 ? Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100) : 0;

  useEffect(() => {
    if (isOpen && subscriptionId && targetPlan.id && !success) {
      loadPreview();
    }
  }, [isOpen, subscriptionId, targetPlan.id, selectedCycle]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setInvoice(null);
      setError(null);
    }
  }, [isOpen]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const previewData = await paymentsApi.previewSubscriptionChange(subscriptionId, {
        newLicenseTypeId: targetPlan.id,
        billingCycle: selectedCycle,
      });
      setPreview(previewData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load upgrade preview');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const result = await paymentsApi.changeSubscriptionPlan(subscriptionId, {
        newLicenseTypeId: targetPlan.id,
        billingCycle: selectedCycle,
      });

      // Show success state with invoice
      setSuccess(true);
      if (result.invoice) {
        setInvoice(result.invoice);
      }

      // Notify parent of success (will refresh data)
      onSuccess();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Failed to change plan';

      // Provide user-friendly error messages
      if (errorMessage.toLowerCase().includes('card') || errorMessage.toLowerCase().includes('payment')) {
        setError('Payment failed. Please update your payment method and try again.');
      } else if (errorMessage.toLowerCase().includes('insufficient')) {
        setError('Insufficient funds. Please use a different payment method.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setInvoice(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Success State */}
        {success ? (
          <div className="overflow-y-auto">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
                Plan Changed Successfully!
              </h3>
              <p className="text-[#666] mb-6">
                You are now on the <span className="font-semibold text-[#1A1A1A]">{targetPlan.name}</span> plan.
              </p>

              {/* Invoice Details */}
              {invoice && (
                <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-[#EAD07D]" />
                    <h4 className="font-medium text-[#1A1A1A]">Invoice Details</h4>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666]">Invoice Number</span>
                      <span className="font-mono text-[#1A1A1A]">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Amount Charged</span>
                      <span className="font-semibold text-[#1A1A1A]">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666]">Status</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Invoice Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[#E8E7DF]">
                    {invoice.hostedInvoiceUrl && (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-white border border-[#E8E7DF] rounded-lg text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={14} />
                        View Invoice
                      </a>
                    )}
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-white border border-[#E8E7DF] rounded-lg text-sm font-medium text-[#666] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* No invoice (e.g., downgrade with credit) */}
              {!invoice && (
                <div className="bg-green-50 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <Check size={18} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">
                      Your plan has been changed. Any credits will be applied to your next billing cycle.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header - Fixed at top */}
            <div className="flex items-center justify-between p-6 border-b border-[#F2F1EA] shrink-0">
              <h3 className="font-bold text-[#1A1A1A] text-lg flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${preview?.isUpgrade ? 'bg-[#EAD07D]/20' : 'bg-green-100'}`}>
                  {preview?.isUpgrade ? <ArrowRight className="w-5 h-5 text-[#1A1A1A]" /> : <ArrowDown className="w-5 h-5 text-green-600" />}
                </div>
                {preview?.isUpgrade ? 'Upgrade Plan' : 'Change Plan'}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-[#F8F8F6] rounded-lg transition-colors"
              >
                <X size={20} className="text-[#666]" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="text-[#EAD07D] animate-spin mb-4" />
                  <p className="text-[#666]">Calculating proration...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <p className="text-red-600 text-center mb-4 max-w-sm">{error}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={loadPreview}
                      className="px-4 py-2 bg-[#F8F8F6] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#F2F1EA] transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-[#666] hover:text-[#1A1A1A] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : preview ? (
                <>
                  {/* Billing Cycle Toggle */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Billing Cycle</p>
                    <div className="flex bg-[#F8F8F6] rounded-xl p-1">
                      <button
                        onClick={() => setSelectedCycle('monthly')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                          selectedCycle === 'monthly'
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#666] hover:text-[#1A1A1A]'
                        }`}
                      >
                        Monthly
                        <span className="block text-xs font-normal mt-0.5">
                          {formatCurrency(monthlyPrice)}/mo
                        </span>
                      </button>
                      <button
                        onClick={() => setSelectedCycle('yearly')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                          selectedCycle === 'yearly'
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#666] hover:text-[#1A1A1A]'
                        }`}
                      >
                        Yearly
                        <span className="block text-xs font-normal mt-0.5">
                          {formatCurrency(yearlyPrice)}/yr
                          {yearlySavings > 0 && (
                            <span className="ml-1 text-green-600">Save {yearlySavings}%</span>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Plan Comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Current Plan */}
                    <div className="bg-[#F8F8F6] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Current Plan</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                          {getTierIcon(currentPlan?.tier)}
                        </div>
                        <span className="font-medium text-[#1A1A1A]">{preview.currentPlan.name || 'Unknown'}</span>
                      </div>
                      <p className="text-2xl font-light text-[#1A1A1A]">
                        {formatCurrency(preview.currentPlan.price)}
                        <span className="text-sm text-[#666]">/{preview.currentPlan.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                      </p>
                    </div>

                    {/* New Plan */}
                    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#333] rounded-xl p-4 text-white">
                      <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">New Plan</p>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          {getTierIcon(targetPlan.tier)}
                        </div>
                        <span className="font-medium">{preview.newPlan.name}</span>
                      </div>
                      <p className="text-2xl font-light">
                        {formatCurrency(preview.newPlan.price)}
                        <span className="text-sm text-white/60">/{preview.newPlan.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Proration Details */}
                  <div className="bg-[#F8F8F6] rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-[#1A1A1A] mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm">
                      {preview.proration.lines.map((line, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-[#666]">{line.description}</span>
                          <span className={`font-mono ${line.amount < 0 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>
                            {line.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(line.amount))}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-[#1A1A1A]/10 pt-2 mt-2">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-[#1A1A1A]">Amount Due Now</span>
                          <span className={`text-lg font-mono ${preview.proration.netAmount < 0 ? 'text-green-600' : 'text-[#1A1A1A]'}`}>
                            {preview.proration.netAmount < 0
                              ? `Credit: ${formatCurrency(Math.abs(preview.proration.netAmount))}`
                              : formatCurrency(preview.proration.netAmount)
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Notice */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Check size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                      {preview.proration.netAmount > 0
                        ? 'Your saved payment method will be charged automatically.'
                        : 'Any credit will be applied to your next billing cycle.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-3 bg-[#F8F8F6] text-[#1A1A1A] rounded-xl font-medium hover:bg-[#F2F1EA] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={confirming}
                      className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        preview.isUpgrade
                          ? 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {confirming ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          Confirm & Pay
                          {preview.isUpgrade ? <ArrowRight size={16} /> : <ArrowDown size={16} />}
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
