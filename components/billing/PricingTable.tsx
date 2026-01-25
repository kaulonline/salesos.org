import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { useLicenseTypes, useCheckout } from '../../src/hooks';
import type { LicenseType } from '../../src/api/licensing';

interface PricingTableProps {
  onSelectPlan?: (licenseType: LicenseType, billingCycle: 'monthly' | 'yearly') => void;
  showCheckout?: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan, showCheckout = true }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const { types: licenseTypes, loading } = useLicenseTypes();
  const { createCheckoutSession, validateCoupon, loading: checkoutLoading } = useCheckout();

  const handleSelectPlan = async (licenseType: LicenseType) => {
    if (onSelectPlan) {
      onSelectPlan(licenseType, billingCycle);
      return;
    }

    if (!showCheckout) return;

    setSelectedPlan(licenseType.id);

    try {
      // Validate coupon if provided
      let validCoupon: string | undefined;
      if (couponCode) {
        const validation = await validateCoupon(couponCode, licenseType.id);
        if (!validation.valid) {
          setCouponError(validation.message || 'Invalid coupon');
          setSelectedPlan(null);
          return;
        }
        validCoupon = couponCode;
        setCouponError(null);
      }

      // Create checkout session
      const session = await createCheckoutSession(
        licenseType.id,
        billingCycle,
        { couponCode: validCoupon }
      );

      // Redirect to checkout
      window.location.href = session.url;
    } catch (error) {
      console.error('Checkout error:', error);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (cents: number | null | undefined) => {
    if (!cents) return '$0';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'STARTER':
        return <Zap className="w-5 h-5" />;
      case 'PROFESSIONAL':
        return <Sparkles className="w-5 h-5" />;
      case 'ENTERPRISE':
        return <Building2 className="w-5 h-5" />;
      default:
        return <Check className="w-5 h-5" />;
    }
  };

  const publicPlans = (licenseTypes || [])
    .filter(lt => lt.isPublic && lt.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#EAD07D] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <section className="py-16 bg-[#F2F1EA]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#1A1A1A] mb-4">Choose Your Plan</h2>
          <p className="text-[#666] text-lg">Flexible pricing for teams of all sizes</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1 rounded-full border border-black/5 flex items-center relative">
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingCycle === 'yearly' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-green-600 font-normal">Save 20%</span>
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingCycle === 'monthly' ? 'text-white' : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              Monthly
            </button>
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1A1A1A] rounded-full transition-transform duration-300 ${
                billingCycle === 'monthly' ? 'translate-x-[100%]' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Coupon Input */}
        {showCheckout && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError(null);
                }}
                placeholder="Have a coupon code?"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EAD07D]"
              />
              {couponError && (
                <span className="text-red-500 text-sm">{couponError}</span>
              )}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {publicPlans.map((plan) => {
            const isPopular = plan.tier === 'PROFESSIONAL';
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const monthlyEquivalent = billingCycle === 'yearly' && plan.priceYearly
              ? Math.floor(plan.priceYearly / 12)
              : price;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col ${
                  isPopular
                    ? 'bg-[#1A1A1A] text-white ring-4 ring-[#EAD07D]/20 scale-105 z-10'
                    : 'bg-white text-[#1A1A1A] border border-black/5'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#EAD07D] text-[#1A1A1A] px-4 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isPopular ? 'bg-[#EAD07D] text-[#1A1A1A]' : 'bg-[#F2F1EA] text-[#1A1A1A]'
                  }`}>
                    {getTierIcon(plan.tier)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                      {plan.tier}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold ${isPopular ? 'text-[#EAD07D]' : ''}`}>
                      {formatPrice(monthlyEquivalent)}
                    </span>
                    <span className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                      /month
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className={`text-xs mt-1 ${isPopular ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatPrice(plan.priceYearly)} billed annually
                    </p>
                  )}
                </div>

                {/* Description */}
                <p className={`text-sm mb-6 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.description}
                </p>

                {/* Features */}
                <ul className="flex-1 space-y-3 mb-8">
                  {plan.maxUsers && (
                    <li className="flex items-center gap-3 text-sm">
                      <Check className={`w-5 h-5 ${isPopular ? 'text-[#EAD07D]' : 'text-green-500'}`} />
                      <span>Up to {plan.maxUsers} users</span>
                    </li>
                  )}
                  {plan.maxConversations && (
                    <li className="flex items-center gap-3 text-sm">
                      <Check className={`w-5 h-5 ${isPopular ? 'text-[#EAD07D]' : 'text-green-500'}`} />
                      <span>{plan.maxConversations.toLocaleString()} AI conversations/month</span>
                    </li>
                  )}
                  {plan.maxMeetings && (
                    <li className="flex items-center gap-3 text-sm">
                      <Check className={`w-5 h-5 ${isPopular ? 'text-[#EAD07D]' : 'text-green-500'}`} />
                      <span>{plan.maxMeetings} meetings/month</span>
                    </li>
                  )}
                  {(plan.features || []).slice(0, 5).map((feature) => (
                    <li key={feature.id} className="flex items-center gap-3 text-sm">
                      <Check className={`w-5 h-5 ${isPopular ? 'text-[#EAD07D]' : 'text-green-500'}`} />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={checkoutLoading || selectedPlan === plan.id}
                  className={`w-full py-4 rounded-full font-bold text-sm transition-all ${
                    isPopular
                      ? 'bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#d4bc6f]'
                      : 'bg-[#1A1A1A] text-white hover:bg-[#333]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : (
                    'Get Started'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Enterprise Contact */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Need a custom plan for your enterprise?{' '}
            <a href="/contact" className="text-[#1A1A1A] font-semibold hover:underline">
              Contact Sales
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingTable;
