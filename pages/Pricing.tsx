import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, X, Sparkles, Zap, Crown, ArrowRight, Shield, Clock, Users } from 'lucide-react';
import { useLicenseTypes, useCheckout } from '../src/hooks';
import { useAuth } from '../src/context/AuthContext';
import { PRICING_TIERS } from '../constants';
import { Button } from '../components/ui/Button';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';
import type { LicenseType } from '../src/api/licensing';
import type { CouponValidation } from '../src/api/payments';

const getDiscountDescription = (validation: CouponValidation): string => {
  if (!validation.coupon) return 'Discount applied';
  const { coupon, discountAmount } = validation;
  if (coupon.discountType === 'PERCENTAGE') {
    return `${coupon.discountValue}% off${coupon.duration === 'FOREVER' ? ' forever' : coupon.duration === 'REPEATING' ? ` for ${coupon.durationMonths} months` : ''}`;
  }
  if (discountAmount) {
    return `$${(discountAmount / 100).toFixed(2)} off`;
  }
  return `$${(coupon.discountValue / 100).toFixed(2)} off`;
};

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

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  const { types: licenseTypes, loading } = useLicenseTypes();
  const { createCheckoutSession, validateCoupon, loading: checkoutLoading } = useCheckout();

  const handleSelectPlan = async (plan: LicenseType | typeof PRICING_TIERS[0]) => {
    // Check if it's API plan or fallback plan
    const isApiPlan = 'id' in plan && 'priceMonthly' in plan;

    if (!isApiPlan) {
      // Fallback plan - just navigate to contact or signup
      if (plan.name === 'Enterprise') {
        navigate('/contact');
      } else if (!isAuthenticated) {
        navigate('/signup');
      }
      return;
    }

    const licenseType = plan as LicenseType;

    if (!isAuthenticated) {
      navigate(`/signup?plan=${licenseType.slug}&billing=${billingCycle}`);
      return;
    }

    setSelectedPlan(licenseType.id);
    setCouponError(null);

    try {
      let validCoupon: string | undefined;
      if (couponCode) {
        const validation = await validateCoupon(couponCode, licenseType.id);
        if (!validation.valid) {
          setCouponError(validation.message || 'Invalid coupon');
          setSelectedPlan(null);
          return;
        }
        validCoupon = couponCode;
        setCouponSuccess(`Coupon applied: ${getDiscountDescription(validation)}`);
      }

      const session = await createCheckoutSession(
        licenseType.id,
        billingCycle === 'annual' ? 'yearly' : 'monthly',
        { couponCode: validCoupon }
      );

      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setCouponError('Failed to start checkout. Please try again.');
      setSelectedPlan(null);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setCouponError(null);
    setCouponSuccess(null);
    setAppliedCoupon(null);

    try {
      const validation = await validateCoupon(couponCode);
      if (validation.valid) {
        setAppliedCoupon(validation);
        setCouponSuccess(`Coupon valid: ${getDiscountDescription(validation)}`);
      } else {
        setCouponError(validation.message || 'Invalid coupon code');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
  };

  // Calculate discounted price
  const getDiscountedPrice = (originalPrice: number): number => {
    if (!appliedCoupon?.coupon) return originalPrice;
    const { discountType, discountValue } = appliedCoupon.coupon;
    if (String(discountType).toUpperCase().includes('PERCENT') && discountValue > 0) {
      return Math.round(originalPrice * (1 - discountValue / 100));
    } else if (discountValue > 0) {
      return Math.max(0, originalPrice - discountValue);
    }
    return originalPrice;
  };

  // Use API plans if available, otherwise fallback to constants
  const hasApiPlans = licenseTypes && licenseTypes.length > 0;
  const sortedApiPlans = hasApiPlans
    ? [...licenseTypes].filter(p => p.isPublic && p.isActive && p.tier !== 'FREE' && p.tier !== 'CUSTOM')
        .sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0))
    : [];

  const yearlyDiscount = 20;

  // Render API-driven card
  const renderApiCard = (plan: LicenseType) => {
    const isHighlight = plan.tier === 'PROFESSIONAL';
    const monthlyPrice = plan.priceMonthly || 0;
    const yearlyPrice = plan.priceYearly || monthlyPrice * 12 * (1 - yearlyDiscount / 100);
    const basePrice = billingCycle === 'annual' ? Math.round(yearlyPrice / 12) : monthlyPrice;
    const displayPrice = getDiscountedPrice(basePrice);
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

          {hasDiscount && (
            <p className="text-xs font-semibold text-[#93C01F] mb-2">
              {appliedCoupon?.coupon?.discountType === 'PERCENTAGE'
                ? `${appliedCoupon.coupon.discountValue}% off applied`
                : `${formatCurrency(appliedCoupon?.coupon?.discountValue || 0)} off applied`}
            </p>
          )}

          <p className={`text-xs font-medium uppercase tracking-wide mb-6 ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
            {billingCycle === 'annual'
              ? `${formatCurrency(hasDiscount ? getDiscountedPrice(yearlyPrice) : yearlyPrice)} billed yearly`
              : `${formatCurrency(hasDiscount ? getDiscountedPrice(monthlyPrice * 12) : monthlyPrice * 12)} billed yearly`}
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
          disabled={isLoading || plan.tier === 'FREE'}
          className={`w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            plan.tier === 'FREE'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
  };

  // Render fallback card from constants
  const renderFallbackCard = (tier: typeof PRICING_TIERS[0]) => {
    const isHighlight = tier.highlight;

    return (
      <div
        key={tier.name}
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
          {tier.badge}
          <div className={`absolute top-0 -left-4 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${isHighlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
          <div className={`absolute -bottom-4 right-0 w-4 h-4 bg-transparent shadow-[4px_-4px_0_0_rgba(0,0,0,0)] ${isHighlight ? 'shadow-[#EAD07D]' : 'shadow-[#E0E0D8]'} rounded-tr-lg`}></div>
        </div>

        {/* Card Content */}
        <div className="mb-8 mt-4 text-center">
          <h3 className={`text-xl font-medium mb-4 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{tier.name}</h3>

          <div className="flex items-center justify-center gap-3 mb-2">
            {tier.originalPrice && billingCycle === 'annual' && (
              <span className={`text-2xl font-medium line-through decoration-2 ${isHighlight ? 'text-gray-500' : 'text-gray-400'}`}>
                {tier.originalPrice}
              </span>
            )}
            <span className={`text-6xl font-sans font-medium tracking-tight ${isHighlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'}`}>
              {tier.price}
            </span>
          </div>

          <p className={`text-xs font-medium uppercase tracking-wide mb-6 ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
            {billingCycle === 'annual'
              ? `$${Math.round(parseInt(tier.price.slice(1)) * 12 * 0.8)} billed yearly`
              : `$${parseInt(tier.price.slice(1)) * 12} billed yearly`}
          </p>

          <p className={`text-sm leading-relaxed max-w-[260px] mx-auto ${isHighlight ? 'text-gray-400' : 'text-gray-500'}`}>
            {tier.description}
          </p>
        </div>

        {/* Divider */}
        <div className={`h-px w-full my-6 ${isHighlight ? 'bg-white/10' : 'bg-black/5'}`} />

        {/* Features List */}
        <div className="flex-1 space-y-4 mb-10">
          {tier.features.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-4 text-[14px]">
              <div className="w-5 h-5 rounded-full bg-[#93C01F] flex items-center justify-center shrink-0 mt-0.5 text-white">
                <Check size={10} strokeWidth={4} />
              </div>
              <span className={`flex-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{feature}</span>
            </div>
          ))}

          {tier.notIncluded?.map((feature, idx) => (
            <div key={`not-${idx}`} className="flex items-start gap-4 text-[14px]">
              <div className={`w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 ${isHighlight ? 'text-gray-600' : 'text-gray-400'}`}>
                <X size={16} strokeWidth={2} />
              </div>
              <span className={`flex-1 ${isHighlight ? 'text-gray-600' : 'text-gray-400 line-through'}`}>{feature}</span>
            </div>
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => handleSelectPlan(tier)}
          className={`w-full py-4 rounded-full font-bold text-sm ${
            isHighlight
              ? 'bg-white text-[#1A1A1A] hover:bg-gray-100'
              : 'bg-[#F2F1EA] border border-[#1A1A1A]/10 text-[#1A1A1A] hover:bg-white'
          }`}
        >
          {tier.cta}
        </button>
      </div>
    );
  };

  return (
    <>
    <SEOHead {...SEO_CONFIGS.pricing} />
    <div className="min-h-screen bg-[#F2F1EA]">

      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#EAD07D]/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm mb-4">
                <span className="w-2 h-2 rounded-full bg-[#93C01F] animate-pulse" />
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">14-Day Free Trial</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-2">Pricing</h1>
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
                ? sortedApiPlans.map(plan => renderApiCard(plan))
                : PRICING_TIERS.map(tier => renderFallbackCard(tier))
              }
            </div>
          )}

          {/* Coupon Code Section */}
          <div className="max-w-md mx-auto mt-16">
            <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-black/5">
              <h4 className="font-medium text-[#1A1A1A] mb-3">Have a coupon code?</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError(null);
                    setCouponSuccess(null);
                  }}
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8F8F6] border border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm font-mono"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-[#333] transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-sm text-red-600 mt-2">{couponError}</p>
              )}
              {couponSuccess && (
                <p className="text-sm text-green-600 mt-2">{couponSuccess}</p>
              )}
            </div>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 flex-wrap text-sm text-[#888]">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} className="text-[#93C01F]" />
              24/7 support
            </span>
          </div>

          {/* Enterprise CTA */}
          <div className="mt-16 text-center">
            <p className="text-[#666] mb-4">
              Need a custom plan for your enterprise?{' '}
              <Link to="/contact" className="text-[#1A1A1A] font-semibold hover:text-[#EAD07D] transition-colors">
                Contact our sales team
              </Link>
            </p>
          </div>
        </div>
      </section>

    </div>
    </>
  );
};

export default PricingPage;
