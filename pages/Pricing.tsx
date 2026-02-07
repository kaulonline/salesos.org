import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check,
  TrendingUp,
  DollarSign,
  Target,
  Shield,
  Zap,
  ArrowRight,
  Calculator,
  Users,
  BarChart3,
  Award,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../src/context/AuthContext';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

// Pricing model examples for the calculator
const EXAMPLE_DEALS = [
  { name: 'Small Deal', amount: 10000, fee: 250 },
  { name: 'Medium Deal', amount: 50000, fee: 1250 },
  { name: 'Large Deal', amount: 150000, fee: 3750 },
  { name: 'Enterprise Deal', amount: 500000, fee: 12500 },
];

const PRICING_MODELS = [
  {
    id: 'revenue-share',
    name: 'Revenue Share',
    description: 'Pay a percentage of each closed deal',
    icon: TrendingUp,
    example: '2.5% of deal value',
    highlight: true,
    popular: true,
  },
  {
    id: 'tiered-flat',
    name: 'Tiered Flat Fee',
    description: 'Fixed fees based on deal size brackets',
    icon: BarChart3,
    example: '$500 for deals under $50k',
    highlight: false,
    popular: false,
  },
  {
    id: 'flat-per-deal',
    name: 'Flat Per Deal',
    description: 'Same fee regardless of deal size',
    icon: DollarSign,
    example: '$250 per closed deal',
    highlight: false,
    popular: false,
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'Low base + reduced outcome fees',
    icon: Zap,
    example: '$99/mo + 1% of deals',
    highlight: false,
    popular: false,
  },
];

const BENEFITS = [
  {
    icon: Shield,
    title: 'Zero Upfront Risk',
    description: 'No subscription fees. Start using SalesOS today and only pay when you close deals.',
  },
  {
    icon: Target,
    title: 'Aligned Incentives',
    description: 'We succeed when you succeed. Our pricing motivates us to help you close more deals.',
  },
  {
    icon: Award,
    title: 'Monthly Caps Available',
    description: 'Set a maximum monthly charge to keep your costs predictable and controlled.',
  },
  {
    icon: Users,
    title: 'Unlimited Users',
    description: 'Add your entire sales team without per-seat charges. Scale freely.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How does outcome-based billing work?',
    answer: 'When your sales team closes a deal in SalesOS, we automatically calculate the fee based on your pricing plan. Fees are invoiced monthly, and you only pay for actual results.',
  },
  {
    question: 'What happens if a deal is reopened or cancelled?',
    answer: 'If a closed deal is reopened, it gets flagged for review. Our team will work with you to determine the appropriate action - we can waive or void the fee if needed.',
  },
  {
    question: 'Is there a minimum deal value?',
    answer: 'You can set a minimum deal value threshold. Deals below this amount won\'t incur any fees, perfect for filtering out small transactions.',
  },
  {
    question: 'Can I set a monthly cap on fees?',
    answer: 'Yes! You can configure a monthly cap to ensure predictable costs. Once you hit the cap, additional deals that month are free.',
  },
  {
    question: 'How are payments processed?',
    answer: 'We generate monthly invoices with a detailed breakdown of each deal. Pay via credit card, ACH, or wire transfer through our secure payment portal.',
  },
  {
    question: 'Can I switch between pricing models?',
    answer: 'Yes, you can request to change your pricing model. Changes take effect at the start of the next billing period.',
  },
];

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [calculatorValue, setCalculatorValue] = useState(50000);
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const revenueSharePercent = 2.5;
  const calculatedFee = Math.round(calculatorValue * (revenueSharePercent / 100));

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const handleContactSales = () => {
    navigate('/contact');
  };

  return (
    <>
      <SEOHead {...SEO_CONFIGS.pricing} />
      <div className="min-h-screen bg-[#F2F1EA]">
        {/* Hero Section */}
        <section className="py-20 md:py-32 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#93C01F]/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#93C01F]/10 border border-[#93C01F]/20 mb-6">
                <TrendingUp size={16} className="text-[#93C01F]" />
                <span className="text-sm font-semibold text-[#1A1A1A]">Outcome-Based Pricing</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-[#1A1A1A] mb-6 leading-tight">
                Pay When You{' '}
                <span className="text-[#EAD07D]">Win</span>
              </h1>

              <p className="text-xl text-[#666] mb-8 leading-relaxed">
                No upfront subscriptions. No per-seat fees. You only pay when your team closes deals.
                Our success is tied directly to yours.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold text-lg hover:bg-[#333] transition-all flex items-center gap-2 shadow-lg"
                >
                  Start Free <ArrowRight size={20} />
                </button>
                <button
                  onClick={handleContactSales}
                  className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-semibold text-lg border border-black/10 hover:bg-[#F8F8F6] transition-all"
                >
                  Talk to Sales
                </button>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex items-center justify-center gap-6 flex-wrap text-sm text-[#666]">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#93C01F]" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#93C01F]" />
                  Free until you close deals
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#93C01F]" />
                  Cancel anytime
                </span>
              </div>
            </div>

            {/* Value Proposition Card */}
            <div className="bg-[#1A1A1A] rounded-[2.5rem] p-8 md:p-12 text-center max-w-4xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#EAD07D]/10 blur-[80px] rounded-full" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAD07D] text-[#1A1A1A] font-bold text-sm mb-6">
                  <Zap size={16} />
                  Most Popular
                </div>

                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Revenue Share Model
                </h2>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-6xl md:text-8xl font-bold text-[#EAD07D]">2.5%</span>
                  <span className="text-xl text-white/60 text-left">
                    of each<br />closed deal
                  </span>
                </div>

                <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                  Close a $100,000 deal? Pay just $2,500. No deal? Pay nothing.
                  It's that simple.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {EXAMPLE_DEALS.map((deal) => (
                    <div key={deal.name} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <p className="text-white/40 text-xs mb-1">{deal.name}</p>
                      <p className="text-white font-semibold">${deal.amount.toLocaleString()}</p>
                      <p className="text-[#EAD07D] text-sm font-medium">Fee: ${deal.fee.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-bold text-lg hover:bg-gray-100 transition-all"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                Calculate Your Costs
              </h2>
              <p className="text-[#666] text-lg">
                See exactly what you'd pay based on your deal sizes
              </p>
            </div>

            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-lg border border-black/5 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                  <Calculator size={24} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A1A]">Fee Calculator</h3>
                  <p className="text-sm text-[#666]">Based on 2.5% revenue share</p>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-[#666] mb-3">
                  Deal Value
                </label>
                <input
                  type="range"
                  min="5000"
                  max="1000000"
                  step="5000"
                  value={calculatorValue}
                  onChange={(e) => setCalculatorValue(parseInt(e.target.value))}
                  className="w-full h-3 bg-[#F0EBD8] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1A1A1A] [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-sm text-[#999] mt-2">
                  <span>$5,000</span>
                  <span>$1,000,000</span>
                </div>
              </div>

              <div className="bg-[#F8F8F6] rounded-2xl p-6 text-center">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[#666] mb-1">Deal Value</p>
                    <p className="text-3xl font-bold text-[#1A1A1A]">
                      ${calculatorValue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666] mb-1">Your Fee</p>
                    <p className="text-3xl font-bold text-[#93C01F]">
                      ${calculatedFee.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#999] mt-4">
                  That's only {revenueSharePercent}% of your closed deal
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Other Pricing Models */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                Flexible Pricing Models
              </h2>
              <p className="text-[#666] text-lg max-w-2xl mx-auto">
                Choose the model that works best for your business. We'll help you find the right fit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING_MODELS.map((model) => (
                <div
                  key={model.id}
                  className={`relative rounded-[1.5rem] p-6 transition-all ${
                    model.highlight
                      ? 'bg-[#1A1A1A] text-white ring-4 ring-[#EAD07D]/20'
                      : 'bg-[#F8F8F6] text-[#1A1A1A] border border-black/5'
                  }`}
                >
                  {model.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#EAD07D] rounded-full text-xs font-bold text-[#1A1A1A]">
                      MOST POPULAR
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    model.highlight ? 'bg-white/10' : 'bg-white'
                  }`}>
                    <model.icon size={24} className={model.highlight ? 'text-[#EAD07D]' : 'text-[#1A1A1A]'} />
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{model.name}</h3>
                  <p className={`text-sm mb-4 ${model.highlight ? 'text-white/60' : 'text-[#666]'}`}>
                    {model.description}
                  </p>
                  <p className={`text-sm font-medium ${model.highlight ? 'text-[#EAD07D]' : 'text-[#93C01F]'}`}>
                    {model.example}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <button
                onClick={handleContactSales}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-[#333] transition-all inline-flex items-center gap-2"
              >
                Discuss Custom Pricing <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                Why Outcome-Based Pricing?
              </h2>
              <p className="text-[#666] text-lg">
                A pricing model that puts your success first
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BENEFITS.map((benefit, index) => (
                <div key={index} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-black/5">
                  <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center mb-4">
                    <benefit.icon size={24} className="text-[#1A1A1A]" />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-2">{benefit.title}</h3>
                  <p className="text-sm text-[#666]">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 md:py-24 bg-[#1A1A1A]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Close Deals
              </h2>
              <p className="text-white/60 text-lg">
                Full access to all features. No hidden costs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                'AI-Powered Sales Assistant',
                'Lead & Opportunity Management',
                'Pipeline Analytics & Forecasting',
                'Email & Calendar Integration',
                'Quote & Proposal Builder (CPQ)',
                'Team Collaboration Tools',
                'Custom Dashboards & Reports',
                'Salesforce & HubSpot Sync',
                'Mobile App Access',
                'API Access',
                'SSO & Advanced Security',
                'Priority Support',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-white">
                  <div className="w-6 h-6 rounded-full bg-[#93C01F] flex items-center justify-center flex-shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-black/5 overflow-hidden"
                >
                  <button
                    onClick={() => setSelectedFaq(selectedFaq === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-[#1A1A1A]">{item.question}</span>
                    <HelpCircle
                      size={20}
                      className={`text-[#999] transition-transform ${selectedFaq === index ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {selectedFaq === index && (
                    <div className="px-6 pb-4">
                      <p className="text-[#666] text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 bg-[#F8F8F6]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-4">
              Ready to Align Your CRM Costs with Results?
            </h2>
            <p className="text-[#666] text-lg mb-8 max-w-2xl mx-auto">
              Join forward-thinking sales teams who only pay when they win.
              Start using SalesOS today - it's free until you close your first deal.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-[#1A1A1A] text-white rounded-full font-semibold text-lg hover:bg-[#333] transition-all flex items-center gap-2"
              >
                Start Free Today <ArrowRight size={20} />
              </button>
              <button
                onClick={handleContactSales}
                className="px-8 py-4 bg-white text-[#1A1A1A] rounded-full font-semibold text-lg border border-black/10 hover:bg-white transition-all"
              >
                Schedule a Demo
              </button>
            </div>

            <p className="mt-8 text-sm text-[#999]">
              No credit card required. No commitment. Just results-based pricing.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default PricingPage;
