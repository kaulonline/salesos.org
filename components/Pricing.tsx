import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRICING_TIERS } from '../constants';
import { Check, X, Tag, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useLicenseTypes, useCheckout } from '../src/hooks';
import { useAuth } from '../src/context/AuthContext';
import { paymentsApi, CouponValidation } from '../src/api/payments';
import type { LicenseType } from '../src/api/licensing';

const formatCurrency = (cents?: number) => {
  if (!cents) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const getTierBadge = (tier: string): string => {
  switch (tier) {
    case 'STARTER':
      return 'Starter';
    case 'PROFESSIONAL':
      return 'Most Popular';
    case 'ENTERPRISE':
      return 'Enterprise';
    default:
      return tier;
  }
};

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const { types: licenseTypes, loading } = useLicenseTypes();
  const { createCheckoutSession, loading: checkoutLoading } = useCheckout();

  // Use API plans if available, otherwise fallback to constants
  const hasApiPlans = licenseTypes && licenseTypes.length > 0;
  const sortedApiPlans = hasApiPlans
    ? [...licenseTypes].filter(p => p.isPublic && p.isActive && p.tier !== 'FREE' && p.tier !== 'CUSTOM')
        .sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0))
    : [];

  const yearlyDiscount = 20;

  // Validate and apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponError(null);

    try {
      const validation = await paymentsApi.validateCoupon({ code: couponCode.trim() });
      if (validation.valid) {
        setAppliedCoupon(validation);
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(validation.message || 'Invalid coupon code');
      }
    } catch (error: any) {
      setAppliedCoupon(null);
      setCouponError(error.response?.data?.message || 'Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Calculate discounted price - takes coupon as explicit parameter to ensure reactivity
  const calculateDiscount = (originalPrice: number, coupon: typeof appliedCoupon): number => {
    if (!coupon?.coupon || !coupon.coupon.discountValue) return originalPrice;

    const { discountType, discountValue } = coupon.coupon;
    const isPercentage = String(discountType || '').toUpperCase().includes('PERCENT');

    if (isPercentage && discountValue > 0) {
      return Math.round(originalPrice * (1 - discountValue / 100));
    } else if (discountValue > 0) {
      return Math.max(0, originalPrice - discountValue);
    }
    return originalPrice;
  };

  // Handle plan selection - direct checkout
  const handleSelectPlan = async (plan: LicenseType) => {
    if (plan.tier === 'ENTERPRISE') {
      navigate('/contact');
      return;
    }

    if (!isAuthenticated) {
      // Redirect to signup with plan info
      const params = new URLSearchParams({
        plan: plan.slug,
        billing: billingCycle,
      });
      if (appliedCoupon?.coupon) {
        params.append('coupon', appliedCoupon.coupon.code);
      }
      navigate(`/signup?${params.toString()}`);
      return;
    }

    setSelectedPlan(plan.id);

    try {
      const session = await createCheckoutSession(
        plan.id,
        billingCycle === 'annual' ? 'yearly' : 'monthly',
        appliedCoupon?.coupon?.code
      );

      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setSelectedPlan(null);
    }
  };

  // Handle fallback plan selection
  const handleFallbackPlan = (tierName: string) => {
    if (tierName === 'Enterprise') {
      navigate('/contact');
      return;
    }

    // For fallback plans, redirect to pricing page or signup
    const params = new URLSearchParams({
      plan: tierName.toLowerCase(),
      billing: billingCycle,
    });
    if (appliedCoupon?.coupon) {
      params.append('coupon', appliedCoupon.coupon.code);
    }

    if (!isAuthenticated) {
      navigate(`/signup?${params.toString()}`);
    } else {
      navigate(`/pricing?${params.toString()}`);
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-32 relative bg-[#F2F1EA] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2">Pricing</h2>
            <p className="text-[#666] text-lg">Choose the right plan for your team.</p>
          </div>

          {/* Toggle Switch */}
          <div className="bg-white p-1 rounded-full border border-black/5 flex items-center relative">
            <button
              onClick={() => setBillingCycle('annual')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${billingCycle === 'annual' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'}`}
            >
              Annual
              {billingCycle === 'annual' && (
                <span className="ml-2 text-[10px] bg-[#EAD07D] text-[#1A1A1A] px-2 py-0.5 rounded-full font-bold">
                  SAVE 20%
                </span>
              )}
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${billingCycle === 'monthly' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'}`}
            >
              Monthly
            </button>

            {/* Sliding Pill Background */}
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1A1A1A] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${billingCycle === 'monthly' ? 'translate-x-[100%]' : 'translate-x-0'}`}
            />
          </div>
        </div>

        {/* Coupon Code Input */}
        <div className="mb-10 max-w-md mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-black/5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="text-[#666]" />
              <span className="text-sm font-medium text-[#1A1A1A]">Have a coupon code?</span>
            </div>

            {appliedCoupon?.coupon ? (
              <div className="flex items-center justify-between bg-[#93C01F]/10 border border-[#93C01F]/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#93C01F] flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{appliedCoupon.coupon.code}</p>
                    <p className="text-xs text-[#666]">
                      {String(appliedCoupon.coupon.discountType).toUpperCase().includes('PERCENT')
                        ? `${appliedCoupon.coupon.discountValue}% off`
                        : `${formatCurrency(appliedCoupon.coupon.discountValue)} off`}
                      {appliedCoupon.coupon.duration === 'repeating' && appliedCoupon.coupon.durationMonths
                        ? ` for ${appliedCoupon.coupon.durationMonths} months`
                        : appliedCoupon.coupon.duration === 'forever'
                        ? ' forever'
                        : ' on first payment'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-[#666] hover:text-[#1A1A1A] p-1"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 bg-white text-[#1A1A1A] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#EAD07D]/50 text-sm font-medium"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#1A1A1A] text-white font-semibold text-sm hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {validatingCoupon ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            )}

            {couponError && (
              <p className="text-red-500 text-xs mt-2">{couponError}</p>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/60 rounded-[2.5rem] p-10 animate-pulse min-h-[700px]">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-10 bg-gray-200 rounded w-1/2 mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {sortedApiPlans.length > 0
              ? sortedApiPlans.map((plan) => {
                  const isHighlight = plan.tier === 'PROFESSIONAL';
                  const monthlyPrice = plan.priceMonthly || 0;
                  const yearlyPrice = plan.priceYearly || monthlyPrice * 12 * (1 - yearlyDiscount / 100);
                  const basePrice = billingCycle === 'annual' ? Math.round(yearlyPrice / 12) : monthlyPrice;
                  const displayPrice = calculateDiscount(basePrice, appliedCoupon);
                  const hasDiscount = appliedCoupon?.coupon && displayPrice < basePrice;
                  const isLoading = selectedPlan === plan.id && checkoutLoading;

                  return (
                    <div
                      key={plan.id}
                      className={`relative group rounded-[2.5rem] p-8 lg:p-10 flex flex-col transition-all duration-300 w-full min-h-[700px]
                        ${isHighlight
                          ? 'bg-[#1A1A1A] text-white shadow-2xl ring-4 ring-[#EAD07D]/20 scale-100 lg:scale-105 z-10'
                          : 'bg-[#F2F1EA] md:bg-[#F0F0E8] text-[#1A1A1A] border border-black/5 shadow-lg'
                        }
                      `}
                    >
                      {/* Top Tab / Badge */}
                      <div
                        className={`absolute -top-[1px] -right-[1px] h-12 px-6 flex items-center justify-center rounded-bl-2xl rounded-tr-[2.4rem] text-xs font-bold uppercase tracking-wider
                          ${isHighlight
                            ? 'bg-[#EAD07D] text-[#1A1A1A]'
                            : 'bg-[#E0E0D8] text-[#1A1A1A]/60'
                          }
                        `}
                      >
                        {getTierBadge(plan.tier)}
                        <div className={`absolute top-0 -left-4 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${isHighlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
                        <div className={`absolute -bottom-4 right-0 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${isHighlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
                      </div>

                      {/* Card Content */}
                      <div className="mb-8 mt-4 text-center">
                        <h3 className={`text-xl font-medium mb-4 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{plan.name}</h3>

                        <div className="flex items-center justify-center gap-3 mb-2">
                           {(hasDiscount || (billingCycle === 'annual' && monthlyPrice > 0)) && (
                               <span className={`text-2xl font-medium line-through decoration-2 ${isHighlight ? 'text-gray-500' : 'text-gray-400'}`}>
                                   {hasDiscount ? formatCurrency(basePrice) : formatCurrency(monthlyPrice)}
                               </span>
                           )}
                           <span className={`text-6xl font-sans font-medium tracking-tight ${isHighlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
                               {formatCurrency(displayPrice)}
                           </span>
                        </div>

                        <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
                            per month
                        </p>

                        {hasDiscount && appliedCoupon?.coupon && (
                          <p className="text-xs font-semibold text-[#93C01F] mb-4">
                            {String(appliedCoupon.coupon.discountType).toUpperCase().includes('PERCENT')
                              ? `${appliedCoupon.coupon.discountValue}% off applied`
                              : `${formatCurrency(appliedCoupon.coupon.discountValue)} off applied`}
                          </p>
                        )}

                        <p className={`text-xs font-medium uppercase tracking-wide mb-6 ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {billingCycle === 'annual'
                              ? `${formatCurrency(hasDiscount ? calculateDiscount(yearlyPrice, appliedCoupon) : yearlyPrice)} billed yearly`
                              : `${formatCurrency(hasDiscount ? calculateDiscount(monthlyPrice * 12, appliedCoupon) : monthlyPrice * 12)} billed yearly`}
                        </p>

                        <p className={`text-sm leading-relaxed max-w-[260px] mx-auto ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {plan.description}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className={`h-px w-full my-6 ${isHighlight ? 'bg-white/10' : 'bg-black/5'}`} />

                      {/* Features List */}
                      <div className="flex-1 space-y-4 mb-10">
                        {plan.maxUsers && (
                          <div className="flex items-start gap-4 text-[14px]">
                            <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`flex-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>
                              {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} team members
                            </span>
                          </div>
                        )}
                        {plan.maxConversations && (
                          <div className="flex items-start gap-4 text-[14px]">
                            <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`flex-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>
                              {plan.maxConversations === -1 ? 'Unlimited' : plan.maxConversations.toLocaleString()} AI conversations/mo
                            </span>
                          </div>
                        )}
                        {plan.maxDocuments && (
                          <div className="flex items-start gap-4 text-[14px]">
                            <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`flex-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>
                              {plan.maxDocuments === -1 ? 'Unlimited' : plan.maxDocuments.toLocaleString()} documents
                            </span>
                          </div>
                        )}
                        {plan.features?.slice(0, 5).map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-4 text-[14px]">
                            <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`flex-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{feature.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* Button */}
                      <button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isLoading}
                        className={`w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            isLoading
                            ? 'opacity-70 cursor-wait'
                            : isHighlight
                            ? 'bg-white text-[#1A1A1A] hover:bg-gray-100'
                            : 'bg-[#F2F1EA] border border-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-white'
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : plan.tier === 'ENTERPRISE' ? (
                          'Contact Sales'
                        ) : (
                          'Start Free Trial'
                        )}
                      </button>
                    </div>
                  );
                })
              : PRICING_TIERS.map((tier) => {
                  const basePrice = parseInt(tier.price.slice(1)) * 100; // Convert to cents
                  const displayPrice = calculateDiscount(basePrice, appliedCoupon);
                  const hasDiscount = appliedCoupon?.coupon && displayPrice < basePrice;

                  return (
                    <div
                      key={tier.name}
                      className={`relative group rounded-[2.5rem] p-8 lg:p-10 flex flex-col transition-all duration-300 w-full min-h-[700px]
                        ${tier.highlight
                          ? 'bg-[#1A1A1A] text-white shadow-2xl ring-4 ring-[#EAD07D]/20 scale-100 lg:scale-105 z-10'
                          : 'bg-[#F2F1EA] md:bg-[#F0F0E8] text-[#1A1A1A] border border-black/5 shadow-lg'
                        }
                      `}
                    >
                      {/* Top Tab / Badge */}
                      <div
                        className={`absolute -top-[1px] -right-[1px] h-12 px-6 flex items-center justify-center rounded-bl-2xl rounded-tr-[2.4rem] text-xs font-bold uppercase tracking-wider
                          ${tier.highlight
                            ? 'bg-[#EAD07D] text-[#1A1A1A]'
                            : 'bg-[#E0E0D8] text-[#1A1A1A]/60'
                          }
                        `}
                      >
                        {tier.badge}
                        <div className={`absolute top-0 -left-4 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${tier.highlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
                        <div className={`absolute -bottom-4 right-0 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${tier.highlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
                      </div>

                      {/* Card Content */}
                      <div className="mb-8 mt-4 text-center">
                        <h3 className={`text-xl font-medium mb-4 ${tier.highlight ? 'opacity-90' : 'opacity-70'}`}>{tier.name}</h3>

                        <div className="flex items-center justify-center gap-3 mb-2">
                           {(hasDiscount || tier.originalPrice) && (
                               <span className={`text-2xl font-medium line-through decoration-2 ${tier.highlight ? 'text-gray-500' : 'text-gray-400'}`}>
                                   {hasDiscount ? tier.price : tier.originalPrice}
                               </span>
                           )}
                           <span className={`text-6xl font-sans font-medium tracking-tight ${tier.highlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
                               {hasDiscount ? formatCurrency(displayPrice) : tier.price}
                           </span>
                        </div>

                        {hasDiscount && appliedCoupon?.coupon && (
                          <p className="text-xs font-semibold text-[#93C01F] mb-4">
                            {String(appliedCoupon.coupon.discountType).toUpperCase().includes('PERCENT')
                              ? `${appliedCoupon.coupon.discountValue}% off applied`
                              : `${formatCurrency(appliedCoupon.coupon.discountValue)} off applied`}
                          </p>
                        )}

                        <p className={`text-xs font-medium uppercase tracking-wide mb-6 ${tier.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {billingCycle === 'annual'
                              ? `$${Math.round((hasDiscount ? displayPrice / 100 : parseInt(tier.price.slice(1))) * 12 * 0.8)} billed yearly`
                              : `$${(hasDiscount ? displayPrice / 100 : parseInt(tier.price.slice(1))) * 12} billed yearly`}
                        </p>

                        <p className={`text-sm leading-relaxed max-w-[260px] mx-auto ${tier.highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {tier.description}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className={`h-px w-full my-6 ${tier.highlight ? 'bg-white/10' : 'bg-black/5'}`} />

                      {/* Features List */}
                      <div className="flex-1 space-y-4 mb-10">
                        {tier.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-4 text-[14px]">
                            <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                               <Check size={10} strokeWidth={4} />
                            </div>
                            <span className={`flex-1 ${tier.highlight ? 'opacity-90' : 'opacity-70'}`}>{feature}</span>
                          </div>
                        ))}

                        {tier.notIncluded?.map((feature, idx) => (
                           <div key={`not-${idx}`} className="flex items-start gap-4 text-[14px]">
                            <div className={`w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 ${tier.highlight ? 'text-gray-600' : 'text-gray-400'}`}>
                               <X size={16} strokeWidth={2} />
                            </div>
                            <span className={`flex-1 ${tier.highlight ? 'text-gray-600' : 'text-gray-400 line-through'}`}>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Button */}
                      <button
                        onClick={() => handleFallbackPlan(tier.name)}
                        className={`w-full py-4 rounded-full font-bold text-sm ${
                            tier.highlight
                            ? 'bg-white text-[#1A1A1A] hover:bg-gray-100'
                            : 'bg-[#F2F1EA] border border-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-white'
                        }`}
                      >
                        {tier.cta}
                      </button>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
    </section>
  );
};
